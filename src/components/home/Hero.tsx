import SignalField from './SignalField'
import Button from '../primitives/Button'
import ArrowLink from '../primitives/ArrowLink'
import { site } from '../../data/site'

/**
 * Section 5 — the hero as a composition, not a headline stacked on a paragraph
 * stacked on buttons.
 *
 * Three fields: industrial demand on the left, emerging technology on the
 * right, and the resolved connection between them. The headline sits above the
 * field rather than inside it, so type stays dominant and the field reads as
 * the system the sentence is describing.
 */
export default function Hero() {
  return (
    <section id="top" className="container-grid pb-20 pt-32 sm:pt-40">
      <div className="label flex flex-wrap items-center gap-x-5 gap-y-2" style={{ color: 'var(--color-muted)' }}>
        <span style={{ color: 'var(--color-ink)' }}>{site.wordmark}</span>
        <span aria-hidden="true" className="h-px w-8" style={{ background: 'var(--rule-strong)' }} />
        <span>Technology development &amp; transfer</span>
        <span aria-hidden="true" className="h-px w-8" style={{ background: 'var(--rule-strong)' }} />
        <span>India / Global</span>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-end">
        <h1 className="hero-type max-w-[14ch] lg:col-span-7">
          Ideas become valuable when they become real.
        </h1>

        <div className="lg:col-span-5">
          <p className="body-type" style={{ color: 'var(--color-muted)', maxWidth: '46ch' }}>
            InThinks identifies emerging technologies, develops selected innovations
            and prepares them for industrial adoption.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-4">
            <Button to="/submit-challenge">Submit an Industry Challenge</Button>
            <Button to="/technologies" variant="outline">Explore Technologies</Button>
            <ArrowLink to="/submit-innovation">Submit Your Innovation</ArrowLink>
          </div>
        </div>
      </div>

      <div className="mt-16 sm:mt-20">
        <SignalField />
      </div>
    </section>
  )
}
