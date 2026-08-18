export interface Env {
  /** D1 database holding submissions. Required for the API to accept anything. */
  DB?: D1Database
  /** R2 bucket for innovation evidence. Optional — without it, files are refused. */
  EVIDENCE?: R2Bucket
  /** Salt for hashing submitter IPs before they touch the rate-limit table. */
  IP_SALT?: string
  /** Optional webhook that receives a minimal arrival notice, never the content. */
  NOTIFY_WEBHOOK?: string
  ASSETS: Fetcher
}

export interface Ok<T> { ok: true; value: T }
export interface Err { ok: false; status: number; error: string; fields?: Record<string, string> }
export type Result<T> = Ok<T> | Err

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = (status: number, error: string, fields?: Record<string, string>): Err => ({
  ok: false, status, error, fields,
})
