/** JSON request with the server's error message surfaced, plus field errors. */
export class RequestError extends Error {
  constructor(message: string, readonly fields: Record<string, string> = {}) { super(message) }
}

export async function requestJson<T>(url: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new RequestError(data.error ?? 'Request failed', data.fields ?? {})
  return data as T
}
