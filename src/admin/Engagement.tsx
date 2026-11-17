import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip, Panel } from './ui'
import { requestJson } from '../lib/http'

interface BriefRef { id: number; version: number; title: string; status?: string }
interface SideState {
  side: 'problem' | 'solution'; ownReference: string; counterpartReference: string
  latestApproved: BriefRef | null; shared: BriefRef | null; active: boolean; outdated: boolean
  sharedAt: string | null; revokedAt: string | null; response: string; responseNote: string | null; respondedAt: string | null
  nextAction: string | null; nextActionDue: string | null
}
interface State { reference: string; stage: string; engagementType: string | null; types: string[]; sides: SideState[] }

const RESPONSE: Record<string, string> = { pending: 'No answer yet', interested: 'Interested', more_info: 'Wants more information', declined: 'Not interested' }
const SIDE: Record<string, string> = { problem: 'Problem side', solution: 'Solution side' }

function SideCard({ s, base, run, busy }: { s: SideState; base: string; busy: boolean; run: (fn: () => Promise<unknown>, done: string) => void }) {
  const [action, setAction] = useState(s.nextAction ?? ''), [due, setDue] = useState(s.nextActionDue ?? '')
  const muted = { color: 'var(--color-muted)' }
  return <div className="grid gap-2 border-t pt-3" style={{ borderColor: 'var(--rule)' }}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <strong>{SIDE[s.side]} · <Link className="underline" to={`/admin/${s.side === 'problem' ? 'challenges' : 'innovations'}/${s.ownReference}`}>{s.ownReference}</Link></strong>
      <Chip tone={s.active ? 'active' : 'quiet'}>{s.active ? `Sees v${s.shared?.version}` : s.revokedAt ? 'Revoked' : 'Nothing shared'}</Chip>
    </div>
    <span className="text-sm" style={muted}>
      Shown the other side’s brief ({s.counterpartReference}): {s.latestApproved ? `v${s.latestApproved.version} “${s.latestApproved.title}” is approved` : 'none approved yet. Approve one on that case first.'}
      {s.outdated && ' · a newer version exists than the one shared'}
    </span>
    <span className="text-sm">Answer: <strong>{RESPONSE[s.response] ?? s.response}</strong>{s.responseNote ? ` — “${s.responseNote}”` : ''}</span>
    <div className="flex flex-wrap gap-4 text-sm">
      {s.latestApproved && (!s.active || s.outdated) && <button className="underline" disabled={busy}
        onClick={() => run(() => requestJson(`${base}/${s.side}/share`, {}), `Shared v${s.latestApproved!.version} with the ${s.side} side.`)}>
        {s.active ? `Share v${s.latestApproved.version} instead` : `Share v${s.latestApproved.version}`}</button>}
      {s.active && <button className="underline" disabled={busy} onClick={() => run(() => requestJson(`${base}/${s.side}/revoke`, {}), 'Access revoked.')}>Revoke</button>}
    </div>
    <form className="flex flex-wrap items-end gap-3 text-sm" onSubmit={(e) => { e.preventDefault(); run(() => requestJson(`${base}/${s.side}/next-action`, { nextAction: action, nextActionDue: due }, 'PUT'), 'Next step saved.') }}>
      <label className="grid min-w-[14rem] flex-1 gap-1">What InThinks asks this side to do next (they see this)
        <input className="field-input py-1.5" maxLength={300} value={action} onChange={(e) => setAction(e.target.value)} /></label>
      <label className="grid gap-1">By<input className="field-input py-1.5" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      <button className="underline" disabled={busy}>Save</button>
    </form>
  </div>
}

/**
 * Engagement on an opportunity (phase 10). InThinks deals with each side
 * separately: each sees only the other side's approved anonymised brief and
 * answers InThinks, never the other side.
 */
export default function Engagement({ reference }: { reference: string }) {
  const base = `/api/admin/opportunities/${reference}/engagement`
  const [data, setData] = useState<State | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const load = () => requestJson<State>(base).then(setData)
  useEffect(() => { load().catch((e) => setError(e.message)) }, [reference])
  const run = (fn: () => Promise<unknown>, done: string) => {
    setBusy(true); setError(''); setNotice('')
    fn().then(load).then(() => setNotice(done)).catch((e) => setError(e instanceof Error ? e.message : 'Request failed')).finally(() => setBusy(false))
  }
  if (!data) return error ? <Panel title="Engagement"><p role="alert">{error}</p></Panel> : null
  return <Panel title="Engagement" action={<select className="field-input py-1 text-sm" aria-label="Engagement type" disabled={busy} value={data.engagementType ?? ''}
    onChange={(e) => run(() => requestJson(base, { engagementType: e.target.value || null }, 'PUT'), 'Engagement type saved.')}>
    <option value="">Type not set</option>{data.types.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}</select>}>
    <p className="mb-2 text-sm" style={{ color: 'var(--color-muted)' }}>The two sides never learn who the other is. Each sees only the approved anonymised brief you share with it,
      the stage, and the next step you set, and answers InThinks only.</p>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className="grid gap-4">{data.sides.map((s) => <SideCard key={`${s.side}-${s.shared?.id ?? 0}-${s.nextAction ?? ''}`} s={s} base={base} run={run} busy={busy} />)}</div>
  </Panel>
}
