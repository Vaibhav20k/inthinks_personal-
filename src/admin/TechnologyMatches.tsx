import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, Panel } from './ui'

/**
 * Reverse matching on a technology: the problems it could answer.
 * Results are ordinary match rows, so they are reviewed and decided exactly
 * like problem-to-technology suggestions. Nothing here reaches a participant.
 */
export default function TechnologyMatches({ reference, canRun }: { reference: string; canRun: boolean }) {
  const [matches, setMatches] = useState<api.MatchSummary[]>([])
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(() => {
    api.matches({ technology: reference }).then((r) => setMatches(r.items)).catch(() => undefined)
  }, [reference])
  useEffect(load, [load])

  const run = async () => {
    setRunning(true); setMessage(null)
    try {
      const r = await api.generateTechnologyMatches(reference)
      setMessage(r.created === 0
        ? `No problems passed the rules. ${r.considered} considered.`
        : `${r.created} suggestion${r.created === 1 ? '' : 's'} from ${r.considered} problems considered · ${r.engine}`)
      load()
    } catch (cause) {
      setMessage(cause instanceof api.AdminError ? cause.message : 'The match engine failed.')
    } finally { setRunning(false) }
  }

  return (
    <Panel
      title="Problems this could solve"
      action={canRun ? (
        <button type="button" onClick={run} disabled={running}
          className="label px-3 py-2 transition-colors duration-200 hover:text-accent disabled:opacity-50"
          style={{ border: '1px solid var(--rule-strong)' }}>
          {running ? 'RUNNING…' : 'FIND MATCHING PROBLEMS'}
        </button>
      ) : undefined}
    >
      {message && <p className="label mb-4" style={{ color: 'var(--color-muted)' }}>{message.toUpperCase()}</p>}
      {matches.length === 0 ? (
        <Empty>No suggestions yet. The engine ranks every problem against this technology and keeps the best three for review.</Empty>
      ) : (
        <ul>
          {matches.map((m) => (
            <li key={m.reference} className="py-3" style={{ borderTop: '1px solid var(--rule)' }}>
              <Link to={`/admin/matches/${m.reference}`} className="flex flex-wrap items-center justify-between gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-medium">{m.challengeTitle ?? m.challengeRef}</span>
                  <span className="label" style={{ color: 'var(--color-faint)' }}>{m.challengeRef}</span>
                </span>
                <Chip tone={m.classification === 'Strong Match' ? 'active' : 'neutral'}>{m.classification}</Chip>
                <Chip tone={m.decision === 'Pending' ? 'quiet' : 'neutral'}>{m.decision}</Chip>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
