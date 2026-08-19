import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, shortDate } from './ui'

const TONE: Record<string, 'active' | 'neutral' | 'quiet'> = {
  'Strong Match': 'active',
  'Promising Match': 'neutral',
  'Adjacent Opportunity': 'quiet',
  'Weak Match': 'quiet',
}

export default function Matches() {
  const [items, setItems] = useState<api.MatchSummary[] | null>(null)
  const [decision, setDecision] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setItems(null)
    api.matches(decision ? { decision } : {})
      .then((r) => setItems(r.items))
      .catch((e) => setError(e.message))
  }, [decision])

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="section-type">Matches</h1>
          <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Candidate pairings between an industry challenge and a portfolio technology.
            Every one is a proposal — nothing reaches a counterparty until someone here
            approves it.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="decision" className="label" style={{ color: 'var(--color-faint)' }}>DECISION</label>
          <select
            id="decision"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            className="field-input py-2 text-[0.875rem]"
            style={{ width: 'auto' }}
          >
            <option value="">All</option>
            {api.MATCH_DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        {error ? <Empty>{error}</Empty>
        : !items ? <Empty>Loading…</Empty>
        : items.length === 0 ? (
          <Empty>
            No matches yet. Open a challenge and run the match engine to generate candidates.
          </Empty>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Match</th><th>Challenge</th><th>Technology</th>
                <th>Classification</th><th>TRL gap</th><th>IP risk</th>
                <th>Decision</th><th>Generated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.reference}>
                  <td>
                    <Link to={`/admin/matches/${m.reference}`} className="ident" style={{ color: 'var(--color-accent)' }}>
                      {m.reference}
                    </Link>
                  </td>
                  <td className="max-w-[18rem]">
                    <span className="block truncate">{m.challengeTitle ?? m.challengeRef}</span>
                    <span className="label" style={{ color: 'var(--color-faint)' }}>{m.challengeRef}</span>
                  </td>
                  <td className="max-w-[18rem]">
                    <span className="block truncate">{m.technologyTitle ?? m.technologyRef}</span>
                    <span className="label" style={{ color: 'var(--color-faint)' }}>{m.technologyRef}</span>
                  </td>
                  <td><Chip tone={TONE[m.classification] ?? 'neutral'}>{m.classification}</Chip></td>
                  <td className="num" style={{ color: 'var(--color-muted)' }}>{m.trlGap ?? '—'}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{m.ipRisk ?? '—'}</td>
                  <td>
                    <Chip tone={m.decision === 'Approved for Industry Discussion' ? 'active' : m.decision === 'Pending' ? 'quiet' : 'neutral'}>
                      {m.decision}
                    </Chip>
                  </td>
                  <td className="num whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>{shortDate(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
