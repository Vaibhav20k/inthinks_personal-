import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export interface Field {
  term: string
  value: ReactNode
}

/**
 * One index row, for a screen too narrow to hold the table.
 *
 * Both explorers are registers — six or seven columns each — and a register
 * does not compress. Measured, the technology table wants 816px and the
 * problem table 850px; inside the explorer's own layout that is not available
 * until roughly 1280px, so below that the table was a 335px window onto an
 * 850px row and every reader was scrolling sideways to see a status.
 *
 * The same fields, stacked and labelled. Not a card: no shadow, no radius, no
 * floating — it is the same hairline-ruled record the table draws, turned on
 * its side, so the two read as one design at two sizes rather than as a
 * desktop table and a mobile alternative.
 */
export default function StackedRecord({
  to,
  reference,
  title,
  fields,
}: {
  to: string
  reference: string
  title: string
  fields: Field[]
}) {
  return (
    <li style={{ borderTop: '1px solid var(--rule)' }}>
      <div className="py-6">
        <Link to={to} className="tap group block">
          <span className="ident block" style={{ color: 'var(--color-accent)' }}>{reference}</span>
          <span className="mt-2 block font-display text-[1.0625rem] font-medium leading-snug tracking-[-0.02em]">
            <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
              {title}
            </span>
          </span>
        </Link>

        {/* Two columns of term/value, which is what these fields are — short
            labels against short values. One column wastes the width; three
            wraps the labels. */}
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
          {fields.map((f) => (
            <div key={f.term}>
              <dt className="label" style={{ color: 'var(--color-faint)' }}>{f.term}</dt>
              <dd className="label mt-1" style={{ color: 'var(--color-muted)' }}>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </li>
  )
}
