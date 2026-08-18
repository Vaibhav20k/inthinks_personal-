import Reveal from './primitives/Reveal'
import SectionLabel from './primitives/SectionLabel'
import TechFigure from './TechFigure'
import { labFragments } from '../data/content'
import { usePointerField, usePrefersReducedMotion } from '../lib/motion'

/**
 * Section 09 — the working middle of invention.
 *
 * A worksheet rather than a gallery: figures, measurements and an iteration
 * log including the versions that failed, laid on drafting-grid paper. The
 * whole plate drifts a few pixels against the pointer so it reads as a
 * physical surface, not a screenshot.
 */
export default function ExperimentCanvas() {
  const reduced = usePrefersReducedMotion()
  const { ref, point } = usePointerField<HTMLDivElement>()
  const shift = (depth: number) =>
    reduced ? undefined : { transform: `translate3d(${point.x * depth}px, ${point.y * depth}px, 0)` }

  return (
    <section id="lab" className="container-grid py-28 sm:py-40">
      <div className="doc-columns">
        <SectionLabel index="09">Inside the Work</SectionLabel>

        <div>
          <Reveal>
            <h2 className="section-type max-w-[16ch]">
              Most of invention is the part nobody publishes.
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div
              ref={ref}
              className="relative mt-14 overflow-hidden p-5 sm:p-8"
              style={{
                background: 'var(--color-paper-sunk)',
                backgroundImage:
                  'linear-gradient(var(--rule) 1px, transparent 1px), linear-gradient(90deg, var(--rule) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            >
              <div className="grid gap-5 md:grid-cols-12">
                {/* Primary figure */}
                <div
                  className="md:col-span-7"
                  style={shift(-6)}
                >
                  <div className="relative" style={{ background: 'var(--color-paper-raised)', border: '1px solid var(--rule)' }}>
                    <TechFigure kind="lattice" seed={31} className="h-full w-full" />
                    <span className="label absolute left-3 top-3 text-graphite-light">FIG. A — STRUCTURE</span>
                  </div>
                </div>

                {/* Iteration log — failures included, deliberately */}
                <div className="md:col-span-5" style={shift(4)}>
                  <div
                    className="h-full p-5"
                    style={{ background: 'var(--color-paper-raised)', border: '1px solid var(--rule)' }}
                  >
                    <p className="label text-graphite-light">ITERATION LOG</p>
                    <ul className="mt-4 space-y-2.5">
                      {labFragments.map((f) => (
                        <li
                          key={`${f.label}-${f.value}`}
                          className="label flex items-baseline justify-between gap-4 pb-2.5"
                          style={{ borderBottom: '1px solid var(--rule)' }}
                        >
                          <span className="text-graphite-light">{f.label}</span>
                          <span
                            className="text-right"
                            style={{
                              color: f.value.includes('failed') ? 'var(--color-accent)' : undefined,
                            }}
                          >
                            {f.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Secondary figures */}
                <div className="md:col-span-4" style={shift(7)}>
                  <div className="relative" style={{ background: 'var(--color-paper-raised)', border: '1px solid var(--rule)' }}>
                    <TechFigure kind="wave" seed={19} className="h-full w-full" />
                    <span className="label absolute left-3 top-3 text-graphite-light">FIG. B — RESPONSE</span>
                  </div>
                </div>
                <div className="md:col-span-4" style={shift(-4)}>
                  <div className="relative" style={{ background: 'var(--color-paper-raised)', border: '1px solid var(--rule)' }}>
                    <TechFigure kind="branch" seed={41} className="h-full w-full" />
                    <span className="label absolute left-3 top-3 text-graphite-light">FIG. C — BRANCHING</span>
                  </div>
                </div>
                <div className="md:col-span-4" style={shift(6)}>
                  <div
                    className="flex h-full flex-col justify-between p-5"
                    style={{ background: 'var(--color-ink-deep)', color: 'var(--color-paper)' }}
                  >
                    <p className="label text-white/45">OPEN QUESTION</p>
                    <p className="mt-6 font-display text-[1.25rem] font-medium leading-snug tracking-[-0.02em]">
                      What breaks first, and can we make that the useful part?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
