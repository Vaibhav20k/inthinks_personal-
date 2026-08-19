import { authenticate, capabilities, clearedCookie, constantTimeEqual, hashPassword, issueSession, newSalt, ROLES, sessionCookie, adminConfigured } from './auth'
import type { AuthContext, Role } from './auth'
import { audit } from './audit'
import { signEvidence, verifyEvidence } from './evidence'
import {
  ACQUISITION_STAGES, CHALLENGE_STATUSES, DIMENSION_KEYS,
  INNOVATION_STATUSES, SCORING_DIMENSIONS,
} from './scoring'
import type { Env } from './types'
import { MATCH_DECISIONS, decide, generateMatches } from './matches'
import {
  DEVELOPMENT_STAGES, DEVELOPMENT_STAGES_ELIGIBLE, LOG_KINDS,
  READINESS_DIMENSIONS, READINESS_KEYS, READINESS_STATUSES,
} from './development'
import { CLOSED_STAGE, OPPORTUNITY_STAGES, PIPELINE_STAGES, derivedFunnel } from './opportunities'

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
      developmentStages: DEVELOPMENT_STAGES,
      logKinds: LOG_KINDS,
      readinessDimensions: READINESS_DIMENSIONS,
      readinessStatuses: READINESS_STATUSES,
      pipelineStages: PIPELINE_STAGES,
      opportunityStages: [...OPPORTUNITY_STAGES, CLOSED_STAGE],
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

  /* ----------------------------------------------------------- development */

  if (path === '/development' && request.method === 'GET') {
    // Only technologies InThinks holds rights to develop have a workspace.
    const placeholders = DEVELOPMENT_STAGES_ELIGIBLE.map(() => '?').join(', ')
    const rows = await db
      .prepare(
        `SELECT i.reference, i.title, i.internal_title, i.category, i.entry_trl,
                i.current_trl, i.target_trl, i.development_stage, i.acquisition_stage,
                i.reviewer,
                (SELECT COUNT(*) FROM dev_log l WHERE l.reference = i.reference) AS log_entries,
                (SELECT MAX(occurred_on) FROM dev_log l WHERE l.reference = i.reference) AS last_activity
         FROM innovations i
         WHERE i.acquisition_stage IN (${placeholders})
         ORDER BY last_activity DESC NULLS LAST, i.created_at DESC`,
      )
      .bind(...DEVELOPMENT_STAGES_ELIGIBLE)
      .all<Record<string, unknown>>()

    return json({
      items: rows.results.map((r) => ({
        reference: r.reference,
        title: r.internal_title || r.title,
        category: r.category,
        entryTrl: r.entry_trl,
        currentTrl: r.current_trl ?? r.entry_trl,
        targetTrl: r.target_trl,
        developmentStage: r.development_stage,
        acquisitionStage: r.acquisition_stage,
        reviewer: r.reviewer,
        logEntries: r.log_entries ?? 0,
        lastActivity: r.last_activity ?? null,
      })),
    })
  }

  const workspaceMatch = path.match(/^\/development\/([A-Za-z0-9-]{1,32})$/)
  if (workspaceMatch && request.method === 'GET') {
    const reference = workspaceMatch[1]
    const row = await db
      .prepare(
        `SELECT reference, title, internal_title, category, entry_trl, current_trl,
                target_trl, development_stage, acquisition_stage, status, reviewer
         FROM innovations WHERE reference = ?`,
      )
      .bind(reference)
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404)

    const [logRows, readinessRows, files] = await Promise.all([
      db.prepare(
        `SELECT id, kind, title, body, occurred_on, stage, trl, author, created_at, published
         FROM dev_log WHERE reference = ? ORDER BY occurred_on DESC, id DESC`,
      ).bind(reference).all<Record<string, unknown>>(),
      db.prepare('SELECT dimension, status, note, updated_by, updated_at FROM readiness WHERE reference = ?')
        .bind(reference).all(),
      db.prepare('SELECT object_key, file_name, content_type, size_bytes, log_id FROM evidence WHERE reference = ? AND log_id IS NOT NULL')
        .bind(reference).all<Record<string, unknown>>(),
    ])

    const attachments = env.SESSION_SECRET
      ? await Promise.all(files.results.map(async (f) => ({
          logId: f.log_id,
          fileName: f.file_name,
          sizeBytes: f.size_bytes,
          url: await signEvidence(env.SESSION_SECRET!, String(f.object_key)),
        })))
      : []

    await audit(db, actor, 'development.view', reference, undefined, ip)

    return json({
      reference: row.reference,
      title: row.internal_title || row.title,
      submittedTitle: row.title,
      category: row.category,
      entryTrl: row.entry_trl,
      currentTrl: row.current_trl ?? row.entry_trl,
      targetTrl: row.target_trl,
      developmentStage: row.development_stage,
      acquisitionStage: row.acquisition_stage,
      status: row.status,
      reviewer: row.reviewer,
      log: logRows.results.map((l) => ({
        id: l.id,
        kind: l.kind,
        title: l.title,
        body: l.body,
        occurredOn: l.occurred_on,
        stage: l.stage,
        trl: l.trl,
        author: l.author,
        createdAt: l.created_at,
        published: Boolean(l.published),
      })),
      readiness: readinessRows.results,
      attachments,
    })
  }

  if (workspaceMatch && request.method === 'PATCH') {
    if (!can.editReviewState) return json({ error: 'Not permitted to change development state' }, 403)
    const reference = workspaceMatch[1]
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    if (!oneOf(DEVELOPMENT_STAGES, body.developmentStage)) return json({ error: 'Unknown development stage' }, 422)
    await db.prepare('UPDATE innovations SET development_stage = ? WHERE reference = ?')
      .bind(body.developmentStage, reference).run()
    await audit(db, actor, 'development.stage', reference, { stage: body.developmentStage }, ip)
    return json({ ok: true })
  }

  const logMatch = path.match(/^\/development\/([A-Za-z0-9-]{1,32})\/log$/)
  if (logMatch && request.method === 'POST') {
    if (!can.editReviewState) return json({ error: 'Not permitted to log development work' }, 403)
    const reference = logMatch[1]

    // Multipart when the entry carries attachments; JSON otherwise.
    const contentType = request.headers.get('content-type') ?? ''
    let fields: Record<string, string> = {}
    let uploads: File[] = []

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      for (const [k, v] of form.entries()) {
        if (typeof v === 'string') fields[k] = v
      }
      uploads = form.getAll('files').filter((f): f is File => f instanceof File)
    } else {
      const parsedBody = (await request.json().catch(() => ({}))) as Record<string, unknown>
      fields = Object.fromEntries(
        Object.entries(parsedBody).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]),
      )
    }

    if (!oneOf(LOG_KINDS, fields.kind)) return json({ error: 'Unknown entry kind' }, 422)
    const title = clip(fields.title, 200)
    if (!title) return json({ error: 'An entry needs a title' }, 422)

    const trl = fields.trl ? Number(fields.trl) : null
    if (trl !== null && (!Number.isInteger(trl) || trl < 1 || trl > 9)) {
      return json({ error: 'TRL must be between 1 and 9' }, 422)
    }

    const inserted = await db
      .prepare(
        `INSERT INTO dev_log (reference, kind, title, body, occurred_on, stage, trl, author, created_at, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
         RETURNING id`,
      )
      .bind(
        reference,
        fields.kind,
        title,
        clip(fields.body, 8000),
        clip(fields.occurredOn, 20) || new Date().toISOString().slice(0, 10),
        oneOf(DEVELOPMENT_STAGES, fields.stage) ? fields.stage : null,
        trl,
        actor.email,
        new Date().toISOString(),
      )
      .first<{ id: number }>()

    // An entry that asserts a TRL advances the record, so the two stay in step.
    if (trl !== null) {
      await db.prepare('UPDATE innovations SET current_trl = ? WHERE reference = ?').bind(trl, reference).run()
    }

    for (const file of uploads.slice(0, 12)) {
      if (file.size > 25 * 1024 * 1024) continue
      if (!env.EVIDENCE) break
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase() : ''
      const key = `${reference}/dev/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`
      await env.EVIDENCE.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
        customMetadata: { reference },
      })
      await db
        .prepare(
          `INSERT INTO evidence (reference, object_key, file_name, content_type, size_bytes, created_at, log_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(reference, key, file.name.slice(0, 300), file.type || 'application/octet-stream', file.size, new Date().toISOString(), inserted?.id ?? null)
        .run()
    }

    await audit(db, actor, 'development.log', reference, { kind: fields.kind, files: uploads.length }, ip)
    return json({ ok: true, id: inserted?.id })
  }

  const publishMatch = path.match(/^\/development\/log\/(\d{1,12})\/publish$/)
  if (publishMatch && request.method === 'POST') {
    // Publication puts an entry on a public technology page, so it is gated on
    // the commercial capability rather than the review one.
    if (!can.moveAcquisitionStage) {
      return json({ error: 'Only admins and business development can publish a development entry.' }, 403)
    }
    const body = (await request.json().catch(() => ({}))) as { published?: unknown }
    const published = body.published === true ? 1 : 0
    await db.prepare('UPDATE dev_log SET published = ? WHERE id = ?').bind(published, Number(publishMatch[1])).run()
    await audit(db, actor, published ? 'development.publish' : 'development.unpublish', publishMatch[1], undefined, ip)
    return json({ ok: true })
  }

  const readinessMatch = path.match(/^\/development\/([A-Za-z0-9-]{1,32})\/readiness$/)
  if (readinessMatch && request.method === 'POST') {
    if (!can.editReviewState) return json({ error: 'Not permitted to set readiness' }, 403)
    const reference = readinessMatch[1]
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    if (!oneOf(READINESS_KEYS, body.dimension)) return json({ error: 'Unknown readiness dimension' }, 422)
    if (!oneOf(READINESS_STATUSES, body.status)) return json({ error: 'Unknown readiness status' }, 422)
    await db
      .prepare(
        `INSERT INTO readiness (reference, dimension, status, note, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(reference, dimension) DO UPDATE SET
           status = excluded.status, note = excluded.note,
           updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
      )
      .bind(reference, body.dimension, body.status, clip(body.note, 2000), actor.email, new Date().toISOString())
      .run()
    await audit(db, actor, 'development.readiness', reference, { dimension: body.dimension, status: body.status }, ip)
    return json({ ok: true })
  }

  /* --------------------------------------------------------------- matches */

  if (path === '/matches' && request.method === 'GET') {
    const challenge = url.searchParams.get('challenge')
    const decision = url.searchParams.get('decision')
    const where: string[] = []
    const binds: unknown[] = []
    if (challenge) { where.push('m.challenge_ref = ?'); binds.push(challenge) }
    if (decision && oneOf(MATCH_DECISIONS, decision)) { where.push('m.decision = ?'); binds.push(decision) }

    const rows = await db
      .prepare(
        `SELECT m.*, c.title AS challenge_title, c.sector AS challenge_sector,
                i.title AS technology_title, i.category AS technology_category
         FROM matches m
         LEFT JOIN challenges c ON c.reference = m.challenge_ref
         LEFT JOIN innovations i ON i.reference = m.technology_ref
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY m.created_at DESC LIMIT 200`,
      )
      .bind(...binds)
      .all<Record<string, unknown>>()

    return json({
      items: rows.results.map((r) => ({
        reference: r.reference,
        createdAt: r.created_at,
        challengeRef: r.challenge_ref,
        challengeTitle: r.challenge_title,
        challengeSector: r.challenge_sector,
        technologyRef: r.technology_ref,
        technologyTitle: r.technology_title,
        technologyCategory: r.technology_category,
        classification: r.classification,
        decision: r.decision,
        trlGap: r.trl_gap,
        ipRisk: r.ip_risk,
      })),
    })
  }

  if (path === '/matches/generate' && request.method === 'POST') {
    if (!can.editReviewState) return json({ error: 'Not permitted to run the match engine' }, 403)
    const body = (await request.json().catch(() => ({}))) as { challenge?: unknown }
    const challengeRef = clip(body.challenge, 32)
    if (!challengeRef) return json({ error: 'A challenge reference is required' }, 422)
    try {
      const result = await generateMatches(env, ctx, challengeRef, ip)
      return json(result)
    } catch (cause) {
      const status = (cause as { status?: number }).status ?? 502
      const message = cause instanceof Error ? cause.message : 'The match engine failed.'
      // Engine failures are logged by shape, never with the challenge content.
      console.error('match engine failed', status)
      return json({ error: message }, status)
    }
  }

  const matchMatch = path.match(/^\/matches\/([A-Za-z0-9-]{1,32})$/)
  if (matchMatch && request.method === 'GET') {
    const reference = matchMatch[1]
    const row = await db
      .prepare(
        `SELECT m.*, c.title AS challenge_title, c.sector AS challenge_sector,
                c.confidentiality AS challenge_confidentiality,
                i.title AS technology_title, i.category AS technology_category,
                i.entry_trl, i.current_trl, i.target_trl, i.acquisition_stage
         FROM matches m
         LEFT JOIN challenges c ON c.reference = m.challenge_ref
         LEFT JOIN innovations i ON i.reference = m.technology_ref
         WHERE m.reference = ?`,
      )
      .bind(reference)
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404)

    await audit(db, actor, 'match.view', reference, undefined, ip)

    // No innovator or company identity is assembled into this response: a
    // match room shows a challenge and a technology, never the two parties.
    return json({
      reference: row.reference,
      createdAt: row.created_at,
      engine: row.engine,
      challenge: {
        reference: row.challenge_ref,
        title: row.challenge_title,
        sector: row.challenge_sector,
        confidentiality: row.challenge_confidentiality,
      },
      technology: {
        reference: row.technology_ref,
        title: row.technology_title,
        category: row.technology_category,
        entryTrl: row.entry_trl,
        currentTrl: row.current_trl,
        targetTrl: row.target_trl,
        acquisitionStage: row.acquisition_stage,
      },
      classification: row.classification,
      fits: {
        mechanism: row.mechanism_fit,
        application: row.application_fit,
        trl: row.trl_fit,
        constraint: row.constraint_fit,
        ipAvailability: row.ip_availability,
        developmentEffort: row.development_effort,
      },
      trlGap: row.trl_gap,
      ipRisk: row.ip_risk,
      analysis: parsePayload(row.analysis),
      decision: row.decision,
      decidedBy: row.decided_by,
      decidedAt: row.decided_at,
      decisionNote: row.decision_note,
    })
  }

  const decideMatch = path.match(/^\/matches\/([A-Za-z0-9-]{1,32})\/decision$/)
  if (decideMatch && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as { decision?: unknown; note?: unknown }
    if (!oneOf(MATCH_DECISIONS, body.decision)) return json({ error: 'Unknown decision' }, 422)

    // Releasing a match to industry is a commercial act, not a review action.
    if (body.decision === 'Approved for Industry Discussion') {
      if (!can.moveAcquisitionStage) {
        return json({ error: 'Only admins and business development can approve a match for industry discussion.' }, 403)
      }
    } else if (!can.editReviewState && !can.moveAcquisitionStage) {
      return json({ error: 'Not permitted to decide matches' }, 403)
    }

    const outcome = await decide(ctx, decideMatch[1], body.decision, clip(body.note, 2000), ip)
    return json({ ok: true, opportunity: outcome.opportunity })
  }

  /* --------------------------------------------------------- opportunities */

  if (path === '/opportunities' && request.method === 'GET') {
    const stage = url.searchParams.get('stage')
    const rows = await db
      .prepare(
        `SELECT o.*, c.title AS challenge_title, c.sector AS challenge_sector,
                c.company AS company, c.confidentiality AS confidentiality,
                i.title AS technology_title, i.internal_title AS technology_internal_title,
                i.current_trl, i.development_stage
         FROM opportunities o
         LEFT JOIN challenges c ON c.reference = o.challenge_ref
         LEFT JOIN innovations i ON i.reference = o.technology_ref
         ${stage ? 'WHERE o.stage = ?' : ''}
         ORDER BY o.updated_at DESC LIMIT 200`,
      )
      .bind(...(stage ? [stage] : []))
      .all<Record<string, unknown>>()

    const funnel = await derivedFunnel(db)
    const byStage = await db
      .prepare('SELECT stage, COUNT(*) AS n FROM opportunities GROUP BY stage')
      .all<{ stage: string; n: number }>()
    for (const row of byStage.results) funnel[row.stage] = row.n

    return json({
      stages: PIPELINE_STAGES,
      funnel,
      items: rows.results.map((r) => ({
        reference: r.reference,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        stage: r.stage,
        challengeRef: r.challenge_ref,
        challengeTitle: r.challenge_title,
        challengeSector: r.challenge_sector,
        // Company identity follows the same rule as everywhere else.
        company: can.viewChallengeContacts ? r.company : null,
        confidentiality: r.confidentiality,
        technologyRef: r.technology_ref,
        technologyTitle: r.technology_internal_title || r.technology_title,
        currentTrl: r.current_trl,
        developmentStage: r.development_stage,
        owner: r.owner,
        nextAction: r.next_action,
        nextActionDue: r.next_action_due,
      })),
    })
  }

  const opportunityMatch = path.match(/^\/opportunities\/([A-Za-z0-9-]{1,32})$/)
  if (opportunityMatch && request.method === 'GET') {
    const reference = opportunityMatch[1]
    const row = await db
      .prepare(
        `SELECT o.*, c.title AS challenge_title, c.sector AS challenge_sector,
                c.company AS company, c.contact_name AS contact_name, c.email AS contact_email,
                c.confidentiality AS confidentiality, c.status AS challenge_status,
                i.title AS technology_title, i.internal_title AS technology_internal_title,
                i.category AS technology_category, i.entry_trl, i.current_trl, i.target_trl,
                i.development_stage, i.acquisition_stage
         FROM opportunities o
         LEFT JOIN challenges c ON c.reference = o.challenge_ref
         LEFT JOIN innovations i ON i.reference = o.technology_ref
         WHERE o.reference = ?`,
      )
      .bind(reference)
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404)

    const [notes, readiness] = await Promise.all([
      db.prepare('SELECT id, body, author, created_at FROM notes WHERE reference = ? ORDER BY created_at DESC')
        .bind(reference).all(),
      db.prepare('SELECT dimension, status, note FROM readiness WHERE reference = ?')
        .bind(String(row.technology_ref)).all(),
    ])

    await audit(db, actor, 'opportunity.view', reference, undefined, ip)

    return json({
      reference: row.reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      stage: row.stage,
      owner: row.owner,
      nextAction: row.next_action,
      nextActionDue: row.next_action_due,
      note: row.note,
      closedReason: row.closed_reason,
      matchRef: row.match_ref,
      challenge: {
        reference: row.challenge_ref,
        title: row.challenge_title,
        sector: row.challenge_sector,
        status: row.challenge_status,
        confidentiality: row.confidentiality,
        company: can.viewChallengeContacts ? row.company : null,
        contactName: can.viewChallengeContacts ? row.contact_name : null,
        contactEmail: can.viewChallengeContacts ? row.contact_email : null,
      },
      contactsWithheld: !can.viewChallengeContacts,
      technology: {
        reference: row.technology_ref,
        title: row.technology_internal_title || row.technology_title,
        category: row.technology_category,
        entryTrl: row.entry_trl,
        currentTrl: row.current_trl,
        targetTrl: row.target_trl,
        developmentStage: row.development_stage,
        acquisitionStage: row.acquisition_stage,
      },
      readiness: readiness.results,
      notes: notes.results,
    })
  }

  if (opportunityMatch && request.method === 'PATCH') {
    // Moving an opportunity is a commercial act, not a review one.
    if (!can.moveAcquisitionStage) {
      return json({ error: 'Only admins and business development can move an opportunity.' }, 403)
    }
    const reference = opportunityMatch[1]
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const sets: string[] = []
    const binds: unknown[] = []

    if (body.stage !== undefined) {
      if (!oneOf([...OPPORTUNITY_STAGES, CLOSED_STAGE], body.stage)) {
        return json({ error: 'Unknown pipeline stage' }, 422)
      }
      sets.push('stage = ?'); binds.push(body.stage)
      if (body.stage === CLOSED_STAGE) {
        sets.push('closed_reason = ?'); binds.push(clip(body.closedReason, 500))
      }
    }
    for (const [field, column, max] of [
      ['owner', 'owner', 200],
      ['nextAction', 'next_action', 500],
      ['nextActionDue', 'next_action_due', 20],
      ['note', 'note', 4000],
    ] as const) {
      if (typeof body[field] === 'string') {
        sets.push(`${column} = ?`); binds.push(clip(body[field], max))
      }
    }
    if (sets.length === 0) return json({ error: 'Nothing to update' }, 400)

    sets.push('updated_at = ?'); binds.push(new Date().toISOString())
    binds.push(reference)
    await db.prepare(`UPDATE opportunities SET ${sets.join(', ')} WHERE reference = ?`).bind(...binds).run()
    await audit(db, actor, 'opportunity.update', reference, body, ip)
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
