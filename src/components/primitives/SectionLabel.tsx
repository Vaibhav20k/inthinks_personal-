interface SectionLabelProps {
  index: string
  children: string
  invert?: boolean
}

/**
 * The page's recurring structural device: a numbered marginal label, set in
 * mono against a hairline. The numbering is real — sections are read in order.
 */
export default function SectionLabel({ index, children, invert = false }: SectionLabelProps) {
  return (
    <div
      className="label flex items-baseline gap-3 border-t pt-3 lg:flex-col lg:gap-2"
      style={{ borderColor: invert ? 'var(--rule-invert)' : 'var(--rule)' }}
    >
      <span style={{ color: 'var(--color-accent)' }}>{index}</span>
      <span className={invert ? 'text-white/55' : 'text-graphite'}>{children}</span>
    </div>
  )
}
