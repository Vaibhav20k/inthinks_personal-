import type { Actor } from './auth'

/**
 * Audit trail.
 *
 * Reads are logged, not just writes. "Who opened this innovation record" is a
 * question the platform has to be able to answer, because the confidential
 * thing here is the disclosure itself — an unpublished invention or a company's
 * unsolved problem — and viewing it is the action that matters.
 */
export async function audit(
  db: D1Database,
  actor: Actor,
  action: string,
  target?: string,
  meta?: Record<string, unknown>,
  ip?: string,
) {
  try {
    let ipHash: string | null = null
    if (ip) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))
      ipHash = [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
    }
    await db
      .prepare(
        `INSERT INTO audit_log (at, actor, role, action, target, meta, ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        new Date().toISOString(),
        actor.email,
        actor.role,
        action,
        target ?? null,
        meta ? JSON.stringify(meta) : null,
        ipHash,
      )
      .run()
  } catch {
    // An audit write must never take down the request that triggered it, but a
    // silent failure is worth surfacing in logs.
    console.error('audit write failed', action)
  }
}
