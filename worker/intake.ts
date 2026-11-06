import { err, ok } from './types'
import type { Env, Result } from './types'
import { CHALLENGE_SCHEMA, INNOVATION_SCHEMA, MESSAGE_SCHEMA, REQUIRED_DECLARATIONS, validate } from './validation'
import type { Clean } from './validation'
import {
  challengeInsert,
  evidenceInsert,
  innovationInsert,
  isUniqueViolation,
  messageInsert,
  nextReference,
  referenceForKey,
} from './storage'
import type { SubmissionTable } from './storage'
import { SUBMISSION_CEILING, chargeSubmission, checkRequest, submissionsUsed } from './ratelimit'
import { deliverOutbox, outboxStatements, submissionOutbox } from './outbox'
import { verifyTurnstile } from './turnstile'

/**
 * Public intake: contact messages, industry challenges, innovations.
 *
 * The order of every handler is the point of this file:
 *
 *   1. loose request throttle (abuse only)
 *   2. idempotent replay — a retry of something already stored gets its
 *      reference back, before any check that could refuse it
 *   3. validation, bot check, submission ceiling
 *   4. files to R2 *first* (innovations), then ONE D1 batch holding the
 *      record, its evidence manifest and its outbox rows — all or nothing
 *   5. delivery of the receipt and team notice, after the response
 *
 * Success is only ever reported once step 4 has committed.
 */

const MAX_JSON_BYTES = 256 * 1024
const MAX_TOTAL_UPLOAD = 60 * 1024 * 1024
const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_FILES = 12

/** Evidence extensions: an allow-list, so no executable or script lands in the bucket. */
const ALLOWED_EXT = new Set([
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'md',
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'tif', 'tiff', 'heic',
  'mp4', 'mov', 'webm',
  'dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl', 'zip',
])

const MESSAGE_TOPICS = [
  'General enquiry',
  'Technology transfer or licensing',
  'Partnership or collaboration',
  'Working with InThinks',
  'Press or media',
  'Something else',
]

const TOO_MANY = 'Too many submissions from this connection. Please try again shortly.'
const BOT_CHECK = 'Please complete the verification check and submit again.'

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Submission responses carry a reference and must never be cached.
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })

const fail = (e: { status: number; error: string; fields?: Record<string, string> }) =>
  json({ error: e.error, fields: e.fields }, e.status)

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''))

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

/** Never trust a submitted filename for a storage key. */
function safeKey(reference: string, name: string) {
  const ext = extensionOf(name)
  return `${reference}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`
}

/** The client's key for this submission attempt; absent is allowed, malformed is not. */
export function readIdempotencyKey(request: Request): Result<string | null> {
  const key = request.headers.get('idempotency-key')
  if (key === null || key === '') return ok(null)
  if (!/^[A-Za-z0-9-]{16,64}$/.test(key)) return err(400, 'Malformed idempotency key')
  return ok(key)
}

async function readJson(request: Request): Promise<Result<unknown>> {
  const type = request.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) return err(415, 'Expected application/json')
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > MAX_JSON_BYTES) return err(413, 'Submission is too large')
  const text = await request.text()
  if (text.length > MAX_JSON_BYTES) return err(413, 'Submission is too large')
  try {
    return ok(JSON.parse(text))
  } catch {
    return err(400, 'Could not parse the submission')
  }
}

interface Gate {
  db: D1Database
  ip: string
  salt: string
  key: string | null
}

/** Steps 1 and 2. `replayed` short-circuits with the reference already issued. */
async function open(env: Env, request: Request, table: SubmissionTable): Promise<Result<Gate & { replayed: string | null }>> {
  if (!env.DB) return err(503, 'Submissions are not configured on this deployment yet.')
  // No default salt: a guessable salt makes every stored IP hash reversible.
  if (!env.IP_SALT) return err(503, 'Submissions are not fully configured on this deployment yet.')
  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0'
  const salt = env.IP_SALT

  if (!(await checkRequest(env.DB, ip, salt))) {
    return err(429, 'Too many requests from this connection. Please try again shortly.')
  }
  const key = readIdempotencyKey(request)
  if (!key.ok) return key
  const replayed = await referenceForKey(env.DB, table, key.value)
  return ok({ db: env.DB, ip, salt, key: key.value, replayed })
}

/** Step 3 (after validation): bot check, then the accepted-submission ceiling. */
async function admit(env: Env, request: Request, gate: Gate): Promise<Result<true>> {
  if (!(await verifyTurnstile(env, request, gate.ip))) return err(403, BOT_CHECK)
  if ((await submissionsUsed(gate.db, gate.ip, gate.salt)) >= SUBMISSION_CEILING) return err(429, TOO_MANY)
  return ok(true)
}

/**
 * Step 4: one atomic batch. If a concurrent retry with the same key won the
 * race, the unique index refuses this one and we return the winner's reference.
 */
async function commit(gate: Gate, table: SubmissionTable, statements: D1PreparedStatement[]): Promise<Result<'stored' | string>> {
  try {
    await gate.db.batch(statements)
    return ok('stored')
  } catch (cause) {
    if (gate.key && isUniqueViolation(cause)) {
      const existing = await referenceForKey(gate.db, table, gate.key)
      if (existing) return ok(existing)
    }
    throw cause
  }
}

function afterCommit(env: Env, ctx: ExecutionContext, gate: Gate, reference: string) {
  ctx.waitUntil(
    (async () => {
      await chargeSubmission(gate.db, gate.ip, gate.salt)
      await deliverOutbox(env, { reference })
    })().catch(() => console.error('[intake] post-commit work failed for', reference)),
  )
}

async function handleMessage(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const gate = await open(env, request, 'messages')
  if (!gate.ok) return fail(gate)
  if (gate.value.replayed) return json({ reference: gate.value.replayed, replayed: true })

  const body = await readJson(request)
  if (!body.ok) return fail(body)
  const parsed = validate(MESSAGE_SCHEMA, body.value)
  if (!parsed.ok) return fail(parsed)
  const data = parsed.value

  // Honeypot: a plausible 201 rather than an error, so a bot learns nothing.
  if (one(data.website).trim() !== '') {
    return json({ reference: `MSG-${new Date().getUTCFullYear()}-0000` }, 201)
  }
  if (!MESSAGE_TOPICS.includes(one(data.topic))) {
    return fail(err(422, 'Choose what your message is about', { topic: 'Required' }))
  }
  if (one(data.message).trim().length < 10) {
    return fail(err(422, 'Tell us a little more', { message: 'Please write a little more' }))
  }

  const admitted = await admit(env, request, gate.value)
  if (!admitted.ok) return fail(admitted)

  const { db } = gate.value
  const reference = await nextReference(db, 'MSG', new Date().getUTCFullYear())
  const outcome = await commit(gate.value, 'messages', [
    messageInsert(db, reference, data, gate.value.key),
    ...outboxStatements(db, reference, submissionOutbox('message', one(data.email), { topic: one(data.topic) })),
  ])
  if (!outcome.ok) return fail(outcome)
  if (outcome.value !== 'stored') return json({ reference: outcome.value, replayed: true })

  afterCommit(env, ctx, gate.value, reference)
  return json({ reference }, 201)
}

async function handleChallenge(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const gate = await open(env, request, 'challenges')
  if (!gate.ok) return fail(gate)
  if (gate.value.replayed) return json({ reference: gate.value.replayed, replayed: true })

  const body = await readJson(request)
  if (!body.ok) return fail(body)
  const parsed = validate(CHALLENGE_SCHEMA, body.value)
  if (!parsed.ok) return fail(parsed)
  const data = parsed.value

  const admitted = await admit(env, request, gate.value)
  if (!admitted.ok) return fail(admitted)

  const { db } = gate.value
  const reference = await nextReference(db, 'CH', new Date().getUTCFullYear())
  const outcome = await commit(gate.value, 'challenges', [
    challengeInsert(db, reference, data, gate.value.key),
    ...outboxStatements(db, reference, submissionOutbox('challenge', one(data.email), {
      company: one(data.company),
      sector: one(data.sector),
    })),
  ])
  if (!outcome.ok) return fail(outcome)
  if (outcome.value !== 'stored') return json({ reference: outcome.value, replayed: true })

  afterCommit(env, ctx, gate.value, reference)
  return json({ reference }, 201)
}

async function readInnovation(request: Request): Promise<Result<{ raw: unknown; files: File[] }>> {
  const type = request.headers.get('content-type') ?? ''
  if (!type.includes('multipart/form-data')) {
    const body = await readJson(request)
    return body.ok ? ok({ raw: body.value, files: [] }) : body
  }
  // Without a declared length the size check below would only run after the
  // whole body had been buffered.
  const lengthHeader = request.headers.get('content-length')
  if (!lengthHeader) return err(411, 'Uploads must declare their size')
  if (Number(lengthHeader) > MAX_TOTAL_UPLOAD) return err(413, 'Attachments exceed the size limit')

  const form = await request.formData()
  const record = form.get('record')
  if (typeof record !== 'string') return err(400, 'Missing submission record')
  if (record.length > MAX_JSON_BYTES) return err(413, 'Submission is too large')
  try {
    return ok({ raw: JSON.parse(record), files: form.getAll('files').filter((f): f is File => f instanceof File) })
  } catch {
    return err(400, 'Could not parse the submission')
  }
}

function checkFiles(files: File[], env: Env): Result<true> {
  if (files.length > MAX_FILES) return err(413, `Attach at most ${MAX_FILES} files`)
  let total = 0
  for (const file of files) {
    total += file.size
    if (file.size > MAX_FILE_BYTES) return err(413, `${file.name} is larger than 25 MB`)
    if (!ALLOWED_EXT.has(extensionOf(file.name))) return err(415, `${file.name} is not an accepted file type`)
  }
  if (total > MAX_TOTAL_UPLOAD) return err(413, 'Attachments exceed the size limit')
  if (files.length > 0 && !env.EVIDENCE) return err(503, 'File storage is not configured on this deployment yet.')
  return ok(true)
}

async function removeObjects(env: Env, keys: string[]) {
  if (keys.length === 0 || !env.EVIDENCE) return
  try {
    await env.EVIDENCE.delete(keys)
  } catch {
    console.error('[intake] could not remove', keys.length, 'orphaned evidence objects')
  }
}

async function handleInnovation(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const gate = await open(env, request, 'innovations')
  if (!gate.ok) return fail(gate)
  if (gate.value.replayed) return json({ reference: gate.value.replayed, replayed: true })

  const input = await readInnovation(request)
  if (!input.ok) return fail(input)
  const parsed = validate(INNOVATION_SCHEMA, input.value.raw)
  if (!parsed.ok) return fail(parsed)
  const data: Clean = parsed.value
  const { files } = input.value

  const declared = Array.isArray(data.declarations) ? data.declarations : []
  if (REQUIRED_DECLARATIONS.some((d) => !declared.includes(d))) {
    return fail(err(422, 'All declarations must be confirmed', { declarations: 'Required' }))
  }
  const filesOk = checkFiles(files, env)
  if (!filesOk.ok) return fail(filesOk)

  const admitted = await admit(env, request, gate.value)
  if (!admitted.ok) return fail(admitted)

  const { db } = gate.value
  const reference = await nextReference(db, 'INT', new Date().getUTCFullYear())

  // Files first. If any upload fails nothing has been recorded, so the
  // submitter can simply retry with the same key.
  const uploaded: { key: string; name: string; type: string; size: number }[] = []
  try {
    for (const file of files) {
      const key = safeKey(reference, file.name)
      await env.EVIDENCE!.put(key, file.stream(), {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: { reference },
      })
      uploaded.push({ key, name: file.name.slice(0, 300), type: file.type || 'application/octet-stream', size: file.size })
    }
  } catch {
    await removeObjects(env, uploaded.map((u) => u.key))
    return fail(err(502, 'A file could not be uploaded. Nothing was saved — please try again.'))
  }

  let outcome: Result<'stored' | string>
  try {
    outcome = await commit(gate.value, 'innovations', [
      innovationInsert(db, reference, data, gate.value.key),
      ...uploaded.map((u) => evidenceInsert(db, reference, u)),
      ...outboxStatements(db, reference, submissionOutbox('innovation', one(data.email), {
        category: one(data.category),
        trl: one(data.trl),
        files: String(uploaded.length),
      })),
    ])
  } catch (cause) {
    await removeObjects(env, uploaded.map((u) => u.key))
    throw cause
  }
  if (!outcome.ok) return fail(outcome)
  if (outcome.value !== 'stored') {
    // A concurrent retry stored the record first; these uploads are surplus.
    await removeObjects(env, uploaded.map((u) => u.key))
    return json({ reference: outcome.value, replayed: true })
  }

  afterCommit(env, ctx, gate.value, reference)
  return json({ reference, files: uploaded.length }, 201)
}

/** Routes a public POST, or returns null if the path is not an intake route. */
export async function handleIntake(request: Request, env: Env, ctx: ExecutionContext, path: string) {
  if (path === '/api/contact') return handleMessage(request, env, ctx)
  if (path === '/api/challenges') return handleChallenge(request, env, ctx)
  if (path === '/api/innovations') return handleInnovation(request, env, ctx)
  return null
}
