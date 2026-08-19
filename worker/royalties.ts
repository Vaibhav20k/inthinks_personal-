import { audit } from './audit'
import type { AuthContext } from './auth'

/**
 * Royalty management.
 *
 * The part of the platform that keeps running after the transfer is done. It
 * answers three questions and nothing else: what was reported, what is owed on
 * it, and what has been paid. There is no expected-revenue figure anywhere —
 * a royalty forecast is a guess about someone else's sales.
 *
 * Two rules hold the record together:
 *
 *   1. The schedule is generated from the term, so a period nobody reported is
 *      visibly missing rather than simply absent.
 *   2. What is owed is computed from the reported figure and the rate. It is
 *      never typed in, because a hand-entered amount due is the one number in
 *      a licence that both sides will later disagree about.
 */

export const ROYALTY_TYPES = ['Revenue-based', 'Unit-based', 'Savings-based'] as const
export type RoyaltyType = (typeof ROYALTY_TYPES)[number]

/** Reporting frequencies, with the month span each one covers. */
export const REPORTING_PERIODS = {
  Monthly: 1,
  Quarterly: 3,
  'Half-yearly': 6,
  Annual: 12,
} as const

export const REPORTING_PERIOD_NAMES = Object.keys(REPORTING_PERIODS) as (keyof typeof REPORTING_PERIODS)[]

export const AGREEMENT_STATUSES = ['Active', 'Suspended', 'Ended'] as const

/**
 * Workflow states for a period.
 *
 * Deliberately excludes "paid" and "part paid": whether a period is settled is
 * arithmetic on the amounts, and a status field that could disagree with them
 * is a bug waiting to be filed.
 */
export const PERIOD_STATUSES = [
  'Awaiting statement',
  'Statement received',
  'Invoiced',
  'Disputed',
  'Waived',
] as const

/** A period is settled when the money says so, not when someone ticks a box. */
export type Settlement = 'Unpaid' | 'Part paid' | 'Settled' | 'Overpaid' | 'Nothing due'

export function settlementOf(dueMinor: number, adjustmentMinor: number, paidMinor: number): Settlement {
  const owed = dueMinor + adjustmentMinor
  if (owed <= 0 && paidMinor === 0) return 'Nothing due'
  if (paidMinor === 0) return 'Unpaid'
  if (paidMinor < owed) return 'Part paid'
  if (paidMinor > owed) return 'Overpaid'
  return 'Settled'
}

/* ------------------------------------------------------------------- dates */

/**
 * Adds months to an ISO date, clamping to the end of the target month.
 *
 * 31 January plus one month is 28 February, not 3 March. `Date` rolls over on
 * its own, which turns a schedule of month ends into a schedule that drifts
 * forward a few days a year.
 */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const total = (y * 12 + (m - 1)) + months
  const year = Math.floor(total / 12)
  const month = total % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(d, lastDay)
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** The day before an ISO date. Period ends are exclusive-bound minus one day. */
export function dayBefore(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() - 1)
  return t.toISOString().slice(0, 10)
}

export const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))

/** How many periods a term contains, rounded up so a part period still reports. */
export const periodCount = (termMonths: number, span: number) => Math.ceil(termMonths / span)

/** A hard ceiling on generated rows, so a mistyped term cannot fill the table. */
export const MAX_PERIODS = 240

/**
 * The reporting schedule for a term.
 *
 * Deterministic: same term, same frequency, same rows every time.
 */
export function schedule(termStart: string, termMonths: number, period: keyof typeof REPORTING_PERIODS) {
  const span = REPORTING_PERIODS[period]
  const count = Math.min(periodCount(termMonths, span), MAX_PERIODS)
  const rows: { seq: number; start: string; end: string }[] = []
  for (let i = 0; i < count; i++) {
    const start = addMonths(termStart, i * span)
    // The last period stops at the end of the term, not a whole span later.
    const rawEnd = addMonths(termStart, Math.min((i + 1) * span, termMonths))
    rows.push({ seq: i + 1, start, end: dayBefore(rawEnd) })
  }
  return rows
}

/* ------------------------------------------------------------------- money */

/**
 * What a reported figure owes.
 *
 * Integer arithmetic throughout. A percentage is basis points over 10,000, and
 * the division rounds half up at the very end — once, on a number that is
 * already exact.
 */
export function dueFor(
  type: RoyaltyType,
  rateBp: number | null,
  perUnitMinor: number | null,
  reportedMinor: number | null,
  reportedUnits: number | null,
): number {
  if (type === 'Unit-based') {
    if (perUnitMinor === null || reportedUnits === null) return 0
    return perUnitMinor * reportedUnits
  }
  if (rateBp === null || reportedMinor === null) return 0
  return Math.round((reportedMinor * rateBp) / 10_000)
}

/**
 * Whether a period has reported.
 *
 * A statement date or a reported figure both count — the obligation is to tell
 * InThinks what the period produced, and a figure entered from a statement
 * whose date nobody typed is still a figure. `Waived` discharges it outright.
 *
 * One predicate, used by both the next-statement date and the annual close, so
 * a period cannot be simultaneously outstanding for one and reported for the
 * other.
 */
export function hasReported(p: {
  statement_received: string | null
  reported_minor?: number | null
  reported_units?: number | null
  status: string
}): boolean {
  return p.status === 'Waived' ||
    p.statement_received !== null ||
    (p.reported_minor ?? null) !== null ||
    (p.reported_units ?? null) !== null
}

/**
 * Royalty years, and whether each one met its minimum.
 *
 * The minimum is annual, so it cannot be applied period by period: a quarter
 * that under-performs may be made up by the next one. The shortfall is only
 * real once the year's periods have all been reported, and it is reported
 * here rather than silently added to an invoice — someone has to decide to
 * charge it.
 */
export function royaltyYears(
  termStart: string,
  minimumAnnualMinor: number | null,
  periods: {
    period_start: string; period_end: string; due_minor: number; adjustment_minor: number
    paid_minor: number; statement_received: string | null; status: string
    reported_minor?: number | null; reported_units?: number | null
  }[],
) {
  if (!minimumAnnualMinor || periods.length === 0) return []
  const years: {
    year: number
    from: string
    to: string
    dueMinor: number
    paidMinor: number
    minimumMinor: number
    shortfallMinor: number
    complete: boolean
  }[] = []

  for (let y = 0; ; y++) {
    const from = addMonths(termStart, y * 12)
    const to = dayBefore(addMonths(termStart, (y + 1) * 12))
    const inYear = periods.filter((p) => p.period_start >= from && p.period_start <= to)
    if (inYear.length === 0) break
    const dueMinor = inYear.reduce((n, p) => n + p.due_minor + p.adjustment_minor, 0)
    const paidMinor = inYear.reduce((n, p) => n + p.paid_minor, 0)
    // A year is only closed once every period in it has reported or has been
    // explicitly waived. An unreported quarter is not a zero.
    const complete = inYear.every(hasReported)
    years.push({
      year: y + 1,
      from,
      to,
      dueMinor,
      paidMinor,
      minimumMinor: minimumAnnualMinor,
      shortfallMinor: complete ? Math.max(0, minimumAnnualMinor - dueMinor) : 0,
      complete,
    })
    if (years.length >= 40) break
  }
  return years
}

/**
 * The next date a statement is owed.
 *
 * Derived from the schedule rather than stored: the earliest period still
 * awaiting a statement ends on the date the licensee has to report by.
 */
export function nextReporting(
  periods: {
    period_end: string; statement_received: string | null; status: string
    reported_minor?: number | null; reported_units?: number | null
  }[],
  today: string,
) {
  const outstanding = periods
    .filter((p) => !hasReported(p))
    .sort((a, b) => a.period_end.localeCompare(b.period_end))
  const next = outstanding[0]
  if (!next) return { date: null as string | null, overdue: false, overdueCount: 0 }
  return {
    date: next.period_end,
    overdue: next.period_end < today,
    overdueCount: outstanding.filter((p) => p.period_end < today).length,
  }
}

/* ------------------------------------------------------------------ opening */

export async function nextRoyaltyReference(db: D1Database, year: number) {
  const row = await db
    .prepare(
      `INSERT INTO counters (name, value) VALUES (?, 1)
       ON CONFLICT(name) DO UPDATE SET value = value + 1
       RETURNING value`,
    )
    .bind(`ROY:${year}`)
    .first<{ value: number }>()
  return `ROY-${year}-${String(row?.value ?? 1).padStart(4, '0')}`
}

export type OpenResult =
  | { ok: true; reference: string; created: boolean; periods: number }
  | { ok: false; status: number; error: string }

/**
 * Opens royalty management for an executed deal.
 *
 * Requires the deal to be executed and to actually carry a royalty. A licence
 * settled entirely by an upfront payment has nothing to monitor, and creating
 * an empty agreement for it would make the register lie about how many live
 * royalties exist.
 */
export async function openFromDeal(ctx: AuthContext, dealRef: string, ip: string): Promise<OpenResult> {
  const deal = await ctx.db
    .prepare(
      `SELECT reference, opportunity_ref, challenge_ref, technology_ref, currency,
              royalty_bp, royalty_basis, term_months, term_start, territory,
              field_of_use, closing_status
       FROM deals WHERE reference = ?`,
    )
    .bind(dealRef)
    .first<Record<string, unknown>>()
  if (!deal) return { ok: false, status: 404, error: 'No such deal' }

  const existing = await ctx.db
    .prepare('SELECT reference FROM royalty_agreements WHERE deal_ref = ?')
    .bind(dealRef)
    .first<{ reference: string }>()
  if (existing) {
    const n = await ctx.db
      .prepare('SELECT COUNT(*) AS n FROM royalty_periods WHERE agreement_ref = ?')
      .bind(existing.reference)
      .first<{ n: number }>()
    return { ok: true, reference: existing.reference, created: false, periods: n?.n ?? 0 }
  }

  if (deal.closing_status !== 'Executed') {
    return { ok: false, status: 409, error: 'Royalties are monitored once a deal is executed.' }
  }
  if (!deal.royalty_bp) {
    return {
      ok: false,
      status: 409,
      error: 'This deal carries no royalty rate. There is nothing to monitor.',
    }
  }

  const now = new Date().toISOString()
  const reference = await nextRoyaltyReference(ctx.db, new Date().getUTCFullYear())

  await ctx.db
    .prepare(
      `INSERT INTO royalty_agreements
         (reference, created_at, updated_at, deal_ref, opportunity_ref, challenge_ref,
          technology_ref, currency, rate_bp, basis, term_months, term_start,
          territory, field_of_use)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      reference, now, now, dealRef, deal.opportunity_ref ?? null, deal.challenge_ref,
      deal.technology_ref, deal.currency ?? 'INR', deal.royalty_bp, deal.royalty_basis ?? null,
      deal.term_months ?? null, deal.term_start ?? null, deal.territory ?? null,
      deal.field_of_use ?? null,
    )
    .run()

  const periods = await regenerateSchedule(ctx.db, reference)
  await audit(ctx.db, ctx.actor, 'royalty.open', reference, { deal: dealRef, periods }, ip)
  return { ok: true, reference, created: true, periods }
}

/**
 * Whether anything has been recorded against an agreement's schedule.
 *
 * The line that decides whether the schedule can be rebuilt or only extended.
 * A period with a statement, a figure, a payment or an adjustment against it is
 * history, and history is not regenerated.
 */
export async function hasReportedActivity(db: D1Database, reference: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM royalty_periods
       WHERE agreement_ref = ?
         AND (statement_received IS NOT NULL OR reported_minor IS NOT NULL
              OR reported_units IS NOT NULL OR paid_minor <> 0 OR adjustment_minor <> 0)`,
    )
    .bind(reference)
    .first<{ n: number }>()
  return (row?.n ?? 0) > 0
}

/**
 * Writes the reporting schedule for an agreement.
 *
 * Two modes, because the seq numbering is only stable for a fixed frequency and
 * start date. `add` fills in periods the current schedule is missing — what
 * extending a term needs, and it never touches an existing row. `replace`
 * rebuilds from scratch, the only correct answer when the frequency or the term
 * start changes, since quarter 5 and month 5 are not the same period.
 *
 * The caller must refuse `replace` once anything has been reported. Mixing the
 * two leaves a schedule whose periods overlap, which is worse than either.
 */
export async function regenerateSchedule(
  db: D1Database,
  reference: string,
  mode: 'add' | 'replace' = 'add',
): Promise<number> {
  const agreement = await db
    .prepare('SELECT term_start, term_months, reporting_period FROM royalty_agreements WHERE reference = ?')
    .bind(reference)
    .first<{ term_start: string | null; term_months: number | null; reporting_period: string }>()
  if (!agreement?.term_start || !agreement.term_months) return 0
  if (!isIsoDate(agreement.term_start)) return 0
  const period = agreement.reporting_period as keyof typeof REPORTING_PERIODS
  if (!(period in REPORTING_PERIODS)) return 0

  if (mode === 'replace') {
    await db.prepare('DELETE FROM royalty_periods WHERE agreement_ref = ?').bind(reference).run()
  }

  const rows = schedule(agreement.term_start, agreement.term_months, period)
  const now = new Date().toISOString()
  let written = 0
  for (const row of rows) {
    const result = await db
      .prepare(
        `INSERT INTO royalty_periods (agreement_ref, created_at, seq, period_start, period_end)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(agreement_ref, seq) DO NOTHING`,
      )
      .bind(reference, now, row.seq, row.start, row.end)
      .run()
    written += result.meta.changes ?? 0
  }
  return written
}
