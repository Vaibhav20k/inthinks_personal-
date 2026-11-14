import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip, Panel } from './ui'
import { requestJson } from '../lib/http'

interface Range { currency: string; low: number; high: number }
interface Used { id: number; label: string; verification: string; weight: number }
type Payback =
  | { status: 'ok'; currency: string; install: number; bestYears: number; worstYears: number | null }
  | { status: 'no_install_cost' }
  | { status: 'no_saving' }
  | { status: 'currency_mismatch'; saving: string[]; install: string[] }
interface MatchLine { reference: string; other: string; title: string | null; classification: string; payback: Payback; saving?: Range[] }
interface Base { reference: string; settingsVersion: number; currency: string; figureCount: number; used: Used[]; matches: MatchLine[] }
interface ChallengeAssessment extends Base {
  kind: 'challenge'
  atStake: Range[]; saving: Range[]
  improvement: { low: number; high: number; label: string } | null
  energy: { currency: string; kWhPerYear: number; low: number; high: number } | null
  notes: string[]
  priority: { label: 'Hot' | 'Warm' | 'Not yet' | 'Not enough data'; score: number; reasons: string[] }
}
interface InnovationAssessment extends Base { kind: 'innovation'; install: { currency: string; amount: number }[] }
type Assessment = ChallengeAssessment | InnovationAssessment

const whole = (n: number) => Math.round(n).toLocaleString('en-US')
const range = (r: Range) => (Math.round(r.low) === Math.round(r.high) ? `${r.currency} ${whole(r.high)}` : `${r.currency} ${whole(r.low)} – ${whole(r.high)}`)
const pct = (n: number) => `${Math.round(n * 1000) / 10}%`
const years = (n: number) => (n < 1 ? `${Math.max(1, Math.round(n * 12))} months` : `${Math.round(n * 10) / 10} years`)
const STATE: Record<string, string> = {
  independently_verified: 'independently verified', document_checked: 'document checked',
  participant_confirmed: 'confirmed by participant', unverified: 'unverified',
}

function paybackText(p: Payback) {
  if (p.status === 'ok') return p.worstYears === null || Math.abs(p.worstYears - p.bestYears) < 0.05
    ? `Pays back in about ${years(p.bestYears)}` : `Pays back in ${years(p.bestYears)} to ${years(p.worstYears)}`
  if (p.status === 'no_install_cost') return 'No installation cost stated yet'
  if (p.status === 'no_saving') return 'No yearly saving to compare yet'
  return `Not compared: saving in ${p.saving.join(', ')}, cost in ${p.install.join(', ')}`
}

function Line({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return <div className="grid gap-1 border-t pt-3" style={{ borderColor: 'var(--rule)' }}>
    <span className="label" style={{ color: 'var(--color-faint)' }}>{label.toUpperCase()}</span>
    <span className="text-[1.0625rem] font-medium">{children}</span>
    {note && <span className="text-[0.8125rem]" style={{ color: 'var(--color-muted)' }}>{note}</span>}
  </div>
}

/**
 * Private assessment of a case (phase 8): money at stake, yearly saving,
 * payback per match and a priority label, all worked out by fixed rules from
 * the case's figures. Visible to administrators and the assigned mediator.
 */
export default function Assessment({ reference }: { reference: string }) {
  const [data, setData] = useState<Assessment | null>(null), [error, setError] = useState('')
  useEffect(() => {
    requestJson<Assessment>(`/api/admin/cases/${reference}/assessment`).then(setData).catch((e) => setError(e.message))
  }, [reference])
  if (!data) return error ? <Panel title="Assessment"><p role="alert">{error}</p></Panel> : null

  const footer = <p className="mt-4 text-[0.8125rem]" style={{ color: 'var(--color-muted)' }}>
    Internal only. Ranges run from trust-adjusted figures (low) to figures as stated (high).
    Rules version {data.settingsVersion === 0 ? '0 (defaults)' : data.settingsVersion}.
  </p>
  const used = data.used.length > 0 && <details className="mt-4">
    <summary className="cursor-pointer text-sm underline">Figures used ({data.used.length})</summary>
    <ul className="mt-2 grid gap-1 text-sm">
      {data.used.map((u) => <li key={u.id}>{u.label} — {STATE[u.verification] ?? u.verification}, counted at {Math.round(u.weight * 100)}%</li>)}
    </ul>
  </details>

  if (data.kind === 'innovation') return <Panel title="Assessment">
    <div className="grid gap-3">
      <Line label="Installation cost">{data.install.length ? data.install.map((c) => `${c.currency} ${whole(c.amount)}`).join(' · ') : 'Not stated yet'}</Line>
      {data.matches.length === 0 ? <p className="text-sm">No matched problems yet, so there is no payback to show.</p>
        : <ul className="grid gap-2">{data.matches.map((m) => <li key={m.reference} className="flex flex-wrap items-baseline justify-between gap-3 border-t pt-2" style={{ borderColor: 'var(--rule)' }}>
          <Link to={`/admin/matches/${m.reference}`} className="min-w-0 flex-1 underline">{m.title ?? m.other}</Link>
          <span className="text-sm">{paybackText(m.payback)}</span>
          <Chip tone={m.classification === 'Strong Match' ? 'active' : 'neutral'}>{m.classification}</Chip>
        </li>)}</ul>}
    </div>
    {used}{footer}
  </Panel>

  const p = data.priority
  return <Panel title="Assessment" action={<Chip tone={p.label === 'Hot' ? 'active' : p.label === 'Not enough data' ? 'quiet' : 'neutral'} label="Priority">{p.label}</Chip>}>
    <ul className="mb-2 grid gap-1 text-sm">{p.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
    <div className="grid gap-3 sm:grid-cols-2">
      <Line label="Money at stake per year">{data.atStake.length ? data.atStake.map(range).join(' · ') : 'No yearly cost stated yet'}</Line>
      <Line label="Expected yearly saving" note={data.improvement ? `At the ${pct(data.improvement.low)}${data.improvement.high !== data.improvement.low ? `–${pct(data.improvement.high)}` : ''} improvement needed` : undefined}>
        {data.saving.length ? data.saving.map(range).join(' · ') : data.improvement ? 'No yearly cost stated yet' : 'No improvement target stated yet'}
      </Line>
      {data.energy && <Line label="Energy saving at your energy price" note={`From ${whole(data.energy.kWhPerYear)} kWh a year. Not added to the saving above, to avoid counting twice.`}>{range(data.energy)}</Line>}
    </div>
    {data.matches.length > 0 && <div className="mt-4">
      <span className="label" style={{ color: 'var(--color-faint)' }}>PAYBACK BY MATCH</span>
      <ul className="mt-1 grid gap-2">{data.matches.map((m) => <li key={m.reference} className="flex flex-wrap items-baseline justify-between gap-3 border-t pt-2" style={{ borderColor: 'var(--rule)' }}>
        <Link to={`/admin/matches/${m.reference}`} className="min-w-0 flex-1 underline">{m.title ?? m.other}</Link>
        <span className="text-sm">{paybackText(m.payback)}</span>
        <Chip tone={m.classification === 'Strong Match' ? 'active' : 'neutral'}>{m.classification}</Chip>
      </li>)}</ul>
    </div>}
    {data.notes.length > 0 && <ul className="mt-3 grid gap-1 text-sm" style={{ color: 'var(--color-muted)' }}>{data.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    {used}{footer}
  </Panel>
}
