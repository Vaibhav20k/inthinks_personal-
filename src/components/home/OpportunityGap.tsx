import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'

const industry = [
  'Operational problems',
  'Material challenges',
  'Cost pressure',
  'Sustainability requirements',
  'Product needs',
  'Process inefficiencies',
]

const ecosystem = [
  'Early discoveries',
  'Prototypes',
  'Research outcomes',
  'Inventions',
  'Student technologies',
  'Emerging IP',
]

/**
 * Section 12 — the gap, drawn literally.
 *
 * Two columns of real things that exist, and the reason they do not meet:
 * nothing sits between them. The centre column is the answer.
 */
export default function OpportunityGap() {
  return (
    <section className="container-grid py-24 sm:py-32">
      <div className="doc-columns">
        <SectionLabel index="02">The Gap</SectionLabel>
        <div>
          <Reveal as="h2" className="statement-type max-w-[20ch]">
            Strong ideas and real industrial problems rarely meet by themselves.
          </Reveal>

          <div className="mt-16 grid gap-px md:grid-cols-3" style={{ background: 'var(--rule)' }}>
            <Reveal>
              <div className="h-full p-7" style={{ background: 'var(--color-paper)' }}>
                <p className="label" style={{ color: 'var(--color-faint)' }}>INDUSTRY</p>
                <ul className="mt-6 space-y-3">
                  {industry.map((item) => (
                    <li key={item} className="text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div
                className="flex h-full flex-col justify-between p-7"
                style={{ background: 'var(--color-graphite)', color: 'var(--color-on-graphite)' }}
              >
                <p className="label" style={{ color: 'var(--color-accent)' }}>INTHINKS</p>
                <div className="py-10">
                  <p className="font-display text-[1.5rem] font-medium leading-snug tracking-[-0.025em]">
                    Evaluation
                    <br />
                    R&amp;D
                    <br />
                    Technology intelligence
                  </p>
                </div>
                <p className="label" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  CLOSES THE GAP
                </p>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div className="h-full p-7" style={{ background: 'var(--color-paper)' }}>
                <p className="label" style={{ color: 'var(--color-faint)' }}>INNOVATION ECOSYSTEM</p>
                <ul className="mt-6 space-y-3">
                  {ecosystem.map((item) => (
                    <li key={item} className="text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <Reveal delay={220}>
            <p className="section-type mt-14 max-w-[18ch]">InThinks exists to close this gap.</p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
