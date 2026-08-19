import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, Panel, readableSize, shortDateTime } from './ui'
import type { Me } from './api'

const READINESS_TONE: Record<string, 'active' | 'neutral' | 'quiet'> = {
  Ready: 'active', Qualified: 'active', Developing: 'neutral', Early: 'quiet',
}

/** Failures are marked, not hidden — they are the load-bearing entries. */
const KIND_TONE = (kind: string) => (kind === 'Failure' ? 'active' : 'quiet')

function StageTrack({ stages, current }: { stages: string[]; current: string }) {
  const index = stages.indexOf(current)
  return (
    <ol className="flex flex-wrap gap-1 overflow-x-auto">
      {stages.map((stage, i) => {
        const done = i < index
        const now = i === index
        return (
          <li key={stage} className="flex-1" style={{ minWidth: '5.5rem' }}>
            <div
              className="h-1 transition-colors duration-500"
              style={{
                background: now ? 'var(--color-accent)' : done ? 'var(--color-muted)' : 'var(--rule)',
              }}
            />
            <span
              className="label mt-2 block leading-tight"
              style={{ color: now ? 'var(--color-accent)' : done ? 'var(--color-muted)' : 'var(--color-faint)' }}
            >
              {stage}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function Workspace({ me }: { me: Me }) {
  const { reference = '' } = useParams()
  const [data, setData] = useState<api.Workspace | null>(null)
  const [meta, setMeta] = useState<api.Meta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [entry, setEntry] = useState({
    kind: 'Experiment', title: '', body: '', occurredOn: '', stage: '', trl: '',
  })
  const [files, setFiles] = useState<File[]>([])

  const load = useCallback(() => {
    api.workspace(reference).then(setData).catch((e) => setError(e.message))
  }, [reference])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.meta().then(setMeta).catch(() => undefined) }, [])

  if (error && !data) return <Empty>{error}</Empty>
  if (!data || !meta) return <Empty>Loading…</Empty>

  const readinessFor = (key: string) => data.readiness.find((r) => r.dimension === key)
  const attachmentsFor = (logId: number) => data.attachments.filter((a) => a.logId === logId)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entry.title.trim()) return
    setBusy(true)
    setError(null)
    try {
      await api.addLogEntry(reference, entry, files)
      setEntry({ kind: 'Experiment', title: '', body: '', occurredOn: '', stage: '', trl: '' })
      setFiles([])
      load()
    } catch (cause) {
      setError(cause instanceof api.AdminError ? cause.message : 'Could not save the entry.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <div>
        <Link to="/admin/development" className="label" style={{ color: 'var(--color-muted)' }}>← R&amp;D DEVELOPMENT</Link>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="ident text-[1.125rem]" style={{ color: 'var(--color-accent)' }}>{data.reference}</span>
          <Chip label="STAGE" tone={data.developmentStage === 'Transfer Readiness' ? 'active' : 'neutral'}>
            {data.developmentStage}
          </Chip>
          <Chip label="PORTFOLIO" tone="quiet">{data.acquisitionStage}</Chip>
        </div>
        <h1 className="section-type mt-3">{data.title}</h1>
      </div>

      {/* TRL — entry, current, target */}
      <Panel title="Technology readiness">
        <div className="flex flex-wrap items-end gap-8">
          {[
            ['Entry', data.entryTrl, 'var(--color-muted)'],
            ['Current', data.currentTrl, 'var(--color-accent)'],
            ['Target', data.targetTrl ?? '—', 'var(--color-faint)'],
          ].map(([label, value, colour]) => (
            <div key={String(label)}>
              <p className="label" style={{ color: 'var(--color-faint)' }}>{String(label).toUpperCase()}</p>
              <p className="mt-2 font-display text-[2rem] font-medium leading-none tabular-nums" style={{ color: String(colour) }}>
                {typeof value === 'number' ? `TRL ${value}` : String(value)}
              </p>
            </div>
          ))}
          <div className="w-full flex-1 overflow-x-auto sm:min-w-[16rem]">
            <div className="flex min-w-[16rem] gap-1">
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
                const added = n > data.entryTrl && n <= data.currentTrl
                const reached = n <= data.entryTrl
                const planned = data.targetTrl !== null && n > data.currentTrl && n <= data.targetTrl
                return (
                  <div key={n} className="flex-1">
                    <div
                      className="h-7 transition-colors duration-500"
                      style={{
                        background: added ? 'var(--color-accent)' : reached ? 'var(--color-muted)' : 'transparent',
                        border: `1px solid ${planned ? 'var(--color-accent)' : 'var(--rule)'}`,
                        borderStyle: planned ? 'dashed' : 'solid',
                      }}
                    />
                    <span className="label mt-1 block text-center" style={{ color: 'var(--color-faint)' }}>{n}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Panel>

      {/* Development stage */}
      <Panel
        title="Development stage"
        action={
          me.can.editReviewState ? (
            <select
              value={data.developmentStage}
              onChange={(e) => api.setDevelopmentStage(reference, e.target.value).then(load)}
              className="field-input py-1.5 text-[0.8125rem]"
              style={{ width: 'auto' }}
            >
              {meta.developmentStages.map((s) => <option key={s}>{s}</option>)}
            </select>
          ) : undefined
        }
      >
        <StageTrack stages={meta.developmentStages} current={data.developmentStage} />
      </Panel>

      {/* Transfer readiness */}
      <Panel title="Transfer readiness">
        <p className="mb-5 max-w-[62ch] text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Six dimensions rather than one number. A single readiness percentage hides
          which half is missing, and the missing half is what a buyer asks about first.
        </p>
        <div className="grid gap-3">
          {meta.readinessDimensions.map((dimension) => {
            const current = readinessFor(dimension.key)
            return (
              <div
                key={dimension.key}
                className="grid gap-3 py-3 sm:grid-cols-[10rem_auto_1fr] sm:items-center"
                style={{ borderBottom: '1px solid var(--rule)' }}
              >
                <span className="text-[0.875rem] font-medium">{dimension.label}</span>
                <div className="flex flex-wrap gap-1">
                  {meta.readinessStatuses.map((status) => {
                    const on = current?.status === status
                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={!me.can.editReviewState}
                        onClick={() => api.setReadiness(reference, dimension.key, status, current?.note ?? '').then(load)}
                        aria-pressed={on}
                        className="label px-2.5 py-1.5 transition-colors duration-200 disabled:cursor-not-allowed"
                        style={{
                          border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
                          background: on ? 'var(--color-accent)' : 'transparent',
                          color: on ? '#fff' : 'var(--color-muted)',
                        }}
                      >
                        {status}
                      </button>
                    )
                  })}
                </div>
                <input
                  defaultValue={current?.note ?? ''}
                  disabled={!me.can.editReviewState}
                  placeholder="What this status rests on"
                  onBlur={(e) => {
                    if (current && e.target.value !== (current.note ?? '')) {
                      api.setReadiness(reference, dimension.key, current.status, e.target.value).then(load)
                    }
                  }}
                  className="field-input py-2 text-[0.875rem]"
                />
              </div>
            )
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {meta.readinessDimensions.map((d) => {
            const current = readinessFor(d.key)
            return (
              <Chip key={d.key} label={d.label.toUpperCase()} tone={current ? READINESS_TONE[current.status] : 'quiet'}>
                {current?.status ?? 'Not set'}
              </Chip>
            )
          })}
        </div>
      </Panel>

      {/* Log */}
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem] [&>*]:min-w-0">
        <Panel title={`Development log — ${data.log.length} ${data.log.length === 1 ? 'entry' : 'entries'}`}>
          {data.log.length === 0 ? (
            <Empty>Nothing logged yet.</Empty>
          ) : (
            <ol>
              {data.log.map((item) => {
                const attachments = attachmentsFor(item.id)
                return (
                  <li key={item.id} className="py-5" style={{ borderTop: '1px solid var(--rule)' }}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="label tabular-nums" style={{ color: 'var(--color-muted)' }}>
                        {item.occurredOn ? item.occurredOn.replace(/-/g, ' / ') : '—'}
                      </span>
                      <Chip tone={KIND_TONE(item.kind)}>{item.kind}</Chip>
                      {item.stage && <Chip tone="quiet">{item.stage}</Chip>}
                      {item.trl !== null && <Chip tone="active">TRL {item.trl}</Chip>}
                      {item.published && <Chip tone="active">Published</Chip>}
                    </div>

                    <h3 className="mt-3 font-display text-[1.125rem] font-medium tracking-[-0.02em]">{item.title}</h3>
                    {item.body && (
                      <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                        {item.body}
                      </p>
                    )}

                    {attachments.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {attachments.map((a) => (
                          <li key={a.fileName}>
                            <a
                              href={a.url}
                              className="label px-2.5 py-1.5 transition-colors duration-200 hover:text-accent"
                              style={{ border: '1px solid var(--rule-strong)' }}
                            >
                              {a.fileName} · {readableSize(a.sizeBytes)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <span className="label" style={{ color: 'var(--color-faint)' }}>
                        {item.author} · {shortDateTime(item.createdAt)}
                      </span>
                      {me.can.moveAcquisitionStage && (
                        <button
                          type="button"
                          onClick={() => api.publishLogEntry(item.id, !item.published).then(load)}
                          className="label transition-colors duration-200 hover:text-accent"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {item.published ? 'UNPUBLISH' : 'PUBLISH TO TECHNOLOGY PAGE'}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </Panel>

        <div className="grid content-start gap-6">
          <Panel title="Log development work">
            {!me.can.editReviewState ? (
              <p className="label" style={{ color: 'var(--color-faint)' }}>
                LOGGING IS LIMITED TO R&amp;D REVIEWERS AND ADMINS
              </p>
            ) : (
              <form onSubmit={submit} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="label" style={{ color: 'var(--color-faint)' }}>KIND</span>
                  <select
                    value={entry.kind}
                    onChange={(e) => setEntry({ ...entry, kind: e.target.value })}
                    className="field-input py-2 text-[0.875rem]"
                  >
                    {meta.logKinds.map((k) => <option key={k}>{k}</option>)}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="label" style={{ color: 'var(--color-faint)' }}>TITLE</span>
                  <input
                    required
                    value={entry.title}
                    onChange={(e) => setEntry({ ...entry, title: e.target.value })}
                    className="field-input py-2 text-[0.875rem]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="label" style={{ color: 'var(--color-faint)' }}>DETAIL</span>
                  <textarea
                    rows={4}
                    value={entry.body}
                    onChange={(e) => setEntry({ ...entry, body: e.target.value })}
                    placeholder="What was done, what happened, what it means"
                    className="field-input text-[0.875rem]"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="grid min-w-0 gap-2">
                    <span className="label" style={{ color: 'var(--color-faint)' }}>DATE OF WORK</span>
                    <input
                      type="date"
                      value={entry.occurredOn}
                      onChange={(e) => setEntry({ ...entry, occurredOn: e.target.value })}
                      className="field-input py-2 text-[0.875rem]"
                    />
                  </label>
                  <label className="grid min-w-0 gap-2">
                    <span className="label" style={{ color: 'var(--color-faint)' }}>TRL REACHED</span>
                    <input
                      type="number" min={1} max={9}
                      value={entry.trl}
                      onChange={(e) => setEntry({ ...entry, trl: e.target.value })}
                      placeholder="Optional"
                      className="field-input py-2 text-[0.875rem]"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="label" style={{ color: 'var(--color-faint)' }}>STAGE</span>
                  <select
                    value={entry.stage}
                    onChange={(e) => setEntry({ ...entry, stage: e.target.value })}
                    className="field-input py-2 text-[0.875rem]"
                  >
                    <option value="">Not specified</option>
                    {meta.developmentStages.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="label" style={{ color: 'var(--color-faint)' }}>ATTACHMENTS</span>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                    className="w-full min-w-0 text-[0.8125rem]"
                  />
                  {files.length > 0 && (
                    <span className="label" style={{ color: 'var(--color-muted)' }}>
                      {files.length} FILE{files.length === 1 ? '' : 'S'} READY
                    </span>
                  )}
                </label>

                {error && (
                  <p role="alert" className="label" style={{ color: 'var(--color-accent-deep)' }}>{error}</p>
                )}

                <p className="label" style={{ color: 'var(--color-faint)' }}>
                  ENTRIES ARE PRIVATE UNTIL EXPLICITLY PUBLISHED
                </p>

                <button
                  type="submit"
                  disabled={busy}
                  className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-colors duration-300 hover:bg-accent disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Add entry'}
                </button>
              </form>
            )}
          </Panel>

          <Panel title="Public timeline">
            {data.log.filter((l) => l.published).length === 0 ? (
              <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                Nothing published. A technology page shows only entries approved for
                publication — never the working log.
              </p>
            ) : (
              <ol className="space-y-3">
                {data.log.filter((l) => l.published).map((l) => (
                  <li key={l.id} className="flex gap-4">
                    <span className="label tabular-nums shrink-0" style={{ color: 'var(--color-accent)' }}>
                      {l.occurredOn ? l.occurredOn.slice(0, 7).replace('-', ' / ') : '—'}
                    </span>
                    <span className="label" style={{ color: 'var(--color-muted)' }}>{l.title.toUpperCase()}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
