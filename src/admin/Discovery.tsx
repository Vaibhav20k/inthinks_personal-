import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip, Empty, Panel } from './ui'
import { requestJson } from '../lib/http'

interface Org { id: string; name: string; provider_verified_at: string | null; provider_verified_by: string | null; solutions: number; members: number }
interface Problem { reference: string; title: string; discovery_listed: number; discovery_consent: number; approved_version: number | null }
interface Interest { id: number; reference: string; note: string; email: string; created_at: string; organization: string; version: number }
interface State { organizations: Org[]; problems: Problem[]; interests: Interest[] }

/**
 * Discovery (phase 11): which organizations are verified solution providers,
 * which problems are listed for them, and who said "we could solve this".
 * A problem shows to providers only when listed here AND its submitter agreed.
 */
export default function Discovery() {
  const [data, setData] = useState<State | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const load = () => requestJson<State>('/api/admin/discovery').then(setData)
  useEffect(() => { load().catch((e) => setError(e.message)) }, [])
  const run = (fn: () => Promise<unknown>) => {
    setBusy(true); setError('')
    fn().then(load).catch((e) => setError(e instanceof Error ? e.message : 'Request failed')).finally(() => setBusy(false))
  }
  if (!data) return <Empty>{error || 'Loading…'}</Empty>
  const muted = { color: 'var(--color-muted)' }
  const row = 'flex flex-wrap items-center justify-between gap-3 border-t py-2.5'

  return <div className="grid gap-6">
    {error && <p role="alert">{error}</p>}
    <Panel title={`Interest from providers · ${data.interests.length}`}>
      {data.interests.length === 0 ? <p className="text-sm" style={muted}>No provider has said “we could solve this” yet.</p>
        : <ul>{data.interests.map((i) => <li key={i.id} className="grid gap-1 border-t py-2.5" style={{ borderColor: 'var(--rule)' }}>
          <span><strong>{i.organization}</strong> ({i.email}) on <Link className="underline" to={`/admin/challenges/${i.reference}`}>{i.reference}</Link> · brief v{i.version}</span>
          <span className="text-sm">“{i.note}”</span>
          <span className="text-[0.8125rem]" style={muted}>{i.created_at.replace('T', ' ').slice(0, 16)} UTC. The problem owner is not told who this is.</span>
        </li>)}</ul>}
    </Panel>
    <Panel title="Problems in discovery">
      <p className="mb-2 text-sm" style={muted}>Listed problems show their approved anonymised brief to verified providers, once the submitter agrees on their account page.</p>
      <ul>{data.problems.map((p) => <li key={p.reference} className={row} style={{ borderColor: 'var(--rule)' }}>
        <Link className="min-w-0 flex-1 underline" to={`/admin/challenges/${p.reference}`}>{p.reference} · {p.title}</Link>
        <Chip tone={p.approved_version ? 'neutral' : 'quiet'}>{p.approved_version ? `Brief v${p.approved_version}` : 'No approved brief'}</Chip>
        <Chip tone={p.discovery_consent ? 'active' : 'quiet'}>{p.discovery_consent ? 'Submitter agreed' : 'Submitter has not agreed'}</Chip>
        <button className="text-sm underline disabled:opacity-50" disabled={busy || (!p.discovery_listed && !p.approved_version)}
          onClick={() => run(() => requestJson(`/api/admin/discovery/cases/${p.reference}`, { listed: !p.discovery_listed }))}>
          {p.discovery_listed ? 'Unlist' : 'List'}</button>
      </li>)}</ul>
    </Panel>
    <Panel title="Solution providers">
      <p className="mb-2 text-sm" style={muted}>Verify an organization only after checking it is a genuine solution provider. Members of verified organizations can read listed problems.</p>
      <ul>{data.organizations.map((o) => <li key={o.id} className={row} style={{ borderColor: 'var(--rule)' }}>
        <span className="min-w-0 flex-1">{o.name} <span className="text-sm" style={muted}>· {o.solutions} solution{o.solutions === 1 ? '' : 's'} · {o.members} member{o.members === 1 ? '' : 's'}</span></span>
        {o.provider_verified_at && <Chip tone="active">Verified by {o.provider_verified_by}</Chip>}
        <button className="text-sm underline" disabled={busy} onClick={() => run(() => requestJson(`/api/admin/discovery/providers/${o.id}`, { verified: !o.provider_verified_at }))}>
          {o.provider_verified_at ? 'Remove verification' : 'Verify as provider'}</button>
      </li>)}</ul>
    </Panel>
  </div>
}
