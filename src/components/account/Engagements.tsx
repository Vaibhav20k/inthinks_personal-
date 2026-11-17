import { useEffect, useState } from 'react'
import { participantApi as api } from '../../lib/participant'

interface Figure { category: string; label: string; comparator: string | null; value: number | null; valueMax: number | null; unit: string | null }
interface Engagement {
  reference: string; side: 'problem' | 'solution'; ownReference: string; stage: string; engagementType: string | null; sharedAt: string
  counterpart: { kind: 'problem' | 'solution'; version: number; title: string; summary: string; figures: Figure[] } | null
  response: 'pending' | 'interested' | 'more_info' | 'declined'; responseNote: string | null; respondedAt: string | null
  nextAction: string | null; nextActionDue: string | null
  pilot: { steps: { title: string; dueOn: string | null; status: string }[]; criteriaMet: number; criteriaMeasured: number; criteriaTotal: number } | null
}
const COMPARATOR: Record<string, string> = { lt: 'below ', lte: 'at most ', gt: 'above ', gte: 'at least ' }
const RESPONSE: Record<string, string> = { pending: 'You have not answered yet', interested: 'You said you are interested', more_info: 'You asked for more information', declined: 'You said you are not interested' }
const number = (n: number | null) => (n === null ? '' : n.toLocaleString('en-US', { maximumFractionDigits: 6 }))
const figure = (f: Figure) => `${f.label}: ${f.comparator === 'between' ? `${number(f.value)}–${number(f.valueMax)}` : `${COMPARATOR[f.comparator ?? ''] ?? ''}${number(f.value)}`}${f.unit ? ` ${f.unit}` : ''}`

function Card({ e, onChange }: { e: Engagement; onChange: () => void }) {
  const [note, setNote] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const answer = async (response: string) => {
    setBusy(true); setError('')
    try { await api(`/engagements/${e.reference}/response`, { response, note }); setNote(''); onChange() }
    catch (err) { setError(err instanceof Error ? err.message : 'Request failed') } finally { setBusy(false) }
  }
  const closed = e.stage === 'Closed'
  return <article className="border p-5 grid gap-3">
    <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Opportunity {e.reference} · for your {e.side === 'problem' ? 'problem' : 'solution'} {e.ownReference}</span>
      <span>{e.stage}{e.engagementType ? ` · ${e.engagementType}` : ''}</span></div>
    {e.counterpart ? <>
      <h3 className="text-lg font-medium">{e.counterpart.kind === 'solution' ? 'A possible solution' : 'A problem your solution may fit'}: {e.counterpart.title}</h3>
      <p className="whitespace-pre-wrap">{e.counterpart.summary}</p>
      {e.counterpart.figures.length > 0 && <ul className="list-disc pl-5 text-sm">{e.counterpart.figures.map((f) => <li key={figure(f)}>{figure(f)}</li>)}</ul>}
    </> : <p>InThinks is revising this description. It will appear here again shortly.</p>}
    {e.pilot && <div className="grid gap-1 text-sm">
      <strong>Pilot progress: {e.pilot.criteriaMet} of {e.pilot.criteriaTotal} success criteria met{e.pilot.criteriaMeasured < e.pilot.criteriaTotal ? ` (${e.pilot.criteriaTotal - e.pilot.criteriaMeasured} not measured yet)` : ''}</strong>
      {e.pilot.steps.length > 0 && <ul className="list-disc pl-5">{e.pilot.steps.map((s) => <li key={s.title}>{s.title}{s.dueOn ? ` · by ${s.dueOn}` : ''} · {s.status}</li>)}</ul>}
    </div>}
    {e.nextAction && <p className="text-sm"><strong>Next step from InThinks:</strong> {e.nextAction}{e.nextActionDue ? ` (by ${e.nextActionDue})` : ''}</p>}
    <p className="text-sm">{RESPONSE[e.response]}{e.responseNote ? `: “${e.responseNote}”` : ''}</p>
    {!closed && <div className="grid gap-2">
      <label className="text-sm">Note to InThinks (needed if you ask for more information)
        <textarea className="field-input mt-1" rows={2} maxLength={1000} value={note} onChange={(ev) => setNote(ev.target.value)} /></label>
      <div className="flex flex-wrap gap-3">
        <button className="border px-4 py-2 disabled:opacity-50" disabled={busy} onClick={() => void answer('interested')}>Interested</button>
        <button className="border px-4 py-2 disabled:opacity-50" disabled={busy} onClick={() => void answer('more_info')}>I need more information</button>
        <button className="border px-4 py-2 disabled:opacity-50" disabled={busy} onClick={() => void answer('declined')}>Not interested</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>}
  </article>
}

/**
 * Opportunities InThinks has shared with this participant (phase 10). The
 * other party is always anonymous, and answers go to InThinks only.
 */
export default function Engagements() {
  const [items, setItems] = useState<Engagement[] | null>(null), [error, setError] = useState('')
  const load = () => api<{ items: Engagement[] }>('/engagements').then((r) => setItems(r.items)).catch((e) => setError(e.message))
  useEffect(() => { void load() }, [])
  if (error) return <p role="alert">{error}</p>
  if (!items || items.length === 0) return null
  return <div className="grid gap-3">
    <h2 className="text-xl">Opportunities shared with you</h2>
    <p className="text-sm">InThinks found a possible match for one of your submissions. You will not learn who the other party is, and they will not learn who you are. Your answer goes to InThinks only.</p>
    {items.map((e) => <Card key={e.reference + e.side} e={e} onChange={() => void load()} />)}
  </div>
}
