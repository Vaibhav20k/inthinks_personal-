import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, Field, Panel, Withheld, shortDateTime } from './ui'
import type { Me } from './api'

const READINESS_TONE: Record<string, 'active' | 'neutral' | 'quiet'> = {
  Ready: 'active', Qualified: 'active', Developing: 'neutral', Early: 'quiet',
}

/**
 * One opportunity: the challenge, the technology, and the commercial
 * conversation between them.
 *
 * Readiness is carried across from the development workspace rather than
 * restated here, so what the pipeline shows about maturity is the same thing
 * R&D is recording — the two cannot disagree.
 */
export default function Opportunity({ me }: { me: Me }) {
  const { reference = '' } = useParams()
  const [data, setData] = useState<api.OpportunityDetail | null>(null)
  const [meta, setMeta] = useState<api.Meta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [closing, setClosing] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const navigate = useNavigate()

  const load = useCallback(() => {
    api.opportunity(reference).then(setData).catch((e) => setError(e.message))
  }, [reference])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.meta().then(setMeta).catch(() => undefined) }, [])

  const patch = async (body: Record<string, unknown>) => {
    setError(null)
    try {
      await api.patchOpportunity(reference, body)
      load()
    } catch (cause) {
      setError(cause instanceof api.AdminError ? cause.message : 'Update failed')
    }
  }

  if (error && !data) return <Empty>{error}</Empty>
  if (!data || !meta) return <Empty>Loading…</Empty>

  const closed = data.stage === 'Closed'

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <div>
        <Link to="/admin/opportunities" className="label" style={{ color: 'var(--color-muted)' }}>
          ← INDUSTRY OPPORTUNITIES
        </Link>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="ident text-[1.125rem]" style={{ color: 'var(--color-accent)' }}>{data.reference}</span>
          <Chip label="STAGE" tone={closed ? 'quiet' : 'active'}>{data.stage}</Chip>
          {data.challenge.confidentiality === 'nda-required' && <Chip tone="active">NDA REQUIRED</Chip>}
        </div>
        <h1 className="section-type mt-3">{data.challenge.title}</h1>
        {closed && data.closedReason && (
          <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
            Closed — {data.closedReason}
          </p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem] [&>*]:min-w-0">
        <div className="grid gap-6 [&>*]:min-w-0">
          <Panel title="Stage">
            {!me.can.moveAcquisitionStage ? (
              <Withheld>Moving an opportunity is limited to admins and business development.</Withheld>
            ) : (
              <>
                <ol className="grid gap-1">
                  {meta.opportunityStages.filter((s) => s !== 'Closed').map((s, i) => {
                    const index = meta.opportunityStages.indexOf(data.stage)
                    const done = i < index
                    const now = s === data.stage
                    return (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => patch({ stage: s })}
                          className="grid w-full grid-cols-[1.5rem_1fr] items-center gap-3 px-2 py-2 text-left transition-colors duration-200"
                          style={{ background: now ? 'var(--color-paper-sunk)' : 'transparent' }}
                        >
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5"
                            style={{
                              background: now ? 'var(--color-accent)' : done ? 'var(--color-muted)' : 'transparent',
                              border: `1px solid ${now ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
                            }}
                          />
                          <span
                            className="text-[0.9375rem]"
                            style={{ color: now ? 'var(--color-accent)' : done ? 'var(--color-muted)' : 'var(--color-ink)' }}
                          >
                            {s}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>

                <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--rule)' }}>
                  {closing ? (
                    <div className="grid gap-3">
                      <input
                        value={closeReason}
                        onChange={(e) => setCloseReason(e.target.value)}
                        placeholder="Why this opportunity closed"
                        className="field-input py-2 text-[0.875rem]"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { patch({ stage: 'Closed', closedReason: closeReason }); setClosing(false) }}
                          className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper"
                        >
                          Close opportunity
                        </button>
                        <button
                          type="button"
                          onClick={() => setClosing(false)}
                          className="label px-4 py-2.5"
                          style={{ border: '1px solid var(--rule-strong)' }}
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setClosing(true)}
                      className="label px-4 py-2.5 transition-colors duration-200 hover:text-accent"
                      style={{ border: '1px solid var(--rule-strong)' }}
                    >
                      CLOSE OPPORTUNITY
                    </button>
                  )}
                </div>
              </>
            )}
          </Panel>

          <Panel title="Transfer readiness">
            {data.readiness.length === 0 ? (
              <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                Nothing recorded yet. Readiness is set in the R&amp;D workspace and shown here
                unchanged, so the pipeline and development cannot disagree about maturity.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {data.readiness.map((r) => (
                    <Chip key={r.dimension} label={r.dimension.toUpperCase()} tone={READINESS_TONE[r.status] ?? 'quiet'}>
                      {r.status}
                    </Chip>
                  ))}
                </div>
                <ul className="mt-5">
                  {data.readiness.filter((r) => r.note).map((r) => (
                    <li key={r.dimension} className="py-2.5" style={{ borderTop: '1px solid var(--rule)' }}>
                      <span className="label" style={{ color: 'var(--color-faint)' }}>{r.dimension.toUpperCase()}</span>
                      <p className="mt-1 text-[0.9375rem]">{r.note}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Link
              to={`/admin/development/${data.technology.reference}`}
              className="label mt-5 inline-block"
              style={{ color: 'var(--color-accent)' }}
            >
              OPEN R&amp;D WORKSPACE →
            </Link>
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
                placeholder="Record what happened in the conversation"
                className="field-input"
              />
              <div>
                <button type="submit" className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-colors duration-300 hover:bg-accent">
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

        <div className="grid content-start gap-6 [&>*]:min-w-0">
          <Panel title="Working state">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>OWNER</span>
                <input
                  defaultValue={data.owner ?? ''}
                  disabled={!me.can.moveAcquisitionStage}
                  onBlur={(e) => e.target.value !== (data.owner ?? '') && patch({ owner: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                />
              </label>
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>NEXT ACTION</span>
                <input
                  defaultValue={data.nextAction ?? ''}
                  disabled={!me.can.moveAcquisitionStage}
                  onBlur={(e) => e.target.value !== (data.nextAction ?? '') && patch({ nextAction: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                />
              </label>
              <label className="grid min-w-0 gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>DUE</span>
                <input
                  type="date"
                  defaultValue={data.nextActionDue ?? ''}
                  disabled={!me.can.moveAcquisitionStage}
                  onBlur={(e) => e.target.value !== (data.nextActionDue ?? '') && patch({ nextActionDue: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                />
              </label>
            </div>
            {error && <p role="alert" className="label mt-4" style={{ color: 'var(--color-accent-deep)' }}>{error}</p>}
          </Panel>

          {me.can.viewCommercialTerms && (
            <Panel title="Commercial deal">
              {data.deal ? (
                <>
                  <p className="ident" style={{ color: 'var(--color-accent)' }}>{data.deal.reference}</p>
                  <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                    {data.deal.closingStatus}
                  </p>
                  <Link to={`/admin/deals/${data.deal.reference}`} className="label mt-4 inline-block" style={{ color: 'var(--color-accent)' }}>
                    OPEN DEAL ROOM →
                  </Link>
                </>
              ) : !data.dealEligible ? (
                <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                  A deal room opens at Commercial Negotiation. Before terms exist there
                  is nothing to record, so opening one earlier would show a deal that
                  is not being negotiated.
                </p>
              ) : (
                <>
                  <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                    No deal room yet for this opportunity.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const result = await api.openDeal(reference)
                        navigate(`/admin/deals/${result.deal}`)
                      } catch (cause) {
                        setError(cause instanceof api.AdminError ? cause.message : 'Could not open a deal room')
                      }
                    }}
                    className="mt-4 bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-colors duration-300 hover:bg-accent"
                  >
                    Open deal room
                  </button>
                </>
              )}
            </Panel>
          )}

          <Panel title="Industry challenge">
            <dl>
              <Field label="Reference">{data.challenge.reference}</Field>
              <Field label="Sector">{data.challenge.sector ?? '—'}</Field>
              <Field label="Challenge status">{data.challenge.status ?? '—'}</Field>
            </dl>
            {data.contactsWithheld ? (
              <div className="mt-4"><Withheld>Company contact details are withheld from your role.</Withheld></div>
            ) : (
              <dl>
                <Field label="Company">{data.challenge.company ?? '—'}</Field>
                <Field label="Contact">{data.challenge.contactName ?? '—'}</Field>
                <Field label="Email">{data.challenge.contactEmail ?? '—'}</Field>
              </dl>
            )}
            <Link to={`/admin/challenges/${data.challenge.reference}`} className="label mt-4 inline-block" style={{ color: 'var(--color-accent)' }}>
              OPEN CHALLENGE →
            </Link>
          </Panel>

          <Panel title="Technology">
            <p className="ident" style={{ color: 'var(--color-accent)' }}>{data.technology.reference}</p>
            <h2 className="mt-3 font-display text-[1.0625rem] font-medium leading-snug tracking-[-0.02em]">
              {data.technology.title}
            </h2>
            <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>{data.technology.category}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip label="TRL" tone="active">{String(data.technology.currentTrl ?? '—')}</Chip>
              {data.technology.developmentStage && <Chip label="R&D">{data.technology.developmentStage}</Chip>}
            </div>
            <Link to={`/admin/innovations/${data.technology.reference}`} className="label mt-4 inline-block" style={{ color: 'var(--color-accent)' }}>
              OPEN TECHNOLOGY →
            </Link>
            {data.matchRef && (
              <Link to={`/admin/matches/${data.matchRef}`} className="label mt-2 block" style={{ color: 'var(--color-accent)' }}>
                OPEN MATCH ROOM →
              </Link>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
