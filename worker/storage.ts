import type { Clean } from './validation'

/** Fields promoted to real columns so triage never has to parse JSON. */
const CHALLENGE_COLUMNS = [
  'company', 'contact', 'designation', 'email', 'phone',
  'location', 'website', 'sector', 'title', 'confidentiality',
] as const

const INNOVATION_COLUMNS = [
  'title', 'category', 'trl', 'name', 'email', 'institution', 'institutionType',
] as const

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''))

/**
 * Allocates the next reference in a stream, atomically.
 *
 * D1 is SQLite with a single writer, so the upsert-and-return is safe against
 * two submissions landing at once — which matters, because a duplicated
 * reference is the one error a submitter would actually notice.
 */
/**
 * Streams, and why they are separate.
 *
 * `CH` and `INT` belong to submissions; `TEC` and `PRB` to records InThinks
 * authors itself. Sharing a stream would let an authored profile take a
 * reference a real submission is going to be issued, and the collision would
 * surface as one record silently overwriting another.
 */
export type ReferenceStream = 'CH' | 'INT' | 'MSG' | 'TEC' | 'PRB' | 'MTC'

export async function nextReference(db: D1Database, stream: ReferenceStream, year: number) {
  const name = `${stream}:${year}`
  const row = await db
    .prepare(
      `INSERT INTO counters (name, value) VALUES (?, 1)
       ON CONFLICT(name) DO UPDATE SET value = value + 1
       RETURNING value`,
    )
    .bind(name)
    .first<{ value: number }>()
  const seq = String(row?.value ?? 1).padStart(4, '0')
  return `${stream}-${year}-${seq}`
}

/**
 * Stores a contact message.
 *
 * Every field is a real column, so there is no payload blob and nothing to
 * parse on read. The honeypot never reaches here — the handler rejects on it
 * before this is called — so there is no column for it and no way for it to
 * be stored and later mistaken for a real website field.
 */
/**
 * The inserts below return prepared statements rather than running them, so
 * a handler can commit the record, its evidence manifest and its outbox rows
 * in one `db.batch()` — D1 runs a batch as a single transaction, so either all
 * of it is stored or none of it is.
 *
 * `idempotencyKey` is the client's key for this submission attempt; see
 * migrations/0013_reliable_intake.sql.
 */
export function messageInsert(db: D1Database, reference: string, data: Clean, idempotencyKey: string | null) {
  return db
    .prepare(
      `INSERT INTO messages
         (reference, created_at, status, name, email, organisation, topic, message, idempotency_key)
       VALUES (?, ?, 'New', ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      reference,
      new Date().toISOString(),
      one(data.name),
      one(data.email),
      one(data.organisation),
      one(data.topic),
      one(data.message),
      idempotencyKey,
    )
}

export function challengeInsert(db: D1Database, reference: string, data: Clean, idempotencyKey: string | null) {
  const rest: Clean = { ...data }
  for (const key of CHALLENGE_COLUMNS) delete rest[key]

  return db
    .prepare(
      `INSERT INTO challenges
         (reference, created_at, status, confidentiality, company, contact_name,
          designation, email, phone, location, website, sector, title, payload, idempotency_key)
       VALUES (?, ?, 'Received', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      reference,
      new Date().toISOString(),
      one(data.confidentiality) || 'standard',
      one(data.company),
      one(data.contact),
      one(data.designation),
      one(data.email),
      one(data.phone),
      one(data.location),
      one(data.website),
      one(data.sector),
      one(data.title),
      JSON.stringify(rest),
      idempotencyKey,
    )
}

export function innovationInsert(db: D1Database, reference: string, data: Clean, idempotencyKey: string | null) {
  const rest: Clean = { ...data }
  for (const key of INNOVATION_COLUMNS) delete rest[key]

  return db
    .prepare(
      `INSERT INTO innovations
         (reference, created_at, status, title, category, entry_trl,
          innovator_name, innovator_email, institution, institution_type, payload, idempotency_key)
       VALUES (?, ?, 'Submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      reference,
      new Date().toISOString(),
      one(data.title),
      one(data.category),
      Number(one(data.trl)) || 1,
      one(data.name),
      one(data.email),
      one(data.institution),
      one(data.institutionType),
      JSON.stringify(rest),
      idempotencyKey,
    )
}

export function evidenceInsert(
  db: D1Database,
  reference: string,
  file: { key: string; name: string; type: string; size: number },
) {
  return db
    .prepare(
      `INSERT INTO evidence (reference, object_key, file_name, content_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(reference, file.key, file.name, file.type, file.size, new Date().toISOString())
}

export type SubmissionTable = 'challenges' | 'innovations' | 'messages'

/** The reference already issued for this idempotency key, if any. */
export async function referenceForKey(db: D1Database, table: SubmissionTable, key: string | null) {
  if (!key) return null
  const row = await db
    .prepare(`SELECT reference FROM ${table} WHERE idempotency_key = ?`)
    .bind(key)
    .first<{ reference: string }>()
  return row?.reference ?? null
}

/** Whether a D1 error is the unique-index violation a concurrent retry causes. */
export function isUniqueViolation(cause: unknown) {
  return cause instanceof Error && /UNIQUE constraint failed/i.test(cause.message)
}
