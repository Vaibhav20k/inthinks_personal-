import type { AuthContext } from './auth'
import { bodyObject, reply, textValue } from './access-http'
import { audit } from './audit'
import { isPlatformAdmin } from './staff-access'
import { namedPartyLeak } from './portfolio'

/**
 * Phase 10: anonymised disclosure briefs.
 *
 * The only thing one side of an engagement ever sees of the other is an
 * approved brief: a title, a summary written by staff, and figures chosen
 * from the case's qualification items. Never the raw submission text.
 *
 * Guards, each enforced here rather than in the UI:
 *  - Identity check on every save, on approval and again when served: the
 *    submitter's company, people, email, phone, website, location, IP owner,
 *    patent number and organization name, plus email/phone/profile-link
 *    shapes and named companies or institutions.
 *  - Costs are commercial (C4) and never go in a brief; figures marked
 *    "InThinks only" by the submitter (D11) never do either.
 *  - Mediators write and propose; only an administrator approves, and must
 *    confirm they read it for site, brand and people names the automatic
 *    check cannot know.
 *  - An approved version is never edited. A change is a new version, and
 *    approving it supersedes the old one.
 */

const IDENTITY_KEYS: [string, string][] = [
  ['company', 'the company name'], ['contact', 'a contact name'], ['name', 'a person’s name'], ['email', 'an email address'],
  ['phone', 'a phone number'], ['website', 'a website'], ['location', 'a site location'], ['organisation', 'an organisation name'],
  ['institution', 'an institution'], ['department', 'a department'], ['owner', 'the IP owner'], ['patentOwner', 'the patent owner'],
  ['patentNumber', 'a patent number'], ['coInventors', 'a co-inventor'],
]

/** Every identifying string held for a case, labelled for an actionable refusal. */
export async function identityTerms(db: D1Database, reference: string): Promise<[string, string][]> {
  const terms: [string, string][] = []
  const add = (value: unknown, label: string) => {
    if (typeof value !== 'string') return
    for (const part of label === 'a co-inventor' ? value.split(/[,;\n]/) : [value]) {
      const t = part.trim()
      if (t.length >= 3) terms.push([t, label])
    }
  }
  const record = await db.prepare(`SELECT c.kind,o.name org,c.created_by,COALESCE(ch.payload,i.payload) payload,
      ch.company,ch.contact_name,ch.email,ch.phone,ch.location,ch.website,i.innovator_name,i.innovator_email,i.institution
    FROM case_records c LEFT JOIN organizations o ON o.id=c.organization_id
    LEFT JOIN challenges ch ON ch.reference=c.reference LEFT JOIN innovations i ON i.reference=c.reference
    WHERE c.reference=?`).bind(reference).first<Record<string, unknown>>()
  if (!record) return terms
  add(record.org, 'the organization name'); add(record.created_by, 'an email address')
  add(record.company, 'the company name'); add(record.contact_name, 'a contact name'); add(record.email, 'an email address')
  add(record.phone, 'a phone number'); add(record.location, 'a site location'); add(record.website, 'a website')
  add(record.innovator_name, 'a person’s name'); add(record.innovator_email, 'an email address'); add(record.institution, 'an institution')
  let payload: Record<string, unknown> = {}
  try { payload = JSON.parse(String(record.payload ?? '{}')) } catch { /* no payload */ }
  for (const [key, label] of IDENTITY_KEYS) add(payload[key], label)
  return terms
}

/** What in this text would identify the submitter, or null. */
export function briefLeak(text: string, terms: [string, string][]): string | null {
  for (const [value, label] of terms) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'iu').test(text)) return label
  }
  if (/https?:\/\/|www\./i.test(text)) return 'a web address'
  return namedPartyLeak(text)
}

interface FigureRow { id: number; category: string; label: string; comparator: string | null; value: number | null; value_max: number | null; unit: string | null }

/** Figures a brief may carry: active, not a cost, not InThinks-only, not disputed. */
export async function shareableFigures(db: D1Database, reference: string) {
  return (await db.prepare(`SELECT id,category,label,comparator,value,value_max,unit FROM qualification_items
    WHERE reference=? AND retired_at IS NULL AND internal_only=0 AND category<>'cost' AND verification<>'disputed' ORDER BY category,id`)
    .bind(reference).all<FigureRow>()).results
}

export const presentFigure = (f: FigureRow) => ({ id: f.id, category: f.category, label: f.label, comparator: f.comparator,
  value: f.value, valueMax: f.value_max, unit: f.unit })

function parseIds(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length > 30) return null
  const ids = value.map(Number)
  return ids.every((n) => Number.isSafeInteger(n) && n > 0) ? [...new Set(ids)] : null
}

async function validateBrief(db: D1Database, reference: string, body: Record<string, unknown>) {
  const fields: Record<string, string> = {}
  const title = textValue(body.title, 160), summary = textValue(body.summary, 3000)
  if (!title) fields.title = 'Give the brief a title (160 characters at most).'
  if (!summary || summary.length < 40) fields.summary = 'Write a summary of at least 40 characters (3,000 at most).'
  const ids = parseIds(body.figureIds ?? [])
  if (!ids) fields.figureIds = 'Choose up to 30 figures.'
  const terms = await identityTerms(db, reference)
  for (const [key, text] of [['title', title], ['summary', summary]] as const) {
    const leak = text ? briefLeak(text, terms) : null
    if (leak) fields[key] = `It contains ${leak}. Rewrite it so the submitter cannot be identified.`
  }
  if (ids?.length) {
    const allowed = new Set((await shareableFigures(db, reference)).map((f) => f.id))
    if (ids.some((id) => !allowed.has(id))) fields.figureIds = 'Costs, InThinks-only, disputed and retired figures cannot be shared.'
  }
  return Object.keys(fields).length ? { ok: false as const, fields } : { ok: true as const, title: title!, summary: summary!, ids: ids! }
}

const presentBrief = (r: Record<string, unknown>) => ({
  id: r.id, version: r.version, title: r.title, summary: r.summary, figureIds: JSON.parse(String(r.figure_ids)),
  status: r.status, writtenBy: r.written_by, writtenAt: r.written_at, proposedBy: r.proposed_by, proposedAt: r.proposed_at,
  approvedBy: r.approved_by, approvedAt: r.approved_at,
})

/**
 * Staff routes under /cases/:ref/briefs. The caller has proved the actor is
 * an administrator or the mediator assigned to the case.
 */
export async function briefRoutes(request: Request, ctx: AuthContext, reference: string, rest: string, ip: string): Promise<Response> {
  const { db, actor } = ctx
  const route = rest.match(/^(?:\/(\d{1,12})(?:\/(propose|approve))?)?$/)
  if (!route) return reply({ error: 'Not found.' }, 404)
  const id = route[1] ? Number(route[1]) : null
  const now = new Date().toISOString()

  if (id === null && request.method === 'GET') {
    const rows = await db.prepare('SELECT * FROM disclosure_briefs WHERE reference=? ORDER BY version DESC').bind(reference).all<Record<string, unknown>>()
    return reply({ items: rows.results.map(presentBrief), figures: (await shareableFigures(db, reference)).map(presentFigure) })
  }
  const body = await bodyObject(request)
  if (!body) return reply({ error: 'Invalid request.' }, 400)

  if (id === null && request.method === 'POST') {
    const parsed = await validateBrief(db, reference, body)
    if (!parsed.ok) return reply({ error: 'Check the highlighted fields.', fields: parsed.fields }, 422)
    const open = await db.prepare("SELECT 1 FROM disclosure_briefs WHERE reference=? AND status IN ('draft','proposed')").bind(reference).first()
    if (open) return reply({ error: 'Finish or edit the open draft before starting another version.' }, 409)
    const row = await db.prepare(`INSERT INTO disclosure_briefs (reference,version,title,summary,figure_ids,written_by,written_at)
      VALUES (?,(SELECT COALESCE(MAX(version),0)+1 FROM disclosure_briefs WHERE reference=?),?,?,?,?,?) RETURNING id,version`)
      .bind(reference, reference, parsed.title, parsed.summary, JSON.stringify(parsed.ids), actor.email, now).first<{ id: number; version: number }>()
    await audit(db, actor, 'brief.write', reference, { version: row?.version }, ip)
    return reply(row, 201)
  }

  const brief = id === null ? null : await db.prepare('SELECT * FROM disclosure_briefs WHERE id=? AND reference=?').bind(id, reference).first<Record<string, unknown>>()
  if (!brief) return reply({ error: 'Not found.' }, 404)
  const editable = brief.status === 'draft' || brief.status === 'proposed'

  if (!route[2] && request.method === 'PUT') {
    if (!editable) return reply({ error: 'An approved brief is never edited. Start a new version.' }, 409)
    const parsed = await validateBrief(db, reference, body)
    if (!parsed.ok) return reply({ error: 'Check the highlighted fields.', fields: parsed.fields }, 422)
    // Any change sends it back to draft: what was proposed was the old text.
    await db.prepare(`UPDATE disclosure_briefs SET title=?,summary=?,figure_ids=?,status='draft',written_by=?,written_at=?,proposed_by=NULL,proposed_at=NULL WHERE id=?`)
      .bind(parsed.title, parsed.summary, JSON.stringify(parsed.ids), actor.email, now, id).run()
    await audit(db, actor, 'brief.edit', reference, { version: brief.version }, ip)
    return reply({ ok: true })
  }
  if (route[2] === 'propose' && request.method === 'POST') {
    if (brief.status !== 'draft') return reply({ error: 'Only a draft can be proposed.' }, 409)
    await db.prepare("UPDATE disclosure_briefs SET status='proposed',proposed_by=?,proposed_at=? WHERE id=?").bind(actor.email, now, id).run()
    await audit(db, actor, 'brief.propose', reference, { version: brief.version }, ip)
    return reply({ ok: true })
  }
  if (route[2] === 'approve' && request.method === 'POST') {
    if (!isPlatformAdmin(ctx)) return reply({ error: 'Only an administrator approves a brief for sharing.' }, 403)
    if (!editable) return reply({ error: 'This version is already decided.' }, 409)
    if (body.confirmChecked !== true) return reply({ error: 'Confirm you read the brief for site, brand and people names.' }, 422)
    // Re-check now: the submission or organization may have changed since it was written.
    const recheck = await validateBrief(db, reference, { title: brief.title, summary: brief.summary, figureIds: JSON.parse(String(brief.figure_ids)) })
    if (!recheck.ok) return reply({ error: 'The brief no longer passes the identity check. Edit it first.', fields: recheck.fields }, 422)
    await db.batch([
      db.prepare("UPDATE disclosure_briefs SET status='superseded' WHERE reference=? AND status='approved'").bind(reference),
      db.prepare("UPDATE disclosure_briefs SET status='approved',approved_by=?,approved_at=? WHERE id=?").bind(actor.email, now, id),
    ])
    await audit(db, actor, 'brief.approve', reference, { version: brief.version }, ip)
    return reply({ ok: true })
  }
  return reply({ error: 'Method not allowed.' }, 405)
}
