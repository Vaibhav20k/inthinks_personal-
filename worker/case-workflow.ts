import type { AuthContext } from './auth'
import { bodyObject, emailValue, reply, textValue } from './access-http'
import { audit } from './audit'
import { assigned, isPlatformAdmin } from './staff-access'
import { qualificationRoutes } from './qualification'

/**
 * Staff side of the case workflow (step 5) and qualification (step 6).
 *
 * Access: administrators on every case; mediators (business-development) on
 * cases assigned to them. Technical reviewers are excluded — they work from
 * the approved brief and never contact submitters or see attributable costs.
 * Only administrators choose a case owner.
 */

const today = () => new Date().toISOString().slice(0, 10)
export function dueDate(value: unknown): string | null | false {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : false
}

const tableFor = (kind: string) => (kind === 'challenge' ? 'challenges' : 'innovations')

/** After a clarification closes: back to review once nothing is outstanding. */
export async function settleReviewStatus(db: D1Database, reference: string) {
  const record = await db.prepare('SELECT kind FROM case_records WHERE reference=?').bind(reference).first<{ kind: string }>()
  if (!record) return
  await db.prepare(`UPDATE ${tableFor(record.kind)} SET review_status='under_review' WHERE reference=? AND review_status='clarification_requested'
    AND NOT EXISTS (SELECT 1 FROM clarification_requests WHERE reference=? AND status='open')`).bind(reference, reference).run()
}

export async function caseWorkflowRoutes(request: Request, ctx: AuthContext, path: string, ip: string): Promise<Response | null> {
  const { db, actor } = ctx
  const isQueue = path === '/queue'
  const match = path.match(/^\/cases\/([A-Za-z0-9-]{1,32})(\/.*)?$/)
  if (!isQueue && !match) return null
  const admin = isPlatformAdmin(ctx)
  if (!admin && actor.role !== 'business-development') return reply({ error: 'Not permitted.' }, 403)

  if (isQueue) {
    if (request.method !== 'GET') return reply({ error: 'Method not allowed.' }, 405)
    const scope = admin ? '' : 'JOIN case_assignments a ON a.reference=c.reference AND a.staff_email=?'
    const rows = await db.prepare(`SELECT c.reference,c.kind,COALESCE(ch.title,i.title) title,COALESCE(ch.review_status,i.review_status) review_status,
      w.owner_email,w.next_action,w.next_action_due,
      (SELECT COUNT(*) FROM clarification_requests q WHERE q.reference=c.reference AND q.status='open') open_clarifications,
      (SELECT MIN(due_at) FROM clarification_requests q WHERE q.reference=c.reference AND q.status='open') clarification_due
      FROM case_records c ${scope}
      LEFT JOIN case_workflow w ON w.reference=c.reference
      LEFT JOIN challenges ch ON ch.reference=c.reference LEFT JOIN innovations i ON i.reference=c.reference
      WHERE COALESCE(ch.review_status,i.review_status) NOT IN ('declined','withdrawn')
      ORDER BY w.next_action_due IS NULL, w.next_action_due, c.reference DESC LIMIT 300`)
      .bind(...(admin ? [] : [actor.email])).all<Record<string, unknown>>()
    return reply({ items: rows.results.map((r) => ({
      reference: r.reference, kind: r.kind, title: r.title, reviewStatus: r.review_status, owner: r.owner_email,
      nextAction: r.next_action, nextActionDue: r.next_action_due, openClarifications: r.open_clarifications,
      clarificationDue: r.clarification_due, overdue: Boolean(r.next_action_due && String(r.next_action_due) < today()),
    })) })
  }

  const reference = match![1], rest = match![2] ?? ''
  const record = await db.prepare('SELECT kind FROM case_records WHERE reference=?').bind(reference).first<{ kind: string }>()
  if (!record || !await assigned(ctx, reference)) return reply({ error: 'Not found.' }, 404)

  if (rest.startsWith('/qualification')) {
    const response = await qualificationRoutes(request, db, reference, { email: actor.email, side: 'staff' }, rest.slice('/qualification'.length))
    if (request.method !== 'GET' && response.ok) await audit(db, actor, `qualification.${request.method.toLowerCase()}`, reference, { path: rest }, ip)
    return response
  }

  if (rest === '' && request.method === 'GET') {
    const [workflow, questions] = await Promise.all([
      db.prepare('SELECT owner_email,next_action,next_action_due,updated_by,updated_at FROM case_workflow WHERE reference=?').bind(reference).first<Record<string, unknown>>(),
      db.prepare('SELECT * FROM clarification_requests WHERE reference=? ORDER BY id DESC').bind(reference).all<Record<string, unknown>>(),
    ])
    const owners = admin ? (await db.prepare("SELECT email FROM users WHERE disabled=0 AND role IN ('super-admin','admin','business-development') ORDER BY email").all<{ email: string }>()).results.map((u) => u.email) : []
    return reply({
      reference, kind: record.kind, canChooseOwner: admin, owners,
      workflow: workflow ? { owner: workflow.owner_email, nextAction: workflow.next_action, nextActionDue: workflow.next_action_due, updatedBy: workflow.updated_by, updatedAt: workflow.updated_at } : null,
      clarifications: questions.results.map((q) => ({
        id: q.id, question: q.question, askedBy: q.asked_by, askedAt: q.asked_at, dueAt: q.due_at, status: q.status,
        response: q.response, respondedBy: q.responded_by, respondedAt: q.responded_at, closedBy: q.closed_by, closedAt: q.closed_at,
      })),
    })
  }

  if (request.method !== 'POST' && request.method !== 'PUT') return reply({ error: 'Method not allowed.' }, 405)
  const body = await bodyObject(request)
  if (!body) return reply({ error: 'Invalid request.' }, 400)
  const now = new Date().toISOString()

  if (rest === '/workflow' && request.method === 'PUT') {
    const current = await db.prepare('SELECT owner_email FROM case_workflow WHERE reference=?').bind(reference).first<{ owner_email: string | null }>()
    let owner = current?.owner_email ?? null
    if (body.owner !== undefined) {
      if (!admin) return reply({ error: 'Only an administrator chooses the case owner.' }, 403)
      owner = body.owner === null || body.owner === '' ? null : emailValue(body.owner)
      if (owner !== null && !await db.prepare("SELECT 1 FROM users WHERE email=? AND disabled=0 AND role IN ('super-admin','admin','business-development')").bind(owner).first())
        return reply({ error: 'Choose an active administrator or mediator as owner.' }, 422)
      // A mediator who owns a case must also be able to open it.
      if (owner && !await db.prepare("SELECT 1 FROM users WHERE email=? AND role IN ('super-admin','admin')").bind(owner).first()
        && !await db.prepare('SELECT 1 FROM case_assignments WHERE reference=? AND staff_email=?').bind(reference, owner).first())
        return reply({ error: 'Assign the mediator to this case before making them owner.' }, 422)
    }
    const nextAction = textValue(body.nextAction, 300)
    if (typeof body.nextAction === 'string' && body.nextAction.trim().length > 300) return reply({ error: 'Keep the next action under 300 characters.' }, 422)
    const due = dueDate(body.nextActionDue)
    if (due === false) return reply({ error: 'Use a real due date (YYYY-MM-DD).' }, 422)
    if (due && !nextAction) return reply({ error: 'A due date needs a next action.' }, 422)
    await db.prepare(`INSERT INTO case_workflow(reference,owner_email,next_action,next_action_due,updated_by,updated_at) VALUES (?,?,?,?,?,?)
      ON CONFLICT(reference) DO UPDATE SET owner_email=excluded.owner_email,next_action=excluded.next_action,
      next_action_due=excluded.next_action_due,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
      .bind(reference, owner, nextAction || null, due, actor.email, now).run()
    await audit(db, actor, 'case.workflow', reference, { owner, nextActionDue: due }, ip)
    return reply({ ok: true })
  }

  if (rest === '/clarifications' && request.method === 'POST') {
    const question = textValue(body.question, 2000)
    if (!question) return reply({ error: 'Write the question (2,000 characters at most).' }, 422)
    const due = dueDate(body.dueAt)
    if (due === false || (due && due < today())) return reply({ error: 'Use a due date from today onwards.' }, 422)
    const open = await db.prepare("SELECT COUNT(*) n FROM clarification_requests WHERE reference=? AND status='open'").bind(reference).first<{ n: number }>()
    if ((open?.n ?? 0) >= 10) return reply({ error: 'Ten questions are already open on this case.' }, 409)
    const [inserted] = await db.batch([
      db.prepare('INSERT INTO clarification_requests(reference,question,asked_by,asked_at,due_at) VALUES (?,?,?,?,?) RETURNING id').bind(reference, question, actor.email, now, due),
      db.prepare(`UPDATE ${tableFor(record.kind)} SET review_status='clarification_requested' WHERE reference=? AND review_status IN ('submitted','under_review')`).bind(reference),
    ])
    const id = (inserted.results[0] as { id: number } | undefined)?.id
    await audit(db, actor, 'clarification.request', reference, { id }, ip)
    return reply({ id }, 201)
  }

  const withdraw = rest.match(/^\/clarifications\/(\d{1,12})\/withdraw$/)
  if (withdraw && request.method === 'POST') {
    const changed = await db.prepare("UPDATE clarification_requests SET status='withdrawn',closed_by=?,closed_at=? WHERE id=? AND reference=? AND status='open'")
      .bind(actor.email, now, Number(withdraw[1]), reference).run()
    if (!changed.meta.changes) return reply({ error: 'Only an open question can be withdrawn.' }, 409)
    await settleReviewStatus(db, reference)
    await audit(db, actor, 'clarification.withdraw', reference, { id: Number(withdraw[1]) }, ip)
    return reply({ ok: true })
  }
  return reply({ error: 'Not found.' }, 404)
}
