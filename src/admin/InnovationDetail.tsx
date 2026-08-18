import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, Field, Panel, Withheld, readableSize, shortDateTime } from './ui'
import type { Me } from './api'

/** Field keys the submitter filled in, in the order the form asked for them. */
const NARRATIVE: [string, string][] = [
  ['technical', 'Technical summary'],
  ['problem', 'Problem solved'],
  ['whoHasIt', 'Who has this problem'],
  ['solvedToday', 'How it is solved today'],
  ['different', 'Why this is different'],
  ['principle', 'Scientific / engineering principle'],
  ['components', 'Key materials or components'],
  ['process', 'Process description'],
  ['advantages', 'Main advantages'],
  ['limitations', 'Known limitations'],
  ['applications', 'Potential applications'],
]

const IP_FIELDS: [string, string][] = [
  ['isInventor', 'Is the inventor'],
  ['owner', 'Current owner'],
  ['universityProject', 'University project'],
  ['usedInfrastructure', 'Institutional infrastructure used'],
  ['universityFunding', 'University funding'],
  ['externalFunding', 'External funding'],
  ['facultyInvolved', 'Faculty involved'],
  ['duringEmployment', 'Developed during employment'],
  ['patentFiled', 'Patent filed'],
  ['patentNumber', 'Patent application number'],
  ['patentOwner', 'Patent owner'],
  ['paperPublished', 'Paper published'],
  ['publiclyDisclosed', 'Publicly disclosed'],
  ['competition', 'Shown in a competition'],
  ['licenceGranted', 'Licence granted'],
  ['commercialised', 'Commercialised'],
]

const IDENTITY: [string, string][] = [
  ['name', 'Name'],
  ['email', 'Email'],
  ['mobile', 'Mobile'],
  ['linkedin', 'LinkedIn'],
  ['institution', 'Institution'],
  ['institutionType', 'Institution type'],
  ['department', 'Department'],
  ['course', 'Course'],
  ['graduationYear', 'Graduation year'],
  ['location', 'Location'],
  ['coInventors', 'Co-inventors'],
  ['teamMembers', 'Team members'],
  ['facultyMentor', 'Faculty mentor'],
]

const text = (payload: Record<string, unknown>, key: string) => {
  const v = payload[key]
  if (Array.isArray(v)) return v.length ? v.join(', ') : ''
  return typeof v === 'string' ? v : ''
}

export default function InnovationDetail({ me }: { me: Me }) {
  const { reference = '' } = useParams()
  const [data, setData] = useState<api.InnovationDetail | null>(null)
  const [meta, setMeta] = useState<api.Meta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(() => {
    api.innovation(reference).then(setData).catch((e) => setError(e.message))
  }, [reference])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.meta().then(setMeta).catch(() => undefined) }, [])

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true)
    try {
      await api.patchInnovation(reference, body)
      load()
    } catch (e) {
      setError(e instanceof api.AdminError ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <Empty>{error}</Empty>
  if (!data || !meta) return <Empty>Loading…</Empty>

  const payload = data.payload
  const scoreFor = (dimension: string) => data.scores.find((s) => s.dimension === dimension)

  return (
    <div className="grid gap-6">
      <div>
        <Link to="/admin/innovations" className="label" style={{ color: 'var(--color-muted)' }}>
          ← INNOVATIONS
        </Link>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="ident text-[1.125rem]" style={{ color: 'var(--color-accent)' }}>{data.reference}</span>
          <Chip tone="quiet" label="STATUS">{data.status}</Chip>
          <Chip label="STAGE" tone={data.acquisitionStage === 'Development Portfolio' ? 'active' : 'neutral'}>
            {data.acquisitionStage}
          </Chip>
        </div>
        <h1 className="section-type mt-3">{data.internalTitle || data.title}</h1>
        {data.internalTitle && (
          <p className="mt-2 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
            Submitted as “{data.title}”
          </p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <Panel title="Submission">
            <dl>
              {NARRATIVE.map(([key, label]) => {
                const value = text(payload, key)
                return value ? <Field key={key} label={label}>{value}</Field> : null
              })}
              {text(payload, 'industries') && (
                <Field label="Industries that may benefit">{text(payload, 'industries')}</Field>
              )}
            </dl>
          </Panel>

          <Panel title="Intellectual property">
            <dl>
              {IP_FIELDS.map(([key, label]) => {
                const value = text(payload, key)
                return value ? <Field key={key} label={label}>{value}</Field> : null
              })}
            </dl>
          </Panel>

          <Panel title="Evidence">
            {data.evidence.length === 0 ? (
              <Empty>No files were attached.</Empty>
            ) : (
              <ul>
                {data.evidence.map((file) => (
                  <li
                    key={file.fileName}
                    className="flex flex-wrap items-center justify-between gap-4 py-3"
                    style={{ borderBottom: '1px solid var(--rule)' }}
                  >
                    <span className="min-w-0 flex-1 truncate text-[0.875rem]">{file.fileName}</span>
                    <span className="label" style={{ color: 'var(--color-faint)' }}>{readableSize(file.sizeBytes)}</span>
                    {file.url ? (
                      <a
                        href={file.url}
                        className="label px-3 py-1.5 transition-colors duration-200 hover:text-accent"
                        style={{ border: '1px solid var(--rule-strong)' }}
                      >
                        DOWNLOAD
                      </a>
                    ) : (
                      <span className="label" style={{ color: 'var(--color-faint)' }}>UNAVAILABLE</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
              LINKS EXPIRE AFTER FIVE MINUTES · DOWNLOADS ARE LOGGED
            </p>
          </Panel>

          <Panel title="Internal review">
            {!me.can.score ? (
              <Withheld>Scoring is limited to R&amp;D reviewers and admins.</Withheld>
            ) : (
              <div className="grid gap-4">
                {meta.dimensions.map((dimension) => {
                  const existing = scoreFor(dimension.key)
                  return (
                    <div
                      key={dimension.key}
                      className="grid gap-3 py-3 sm:grid-cols-[14rem_auto_1fr] sm:items-center"
                      style={{ borderBottom: '1px solid var(--rule)' }}
                    >
                      <span className="text-[0.875rem] font-medium">{dimension.label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const on = existing?.value === n
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => api.setScore(reference, dimension.key, on ? null : n, existing?.note ?? '').then(load)}
                              aria-pressed={on}
                              className="h-8 w-8 text-[0.8125rem] tabular-nums transition-colors duration-200"
                              style={{
                                border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
                                background: on ? 'var(--color-accent)' : 'transparent',
                                color: on ? '#fff' : 'var(--color-muted)',
                              }}
                            >
                              {n}
                            </button>
                          )
                        })}
                      </div>
                      <input
                        defaultValue={existing?.note ?? ''}
                        placeholder="Qualitative note"
                        onBlur={(e) => {
                          if (e.target.value !== (existing?.note ?? '')) {
                            api.setScore(reference, dimension.key, existing?.value ?? null, e.target.value).then(load)
                          }
                        }}
                        className="field-input py-2 text-[0.875rem]"
                      />
                    </div>
                  )
                })}
                <p className="label" style={{ color: 'var(--color-faint)' }}>
                  SCORES ARE INTERNAL AND NEVER APPEAR ON A PUBLIC TECHNOLOGY PROFILE
                </p>
              </div>
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

        {/* Sidebar */}
        <div className="grid content-start gap-6">
          <Panel title="Review state">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>STATUS</span>
                <select
                  value={data.status}
                  disabled={!me.can.editReviewState || saving}
                  onChange={(e) => patch({ status: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                >
                  {meta.innovationStatuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>ACQUISITION STAGE</span>
                <select
                  value={data.acquisitionStage}
                  disabled={!me.can.moveAcquisitionStage || saving}
                  onChange={(e) => patch({ acquisitionStage: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                >
                  {meta.acquisitionStages.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="label" style={{ color: 'var(--color-faint)' }}>ENTRY</span>
                  <p className="mt-1 text-[1.125rem] tabular-nums">{data.entryTrl}</p>
                </div>
                <label className="grid gap-1">
                  <span className="label" style={{ color: 'var(--color-faint)' }}>CURRENT</span>
                  <input
                    type="number" min={1} max={9}
                    defaultValue={data.currentTrl ?? ''}
                    disabled={!me.can.editReviewState}
                    onBlur={(e) => e.target.value && patch({ currentTrl: Number(e.target.value) })}
                    className="field-input py-1.5 text-[0.875rem]"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="label" style={{ color: 'var(--color-faint)' }}>TARGET</span>
                  <input
                    type="number" min={1} max={9}
                    defaultValue={data.targetTrl ?? ''}
                    disabled={!me.can.editReviewState}
                    onBlur={(e) => e.target.value && patch({ targetTrl: Number(e.target.value) })}
                    className="field-input py-1.5 text-[0.875rem]"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>INTERNAL TITLE</span>
                <input
                  defaultValue={data.internalTitle ?? ''}
                  disabled={!me.can.editReviewState}
                  onBlur={(e) => e.target.value !== (data.internalTitle ?? '') && patch({ internalTitle: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                />
              </label>

              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>REVIEWER</span>
                <input
                  defaultValue={data.reviewer ?? ''}
                  disabled={!me.can.editReviewState}
                  onBlur={(e) => e.target.value !== (data.reviewer ?? '') && patch({ reviewer: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                />
              </label>
            </div>
          </Panel>

          <Panel title="Innovator">
            {data.identityWithheld ? (
              <Withheld>
                Innovator identity is withheld from your role. You are assessing the
                technology, not the person.
              </Withheld>
            ) : (
              <dl>
                {IDENTITY.map(([key, label]) => {
                  const value = key === 'name' ? (data.innovator ?? '')
                    : key === 'email' ? (data.innovatorEmail ?? '')
                    : text(payload, key)
                  return value ? <Field key={key} label={label}>{value}</Field> : null
                })}
              </dl>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
