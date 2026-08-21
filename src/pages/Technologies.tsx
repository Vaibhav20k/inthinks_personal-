import { useEffect, useMemo, useState } from 'react'
import PageMeta from '../components/layout/PageMeta'
import { searchMatches, useExplorerState } from '../lib/explorer'
import SearchField from '../components/primitives/SearchField'
import PointerLabel from '../components/primitives/PointerLabel'
import { Link } from 'react-router-dom'
import PageHero from '../components/layout/PageHero'
import Notice from '../components/primitives/Notice'
import TechnologyRow from '../components/tech/TechnologyRow'
import { loadPortfolio } from '../data/portfolio'
import { matchesForTechnology } from '../data/examples'
import StackedRecord from '../components/tech/StackedRecord'
import { TRANSFER_STATUSES } from '../data/models'
import type { Technology, TransferStatus } from '../data/models'
import { domains, outcomes, sectors } from '../data/taxonomy'

type FilterKey = 'problem' | 'industry' | 'domain' | 'trl' | 'transfer'
type ViewMode = 'index' | 'visual'

/**
 * How many industrial problems this technology is a live candidate for.
 *
 * The count is the point of the column: a technology with two open matches is
 * a different proposition from one with none, and that is invisible if the
 * index only carries TRL. It links to the matches page rather than opening a
 * panel, because a match is a record in its own right.
 */
function MatchCount({ slug }: { slug: string }) {
  const n = matchesForTechnology(slug).length
  if (n === 0) return <span style={{ color: 'var(--color-faint)' }}>—</span>
  return (
    <Link to="/matches" style={{ color: 'var(--color-accent)' }}>
      {n} ACTIVE MATCH{n === 1 ? '' : 'ES'}
    </Link>
  )
}

/**
 * The portfolio as a technical index.
 *
 * Denser than the editorial rows and deliberately so: an index is for someone
 * scanning thirty records for a TRL band, not reading one. Mono throughout,
 * columns aligned, the ID leading — the same information, at a different
 * reading speed.
 */
function TechnologyIndex({
  rows,
  onPreview,
}: {
  rows: Technology[]
  /** Which row the pointer or keyboard is on, or null when neither is on one. */
  onPreview: (t: Technology | null) => void
}) {
  return (
    <>
      {/* Below xl the table does not fit. Measured: it wants 816px and the
          explorer's own column does not offer that until about 1280px, so
          under it every reader was scrolling sideways to reach STATUS. */}
      <ul className="xl:hidden">
        {rows.map((tech) => {
          const n = matchesForTechnology(tech.slug).length
          return (
            <StackedRecord
              key={tech.slug}
              to={`/technologies/${tech.slug}`}
              reference={tech.id}
              title={tech.name}
              fields={[
                { term: 'TRL', value: `${String(tech.currentTrl).padStart(2, '0')} → ${String(tech.targetTrl).padStart(2, '0')}` },
                { term: 'DOMAIN', value: tech.domain.toUpperCase() },
                {
                  term: 'MATCHES',
                  value: n > 0
                    ? <span style={{ color: 'var(--color-accent)' }}>{n} ACTIVE</span>
                    : <span style={{ color: 'var(--color-faint)' }}>—</span>,
                },
                { term: 'TRANSFER STATUS', value: tech.transferStatus.toUpperCase() },
              ]}
            />
          )
        })}
        <li style={{ borderTop: '1px solid var(--rule)' }} />
      </ul>

    <div className="hidden xl:block">
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <caption className="sr-only">Technologies in the InThinks portfolio</caption>
        <thead>
          <tr>
            {['Reference', 'Technology', 'TRL', 'Domain', 'Matches', 'Transfer status'].map((h) => (
              <th
                key={h}
                scope="col"
                className="label whitespace-nowrap px-3 py-3 text-left first:pl-0"
                style={{ color: 'var(--color-faint)', borderBottom: '1px solid var(--rule-strong)' }}
              >
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        {/* Clearing on the body rather than per row: moving between two rows
            fires leave-then-enter, and clearing on each leave makes the panel
            blink on its way down the table. */}
        <tbody onMouseLeave={() => onPreview(null)}>
          {rows.map((tech) => (
            <tr
              key={tech.slug}
              className="group"
              onMouseEnter={() => onPreview(tech)}
              // Focus, not just hover: a keyboard reader tabs the reference
              // links down the column and should get the same panel.
              onFocus={() => onPreview(tech)}
            >
              <td className="px-3 py-4 pl-0 align-baseline" style={{ borderBottom: '1px solid var(--rule)' }}>
                <Link to={`/technologies/${tech.slug}`} className="ident whitespace-nowrap" style={{ color: 'var(--color-accent)' }}>
                  {tech.id}
                </Link>
              </td>
              <td className="px-3 py-4 align-baseline" style={{ borderBottom: '1px solid var(--rule)' }}>
                <Link to={`/technologies/${tech.slug}`} className="text-[0.9375rem] font-medium">
                  <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
                    {tech.name}
                  </span>
                </Link>
              </td>
              <td className="ident whitespace-nowrap px-3 py-4 align-baseline tabular-nums" style={{ borderBottom: '1px solid var(--rule)', color: 'var(--color-muted)' }}>
                {String(tech.currentTrl).padStart(2, '0')} → {String(tech.targetTrl).padStart(2, '0')}
              </td>
              <td className="label whitespace-nowrap px-3 py-4 align-baseline" style={{ borderBottom: '1px solid var(--rule)', color: 'var(--color-muted)' }}>
                {tech.domain.toUpperCase()}
              </td>
              <td className="label whitespace-nowrap px-3 py-4 align-baseline" style={{ borderBottom: '1px solid var(--rule)' }}>
                <MatchCount slug={tech.slug} />
              </td>
              <td className="label px-3 py-4 align-baseline" style={{ borderBottom: '1px solid var(--rule)', color: 'var(--color-muted)' }}>
                {tech.transferStatus.toUpperCase()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  )
}

/**
 * What the row under the pointer addresses.
 *
 * Sits directly above the table rather than in the sidebar. The panel is only
 * useful while the rows are on screen, and the filter column is long enough
 * that anything below it is usually scrolled past by the time you are reading
 * the table — a preview you cannot see beside what it previews is decoration.
 *
 * It shows one fact: the problem the technology addresses. TRL, transfer
 * status and match count are already columns in the row, and repeating a cell
 * two inches above itself tells a reader nothing they are not already looking
 * at.
 *
 * Height is fixed so filling it cannot move the table underneath.
 */
function RowPreview({ tech }: { tech: Technology | null }) {
  return (
    <div
      className="mb-4 hidden min-h-[3.25rem] items-baseline gap-4 px-3 py-2.5 lg:flex"
      style={{ background: 'var(--color-paper-sunk)' }}
      aria-live="polite"
    >
      {tech === null ? (
        <p className="label" style={{ color: 'var(--color-faint)' }}>
          POINT AT A ROW FOR THE PROBLEM IT ADDRESSES
        </p>
      ) : (
        <>
          <span className="ident shrink-0" style={{ color: 'var(--color-accent)' }}>{tech.id}</span>
          <span className="text-[0.875rem] leading-snug" style={{ color: 'var(--color-muted)' }}>
            {tech.thesis}
          </span>
        </>
      )}
    </div>
  )
}

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
                background: on ? 'var(--color-accent-fill)' : 'transparent',
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

/** The filter keys, in the order they appear, and the search key alongside. */
const KEYS = ['problem', 'industry', 'domain', 'trl', 'transfer'] as const

export default function Technologies() {
  // Filters and search live in the URL so a filtered view is a link someone
  // can send, and so the back button undoes a filter rather than leaving the
  // page.
  const { list, text, toggle, setText, clear, activeCount } = useExplorerState(KEYS)
  const filters = useMemo(
    () => Object.fromEntries(KEYS.map((k) => [k, list(k)])) as Record<FilterKey, string[]>,
    [list],
  )
  const query = text('q')

  const [technologies, setTechnologies] = useState<Technology[] | null>(null)
  const [preview, setPreview] = useState<Technology | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Index is the default on desktop: the spec's point is that this is a
  // technical register first and a set of cards second.
  const [view, setView] = useState<ViewMode>('index')

  const [examples, setExamples] = useState(false)

  useEffect(() => {
    let live = true
    loadPortfolio()
      .then((r) => { if (live) { setTechnologies(r.technologies); setExamples(r.usingExamples) } })
      .catch(() => { if (live) { setTechnologies([]); setError('The portfolio could not be loaded just now.') } })
    return () => { live = false }
  }, [])

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
        // Searches what the spec asks for: the name, the problem it addresses,
        // its applications and its domain — plus the reference, because
        // someone holding an ID wants that record and nothing else.
        const found = searchMatches(query, [
          tech.id, tech.name, tech.thesis, tech.problem, tech.domain,
          ...tech.applications, ...tech.sectors,
        ])
        return problem && industry && domain && trl && transfer && found
      }),
    [filters, technologies, query],
  )

  return (
    <>
      <PageMeta title="Technology Explorer" description="Early-stage technologies in the InThinks development portfolio, shown as industrial opportunities with TRL, domain and transfer status. Every profile is anonymised." />
      <PageHero
        eyebrow="Technologies"
        title="Technology Explorer"
        lede="Technologies in the InThinks development portfolio, shown as industrial opportunities. Every profile is anonymised — the technology is public, the innovator is not."
      >
        {error && <Notice>{error}</Notice>}
        {examples && (
          <>
            <Notice>Illustrative technology records</Notice>
            <p className="body-type measure-prose mt-4" style={{ color: 'var(--color-muted)' }}>
              Example records are shown to demonstrate the InThinks technology-intelligence
              platform. Live portfolio technologies will appear as they are approved for
              publication.
            </p>
          </>
        )}
      </PageHero>

      <section className="container-grid pb-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-28">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="label" style={{ color: 'var(--color-ink)' }}>FILTER</h2>
                {(activeCount > 0 || query !== '') && (
                  <button
                    type="button"
                    onClick={() => { clear(); setText('q', '') }}
                    className="tap label transition-colors duration-250 hover:text-accent"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    CLEAR{activeCount > 0 ? ` ${activeCount}` : ''}
                  </button>
                )}
              </div>

              {/* pb matches the filter groups' rhythm below: with top padding
                  only, the input's lower edge sat exactly on the first legend. */}
              <div className="py-5">
                <SearchField
                  label="Search"
                  value={query}
                  onChange={(v) => setText('q', v)}
                  placeholder="Reference, technology, application…"
                />
              </div>

              <FilterRow legend="Problem" options={outcomes.map((o) => ({ id: o.id, label: o.label }))} selected={filters.problem} onToggle={(id) => toggle('problem', id)} />
              <FilterRow legend="Industry" options={sectors.map((s) => ({ id: s, label: s }))} selected={filters.industry} onToggle={(id) => toggle('industry', id)} />
              <FilterRow legend="Domain" options={domains.map((d) => ({ id: d.code, label: d.name }))} selected={filters.domain} onToggle={(id) => toggle('domain', id)} />
              <FilterRow legend="TRL" options={TRL_BANDS.map((b) => ({ id: b.id, label: b.label }))} selected={filters.trl} onToggle={(id) => toggle('trl', id)} />
              <FilterRow legend="Transfer status" options={TRANSFER_STATUSES.map((s: TransferStatus) => ({ id: s, label: s }))} selected={filters.transfer} onToggle={(id) => toggle('transfer', id)} />
            </div>
          </div>

          {/* min-w-0: a grid item defaults to min-width:auto, so the index table
              would otherwise force the whole page wider than the viewport. */}
          <div className="min-w-0 lg:col-span-8 xl:col-span-9">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
              <p className="label" style={{ color: 'var(--color-muted)' }} aria-live="polite">
                {technologies === null
                  ? 'SCANNING TECHNOLOGY FIELD'
                  : `${results.length} OF ${technologies.length} ${technologies.length === 1 ? 'TECHNOLOGY' : 'TECHNOLOGIES'}`}
              </p>
              {technologies !== null && technologies.length > 0 && (
                <div className="flex" role="group" aria-label="View mode">
                  {(['index', 'visual'] as ViewMode[]).map((mode) => {
                    const on = view === mode
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setView(mode)}
                        aria-pressed={on}
                        className="tap label px-3 py-1.5 transition-colors duration-250"
                        style={{
                          border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
                          marginLeft: mode === 'visual' ? '-1px' : 0,
                          color: on ? 'var(--color-accent)' : 'var(--color-muted)',
                        }}
                      >
                        {mode.toUpperCase()}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {technologies === null ? (
              <div className="py-16" style={{ borderTop: '1px solid var(--rule)' }}>
                <span className="signal-line" aria-hidden="true" />
                <p className="label mt-5" style={{ color: 'var(--color-faint)' }}>
                  SCANNING TECHNOLOGY FIELD
                </p>
              </div>
            ) : technologies.length === 0 ? (
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
                  No technologies match these filters.
                </p>
                <p className="body-type measure-prose mt-5" style={{ color: 'var(--color-muted)' }}>
                  Adjust the filters, or submit an industry challenge and let InThinks search
                  more broadly than what is published here.
                </p>
                <button
                  type="button"
                  onClick={() => { clear(); setText('q', '') }}
                  className="tap mt-5 inline-flex items-baseline gap-2.5 text-[0.9375rem] font-medium"
                >
                  <span className="border-b border-current pb-0.5">Clear filters</span>
                  <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>→</span>
                </button>
              </div>
            ) : view === 'index' ? (
              <>
                <RowPreview tech={preview} />
                <PointerLabel label="VIEW"><TechnologyIndex rows={results} onPreview={setPreview} /></PointerLabel>
              </>
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
