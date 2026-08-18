import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, shortDate } from './ui'
import type { Me } from './api'

export default function Innovations({ me }: { me: Me }) {
  const [items, setItems] = useState<api.InnovationSummary[] | null>(null)
  const [stage, setStage] = useState('')
  const [stages, setStages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.meta().then((m) => setStages(m.acquisitionStages)).catch(() => undefined)
  }, [])

  useEffect(() => {
    setItems(null)
    api.innovations(stage ? { stage } : {})
      .then((r) => setItems(r.items))
      .catch((e) => setError(e.message))
  }, [stage])

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="section-type">Innovations</h1>
        <div className="flex items-center gap-3">
          <label htmlFor="stage" className="label" style={{ color: 'var(--color-faint)' }}>STAGE</label>
          <select
            id="stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="field-input py-2 text-[0.875rem]"
            style={{ width: 'auto' }}
          >
            <option value="">All</option>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {!me.can.viewInnovatorIdentity && (
        <p className="label" style={{ color: 'var(--color-muted)' }}>
          INNOVATOR IDENTITY IS WITHHELD FROM YOUR ROLE
        </p>
      )}

      <div className="panel overflow-x-auto">
        {error ? <Empty>{error}</Empty>
        : !items ? <Empty>Loading…</Empty>
        : items.length === 0 ? <Empty>No innovations match this filter.</Empty>
        : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title</th>
                <th>Category</th>
                <th>TRL</th>
                <th>Stage</th>
                <th>Status</th>
                {me.can.viewInnovatorIdentity && <th>Innovator</th>}
                <th>Files</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.reference}>
                  <td>
                    <Link to={`/admin/innovations/${item.reference}`} className="ident" style={{ color: 'var(--color-accent)' }}>
                      {item.reference}
                    </Link>
                  </td>
                  <td className="max-w-[22rem]">
                    <Link to={`/admin/innovations/${item.reference}`} className="font-medium hover:underline">
                      {item.internalTitle || item.title}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--color-muted)' }}>{item.category}</td>
                  <td className="num">
                    {item.entryTrl}
                    {item.currentTrl && item.currentTrl !== item.entryTrl && (
                      <span style={{ color: 'var(--color-accent)' }}> → {item.currentTrl}</span>
                    )}
                  </td>
                  <td><Chip tone={item.acquisitionStage === 'Development Portfolio' ? 'active' : 'neutral'}>{item.acquisitionStage}</Chip></td>
                  <td><Chip tone="quiet">{item.status}</Chip></td>
                  {me.can.viewInnovatorIdentity && (
                    <td style={{ color: 'var(--color-muted)' }}>{item.innovator ?? '—'}</td>
                  )}
                  <td className="num" style={{ color: 'var(--color-muted)' }}>{item.evidenceCount}</td>
                  <td className="num whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>{shortDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
