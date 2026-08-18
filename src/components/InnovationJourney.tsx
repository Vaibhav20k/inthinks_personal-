import JourneyFigure from './JourneyFigure'
import Reveal from './primitives/Reveal'
import SectionLabel from './primitives/SectionLabel'
import { journey } from '../data/journey'
import { useMediaQuery, usePrefersReducedMotion, useScrollProgress } from '../lib/motion'

/**
 * Section 03 — From Thought to Technology.
 *
 * Desktop: a sticky frame where scrolling advances one evolving graphic
 * through all seven stages. Mobile and reduced-motion: the same seven stages
 * as a vertical timeline, with the figure resolved — the sequence is the
 * content, the scroll choreography is an enhancement.
 */
export default function InnovationJourney() {
  const isDesktop = useMediaQuery('(width >= 64rem)')
  const reduced = usePrefersReducedMotion()
  const { ref, progress } = useScrollProgress<HTMLDivElement>()

  const scrollDriven = isDesktop && !reduced
  const active = Math.min(journey.length - 1, Math.floor(progress * journey.length))

  if (!scrollDriven) {
    return (
      <section id="journey" className="container-grid py-24 sm:py-32">
        <div className="doc-columns">
          <SectionLabel index="03">From Thought to Technology</SectionLabel>
          <div>
            <h2 className="section-type max-w-[16ch]">
              Seven stages between a question and a technology.
            </h2>

            <div className="mx-auto mt-12 w-full max-w-sm">
              <JourneyFigure progress={1} />
            </div>

            <ol className="mt-14">
              {journey.map((stage) => (
                <li
                  key={stage.id}
                  className="grid grid-cols-[2.5rem_1fr] gap-x-4 py-6"
                  style={{ borderTop: '1px solid var(--rule)' }}
                >
                  <span className="label pt-1" style={{ color: 'var(--color-accent)' }}>
                    {stage.index}
                  </span>
                  <div>
                    <h3 className="text-xl font-medium tracking-[-0.02em]">{stage.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-graphite">
                      {stage.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="journey">
      {/* Scroll runway: one viewport per stage, plus one to read the last. */}
      <div ref={ref} style={{ height: `${(journey.length + 1) * 100}vh` }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="container-grid w-full">
            <div className="doc-columns">
              <SectionLabel index="03">From Thought to Technology</SectionLabel>

              <div className="grid grid-cols-12 items-center gap-x-10">
                {/* Stage list */}
                <ol className="col-span-6">
                  {journey.map((stage, i) => {
                    const isActive = i === active
                    const isPast = i < active
                    return (
                      <li
                        key={stage.id}
                        className="grid grid-cols-[3rem_1fr] gap-x-5 py-3 transition-opacity duration-500"
                        style={{
                          borderTop: '1px solid var(--rule)',
                          opacity: isActive ? 1 : isPast ? 0.42 : 0.22,
                        }}
                      >
                        <span
                          className="label pt-2 transition-colors duration-500"
                          style={{ color: isActive ? 'var(--color-accent)' : 'inherit' }}
                        >
                          {stage.index}
                        </span>
                        <div className="py-1">
                          <h3
                            className="font-display text-[1.75rem] font-medium leading-tight tracking-[-0.025em] transition-transform duration-500 ease-[var(--ease-out-quint)]"
                            style={{ transform: isActive ? 'translateX(0)' : 'translateX(-4px)' }}
                          >
                            {stage.title}
                          </h3>
                          <div
                            className="grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-out-quint)]"
                            style={{
                              gridTemplateRows: isActive ? '1fr' : '0fr',
                              opacity: isActive ? 1 : 0,
                            }}
                          >
                            <p className="overflow-hidden text-[0.9375rem] leading-relaxed text-graphite">
                              <span className="block pt-1.5">{stage.body}</span>
                            </p>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>

                {/* The evolving graphic */}
                <div className="col-span-6 flex justify-center">
                  <div className="w-full max-w-[26rem]">
                    <JourneyFigure progress={progress} />
                  </div>
                </div>
              </div>

              {/* Progress rule */}
              <div className="col-span-full mt-10">
                <div className="relative h-px w-full" style={{ background: 'var(--rule)' }}>
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${progress * 100}%`,
                      background: 'var(--color-accent)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen-reader / no-JS ordered list of the same content */}
      <div className="sr-only">
        <Reveal as="h2">From thought to technology</Reveal>
        <ol>
          {journey.map((stage) => (
            <li key={stage.id}>
              {stage.index} {stage.title}. {stage.body}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
