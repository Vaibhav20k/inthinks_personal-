import { err, ok } from './types'
import type { Env, Result } from './types'
import {
  CHALLENGE_SCHEMA,
  INNOVATION_SCHEMA,
  MESSAGE_SCHEMA,
  REQUIRED_DECLARATIONS,
  validate,
} from './validation'
import type { Clean } from './validation'
import { insertChallenge, insertInnovation, insertMessage, nextReference, notify, recordEvidence } from './storage'
import { SUBMISSION_CEILING, chargeSubmission, checkRequest, submissionsUsed } from './ratelimit'
import { handleAdmin } from './admin'
import { handleTechnologies } from './technologies'
import { handleProblems } from './problems'
import { handlePublicMatches } from './public-matches'
import { coarse, isDaylight, sunTimes } from './daylight'

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
      'x-robots-tag': 'noindex, nofollow',
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

/**
 * The topics the contact form offers.
 *
 * Checked server-side rather than accepted as free text: the admin list filters
 * on this column, and one submission with a topic nobody chose turns a filter
 * into a guess. The client sends one of these or the request is refused.
 */
const MESSAGE_TOPICS = [
  'General enquiry',
  'Technology transfer or licensing',
  'Partnership or collaboration',
  'Working with InThinks',
  'Press or media',
  'Something else',
]

async function handleMessage(request: Request, env: Env): Promise<Response> {
  const gate = await guard(env, request)
  if (!gate.ok) return fail(gate)

  const body = await readJson(request)
  if (!body.ok) return fail(body)

  const parsed = validate(MESSAGE_SCHEMA, body.value)
  if (!parsed.ok) return fail(parsed)

  const data = parsed.value

  /**
   * The honeypot.
   *
   * `website` is rendered off-screen and left empty by anyone who can see the
   * page; a bot filling every input it finds fills this one too. Answering 201
   * with a plausible reference rather than an error is deliberate — a rejection
   * tells the author which field gave them away, and they simply stop filling
   * it. Nothing is stored, and no rate-limit budget is spent on them.
   *
   * A person never trips this: the field is not in the tab order, is marked
   * aria-hidden, and has autocomplete off, so neither a screen reader nor a
   * password manager will put anything in it.
   */
  const honeypot = Array.isArray(data.website) ? data.website[0] : data.website
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return json({ reference: `MSG-${new Date().getUTCFullYear()}-0000` }, 201)
  }

  const topic = Array.isArray(data.topic) ? data.topic[0] : data.topic
  if (!MESSAGE_TOPICS.includes(String(topic))) {
    return fail(err(422, 'Choose what your message is about', { topic: 'Required' }))
  }

  const message = String(Array.isArray(data.message) ? data.message[0] : data.message ?? '')
  if (message.trim().length < 10) {
    return fail(err(422, 'Tell us a little more', { message: 'Please write a little more' }))
  }

  const { db, ip, salt } = gate.value
  const reference = await nextReference(db, 'MSG', new Date().getUTCFullYear())
  await insertMessage(db, reference, data)
  await chargeSubmission(db, ip, salt)

  // The webhook is what makes a contact form answerable in hours rather than
  // whenever somebody next opens the admin. It never fails the request.
  await notify(env, {
    kind: 'message',
    reference,
    topic: String(topic ?? ''),
    from: String(Array.isArray(data.email) ? data.email[0] : data.email ?? ''),
  })

  return json({ reference }, 201)
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

    // The public portfolio. Read-only, unauthenticated, and served before the
    // rate limiter reads an IP — nobody is identified to browse the site.
    if (url.pathname === '/api/matches' || url.pathname.startsWith('/api/matches/')) {
      return await handlePublicMatches(request, env, url)
    }

    if (url.pathname === '/api/problems' || url.pathname.startsWith('/api/problems/')) {
      return await handleProblems(request, env, url)
    }

    if (url.pathname === '/api/technologies' || url.pathname.startsWith('/api/technologies/')) {
      try {
        return await handleTechnologies(request, env, url)
      } catch (cause) {
        console.error('portfolio request failed', cause instanceof Error ? cause.message : 'unknown')
        return json({ error: 'Something went wrong.' }, 500)
      }
    }

    /**
     * Whether it is light where the visitor is.
     *
     * The coordinates come from the edge, so nobody is asked for permission to
     * pick a colour scheme — a geolocation prompt on page load is a bad trade
     * for that. They are rounded to a whole degree before anything is computed
     * or returned: enough to place a sunrise within a few minutes, far too
     * coarse to place a person, and nothing is stored or logged.
     */
    if (url.pathname === '/api/daylight' && request.method === 'GET') {
      const cf = (request as unknown as { cf?: Record<string, unknown> }).cf
      const lat = Number(cf?.latitude)
      const lon = Number(cf?.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        // No location at the edge: say so rather than invent a sunrise.
        return new Response(JSON.stringify({ known: false }), {
          headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
        })
      }
      const now = new Date()
      const times = sunTimes(coarse(lat), coarse(lon), now)
      const minute = now.getUTCHours() * 60 + now.getUTCMinutes()
      return new Response(
        JSON.stringify({
          known: true,
          kind: times.kind,
          // Whole minutes: the algorithm does not claim more, and a colour
          // scheme cannot express more.
          sunriseUtcMin: times.sunriseUtcMin === null ? null : Math.round(times.sunriseUtcMin),
          sunsetUtcMin: times.sunsetUtcMin === null ? null : Math.round(times.sunsetUtcMin),
          ground: isDaylight(times, minute) ? 'light' : 'dark',
        }),
        {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            // private, and never s-maxage: this answer is one visitor's
            // location and would otherwise be served to the next one.
            'cache-control': 'private, max-age=900',
          },
        },
      )
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
      if (url.pathname === '/api/contact') return await handleMessage(request, env)
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
