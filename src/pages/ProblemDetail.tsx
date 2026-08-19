import { Link, useParams } from 'react-router-dom'
import Button from '../components/primitives/Button'
import MetaList from '../components/primitives/MetaList'
import Notice from '../components/primitives/Notice'
import Reveal from '../components/primitives/Reveal'
import { exampleMatches, exampleTechnologies } from '../data/examples'
import { findExampleProblem } from '../data/portfolio'

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-9" style={{ borderTop: '1px solid var(--rule)' }}>
      <h2 className="label" style={{ color: 'var(--color-faint)' }}>{title.toUpperCase()}</h2>
      <div className="mt-4 body-type measure-prose" style={{ color: 'var(--color-muted)' }}>
        {children}
      </div>
    </section>
  )
}

/**
 * One industrial problem, written for an innovator to assess.
 *
 * The order is deliberate: the situation, then what has already been tried,
 * then what would count as solving it, then the constraints. An innovator
 * reading top to bottom should be able to rule themselves out early, which is
 * more useful to them than being kept interested to the end.
 *
 * No company, no site, no location — not withheld behind a login, absent.
 */
export default function ProblemDetail() {
  const { slug } = useParams()
  const problem = slug ? findExampleProblem(slug) : undefined

  if (!problem) {
    return (
      <section className="container-grid pb-28 pt-36 sm:pt-44">
        <h1 className="statement-type">Problem not found.</h1>
        <p className="body-type mt-6" style={{ color: 'var(--color-muted)' }}>
          That reference is not in the published set.
        </p>
        <div className="mt-8"><Button to="/problems">Back to Industrial Problems</Button></div>
      </section>
    )
  }

  const matches = exampleMatches.filter((m) => m.problemSlug === problem.slug)

  return (
    <>
      <section className="container-grid pb-12 pt-36 sm:pt-44">
        <Link to="/problems" className="tap label inline-flex items-center gap-2" style={{ color: 'var(--color-muted)' }}>
          <span aria-hidden="true">←</span> INDUSTRIAL PROBLEMS
        </Link>

        <p className="ident mt-8" style={{ color: 'var(--color-accent)' }}>{problem.id}</p>
        <Reveal as="h1" className="statement-type mt-4 max-w-[20ch]">{problem.title}</Reveal>
        <Reveal delay={80}>
          <p className="body-type measure-prose mt-6" style={{ color: 'var(--color-muted)' }}>
            {problem.summary}
          </p>
        </Reveal>
        {problem.id.startsWith('EXAMPLE') && (
          <Reveal delay={120}>
            <div className="mt-8">
              <Notice>Illustrative example — not a live industry challenge</Notice>
            </div>
          </Reveal>
        )}
      </section>

      <section className="container-grid pb-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <aside className="lg:order-2 lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <div className="p-6" style={{ border: '1px solid var(--rule-strong)' }}>
                <h2 className="label" style={{ color: 'var(--color-ink)' }}>CHALLENGE SUMMARY</h2>
                <div className="mt-4">
                  <MetaList
                    items={[
                      { term: 'CHALLENGE ID', value: problem.id },
                      { term: 'SECTOR', value: problem.sector },
                      { term: 'MINIMUM TRL', value: String(problem.minimumTrl).padStart(2, '0') },
                      { term: 'STATUS', value: problem.status, accent: true },
                    ]}
                  />
                </div>
                <div className="mt-8 flex flex-col gap-3">
                  <Button to="/submit-innovation">Submit a Technology</Button>
                  <Button to="/technologies" variant="outline">Browse Technologies</Button>
                </div>
              </div>
              <p className="label mt-5" style={{ color: 'var(--color-faint)' }}>
                THE COMPANY AND ITS SITE ARE NOT PUBLISHED
              </p>
            </div>
          </aside>

          <div className="lg:order-1 lg:col-span-8">
            <Block title="The situation">{problem.problem}</Block>
            <Block title="What is done today">{problem.currentApproach}</Block>
            <Block title="What would count as solving it">{problem.targetOutcome}</Block>

            <section className="py-9" style={{ borderTop: '1px solid var(--rule)' }}>
              <h2 className="label" style={{ color: 'var(--color-faint)' }}>CONSTRAINTS</h2>
              <ul className="mt-4 space-y-3">
                {problem.constraints.map((c) => (
                  <li key={c} className="flex items-baseline gap-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                    <span aria-hidden="true" className="h-px w-3 shrink-0" style={{ background: 'var(--color-accent)' }} />
                    {c}
                  </li>
                ))}
              </ul>
            </section>

            <section className="py-9" style={{ borderTop: '1px solid var(--rule)' }}>
              <h2 className="label" style={{ color: 'var(--color-faint)' }}>OPERATING ENVIRONMENT</h2>
              <div className="mt-4"><MetaList items={problem.environment.map((e) => ({ term: e.term.toUpperCase(), value: e.value }))} /></div>
            </section>

            <section className="py-9" style={{ borderTop: '1px solid var(--rule)' }}>
              <h2 className="label" style={{ color: 'var(--color-faint)' }}>WHAT IT COSTS TODAY</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {problem.impact.map((i) => (
                  <li key={i} className="label px-3 py-2" style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                    {i.toUpperCase()}
                  </li>
                ))}
              </ul>
            </section>

            {matches.length > 0 && (
              <section className="py-9" style={{ borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
                <h2 className="label" style={{ color: 'var(--color-faint)' }}>TECHNOLOGIES UNDER CONSIDERATION</h2>
                <ul className="mt-5 space-y-6">
                  {matches.map((m) => {
                    const tech = exampleTechnologies.find((t) => t.slug === m.technologySlug)
                    if (!tech) return null
                    return (
                      <li key={m.technologySlug}>
                        <Link to={`/technologies/${tech.slug}`} className="ident" style={{ color: 'var(--color-accent)' }}>
                          {tech.id}
                        </Link>
                        <p className="mt-1.5 font-display text-[1.0625rem] font-medium tracking-[-0.02em]">{tech.name}</p>
                        <p className="body-type mt-2" style={{ color: 'var(--color-muted)' }}>{m.rationale}</p>
                        <p className="label mt-3" style={{ color: 'var(--color-accent-deep)' }}>{m.matchClass.toUpperCase()} · {m.status.toUpperCase()}</p>
                      </li>
                    )
                  })}
                </ul>
                <p className="label mt-6" style={{ color: 'var(--color-faint)' }}>
                  SHORTLISTED BY THE ENGINE, QUALIFIED BY A REVIEWER — NEVER PRESENTED ON THE SIGNALS ALONE
                </p>
              </section>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
