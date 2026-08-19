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

/** Whether this deployment can actually accept submissions and files. */
export async function submissionStatus(): Promise<{ submissions: boolean; uploads: boolean }> {
  try {
    const response = await fetch('/api/status', { headers: { accept: 'application/json' } })
    if (!response.ok) return { submissions: false, uploads: false }
    return (await response.json()) as { submissions: boolean; uploads: boolean }
  } catch {
    return { submissions: false, uploads: false }
  }
}

export async function submitMessage(record: Record<string, unknown>) {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(record),
  })
  return unwrap(response)
}

export async function submitChallenge(record: Record<string, unknown>) {
  const response = await fetch('/api/challenges', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(record),
  })
  return unwrap(response)
}

export async function submitInnovation(record: Record<string, unknown>, files: File[]) {
  // Multipart only when there is something to attach — a JSON body keeps the
  // common case simple and cheap.
  if (files.length === 0) {
    const response = await fetch('/api/innovations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(record),
    })
    return unwrap(response)
  }

  const form = new FormData()
  form.append('record', JSON.stringify(record))
  for (const file of files) form.append('files', file, file.name)

  const response = await fetch('/api/innovations', { method: 'POST', body: form })
  return unwrap(response)
}
