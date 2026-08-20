import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, shortDateTime } from './ui'
import type { Me } from './api'

/**
 * The pipeline, stated once.
 *
 * It is here because the last step is the point: the engine ranks, and a
 * person decides. Someone using this page for the first time should be able to
 * see that from the page rather than be told it in training.
 */
const PIPELINE = [
  'Structure requirements',
  'Semantic analysis',
  'Search the technology register',
  'Apply engineering filters',
  'Rank candidates',
  'InThinks technical review',
]

const DECISION_TONE: Record<string, 'neutral' | 'active' | 'quiet'> = {
  'Approved for Industry Discussion': 'active',
  Rejected: 'quiet',
  Hold: 'quiet',
  Pending: 'neutral',
}

/**
 * Run the matching, and review what it produced.
 *
 * Deliberately separate from Public records. That page decides what the world
 * sees; this one is the internal register, where most rows are candidates
 * nobody has read and some will be rejected. Nothing here is public, and the
 * one action that crosses over — promote — produces a draft rather than a
 * published page.
 */
export default function Engine({ me }: { me: Me }) {
  const [targets, setTargets] = useState<api.MatchTarget[] | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [items, setItems] = useState<api.MatchSummary[] | null>(null)
  const [decisions, setDecisions] = useState<api.MatchDecision[]>([])
  const [releasing, setReleasing] = useState<api.MatchDecision>('Approved for Industry Discussion')
  const [challenge, setChallenge] = useState('')
  const [decision, setDecision] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const loadTargets = () => {
    api.matchTargets()
      .then((r) => { setTargets(r.items); setConfigured(r.configured) })
      .catch((e) => setError(e.message))
  }
  const loadMatches = () => {
    setItems(null)
    api.matches({ ...(challenge ? { challenge } : {}), ...(decision ? { decision } : {}) })
      .then((r) => { setItems(r.items); setDecisions(r.decisions); setReleasing(r.releasingDecision) })
      .catch((e) => setError(e.message))
  }

  useEffect(loadTargets, [])
  useEffect(loadMatches, [challenge, decision])

  const act = async (reference: string, fn: () => Promise<unknown>) => {
    setBusy(reference)
    setError(null)
    try { await fn(); loadMatches(); loadTargets() }
    catch (e) { setError(e instanceof Error ? e.message : 'That did not work') }
    finally { setBusy(null) }
  }

  const run = async () => {
    if (!challenge) return
    setBusy('run'); setError(null); setNote(null)
    try {
      const r = await api.generateMatches(challenge)
      setNote(`${r.considered} considered · ${r.shortlisted} shortlisted · ${r.created} written · ${r.engine}`)
      loadMatches(); loadTargets()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The match engine failed')
    } finally { setBusy(null) }
  }

  const pending = (items ?? []).filter((m) => m.decision === 'Pending').length

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="section-type">Match engine</h1>
        <p className="label" style={{ color: 'var(--color-faint)' }}>AI RECOMMENDS · INTHINKS QUALIFIES</p>
      </div>

      {/* The pipeline as a row of steps, with the last one weighted: every
          candidate below stops here until a person moves it. */}
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-2">
        {PIPELINE.map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            <span className="label" style={{ color: i === PIPELINE.length - 1 ? 'var(--color-accent)' : 'var(--color-faint)' }}>
              {step.toUpperCase()}
            </span>
            {i < PIPELINE.length - 1 && (
              <span aria-hidden="true" className="h-px w-4" style={{ background: 'var(--rule-strong)' }} />
            )}
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="label px-3 py-2" style={{ border: '1px solid var(--color-accent-deep)', color: 'var(--color-accent-deep)' }}>
          {error}
        </p>
      )}

      {configured === false && (
        <p className="label px-3 py-2" style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
          THE ENGINE IS NOT CONFIGURED ON THIS DEPLOYMENT — SET ANTHROPIC_API_KEY TO RUN IT
        </p>
      )}

      {/* Run it. A menu rather than a typed reference, and it covers both
          kinds of challenge — submitted and authored. */}
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]" style={{ border: '1px solid var(--rule)' }}>
        <div>
          <label htmlFor="e-challenge" className="label" style={{ color: 'var(--color-faint)' }}>
            RUN MATCHING AGAINST
          </label>
          <select id="e-challenge" value={challenge} onChange={(e) => setChallenge(e.target.value)}
                  className="field-input mt-2 py-2 text-[0.875rem]">
            <option value="">All challenges — showing every candidate</option>
            {(targets ?? []).map((t) => (
              <option key={t.reference} value={t.reference}>
                {t.reference} — {t.title}
                {t.origin === 'authored' ? ' (authored)' : ''}
                {t.candidates ? ` · ${t.candidates} candidate${t.candidates === 1 ? '' : 's'}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={run}
            disabled={!challenge || busy === 'run' || !me.can.editReviewState || configured === false}
            className="tap label px-4 py-2.5 transition-colors duration-250 disabled:opacity-40"
            style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
          >
            {busy === 'run' ? 'RUNNING…' : 'RUN MATCHING'}
          </button>
        </div>
        <div className="flex items-end">
          <div>
            <label htmlFor="e-decision" className="label" style={{ color: 'var(--color-faint)' }}>DECISION</label>
            <select id="e-decision" value={decision} onChange={(e) => setDecision(e.target.value)}
                    className="field-input mt-2 py-2 text-[0.875rem]">
              <option value="">All</option>
              {decisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {note && (
        <p className="label px-3 py-2" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
          {note.toUpperCase()}
        </p>
      )}

      {items !== null && items.length > 0 && (
        <p className="label" style={{ color: 'var(--color-muted)' }}>
          {items.length} CANDIDATE{items.length === 1 ? '' : 'S'}
          {pending > 0 && ` · ${pending} AWAITING REVIEW`}
        </p>
      )}

      {items === null ? (
        <p className="label" style={{ color: 'var(--color-faint)' }}>LOADING</p>
      ) : items.length === 0 ? (
        <Empty>No candidates. Run the engine against a challenge to produce some.</Empty>
      ) : (
        <ul className="grid gap-3">
          {items.map((m) => (
            <li key={m.reference} className="p-4" style={{ border: '1px solid var(--rule)' }}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <Link to={`/admin/matches/${m.reference}`} className="ident" style={{ color: 'var(--color-accent)' }}>
                  {m.reference}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="quiet">{m.classification.toUpperCase()}</Chip>
                  <Chip tone={DECISION_TONE[m.decision] ?? 'neutral'}>{m.decision.toUpperCase()}</Chip>
                  {m.promotedAs && <Chip tone="active">PUBLIC {m.promotedAs}</Chip>}
                  <span className="label" style={{ color: 'var(--color-faint)' }}>{shortDateTime(m.createdAt)}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-[0.9375rem] sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <span>
                  <span className="ident mr-2" style={{ color: 'var(--color-muted)' }}>{m.challengeRef}</span>
                  {m.challengeTitle ?? '—'}
                </span>
                <span aria-hidden="true" className="label" style={{ color: 'var(--color-accent)' }}>↕</span>
                <span>
                  <span className="ident mr-2" style={{ color: 'var(--color-muted)' }}>{m.technologyRef}</span>
                  {m.technologyTitle ?? '—'}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
                <Link to={`/admin/matches/${m.reference}`} className="tap label px-2.5 py-1"
                      style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                  REVIEW
                </Link>

                {/* Approve and reject in place. Anything more considered than
                    a yes or no belongs in the match room, where the analysis
                    is, and the REVIEW link goes there. */}
                {me.can.editReviewState && m.decision !== releasing && (
                  <button type="button" disabled={busy === m.reference}
                          onClick={() => act(m.reference, () => api.decideMatch(m.reference, releasing, 'Approved from the engine list.'))}
                          className="tap label px-2.5 py-1 disabled:opacity-50"
                          style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                    APPROVE
                  </button>
                )}
                {me.can.editReviewState && m.decision !== 'Rejected' && (
                  <button type="button" disabled={busy === m.reference}
                          onClick={() => act(m.reference, () => api.decideMatch(m.reference, 'Rejected', 'Rejected from the engine list.'))}
                          className="tap label px-2.5 py-1 disabled:opacity-50"
                          style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                    REJECT
                  </button>
                )}

                {/* Promotion carries the engine's own analysis across rather
                    than asking somebody to retype it, which is how the public
                    record ends up disagreeing with the internal one. */}
                {me.can.moveAcquisitionStage && !m.promotedAs && (
                  <button type="button"
                          disabled={busy === m.reference || m.decision !== releasing}
                          title={m.decision !== releasing ? 'Approve it for industry discussion first' : undefined}
                          onClick={() => act(m.reference, () => api.promoteMatch(m.reference))}
                          className="tap label px-2.5 py-1 disabled:opacity-40"
                          style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                    PROMOTE TO PUBLIC
                  </button>
                )}
                {m.promotedAs && (
                  <Link to="/admin/public" className="tap label px-2.5 py-1"
                        style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                    OPEN PUBLIC RECORD
                  </Link>
                )}

                {m.decision !== releasing && (
                  <span className="label" style={{ color: 'var(--color-faint)' }}>
                    NOT PUBLISHABLE UNTIL APPROVED
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
