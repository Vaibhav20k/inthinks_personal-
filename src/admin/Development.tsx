import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, shortDate } from './ui'

export default function Development() {
  const [items, setItems] = useState<api.WorkspaceSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.workspaces().then((r) => setItems(r.items)).catch((e) => setError(e.message))
  }, [])

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="section-type">R&amp;D development</h1>
        <p className="mt-3 max-w-[64ch] text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Technologies InThinks holds rights to develop. Each has a working record of
          what was tried, what failed, and how close each dimension of transfer
          readiness actually is.
        </p>
      </div>

      <div className="panel overflow-x-auto">
        {error ? <Empty>{error}</Empty>
        : !items ? <Empty>Loading…</Empty>
        : items.length === 0 ? (
          <Empty>
            No technologies in development yet. A workspace opens once a technology reaches
            Rights Secured or the development portfolio.
          </Empty>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th><th>Technology</th><th>Stage</th>
                <th>TRL</th><th>Entries</th><th>Reviewer</th><th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.reference}>
                  <td>
                    <Link to={`/admin/development/${w.reference}`} className="ident" style={{ color: 'var(--color-accent)' }}>
                      {w.reference}
                    </Link>
                  </td>
                  <td className="max-w-[24rem]">
                    <Link to={`/admin/development/${w.reference}`} className="font-medium hover:underline">{w.title}</Link>
                    <span className="label block" style={{ color: 'var(--color-faint)' }}>{w.category}</span>
                  </td>
                  <td><Chip tone={w.developmentStage === 'Transfer Readiness' ? 'active' : 'neutral'}>{w.developmentStage}</Chip></td>
                  <td className="num">
                    {w.entryTrl} <span style={{ color: 'var(--color-accent)' }}>→ {w.currentTrl}</span>
                    {w.targetTrl ? <span style={{ color: 'var(--color-faint)' }}> / {w.targetTrl}</span> : null}
                  </td>
                  <td className="num" style={{ color: 'var(--color-muted)' }}>{w.logEntries}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{w.reviewer ?? '—'}</td>
                  <td className="num whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>
                    {w.lastActivity ? shortDate(w.lastActivity) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
