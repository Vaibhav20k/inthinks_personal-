import Button from '../primitives/Button'
import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'
import { challengeDimensions } from '../../data/pipeline'

/**
 * Section 08 — how a submitted problem becomes searchable.
 *
 * Deliberately understates the AI: the visible claim is that a challenge is
 * structured across technical dimensions and that a human qualifies the
 * result. No match percentages, no algorithm, no "AI-powered" framing.
 */
export default function IndustryChallengeModel() {
  const flow = [
    { label: 'Industry challenge', note: 'Submitted confidentially' },
    { label: 'Structured', note: 'Broken into technical dimensions' },
    { label: 'Technology candidates', note: 'Compared against the portfolio' },
    { label: 'Expert review', note: 'Qualified by our technical team' },
    { label: 'Qualified matches', note: 'Presented with what is still unknown' },
  ]

  return (
    <section
      id="challenge-model"
      className="py-24 sm:py-32"
      style={{ background: 'var(--color-graphite)', color: 'var(--color-paper)' }}
    >
      <div className="container-grid">
        <div className="doc-columns">
          <SectionLabel index="08" invert>Industry Challenge Model</SectionLabel>
          <div>
            <Reveal as="h2" className="statement-type max-w-[14ch]">
              Bring us the problem.
            </Reveal>

            <Reveal delay={80}>
              <p className="body-type measure-prose mt-8" style={{ color: 'rgba(255,255,255,0.66)' }}>
                Better technology discovery starts with a better understanding of the
                problem. InThinks structures each challenge across technical
                parameters, operating conditions, desired outcomes and constraints,
                then identifies potentially relevant technologies from its portfolio.
              </p>
            </Reveal>

            {/* The dimensions a challenge is decomposed into */}
            <Reveal delay={130}>
              <ul className="mt-12 flex flex-wrap gap-2">
                {challengeDimensions.map((d) => (
                  <li
                    key={d}
                    className="label px-3 py-2"
                    style={{ border: '1px solid var(--rule-invert-strong)', color: 'rgba(255,255,255,0.72)' }}
                  >
                    {d.toUpperCase()}
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* The flow, ending on a human */}
            <ol className="mt-14 grid gap-px lg:grid-cols-5" style={{ background: 'var(--rule-invert)' }}>
              {flow.map((step, i) => {
                const last = i === flow.length - 1
                return (
                  <li key={step.label} style={{ background: 'var(--color-graphite)' }}>
                    <Reveal delay={i * 70}>
                      <div className="flex h-full flex-col justify-between gap-6 p-5">
                        <span
                          className="label"
                          style={{ color: last ? 'var(--color-accent-light)' : 'rgba(255,255,255,0.4)' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <p
                            className="font-display text-[1.0625rem] font-medium leading-snug tracking-[-0.02em]"
                            style={{ color: last ? 'var(--color-accent-light)' : 'var(--color-paper)' }}
                          >
                            {step.label}
                          </p>
                          <p className="mt-2 text-[0.8125rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {step.note}
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  </li>
                )
              })}
            </ol>

            <Reveal delay={200}>
              <p className="label mt-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
                NO TECHNOLOGY IS PRESENTED WITHOUT HUMAN TECHNICAL REVIEW
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-12 flex flex-wrap gap-3">
                <Button to="/submit-challenge" variant="invert">Submit an Industry Challenge</Button>
                <Button to="/for-industry" variant="invert-outline">How it works for industry</Button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
