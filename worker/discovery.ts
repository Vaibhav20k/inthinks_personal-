import type { AuthContext } from './auth'
import type { Participant } from './participant-auth'
import { bodyObject, reply, textValue } from './access-http'
import { audit } from './audit'
import { isPlatformAdmin } from './staff-access'
import { accessibleCase } from './participant-records'
import { briefLeak, identityTerms, presentFigure, shareableFigures } from './disclosure'

/**
 * Phase 11: discovery (decision D9).
 *
 * Signed-in members of an organization InThinks has verified as a solution
 * provider can read approved anonymised problem briefs, and tell InThinks
 * "we could solve this". A problem is listed only when an administrator
 * lists it AND its submitter has agreed. The provider never learns who the
 * problem belongs to, and the problem owner never learns who looked; the
 * interest goes to InThinks only.
 */

/** Organizations of this participant that are verified providers. */
async function providerOrgs(db: D1Database, email: string) {
  return (await db.prepare(`SELECT o.id FROM organizations o JOIN memberships m ON m.organization_id=o.id
    WHERE m.email=? AND m.active=1 AND o.provider_verified_at IS NOT NULL`).bind(email).all<{ id: string }>()).results.map((r) => r.id)
}

async function listedBriefs(db: D1Database, reference?: string) {
  return (await db.prepare(`SELECT b.id,b.reference,b.version,b.title,b.summary,b.figure_ids,b.approved_at FROM disclosure_briefs b
    JOIN case_records c ON c.reference=b.reference
    WHERE b.status='approved' AND c.kind='challenge' AND c.discovery_listed=1 AND c.discovery_consent=1 ${reference ? 'AND b.reference=?' : ''}
    ORDER BY b.approved_at DESC LIMIT 200`).bind(...(reference ? [reference] : [])).all<Record<string, unknown>>()).results
}

/**
 * Discovery items are keyed by an opaque per-brief handle, not the case
 * reference: a reference like CH-2026-0007 is shared with the submitter in
 * emails, and a provider holding it learns nothing, but it still need not
 * travel. The handle is the brief id.
 */
async function presentListed(db: D1Database, b: Record<string, unknown>) {
  const terms = await identityTerms(db, String(b.reference))
  if (briefLeak(`${b.title}\n${b.summary}`, terms)) return null
  const chosen = new Set<number>(JSON.parse(String(b.figure_ids)))
  const figures = (await shareableFigures(db, String(b.reference))).filter((f) => chosen.has(f.id)).map((f) => {
    const { id: _id, ...rest } = presentFigure(f)
    return rest
  })
  return { id: Number(b.id), title: b.title, summary: b.summary, figures, listedSince: b.approved_at }
}

/** Participant routes: GET /discovery, POST /discovery/:id/interest, POST /records/:ref/discovery-consent. */
export async function discoveryParticipantRoutes(request: Request, db: D1Database, user: Participant, path: string): Promise<Response | null> {
  const consent = path.match(/^\/records\/([A-Za-z0-9-]{1,32})\/discovery-consent$/)
  if (consent) {
    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405)
    const record = await accessibleCase(db, consent[1], user.email)
    if (!record) return reply({ error: 'Not found.' }, 404)
    const role = await db.prepare('SELECT role FROM memberships WHERE organization_id=? AND email=? AND active=1').bind(record.organization_id, user.email).first<{ role: string }>()
    if (role?.role !== 'owner') return reply({ error: 'Only the organization owner decides this.' }, 403)
    if (record.kind !== 'challenge') return reply({ error: 'Only problems are listed in discovery.' }, 422)
    const body = await bodyObject(request)
    if (typeof body?.consent !== 'boolean') return reply({ error: 'Say yes or no.' }, 422)
    await db.prepare('UPDATE case_records SET discovery_consent=? WHERE reference=?').bind(body.consent ? 1 : 0, record.reference).run()
    return reply({ ok: true, consent: body.consent })
  }
  if (path !== '/discovery' && !path.startsWith('/discovery/')) return null
  const orgs = await providerOrgs(db, user.email)
  if (path === '/discovery' && request.method === 'GET') {
    if (!orgs.length) return reply({ verified: false, items: [] })
    const items = (await Promise.all((await listedBriefs(db)).map((b) => presentListed(db, b)))).filter(Boolean)
    const mine = await db.prepare(`SELECT brief_id FROM discovery_interests WHERE organization_id IN (${orgs.map(() => '?').join(',')})`).bind(...orgs).all<{ brief_id: number }>()
    const sent = new Set(mine.results.map((r) => r.brief_id))
    return reply({ verified: true, items: items.map((i) => ({ ...i!, interestSent: sent.has(i!.id) })) })
  }
  const interest = path.match(/^\/discovery\/(\d{1,12})\/interest$/)
  if (!interest || request.method !== 'POST') return reply({ error: 'Not found.' }, 404)
  if (!orgs.length) return reply({ error: 'Discovery is open to verified solution providers only.' }, 403)
  const brief = await db.prepare("SELECT id,reference FROM disclosure_briefs WHERE id=? AND status='approved'").bind(Number(interest[1])).first<{ id: number; reference: string }>()
  if (!brief || !(await listedBriefs(db, brief.reference)).length) return reply({ error: 'Not found.' }, 404)
  const body = await bodyObject(request)
  const note = textValue(body?.note, 1500)
  if (!note || note.length < 20) return reply({ error: 'Say briefly how you could solve it (at least 20 characters).' }, 422)
  const org = typeof body?.organizationId === 'string' && orgs.includes(body.organizationId) ? body.organizationId : orgs[0]
  const saved = await db.prepare(`INSERT INTO discovery_interests (reference,brief_id,organization_id,email,note,created_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(reference,organization_id) DO NOTHING`).bind(brief.reference, brief.id, org, user.email, note, new Date().toISOString()).run()
  if (!saved.meta.changes) return reply({ error: 'Your organization has already told InThinks about this one.' }, 409)
  return reply({ ok: true }, 201)
}

/**
 * Staff routes (administrators):
 *   GET  /discovery                       providers, listed problems, interests
 *   POST /discovery/providers/:orgId      { verified: boolean }
 *   POST /discovery/cases/:ref            { listed: boolean }
 */
export async function discoveryStaffRoutes(request: Request, ctx: AuthContext, path: string, ip: string): Promise<Response | null> {
  if (path !== '/discovery' && !path.startsWith('/discovery/')) return null
  if (!isPlatformAdmin(ctx)) return reply({ error: 'Not permitted.' }, 403)
  const { db, actor } = ctx
  if (path === '/discovery' && request.method === 'GET') {
    const [orgs, cases, interests] = await Promise.all([
      db.prepare(`SELECT o.id,o.name,o.provider_verified_at,o.provider_verified_by,
          (SELECT COUNT(*) FROM case_records c WHERE c.organization_id=o.id AND c.kind='innovation') solutions,
          (SELECT COUNT(*) FROM memberships m WHERE m.organization_id=o.id AND m.active=1) members
        FROM organizations o ORDER BY o.provider_verified_at IS NULL, o.name LIMIT 300`).all(),
      db.prepare(`SELECT c.reference,ch.title,c.discovery_listed,c.discovery_consent,
          (SELECT version FROM disclosure_briefs b WHERE b.reference=c.reference AND b.status='approved') approved_version
        FROM case_records c JOIN challenges ch ON ch.reference=c.reference ORDER BY c.reference DESC LIMIT 300`).all(),
      db.prepare(`SELECT i.id,i.reference,i.note,i.email,i.created_at,o.name organization,b.version
        FROM discovery_interests i JOIN organizations o ON o.id=i.organization_id JOIN disclosure_briefs b ON b.id=i.brief_id
        ORDER BY i.created_at DESC LIMIT 200`).all(),
    ])
    await audit(db, actor, 'discovery.view', undefined, undefined, ip)
    return reply({ organizations: orgs.results, problems: cases.results, interests: interests.results })
  }
  const body = request.method === 'POST' ? await bodyObject(request) : null
  if (!body) return reply({ error: 'Invalid request.' }, 400)
  const provider = path.match(/^\/discovery\/providers\/([A-Za-z0-9-]{1,64})$/)
  if (provider) {
    if (typeof body.verified !== 'boolean') return reply({ error: 'Say whether the organization is verified.' }, 422)
    const changed = await db.prepare('UPDATE organizations SET provider_verified_at=?,provider_verified_by=? WHERE id=?')
      .bind(body.verified ? new Date().toISOString() : null, body.verified ? actor.email : null, provider[1]).run()
    if (!changed.meta.changes) return reply({ error: 'Not found.' }, 404)
    await audit(db, actor, body.verified ? 'provider.verify' : 'provider.unverify', provider[1], undefined, ip)
    return reply({ ok: true })
  }
  const listing = path.match(/^\/discovery\/cases\/([A-Za-z0-9-]{1,32})$/)
  if (listing) {
    if (typeof body.listed !== 'boolean') return reply({ error: 'Say whether the problem is listed.' }, 422)
    const record = await db.prepare("SELECT kind FROM case_records WHERE reference=?").bind(listing[1]).first<{ kind: string }>()
    if (!record) return reply({ error: 'Not found.' }, 404)
    if (record.kind !== 'challenge') return reply({ error: 'Only problems are listed in discovery.' }, 422)
    if (body.listed && !await db.prepare("SELECT 1 FROM disclosure_briefs WHERE reference=? AND status='approved'").bind(listing[1]).first())
      return reply({ error: 'Approve an anonymised brief for this problem first.' }, 409)
    await db.prepare('UPDATE case_records SET discovery_listed=? WHERE reference=?').bind(body.listed ? 1 : 0, listing[1]).run()
    await audit(db, actor, body.listed ? 'discovery.list' : 'discovery.unlist', listing[1], undefined, ip)
    return reply({ ok: true })
  }
  return reply({ error: 'Not found.' }, 404)
}
