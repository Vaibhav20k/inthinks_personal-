/**
 * Tests for what may reach the public site.
 *
 * The identity guard is the promise this platform makes to innovators, so it
 * is held to both halves of the job: it must catch identity in prose, and it
 * must not refuse ordinary technical writing that happens to contain a common
 * word.
 */
import {
  DOMAINS, PUBLIC_STAGES, STAGE_TO_PUBLIC, domainFor, identityLeak, isSlug,
  parseList, publicStage, publicTechnology, toSlug,
} from '../worker/portfolio'
import { DEVELOPMENT_STAGES } from '../worker/development'

let failures = 0
const check = (name: string, condition: boolean, detail = '') => {
  if (condition) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const identity = {
  innovator_name: 'Rose Nadar',
  innovator_email: 'rose.nadar@example.ac.in',
  institution: 'Coastal Institute of Technology',
}

console.log('\nidentity guard — what it catches')
check('the innovator by name', identityLeak('Developed with Rose Nadar at pilot scale.', identity) !== null)
check('the innovator regardless of case', identityLeak('work by ROSE NADAR', identity) !== null)
check('the source institution', identityLeak('Originated at Coastal Institute of Technology.', identity) !== null)
check('an email address, any address', identityLeak('Contact team@somewhere.org for data.', identity) !== null)
check('the record’s own email', identityLeak('rose.nadar@example.ac.in', identity) !== null)
check('a phone number', identityLeak('Call +91 98765 43210 to discuss.', identity) !== null)
check('a bare ten-digit number', identityLeak('reach us on 9876543210', identity) !== null)
check('a personal profile link', identityLeak('See the LinkedIn profile for detail.', identity) !== null)
check('a name at the very start', identityLeak('Rose Nadar led the work.', identity) !== null)
check('a name at the very end', identityLeak('The work was led by Rose Nadar', identity) !== null)
check('a name in punctuation', identityLeak('(Rose Nadar, 2026)', identity) !== null)

console.log('\nidentity guard — what it must not catch')
// The failure mode that would make the guard unusable: a name that is a
// substring of ordinary words.
check('prose containing the name as a substring',
  identityLeak('A porous coating reduces thermal loss. Prose about roses.', identity) === null,
  String(identityLeak('A porous coating reduces thermal loss. Prose about roses.', identity)))
check('an ordinary technical brief',
  identityLeak(
    'A thermal barrier coating for reheating furnaces. Validated across two campaigns at 8% measured fuel saving.',
    identity,
  ) === null)
check('a TRL figure is not a phone number',
  identityLeak('Moved from TRL 3 to TRL 6 over 18 months.', identity) === null)
check('a year is not a phone number', identityLeak('Filed in 2026.', identity) === null)
check('a nine-digit figure is not a phone number',
  identityLeak('Throughput reached 123456789 units.', identity) === null)
check('an empty identity blocks nothing',
  identityLeak('Ordinary text.', { innovator_name: null, innovator_email: null, institution: null }) === null)
check('a one-letter name is not used as a filter',
  identityLeak('An efficient process.', { innovator_name: 'A', innovator_email: null, institution: null }) === null)

console.log('\nslugs')
check('lowercases and hyphenates', toSlug('Advanced Thermal Management Material') === 'advanced-thermal-management-material')
check('collapses punctuation', toSlug('Low-grade  heat, recovery!') === 'low-grade-heat-recovery')
check('trims stray hyphens', toSlug('  --Coating--  ') === 'coating')
check('accepts a clean slug', isSlug('thermal-barrier-coating'))
check('refuses uppercase', !isSlug('Thermal-Coating'))
check('refuses a leading hyphen', !isSlug('-coating'))
check('refuses a double hyphen', !isSlug('thermal--coating'))
check('refuses a path traversal', !isSlug('../admin'))
check('refuses something too short', !isSlug('ab'))

console.log('\nderived fields')
check('every working stage has a public reading',
  DEVELOPMENT_STAGES.every((s) => STAGE_TO_PUBLIC[s] !== undefined),
  DEVELOPMENT_STAGES.filter((s) => !STAGE_TO_PUBLIC[s]).join(', '))
check('every public reading is in the public vocabulary',
  Object.values(STAGE_TO_PUBLIC).every((s) => (PUBLIC_STAGES as readonly string[]).includes(s)))
check('an unknown stage reads as under evaluation', publicStage('Nonsense') === 'Under Evaluation')
check('a missing stage reads as under evaluation', publicStage(null) === 'Under Evaluation')
check('a category maps to its domain code', domainFor('Advanced Materials').code === 'MAT')
check('an unknown category still yields a code', domainFor('Something else').code === 'MAT')
check('every domain code is three letters', DOMAINS.every((d) => /^[A-Z]{3}$/.test(d.code)))

console.log('\nserialising')
check('a malformed list reads as empty', parseList('not json').length === 0)
check('a non-array reads as empty', parseList('{"a":1}').length === 0)
check('non-strings are dropped from a list', parseList('["a",2,null,"b"]').join(',') === 'a,b')
check('a null list reads as empty', parseList(null).length === 0)

const serialised = publicTechnology({
  reference: 'INT-2026-0001', slug: 'coating', name: 'Coating', category: 'Energy',
  thesis: 't', problem: 'p', principle: 'h', why_it_matters: 'w', validation: 'v',
  applications: '["Furnaces"]', sectors: '["Energy"]', outcomes: '["thermal"]',
  next_milestones: '[]', ip_status: 'Rights Secured', transfer_status: 'Transfer Ready',
  entry_trl: 3, current_trl: 6, target_trl: 8, development_stage: 'Pilot',
  // Everything below must not survive serialisation.
  innovator_name: 'Rose Nadar', innovator_email: 'rose.nadar@example.ac.in',
  institution: 'Coastal Institute of Technology', payload: '{"secret":true}',
  reviewer: 'someone@inthinks.com', acquisition_stage: 'Rights Secured',
})
const json = JSON.stringify(serialised)
check('the innovator does not survive serialisation', !json.includes('Rose Nadar'))
check('the email does not survive', !json.includes('rose.nadar'))
check('the institution does not survive', !json.includes('Coastal Institute'))
check('the raw submission payload does not survive', !json.includes('secret'))
check('the internal reviewer does not survive', !json.includes('inthinks.com'))
check('the acquisition stage does not survive', !json.includes('acquisition'))
check('the working stage is translated, not passed through',
  serialised.stage === 'Validation' && !json.includes('Pilot'))
check('TRLs come through as numbers',
  serialised.entryTrl === 3 && serialised.currentTrl === 6 && serialised.targetTrl === 8)
check('the domain is resolved from the category',
  serialised.domain === 'Energy' && serialised.domainCode === 'ENR')

if (failures > 0) {
  console.log(`\n${failures} portfolio test(s) failed.`)
  process.exit(1)
}
console.log('\nAll portfolio unit tests passed.')
