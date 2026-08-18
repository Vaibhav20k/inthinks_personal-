/**
 * Per-IP throttling, in two tiers.
 *
 * A single counter would be wrong here. If rejected requests counted toward
 * the submission limit, someone who mistypes their email three times would be
 * locked out of a form they just spent twenty minutes filling in. So requests
 * get a loose ceiling that only abuse reaches, and accepted submissions get a
 * tight one that is only ever charged after a record is actually stored.
 *
 * The IP is stored only as a salted hash, so the table cannot be read back
 * into a list of who submitted from where.
 */
const WINDOW_MS = 10 * 60 * 1000

/** Any request to the API, valid or not. */
export const REQUEST_CEILING = 60
/** Submissions that were actually accepted and written. */
export const SUBMISSION_CEILING = 6

async function hashIp(ip: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function bump(db: D1Database, key: string, bucket: number): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO rate_limit (ip_hash, bucket, count) VALUES (?, ?, 1)
       ON CONFLICT(ip_hash, bucket) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(key, bucket)
    .first<{ count: number }>()
  return row?.count ?? 1
}

export async function checkRequest(db: D1Database, ip: string, salt: string): Promise<boolean> {
  const bucket = Math.floor(Date.now() / WINDOW_MS)
  const key = `req:${await hashIp(ip, salt)}`
  const count = await bump(db, key, bucket)

  // Opportunistic cleanup; the table is otherwise unbounded.
  if (count === 1) {
    await db.prepare('DELETE FROM rate_limit WHERE bucket < ?').bind(bucket - 2).run()
  }
  return count <= REQUEST_CEILING
}

/** Charged only once a submission has been stored. */
export async function chargeSubmission(db: D1Database, ip: string, salt: string): Promise<boolean> {
  const bucket = Math.floor(Date.now() / WINDOW_MS)
  const key = `ok:${await hashIp(ip, salt)}`
  return (await bump(db, key, bucket)) <= SUBMISSION_CEILING
}

/** Read-only peek, so the limit can be enforced before doing the work. */
export async function submissionsUsed(db: D1Database, ip: string, salt: string): Promise<number> {
  const bucket = Math.floor(Date.now() / WINDOW_MS)
  const key = `ok:${await hashIp(ip, salt)}`
  const row = await db
    .prepare('SELECT count FROM rate_limit WHERE ip_hash = ? AND bucket = ?')
    .bind(key, bucket)
    .first<{ count: number }>()
  return row?.count ?? 0
}
