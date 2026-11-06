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

  /** "on" enables password sign-in (local/staging only). Production uses Access. */
  PASSWORD_LOGIN?: string

  /* Submitter receipts, delivered through the outbox (worker/outbox.ts). */

  /** Resend API key. Without it (and ACK_FROM) receipts are recorded as skipped. */
  RESEND_API_KEY?: string
  /** Sender, e.g. "InThinks <receipts@example.com>"; must be a domain verified in Resend. */
  ACK_FROM?: string
  /** "log" marks receipts as sent without sending — local development only. */
  EMAIL_MODE?: string

  /* Cloudflare Turnstile. Both must be set for the bot check to run. */
  TURNSTILE_SITE_KEY?: string
  TURNSTILE_SECRET?: string

  /** Anthropic API key for the match engine. Without it, matching is disabled. */
  ANTHROPIC_API_KEY?: string
  /** Overrides the matching model. Defaults to claude-opus-5. */
  MATCH_MODEL?: string

  ASSETS: Fetcher
}

export interface Ok<T> { ok: true; value: T }
export interface Err { ok: false; status: number; error: string; fields?: Record<string, string> }
export type Result<T> = Ok<T> | Err

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = (status: number, error: string, fields?: Record<string, string>): Err => ({
  ok: false, status, error, fields,
})
