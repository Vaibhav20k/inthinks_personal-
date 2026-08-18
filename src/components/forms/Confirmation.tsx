import Button from '../primitives/Button'

interface Props {
  title: string
  reference: string
  referenceLabel: string
  body: string
  fileCount?: number
}

/**
 * Post-submission screen. Only reached once the server has stored the record
 * and issued the reference, so everything on it is true.
 */
export default function Confirmation({ title, reference, referenceLabel, body, fileCount }: Props) {
  return (
    <div className="max-w-2xl">
      <h2 className="statement-type">{title}</h2>

      <p className="body-type mt-8" style={{ color: 'var(--color-muted)' }}>
        {body}
      </p>

      <div className="mt-10 p-6" style={{ border: '1px solid var(--rule-strong)' }}>
        <p className="label" style={{ color: 'var(--color-faint)' }}>{referenceLabel}</p>
        <p className="ident mt-2 text-[1.5rem]" style={{ color: 'var(--color-accent)' }}>
          {reference}
        </p>
        <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>
          QUOTE THIS REFERENCE IN ANY CORRESPONDENCE
        </p>
      </div>

      {typeof fileCount === 'number' && fileCount > 0 && (
        <p className="label mt-5" style={{ color: 'var(--color-muted)' }}>
          {fileCount} FILE{fileCount === 1 ? '' : 'S'} RECEIVED
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Button to="/technologies">Explore Technologies</Button>
        <Button to="/" variant="outline">Back to home</Button>
      </div>
    </div>
  )
}
