interface Props {
  index?: string
  children: string
  invert?: boolean
}

/** Numbered marginal label against a hairline — the page's spine. */
export default function SectionLabel({ index, children, invert = false }: Props) {
  return (
    <div
      className="label flex items-baseline gap-3 border-t pt-3 lg:flex-col lg:gap-2"
      style={{ borderColor: invert ? 'var(--rule-invert)' : 'var(--rule)' }}
    >
      {/* `deep`, not `accent`: this is 11px type that lands on white and on the
          sunk ground alike, and the brand blue clears AA on white only. Same
          hue, so the spine still reads as one colour down the page. */}
      {index && (
        <span style={{ color: invert ? 'var(--color-accent-light)' : 'var(--color-accent-deep)' }}>
          {index}
        </span>
      )}
      <span style={{ color: invert ? 'rgba(255,255,255,0.55)' : 'var(--color-muted)' }}>
        {children}
      </span>
    </div>
  )
}
