import { useEffect, useState } from 'react'
import * as api from './api'
import { Chip, Empty, shortDateTime } from './ui'

const TONE: Record<string, 'neutral' | 'active' | 'quiet'> = {
  New: 'active',
  Replied: 'neutral',
  Closed: 'quiet',
}

/**
 * Contact messages.
 *
 * A list, not a pipeline. Challenges and innovations get their own detail
 * routes because they carry thirty fields and a review history; a message is
 * five fields and one decision, so the whole of it is on this page and the
 * decision is made in place. Opening a route to show what already fits on
 * screen would be ceremony.
 *
 * The body is shown in full rather than truncated. The point of reading these
 * is to know what someone asked, and a message you have to click to finish
 * reading is one you triage by its first line.
 */
export default function Messages() {
  const [items, setItems] = useState<api.Message[] | null>(null)
  const [statuses, setStatuses] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  /** The reference currently being written to, so only its controls disable. */
  const [busy, setBusy] = useState<string | null>(null)

  const load = (next: string) => {
    setItems(null)
    setError(null)
    api.messages(next ? { status: next } : {})
      .then((r) => { setItems(r.items); setStatuses(r.statuses) })
      .catch((e) => setError(e.message))
  }

  useEffect(() => { load(status) }, [status])

  const move = async (reference: string, next: string) => {
    setBusy(reference)
    try {
      await api.patchMessage(reference, { status: next })
      // Reload rather than patch in place: with a filter applied, a message
      // that no longer matches it should leave the list.
      load(status)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the message')
    } finally {
      setBusy(null)
    }
  }

  const newCount = (items ?? []).filter((m) => m.status === 'New').length

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="section-type">Messages</h1>
        <div className="flex items-center gap-3">
          <label htmlFor="msg-status" className="label" style={{ color: 'var(--color-faint)' }}>STATUS</label>
          <select
            id="msg-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="field-input py-2 text-[0.875rem]"
          >
            <option value="">All</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="label px-3 py-2" style={{ border: '1px solid var(--color-accent-deep)', color: 'var(--color-accent-deep)' }}>
          {error}
        </p>
      )}

      {items !== null && items.length > 0 && (
        <p className="label" style={{ color: 'var(--color-muted)' }}>
          {items.length} MESSAGE{items.length === 1 ? '' : 'S'}
          {!status && newCount > 0 && ` · ${newCount} NEW`}
        </p>
      )}

      {items === null ? (
        <p className="label" style={{ color: 'var(--color-faint)' }}>LOADING</p>
      ) : items.length === 0 ? (
        <Empty>{`No messages${status ? ` with status ${status}` : ''}.`}</Empty>
      ) : (
        <ul className="grid gap-4">
          {items.map((m) => (
            <li key={m.reference} className="p-5" style={{ border: '1px solid var(--rule)' }}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <span className="ident" style={{ color: 'var(--color-accent)' }}>{m.reference}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={TONE[m.status] ?? 'neutral'}>{m.status.toUpperCase()}</Chip>
                  <Chip tone="quiet" label="TOPIC">{m.topic}</Chip>
                  <span className="label" style={{ color: 'var(--color-faint)' }}>
                    {shortDateTime(m.created_at)}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-[0.9375rem] font-medium">{m.name}</span>
                {m.organisation && (
                  <span className="text-[0.875rem]" style={{ color: 'var(--color-muted)' }}>{m.organisation}</span>
                )}
                {/* A mailto with the reference already in the subject: the reply
                    is the whole job, and retyping the reference is how it ends
                    up missing from the thread. */}
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent(`InThinks — ${m.reference}`)}`}
                  className="text-[0.875rem]"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {m.email}
                </a>
              </div>

              <p className="body-type mt-4 whitespace-pre-wrap text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                {m.message}
              </p>

              {m.handled_at && m.handled_by && (
                <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
                  {m.status.toUpperCase()} BY {m.handled_by.toUpperCase()} · {shortDateTime(m.handled_at)}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2 pt-4" style={{ borderTop: '1px solid var(--rule)' }}>
                {statuses.filter((s) => s !== m.status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy === m.reference}
                    onClick={() => move(m.reference, s)}
                    className="tap label px-3 py-1.5 transition-colors duration-250 disabled:opacity-50"
                    style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}
                  >
                    MARK {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
