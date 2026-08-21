import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from './api'
import { Chip, Empty, Panel, shortDateTime } from './ui'
import type { Me } from './api'

const FIT_TONE: Record<string, 'active' | 'neutral' | 'quiet'> = {
  Strong: 'active', Moderate: 'neutral', Limited: 'quiet', Unknown: 'quiet',
  Low: 'active', Substantial: 'quiet', Medium: 'neutral', High: 'quiet',
}

function Finding({ title, items, tone = 'neutral' }: { title: string; items?: string[]; tone?: 'neutral' | 'warn' }) {
  if (!items || items.length === 0) return null
  return (
    <div className="py-4" style={{ borderTop: '1px solid var(--rule)' }}>
      <h3 className="label" style={{ color: tone === 'warn' ? 'var(--color-accent)' : 'var(--color-faint)' }}>
        {title.toUpperCase()}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-baseline gap-3 text-[0.9375rem] leading-relaxed">
            <span aria-hidden="true" className="mt-[0.5em] h-px w-3 shrink-0" style={{ background: 'var(--rule-strong)' }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The private match room.
 *
 * Challenge on the left, technology on the right, the analysis between them —
 * and no party identity anywhere on the page. The decision bar at the bottom is
 * the only route by which a match reaches an industry counterparty, and
 * approving is separated from the review decisions because it is a commercial
 * act rather than a technical one.
 */
export default function MatchRoom({ me }: { me: Me }) {
  const { reference = '' } = useParams()
  const [data, setData] = useState<api.MatchDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  /** Blank means "leave the engine's reading" rather than "Unknown". */
  const [review, setReview] = useState({
    mechanism: '', application: '', trl: '', constraint: '', classification: '', note: '',
  })

  const load = useCallback(() => {
    api.match(reference).then(setData).catch((e) => setError(e.message))
  }, [reference])

  useEffect(() => { load() }, [load])

  // Seed the controls from an existing review, so opening the page twice does
  // not present a blank form over a review that has already been recorded.
  useEffect(() => {
    if (!data?.review) return
    setReview({
      mechanism: data.review.mechanism ?? '',
      application: data.review.application ?? '',
      trl: data.review.trl ?? '',
      constraint: data.review.constraint ?? '',
      classification: data.review.classification ?? '',
      note: data.review.note ?? '',
    })
  }, [data?.review])

  const saveReview = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.reviewMatch(reference, review)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The review could not be recorded')
    } finally {
      setBusy(false)
    }
  }

  const decide = async (decision: api.MatchDecision) => {
    setBusy(true)
    setError(null)
    try {
      await api.decideMatch(reference, decision, note)
      setNote('')
      load()
    } catch (cause) {
      setError(cause instanceof api.AdminError ? cause.message : 'Could not record the decision.')
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) return <Empty>{error}</Empty>
  if (!data) return <Empty>Loading…</Empty>

  const a = data.analysis
  const reviewDecisions: api.MatchDecision[] = ['Rejected', 'Hold', 'Information Requested', 'Technical Review']

  return (
    <div className="grid gap-6">
      <div>
        <Link to="/admin/matches" className="label" style={{ color: 'var(--color-muted)' }}>← MATCHES</Link>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="ident text-[1.125rem]" style={{ color: 'var(--color-accent)' }}>{data.reference}</span>
          <Chip label="CLASSIFICATION" tone={data.classification === 'Strong Match' ? 'active' : 'neutral'}>
            {data.classification}
          </Chip>
          <Chip label="DECISION" tone={data.decision === 'Approved for Industry Discussion' ? 'active' : 'quiet'}>
            {data.decision}
          </Chip>
        </div>
        <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>
          GENERATED {shortDateTime(data.createdAt)} · ENGINE {data.engine.toUpperCase()}
        </p>
      </div>

      {/* Challenge · analysis · technology */}
      <div className="grid gap-6 xl:grid-cols-[20rem_1fr_20rem]">
        <div className="grid content-start gap-6">
          <Panel title="Industry challenge">
            <p className="ident" style={{ color: 'var(--color-accent)' }}>{data.challenge.reference}</p>
            <h2 className="mt-3 font-display text-[1.125rem] font-medium leading-snug tracking-[-0.02em]">
              {data.challenge.title}
            </h2>
            <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>{data.challenge.sector}</p>
            {data.challenge.confidentiality === 'nda-required' && (
              <div className="mt-4"><Chip tone="active">NDA REQUIRED</Chip></div>
            )}
            {a.challengeSummary && (
              <p className="mt-4 text-[0.875rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {a.challengeSummary}
              </p>
            )}
            <Link to={`/admin/challenges/${data.challenge.reference}`} className="label mt-5 inline-block" style={{ color: 'var(--color-accent)' }}>
              OPEN CHALLENGE →
            </Link>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Engine assessment">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Mechanism fit', data.fits.mechanism],
                ['Application fit', data.fits.application],
                ['TRL fit', data.fits.trl],
                ['Constraint fit', data.fits.constraint],
                ['IP availability', data.fits.ipAvailability],
                ['Development effort', data.fits.developmentEffort],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: '1px solid var(--rule)' }}>
                  <span className="text-[0.875rem]">{label}</span>
                  <Chip tone={FIT_TONE[value] ?? 'neutral'}>{value}</Chip>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Chip label="TRL GAP">{data.trlGap === null ? 'Unknown' : String(data.trlGap)}</Chip>
              <Chip label="IP RISK" tone={data.ipRisk === 'High' ? 'active' : 'neutral'}>{data.ipRisk ?? 'Unknown'}</Chip>
              {a.internalRecommendation && (
                <Chip label="ENGINE SUGGESTS">{a.internalRecommendation}</Chip>
              )}
            </div>
            <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
              CLASSIFICATIONS, NOT SCORES — THE ENGINE DOES NOT PRODUCE A PERCENTAGE
            </p>
          </Panel>

          {/* The half the engine cannot supply. Kept as its own panel beside
              the machine's rather than replacing those values, because where a
              reviewer disagrees with the model is the most useful thing on the
              page — and because what gets promoted to the public match is this
              reading, not the first pass. */}
          <Panel title="InThinks review">
            {data.review ? (
              <p className="label" style={{ color: 'var(--color-accent)' }}>
                REVIEWED BY {data.review.by.toUpperCase()} · {shortDateTime(data.review.at)}
              </p>
            ) : (
              <p className="label" style={{ color: 'var(--color-faint)' }}>
                NOT YET REVIEWED — THE ENGINE&rsquo;S READING STANDS UNTIL IT IS
              </p>
            )}

            {me.can.editReviewState ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {([
                    ['mechanism', 'Mechanism fit', data.fits.mechanism],
                    ['application', 'Application fit', data.fits.application],
                    ['trl', 'TRL fit', data.fits.trl],
                    ['constraint', 'Constraint fit', data.fits.constraint],
                  ] as const).map(([key, label, engine]) => (
                    <div key={key}>
                      <label htmlFor={`rv-${key}`} className="label" style={{ color: 'var(--color-faint)' }}>
                        {label.toUpperCase()}
                      </label>
                      <select
                        id={`rv-${key}`}
                        value={review[key]}
                        onChange={(e) => setReview({ ...review, [key]: e.target.value })}
                        className="field-input mt-1.5 py-2 text-[0.875rem]"
                      >
                        <option value="">— engine says {engine}</option>
                        {data.ratings.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {/* Naming the disagreement rather than leaving two chips
                          for the reader to compare. */}
                      {review[key] && review[key] !== engine && (
                        <p className="label mt-1" style={{ color: 'var(--color-accent)' }}>
                          DIFFERS FROM THE ENGINE
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <label htmlFor="rv-class" className="label" style={{ color: 'var(--color-faint)' }}>
                    CLASSIFICATION
                  </label>
                  <select
                    id="rv-class"
                    value={review.classification}
                    onChange={(e) => setReview({ ...review, classification: e.target.value })}
                    className="field-input mt-1.5 py-2 text-[0.875rem]"
                  >
                    <option value="">— engine says {data.classification}</option>
                    {data.classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <textarea
                  value={review.note}
                  onChange={(e) => setReview({ ...review, note: e.target.value })}
                  rows={3}
                  placeholder="What the assessment found"
                  className="field-input mt-4"
                />

                <button
                  type="button"
                  disabled={busy}
                  onClick={saveReview}
                  className="tap label mt-4 px-4 py-2.5 transition-colors duration-250 disabled:opacity-50"
                  style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
                >
                  RECORD REVIEW
                </button>
              </>
            ) : (
              <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
                A TECHNICAL REVIEW IS RECORDED BY ADMIN AND R&amp;D REVIEWERS
              </p>
            )}

            {data.review?.note && (
              <p className="mt-5 pt-4 text-[0.9375rem] leading-relaxed" style={{ borderTop: '1px solid var(--rule)' }}>
                {data.review.note}
              </p>
            )}
          </Panel>

          <Panel title="Analysis">
            <Finding title="Why they match" items={a.whyTheyMatch} />
            <Finding title="Technical conflicts" items={a.technicalConflicts} tone="warn" />
            <Finding title="Missing evidence" items={a.missingEvidence} tone="warn" />
            <Finding title="Required development" items={a.requiredDevelopment} />
            {a.commercialPotential && (
              <div className="py-4" style={{ borderTop: '1px solid var(--rule)' }}>
                <h3 className="label" style={{ color: 'var(--color-faint)' }}>COMMERCIAL POTENTIAL</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed">{a.commercialPotential}</p>
              </div>
            )}
          </Panel>

          <Panel title="Decision">
            <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              The engine recommends; InThinks decides. Nothing here is sent to the
              industry counterparty, and no identity is exchanged, until a match is
              approved for industry discussion.
            </p>

            {data.decidedBy && (
              <p className="label mt-4" style={{ color: 'var(--color-faint)' }}>
                LAST DECIDED BY {data.decidedBy.toUpperCase()} · {data.decidedAt ? shortDateTime(data.decidedAt) : ''}
              </p>
            )}
            {data.decisionNote && (
              <p className="mt-2 text-[0.9375rem] leading-relaxed">{data.decisionNote}</p>
            )}

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Reason for the decision (recorded against the match)"
              className="field-input mt-5"
            />

            {error && (
              <p role="alert" className="label mt-3 px-3 py-2" style={{ border: '1px solid var(--color-accent-deep)', color: 'var(--color-accent-deep)' }}>
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {reviewDecisions.map((decision) => (
                <button
                  key={decision}
                  type="button"
                  disabled={busy}
                  onClick={() => decide(decision)}
                  className="px-4 py-2.5 text-[0.875rem] transition-colors duration-200 disabled:opacity-50"
                  style={{ border: '1px solid var(--rule-strong)' }}
                >
                  {decision}
                </button>
              ))}
            </div>

            {/* Separated because releasing a match is a commercial act, not a
                technical one — and the server enforces the same boundary. */}
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--rule)' }}>
              {me.can.moveAcquisitionStage ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide('Approved for Industry Discussion')}
                  className="bg-graphite px-5 py-3 text-[0.9375rem] font-medium text-paper transition-colors duration-300 hover:bg-accent disabled:opacity-50"
                >
                  Approve for industry discussion
                </button>
              ) : (
                <p className="label" style={{ color: 'var(--color-faint)' }}>
                  APPROVAL FOR INDUSTRY DISCUSSION IS LIMITED TO ADMIN AND BUSINESS DEVELOPMENT
                </p>
              )}
            </div>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Technology candidate">
            <p className="ident" style={{ color: 'var(--color-accent)' }}>{data.technology.reference}</p>
            <h2 className="mt-3 font-display text-[1.125rem] font-medium leading-snug tracking-[-0.02em]">
              {data.technology.title}
            </h2>
            <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>{data.technology.category}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip label="ENTRY">{String(data.technology.entryTrl ?? '—')}</Chip>
              <Chip label="CURRENT" tone="active">{String(data.technology.currentTrl ?? '—')}</Chip>
              <Chip label="TARGET">{String(data.technology.targetTrl ?? '—')}</Chip>
            </div>
            {a.technologySummary && (
              <p className="mt-4 text-[0.875rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {a.technologySummary}
              </p>
            )}
            <Link to={`/admin/innovations/${data.technology.reference}`} className="label mt-5 inline-block" style={{ color: 'var(--color-accent)' }}>
              OPEN TECHNOLOGY →
            </Link>
            <p className="label mt-5" style={{ color: 'var(--color-faint)' }}>
              NO INNOVATOR OR COMPANY IDENTITY APPEARS IN A MATCH ROOM
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
