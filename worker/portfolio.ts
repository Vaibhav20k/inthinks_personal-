/**
 * Public technology profiles.
 *
 * Everything the site is allowed to say about a technology, and the guard that
 * decides it is safe to say it.
 *
 * The rule this module exists to enforce is the one the whole platform rests
 * on: the technology is public, the innovator is not. A submission is written
 * by an innovator for assessors and is confidential; a public brief is written
 * by InThinks about the technology. So nothing here is copied from a
 * submission — the narrative is authored, and the guard below refuses to
 * publish a draft that has the innovator's own details in it.
 */

/** The public lifecycle vocabulary. Shorter and plainer than the working one. */
export const PUBLIC_STAGES = [
  'Under Evaluation',
  'Technical Review',
  'Development',
  'Prototype Optimisation',
  'Validation',
  'Industrialisation',
  'Transfer Preparation',
] as const

/**
 * How a working stage reads in public.
 *
 * Derived rather than authored, so a page cannot advertise `Validation` while
 * the workspace is still at proof of concept. Several working stages collapse
 * into one public one — outside the lab, `Optimisation` and `Engineering` are
 * both simply development.
 */
export const STAGE_TO_PUBLIC: Record<string, (typeof PUBLIC_STAGES)[number]> = {
  Research: 'Under Evaluation',
  'Proof of Concept': 'Technical Review',
  Optimisation: 'Development',
  Engineering: 'Development',
  Prototype: 'Prototype Optimisation',
  Validation: 'Validation',
  Pilot: 'Validation',
  'Industrial Demonstration': 'Industrialisation',
  'Transfer Readiness': 'Transfer Preparation',
}

export const publicStage = (developmentStage: string | null | undefined) =>
  STAGE_TO_PUBLIC[developmentStage ?? ''] ?? 'Under Evaluation'

export const IP_STATUSES = [
  'Under Evaluation',
  'Filing In Preparation',
  'Application Filed',
  'Rights Secured',
  'To Be Confirmed',
] as const

export const TRANSFER_STATUSES = [
  'Under Development',
  'Industry Evaluation',
  'Pilot Opportunity',
  'Transfer Ready',
] as const

/** The site's own filter vocabularies. A profile may not invent terms. */
export const DOMAINS = [
  { code: 'MAT', name: 'Advanced Materials' },
  { code: 'ENR', name: 'Energy' },
  { code: 'CLN', name: 'Clean Technology' },
  { code: 'MFG', name: 'Industrial Processes' },
  { code: 'ELC', name: 'Electronics & Sensing' },
  { code: 'BLT', name: 'Built Environment' },
] as const

export const SECTORS = [
  'Manufacturing', 'Energy', 'Construction', 'Mining', 'Automotive', 'Chemicals',
  'Agriculture', 'Electronics', 'Infrastructure', 'Consumer Products', 'Materials',
] as const

export const OUTCOMES = [
  'energy', 'emissions', 'strength', 'water', 'waste', 'life', 'thermal',
  'corrosion', 'material', 'efficiency', 'opex', 'hazardous', 'durability',
  'recovery', 'yield',
] as const

/** Domain code for a submitted category. The form offers the domain names. */
export const domainFor = (category: string | null | undefined) =>
  DOMAINS.find((d) => d.name === category) ?? { code: 'MAT', name: category ?? 'Advanced Materials' }

/** A technology may be published once InThinks holds rights to develop it. */
/**
 * Where a public record came from.
 *
 * A submission-derived profile reads TRL, domain and stage from the workspace
 * record behind it, so a public page cannot outrun what the reviewers know. An
 * authored one has no such record, so those facts are written on the profile —
 * which is only safe precisely because there is nothing for it to contradict.
 */
export const ORIGINS = ['submission', 'authored'] as const

/** Demo records exist so the platform does not launch empty. Labelled, always. */
export const RECORD_TYPES = ['demo', 'live'] as const

/** What a published industrial challenge can say about its own progress. */
export const PROBLEM_STATUSES = [
  'Open challenge',
  'Technology search',
  'Candidate technologies identified',
  'Match identified',
  'Technical review',
  'Closed',
] as const

/**
 * Priority areas a challenge can be filed under.
 *
 * A closed vocabulary because the Problem Explorer filters on it, and one
 * challenge filed under a value nobody else uses turns a filter into a guess.
 */
export const PRIORITY_AREAS = [
  'Energy',
  'Emissions',
  'Asset life',
  'Yield',
  'Water',
  'Waste',
  'Safety',
  'Cost',
] as const

/** What the public site calls a match. Words, never a percentage. */
export const MATCH_CLASSES = [
  'Strong candidate',
  'Promising match',
  'Candidate match',
] as const

/**
 * How far a public match has travelled.
 *
 * `AI candidate` is absent on purpose. It is a real internal state and it is
 * the one thing that must never reach the site — publishing raw engine output
 * would be the platform asserting something no person has checked. A match
 * becomes publishable by being reviewed, which means by leaving that state.
 */
export const MATCH_STATUSES = [
  'Technical review',
  'Qualified match',
  'R&D required',
  'Industry evaluation',
  'Pilot',
  'Commercial discussion',
  'Transfer',
] as const

export const FIT_DIMENSIONS = ['Mechanism', 'Application', 'TRL', 'Implementation'] as const
export const FIT_RATINGS = ['Strong', 'Promising', 'Moderate', 'Limited', 'Unknown'] as const
export const DEVELOPMENT_LEVELS = ['Low', 'Medium', 'High'] as const

export const PUBLISHABLE_STAGES = ['Rights Secured', 'Development Portfolio'] as const

/* -------------------------------------------------------------------- slugs */

/**
 * A URL-safe slug. Not derived from the title automatically, because the
 * public name is chosen and a slug that silently changes with an edited name
 * breaks every link anyone has shared.
 */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export const isSlug = (v: unknown): v is string =>
  typeof v === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) && v.length >= 3 && v.length <= 80

/* ------------------------------------------------------------------- guards */

/** Identity a public page must never carry. */
export interface Identity {
  innovator_name: string | null
  innovator_email: string | null
  institution: string | null
}

/**
 * Whether a draft leaks the identity it is supposed to protect.
 *
 * Checks the actual person and institution behind *this* record, plus the
 * shapes identity usually takes when it slips into prose — an email address, a
 * phone number, a profile link. Run at publish so the answer is a refusal
 * someone can act on, and again at serve so a row edited around the check
 * still never reaches a reader.
 *
 * Names are matched whole-word: an innovator called "Rose" must not blacklist
 * the word "prose".
 */
export function identityLeak(text: string, identity: Identity): string | null {
  const hay = text.toLowerCase()

  if (identity.innovator_email && hay.includes(identity.innovator_email.toLowerCase())) {
    return 'the innovator’s email address'
  }
  for (const [value, label] of [
    [identity.innovator_name, 'the innovator’s name'],
    [identity.institution, 'the source institution'],
  ] as const) {
    if (!value) continue
    const trimmed = value.trim()
    if (trimmed.length < 3) continue
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'iu').test(text)) return label
  }
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)) return 'an email address'
  if (/(?:\+\d[\d\s-]{7,}|\b\d{10}\b)/.test(text)) return 'a phone number'
  if (/\b(?:linkedin|orcid|researchgate|scholar\.google)\b/i.test(text)) return 'a personal profile link'
  return null
}

/**
 * Named parties that must never appear on a public record.
 *
 * `identityLeak` compares prose against the identity on the submission behind
 * it. An authored record has no submission, so that guard has nothing to
 * compare and passes everything — which is how a draft naming an institution
 * published cleanly in testing.
 *
 * This is the other half: patterns that are wrong on any public record,
 * whatever it came from. A published technology never names the innovator or
 * their institution; a published challenge never names the company. Both
 * promises are the platform's, not the author's to remember.
 *
 * Deliberately narrow. Every entry is a proper noun in practice, so "validated
 * in a university laboratory" passes and "validated at IIT Bombay" does not —
 * a guard that fires on ordinary technical prose is one people learn to route
 * around.
 */
const NAMED_PARTIES: [RegExp, string][] = [
  [/\b(?:IIT|IISc|NIT|IISER|NISER|BITS)\b/, 'a named institution'],
  [/\bIndian Institute of\b/i, 'a named institution'],
  [/\bUniversity of [A-Z]/, 'a named university'],
  [/\b[A-Z][a-z]{2,} University\b/, 'a named university'],
  [/\b(?:Tata|Reliance|Adani|JSW|Mahindra|Infosys|Wipro)\b/, 'a named company'],
  [/\bL&T\b/, 'a named company'],
  // "Limited" is an ordinary English word — "Limited adhesion data" is normal
  // technical writing and was flagged as a company until this required a
  // proper noun in front of the suffix. Inc./LLC/GmbH are distinctive enough
  // to stand alone.
  [/\b[A-Z][A-Za-z]{2,}\s+(?:Pvt\.?\s+)?(?:Private\s+)?(?:Limited|Ltd\.?)\b/, 'a company suffix'],
  [/\b(?:Inc\.|LLC|GmbH|S\.A\.|N\.V\.)\b/, 'a company suffix'],
]

/**
 * What is wrong with this text for publication, or null if nothing is.
 *
 * Runs on every public record regardless of origin, alongside `identityLeak`
 * rather than instead of it: that one knows who the actual innovator is, this
 * one knows what a public record may never say about anybody.
 */
export function namedPartyLeak(text: string): string | null {
  for (const [pattern, label] of NAMED_PARTIES) {
    if (pattern.test(text)) return label
  }
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)) return 'an email address'
  if (/(?:\+\d[\d\s-]{7,}|\b\d{10}\b)/.test(text)) return 'a phone number'
  if (/\b(?:linkedin|orcid|researchgate|scholar\.google)\b/i.test(text)) return 'a personal profile link'
  return null
}

/** Every free-text field of a profile, as one string, for the guard to read. */
export const profileProse = (p: {
  name: string; thesis: string; problem: string; principle: string
  why_it_matters: string; validation: string
  applications: string; sectors: string; outcomes: string; next_milestones: string
}) =>
  [p.name, p.thesis, p.problem, p.principle, p.why_it_matters, p.validation,
   p.applications, p.sectors, p.outcomes, p.next_milestones].join('\n')

/* -------------------------------------------------------------- serialising */

export const parseList = (json: string | null | undefined): string[] => {
  if (!json) return []
  try {
    const value = JSON.parse(json)
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

/**
 * The public shape of a technology.
 *
 * Assembled field by field from named columns. There is no path here that
 * spreads a database row, so a column added to `innovations` tomorrow cannot
 * appear on the site by accident.
 */
export function publicTechnology(row: Record<string, unknown>) {
  /**
   * An authored record carries its own facts; a submission-derived one reads
   * them from the innovation behind it. The row shape is the same either way —
   * the query supplies both sets of columns and this picks the right pair —
   * so nothing downstream has to know which kind it is holding.
   */
  const authored = row.origin === 'authored'
  const domain = authored
    ? (DOMAINS.find((d) => d.code === row.authored_domain_code) ?? DOMAINS[DOMAINS.length - 1])
    : domainFor(row.category as string)
  const entry = Number((authored ? row.authored_entry_trl : row.entry_trl) ?? 1)
  const current = Number((authored ? row.authored_current_trl : row.current_trl) ?? entry)
  const target = Number((authored ? row.authored_target_trl : row.target_trl) ?? entry)
  return {
    id: String(row.reference),
    slug: String(row.slug),
    name: String(row.name),
    domain: domain.name,
    domainCode: domain.code,
    thesis: String(row.thesis ?? ''),
    problem: String(row.problem ?? ''),
    principle: String(row.principle ?? ''),
    whyItMatters: String(row.why_it_matters ?? ''),
    validation: String(row.validation ?? ''),
    applications: parseList(row.applications as string),
    sectors: parseList(row.sectors as string),
    outcomes: parseList(row.outcomes as string),
    nextMilestones: parseList(row.next_milestones as string),
    // Derived from the internal record wherever there is one, so a public page
    // can never claim a maturity the workspace disagrees with.
    entryTrl: entry,
    currentTrl: current,
    targetTrl: target,
    stage: authored
      ? String(row.authored_stage ?? 'Under Evaluation')
      : publicStage(row.development_stage as string),
    /** Illustrative records say so, wherever they are rendered. */
    demo: row.record_type === 'demo',
    ipStatus: String(row.ip_status),
    transferStatus: String(row.transfer_status),
  }
}

export type PublicTechnology = ReturnType<typeof publicTechnology>
