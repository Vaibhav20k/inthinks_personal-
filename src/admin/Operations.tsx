import { useEffect, useState } from 'react'
import { Empty, Panel, Stat } from './ui'
import { requestJson } from '../lib/http'

interface Report {
  checkedAt: string
  database: { reachable: boolean; missingMigrations: string[] }
  outbox: { failed: number; skipped: number; overdue: number }
  files: { quarantined: number; quarantinedOverADay: number } | null
  workflow: { overdueClarifications: number; overdueNextActions: number; unownedCases: number } | null
  configuration: Record<string, boolean>
  warnings: string[]
}
const CONFIG: Record<string, string> = {
  managedStaffAccess: 'Managed staff sign-in (Cloudflare Access)', passwordSignIn: 'Password staff sign-in',
  emailSender: 'Email sender', fileStorage: 'File storage', botCheck: 'Bot check', teamWebhook: 'Team webhook',
}

/** Administrator health view. Configuration rows show presence, not proof. */
export default function Operations() {
  const [report, setReport] = useState<Report | null>(null), [error, setError] = useState('')
  useEffect(() => { requestJson<Report>('/api/admin/health').then(setReport).catch((e) => setError(e.message)) }, [])
  if (error) return <Empty>{error}</Empty>
  if (!report) return <Empty>Loading…</Empty>
  return <div className="grid gap-6">
    <Panel title="Needs attention">
      {report.warnings.length ? <ul className="grid gap-2 list-disc pl-5">{report.warnings.map((w) => <li key={w}>{w}</li>)}</ul> : <p>Nothing flagged.</p>}
      <p className="mt-3 text-sm">Checked {report.checkedAt.replace('T', ' ').slice(0, 16)} UTC.</p>
    </Panel>
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat label="Failed notifications" value={report.outbox.failed} />
      <Stat label="Overdue notifications" value={report.outbox.overdue} />
      <Stat label="Files in quarantine" value={report.files?.quarantined ?? '—'} />
      <Stat label="Overdue next actions" value={report.workflow?.overdueNextActions ?? '—'} />
      <Stat label="Overdue clarifications" value={report.workflow?.overdueClarifications ?? '—'} />
      <Stat label="Cases without owner" value={report.workflow?.unownedCases ?? '—'} />
    </div>
    <Panel title="Configuration present">
      <p className="mb-3 text-sm">Shows whether each setting exists on this deployment. A configured service still needs a live check before it is relied on.</p>
      <ul className="grid gap-1">{Object.entries(report.configuration).map(([k, v]) => <li key={k}>{CONFIG[k] ?? k}: {v ? 'configured' : 'not configured'}</li>)}</ul>
    </Panel>
  </div>
}
