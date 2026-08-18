export interface Env {
  /** D1 database holding submissions. Required for the API to accept anything. */
  DB?: D1Database
  /** R2 bucket for innovation evidence. Optional — without it, files are refused. */
  EVIDENCE?: R2Bucket
  /** Salt for hashing submitter IPs before they touch the rate-limit table. */
  IP_SALT?: string
  /** Optional webhook that receives a minimal arrival notice, never the content. */
  NOTIFY_WEBHOOK?: string

  /* Admin authentication. With none of these set the admin surface is
     unreachable rather than open — see worker/auth.ts. */

  /** Cloudflare Access team domain, e.g. inthinks.cloudflareaccess.com. */
  ACCESS_TEAM_DOMAIN?: string
  /** Application Audience tag for the Access application. */
  ACCESS_AUD?: string
  /** HMAC secret for password-login sessions. */
  SESSION_SECRET?: string

  ASSETS: Fetcher
}

export interface Ok<T> { ok: true; value: T }
export interface Err { ok: false; status: number; error: string; fields?: Record<string, string> }
export type Result<T> = Ok<T> | Err

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = (status: number, error: string, fields?: Record<string, string>): Err => ({
  ok: false, status, error, fields,
})
