import type { ReactNode } from 'react'

export function Chip({
  children,
  tone = 'neutral',
  label,
}: {
  children: ReactNode
  tone?: 'neutral' | 'active' | 'quiet'
  /** Names the field, so two chips holding the same value stay distinguishable. */
  label?: string
}) {
  const style =
    tone === 'active'
      ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }
      : tone === 'quiet'
        ? { borderColor: 'var(--rule)', color: 'var(--color-faint)' }
        : undefined
  return (
    <span className="chip" style={style}>
      {label && <span style={{ color: 'var(--color-faint)' }}>{label}</span>}
      {children}
    </span>
  )
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-4 px-5 py-3.5" style={{ borderBottom: '1px solid var(--rule)' }}>
        <h2 className="label" style={{ color: 'var(--color-ink)' }}>{title.toUpperCase()}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="panel p-5">
      <p className="label" style={{ color: 'var(--color-faint)' }}>{label.toUpperCase()}</p>
      <p className="mt-3 font-display text-[2rem] font-medium leading-none tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      {note && <p className="label mt-2" style={{ color: 'var(--color-faint)' }}>{note}</p>}
    </div>
  )
}

/** Horizontal distribution bar. Reads as shape, not just numbers. */
export function Distribution({ rows }: { rows: { k: string; n: number }[] }) {
  if (rows.length === 0) {
    return <p className="label" style={{ color: 'var(--color-faint)' }}>NO DATA YET</p>
  }
  const max = Math.max(...rows.map((r) => r.n), 1)
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.k} className="grid grid-cols-[1fr_auto] items-center gap-x-4">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[0.875rem]">{row.k}</span>
              <span className="label tabular-nums" style={{ color: 'var(--color-muted)' }}>{row.n}</span>
            </div>
            <div className="mt-1.5 h-1" style={{ background: 'var(--rule)' }}>
              <div className="h-full" style={{ width: `${(row.n / max) * 100}%`, background: 'var(--color-accent)' }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3" style={{ borderBottom: '1px solid var(--rule)' }}>
      <dt className="label" style={{ color: 'var(--color-faint)' }}>{label.toUpperCase()}</dt>
      <dd className="mt-1.5 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{children}</dd>
    </div>
  )
}

export function Withheld({ children }: { children: string }) {
  return (
    <p
      className="label flex items-start gap-2.5 px-3 py-2.5"
      style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}
    >
      <span aria-hidden="true" className="mt-[0.3em] h-1.5 w-1.5 shrink-0" style={{ background: 'var(--color-accent)' }} />
      <span>{children}</span>
    </p>
  )
}

export function Empty({ children }: { children: string }) {
  return (
    <p className="py-8 text-center text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
      {children}
    </p>
  )
}

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

export const readableSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B`
  : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`
