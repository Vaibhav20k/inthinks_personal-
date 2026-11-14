import { useEffect, useState } from 'react'
import { Panel } from './ui'
import { requestJson } from '../lib/http'

interface Item { key: string; label: string; question: string; filled: boolean; suggestion: { value: number; unit: string; quote: string } | null }
interface State { sector: string; items: Item[]; missing: number }

/**
 * The sector checklist for a case: which figures are in, which are missing,
 * and which the engine read from the text but the submitter has not yet
 * confirmed. A missing figure can be asked as a clarification in one click.
 */
export default function MissingFigures({ reference, onAsked }: { reference: string; onAsked?: () => void }) {
  const base = `/api/admin/cases/${reference}`
  const [state, setState] = useState<State | null>(null)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState('')
  const load = () => requestJson<State>(`${base}/follow-ups`).then(setState)
  useEffect(() => { load().catch((e) => setError(e.message)) }, [reference])
  if (!state) return error ? <Panel title="Figures checklist"><p role="alert">{error}</p></Panel> : null

  return <Panel title={`Figures checklist · ${state.sector}${state.missing ? ` · ${state.missing} missing` : ' · complete'}`}>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <ul className="grid gap-2">
      {state.items.map((item) => <li key={item.key} className="flex flex-wrap items-baseline justify-between gap-3 border-t pt-2" style={{ borderColor: 'var(--rule)' }}>
        <span className="min-w-0 flex-1">
          <span className="block">{item.filled ? '✓' : '○'} {item.label}</span>
          {item.suggestion && <span className="text-sm">Read from the text, awaiting the submitter: {item.suggestion.value} {item.suggestion.unit} — “{item.suggestion.quote}”</span>}
        </span>
        {!item.filled && <button className="underline text-sm disabled:opacity-50" disabled={busy !== ''} onClick={async () => {
          setBusy(item.key); setError(''); setNotice('')
          try { await requestJson(`${base}/clarifications`, { question: item.question }); setNotice('Question sent to the submitter.'); onAsked?.() }
          catch (e) { setError(e instanceof Error ? e.message : 'Request failed') } finally { setBusy('') }
        }}>Ask as clarification</button>}
      </li>)}
    </ul>
  </Panel>
}
