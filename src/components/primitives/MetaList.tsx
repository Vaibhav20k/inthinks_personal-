export interface MetaItem {
  term: string
  value: string
  accent?: boolean
}

interface Props {
  items: MetaItem[]
  invert?: boolean
  columns?: boolean
}

/** Technical metadata block — the mono spine of every technology surface. */
export default function MetaList({ items, invert = false, columns = false }: Props) {
  return (
    <dl className={columns ? 'grid gap-x-8 sm:grid-cols-2' : ''}>
      {items.map((item) => (
        <div
          key={item.term}
          className="label flex items-baseline justify-between gap-4 py-2.5"
          style={{ borderBottom: `1px solid ${invert ? 'var(--rule-invert)' : 'var(--rule)'}` }}
        >
          <dt style={{ color: invert ? 'rgba(255,255,255,0.42)' : 'var(--color-faint)' }}>
            {item.term}
          </dt>
          <dd
            className="text-right"
            style={{
              color: item.accent
                ? 'var(--color-accent)'
                : invert
                  ? 'var(--color-paper)'
                  : 'var(--color-ink)',
            }}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
