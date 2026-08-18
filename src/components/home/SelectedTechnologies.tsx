import ArrowLink from '../primitives/ArrowLink'
import Notice from '../primitives/Notice'
import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'
import TechnologyRow from '../tech/TechnologyRow'
import { technologies } from '../../data/technologies'

/** Section 05 — a slice of the portfolio, anonymised. */
export default function SelectedTechnologies() {
  const shown = technologies.slice(0, 3)

  return (
    <section id="technologies" className="container-grid py-24 sm:py-32">
      <div className="doc-columns">
        <SectionLabel index="05">Technology Explorer</SectionLabel>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal as="h2" className="section-type max-w-[18ch]">
              Technologies being prepared for what&rsquo;s next.
            </Reveal>
            <Reveal delay={80}>
              <ArrowLink to="/technologies">Open the Technology Explorer</ArrowLink>
            </Reveal>
          </div>

          <Reveal delay={110}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Notice>Placeholder records — awaiting real portfolio data</Notice>
              <Notice>Profiles are anonymised — innovator identity is never published</Notice>
            </div>
          </Reveal>

          <ul className="mt-10">
            {shown.map((tech, i) => (
              <TechnologyRow key={tech.slug} technology={tech} index={i} />
            ))}
            <li style={{ borderTop: '1px solid var(--rule)' }} />
          </ul>
        </div>
      </div>
    </section>
  )
}
