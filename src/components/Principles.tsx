import Reveal from './primitives/Reveal'
import SectionLabel from './primitives/SectionLabel'
import { principles } from '../data/content'

/** Section 08 — How We Think. Philosophical, short, generously set. */
export default function Principles() {
  return (
    <section id="principles" className="container-grid py-28 sm:py-40">
      <div className="doc-columns">
        <SectionLabel index="08">How We Think</SectionLabel>

        <div>
          <Reveal>
            <h2 className="statement-type max-w-[13ch]">
              Curiosity is a development strategy.
            </h2>
          </Reveal>

          <dl className="mt-16 grid gap-x-12 gap-y-0 md:grid-cols-2">
            {principles.map((p, i) => (
              <div key={p.title} style={{ borderTop: '1px solid var(--rule)' }}>
                <Reveal delay={i * 70}>
                  <div className="py-8">
                    <dt className="label" style={{ color: 'var(--color-accent)' }}>
                      {p.title.toUpperCase()}
                    </dt>
                    <dd className="mt-4 font-display text-[clamp(1.25rem,2vw,1.625rem)] font-medium leading-snug tracking-[-0.02em]">
                      {p.body}
                    </dd>
                  </div>
                </Reveal>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
