import ArrowLink from './primitives/ArrowLink'
import Reveal from './primitives/Reveal'
import SectionLabel from './primitives/SectionLabel'
import TechFigure from './TechFigure'
import { innovations, stageOrder } from '../data/innovations'
import type { Domain } from '../data/domains'

const FIGURES: Domain['figure'][] = ['lattice', 'flow', 'stack', 'wave']

/**
 * Section 04 — Selected Innovations.
 *
 * Editorial modules rather than a card grid: each entry spans the full measure
 * with its own asymmetric composition, and every second one flips. Hovering a
 * row lifts its figure and exposes the development metadata.
 */
export default function SelectedInnovations() {
  return (
    <section id="innovations" className="container-grid py-28 sm:py-40">
      <div className="doc-columns">
        <SectionLabel index="04">Selected Innovations</SectionLabel>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <h2 className="section-type max-w-[14ch]">Ideas we've made tangible.</h2>
            </Reveal>
            <Reveal delay={80}>
              <ArrowLink href="#innovations">View All Innovations</ArrowLink>
            </Reveal>
          </div>

          {/* Content status is stated plainly rather than filled with invented projects. */}
          <Reveal delay={120}>
            <p
              className="label mt-10 inline-flex items-center gap-2.5 px-3 py-2 text-graphite"
              style={{ border: '1px solid var(--rule-strong)' }}
            >
              <span aria-hidden="true" className="h-1.5 w-1.5" style={{ background: 'var(--color-accent)' }} />
              Placeholder records — awaiting real project data
            </p>
          </Reveal>

          <ul className="mt-14">
            {innovations.map((project, i) => {
              const flipped = i % 2 === 1
              const stageIndex = stageOrder.indexOf(project.stage)
              return (
                <li key={project.slug} style={{ borderTop: '1px solid var(--rule)' }}>
                  <Reveal delay={i * 60}>
                    <a
                      href={`#${project.slug}`}
                      className="group grid grid-cols-1 items-center gap-6 py-10 lg:grid-cols-12 lg:gap-10"
                      aria-label={`${project.name} — ${project.domain}`}
                    >
                      {/* Figure */}
                      <div
                        className={`lg:col-span-4 ${flipped ? 'lg:order-2 lg:col-start-9' : 'lg:col-start-1'}`}
                      >
                        <div
                          className="relative aspect-[4/3] overflow-hidden transition-colors duration-500"
                          style={{ background: 'var(--color-paper-sunk)' }}
                        >
                          <TechFigure
                            kind={FIGURES[i % FIGURES.length]}
                            seed={i * 7 + 3}
                            className="absolute inset-0 h-full w-full transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
                          />
                          <span
                            className="label absolute left-3 top-3 text-graphite-light"
                            aria-hidden="true"
                          >
                            FIG. {String(i + 1).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      {/* Text */}
                      <div
                        className={`lg:col-span-7 ${flipped ? 'lg:order-1 lg:col-start-1' : 'lg:col-start-6'}`}
                      >
                        <p className="label text-graphite">{project.domain}</p>

                        <h3 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.75rem)] font-medium leading-[1.05] tracking-[-0.025em]">
                          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-[var(--ease-out-quint)] group-hover:bg-[length:100%_1px]">
                            {project.name}
                          </span>
                        </h3>

                        <p className="body-type mt-4 text-graphite" style={{ maxWidth: '46ch' }}>
                          {project.thesis}
                        </p>

                        {/* Development stage as a real scale, not a badge */}
                        <div className="mt-7 flex flex-wrap items-center gap-x-1 gap-y-2">
                          {stageOrder.map((stage, si) => (
                            <span
                              key={stage}
                              className="label px-2 py-1 transition-colors duration-300"
                              style={{
                                color: si === stageIndex ? 'var(--color-accent)' : 'var(--color-graphite-light)',
                                borderBottom:
                                  si === stageIndex
                                    ? '1px solid var(--color-accent)'
                                    : '1px solid var(--rule)',
                              }}
                            >
                              {stage}
                            </span>
                          ))}
                        </div>

                        <dl className="label mt-6 grid gap-x-8 gap-y-2 text-graphite sm:grid-cols-2">
                          <div className="flex gap-2">
                            <dt className="text-graphite-light">IP</dt>
                            <dd>{project.ip}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="text-graphite-light">PARTNERSHIP</dt>
                            <dd>{project.availability}</dd>
                          </div>
                        </dl>
                      </div>
                    </a>
                  </Reveal>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
