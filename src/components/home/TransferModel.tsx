import ArrowLink from '../primitives/ArrowLink'
import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'
import { TRANSFER_TERMS_NOTE, transferStructures } from '../../data/pipeline'

/** Section 10 — the commercial structures. Structures only, never terms. */
export default function TransferModel() {
  return (
    <section id="transfer" className="container-grid py-24 sm:py-32">
      <div className="doc-columns">
        <SectionLabel index="10">Technology Transfer</SectionLabel>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal as="h2" className="section-type max-w-[18ch]">
              Developed for transfer. Prepared for industry.
            </Reveal>
            <Reveal delay={80}>
              <ArrowLink to="/technology-transfer">Transfer structures in detail</ArrowLink>
            </Reveal>
          </div>

          <ul className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: 'var(--rule)' }}>
            {transferStructures.map((structure, i) => (
              <li key={structure.title} style={{ background: 'var(--color-paper)' }}>
                <Reveal delay={i * 60}>
                  <div className="flex h-full flex-col gap-4 p-6">
                    <span className="label" style={{ color: 'var(--color-accent)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-display text-[1.25rem] font-medium tracking-[-0.025em]">
                      {structure.title}
                    </h3>
                    <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                      {structure.body}
                    </p>
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
  )
}
