import { audit } from './audit'
import type { AuthContext } from './auth'

/**
 * The industry opportunity pipeline.
 *
 * The eleven stages describe the whole journey from a challenge arriving to
 * royalties being monitored. The first five happen to a challenge and its
 * candidate matches, and are already tracked there; an opportunity record
 * begins at `Match Approved`, because that is the first moment there is a
 * named technology and a counterparty conversation to manage.
 *
 * The board still shows the earlier stages, counted from live challenge and
 * match state, so the funnel is honest rather than starting halfway through.
 */
export const PIPELINE_STAGES = [
  'Challenge Received',
  'Under Review',
  'Candidate Technologies Identified',
  'Technical Evaluation',
  'Match Approved',
  'Industry Presentation',
  'Technical Discussion',
  'Pilot / Validation',
  'Commercial Negotiation',
  'Technology Transfer',
  'Post-Transfer Royalty Monitoring',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

/** Stages an opportunity record owns. Everything before is derived. */
export const OPPORTUNITY_STAGES = PIPELINE_STAGES.slice(4)

/** A closed opportunity leaves the funnel without pretending to have advanced. */
export const CLOSED_STAGE = 'Closed'

export async function nextOpportunityReference(db: D1Database, year: number) {
  const row = await db
    .prepare(
      `INSERT INTO counters (name, value) VALUES (?, 1)
       ON CONFLICT(name) DO UPDATE SET value = value + 1
       RETURNING value`,
    )
    .bind(`OPP:${year}`)
    .first<{ value: number }>()
  return `OPP-${year}-${String(row?.value ?? 1).padStart(4, '0')}`
}

/**
 * Opens an opportunity for an approved match.
 *
 * Idempotent: approving the same match twice does not create a second
 * opportunity, and re-approving one that was closed does not silently reopen it
 * at the wrong stage.
 */
export async function openFromMatch(
  ctx: AuthContext,
  matchRef: string,
  ip: string,
): Promise<string | null> {
  const match = await ctx.db
    .prepare('SELECT challenge_ref, technology_ref FROM matches WHERE reference = ?')
    .bind(matchRef)
    .first<{ challenge_ref: string; technology_ref: string }>()
  if (!match) return null

  const existing = await ctx.db
    .prepare('SELECT reference FROM opportunities WHERE challenge_ref = ? AND technology_ref = ?')
    .bind(match.challenge_ref, match.technology_ref)
    .first<{ reference: string }>()
  if (existing) return existing.reference

  const now = new Date().toISOString()
  const reference = await nextOpportunityReference(ctx.db, new Date().getUTCFullYear())

  await ctx.db
    .prepare(
      `INSERT INTO opportunities
         (reference, created_at, updated_at, challenge_ref, technology_ref, match_ref, stage)
       VALUES (?, ?, ?, ?, ?, ?, 'Match Approved')`,
    )
    .bind(reference, now, now, match.challenge_ref, match.technology_ref, matchRef)
    .run()

  await audit(ctx.db, ctx.actor, 'opportunity.open', reference, { match: matchRef }, ip)
  return reference
}

/**
 * Counts for the stages that precede an opportunity record.
 *
 * Derived from live state rather than stored, so the funnel cannot drift out of
 * step with the challenges and matches it is describing.
 */
export async function derivedFunnel(db: D1Database) {
  const [received, underReview, candidates, evaluating] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM challenges WHERE status = 'Received'").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM challenges WHERE status = 'Under Review'").first<{ n: number }>(),
    db.prepare(
      `SELECT COUNT(DISTINCT challenge_ref) AS n FROM matches
       WHERE decision IN ('Pending', 'Hold', 'Information Requested')`,
    ).first<{ n: number }>(),
    db.prepare("SELECT COUNT(DISTINCT challenge_ref) AS n FROM matches WHERE decision = 'Technical Review'")
      .first<{ n: number }>(),
  ])
  return {
    'Challenge Received': received?.n ?? 0,
    'Under Review': underReview?.n ?? 0,
    'Candidate Technologies Identified': candidates?.n ?? 0,
    'Technical Evaluation': evaluating?.n ?? 0,
  } as Record<string, number>
}
