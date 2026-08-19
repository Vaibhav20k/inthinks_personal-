import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, Field, Panel, Withheld, shortDate, shortDateTime } from './ui'
import type { Me } from './api'

const ROW_TONE: Record<string, 'active' | 'neutral' | 'quiet'> = {
  Met: 'active', Received: 'active', Executed: 'active',
  Missed: 'quiet', Overdue: 'quiet', Waived: 'quiet', 'Not applicable': 'quiet',
}

/** A labelled control that writes on blur, so nothing needs a save button. */
function Text({
  label, value, onCommit, disabled, textarea, type = 'text', placeholder,
}: {
  label: string
  value: string
  onCommit: (next: string) => void
  disabled?: boolean
  textarea?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="label" style={{ color: 'var(--color-faint)' }}>{label}</span>
      {textarea ? (
        <textarea
          defaultValue={value}
          rows={3}
          disabled={disabled}
          placeholder={placeholder}
          onBlur={(e) => e.target.value !== value && onCommit(e.target.value)}
          className="field-input text-[0.875rem]"
        />
      ) : (
        <input
          type={type}
          defaultValue={value}
          disabled={disabled}
          placeholder={placeholder}
          onBlur={(e) => e.target.value !== value && onCommit(e.target.value)}
          className="field-input py-2 text-[0.875rem]"
        />
      )}
    </label>
  )
}

function Select({
  label, value, options, onCommit, disabled,
}: {
  label: string
  value: string
  options: string[]
  onCommit: (next: string) => void
  disabled?: boolean
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="label" style={{ color: 'var(--color-faint)' }}>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onCommit(e.target.value)}
        className="field-input py-2 text-[0.875rem]"
      >
        {!options.includes(value) && <option value={value}>{value || '—'}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

/**
 * One deal.
 *
 * Everything on this page is a term someone has actually proposed or agreed.
 * There is no projected value, no weighted probability and no expected close
 * date — a deal room that estimates its own outcome stops being a record of
 * what was agreed.
 */
export default function DealRoom({ me }: { me: Me }) {
  const { reference = '' } = useParams()
  const [data, setData] = useState<api.DealDetail | null>(null)
  const [meta, setMeta] = useState<api.Meta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const navigate = useNavigate()

  const load = useCallback(() => {
    api.deal(reference).then(setData).catch((e) => setError(e.message))
  }, [reference])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.meta().then(setMeta).catch(() => undefined) }, [])

  const patch = async (body: Record<string, unknown>) => {
    setError(null)
    try {
      const result = await api.patchDeal(reference, body)
      if (result.opportunityAdvanced) {
        setNotice(`${result.opportunityAdvanced} moved to Technology Transfer.`)
      }
      load()
    } catch (cause) {
      setError(cause instanceof api.AdminError ? cause.message : 'Update failed')
    }
  }

  const addRow = async (kind: 'milestones' | 'payments' | 'documents', row: Record<string, unknown>) => {
    setError(null)
    try {
      await api.addDealRow(reference, kind, row)
      load()
    } catch (cause) {
      setError(cause instanceof api.AdminError ? cause.message : 'Could not add that')
    }
  }

  if (!me.can.viewCommercialTerms) {
    return <Empty>The deal room is limited to admins and business development.</Empty>
  }
  if (error && !data) return <Empty>{error}</Empty>
  if (!data || !meta) return <Empty>Loading…</Empty>

  const closed = data.closingStatus !== 'Open'
  const ro = closed

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <div>
        <Link to="/admin/deals" className="label" style={{ color: 'var(--color-muted)' }}>← DEAL ROOM</Link>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="ident text-[1.125rem]" style={{ color: 'var(--color-accent)' }}>{data.reference}</span>
          <Chip label="STRUCTURE" tone="active">{data.dealType}</Chip>
          <Chip label="AGREEMENT">{data.agreementStatus}</Chip>
          <Chip label="CLOSING" tone={closed ? 'quiet' : 'neutral'}>{data.closingStatus}</Chip>
          {data.challenge.confidentiality === 'nda-required' && <Chip tone="active">NDA REQUIRED</Chip>}
        </div>
        <h1 className="section-type mt-3">{data.technology.title ?? data.technology.reference}</h1>
        <p className="mt-2 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
          for {data.challenge.company ?? data.challenge.title ?? data.challenge.reference}
          {data.industry ? ` · ${data.industry}` : ''}
        </p>
        {closed && (
          <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
            {data.closingStatus}
            {data.closedAt ? ` on ${shortDate(data.closedAt)}` : ''}
            {data.closedReason ? ` — ${data.closedReason}` : ''}. Terms are read-only.
          </p>
        )}
        {notice && <p className="label mt-3" style={{ color: 'var(--color-accent)' }}>{notice}</p>}
        {error && <p role="alert" className="label mt-3" style={{ color: 'var(--color-accent-deep)' }}>{error}</p>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_23rem] [&>*]:min-w-0">
        <div className="grid gap-6 [&>*]:min-w-0">
          <Panel title="Consideration">
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <Select label="STRUCTURE" value={data.dealType} options={meta.dealTypes} disabled={ro}
                onCommit={(v) => patch({ dealType: v })} />
              <Text label="CURRENCY" value={data.currency} disabled={ro}
                onCommit={(v) => patch({ currency: v.toUpperCase() })} />
              <Text
                label="UPFRONT"
                value={data.upfrontMinor === null ? '' : (data.upfrontMinor / 100).toFixed(2)}
                disabled={ro}
                placeholder="0.00"
                onCommit={(v) => patch({ upfront: v })}
              />
              <Text
                label="ROYALTY %"
                value={data.royaltyBp === null ? '' : (data.royaltyBp / 100).toFixed(2)}
                disabled={ro}
                placeholder="0.00"
                onCommit={(v) => patch({ royaltyPercent: v })}
              />
              <Select label="ROYALTY BASIS" value={data.royaltyBasis ?? ''} options={meta.royaltyBases} disabled={ro}
                onCommit={(v) => patch({ royaltyBasis: v })} />
            </div>
            <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
              AMOUNTS ARE STORED IN MINOR UNITS AND RATES IN BASIS POINTS — NOTHING IS ROUNDED IN TRANSIT
            </p>
          </Panel>

          <Panel title="Grant">
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <Select label="EXCLUSIVITY" value={data.exclusivity} options={meta.exclusivity} disabled={ro}
                onCommit={(v) => patch({ exclusivity: v })} />
              <Text label="TERRITORY" value={data.territory ?? ''} disabled={ro}
                placeholder="Where the grant applies" onCommit={(v) => patch({ territory: v })} />
              <Text label="TERM (MONTHS)" type="number" value={data.termMonths === null ? '' : String(data.termMonths)}
                disabled={ro} onCommit={(v) => patch({ termMonths: v })} />
              <Text label="TERM STARTS" type="date" value={data.termStart ?? ''} disabled={ro}
                onCommit={(v) => patch({ termStart: v })} />
            </div>
            <div className="mt-4 grid gap-4 [&>*]:min-w-0">
              <Text label="FIELD OF USE" value={data.fieldOfUse ?? ''} textarea disabled={ro}
                placeholder="The applications the grant covers, and those it does not"
                onCommit={(v) => patch({ fieldOfUse: v })} />
              <Text label="TERM NOTE" value={data.termNote ?? ''} textarea disabled={ro}
                placeholder="Renewal, review points, termination rights"
                onCommit={(v) => patch({ termNote: v })} />
            </div>
          </Panel>

          <Panel title="Rights and support">
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <Select label="IP RIGHTS" value={data.ipRights} options={meta.rightsPositions} disabled={ro}
                onCommit={(v) => patch({ ipRights: v })} />
              <Select label="MANUFACTURING RIGHTS" value={data.manufacturingRights} options={meta.rightsPositions}
                disabled={ro} onCommit={(v) => patch({ manufacturingRights: v })} />
            </div>
            <div className="mt-4 grid gap-4 [&>*]:min-w-0">
              <Text label="IP NOTE" value={data.ipRightsNote ?? ''} textarea disabled={ro}
                placeholder="Background IP, improvements, joint ownership"
                onCommit={(v) => patch({ ipRightsNote: v })} />
              <Text label="TECHNICAL SUPPORT" value={data.technicalSupport ?? ''} textarea disabled={ro}
                placeholder="Training, commissioning, support period"
                onCommit={(v) => patch({ technicalSupport: v })} />
              <Text label="PILOT CONDITIONS" value={data.pilotConditions ?? ''} textarea disabled={ro}
                placeholder="What the pilot must demonstrate before the deal proceeds"
                onCommit={(v) => patch({ pilotConditions: v })} />
            </div>
          </Panel>

          <Panel title="Milestones">
            {!ro && (
              <form
                className="mb-5 grid gap-3 sm:grid-cols-[1fr_10rem_auto]"
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const label = (form.elements.namedItem('label') as HTMLInputElement).value
                  const due = (form.elements.namedItem('due') as HTMLInputElement).value
                  if (!label.trim()) return
                  addRow('milestones', { label, due })
                  form.reset()
                }}
              >
                <input name="label" placeholder="What has to happen" className="field-input py-2 text-[0.875rem]" />
                <input name="due" type="date" className="field-input py-2 text-[0.875rem]" />
                <button type="submit" className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper">Add</button>
              </form>
            )}
            {data.milestones.length === 0 ? (
              <p className="text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>No milestones recorded.</p>
            ) : (
              <ul>
                {data.milestones.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3" style={{ borderTop: '1px solid var(--rule)' }}>
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem]">{m.label}</span>
                      {m.due && <span className="label" style={{ color: 'var(--color-faint)' }}>DUE {m.due}</span>}
                    </span>
                    {ro ? <Chip tone={ROW_TONE[m.status] ?? 'neutral'}>{m.status}</Chip> : (
                      <select
                        value={m.status}
                        onChange={(e) => api.setDealRowStatus(reference, 'milestones', m.id, e.target.value).then(load)}
                        className="field-input w-auto py-1.5 text-[0.8125rem]"
                      >
                        {meta.milestoneStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Payment schedule">
            {!ro && (
              <form
                className="mb-5 grid gap-3 sm:grid-cols-[1fr_8rem_9rem_auto]"
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const label = (form.elements.namedItem('label') as HTMLInputElement).value
                  const amount = (form.elements.namedItem('amount') as HTMLInputElement).value
                  const due = (form.elements.namedItem('due') as HTMLInputElement).value
                  if (!label.trim()) return
                  addRow('payments', { label, amount, due })
                  form.reset()
                }}
              >
                <input name="label" placeholder="What this instalment is for" className="field-input py-2 text-[0.875rem]" />
                <input name="amount" placeholder="0.00" inputMode="decimal" className="field-input py-2 text-[0.875rem]" />
                <input name="due" type="date" className="field-input py-2 text-[0.875rem]" />
                <button type="submit" className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper">Add</button>
              </form>
            )}
            {data.payments.length === 0 ? (
              <p className="text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>No schedule recorded.</p>
            ) : (
              <ul>
                {data.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3" style={{ borderTop: '1px solid var(--rule)' }}>
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem]">{p.label}</span>
                      <span className="label" style={{ color: 'var(--color-faint)' }}>
                        {api.money(p.amount_minor, data.currency)}{p.due ? ` · DUE ${p.due}` : ''}
                      </span>
                    </span>
                    {ro ? <Chip tone={ROW_TONE[p.status] ?? 'neutral'}>{p.status}</Chip> : (
                      <select
                        value={p.status}
                        onChange={(e) => api.setDealRowStatus(reference, 'payments', p.id, e.target.value).then(load)}
                        className="field-input w-auto py-1.5 text-[0.8125rem]"
                      >
                        {meta.paymentStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
              INSTALMENTS AS AGREED. RECEIPTS AGAINST A ROYALTY ARE NOT TRACKED HERE.
            </p>
          </Panel>

          <Panel title="Transfer documentation">
            {!ro && (
              <form
                className="mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const kind = (form.elements.namedItem('kind') as HTMLSelectElement).value
                  const title = (form.elements.namedItem('title') as HTMLInputElement).value
                  addRow('documents', { kind, title })
                  form.reset()
                }}
              >
                <select name="kind" className="field-input py-2 text-[0.875rem]">
                  {meta.documentKinds.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <input name="title" placeholder="Reference or title (optional)" className="field-input py-2 text-[0.875rem]" />
                <button type="submit" className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper">Add</button>
              </form>
            )}
            {data.documents.length === 0 ? (
              <p className="text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>No documents on the register.</p>
            ) : (
              <ul>
                {data.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3" style={{ borderTop: '1px solid var(--rule)' }}>
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem]">{d.kind}</span>
                      {d.title && <span className="label" style={{ color: 'var(--color-faint)' }}>{d.title}</span>}
                    </span>
                    {ro ? <Chip tone={ROW_TONE[d.status] ?? 'neutral'}>{d.status}</Chip> : (
                      <select
                        value={d.status}
                        onChange={(e) => api.setDealRowStatus(reference, 'documents', d.id, e.target.value).then(load)}
                        className="field-input w-auto py-1.5 text-[0.8125rem]"
                      >
                        {meta.documentStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
              A REGISTER OF WHERE EACH INSTRUMENT HAS GOT TO. EXECUTED AGREEMENTS ARE NOT STORED HERE.
            </p>
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
                placeholder="What moved, what was conceded, what is outstanding"
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
          <Panel title="Status">
            <div className="grid gap-4">
              <Select label="AGREEMENT" value={data.agreementStatus} options={meta.agreementStatuses} disabled={ro}
                onCommit={(v) => patch({ agreementStatus: v })} />
              <Select label="CLOSING" value={data.closingStatus} options={meta.closingStatuses}
                onCommit={(v) => patch({ closingStatus: v })} />
              <Text label="CLOSING NOTE" value={data.closedReason ?? ''} textarea
                placeholder="Why the deal closed as it did"
                onCommit={(v) => patch({ closedReason: v })} />
              <Text label="OWNER" value={data.owner ?? ''} disabled={ro} onCommit={(v) => patch({ owner: v })} />
            </div>
            <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
              MARKING A DEAL EXECUTED MOVES ITS OPPORTUNITY TO TECHNOLOGY TRANSFER
            </p>
          </Panel>

          <Panel title="Royalties">
            {data.royalty ? (
              <>
                <p className="ident" style={{ color: 'var(--color-accent)' }}>{data.royalty.reference}</p>
                <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>{data.royalty.status}</p>
                <Link to={`/admin/royalties/${data.royalty.reference}`} className="label mt-4 inline-block" style={{ color: 'var(--color-accent)' }}>
                  OPEN ROYALTY RECORD →
                </Link>
              </>
            ) : !data.royaltyEligible ? (
              <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {data.royaltyBp
                  ? 'Royalties are monitored once the deal is executed.'
                  : 'This deal carries no royalty rate, so there is nothing to monitor.'}
              </p>
            ) : (
              <>
                <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                  Opening this generates the reporting schedule from the term.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const result = await api.openRoyalty(reference)
                      navigate(`/admin/royalties/${result.royalty}`)
                    } catch (cause) {
                      setError(cause instanceof api.AdminError ? cause.message : 'Could not open royalty monitoring')
                    }
                  }}
                  className="mt-4 bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-colors duration-300 hover:bg-accent"
                >
                  Monitor royalties
                </button>
              </>
            )}
          </Panel>

          <Panel title="Opportunity">
            <dl>
              <Field label="Reference">{data.opportunityRef}</Field>
              <Field label="Pipeline stage">{data.opportunityStage ?? '—'}</Field>
            </dl>
            <Link to={`/admin/opportunities/${data.opportunityRef}`} className="label mt-4 inline-block" style={{ color: 'var(--color-accent)' }}>
              OPEN OPPORTUNITY →
            </Link>
          </Panel>

          <Panel title="Counterparty">
            <dl>
              <Field label="Challenge">{data.challenge.reference}</Field>
              <Field label="Sector">{data.challenge.sector ?? '—'}</Field>
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
          </Panel>

          <Panel title="Technology">
            <p className="ident" style={{ color: 'var(--color-accent)' }}>{data.technology.reference}</p>
            <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>{data.technology.category ?? '—'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip label="TRL" tone="active">{String(data.technology.currentTrl ?? '—')}</Chip>
              {data.technology.developmentStage && <Chip label="R&D">{data.technology.developmentStage}</Chip>}
            </div>
            <Link to={`/admin/development/${data.technology.reference}`} className="label mt-4 inline-block" style={{ color: 'var(--color-accent)' }}>
              OPEN R&amp;D WORKSPACE →
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  )
}
