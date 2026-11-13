export const reply = (body: unknown, status = 200, headers: Record<string,string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow', ...headers,
  } })

export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin
}
export function cookie(request: Request, name: string) {
  return request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`))?.slice(name.length + 1) ?? null
}
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('')
}
export async function bodyObject(request: Request, max = 32_768): Promise<Record<string,unknown> | null> {
  if (!request.headers.get('content-type')?.includes('application/json')) return null
  // Bound reads before parsing, including chunked requests without content-length.
  const reader = request.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []; let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > max) { await reader.cancel(); return null }
    chunks.push(value)
  }
  const bytes = new Uint8Array(length); let offset = 0
  for (const c of chunks) { bytes.set(c,offset); offset += c.length }
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null
  } catch { return null }
}
export const textValue = (value: unknown, max = 200) => typeof value === 'string' && value.trim().length <= max ? value.trim() : ''
export const emailValue = (value: unknown) => {
  const email = textValue(value,254).toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}
