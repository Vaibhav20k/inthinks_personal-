import ArrowLink from '../primitives/ArrowLink'
import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'
import { confidentiality } from '../../data/pipeline'

/** Section 11 — controlled disclosure, stated per audience. */
export default function ConfidentialityStrip() {
  return (
    <section id="confidentiality" className="py-24 sm:py-32 sunk">
      <div className="container-grid">
        <div className="doc-columns">
          <SectionLabel index="11">Confidentiality</SectionLabel>
          <div>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <Reveal as="h2" className="section-type max-w-[16ch]">
                Innovation requires discretion.
              </Reveal>
              <Reveal delay={80}>
                <ArrowLink to="/confidentiality">How disclosure is controlled</ArrowLink>
              </Reveal>
            </div>

            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {confidentiality.map((block, i) => (
                <Reveal key={block.audience} delay={i * 80}>
                  <div style={{ borderTop: '1px solid var(--rule-strong)' }} className="pt-5">
                    <h3 className="label" style={{ color: 'var(--color-accent)' }}>
                      {block.audience.toUpperCase()}
                    </h3>
                    <ul className="mt-5 space-y-3">
                      {block.points.map((point) => (
                        <li key={point} className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
