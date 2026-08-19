import Button from '../components/primitives/Button'
import Reveal from '../components/primitives/Reveal'
import SectionLabel from '../components/primitives/SectionLabel'
import PageHero from '../components/layout/PageHero'
import { TRANSFER_TERMS_NOTE, transferStructures } from '../data/pipeline'

const journey = [
  'Discover technology',
  'Technical discussion',
  'Evaluation',
  'Commercial structure',
  'Licence / transfer',
  'Scale',
]

export default function TechnologyTransfer() {
  return (
    <>
      <PageHero
        eyebrow="Technology Transfer"
        title="Developed for transfer. Prepared for industry."
        lede="InThinks does not stop at identifying ideas. Selected technologies are developed toward commercial readiness, then transferred to the organisation best placed to deploy them."
      >
        <Button href="mailto:hello@inthinks.com?subject=Technology%20partnership">
          Discuss a Technology
        </Button>
      </PageHero>

      <section className="container-grid py-20 sm:py-28">
        <div className="doc-columns">
          <SectionLabel index="01">Structures</SectionLabel>
          <div>
            <ul className="grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: 'var(--rule)' }}>
              {transferStructures.map((s, i) => (
                <li key={s.title} style={{ background: 'var(--color-paper)' }}>
                  <Reveal delay={i * 60}>
                    <div className="flex h-full flex-col gap-4 p-6">
                      <span className="label" style={{ color: 'var(--color-accent)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <h2 className="font-display text-[1.25rem] font-medium tracking-[-0.025em]">{s.title}</h2>
                      <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>{s.body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
            <Reveal delay={200}>
              <p className="body-type measure-prose mt-10" style={{ color: 'var(--color-muted)' }}>
                {TRANSFER_TERMS_NOTE}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28" style={{ background: 'var(--color-graphite)', color: 'var(--color-on-graphite)' }}>
        <div className="container-grid">
          <div className="doc-columns">
            <SectionLabel index="02" invert>Engagement</SectionLabel>
            <div>
              <Reveal as="h2" className="section-type max-w-[18ch]">
                A typical route from interest to deployment.
              </Reveal>
              <ol className="mt-12 flex flex-wrap items-center gap-x-3 gap-y-3">
                {journey.map((step, i) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="label px-3 py-2" style={{ border: '1px solid var(--rule-invert-strong)' }}>
                      {step.toUpperCase()}
                    </span>
                    {i < journey.length - 1 && (
                      <span aria-hidden="true" style={{ color: 'var(--color-accent-light)' }}>→</span>
                    )}
                  </li>
                ))}
              </ol>
              <div className="mt-12 flex flex-wrap gap-3">
                <Button href="mailto:hello@inthinks.com?subject=Technology%20partnership" variant="invert">
                  Discuss a Technology
                </Button>
                <Button to="/technologies" variant="invert-outline">Explore Technologies</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
