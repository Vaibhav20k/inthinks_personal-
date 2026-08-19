import { runMatchEngine } from './match-engine'
import type { ChallengeRecord, TechnologyRecord } from './match-rules'
import type { AuthContext } from './auth'
import { audit } from './audit'
import type { Env } from './types'

/**
 * Match persistence and the human-in-the-loop gate.
 *
 * The rule the brief states as "AI recommends. InThinks decides." is enforced
 * here rather than in the UI: a generated match is always written with
 * decision = 'Pending', and only `decide()` can move it — which requires an
 * authenticated actor with the capability.
 */

export const MATCH_DECISIONS = [
  'Pending',
  'Rejected',
  'Hold',
  'Information Requested',
  'Technical Review',
  'Approved for Industry Discussion',
] as const

export type MatchDecision = (typeof MATCH_DECISIONS)[number]

/** The one decision that lets a match leave InThinks. Never automatic. */
export const RELEASING_DECISION: MatchDecision = 'Approved for Industry Discussion'

const one = (v: unknown) => (Array.isArray(v) ? String(v[0] ?? '') : typeof v === 'string' ? v : '')
const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : [])

const parse = (raw: unknown): Record<string, unknown> => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export async function loadChallenge(db: D1Database, reference: string): Promise<ChallengeRecord | null> {
  const row = await db
    .prepare('SELECT reference, title, sector, payload FROM challenges WHERE reference = ?')
    .bind(reference)
    .first<Record<string, unknown>>()
  if (!row) return null
  const p = parse(row.payload)
  return {
    reference: String(row.reference),
    title: String(row.title),
    sector: String(row.sector),
    statement: one(p.statement),
    currentSolution: one(p.currentSolution),
    success: one(p.success),
    performance: one(p.performance),
    constraints: one(p.constraints),
    impacts: list(p.impacts),
    desiredTrl: one(p.desiredTrl),
  }
}

/**
 * Builds technology records for the engine.
 *
 * The SELECT names technical columns only. Innovator name, email and
 * institution are never read here, so identity cannot reach the engine even if
 * a later change forgets to filter it downstream.
 */
export async function loadTechnologies(db: D1Database): Promise<TechnologyRecord[]> {
  const rows = await db
    .prepare(
      `SELECT reference, title, category, entry_trl, current_trl, target_trl,
              status, acquisition_stage, payload
       FROM innovations
       WHERE status != 'Archived'`,
    )
    .all<Record<string, unknown>>()

  return rows.results.map((row) => {
    const p = parse(row.payload)
    return {
      reference: String(row.reference),
      title: String(row.title),
      category: String(row.category),
      entryTrl: Number(row.entry_trl) || 1,
      currentTrl: Number(row.current_trl ?? row.entry_trl) || 1,
      targetTrl: Number(row.target_trl ?? 9) || 9,
      status: String(row.status),
      acquisitionStage: String(row.acquisition_stage),
      summary: one(p.summary) || one(p.technical),
      problem: one(p.problem),
      principle: one(p.principle),
      applications: one(p.applications),
      industries: list(p.industries),
    }
  })
}

async function nextMatchReference(db: D1Database, year: number) {
  const row = await db
    .prepare(
      `INSERT INTO counters (name, value) VALUES (?, 1)
       ON CONFLICT(name) DO UPDATE SET value = value + 1
       RETURNING value`,
    )
    .bind(`M:${year}`)
    .first<{ value: number }>()
  return `M-${year}-${String(row?.value ?? 1).padStart(4, '0')}`
}

export async function generateMatches(env: Env, ctx: AuthContext, challengeRef: string, ip: string) {
  if (!env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error('The match engine is not configured on this deployment.'), { status: 503 })
  }

  const challenge = await loadChallenge(ctx.db, challengeRef)
  if (!challenge) throw Object.assign(new Error('Challenge not found'), { status: 404 })

  const technologies = await loadTechnologies(ctx.db)
  if (technologies.length === 0) {
    return { created: 0, considered: 0, shortlisted: 0, engine: 'rules-only' }
  }

  const result = await runMatchEngine(challenge, technologies, {
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.MATCH_MODEL,
  })

  const year = new Date().getUTCFullYear()
  let created = 0

  for (const analysis of result.analyses) {
    const reference = await nextMatchReference(ctx.db, year)
    // Regenerating replaces the analysis but never the decision — a reviewer's
    // call is not overwritten by a later run.
    await ctx.db
      .prepare(
        `INSERT INTO matches (
           reference, created_at, challenge_ref, technology_ref, classification,
           mechanism_fit, application_fit, trl_fit, constraint_fit,
           ip_availability, development_effort, trl_gap, ip_risk, analysis, engine
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(challenge_ref, technology_ref) DO UPDATE SET
           created_at = excluded.created_at,
           classification = excluded.classification,
           mechanism_fit = excluded.mechanism_fit,
           application_fit = excluded.application_fit,
           trl_fit = excluded.trl_fit,
           constraint_fit = excluded.constraint_fit,
           ip_availability = excluded.ip_availability,
           development_effort = excluded.development_effort,
           trl_gap = excluded.trl_gap,
           ip_risk = excluded.ip_risk,
           analysis = excluded.analysis,
           engine = excluded.engine`,
      )
      .bind(
        reference,
        new Date().toISOString(),
        challenge.reference,
        analysis.technologyReference,
        analysis.classification,
        analysis.mechanismFit,
        analysis.applicationFit,
        analysis.trlFit,
        analysis.constraintFit,
        analysis.ipAvailability,
        analysis.developmentEffort,
        analysis.estimatedTrlGap,
        analysis.ipRisk,
        JSON.stringify({
          challengeSummary: analysis.challengeSummary,
          technologySummary: analysis.technologySummary,
          whyTheyMatch: analysis.whyTheyMatch,
          technicalConflicts: analysis.technicalConflicts,
          missingEvidence: analysis.missingEvidence,
          requiredDevelopment: analysis.requiredDevelopment,
          commercialPotential: analysis.commercialPotential,
          internalRecommendation: analysis.internalRecommendation,
        }),
        result.engine,
      )
      .run()
    created++
  }

  await audit(ctx.db, ctx.actor, 'match.generate', challengeRef, {
    considered: result.considered,
    shortlisted: result.shortlisted,
    produced: created,
    engine: result.engine,
  }, ip)

  return { created, considered: result.considered, shortlisted: result.shortlisted, engine: result.engine }
}

export async function decide(
  ctx: AuthContext,
  reference: string,
  decision: MatchDecision,
  note: string,
  ip: string,
) {
  await ctx.db
    .prepare(
      `UPDATE matches SET decision = ?, decided_by = ?, decided_at = ?, decision_note = ?
       WHERE reference = ?`,
    )
    .bind(decision, ctx.actor.email, new Date().toISOString(), note, reference)
    .run()

  // Releasing a match to an industry counterparty is the consequential action
  // in the whole system, so it is recorded distinctly from an ordinary update.
  await audit(
    ctx.db,
    ctx.actor,
    decision === RELEASING_DECISION ? 'match.approve_for_industry' : 'match.decide',
    reference,
    { decision },
    ip,
  )
}
