import Button from '../components/primitives/Button'
import Reveal from '../components/primitives/Reveal'
import SectionLabel from '../components/primitives/SectionLabel'
import PageHero from '../components/layout/PageHero'
import Notice from '../components/primitives/Notice'
import { confidentiality } from '../data/pipeline'

const stages = [
  { stage: 'At submission', shared: 'Nothing leaves the evaluation team.' },
  { stage: 'During evaluation', shared: 'Technical content only, within InThinks.' },
  { stage: 'On a candidate match', shared: 'An anonymised technology profile. No identity, no source.' },
  { stage: 'In technical discussion', shared: 'Detail required for that discussion, under agreement.' },
  { stage: 'At commercial structuring', shared: 'Whatever both parties have agreed in writing.' },
]

export default function ConfidentialityPage() {
  return (
    <>
      <PageHero
        eyebrow="Confidentiality"
        title="Innovation requires discretion."
        lede="Both sides of this platform hand over something sensitive — an unprotected invention, or a problem a company would rather its competitors did not know about. Disclosure is therefore progressive: only what a stage requires, at that stage."
      >
        <Notice>
          This page describes how InThinks intends to operate. It is not a legal
          agreement, and it does not claim protections beyond those in a signed contract.
        </Notice>
      </PageHero>

      <section className="container-grid py-20 sm:py-28">
        <div className="doc-columns">
          <SectionLabel index="01">Commitments</SectionLabel>
          <div className="grid gap-10 md:grid-cols-3">
            {confidentiality.map((block, i) => (
              <Reveal key={block.audience} delay={i * 80}>
                <div className="pt-5" style={{ borderTop: '1px solid var(--rule-strong)' }}>
                  <h2 className="label" style={{ color: 'var(--color-accent)' }}>{block.audience.toUpperCase()}</h2>
                  <ul className="mt-5 space-y-3">
                    {block.points.map((p) => (
                      <li key={p} className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>{p}</li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-grid py-20 sm:py-28">
        <div className="doc-columns">
          <SectionLabel index="02">Progressive Disclosure</SectionLabel>
          <div>
            <Reveal as="h2" className="section-type max-w-[20ch]">
              What is shared, and when.
            </Reveal>
            <ul className="mt-12">
              {stages.map((s, i) => (
                <li key={s.stage} style={{ borderTop: '1px solid var(--rule)' }}>
                  <Reveal delay={i * 60}>
                    <div className="grid gap-x-8 gap-y-2 py-6 md:grid-cols-12">
                      <span className="label md:col-span-1" style={{ color: 'var(--color-accent)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <h3 className="font-display text-[1.25rem] font-medium tracking-[-0.02em] md:col-span-4">{s.stage}</h3>
                      <p className="text-[0.9375rem] leading-relaxed md:col-span-7" style={{ color: 'var(--color-muted)' }}>{s.shared}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
              <li style={{ borderTop: '1px solid var(--rule)' }} />
            </ul>
            <div className="mt-12 flex flex-wrap gap-3">
              <Button to="/submit-innovation">Submit an Innovation</Button>
              <Button to="/submit-challenge" variant="outline">Submit a Challenge</Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
