const enc = new TextEncoder()

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/**
 * Short-lived signed links for evidence files.
 *
 * R2 object keys never reach the browser as fetchable URLs. A download link is
 * an HMAC over the key and an expiry, so a link that leaks stops working within
 * minutes and cannot be edited to point at another submission's files.
 */
const TTL_SECONDS = 300

export async function signEvidence(secret: string, key: string) {
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const payload = `${key}:${expires}`
  const hmacKey = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const signature = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, enc.encode(payload))))
  return `/api/admin/evidence?key=${encodeURIComponent(key)}&exp=${expires}&sig=${signature}`
}

export async function verifyEvidence(secret: string, key: string, exp: string, sig: string) {
  const expires = Number(exp)
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return false
  const hmacKey = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const expected = b64url(
    new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, enc.encode(`${key}:${expires}`))),
  )
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0
}
