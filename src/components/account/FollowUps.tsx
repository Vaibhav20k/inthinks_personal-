import { useEffect, useState } from 'react'
import { participantApi as api } from '../../lib/participant'

interface Item {
  key: string; label: string; category: 'measurement' | 'constraint' | 'cost' | 'success_criterion'
  units: string[]; comparator?: 'gte' | 'lte' | 'eq'; period?: 'one_off' | 'per_year'; question: string
  filled: boolean; suggestion: { id: number; value: number; unit: string; quote: string } | null
}
interface State { sector: string; items: Item[]; missing: number }

const COMPARATOR: Record<string, string> = { gte: 'at least', lte: 'at most', eq: 'exactly' }
const number = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 6 })

/**
 * "Help us match you better": the figures still missing for this case's
 * sector. Answers become the participant's own figures; numbers read from
 * their text are offered for confirmation, never saved without it.
 */
export default function FollowUps({ reference, onChange }: { reference: string; onChange: () => void }) {
  const [state, setState] = useState<State | null>(null)
  const [values, setValues] = useState<Record<string, { value: string; unit: string; currency: string; share: string }>>({})
  const [error, setError] = useState(''), [busy, setBusy] = useState('')
  const base = `/records/${reference}/follow-ups`
  const load = () => api<State>(base).then(setState)
  useEffect(() => { load().catch((e) => setError(e.message)) }, [reference])
  if (!state || state.missing === 0) return error ? <p role="alert">{error}</p> : null

  const field = (item: Item) => values[item.key] ?? { value: '', unit: item.units[0] ?? '', currency: 'INR', share: '100' }
  const set = (item: Item, patch: Partial<ReturnType<typeof field>>) => setValues((v) => ({ ...v, [item.key]: { ...field(item), ...patch } }))
  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key); setError('')
    try { await fn(); await load(); onChange() } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') } finally { setBusy('') }
  }

  return <section className="grid gap-3 border p-4" style={{ borderColor: 'var(--rule-strong)' }} aria-labelledby={`follow-${reference}`}>
    <h3 id={`follow-${reference}`} className="font-semibold">Help us match you better · {state.missing} figure{state.missing === 1 ? '' : 's'} missing</h3>
    <p className="text-sm">Numbers let InThinks check a match against your real conditions. Answer what you know; skip the rest. You can change these later under Figures for this case.</p>
    {error && <p role="alert">{error}</p>}
    {state.items.filter((i) => !i.filled).map((item) => {
      const f = field(item)
      return <article key={item.key} className="grid gap-2 border-t pt-3" style={{ borderColor: 'var(--rule)' }}>
        <p>{item.question}</p>
        {item.suggestion && <div className="grid gap-2 p-3" style={{ background: 'var(--color-surface, transparent)', border: '1px dashed var(--rule-strong)' }}>
          <span className="text-sm">From your submission: “{item.suggestion.quote}”</span>
          <strong>{item.label}: {item.comparator && item.category !== 'measurement' ? `${COMPARATOR[item.comparator]} ` : ''}{number(item.suggestion.value)} {item.suggestion.unit}</strong>
          <span className="flex flex-wrap gap-3">
            <button className="border px-3 py-1 disabled:opacity-50" disabled={busy !== ''} onClick={() => void run(item.key, () => api(`${base}/${item.suggestion!.id}/accept`, {}))}>Yes, that's right</button>
            <button className="underline disabled:opacity-50" disabled={busy !== ''} onClick={() => void run(item.key, () => api(`${base}/${item.suggestion!.id}/dismiss`, {}))}>Not right</button>
          </span>
        </div>}
        {!item.suggestion && <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => {
          e.preventDefault()
          void run(item.key, () => api(`/records/${reference}/qualification`, {
            category: item.category, label: item.label, value: f.value,
            comparator: item.category === 'measurement' ? null : item.comparator ?? null,
            unit: item.category === 'cost' ? null : f.unit, sourceKind: 'participant_statement',
            ...(item.category === 'cost' ? { currency: f.currency.toUpperCase(), period: item.period ?? 'per_year', attributionPct: f.share } : {}),
          }))
        }}>
          <label className="grid gap-1 text-sm">{item.category === 'cost' ? 'Amount' : item.comparator && item.category !== 'measurement' ? `Value (${COMPARATOR[item.comparator]})` : 'Value'}
            <input className="field-input w-36" inputMode="decimal" required pattern="-?[0-9]+([.][0-9]+)?" value={f.value} onChange={(e) => set(item, { value: e.target.value })} /></label>
          {item.category === 'cost'
            ? <>
                <label className="grid gap-1 text-sm">Currency<input className="field-input w-20" maxLength={3} required value={f.currency} onChange={(e) => set(item, { currency: e.target.value })} /></label>
                {item.period === 'per_year' && <label className="grid gap-1 text-sm">Share caused by this problem (%)<input className="field-input w-24" inputMode="numeric" required value={f.share} onChange={(e) => set(item, { share: e.target.value })} /></label>}
              </>
            : <label className="grid gap-1 text-sm">Unit<select className="field-input" value={f.unit} onChange={(e) => set(item, { unit: e.target.value })}>{item.units.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>}
          <button className="border px-3 py-2 disabled:opacity-50" disabled={busy !== ''}>{busy === item.key ? 'Saving…' : 'Save'}</button>
        </form>}
      </article>
    })}
  </section>
}
