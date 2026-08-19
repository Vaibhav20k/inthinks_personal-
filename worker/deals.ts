import { audit } from './audit'
import type { AuthContext } from './auth'
import { OPPORTUNITY_STAGES } from './opportunities'

/**
 * The commercial deal room.
 *
 * A deal is what an opportunity becomes once terms are on the table. It is the
 * one workspace the R&D reviewer role cannot reach at all: reviewers assess
 * whether a technology works, and knowing what it is being sold for does not
 * help them do that. The brief marks this module private, and here that means
 * the routes refuse the role rather than the interface omitting a link.
 */

/** Structures a transfer can take. These are the public pathways, named alike. */
export const DEAL_TYPES = [
  'Technology Transfer',
  'Licensing',
  'Upfront + Royalty',
  'Assignment',
  'Co-development',
  'Pilot & Validation',
] as const

export const EXCLUSIVITY = [
  'Non-exclusive',
  'Sole',
  'Exclusive',
  'Exclusive by field',
  'Exclusive by territory',
] as const

/**
 * What a royalty is calculated on.
 *
 * Recorded as a named basis rather than free text because "3%" means nothing
 * without it, and the difference between net sales and gross revenue is the
 * difference between two materially different deals.
 */
export const ROYALTY_BASES = [
  'Net sales',
  'Gross revenue',
  'Units produced',
  'Units sold',
  'Verified cost savings',
  'Sub-licence revenue',
] as const

/** Where each side stands on rights. Applies to IP and to manufacturing. */
export const RIGHTS_POSITIONS = [
  'Retained by InThinks',
  'Licensed to counterparty',
  'Assigned to counterparty',
  'Jointly held',
  'Not granted',
] as const

/** How far the paperwork has travelled. Separate from whether the deal closed. */
export const AGREEMENT_STATUSES = [
  'Not started',
  'Term sheet issued',
  'Drafting',
  'Under legal review',
  'Signed by counterparty',
  'Executed',
] as const

/**
 * Whether the deal is still live.
 *
 * Kept apart from `agreement_status` on purpose: an agreement can be fully
 * drafted and the deal still lapse, and a deal room that collapses the two
 * loses the record of what nearly happened.
 */
export const CLOSING_STATUSES = ['Open', 'Executed', 'Withdrawn', 'Lapsed'] as const

export const MILESTONE_STATUSES = ['Pending', 'In progress', 'Met', 'Missed', 'Waived'] as const

export const PAYMENT_STATUSES = ['Scheduled', 'Invoiced', 'Received', 'Overdue', 'Waived'] as const

export const DOCUMENT_KINDS = [
  'Non-disclosure agreement',
  'Term sheet',
  'Licence agreement',
  'Assignment deed',
  'Co-development agreement',
  'Pilot agreement',
  'IP schedule',
  'Technical transfer package',
  'Training record',
  'Transfer certificate',
] as const

export const DOCUMENT_STATUSES = ['Required', 'Drafting', 'Under review', 'Executed', 'Not applicable'] as const

/**
 * A deal room opens once an opportunity is in commercial territory.
 *
 * Before `Commercial Negotiation` there are no terms to record, so opening one
 * earlier would produce an empty workspace that reads as if a deal exists.
 */
export const DEAL_ELIGIBLE_STAGES = OPPORTUNITY_STAGES.slice(
  OPPORTUNITY_STAGES.indexOf('Commercial Negotiation' as (typeof OPPORTUNITY_STAGES)[number]),
)

/** The stage an opportunity reaches once its deal is executed. */
export const TRANSFER_STAGE = 'Technology Transfer'

/** ISO 4217 is three uppercase letters; anything else is a typo, not a currency. */
export const isCurrency = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Z]{3}$/.test(value)

/**
 * Reads a money amount into integer minor units.
 *
 * Accepts either an integer count of minor units or a decimal major amount, and
 * refuses anything it cannot represent exactly. Money never becomes a float
 * here — `0.1 + 0.2` is the wrong answer in every currency.
 */
export function parseAmountMinor(value: unknown): number | null | 'invalid' {
  if (value === null || value === '') return null
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : 'invalid'
  }
  if (typeof value !== 'string') return 'invalid'
  const trimmed = value.trim().replace(/[\s,]/g, '')
  if (trimmed === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return 'invalid'
  const [whole, fraction = ''] = trimmed.split('.')
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(minor) ? minor : 'invalid'
}

/**
 * Reads a royalty rate into basis points.
 *
 * 5.25% is 525, exactly. Rates above 100% are refused — a royalty that exceeds
 * the basis it is charged on is a data-entry slip every time.
 */
export function parseRateBp(value: unknown): number | null | 'invalid' {
  if (value === null || value === '') return null
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : null
  if (raw === null) return 'invalid'
  if (raw === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return 'invalid'
  const [whole, fraction = ''] = raw.split('.')
  const bp = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (bp > 10_000) return 'invalid'
  return bp
}

export async function nextDealReference(db: D1Database, year: number) {
  const row = await db
    .prepare(
      `INSERT INTO counters (name, value) VALUES (?, 1)
       ON CONFLICT(name) DO UPDATE SET value = value + 1
       RETURNING value`,
    )
    .bind(`DEAL:${year}`)
    .first<{ value: number }>()
  return `DEAL-${year}-${String(row?.value ?? 1).padStart(4, '0')}`
}

export type OpenResult =
  | { ok: true; reference: string; created: boolean }
  | { ok: false; status: number; error: string }

/**
 * Opens the deal room for an opportunity.
 *
 * Idempotent: a second call returns the existing reference rather than a
 * second instrument for the same pairing.
 */
export async function openFromOpportunity(
  ctx: AuthContext,
  opportunityRef: string,
  ip: string,
): Promise<OpenResult> {
  const opportunity = await ctx.db
    .prepare('SELECT reference, challenge_ref, technology_ref, stage FROM opportunities WHERE reference = ?')
    .bind(opportunityRef)
    .first<{ reference: string; challenge_ref: string; technology_ref: string; stage: string }>()
  if (!opportunity) return { ok: false, status: 404, error: 'No such opportunity' }

  const existing = await ctx.db
    .prepare('SELECT reference FROM deals WHERE opportunity_ref = ?')
    .bind(opportunityRef)
    .first<{ reference: string }>()
  if (existing) return { ok: true, reference: existing.reference, created: false }

  if (!(DEAL_ELIGIBLE_STAGES as readonly string[]).includes(opportunity.stage)) {
    return {
      ok: false,
      status: 409,
      error: `A deal room opens at ${DEAL_ELIGIBLE_STAGES[0]}. This opportunity is at ${opportunity.stage}.`,
    }
  }

  const now = new Date().toISOString()
  const reference = await nextDealReference(ctx.db, new Date().getUTCFullYear())
  const industry = await ctx.db
    .prepare('SELECT sector FROM challenges WHERE reference = ?')
    .bind(opportunity.challenge_ref)
    .first<{ sector: string | null }>()

  await ctx.db
    .prepare(
      `INSERT INTO deals
         (reference, created_at, updated_at, opportunity_ref, challenge_ref, technology_ref, industry)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      reference, now, now,
      opportunityRef, opportunity.challenge_ref, opportunity.technology_ref,
      industry?.sector ?? null,
    )
    .run()

  await audit(ctx.db, ctx.actor, 'deal.open', reference, { opportunity: opportunityRef }, ip)
  return { ok: true, reference, created: true }
}
