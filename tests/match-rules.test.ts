/**
 * Tests for the deterministic half of the match engine.
 *
 * Layer 1 and the identity guard need no API key, so they are the parts that
 * can be held to a real test rather than an assurance.
 */
import { prefilter } from '../worker/match-rules'
import type { ChallengeRecord, TechnologyRecord } from '../worker/match-rules'
import { assertNoIdentity } from '../worker/match-engine'

let failures = 0
const check = (name: string, condition: boolean, detail = '') => {
  if (condition) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const technology = (over: Partial<TechnologyRecord>): TechnologyRecord => ({
  reference: 'INT-2026-0001',
  title: 'Thermal barrier coating',
  category: 'Advanced Materials',
  entryTrl: 3,
  currentTrl: 5,
  targetTrl: 8,
  status: 'Qualified',
  acquisitionStage: 'Development Portfolio',
  summary: 'A coating that reduces radiant heat loss from furnace shells.',
  problem: 'Radiant thermal loss raises fuel consumption in high-temperature processes.',
  principle: 'A low-emissivity ceramic layer applied to the hot face.',
  applications: 'Furnaces, kilns, process heaters',
  industries: ['Manufacturing', 'Energy'],
  ...over,
})

const challenge: ChallengeRecord = {
  reference: 'CH-2026-0001',
  title: 'Radiant heat loss on kiln shell',
  sector: 'Manufacturing',
  statement: 'Radiant thermal loss along the kiln shell raises fuel consumption and creates a hot-surface hazard.',
  currentSolution: 'Conventional insulation blanket, replaced annually.',
  success: 'Reduced shell temperature and lower fuel consumption.',
  performance: 'Must survive continuous operation at furnace temperatures.',
  constraints: 'Applied during a short annual shutdown.',
  impacts: ['Energy consumption', 'Safety'],
  desiredTrl: 'TRL 7–9 — deployment ready',
}

console.log('\nprefilter')

{
  const [top] = prefilter(challenge, [
    technology({}),
    technology({
      reference: 'INT-2026-0002',
      title: 'Water recovery membrane',
      summary: 'Separates dissolved solids from process effluent.',
      problem: 'Effluent discharge limits constrain production.',
      principle: 'Selective membrane separation.',
      applications: 'Effluent treatment',
      industries: ['Chemicals'],
    }),
  ])
  check('ranks the topically relevant technology first', top.technology.reference === 'INT-2026-0001', top.technology.reference)
  check('explains why, in signals a person can argue with', top.signals.length > 0, JSON.stringify(top.signals))
  check('reports the sector match', top.signals.some((s) => s.includes('Manufacturing')))
}

{
  const results = prefilter(challenge, [technology({ status: 'Archived' })])
  check('excludes archived technologies entirely', results.length === 0, `got ${results.length}`)
}

{
  // A readiness gap must not exclude — closing it is what the pipeline is for.
  const results = prefilter(challenge, [technology({ currentTrl: 2 })])
  check('keeps a low-TRL technology as a candidate', results.length === 1)
  check(
    'reports the readiness gap to the reviewer',
    results[0].signals.some((s) => s.includes('below the requested level')),
    JSON.stringify(results[0].signals),
  )
}

{
  const near = prefilter(challenge, [technology({ currentTrl: 5 })])[0]
  const far = prefilter(challenge, [technology({ currentTrl: 2 })])[0]
  check('ranks a readier technology above a less ready one', near.affinity > far.affinity,
    `${near.affinity.toFixed(3)} vs ${far.affinity.toFixed(3)}`)
}

{
  const off = prefilter(challenge, [technology({ industries: ['Agriculture'] })])[0]
  const on = prefilter(challenge, [technology({})])[0]
  check('sector alignment raises the ranking', on.affinity > off.affinity)
}

{
  const affinities = prefilter(challenge, [technology({}), technology({ reference: 'INT-2026-0003' })])
    .map((c) => c.affinity)
  check('affinity stays within 0–1', affinities.every((a) => a >= 0 && a <= 1), JSON.stringify(affinities))
}

console.log('\nidentity guard')

{
  let threw = false
  try { assertNoIdentity('Contact the inventor at priya@iitb.example for details.') } catch { threw = true }
  check('refuses a prompt containing an email address', threw)
}
{
  let threw = false
  try { assertNoIdentity('Reach them on +91 90000 00000.') } catch { threw = true }
  check('refuses a prompt containing a phone number', threw)
}
{
  let threw = false
  try { assertNoIdentity('See linkedin.com/in/someone for background.') } catch { threw = true }
  check('refuses a prompt containing a LinkedIn URL', threw)
}
{
  let threw = false
  try {
    assertNoIdentity('<technology reference="INT-2026-0001"><principle>A low-emissivity ceramic layer.</principle></technology>')
  } catch { threw = true }
  check('allows an ordinary technical prompt', !threw)
}

console.log(failures === 0 ? '\nAll match-engine unit tests passed.\n' : `\n${failures} test(s) failed.\n`)
process.exit(failures === 0 ? 0 : 1)
