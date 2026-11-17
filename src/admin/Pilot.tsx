import { useEffect, useState } from 'react'
import { Chip, Panel } from './ui'
import { RequestError, requestJson } from '../lib/http'

interface Criterion {
  id: number; label: string; comparator: string | null; value: number | null; valueMax: number | null; unit: string | null
  measured: number | null; measuredOn: string | null; source: string | null; note: string | null; verdict: 'met' | 'not_met' | 'not_measured'
}
interface Step { id: number; title: string; dueOn: string | null; status: 'planned' | 'done' | 'missed'; note: string | null }
interface State { problem: string; criteria: Criterion[]; milestones: Step[]; summary: { met: number; notMet: number; total: number } }
const COMPARATOR: Record<string, string> = { gte: 'at least ', lte: 'at most ', eq: 'exactly ', gt: 'above ', lt: 'below ' }
const VERDICT: Record<string, string> = { met: 'Met', not_met: 'Not met', not_measured: 'Not measured' }
const target = (c: Criterion) => `${c.comparator === 'between' ? `${c.value}–${c.valueMax}` : `${COMPARATOR[c.comparator ?? ''] ?? ''}${c.value}`}${c.unit ? ` ${c.unit}` : ''}`

/**
 * Pilot (phase 11): dated steps and measurements against the problem owner's
 * own success criteria. The verdict follows from the numbers. The problem
 * side sees the steps and how many criteria are met, never the raw values.
 */
export default function Pilot({ reference }: { reference: string }) {
  const base = `/api/admin/opportunities/${reference}/pilot`
  const [data, setData] = useState<State | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [title, setTitle] = useState(''), [due, setDue] = useState('')
  const [entry, setEntry] = useState<Record<number, { measured: string; measuredOn: string; source: string }>>({})
  const load = () => requestJson<State>(base).then(setData)
  useEffect(() => { load().catch((e) => setError(e.message)) }, [reference])
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError('')
    try { await fn(); await load(); return true }
    catch (e) { setError(e instanceof RequestError && Object.keys(e.fields).length ? Object.values(e.fields).join(' ') : e instanceof Error ? e.message : 'Request failed'); return false }
    finally { setBusy(false) }
  }
  if (!data) return error ? <Panel title="Pilot"><p role="alert">{error}</p></Panel> : null
  const muted = { color: 'var(--color-muted)' }
  const field = (id: number) => entry[id] ?? { measured: '', measuredOn: '', source: '' }

  return <Panel title="Pilot" action={<Chip tone={data.summary.total && data.summary.met === data.summary.total ? 'active' : 'neutral'}>
    {data.summary.met} of {data.summary.total} criteria met</Chip>}>
    {error && <p role="alert" className="mb-2">{error}</p>}
    <span className="label" style={{ color: 'var(--color-faint)' }}>SUCCESS CRITERIA (FROM THE PROBLEM {data.problem})</span>
    {data.criteria.length === 0 && <p className="mt-1 text-sm" style={muted}>The problem has no success criteria yet. Add them in its Qualification panel; a pilot is judged against them.</p>}
    <ul className="mt-1 grid gap-3">{data.criteria.map((c) => <li key={c.id} className="grid gap-1 border-t pt-2" style={{ borderColor: 'var(--rule)' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><span>{c.label}: {target(c)}</span>
        <Chip tone={c.verdict === 'met' ? 'active' : c.verdict === 'not_met' ? 'neutral' : 'quiet'}>{VERDICT[c.verdict]}</Chip></div>
      {c.measured !== null && <span className="text-sm" style={muted}>Measured {c.measured}{c.unit ? ` ${c.unit}` : ''} on {c.measuredOn} · {c.source}</span>}
      <form className="flex flex-wrap items-end gap-2 text-sm" onSubmit={(e) => {
        e.preventDefault()
        void run(() => requestJson(`${base}/results`, { criterionId: c.id, ...field(c.id) })).then((ok) => ok && setEntry({ ...entry, [c.id]: { measured: '', measuredOn: '', source: '' } }))
      }}>
        <label className="grid gap-1">Measured<input className="field-input w-28 py-1" inputMode="decimal" value={field(c.id).measured} onChange={(e) => setEntry({ ...entry, [c.id]: { ...field(c.id), measured: e.target.value } })} /></label>
        <label className="grid gap-1">On<input className="field-input py-1" type="date" value={field(c.id).measuredOn} onChange={(e) => setEntry({ ...entry, [c.id]: { ...field(c.id), measuredOn: e.target.value } })} /></label>
        <label className="grid min-w-[10rem] flex-1 gap-1">How it was measured<input className="field-input py-1" maxLength={300} value={field(c.id).source} onChange={(e) => setEntry({ ...entry, [c.id]: { ...field(c.id), source: e.target.value } })} /></label>
        <button className="underline" disabled={busy}>{c.measured === null ? 'Record' : 'Replace'}</button>
      </form>
    </li>)}</ul>

    <span className="label mt-5 block" style={{ color: 'var(--color-faint)' }}>STEPS</span>
    <ul className="mt-1 grid gap-2">{data.milestones.map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm" style={{ borderColor: 'var(--rule)' }}>
      <span>{s.title}{s.dueOn ? ` · by ${s.dueOn}` : ''}</span>
      <select className="field-input py-1" aria-label={`Status of ${s.title}`} disabled={busy} value={s.status}
        onChange={(e) => void run(() => requestJson(`${base}/milestones/${s.id}`, { title: s.title, dueOn: s.dueOn, note: s.note, status: e.target.value }, 'PUT'))}>
        <option value="planned">Planned</option><option value="done">Done</option><option value="missed">Missed</option></select>
    </li>)}</ul>
    <form className="mt-2 flex flex-wrap items-end gap-2 text-sm" onSubmit={(e) => {
      e.preventDefault()
      void run(() => requestJson(`${base}/milestones`, { title, dueOn: due })).then((ok) => { if (ok) { setTitle(''); setDue('') } })
    }}>
      <label className="grid min-w-[12rem] flex-1 gap-1">New step<input className="field-input py-1" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="grid gap-1">By<input className="field-input py-1" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      <button className="underline" disabled={busy}>Add step</button>
    </form>
  </Panel>
}
