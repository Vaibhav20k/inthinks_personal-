import type { Env } from './types'

/**
 * Email usage cap.
 *
 * Every real call to Resend first reserves a slot here. Defaults are half of
 * Resend's free tier (100/day, 3,000/month): 50 a day and 1,500 a month,
 * overridable with EMAIL_DAILY_LIMIT / EMAIL_MONTHLY_LIMIT.
 *
 * Verification codes outrank receipts: receipts may use the daily allowance
 * only up to RESERVED_FOR_CODES below the limit, so a burst of submissions can
 * never stop people signing in. A refused receipt waits in the outbox until
 * the next UTC day; nothing is dropped.
 */
export const RESERVED_FOR_CODES = 10

export type EmailPurpose = 'verification' | 'receipt'

const limit = (value: string | undefined, fallback: number) => {
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : fallback
}
export const emailLimits = (env: Env) => ({
  daily: limit(env.EMAIL_DAILY_LIMIT, 50),
  monthly: limit(env.EMAIL_MONTHLY_LIMIT, 1500),
})

const today = () => new Date().toISOString().slice(0, 10)
export const nextUtcMidnight = () => {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString()
}

export async function emailUsage(db: D1Database, env: Env) {
  const day = today()
  const row = await db.prepare(`SELECT
      COALESCE((SELECT sent FROM email_usage WHERE day=?),0) today,
      COALESCE((SELECT SUM(sent) FROM email_usage WHERE day LIKE ?),0) month`).bind(day, `${day.slice(0, 7)}-%`).first<{ today: number; month: number }>()
  return { today: row?.today ?? 0, month: row?.month ?? 0, ...emailLimits(env) }
}

/**
 * Atomically takes one send from today's allowance. Returns false when the
 * day or month is full (for receipts, when only the codes' reserve is left).
 * A single conditional upsert, so two requests cannot both take the last slot.
 */
export async function reserveEmail(db: D1Database, env: Env, purpose: EmailPurpose) {
  const { daily, monthly } = emailLimits(env)
  const dayCap = purpose === 'verification' ? daily : Math.max(0, daily - RESERVED_FOR_CODES)
  const day = today()
  const reserved = await db.prepare(`INSERT INTO email_usage(day,sent)
      SELECT ?,1 WHERE ? > 0
        AND COALESCE((SELECT SUM(sent) FROM email_usage WHERE day LIKE ?),0) < ?
      ON CONFLICT(day) DO UPDATE SET sent=sent+1
        WHERE email_usage.sent < ?
        AND (SELECT SUM(sent) FROM email_usage WHERE day LIKE ?) < ?
      RETURNING sent`)
    .bind(day, dayCap, `${day.slice(0, 7)}-%`, monthly, dayCap, `${day.slice(0, 7)}-%`, monthly)
    .first<{ sent: number }>()
  return Boolean(reserved)
}

// Slots are counted per attempt and never returned: a request the provider
// rejected may still count against its quota, so erring high is the safe side.
