import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, Panel } from './ui'
import { requestJson } from '../lib/http'

interface QueueItem {
  reference: string; kind: string; title: string; reviewStatus: string; owner: string | null
  nextAction: string | null; nextActionDue: string | null; openClarifications: number; clarificationDue: string | null; overdue: boolean
}

/** Open cases by next-action due date. Admins see all; mediators see assigned cases. */
export default function NextActions({ onOpen }: { onOpen?: (item: QueueItem) => void }) {
  const [items, setItems] = useState<QueueItem[] | null>(null), [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'overdue' | 'unowned' | 'waiting'>('all')
  useEffect(() => { requestJson<{ items: QueueItem[] }>('/api/admin/queue').then((d) => setItems(d.items)).catch((e) => setError(e.message)) }, [])
  if (error) return <Empty>{error}</Empty>
  if (!items) return <Empty>Loading…</Empty>
  const shown = items.filter((i) => filter === 'all' || (filter === 'overdue' && i.overdue) || (filter === 'unowned' && !i.owner) || (filter === 'waiting' && i.openClarifications > 0))
  return <Panel title="Next actions" action={<select className="field-input" aria-label="Filter cases" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
    <option value="all">All open cases</option><option value="overdue">Overdue</option><option value="unowned">No owner</option><option value="waiting">Waiting on submitter</option></select>}>
    {shown.length === 0 ? <p>Nothing here.</p> : <ul className="grid gap-3">{shown.map((i) => {
      const path = `/admin/${i.kind === 'challenge' ? 'challenges' : 'innovations'}/${i.reference}`
      const title = <><strong>{i.title || i.reference}</strong> <span className="text-sm">{i.reference}</span></>
      return <li key={i.reference} className="border p-3 grid gap-1" style={{ borderColor: i.overdue ? 'var(--color-accent)' : 'var(--rule)' }}>
        {onOpen ? <button className="text-left underline-offset-2 hover:underline" onClick={() => onOpen(i)}>{title}</button> : <Link to={path}>{title}</Link>}
        <span>{i.nextAction ?? 'No next action set'}{i.nextActionDue ? ` · due ${i.nextActionDue}${i.overdue ? ' (overdue)' : ''}` : ''}</span>
        <span className="text-sm">{i.reviewStatus.replaceAll('_', ' ')} · owner {i.owner ?? 'none'}{i.openClarifications ? ` · ${i.openClarifications} question(s) awaiting the submitter${i.clarificationDue ? `, due ${i.clarificationDue}` : ''}` : ''}</span>
      </li>
    })}</ul>}
  </Panel>
}
