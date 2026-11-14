import type { Env } from './types'
import type { Participant } from './participant-auth'
import { bodyObject, reply, textValue } from './access-http'
import { membership } from './participant-organizations'
import { accessibleCase } from './participant-records'
import { settleReviewStatus } from './case-workflow'
import { qualificationRoutes } from './qualification'
import { followUpRoutes } from './intake-checklist'

/**
 * Participant side of the workflow: server drafts, answering clarification
 * questions, and adding their own qualification figures.
 */

const DRAFT_LIMIT = 20
const DRAFT_BYTES = 200_000
const DRAFT_DAYS = 90

export async function purgeExpiredDrafts(env: Env) {
  if (!env.DB) return
  try { await env.DB.prepare('DELETE FROM submission_drafts WHERE expires_at<?').bind(new Date().toISOString()).run() }
  catch { console.error('draft purge failed') }
}

const draftSummary = (r: Record<string, unknown>) => ({
  id: r.id, kind: r.kind, title: r.title, organizationId: r.organization_id, version: r.version, updatedAt: r.updated_at, expiresAt: r.expires_at,
})

async function draftFields(db: D1Database, user: Participant, body: Record<string, unknown>) {
  const payload = body.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { error: 'Draft content is missing.' }
  const serialized = JSON.stringify(payload)
  if (serialized.length > DRAFT_BYTES) return { error: 'This draft is too large to save. Shorten the longest answers.' }
  const organization = body.organizationId === undefined || body.organizationId === '' || body.organizationId === null ? null : textValue(body.organizationId, 36)
  if (organization !== null && !await membership(db, organization, user.email)) return { error: 'Choose one of your organizations.' }
  const title = typeof (payload as Record<string, unknown>).title === 'string' ? String((payload as Record<string, unknown>).title).trim().slice(0, 200) : ''
  return { serialized, organization, title }
}

export async function participantWorkflowRoutes(request: Request, env: Env, user: Participant, path: string): Promise<Response | null> {
  const db = env.DB!
  const now = new Date()

  if (path === '/drafts' && request.method === 'GET') {
    await db.prepare('DELETE FROM submission_drafts WHERE email=? AND expires_at<?').bind(user.email, now.toISOString()).run()
    const rows = await db.prepare('SELECT id,kind,title,organization_id,version,updated_at,expires_at FROM submission_drafts WHERE email=? ORDER BY updated_at DESC')
      .bind(user.email).all<Record<string, unknown>>()
    return reply({ items: rows.results.map(draftSummary) })
  }
  if (path === '/drafts' && request.method === 'POST') {
    const body = await bodyObject(request, DRAFT_BYTES + 4096)
    if (!body) return reply({ error: 'Invalid request.' }, 400)
    if (body.kind !== 'challenge' && body.kind !== 'innovation') return reply({ error: 'Unknown draft type.' }, 422)
    const fields = await draftFields(db, user, body)
    if ('error' in fields) return reply({ error: fields.error }, 422)
    const count = await db.prepare('SELECT COUNT(*) n FROM submission_drafts WHERE email=? AND expires_at>?').bind(user.email, now.toISOString()).first<{ n: number }>()
    if ((count?.n ?? 0) >= DRAFT_LIMIT) return reply({ error: `You can keep ${DRAFT_LIMIT} drafts. Delete one to save another.` }, 409)
    const id = crypto.randomUUID()
    await db.prepare(`INSERT INTO submission_drafts(id,email,organization_id,kind,title,payload,created_at,updated_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(id, user.email, fields.organization, body.kind, fields.title, fields.serialized, now.toISOString(), now.toISOString(),
        new Date(now.getTime() + DRAFT_DAYS * 86_400_000).toISOString()).run()
    return reply({ id, version: 1 }, 201)
  }
  const draft = path.match(/^\/drafts\/([a-f0-9-]{36})$/)
  if (draft) {
    const id = draft[1]
    // Drafts are private to their author: another member's id is simply not found.
    const row = await db.prepare('SELECT * FROM submission_drafts WHERE id=? AND email=? AND expires_at>?').bind(id, user.email, now.toISOString()).first<Record<string, unknown>>()
    if (!row) return reply({ error: 'Draft not found.' }, 404)
    if (request.method === 'GET') return reply({ ...draftSummary(row), payload: JSON.parse(String(row.payload)) })
    if (request.method === 'DELETE') {
      await db.prepare('DELETE FROM submission_drafts WHERE id=? AND email=?').bind(id, user.email).run()
      return reply({ ok: true })
    }
    if (request.method === 'PUT') {
      const body = await bodyObject(request, DRAFT_BYTES + 4096)
      if (!body) return reply({ error: 'Invalid request.' }, 400)
      const fields = await draftFields(db, user, body)
      if ('error' in fields) return reply({ error: fields.error }, 422)
      // Optimistic concurrency: two tabs cannot silently overwrite each other.
      const saved = await db.prepare(`UPDATE submission_drafts SET payload=?,title=?,organization_id=?,version=version+1,updated_at=?,expires_at=?
        WHERE id=? AND email=? AND version=? RETURNING version`)
        .bind(fields.serialized, fields.title, fields.organization, now.toISOString(), new Date(now.getTime() + DRAFT_DAYS * 86_400_000).toISOString(),
          id, user.email, Number(body.version)).first<{ version: number }>()
      if (!saved) return reply({ error: 'This draft changed in another window. Reload it before saving.' }, 409)
      return reply({ id, version: saved.version })
    }
    return reply({ error: 'Method not allowed.' }, 405)
  }

  const record = path.match(/^\/records\/([A-Za-z0-9-]{1,32})\/(clarifications|qualification|follow-ups)(\/.*)?$/)
  if (!record) return null
  const owned = await accessibleCase(db, record[1], user.email)
  if (!owned) return reply({ error: 'Not found.' }, 404)
  if (record[2] === 'follow-ups') {
    const status = await db.prepare(`SELECT review_status FROM ${owned.kind === 'challenge' ? 'challenges' : 'innovations'} WHERE reference=?`).bind(owned.reference).first<{ review_status: string }>()
    if (request.method !== 'GET' && ['declined', 'withdrawn'].includes(status?.review_status ?? '')) return reply({ error: 'This case is closed.' }, 409)
    const actor = { email: user.email, side: 'participant' as const }
    return followUpRoutes(request, db, owned.reference, user.email, record[3] ?? '', (body) =>
      qualificationRoutes(new Request(request.url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), db, owned.reference, actor, ''))
  }
  if (record[2] === 'qualification') {
    const status = await db.prepare(`SELECT review_status FROM ${owned.kind === 'challenge' ? 'challenges' : 'innovations'} WHERE reference=?`).bind(owned.reference).first<{ review_status: string }>()
    if (request.method !== 'GET' && ['declined', 'withdrawn'].includes(status?.review_status ?? '')) return reply({ error: 'This case is closed.' }, 409)
    return qualificationRoutes(request, db, owned.reference, { email: user.email, side: 'participant' }, record[3] ?? '')
  }
  if (!record[3] && request.method === 'GET') {
    const rows = await db.prepare('SELECT id,question,asked_at,due_at,status,response,responded_at FROM clarification_requests WHERE reference=? AND status!=\'withdrawn\' ORDER BY id DESC')
      .bind(owned.reference).all<Record<string, unknown>>()
    return reply({ items: rows.results.map((q) => ({ id: q.id, question: q.question, askedAt: q.asked_at, dueAt: q.due_at, status: q.status, response: q.response, respondedAt: q.responded_at })) })
  }
  const answer = (record[3] ?? '').match(/^\/(\d{1,12})$/)
  if (answer && request.method === 'POST') {
    const body = await bodyObject(request)
    const response = textValue(body?.response, 4000)
    if (!response) return reply({ error: 'Write your answer (4,000 characters at most).' }, 422)
    const changed = await db.prepare(`UPDATE clarification_requests SET status='answered',response=?,responded_by=?,responded_at=?
      WHERE id=? AND reference=? AND status='open'`).bind(response, user.email, now.toISOString(), Number(answer[1]), owned.reference).run()
    if (!changed.meta.changes) return reply({ error: 'This question is no longer open.' }, 409)
    await settleReviewStatus(db, owned.reference)
    return reply({ ok: true })
  }
  return reply({ error: 'Not found.' }, 404)
}
