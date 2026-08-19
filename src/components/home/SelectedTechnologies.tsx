import { useEffect, useState } from 'react'
import ArrowLink from '../primitives/ArrowLink'
import Notice from '../primitives/Notice'
import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'
import TechnologyRow from '../tech/TechnologyRow'
import { fetchTechnologies } from '../../data/portfolio'
import type { Technology } from '../../data/models'

/** Section 05 — a slice of the portfolio, anonymised. */
export default function SelectedTechnologies() {
  const [technologies, setTechnologies] = useState<Technology[] | null>(null)

  useEffect(() => {
    let live = true
    fetchTechnologies()
      .then((items) => { if (live) setTechnologies(items) })
      .catch(() => { if (live) setTechnologies([]) })
    return () => { live = false }
  }, [])

  const shown = (technologies ?? []).slice(0, 3)

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
              <Notice>Profiles are anonymised — innovator identity is never published</Notice>
            </div>
          </Reveal>

          {technologies !== null && shown.length === 0 ? (
            <p className="body-type measure-prose mt-10" style={{ color: 'var(--color-muted)' }}>
              No technologies are published yet. A profile appears here once InThinks
              holds development rights and has written one.
            </p>
          ) : (
            <ul className="mt-10">
              {shown.map((tech, i) => (
                <TechnologyRow key={tech.slug} technology={tech} index={i} />
              ))}
              <li style={{ borderTop: '1px solid var(--rule)' }} />
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
