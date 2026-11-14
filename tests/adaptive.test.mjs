// Phase 7: adaptive intake — sector checklists, grounded AI suggestions, follow-ups.
export async function testAdaptive({ db, call, check, challenge, admin, login, b }) {
  await db.batch([db.prepare('DELETE FROM rate_limit'), db.prepare('DELETE FROM email_usage')])
  const owner = await login('figures@example.com')
  const org = (await call('/api/participant/organizations', { name: 'Figures Ltd' }, owner)).body.id
  const saved = await call('/api/challenges', { ...challenge, email: 'figures@example.com', sector: 'Ceramic manufacturing',
    title: 'Kiln shell runs hot', statement: 'The kiln shell surface reaches 180 °C during firing and wastes gas. Contact the plant team for details.' },
    { ...owner, 'x-organization-id': org, 'idempotency-key': crypto.randomUUID(), 'x-test-ai': '1' })
  const ref = saved.body.reference
  const url = `/api/participant/records/${ref}/follow-ups`

  const state = (await call(url, null, owner)).body
  check('sector checklist chosen from the sector text', state.sector, 'manufacturing')
  check('checklist lists the sector figures', state.items.map((i) => i.key).includes('process_temperature'), true)
  check('nothing is filled before the participant answers', state.missing, state.items.length)
  const temp = state.items.find((i) => i.key === 'process_temperature')
  check('number read from the text is offered', [temp.suggestion?.value, temp.suggestion?.unit], [180, '°C'])
  check('suggestion shows the passage it came from', temp.suggestion.quote.includes('180 °C'), true)
  check('invented number is rejected', state.items.find((i) => i.key === 'improvement_target').suggestion, null)
  check('suggestion is not a figure until confirmed', (await db.prepare('SELECT COUNT(*) n FROM qualification_items WHERE reference=?').bind(ref).first()).n, 0)
  check('other company cannot see follow-ups', (await call(url, null, b)).status, 404)

  check('participant confirms a suggestion', (await call(`${url}/${temp.suggestion.id}/accept`, {}, owner)).status, 200)
  const figure = await db.prepare("SELECT category, comparator, value, unit, source_kind, created_role FROM qualification_items WHERE reference=? AND label='Temperature the solution must withstand'").bind(ref).first()
  check('confirmed suggestion becomes their own figure', [figure.category, figure.comparator, figure.value, figure.unit, figure.source_kind, figure.created_role],
    ['constraint', 'gte', 180, '°C', 'participant_statement', 'participant'])
  check('a decided suggestion cannot be reused', (await call(`${url}/${temp.suggestion.id}/accept`, {}, owner)).status, 409)
  const after = (await call(url, null, owner)).body
  check('answered figure counts as filled', [after.items.find((i) => i.key === 'process_temperature').filled, after.missing], [true, state.missing - 1])

  const typed = await call(`/api/participant/records/${ref}/qualification`, { category: 'cost', label: 'Yearly cost of this problem', value: 500000, currency: 'INR', period: 'per_year', attributionPct: 60, sourceKind: 'participant_statement' }, owner)
  check('typed answer saved as a figure', typed.status, 201)
  check('typed answer fills its checklist item', (await call(url, null, owner)).body.items.find((i) => i.key === 'problem_cost').filled, true)

  const staff = (await call(`/api/admin/cases/${ref}/follow-ups`, null, admin)).body
  check('staff see the same checklist', [staff.sector, staff.missing], ['manufacturing', state.missing - 2])

  const leaky = await call('/api/challenges', { ...challenge, email: 'figures@example.com', sector: 'Manufacturing', statement: 'Shell at 150 °C, call +91 98765 43210' },
    { ...owner, 'x-organization-id': org, 'idempotency-key': crypto.randomUUID(), 'x-test-ai': '1' })
  check('text with a phone number is never sent to the AI', (await db.prepare('SELECT COUNT(*) n FROM intake_suggestions WHERE reference=?').bind(leaky.body.reference).first()).n, 0)

  const day = `AI-EXTRACT:${new Date().toISOString().slice(0, 10)}`
  await db.prepare('INSERT INTO counters(name,value) VALUES (?,40) ON CONFLICT(name) DO UPDATE SET value=40').bind(day).run()
  const capped = await call('/api/challenges', { ...challenge, email: 'figures@example.com', sector: 'Manufacturing', statement: 'Shell at 170 °C daily.' },
    { ...owner, 'x-organization-id': org, 'idempotency-key': crypto.randomUUID(), 'x-test-ai': '1' })
  check('daily AI cap stops figure reading', (await db.prepare('SELECT COUNT(*) n FROM intake_suggestions WHERE reference=?').bind(capped.body.reference).first()).n, 0)
  check('submission still saved when capped', capped.status, 201)
  await db.prepare('DELETE FROM counters WHERE name=?').bind(day).run()

  const dismissTarget = await call('/api/challenges', { ...challenge, email: 'figures@example.com', sector: 'Manufacturing', statement: 'Shell at 160 °C.' },
    { ...owner, 'x-organization-id': org, 'idempotency-key': crypto.randomUUID(), 'x-test-ai': '1' })
  const s2 = (await call(`/api/participant/records/${dismissTarget.body.reference}/follow-ups`, null, owner)).body.items.find((i) => i.key === 'process_temperature').suggestion
  check('participant can reject a suggestion', (await call(`/api/participant/records/${dismissTarget.body.reference}/follow-ups/${s2.id}/dismiss`, {}, owner)).status, 200)
  check('rejected suggestion disappears', (await call(`/api/participant/records/${dismissTarget.body.reference}/follow-ups`, null, owner)).body.items.find((i) => i.key === 'process_temperature').suggestion, null)
}
