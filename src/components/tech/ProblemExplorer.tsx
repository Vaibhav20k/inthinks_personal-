import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'
import { outcomes, sectors } from '../../data/taxonomy'
import { technologies } from '../../data/technologies'

/**
 * Section 06 — the problem-first entry.
 *
 * Industry visitors do not know the portfolio's technology names, and asking
 * them to browse a list is asking the wrong question. This asks the one they
 * can answer — what are you trying to improve — and resolves it to the
 * portfolio. Selecting nothing shows nothing: the empty state is the prompt.
 */
export default function ProblemExplorer() {
  const [picked, setPicked] = useState<string[]>([])
  const [sector, setSector] = useState<string | null>(null)

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const matches = useMemo(() => {
    if (picked.length === 0 && !sector) return []
    return technologies.filter((tech) => {
      const outcomeHit = picked.length === 0 || picked.some((o) => tech.outcomes.includes(o))
      const sectorHit = !sector || tech.sectors.includes(sector)
      return outcomeHit && sectorHit
    })
  }, [picked, sector])

  const engaged = picked.length > 0 || sector

  return (
    <section id="explore" className="container-grid py-24 sm:py-32">
      <div className="doc-columns">
        <SectionLabel index="06">Problem-First Explorer</SectionLabel>
        <div>
          <Reveal as="h2" className="section-type max-w-[16ch]">
            What are you trying to improve?
          </Reveal>

          <Reveal delay={80}>
            <p className="body-type measure-prose mt-6" style={{ color: 'var(--color-muted)' }}>
              Select one or more outcomes. This is the same structure a submitted
              challenge is broken down into before the portfolio is searched.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <ul className="mt-10 flex flex-wrap gap-2">
              {outcomes.map((outcome) => {
                const on = picked.includes(outcome.id)
                return (
                  <li key={outcome.id}>
                    <button
                      type="button"
                      onClick={() => toggle(outcome.id)}
                      aria-pressed={on}
                      className="tap px-3.5 py-2 text-[0.875rem] transition-colors duration-250"
                      style={{
                        border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
                        background: on ? 'var(--color-accent)' : 'transparent',
                        color: on ? '#fff' : 'var(--color-muted)',
                      }}
                    >
                      {outcome.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
              <span className="label" style={{ color: 'var(--color-faint)' }}>SECTOR</span>
              <div className="flex flex-wrap gap-2">
                {sectors.map((s) => {
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
            </div>
          </Reveal>

          {/* Result */}
          <div className="mt-12" style={{ borderTop: '1px solid var(--rule)' }}>
            {!engaged ? (
              <p className="label py-10" style={{ color: 'var(--color-faint)' }}>
                SELECT AN OUTCOME TO SEE RELEVANT TECHNOLOGY AREAS
              </p>
            ) : matches.length === 0 ? (
              <div className="py-10">
                <p className="font-display text-[1.375rem] font-medium tracking-[-0.02em]">
                  Nothing in the current portfolio matches that combination.
                </p>
                <p className="body-type mt-3" style={{ color: 'var(--color-muted)', maxWidth: '52ch' }}>
                  That is worth telling us about — an unmatched problem is how new
                  development work starts.
                </p>
                <Link
                  to="/submit-challenge"
                  className="tap mt-6 inline-flex items-baseline gap-2.5 text-[0.9375rem] font-medium"
                >
                  <span className="border-b border-current pb-0.5">Submit this challenge</span>
                  <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>→</span>
                </Link>
              </div>
            ) : (
              <>
                <p className="label py-5" style={{ color: 'var(--color-muted)' }}>
                  {matches.length} TECHNOLOG{matches.length === 1 ? 'Y' : 'IES'} IN SCOPE
                </p>
                <ul>
                  {matches.map((tech) => (
                    <li key={tech.slug} style={{ borderTop: '1px solid var(--rule)' }}>
                      <Link
                        to={`/technologies/${tech.slug}`}
                        className="group grid items-baseline gap-x-8 gap-y-2 py-5 md:grid-cols-12"
                      >
                        <span className="ident md:col-span-3" style={{ color: 'var(--color-accent)' }}>
                          {tech.id}
                        </span>
                        <span className="font-display text-[1.25rem] font-medium tracking-[-0.02em] md:col-span-5">
                          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-[var(--ease-out-quint)] group-hover:bg-[length:100%_1px]">
                            {tech.name}
                          </span>
                        </span>
                        <span className="label md:col-span-2" style={{ color: 'var(--color-faint)' }}>
                          TRL {tech.currentTrl}
                        </span>
                        <span className="label md:col-span-2" style={{ color: 'var(--color-muted)' }}>
                          {tech.transferStatus.toUpperCase()}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
