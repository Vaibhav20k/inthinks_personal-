import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  to: string
  children: ReactNode
  invert?: boolean
  className?: string
}

/** Text link whose arrow advances on hover. */
export default function ArrowLink({ to, children, invert = false, className = '' }: Props) {
  return (
    <Link
      to={to}
      className={`tap group inline-flex items-baseline gap-2.5 text-[0.9375rem] font-medium ${
        invert ? 'text-[var(--color-on-graphite)]' : 'text-ink'
      } ${className}`}
    >
      <span className="border-b border-current pb-0.5">{children}</span>
      <span
        aria-hidden="true"
        className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1"
        style={{ color: 'var(--color-accent)' }}
      >
        →
      </span>
    </Link>
  )
}
