import TrlFigure from './TrlFigure'
import SectionLabel from '../primitives/SectionLabel'
import Reveal from '../primitives/Reveal'
import { pipeline } from '../../data/pipeline'
import { useMediaQuery, usePrefersReducedMotion, useScrollProgress } from '../../lib/motion'

/** TRL band readout, driven by the same progress as the figure. */
function TrlBand({ progress, invert = false }: { progress: number; invert?: boolean }) {
  // Entry band is 1–3; the target band 7–9 is only reached at the end.
  const level = Math.min(9, Math.max(1, Math.round(1 + progress * 8)))
  return (
    <div className="flex items-end gap-1">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex-1">
          <div
            className="transition-[height,background-color] duration-500 ease-[var(--ease-out-quint)]"
            style={{
              height: `${10 + n * 2.5}px`,
              background:
                n <= level
                  ? n >= 7
                    ? 'var(--color-accent)'
                    : invert ? 'rgba(255,255,255,0.45)' : 'var(--color-muted)'
                  : invert ? 'rgba(255,255,255,0.12)' : 'var(--rule)',
            }}
          />
          <span
            className="label mt-1.5 block text-center"
            style={{ color: n === level ? 'var(--color-accent)' : 'var(--color-faint)' }}
          >
            {n}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Section 13 — from TRL 1 to industrial readiness.
 *
 * Desktop: a sticky frame where scrolling advances the pipeline and matures a
 * single object from a loose sketch into a qualified industrial part.
 * Touch and reduced-motion: the same seven stages as a vertical timeline with
 * the figure resolved. The sequence is the content; the choreography is the
 * enhancement.
 */
export default function TrlJourney() {
  const isDesktop = useMediaQuery('(width >= 64rem)')
  const reduced = usePrefersReducedMotion()
  const { ref, progress } = useScrollProgress<HTMLDivElement>()
  const scrollDriven = isDesktop && !reduced
  const active = Math.min(pipeline.length - 1, Math.floor(progress * pipeline.length))

  const heading = 'From early technology to industrial readiness.'

  if (!scrollDriven) {
    return (
      <section id="pipeline" className="container-grid py-24 sm:py-32">
        <div className="doc-columns">
          <SectionLabel index="03">TRL Progression</SectionLabel>
          <div>
            <h2 className="section-type max-w-[18ch]">{heading}</h2>

            <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="label" style={{ color: 'var(--color-muted)' }}>ENTRY TRL 1–3</span>
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>→</span>
              <span className="label" style={{ color: 'var(--color-accent)' }}>TARGET TRL 7–9</span>
            </div>

            <div className="mx-auto mt-10 w-full max-w-md">
              <TrlFigure progress={1} />
            </div>

            <ol className="mt-12">
              {pipeline.map((stage) => (
                <li key={stage.key} className="grid grid-cols-[2.5rem_1fr] gap-x-4 py-6" style={{ borderTop: '1px solid var(--rule)' }}>
                  <span className="label pt-1" style={{ color: 'var(--color-accent)' }}>{stage.index}</span>
                  <div>
                    <h3 className="text-xl font-medium tracking-[-0.02em]">{stage.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
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
    <section id="pipeline">
      <div ref={ref} style={{ height: `${(pipeline.length + 1) * 100}vh` }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="container-grid w-full">
            <div className="doc-columns">
              <SectionLabel index="03">TRL Progression</SectionLabel>

              <div>
                <div className="flex flex-wrap items-end justify-between gap-6">
                  <h2 className="section-type max-w-[16ch]">{heading}</h2>
                  <div className="w-full max-w-xs">
                    <TrlBand progress={progress} />
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-12 items-center gap-x-10">
                  <ol className="col-span-6">
                    {pipeline.map((stage, i) => {
                      const isActive = i === active
                      const isPast = i < active
                      return (
                        <li
                          key={stage.key}
                          className="grid grid-cols-[3rem_1fr] gap-x-5 py-2.5 transition-opacity duration-500"
                          style={{
                            borderTop: '1px solid var(--rule)',
                            opacity: isActive ? 1 : isPast ? 0.4 : 0.2,
                          }}
                        >
                          <span
                            className="label pt-2 transition-colors duration-500"
                            style={{ color: isActive ? 'var(--color-accent)' : 'inherit' }}
                          >
                            {stage.index}
                          </span>
                          <div className="py-0.5">
                            <h3
                              className="font-display text-[1.625rem] font-medium leading-tight tracking-[-0.025em] transition-transform duration-500 ease-[var(--ease-out-quint)]"
                              style={{ transform: isActive ? 'translateX(0)' : 'translateX(-4px)' }}
                            >
                              {stage.title}
                            </h3>
                            <div
                              className="grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-out-quint)]"
                              style={{ gridTemplateRows: isActive ? '1fr' : '0fr', opacity: isActive ? 1 : 0 }}
                            >
                              <p className="overflow-hidden text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                                <span className="block pt-1.5">{stage.body}</span>
                              </p>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>

                  <div className="col-span-6 flex justify-center">
                    <div className="w-full max-w-[27rem]">
                      <TrlFigure progress={progress} />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <span className="label shrink-0" style={{ color: 'var(--color-faint)' }}>TRL 1–3</span>
                  <div className="relative h-px flex-1" style={{ background: 'var(--rule)' }}>
                    <div className="absolute inset-y-0 left-0" style={{ width: `${progress * 100}%`, background: 'var(--color-accent)' }} />
                  </div>
                  <span className="label shrink-0" style={{ color: 'var(--color-accent)' }}>TRL 7–9</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The same sequence, available to screen readers without the scroll. */}
      <div className="sr-only">
        <Reveal as="h2">{heading}</Reveal>
        <ol>
          {pipeline.map((stage) => (
            <li key={stage.key}>
              {stage.index} {stage.title}. {stage.body}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
