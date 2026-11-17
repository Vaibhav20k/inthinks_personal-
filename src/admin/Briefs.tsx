import { useEffect, useState, type FormEvent } from 'react'
import { Chip, Panel } from './ui'
import { RequestError, requestJson } from '../lib/http'

interface Figure { id: number; category: string; label: string; comparator: string | null; value: number | null; valueMax: number | null; unit: string | null }
interface Brief {
  id: number; version: number; title: string; summary: string; figureIds: number[]; status: 'draft' | 'proposed' | 'approved' | 'superseded'
  writtenBy: string; writtenAt: string; proposedBy: string | null; approvedBy: string | null; approvedAt: string | null
}
const COMPARATOR: Record<string, string> = { lt: 'below ', lte: 'at most ', gt: 'above ', gte: 'at least ' }
export const figureText = (f: Omit<Figure, 'id'>) =>
  `${f.label}: ${f.comparator === 'between' ? `${f.value}–${f.valueMax}` : `${COMPARATOR[f.comparator ?? ''] ?? ''}${f.value}`}${f.unit ? ` ${f.unit}` : ''}`

/**
 * Anonymised brief of a case (phase 10): the only thing the other side of an
 * engagement ever sees. Mediators write and propose; administrators approve.
 */
export default function Briefs({ reference, canApprove }: { reference: string; canApprove: boolean }) {
  const base = `/api/admin/cases/${reference}/briefs`
  const [items, setItems] = useState<Brief[]>([]), [figures, setFigures] = useState<Figure[]>([])
  const [title, setTitle] = useState(''), [summary, setSummary] = useState(''), [chosen, setChosen] = useState<number[]>([])
  const [editing, setEditing] = useState<number | 'new' | null>(null), [checked, setChecked] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [fields, setFields] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false)
  const load = () => requestJson<{ items: Brief[]; figures: Figure[] }>(base).then((d) => { setItems(d.items); setFigures(d.figures) })
  useEffect(() => { load().catch((e) => setError(e.message)) }, [reference])

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setNotice(''); setFields({})
    try { await fn(); await load(); setNotice(done); return true }
    catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); if (e instanceof RequestError) setFields(e.fields); return false }
    finally { setBusy(false) }
  }
  const open = items.find((b) => b.status === 'draft' || b.status === 'proposed')
  const approved = items.find((b) => b.status === 'approved')
  const start = (b?: Brief) => {
    setEditing(b ? b.id : 'new'); setTitle(b?.title ?? approved?.title ?? ''); setSummary(b?.summary ?? approved?.summary ?? '')
    setChosen(b?.figureIds ?? approved?.figureIds ?? []); setFields({})
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    const body = { title, summary, figureIds: chosen }
    const ok = await run(() => editing === 'new' ? requestJson(base, body) : requestJson(`${base}/${editing}`, body, 'PUT'), 'Draft saved. Propose it when it is ready.')
    if (ok) setEditing(null)
  }
  const muted = { color: 'var(--color-muted)' }

  return <Panel title="Anonymised brief" action={approved ? <Chip tone="active" label="Shared version">v{approved.version}</Chip> : <Chip tone="quiet">Not approved yet</Chip>}>
    <p className="mb-3 text-sm" style={muted}>This is all the other side of an engagement will ever see. Write it from scratch: no company, people, site, brand or
      location names. Costs and figures the submitter marked InThinks only cannot be included.</p>
    {error && <p role="alert" className="mb-2">{error}</p>}
    {notice && <p role="status" className="mb-2">{notice}</p>}

    {editing !== null ? <form onSubmit={save} className="grid gap-3">
      <label className="grid gap-1"><span className="label" style={{ color: 'var(--color-faint)' }}>TITLE</span>
        <input className="field-input py-2" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(fields.title)} />
        {fields.title && <span className="text-sm" style={{ color: 'var(--color-accent-deep)' }}>{fields.title}</span>}</label>
      <label className="grid gap-1"><span className="label" style={{ color: 'var(--color-faint)' }}>SUMMARY</span>
        <textarea className="field-input py-2" rows={6} value={summary} maxLength={3000} onChange={(e) => setSummary(e.target.value)} aria-invalid={Boolean(fields.summary)} />
        {fields.summary && <span className="text-sm" style={{ color: 'var(--color-accent-deep)' }}>{fields.summary}</span>}</label>
      <fieldset className="grid gap-1"><legend className="label mb-1" style={{ color: 'var(--color-faint)' }}>FIGURES TO SHARE</legend>
        {figures.length === 0 && <span className="text-sm" style={muted}>No shareable figures on this case.</span>}
        {figures.map((f) => <label key={f.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={chosen.includes(f.id)} onChange={(e) => setChosen(e.target.checked ? [...chosen, f.id] : chosen.filter((x) => x !== f.id))} />
          {figureText(f)}</label>)}
        {fields.figureIds && <span className="text-sm" style={{ color: 'var(--color-accent-deep)' }}>{fields.figureIds}</span>}
      </fieldset>
      <div className="flex flex-wrap gap-4">
        <button className="bg-graphite px-4 py-2 text-[0.875rem] font-medium text-paper hover:bg-accent disabled:opacity-50" disabled={busy}>Save draft</button>
        <button type="button" className="text-sm underline" onClick={() => setEditing(null)}>Cancel</button>
      </div>
    </form> : !open && <button className="mb-3 text-sm underline" disabled={busy} onClick={() => start()}>{approved ? 'Start a new version' : 'Write the brief'}</button>}

    <ul className="grid gap-3">
      {items.map((b) => <li key={b.id} className="grid gap-1 border-t pt-3" style={{ borderColor: 'var(--rule)', opacity: b.status === 'superseded' ? 0.6 : 1 }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><strong>v{b.version} · {b.title}</strong>
          <Chip tone={b.status === 'approved' ? 'active' : b.status === 'superseded' ? 'quiet' : 'neutral'}>{b.status}</Chip></div>
        <p className="whitespace-pre-wrap text-sm">{b.summary}</p>
        {b.figureIds.length > 0 && <ul className="text-sm" style={muted}>{figures.filter((f) => b.figureIds.includes(f.id)).map((f) => <li key={f.id}>{figureText(f)}</li>)}</ul>}
        <span className="text-[0.8125rem]" style={muted}>Written by {b.writtenBy}{b.proposedBy ? ` · proposed by ${b.proposedBy}` : ''}{b.approvedBy ? ` · approved by ${b.approvedBy}` : ''}</span>
        {(b.status === 'draft' || b.status === 'proposed') && editing === null && <div className="flex flex-wrap items-center gap-4 text-sm">
          <button className="underline" disabled={busy} onClick={() => start(b)}>Edit</button>
          {b.status === 'draft' && <button className="underline" disabled={busy} onClick={() => void run(() => requestJson(`${base}/${b.id}/propose`, {}), 'Proposed for approval.')}>Propose for approval</button>}
          {canApprove && <>
            <label className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              I read it for site, brand and people names</label>
            <button className="underline disabled:opacity-50" disabled={busy || !checked}
              onClick={() => void run(() => requestJson(`${base}/${b.id}/approve`, { confirmChecked: true }), 'Approved. It can now be shared on an opportunity.').then(() => setChecked(false))}>Approve for sharing</button>
          </>}
        </div>}
      </li>)}
    </ul>
  </Panel>
}
