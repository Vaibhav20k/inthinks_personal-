/**
 * Deterministic economics (phase 8). Pure functions only: the same figures
 * and settings always give the same answer, and nothing here calls a model.
 *
 * Rules that keep every number explainable:
 *  - Each result is a low–high range. The high end takes every figure as
 *    stated; the low end discounts each figure by the trust its verification
 *    state earns (settings.trust). Disputed figures are left out entirely.
 *  - A derived number is only as trusted as its weakest input.
 *  - Currencies are never converted. Each currency is totalled on its own, and
 *    only the default currency is ranked against the Hot/Warm thresholds.
 *  - Output is admin-only commercial data (class C4). It must never reach a
 *    participant API, an email, an export or a model prompt.
 */

export const TRUSTED_STATES = ['independently_verified', 'document_checked', 'participant_confirmed', 'unverified'] as const
export type TrustedState = typeof TRUSTED_STATES[number]
export const CHECKED: readonly string[] = ['independently_verified', 'document_checked']

export interface EconomicsSettings {
  currency: string
  trust: Record<TrustedState, number>
  hotValue: number
  warmValue: number
  hotScore: number
  warmScore: number
  /** Price of one kWh in `currency`; null turns the energy line off. */
  energyPrice: number | null
}

export const DEFAULT_SETTINGS: EconomicsSettings = {
  currency: 'EUR',
  trust: { independently_verified: 1, document_checked: 0.9, participant_confirmed: 0.7, unverified: 0.5 },
  hotValue: 100_000,
  warmValue: 20_000,
  hotScore: 4,
  warmScore: 2,
  energyPrice: null,
}

export interface Figure {
  id: number
  category: string
  label: string
  comparator: string | null
  value: number | null
  valueMax: number | null
  baseline: number | null
  unit: string | null
  currency: string | null
  period: string | null
  attributionPct: number | null
  verification: string
}

export interface Range { currency: string; low: number; high: number }
export interface UsedFigure { id: number; label: string; verification: string; weight: number }
export interface Priority { label: 'Hot' | 'Warm' | 'Not yet' | 'Not enough data'; score: number; reasons: string[] }
export type MatchClass = 'Strong Match' | 'Promising Match' | 'Adjacent Opportunity' | 'Weak Match' | string

const round = (n: number) => Math.round(n * 100) / 100
const weight = (s: EconomicsSettings, verification: string) =>
  verification === 'disputed' ? 0 : s.trust[verification as TrustedState] ?? s.trust.unverified
const money = (n: number, currency: string) => `${currency} ${Math.round(n).toLocaleString('en-US')}`

function addTo(map: Map<string, Range>, currency: string, low: number, high: number) {
  const r = map.get(currency) ?? { currency, low: 0, high: 0 }
  r.low += low; r.high += high
  map.set(currency, r)
}
const ranges = (map: Map<string, Range>) =>
  [...map.values()].map((r) => ({ currency: r.currency, low: round(r.low), high: round(r.high) })).sort((a, b) => a.currency.localeCompare(b.currency))

/** Yearly multiplier for a recurring cost; null when a cost is not yearly-comparable. */
const perYear = (period: string | null) => (period === 'per_year' ? 1 : period === 'per_month' ? 12 : null)

/** Money the problem costs per year, after the share the problem causes. */
export function moneyAtStake(figures: Figure[], s: EconomicsSettings) {
  const totals = new Map<string, Range>(), used: UsedFigure[] = [], notes: string[] = []
  for (const f of figures) {
    if (f.category !== 'cost' || f.value === null || !f.currency) continue
    if (f.verification === 'disputed') { notes.push(`“${f.label}” is disputed and left out.`); continue }
    const factor = perYear(f.period)
    if (factor === null) { notes.push(`“${f.label}” is ${f.period === 'one_off' ? 'a one-off cost' : 'a per-unit cost'}, so it is not counted as yearly money at stake.`); continue }
    const share = (f.attributionPct ?? 100) / 100, w = weight(s, f.verification)
    const stated = f.value * factor * share
    addTo(totals, f.currency, stated * w, stated)
    used.push({ id: f.id, label: f.label, verification: f.verification, weight: w })
  }
  return { totals: ranges(totals), used, notes }
}

/**
 * The improvement the submitter needs, as a share. Only a percentage target
 * with no baseline reads as an improvement; "scrap rate ≤ 2 % from 8 %" is an
 * absolute rate, not a relative gain, and is skipped rather than guessed at.
 */
export function improvement(figures: Figure[], s: EconomicsSettings) {
  const candidates = figures.filter((f) => f.category === 'success_criterion' && f.unit === '%' && f.value !== null
    && f.verification !== 'disputed' && f.baseline === null && ['gte', 'eq', 'between'].includes(f.comparator ?? '')
    && f.value > 0 && f.value <= 100)
  const f = candidates.find((c) => c.label.toLowerCase() === 'improvement needed') ?? candidates[0]
  if (!f) return null
  const high = f.comparator === 'between' && f.valueMax !== null ? Math.min(f.valueMax, 100) : f.value!
  return { low: f.value! / 100, high: high / 100, figure: { id: f.id, label: f.label, verification: f.verification, weight: weight(s, f.verification) } }
}

/** Yearly saving = money at stake × improvement, per currency, weakest-input trust on the low end. */
export function yearlySaving(figures: Figure[], s: EconomicsSettings) {
  const imp = improvement(figures, s)
  if (!imp) return { totals: [] as Range[], improvement: null }
  const totals = new Map<string, Range>()
  for (const f of figures) {
    if (f.category !== 'cost' || f.value === null || !f.currency || f.verification === 'disputed') continue
    const factor = perYear(f.period)
    if (factor === null) continue
    const stated = f.value * factor * ((f.attributionPct ?? 100) / 100)
    addTo(totals, f.currency, stated * imp.low * Math.min(weight(s, f.verification), imp.figure.weight), stated * imp.high)
  }
  return { totals: ranges(totals), improvement: imp }
}

/** Energy the process uses per year, in kWh, from the first usable measurement. */
export function energySaving(figures: Figure[], s: EconomicsSettings) {
  if (s.energyPrice === null) return null
  const imp = improvement(figures, s)
  const f = figures.find((x) => x.category === 'measurement' && (x.unit === 'kWh/year' || x.unit === 'MWh/year')
    && x.value !== null && x.value > 0 && x.verification !== 'disputed')
  if (!f || !imp) return null
  const kWh = f.value! * (f.unit === 'MWh/year' ? 1000 : 1)
  const stated = kWh * s.energyPrice
  return { currency: s.currency, kWhPerYear: kWh,
    low: round(stated * imp.low * Math.min(weight(s, f.verification), imp.figure.weight)), high: round(stated * imp.high),
    figure: { id: f.id, label: f.label, verification: f.verification, weight: weight(s, f.verification) } }
}

/** One-off costs of a solution (installation and similar), per currency. */
export function installCost(figures: Figure[]) {
  const totals = new Map<string, number>(), used: UsedFigure[] = []
  for (const f of figures) {
    if (f.category !== 'cost' || f.period !== 'one_off' || f.value === null || !f.currency || f.verification === 'disputed') continue
    totals.set(f.currency, (totals.get(f.currency) ?? 0) + f.value)
    used.push({ id: f.id, label: f.label, verification: f.verification, weight: 1 })
  }
  return { totals: [...totals].map(([currency, amount]) => ({ currency, amount: round(amount) })), used }
}

/**
 * Years until the solution pays for itself: install ÷ yearly saving. The best
 * case divides by the high saving, the worst by the trust-adjusted low one.
 * Different currencies are never compared.
 */
export function payback(saving: Range[], install: { currency: string; amount: number }[]) {
  if (!install.length) return { status: 'no_install_cost' as const }
  if (!saving.length) return { status: 'no_saving' as const }
  for (const cost of install) {
    const s = saving.find((r) => r.currency === cost.currency)
    if (!s) continue
    if (s.high <= 0) return { status: 'no_saving' as const }
    return { status: 'ok' as const, currency: cost.currency, install: cost.amount,
      bestYears: round(cost.amount / s.high), worstYears: s.low > 0 ? round(cost.amount / s.low) : null }
  }
  return { status: 'currency_mismatch' as const, saving: saving.map((r) => r.currency), install: install.map((c) => c.currency) }
}

export interface PriorityInputs { checklistMissing: number | null; bestMatch: MatchClass | null }

/**
 * Hot / Warm / Not yet for a problem, with the reasons that produced it.
 * Points: value at stake (0–2, default currency, trust-adjusted low end),
 * share of figures checked (0–1), checklist complete (0–1), strong or
 * promising match (0–1). Hot also needs some value at stake.
 */
export function priority(figures: Figure[], s: EconomicsSettings, extra: PriorityInputs): Priority {
  const stake = moneyAtStake(figures, s), imp = improvement(figures, s)
  const missing: string[] = []
  if (!stake.totals.length) missing.push('a yearly cost of the problem')
  if (!imp) missing.push('the improvement needed, as a percentage')
  if (missing.length) return { label: 'Not enough data', score: 0, reasons: [`Missing ${missing.join(' and ')}.`] }

  const reasons: string[] = []
  let score = 0, valuePoints = 0
  const home = stake.totals.find((r) => r.currency === s.currency)
  if (!home) reasons.push(`Costs are stated in ${stake.totals.map((r) => r.currency).join(', ')}; not ranked by value because currencies are not converted.`)
  else {
    valuePoints = home.low >= s.hotValue ? 2 : home.low >= s.warmValue ? 1 : 0
    reasons.push(`${money(home.low, home.currency)}–${Math.round(home.high).toLocaleString('en-US')} a year at stake${valuePoints === 2 ? ' (Hot level)' : valuePoints === 1 ? ' (Warm level)' : ' (below Warm level)'}.`)
  }
  score += valuePoints

  const used = [...stake.used, imp!.figure]
  const checked = used.filter((u) => CHECKED.includes(u.verification)).length
  if (checked * 2 >= used.length) score += 1
  reasons.push(`${checked} of ${used.length} figures used are checked.`)

  if (extra.checklistMissing === 0) { score += 1; reasons.push('Sector checklist complete.') }
  else if (extra.checklistMissing !== null) reasons.push(`${extra.checklistMissing} checklist figure(s) still missing.`)

  if (extra.bestMatch === 'Strong Match' || extra.bestMatch === 'Promising Match') { score += 1; reasons.push(`Best match: ${extra.bestMatch}.`) }
  else reasons.push(extra.bestMatch ? `Best match only ${extra.bestMatch}.` : 'No match yet.')

  const label = score >= s.hotScore && valuePoints > 0 ? 'Hot' : score >= s.warmScore ? 'Warm' : 'Not yet'
  return { label, score, reasons }
}

/** Validates a settings body from the admin page. Returns field errors or clean settings. */
export function validateSettings(body: Record<string, unknown>):
  { ok: true; settings: EconomicsSettings } | { ok: false; fields: Record<string, string> } {
  const f: Record<string, string> = {}
  const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN)
  const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : ''
  if (!/^[A-Z]{3}$/.test(currency)) f.currency = 'Use a three-letter currency code, e.g. EUR.'
  const trustIn = (body.trust && typeof body.trust === 'object' ? body.trust : {}) as Record<string, unknown>
  const trust = {} as Record<TrustedState, number>
  for (const state of TRUSTED_STATES) {
    const v = num(trustIn[state])
    if (!Number.isFinite(v) || v < 0 || v > 1) f[`trust.${state}`] = 'Enter a share between 0 and 100 %.'
    trust[state] = v
  }
  if (!Object.keys(f).some((k) => k.startsWith('trust.'))
    && !(trust.independently_verified >= trust.document_checked && trust.document_checked >= trust.participant_confirmed
      && trust.participant_confirmed >= trust.unverified)) f.trust = 'A better-checked figure cannot be trusted less than a less-checked one.'
  const hotValue = num(body.hotValue), warmValue = num(body.warmValue)
  if (!Number.isFinite(hotValue) || hotValue <= 0 || hotValue > 1e12) f.hotValue = 'Enter a positive amount.'
  if (!Number.isFinite(warmValue) || warmValue <= 0 || warmValue > 1e12) f.warmValue = 'Enter a positive amount.'
  else if (Number.isFinite(hotValue) && warmValue >= hotValue) f.warmValue = 'Warm must be below Hot.'
  const hotScore = num(body.hotScore), warmScore = num(body.warmScore)
  if (!Number.isInteger(hotScore) || hotScore < 1 || hotScore > 5) f.hotScore = 'Enter a whole number from 1 to 5.'
  if (!Number.isInteger(warmScore) || warmScore < 1 || warmScore > 5) f.warmScore = 'Enter a whole number from 1 to 5.'
  else if (Number.isInteger(hotScore) && warmScore >= hotScore) f.warmScore = 'Warm must need fewer points than Hot.'
  let energyPrice: number | null = null
  if (body.energyPrice !== null && body.energyPrice !== undefined && body.energyPrice !== '') {
    energyPrice = num(body.energyPrice)
    if (!Number.isFinite(energyPrice) || energyPrice <= 0 || energyPrice > 1000) f.energyPrice = 'Enter a price per kWh above 0, or leave it empty.'
  }
  if (Object.keys(f).length) return { ok: false, fields: f }
  return { ok: true, settings: { currency, trust, hotValue, warmValue, hotScore, warmScore, energyPrice } }
}
