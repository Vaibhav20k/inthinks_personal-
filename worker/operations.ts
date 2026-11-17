import type { Env } from './types'
import { adminConfigured } from './auth'
import { emailUsage } from './email-quota'

/**
 * Operational checks.
 *
 * `liveness` is public and says only whether the database answers, so a free
 * external uptime monitor can poll it without learning anything. `healthReport`
 * is administrator-only and explains what needs attention. Both read; neither
 * repairs anything.
 */

/** Schema features the current code depends on, by migration. */
const REQUIRED_SCHEMA: [table: string, column: string, migration: string][] = [
  ['outbox', 'payload', '0013_reliable_intake'],
  ['case_records', 'organization_id', '0014_participant_access'],
  ['evidence', 'scan_status', '0015_file_quarantine'],
  ['case_workflow', 'owner_email', '0016_case_workflow'],
  ['clarification_requests', 'status', '0016_case_workflow'],
  ['submission_drafts', 'payload', '0016_case_workflow'],
  ['qualification_items', 'verification', '0017_structured_qualification'],
  ['email_usage', 'sent', '0018_email_quota'],
  ['match_embeddings', 'vector', '0019_match_embeddings'],
  ['intake_suggestions', 'quote', '0020_intake_suggestions'],
  ['economics_settings', 'settings', '0021_economics_settings'],
  ['disclosure_briefs', 'figure_ids', '0022_disclosure_engagement'],
  ['qualification_items', 'internal_only', '0022_disclosure_engagement'],
]

export async function liveness(env: Env) {
  if (!env.DB) return { ok: false, status: 503 }
  try {
    await env.DB.prepare('SELECT 1').first()
    return { ok: true, status: 200 }
  } catch {
    return { ok: false, status: 503 }
  }
}

async function missingSchema(db: D1Database) {
  const missing: string[] = []
  for (const [table, column, migration] of REQUIRED_SCHEMA) {
    const columns = await db.prepare(`SELECT name FROM pragma_table_info(?)`).bind(table).all<{ name: string }>()
    if (!columns.results.some((c) => c.name === column)) missing.push(migration)
  }
  return [...new Set(missing)]
}

const count = async (db: D1Database, sql: string, ...binds: unknown[]) =>
  (await db.prepare(sql).bind(...binds).first<{ n: number }>())?.n ?? 0

export async function healthReport(env: Env) {
  const db = env.DB!
  const now = new Date()
  const stale = new Date(now.getTime() - 30 * 60_000).toISOString()
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString()
  const schemaMissing = await missingSchema(db)
  const ready = schemaMissing.length === 0
  const auth = adminConfigured(env)
  const report = {
    checkedAt: now.toISOString(),
    database: { reachable: true, missingMigrations: schemaMissing },
    outbox: {
      failed: await count(db, "SELECT COUNT(*) n FROM outbox WHERE status='failed'"),
      skipped: await count(db, "SELECT COUNT(*) n FROM outbox WHERE status='skipped'"),
      overdue: await count(db, "SELECT COUNT(*) n FROM outbox WHERE status='pending' AND next_attempt_at<?", stale),
    },
    email: ready ? await emailUsage(db, env) : null,
    files: ready ? {
      quarantined: await count(db, "SELECT COUNT(*) n FROM evidence WHERE scan_status='quarantined'"),
      quarantinedOverADay: await count(db, "SELECT COUNT(*) n FROM evidence WHERE scan_status='quarantined' AND created_at<?", dayAgo),
    } : null,
    workflow: ready ? {
      overdueClarifications: await count(db, "SELECT COUNT(*) n FROM clarification_requests WHERE status='open' AND due_at IS NOT NULL AND due_at<?", now.toISOString().slice(0, 10)),
      overdueNextActions: await count(db, 'SELECT COUNT(*) n FROM case_workflow WHERE next_action_due IS NOT NULL AND next_action_due<?', now.toISOString().slice(0, 10)),
      unownedCases: await count(db, 'SELECT COUNT(*) n FROM case_records c LEFT JOIN case_workflow w ON w.reference=c.reference WHERE w.owner_email IS NULL'),
    } : null,
    // Presence of configuration only. None of these proves the external
    // service works; that needs a live check against the deployment.
    configuration: {
      managedStaffAccess: auth.access,
      passwordSignIn: auth.passwords,
      emailSender: Boolean(env.RESEND_API_KEY && env.ACK_FROM),
      fileStorage: Boolean(env.EVIDENCE),
      botCheck: Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET),
      teamWebhook: Boolean(env.NOTIFY_WEBHOOK),
    },
    warnings: [] as string[],
  }
  const w = report.warnings
  if (schemaMissing.length) w.push(`Migrations not applied: ${schemaMissing.join(', ')}.`)
  if (report.outbox.failed) w.push(`${report.outbox.failed} notification(s) failed permanently.`)
  if (report.outbox.overdue) w.push(`${report.outbox.overdue} notification(s) overdue by more than 30 minutes.`)
  if (report.email && report.email.today >= report.email.daily * 0.8) w.push(`Email use today is ${report.email.today} of ${report.email.daily}.`)
  if (report.email && report.email.month >= report.email.monthly * 0.8) w.push(`Email use this month is ${report.email.month} of ${report.email.monthly}.`)
  if (report.files?.quarantinedOverADay) w.push(`${report.files.quarantinedOverADay} file(s) waiting more than a day for inspection.`)
  if (report.workflow?.overdueClarifications) w.push(`${report.workflow.overdueClarifications} clarification request(s) past their due date.`)
  if (report.workflow?.overdueNextActions) w.push(`${report.workflow.overdueNextActions} case next action(s) overdue.`)
  if (!auth.access) w.push('Managed staff sign-in (Cloudflare Access) is not configured.')
  if (auth.passwords) w.push('Password staff sign-in is on. Use it only for local or staging deployments.')
  if (!report.configuration.emailSender) w.push('No email sender: receipts are skipped and participants cannot verify email.')
  if (!report.configuration.fileStorage) w.push('No file storage bound: uploads are refused.')
  return report
}

/**
 * Cron-time monitoring. Writes one structured line when something needs
 * attention, so Workers Logs (or `wrangler tail`) can alert on it. It logs
 * counts only, never references, addresses or content.
 */
export async function logOperationalWarnings(env: Env) {
  if (!env.DB) return
  try {
    const report = await healthReport(env)
    const actionable = report.warnings.filter((x) => !x.startsWith('Managed staff') && !x.startsWith('Password staff'))
    if (actionable.length) console.warn(JSON.stringify({ event: 'inthinks.health', warnings: actionable }))
  } catch (cause) {
    console.error(JSON.stringify({ event: 'inthinks.health', error: cause instanceof Error ? cause.message.slice(0, 120) : 'unknown' }))
  }
}
