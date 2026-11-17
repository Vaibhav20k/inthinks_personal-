import { bodyObject, reply, textValue } from './access-http'

/**
 * Structured qualification (step 6).
 *
 * A case is qualified by facts that later steps can compute with, not by
 * prose: a value, a unit from a fixed catalogue, a source, a date and a
 * verification state. Rules that keep the record explainable:
 *
 *  - Units come from UNITS only, so two cases stating energy use can be
 *    compared without guessing what "units" meant.
 *  - Changing a value resets its verification. A verified number that was
 *    later edited is not a verified number.
 *  - Items are retired, never deleted, so a decision made on an older value
 *    can still be traced.
 *  - Participants add and see only their own statements; staff estimates and
 *    verification notes stay internal.
 */

/** Unit → physical dimension. Extend deliberately; never accept free text. */
export const UNITS: Record<string, string> = {
  '%': 'ratio', 'ppm': 'concentration', 'mg/L': 'concentration',
  'J': 'energy', 'MJ': 'energy', 'GJ': 'energy', 'kWh': 'energy', 'MWh': 'energy',
  'W': 'power', 'kW': 'power', 'MW': 'power',
  'g': 'mass', 'kg': 'mass', 't': 'mass',
  'L': 'volume', 'kL': 'volume', 'm3': 'volume',
  'mm': 'length', 'm': 'length', 'km': 'length', 'm2': 'area', 'ha': 'area',
  '°C': 'temperature', 'K': 'temperature',
  's': 'time', 'min': 'time', 'h': 'time', 'day': 'time', 'year': 'time',
  'Pa': 'pressure', 'kPa': 'pressure', 'MPa': 'pressure', 'bar': 'pressure',
  'm3/h': 'volume_flow', 'L/min': 'volume_flow', 'kg/h': 'mass_flow', 't/year': 'mass_flow',
  'kgCO2e': 'emissions', 'tCO2e': 'emissions', 'tCO2e/year': 'emissions_rate',
  'kWh/t': 'energy_intensity', 'kWh/year': 'energy_rate', 'MWh/year': 'energy_rate',
  'units': 'count', 'units/h': 'throughput', 'units/day': 'throughput',
  'm/s': 'speed', 'rpm': 'rotation', 'V': 'voltage', 'A': 'current', 'dB': 'sound', 'lux': 'illuminance',
}

export const CATEGORIES = ['measurement', 'constraint', 'cost', 'success_criterion'] as const
const COMPARATORS = ['eq', 'lt', 'lte', 'gt', 'gte', 'between'] as const
const PERIODS = ['one_off', 'per_month', 'per_year', 'per_unit'] as const
const SOURCES = ['participant_statement', 'document', 'measurement_record', 'third_party', 'staff_estimate'] as const
const VERIFICATION = ['unverified', 'participant_confirmed', 'document_checked', 'independently_verified', 'disputed'] as const

type Category = typeof CATEGORIES[number]
export interface QualificationActor { email: string; side: 'staff' | 'participant' }

const member = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value)

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN
  return Number.isFinite(n) && Math.abs(n) <= 1e15 ? n : NaN
}

function dateValue(value: unknown): string | null | false {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : false
}

export interface CleanItem {
  category: Category; label: string; comparator: string | null; value: number | null; valueMax: number | null
  baseline: number | null; unit: string | null; currency: string | null; period: string | null
  attributionPct: number | null; targetDate: string | null; sourceKind: string; sourceDetail: string | null
  evidenceId: number | null; observedOn: string | null
}

/** Validates one item. Returns field errors instead of guessing intent. */
export function validateItem(body: Record<string, unknown>, side: QualificationActor['side']):
  { ok: true; item: CleanItem } | { ok: false; fields: Record<string, string> } {
  const f: Record<string, string> = {}
  const category = body.category
  if (!member(CATEGORIES, category)) return { ok: false, fields: { category: 'Choose a category.' } }
  const label = textValue(body.label, 200)
  if (!label) f.label = 'Describe what this value is (200 characters at most).'
  const value = numberValue(body.value), valueMax = numberValue(body.valueMax), baseline = numberValue(body.baseline)
  for (const [k, v] of [['value', value], ['valueMax', valueMax], ['baseline', baseline]] as const) if (Number.isNaN(v)) f[k] = 'Enter a number.'
  const unit = body.unit === undefined || body.unit === null || body.unit === '' ? null : String(body.unit)
  const comparator = body.comparator === undefined || body.comparator === null || body.comparator === '' ? null : String(body.comparator)
  if (comparator !== null && !member(COMPARATORS, comparator)) f.comparator = 'Unknown comparison.'
  if (unit !== null && !Object.hasOwn(UNITS, unit)) f.unit = 'Choose a unit from the list.'
  const needsUnit = category !== 'cost'
  if (needsUnit && unit === null) f.unit ??= 'A unit is required.'
  if (value === null) f.value = category === 'cost' ? 'Enter the amount.' : category === 'success_criterion' ? 'Enter the target.' : 'Enter the value.'

  let currency: string | null = null, period: string | null = null, attributionPct: number | null = null
  if (category === 'measurement' && comparator !== null && comparator !== 'eq') f.comparator = 'A measurement is a single observed value.'
  if (category === 'constraint' && comparator === null) f.comparator = 'Say whether the limit is a minimum, maximum, range or exact value.'
  if (category === 'success_criterion' && !member(['gte', 'lte', 'eq', 'between'] as const, comparator)) f.comparator = 'Say whether success means at least, at most, exactly or within a range.'
  if (comparator === 'between') {
    if (valueMax === null || Number.isNaN(valueMax)) f.valueMax ??= 'A range needs an upper value.'
    else if (value !== null && !Number.isNaN(value) && valueMax <= value) f.valueMax = 'The upper value must exceed the lower value.'
  } else if (valueMax !== null && !Number.isNaN(valueMax)) f.valueMax = 'Only a range has an upper value.'
  if (category !== 'success_criterion' && baseline !== null) f.baseline = 'Only a success criterion has a baseline.'
  if (category === 'cost') {
    if (value !== null && !Number.isNaN(value) && value < 0) f.value = 'A cost cannot be negative.'
    currency = typeof body.currency === 'string' && /^[A-Z]{3}$/.test(body.currency) ? body.currency : null
    if (!currency) f.currency = 'Use a three-letter currency code, e.g. INR.'
    period = member(PERIODS, body.period) ? body.period : null
    if (!period) f.period = 'Say how often this cost is incurred.'
    const share = numberValue(body.attributionPct)
    if (share === null || Number.isNaN(share) || share < 0 || share > 100) f.attributionPct = 'Enter the share of this cost the problem causes, 0–100.'
    else attributionPct = share
    if (unit !== null && period !== 'per_unit') f.unit = 'A unit applies to costs incurred per unit only.'
  }
  const targetDate = dateValue(body.targetDate)
  if (targetDate === false) f.targetDate = 'Use a real date (YYYY-MM-DD).'
  else if (targetDate !== null && category !== 'success_criterion') f.targetDate = 'Only a success criterion has a target date.'
  const observedOn = dateValue(body.observedOn)
  if (observedOn === false) f.observedOn = 'Use a real date (YYYY-MM-DD).'
  else if (observedOn && observedOn > new Date().toISOString().slice(0, 10)) f.observedOn = 'An observation cannot be dated in the future.'
  const sourceKind = body.sourceKind
  if (!member(SOURCES, sourceKind)) f.sourceKind = 'Say where this value comes from.'
  else if (side === 'participant' && sourceKind === 'staff_estimate') f.sourceKind = 'Choose the source of your figure.'
  const sourceDetail = textValue(body.sourceDetail, 500)
  if (typeof body.sourceDetail === 'string' && body.sourceDetail.trim().length > 500) f.sourceDetail = '500 characters at most.'
  const evidence = numberValue(body.evidenceId)
  if (Number.isNaN(evidence) || (evidence !== null && !Number.isSafeInteger(evidence))) f.evidenceId = 'Unknown file.'
  if (Object.keys(f).length) return { ok: false, fields: f }
  return { ok: true, item: {
    category, label, comparator, value, valueMax: comparator === 'between' ? valueMax : null, baseline, unit,
    currency, period, attributionPct, targetDate: targetDate || null, sourceKind: sourceKind as string,
    sourceDetail: sourceDetail || null, evidenceId: evidence, observedOn: observedOn || null,
  } }
}

const COLUMNS = 'category,label,comparator,value,value_max,baseline,unit,currency,period,attribution_pct,target_date,source_kind,source_detail,evidence_id,observed_on'
const binds = (i: CleanItem) => [i.category, i.label, i.comparator, i.value, i.valueMax, i.baseline, i.unit, i.currency, i.period,
  i.attributionPct, i.targetDate, i.sourceKind, i.sourceDetail, i.evidenceId, i.observedOn]

function present(row: Record<string, unknown>, side: QualificationActor['side']) {
  const item: Record<string, unknown> = {
    id: row.id, category: row.category, label: row.label, comparator: row.comparator, value: row.value, valueMax: row.value_max,
    baseline: row.baseline, unit: row.unit, dimension: row.unit ? UNITS[String(row.unit)] ?? null : null, currency: row.currency,
    period: row.period, attributionPct: row.attribution_pct, targetDate: row.target_date, sourceKind: row.source_kind,
    sourceDetail: row.source_detail, evidenceId: row.evidence_id, observedOn: row.observed_on, verification: row.verification,
    createdRole: row.created_role, createdAt: row.created_at, updatedAt: row.updated_at, retiredAt: row.retired_at,
    internalOnly: row.internal_only === 1,
  }
  if (side === 'staff') Object.assign(item, { createdBy: row.created_by, verificationNote: row.verification_note, verifiedBy: row.verified_by, verifiedAt: row.verified_at })
  return item
}

/** What is still missing before the case can be assessed on numbers. */
export function completeness(items: { category: unknown; observed_on: unknown; verification: unknown }[]) {
  const missing: string[] = []
  const has = (c: Category) => items.some((i) => i.category === c)
  if (!has('measurement')) missing.push('a current measurement of the problem or performance')
  if (!has('success_criterion')) missing.push('a measurable success criterion')
  if (!has('cost')) missing.push('an attributable cost')
  const undated = items.filter((i) => !i.observed_on && i.category !== 'success_criterion').length
  if (undated) missing.push(`observation dates for ${undated} item(s)`)
  const verified = items.filter((i) => i.verification === 'document_checked' || i.verification === 'independently_verified').length
  return { items: items.length, verified, missing, ready: missing.length === 0 }
}

/**
 * Routes under `/…/qualification[/<id>[/verification|/retire]]` for one case.
 * The caller has already proved the actor may access `reference`.
 */
export async function qualificationRoutes(request: Request, db: D1Database, reference: string, actor: QualificationActor, rest: string) {
  const route = rest.match(/^(?:\/(\d{1,12})(?:\/(verification|retire|internal))?)?$/)
  if (!route) return reply({ error: 'Not found.' }, 404)
  const id = route[1] ? Number(route[1]) : null
  const now = new Date().toISOString()
  const visible = actor.side === 'staff' ? '' : " AND created_role='participant'"

  if (id === null && request.method === 'GET') {
    const rows = await db.prepare(`SELECT * FROM qualification_items WHERE reference=?${visible} ORDER BY retired_at IS NOT NULL, category, id`)
      .bind(reference).all<Record<string, unknown>>()
    const active = rows.results.filter((r) => !r.retired_at)
    return reply({ units: UNITS, items: rows.results.map((r) => present(r, actor.side)),
      completeness: actor.side === 'staff' ? completeness(active as never) : undefined })
  }
  const body = request.method === 'GET' ? null : await bodyObject(request)
  if (request.method !== 'GET' && !body) return reply({ error: 'Invalid request.' }, 400)

  if (id === null && request.method === 'POST') {
    const parsed = validateItem(body!, actor.side)
    if (!parsed.ok) return reply({ error: 'Check the highlighted fields.', fields: parsed.fields }, 422)
    if (parsed.item.evidenceId !== null && !await db.prepare('SELECT 1 FROM evidence WHERE id=? AND reference=?').bind(parsed.item.evidenceId, reference).first())
      return reply({ error: 'Check the highlighted fields.', fields: { evidenceId: 'That file is not part of this case.' } }, 422)
    const count = await db.prepare('SELECT COUNT(*) n FROM qualification_items WHERE reference=? AND retired_at IS NULL').bind(reference).first<{ n: number }>()
    if ((count?.n ?? 0) >= 200) return reply({ error: 'This case already has 200 active items. Retire outdated ones first.' }, 409)
    const row = await db.prepare(`INSERT INTO qualification_items (reference,${COLUMNS},created_by,created_role,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`)
      .bind(reference, ...binds(parsed.item), actor.email, actor.side, now, now).first<{ id: number }>()
    return reply({ id: row?.id }, 201)
  }

  if (id === null) return reply({ error: 'Method not allowed.' }, 405)
  const existing = await db.prepare(`SELECT * FROM qualification_items WHERE id=? AND reference=?${visible}`).bind(id, reference).first<Record<string, unknown>>()
  if (!existing) return reply({ error: 'Not found.' }, 404)
  if (existing.retired_at) return reply({ error: 'This item is retired.' }, 409)
  if (actor.side === 'participant' && existing.created_by !== actor.email) return reply({ error: 'You can change only items you added.' }, 403)

  if (route[2] === 'retire' && request.method === 'POST') {
    await db.prepare('UPDATE qualification_items SET retired_at=?,updated_at=? WHERE id=?').bind(now, now, id).run()
    return reply({ ok: true })
  }
  if (route[2] === 'internal' && request.method === 'POST') {
    // D11: a figure kept between the submitter and InThinks never reaches a brief.
    if (typeof body!.internalOnly !== 'boolean') return reply({ error: 'Say whether the figure is InThinks only.' }, 422)
    await db.prepare('UPDATE qualification_items SET internal_only=?,updated_at=? WHERE id=?').bind(body!.internalOnly ? 1 : 0, now, id).run()
    return reply({ ok: true })
  }
  if (route[2] === 'verification' && request.method === 'POST') {
    if (actor.side !== 'staff') return reply({ error: 'Not permitted.' }, 403)
    const state = body!.verification, note = textValue(body!.note, 500)
    if (!member(VERIFICATION, state)) return reply({ error: 'Choose a verification state.' }, 422)
    if (state === 'document_checked' && existing.evidence_id === null) return reply({ error: 'Link the supporting file before marking it document-checked.' }, 422)
    if (state === 'disputed' && !note) return reply({ error: 'Record why the value is disputed.' }, 422)
    await db.prepare('UPDATE qualification_items SET verification=?,verification_note=?,verified_by=?,verified_at=?,updated_at=? WHERE id=?')
      .bind(state, note || null, state === 'unverified' ? null : actor.email, state === 'unverified' ? null : now, now, id).run()
    return reply({ ok: true })
  }
  if (!route[2] && request.method === 'PUT') {
    const parsed = validateItem(body!, actor.side)
    if (!parsed.ok) return reply({ error: 'Check the highlighted fields.', fields: parsed.fields }, 422)
    if (parsed.item.evidenceId !== null && !await db.prepare('SELECT 1 FROM evidence WHERE id=? AND reference=?').bind(parsed.item.evidenceId, reference).first())
      return reply({ error: 'Check the highlighted fields.', fields: { evidenceId: 'That file is not part of this case.' } }, 422)
    // Any edit resets verification: what was checked was the previous value.
    await db.prepare(`UPDATE qualification_items SET ${COLUMNS.split(',').map((c) => `${c}=?`).join(',')},
      verification='unverified',verification_note=NULL,verified_by=NULL,verified_at=NULL,updated_at=? WHERE id=?`)
      .bind(...binds(parsed.item), now, id).run()
    return reply({ ok: true })
  }
  return reply({ error: 'Method not allowed.' }, 405)
}
