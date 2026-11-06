/**
 * Tests for the intake outbox and idempotency rules (Phase 1).
 *
 * The receipt is the one message a submitter is sure to read, so these hold
 * it to the confidentiality rule: it carries a reference, never content.
 */
import { MAX_ATTEMPTS, backoffMinutes, receiptText, submissionOutbox } from '../worker/outbox'
import { readIdempotencyKey } from '../worker/intake'

let failures = 0
const check = (name: string, condition: boolean, detail = '') => {
  if (condition) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const withKey = (key: string | null) =>
  new Request('https://x.test/api/challenges', key === null ? {} : { headers: { 'idempotency-key': key } })

console.log('\nbackoff')
check('first retry after 1 minute', backoffMinutes(0) === 1)
check('doubles each attempt', backoffMinutes(3) === 8)
check('caps at six hours', backoffMinutes(20) === 360)
check('never negative', backoffMinutes(-4) === 1)
check('gives up after a bounded number of attempts', MAX_ATTEMPTS > 1 && MAX_ATTEMPTS <= 12)

console.log('\noutbox rows')
const rows = submissionOutbox('challenge', 'a@b.test', { company: 'Acme', sector: 'Energy' })
check('a submission with an email queues a receipt and a notice', rows.length === 2)
check('the receipt goes first', rows[0].kind === 'ack_email')
check('the notice carries the kind', rows[1].payload.kind === 'challenge')
check('without an email only the notice is queued', submissionOutbox('message', '', {}).length === 1)

console.log('\nreceipt text')
const text = receiptText('innovation', 'INT-2026-0042')
check('quotes the reference', text.includes('INT-2026-0042'))
check('names the kind of submission', text.includes('innovation submission'))
check('says it does not contain the submission', text.includes('does not contain'))

console.log('\nidempotency key')
const none = readIdempotencyKey(withKey(null))
check('absent is allowed', none.ok && none.value === null)
const uuid = readIdempotencyKey(withKey('6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f'))
check('a UUID is accepted', uuid.ok && uuid.value === '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f')
check('too short is refused', !readIdempotencyKey(withKey('abc')).ok)
check('injection characters are refused', !readIdempotencyKey(withKey("x' OR 1=1 --aaaaaaaaaa")).ok)
check('over 64 characters is refused', !readIdempotencyKey(withKey('a'.repeat(65))).ok)

if (failures > 0) {
  console.log(`\n${failures} outbox test(s) failed.`)
  process.exit(1)
}
console.log('All outbox unit tests passed.')
