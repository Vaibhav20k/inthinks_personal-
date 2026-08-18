import { err, ok } from './types'
import type { Env, Result } from './types'
import {
  CHALLENGE_SCHEMA,
  INNOVATION_SCHEMA,
  REQUIRED_DECLARATIONS,
  validate,
} from './validation'
import type { Clean } from './validation'
import { insertChallenge, insertInnovation, nextReference, notify, recordEvidence } from './storage'
import { SUBMISSION_CEILING, chargeSubmission, checkRequest, submissionsUsed } from './ratelimit'
import { handleAdmin } from './admin'

const MAX_JSON_BYTES = 256 * 1024
const MAX_TOTAL_UPLOAD = 60 * 1024 * 1024
const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_FILES = 12

/**
 * Extensions accepted for evidence. An allow-list, not a block-list: the point
 * is to accept the things the brief asks for and nothing else, so no
 * executable or script ever lands in the bucket.
 */
const ALLOWED_EXT = new Set([
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'md',
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'tif', 'tiff', 'heic',
  'mp4', 'mov', 'webm',
  'dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl', 'zip',
])

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Submission responses carry a reference and must never be cached.
      'cache-control': 'no-store',
    },
  })

const fail = (e: { status: number; error: string; fields?: Record<string, string> }) =>
  json({ error: e.error, fields: e.fields }, e.status)

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

/** Never trust a submitted filename for a storage key. */
function safeKey(reference: string, name: string) {
  const ext = extensionOf(name)
  return `${reference}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`
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
}

const TOO_MANY = 'Too many submissions from this connection. Please try again shortly.'

async function guard(env: Env, request: Request): Promise<Result<Gate>> {
  if (!env.DB) {
    return err(503, 'Submissions are not configured on this deployment yet.')
  }
  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0'
  const salt = env.IP_SALT ?? 'inthinks-default-salt'

  // Loose ceiling on requests — only abuse reaches it, so a submitter
  // correcting field errors is never turned away.
  if (!(await checkRequest(env.DB, ip, salt))) {
    return err(429, 'Too many requests from this connection. Please try again shortly.')
  }
  // Tight ceiling on accepted submissions, checked before doing the work.
  if ((await submissionsUsed(env.DB, ip, salt)) >= SUBMISSION_CEILING) {
    return err(429, TOO_MANY)
  }
  return ok({ db: env.DB, ip, salt })
}

async function handleChallenge(request: Request, env: Env): Promise<Response> {
  const gate = await guard(env, request)
  if (!gate.ok) return fail(gate)

  const body = await readJson(request)
  if (!body.ok) return fail(body)

  const parsed = validate(CHALLENGE_SCHEMA, body.value)
  if (!parsed.ok) return fail(parsed)

  const data = parsed.value
  const { db, ip, salt } = gate.value
  const reference = await nextReference(db, 'CH', new Date().getUTCFullYear())
  await insertChallenge(db, reference, data)
  await chargeSubmission(db, ip, salt)

  await notify(env, {
    kind: 'challenge',
    reference,
    company: String(data.company ?? ''),
    sector: String(data.sector ?? ''),
  })

  return json({ reference }, 201)
}

async function handleInnovation(request: Request, env: Env): Promise<Response> {
  const gate = await guard(env, request)
  if (!gate.ok) return fail(gate)

  const type = request.headers.get('content-type') ?? ''
  let raw: unknown
  let files: File[] = []

  if (type.includes('multipart/form-data')) {
    const declared = Number(request.headers.get('content-length') ?? '0')
    if (declared > MAX_TOTAL_UPLOAD) return fail(err(413, 'Attachments exceed the size limit'))

    const form = await request.formData()
    const record = form.get('record')
    if (typeof record !== 'string') return fail(err(400, 'Missing submission record'))
    if (record.length > MAX_JSON_BYTES) return fail(err(413, 'Submission is too large'))
    try {
      raw = JSON.parse(record)
    } catch {
      return fail(err(400, 'Could not parse the submission'))
    }
    files = form.getAll('files').filter((f): f is File => f instanceof File)
  } else {
    const body = await readJson(request)
    if (!body.ok) return fail(body)
    raw = body.value
  }

  const parsed = validate(INNOVATION_SCHEMA, raw)
  if (!parsed.ok) return fail(parsed)
  const data: Clean = parsed.value

  // Declarations gate the submission; all of them are required.
  const declared = Array.isArray(data.declarations) ? data.declarations : []
  const missing = REQUIRED_DECLARATIONS.filter((d) => !declared.includes(d))
  if (missing.length > 0) {
    return fail(err(422, 'All declarations must be confirmed', { declarations: 'Required' }))
  }

  if (files.length > MAX_FILES) {
    return fail(err(413, `Attach at most ${MAX_FILES} files`))
  }
  let total = 0
  for (const file of files) {
    total += file.size
    if (file.size > MAX_FILE_BYTES) {
      return fail(err(413, `${file.name} is larger than 25 MB`))
    }
    if (!ALLOWED_EXT.has(extensionOf(file.name))) {
      return fail(err(415, `${file.name} is not an accepted file type`))
    }
  }
  if (total > MAX_TOTAL_UPLOAD) return fail(err(413, 'Attachments exceed the size limit'))
  if (files.length > 0 && !env.EVIDENCE) {
    return fail(err(503, 'File storage is not configured on this deployment yet.'))
  }

  const { db, ip, salt } = gate.value
  const reference = await nextReference(db, 'INT', new Date().getUTCFullYear())
  await insertInnovation(db, reference, data)
  await chargeSubmission(db, ip, salt)

  for (const file of files) {
    const key = safeKey(reference, file.name)
    await env.EVIDENCE!.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
      // Bound to the submission so an object can always be traced back.
      customMetadata: { reference },
    })
    await recordEvidence(db, reference, {
      key,
      name: file.name.slice(0, 300),
      type: file.type || 'application/octet-stream',
      size: file.size,
    })
  }

  await notify(env, {
    kind: 'innovation',
    reference,
    category: String(data.category ?? ''),
    trl: String(data.trl ?? ''),
    files: String(files.length),
  })

  return json({ reference, files: files.length }, 201)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    // Reports whether submissions can actually be accepted, so the client can
    // say so up front instead of failing at the end of an eight-step form.
    if (url.pathname === '/api/status' && request.method === 'GET') {
      return json({ submissions: Boolean(env.DB), uploads: Boolean(env.EVIDENCE) })
    }

    const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0'

    if (url.pathname.startsWith('/api/admin')) {
      try {
        return await handleAdmin(request, env, url, ip)
      } catch (cause) {
        console.error('admin request failed', cause instanceof Error ? cause.message : 'unknown')
        return json({ error: 'Something went wrong. Please try again.' }, 500)
      }
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    try {
      if (url.pathname === '/api/challenges') return await handleChallenge(request, env)
      if (url.pathname === '/api/innovations') return await handleInnovation(request, env)
    } catch (cause) {
      // Log the shape of the failure, never the submission itself.
      console.error('submission failed', cause instanceof Error ? cause.message : 'unknown')
      return json({ error: 'Something went wrong storing the submission. Please try again.' }, 500)
    }

    return json({ error: 'Not found' }, 404)
  },
}
