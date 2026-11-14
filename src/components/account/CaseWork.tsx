import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { participantApi as api } from '../../lib/participant'
import QualificationEditor from '../qualification/QualificationEditor'
import FollowUps from './FollowUps'

interface Question { id: number; question: string; askedAt: string; dueAt: string | null; status: string; response: string | null; respondedAt: string | null }

/** Questions from InThinks about one case, and the participant's answers. */
export function Clarifications({ reference }: { reference: string }) {
  const [items, setItems] = useState<Question[]>([]), [answers, setAnswers] = useState<Record<number, string>>({})
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const load = () => api<{ items: Question[] }>(`/records/${reference}/clarifications`).then((r) => setItems(r.items))
  useEffect(() => { load().catch((e) => setError(e.message)) }, [reference])
  if (!items.length && !error) return null
  return <section className="grid gap-3" aria-labelledby={`questions-${reference}`}>
    <h3 id={`questions-${reference}`} className="font-semibold">Questions from InThinks</h3>
    {error && <p role="alert">{error}</p>}
    {items.map((q) => <article key={q.id} className="border p-4 grid gap-2" style={{ borderColor: 'var(--rule)' }}>
      <p className="whitespace-pre-wrap">{q.question}</p>
      <span className="text-sm">Asked {q.askedAt.slice(0, 10)}{q.dueAt ? ` · answer requested by ${q.dueAt}` : ''}</span>
      {q.status === 'answered'
        ? <p className="whitespace-pre-wrap"><strong>Your answer:</strong> {q.response}</p>
        : <form className="grid gap-2" onSubmit={(e) => {
            e.preventDefault(); setBusy(true); setError('')
            api(`/records/${reference}/clarifications/${q.id}`, { response: answers[q.id] ?? '' })
              .then(load).catch((err) => setError(err.message)).finally(() => setBusy(false))
          }}>
            <label className="grid gap-1">Your answer<textarea className="field-input" required rows={4} maxLength={4000} value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} /></label>
            <span className="text-sm">Answers cannot be edited after sending. Do not include information you have not agreed to share.</span>
            <button className="border px-4 py-2 justify-self-start disabled:opacity-50" disabled={busy}>Send answer</button>
          </form>}
    </article>)}
  </section>
}

export function CaseFigures({ reference }: { reference: string }) {
  const [version, setVersion] = useState(0)
  return <section className="grid gap-3">
    <FollowUps reference={reference} onChange={() => setVersion((v) => v + 1)} />
    <h3 className="font-semibold">Figures for this case</h3>
    <QualificationEditor key={version} base={`/api/participant/records/${reference}/qualification`} side="participant" />
  </section>
}

interface Draft { id: string; kind: 'challenge' | 'innovation'; title: string; organizationId: string | null; updatedAt: string; expiresAt: string }

/** Unsent drafts saved to the account. Private to their author. */
export function Drafts() {
  const [items, setItems] = useState<Draft[]>([]), [error, setError] = useState('')
  const load = () => api<{ items: Draft[] }>('/drafts').then((r) => setItems(r.items))
  useEffect(() => { load().catch((e) => setError(e.message)) }, [])
  if (!items.length && !error) return null
  return <section className="grid gap-3">
    <h2 className="text-xl">Saved drafts</h2>
    {error && <p role="alert">{error}</p>}
    {items.map((d) => <div key={d.id} className="border p-4 flex flex-wrap justify-between gap-3" style={{ borderColor: 'var(--rule)' }}>
      <span><strong>{d.title || 'Untitled draft'}</strong><br />{d.kind === 'challenge' ? 'Problem' : 'Solution'} · saved {d.updatedAt.slice(0, 10)} · kept until {d.expiresAt.slice(0, 10)}</span>
      <span className="flex gap-4">
        <Link className="underline" to={`/${d.kind === 'challenge' ? 'submit-challenge' : 'submit-innovation'}?draft=${d.id}`}>Continue</Link>
        <button className="underline" onClick={() => { if (window.confirm('Delete this draft? This cannot be undone.')) api(`/drafts/${d.id}`, undefined, 'DELETE').then(load).catch((e) => setError(e.message)) }}>Delete</button>
      </span>
    </div>)}
  </section>
}
