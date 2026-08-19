/**
 * Layer 1 — expert rules and structured metadata.
 *
 * Deterministic, explainable, and free. It runs before any model call and does
 * two jobs: exclude technologies that cannot answer the challenge whatever the
 * prose says, and rank the rest so only a shortlist is sent for semantic
 * analysis. Every rule here is a claim a domain expert could argue with, which
 * is the point — the thresholds are meant to be tuned, not hidden inside a
 * model.
 */

export interface TechnologyRecord {
  reference: string
  title: string
  category: string
  entryTrl: number
  currentTrl: number
  targetTrl: number
  status: string
  acquisitionStage: string
  /** Free text drawn from the submission, already stripped of identity. */
  summary: string
  problem: string
  principle: string
  applications: string
  industries: string[]
}

export interface ChallengeRecord {
  reference: string
  title: string
  sector: string
  statement: string
  currentSolution: string
  success: string
  performance: string
  constraints: string
  impacts: string[]
  desiredTrl: string
}

export interface Prefilter {
  technology: TechnologyRecord
  /** 0–1. Ordering only — never shown as a match score. */
  affinity: number
  signals: string[]
  excluded?: string
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'are', 'was',
  'has', 'have', 'not', 'but', 'its', 'our', 'their', 'they', 'which', 'when',
  'where', 'what', 'would', 'could', 'should', 'more', 'less', 'than', 'then',
  'been', 'being', 'over', 'under', 'about', 'also', 'can', 'may', 'use',
  'used', 'using', 'high', 'low', 'new', 'other', 'some', 'any', 'all',
])

const terms = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
  )

/**
 * Jaccard overlap on content words.
 *
 * This is a cheap lexical prior for ordering candidates, not the semantic
 * layer — the brief rules out keyword matching as the mechanism, and the model
 * does the actual reasoning in layer 2. Where a vector index is available it
 * slots in here without changing anything downstream.
 */
function lexicalOverlap(a: string, b: string) {
  const left = terms(a)
  const right = terms(b)
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const term of left) if (right.has(term)) shared++
  return shared / (left.size + right.size - shared)
}

/** Parses the desired-TRL answer into a floor, or null when unstated. */
function desiredTrlFloor(desired: string): number | null {
  if (/7\D*9/.test(desired)) return 7
  if (/4\D*6/.test(desired)) return 4
  return null
}

export function prefilter(
  challenge: ChallengeRecord,
  technologies: TechnologyRecord[],
): Prefilter[] {
  const challengeText = [
    challenge.title, challenge.statement, challenge.success,
    challenge.performance, challenge.constraints,
  ].join(' ')

  const floor = desiredTrlFloor(challenge.desiredTrl)

  return technologies
    .map<Prefilter>((technology) => {
      const signals: string[] = []
      let affinity = 0

      // Hard gate: archived work is not a candidate for anything.
      if (technology.status === 'Archived') {
        return { technology, affinity: 0, signals, excluded: 'Archived' }
      }

      // Sector alignment is the strongest cheap signal available.
      const sectorHit = technology.industries.some(
        (s) => s.toLowerCase() === challenge.sector.toLowerCase(),
      )
      if (sectorHit) {
        affinity += 0.3
        signals.push(`Targets the ${challenge.sector} sector`)
      }

      const technologyText = [
        technology.title, technology.summary, technology.problem,
        technology.principle, technology.applications,
      ].join(' ')

      const overlap = lexicalOverlap(challengeText, technologyText)
      affinity += Math.min(0.4, overlap * 2)
      if (overlap > 0.04) signals.push('Shared technical vocabulary with the challenge')

      // Readiness distance. A large gap does not exclude a technology — it is
      // exactly what the development pipeline exists to close — but it lowers
      // the ordering and is reported to the reviewer.
      if (floor !== null) {
        const gap = floor - technology.currentTrl
        if (gap <= 0) {
          affinity += 0.2
          signals.push(`Already at or above the requested TRL ${floor}`)
        } else if (gap <= 2) {
          affinity += 0.1
          signals.push(`Within ${gap} TRL of the requested level`)
        } else {
          signals.push(`${gap} TRL below the requested level — development required`)
        }
      }

      // Maturity within the portfolio.
      if (technology.acquisitionStage === 'Development Portfolio') {
        affinity += 0.1
        signals.push('In the active development portfolio')
      }

      return { technology, affinity: Math.min(1, affinity), signals }
    })
    .filter((candidate) => !candidate.excluded)
    .sort((a, b) => b.affinity - a.affinity)
}
