import { useState } from 'react'
import Reveal from './primitives/Reveal'
import SectionLabel from './primitives/SectionLabel'
import TechFigure from './TechFigure'
import { domains } from '../data/domains'
import { useMediaQuery } from '../lib/motion'

/**
 * Section 05 — What We Work On.
 *
 * A typographic index rather than a card grid. On desktop the hovered or
 * focused domain draws its own technical figure in the facing column; on
 * touch each row carries its figure inline.
 */
export default function DomainIndex() {
  const [activeId, setActiveId] = useState(domains[0].id)
  const isDesktop = useMediaQuery('(width >= 64rem)')
  const active = domains.find((d) => d.id === activeId) ?? domains[0]

  return (
    <section id="domains" className="container-grid py-28 sm:py-40">
      <div className="doc-columns">
        <SectionLabel index="05">What We Work On</SectionLabel>

        <div>
          <Reveal>
            <h2 className="section-type max-w-[18ch]">
              Nine territories we keep returning to.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-10 lg:grid-cols-12">
            <ul className="lg:col-span-7">
              {domains.map((domain, i) => {
                const isActive = isDesktop && domain.id === activeId
                return (
                  <li key={domain.id} style={{ borderTop: '1px solid var(--rule)' }}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveId(domain.id)}
                      onFocus={() => setActiveId(domain.id)}
                      aria-pressed={isActive}
                      className="group flex w-full items-baseline justify-between gap-6 py-5 text-left"
                    >
                      <span className="flex items-baseline gap-5">
                        <span
                          className="label transition-colors duration-300"
                          style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-graphite-light)' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          className="font-display text-[clamp(1.35rem,2.4vw,2rem)] font-medium leading-tight tracking-[-0.025em] transition-transform duration-500 ease-[var(--ease-out-quint)]"
                          style={{ transform: isActive ? 'translateX(6px)' : 'none' }}
                        >
                          {domain.name}
                        </span>
                      </span>
                      <span
                        className="label hidden shrink-0 text-graphite transition-opacity duration-300 md:block"
                        style={{ opacity: isActive ? 1 : 0.4 }}
                      >
                        {domain.note}
                      </span>
                    </button>

                    {/* Touch layout: the figure lives inside the row. */}
                    {!isDesktop && (
                      <div
                        className="mb-5 aspect-[4/3] w-full"
                        style={{ background: 'var(--color-paper-sunk)' }}
                      >
                        <TechFigure kind={domain.figure} seed={domain.seed} className="h-full w-full" />
                      </div>
                    )}
                  </li>
                )
              })}
              <li style={{ borderTop: '1px solid var(--rule)' }} />
            </ul>

            {isDesktop && (
              <div className="lg:col-span-4 lg:col-start-9">
                <div className="sticky top-28">
                  <div
                    className="aspect-[4/3] w-full"
                    style={{ background: 'var(--color-paper-sunk)' }}
                  >
                    {/* Keyed so each domain's figure enters fresh rather than cross-fading. */}
                    <TechFigure
                      key={active.id}
                      kind={active.figure}
                      seed={active.seed}
                      className="h-full w-full animate-[fig-in_600ms_var(--ease-out-quint)]"
                    />
                  </div>
                  <p className="label mt-4 text-graphite">{active.note}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fig-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </section>
  )
}
