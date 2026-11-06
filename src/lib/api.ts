/**
 * Submission API client.
 *
 * The endpoint lives in the same Worker that serves the site, so these are
 * same-origin requests with no CORS and no credentials to leak. Server-side
 * validation is authoritative; field errors returned from it are surfaced on
 * the matching inputs.
 */

export interface FieldErrors {
  [field: string]: string
}

export class SubmissionError extends Error {
  readonly fields?: FieldErrors
  readonly status: number

  constructor(message: string, status: number, fields?: FieldErrors) {
    super(message)
    this.name = 'SubmissionError'
    this.status = status
    this.fields = fields
  }
}

interface ApiError {
  error?: string
  fields?: FieldErrors
}

async function unwrap(response: Response): Promise<{ reference: string }> {
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    /* an empty or non-JSON body is handled below */
  }

  if (!response.ok) {
    const e = (body ?? {}) as ApiError
    throw new SubmissionError(
      e.error ?? 'The submission could not be sent. Please try again.',
      response.status,
      e.fields,
    )
  }

  const reference = (body as { reference?: string })?.reference
  if (!reference) {
    throw new SubmissionError('The submission was accepted but no reference came back.', 502)
  }
  return { reference }
}

export interface IntakeStatus {
  submissions: boolean
  uploads: boolean
  /** Present when the deployment runs the Turnstile bot check. */
  turnstileSiteKey: string | null
}

/** Whether this deployment can actually accept submissions and files. */
export async function submissionStatus(): Promise<IntakeStatus> {
  const off: IntakeStatus = { submissions: false, uploads: false, turnstileSiteKey: null }
  try {
    const response = await fetch('/api/status', { headers: { accept: 'application/json' } })
    if (!response.ok) return off
    const body = (await response.json()) as Partial<IntakeStatus>
    return {
      submissions: Boolean(body.submissions),
      uploads: Boolean(body.uploads),
      turnstileSiteKey: typeof body.turnstileSiteKey === 'string' ? body.turnstileSiteKey : null,
    }
  } catch {
    return off
  }
}

/**
 * Sent with every submission. The same `idempotencyKey` is reused on every
 * retry of one submission, so the server returns the reference it already
 * issued instead of opening a second case.
 */
export interface SubmitOptions {
  idempotencyKey: string
  turnstileToken?: string | null
}

function intakeHeaders(options: SubmitOptions, json: boolean): Record<string, string> {
  const headers: Record<string, string> = { 'idempotency-key': options.idempotencyKey }
  if (json) headers['content-type'] = 'application/json'
  if (options.turnstileToken) headers['x-turnstile-token'] = options.turnstileToken
  return headers
}

export async function submitMessage(record: Record<string, unknown>, options: SubmitOptions) {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: intakeHeaders(options, true),
    body: JSON.stringify(record),
  })
  return unwrap(response)
}

export async function submitChallenge(record: Record<string, unknown>, options: SubmitOptions) {
  const response = await fetch('/api/challenges', {
    method: 'POST',
    headers: intakeHeaders(options, true),
    body: JSON.stringify(record),
  })
  return unwrap(response)
}

export async function submitInnovation(record: Record<string, unknown>, files: File[], options: SubmitOptions) {
  // Multipart only when there is something to attach — a JSON body keeps the
  // common case simple and cheap.
  if (files.length === 0) {
    const response = await fetch('/api/innovations', {
      method: 'POST',
      headers: intakeHeaders(options, true),
      body: JSON.stringify(record),
    })
    return unwrap(response)
  }

  const form = new FormData()
  form.append('record', JSON.stringify(record))
  for (const file of files) form.append('files', file, file.name)

  // No content-type header: the browser sets the multipart boundary itself.
  const response = await fetch('/api/innovations', { method: 'POST', headers: intakeHeaders(options, false), body: form })
  return unwrap(response)
}
