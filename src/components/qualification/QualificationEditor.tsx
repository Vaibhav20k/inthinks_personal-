import { useEffect, useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { RequestError, requestJson } from '../../lib/http'

/**
 * Structured qualification, shared by staff (admin, assigned mediator) and the
 * participant who owns the case. The server decides what each side may see
 * and change; this component only reflects it.
 */

interface Item {
  id: number; category: string; label: string; comparator: string | null; value: number | null; valueMax: number | null
  baseline: number | null; unit: string | null; currency: string | null; period: string | null; attributionPct: number | null
  targetDate: string | null; sourceKind: string; sourceDetail: string | null; observedOn: string | null; verification: string
  createdRole: string; retiredAt: string | null; verificationNote?: string | null; verifiedBy?: string | null
}
interface Data { units: Record<string, string>; items: Item[]; completeness?: { ready: boolean; missing: string[]; items: number; verified: number } }

const CATEGORY: Record<string, string> = { measurement: 'Measurement', constraint: 'Constraint', cost: 'Attributable cost', success_criterion: 'Success criterion' }
const COMPARATOR: Record<string, string> = { eq: 'exactly', lt: 'below', lte: 'at most', gt: 'above', gte: 'at least', between: 'between' }
const PERIOD: Record<string, string> = { one_off: 'one-off', per_month: 'per month', per_year: 'per year', per_unit: 'per unit' }
const SOURCE: Record<string, string> = {
  participant_statement: 'Statement by the submitter', document: 'Document', measurement_record: 'Measurement record',
  third_party: 'Third-party source', staff_estimate: 'InThinks estimate',
}
const VERIFICATION: Record<string, string> = {
  unverified: 'Unverified', participant_confirmed: 'Confirmed by submitter', document_checked: 'Checked against document',
  independently_verified: 'Independently verified', disputed: 'Disputed',
}
const EMPTY = { category: 'measurement', label: '', comparator: '', value: '', valueMax: '', baseline: '', unit: '', currency: 'INR', period: 'per_year', attributionPct: '', targetDate: '', sourceKind: '', sourceDetail: '', observedOn: '' }

function describe(i: Item) {
  const unit = i.unit ? ` ${i.unit}` : ''
  if (i.category === 'cost') return `${i.currency} ${i.value?.toLocaleString()} ${PERIOD[i.period ?? ''] ?? ''}${unit ? ` (per${unit})` : ''} · ${i.attributionPct}% attributable`
  const range = i.comparator === 'between' ? `${i.value}–${i.valueMax}${unit}` : `${i.comparator && i.comparator !== 'eq' ? `${COMPARATOR[i.comparator]} ` : ''}${i.value}${unit}`
  if (i.category === 'success_criterion') return `${i.baseline !== null ? `from ${i.baseline}${unit} to ` : ''}${range}${i.targetDate ? ` by ${i.targetDate}` : ''}`
  return range
}

export default function QualificationEditor({ base, side }: { base: string; side: 'staff' | 'participant' }) {
  const [data, setData] = useState<Data | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [showRetired, setShowRetired] = useState(false)
  const load = () => requestJson<Data>(base).then(setData)
  useEffect(() => { load().catch((e) => setError(e.message)) }, [base])
  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(''); setFields({})
    try { await fn(); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); if (e instanceof RequestError) setFields(e.fields) }
    finally { setBusy(false) }
  }
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }))
  const c = form.category
  const field = (name: keyof typeof EMPTY, label: string, input: ReactNode) => <label className="grid gap-1 text-sm">{label}{input}{fields[name] && <span role="alert" style={{ color: 'var(--color-accent)' }}>{fields[name]}</span>}</label>
  const text = (name: keyof typeof EMPTY, props: InputHTMLAttributes<HTMLInputElement> = {}) => <input className="field-input" value={form[name]} onChange={(e) => set({ [name]: e.target.value })} {...props} />
  const units = Object.keys(data?.units ?? {})
  const active = data?.items.filter((i) => !i.retiredAt) ?? []
  const shown = showRetired ? data?.items ?? [] : active

  return <div className="grid gap-5">
    {error && <p role="alert">{error}</p>}
    <p className="text-sm">Each figure needs a unit, a source and, where possible, the date it was observed. {side === 'staff' ? 'Editing a value resets its verification.' : 'InThinks verifies figures separately; editing one sends it back for checking.'}</p>
    {data?.completeness && <p className="text-sm">{data.completeness.ready ? 'Ready for numerical assessment.' : `Still needed: ${data.completeness.missing.join('; ')}.`} {data.completeness.verified} of {data.completeness.items} verified.</p>}
    {shown.length === 0 && <p className="text-sm">No figures recorded yet.</p>}
    <ul className="grid gap-3">
      {shown.map((i) => <li key={i.id} className="border p-3 grid gap-1" style={{ borderColor: 'var(--rule)', opacity: i.retiredAt ? 0.6 : 1 }}>
        <div className="flex flex-wrap justify-between gap-2"><strong>{CATEGORY[i.category]}: {i.label}</strong><span className="text-sm">{i.retiredAt ? 'Retired' : VERIFICATION[i.verification]}</span></div>
        <span>{describe(i)}</span>
        <span className="text-sm">{SOURCE[i.sourceKind]}{i.sourceDetail ? ` — ${i.sourceDetail}` : ''}{i.observedOn ? ` · observed ${i.observedOn}` : ' · no observation date'}{side === 'staff' && i.createdRole === 'participant' ? ' · from submitter' : ''}</span>
        {side === 'staff' && i.verificationNote && <span className="text-sm">Note: {i.verificationNote}{i.verifiedBy ? ` (${i.verifiedBy})` : ''}</span>}
        {!i.retiredAt && <div className="flex flex-wrap gap-3 text-sm">
          {side === 'staff' && <label className="flex items-center gap-2">Verification
            <select className="field-input" disabled={busy} value={i.verification} onChange={(e) => {
              const state = e.target.value
              const note = state === 'disputed' || state === 'independently_verified' ? window.prompt(state === 'disputed' ? 'Why is this value disputed?' : 'How was it verified? (optional)') ?? '' : ''
              void run(() => requestJson(`${base}/${i.id}/verification`, { verification: state, note }))
            }}>{Object.entries(VERIFICATION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>}
          {(side === 'staff' || i.createdRole === 'participant') && <button className="underline" disabled={busy} onClick={() => void run(() => requestJson(`${base}/${i.id}/retire`, {}))}>Retire</button>}
        </div>}
      </li>)}
    </ul>
    {(data?.items.length ?? 0) > active.length && <button className="underline justify-self-start text-sm" onClick={() => setShowRetired((v) => !v)}>{showRetired ? 'Hide retired figures' : 'Show retired figures'}</button>}
    <form className="grid gap-3 border p-4" style={{ borderColor: 'var(--rule)' }} onSubmit={(e) => {
      e.preventDefault()
      void run(async () => { await requestJson(base, { ...form, comparator: form.comparator || null }); setForm({ ...EMPTY, category: form.category }) })
    }}>
      <h3 className="font-semibold">Add a figure</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {field('category', 'Type', <select className="field-input" value={c} onChange={(e) => set({ category: e.target.value, comparator: '' })}>{Object.entries(CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>)}
        {field('label', 'What it describes', text('label', { required: true, maxLength: 200, placeholder: c === 'cost' ? 'Fuel lost through heat' : 'Exhaust temperature' }))}
        {(c === 'constraint' || c === 'success_criterion') && field('comparator', c === 'constraint' ? 'Limit' : 'Success means', <select className="field-input" required value={form.comparator} onChange={(e) => set({ comparator: e.target.value })}>
          <option value="">Choose…</option>{Object.entries(COMPARATOR).filter(([k]) => c === 'constraint' || ['gte', 'lte', 'eq', 'between'].includes(k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>)}
        {c === 'success_criterion' && field('baseline', 'Current value (baseline)', text('baseline', { inputMode: 'decimal' }))}
        {field('value', c === 'cost' ? 'Amount' : c === 'success_criterion' ? 'Target' : form.comparator === 'between' ? 'Lower value' : 'Value', text('value', { required: true, inputMode: 'decimal' }))}
        {form.comparator === 'between' && field('valueMax', 'Upper value', text('valueMax', { required: true, inputMode: 'decimal' }))}
        {c === 'cost' && <>
          {field('currency', 'Currency', text('currency', { required: true, maxLength: 3, pattern: '[A-Z]{3}' }))}
          {field('period', 'Incurred', <select className="field-input" value={form.period} onChange={(e) => set({ period: e.target.value })}>{Object.entries(PERIOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>)}
          {field('attributionPct', 'Share caused by this problem (%)', text('attributionPct', { required: true, inputMode: 'decimal' }))}
        </>}
        {(c !== 'cost' || form.period === 'per_unit') && field('unit', 'Unit', <select className="field-input" required={c !== 'cost'} value={form.unit} onChange={(e) => set({ unit: e.target.value })}><option value="">Choose…</option>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select>)}
        {c === 'success_criterion' && field('targetDate', 'Target date', text('targetDate', { type: 'date' }))}
        {field('observedOn', c === 'success_criterion' ? 'Baseline observed on' : 'Observed on', text('observedOn', { type: 'date' }))}
        {field('sourceKind', 'Source', <select className="field-input" required value={form.sourceKind} onChange={(e) => set({ sourceKind: e.target.value })}><option value="">Choose…</option>
          {Object.entries(SOURCE).filter(([k]) => side === 'staff' || k !== 'staff_estimate').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>)}
        {field('sourceDetail', 'Source detail', text('sourceDetail', { maxLength: 500, placeholder: 'e.g. stack thermocouple log, Sept 2026' }))}
      </div>
      <button className="border px-4 py-2 justify-self-start" disabled={busy}>Add figure</button>
    </form>
  </div>
}
