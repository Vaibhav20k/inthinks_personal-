import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import { Chip, Distribution, Empty, Panel, shortDate } from './ui'
import type { Me } from './api'

const CLOSING_TONE: Record<string, 'active' | 'neutral' | 'quiet'> = {
  Executed: 'active', Open: 'neutral', Withdrawn: 'quiet', Lapsed: 'quiet',
}

/**
 * Deals in progress.
 *
 * Deliberately no total consideration anywhere on this page. Summing live
 * negotiations produces a pipeline value, and a pipeline value is a forecast —
 * the one number this platform does not keep.
 */
export default function Deals({ me }: { me: Me }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.deals>> | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    api.deals(status ? { status } : {}).then(setData).catch((e) => setError(e.message))
  }, [status])

  if (!me.can.viewCommercialTerms) {
    return <Empty>The deal room is limited to admins and business development.</Empty>
  }
  if (error) return <Empty>{error}</Empty>

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <div>
        <h1 className="section-type">Commercial deal room</h1>
        <p className="mt-3 max-w-[64ch] text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          A deal room opens for an opportunity that has reached commercial
          negotiation. It records the terms actually on the table — never a
          projected value — and is private to the commercial roles.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[20rem_1fr] [&>*]:min-w-0">
        <div className="grid content-start gap-6 [&>*]:min-w-0">
          <Panel title="Agreement status">
            {!data ? <Empty>Loading…</Empty> : <Distribution rows={data.byAgreement} />}
          </Panel>
          <Panel
            title="Closing status"
            action={
              status ? (
                <button
                  type="button"
                  onClick={() => setStatus(null)}
                  className="label transition-colors duration-200 hover:text-accent"
                  style={{ color: 'var(--color-muted)' }}
                >
                  CLEAR
                </button>
              ) : undefined
            }
          >
            {!data ? <Empty>Loading…</Empty> : data.byClosing.length === 0 ? (
              <p className="label" style={{ color: 'var(--color-faint)' }}>NO DEALS YET</p>
            ) : (
              <ul className="grid gap-1">
                {data.byClosing.map((row) => (
                  <li key={row.k}>
                    <button
                      type="button"
                      onClick={() => setStatus(status === row.k ? null : row.k)}
                      aria-pressed={status === row.k}
                      className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left text-[0.875rem] transition-colors duration-200"
                      style={{ background: status === row.k ? 'var(--color-paper-sunk)' : 'transparent' }}
                    >
                      <span style={{ color: status === row.k ? 'var(--color-accent)' : 'var(--color-ink)' }}>{row.k}</span>
                      <span className="label tabular-nums" style={{ color: 'var(--color-muted)' }}>{row.n}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="panel overflow-x-auto">
          {!data ? <Empty>Loading…</Empty>
          : data.items.length === 0 ? (
            <Empty>
              {status
                ? 'No deals with this closing status.'
                : 'No deals yet. One opens from an opportunity in commercial negotiation.'}
            </Empty>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th><th>Counterparty</th><th>Technology</th>
                  <th>Structure</th><th>Upfront</th><th>Royalty</th>
                  <th>Agreement</th><th>Closing</th><th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.reference}>
                    <td>
                      <Link to={`/admin/deals/${d.reference}`} className="ident" style={{ color: 'var(--color-accent)' }}>
                        {d.reference}
                      </Link>
                    </td>
                    <td className="max-w-[15rem]">
                      <span className="block truncate">{d.company ?? d.challengeTitle ?? d.challengeRef}</span>
                      <span className="label" style={{ color: 'var(--color-faint)' }}>
                        {d.industry ?? d.challengeRef}
                      </span>
                    </td>
                    <td className="max-w-[15rem]">
                      <span className="block truncate">{d.technologyTitle ?? d.technologyRef}</span>
                      <span className="label" style={{ color: 'var(--color-faint)' }}>{d.technologyRef}</span>
                    </td>
                    <td>
                      <span className="block">{d.dealType}</span>
                      <span className="label" style={{ color: 'var(--color-faint)' }}>{d.exclusivity.toUpperCase()}</span>
                    </td>
                    <td className="num">{api.money(d.upfrontMinor, d.currency)}</td>
                    <td className="num">
                      {api.rate(d.royaltyBp)}
                      {d.royaltyBasis && (
                        <span className="label block" style={{ color: 'var(--color-faint)' }}>
                          {d.royaltyBasis.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td><Chip tone={d.agreementStatus === 'Executed' ? 'active' : 'neutral'}>{d.agreementStatus}</Chip></td>
                    <td><Chip tone={CLOSING_TONE[d.closingStatus] ?? 'neutral'}>{d.closingStatus}</Chip></td>
                    <td style={{ color: 'var(--color-muted)' }}>{shortDate(d.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
