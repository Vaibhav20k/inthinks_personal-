import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, Stat } from './ui'
import type { Me } from './api'

const STATUS_TONE: Record<string, 'active' | 'neutral' | 'quiet'> = {
  Active: 'active', Suspended: 'neutral', Ended: 'quiet',
}

/**
 * Live royalty agreements.
 *
 * The two totals are recorded facts — what has been invoiced against reported
 * figures, and what has arrived. Neither is a projection of future income:
 * nothing here estimates what a licensee will sell.
 */
export default function Royalties({ me }: { me: Me }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.royalties>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { api.royalties().then(setData).catch((e) => setError(e.message)) }, [])

  if (!me.can.viewCommercialTerms) {
    return <Empty>Royalty management is limited to admins and business development.</Empty>
  }
  if (error) return <Empty>{error}</Empty>
  if (!data) return <Empty>Loading…</Empty>

  const currency = data.items[0]?.currency ?? 'INR'
  const sameCurrency = data.items.every((r) => r.currency === currency)
  const due = data.items.reduce((n, r) => n + r.dueMinor, 0)
  const paid = data.items.reduce((n, r) => n + r.paidMinor, 0)
  const overdue = data.items.reduce((n, r) => n + r.overdueCount, 0)

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <div>
        <h1 className="section-type">Royalty management</h1>
        <p className="mt-3 max-w-[64ch] text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          What has been reported, what is owed on it, and what has been paid. An
          agreement opens when a deal carrying a royalty is executed, and the
          reporting schedule is generated from the term — so a period nobody
          reported shows as missing rather than never existing.
        </p>
      </div>

      {data.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3 [&>*]:min-w-0">
          <Stat
            label="Invoiced to date"
            value={sameCurrency ? api.money(due, currency) : '—'}
            note={sameCurrency ? 'AGAINST REPORTED FIGURES' : 'MIXED CURRENCIES — SEE EACH AGREEMENT'}
          />
          <Stat
            label="Received"
            value={sameCurrency ? api.money(paid, currency) : '—'}
            note={sameCurrency ? `OUTSTANDING ${api.money(due - paid, currency)}` : 'MIXED CURRENCIES'}
          />
          <Stat label="Statements overdue" value={overdue} note="PERIODS PAST THEIR REPORTING DATE" />
        </div>
      )}

      <div className="panel overflow-x-auto">
        {data.items.length === 0 ? (
          <Empty>No royalty agreements yet. One opens from an executed deal that carries a royalty.</Empty>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th><th>Licensee</th><th>Technology</th><th>Basis</th>
                <th>Reporting</th><th>Invoiced</th><th>Received</th><th>Overdue</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.reference}>
                  <td>
                    <Link to={`/admin/royalties/${r.reference}`} className="ident" style={{ color: 'var(--color-accent)' }}>
                      {r.reference}
                    </Link>
                  </td>
                  <td className="max-w-[15rem]">
                    <span className="block truncate">{r.company ?? r.challengeTitle ?? r.challengeRef}</span>
                    <span className="label" style={{ color: 'var(--color-faint)' }}>{r.dealRef}</span>
                  </td>
                  <td className="max-w-[15rem]">
                    <span className="block truncate">{r.technologyTitle ?? r.technologyRef}</span>
                    <span className="label" style={{ color: 'var(--color-faint)' }}>{r.technologyRef}</span>
                  </td>
                  <td>
                    <span className="block">
                      {r.royaltyType === 'Unit-based'
                        ? `${api.money(r.perUnitMinor, r.currency)} / unit`
                        : api.rate(r.rateBp)}
                    </span>
                    <span className="label" style={{ color: 'var(--color-faint)' }}>
                      {(r.basis ?? r.royaltyType).toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-muted)' }}>{r.reportingPeriod}</td>
                  <td className="num">{api.money(r.dueMinor, r.currency)}</td>
                  <td className="num">{api.money(r.paidMinor, r.currency)}</td>
                  <td className="num">
                    {r.overdueCount > 0
                      ? <Chip tone="active">{r.overdueCount}</Chip>
                      : <span style={{ color: 'var(--color-faint)' }}>—</span>}
                  </td>
                  <td><Chip tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
