import type { ReactNode } from 'react'

interface ArrowLinkProps {
  href: string
  children: ReactNode
  invert?: boolean
  className?: string
}

/** Text link with a directional arrow that advances on hover. */
export default function ArrowLink({
  href,
  children,
  invert = false,
  className = '',
}: ArrowLinkProps) {
  return (
    <a
      href={href}
      className={`group inline-flex items-baseline gap-2.5 text-[0.95rem] font-medium ${
        invert ? 'text-white' : 'text-ink'
      } ${className}`}
    >
      <span
        className="border-b pb-0.5 transition-colors duration-300"
        style={{ borderColor: 'currentColor' }}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1"
        style={{ color: 'var(--color-accent)' }}
      >
        →
      </span>
    </a>
  )
}
