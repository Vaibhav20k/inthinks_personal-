import { useEffect, useMemo, useState } from 'react'
import PageHero from '../components/layout/PageHero'
import Notice from '../components/primitives/Notice'
import TechnologyRow from '../components/tech/TechnologyRow'
import { fetchTechnologies } from '../data/portfolio'
import { TRANSFER_STATUSES } from '../data/models'
import type { Technology, TransferStatus } from '../data/models'
import { domains, outcomes, sectors } from '../data/taxonomy'

type FilterKey = 'problem' | 'industry' | 'domain' | 'trl' | 'transfer'

const TRL_BANDS = [
  { id: '1-3', label: 'TRL 1–3', test: (n: number) => n <= 3 },
  { id: '4-6', label: 'TRL 4–6', test: (n: number) => n >= 4 && n <= 6 },
  { id: '7-9', label: 'TRL 7–9', test: (n: number) => n >= 7 },
]

/** One filter group, rendered as a row of toggles rather than a dropdown. */
function FilterRow({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string
  options: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <fieldset className="py-5" style={{ borderTop: '1px solid var(--rule)' }}>
      <legend className="label" style={{ color: 'var(--color-faint)' }}>{legend.toUpperCase()}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              aria-pressed={on}
              className="tap px-3 py-1.5 text-[0.8125rem] transition-colors duration-250"
              style={{
                border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
                background: on ? 'var(--color-accent)' : 'transparent',
                color: on ? '#fff' : 'var(--color-muted)',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function Technologies() {
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({
    problem: [], industry: [], domain: [], trl: [], transfer: [],
  })
  const [technologies, setTechnologies] = useState<Technology[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    fetchTechnologies()
      .then((items) => { if (live) setTechnologies(items) })
      .catch(() => { if (live) { setTechnologies([]); setError('The portfolio could not be loaded just now.') } })
    return () => { live = false }
  }, [])

  const toggle = (key: FilterKey, id: string) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
    }))

  const clear = () => setFilters({ problem: [], industry: [], domain: [], trl: [], transfer: [] })
  const activeCount = Object.values(filters).reduce((n, v) => n + v.length, 0)

  const results = useMemo(
    () =>
      (technologies ?? []).filter((tech) => {
        const problem = !filters.problem.length || filters.problem.some((o) => tech.outcomes.includes(o))
        const industry = !filters.industry.length || filters.industry.some((s) => tech.sectors.includes(s))
        const domain = !filters.domain.length || filters.domain.includes(tech.domainCode)
        const trl =
          !filters.trl.length ||
          filters.trl.some((b) => TRL_BANDS.find((x) => x.id === b)?.test(tech.currentTrl))
        const transfer =
          !filters.transfer.length || filters.transfer.includes(tech.transferStatus)
        return problem && industry && domain && trl && transfer
      }),
    [filters, technologies],
  )

  return (
    <>
      <PageHero
        eyebrow="Technologies"
        title="Technology Explorer"
        lede="Technologies in the InThinks development portfolio, shown as industrial opportunities. Every profile is anonymised — the technology is public, the innovator is not."
      >
        {error && <Notice>{error}</Notice>}
      </PageHero>

      <section className="container-grid pb-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-28">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="label" style={{ color: 'var(--color-ink)' }}>FILTER</h2>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={clear}
                    className="tap label transition-colors duration-250 hover:text-accent"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    CLEAR {activeCount}
                  </button>
                )}
              </div>

              <FilterRow legend="Problem" options={outcomes.map((o) => ({ id: o.id, label: o.label }))} selected={filters.problem} onToggle={(id) => toggle('problem', id)} />
              <FilterRow legend="Industry" options={sectors.map((s) => ({ id: s, label: s }))} selected={filters.industry} onToggle={(id) => toggle('industry', id)} />
              <FilterRow legend="Domain" options={domains.map((d) => ({ id: d.code, label: d.name }))} selected={filters.domain} onToggle={(id) => toggle('domain', id)} />
              <FilterRow legend="TRL" options={TRL_BANDS.map((b) => ({ id: b.id, label: b.label }))} selected={filters.trl} onToggle={(id) => toggle('trl', id)} />
              <FilterRow legend="Transfer status" options={TRANSFER_STATUSES.map((s: TransferStatus) => ({ id: s, label: s }))} selected={filters.transfer} onToggle={(id) => toggle('transfer', id)} />
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            <p className="label pb-4" style={{ color: 'var(--color-muted)' }} aria-live="polite">
              {technologies === null
                ? 'LOADING…'
                : `${results.length} OF ${technologies.length} ${technologies.length === 1 ? 'TECHNOLOGY' : 'TECHNOLOGIES'}`}
            </p>

            {technologies === null ? null : technologies.length === 0 ? (
              <div className="py-16" style={{ borderTop: '1px solid var(--rule)' }}>
                <p className="font-display text-[1.5rem] font-medium tracking-[-0.02em]">
                  No technologies are published yet.
                </p>
                <p className="body-type measure-prose mt-5" style={{ color: 'var(--color-muted)' }}>
                  A technology appears here once InThinks holds development rights and a
                  profile has been written for it. Nothing is listed in the meantime —
                  an empty portfolio reads as empty rather than as placeholder records.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-16" style={{ borderTop: '1px solid var(--rule)' }}>
                <p className="font-display text-[1.5rem] font-medium tracking-[-0.02em]">
                  No technology in the portfolio matches those filters.
                </p>
                <button
                  type="button"
                  onClick={clear}
                  className="tap mt-5 inline-flex items-baseline gap-2.5 text-[0.9375rem] font-medium"
                >
                  <span className="border-b border-current pb-0.5">Clear filters</span>
                  <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>→</span>
                </button>
              </div>
            ) : (
              <ul>
                {results.map((tech, i) => (
                  <TechnologyRow key={tech.slug} technology={tech} index={i} />
                ))}
                <li style={{ borderTop: '1px solid var(--rule)' }} />
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
