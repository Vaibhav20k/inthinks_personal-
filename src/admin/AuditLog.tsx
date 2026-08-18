import { useEffect, useState } from 'react'
import * as api from './api'
import { Empty, shortDateTime } from './ui'

export default function AuditLog() {
  const [items, setItems] = useState<api.AuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.auditLog().then((r) => setItems(r.items)).catch((e) => setError(e.message))
  }, [])

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="section-type">Audit log</h1>
        <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Reads are recorded as well as changes. Opening a disclosure is the action that
          matters here, so “who looked at this submission” stays answerable.
        </p>
      </div>

      <div className="panel overflow-x-auto">
        {error ? <Empty>{error}</Empty>
        : !items ? <Empty>Loading…</Empty>
        : items.length === 0 ? <Empty>Nothing recorded yet.</Empty>
        : (
          <table className="data-table">
            <thead>
              <tr><th>When</th><th>Actor</th><th>Role</th><th>Action</th><th>Target</th></tr>
            </thead>
            <tbody>
              {items.map((entry, i) => (
                <tr key={`${entry.at}-${i}`}>
                  <td className="num whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>{shortDateTime(entry.at)}</td>
                  <td>{entry.actor}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{entry.role}</td>
                  <td><span className="ident">{entry.action}</span></td>
                  <td style={{ color: 'var(--color-muted)' }}>{entry.target ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
