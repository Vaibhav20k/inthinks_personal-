import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'solid' | 'outline' | 'invert' | 'invert-outline'

interface Props {
  to?: string
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: Variant
  disabled?: boolean
  children: ReactNode
  className?: string
}

const skins: Record<Variant, string> = {
  solid: 'bg-graphite text-paper hover:bg-accent',
  outline: 'border text-ink hover:border-accent hover:text-accent',
  invert: 'bg-paper text-graphite hover:bg-accent hover:text-white',
  'invert-outline': 'border text-paper hover:border-accent hover:text-accent',
}

/**
 * Precise hover: colour shift and a hairline nudge, no scale or shadow.
 * The page is drawn, not extruded.
 */
export default function Button({
  to,
  href,
  onClick,
  type = 'button',
  variant = 'solid',
  disabled = false,
  children,
  className = '',
}: Props) {
  const base =
    'group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-[0.9375rem] font-medium tracking-[-0.01em] transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-45'
  const border =
    variant === 'outline'
      ? { borderColor: 'var(--rule-strong)' }
      : variant === 'invert-outline'
        ? { borderColor: 'var(--rule-invert-strong)' }
        : undefined
  const inner = (
    <span className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:-translate-y-px">
      {children}
    </span>
  )
  const cls = `${base} ${skins[variant]} ${className}`

  if (to) return <Link to={to} className={cls} style={border}>{inner}</Link>
  if (href) return <a href={href} className={cls} style={border}>{inner}</a>
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} style={border}>
      {inner}
    </button>
  )
}
