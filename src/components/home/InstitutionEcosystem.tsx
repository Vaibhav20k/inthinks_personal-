import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'
import { INSTITUTION_DISCLAIMER, institutions } from '../../data/pipeline'

/**
 * Section 14 — where the technologies come from.
 *
 * Set typographically, with no logos and no implied partnership. The
 * disclaimer sits inside the section rather than in a footnote, because the
 * distinction between "talent originates here" and "these institutions endorse
 * us" is the whole point of the section.
 */
export default function InstitutionEcosystem() {
  return (
    <section className="container-grid py-24 sm:py-32">
      <div className="doc-columns">
        <SectionLabel index="04">Innovation Source</SectionLabel>
        <div>
          <Reveal as="h2" className="section-type max-w-[18ch]">
            Emerging technology starts with emerging talent.
          </Reveal>

          <Reveal delay={80}>
            <p className="body-type measure-prose mt-8" style={{ color: 'var(--color-muted)' }}>
              InThinks evaluates innovations originating from students, researchers
              and technical teams across leading academic and research ecosystems.
            </p>
          </Reveal>

          <ul className="mt-14">
            {institutions.map((name, i) => (
              <li key={name} style={{ borderTop: '1px solid var(--rule)' }}>
                <Reveal delay={i * 55}>
                  <div className="flex items-baseline justify-between gap-6 py-4">
                    <span className="font-display text-[clamp(1.35rem,2.6vw,2.125rem)] font-medium tracking-[-0.025em]">
                      {name}
                    </span>
                    <span className="label" style={{ color: 'var(--color-faint)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </Reveal>
              </li>
            ))}
            <li style={{ borderTop: '1px solid var(--rule)' }} />
          </ul>

          <Reveal delay={120}>
            <p
              className="mt-8 text-[0.8125rem] leading-relaxed"
              style={{ color: 'var(--color-faint)', maxWidth: '62ch' }}
            >
              {INSTITUTION_DISCLAIMER}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
