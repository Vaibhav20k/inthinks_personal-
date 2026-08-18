import Button from '../primitives/Button'
import Notice from '../primitives/Notice'

interface Props {
  title: string
  reference: string
  referenceLabel: string
  body: string
  connected: boolean
}

/**
 * Post-submission screen.
 *
 * `connected` exists because telling someone their submission was received
 * when no backend exists would be a lie. Until an endpoint is wired, the
 * screen says so and offers the draft back rather than claiming delivery.
 */
export default function Confirmation({
  title,
  reference,
  referenceLabel,
  body,
  connected,
}: Props) {
  return (
    <div className="max-w-2xl">
      <h2 className="statement-type">{connected ? title : 'Draft complete.'}</h2>

      {!connected && (
        <div className="mt-8">
          <Notice>
            Not yet connected — this build has no submission endpoint, so nothing was
            sent. Your answers remain saved in this browser.
          </Notice>
        </div>
      )}

      <p className="body-type mt-8" style={{ color: 'var(--color-muted)' }}>
        {connected
          ? body
          : 'Wire a submission endpoint and this screen becomes the real confirmation, with the reference below issued by the backend.'}
      </p>

      <div className="mt-10 p-6" style={{ border: '1px solid var(--rule-strong)' }}>
        <p className="label" style={{ color: 'var(--color-faint)' }}>{referenceLabel}</p>
        <p className="ident mt-2 text-[1.5rem]" style={{ color: 'var(--color-accent)' }}>
          {reference}
        </p>
        {!connected && (
          <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>
            GENERATED LOCALLY FOR DISPLAY — NOT AN ISSUED REFERENCE
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button to="/technologies">Explore Technologies</Button>
        <Button to="/" variant="outline">Back to home</Button>
      </div>
    </div>
  )
}
