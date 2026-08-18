import Button from './primitives/Button'
import Reveal from './primitives/Reveal'
import SectionLabel from './primitives/SectionLabel'
import { site } from '../data/site'
import { usePointerField, usePrefersReducedMotion } from '../lib/motion'

/**
 * Section 11 — the closing ask. The field of points from the hero returns
 * here, still responding to the pointer: the page ends where it started,
 * with an unresolved question.
 */
export default function PartnerCTA() {
  const reduced = usePrefersReducedMotion()
  const { ref, point } = usePointerField<HTMLDivElement>()

  return (
    <section id="partner" ref={ref} className="relative overflow-hidden">
      <div className="container-grid py-28 sm:py-40">
        {/* Pointer-reactive figure — a single mark that leans toward the reader */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            opacity: point.active && !reduced ? 1 : 0.35,
            transition: 'opacity 600ms var(--ease-out-quint)',
          }}
        >
          <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
            {Array.from({ length: 9 }, (_, row) =>
              Array.from({ length: 18 }, (_, col) => {
                const x = 40 + col * 66
                const y = 40 + row * 66
                const dx = reduced ? 0 : point.x * (6 + (row % 3) * 4)
                const dy = reduced ? 0 : point.y * (6 + (col % 3) * 4)
                return (
                  <circle
                    key={`${row}-${col}`}
                    cx={x + dx}
                    cy={y + dy}
                    r="1.6"
                    fill="var(--color-ink)"
                    opacity="0.16"
                    style={{ transition: 'cx 700ms var(--ease-out-quint), cy 700ms var(--ease-out-quint)' }}
                  />
                )
              }),
            )}
          </svg>
        </div>

        <div className="doc-columns">
          <SectionLabel index="11">Partner</SectionLabel>

          <div>
            <Reveal>
              <h2 className="statement-type max-w-[16ch]">
                Have a problem worth thinking differently about?
              </h2>
            </Reveal>

            <Reveal delay={90}>
              <p className="body-type mt-8 text-graphite" style={{ maxWidth: '46ch' }}>
                We work with organisations interested in licensing technologies,
                exploring new ideas and building what doesn't exist yet.
              </p>
            </Reveal>

            <Reveal delay={150}>
              <div className="mt-12 flex flex-wrap gap-3">
                <Button href={`mailto:${site.email}`}>Start a Conversation</Button>
                <Button href="#innovations" variant="outline">
                  Explore Innovations
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
