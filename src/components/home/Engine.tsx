import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'
import { pipeline } from '../../data/pipeline'

/**
 * Section 03 — the engine, stated compactly before the scroll-driven version
 * expands it. Seven stages between an early innovation and a transfer.
 */
export default function Engine() {
  return (
    <section id="engine" className="py-24 sm:py-32 sunk">
      <div className="container-grid">
        <div className="doc-columns">
          <SectionLabel index="03">The InThinks Engine</SectionLabel>
          <div>
            <Reveal as="h2" className="section-type max-w-[20ch]">
              From early innovation to industry-ready technology.
            </Reveal>

            <ol className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'var(--rule)' }}>
              {pipeline.map((stage, i) => (
                <li key={stage.key} className="sunk">
                  <Reveal delay={i * 60}>
                    <div className="flex h-full flex-col gap-5 p-6">
                      <div className="flex items-baseline justify-between">
                        <span className="label" style={{ color: 'var(--color-accent)' }}>
                          {stage.index}
                        </span>
                        {i === pipeline.length - 1 && (
                          <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>→</span>
                        )}
                      </div>
                      <h3 className="font-display text-[1.375rem] font-medium tracking-[-0.025em]">
                        {stage.title}
                      </h3>
                      <p className="text-[0.875rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                        {stage.body}
                      </p>
                    </div>
                  </Reveal>
                </li>
              ))}
              <li className="sunk">
                <Reveal delay={pipeline.length * 60}>
                  <div className="flex h-full flex-col justify-between gap-5 p-6">
                    <span className="label" style={{ color: 'var(--color-faint)' }}>OUTCOME</span>
                    <p className="font-display text-[1.375rem] font-medium leading-tight tracking-[-0.025em]" style={{ color: 'var(--color-accent)' }}>
                      Industry-ready technology
                    </p>
                  </div>
                </Reveal>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
