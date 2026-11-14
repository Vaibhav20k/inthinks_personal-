import { runMatchEngine } from './match-engine'
import type { CandidateAnalysis } from './match-engine'
import { matchChallenge, matchTechnology } from './match-local'
import type { ChallengeRecord, TechnologyRecord } from './match-rules'
import type { AuthContext } from './auth'
import { audit } from './audit'
import { openFromMatch } from './opportunities'
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

/**
 * The challenge the engine reasons about.
 *
 * Two sources, because there are two kinds of challenge. A submitted one lives
 * on `challenges` and the engine reads its confidential payload — that is
 * fine, the analysis stays internal. An InThinks-authored one exists only as a
 * public profile, and running matching against it was impossible until this
 * looked in both places: the illustrative set and anything InThinks structures
 * itself were invisible to the engine.
 */
export async function loadChallenge(db: D1Database, reference: string): Promise<ChallengeRecord | null> {
  const row = await db
    .prepare('SELECT reference, title, sector, payload FROM challenges WHERE reference = ?')
    .bind(reference)
    .first<Record<string, unknown>>()
  if (row) {
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

  const profile = await db
    .prepare(
      `SELECT reference, title, sector, problem, current_approach, target_outcome,
              target, constraints, impact, minimum_trl
         FROM challenge_profiles WHERE reference = ?`,
    )
    .bind(reference)
    .first<Record<string, unknown>>()
  if (!profile) return null

  const arr = (v: unknown): string[] => {
    try {
      const parsed = JSON.parse(String(v ?? '[]'))
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
    } catch { return [] }
  }
  return {
    reference: String(profile.reference),
    title: String(profile.title),
    sector: String(profile.sector ?? ''),
    statement: String(profile.problem ?? ''),
    currentSolution: String(profile.current_approach ?? ''),
    success: String(profile.target_outcome ?? ''),
    performance: String(profile.target ?? ''),
    constraints: arr(profile.constraints).join('; '),
    impacts: arr(profile.impact),
    desiredTrl: `TRL ${Number(profile.minimum_trl ?? 4)}`,
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

  const submitted = rows.results.map((row) => {
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

  /**
   * Technologies InThinks wrote up itself.
   *
   * They have no innovation row, so the query above cannot see them — which
   * meant an authored technology could never be a candidate for anything, and
   * the whole illustrative set was invisible to matching.
   *
   * `acquisitionStage` is empty rather than invented: it is a soft affinity
   * bonus for being in the active development portfolio, and an authored
   * record has no acquisition to be at a stage of. Claiming one would score it
   * above submissions on a fact that does not exist.
   */
  const authoredRows = await db
    .prepare(
      `SELECT reference, name, thesis, problem, principle, applications, sectors,
              authored_domain_code, authored_entry_trl, authored_current_trl,
              authored_target_trl, published
         FROM technology_profiles
        WHERE origin = 'authored'`,
    )
    .all<Record<string, unknown>>()

  const authored = authoredRows.results.map((row) => {
    const arr = (v: unknown): string[] => {
      try {
        const parsed = JSON.parse(String(v ?? '[]'))
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
      } catch { return [] }
    }
    return {
      reference: String(row.reference),
      title: String(row.name),
      category: String(row.authored_domain_code ?? ''),
      entryTrl: Number(row.authored_entry_trl ?? 1) || 1,
      currentTrl: Number(row.authored_current_trl ?? row.authored_entry_trl ?? 1) || 1,
      targetTrl: Number(row.authored_target_trl ?? 9) || 9,
      status: row.published === 1 ? 'Published' : 'Draft',
      acquisitionStage: '',
      summary: String(row.thesis ?? ''),
      problem: String(row.problem ?? ''),
      principle: String(row.principle ?? ''),
      applications: arr(row.applications).join(', '),
      industries: arr(row.sectors),
    }
  })

  return [...submitted, ...authored]
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

/** Every challenge, submitted and authored, for reverse matching. Capped. */
export async function loadChallenges(db: D1Database, limit = 300): Promise<ChallengeRecord[]> {
  const refs = await db.prepare(`SELECT reference FROM challenges
      UNION SELECT reference FROM challenge_profiles WHERE reference NOT IN (SELECT reference FROM challenges)
      LIMIT ?`).bind(limit).all<{ reference: string }>()
  const out: ChallengeRecord[] = []
  for (const r of refs.results) { const c = await loadChallenge(db, r.reference); if (c) out.push(c) }
  return out
}

/**
 * Which engine runs. Default is phase 9's local engine (rules, figures and
 * Workers AI similarity). The Claude engine stays available only when
 * MATCH_ENGINE=claude and a key are both set; the project runs without it.
 */
const useClaude = (env: Env) => env.MATCH_ENGINE === 'claude' && Boolean(env.ANTHROPIC_API_KEY)

type Pair = { challenge: ChallengeRecord; analysis: CandidateAnalysis }

async function writeAnalyses(ctx: AuthContext, pairs: Pair[], engine: string) {
  const year = new Date().getUTCFullYear()
  let created = 0
  for (const { challenge, analysis } of pairs) {
    const reference = await nextMatchReference(ctx.db, year)
    // Regenerating replaces the analysis but never the decision: a reviewer's
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
        reference, new Date().toISOString(), challenge.reference, analysis.technologyReference,
        analysis.classification, analysis.mechanismFit, analysis.applicationFit, analysis.trlFit,
        analysis.constraintFit, analysis.ipAvailability, analysis.developmentEffort,
        analysis.estimatedTrlGap, analysis.ipRisk,
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
        engine,
      )
      .run()
    created++
  }
  return created
}

export async function generateMatches(env: Env, ctx: AuthContext, challengeRef: string, ip: string) {
  const challenge = await loadChallenge(ctx.db, challengeRef)
  if (!challenge) throw Object.assign(new Error('Challenge not found'), { status: 404 })

  const technologies = await loadTechnologies(ctx.db)
  if (technologies.length === 0) {
    return { created: 0, considered: 0, shortlisted: 0, engine: 'rules+figures' }
  }

  let pairs: Pair[], engine: string, considered: number, shortlisted: number
  if (useClaude(env)) {
    const result = await runMatchEngine(challenge, technologies, { apiKey: env.ANTHROPIC_API_KEY!, model: env.MATCH_MODEL })
    pairs = result.analyses.map((analysis) => ({ challenge, analysis }))
    engine = result.engine; considered = result.considered; shortlisted = result.shortlisted
  } else {
    const run = await matchChallenge(ctx.db, env.AI, challenge, technologies)
    pairs = run.pairs; engine = run.engine; considered = run.considered; shortlisted = pairs.length
  }
  const created = await writeAnalyses(ctx, pairs, engine)

  await audit(ctx.db, ctx.actor, 'match.generate', challengeRef, {
    considered, shortlisted, produced: created, engine,
  }, ip)

  return { created, considered, shortlisted, engine }
}

/** Reverse matching: a technology's best problems, written as ordinary match rows. */
export async function generateTechnologyMatches(env: Env, ctx: AuthContext, technologyRef: string, ip: string) {
  const technology = (await loadTechnologies(ctx.db)).find((t) => t.reference === technologyRef)
  if (!technology) throw Object.assign(new Error('Technology not found'), { status: 404 })
  const run = await matchTechnology(ctx.db, env.AI, technology, await loadChallenges(ctx.db))
  const created = await writeAnalyses(ctx, run.pairs, run.engine)
  await audit(ctx.db, ctx.actor, 'match.generate_reverse', technologyRef, {
    considered: run.considered, produced: created, engine: run.engine,
  }, ip)
  return { created, considered: run.considered, shortlisted: run.pairs.length, engine: run.engine }
}

/**
 * Automatic matching after a submission is saved. Runs in the background
 * (waitUntil) as the system, so the submitter's request never waits on it and
 * a failure never affects the saved record. Results are ordinary Pending
 * suggestions: a person still decides. Set AUTO_MATCH=off to disable.
 */
export const SYSTEM_ACTOR = { email: 'system@inthinks', role: 'super-admin' as const }

export async function autoMatch(env: Env, kind: 'challenge' | 'innovation', reference: string) {
  if (!env.DB || env.AUTO_MATCH === 'off') return null
  const ctx = { db: env.DB, actor: SYSTEM_ACTOR, can: {} } as unknown as AuthContext
  try {
    return kind === 'challenge'
      ? await generateMatches(env, ctx, reference, '')
      : await generateTechnologyMatches(env, ctx, reference, '')
  } catch (cause) {
    console.error(JSON.stringify({ event: 'inthinks.match', auto: kind, error: cause instanceof Error ? cause.message.slice(0, 120) : 'unknown' }))
    return null
  }
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

  // Approval is the moment an opportunity exists: a named technology and a
  // conversation to manage. Opening it here means the pipeline can never be
  // out of step with what was actually approved.
  let opportunity: string | null = null
  if (decision === RELEASING_DECISION) {
    opportunity = await openFromMatch(ctx, reference, ip)
  }

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

  return { opportunity }
}
