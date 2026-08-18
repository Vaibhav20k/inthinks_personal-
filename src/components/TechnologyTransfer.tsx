import ArrowLink from './primitives/ArrowLink'
import Reveal from './primitives/Reveal'
import SectionLabel from './primitives/SectionLabel'
import { pathways } from '../data/content'

const engagement = [
  'Discover technology',
  'Technical discussion',
  'Evaluation',
  'Commercial structure',
  'License / transfer',
  'Scale',
]

/**
 * Section 07 — Technology Transfer. The page inverts here: the one dark
 * passage in an otherwise paper-white document, marking the commercial turn.
 */
export default function TechnologyTransfer() {
  return (
    <section
      id="transfer"
      className="py-28 sm:py-40"
      style={{ background: 'var(--color-ink-deep)', color: 'var(--color-paper)' }}
    >
      <div className="container-grid">
        <div className="doc-columns">
          <SectionLabel index="07" invert>
            Technology Transfer
          </SectionLabel>

          <div>
            <Reveal>
              <h2 className="statement-type max-w-[15ch]">
                Built here. Scaled with the right partner.
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-10 lg:grid-cols-12">
              <Reveal delay={80} className="lg:col-span-6">
                <p className="body-type text-white/62" style={{ maxWidth: '46ch' }}>
                  Not every invention needs to become a company. InThinks develops
                  technologies and intellectual property that established
                  organisations can license, acquire, integrate or co-develop.
                </p>
              </Reveal>
            </div>

            {/* Four pathways */}
            <ul
              className="mt-16 grid gap-px sm:grid-cols-2"
              style={{ background: 'var(--rule-invert)' }}
            >
              {pathways.map((p, i) => (
                <li key={p.id} style={{ background: 'var(--color-ink-deep)' }}>
                  <Reveal delay={i * 70}>
                    <div className="group h-full px-6 py-9 transition-colors duration-500 hover:bg-white/4">
                      <div className="flex items-baseline gap-3">
                        <span className="label" style={{ color: 'var(--color-accent)' }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-display text-[1.5rem] font-medium tracking-[-0.025em]">
                          {p.name}
                        </h3>
                      </div>
                      <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/58">
                        {p.body}
                      </p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>

            {/* Engagement journey */}
            <Reveal delay={160}>
              <div className="mt-16">
                <p className="label text-white/45">Typical engagement</p>
                <ol className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-3">
                  {engagement.map((step, i) => (
                    <li key={step} className="flex items-center gap-3">
                      <span
                        className="label px-3 py-2"
                        style={{ border: '1px solid var(--rule-invert)' }}
                      >
                        {step.toUpperCase()}
                      </span>
                      {i < engagement.length - 1 && (
                        <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                          →
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-14">
                <ArrowLink href="#partner" invert>
                  Explore Technology Partnerships
                </ArrowLink>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
