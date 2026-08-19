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
  const domain = domainFor(row.category as string)
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
    // Derived from the internal record, never authored twice.
    entryTrl: Number(row.entry_trl ?? 1),
    currentTrl: Number(row.current_trl ?? row.entry_trl ?? 1),
    targetTrl: Number(row.target_trl ?? row.entry_trl ?? 1),
    stage: publicStage(row.development_stage as string),
    ipStatus: String(row.ip_status),
    transferStatus: String(row.transfer_status),
  }
}

export type PublicTechnology = ReturnType<typeof publicTechnology>
