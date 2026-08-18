import Matchfield from './Matchfield'
import Button from '../primitives/Button'
import ArrowLink from '../primitives/ArrowLink'
import { site } from '../../data/site'

export default function Hero() {
  return (
    <section className="container-grid pb-16 pt-32 sm:pt-40">
      <div className="label flex flex-wrap items-center gap-x-5 gap-y-2" style={{ color: 'var(--color-muted)' }}>
        <span style={{ color: 'var(--color-ink)' }}>{site.wordmark}</span>
        <span aria-hidden="true" className="h-px w-8" style={{ background: 'var(--rule-strong)' }} />
        <span>Technology development &amp; transfer</span>
        <span aria-hidden="true" className="h-px w-8" style={{ background: 'var(--rule-strong)' }} />
        <span>India / Global</span>
      </div>

      <h1 className="hero-type mt-9 max-w-[15ch]">
        Where emerging innovation meets industrial demand.
      </h1>

      <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-end">
        <p className="body-type lg:col-span-6" style={{ color: 'var(--color-muted)', maxWidth: '62ch' }}>
          InThinks identifies promising early-stage technologies, develops selected
          innovations through focused R&amp;D, and connects qualified solutions with
          real industrial challenges.
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-4 lg:col-span-5 lg:col-start-8 lg:justify-end">
          <Button to="/submit-challenge">Submit an Industry Challenge</Button>
          <Button to="/technologies" variant="outline">
            Explore Technologies
          </Button>
          <ArrowLink to="/submit-innovation">Submit Your Innovation</ArrowLink>
        </div>
      </div>

      {/* The Matchfield */}
      <div className="mt-16 sm:mt-20">
        <Matchfield />
      </div>
    </section>
  )
}
