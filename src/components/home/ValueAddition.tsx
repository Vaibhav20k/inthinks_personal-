import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'
import { valueGap } from '../../data/pipeline'

/**
 * Section 13 — the commercial argument, drawn.
 *
 * Three columns and two descents. What arrives, what is done to it, and what
 * leaves. This is the section that explains why InThinks earns value in the
 * transaction, without ever naming a number.
 */
export default function ValueAddition() {
  const columns = [valueGap.before, valueGap.middle, valueGap.after]

  return (
    <section id="value" className="container-grid py-24 sm:py-32">
      <div className="doc-columns">
        <SectionLabel index="07">Value Addition</SectionLabel>
        <div>
          <Reveal as="h2" className="statement-type max-w-[20ch]">
            Promising technology often gets stuck before industry adoption.
          </Reveal>

          <div className="mt-16 grid gap-px lg:grid-cols-3" style={{ background: 'var(--rule)' }}>
            {columns.map((col, i) => {
              const isMiddle = i === 1
              return (
                <Reveal key={col.title} delay={i * 100}>
                  <div
                    className="flex h-full flex-col p-7"
                    style={
                      isMiddle
                        ? { background: 'var(--color-graphite)', color: 'var(--color-paper)' }
                        : { background: 'var(--color-paper)' }
                    }
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <p
                        className="label"
                        style={{ color: isMiddle ? 'var(--color-accent-light)' : 'var(--color-faint)' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </p>
                      {isMiddle && (
                        <p className="label" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          WHERE THE VALUE IS MADE
                        </p>
                      )}
                    </div>

                    <h3
                      className="mt-5 font-display text-[1.5rem] font-medium leading-tight tracking-[-0.025em]"
                      style={{ color: isMiddle ? 'var(--color-paper)' : 'var(--color-ink)' }}
                    >
                      {col.title}
                    </h3>

                    <ul className="mt-6 space-y-2.5">
                      {col.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-baseline gap-2.5 text-[0.9375rem]"
                          style={{ color: isMiddle ? 'rgba(255,255,255,0.72)' : 'var(--color-muted)' }}
                        >
                          <span
                            aria-hidden="true"
                            className="h-px w-2.5 shrink-0 translate-y-[-0.3em]"
                            style={{
                              background: isMiddle ? 'var(--color-accent-light)' : 'var(--rule-strong)',
                            }}
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal delay={220}>
            <p className="body-type measure-prose mt-10" style={{ color: 'var(--color-muted)' }}>
              An early innovation and an industry-ready technology are not the same
              asset. The difference is evidence, engineering and a defined route to
              deployment — and producing that difference is the work.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
