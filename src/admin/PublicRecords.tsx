import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, shortDate } from './ui'

type Kind = 'tech' | 'problem'

/** Two words the operator has to be able to tell apart at a glance. */
function TypeChip({ recordType }: { recordType: 'demo' | 'live' }) {
  return (
    <Chip tone={recordType === 'demo' ? 'quiet' : 'neutral'}>
      {recordType === 'demo' ? 'ILLUSTRATIVE' : 'LIVE'}
    </Chip>
  )
}

function StateChip({ published }: { published: boolean }) {
  return <Chip tone={published ? 'active' : 'quiet'}>{published ? 'PUBLISHED' : 'DRAFT'}</Chip>
}

/**
 * Everything the public site shows, and the controls that put it there.
 *
 * Both registers on one page because they are the same job — deciding what the
 * world sees — and because an operator checking whether the site looks empty
 * wants one answer, not two pages to compare.
 *
 * The distinction that runs through it is `origin`. A submission-derived
 * record reads its TRL, domain and stage from the workspace, so those are
 * shown here but not editable; an authored one carries its own, because there
 * is no workspace record for it to contradict. Publishing a submission-derived
 * technology still requires rights to be held. An authored one has no rights
 * to hold, so that gate does not apply to it — which is stated on the row
 * rather than left for someone to discover from an error.
 */
export default function PublicRecords() {
  const [kind, setKind] = useState<Kind>('tech')
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="section-type">Public records</h1>
        <div className="flex" role="group" aria-label="Register">
          {(['tech', 'problem'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className="tap label px-3 py-1.5 transition-colors duration-250"
              style={{
                border: `1px solid ${kind === k ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
                marginLeft: k === 'problem' ? '-1px' : 0,
                color: kind === k ? 'var(--color-accent)' : 'var(--color-muted)',
              }}
            >
              {k === 'tech' ? 'TECHNOLOGIES' : 'INDUSTRIAL PROBLEMS'}
            </button>
          ))}
        </div>
      </div>
      {kind === 'tech' ? <Technologies /> : <Problems />}
    </div>
  )
}

/* ------------------------------------------------------------ technologies */

function Technologies() {
  const [items, setItems] = useState<api.TechProfileRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [name, setName] = useState('')

  const load = () => {
    setError(null)
    api.techProfiles().then((r) => setItems(r.items)).catch((e) => setError(e.message))
  }
  useEffect(load, [])

  const act = async (reference: string, fn: () => Promise<unknown>) => {
    setBusy(reference)
    try { await fn(); load() }
    catch (e) { setError(e instanceof Error ? e.message : 'That did not work') }
    finally { setBusy(null) }
  }

  const create = async () => {
    if (!name.trim()) return
    await act('new', async () => { await api.createTechProfile({ name: name.trim() }); setName('') })
  }

  return (
    <>
      {error && (
        <p role="alert" className="label px-3 py-2" style={{ border: '1px solid var(--color-accent-deep)', color: 'var(--color-accent-deep)' }}>
          {error}
        </p>
      )}

      {/* Create takes a name and nothing else. The rest is written in the
          editor, and a create form that asks for twelve fields is one people
          abandon halfway and leave a half-record behind. */}
      <div className="flex flex-wrap items-end gap-3 p-4" style={{ border: '1px solid var(--rule)' }}>
        <div className="min-w-[16rem] grow">
          <label htmlFor="new-tech" className="label" style={{ color: 'var(--color-faint)' }}>
            NEW TECHNOLOGY PAGE
          </label>
          <input
            id="new-tech"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') create() }}
            placeholder="Public name"
            className="field-input mt-2 py-2 text-[0.9375rem]"
          />
        </div>
        <button
          type="button"
          onClick={create}
          disabled={!name.trim() || busy === 'new'}
          className="tap label px-4 py-2.5 transition-colors duration-250 disabled:opacity-50"
          style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
        >
          CREATE
        </button>
      </div>

      {items === null ? (
        <p className="label" style={{ color: 'var(--color-faint)' }}>LOADING</p>
      ) : items.length === 0 ? (
        <Empty>No public technology pages yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Reference', 'Name', 'Origin', 'TRL', 'Transfer', 'State', 'Type', ''].map((h) => (
                  <th key={h} scope="col" className="label whitespace-nowrap px-3 py-2 text-left first:pl-0"
                      style={{ color: 'var(--color-faint)', borderBottom: '1px solid var(--rule-strong)' }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const cell = { borderBottom: '1px solid var(--rule)' }
                return (
                  <tr key={t.reference}>
                    <td className="ident whitespace-nowrap px-3 py-3 pl-0 align-middle" style={{ ...cell, color: 'var(--color-accent)' }}>
                      {t.reference}
                    </td>
                    <td className="px-3 py-3 align-middle text-[0.9375rem]" style={cell}>
                      {t.published ? (
                        <a href={`/technologies/${t.slug}`} target="_blank" rel="noopener noreferrer"
                           className="border-b border-transparent hover:border-current">
                          {t.name}
                        </a>
                      ) : t.name}
                    </td>
                    <td className="label px-3 py-3 align-middle" style={{ ...cell, color: 'var(--color-muted)' }}>
                      {t.origin === 'authored' ? 'AUTHORED' : 'SUBMISSION'}
                    </td>
                    <td className="ident whitespace-nowrap px-3 py-3 align-middle tabular-nums" style={{ ...cell, color: 'var(--color-muted)' }}>
                      {t.currentTrl ? `${String(t.currentTrl).padStart(2, '0')} → ${String(t.targetTrl ?? 9).padStart(2, '0')}` : '—'}
                    </td>
                    <td className="label px-3 py-3 align-middle" style={{ ...cell, color: 'var(--color-muted)' }}>
                      {t.transferStatus.toUpperCase()}
                    </td>
                    <td className="px-3 py-3 align-middle" style={cell}><StateChip published={t.published} /></td>
                    <td className="px-3 py-3 align-middle" style={cell}><TypeChip recordType={t.recordType} /></td>
                    <td className="px-3 py-3 align-middle" style={cell}>
                      <div className="flex flex-wrap justify-end gap-2">
                        {/* Editing a submission-derived page lives on the
                            innovation it belongs to; there is no second editor
                            for the same record. */}
                        {t.origin === 'submission' && (
                          <Link to={`/admin/innovations/${t.reference}`} className="tap label px-2.5 py-1"
                                style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                            EDIT
                          </Link>
                        )}
                        <button
                          type="button"
                          disabled={busy === t.reference}
                          onClick={() => act(t.reference, () =>
                            api.setRecordType('tech', t.reference, t.recordType === 'demo' ? 'live' : 'demo'))}
                          className="tap label px-2.5 py-1 disabled:opacity-50"
                          style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}
                        >
                          MARK {t.recordType === 'demo' ? 'LIVE' : 'DEMO'}
                        </button>
                        <button
                          type="button"
                          disabled={busy === t.reference}
                          onClick={() => act(t.reference, () => api.publishProfile(t.reference, !t.published))}
                          className="tap label px-2.5 py-1 disabled:opacity-50"
                          style={{
                            border: `1px solid ${t.published ? 'var(--rule-strong)' : 'var(--color-accent)'}`,
                            color: t.published ? 'var(--color-muted)' : 'var(--color-accent)',
                          }}
                        >
                          {t.published ? 'UNPUBLISH' : 'PUBLISH'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- problems */

const EMPTY_DRAFT = {
  slug: '', title: '', sector: '', priorityArea: '', target: '',
  summary: '', problem: '', currentApproach: '', targetOutcome: '',
  constraints: '', environment: '', impact: '',
  minimumTrl: 4, status: 'Open challenge', recordType: 'live' as 'demo' | 'live',
}

function Problems() {
  const [items, setItems] = useState<api.ProblemProfile[] | null>(null)
  const [meta, setMeta] = useState<{ statuses: string[]; priorityAreas: string[]; sectors: string[] }>(
    { statuses: [], priorityAreas: [], sectors: [] },
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  const load = () => {
    setError(null)
    api.problemProfiles()
      .then((r) => { setItems(r.items); setMeta({ statuses: r.statuses, priorityAreas: r.priorityAreas, sectors: r.sectors }) })
      .catch((e) => setError(e.message))
  }
  useEffect(load, [])

  const act = async (reference: string, fn: () => Promise<unknown>) => {
    setBusy(reference)
    try { await fn(); load() }
    catch (e) { setError(e instanceof Error ? e.message : 'That did not work') }
    finally { setBusy(null) }
  }

  const open = (p: api.ProblemProfile) => {
    setEditing(p.reference)
    setDraft({
      slug: p.slug, title: p.title, sector: p.sector, priorityArea: p.priorityArea,
      target: p.target, summary: p.summary, problem: p.problem,
      currentApproach: p.currentApproach, targetOutcome: p.targetOutcome,
      // One per line in the editor, an array on the wire. A comma-separated
      // box cannot hold a constraint with a comma in it, and they all have one.
      constraints: p.constraints.join('\n'),
      environment: p.environment.join('\n'),
      impact: p.impact.join('\n'),
      minimumTrl: p.minimumTrl, status: p.status, recordType: p.recordType,
    })
  }

  const save = async () => {
    if (!editing) return
    const lines = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean)
    await act(editing, async () => {
      await api.saveProblemProfile(editing, {
        ...draft,
        constraints: lines(draft.constraints),
        environment: lines(draft.environment),
        impact: lines(draft.impact),
        outcomes: [],
      })
      setEditing(null)
    })
  }

  const field = (k: keyof typeof draft, label: string, rows = 1, options?: string[]) => (
    <div>
      <label htmlFor={`p-${k}`} className="label" style={{ color: 'var(--color-faint)' }}>{label.toUpperCase()}</label>
      {options ? (
        <select id={`p-${k}`} value={String(draft[k])} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                className="field-input mt-1.5 py-2 text-[0.9375rem]">
          <option value="">—</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : rows > 1 ? (
        <textarea id={`p-${k}`} rows={rows} value={String(draft[k])}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                  className="field-input mt-1.5 py-2 text-[0.9375rem]" />
      ) : (
        <input id={`p-${k}`} value={String(draft[k])}
               onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
               className="field-input mt-1.5 py-2 text-[0.9375rem]" />
      )}
    </div>
  )

  return (
    <>
      {error && (
        <p role="alert" className="label px-3 py-2" style={{ border: '1px solid var(--color-accent-deep)', color: 'var(--color-accent-deep)' }}>
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3 p-4" style={{ border: '1px solid var(--rule)' }}>
        <div className="min-w-[16rem] grow">
          <label htmlFor="new-problem" className="label" style={{ color: 'var(--color-faint)' }}>
            NEW INDUSTRIAL PROBLEM
          </label>
          <input
            id="new-problem"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) act('new', async () => { await api.createProblemProfile({ title: title.trim() }); setTitle('') }) }}
            placeholder="Problem title"
            className="field-input mt-2 py-2 text-[0.9375rem]"
          />
        </div>
        <button
          type="button"
          disabled={!title.trim() || busy === 'new'}
          onClick={() => act('new', async () => { await api.createProblemProfile({ title: title.trim() }); setTitle('') })}
          className="tap label px-4 py-2.5 transition-colors duration-250 disabled:opacity-50"
          style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
        >
          CREATE
        </button>
      </div>

      {items === null ? (
        <p className="label" style={{ color: 'var(--color-faint)' }}>LOADING</p>
      ) : items.length === 0 ? (
        <Empty>No public industrial problems yet.</Empty>
      ) : (
        <ul className="grid gap-3">
          {items.map((p) => (
            <li key={p.reference} className="p-4" style={{ border: '1px solid var(--rule)' }}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="ident" style={{ color: 'var(--color-accent)' }}>{p.reference}</span>
                  <span className="text-[0.9375rem] font-medium">{p.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {p.sector && <Chip tone="quiet" label="INDUSTRY">{p.sector}</Chip>}
                  <Chip tone="quiet">{p.status.toUpperCase()}</Chip>
                  <StateChip published={p.published} />
                  <TypeChip recordType={p.recordType} />
                  <span className="label" style={{ color: 'var(--color-faint)' }}>{shortDate(p.updatedAt)}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
                <button type="button" onClick={() => (editing === p.reference ? setEditing(null) : open(p))}
                        className="tap label px-2.5 py-1"
                        style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                  {editing === p.reference ? 'CLOSE' : 'EDIT'}
                </button>
                <button type="button" disabled={busy === p.reference}
                        onClick={() => act(p.reference, () => api.setRecordType('problem', p.reference, p.recordType === 'demo' ? 'live' : 'demo'))}
                        className="tap label px-2.5 py-1 disabled:opacity-50"
                        style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                  MARK {p.recordType === 'demo' ? 'LIVE' : 'DEMO'}
                </button>
                <button type="button" disabled={busy === p.reference}
                        onClick={() => act(p.reference, () => api.publishProblemProfile(p.reference, !p.published))}
                        className="tap label px-2.5 py-1 disabled:opacity-50"
                        style={{
                          border: `1px solid ${p.published ? 'var(--rule-strong)' : 'var(--color-accent)'}`,
                          color: p.published ? 'var(--color-muted)' : 'var(--color-accent)',
                        }}>
                  {p.published ? 'UNPUBLISH' : 'PUBLISH'}
                </button>
                {p.published && (
                  <a href={`/problems/${p.slug}`} target="_blank" rel="noopener noreferrer"
                     className="tap label px-2.5 py-1"
                     style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                    VIEW ↗
                  </a>
                )}
              </div>

              {editing === p.reference && (
                <div className="mt-5 grid gap-4 pt-4 sm:grid-cols-2" style={{ borderTop: '1px solid var(--rule)' }}>
                  {field('title', 'Title')}
                  {field('slug', 'Slug')}
                  {field('sector', 'Industry', 1, meta.sectors)}
                  {field('priorityArea', 'Priority area', 1, meta.priorityAreas)}
                  {field('target', 'Target')}
                  {field('status', 'Status', 1, meta.statuses)}
                  <div className="sm:col-span-2">{field('summary', 'Summary', 2)}</div>
                  <div className="sm:col-span-2">{field('problem', 'Problem statement', 5)}</div>
                  <div className="sm:col-span-2">{field('currentApproach', 'Current approach', 3)}</div>
                  <div className="sm:col-span-2">{field('targetOutcome', 'Desired outcome', 3)}</div>
                  <div className="sm:col-span-2">{field('constraints', 'Constraints — one per line', 4)}</div>
                  <div className="sm:col-span-2">{field('environment', 'Operating conditions — "Term: value", one per line', 4)}</div>
                  <div className="sm:col-span-2">{field('impact', 'Impact — one per line', 3)}</div>
                  <div>
                    <label htmlFor="p-trl" className="label" style={{ color: 'var(--color-faint)' }}>MINIMUM TRL</label>
                    <input id="p-trl" type="number" min={1} max={9} value={draft.minimumTrl}
                           onChange={(e) => setDraft({ ...draft, minimumTrl: Number(e.target.value) })}
                           className="field-input mt-1.5 py-2 text-[0.9375rem]" />
                  </div>
                  <div className="flex items-end gap-3 sm:col-span-2">
                    <button type="button" onClick={save} disabled={busy === p.reference}
                            className="tap label px-4 py-2.5 disabled:opacity-50"
                            style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                      SAVE
                    </button>
                    <p className="label" style={{ color: 'var(--color-faint)' }}>
                      SAVING DOES NOT PUBLISH
                    </p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
