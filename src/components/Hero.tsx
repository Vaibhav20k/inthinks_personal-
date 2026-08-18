import HeroThoughtSystem from './HeroThoughtSystem'
import Button from './primitives/Button'
import { site } from '../data/site'

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pb-14 pt-32 sm:pb-20"
    >
      <HeroThoughtSystem />

      {/* Keeps typography dominant over the field behind it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(75% 55% at 22% 72%, var(--color-paper) 32%, color-mix(in oklab, var(--color-paper) 55%, transparent) 68%, transparent 100%)',
        }}
      />

      <div className="container-grid relative">
        <div className="label mb-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-graphite">
          <span className="text-ink">{site.name}</span>
          <span aria-hidden="true" className="h-px w-8" style={{ background: 'var(--rule-strong)' }} />
          <span>{site.descriptor}</span>
          <span aria-hidden="true" className="h-px w-8" style={{ background: 'var(--rule-strong)' }} />
          <span>{site.locus}</span>
        </div>

        <h1 className="hero-type max-w-[15ch]">
          Ideas become valuable when they become&nbsp;real.
        </h1>

        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-end">
          <p className="body-type text-graphite lg:col-span-6 lg:col-start-1" style={{ maxWidth: '52ch' }}>
            InThinks is an ideation and innovation studio that turns early-stage
            thinking into technologies, products and intellectual property ready
            for the world.
          </p>

          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:col-start-8 lg:justify-end">
            <Button href="#innovations">Explore Innovations</Button>
            <Button href="#partner" variant="outline">
              Partner With InThinks
            </Button>
          </div>
        </div>

        <div
          className="label mt-14 flex items-center justify-between pt-4 text-graphite-light"
          style={{ borderTop: '1px solid var(--rule)' }}
        >
          <span>Thought → Structure → Invention</span>
          <span aria-hidden="true">Scroll</span>
        </div>
      </div>
    </section>
  )
}
