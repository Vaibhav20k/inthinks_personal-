import assert from 'node:assert/strict'
import { sectors } from '../src/data/taxonomy'
import { FORM_SECTORS, checklistFor, sectorKey } from '../worker/intake-checklist'
import { UNITS } from '../worker/qualification'

let checks = 0
const ok = (label: string, fn: () => void) => { fn(); checks++; console.log(`  ✓ ${label}`) }

ok('every form sector has a checklist mapping', () => {
  for (const sector of sectors) assert.ok(FORM_SECTORS[sector], `${sector} is not mapped`)
})

ok('no form sector falls back to the general list', () => {
  for (const sector of sectors) assert.notEqual(checklistFor('challenge', sector).sector, 'default', sector)
})

ok('free text still finds a sector', () => {
  assert.equal(sectorKey('Ceramic manufacturing'), 'manufacturing')
  assert.equal(sectorKey('Municipal wastewater'), 'water')
  assert.equal(sectorKey('Something unrelated'), 'default')
})

ok('every checklist unit is in the step-6 catalogue', () => {
  for (const kind of ['challenge', 'innovation'] as const)
    for (const sector of [...sectors, 'water', 'food', 'default'])
      for (const item of checklistFor(kind, sector).items)
        for (const unit of item.units) assert.ok(Object.hasOwn(UNITS, unit), `${kind}/${sector}/${item.key}: ${unit}`)
})

ok('every problem limit has a solution figure in the same unit', () => {
  // Matching compares a problem's limit with a solution's measurement unit for
  // unit; a limit no solution can state can never be checked.
  for (const sector of sectors) {
    const offered = new Set(checklistFor('innovation', sector).items.flatMap((i) => i.units))
    for (const item of checklistFor('challenge', sector).items)
      if (item.category === 'constraint') assert.ok(item.units.some((u) => offered.has(u)), `${sector}: ${item.label}`)
  }
})

ok('checklist keys are unique within each list', () => {
  for (const kind of ['challenge', 'innovation'] as const)
    for (const sector of [...sectors, 'water', 'food', 'default']) {
      const keys = checklistFor(kind, sector).items.map((i) => i.key)
      assert.equal(new Set(keys).size, keys.length, `${kind}/${sector}`)
    }
})

console.log(`All ${checks} intake checklist unit tests passed.`)
