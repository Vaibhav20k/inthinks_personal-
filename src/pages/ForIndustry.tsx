import Button from '../components/primitives/Button'
import Reveal from '../components/primitives/Reveal'
import SectionLabel from '../components/primitives/SectionLabel'
import PageHero from '../components/layout/PageHero'
import { confidentiality, industryJourney } from '../data/pipeline'

export default function ForIndustry() {
  return (
    <>
      <PageHero
        eyebrow="For Industry"
        title="Bring us the problem."
        lede="InThinks identifies, evaluates and develops technology opportunities around real industrial challenges. You do not need to know which technology you want — you need to describe what is not working."
      >
        <div className="flex flex-wrap gap-3">
          <Button to="/submit-challenge">Submit an Industry Challenge</Button>
          <Button to="/technologies" variant="outline">Explore Technologies</Button>
        </div>
      </PageHero>

      <section className="container-grid py-20 sm:py-28">
        <div className="doc-columns">
          <SectionLabel index="01">The Engagement</SectionLabel>
          <div>
            <Reveal as="h2" className="section-type max-w-[18ch]">
              What happens after you submit.
            </Reveal>
            <ol className="mt-12">
              {industryJourney.map((step, i) => (
                <li key={step.index} style={{ borderTop: '1px solid var(--rule)' }}>
                  <Reveal delay={i * 55}>
                    <div className="grid gap-x-8 gap-y-2 py-7 md:grid-cols-12">
                      <span className="label md:col-span-1" style={{ color: 'var(--color-accent)' }}>{step.index}</span>
                      <h3 className="font-display text-[1.375rem] font-medium tracking-[-0.025em] md:col-span-4">
                        {step.title}
                      </h3>
                      <p className="text-[0.9375rem] leading-relaxed md:col-span-7" style={{ color: 'var(--color-muted)' }}>
                        {step.body}
                      </p>
                    </div>
                  </Reveal>
                </li>
              ))}
              <li style={{ borderTop: '1px solid var(--rule)' }} />
            </ol>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28" style={{ background: 'var(--color-paper-sunk)' }}>
        <div className="container-grid">
          <div className="doc-columns">
            <SectionLabel index="02">Confidentiality</SectionLabel>
            <div>
              <Reveal as="h2" className="section-type max-w-[20ch]">
                Your problem statement is commercially sensitive. We treat it that way.
              </Reveal>
              <ul className="mt-10 grid gap-x-10 gap-y-4 sm:grid-cols-2">
                {confidentiality[1].points.map((point) => (
                  <li key={point} className="flex items-baseline gap-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                    <span aria-hidden="true" className="h-px w-3 shrink-0" style={{ background: 'var(--color-accent)' }} />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Button to="/submit-challenge">Submit an Industry Challenge</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
