import { useEffect, useRef, useState } from 'react'
import { participantApi as api } from '../../lib/participant'

/* Phase 11 participant pieces: document reading, discovery, consent, voice. */

async function post<T>(path: string, body: BodyInit, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`/api/participant${path}`, { method: 'POST', body, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? 'Request failed')
  return data as T
}

/** Read figures from a document. The file is not stored; suggestions still need confirming. */
export function DocumentReader({ reference, onFound }: { reference: string; onFound: () => void }) {
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  return <div className="grid gap-2 border p-4" style={{ borderColor: 'var(--rule)' }}>
    <label className="grid gap-1"><span className="font-semibold">Read figures from a document</span>
      <span className="text-sm">A test report, data sheet or spreadsheet (PDF, Word, Excel, CSV or text, under 10 MB). InThinks reads the numbers and offers them for you
        to confirm one by one. The file itself is not kept, and email addresses, phone numbers and web links are removed before it is read.</span>
      <input type="file" disabled={busy} accept=".pdf,.docx,.xlsx,.csv,.txt" onChange={(e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const form = new FormData(); form.set('document', file)
        setBusy(true); setError(''); setMessage('')
        post<{ message: string }>(`/records/${reference}/read-document`, form)
          .then((r) => { setMessage(r.message); onFound() }).catch((err) => setError(err.message))
          .finally(() => { setBusy(false); e.target.value = '' })
      }} /></label>
    {busy && <p role="status">Reading the document…</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </div>
}

/** The owner's yes/no to showing this problem, anonymised, to verified solution providers. */
export function DiscoveryConsent({ reference, initial }: { reference: string; initial: boolean }) {
  const [consent, setConsent] = useState(initial), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  return <div className="grid gap-1 border p-4" style={{ borderColor: 'var(--rule)' }}>
    <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={consent} disabled={busy} onChange={(e) => {
      const next = e.target.checked; setBusy(true); setError('')
      api(`/records/${reference}/discovery-consent`, { consent: next }).then(() => setConsent(next)).catch((err) => setError(err.message)).finally(() => setBusy(false))
    }} />
      <span>Let InThinks show an anonymised description of this problem to verified solution providers.
        <span className="block text-sm">They never see your company, people, site or costs, and you never learn who looked. InThinks writes and approves the description. You can switch this off at any time.</span></span></label>
    {error && <p role="alert">{error}</p>}
  </div>
}

interface Listed { id: number; title: string; summary: string; figures: { label: string; comparator: string | null; value: number | null; valueMax: number | null; unit: string | null }[]; interestSent: boolean }
const COMPARATOR: Record<string, string> = { lt: 'below ', lte: 'at most ', gt: 'above ', gte: 'at least ' }

/** Discovery for members of verified solution providers. Hidden for everyone else. */
export function DiscoveryList() {
  const [items, setItems] = useState<Listed[] | null>(null), [notes, setNotes] = useState<Record<number, string>>({})
  const [error, setError] = useState(''), [busy, setBusy] = useState(0)
  const load = () => api<{ verified: boolean; items: Listed[] }>('/discovery').then((r) => setItems(r.verified ? r.items : null)).catch(() => setItems(null))
  useEffect(() => { void load() }, [])
  if (!items) return null
  return <section className="grid gap-3">
    <h2 className="text-xl">Problems you could solve</h2>
    <p className="text-sm">Your organization is a verified solution provider. These problems are anonymised: you will not learn whose they are. If you could solve one, tell InThinks; InThinks handles everything from there.</p>
    {error && <p role="alert">{error}</p>}
    {items.length === 0 && <p>No problems are listed right now.</p>}
    {items.map((i) => <article key={i.id} className="border p-5 grid gap-2">
      <h3 className="text-lg font-medium">{i.title}</h3>
      <p className="whitespace-pre-wrap">{i.summary}</p>
      {i.figures.length > 0 && <ul className="list-disc pl-5 text-sm">{i.figures.map((f) => <li key={f.label}>{f.label}: {f.comparator === 'between' ? `${f.value}–${f.valueMax}` : `${COMPARATOR[f.comparator ?? ''] ?? ''}${f.value}`}{f.unit ? ` ${f.unit}` : ''}</li>)}</ul>}
      {i.interestSent ? <p className="text-sm">You told InThinks you could solve this.</p> : <form className="grid gap-2" onSubmit={(e) => {
        e.preventDefault(); setBusy(i.id); setError('')
        api(`/discovery/${i.id}/interest`, { note: notes[i.id] ?? '' }).then(load).catch((err) => setError(err.message)).finally(() => setBusy(0))
      }}>
        <label className="text-sm">How could you solve it?<textarea className="field-input mt-1" rows={2} maxLength={1500} value={notes[i.id] ?? ''} onChange={(e) => setNotes({ ...notes, [i.id]: e.target.value })} /></label>
        <button className="border px-4 py-2 justify-self-start disabled:opacity-50" disabled={busy === i.id}>We could solve this</button>
      </form>}
    </article>)}
  </section>
}

/**
 * Record a spoken description and turn it into text the participant edits.
 * Needs a signed-in account; the recording is not kept.
 */
export function VoiceInput({ onText }: { onText: (text: string) => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'reading'>('idle'), [error, setError] = useState('')
  const recorder = useRef<MediaRecorder | null>(null), timer = useRef<number | null>(null)
  if (typeof window === 'undefined' || !('MediaRecorder' in window) || !navigator.mediaDevices) return null
  const stop = () => { if (timer.current) window.clearTimeout(timer.current); recorder.current?.stop() }
  const start = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: Blob[] = []
      const rec = new MediaRecorder(stream)
      rec.ondataavailable = (e) => chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
        setState('reading')
        post<{ text: string }>('/voice', blob, { 'content-type': blob.type.split(';')[0] })
          .then((r) => onText(r.text)).catch((err) => setError(err.message)).finally(() => setState('idle'))
      }
      recorder.current = rec; rec.start(); setState('recording')
      timer.current = window.setTimeout(stop, 120_000) // two minutes at most
    } catch { setError('Microphone access was refused. You can type instead.') }
  }
  return <div className="flex flex-wrap items-center gap-3 text-sm">
    {state === 'idle' && <button type="button" className="border px-3 py-1.5" onClick={() => void start()}>Describe it by voice</button>}
    {state === 'recording' && <button type="button" className="border px-3 py-1.5" onClick={stop}>Stop recording</button>}
    {state === 'reading' && <span role="status">Turning your recording into text…</span>}
    <span>Up to two minutes. Requires signing in; the recording is not kept. Check the text before you submit.</span>
    {error && <span role="alert">{error}</span>}
  </div>
}
