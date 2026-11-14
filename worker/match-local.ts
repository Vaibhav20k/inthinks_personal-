import { prefilter } from './match-rules'
import type { ChallengeRecord, Prefilter, TechnologyRecord } from './match-rules'
import { assertNoIdentity } from './match-engine'
import type { CandidateAnalysis } from './match-engine'

/**
 * Phase 9 — matching without Claude.
 *
 * Three layers, all explainable:
 *  1. Rules (match-rules.ts): exclusions, sector, readiness, shared words.
 *  2. Meaning: Cloudflare Workers AI embeddings on the same account that holds
 *     the records. Optional — without the binding, or once the free daily
 *     allowance is spent, the engine runs on rules alone and says so.
 *  3. Figures: verified step-6 qualification values compared unit for unit.
 *
 * The output fills the same columns the Claude engine did, so review,
 * decisions and promotion are unchanged. Every label comes from a fixed
 * threshold below — never a percentage, never generated prose.
 */

export const EMBEDDING_MODEL = '@cf/baai/bge-m3'

/** Cosine thresholds for bge-m3. Starting values; tune on real reviewed pairs. */
export const SIMILARITY = { strong: 0.7, moderate: 0.55 }

/** Suggestions written per run (the brief asks for three). */
export const TOP_N = 3

export interface AiBinding { run(model: string, input: unknown): Promise<unknown> }

export interface Figure {
  reference: string
  category: string
  label: string
  comparator: string | null
  value: number | null
  valueMax: number | null
  unit: string | null
  verification: string
}

const VERIFIED = new Set(['document_checked', 'independently_verified'])

export const challengeText = (c: ChallengeRecord) =>
  [c.title, c.statement, c.success, c.performance, c.constraints].filter(Boolean).join('\n').slice(0, 4000)
export const technologyText = (t: TechnologyRecord) =>
  [t.title, t.summary, t.problem, t.principle, t.applications].filter(Boolean).join('\n').slice(0, 4000)

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2 }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

type Item = { reference: string; kind: 'challenge' | 'technology'; text: string }

/**
 * Returns a vector per reference, embedding only records whose text changed.
 * Any Workers AI failure (allowance spent, outage) returns null: the caller
 * then runs on rules alone rather than failing the request.
 */
export async function embeddings(db: D1Database, ai: AiBinding | undefined, items: Item[]) {
  if (!ai || items.length === 0) return null
  const hashes = await Promise.all(items.map((i) => sha256(`${EMBEDDING_MODEL}\n${i.text}`)))
  const stored = new Map<string, { hash: string; vector: number[] }>()
  for (let i = 0; i < items.length; i += 50) {
    const slice = items.slice(i, i + 50)
    const rows = await db.prepare(`SELECT reference, kind, text_hash, vector FROM match_embeddings
        WHERE ${slice.map(() => '(reference=? AND kind=?)').join(' OR ')}`)
      .bind(...slice.flatMap((x) => [x.reference, x.kind])).all<Record<string, string>>()
    for (const r of rows.results) stored.set(`${r.kind}:${r.reference}`, { hash: r.text_hash, vector: JSON.parse(r.vector) })
  }
  const result = new Map<string, number[]>()
  const missing: number[] = []
  let withheld = 0
  items.forEach((item, i) => {
    const hit = stored.get(`${item.kind}:${item.reference}`)
    if (hit && hit.hash === hashes[i]) { result.set(`${item.kind}:${item.reference}`, hit.vector); return }
    // Text carrying an email, phone or profile link is never sent. That one
    // record is compared on rules only; the rest of the run is unaffected.
    try { assertNoIdentity(item.text) } catch { withheld++; return }
    missing.push(i)
  })
  if (withheld) console.warn(JSON.stringify({ event: 'inthinks.match', withheld, reason: 'identity in text' }))
  try {
    for (let i = 0; i < missing.length; i += 50) {
      const batch = missing.slice(i, i + 50)
      const texts = batch.map((n) => items[n].text)
      const out = await ai.run(EMBEDDING_MODEL, { text: texts }) as { data?: number[][] }
      if (!Array.isArray(out?.data) || out.data.length !== batch.length) return null
      const now = new Date().toISOString()
      await db.batch(batch.map((n, k) => {
        const vector = out.data![k]
        result.set(`${items[n].kind}:${items[n].reference}`, vector)
        return db.prepare(`INSERT INTO match_embeddings (reference, kind, model, text_hash, vector, updated_at)
            VALUES (?,?,?,?,?,?) ON CONFLICT(reference, kind) DO UPDATE SET
            model=excluded.model, text_hash=excluded.text_hash, vector=excluded.vector, updated_at=excluded.updated_at`)
          .bind(items[n].reference, items[n].kind, EMBEDDING_MODEL, hashes[n], JSON.stringify(vector), now)
      }))
    }
  } catch (cause) {
    console.warn(JSON.stringify({ event: 'inthinks.match', fallback: 'rules-only', reason: cause instanceof Error ? cause.message.slice(0, 120) : 'unknown' }))
    return null
  }
  return result
}

export async function loadFigures(db: D1Database, references: string[]) {
  const map = new Map<string, Figure[]>()
  for (let i = 0; i < references.length; i += 80) {
    const slice = references.slice(i, i + 80)
    if (!slice.length) continue
    const rows = await db.prepare(`SELECT reference, category, label, comparator, value, value_max, unit, verification
        FROM qualification_items WHERE retired_at IS NULL AND verification != 'disputed'
        AND reference IN (${slice.map(() => '?').join(',')})`).bind(...slice).all<Record<string, unknown>>()
    for (const r of rows.results) {
      const f: Figure = {
        reference: String(r.reference), category: String(r.category), label: String(r.label),
        comparator: r.comparator == null ? null : String(r.comparator),
        value: r.value == null ? null : Number(r.value), valueMax: r.value_max == null ? null : Number(r.value_max),
        unit: r.unit == null ? null : String(r.unit), verification: String(r.verification),
      }
      map.set(f.reference, [...(map.get(f.reference) ?? []), f])
    }
  }
  return map
}

function satisfies(requirement: Figure, value: number) {
  const target = requirement.value!
  switch (requirement.comparator) {
    case 'lt': return value < target
    case 'lte': return value <= target
    case 'gt': return value > target
    case 'gte': return value >= target
    case 'between': return value >= target && value <= (requirement.valueMax ?? target)
    default: return Math.abs(value - target) <= Math.abs(target) * 0.01
  }
}

/** Compares the challenge's limits and targets with the technology's measurements, same unit only. */
export function compareFigures(required: Figure[], offered: Figure[]) {
  const needs = required.filter((f) => (f.category === 'constraint' || f.category === 'success_criterion') && f.unit && f.value != null)
  const facts = offered.filter((f) => f.category === 'measurement' && f.unit && f.value != null)
  const met: string[] = [], conflicts: string[] = [], missing: string[] = []
  let unverified = 0
  for (const need of needs) {
    const same = facts.filter((f) => f.unit === need.unit)
    if (!same.length) { missing.push(`No technology figure in ${need.unit} for "${need.label}"`); continue }
    const fact = same.find((f) => VERIFIED.has(f.verification)) ?? same[0]
    const verified = VERIFIED.has(fact.verification)
    if (!verified) unverified++
    const line = `"${need.label}": technology states ${fact.value} ${fact.unit} (${verified ? 'verified' : 'not yet verified'})`
    if (satisfies(need, fact.value!)) met.push(`Meets ${line}`)
    else conflicts.push(`Misses ${line}`)
  }
  const fit: CandidateAnalysis['constraintFit'] = conflicts.length ? 'Limited'
    : !met.length ? 'Unknown' : unverified || missing.length ? 'Moderate' : 'Strong'
  return { fit, met, conflicts, missing }
}

const POINTS = { Strong: 2, Moderate: 1, Limited: 0, Unknown: 0 } as const

export interface Scored { analysis: CandidateAnalysis; rank: number }

/** Builds one analysis from rules, meaning similarity (or null) and figures. */
export function assess(challenge: ChallengeRecord, candidate: Prefilter, similarity: number | null,
  figures: ReturnType<typeof compareFigures>): Scored {
  const t = candidate.technology
  const sectorHit = t.industries.some((s) => s.toLowerCase() === challenge.sector.toLowerCase())
  const lexical = candidate.signals.includes('Shared technical vocabulary with the challenge')

  const mechanismFit: CandidateAnalysis['mechanismFit'] = similarity == null
    ? (lexical ? 'Moderate' : 'Limited')
    : similarity >= SIMILARITY.strong ? 'Strong' : similarity >= SIMILARITY.moderate ? 'Moderate' : 'Limited'
  const applicationFit: CandidateAnalysis['applicationFit'] = sectorHit && mechanismFit !== 'Limited' ? 'Strong'
    : sectorHit || mechanismFit === 'Strong' ? 'Moderate' : 'Limited'

  const floor = /7\D*9/.test(challenge.desiredTrl) ? 7 : /4\D*6/.test(challenge.desiredTrl) ? 4
    : Number(challenge.desiredTrl.match(/\d/)?.[0]) || null
  const gap = floor == null ? null : Math.max(0, floor - t.currentTrl)
  const trlFit: CandidateAnalysis['trlFit'] = gap == null ? 'Unknown' : gap === 0 ? 'Strong' : gap <= 2 ? 'Moderate' : 'Limited'
  const developmentEffort: CandidateAnalysis['developmentEffort'] = gap == null ? 'Unknown' : gap === 0 ? 'Low' : gap <= 2 ? 'Moderate' : 'Substantial'

  const total = POINTS[mechanismFit] + POINTS[applicationFit] + POINTS[trlFit] + POINTS[figures.fit]
  let classification: CandidateAnalysis['classification'] =
    mechanismFit === 'Strong' && total >= 6 ? 'Strong Match'
      : total >= 4 && mechanismFit !== 'Limited' ? 'Promising Match'
        : total >= 2 && (mechanismFit !== 'Limited' || applicationFit !== 'Limited') ? 'Adjacent Opportunity' : 'Weak Match'
  if (figures.conflicts.length && (classification === 'Strong Match' || classification === 'Promising Match')) classification = 'Adjacent Opportunity'

  const why = [...candidate.signals]
  if (similarity != null) why.push(`Meaning similarity ${mechanismFit.toLowerCase()} (${similarity.toFixed(2)} on the ${EMBEDDING_MODEL} scale)`)
  why.push(...figures.met)
  const missingEvidence = [...figures.missing]
  if (similarity == null) missingEvidence.push('Meaning-based comparison unavailable on this run; mechanism judged from shared words only.')
  if (gap == null) missingEvidence.push('The challenge does not state a required readiness level.')
  missingEvidence.push('IP ownership and freedom to operate are not assessed automatically.')
  const requiredDevelopment = gap ? [`Raise readiness from TRL ${t.currentTrl} to TRL ${floor} for this application.`] : []

  const internalRecommendation: CandidateAnalysis['internalRecommendation'] = figures.conflicts.length ? 'Request More Information'
    : classification === 'Strong Match' || classification === 'Promising Match' ? 'Technical Review'
      : classification === 'Adjacent Opportunity' ? 'Hold' : 'Reject'

  const analysis: CandidateAnalysis = {
    technologyReference: t.reference, classification, mechanismFit, applicationFit, trlFit,
    constraintFit: figures.fit, ipAvailability: 'Unknown', developmentEffort, ipRisk: 'Unknown',
    estimatedTrlGap: Math.min(8, gap ?? 0),
    challengeSummary: `${challenge.title} (${challenge.sector || 'sector not stated'})`,
    technologySummary: `${t.title} — TRL ${t.currentTrl}${t.category ? `, ${t.category}` : ''}`,
    whyTheyMatch: why, technicalConflicts: figures.conflicts, missingEvidence, requiredDevelopment,
    commercialPotential: 'Not assessed automatically; see the case figures and the admin assessment.',
    internalRecommendation,
  }
  const rank = similarity == null ? candidate.affinity : 0.6 * similarity + 0.4 * candidate.affinity
  return { analysis, rank: rank - (figures.conflicts.length ? 0.1 : 0) }
}

export interface LocalRun { pairs: { challenge: ChallengeRecord; analysis: CandidateAnalysis }[]; engine: string; considered: number }

const engineName = (semantic: boolean) => semantic ? `rules+figures+${EMBEDDING_MODEL}` : 'rules+figures'

/** Problem → its best technologies. */
export async function matchChallenge(db: D1Database, ai: AiBinding | undefined, challenge: ChallengeRecord, technologies: TechnologyRecord[]): Promise<LocalRun> {
  const candidates = prefilter(challenge, technologies)
  const vectors = await embeddings(db, ai, [
    { reference: challenge.reference, kind: 'challenge', text: challengeText(challenge) },
    ...candidates.map((c) => ({ reference: c.technology.reference, kind: 'technology' as const, text: technologyText(c.technology) })),
  ])
  const figures = await loadFigures(db, [challenge.reference, ...candidates.map((c) => c.technology.reference)])
  const own = vectors?.get(`challenge:${challenge.reference}`)
  const scored = candidates.map((c) => {
    const other = vectors?.get(`technology:${c.technology.reference}`)
    return assess(challenge, c, own && other ? cosine(own, other) : null,
      compareFigures(figures.get(challenge.reference) ?? [], figures.get(c.technology.reference) ?? []))
  }).sort((a, b) => b.rank - a.rank).slice(0, TOP_N)
  return { pairs: scored.map((s) => ({ challenge, analysis: s.analysis })), engine: engineName(Boolean(own)), considered: technologies.length }
}

/** Reverse: technology → the problems it could answer. */
export async function matchTechnology(db: D1Database, ai: AiBinding | undefined, technology: TechnologyRecord, challenges: ChallengeRecord[]): Promise<LocalRun> {
  const candidates = challenges.flatMap((challenge) => prefilter(challenge, [technology]).map((p) => ({ challenge, p })))
  const vectors = await embeddings(db, ai, [
    { reference: technology.reference, kind: 'technology', text: technologyText(technology) },
    ...candidates.map(({ challenge }) => ({ reference: challenge.reference, kind: 'challenge' as const, text: challengeText(challenge) })),
  ])
  const figures = await loadFigures(db, [technology.reference, ...candidates.map((c) => c.challenge.reference)])
  const own = vectors?.get(`technology:${technology.reference}`)
  const scored = candidates.map(({ challenge, p }) => {
    const other = vectors?.get(`challenge:${challenge.reference}`)
    return { challenge, ...assess(challenge, p, own && other ? cosine(own, other) : null,
      compareFigures(figures.get(challenge.reference) ?? [], figures.get(technology.reference) ?? [])) }
  }).sort((a, b) => b.rank - a.rank).slice(0, TOP_N)
  return { pairs: scored.map((s) => ({ challenge: s.challenge, analysis: s.analysis })), engine: engineName(Boolean(own)), considered: challenges.length }
}
