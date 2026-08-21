import { useEffect, useState } from 'react'
import PageMeta from '../components/layout/PageMeta'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/primitives/Button'
import Notice from '../components/primitives/Notice'
import Reveal from '../components/primitives/Reveal'
import { findExampleMatch } from '../data/examples'
import { findExampleProblem, findExampleTechnology } from '../data/portfolio'
import type { IndustrialProblem, PublicMatch, Technology } from '../data/models'

const RATING_TONE: Record<string, string> = {
  Strong: 'var(--color-accent)',
  Promising: 'var(--color-accent-deep)',
  Moderate: 'var(--color-muted)',
  Limited: 'var(--color-faint)',
  Unknown: 'var(--color-faint)',
}

/** A labelled block, so every section on this page is built the same way. */
function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-6" style={{ borderTop: '1px solid var(--rule)' }}>
      <h2 className="label" style={{ color: 'var(--color-faint)' }}>{label}</h2>
      <div className="mt-3">{children}</div>
    </div>
  )
}

/** The dashed list used for anything that is a set of open items. */
function Items({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((q) => (
        <li key={q} className="flex items-baseline gap-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
          <span aria-hidden="true" className="h-px w-3 shrink-0" style={{ background: 'var(--rule-strong)' }} />
          {q}
        </li>
      ))}
    </ul>
  )
}

/**
 * One match, in full.
 *
 * The list page answers "what has been matched"; this answers "why, and what
 * would have to be true". They are different questions and the second one does
 * not fit in a row — the reasoning, the fit dimension by dimension, the
 * constraints the problem imposes and what is still unvalidated run to more
 * than a scannable list can hold without becoming unscannable.
 *
 * Both ends link back to their own records, which is the point of the thing:
 * a match is a relationship between two published records, not a third record
 * that happens to mention them.
 */
export default function MatchDetail() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<
    { match: PublicMatch; problem: IndustrialProblem; technology: Technology } | null | 'missing'
  >(null)

  useEffect(() => {
    const match = findExampleMatch(slug)
    const problem = match ? findExampleProblem(match.problemSlug) : undefined
    const technology = match ? findExampleTechnology(match.technologySlug) : undefined
    // A match missing either end is treated as missing rather than rendered
    // half-built: half a relationship is not a record.
    setState(match && problem && technology ? { match, problem, technology } : 'missing')
  }, [slug])

  if (state === null) {
    return (
      <section className="container-grid pb-28 pt-36 sm:pt-44">
        <span className="signal-line" aria-hidden="true" />
      </section>
    )
  }

  if (state === 'missing') {
    return (
      <section className="container-grid pb-28 pt-36 sm:pt-44">
        <div className="max-w-2xl">
          <h1 className="statement-type">No such match.</h1>
          <p className="body-type mt-8" style={{ color: 'var(--color-muted)' }}>
            This match reference does not correspond to a published record. It may have been
            withdrawn, or it may never have been qualified — candidate relationships stay
            private until technical review is complete.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button to="/matches">All matches</Button>
            <Button to="/technologies" variant="outline">Explore technologies</Button>
          </div>
        </div>
      </section>
    )
  }

  const { match: m, problem, technology: t } = state

  return (
    <>
      <PageMeta title="Match" description="A qualified relationship between an industrial challenge and an emerging technology." />
      <section className="container-grid pb-16 pt-36 sm:pt-44">
        <Reveal>
          <p className="ident" style={{ color: 'var(--color-accent)' }}>{m.id}</p>
          <h1 className="statement-type mt-4 max-w-[18ch]">{m.matchClass}.</h1>
          <p className="label mt-5" style={{ color: 'var(--color-muted)' }}>{m.status.toUpperCase()}</p>
          {m.demo && (
            <div className="mt-8">
              <Notice>Illustrative match</Notice>
            </div>
          )}
        </Reveal>
      </section>

      {/* The relationship, stated before anything is said about it. Vertical on
          a phone by design — a crossing network on a small screen is a picture
          nobody can read. */}
      <section className="container-grid pb-16">
        <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <Link to={`/problems/${problem.slug}`} className="group block p-7" style={{ border: '1px solid var(--rule-strong)' }}>
            <p className="label" style={{ color: 'var(--color-faint)' }}>INDUSTRIAL CHALLENGE</p>
            <p className="ident mt-4" style={{ color: 'var(--color-accent)' }}>{problem.id}</p>
            <p className="mt-2 font-display text-[1.25rem] font-medium leading-snug tracking-[-0.02em]">
              <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
                {problem.title}
              </span>
            </p>
            <p className="label mt-4" style={{ color: 'var(--color-muted)' }}>
              {problem.sector.toUpperCase()} · {problem.status.toUpperCase()}
            </p>
          </Link>

          <div className="flex flex-col items-center justify-center gap-3 lg:px-4">
            <span aria-hidden="true" className="h-8 w-px lg:h-px lg:w-16" style={{ background: 'var(--color-accent)' }} />
            <span className="label whitespace-nowrap" style={{ color: 'var(--color-accent)' }}>
              {m.matchClass.toUpperCase()}
            </span>
            <span aria-hidden="true" className="h-8 w-px lg:h-px lg:w-16" style={{ background: 'var(--color-accent)' }} />
          </div>

          <Link to={`/technologies/${t.slug}`} className="group block p-7" style={{ border: '1px solid var(--rule-strong)' }}>
            <p className="label" style={{ color: 'var(--color-faint)' }}>TECHNOLOGY</p>
            <p className="ident mt-4" style={{ color: 'var(--color-accent)' }}>{t.id}</p>
            <p className="mt-2 font-display text-[1.25rem] font-medium leading-snug tracking-[-0.02em]">
              <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
                {t.name}
              </span>
            </p>
            <p className="label mt-4" style={{ color: 'var(--color-muted)' }}>
              TRL {String(t.currentTrl).padStart(2, '0')} → {String(t.targetTrl).padStart(2, '0')} · {t.domain.toUpperCase()}
            </p>
          </Link>
        </div>
      </section>

      <section className="container-grid pb-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-7">
            <div className="grid gap-10">
              <Block label="WHY THEY MATCH">
                <p className="body-type measure-prose" style={{ color: 'var(--color-muted)' }}>{m.rationale}</p>
              </Block>

              <Block label="FIT">
                <dl className="flex flex-wrap gap-x-10 gap-y-4">
                  {m.fit.map((f) => (
                    <div key={f.dimension}>
                      <dt className="label" style={{ color: 'var(--color-faint)' }}>{f.dimension.toUpperCase()}</dt>
                      <dd className="label mt-1" style={{ color: RATING_TONE[f.rating] }}>{f.rating.toUpperCase()}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="label" style={{ color: 'var(--color-faint)' }}>R&amp;D REQUIRED</dt>
                    <dd className="label mt-1" style={{ color: 'var(--color-muted)' }}>
                      {m.developmentRequired.toUpperCase()}
                    </dd>
                  </div>
                </dl>
              </Block>

              {/* The constraints come from the challenge record rather than
                  being restated here. They are the industrial reality the
                  technology has to survive, and a second copy of them would be
                  the one that goes stale. */}
              <Block label="KEY CONSTRAINTS">
                <Items items={problem.constraints} />
              </Block>

              <Block label="WHAT STILL NEEDS VALIDATION">
                <Items items={m.openQuestions} />
              </Block>

              <Block label="NEXT STEP">
                <p className="body-type measure-prose" style={{ color: 'var(--color-muted)' }}>{m.nextStep}</p>
              </Block>
            </div>
          </div>

          <aside className="min-w-0 lg:col-span-4 lg:col-start-9">
            <div className="lg:sticky lg:top-28">
              {/* Where this could apply, drawn from the two records rather than
                  asserted. There is no "commercial potential" figure here on
                  purpose: nobody has run that number, and a match page that
                  prints one is claiming an assessment that has not happened. */}
              <Block label="WHERE IT COULD APPLY">
                <ul className="flex flex-wrap gap-2">
                  {(t.potentialIndustries ?? t.sectors).map((s) => (
                    <li key={s} className="label px-2.5 py-1" style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                      {s.toUpperCase()}
                    </li>
                  ))}
                </ul>
              </Block>

              <div className="mt-10">
                <Block label="TARGET OUTCOME">
                  <p className="text-[0.9375rem] font-medium">{problem.target}</p>
                  <p className="body-type mt-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                    {problem.targetOutcome}
                  </p>
                </Block>
              </div>

              <div className="mt-10">
                <Block label="TRANSFER STATUS">
                  <p className="label" style={{ color: 'var(--color-muted)' }}>{t.transferStatus.toUpperCase()}</p>
                </Block>
              </div>

              <div className="mt-10 flex flex-col gap-3">
                <Button href={`mailto:hello@inthinks.com?subject=${encodeURIComponent(`Match enquiry — ${m.id}`)}`}>
                  Discuss this match
                </Button>
                <Button to="/matches" variant="outline">All matches</Button>
              </div>

              <p className="body-type mt-6 text-[0.875rem]" style={{ color: 'var(--color-faint)' }}>
                Neither the innovator nor the company behind the challenge is named. Identity is
                disclosed only when both sides agree to proceed.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
