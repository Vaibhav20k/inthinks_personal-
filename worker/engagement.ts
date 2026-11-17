import type { AuthContext } from './auth'
import type { Participant } from './participant-auth'
import { bodyObject, reply, textValue } from './access-http'
import { audit } from './audit'
import { isPlatformAdmin } from './staff-access'
import { dueDate } from './case-workflow'
import { briefLeak, identityTerms, presentFigure, shareableFigures } from './disclosure'

/**
 * Phase 10: the engagement workflow around an opportunity.
 *
 * D10 (firm rule): the two sides never learn each other's identity and never
 * deal with each other. InThinks deals with each side separately, so an
 * opportunity has two engagement sides. Each side sees only:
 *   - the counterpart's approved brief, pinned to the version shared with it,
 *   - the opportunity's stage and type,
 *   - what InThinks has asked it to do next,
 * and answers InThinks — never the other side.
 */

export const ENGAGEMENT_TYPES = ['scouting', 'development', 'licensing', 'pilot'] as const
const RESPONSES = ['interested', 'more_info', 'declined'] as const
type Side = 'problem' | 'solution'
const other = (side: Side): Side => (side === 'problem' ? 'solution' : 'problem')

interface Opportunity { reference: string; challenge_ref: string; technology_ref: string; stage: string; engagement_type: string | null }
const ownCase = (o: Opportunity, side: Side) => (side === 'problem' ? o.challenge_ref : o.technology_ref)

/* ------------------------------------------------------------------ staff */

/** Staff routes under /opportunities/:ref/engagement. Administrators only. */
export async function engagementStaffRoutes(request: Request, ctx: AuthContext, path: string, ip: string): Promise<Response | null> {
  const m = path.match(/^\/opportunities\/([A-Za-z0-9-]{1,32})\/engagement(?:\/(problem|solution)\/(share|revoke|next-action))?$/)
  if (!m) return null
  if (!isPlatformAdmin(ctx)) return reply({ error: 'Not permitted.' }, 403)
  const { db, actor } = ctx
  const o = await db.prepare('SELECT reference,challenge_ref,technology_ref,stage,engagement_type FROM opportunities WHERE reference=?').bind(m[1]).first<Opportunity>()
  if (!o) return reply({ error: 'Not found.' }, 404)
  const now = new Date().toISOString()

  if (!m[2] && request.method === 'GET') {
    const rows = await db.prepare('SELECT * FROM engagement_sides WHERE opportunity_ref=?').bind(o.reference).all<Record<string, unknown>>()
    const sides = await Promise.all((['problem', 'solution'] as const).map(async (side) => {
      const row = rows.results.find((r) => r.side === side)
      const counterpart = ownCase(o, other(side))
      const latest = await db.prepare("SELECT id,version,title FROM disclosure_briefs WHERE reference=? AND status='approved'").bind(counterpart).first<Record<string, unknown>>()
      const shared = row?.brief_id ? await db.prepare('SELECT id,version,title,status FROM disclosure_briefs WHERE id=?').bind(row.brief_id).first<Record<string, unknown>>() : null
      return { side, ownReference: ownCase(o, side), counterpartReference: counterpart, latestApproved: latest ?? null, shared,
        active: Boolean(row?.brief_id && !row.revoked_at), sharedAt: row?.shared_at ?? null, sharedBy: row?.shared_by ?? null,
        revokedAt: row?.revoked_at ?? null, response: row?.response ?? 'pending', responseNote: row?.response_note ?? null,
        respondedAt: row?.responded_at ?? null, nextAction: row?.next_action ?? null, nextActionDue: row?.next_action_due ?? null,
        outdated: Boolean(shared && latest && shared.id !== latest.id) }
    }))
    return reply({ reference: o.reference, stage: o.stage, engagementType: o.engagement_type, types: ENGAGEMENT_TYPES, sides })
  }
  const body = await bodyObject(request)
  if (!body) return reply({ error: 'Invalid request.' }, 400)

  if (!m[2] && request.method === 'PUT') {
    const type = body.engagementType
    if (type !== null && !(ENGAGEMENT_TYPES as readonly unknown[]).includes(type)) return reply({ error: 'Choose scouting, development, licensing or pilot.' }, 422)
    await db.prepare('UPDATE opportunities SET engagement_type=?,updated_at=? WHERE reference=?').bind(type, now, o.reference).run()
    await audit(db, actor, 'engagement.type', o.reference, { type }, ip)
    return reply({ ok: true })
  }
  if (request.method !== 'POST' && !(m[3] === 'next-action' && request.method === 'PUT')) return reply({ error: 'Method not allowed.' }, 405)
  const side = m[2] as Side
  await db.prepare('INSERT OR IGNORE INTO engagement_sides (opportunity_ref,side) VALUES (?,?)').bind(o.reference, side).run()

  if (m[3] === 'share') {
    if (o.stage === 'Closed') return reply({ error: 'This opportunity is closed.' }, 409)
    const brief = await db.prepare("SELECT id,version FROM disclosure_briefs WHERE reference=? AND status='approved'").bind(ownCase(o, other(side))).first<{ id: number; version: number }>()
    if (!brief) return reply({ error: 'The other side has no approved brief yet. Write and approve one on its case first.' }, 409)
    // A new version resets the answer: the side is now answering something else.
    await db.prepare(`UPDATE engagement_sides SET response=CASE WHEN brief_id IS ? THEN response ELSE 'pending' END,
      response_note=CASE WHEN brief_id IS ? THEN response_note ELSE NULL END, brief_id=?,shared_by=?,shared_at=?,revoked_at=NULL
      WHERE opportunity_ref=? AND side=?`).bind(brief.id, brief.id, brief.id, actor.email, now, o.reference, side).run()
    await audit(db, actor, 'engagement.share', o.reference, { side, brief: brief.id, version: brief.version }, ip)
    return reply({ ok: true, version: brief.version })
  }
  if (m[3] === 'revoke') {
    await db.prepare('UPDATE engagement_sides SET revoked_at=? WHERE opportunity_ref=? AND side=? AND brief_id IS NOT NULL').bind(now, o.reference, side).run()
    await audit(db, actor, 'engagement.revoke', o.reference, { side }, ip)
    return reply({ ok: true })
  }
  const action = textValue(body.nextAction, 300), due = dueDate(body.nextActionDue)
  if (due === false) return reply({ error: 'Use a real date (YYYY-MM-DD).' }, 422)
  await db.prepare('UPDATE engagement_sides SET next_action=?,next_action_due=? WHERE opportunity_ref=? AND side=?')
    .bind(action || null, action ? due : null, o.reference, side).run()
  await audit(db, actor, 'engagement.next_action', o.reference, { side }, ip)
  return reply({ ok: true })
}

/* ------------------------------------------------------------ participant */

/** Rows this participant may see: a shared, unrevoked side whose own case they can access. */
async function visibleSides(db: D1Database, email: string, opportunity?: string) {
  const rows = await db.prepare(`SELECT o.reference,o.challenge_ref,o.technology_ref,o.stage,o.engagement_type,s.side,s.brief_id,
      s.response,s.response_note,s.responded_at,s.next_action,s.next_action_due,s.shared_at
    FROM engagement_sides s JOIN opportunities o ON o.reference=s.opportunity_ref
    JOIN case_records c ON c.reference=CASE s.side WHEN 'problem' THEN o.challenge_ref ELSE o.technology_ref END
    JOIN memberships m ON m.organization_id=c.organization_id AND m.email=? AND m.active=1
    WHERE s.brief_id IS NOT NULL AND s.revoked_at IS NULL ${opportunity ? 'AND o.reference=?' : ''}
      AND (m.role='owner' OR c.created_by=? OR EXISTS (SELECT 1 FROM case_grants g WHERE g.reference=c.reference AND g.email=?))
    ORDER BY s.shared_at DESC LIMIT 100`)
    .bind(...(opportunity ? [email, opportunity, email, email] : [email, email, email])).all<Record<string, unknown>>()
  return rows.results
}

async function present(db: D1Database, row: Record<string, unknown>) {
  const side = row.side as Side
  const counterpart = side === 'problem' ? String(row.technology_ref) : String(row.challenge_ref)
  const brief = await db.prepare('SELECT id,version,title,summary,figure_ids FROM disclosure_briefs WHERE id=?').bind(row.brief_id).first<Record<string, unknown>>()
  // Checked again on the way out: if anything identifying has appeared since
  // approval (a renamed organization, an edited submission), withhold it.
  const terms = await identityTerms(db, counterpart)
  const safe = brief && !briefLeak(`${brief.title}\n${brief.summary}`, terms)
  const chosen = new Set<number>(brief ? JSON.parse(String(brief.figure_ids)) : [])
  // Re-filtered at serve: a figure since marked InThinks-only, disputed or retired drops out.
  const figures = safe ? (await shareableFigures(db, counterpart)).filter((f) => chosen.has(f.id)).map((f) => {
    const { id: _id, ...rest } = presentFigure(f)
    return rest
  }) : []
  return {
    reference: row.reference, side, ownReference: side === 'problem' ? row.challenge_ref : row.technology_ref,
    stage: row.stage, engagementType: row.engagement_type, sharedAt: row.shared_at,
    counterpart: safe ? { kind: side === 'problem' ? 'solution' : 'problem', version: brief!.version, title: brief!.title, summary: brief!.summary,
      figures } : null,
    response: row.response, responseNote: row.response_note, respondedAt: row.responded_at,
    nextAction: row.next_action, nextActionDue: row.next_action_due,
  }
}

/** Participant routes: GET /engagements, GET /engagements/:ref, POST /engagements/:ref/response. */
export async function engagementParticipantRoutes(request: Request, db: D1Database, user: Participant, path: string): Promise<Response | null> {
  if (path === '/engagements' && request.method === 'GET') {
    const rows = await visibleSides(db, user.email)
    return reply({ items: await Promise.all(rows.map((r) => present(db, r))) })
  }
  const m = path.match(/^\/engagements\/([A-Za-z0-9-]{1,32})(\/response)?$/)
  if (!m) return null
  const rows = await visibleSides(db, user.email, m[1])
  if (!rows.length) return reply({ error: 'Not found.' }, 404)
  if (!m[2] && request.method === 'GET') return reply(await present(db, rows[0]))
  if (m[2] && request.method === 'POST') {
    const body = await bodyObject(request)
    const response = body?.response
    if (!(RESPONSES as readonly unknown[]).includes(response)) return reply({ error: 'Choose interested, need more information or not interested.' }, 422)
    const note = textValue(body?.note, 1000)
    if (response === 'more_info' && !note) return reply({ error: 'Say what you would like to know.' }, 422)
    if (rows[0].stage === 'Closed') return reply({ error: 'This opportunity is closed.' }, 409)
    await db.prepare('UPDATE engagement_sides SET response=?,response_note=?,responded_by=?,responded_at=? WHERE opportunity_ref=? AND side=?')
      .bind(response, note || null, user.email, new Date().toISOString(), m[1], rows[0].side).run()
    return reply({ ok: true })
  }
  return reply({ error: 'Method not allowed.' }, 405)
}
