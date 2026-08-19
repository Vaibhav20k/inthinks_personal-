import { useCallback, useEffect, useState } from 'react'
import * as api from './api'
import { Chip, Panel, Withheld } from './ui'
import { outcomes as OUTCOMES, sectors as SECTORS } from '../data/taxonomy'
import type { Me } from './api'

const IP_STATUSES = [
  'To Be Confirmed', 'Under Evaluation', 'Filing In Preparation',
  'Application Filed', 'Rights Secured',
]
const TRANSFER_STATUSES = [
  'Under Development', 'Industry Evaluation', 'Pilot Opportunity', 'Transfer Ready',
]

const EMPTY: Record<string, string> = {
  slug: '', name: '', thesis: '', problem: '', principle: '', whyItMatters: '',
  validation: '', applications: '', nextMilestones: '',
  ipStatus: 'To Be Confirmed', transferStatus: 'Under Development',
}

const lines = (value: string) => value.split('\n').map((l) => l.trim()).filter(Boolean)

function Text({ label, name, value, onChange, rows, help }: {
  label: string; name: string; value: string
  onChange: (v: string) => void; rows?: number; help?: string
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="label" style={{ color: 'var(--color-faint)' }}>{label}</span>
      {rows ? (
        <textarea name={name} rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
          className="field-input text-[0.875rem]" />
      ) : (
        <input name={name} value={value} onChange={(e) => onChange(e.target.value)}
          className="field-input py-2 text-[0.875rem]" />
      )}
      {help && <span className="label" style={{ color: 'var(--color-faint)' }}>{help}</span>}
    </label>
  )
}

function Toggles({ label, options, selected, onToggle }: {
  label: string
  options: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="grid gap-2">
      <span className="label" style={{ color: 'var(--color-faint)' }}>{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              aria-pressed={on}
              className="px-2.5 py-1.5 text-[0.8125rem] transition-colors duration-200"
              style={{
                border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
                background: on ? 'var(--color-accent)' : 'transparent',
                color: on ? '#fff' : 'var(--color-muted)',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * The public page for a technology, written here.
 *
 * Nothing on this form is copied from the submission. An innovator writes for
 * assessors under confidence; this is written by InThinks, about the
 * technology, for an industrial reader — which is why it is a blank form and
 * not a pre-filled one.
 *
 * TRL, stage and domain are shown but not editable: they come from the record
 * the R&D workspace maintains, so the public page cannot claim a maturity the
 * workspace disagrees with.
 */
export default function PublicProfile({ reference, me }: { reference: string; me: Me }) {
  const [state, setState] = useState<api.ProfileState | null>(null)
  const [form, setForm] = useState<Record<string, string>>(EMPTY)
  const [sectors, setSectors] = useState<string[]>([])
  const [outcomes, setOutcomes] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.profile(reference).then((next) => {
      setState(next)
      const p = next.profile
      setForm(p
        ? {
            slug: p.slug, name: p.name, thesis: p.thesis, problem: p.problem,
            principle: p.principle, whyItMatters: p.whyItMatters, validation: p.validation,
            applications: p.applications.join('\n'), nextMilestones: p.nextMilestones.join('\n'),
            ipStatus: p.ipStatus, transferStatus: p.transferStatus,
          }
        : { ...EMPTY, slug: next.suggestedSlug })
      setSectors(p?.sectors ?? [])
      setOutcomes(p?.outcomes ?? [])
    }).catch((e) => setError(e.message))
  }, [reference])

  useEffect(() => { load() }, [load])

  const set = (key: string) => (v: string) => setForm((f) => ({ ...f, [key]: v }))
  const toggle = (list: string[], setList: (v: string[]) => void) => (id: string) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const save = async () => {
    setBusy(true); setError(null); setMessage(null)
    try {
      await api.saveProfile(reference, {
        ...form,
        applications: lines(form.applications),
        nextMilestones: lines(form.nextMilestones),
        sectors, outcomes,
      })
      setMessage('Saved.')
      load()
    } catch (cause) {
      setError(cause instanceof api.AdminError ? cause.message : 'Could not save the profile')
    } finally { setBusy(false) }
  }

  const setPublished = async (published: boolean) => {
    setBusy(true); setError(null); setMessage(null)
    try {
      await api.publishProfile(reference, published)
      setMessage(published ? 'Published. The page is live.' : 'Withdrawn from the public site.')
      load()
    } catch (cause) {
      setError(cause instanceof api.AdminError ? cause.message : 'Could not change publication')
    } finally { setBusy(false) }
  }

  if (!state) {
    return <Panel title="Public technology page"><p className="text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>Loading…</p></Panel>
  }

  const published = state.profile?.published ?? false

  return (
    <Panel
      title="Public technology page"
      action={
        published
          ? <Chip tone="active">LIVE</Chip>
          : state.exists ? <Chip tone="quiet">DRAFT</Chip> : <Chip tone="quiet">NOT WRITTEN</Chip>
      }
    >
      {!me.can.moveAcquisitionStage ? (
        <Withheld>Writing and publishing a technology page is limited to admins and business development.</Withheld>
      ) : (
        <>
          <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Written here, not copied from the submission. A submission is written for
            assessors under confidence; this is written for an industrial reader, and
            never names the innovator or the source institution.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Chip label="DOMAIN">{state.derived.domain}</Chip>
            <Chip label="TRL">{`${state.derived.entryTrl} → ${state.derived.currentTrl} → ${state.derived.targetTrl}`}</Chip>
            <Chip label="PUBLIC STAGE">{state.derived.stage}</Chip>
          </div>
          <p className="label mt-2" style={{ color: 'var(--color-faint)' }}>
            DERIVED FROM THE R&amp;D RECORD — NOT EDITABLE HERE
          </p>

          <div className="mt-6 grid gap-4 [&>*]:min-w-0">
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <Text label="PUBLIC NAME" name="name" value={form.name} onChange={set('name')} />
              <Text label="SLUG" name="slug" value={form.slug} onChange={set('slug')}
                help={`/technologies/${form.slug || '…'}`} />
            </div>
            <Text label="THESIS" name="thesis" value={form.thesis} onChange={set('thesis')} rows={2}
              help="One sentence, under the title" />
            <Text label="INDUSTRIAL PROBLEM" name="problem" value={form.problem} onChange={set('problem')} rows={4} />
            <Text label="HOW IT WORKS" name="principle" value={form.principle} onChange={set('principle')} rows={4}
              help="Credible without disclosing confidential implementation detail" />
            <Text label="WHY IT MATTERS" name="whyItMatters" value={form.whyItMatters} onChange={set('whyItMatters')} rows={4} />
            <Text label="VALIDATION STATUS" name="validation" value={form.validation} onChange={set('validation')} rows={3}
              help="State only what evidence supports" />
            <Text label="APPLICATIONS" name="applications" value={form.applications} onChange={set('applications')} rows={3}
              help="One per line" />
            <Text label="NEXT MILESTONES" name="nextMilestones" value={form.nextMilestones} onChange={set('nextMilestones')} rows={3}
              help="One per line" />

            <Toggles label="INDUSTRIES" options={SECTORS.map((s) => ({ id: s, label: s }))}
              selected={sectors} onToggle={toggle(sectors, setSectors)} />
            <Toggles label="OUTCOMES" options={OUTCOMES.map((o) => ({ id: o.id, label: o.label }))}
              selected={outcomes} onToggle={toggle(outcomes, setOutcomes)} />
            <p className="label" style={{ color: 'var(--color-faint)' }}>
              INDUSTRIES AND OUTCOMES ARE THE EXPLORER&rsquo;S OWN FILTERS — A PAGE CANNOT INVENT A FACET
            </p>

            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>IP STATUS</span>
                <select value={form.ipStatus} onChange={(e) => set('ipStatus')(e.target.value)}
                  className="field-input py-2 text-[0.875rem]">
                  {IP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label" style={{ color: 'var(--color-faint)' }}>TRANSFER STATUS</span>
                <select value={form.transferStatus} onChange={(e) => set('transferStatus')(e.target.value)}
                  className="field-input py-2 text-[0.875rem]">
                  {TRANSFER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <p className="label" style={{ color: 'var(--color-faint)' }}>
              TRANSFER STATUS IS STATED, NOT READ OFF THE PIPELINE — A DERIVED ONE WOULD TELL A READER
              THAT A TECHNOLOGY IS IN NEGOTIATION
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 pt-5" style={{ borderTop: '1px solid var(--rule)' }}>
            <button type="button" onClick={save} disabled={busy}
              className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-colors duration-300 hover:bg-accent disabled:opacity-50">
              {busy ? 'Saving…' : state.exists ? 'Save draft' : 'Create draft'}
            </button>
            {state.exists && (
              published ? (
                <button type="button" onClick={() => setPublished(false)} disabled={busy}
                  className="label px-4 py-2.5" style={{ border: '1px solid var(--rule-strong)' }}>
                  WITHDRAW FROM THE SITE
                </button>
              ) : (
                <button type="button" onClick={() => setPublished(true)} disabled={busy || !state.publishable}
                  className="label px-4 py-2.5 transition-colors duration-200 hover:text-accent disabled:opacity-40"
                  style={{ border: '1px solid var(--rule-strong)' }}>
                  PUBLISH
                </button>
              )
            )}
            {state.profile?.publishedAt && (
              <span className="label" style={{ color: 'var(--color-faint)' }}>
                {published ? 'LIVE SINCE' : 'LAST PUBLISHED'} {state.profile.publishedAt.slice(0, 10)}
                {state.profile.publishedBy ? ` · ${state.profile.publishedBy}` : ''}
              </span>
            )}
          </div>

          {!state.publishable && (
            <p className="mt-4 text-[0.875rem]" style={{ color: 'var(--color-muted)' }}>
              Publishing needs development rights. This record is at{' '}
              <strong>{state.acquisitionStage}</strong>; a page that presents a technology
              as available to develop, when InThinks holds no rights to it, is a claim it
              cannot make.
            </p>
          )}
          {message && <p className="label mt-4" style={{ color: 'var(--color-accent)' }}>{message}</p>}
          {error && <p role="alert" className="mt-4 text-[0.875rem]" style={{ color: 'var(--color-accent-deep)' }}>{error}</p>}
        </>
      )}
    </Panel>
  )
}
