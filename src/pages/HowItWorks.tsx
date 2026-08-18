import Button from '../components/primitives/Button'
import Reveal from '../components/primitives/Reveal'
import SectionLabel from '../components/primitives/SectionLabel'
import PageHero from '../components/layout/PageHero'
import TrlScale from '../components/primitives/TrlScale'
import { challengeDimensions, pipeline, valueGap } from '../data/pipeline'

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="How It Works"
        title="Two intakes, one pipeline."
        lede="Innovations arrive from one side and industrial challenges from the other. Everything in between — evaluation, acquisition, development, validation and matching — is the same pipeline."
      />

      <section className="container-grid py-20 sm:py-28">
        <div className="doc-columns">
          <SectionLabel index="01">The Pipeline</SectionLabel>
          <div>
            <ol>
              {pipeline.map((stage, i) => (
                <li key={stage.key} style={{ borderTop: '1px solid var(--rule)' }}>
                  <Reveal delay={i * 50}>
                    <div className="grid gap-x-8 gap-y-2 py-7 md:grid-cols-12">
                      <span className="label md:col-span-1" style={{ color: 'var(--color-accent)' }}>{stage.index}</span>
                      <h2 className="font-display text-[1.5rem] font-medium tracking-[-0.025em] md:col-span-4">{stage.title}</h2>
                      <p className="text-[0.9375rem] leading-relaxed md:col-span-7" style={{ color: 'var(--color-muted)' }}>{stage.body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
              <li style={{ borderTop: '1px solid var(--rule)' }} />
            </ol>
          </div>
        </div>
      </section>

      <section className="container-grid py-20 sm:py-28">
        <div className="doc-columns">
          <SectionLabel index="02">TRL Advancement</SectionLabel>
          <div>
            <Reveal as="h2" className="section-type max-w-[18ch]">
              What advancing a readiness level actually involves.
            </Reveal>
            <Reveal delay={80}>
              <div className="mt-12">
                <TrlScale entry={2} current={5} target={8} />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <p className="body-type measure-prose mt-10" style={{ color: 'var(--color-muted)' }}>
                The shaded span is the work. Our objective is to advance suitable
                technologies toward higher readiness levels, potentially up to TRL 7–9,
                depending on the technology, the evidence and the application. Not every
                technology gets there, and we do not claim otherwise.
              </p>
            </Reveal>
            <ul className="mt-10 grid gap-x-10 gap-y-3 sm:grid-cols-2">
              {valueGap.middle.points.map((p) => (
                <li key={p} className="flex items-baseline gap-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                  <span aria-hidden="true" className="h-px w-3 shrink-0" style={{ background: 'var(--color-accent)' }} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28" style={{ background: 'var(--color-paper-sunk)' }}>
        <div className="container-grid">
          <div className="doc-columns">
            <SectionLabel index="03">Matching</SectionLabel>
            <div>
              <Reveal as="h2" className="section-type max-w-[22ch]">
                Better technology discovery starts with a better understanding of the problem.
              </Reveal>
              <Reveal delay={80}>
                <p className="body-type measure-prose mt-8" style={{ color: 'var(--color-muted)' }}>
                  A submitted challenge is decomposed across the dimensions below and
                  compared against the portfolio. What comes back is a shortlist, not an
                  answer — every candidate is reviewed by our technical team before it
                  reaches anyone, and the review states what is still unproven.
                </p>
              </Reveal>
              <ul className="mt-10 flex flex-wrap gap-2">
                {challengeDimensions.map((d) => (
                  <li key={d} className="label px-3 py-2" style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                    {d.toUpperCase()}
                  </li>
                ))}
              </ul>
              <p className="label mt-8" style={{ color: 'var(--color-accent)' }}>
                NO MATCH IS PRESENTED WITHOUT HUMAN TECHNICAL REVIEW
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button to="/submit-challenge">Submit a Challenge</Button>
                <Button to="/submit-innovation" variant="outline">Submit an Innovation</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
