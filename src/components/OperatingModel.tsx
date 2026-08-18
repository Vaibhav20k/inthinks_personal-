import Reveal from './primitives/Reveal'
import SectionLabel from './primitives/SectionLabel'
import { modelOutcomes } from '../data/content'

const spine = ['Idea', 'Research', 'Experimentation', 'Prototype', 'Technology / Product']

/**
 * Section 06 — Our Operating Model.
 *
 * A diagram, not paragraphs: a single spine that runs to a technology, then
 * splits into the four ways that technology reaches the world. Horizontal on
 * desktop, vertical on touch — the same graph either way.
 */
export default function OperatingModel() {
  return (
    <section id="model" className="container-grid py-28 sm:py-40">
      <div className="doc-columns">
        <SectionLabel index="06">Operating Model</SectionLabel>

        <div>
          <Reveal>
            <h2 className="section-type max-w-[12ch]">We don't stop at ideas.</h2>
          </Reveal>

          <Reveal delay={80}>
            <p className="body-type mt-6 text-graphite" style={{ maxWidth: '48ch' }}>
              We create independently, validate rigorously and collaborate with
              organisations that can bring promising technologies into the world.
            </p>
          </Reveal>

          {/* Spine */}
          <Reveal delay={140}>
            <ol className="mt-16 flex flex-col lg:flex-row lg:items-stretch">
              {spine.map((step, i) => {
                const last = i === spine.length - 1
                return (
                  <li key={step} className="flex flex-1 items-center lg:flex-col lg:items-stretch">
                    <div
                      className="flex flex-1 flex-col justify-between gap-6 px-0 py-5 lg:px-5"
                      style={{
                        borderTop: '1px solid var(--rule)',
                        borderColor: last ? 'var(--color-accent)' : 'var(--rule)',
                      }}
                    >
                      <span className="label" style={{ color: last ? 'var(--color-accent)' : 'var(--color-graphite-light)' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="font-display text-[1.0625rem] font-medium leading-snug tracking-[-0.02em]"
                        style={{ color: last ? 'var(--color-accent)' : undefined }}
                      >
                        {step}
                      </span>
                    </div>
                    {!last && (
                      <span
                        aria-hidden="true"
                        className="shrink-0 self-center px-4 text-graphite-light lg:hidden"
                      >
                        ↓
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </Reveal>

          {/* Branch */}
          <Reveal delay={200}>
            <div className="relative mt-4" aria-hidden="true">
              <svg viewBox="0 0 1000 56" preserveAspectRatio="none" className="hidden h-14 w-full lg:block">
                <line x1="900" y1="0" x2="900" y2="20" stroke="var(--color-accent)" strokeWidth="1" />
                <line x1="125" y1="20" x2="875" y2="20" stroke="var(--color-accent)" strokeWidth="1" />
                {[125, 375, 625, 875].map((x) => (
                  <line key={x} x1={x} y1="20" x2={x} y2="56" stroke="var(--color-accent)" strokeWidth="1" />
                ))}
              </svg>
            </div>
          </Reveal>

          <ul className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'var(--rule)' }}>
            {modelOutcomes.map((name, i) => (
              <li key={name} style={{ background: 'var(--color-paper)' }}>
                <Reveal delay={220 + i * 60}>
                  <div className="flex h-full items-center gap-3 px-5 py-6">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0"
                      style={{ background: 'var(--color-accent)' }}
                    />
                    <span className="label">{name.toUpperCase()}</span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
