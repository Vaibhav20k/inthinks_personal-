import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/layout/PageHero'
import Notice from '../components/primitives/Notice'
import Reveal from '../components/primitives/Reveal'
import { exampleProblems, exampleTechnologies } from '../data/examples'
import { loadMatches } from '../data/portfolio'
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
export default function Matches() {
  const [matches, setMatches] = useState<PublicMatch[] | null>(null)
  const [examples, setExamples] = useState(false)

  useEffect(() => {
    let live = true
    loadMatches().then((r) => {
      if (!live) return
      setMatches(r.matches)
      setExamples(r.usingExamples)
    })
    return () => { live = false }
  }, [])

  const sorted = [...(matches ?? [])].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
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
        {matches === null ? (
          <span className="signal-line" aria-hidden="true" />
        ) : (
          <ul className="space-y-0">
            {sorted.map((m, i) => {
              const problem = exampleProblems.find((p) => p.slug === m.problemSlug)
              const tech = exampleTechnologies.find((t) => t.slug === m.technologySlug)
              if (!problem || !tech) return null
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
                        <p className="ident" style={{ color: 'var(--color-faint)' }}>{m.id}</p>
                        <p className="label mt-3" style={{ color: 'var(--color-accent)' }}>
                          {m.matchClass.toUpperCase()}
                        </p>
                        <p className="label mt-1.5" style={{ color: 'var(--color-muted)' }}>
                          {m.status.toUpperCase()}
                        </p>
                      </div>

                      <div className="lg:col-span-9 lg:col-start-1">
                        <p className="label" style={{ color: 'var(--color-faint)' }}>WHY THESE TWO</p>
                        <p className="body-type measure-prose mt-3" style={{ color: 'var(--color-muted)' }}>
                          {m.rationale}
                        </p>

                        {/* Fit, dimension by dimension. Deliberately words:
                            averaging a strong mechanism against a moderate TRL
                            gives a number that describes neither, and the
                            moderate part is the useful half of the answer. */}
                        <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
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

                        <p className="label mt-7" style={{ color: 'var(--color-faint)' }}>NEXT STEP</p>
                        <p className="body-type measure-prose mt-2" style={{ color: 'var(--color-muted)' }}>
                          {m.nextStep}
                        </p>

                        <p className="label mt-7" style={{ color: 'var(--color-faint)' }}>STILL OPEN</p>
                        <ul className="mt-3 space-y-2.5">
                          {m.openQuestions.map((q) => (
                            <li key={q} className="flex items-baseline gap-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                              <span aria-hidden="true" className="h-px w-3 shrink-0" style={{ background: 'var(--rule-strong)' }} />
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Reveal>
                </li>
              )
            })}
            <li style={{ borderTop: '1px solid var(--rule)' }} />
          </ul>
        )}

        <p className="label mt-10 measure-prose" style={{ color: 'var(--color-faint)' }}>
          NO MATCH IS PRESENTED ON THE SIGNALS ALONE. THE ENGINE SHORTLISTS; A REVIEWER QUALIFIES,
          AND THE OPEN QUESTIONS ARE PART OF THE RESULT RATHER THAN A FOOTNOTE.
        </p>
      </section>
    </>
  )
}
