import assert from 'node:assert/strict'
import {
  DEFAULT_SETTINGS, energySaving, improvement, installCost, moneyAtStake, payback, priority, validateSettings, yearlySaving, type Figure,
} from '../worker/economics'

let checks = 0
const ok = (label: string, fn: () => void) => { fn(); checks++; console.log(`  ✓ ${label}`) }
let id = 0
const fig = (over: Partial<Figure>): Figure => ({ id: ++id, category: 'cost', label: 'x', comparator: null, value: null, valueMax: null,
  baseline: null, unit: null, currency: 'EUR', period: 'per_year', attributionPct: 100, verification: 'unverified', ...over })
const s = DEFAULT_SETTINGS
const target = (value: number, over: Partial<Figure> = {}) =>
  fig({ category: 'success_criterion', label: 'Improvement needed', comparator: 'gte', value, unit: '%', currency: null, period: null, attributionPct: null, ...over })

ok('monthly costs count twelve times, share applied', () => {
  const r = moneyAtStake([fig({ value: 1000, period: 'per_month', attributionPct: 50, verification: 'independently_verified' })], s)
  assert.deepEqual(r.totals, [{ currency: 'EUR', low: 6000, high: 6000 }])
})

ok('one-off and per-unit costs are not yearly money at stake', () => {
  const r = moneyAtStake([fig({ value: 5000, period: 'one_off' }), fig({ value: 3, period: 'per_unit' })], s)
  assert.deepEqual(r.totals, []); assert.equal(r.notes.length, 2)
})

ok('currencies are totalled apart, never converted', () => {
  const r = moneyAtStake([fig({ value: 100 }), fig({ value: 200, currency: 'INR' }), fig({ value: 50 })], s)
  assert.deepEqual(r.totals.map((t) => [t.currency, t.high]), [['EUR', 150], ['INR', 200]])
})

ok('a percentage target with a baseline is an absolute rate, not an improvement', () => {
  assert.equal(improvement([target(2, { comparator: 'lte', baseline: 8 })], s), null)
  assert.equal(improvement([target(2, { baseline: 8 })], s), null)
})

ok('a range target gives a low and high improvement', () => {
  const r = improvement([target(10, { comparator: 'between', valueMax: 20 })], s)!
  assert.deepEqual([r.low, r.high], [0.1, 0.2])
})

ok('saving takes the weakest input on the low end', () => {
  const r = yearlySaving([fig({ value: 100000, verification: 'independently_verified' }), target(10, { verification: 'participant_confirmed' })], s)
  assert.deepEqual(r.totals, [{ currency: 'EUR', low: 7000, high: 10000 }])
})

ok('energy line needs a price and stays off by default', () => {
  const figures = [fig({ category: 'measurement', value: 2, unit: 'MWh/year', currency: null, period: null }), target(10)]
  assert.equal(energySaving(figures, s), null)
  const r = energySaving(figures, { ...s, energyPrice: 0.2 })!
  assert.deepEqual([r.kWhPerYear, r.low, r.high], [2000, 20, 40])
})

ok('payback divides install cost by saving, best and worst', () => {
  assert.deepEqual(payback([{ currency: 'EUR', low: 5000, high: 10000 }], [{ currency: 'EUR', amount: 20000 }]),
    { status: 'ok', currency: 'EUR', install: 20000, bestYears: 2, worstYears: 4 })
})

ok('payback refuses to compare different currencies', () => {
  assert.equal(payback([{ currency: 'EUR', low: 1, high: 2 }], [{ currency: 'USD', amount: 5 }]).status, 'currency_mismatch')
  assert.equal(payback([], [{ currency: 'USD', amount: 5 }]).status, 'no_saving')
  assert.equal(payback([{ currency: 'EUR', low: 1, high: 2 }], []).status, 'no_install_cost')
})

ok('install cost sums one-off costs and skips disputed ones', () => {
  const r = installCost([fig({ value: 1000, period: 'one_off' }), fig({ value: 500, period: 'one_off', verification: 'disputed' })])
  assert.deepEqual(r.totals, [{ currency: 'EUR', amount: 1000 }])
})

ok('priority needs a cost and an improvement', () => {
  assert.equal(priority([target(10)], s, { checklistMissing: 0, bestMatch: null }).label, 'Not enough data')
})

ok('hot needs value as well as points', () => {
  const small = [fig({ value: 100, verification: 'independently_verified' }), target(10, { verification: 'independently_verified' })]
  const p = priority(small, { ...s, hotScore: 3 }, { checklistMissing: 0, bestMatch: 'Strong Match' })
  assert.deepEqual([p.score, p.label], [3, 'Warm'])
})

ok('foreign-currency problem is not ranked by value', () => {
  const p = priority([fig({ value: 9e9, currency: 'INR' }), target(10)], s, { checklistMissing: null, bestMatch: null })
  assert.equal(p.label, 'Not yet'); assert.ok(p.reasons[0].includes('not converted'))
})

ok('settings validation keeps trust in order and thresholds sensible', () => {
  assert.equal(validateSettings({ ...s }).ok, true)
  const bad = validateSettings({ ...s, currency: 'euro', warmScore: 4, trust: { ...s.trust, unverified: 2 } })
  assert.equal(bad.ok, false)
  if (!bad.ok) assert.deepEqual(Object.keys(bad.fields).sort(), ['currency', 'trust.unverified', 'warmScore'])
})

console.log(`All ${checks} economics unit tests passed.`)
