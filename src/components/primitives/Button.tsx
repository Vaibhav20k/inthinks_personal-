import type { ReactNode } from 'react'

interface ButtonProps {
  href: string
  children: ReactNode
  variant?: 'solid' | 'outline' | 'invert'
}

/**
 * Precise hover: the label shifts a hair and a rule sweeps the full width.
 * No scale, no shadow — the page is drawn, not extruded.
 */
export default function Button({ href, children, variant = 'solid' }: ButtonProps) {
  const base =
    'group relative inline-flex items-center justify-center overflow-hidden px-6 py-3.5 text-[0.9375rem] font-medium tracking-[-0.01em] transition-colors duration-300'

  const skin =
    variant === 'solid'
      ? 'bg-ink text-paper hover:bg-accent'
      : variant === 'invert'
        ? 'bg-paper text-ink hover:bg-accent hover:text-white'
        : 'border text-ink hover:border-accent hover:text-accent'

  return (
    <a
      href={href}
      className={`${base} ${skin}`}
      style={variant === 'outline' ? { borderColor: 'var(--rule-strong)' } : undefined}
    >
      <span className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:-translate-y-px">
        {children}
      </span>
    </a>
  )
}
