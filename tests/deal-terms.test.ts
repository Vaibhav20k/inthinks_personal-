/**
 * Tests for the deal room's term arithmetic and its gate.
 *
 * Money and rates are the part of this platform where a rounding error is a
 * real-world dispute, so the parsers are held to exact integers rather than to
 * "close enough".
 */
import {
  DEAL_ELIGIBLE_STAGES, isCurrency, parseAmountMinor, parseRateBp,
} from '../worker/deals'
import { OPPORTUNITY_STAGES } from '../worker/opportunities'

let failures = 0
const check = (name: string, condition: boolean, detail = '') => {
  if (condition) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('\nmoney')
check('reads a whole amount', parseAmountMinor('250000') === 25_000_000)
check('reads two decimal places exactly', parseAmountMinor('1234.56') === 123_456)
check('reads one decimal place as tenths', parseAmountMinor('10.5') === 1050)
check('tolerates thousands separators', parseAmountMinor('1,250,000.00') === 125_000_000)
check('treats an empty value as unset', parseAmountMinor('') === null)
check('treats null as unset', parseAmountMinor(null) === null)
check('refuses three decimal places', parseAmountMinor('1.005') === 'invalid')
check('refuses a negative amount', parseAmountMinor('-100') === 'invalid')
check('refuses a currency symbol', parseAmountMinor('$100') === 'invalid')
check('refuses text', parseAmountMinor('a lot') === 'invalid')
check('refuses a fractional number', parseAmountMinor(10.5) === 'invalid')
check('accepts an integer count of minor units', parseAmountMinor(1050) === 1050)

// The reason the parser exists at all. 1024.09 * 100 is 102408.99999999999,
// so anything that multiplies and truncates is a cent short on a real amount.
check(
  'is exact where the float path is not',
  parseAmountMinor('1024.09') === 102_409 && !Number.isInteger(1024.09 * 100),
  `1024.09 * 100 = ${1024.09 * 100}`,
)

console.log('\nroyalty rate')
check('reads a whole percentage', parseRateBp('5') === 500)
check('reads a fractional percentage exactly', parseRateBp('5.25') === 525)
check('reads zero', parseRateBp('0') === 0)
check('accepts exactly 100 per cent', parseRateBp('100') === 10_000)
check('refuses more than 100 per cent', parseRateBp('101') === 'invalid')
check('refuses a negative rate', parseRateBp('-1') === 'invalid')
check('refuses three decimal places', parseRateBp('1.005') === 'invalid')
check('treats an empty value as unset', parseRateBp('') === null)

console.log('\ncurrency')
check('accepts an ISO 4217 code', isCurrency('INR') && isCurrency('EUR'))
check('refuses lowercase', !isCurrency('inr'))
check('refuses a symbol', !isCurrency('₹'))
check('refuses the wrong length', !isCurrency('RUPEE'))

console.log('\ndeal room gate')
check('opens at commercial negotiation', DEAL_ELIGIBLE_STAGES[0] === 'Commercial Negotiation')
check(
  'excludes every earlier pipeline stage',
  ['Match Approved', 'Industry Presentation', 'Technical Discussion', 'Pilot / Validation']
    .every((stage) => !(DEAL_ELIGIBLE_STAGES as readonly string[]).includes(stage)),
)
check(
  'includes transfer and royalty monitoring',
  (DEAL_ELIGIBLE_STAGES as readonly string[]).includes('Technology Transfer') &&
    (DEAL_ELIGIBLE_STAGES as readonly string[]).includes('Post-Transfer Royalty Monitoring'),
)
check(
  'is a suffix of the opportunity stages',
  DEAL_ELIGIBLE_STAGES.every((stage, i) =>
    OPPORTUNITY_STAGES[OPPORTUNITY_STAGES.length - DEAL_ELIGIBLE_STAGES.length + i] === stage),
)

if (failures > 0) {
  console.log(`\n${failures} deal-term test(s) failed.`)
  process.exit(1)
}
console.log('\nAll deal-term unit tests passed.')
