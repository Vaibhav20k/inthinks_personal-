import { useEffect, useState, type FormEvent } from 'react'
import { Empty, Panel } from './ui'
import { RequestError, requestJson } from '../lib/http'

type State = 'independently_verified' | 'document_checked' | 'participant_confirmed' | 'unverified'
interface Settings {
  currency: string; trust: Record<State, number>; hotValue: number; warmValue: number
  hotScore: number; warmScore: number; energyPrice: number | null
}
interface Data {
  version: number; settings: Settings; defaults: Settings; createdBy: string | null; createdAt: string | null
  states: State[]; history: { version: number; created_by: string; created_at: string }[]
}
const STATE_LABEL: Record<State, string> = {
  independently_verified: 'Independently verified', document_checked: 'Checked against a document',
  participant_confirmed: 'Confirmed by the participant', unverified: 'Unverified',
}
type Form = Record<string, string>
const toForm = (s: Settings): Form => ({
  currency: s.currency, hotValue: String(s.hotValue), warmValue: String(s.warmValue),
  hotScore: String(s.hotScore), warmScore: String(s.warmScore), energyPrice: s.energyPrice === null ? '' : String(s.energyPrice),
  ...Object.fromEntries(Object.entries(s.trust).map(([k, v]) => [`trust.${k}`, String(Math.round(v * 1000) / 10)])),
})

/**
 * Administrator settings for phase 8 economics. Each save is a new version;
 * assessments name the version that produced them.
 */
export default function EconomicsSettings() {
  const [data, setData] = useState<Data | null>(null), [form, setForm] = useState<Form>({})
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [fields, setFields] = useState<Record<string, string>>({})
  const load = () => requestJson<Data>('/api/admin/economics-settings').then((d) => { setData(d); setForm(toForm(d.settings)) })
  useEffect(() => { load().catch((e) => setError(e.message)) }, [])
  if (!data) return <Empty>{error || 'Loading…'}</Empty>

  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice(''); setFields({})
    const body = {
      currency: form.currency, hotValue: form.hotValue, warmValue: form.warmValue, hotScore: Number(form.hotScore),
      warmScore: Number(form.warmScore), energyPrice: form.energyPrice.trim() === '' ? null : form.energyPrice,
      trust: Object.fromEntries(data!.states.map((s) => [s, form[`trust.${s}`].trim() === '' ? '' : Number(form[`trust.${s}`]) / 100])),
    }
    try {
      const saved = await requestJson<{ version: number }>('/api/admin/economics-settings', body, 'PUT')
      await load(); setNotice(`Saved as version ${saved.version}. Assessments use it from now on.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      if (e instanceof RequestError) setFields(e.fields)
    }
  }

  const input = (name: string, label: string, hint?: string, type = 'text') => <label className="grid gap-2">
    <span className="label" style={{ color: 'var(--color-faint)' }}>{label.toUpperCase()}</span>
    <input type={type} inputMode={type === 'text' && name !== 'currency' ? 'decimal' : undefined} value={form[name] ?? ''}
      onChange={(e) => setForm({ ...form, [name]: e.target.value })} aria-invalid={Boolean(fields[name])}
      className="field-input py-2 text-[0.875rem]" />
    {(fields[name] || hint) && <span className="text-[0.8125rem] leading-relaxed" style={{ color: fields[name] ? 'var(--color-accent-deep)' : 'var(--color-muted)' }}>{fields[name] ?? hint}</span>}
  </label>

  return <div className="grid gap-6">
    <Panel title={`Economics rules · version ${data.version === 0 ? '0 (defaults)' : data.version}`}>
      <form onSubmit={save} className="grid gap-6">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-[0.9375rem] font-medium">How much each figure is trusted</legend>
          {data.states.map((s) => input(`trust.${s}`, `${STATE_LABEL[s]} (%)`))}
          <p className="text-[0.8125rem] sm:col-span-2" style={{ color: fields.trust ? 'var(--color-accent-deep)' : 'var(--color-muted)' }}>
            {fields.trust ?? 'The low end of every range counts each figure at this share. Disputed figures are always left out.'}
          </p>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-[0.9375rem] font-medium">Priority</legend>
          {input('currency', 'Default currency', 'Only costs in this currency are ranked by value. Others are never converted.')}
          <span className="hidden sm:block" />
          {input('hotValue', `Hot: money at stake per year from (${form.currency || 'currency'})`)}
          {input('warmValue', `Warm: money at stake per year from (${form.currency || 'currency'})`)}
          {input('hotScore', 'Points needed for Hot (1–5)', 'Value 0–2, checked figures 1, complete checklist 1, strong match 1.')}
          {input('warmScore', 'Points needed for Warm (1–5)')}
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-[0.9375rem] font-medium">Energy</legend>
          {input('energyPrice', `Price of one kWh (${form.currency || 'currency'})`, 'Optional. Leave empty to hide the energy saving line.')}
        </fieldset>
        {notice && <p role="status" className="label" style={{ color: 'var(--color-accent)' }}>{notice}</p>}
        {error && <p role="alert" className="label" style={{ color: 'var(--color-accent-deep)' }}>{error}</p>}
        <div className="flex flex-wrap gap-4">
          <button type="submit" className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-colors duration-300 hover:bg-accent">Save as new version</button>
          <button type="button" className="text-sm underline" onClick={() => { setForm(toForm(data.defaults)); setFields({}) }}>Fill in the defaults</button>
        </div>
      </form>
    </Panel>
    {data.history.length > 0 && <Panel title="Earlier versions">
      <ul className="grid gap-1 text-sm">{data.history.map((h) => <li key={h.version}>Version {h.version} · {h.created_by} · {h.created_at.replace('T', ' ').slice(0, 16)} UTC</li>)}</ul>
    </Panel>}
  </div>
}
