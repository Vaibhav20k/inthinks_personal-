import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, Panel, shortDate } from './ui'

/**
 * The industry opportunity pipeline.
 *
 * A funnel rather than a board: with eleven stages a kanban is mostly empty
 * columns, and the useful question here is where things accumulate and where
 * they stop. Counts for the first four stages are derived from live challenge
 * and match state, so the funnel cannot drift out of step with what it
 * describes.
 */
function Funnel({
  stages,
  counts,
  selected,
  onSelect,
}: {
  stages: string[]
  counts: Record<string, number>
  selected: string | null
  onSelect: (stage: string | null) => void
}) {
  const max = Math.max(1, ...stages.map((s) => counts[s] ?? 0))
  return (
    <ol className="grid gap-1">
      {stages.map((stage, i) => {
        const n = counts[stage] ?? 0
        const on = selected === stage
        // The first four stages are counted, not tracked — clicking them would
        // filter a list they have no records in.
        const derived = i < 4
        return (
          <li key={stage}>
            <button
              type="button"
              disabled={derived || n === 0}
              onClick={() => onSelect(on ? null : stage)}
              aria-pressed={on}
              className="grid w-full grid-cols-[1.75rem_1fr_2.5rem] items-center gap-3 px-2 py-2 text-left transition-colors duration-200 disabled:cursor-default"
              style={{ background: on ? 'var(--color-paper-sunk)' : 'transparent' }}
            >
              <span className="label" style={{ color: on ? 'var(--color-accent)' : 'var(--color-faint)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0">
                <span
                  className="block truncate text-[0.875rem]"
                  style={{ color: derived ? 'var(--color-muted)' : 'var(--color-ink)' }}
                >
                  {stage}
                </span>
                <span className="mt-1 block h-1" style={{ background: 'var(--rule)' }}>
                  <span
                    className="block h-1 transition-[width] duration-500"
                    style={{
                      width: `${(n / max) * 100}%`,
                      background: derived ? 'var(--color-muted)' : 'var(--color-accent)',
                    }}
                  />
                </span>
              </span>
              <span className="label text-right tabular-nums" style={{ color: 'var(--color-muted)' }}>{n}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export default function Pipeline() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.opportunities>> | null>(null)
  const [stage, setStage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    api.opportunities(stage ? { stage } : {})
      .then(setData)
      .catch((e) => setError(e.message))
  }, [stage])

  if (error) return <Empty>{error}</Empty>

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="section-type">Industry opportunities</h1>
        <p className="mt-3 max-w-[64ch] text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          An opportunity opens when a match is approved for industry discussion — the
          first point at which there is a named technology and a conversation to manage.
          The stages before that are counted from live challenge and match state.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr] [&>*]:min-w-0">
        <Panel
          title="Funnel"
          action={
            stage ? (
              <button
                type="button"
                onClick={() => setStage(null)}
                className="label transition-colors duration-200 hover:text-accent"
                style={{ color: 'var(--color-muted)' }}
              >
                CLEAR
              </button>
            ) : undefined
          }
        >
          {!data ? <Empty>Loading…</Empty> : (
            <>
              <Funnel stages={data.stages} counts={data.funnel} selected={stage} onSelect={setStage} />
              <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
                STAGES 01–04 ARE DERIVED FROM CHALLENGES AND MATCHES
              </p>
            </>
          )}
        </Panel>

        <div className="panel overflow-x-auto">
          {!data ? <Empty>Loading…</Empty>
          : data.items.length === 0 ? (
            <Empty>
              {stage
                ? 'No opportunities at this stage.'
                : 'No opportunities yet. Approving a match for industry discussion opens one.'}
            </Empty>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th><th>Challenge</th><th>Technology</th>
                  <th>Stage</th><th>Owner</th><th>Next action</th><th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.reference}>
                    <td>
                      <Link to={`/admin/opportunities/${o.reference}`} className="ident" style={{ color: 'var(--color-accent)' }}>
                        {o.reference}
                      </Link>
                    </td>
                    <td className="max-w-[16rem]">
                      <span className="block truncate">{o.challengeTitle ?? o.challengeRef}</span>
                      <span className="label" style={{ color: 'var(--color-faint)' }}>
                        {o.company ?? o.challengeSector ?? o.challengeRef}
                      </span>
                    </td>
                    <td className="max-w-[16rem]">
                      <span className="block truncate">{o.technologyTitle ?? o.technologyRef}</span>
                      <span className="label" style={{ color: 'var(--color-faint)' }}>
                        {o.technologyRef}{o.currentTrl ? ` · TRL ${o.currentTrl}` : ''}
                      </span>
                    </td>
                    <td>
                      <Chip tone={o.stage === 'Technology Transfer' || o.stage === 'Post-Transfer Royalty Monitoring' ? 'active' : 'neutral'}>
                        {o.stage}
                      </Chip>
                    </td>
                    <td style={{ color: 'var(--color-muted)' }}>{o.owner ?? '—'}</td>
                    <td className="max-w-[14rem]" style={{ color: 'var(--color-muted)' }}>
                      <span className="block truncate">{o.nextAction ?? '—'}</span>
                      {o.nextActionDue && (
                        <span className="label" style={{ color: 'var(--color-faint)' }}>DUE {o.nextActionDue}</span>
                      )}
                    </td>
                    <td className="num whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>{shortDate(o.updatedAt)}</td>
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
