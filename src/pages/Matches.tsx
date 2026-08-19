import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/layout/PageHero'
import Notice from '../components/primitives/Notice'
import Reveal from '../components/primitives/Reveal'
import { exampleProblems, exampleTechnologies, matchSlug } from '../data/examples'
import { loadMatches } from '../data/portfolio'
import { searchMatches, useExplorerState } from '../lib/explorer'
import SearchField from '../components/primitives/SearchField'
import type { PublicMatch } from '../data/models'

/** Furthest along first — a reader scanning wants the live ones at the top. */
const STATUS_ORDER = [
  'Transfer', 'Commercial discussion', 'Pilot', 'Industry evaluation',
  'Qualified match', 'Technical review', 'R&D required', 'AI candidate',
]

const RATING_TONE: Record<string, string> = {
  Strong: 'var(--color-accent)',
  Promising: 'var(--color-accent-deep)',
  Moderate: 'var(--color-muted)',
  Limited: 'var(--color-faint)',
  Unknown: 'var(--color-faint)',
}

/**
 * What the matching actually produces.
 *
 * Deliberately not a score. The engine ranks and shortlists; a person
 * qualifies, and only a qualified pairing appears here — so what is shown is
 * which problem, which technology, the reasoning, and what is still open.
 *
 * The open questions are not a caveat added for modesty. A match with no gaps
 * is a sale rather than an assessment, and an innovator or an operator reading
 * this needs to know what would have to be true before it goes further.
 */
const KEYS = ['industry', 'domain', 'class', 'status'] as const

/** One filter group. Same control as the other two explorers. */
function FilterRow({
  legend, options, selected, onToggle,
}: {
  legend: string
  options: readonly string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  if (options.length === 0) return null
  return (
    <fieldset className="py-5" style={{ borderTop: '1px solid var(--rule)' }}>
      <legend className="label" style={{ color: 'var(--color-faint)' }}>{legend.toUpperCase()}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o)
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              aria-pressed={on}
              className="tap label px-2.5 py-1.5 transition-colors duration-250"
              style={{
                border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule)'}`,
                color: on ? 'var(--color-accent)' : 'var(--color-muted)',
              }}
            >
              {o.toUpperCase()}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function Matches() {
  const [matches, setMatches] = useState<PublicMatch[] | null>(null)
  const [examples, setExamples] = useState(false)
  const { list, text, toggle, setText, clear, activeCount } = useExplorerState(KEYS)
  const industry = list('industry')
  const domain = list('domain')
  const matchClass = list('class')
  const status = list('status')
  const query = text('q')

  useEffect(() => {
    let live = true
    loadMatches().then((r) => {
      if (!live) return
      setMatches(r.matches)
      setExamples(r.usingExamples)
    })
    return () => { live = false }
  }, [])

  /**
   * Each match resolved to its two records once, here.
   *
   * Filtering a match by industry means filtering by the *problem's* sector
   * and by the *technology's* domain — neither of which lives on the match
   * itself. Resolving inside the filter callback would look them up again for
   * every predicate on every keystroke.
   */
  const resolved = useMemo(
    () =>
      (matches ?? []).flatMap((m) => {
        const problem = exampleProblems.find((p) => p.slug === m.problemSlug)
        const tech = exampleTechnologies.find((t) => t.slug === m.technologySlug)
        return problem && tech ? [{ m, problem, tech }] : []
      }),
    [matches],
  )

  const industries = useMemo(
    () => [...new Set(resolved.map((r) => r.problem.sector))].sort(),
    [resolved],
  )
  const domains = useMemo(
    () => [...new Set(resolved.map((r) => r.tech.domain))].sort(),
    [resolved],
  )
  const classes = useMemo(
    () => [...new Set(resolved.map((r) => r.m.matchClass))].sort(),
    [resolved],
  )
  const statuses = useMemo(
    () => STATUS_ORDER.filter((s) => resolved.some((r) => r.m.status === s)),
    [resolved],
  )

  const sorted = useMemo(
    () =>
      resolved
        .filter(({ m, problem, tech }) => {
          const byIndustry = !industry.length || industry.includes(problem.sector)
          const byDomain = !domain.length || domain.includes(tech.domain)
          const byClass = !matchClass.length || matchClass.includes(m.matchClass)
          const byStatus = !status.length || status.includes(m.status)
          const found = searchMatches(query, [
            m.id, m.rationale, m.nextStep, m.matchClass, m.status,
            problem.id, problem.title, problem.sector,
            tech.id, tech.name, tech.domain,
          ])
          return byIndustry && byDomain && byClass && byStatus && found
        })
        .sort((a, b) => STATUS_ORDER.indexOf(a.m.status) - STATUS_ORDER.indexOf(b.m.status)),
    [resolved, industry, domain, matchClass, status, query],
  )

  return (
    <>
      <PageHero
        eyebrow="Matching"
        title="Where problems meet possibilities."
        lede="InThinks evaluates relationships between industrial challenges and emerging technologies using structured technology intelligence and expert review. Nothing here is a completed commercial relationship — a match is a pairing worth pursuing, with what is still open stated alongside it."
      >
        {examples && (
          <Notice>Illustrative matches — real matches appear here once qualified</Notice>
        )}
      </PageHero>

      <section className="container-grid pb-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Filters sit beside the records here as they do on the other two
              explorers, so the three pages are one system rather than three
              designs that happen to share a palette. */}
          <div className="lg:col-span-3">
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

              <div className="pt-5">
                <SearchField
                  label="Search"
                  value={query}
                  onChange={(v) => setText('q', v)}
                  placeholder="Reference, challenge, technology…"
                />
              </div>

              <FilterRow legend="Industry" options={industries} selected={industry} onToggle={(v) => toggle('industry', v)} />
              <FilterRow legend="Technology domain" options={domains} selected={domain} onToggle={(v) => toggle('domain', v)} />
              <FilterRow legend="Match class" options={classes} selected={matchClass} onToggle={(v) => toggle('class', v)} />
              <FilterRow legend="Status" options={statuses} selected={status} onToggle={(v) => toggle('status', v)} />
            </div>
          </div>

          <div className="min-w-0 lg:col-span-9">
            <p className="label pb-4" style={{ color: 'var(--color-muted)' }} aria-live="polite">
              {matches === null
                ? 'LOADING…'
                : `${sorted.length} OF ${resolved.length} ${resolved.length === 1 ? 'MATCH' : 'MATCHES'}`}
            </p>

            {matches === null ? (
              <span className="signal-line" aria-hidden="true" />
            ) : sorted.length === 0 ? (
              <div className="py-16" style={{ borderTop: '1px solid var(--rule)' }}>
                <p className="font-display text-[1.5rem] font-medium tracking-[-0.02em]">
                  No qualified public matches yet.
                </p>
                <p className="body-type measure-prose mt-5" style={{ color: 'var(--color-muted)' }}>
                  Candidate relationships remain private until technical review is complete.
                </p>
                <button
                  type="button"
                  onClick={() => { clear(); setText('q', '') }}
                  className="tap mt-7 inline-flex items-baseline gap-2.5 text-[0.9375rem] font-medium"
                >
                  <span className="border-b border-current pb-0.5">Clear filters</span>
                  <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>→</span>
                </button>
              </div>
            ) : (
          <ul className="space-y-0">
            {sorted.map(({ m, problem, tech }, i) => {
              return (
                <li key={`${m.problemSlug}-${m.technologySlug}`} style={{ borderTop: '1px solid var(--rule)' }}>
                  <Reveal delay={i * 60}>
                    <div className="grid gap-8 py-12 lg:grid-cols-12 lg:gap-10">
                      {/* The problem */}
                      <div className="lg:col-span-4">
                        <p className="label" style={{ color: 'var(--color-faint)' }}>INDUSTRIAL PROBLEM</p>
                        <Link to={`/problems/${problem.slug}`} className="group mt-3 block">
                          <p className="ident" style={{ color: 'var(--color-accent)' }}>{problem.id}</p>
                          <p className="mt-2 font-display text-[1.125rem] font-medium leading-snug tracking-[-0.02em]">
                            <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
                              {problem.title}
                            </span>
                          </p>
                        </Link>
                        <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>
                          {problem.sector.toUpperCase()}
                        </p>
                      </div>

                      {/* The connection */}
                      <div className="flex items-center lg:col-span-1">
                        <span
                          aria-hidden="true"
                          className="hidden h-px w-full lg:block"
                          style={{ background: 'var(--color-accent)' }}
                        />
                        <span className="label lg:hidden" style={{ color: 'var(--color-accent)' }}>↓ MATCHED WITH</span>
                      </div>

                      {/* The technology */}
                      <div className="lg:col-span-4">
                        <p className="label" style={{ color: 'var(--color-faint)' }}>TECHNOLOGY</p>
                        <Link to={`/technologies/${tech.slug}`} className="group mt-3 block">
                          <p className="ident" style={{ color: 'var(--color-accent)' }}>{tech.id}</p>
                          <p className="mt-2 font-display text-[1.125rem] font-medium leading-snug tracking-[-0.02em]">
                            <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
                              {tech.name}
                            </span>
                          </p>
                        </Link>
                        <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>
                          TRL {String(tech.currentTrl).padStart(2, '0')} · {tech.domain.toUpperCase()}
                        </p>
                      </div>

                      <div className="lg:col-span-3">
                        <Link to={`/matches/${matchSlug(m)}`} className="tap group block">
                          <p className="ident" style={{ color: 'var(--color-accent)' }}>
                            <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
                              {m.id}
                            </span>
                          </p>
                        </Link>
                        <p className="label mt-3" style={{ color: 'var(--color-accent)' }}>
                          {m.matchClass.toUpperCase()}
                        </p>
                        <p className="label mt-1.5" style={{ color: 'var(--color-muted)' }}>
                          {m.status.toUpperCase()}
                        </p>
                      </div>

                      {/* Fit and a way into the record. The reasoning, the
                          constraints and the open questions live on the match
                          page: eight of them here ran to a page of prose that
                          could not be scanned, which is the one thing a list
                          has to do. */}
                      <div className="lg:col-span-9 lg:col-start-1">
                        <dl className="flex flex-wrap gap-x-8 gap-y-3">
                          {m.fit.map((f) => (
                            <div key={f.dimension}>
                              <dt className="label" style={{ color: 'var(--color-faint)' }}>
                                {f.dimension.toUpperCase()} FIT
                              </dt>
                              <dd className="label mt-1" style={{ color: RATING_TONE[f.rating] }}>
                                {f.rating.toUpperCase()}
                              </dd>
                            </div>
                          ))}
                          <div>
                            <dt className="label" style={{ color: 'var(--color-faint)' }}>DEVELOPMENT REQUIRED</dt>
                            <dd className="label mt-1" style={{ color: 'var(--color-muted)' }}>
                              {m.developmentRequired.toUpperCase()}
                            </dd>
                          </div>
                        </dl>

                        <Link
                          to={`/matches/${matchSlug(m)}`}
                          className="tap group mt-7 inline-flex items-baseline gap-2.5 text-[0.9375rem] font-medium"
                        >
                          <span className="border-b border-current pb-0.5">Open the match record</span>
                          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" style={{ color: 'var(--color-accent)' }}>→</span>
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                </li>
              )
            })}
            <li style={{ borderTop: '1px solid var(--rule)' }} />
          </ul>
            )}
          </div>
        </div>

        <p className="label mt-10 measure-prose" style={{ color: 'var(--color-faint)' }}>
          NO MATCH IS PRESENTED ON THE SIGNALS ALONE. THE ENGINE SHORTLISTS; A REVIEWER QUALIFIES,
          AND THE OPEN QUESTIONS ARE PART OF THE RESULT RATHER THAN A FOOTNOTE.
        </p>
      </section>
    </>
  )
}
