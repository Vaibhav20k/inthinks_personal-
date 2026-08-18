import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  invert?: boolean
  className?: string
}

/**
 * States plainly that something on screen is development placeholder content
 * or not yet connected. Used wherever the site would otherwise imply a
 * capability or a claim it cannot currently back.
 */
export default function Notice({ children, invert = false, className = '' }: Props) {
  return (
    <p
      className={`label inline-flex items-start gap-2.5 px-3 py-2 ${className}`}
      style={{
        border: `1px solid ${invert ? 'var(--rule-invert-strong)' : 'var(--rule-strong)'}`,
        color: invert ? 'rgba(255,255,255,0.66)' : 'var(--color-muted)',
      }}
    >
      <span
        aria-hidden="true"
        className="mt-[0.3em] h-1.5 w-1.5 shrink-0"
        style={{ background: 'var(--color-accent)' }}
      />
      <span>{children}</span>
    </p>
  )
}
