import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, Field, Panel, Withheld, shortDateTime } from './ui'
import type { Me, RoyaltyPeriod } from './api'

const SETTLEMENT_TONE: Record<string, 'active' | 'neutral' | 'quiet'> = {
  Settled: 'active', 'Part paid': 'neutral', Unpaid: 'neutral',
  Overpaid: 'neutral', 'Nothing due': 'quiet',
}

const decimal = (minor: number | null) => (minor === null ? '' : (minor / 100).toFixed(2))

/**
 * One reporting period.
 *
 * The amount due is not editable. It is computed from what the licensee
 * reported and the rate in force, so the two can never tell different stories
 * about the same quarter.
 */
function Period({
  period, currency, unitBased, statuses, onPatch,
}: {
  period: RoyaltyPeriod
  currency: string
  unitBased: boolean
  statuses: string[]
  onPatch: (patch: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  const owed = period.dueMinor + period.adjustmentMinor
  const overdue = period.statementReceived === null && period.status !== 'Waived' &&
    period.periodEnd < new Date().toISOString().slice(0, 10)

  return (
    <li className="py-4" style={{ borderTop: '1px solid var(--rule)' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
        <div className="min-w-0">
          <span className="ident text-[0.8125rem]" style={{ color: 'var(--color-muted)' }}>
            {String(period.seq).padStart(2, '0')}
          </span>
          <span className="ml-3 text-[0.9375rem]">{period.periodStart} → {period.periodEnd}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {overdue && <Chip tone="active">STATEMENT OVERDUE</Chip>}
          <Chip label="STATUS">{period.status}</Chip>
          <Chip label="SETTLEMENT" tone={SETTLEMENT_TONE[period.settlement] ?? 'neutral'}>{period.settlement}</Chip>
        </div>
      </div>

      <div className="mt-3 grid gap-x-6 gap-y-1 text-[0.875rem] sm:grid-cols-3 [&>*]:min-w-0">
        <p style={{ color: 'var(--color-muted)' }}>
          Reported{' '}
          <span style={{ color: 'var(--color-ink)' }}>
            {unitBased
              ? period.reportedUnits === null ? '—' : `${period.reportedUnits} units`
              : api.money(period.reportedMinor, currency)}
          </span>
        </p>
        <p style={{ color: 'var(--color-muted)' }}>
          Due <span className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{api.money(owed, currency)}</span>
          {period.adjustmentMinor > 0 && (
            <span className="label ml-2" style={{ color: 'var(--color-faint)' }}>
              INCL. {api.money(period.adjustmentMinor, currency)} ADJ
            </span>
          )}
        </p>
        <p style={{ color: 'var(--color-muted)' }}>
          Paid <span className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{api.money(period.paidMinor, currency)}</span>
          {period.paidOn && <span className="label ml-2" style={{ color: 'var(--color-faint)' }}>{period.paidOn}</span>}
        </p>
      </div>
      {period.adjustmentNote && (
        <p className="mt-2 text-[0.875rem]" style={{ color: 'var(--color-muted)' }}>
          Adjustment — {period.adjustmentNote}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="label mt-3 transition-colors duration-200 hover:text-accent"
        style={{ color: 'var(--color-accent)' }}
      >
        {open ? 'CLOSE' : 'RECORD'}
      </button>

      {open && (
        <form
          className="mt-4 grid gap-3 p-4 sm:grid-cols-2 [&>*]:min-w-0"
          style={{ background: 'var(--color-paper-sunk)' }}
          onSubmit={(e) => {
            e.preventDefault()
            const f = e.currentTarget
            const val = (name: string) => (f.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement)?.value
            const patch: Record<string, unknown> = {}
            if (unitBased) { if (val('reportedUnits') !== '') patch.reportedUnits = val('reportedUnits') }
            else if (val('reported') !== '') patch.reported = val('reported')
            if (val('statementReceived')) patch.statementReceived = val('statementReceived')
            if (val('paid') !== '') patch.paid = val('paid')
            if (val('paidOn')) patch.paidOn = val('paidOn')
            if (val('adjustment') !== '') {
              patch.adjustment = val('adjustment')
              patch.adjustmentNote = val('adjustmentNote')
            }
            if (val('status')) patch.status = val('status')
            onPatch(patch)
            setOpen(false)
          }}
        >
          {unitBased ? (
            <label className="grid gap-2">
              <span className="label" style={{ color: 'var(--color-faint)' }}>UNITS REPORTED</span>
              <input name="reportedUnits" inputMode="numeric" defaultValue={period.reportedUnits ?? ''}
                className="field-input py-2 text-[0.875rem]" />
            </label>
          ) : (
            <label className="grid gap-2">
              <span className="label" style={{ color: 'var(--color-faint)' }}>AMOUNT REPORTED</span>
              <input name="reported" inputMode="decimal" defaultValue={decimal(period.reportedMinor)}
                placeholder="0.00" className="field-input py-2 text-[0.875rem]" />
            </label>
          )}
          <label className="grid gap-2">
            <span className="label" style={{ color: 'var(--color-faint)' }}>STATEMENT RECEIVED</span>
            <input name="statementReceived" type="date" defaultValue={period.statementReceived ?? ''}
              className="field-input py-2 text-[0.875rem]" />
          </label>
          <label className="grid gap-2">
            <span className="label" style={{ color: 'var(--color-faint)' }}>AMOUNT PAID</span>
            <input name="paid" inputMode="decimal" defaultValue={decimal(period.paidMinor)}
              placeholder="0.00" className="field-input py-2 text-[0.875rem]" />
          </label>
          <label className="grid gap-2">
            <span className="label" style={{ color: 'var(--color-faint)' }}>PAID ON</span>
            <input name="paidOn" type="date" defaultValue={period.paidOn ?? ''}
              className="field-input py-2 text-[0.875rem]" />
          </label>
          <label className="grid gap-2">
            <span className="label" style={{ color: 'var(--color-faint)' }}>ADJUSTMENT</span>
            <input name="adjustment" inputMode="decimal" defaultValue={decimal(period.adjustmentMinor)}
              placeholder="0.00" className="field-input py-2 text-[0.875rem]" />
          </label>
          <label className="grid gap-2">
            <span className="label" style={{ color: 'var(--color-faint)' }}>ADJUSTMENT REASON</span>
            <input name="adjustmentNote" defaultValue={period.adjustmentNote ?? ''}
              placeholder="Required for any adjustment" className="field-input py-2 text-[0.875rem]" />
          </label>
          <label className="grid gap-2">
            <span className="label" style={{ color: 'var(--color-faint)' }}>STATUS</span>
            <select name="status" defaultValue={period.status} className="field-input py-2 text-[0.875rem]">
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper">
              Record
            </button>
          </div>
          <p className="label sm:col-span-2" style={{ color: 'var(--color-faint)' }}>
            THE AMOUNT DUE IS COMPUTED FROM WHAT IS REPORTED — IT CANNOT BE TYPED IN
          </p>
        </form>
      )}
    </li>
  )
}

/**
 * One royalty agreement.
 *
 * Three things on this page are derived and not stored: whether a period is
 * settled, the next reporting date, and the annual minimum shortfall. Each of
 * them would otherwise be a second copy of a fact the amounts already carry.
 */
export default function Royalty({ me }: { me: Me }) {
  const { reference = '' } = useParams()
  const [data, setData] = useState<api.RoyaltyDetail | null>(null)
  const [meta, setMeta] = useState<api.Meta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const load = useCallback(() => {
    api.royalty(reference).then(setData).catch((e) => setError(e.message))
  }, [reference])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.meta().then(setMeta).catch(() => undefined) }, [])

  const patch = async (body: Record<string, unknown>) => {
    setError(null)
    try { await api.patchRoyalty(reference, body); load() }
    catch (cause) { setError(cause instanceof api.AdminError ? cause.message : 'Update failed') }
  }
  const patchPeriod = async (id: number, body: Record<string, unknown>) => {
    setError(null)
    try { await api.patchRoyaltyPeriod(reference, id, body); load() }
    catch (cause) { setError(cause instanceof api.AdminError ? cause.message : 'Could not record that') }
  }

  if (!me.can.viewCommercialTerms) {
    return <Empty>Royalty management is limited to admins and business development.</Empty>
  }
  if (error && !data) return <Empty>{error}</Empty>
  if (!data || !meta) return <Empty>Loading…</Empty>

  const unitBased = data.royaltyType === 'Unit-based'
  const outstanding = data.totals.dueMinor - data.totals.paidMinor

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <div>
        <Link to="/admin/royalties" className="label" style={{ color: 'var(--color-muted)' }}>← ROYALTIES</Link>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="ident text-[1.125rem]" style={{ color: 'var(--color-accent)' }}>{data.reference}</span>
          <Chip label="TYPE" tone="active">{data.royaltyType}</Chip>
          <Chip label="REPORTING">{data.reportingPeriod}</Chip>
          <Chip label="STATUS" tone={data.status === 'Active' ? 'active' : 'quiet'}>{data.status}</Chip>
          {data.nextReporting.overdue && <Chip tone="active">{data.nextReporting.overdueCount} STATEMENT(S) OVERDUE</Chip>}
        </div>
        <h1 className="section-type mt-3">{data.technology.title ?? data.technology.reference}</h1>
        <p className="mt-2 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
          licensed to {data.challenge.company ?? data.challenge.title ?? data.challenge.reference}
          {' · '}{data.dealRef}
        </p>
        {error && <p role="alert" className="label mt-3" style={{ color: 'var(--color-accent-deep)' }}>{error}</p>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_23rem] [&>*]:min-w-0">
        <div className="grid gap-6 [&>*]:min-w-0">
          <Panel title="Position">
            <div className="grid gap-5 sm:grid-cols-3 [&>*]:min-w-0">
              {[
                ['INVOICED', api.money(data.totals.dueMinor, data.currency), 'AGAINST REPORTED FIGURES'],
                ['RECEIVED', api.money(data.totals.paidMinor, data.currency), data.periods.filter((p) => p.paidMinor > 0).length + ' PERIOD(S)'],
                ['OUTSTANDING', api.money(outstanding, data.currency), outstanding > 0 ? 'AWAITING PAYMENT' : 'NOTHING OUTSTANDING'],
              ].map(([label, value, note]) => (
                <div key={label}>
                  <p className="label" style={{ color: 'var(--color-faint)' }}>{label}</p>
                  <p className="mt-2 font-display text-[1.5rem] font-medium leading-none tracking-[-0.03em] tabular-nums">{value}</p>
                  <p className="label mt-2" style={{ color: 'var(--color-faint)' }}>{note}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 pt-5 text-[0.9375rem]" style={{ borderTop: '1px solid var(--rule)', color: 'var(--color-muted)' }}>
              {data.nextReporting.date
                ? <>Next statement due <span style={{ color: data.nextReporting.overdue ? 'var(--color-accent-deep)' : 'var(--color-ink)' }}>{data.nextReporting.date}</span>{data.nextReporting.overdue ? ' — overdue' : ''}.</>
                : 'Every period has a statement or has been waived.'}
            </p>
          </Panel>

          {data.years.length > 0 && (
            <Panel title="Minimum annual royalty">
              <ul>
                {data.years.map((y) => (
                  <li key={y.year} className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 py-3" style={{ borderTop: '1px solid var(--rule)' }}>
                    <span className="min-w-0">
                      <span className="text-[0.9375rem]">Year {y.year}</span>
                      <span className="label ml-3" style={{ color: 'var(--color-faint)' }}>{y.from} → {y.to}</span>
                    </span>
                    <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 tabular-nums text-[0.875rem]">
                      <span style={{ color: 'var(--color-muted)' }}>
                        {api.money(y.dueMinor, data.currency)} of {api.money(y.minimumMinor, data.currency)}
                      </span>
                      {!y.complete
                        ? <Chip tone="quiet">YEAR OPEN</Chip>
                        : y.shortfallMinor > 0
                          ? <Chip tone="active">SHORTFALL {api.money(y.shortfallMinor, data.currency)}</Chip>
                          : <Chip>MINIMUM MET</Chip>}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
                A SHORTFALL IS ONLY REAL ONCE EVERY PERIOD IN THE YEAR HAS REPORTED. CHARGING IT IS AN
                EXPLICIT ADJUSTMENT ON A PERIOD, NOT AN AUTOMATIC ONE.
              </p>
            </Panel>
          )}

          <Panel
            title="Reporting schedule"
            action={
              <button
                type="button"
                onClick={async () => {
                  const result = await api.regenerateRoyaltySchedule(reference)
                  setError(result.added
                    ? null
                    : 'The schedule already covers this term. Extend the term on the deal to add periods.')
                  load()
                }}
                className="label transition-colors duration-200 hover:text-accent"
                style={{ color: 'var(--color-muted)' }}
              >
                REGENERATE
              </button>
            }
          >
            {data.periods.length === 0 ? (
              <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                No schedule. A term start and length on the deal are what generate the periods —
                set them there and regenerate, so the licence and the royalty record stay one grant.
              </p>
            ) : (
              <ul>
                {data.periods.map((p) => (
                  <Period
                    key={p.id}
                    period={p}
                    currency={data.currency}
                    unitBased={unitBased}
                    statuses={meta.periodStatuses}
                    onPatch={(body) => patchPeriod(p.id, body)}
                  />
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
                placeholder="Audit queries, disputed figures, correspondence"
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
                  <p className="label" style={{ color: 'var(--color-faint)' }}>{n.author} · {shortDateTime(n.created_at)}</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{n.body}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid content-start gap-6 [&>*]:min-w-0">
          <Panel title="Terms">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>ROYALTY TYPE</span>
                <select
                  value={data.royaltyType}
                  onChange={(e) => patch({ royaltyType: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                >
                  {meta.royaltyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              {unitBased ? (
                <label className="grid gap-2">
                  <span className="label" style={{ color: 'var(--color-faint)' }}>PER UNIT</span>
                  <input
                    defaultValue={decimal(data.perUnitMinor)}
                    placeholder="0.00"
                    onBlur={(e) => e.target.value !== decimal(data.perUnitMinor) && patch({ perUnit: e.target.value })}
                    className="field-input py-2 text-[0.875rem]"
                  />
                </label>
              ) : (
                <label className="grid gap-2">
                  <span className="label" style={{ color: 'var(--color-faint)' }}>RATE %</span>
                  <input
                    defaultValue={data.rateBp === null ? '' : (data.rateBp / 100).toFixed(2)}
                    placeholder="0.00"
                    onBlur={(e) => patch({ ratePercent: e.target.value })}
                    className="field-input py-2 text-[0.875rem]"
                  />
                </label>
              )}
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>MINIMUM ANNUAL</span>
                <input
                  defaultValue={decimal(data.minimumAnnualMinor)}
                  placeholder="0.00"
                  onBlur={(e) => e.target.value !== decimal(data.minimumAnnualMinor) && patch({ minimumAnnual: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                />
              </label>
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>REPORTING PERIOD</span>
                <select
                  value={data.reportingPeriod}
                  onChange={(e) => patch({ reportingPeriod: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                >
                  {meta.reportingPeriods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>AGREEMENT STATUS</span>
                <select
                  value={data.status}
                  onChange={(e) => patch({ status: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                >
                  {meta.royaltyStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>OWNER</span>
                <input
                  defaultValue={data.owner ?? ''}
                  onBlur={(e) => e.target.value !== (data.owner ?? '') && patch({ owner: e.target.value })}
                  className="field-input py-2 text-[0.875rem]"
                />
              </label>
            </div>
            <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
              THE REPORTING FREQUENCY REBUILDS THE SCHEDULE, SO IT CAN ONLY BE CHANGED BEFORE THE FIRST
              STATEMENT IS RECORDED
            </p>
          </Panel>

          <Panel title="The grant">
            <dl>
              <Field label="Basis">{data.basis ?? data.royaltyType}</Field>
              <Field label="Term">
                {data.termStart ? `${data.termMonths ?? '—'} months from ${data.termStart}` : '—'}
              </Field>
              <Field label="Territory">{data.territory ?? '—'}</Field>
              <Field label="Field of use">{data.fieldOfUse ?? '—'}</Field>
            </dl>
            <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
              CARRIED FROM THE DEAL, NOT RE-ENTERED
            </p>
            <Link to={`/admin/deals/${data.dealRef}`} className="label mt-4 inline-block" style={{ color: 'var(--color-accent)' }}>
              OPEN DEAL ROOM →
            </Link>
          </Panel>

          <Panel title="Licensee">
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
            {data.opportunityRef && (
              <Link to={`/admin/opportunities/${data.opportunityRef}`} className="label mt-4 inline-block" style={{ color: 'var(--color-accent)' }}>
                OPEN OPPORTUNITY →
              </Link>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
