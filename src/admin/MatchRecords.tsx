import { useEffect, useState } from 'react'
import * as api from './api'
import { Chip, Empty, shortDate } from './ui'

const RATING_TONE: Record<string, string> = {
  Strong: 'var(--color-accent)',
  Promising: 'var(--color-accent-deep)',
  Moderate: 'var(--color-muted)',
  Limited: 'var(--color-faint)',
  Unknown: 'var(--color-faint)',
}

const BLANK = {
  matchClass: 'Candidate match',
  status: 'Technical review',
  rationale: '',
  nextStep: '',
  openQuestions: '',
  developmentRequired: 'Medium',
  recordType: 'live' as 'demo' | 'live',
  fit: {} as Record<string, string>,
}

/**
 * The public match register.
 *
 * Distinct from the engine's Matches page, which pairs a submitted challenge
 * with an innovation and is mostly candidates nobody has read yet. This is
 * what the site shows: a relationship between two records that are already
 * public, written by InThinks for an outside reader.
 *
 * Two conditions decide whether a row can be published, and both are stated on
 * the row rather than left to be discovered from an error:
 *
 *   Both ends must be published, because a match page links to both.
 *   Where an engine match is behind it, that match must have been approved for
 *   industry discussion. AI recommends; InThinks qualifies.
 */
export default function MatchRecords() {
  const [meta, setMeta] = useState<api.MatchProfileMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [problemRef, setProblemRef] = useState('')
  const [technologyRef, setTechnologyRef] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState(BLANK)

  const load = () => {
    setError(null)
    api.matchProfiles().then(setMeta).catch((e) => setError(e.message))
  }
  useEffect(load, [])

  const act = async (reference: string, fn: () => Promise<unknown>) => {
    setBusy(reference)
    try { await fn(); load() }
    catch (e) { setError(e instanceof Error ? e.message : 'That did not work') }
    finally { setBusy(null) }
  }

  const open = (m: api.MatchProfile) => {
    setEditing(m.reference)
    setDraft({
      matchClass: m.matchClass, status: m.status, rationale: m.rationale,
      nextStep: m.nextStep, openQuestions: m.openQuestions.join('\n'),
      developmentRequired: m.developmentRequired, recordType: m.recordType,
      fit: Object.fromEntries(m.fit.map((f) => [f.dimension, f.rating])),
    })
  }

  const save = async () => {
    if (!editing) return
    await act(editing, async () => {
      await api.saveMatchProfile(editing, {
        ...draft,
        openQuestions: draft.openQuestions.split('\n').map((l) => l.trim()).filter(Boolean),
        // Only dimensions actually rated are sent; an unset one is absent
        // rather than being published as "Unknown" nobody chose.
        fit: Object.entries(draft.fit)
          .filter(([, rating]) => rating)
          .map(([dimension, rating]) => ({ dimension, rating })),
      })
      setEditing(null)
    })
  }

  if (meta === null) {
    return error
      ? <p role="alert" className="label px-3 py-2" style={{ border: '1px solid var(--color-accent-deep)', color: 'var(--color-accent-deep)' }}>{error}</p>
      : <p className="label" style={{ color: 'var(--color-faint)' }}>LOADING</p>
  }

  return (
    <>
      {error && (
        <p role="alert" className="label px-3 py-2" style={{ border: '1px solid var(--color-accent-deep)', color: 'var(--color-accent-deep)' }}>
          {error}
        </p>
      )}

      {/* Linking, not authoring. A match is a relationship between two records
          that already exist, so this picks two rather than asking for prose. */}
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]" style={{ border: '1px solid var(--rule)' }}>
        <div>
          <label htmlFor="m-problem" className="label" style={{ color: 'var(--color-faint)' }}>INDUSTRIAL PROBLEM</label>
          <select id="m-problem" value={problemRef} onChange={(e) => setProblemRef(e.target.value)}
                  className="field-input mt-2 py-2 text-[0.875rem]">
            <option value="">Choose…</option>
            {meta.problems.map((p) => (
              <option key={p.reference} value={p.reference}>
                {p.reference} — {p.title}{p.published ? '' : ' (draft)'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="m-tech" className="label" style={{ color: 'var(--color-faint)' }}>TECHNOLOGY</label>
          <select id="m-tech" value={technologyRef} onChange={(e) => setTechnologyRef(e.target.value)}
                  className="field-input mt-2 py-2 text-[0.875rem]">
            <option value="">Choose…</option>
            {meta.technologies.map((t) => (
              <option key={t.reference} value={t.reference}>
                {t.reference} — {t.name}{t.published ? '' : ' (draft)'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            disabled={!problemRef || !technologyRef || busy === 'new'}
            onClick={() => act('new', async () => {
              await api.createMatchProfile({ problemRef, technologyRef })
              setProblemRef(''); setTechnologyRef('')
            })}
            className="tap label px-4 py-2.5 transition-colors duration-250 disabled:opacity-50"
            style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
          >
            LINK
          </button>
        </div>
      </div>

      {meta.items.length === 0 ? (
        <Empty>No public matches yet.</Empty>
      ) : (
        <ul className="grid gap-3">
          {meta.items.map((m) => {
            const blocked = [
              m.problemPublished ? null : 'the challenge is a draft',
              m.technologyPublished ? null : 'the technology is a draft',
              m.sourceMatchRef && m.sourceDecision !== 'Approved for Industry Discussion'
                ? `the engine match is at "${m.sourceDecision ?? 'Pending'}"`
                : null,
            ].filter(Boolean) as string[]

            return (
              <li key={m.reference} className="p-4" style={{ border: '1px solid var(--rule)' }}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <span className="ident" style={{ color: 'var(--color-accent)' }}>{m.reference}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="quiet">{m.matchClass.toUpperCase()}</Chip>
                    <Chip tone="quiet">{m.status.toUpperCase()}</Chip>
                    <Chip tone={m.published ? 'active' : 'quiet'}>{m.published ? 'PUBLISHED' : 'DRAFT'}</Chip>
                    <Chip tone={m.recordType === 'demo' ? 'quiet' : 'neutral'}>
                      {m.recordType === 'demo' ? 'ILLUSTRATIVE' : 'LIVE'}
                    </Chip>
                    <span className="label" style={{ color: 'var(--color-faint)' }}>{shortDate(m.updatedAt)}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-[0.9375rem] sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <span>
                    <span className="ident mr-2" style={{ color: 'var(--color-muted)' }}>{m.problemRef}</span>
                    {m.problemTitle ?? '—'}
                  </span>
                  <span aria-hidden="true" className="label" style={{ color: 'var(--color-accent)' }}>↕</span>
                  <span>
                    <span className="ident mr-2" style={{ color: 'var(--color-muted)' }}>{m.technologyRef}</span>
                    {m.technologyName ?? '—'}
                  </span>
                </div>

                {m.sourceMatchRef && (
                  <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>
                    FROM ENGINE MATCH {m.sourceMatchRef} · {(m.sourceDecision ?? 'PENDING').toUpperCase()}
                  </p>
                )}

                {/* Why this cannot go out, before anyone presses the button. */}
                {!m.published && blocked.length > 0 && (
                  <p className="label mt-3" style={{ color: 'var(--color-accent-deep)' }}>
                    CANNOT PUBLISH — {blocked.join('; ').toUpperCase()}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
                  <button type="button" onClick={() => (editing === m.reference ? setEditing(null) : open(m))}
                          className="tap label px-2.5 py-1"
                          style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                    {editing === m.reference ? 'CLOSE' : 'EDIT'}
                  </button>
                  <button type="button" disabled={busy === m.reference}
                          onClick={() => act(m.reference, () => api.setRecordType('match', m.reference, m.recordType === 'demo' ? 'live' : 'demo'))}
                          className="tap label px-2.5 py-1 disabled:opacity-50"
                          style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                    MARK {m.recordType === 'demo' ? 'LIVE' : 'DEMO'}
                  </button>
                  <button type="button" disabled={busy === m.reference || (!m.published && blocked.length > 0)}
                          onClick={() => act(m.reference, () => api.publishMatchProfile(m.reference, !m.published))}
                          className="tap label px-2.5 py-1 disabled:opacity-40"
                          style={{
                            border: `1px solid ${m.published ? 'var(--rule-strong)' : 'var(--color-accent)'}`,
                            color: m.published ? 'var(--color-muted)' : 'var(--color-accent)',
                          }}>
                    {m.published ? 'UNPUBLISH' : 'PUBLISH'}
                  </button>
                  {m.published && (
                    <a href={`/matches/${m.slug}`} target="_blank" rel="noopener noreferrer"
                       className="tap label px-2.5 py-1"
                       style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                      VIEW ↗
                    </a>
                  )}
                </div>

                {editing === m.reference && (
                  <div className="mt-5 grid gap-4 pt-4 sm:grid-cols-2" style={{ borderTop: '1px solid var(--rule)' }}>
                    <div>
                      <label htmlFor="m-class" className="label" style={{ color: 'var(--color-faint)' }}>MATCH CLASS</label>
                      <select id="m-class" value={draft.matchClass} onChange={(e) => setDraft({ ...draft, matchClass: e.target.value })}
                              className="field-input mt-1.5 py-2 text-[0.9375rem]">
                        {meta.classes.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="m-status" className="label" style={{ color: 'var(--color-faint)' }}>STATUS</label>
                      <select id="m-status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                              className="field-input mt-1.5 py-2 text-[0.9375rem]">
                        {meta.statuses.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="m-rationale" className="label" style={{ color: 'var(--color-faint)' }}>WHY THEY MATCH</label>
                      <textarea id="m-rationale" rows={4} value={draft.rationale}
                                onChange={(e) => setDraft({ ...draft, rationale: e.target.value })}
                                className="field-input mt-1.5 py-2 text-[0.9375rem]" />
                    </div>

                    {/* Fit is a fixed grid, not free text: the public legend
                        explains these five words and the filters see them. */}
                    <div className="sm:col-span-2">
                      <p className="label" style={{ color: 'var(--color-faint)' }}>FIT</p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-4">
                        {meta.dimensions.map((d) => (
                          <div key={d}>
                            <label htmlFor={`fit-${d}`} className="label" style={{ color: RATING_TONE[draft.fit[d]] ?? 'var(--color-faint)' }}>
                              {d.toUpperCase()}
                            </label>
                            <select id={`fit-${d}`} value={draft.fit[d] ?? ''}
                                    onChange={(e) => setDraft({ ...draft, fit: { ...draft.fit, [d]: e.target.value } })}
                                    className="field-input mt-1.5 py-2 text-[0.875rem]">
                              <option value="">—</option>
                              {meta.ratings.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="m-dev" className="label" style={{ color: 'var(--color-faint)' }}>DEVELOPMENT REQUIRED</label>
                      <select id="m-dev" value={draft.developmentRequired}
                              onChange={(e) => setDraft({ ...draft, developmentRequired: e.target.value })}
                              className="field-input mt-1.5 py-2 text-[0.9375rem]">
                        {meta.developmentLevels.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="m-next" className="label" style={{ color: 'var(--color-faint)' }}>NEXT STEP</label>
                      <input id="m-next" value={draft.nextStep}
                             onChange={(e) => setDraft({ ...draft, nextStep: e.target.value })}
                             className="field-input mt-1.5 py-2 text-[0.9375rem]" />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="m-open" className="label" style={{ color: 'var(--color-faint)' }}>
                        STILL OPEN — ONE PER LINE
                      </label>
                      <textarea id="m-open" rows={4} value={draft.openQuestions}
                                onChange={(e) => setDraft({ ...draft, openQuestions: e.target.value })}
                                className="field-input mt-1.5 py-2 text-[0.9375rem]" />
                    </div>

                    <div className="flex items-end gap-3 sm:col-span-2">
                      <button type="button" onClick={save} disabled={busy === m.reference}
                              className="tap label px-4 py-2.5 disabled:opacity-50"
                              style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                        SAVE
                      </button>
                      <p className="label" style={{ color: 'var(--color-faint)' }}>SAVING DOES NOT PUBLISH</p>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
