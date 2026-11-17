import type { AuthContext } from './auth'
import { bodyObject, reply, textValue } from './access-http'
import { audit } from './audit'
import { isPlatformAdmin } from './staff-access'
import { dueDate } from './case-workflow'

/**
 * Phase 11: pilots.
 *
 * A pilot is judged against the problem owner's own success criteria (the
 * success_criterion figures on the problem case). Staff record a measured
 * value per criterion and the verdict follows from the comparator, so
 * "did it work" is the owner's definition, applied the same way every time.
 * InThinks runs the pilot with each side separately (D10).
 */

export type Verdict = 'met' | 'not_met' | 'not_measured'

/** Whether a measurement meets a criterion. Pure; same inputs, same answer. */
export function verdict(criterion: { comparator: string | null; value: number | null; valueMax: number | null }, measured: number | null): Verdict {
  if (measured === null || criterion.value === null) return 'not_measured'
  const v = criterion.value
  switch (criterion.comparator) {
    case 'gte': return measured >= v ? 'met' : 'not_met'
    case 'lte': return measured <= v ? 'met' : 'not_met'
    case 'eq': return Math.abs(measured - v) <= Math.abs(v) * 1e-9 ? 'met' : 'not_met'
    case 'between': return criterion.valueMax !== null && measured >= v && measured <= criterion.valueMax ? 'met' : 'not_met'
    default: return 'not_measured'
  }
}

interface Opp { reference: string; challenge_ref: string; stage: string }

async function criteria(db: D1Database, o: Opp) {
  const rows = await db.prepare(`SELECT q.id,q.label,q.comparator,q.value,q.value_max,q.unit,q.baseline,
      r.measured,r.measured_on,r.source,r.note,r.recorded_by,r.recorded_at
    FROM qualification_items q LEFT JOIN pilot_results r ON r.criterion_id=q.id AND r.opportunity_ref=?
    WHERE q.reference=? AND q.category='success_criterion' AND q.retired_at IS NULL ORDER BY q.id`)
    .bind(o.reference, o.challenge_ref).all<Record<string, unknown>>()
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  return rows.results.map((r) => {
    const c = { comparator: r.comparator as string | null, value: n(r.value), valueMax: n(r.value_max) }
    return { id: Number(r.id), label: String(r.label), ...c, unit: r.unit as string | null, measured: n(r.measured),
      measuredOn: r.measured_on ?? null, source: r.source ?? null, note: r.note ?? null, recordedBy: r.recorded_by ?? null,
      verdict: verdict(c, n(r.measured)) }
  })
}

async function milestones(db: D1Database, reference: string) {
  return (await db.prepare('SELECT id,title,due_on,status,note,updated_by,updated_at FROM pilot_milestones WHERE opportunity_ref=? ORDER BY due_on IS NULL,due_on,id')
    .bind(reference).all<Record<string, unknown>>()).results.map((m) => ({ id: m.id, title: m.title, dueOn: m.due_on, status: m.status,
    note: m.note, updatedBy: m.updated_by, updatedAt: m.updated_at }))
}

/** What a participant may see of the pilot: steps and how many criteria are met. No figures, notes or names. */
export async function participantPilot(db: D1Database, o: Opp) {
  const [list, steps] = await Promise.all([criteria(db, o), milestones(db, o.reference)])
  return { steps: steps.map((s) => ({ title: s.title, dueOn: s.dueOn, status: s.status })),
    criteriaMet: list.filter((c) => c.verdict === 'met').length, criteriaMeasured: list.filter((c) => c.verdict !== 'not_measured').length,
    criteriaTotal: list.length }
}

/** Staff routes under /opportunities/:ref/pilot. Administrators only. */
export async function pilotRoutes(request: Request, ctx: AuthContext, path: string, ip: string): Promise<Response | null> {
  const m = path.match(/^\/opportunities\/([A-Za-z0-9-]{1,32})\/pilot(?:\/(milestones|results)(?:\/(\d{1,12}))?)?$/)
  if (!m) return null
  if (!isPlatformAdmin(ctx)) return reply({ error: 'Not permitted.' }, 403)
  const { db, actor } = ctx
  const o = await db.prepare('SELECT reference,challenge_ref,stage FROM opportunities WHERE reference=?').bind(m[1]).first<Opp>()
  if (!o) return reply({ error: 'Not found.' }, 404)
  const now = new Date().toISOString()

  if (!m[2] && request.method === 'GET') {
    const [list, steps] = await Promise.all([criteria(db, o), milestones(db, o.reference)])
    return reply({ reference: o.reference, problem: o.challenge_ref, criteria: list, milestones: steps,
      summary: { met: list.filter((c) => c.verdict === 'met').length, notMet: list.filter((c) => c.verdict === 'not_met').length, total: list.length } })
  }
  const body = await bodyObject(request)
  if (!body) return reply({ error: 'Invalid request.' }, 400)

  if (m[2] === 'milestones') {
    const id = m[3] ? Number(m[3]) : null
    const title = textValue(body.title, 200), due = dueDate(body.dueOn), note = textValue(body.note, 500)
    const status = body.status ?? 'planned'
    if (!title) return reply({ error: 'Give the step a title.', fields: { title: 'Required, 200 characters at most.' } }, 422)
    if (due === false) return reply({ error: 'Use a real date (YYYY-MM-DD).', fields: { dueOn: 'Use a real date.' } }, 422)
    if (!['planned', 'done', 'missed'].includes(String(status))) return reply({ error: 'Choose planned, done or missed.' }, 422)
    if (id === null && request.method === 'POST') {
      const count = await db.prepare('SELECT COUNT(*) n FROM pilot_milestones WHERE opportunity_ref=?').bind(o.reference).first<{ n: number }>()
      if ((count?.n ?? 0) >= 50) return reply({ error: 'A pilot has at most 50 steps.' }, 409)
      await db.prepare('INSERT INTO pilot_milestones (opportunity_ref,title,due_on,status,note,updated_by,updated_at) VALUES (?,?,?,?,?,?,?)')
        .bind(o.reference, title, due, status, note || null, actor.email, now).run()
    } else if (id !== null && request.method === 'PUT') {
      const changed = await db.prepare('UPDATE pilot_milestones SET title=?,due_on=?,status=?,note=?,updated_by=?,updated_at=? WHERE id=? AND opportunity_ref=?')
        .bind(title, due, status, note || null, actor.email, now, id, o.reference).run()
      if (!changed.meta.changes) return reply({ error: 'Not found.' }, 404)
    } else return reply({ error: 'Method not allowed.' }, 405)
    await audit(db, actor, 'pilot.milestone', o.reference, { status }, ip)
    return reply({ ok: true })
  }

  if (m[2] === 'results' && !m[3] && request.method === 'POST') {
    const criterion = Number(body.criterionId)
    const ok = Number.isSafeInteger(criterion) && await db.prepare(`SELECT 1 FROM qualification_items WHERE id=? AND reference=?
      AND category='success_criterion' AND retired_at IS NULL`).bind(criterion, o.challenge_ref).first()
    if (!ok) return reply({ error: 'Choose one of the problem’s success criteria.' }, 422)
    const measured = typeof body.measured === 'number' ? body.measured : Number(String(body.measured ?? '').trim() || NaN)
    const on = dueDate(body.measuredOn), source = textValue(body.source, 300), note = textValue(body.note, 500)
    const fields: Record<string, string> = {}
    if (!Number.isFinite(measured) || Math.abs(measured) > 1e15) fields.measured = 'Enter the measured value.'
    if (!on) fields.measuredOn = 'Enter the date it was measured.'
    else if (on > now.slice(0, 10)) fields.measuredOn = 'A measurement cannot be dated in the future.'
    if (!source) fields.source = 'Say how it was measured (e.g. site log, lab report).'
    if (Object.keys(fields).length) return reply({ error: 'Check the highlighted fields.', fields }, 422)
    await db.prepare(`INSERT INTO pilot_results (opportunity_ref,criterion_id,measured,measured_on,source,note,recorded_by,recorded_at) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(opportunity_ref,criterion_id) DO UPDATE SET measured=excluded.measured,measured_on=excluded.measured_on,source=excluded.source,
      note=excluded.note,recorded_by=excluded.recorded_by,recorded_at=excluded.recorded_at`)
      .bind(o.reference, criterion, measured, on, source, note || null, actor.email, now).run()
    await audit(db, actor, 'pilot.result', o.reference, { criterion }, ip)
    return reply({ ok: true })
  }
  return reply({ error: 'Method not allowed.' }, 405)
}
