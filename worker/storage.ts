import type { Clean } from './validation'
import type { Env } from './types'

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
export async function insertMessage(db: D1Database, reference: string, data: Clean) {
  await db
    .prepare(
      `INSERT INTO messages
         (reference, created_at, status, name, email, organisation, topic, message)
       VALUES (?, ?, 'New', ?, ?, ?, ?, ?)`,
    )
    .bind(
      reference,
      new Date().toISOString(),
      one(data.name),
      one(data.email),
      one(data.organisation),
      one(data.topic),
      one(data.message),
    )
    .run()
}

export async function insertChallenge(db: D1Database, reference: string, data: Clean) {
  const rest: Clean = { ...data }
  for (const key of CHALLENGE_COLUMNS) delete rest[key]

  await db
    .prepare(
      `INSERT INTO challenges
         (reference, created_at, status, confidentiality, company, contact_name,
          designation, email, phone, location, website, sector, title, payload)
       VALUES (?, ?, 'Received', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    )
    .run()
}

export async function insertInnovation(db: D1Database, reference: string, data: Clean) {
  const rest: Clean = { ...data }
  for (const key of INNOVATION_COLUMNS) delete rest[key]

  await db
    .prepare(
      `INSERT INTO innovations
         (reference, created_at, status, title, category, entry_trl,
          innovator_name, innovator_email, institution, institution_type, payload)
       VALUES (?, ?, 'Submitted', ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    )
    .run()
}

export async function recordEvidence(
  db: D1Database,
  reference: string,
  file: { key: string; name: string; type: string; size: number },
) {
  await db
    .prepare(
      `INSERT INTO evidence (reference, object_key, file_name, content_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(reference, file.key, file.name, file.type, file.size, new Date().toISOString())
    .run()
}

/**
 * Tells the team something arrived — reference, company and sector only.
 *
 * The problem statement and every technical answer are the confidential part
 * of a submission, and a webhook is the least controlled surface in the
 * system, so none of it goes here.
 */
export async function notify(env: Env, summary: Record<string, string>) {
  if (!env.NOTIFY_WEBHOOK) return
  try {
    await fetch(env.NOTIFY_WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(summary),
    })
  } catch {
    // A failed notification must never fail the submission — the record is
    // already committed and the submitter has their reference.
  }
}
