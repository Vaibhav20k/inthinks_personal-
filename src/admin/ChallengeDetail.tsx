import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from './api'
import { Link } from 'react-router-dom'
import { Chip, Empty, Field, Panel, Withheld, shortDateTime } from './ui'
import type { Me } from './api'

const PROBLEM: [string, string][] = [
  ['statement', 'Problem statement'],
  ['currently', 'What currently happens'],
  ['currentSolution', 'Current solution'],
  ['inadequate', 'Why it is inadequate'],
  ['success', 'What success looks like'],
]

const ENVIRONMENT: [string, string][] = [
  ['application', 'Application'],
  ['process', 'Process'],
  ['equipment', 'Equipment'],
  ['materials', 'Materials'],
  ['temperature', 'Operating temperature'],
  ['pressure', 'Pressure'],
  ['humidity', 'Humidity'],
  ['chemical', 'Chemical environment'],
  ['scale', 'Production scale'],
  ['performance', 'Performance requirement'],
  ['installation', 'Installation environment'],
  ['constraints', 'Other technical constraints'],
]

const CONSTRAINTS: [string, string][] = [
  ['targetPerformance', 'Target performance'],
  ['timeline', 'Implementation timeline'],
  ['desiredTrl', 'Desired TRL'],
  ['pilot', 'Pilot requirement'],
  ['retrofit', 'Retrofit requirement'],
  ['capex', 'CAPEX sensitivity'],
  ['opex', 'Operating-cost sensitivity'],
  ['manufacturing', 'Manufacturing restrictions'],
  ['regulatory', 'Regulatory constraints'],
  ['geographic', 'Geographic constraints'],
]

const text = (payload: Record<string, unknown>, key: string) => {
  const v = payload[key]
  if (Array.isArray(v)) return v.length ? v.join(', ') : ''
  return typeof v === 'string' ? v : ''
}

export default function ChallengeDetail({ me }: { me: Me }) {
  const { reference = '' } = useParams()
  const [data, setData] = useState<api.ChallengeDetail | null>(null)
  const [meta, setMeta] = useState<api.Meta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [matches, setMatches] = useState<api.MatchSummary[]>([])
  const [running, setRunning] = useState(false)
  const [engineMessage, setEngineMessage] = useState<string | null>(null)

  const loadMatches = useCallback(() => {
    api.matches({ challenge: reference }).then((r) => setMatches(r.items)).catch(() => undefined)
  }, [reference])

  const runEngine = async () => {
    setRunning(true)
    setEngineMessage(null)
    try {
      const result = await api.generateMatches(reference)
      setEngineMessage(
        result.created === 0
          ? `No candidates passed the prefilter. ${result.considered} technologies considered.`
          : `${result.created} candidate${result.created === 1 ? '' : 's'} from ${result.shortlisted} shortlisted of ${result.considered} considered.`,
      )
      loadMatches()
    } catch (cause) {
      setEngineMessage(cause instanceof api.AdminError ? cause.message : 'The match engine failed.')
    } finally {
      setRunning(false)
    }
  }

  const load = useCallback(() => {
    api.challenge(reference).then(setData).catch((e) => setError(e.message))
  }, [reference])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadMatches() }, [loadMatches])
  useEffect(() => { api.meta().then(setMeta).catch(() => undefined) }, [])

  if (error) return <Empty>{error}</Empty>
  if (!data || !meta) return <Empty>Loading…</Empty>

  const payload = data.payload
  const section = (fields: [string, string][]) =>
    fields.map(([key, label]) => {
      const value = text(payload, key)
      return value ? <Field key={key} label={label}>{value}</Field> : null
    })

  return (
    <div className="grid gap-6">
      <div>
        <Link to="/admin/challenges" className="label" style={{ color: 'var(--color-muted)' }}>
          ← CHALLENGES
        </Link>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="ident text-[1.125rem]" style={{ color: 'var(--color-accent)' }}>{data.reference}</span>
          <Chip label="STATUS">{data.status}</Chip>
          <Chip label="HANDLING" tone={data.confidentiality === 'nda-required' ? 'active' : 'quiet'}>
            {data.confidentiality === 'nda-required' ? 'NDA REQUIRED' : data.confidentiality.toUpperCase()}
          </Chip>
          <Chip tone="quiet">{data.sector}</Chip>
        </div>
        <h1 className="section-type mt-3">{data.title}</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <Panel title="The problem"><dl>{section(PROBLEM)}</dl></Panel>
          <Panel title="Technical environment"><dl>{section(ENVIRONMENT)}</dl></Panel>
          <Panel title="Business impact">
            <dl>
              {text(payload, 'impacts') && <Field label="Impacts">{text(payload, 'impacts')}</Field>}
              {text(payload, 'annualImpact') && <Field label="Estimated annual impact">{text(payload, 'annualImpact')}</Field>}
            </dl>
          </Panel>
          <Panel title="Solution constraints"><dl>{section(CONSTRAINTS)}</dl></Panel>

          <Panel
            title="Technology matches"
            action={
              <button
                type="button"
                onClick={runEngine}
                disabled={running}
                className="label px-3 py-2 transition-colors duration-200 hover:text-accent disabled:opacity-50"
                style={{ border: '1px solid var(--rule-strong)' }}
              >
                {running ? 'RUNNING…' : 'RUN MATCH ENGINE'}
              </button>
            }
          >
            {engineMessage && (
              <p className="label mb-4" style={{ color: 'var(--color-muted)' }}>{engineMessage.toUpperCase()}</p>
            )}
            {matches.length === 0 ? (
              <Empty>
                No candidates generated yet. The engine filters the portfolio on structured
                criteria, then assesses the shortlist — results are proposals for review.
              </Empty>
            ) : (
              <ul>
                {matches.map((m) => (
                  <li key={m.reference} className="py-3" style={{ borderTop: '1px solid var(--rule)' }}>
                    <Link to={`/admin/matches/${m.reference}`} className="flex flex-wrap items-center justify-between gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-medium">{m.technologyTitle ?? m.technologyRef}</span>
                        <span className="label" style={{ color: 'var(--color-faint)' }}>{m.technologyRef}</span>
                      </span>
                      <Chip tone={m.classification === 'Strong Match' ? 'active' : 'neutral'}>{m.classification}</Chip>
                      <Chip tone={m.decision === 'Pending' ? 'quiet' : 'neutral'}>{m.decision}</Chip>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Notes">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!note.trim()) return
                await api.addNote(reference, note)
                setNote('')
                load()
              }}
              className="grid gap-3"
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add an internal note"
                className="field-input"
              />
              <div>
                <button
                  type="submit"
                  className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-colors duration-300 hover:bg-accent"
                >
                  Add note
                </button>
              </div>
            </form>
            <ul className="mt-6">
              {data.notes.map((n) => (
                <li key={n.id} className="py-3" style={{ borderTop: '1px solid var(--rule)' }}>
                  <p className="label" style={{ color: 'var(--color-faint)' }}>
                    {n.author} · {shortDateTime(n.created_at)}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{n.body}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Handling">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>STATUS</span>
                <select
                  value={data.status}
                  onChange={(e) => api.patchChallenge(reference, { status: e.target.value }).then(load)}
                  className="field-input py-2 text-[0.875rem]"
                >
                  {meta.challengeStatuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>ASSIGNED ANALYST</span>
                <input
                  defaultValue={data.analyst ?? ''}
                  onBlur={(e) => e.target.value !== (data.analyst ?? '') && api.patchChallenge(reference, { analyst: e.target.value }).then(load)}
                  className="field-input py-2 text-[0.875rem]"
                />
              </label>
            </div>
          </Panel>

          <Panel title="Company">
            {data.contactsWithheld ? (
              <Withheld>Company contact details are withheld from your role.</Withheld>
            ) : (
              <dl>
                <Field label="Company">{data.company ?? '—'}</Field>
                <Field label="Contact">{data.contactName ?? '—'}</Field>
                {data.designation && <Field label="Designation">{data.designation}</Field>}
                <Field label="Email">{data.email ?? '—'}</Field>
                {data.phone && <Field label="Phone">{data.phone}</Field>}
                {data.location && <Field label="Location">{data.location}</Field>}
                {data.website && <Field label="Website">{data.website}</Field>}
              </dl>
            )}
          </Panel>

          {!me.can.viewChallengeContacts && (
            <p className="label" style={{ color: 'var(--color-faint)' }}>
              THE PROBLEM IS VISIBLE TO YOUR ROLE; THE COMPANY IS NOT
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
