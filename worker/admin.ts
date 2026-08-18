import { authenticate, capabilities, clearedCookie, constantTimeEqual, hashPassword, issueSession, newSalt, ROLES, sessionCookie, adminConfigured } from './auth'
import type { AuthContext, Role } from './auth'
import { audit } from './audit'
import { signEvidence, verifyEvidence } from './evidence'
import {
  ACQUISITION_STAGES, CHALLENGE_STATUSES, DIMENSION_KEYS,
  INNOVATION_STATUSES, SCORING_DIMENSIONS,
} from './scoring'
import type { Env } from './types'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })

const oneOf = <T extends readonly string[]>(list: T, value: unknown): value is T[number] =>
  typeof value === 'string' && (list as readonly string[]).includes(value)

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/* ------------------------------------------------------------- serializers */

/**
 * Every response is assembled field by field.
 *
 * There is no `SELECT *` path to the client anywhere in this file. The brief
 * is explicit that confidentiality must not depend on the frontend hiding
 * things, so a role that may not see innovator identity never receives it —
 * the fields are absent from the payload, not merely unrendered.
 */
function innovationSummary(row: Record<string, unknown>, ctx: AuthContext) {
  const base = {
    reference: row.reference,
    createdAt: row.created_at,
    status: row.status,
    acquisitionStage: row.acquisition_stage,
    title: row.title,
    internalTitle: row.internal_title ?? null,
    category: row.category,
    entryTrl: row.entry_trl,
    currentTrl: row.current_trl ?? null,
    targetTrl: row.target_trl ?? null,
    reviewer: row.reviewer ?? null,
    institutionType: row.institution_type ?? null,
    evidenceCount: row.evidence_count ?? 0,
  }
  if (!ctx.can.viewInnovatorIdentity) return base
  return {
    ...base,
    innovator: row.innovator_name,
    innovatorEmail: row.innovator_email,
    institution: row.institution ?? null,
  }
}

function challengeSummary(row: Record<string, unknown>, ctx: AuthContext) {
  const base = {
    reference: row.reference,
    createdAt: row.created_at,
    status: row.status,
    confidentiality: row.confidentiality,
    sector: row.sector,
    title: row.title,
    analyst: row.analyst ?? null,
  }
  if (!ctx.can.viewChallengeContacts) return base
  return {
    ...base,
    company: row.company,
    contactName: row.contact_name,
    designation: row.designation ?? null,
    email: row.email,
    phone: row.phone ?? null,
    location: row.location ?? null,
    website: row.website ?? null,
  }
}

/** Identity keys inside the submitted payload, stripped for reviewer roles. */
const IDENTIFYING = new Set([
  'name', 'email', 'mobile', 'linkedin', 'location', 'institution',
  'institutionType', 'department', 'course', 'graduationYear',
  'teamMembers', 'facultyMentor', 'coInventors',
])

function redactPayload(payload: Record<string, unknown>, ctx: AuthContext) {
  if (ctx.can.viewInnovatorIdentity) return payload
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (!IDENTIFYING.has(k)) out[k] = v
  }
  return out
}

const parsePayload = (raw: unknown): Record<string, unknown> => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/* -------------------------------------------------------------- login flow */

async function handleLogin(env: Env, request: Request, ip: string): Promise<Response> {
  const config = adminConfigured(env)
  if (!config.passwords || !env.DB) {
    return json({ error: 'Password sign-in is not enabled on this deployment.' }, 503)
  }

  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null
  const email = clip(body?.email, 254).toLowerCase()
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) return json({ error: 'Enter an email address and password.' }, 400)

  const row = await env.DB
    .prepare('SELECT email, role, password_hash, password_salt, token_version, disabled FROM users WHERE email = ?')
    .bind(email)
    .first<{ email: string; role: string; password_hash: string | null; password_salt: string | null; token_version: number; disabled: number }>()

  // One message for every failure mode, so the endpoint cannot be used to
  // discover which addresses have accounts.
  const refuse = () => json({ error: 'Those credentials were not recognised.' }, 401)

  if (!row || row.disabled || !row.password_hash || !row.password_salt) {
    // Still spend the hashing time, so a missing account is not faster to
    // probe than a wrong password.
    await hashPassword(password, 'decoy-salt-value')
    return refuse()
  }

  const attempt = await hashPassword(password, row.password_salt)
  if (!constantTimeEqual(attempt, row.password_hash)) return refuse()
  if (!ROLES.includes(row.role as Role)) return refuse()

  const token = await issueSession(env.SESSION_SECRET!, { email: row.email, role: row.role as Role }, row.token_version)
  await env.DB.prepare('UPDATE users SET last_seen_at = ? WHERE email = ?')
    .bind(new Date().toISOString(), row.email).run()
  await audit(env.DB, { email: row.email, role: row.role as Role }, 'admin.login', undefined, undefined, ip)

  return json({ email: row.email, role: row.role }, 200, { 'set-cookie': sessionCookie(token) })
}

/* ------------------------------------------------------------------ routes */

export async function handleAdmin(request: Request, env: Env, url: URL, ip: string): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/admin/, '') || '/'

  // Reports how the admin surface is protected. Deliberately says nothing
  // about whether any particular account exists.
  if (path === '/config' && request.method === 'GET') {
    const config = adminConfigured(env)
    return json({ configured: config.any, access: config.access, passwords: config.passwords })
  }

  if (path === '/login' && request.method === 'POST') return handleLogin(env, request, ip)

  if (path === '/logout' && request.method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': clearedCookie() })
  }

  // Evidence downloads carry their own signature and are checked before the
  // session, because the browser fetches them as a plain navigation.
  if (path === '/evidence' && request.method === 'GET') {
    const auth = await authenticate(env, request)
    if (!auth.ok) return json({ error: auth.error }, auth.status)
    if (!auth.value.can.downloadEvidence) return json({ error: 'Not permitted' }, 403)
    if (!env.EVIDENCE || !env.SESSION_SECRET) return json({ error: 'File storage is not configured.' }, 503)

    const key = url.searchParams.get('key') ?? ''
    const exp = url.searchParams.get('exp') ?? ''
    const sig = url.searchParams.get('sig') ?? ''
    if (!(await verifyEvidence(env.SESSION_SECRET, key, exp, sig))) {
      return json({ error: 'This download link is invalid or has expired.' }, 403)
    }
    const object = await env.EVIDENCE.get(key)
    if (!object) return json({ error: 'File not found' }, 404)

    await audit(auth.value.db, auth.value.actor, 'evidence.download', key, undefined, ip)
    return new Response(object.body, {
      headers: {
        'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
        'content-disposition': 'attachment',
        'cache-control': 'no-store',
      },
    })
  }

  const auth = await authenticate(env, request)
  if (!auth.ok) return json({ error: auth.error }, auth.status)
  const ctx = auth.value
  const { db, actor, can } = ctx

  if (path === '/me' && request.method === 'GET') {
    return json({ email: actor.email, role: actor.role, can })
  }

  if (path === '/meta' && request.method === 'GET') {
    return json({
      dimensions: SCORING_DIMENSIONS,
      acquisitionStages: ACQUISITION_STAGES,
      challengeStatuses: CHALLENGE_STATUSES,
      innovationStatuses: INNOVATION_STATUSES,
      roles: ROLES,
    })
  }

  /* ------------------------------------------------------------- overview */

  if (path === '/overview' && request.method === 'GET') {
    // Every figure is counted from real rows. Nothing is estimated, and a
    // metric with no data reads as zero rather than being invented.
    const [innovations, challenges, trl, byCategory, byInstitution, bySector, byStage] = await Promise.all([
      db.prepare('SELECT COUNT(*) AS n FROM innovations').first<{ n: number }>(),
      db.prepare('SELECT COUNT(*) AS n FROM challenges').first<{ n: number }>(),
      db.prepare('SELECT AVG(entry_trl) AS entry, AVG(COALESCE(current_trl, entry_trl)) AS current FROM innovations')
        .first<{ entry: number | null; current: number | null }>(),
      db.prepare('SELECT category AS k, COUNT(*) AS n FROM innovations GROUP BY category ORDER BY n DESC').all(),
      db.prepare("SELECT COALESCE(NULLIF(institution_type,''),'Unstated') AS k, COUNT(*) AS n FROM innovations GROUP BY k ORDER BY n DESC").all(),
      db.prepare('SELECT sector AS k, COUNT(*) AS n FROM challenges GROUP BY sector ORDER BY n DESC').all(),
      db.prepare('SELECT acquisition_stage AS k, COUNT(*) AS n FROM innovations GROUP BY k').all(),
    ])

    const qualified = await db
      .prepare("SELECT COUNT(*) AS n FROM innovations WHERE status NOT IN ('Submitted','Initial Review','Archived')")
      .first<{ n: number }>()
    const inDevelopment = await db
      .prepare("SELECT COUNT(*) AS n FROM innovations WHERE acquisition_stage = 'Development Portfolio'")
      .first<{ n: number }>()

    return json({
      innovations: innovations?.n ?? 0,
      qualified: qualified?.n ?? 0,
      inDevelopment: inDevelopment?.n ?? 0,
      challenges: challenges?.n ?? 0,
      averageEntryTrl: trl?.entry ?? null,
      averageCurrentTrl: trl?.current ?? null,
      byCategory: byCategory.results,
      byInstitutionType: can.viewInnovatorIdentity ? byInstitution.results : null,
      bySector: bySector.results,
      byAcquisitionStage: byStage.results,
    })
  }

  /* ---------------------------------------------------------- innovations */

  if (path === '/innovations' && request.method === 'GET') {
    const status = url.searchParams.get('status')
    const stage = url.searchParams.get('stage')
    const where: string[] = []
    const binds: unknown[] = []
    if (status && oneOf(INNOVATION_STATUSES, status)) { where.push('i.status = ?'); binds.push(status) }
    if (stage && oneOf(ACQUISITION_STAGES, stage)) { where.push('i.acquisition_stage = ?'); binds.push(stage) }

    const rows = await db
      .prepare(
        `SELECT i.*, (SELECT COUNT(*) FROM evidence e WHERE e.reference = i.reference) AS evidence_count
         FROM innovations i
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY i.created_at DESC LIMIT 200`,
      )
      .bind(...binds)
      .all<Record<string, unknown>>()

    await audit(db, actor, 'innovations.list', undefined, { count: rows.results.length }, ip)
    return json({ items: rows.results.map((r) => innovationSummary(r, ctx)) })
  }

  const innovationMatch = path.match(/^\/innovations\/([A-Za-z0-9-]{1,32})$/)
  if (innovationMatch && request.method === 'GET') {
    const reference = innovationMatch[1]
    const row = await db.prepare('SELECT * FROM innovations WHERE reference = ?').bind(reference)
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404)

    const [scoreRows, noteRows, files] = await Promise.all([
      db.prepare('SELECT dimension, value, note, scored_by, scored_at FROM scores WHERE reference = ?').bind(reference).all(),
      db.prepare('SELECT id, body, author, created_at FROM notes WHERE reference = ? ORDER BY created_at DESC').bind(reference).all(),
      db.prepare('SELECT object_key, file_name, content_type, size_bytes FROM evidence WHERE reference = ?').bind(reference).all<Record<string, unknown>>(),
    ])

    const evidence = env.SESSION_SECRET
      ? await Promise.all(
          files.results.map(async (f) => ({
            fileName: f.file_name,
            contentType: f.content_type,
            sizeBytes: f.size_bytes,
            url: await signEvidence(env.SESSION_SECRET!, String(f.object_key)),
          })),
        )
      : files.results.map((f) => ({ fileName: f.file_name, contentType: f.content_type, sizeBytes: f.size_bytes, url: null }))

    // Logged as a read: opening a disclosure is the sensitive action here.
    await audit(db, actor, 'innovation.view', reference, undefined, ip)

    return json({
      ...innovationSummary(row, ctx),
      payload: redactPayload(parsePayload(row.payload), ctx),
      identityWithheld: !can.viewInnovatorIdentity,
      scores: scoreRows.results,
      notes: noteRows.results,
      evidence,
    })
  }

  if (innovationMatch && request.method === 'PATCH') {
    const reference = innovationMatch[1]
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const sets: string[] = []
    const binds: unknown[] = []

    if (oneOf(INNOVATION_STATUSES, body.status)) {
      if (!can.editReviewState) return json({ error: 'Not permitted to change review state' }, 403)
      sets.push('status = ?'); binds.push(body.status)
    }
    if (oneOf(ACQUISITION_STAGES, body.acquisitionStage)) {
      if (!can.moveAcquisitionStage) return json({ error: 'Not permitted to move acquisition stage' }, 403)
      sets.push('acquisition_stage = ?'); binds.push(body.acquisitionStage)
    }
    for (const [field, column] of [['internalTitle', 'internal_title'], ['reviewer', 'reviewer']] as const) {
      if (typeof body[field] === 'string') {
        if (!can.editReviewState) return json({ error: 'Not permitted to edit review state' }, 403)
        sets.push(`${column} = ?`); binds.push(clip(body[field], 200))
      }
    }
    for (const [field, column] of [['currentTrl', 'current_trl'], ['targetTrl', 'target_trl']] as const) {
      if (body[field] !== undefined) {
        if (!can.editReviewState) return json({ error: 'Not permitted to edit review state' }, 403)
        const n = Number(body[field])
        if (!Number.isInteger(n) || n < 1 || n > 9) return json({ error: 'TRL must be between 1 and 9' }, 422)
        sets.push(`${column} = ?`); binds.push(n)
      }
    }
    if (sets.length === 0) return json({ error: 'Nothing to update' }, 400)

    binds.push(reference)
    await db.prepare(`UPDATE innovations SET ${sets.join(', ')} WHERE reference = ?`).bind(...binds).run()
    await audit(db, actor, 'innovation.update', reference, body, ip)
    return json({ ok: true })
  }

  const scoreMatch = path.match(/^\/innovations\/([A-Za-z0-9-]{1,32})\/scores$/)
  if (scoreMatch && request.method === 'POST') {
    if (!can.score) return json({ error: 'Not permitted to score' }, 403)
    const reference = scoreMatch[1]
    const body = (await request.json().catch(() => ({}))) as { dimension?: unknown; value?: unknown; note?: unknown }
    if (!oneOf(DIMENSION_KEYS, body.dimension)) return json({ error: 'Unknown scoring dimension' }, 422)

    const value = body.value === null || body.value === undefined ? null : Number(body.value)
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 5)) {
      return json({ error: 'Score must be between 1 and 5' }, 422)
    }
    await db
      .prepare(
        `INSERT INTO scores (reference, dimension, value, note, scored_by, scored_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(reference, dimension) DO UPDATE
           SET value = excluded.value, note = excluded.note,
               scored_by = excluded.scored_by, scored_at = excluded.scored_at`,
      )
      .bind(reference, body.dimension, value, clip(body.note, 2000), actor.email, new Date().toISOString())
      .run()
    await audit(db, actor, 'innovation.score', reference, { dimension: body.dimension, value }, ip)
    return json({ ok: true })
  }

  /* ------------------------------------------------------------ challenges */

  if (path === '/challenges' && request.method === 'GET') {
    const status = url.searchParams.get('status')
    const rows = await db
      .prepare(
        `SELECT * FROM challenges ${status && oneOf(CHALLENGE_STATUSES, status) ? 'WHERE status = ?' : ''}
         ORDER BY created_at DESC LIMIT 200`,
      )
      .bind(...(status && oneOf(CHALLENGE_STATUSES, status) ? [status] : []))
      .all<Record<string, unknown>>()
    await audit(db, actor, 'challenges.list', undefined, { count: rows.results.length }, ip)
    return json({ items: rows.results.map((r) => challengeSummary(r, ctx)) })
  }

  const challengeMatch = path.match(/^\/challenges\/([A-Za-z0-9-]{1,32})$/)
  if (challengeMatch && request.method === 'GET') {
    const reference = challengeMatch[1]
    const row = await db.prepare('SELECT * FROM challenges WHERE reference = ?').bind(reference)
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404)
    const noteRows = await db
      .prepare('SELECT id, body, author, created_at FROM notes WHERE reference = ? ORDER BY created_at DESC')
      .bind(reference).all()
    await audit(db, actor, 'challenge.view', reference, undefined, ip)
    return json({
      ...challengeSummary(row, ctx),
      payload: parsePayload(row.payload),
      contactsWithheld: !can.viewChallengeContacts,
      notes: noteRows.results,
    })
  }

  if (challengeMatch && request.method === 'PATCH') {
    const reference = challengeMatch[1]
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const sets: string[] = []
    const binds: unknown[] = []
    if (oneOf(CHALLENGE_STATUSES, body.status)) { sets.push('status = ?'); binds.push(body.status) }
    if (typeof body.analyst === 'string') { sets.push('analyst = ?'); binds.push(clip(body.analyst, 200)) }
    if (sets.length === 0) return json({ error: 'Nothing to update' }, 400)
    binds.push(reference)
    await db.prepare(`UPDATE challenges SET ${sets.join(', ')} WHERE reference = ?`).bind(...binds).run()
    await audit(db, actor, 'challenge.update', reference, body, ip)
    return json({ ok: true })
  }

  /* ----------------------------------------------------------------- notes */

  const noteMatch = path.match(/^\/notes\/([A-Za-z0-9-]{1,32})$/)
  if (noteMatch && request.method === 'POST') {
    const reference = noteMatch[1]
    const body = (await request.json().catch(() => ({}))) as { body?: unknown }
    const text = clip(body.body, 4000)
    if (!text) return json({ error: 'A note cannot be empty' }, 422)
    await db
      .prepare('INSERT INTO notes (reference, body, author, created_at) VALUES (?, ?, ?, ?)')
      .bind(reference, text, actor.email, new Date().toISOString())
      .run()
    await audit(db, actor, 'note.add', reference, undefined, ip)
    return json({ ok: true })
  }

  /* ----------------------------------------------------------------- audit */

  if (path === '/audit' && request.method === 'GET') {
    if (!can.viewAudit) return json({ error: 'Not permitted' }, 403)
    const rows = await db
      .prepare('SELECT at, actor, role, action, target FROM audit_log ORDER BY at DESC LIMIT 200')
      .all()
    return json({ items: rows.results })
  }

  /* ----------------------------------------------------------------- users */

  if (path === '/users' && request.method === 'GET') {
    if (!can.manageUsers) return json({ error: 'Not permitted' }, 403)
    const rows = await db
      .prepare('SELECT email, role, disabled, created_at, last_seen_at FROM users ORDER BY created_at')
      .all()
    return json({ items: rows.results })
  }

  if (path === '/users' && request.method === 'POST') {
    if (!can.manageUsers) return json({ error: 'Not permitted' }, 403)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const email = clip(body.email, 254).toLowerCase()
    const role = body.role
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !oneOf(ROLES, role)) return json({ error: 'An email address and a valid role are required' }, 422)
    if (password && password.length < 12) {
      return json({ error: 'A password must be at least 12 characters' }, 422)
    }

    const salt = password ? newSalt() : null
    const hash = password && salt ? await hashPassword(password, salt) : null
    await db
      .prepare(
        `INSERT INTO users (email, role, password_hash, password_salt, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           role = excluded.role,
           password_hash = COALESCE(excluded.password_hash, users.password_hash),
           password_salt = COALESCE(excluded.password_salt, users.password_salt),
           -- Any change to an account ends its existing sessions.
           token_version = users.token_version + 1`,
      )
      .bind(email, role, hash, salt, new Date().toISOString())
      .run()
    await audit(db, actor, 'user.upsert', email, { role }, ip)
    return json({ ok: true })
  }

  return json({ error: 'Not found' }, 404)
}

export { capabilities }
