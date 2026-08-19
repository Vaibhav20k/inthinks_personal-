import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/layout/PageHero'
import Notice from '../components/primitives/Notice'
import { loadProblems } from '../data/portfolio'
import { matchesForProblem } from '../data/examples'
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
        title="Problems worth solving."
        lede="Industrial challenges submitted to or structured by InThinks, converted into technical problem profiles that can be evaluated against emerging technologies. Every one is anonymised — the problem is public, the company is not."
      >
        {examples && (
          <Notice>Illustrative industrial challenges — live challenges appear here as they are approved for publication</Notice>
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
              /* An index, matching the Technology Explorer: this is a register
                 to scan for a sector or a target, not a page to read. The
                 MATCHES column is the point of it — a challenge with candidates
                 against it is the one an innovator should look at first. */
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <caption className="sr-only">Industrial problems brought to InThinks</caption>
                  <thead>
                    <tr>
                      {['Reference', 'Problem', 'Industry', 'Priority', 'Target', 'Matches', 'Status'].map((h) => (
                        <th key={h} scope="col" className="label whitespace-nowrap px-3 py-3 text-left first:pl-0"
                            style={{ color: 'var(--color-faint)', borderBottom: '1px solid var(--rule-strong)' }}>
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((p) => {
                      const n = matchesForProblem(p.slug).length
                      const cell = { borderBottom: '1px solid var(--rule)' }
                      return (
                        <tr key={p.slug} className="group">
                          <td className="px-3 py-4 pl-0 align-baseline" style={cell}>
                            <Link to={`/problems/${p.slug}`} className="ident whitespace-nowrap" style={{ color: 'var(--color-accent)' }}>
                              {p.id}
                            </Link>
                          </td>
                          <td className="max-w-[22rem] px-3 py-4 align-baseline" style={cell}>
                            <Link to={`/problems/${p.slug}`} className="text-[0.9375rem] font-medium">
                              <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
                                {p.title}
                              </span>
                            </Link>
                          </td>
                          <td className="label whitespace-nowrap px-3 py-4 align-baseline" style={{ ...cell, color: 'var(--color-muted)' }}>
                            {p.sector.toUpperCase()}
                          </td>
                          <td className="label whitespace-nowrap px-3 py-4 align-baseline" style={{ ...cell, color: 'var(--color-muted)' }}>
                            {p.priorityArea.toUpperCase()}
                          </td>
                          <td className="label px-3 py-4 align-baseline" style={{ ...cell, color: 'var(--color-muted)' }}>
                            {p.target.toUpperCase()}
                          </td>
                          <td className="label whitespace-nowrap px-3 py-4 align-baseline" style={cell}>
                            {n > 0 ? (
                              <Link to="/matches" style={{ color: 'var(--color-accent)' }}>
                                {n} CANDIDATE{n === 1 ? '' : 'S'}
                              </Link>
                            ) : (
                              <span style={{ color: 'var(--color-faint)' }}>—</span>
                            )}
                          </td>
                          <td className="label px-3 py-4 align-baseline" style={{ ...cell, color: 'var(--color-muted)' }}>
                            {p.status.toUpperCase()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
