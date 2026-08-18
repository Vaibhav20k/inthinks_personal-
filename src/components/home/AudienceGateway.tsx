import { Link } from 'react-router-dom'
import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'

const gates = [
  {
    key: 'industry',
    eyebrow: 'Industry',
    headline: 'I have a problem to solve.',
    body: 'Submit a technical, operational, material or product challenge. InThinks evaluates the requirement and identifies relevant technology opportunities from its innovation pipeline.',
    cta: 'Submit an Industry Challenge',
    to: '/submit-challenge',
    secondary: { label: 'How it works for industry', to: '/for-industry' },
  },
  {
    key: 'innovators',
    eyebrow: 'Innovators',
    headline: 'I have an innovation.',
    body: 'Submit an early-stage technology, prototype or invention for evaluation and potential development through the InThinks technology pipeline.',
    cta: 'Submit Your Innovation',
    to: '/submit-innovation',
    secondary: { label: 'What we look for', to: '/for-innovators' },
  },
]

/**
 * Section 11 — two gateways, not two cards.
 *
 * Asymmetric: the panels split 7/5 and invert on hover, so choosing a side
 * feels like walking through a door rather than clicking a tile.
 */
export default function AudienceGateway() {
  return (
    <section className="container-grid py-24 sm:py-32">
      <div className="doc-columns">
        <SectionLabel index="01">Entry Points</SectionLabel>
        <div>
          <Reveal as="h2" className="section-type max-w-[16ch]">
            What brings you to InThinks?
          </Reveal>

          <div className="mt-12 grid gap-px lg:grid-cols-12" style={{ background: 'var(--rule)' }}>
            {gates.map((gate, i) => (
              <div
                key={gate.key}
                className={i === 0 ? 'lg:col-span-7' : 'lg:col-span-5'}
                style={{ background: 'var(--color-paper)' }}
              >
                <Reveal delay={i * 90}>
                  <div className="group relative flex h-full flex-col justify-between gap-10 p-8 transition-colors duration-500 hover:bg-[var(--color-paper-sunk)] sm:p-10">
                    <div>
                      <p className="label" style={{ color: 'var(--color-accent)' }}>
                        {gate.eyebrow.toUpperCase()}
                      </p>
                      <h3 className="mt-5 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.05] tracking-[-0.025em]">
                        {gate.headline}
                      </h3>
                      <p className="mt-5 text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)', maxWidth: '46ch' }}>
                        {gate.body}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                      <Link
                        to={gate.to}
                        className="tap inline-flex items-baseline gap-2.5 text-[0.9375rem] font-medium"
                      >
                        <span className="border-b border-current pb-0.5">{gate.cta}</span>
                        <span
                          aria-hidden="true"
                          className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          →
                        </span>
                      </Link>
                      <Link
                        to={gate.secondary.to}
                        className="tap label transition-colors duration-300 hover:text-ink"
                        style={{ color: 'var(--color-faint)' }}
                      >
                        {gate.secondary.label.toUpperCase()}
                      </Link>
                    </div>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
