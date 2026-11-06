import type { Env } from './types'

/**
 * Transactional outbox.
 *
 * A submission and the messages it should trigger (the submitter's receipt,
 * the team's arrival notice) are written in the same D1 batch, so they are
 * stored together or not at all. Delivery happens afterwards: once straight
 * away from the request that stored them (best effort, via waitUntil), and
 * again from the cron trigger for anything that failed or was missed.
 *
 * Delivery is at-least-once. A row is leased before it is sent so the request
 * and the cron do not both send it, but a crash between "sent" and "marked
 * sent" can still repeat a receipt — a duplicate receipt is acceptable, a lost
 * submission is not.
 *
 * Nothing confidential goes through here: a receipt carries the reference
 * only, and the team notice carries reference, kind and triage fields.
 */

export type OutboxKind = 'ack_email' | 'notify_webhook'

export interface OutboxItem {
  kind: OutboxKind
  payload: Record<string, string>
}

export type SubmissionKind = 'challenge' | 'innovation' | 'message'

/** Attempts before a row is parked as `failed` for staff to look at. */
export const MAX_ATTEMPTS = 8
/** How long a claimed row is held before another worker may retry it. */
const LEASE_MINUTES = 5

/** Exponential backoff in minutes: 1, 2, 4 … capped at six hours. */
export function backoffMinutes(attempts: number) {
  return Math.min(2 ** Math.max(0, attempts), 360)
}

const iso = (ms: number) => new Date(ms).toISOString()

export function outboxStatements(db: D1Database, reference: string, items: OutboxItem[]) {
  const now = iso(Date.now())
  return items.map((item) =>
    db
      .prepare(
        `INSERT INTO outbox (kind, reference, payload, status, attempts, next_attempt_at, created_at)
         VALUES (?, ?, ?, 'pending', 0, ?, ?)`,
      )
      .bind(item.kind, reference, JSON.stringify(item.payload), now, now),
  )
}

/** The outbox rows every stored submission gets. */
export function submissionOutbox(kind: SubmissionKind, email: string, notice: Record<string, string>): OutboxItem[] {
  const items: OutboxItem[] = [{ kind: 'notify_webhook', payload: { kind, ...notice } }]
  if (email) items.unshift({ kind: 'ack_email', payload: { kind, to: email } })
  return items
}

const LABEL: Record<SubmissionKind, string> = {
  challenge: 'industry challenge',
  innovation: 'innovation submission',
  message: 'message',
}

export function receiptText(kind: SubmissionKind, reference: string) {
  return [
    `Thank you. InThinks has received your ${LABEL[kind] ?? 'submission'}.`,
    '',
    `Your reference is ${reference}. Please quote it in any correspondence.`,
    '',
    'Every submission is reviewed by the InThinks team. If we need more information we will contact you at this address.',
    '',
    'This email confirms receipt only. It does not contain, and will never contain, the content of your submission.',
    '',
    '— InThinks',
  ].join('\n')
}

type Outcome = { status: 'sent' } | { status: 'skipped'; reason: string } | { status: 'error'; reason: string }

async function sendReceipt(env: Env, reference: string, payload: Record<string, string>): Promise<Outcome> {
  const kind = (payload.kind ?? 'challenge') as SubmissionKind
  if (!env.RESEND_API_KEY || !env.ACK_FROM) {
    if (env.EMAIL_MODE === 'log') {
      // Local development: prove the path without sending. Never log the address.
      console.log(`[outbox] receipt for ${reference} would be emailed (EMAIL_MODE=log)`)
      return { status: 'sent' }
    }
    return { status: 'skipped', reason: 'email not configured' }
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.ACK_FROM,
      to: [payload.to],
      subject: `InThinks received your submission ${reference}`,
      text: receiptText(kind, reference),
    }),
  })
  if (response.ok) return { status: 'sent' }
  return { status: 'error', reason: `email provider returned ${response.status}` }
}

async function sendNotice(env: Env, reference: string, payload: Record<string, string>): Promise<Outcome> {
  if (!env.NOTIFY_WEBHOOK) return { status: 'skipped', reason: 'webhook not configured' }
  const response = await fetch(env.NOTIFY_WEBHOOK, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reference, ...payload }),
  })
  if (response.ok) return { status: 'sent' }
  return { status: 'error', reason: `webhook returned ${response.status}` }
}

interface Row {
  id: number
  kind: OutboxKind
  reference: string
  payload: string
  attempts: number
}

/**
 * Delivers due outbox rows. With `reference`, only that submission's rows —
 * that is the call made straight after a submission is stored.
 */
export async function deliverOutbox(env: Env, options: { reference?: string; limit?: number } = {}) {
  const db = env.DB
  if (!db) return { delivered: 0, failed: 0 }
  const now = Date.now()
  const limit = Math.min(options.limit ?? 25, 50)

  const due = await db
    .prepare(
      `SELECT id, kind, reference, payload, attempts FROM outbox
       WHERE status = 'pending' AND next_attempt_at <= ? ${options.reference ? 'AND reference = ?' : ''}
       ORDER BY id LIMIT ?`,
    )
    .bind(...(options.reference ? [iso(now), options.reference, limit] : [iso(now), limit]))
    .all<Row>()

  let delivered = 0
  let failed = 0
  for (const row of due.results) {
    // Lease: only one worker gets to send this row now.
    const claimed = await db
      .prepare(
        `UPDATE outbox SET next_attempt_at = ?
         WHERE id = ? AND status = 'pending' AND next_attempt_at <= ? RETURNING id`,
      )
      .bind(iso(now + LEASE_MINUTES * 60_000), row.id, iso(now))
      .first<{ id: number }>()
    if (!claimed) continue

    let outcome: Outcome
    try {
      const payload = JSON.parse(row.payload) as Record<string, string>
      outcome = row.kind === 'ack_email'
        ? await sendReceipt(env, row.reference, payload)
        : await sendNotice(env, row.reference, payload)
    } catch (cause) {
      outcome = { status: 'error', reason: cause instanceof Error ? cause.message.slice(0, 200) : 'unknown error' }
    }

    if (outcome.status === 'sent' || outcome.status === 'skipped') {
      await db
        .prepare(`UPDATE outbox SET status = ?, payload = '{}', sent_at = ?, last_error = ? WHERE id = ?`)
        .bind(outcome.status, iso(Date.now()), outcome.status === 'skipped' ? outcome.reason : null, row.id)
        .run()
      if (outcome.status === 'sent') delivered++
      continue
    }

    const attempts = row.attempts + 1
    const parked = attempts >= MAX_ATTEMPTS
    await db
      .prepare(`UPDATE outbox SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?`)
      .bind(parked ? 'failed' : 'pending', attempts, iso(Date.now() + backoffMinutes(attempts) * 60_000), outcome.reason, row.id)
      .run()
    failed++
    // Shape only — never the payload, which holds the recipient's address.
    console.error(`[outbox] ${row.kind} for ${row.reference} failed (attempt ${attempts}): ${outcome.reason}`)
  }
  return { delivered, failed }
}
