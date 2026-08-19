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
import {
  AGREEMENT_STATUSES, CLOSING_STATUSES, DEAL_ELIGIBLE_STAGES, DEAL_TYPES,
  DOCUMENT_KINDS, DOCUMENT_STATUSES, EXCLUSIVITY, MILESTONE_STATUSES,
  PAYMENT_STATUSES, RIGHTS_POSITIONS, ROYALTY_BASES, TRANSFER_STAGE,
  isCurrency, openFromOpportunity, parseAmountMinor, parseRateBp,
} from './deals'
import {
  AGREEMENT_STATUSES as ROYALTY_AGREEMENT_STATUSES, PERIOD_STATUSES,
  REPORTING_PERIOD_NAMES, ROYALTY_TYPES, dueFor, isIsoDate, nextReporting,
  hasReportedActivity, openFromDeal, regenerateSchedule, royaltyYears, settlementOf,
} from './royalties'
import type { RoyaltyType } from './royalties'
import {
  IP_STATUSES, OUTCOMES, PUBLISHABLE_STAGES, SECTORS,
  TRANSFER_STATUSES as PUBLIC_TRANSFER_STATUSES, domainFor, identityLeak,
  isSlug, parseList, profileProse, publicStage, toSlug,
} from './portfolio'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })

const oneOf = <T extends readonly string[]>(list: T, value: unknown): value is T[number] =>
  typeof value === 'string' && (list as readonly string[]).includes(value)

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/**
 * What can happen to a contact message. Three states, because a message is
 * either untouched, dealt with, or not worth dealing with — anything finer
 * belongs to one of the two real intakes, which have their own pipelines.
 */
const MESSAGE_STATUSES = ['New', 'Replied', 'Closed'] as const

/** Today in UTC as YYYY-MM-DD. Overdue is a date comparison, not a timestamp one. */
const today = () => new Date().toISOString().slice(0, 10)

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
      dealTypes: DEAL_TYPES,
      exclusivity: EXCLUSIVITY,
      royaltyBases: ROYALTY_BASES,
      rightsPositions: RIGHTS_POSITIONS,
      agreementStatuses: AGREEMENT_STATUSES,
      closingStatuses: CLOSING_STATUSES,
      milestoneStatuses: MILESTONE_STATUSES,
      paymentStatuses: PAYMENT_STATUSES,
      documentKinds: DOCUMENT_KINDS,
      documentStatuses: DOCUMENT_STATUSES,
      dealEligibleStages: DEAL_ELIGIBLE_STAGES,
      royaltyTypes: ROYALTY_TYPES,
      reportingPeriods: REPORTING_PERIOD_NAMES,
      royaltyStatuses: ROYALTY_AGREEMENT_STATUSES,
      periodStatuses: PERIOD_STATUSES,
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

  /* ------------------------------------------------------------- messages */

  /**
   * Contact messages.
   *
   * Gated on `viewChallengeContacts` rather than on `viewSubmissions`. A
   * message is somebody's name, address and question — the same class of thing
   * as a challenge contact — and an R&D reviewer assesses technologies, not
   * correspondence. The same roles that may see who submitted a challenge may
   * see who wrote in; nobody else receives the rows at all.
   */
  if (path === '/messages' && request.method === 'GET') {
    if (!can.viewChallengeContacts) return json({ error: 'Not permitted' }, 403)
    const status = url.searchParams.get('status')
    const filtered = status !== null && oneOf(MESSAGE_STATUSES, status)
    const rows = await db
      .prepare(
        `SELECT reference, created_at, status, name, email, organisation, topic,
                message, handled_at, handled_by, note
           FROM messages ${filtered ? 'WHERE status = ?' : ''}
          ORDER BY created_at DESC LIMIT 200`,
      )
      .bind(...(filtered ? [status] : []))
      .all<Record<string, unknown>>()
    await audit(db, actor, 'messages.list', undefined, { count: rows.results.length }, ip)
    return json({ items: rows.results, statuses: MESSAGE_STATUSES })
  }

  const messageMatch = path.match(/^\/messages\/([A-Za-z0-9-]{1,32})$/)
  if (messageMatch && request.method === 'PATCH') {
    if (!can.viewChallengeContacts) return json({ error: 'Not permitted' }, 403)
    const reference = messageMatch[1]
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) return json({ error: 'Could not parse the request' }, 400)

    const status = body.status
    if (!oneOf(MESSAGE_STATUSES, status)) return json({ error: 'Unknown status' }, 422)
    const note = clip(body.note, 2000)

    // Who dealt with it and when, stamped server-side. A client-supplied
    // handler is a client-supplied claim about who did the work.
    const handled = status === 'New' ? null : new Date().toISOString()
    const result = await db
      .prepare(
        `UPDATE messages
            SET status = ?, note = ?, handled_at = ?, handled_by = ?
          WHERE reference = ?`,
      )
      .bind(status, note, handled, handled ? actor.email : null, reference)
      .run()
    if (!result.meta.changes) return json({ error: 'Not found' }, 404)

    await audit(db, actor, 'message.update', reference, { status }, ip)
    return json({ ok: true })
  }

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

    const [notes, readiness, deal] = await Promise.all([
      db.prepare('SELECT id, body, author, created_at FROM notes WHERE reference = ? ORDER BY created_at DESC')
        .bind(reference).all(),
      db.prepare('SELECT dimension, status, note FROM readiness WHERE reference = ?')
        .bind(String(row.technology_ref)).all(),
      // The deal reference only — terms stay behind the deal room's own gate.
      can.viewCommercialTerms
        ? db.prepare('SELECT reference, closing_status FROM deals WHERE opportunity_ref = ?')
            .bind(reference).first<{ reference: string; closing_status: string }>()
        : Promise.resolve(null),
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
      deal: deal ? { reference: deal.reference, closingStatus: deal.closing_status } : null,
      dealEligible: (DEAL_ELIGIBLE_STAGES as readonly string[]).includes(String(row.stage)),
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

  /* ------------------------------------------------------------ deal room */

  // The deal room is private to the commercial roles. Every route below refuses
  // first and answers second, so an R&D reviewer cannot reach terms by URL.
  if (path === '/deals' || path.startsWith('/deals/')) {
    if (!can.viewCommercialTerms) {
      return json({ error: 'The deal room is limited to admins and business development.' }, 403)
    }
  }

  if (path === '/deals' && request.method === 'GET') {
    const status = url.searchParams.get('status')
    const rows = await db
      .prepare(
        `SELECT d.reference, d.created_at, d.updated_at, d.opportunity_ref, d.deal_type,
                d.industry, d.currency, d.upfront_minor, d.royalty_bp, d.royalty_basis,
                d.exclusivity, d.agreement_status, d.closing_status, d.owner,
                d.challenge_ref, d.technology_ref,
                c.title AS challenge_title, c.company AS company,
                i.title AS technology_title, i.internal_title AS technology_internal_title
         FROM deals d
         LEFT JOIN challenges c ON c.reference = d.challenge_ref
         LEFT JOIN innovations i ON i.reference = d.technology_ref
         ${status ? 'WHERE d.closing_status = ?' : ''}
         ORDER BY d.updated_at DESC LIMIT 200`,
      )
      .bind(...(status ? [status] : []))
      .all<Record<string, unknown>>()

    const byAgreement = await db
      .prepare('SELECT agreement_status AS k, COUNT(*) AS n FROM deals GROUP BY k')
      .all<{ k: string; n: number }>()
    const byClosing = await db
      .prepare('SELECT closing_status AS k, COUNT(*) AS n FROM deals GROUP BY k')
      .all<{ k: string; n: number }>()

    return json({
      byAgreement: byAgreement.results,
      byClosing: byClosing.results,
      items: rows.results.map((r) => ({
        reference: r.reference,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        opportunityRef: r.opportunity_ref,
        dealType: r.deal_type,
        industry: r.industry,
        currency: r.currency,
        upfrontMinor: r.upfront_minor,
        royaltyBp: r.royalty_bp,
        royaltyBasis: r.royalty_basis,
        exclusivity: r.exclusivity,
        agreementStatus: r.agreement_status,
        closingStatus: r.closing_status,
        owner: r.owner,
        challengeRef: r.challenge_ref,
        challengeTitle: r.challenge_title,
        // The same identity rule as every other list.
        company: can.viewChallengeContacts ? r.company : null,
        technologyRef: r.technology_ref,
        technologyTitle: r.technology_internal_title || r.technology_title,
      })),
    })
  }

  if (path === '/deals' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const opportunityRef = clip(body.opportunity, 32)
    if (!opportunityRef) return json({ error: 'An opportunity reference is required' }, 422)
    const outcome = await openFromOpportunity(ctx, opportunityRef, ip)
    if (!outcome.ok) return json({ error: outcome.error }, outcome.status)
    return json({ ok: true, deal: outcome.reference, created: outcome.created })
  }

  const dealMatch = path.match(/^\/deals\/([A-Za-z0-9-]{1,32})$/)
  if (dealMatch && request.method === 'GET') {
    const reference = dealMatch[1]
    const row = await db
      .prepare(
        `SELECT d.*, c.title AS challenge_title, c.sector AS challenge_sector,
                c.company AS company, c.contact_name AS contact_name, c.email AS contact_email,
                c.confidentiality AS confidentiality,
                i.title AS technology_title, i.internal_title AS technology_internal_title,
                i.category AS technology_category, i.current_trl, i.development_stage,
                o.stage AS opportunity_stage
         FROM deals d
         LEFT JOIN challenges c ON c.reference = d.challenge_ref
         LEFT JOIN innovations i ON i.reference = d.technology_ref
         LEFT JOIN opportunities o ON o.reference = d.opportunity_ref
         WHERE d.reference = ?`,
      )
      .bind(reference)
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404)

    const [milestones, payments, documents, notes, royalty] = await Promise.all([
      db.prepare('SELECT id, label, due, status, note FROM deal_milestones WHERE deal_ref = ? ORDER BY COALESCE(due, \'9999\'), id')
        .bind(reference).all(),
      db.prepare('SELECT id, label, due, amount_minor, status, note FROM deal_payments WHERE deal_ref = ? ORDER BY COALESCE(due, \'9999\'), id')
        .bind(reference).all(),
      db.prepare('SELECT id, kind, title, status, dated, note FROM deal_documents WHERE deal_ref = ? ORDER BY id')
        .bind(reference).all(),
      db.prepare('SELECT id, body, author, created_at FROM notes WHERE reference = ? ORDER BY created_at DESC')
        .bind(reference).all(),
      db.prepare('SELECT reference, status FROM royalty_agreements WHERE deal_ref = ?')
        .bind(reference).first<{ reference: string; status: string }>(),
    ])

    // Opening a deal room is a sensitive read; it is logged like every other.
    await audit(db, actor, 'deal.view', reference, undefined, ip)

    return json({
      reference: row.reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      opportunityRef: row.opportunity_ref,
      opportunityStage: row.opportunity_stage,
      dealType: row.deal_type,
      industry: row.industry,
      currency: row.currency,
      upfrontMinor: row.upfront_minor,
      royaltyBp: row.royalty_bp,
      royaltyBasis: row.royalty_basis,
      territory: row.territory,
      fieldOfUse: row.field_of_use,
      exclusivity: row.exclusivity,
      termMonths: row.term_months,
      termStart: row.term_start,
      termNote: row.term_note,
      pilotConditions: row.pilot_conditions,
      ipRights: row.ip_rights,
      ipRightsNote: row.ip_rights_note,
      manufacturingRights: row.manufacturing_rights,
      technicalSupport: row.technical_support,
      agreementStatus: row.agreement_status,
      closingStatus: row.closing_status,
      closedAt: row.closed_at,
      closedReason: row.closed_reason,
      owner: row.owner,
      challenge: {
        reference: row.challenge_ref,
        title: row.challenge_title,
        sector: row.challenge_sector,
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
        currentTrl: row.current_trl,
        developmentStage: row.development_stage,
      },
      milestones: milestones.results,
      payments: payments.results,
      documents: documents.results,
      notes: notes.results,
      royalty: royalty ? { reference: royalty.reference, status: royalty.status } : null,
      // Royalties are monitored once a deal with a rate is executed.
      royaltyEligible: row.closing_status === 'Executed' && Boolean(row.royalty_bp),
    })
  }

  if (dealMatch && request.method === 'PATCH') {
    const reference = dealMatch[1]
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const sets: string[] = []
    const binds: unknown[] = []

    for (const [field, column, list] of [
      ['dealType', 'deal_type', DEAL_TYPES],
      ['exclusivity', 'exclusivity', EXCLUSIVITY],
      ['royaltyBasis', 'royalty_basis', ROYALTY_BASES],
      ['ipRights', 'ip_rights', RIGHTS_POSITIONS],
      ['manufacturingRights', 'manufacturing_rights', RIGHTS_POSITIONS],
      ['agreementStatus', 'agreement_status', AGREEMENT_STATUSES],
      ['closingStatus', 'closing_status', CLOSING_STATUSES],
    ] as const) {
      if (body[field] === undefined) continue
      if (!oneOf(list, body[field])) return json({ error: `Unknown ${field}` }, 422)
      sets.push(`${column} = ?`); binds.push(body[field])
    }

    if (body.currency !== undefined) {
      if (!isCurrency(body.currency)) return json({ error: 'A currency is a three-letter ISO 4217 code' }, 422)
      sets.push('currency = ?'); binds.push(body.currency)
    }
    if (body.upfront !== undefined) {
      const minor = parseAmountMinor(body.upfront)
      if (minor === 'invalid') return json({ error: 'An upfront amount must be a positive number' }, 422)
      sets.push('upfront_minor = ?'); binds.push(minor)
    }
    if (body.royaltyPercent !== undefined) {
      const bp = parseRateBp(body.royaltyPercent)
      if (bp === 'invalid') return json({ error: 'A royalty rate must be between 0 and 100 per cent' }, 422)
      sets.push('royalty_bp = ?'); binds.push(bp)
    }
    if (body.termMonths !== undefined) {
      const months = Number(body.termMonths)
      if (body.termMonths !== null && body.termMonths !== '' && (!Number.isInteger(months) || months < 0 || months > 1200)) {
        return json({ error: 'A term is a whole number of months' }, 422)
      }
      sets.push('term_months = ?')
      binds.push(body.termMonths === null || body.termMonths === '' ? null : months)
    }

    for (const [field, column, max] of [
      ['industry', 'industry', 120],
      ['territory', 'territory', 500],
      ['fieldOfUse', 'field_of_use', 1000],
      ['termStart', 'term_start', 20],
      ['termNote', 'term_note', 1000],
      ['pilotConditions', 'pilot_conditions', 3000],
      ['ipRightsNote', 'ip_rights_note', 2000],
      ['technicalSupport', 'technical_support', 3000],
      ['closedReason', 'closed_reason', 500],
      ['owner', 'owner', 200],
    ] as const) {
      if (typeof body[field] === 'string') {
        sets.push(`${column} = ?`); binds.push(clip(body[field], max))
      }
    }

    if (sets.length === 0) return json({ error: 'Nothing to update' }, 400)

    // Reopening clears the closing date rather than leaving a stale one behind.
    const closing = body.closingStatus
    if (closing !== undefined) {
      sets.push('closed_at = ?')
      binds.push(closing === 'Open' ? null : new Date().toISOString())
    }

    sets.push('updated_at = ?'); binds.push(new Date().toISOString())
    binds.push(reference)
    const result = await db
      .prepare(`UPDATE deals SET ${sets.join(', ')} WHERE reference = ?`)
      .bind(...binds)
      .run()
    if (!result.meta.changes) return json({ error: 'Not found' }, 404)

    // An executed deal is the moment the opportunity is genuinely in transfer.
    // Advancing it here keeps the pipeline from reporting a negotiation that
    // has in fact been signed.
    let opportunityAdvanced: string | null = null
    if (closing === 'Executed') {
      const deal = await db
        .prepare('SELECT opportunity_ref FROM deals WHERE reference = ?')
        .bind(reference)
        .first<{ opportunity_ref: string }>()
      if (deal) {
        const moved = await db
          .prepare(
            `UPDATE opportunities SET stage = ?, updated_at = ?
             WHERE reference = ? AND stage = 'Commercial Negotiation'`,
          )
          .bind(TRANSFER_STAGE, new Date().toISOString(), deal.opportunity_ref)
          .run()
        if (moved.meta.changes) opportunityAdvanced = deal.opportunity_ref
      }
    }

    await audit(db, actor, 'deal.update', reference, body, ip)
    return json({ ok: true, opportunityAdvanced })
  }

  /* --------------------------------------------- deal rows: the repeating parts */

  const dealRowMatch = path.match(/^\/deals\/([A-Za-z0-9-]{1,32})\/(milestones|payments|documents)$/)
  if (dealRowMatch && request.method === 'POST') {
    const [, reference, kind] = dealRowMatch
    const exists = await db.prepare('SELECT 1 FROM deals WHERE reference = ?').bind(reference).first()
    if (!exists) return json({ error: 'Not found' }, 404)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const now = new Date().toISOString()

    if (kind === 'milestones') {
      const label = clip(body.label, 300)
      if (!label) return json({ error: 'A milestone needs a description' }, 422)
      if (body.status !== undefined && !oneOf(MILESTONE_STATUSES, body.status)) {
        return json({ error: 'Unknown milestone status' }, 422)
      }
      await db
        .prepare('INSERT INTO deal_milestones (deal_ref, created_at, label, due, status, note) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(reference, now, label, clip(body.due, 20) || null, body.status ?? 'Pending', clip(body.note, 1000) || null)
        .run()
    } else if (kind === 'payments') {
      const label = clip(body.label, 300)
      if (!label) return json({ error: 'A payment needs a description' }, 422)
      const minor = parseAmountMinor(body.amount)
      if (minor === 'invalid') return json({ error: 'A payment amount must be a positive number' }, 422)
      if (body.status !== undefined && !oneOf(PAYMENT_STATUSES, body.status)) {
        return json({ error: 'Unknown payment status' }, 422)
      }
      await db
        .prepare('INSERT INTO deal_payments (deal_ref, created_at, label, due, amount_minor, status, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(reference, now, label, clip(body.due, 20) || null, minor ?? 0, body.status ?? 'Scheduled', clip(body.note, 1000) || null)
        .run()
    } else {
      if (!oneOf(DOCUMENT_KINDS, body.kind)) return json({ error: 'Unknown document kind' }, 422)
      if (body.status !== undefined && !oneOf(DOCUMENT_STATUSES, body.status)) {
        return json({ error: 'Unknown document status' }, 422)
      }
      await db
        .prepare('INSERT INTO deal_documents (deal_ref, created_at, kind, title, status, dated, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(reference, now, body.kind, clip(body.title, 300) || null, body.status ?? 'Required', clip(body.dated, 20) || null, clip(body.note, 1000) || null)
        .run()
    }

    await db.prepare('UPDATE deals SET updated_at = ? WHERE reference = ?').bind(now, reference).run()
    await audit(db, actor, `deal.${kind}.add`, reference, body, ip)
    return json({ ok: true })
  }

  const dealRowIdMatch = path.match(/^\/deals\/([A-Za-z0-9-]{1,32})\/(milestones|payments|documents)\/(\d{1,12})$/)
  if (dealRowIdMatch && request.method === 'PATCH') {
    const [, reference, kind, id] = dealRowIdMatch
    const statuses =
      kind === 'milestones' ? MILESTONE_STATUSES : kind === 'payments' ? PAYMENT_STATUSES : DOCUMENT_STATUSES
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    if (!oneOf(statuses, body.status)) return json({ error: 'Unknown status' }, 422)

    const table = kind === 'milestones' ? 'deal_milestones' : kind === 'payments' ? 'deal_payments' : 'deal_documents'
    const result = await db
      .prepare(`UPDATE ${table} SET status = ? WHERE id = ? AND deal_ref = ?`)
      .bind(body.status, Number(id), reference)
      .run()
    if (!result.meta.changes) return json({ error: 'Not found' }, 404)

    await db.prepare('UPDATE deals SET updated_at = ? WHERE reference = ?')
      .bind(new Date().toISOString(), reference).run()
    await audit(db, actor, `deal.${kind}.update`, reference, { id, status: body.status }, ip)
    return json({ ok: true })
  }

  /* ---------------------------------------------------------------- royalties */

  // Royalties sit behind the same gate as the deal room, and for the same
  // reason: what a technology earns is commercial information.
  if (path === '/royalties' || path.startsWith('/royalties/')) {
    if (!can.viewCommercialTerms) {
      return json({ error: 'Royalty management is limited to admins and business development.' }, 403)
    }
  }

  if (path === '/royalties' && request.method === 'GET') {
    const rows = await db
      .prepare(
        `SELECT r.reference, r.created_at, r.updated_at, r.deal_ref, r.royalty_type,
                r.currency, r.rate_bp, r.per_unit_minor, r.basis, r.minimum_annual_minor,
                r.reporting_period, r.status, r.owner, r.challenge_ref, r.technology_ref,
                c.company AS company, c.title AS challenge_title,
                i.title AS technology_title, i.internal_title AS technology_internal_title,
                (SELECT COALESCE(SUM(p.due_minor + p.adjustment_minor), 0)
                   FROM royalty_periods p WHERE p.agreement_ref = r.reference) AS due_minor,
                (SELECT COALESCE(SUM(p.paid_minor), 0)
                   FROM royalty_periods p WHERE p.agreement_ref = r.reference) AS paid_minor,
                -- Same predicate as nextReporting(): a period has reported if a
                -- statement date or a figure is against it, or it was waived.
                (SELECT COUNT(*) FROM royalty_periods p
                   WHERE p.agreement_ref = r.reference
                     AND p.statement_received IS NULL AND p.reported_minor IS NULL
                     AND p.reported_units IS NULL AND p.status <> 'Waived'
                     AND p.period_end < ?) AS overdue
         FROM royalty_agreements r
         LEFT JOIN challenges c ON c.reference = r.challenge_ref
         LEFT JOIN innovations i ON i.reference = r.technology_ref
         ORDER BY r.updated_at DESC LIMIT 200`,
      )
      .bind(today())
      .all<Record<string, unknown>>()

    return json({
      items: rows.results.map((r) => ({
        reference: r.reference,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        dealRef: r.deal_ref,
        royaltyType: r.royalty_type,
        currency: r.currency,
        rateBp: r.rate_bp,
        perUnitMinor: r.per_unit_minor,
        basis: r.basis,
        minimumAnnualMinor: r.minimum_annual_minor,
        reportingPeriod: r.reporting_period,
        status: r.status,
        owner: r.owner,
        challengeRef: r.challenge_ref,
        challengeTitle: r.challenge_title,
        company: can.viewChallengeContacts ? r.company : null,
        technologyRef: r.technology_ref,
        technologyTitle: r.technology_internal_title || r.technology_title,
        // Reported and settled to date. Both are recorded facts, not estimates.
        dueMinor: r.due_minor,
        paidMinor: r.paid_minor,
        overdueCount: r.overdue,
      })),
    })
  }

  if (path === '/royalties' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const dealRef = clip(body.deal, 32)
    if (!dealRef) return json({ error: 'A deal reference is required' }, 422)
    const outcome = await openFromDeal(ctx, dealRef, ip)
    if (!outcome.ok) return json({ error: outcome.error }, outcome.status)

    // A live royalty is the last stage of the pipeline. Moving the opportunity
    // here keeps the funnel describing what is actually happening.
    if (outcome.created) {
      const deal = await db
        .prepare('SELECT opportunity_ref FROM deals WHERE reference = ?')
        .bind(dealRef)
        .first<{ opportunity_ref: string | null }>()
      if (deal?.opportunity_ref) {
        await db
          .prepare(
            `UPDATE opportunities SET stage = 'Post-Transfer Royalty Monitoring', updated_at = ?
             WHERE reference = ? AND stage = 'Technology Transfer'`,
          )
          .bind(new Date().toISOString(), deal.opportunity_ref)
          .run()
      }
    }
    return json({ ok: true, royalty: outcome.reference, created: outcome.created, periods: outcome.periods })
  }

  const royaltyMatch = path.match(/^\/royalties\/([A-Za-z0-9-]{1,32})$/)
  if (royaltyMatch && request.method === 'GET') {
    const reference = royaltyMatch[1]
    const row = await db
      .prepare(
        `SELECT r.*, c.title AS challenge_title, c.sector AS challenge_sector,
                c.company AS company, c.contact_name AS contact_name, c.email AS contact_email,
                i.title AS technology_title, i.internal_title AS technology_internal_title,
                d.deal_type AS deal_type
         FROM royalty_agreements r
         LEFT JOIN challenges c ON c.reference = r.challenge_ref
         LEFT JOIN innovations i ON i.reference = r.technology_ref
         LEFT JOIN deals d ON d.reference = r.deal_ref
         WHERE r.reference = ?`,
      )
      .bind(reference)
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404)

    const [periodRows, notes] = await Promise.all([
      db.prepare(
        `SELECT id, seq, period_start, period_end, reported_minor, reported_units,
                statement_received, due_minor, adjustment_minor, adjustment_note,
                paid_minor, paid_on, status, note
         FROM royalty_periods WHERE agreement_ref = ? ORDER BY seq`,
      ).bind(reference).all<Record<string, unknown>>(),
      db.prepare('SELECT id, body, author, created_at FROM notes WHERE reference = ? ORDER BY created_at DESC')
        .bind(reference).all(),
    ])

    const periods = periodRows.results as unknown as {
      period_start: string; period_end: string; due_minor: number; adjustment_minor: number
      paid_minor: number; statement_received: string | null; status: string
      reported_minor: number | null; reported_units: number | null
    }[]

    await audit(db, actor, 'royalty.view', reference, undefined, ip)

    return json({
      reference: row.reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      dealRef: row.deal_ref,
      dealType: row.deal_type,
      opportunityRef: row.opportunity_ref,
      royaltyType: row.royalty_type,
      currency: row.currency,
      rateBp: row.rate_bp,
      perUnitMinor: row.per_unit_minor,
      basis: row.basis,
      minimumAnnualMinor: row.minimum_annual_minor,
      reportingPeriod: row.reporting_period,
      termMonths: row.term_months,
      termStart: row.term_start,
      territory: row.territory,
      fieldOfUse: row.field_of_use,
      status: row.status,
      endedReason: row.ended_reason,
      owner: row.owner,
      challenge: {
        reference: row.challenge_ref,
        title: row.challenge_title,
        sector: row.challenge_sector,
        company: can.viewChallengeContacts ? row.company : null,
        contactName: can.viewChallengeContacts ? row.contact_name : null,
        contactEmail: can.viewChallengeContacts ? row.contact_email : null,
      },
      contactsWithheld: !can.viewChallengeContacts,
      technology: {
        reference: row.technology_ref,
        title: row.technology_internal_title || row.technology_title,
      },
      periods: periodRows.results.map((p) => ({
        id: p.id,
        seq: p.seq,
        periodStart: p.period_start,
        periodEnd: p.period_end,
        reportedMinor: p.reported_minor,
        reportedUnits: p.reported_units,
        statementReceived: p.statement_received,
        dueMinor: p.due_minor,
        adjustmentMinor: p.adjustment_minor,
        adjustmentNote: p.adjustment_note,
        paidMinor: p.paid_minor,
        paidOn: p.paid_on,
        status: p.status,
        note: p.note,
        // Derived, so it can never contradict the amounts beside it.
        settlement: settlementOf(Number(p.due_minor), Number(p.adjustment_minor), Number(p.paid_minor)),
      })),
      years: row.term_start
        ? royaltyYears(String(row.term_start), row.minimum_annual_minor as number | null, periods)
        : [],
      nextReporting: nextReporting(periods, today()),
      totals: {
        dueMinor: periods.reduce((n, p) => n + p.due_minor + p.adjustment_minor, 0),
        paidMinor: periods.reduce((n, p) => n + p.paid_minor, 0),
      },
      notes: notes.results,
    })
  }

  if (royaltyMatch && request.method === 'PATCH') {
    const reference = royaltyMatch[1]
    const current = await db
      .prepare('SELECT reporting_period FROM royalty_agreements WHERE reference = ?')
      .bind(reference)
      .first<{ reporting_period: string }>()
    if (!current) return json({ error: 'Not found' }, 404)

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const sets: string[] = []
    const binds: unknown[] = []
    let rescheduleNeeded = false

    if (body.royaltyType !== undefined) {
      if (!oneOf(ROYALTY_TYPES, body.royaltyType)) return json({ error: 'Unknown royalty type' }, 422)
      sets.push('royalty_type = ?'); binds.push(body.royaltyType)
    }
    if (body.reportingPeriod !== undefined) {
      if (!oneOf(REPORTING_PERIOD_NAMES, body.reportingPeriod)) {
        return json({ error: 'Unknown reporting period' }, 422)
      }
      // The frequency decides what a period *is*, so changing it rebuilds the
      // schedule — and a schedule that has been reported against cannot be
      // rebuilt. Reporting frequency is a term of the licence; varying it once
      // statements exist is a contract variation, not a settings change.
      if (body.reportingPeriod !== current.reporting_period && await hasReportedActivity(db, reference)) {
        return json({
          error: 'Statements have already been recorded on this schedule. The reporting frequency cannot be changed without varying the agreement.',
        }, 409)
      }
      sets.push('reporting_period = ?'); binds.push(body.reportingPeriod)
      rescheduleNeeded = body.reportingPeriod !== current.reporting_period
    }
    if (body.status !== undefined) {
      if (!oneOf(ROYALTY_AGREEMENT_STATUSES, body.status)) return json({ error: 'Unknown status' }, 422)
      sets.push('status = ?'); binds.push(body.status)
    }
    for (const [field, column] of [
      ['ratePercent', 'rate_bp'],
    ] as const) {
      if (body[field] === undefined) continue
      const bp = parseRateBp(body[field])
      if (bp === 'invalid') return json({ error: 'A royalty rate must be between 0 and 100 per cent' }, 422)
      sets.push(`${column} = ?`); binds.push(bp)
    }
    for (const [field, column] of [
      ['perUnit', 'per_unit_minor'],
      ['minimumAnnual', 'minimum_annual_minor'],
    ] as const) {
      if (body[field] === undefined) continue
      const minor = parseAmountMinor(body[field])
      if (minor === 'invalid') return json({ error: `${field} must be a positive amount` }, 422)
      sets.push(`${column} = ?`); binds.push(minor)
    }
    for (const [field, column, max] of [
      ['owner', 'owner', 200],
      ['endedReason', 'ended_reason', 500],
    ] as const) {
      if (typeof body[field] === 'string') {
        sets.push(`${column} = ?`); binds.push(clip(body[field], max))
      }
    }
    if (sets.length === 0) return json({ error: 'Nothing to update' }, 400)

    sets.push('updated_at = ?'); binds.push(new Date().toISOString())
    binds.push(reference)
    const result = await db
      .prepare(`UPDATE royalty_agreements SET ${sets.join(', ')} WHERE reference = ?`)
      .bind(...binds)
      .run()
    if (!result.meta.changes) return json({ error: 'Not found' }, 404)

    // A frequency change rebuilds the schedule outright, which is safe only
    // because the check above proved nothing has been reported against it.
    const added = rescheduleNeeded ? await regenerateSchedule(db, reference, 'replace') : 0
    await audit(db, actor, 'royalty.update', reference, body, ip)
    return json({ ok: true, periodsAdded: added })
  }

  const royaltyScheduleMatch = path.match(/^\/royalties\/([A-Za-z0-9-]{1,32})\/schedule$/)
  if (royaltyScheduleMatch && request.method === 'POST') {
    const reference = royaltyScheduleMatch[1]
    const exists = await db.prepare('SELECT 1 FROM royalty_agreements WHERE reference = ?').bind(reference).first()
    if (!exists) return json({ error: 'Not found' }, 404)
    // Untouched, a rebuild picks up a corrected term start from the deal. Once
    // statements exist, the most that can happen is filling in the tail an
    // extended term added.
    const mode = (await hasReportedActivity(db, reference)) ? 'add' : 'replace'
    const added = await regenerateSchedule(db, reference, mode)
    await audit(db, actor, 'royalty.schedule', reference, { added, mode }, ip)
    return json({ ok: true, added, mode })
  }

  const royaltyPeriodMatch = path.match(/^\/royalties\/([A-Za-z0-9-]{1,32})\/periods\/(\d{1,12})$/)
  if (royaltyPeriodMatch && request.method === 'PATCH') {
    const [, reference, id] = royaltyPeriodMatch
    const agreement = await db
      .prepare('SELECT royalty_type, rate_bp, per_unit_minor FROM royalty_agreements WHERE reference = ?')
      .bind(reference)
      .first<{ royalty_type: string; rate_bp: number | null; per_unit_minor: number | null }>()
    if (!agreement) return json({ error: 'Not found' }, 404)
    const period = await db
      .prepare('SELECT * FROM royalty_periods WHERE id = ? AND agreement_ref = ?')
      .bind(Number(id), reference)
      .first<Record<string, unknown>>()
    if (!period) return json({ error: 'Not found' }, 404)

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const sets: string[] = []
    const binds: unknown[] = []

    let reportedMinor = period.reported_minor as number | null
    let reportedUnits = period.reported_units as number | null
    let reported = false

    if (body.reported !== undefined) {
      const minor = parseAmountMinor(body.reported)
      if (minor === 'invalid') return json({ error: 'A reported amount must be a positive number' }, 422)
      reportedMinor = minor
      reported = true
      sets.push('reported_minor = ?'); binds.push(minor)
    }
    if (body.reportedUnits !== undefined) {
      const units = body.reportedUnits === null || body.reportedUnits === '' ? null : Number(body.reportedUnits)
      if (units !== null && (!Number.isSafeInteger(units) || units < 0)) {
        return json({ error: 'Reported units must be a whole number' }, 422)
      }
      reportedUnits = units
      reported = true
      sets.push('reported_units = ?'); binds.push(units)
    }
    if (body.statementReceived !== undefined) {
      const date = clip(body.statementReceived, 20)
      if (date && !isIsoDate(date)) return json({ error: 'A statement date must be YYYY-MM-DD' }, 422)
      sets.push('statement_received = ?'); binds.push(date || null)
      if (date && body.status === undefined) { sets.push('status = ?'); binds.push('Statement received') }
    }
    if (body.paid !== undefined) {
      const minor = parseAmountMinor(body.paid)
      if (minor === 'invalid') return json({ error: 'A paid amount must be a positive number' }, 422)
      sets.push('paid_minor = ?'); binds.push(minor ?? 0)
    }
    if (body.paidOn !== undefined) {
      const date = clip(body.paidOn, 20)
      if (date && !isIsoDate(date)) return json({ error: 'A payment date must be YYYY-MM-DD' }, 422)
      sets.push('paid_on = ?'); binds.push(date || null)
    }
    if (body.adjustment !== undefined) {
      const minor = parseAmountMinor(body.adjustment)
      if (minor === 'invalid') return json({ error: 'An adjustment must be a positive amount' }, 422)
      // An adjustment always says why. An unexplained one is indistinguishable
      // from an error a year later.
      const why = clip(body.adjustmentNote, 500)
      if (minor && !why) return json({ error: 'An adjustment needs a reason' }, 422)
      sets.push('adjustment_minor = ?'); binds.push(minor ?? 0)
      sets.push('adjustment_note = ?'); binds.push(why || null)
    }
    if (body.status !== undefined) {
      if (!oneOf(PERIOD_STATUSES, body.status)) return json({ error: 'Unknown period status' }, 422)
      sets.push('status = ?'); binds.push(body.status)
    }
    if (typeof body.note === 'string') { sets.push('note = ?'); binds.push(clip(body.note, 1000)) }

    // What is owed is computed here and nowhere else. The client cannot send it.
    if (reported) {
      const due = dueFor(
        agreement.royalty_type as RoyaltyType,
        agreement.rate_bp, agreement.per_unit_minor,
        reportedMinor, reportedUnits,
      )
      sets.push('due_minor = ?'); binds.push(due)
    }

    if (sets.length === 0) return json({ error: 'Nothing to update' }, 400)
    binds.push(Number(id), reference)
    await db
      .prepare(`UPDATE royalty_periods SET ${sets.join(', ')} WHERE id = ? AND agreement_ref = ?`)
      .bind(...binds)
      .run()
    await db.prepare('UPDATE royalty_agreements SET updated_at = ? WHERE reference = ?')
      .bind(new Date().toISOString(), reference).run()
    await audit(db, actor, 'royalty.period', reference, { id, ...body }, ip)
    return json({ ok: true })
  }

  /* -------------------------------------------------------- public profiles */

  const profileMatch = path.match(/^\/profiles\/([A-Za-z0-9-]{1,32})$/)
  if (profileMatch && request.method === 'GET') {
    const reference = profileMatch[1]
    const row = await db
      .prepare(
        `SELECT i.category, i.title, i.internal_title, i.entry_trl, i.current_trl,
                i.target_trl, i.development_stage, i.acquisition_stage,
                p.slug, p.name, p.thesis, p.problem, p.principle, p.why_it_matters,
                p.validation, p.applications, p.sectors, p.outcomes, p.next_milestones,
                p.ip_status, p.transfer_status, p.published, p.published_at, p.published_by
         FROM innovations i
         LEFT JOIN technology_profiles p ON p.reference = i.reference
         WHERE i.reference = ?`,
      )
      .bind(reference)
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404)

    const has = row.slug !== null && row.slug !== undefined
    return json({
      reference,
      exists: has,
      // Suggested rather than applied: the public name is a choice, and a slug
      // that follows an edited name silently breaks shared links.
      suggestedSlug: toSlug(String(row.internal_title || row.title || reference)),
      publishable: (PUBLISHABLE_STAGES as readonly string[]).includes(String(row.acquisition_stage)),
      acquisitionStage: row.acquisition_stage,
      profile: has
        ? {
            slug: row.slug,
            name: row.name,
            thesis: row.thesis,
            problem: row.problem,
            principle: row.principle,
            whyItMatters: row.why_it_matters,
            validation: row.validation,
            applications: parseList(row.applications as string),
            sectors: parseList(row.sectors as string),
            outcomes: parseList(row.outcomes as string),
            nextMilestones: parseList(row.next_milestones as string),
            ipStatus: row.ip_status,
            transferStatus: row.transfer_status,
            published: Boolean(row.published),
            publishedAt: row.published_at,
            publishedBy: row.published_by,
          }
        : null,
      // What the public page will show without anyone typing it.
      derived: {
        domain: domainFor(row.category as string).name,
        domainCode: domainFor(row.category as string).code,
        entryTrl: row.entry_trl,
        currentTrl: row.current_trl ?? row.entry_trl,
        targetTrl: row.target_trl ?? row.entry_trl,
        stage: publicStage(row.development_stage as string),
      },
    })
  }

  if (profileMatch && request.method === 'PUT') {
    // Authoring a public page is a commercial and editorial act, not a review
    // one — the same capability that publishes a development entry.
    if (!can.moveAcquisitionStage) {
      return json({ error: 'Only admins and business development can edit a public profile.' }, 403)
    }
    const reference = profileMatch[1]
    const innovation = await db
      .prepare('SELECT reference FROM innovations WHERE reference = ?')
      .bind(reference)
      .first()
    if (!innovation) return json({ error: 'Not found' }, 404)

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const slug = clip(body.slug, 80).toLowerCase()
    if (!isSlug(slug)) {
      return json({ error: 'A slug is lowercase letters, numbers and single hyphens' }, 422)
    }
    const taken = await db
      .prepare('SELECT reference FROM technology_profiles WHERE slug = ? AND reference <> ?')
      .bind(slug, reference)
      .first<{ reference: string }>()
    if (taken) return json({ error: `That slug is already used by ${taken.reference}` }, 409)

    const name = clip(body.name, 160)
    if (!name) return json({ error: 'A public name is required' }, 422)

    for (const [field, list] of [
      ['ipStatus', IP_STATUSES],
      ['transferStatus', PUBLIC_TRANSFER_STATUSES],
    ] as const) {
      if (body[field] !== undefined && !oneOf(list, body[field])) {
        return json({ error: `Unknown ${field}` }, 422)
      }
    }

    // Filter and sector terms come from the site's own vocabularies, so a
    // profile cannot invent a facet the explorer has no filter for.
    const list = (value: unknown, allowed: readonly string[] | null, max: number) => {
      const raw = Array.isArray(value) ? value : []
      const cleaned = raw
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, max)
      return allowed ? cleaned.filter((v) => allowed.includes(v)) : cleaned.map((v) => v.slice(0, 200))
    }

    const now = new Date().toISOString()
    await db
      .prepare(
        `INSERT INTO technology_profiles
           (reference, created_at, updated_at, slug, name, thesis, problem, principle,
            why_it_matters, validation, applications, sectors, outcomes, next_milestones,
            ip_status, transfer_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(reference) DO UPDATE SET
           updated_at = excluded.updated_at, slug = excluded.slug, name = excluded.name,
           thesis = excluded.thesis, problem = excluded.problem, principle = excluded.principle,
           why_it_matters = excluded.why_it_matters, validation = excluded.validation,
           applications = excluded.applications, sectors = excluded.sectors,
           outcomes = excluded.outcomes, next_milestones = excluded.next_milestones,
           ip_status = excluded.ip_status, transfer_status = excluded.transfer_status`,
      )
      .bind(
        reference, now, now, slug, name,
        clip(body.thesis, 600), clip(body.problem, 4000), clip(body.principle, 4000),
        clip(body.whyItMatters, 4000), clip(body.validation, 4000),
        JSON.stringify(list(body.applications, null, 12)),
        JSON.stringify(list(body.sectors, SECTORS, 8)),
        JSON.stringify(list(body.outcomes, OUTCOMES, 8)),
        JSON.stringify(list(body.nextMilestones, null, 8)),
        body.ipStatus ?? 'To Be Confirmed',
        body.transferStatus ?? 'Under Development',
      )
      .run()

    await audit(db, actor, 'profile.save', reference, { slug }, ip)
    return json({ ok: true, slug })
  }

  const publishProfileMatch = path.match(/^\/profiles\/([A-Za-z0-9-]{1,32})\/publish$/)
  if (publishProfileMatch && request.method === 'POST') {
    if (!can.moveAcquisitionStage) {
      return json({ error: 'Only admins and business development can publish a technology page.' }, 403)
    }
    const reference = publishProfileMatch[1]
    const body = (await request.json().catch(() => ({}))) as { published?: unknown }
    const publish = body.published === true

    const row = await db
      .prepare(
        `SELECT p.name, p.thesis, p.problem, p.principle, p.why_it_matters, p.validation,
                p.applications, p.sectors, p.outcomes, p.next_milestones,
                i.acquisition_stage, i.innovator_name, i.innovator_email, i.institution
         FROM technology_profiles p
         JOIN innovations i ON i.reference = p.reference
         WHERE p.reference = ?`,
      )
      .bind(reference)
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Write the profile before publishing it' }, 404)

    if (publish) {
      // Rights first. A page that presents a technology as available to
      // develop, when InThinks holds no rights to it, is a claim it cannot make.
      if (!(PUBLISHABLE_STAGES as readonly string[]).includes(String(row.acquisition_stage))) {
        return json({
          error: `A technology is published once rights are held. This one is at ${row.acquisition_stage}.`,
        }, 409)
      }
      for (const [field, label] of [
        ['name', 'a public name'], ['thesis', 'a thesis'], ['problem', 'the industrial problem'],
        ['principle', 'how it works'], ['why_it_matters', 'why it matters'],
      ] as const) {
        if (!String(row[field] ?? '').trim()) {
          return json({ error: `A published page needs ${label}.` }, 422)
        }
      }
      // The promise to innovators, enforced at the moment of publication.
      const leak = identityLeak(profileProse(row as never), {
        innovator_name: (row.innovator_name as string) ?? null,
        innovator_email: (row.innovator_email as string) ?? null,
        institution: (row.institution as string) ?? null,
      })
      if (leak) {
        return json({
          error: `This draft contains ${leak}. A technology page never identifies the innovator or the source institution.`,
        }, 422)
      }
    }

    const now = new Date().toISOString()
    await db
      .prepare(
        `UPDATE technology_profiles
         SET published = ?, published_at = ?, published_by = ?, updated_at = ?
         WHERE reference = ?`,
      )
      .bind(publish ? 1 : 0, publish ? now : null, publish ? actor.email : null, now, reference)
      .run()

    await audit(db, actor, publish ? 'profile.publish' : 'profile.unpublish', reference, undefined, ip)
    return json({ ok: true, published: publish })
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
