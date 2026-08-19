/**
 * Tests for the sunrise arithmetic.
 *
 * Checked against published times for real places and dates. The tolerance is
 * four minutes, which is roughly the precision this algorithm claims and far
 * finer than a colour scheme can express — the point of the tests is that the
 * answers are right to within a few minutes, not that they are exact to the
 * second.
 */
import { dayOfYear, isDaylight, sunTimes } from '../worker/daylight'

let failures = 0
const check = (name: string, condition: boolean, detail = '') => {
  if (condition) console.log(`  ✓ ${name}`)
  else { failures++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}
const hhmm = (m: number | null) =>
  m === null ? '—' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`
const near = (got: number | null, wantH: number, wantM: number, tol = 4) =>
  got !== null && Math.abs(got - (wantH * 60 + wantM)) <= tol

console.log('\nday of year')
check('1 January is day 1', dayOfYear(new Date(Date.UTC(2026, 0, 1))) === 1)
check('31 December is day 365', dayOfYear(new Date(Date.UTC(2026, 11, 31))) === 365)
check('a leap year has 366', dayOfYear(new Date(Date.UTC(2028, 11, 31))) === 366)

console.log('\nsunrise and sunset, in UTC')
// London, 21 June 2026 — published 03:43 / 20:21 UTC.
const london = sunTimes(51.5074, -0.1278, new Date(Date.UTC(2026, 5, 21)))
check('London midsummer sunrise 03:43', near(london.sunriseUtcMin, 3, 43), hhmm(london.sunriseUtcMin))
check('London midsummer sunset 20:21', near(london.sunsetUtcMin, 20, 21), hhmm(london.sunsetUtcMin))

// Delhi, 21 December 2026 — 07:10 / 17:29 IST, which is 01:40 / 11:59 UTC.
const delhi = sunTimes(28.6139, 77.2090, new Date(Date.UTC(2026, 11, 21)))
check('Delhi midwinter sunrise 01:40 UTC', near(delhi.sunriseUtcMin, 1, 40), hhmm(delhi.sunriseUtcMin))
check('Delhi midwinter sunset 11:59 UTC', near(delhi.sunsetUtcMin, 11, 59), hhmm(delhi.sunsetUtcMin))

// The equator barely varies across the year.
const eqJun = sunTimes(0, 0, new Date(Date.UTC(2026, 5, 21)))
const eqDec = sunTimes(0, 0, new Date(Date.UTC(2026, 11, 21)))
const len = (t: typeof eqJun) => (t.sunsetUtcMin! - t.sunriseUtcMin! + 1440) % 1440
check('equator day length is ~12h in June', Math.abs(len(eqJun) - 720) < 15, String(len(eqJun)))
check('equator day length is ~12h in December', Math.abs(len(eqDec) - 720) < 15, String(len(eqDec)))

// The southern hemisphere runs opposite.
const sydJun = sunTimes(-33.8688, 151.2093, new Date(Date.UTC(2026, 5, 21)))
const sydDec = sunTimes(-33.8688, 151.2093, new Date(Date.UTC(2026, 11, 21)))
check('Sydney days are shorter in June than December', len(sydJun) < len(sydDec),
  `${len(sydJun)} vs ${len(sydDec)}`)

console.log('\nthe poles, where there is no sunrise to find')
check('Tromso has polar night in December',
  sunTimes(69.6492, 18.9553, new Date(Date.UTC(2026, 11, 21))).kind === 'polar-night')
check('Tromso has polar day in June',
  sunTimes(69.6492, 18.9553, new Date(Date.UTC(2026, 5, 21))).kind === 'polar-day')
check('polar night reports no times',
  sunTimes(69.6492, 18.9553, new Date(Date.UTC(2026, 11, 21))).sunriseUtcMin === null)
check('London is never polar', sunTimes(51.5074, -0.1278, new Date(Date.UTC(2026, 11, 21))).kind === 'normal')

console.log('\nis it light out')
check('noon in London midsummer is daylight', isDaylight(london, 12 * 60))
check('03:00 in London midsummer is not', !isDaylight(london, 3 * 60))
check('polar day is always daylight',
  isDaylight({ kind: 'polar-day', sunriseUtcMin: null, sunsetUtcMin: null }, 3 * 60))
check('polar night never is',
  !isDaylight({ kind: 'polar-night', sunriseUtcMin: null, sunsetUtcMin: null }, 12 * 60))

// The case a naive comparison gets wrong: the daylight window crossing
// midnight UTC, which it does anywhere far enough east.
const wrapped = { kind: 'normal' as const, sunriseUtcMin: 22 * 60, sunsetUtcMin: 8 * 60 }
check('a window crossing midnight is light at 23:00', isDaylight(wrapped, 23 * 60))
check('a window crossing midnight is light at 02:00', isDaylight(wrapped, 2 * 60))
check('a window crossing midnight is dark at 12:00', !isDaylight(wrapped, 12 * 60))
check('Auckland in December is light at its local noon',
  isDaylight(sunTimes(-36.8485, 174.7633, new Date(Date.UTC(2026, 11, 21))), 0))

if (failures > 0) {
  console.log(`\n${failures} daylight test(s) failed.`)
  process.exit(1)
}
console.log('\nAll daylight unit tests passed.')
