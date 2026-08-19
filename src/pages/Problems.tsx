import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/layout/PageHero'
import Notice from '../components/primitives/Notice'
import { loadProblems } from '../data/portfolio'
import { sectors } from '../data/taxonomy'
import type { IndustrialProblem } from '../data/models'

/**
 * The industry side of the portfolio.
 *
 * The Technology Explorer asks an innovator's question — what has been built.
 * This asks the opposite one, and it exists because the platform has two
 * intakes and was only showing one of them. An innovator cannot recognise that
 * they can solve a problem they have never been told about.
 *
 * Anonymised the other way round: a technology page withholds the innovator, a
 * problem page withholds the company. An industrial problem is often an
 * admission that something does not work, and a competitor reading it should
 * learn the problem exists without learning whose plant it is in.
 */
export default function Problems() {
  const [problems, setProblems] = useState<IndustrialProblem[] | null>(null)
  const [examples, setExamples] = useState(false)
  const [sector, setSector] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    loadProblems().then((r) => {
      if (!live) return
      setProblems(r.problems)
      setExamples(r.usingExamples)
    })
    return () => { live = false }
  }, [])

  const results = useMemo(
    () => (problems ?? []).filter((p) => !sector || p.sector === sector),
    [problems, sector],
  )

  const present = useMemo(
    () => sectors.filter((s) => (problems ?? []).some((p) => p.sector === s)),
    [problems],
  )

  return (
    <>
      <PageHero
        eyebrow="Industry"
        title="Industrial Problems"
        lede="Problems industry has brought to InThinks, stated in enough detail for someone who could solve them to recognise it. Every one is anonymised — the problem is public, the company is not."
      >
        {examples && (
          <Notice>Illustrative examples — real challenges appear here once published</Notice>
        )}
      </PageHero>

      <section className="container-grid pb-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-28">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="label" style={{ color: 'var(--color-ink)' }}>SECTOR</h2>
                {sector && (
                  <button
                    type="button"
                    onClick={() => setSector(null)}
                    className="tap label transition-colors duration-250 hover:text-accent"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {present.map((s) => {
                  const on = sector === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSector(on ? null : s)}
                      aria-pressed={on}
                      className="tap label px-2.5 py-1.5 transition-colors duration-250"
                      style={{
                        border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule)'}`,
                        color: on ? 'var(--color-accent)' : 'var(--color-muted)',
                      }}
                    >
                      {s.toUpperCase()}
                    </button>
                  )
                })}
              </div>

              <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--rule)' }}>
                <p className="body-type" style={{ color: 'var(--color-muted)' }}>
                  Recognise one of these?
                </p>
                <Link
                  to="/submit-innovation"
                  className="tap mt-4 inline-flex items-baseline gap-2.5 text-[0.9375rem] font-medium"
                >
                  <span className="border-b border-current pb-0.5">Submit your innovation</span>
                  <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>→</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-8 xl:col-span-9">
            <p className="label pb-4" style={{ color: 'var(--color-muted)' }} aria-live="polite">
              {problems === null
                ? 'LOADING…'
                : `${results.length} OF ${problems.length} ${problems.length === 1 ? 'PROBLEM' : 'PROBLEMS'}`}
            </p>

            {problems === null ? null : (
              <ul>
                {results.map((p) => (
                  <li key={p.slug} style={{ borderTop: '1px solid var(--rule)' }}>
                    <Link to={`/problems/${p.slug}`} className="group grid gap-5 py-9 lg:grid-cols-12 lg:gap-10">
                      <div className="lg:col-span-3">
                        <p className="ident" style={{ color: 'var(--color-accent)' }}>{p.id}</p>
                        <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>
                          {p.sector.toUpperCase()}
                        </p>
                      </div>
                      <div className="lg:col-span-6">
                        <h3 className="font-display text-[1.375rem] font-medium leading-snug tracking-[-0.02em]">
                          <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
                            {p.title}
                          </span>
                        </h3>
                        <p className="body-type mt-3" style={{ color: 'var(--color-muted)' }}>
                          {p.summary}
                        </p>
                      </div>
                      <div className="lg:col-span-3">
                        <p className="label" style={{ color: 'var(--color-faint)' }}>STATUS</p>
                        <p className="label mt-2" style={{ color: 'var(--color-accent-deep)' }}>
                          {p.status.toUpperCase()}
                        </p>
                        <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
                          MINIMUM TRL {String(p.minimumTrl).padStart(2, '0')}
                        </p>
                      </div>
                    </Link>
                  </li>
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
