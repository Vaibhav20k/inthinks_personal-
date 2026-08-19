/**
 * Tests for the royalty arithmetic.
 *
 * Three things here are computed rather than stored — what is owed, when the
 * next statement is due, and whether a year met its minimum — so each one is a
 * place where a quiet error becomes a licence dispute. They are held to exact
 * values.
 */
import {
  addMonths, dayBefore, dueFor, nextReporting, periodCount, royaltyYears,
  schedule, settlementOf, REPORTING_PERIODS,
} from '../worker/royalties'

let failures = 0
const check = (name: string, condition: boolean, detail = '') => {
  if (condition) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('\ndate arithmetic')
check('adds a month', addMonths('2026-01-15', 1) === '2026-02-15')
check('crosses a year', addMonths('2026-11-01', 3) === '2027-02-01')
// Date would roll 31 Jan + 1 month to 3 March and drift the whole schedule.
check('clamps 31 January to the end of February', addMonths('2026-01-31', 1) === '2026-02-28')
check('clamps into a leap February', addMonths('2028-01-31', 1) === '2028-02-29')
check('clamps 31 March to 30 April', addMonths('2026-03-31', 1) === '2026-04-30')
check('does not drift over four such steps',
  addMonths(addMonths(addMonths(addMonths('2026-01-31', 1), 1), 1), 1) === '2026-05-28',
  addMonths(addMonths(addMonths(addMonths('2026-01-31', 1), 1), 1), 1))
check('adds twelve months', addMonths('2026-04-30', 12) === '2027-04-30')
check('day before a month start', dayBefore('2026-04-01') === '2026-03-31')
check('day before a year start', dayBefore('2027-01-01') === '2026-12-31')
check('day before 1 March in a leap year', dayBefore('2028-03-01') === '2028-02-29')

console.log('\nschedule')
const quarterly = schedule('2026-10-01', 24, 'Quarterly')
check('covers the term in quarters', quarterly.length === 8)
check('first period is a full quarter',
  quarterly[0].start === '2026-10-01' && quarterly[0].end === '2026-12-31')
check('second period follows without a gap', quarterly[1].start === '2027-01-01')
check('last period ends with the term',
  quarterly[7].end === '2028-09-30', quarterly[7].end)
check('periods never overlap',
  quarterly.every((p, i) => i === 0 || p.start > quarterly[i - 1].end))
check('sequence numbers are 1..n',
  quarterly.every((p, i) => p.seq === i + 1))

// A term that is not a whole number of periods still reports its tail.
const stub = schedule('2026-01-01', 14, 'Quarterly')
check('a part period still gets a row', stub.length === 5)
check('the part period stops at the term end', stub[4].end === '2027-02-28', stub[4].end)
check('rounds part periods up', periodCount(14, 3) === 5 && periodCount(12, 3) === 4)

const monthly = schedule('2026-01-31', 3, 'Monthly')
check('a month-end term does not drift',
  monthly.map((p) => p.start).join(' ') === '2026-01-31 2026-02-28 2026-03-31',
  monthly.map((p) => p.start).join(' '))
check('every frequency is a whole number of months',
  Object.values(REPORTING_PERIODS).every((n) => Number.isInteger(n) && n > 0))

console.log('\nwhat is owed')
// 5.25% of 1,024.09 is 53.764725 — the stored answer must be exact, and rounded once.
check('a percentage of a reported amount', dueFor('Revenue-based', 525, null, 102_409, null) === 5376)
check('savings work the same way', dueFor('Savings-based', 1000, null, 500_000, null) === 50_000)
check('units multiply, they do not take a percentage',
  dueFor('Unit-based', null, 250, null, 1200) === 300_000)
check('a unit rate ignores any percentage rate',
  dueFor('Unit-based', 525, 250, 999_999, 4) === 1000)
check('nothing reported owes nothing', dueFor('Revenue-based', 525, null, null, null) === 0)
check('no rate owes nothing', dueFor('Revenue-based', null, null, 102_409, null) === 0)
check('zero reported owes zero', dueFor('Revenue-based', 525, null, 0, null) === 0)
check('the result is always a whole minor unit',
  Number.isInteger(dueFor('Revenue-based', 333, null, 100_001, null)))

console.log('\nsettlement is derived from the amounts')
check('unpaid', settlementOf(5000, 0, 0) === 'Unpaid')
check('part paid', settlementOf(5000, 0, 2000) === 'Part paid')
check('settled', settlementOf(5000, 0, 5000) === 'Settled')
check('settled including an adjustment', settlementOf(5000, 1000, 6000) === 'Settled')
check('an adjustment can leave it part paid', settlementOf(5000, 1000, 5000) === 'Part paid')
check('overpaid', settlementOf(5000, 0, 6000) === 'Overpaid')
check('nothing due', settlementOf(0, 0, 0) === 'Nothing due')

console.log('\nnext statement due')
const period = (end: string, statement: string | null, status = 'Awaiting statement') =>
  ({ period_end: end, statement_received: statement, status, reported_minor: null, reported_units: null })
check('the earliest unreported period sets the date',
  nextReporting([period('2026-12-31', '2027-01-10'), period('2027-03-31', null)], '2027-02-01').date === '2027-03-31')
check('not yet overdue',
  nextReporting([period('2027-03-31', null)], '2027-02-01').overdue === false)
check('overdue once the date has passed',
  nextReporting([period('2027-03-31', null)], '2027-04-05').overdue === true)
check('counts every overdue period',
  nextReporting([period('2026-12-31', null), period('2027-03-31', null)], '2027-04-05').overdueCount === 2)
check('a waived period is not owed',
  nextReporting([period('2026-12-31', null, 'Waived'), period('2027-03-31', null)], '2027-01-05').date === '2027-03-31')
check('nothing outstanding returns no date',
  nextReporting([period('2026-12-31', '2027-01-10')], '2027-04-05').date === null)
// A figure entered without its statement date still discharges the obligation.
check('a reported figure counts as reported',
  nextReporting(
    [{ ...period('2026-12-31', null), reported_minor: 500_000 }, period('2027-03-31', null)],
    '2027-01-05',
  ).date === '2027-03-31')
check('reported units count too',
  nextReporting([{ ...period('2026-12-31', null), reported_units: 40 }], '2027-04-05').date === null)
check('a zero figure is still a figure',
  nextReporting([{ ...period('2026-12-31', null), reported_minor: 0 }], '2027-04-05').date === null)

console.log('\nminimum annual royalty')
const p = (start: string, end: string, due: number, paid = 0, statement: string | null = '2027-01-01') =>
  ({ period_start: start, period_end: end, due_minor: due, adjustment_minor: 0, paid_minor: paid,
     statement_received: statement, status: 'Statement received',
     reported_minor: null as number | null, reported_units: null as number | null })

const year1 = royaltyYears('2026-10-01', 100_000, [
  p('2026-10-01', '2026-12-31', 20_000),
  p('2027-01-01', '2027-03-31', 25_000),
  p('2027-04-01', '2027-06-30', 20_000),
  p('2027-07-01', '2027-09-30', 20_000),
])
check('groups four quarters into one royalty year', year1.length === 1)
check('the year runs from the term start anniversary',
  year1[0].from === '2026-10-01' && year1[0].to === '2027-09-30')
check('sums what the year earned', year1[0].dueMinor === 85_000)
check('reports the shortfall against the minimum', year1[0].shortfallMinor === 15_000)

const met = royaltyYears('2026-10-01', 100_000, [
  p('2026-10-01', '2026-12-31', 60_000),
  p('2027-01-01', '2027-03-31', 60_000),
])
check('no shortfall once the minimum is exceeded', met[0].shortfallMinor === 0)

// The rule that matters: an unreported quarter is not a zero.
const open = royaltyYears('2026-10-01', 100_000, [
  p('2026-10-01', '2026-12-31', 20_000),
  p('2027-01-01', '2027-03-31', 0, 0, null),
])
check('an open year is marked open', open[0].complete === false)
check('an open year claims no shortfall', open[0].shortfallMinor === 0)

const figureOnly = royaltyYears('2026-10-01', 100_000, [
  { ...p('2026-10-01', '2026-12-31', 20_000, 0, null), reported_minor: 400_000 },
])
check('a figure without a statement date still closes the period', figureOnly[0].complete === true)

const waived = royaltyYears('2026-10-01', 100_000, [
  { ...p('2026-10-01', '2026-12-31', 20_000, 0, null), status: 'Waived' },
])
check('a waived period does not hold the year open', waived[0].complete === true)

check('no minimum means no year rows', royaltyYears('2026-10-01', null, [p('2026-10-01', '2026-12-31', 1)]).length === 0)

if (failures > 0) {
  console.log(`\n${failures} royalty test(s) failed.`)
  process.exit(1)
}
console.log('\nAll royalty unit tests passed.')
