import type { Env } from './types'

/**
 * Cloudflare Turnstile — bot protection for the public forms.
 *
 * Off unless TURNSTILE_SECRET is set, so a deployment without it behaves as
 * before. Locally, wrangler.local.toml uses Cloudflare's published test keys,
 * which always pass. A token is single-use, so the handlers check for an
 * idempotent replay *before* verifying: a retry of a submission that was
 * already stored must get its reference back, not a bot challenge.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function turnstileEnabled(env: Env) {
  return Boolean(env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY)
}

export async function verifyTurnstile(env: Env, request: Request, ip: string): Promise<boolean> {
  if (!turnstileEnabled(env)) return true
  const token = request.headers.get('x-turnstile-token') ?? ''
  if (!token || token.length > 2048) return false
  try {
    const body = new FormData()
    body.append('secret', env.TURNSTILE_SECRET!)
    body.append('response', token)
    body.append('remoteip', ip)
    const response = await fetch(VERIFY_URL, { method: 'POST', body })
    if (!response.ok) return false
    const result = (await response.json()) as { success?: boolean }
    return result.success === true
  } catch {
    // Fail closed: if the check cannot run, the form says to try again.
    return false
  }
}
