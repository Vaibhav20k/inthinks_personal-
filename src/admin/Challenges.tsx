import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, shortDate } from './ui'
import type { Me } from './api'

const CONFIDENTIALITY_LABEL: Record<string, string> = {
  standard: 'Standard',
  'nda-required': 'NDA required',
  'open-innovation': 'Open',
}

export default function Challenges({ me }: { me: Me }) {
  const [items, setItems] = useState<api.ChallengeSummary[] | null>(null)
  const [status, setStatus] = useState('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.meta().then((m) => setStatuses(m.challengeStatuses)).catch(() => undefined)
  }, [])

  useEffect(() => {
    setItems(null)
    api.challenges(status ? { status } : {})
      .then((r) => setItems(r.items))
      .catch((e) => setError(e.message))
  }, [status])

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="section-type">Industry challenges</h1>
        <div className="flex items-center gap-3">
          <label htmlFor="status" className="label" style={{ color: 'var(--color-faint)' }}>STATUS</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="field-input py-2 text-[0.875rem]"
            style={{ width: 'auto' }}
          >
            <option value="">All</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        {error ? <Empty>{error}</Empty>
        : !items ? <Empty>Loading…</Empty>
        : items.length === 0 ? <Empty>No challenges match this filter.</Empty>
        : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title</th>
                <th>Sector</th>
                {me.can.viewChallengeContacts && <th>Company</th>}
                <th>Handling</th>
                <th>Status</th>
                <th>Analyst</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.reference}>
                  <td>
                    <Link to={`/admin/challenges/${item.reference}`} className="ident" style={{ color: 'var(--color-accent)' }}>
                      {item.reference}
                    </Link>
                  </td>
                  <td className="max-w-[24rem]">
                    <Link to={`/admin/challenges/${item.reference}`} className="font-medium hover:underline">
                      {item.title}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--color-muted)' }}>{item.sector}</td>
                  {me.can.viewChallengeContacts && (
                    <td style={{ color: 'var(--color-muted)' }}>{item.company ?? '—'}</td>
                  )}
                  <td>
                    <Chip tone={item.confidentiality === 'nda-required' ? 'active' : 'quiet'}>
                      {CONFIDENTIALITY_LABEL[item.confidentiality] ?? item.confidentiality}
                    </Chip>
                  </td>
                  <td><Chip>{item.status}</Chip></td>
                  <td style={{ color: 'var(--color-muted)' }}>{item.analyst ?? '—'}</td>
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
