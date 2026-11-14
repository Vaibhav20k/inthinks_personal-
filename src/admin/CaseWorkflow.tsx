import { useEffect, useState } from 'react'
import { Panel } from './ui'
import { requestJson } from '../lib/http'
import QualificationEditor from '../components/qualification/QualificationEditor'
import MissingFigures from './MissingFigures'
import Assessment from './Assessment'

interface Clarification {
  id: number; question: string; askedBy: string; askedAt: string; dueAt: string | null; status: string
  response: string | null; respondedBy: string | null; respondedAt: string | null
}
interface State {
  canChooseOwner: boolean; owners: string[]
  workflow: { owner: string | null; nextAction: string | null; nextActionDue: string | null; updatedBy: string; updatedAt: string } | null
  clarifications: Clarification[]
}

/** Owner, next action, clarification questions and qualification for one case. */
export default function CaseWorkflow({ reference }: { reference: string }) {
  const base = `/api/admin/cases/${reference}`
  const [data, setData] = useState<State | null>(null)
  const [owner, setOwner] = useState(''), [nextAction, setNextAction] = useState(''), [due, setDue] = useState('')
  const [question, setQuestion] = useState(''), [questionDue, setQuestionDue] = useState('')
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const [figures, setFigures] = useState(0)
  async function load() {
    const d = await requestJson<State>(base)
    setData(d); setOwner(d.workflow?.owner ?? ''); setNextAction(d.workflow?.nextAction ?? ''); setDue(d.workflow?.nextActionDue ?? '')
  }
  useEffect(() => { load().catch((e) => setError(e.message)) }, [reference])
  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setNotice('')
    try { await fn(); await load(); setNotice(done) } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') } finally { setBusy(false) }
  }
  if (!data) return <Panel title="Case workflow">{error ? <p role="alert">{error}</p> : <p>Loading…</p>}</Panel>
  const open = data.clarifications.filter((c) => c.status === 'open').length
  return <>
    <Panel title="Case workflow">
      <div className="grid gap-5">
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <form className="grid gap-3" onSubmit={(e) => {
          e.preventDefault()
          void run(() => requestJson(`${base}/workflow`, { ...(data.canChooseOwner ? { owner } : {}), nextAction, nextActionDue: due }, 'PUT'), 'Workflow saved.')
        }}>
          {data.canChooseOwner
            ? <label className="grid gap-1">Case owner<select className="field-input" value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">No owner</option>{data.owners.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                <span className="text-sm">A mediator must be assigned to the case before owning it.</span></label>
            : <p>Owner: {data.workflow?.owner ?? 'none yet'}</p>}
          <label className="grid gap-1">Next action<input className="field-input" maxLength={300} value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="e.g. Confirm kiln operating temperatures" /></label>
          <label className="grid gap-1">Due<input className="field-input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          {data.workflow && <p className="text-sm">Last updated by {data.workflow.updatedBy} on {data.workflow.updatedAt.slice(0, 10)}.</p>}
          <button className="border px-4 py-2 justify-self-start" disabled={busy}>Save workflow</button>
        </form>
        <div className="grid gap-3">
          <h3 className="font-semibold">Clarification questions{open ? ` · ${open} open` : ''}</h3>
          <p className="text-sm">The submitter sees the question in My submissions, without the name of who asked. Sending one marks the case "clarification requested" until every question is answered or withdrawn. No email is sent yet; tell the submitter separately if it is urgent.</p>
          {data.clarifications.map((c) => <article key={c.id} className="border p-3 grid gap-1" style={{ borderColor: 'var(--rule)' }}>
            <p className="whitespace-pre-wrap"><strong>Q:</strong> {c.question}</p>
            <span className="text-sm">{c.status} · asked by {c.askedBy} on {c.askedAt.slice(0, 10)}{c.dueAt ? ` · due ${c.dueAt}` : ''}</span>
            {c.response && <p className="whitespace-pre-wrap"><strong>A:</strong> {c.response} <span className="text-sm">({c.respondedBy}, {c.respondedAt?.slice(0, 10)})</span></p>}
            {c.status === 'open' && <button className="underline justify-self-start text-sm" disabled={busy} onClick={() => void run(() => requestJson(`${base}/clarifications/${c.id}/withdraw`, {}), 'Question withdrawn.')}>Withdraw question</button>}
          </article>)}
          <form className="grid gap-3" onSubmit={(e) => {
            e.preventDefault()
            void run(async () => { await requestJson(`${base}/clarifications`, { question, dueAt: questionDue }); setQuestion(''); setQuestionDue('') }, 'Question sent to the submitter.')
          }}>
            <label className="grid gap-1">New question<textarea className="field-input" required rows={3} maxLength={2000} value={question} onChange={(e) => setQuestion(e.target.value)} /></label>
            <label className="grid gap-1">Answer requested by<input className="field-input" type="date" value={questionDue} onChange={(e) => setQuestionDue(e.target.value)} /></label>
            <button className="border px-4 py-2 justify-self-start" disabled={busy}>Ask the submitter</button>
          </form>
        </div>
      </div>
    </Panel>
    <Assessment key={figures} reference={reference} />
    <MissingFigures key={`m${figures}`} reference={reference} onAsked={() => void load()} />
    <Panel title="Qualification"><QualificationEditor base={`${base}/qualification`} side="staff" onChange={() => setFigures((n) => n + 1)} /></Panel>
  </>
}
