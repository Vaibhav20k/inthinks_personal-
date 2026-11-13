// Steps 4–6: operational safeguards, case workflow, structured qualification.
// Runs after the ownership suite, in the same isolated database.
export async function testWorkflow({ mf, db, call, check, innovation, admin, login, orgA, ref, b, mediator, reviewer, existingInnovation }) {
  await db.prepare('DELETE FROM rate_limit').run()

  /* ---------------------------------------------------------- step 4 */
  check('public health reports only liveness', (await call('/api/health')).body, { ok: true })
  const health = await call('/api/admin/health', null, admin)
  check('admin health sees every migration applied', health.body.database.missingMigrations, [])
  check('admin health separates configuration from verification', typeof health.body.configuration.managedStaffAccess, 'boolean')
  check('mediator cannot read health report', (await call('/api/admin/health', null, mediator)).status, 403)
  check('reviewer cannot read health report', (await call('/api/admin/health', null, reviewer)).status, 403)
  const upload = async (name, bytes) => {
    const form = new FormData()
    form.set('record', JSON.stringify(innovation)); form.append('files', new Blob([bytes]), name)
    const request = new Request('https://inthinks.test/api/innovations', { method: 'POST', body: form })
    const body = await request.arrayBuffer()
    const r = await mf.dispatchFetch(request.url, { method: 'POST', body, headers: {
      'content-type': request.headers.get('content-type'), 'content-length': String(body.byteLength), 'idempotency-key': crypto.randomUUID() } })
    return r.status
  }
  check('mislabelled file refused', await upload('report.pdf', 'plain text, not a PDF'), 415)
  check('executable refused under a document name', await upload('notes.txt', 'MZ\u0090\u0000program'), 415)
  check('HTML refused as plain text', await upload('notes.txt', '<!doctype html><script>alert(1)</script>'), 415)
  check('empty file refused', await upload('empty.csv', ''), 415)
  check('genuine image accepted', await upload('kiln.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), 201)
  check('accepted file stored quarantined with detected type', await db.prepare("SELECT scan_status,detected_type FROM evidence WHERE file_name='kiln.png'").first(), { scan_status: 'quarantined', detected_type: 'png' })

  /* ---------------------------------------------------------- step 5 */
  const owner = await login('owner@example.com')
  const caseUrl = `/api/admin/cases/${ref}`
  check('reviewer excluded from case workflow', (await call(caseUrl, null, reviewer)).status, 403)
  check('assigned mediator opens workflow', (await call(caseUrl, null, mediator)).status, 200)
  check('mediator denied unassigned workflow', (await call(`/api/admin/cases/${existingInnovation.reference}`, null, mediator)).status, 404)
  check('mediator cannot choose owner', (await call(`${caseUrl}/workflow`, { owner: 'mediator@example.com' }, mediator, 'PUT')).status, 403)
  check('reviewer cannot own a case', (await call(`${caseUrl}/workflow`, { owner: 'reviewer@example.com' }, admin, 'PUT')).status, 422)
  check('admin makes assigned mediator owner', (await call(`${caseUrl}/workflow`, { owner: 'mediator@example.com' }, admin, 'PUT')).status, 200)
  check('invalid due date refused', (await call(`${caseUrl}/workflow`, { nextAction: 'Call', nextActionDue: '2026-02-30' }, mediator, 'PUT')).status, 422)
  check('mediator sets next action', (await call(`${caseUrl}/workflow`, { nextAction: 'Confirm kiln temperatures', nextActionDue: '2099-01-01' }, mediator, 'PUT')).status, 200)
  check('next action keeps owner', (await call(caseUrl, null, admin)).body.workflow.owner, 'mediator@example.com')
  const queue = (await call('/api/admin/queue', null, mediator)).body.items
  check('mediator queue lists only assigned cases', queue.map((x) => x.reference), [ref])
  check('admin queue includes every open case', (await call('/api/admin/queue', null, admin)).body.items.some((x) => x.reference === existingInnovation.reference), true)

  const asked = await call(`${caseUrl}/clarifications`, { question: 'What is the kiln exhaust temperature?', dueAt: '2099-01-01' }, mediator)
  check('mediator asks a clarification', asked.status, 201)
  check('past due date refused', (await call(`${caseUrl}/clarifications`, { question: 'Late?', dueAt: '2000-01-01' }, admin)).status, 422)
  check('question moves case to clarification requested', (await db.prepare('SELECT review_status FROM challenges WHERE reference=?').bind(ref).first()).review_status, 'clarification_requested')
  const questions = (await call(`/api/participant/records/${ref}/clarifications`, null, owner)).body.items
  check('participant sees the question', questions[0].question, 'What is the kiln exhaust temperature?')
  check('participant does not see who asked', Object.hasOwn(questions[0], 'askedBy'), false)
  check('other company cannot read questions', (await call(`/api/participant/records/${ref}/clarifications`, null, b)).status, 404)
  check('other company cannot answer', (await call(`/api/participant/records/${ref}/clarifications/${asked.body.id}`, { response: 'forged' }, b)).status, 404)
  check('empty answer refused', (await call(`/api/participant/records/${ref}/clarifications/${asked.body.id}`, { response: ' ' }, owner)).status, 422)
  check('participant answers', (await call(`/api/participant/records/${ref}/clarifications/${asked.body.id}`, { response: 'About 420 °C at the stack.' }, owner)).status, 200)
  check('answer cannot be overwritten', (await call(`/api/participant/records/${ref}/clarifications/${asked.body.id}`, { response: 'changed' }, owner)).status, 409)
  check('answered case returns to review', (await db.prepare('SELECT review_status FROM challenges WHERE reference=?').bind(ref).first()).review_status, 'under_review')
  check('staff sees answer and responder', (await call(caseUrl, null, admin)).body.clarifications[0].respondedBy, 'owner@example.com')
  const second = await call(`${caseUrl}/clarifications`, { question: 'Withdraw me' }, admin)
  check('staff withdraws open question', (await call(`${caseUrl}/clarifications/${second.body.id}/withdraw`, {}, mediator)).status, 200)
  check('withdrawn question hidden from participant', (await call(`/api/participant/records/${ref}/clarifications`, null, owner)).body.items.length, 1)
  check('withdrawal settles review status', (await db.prepare('SELECT review_status FROM challenges WHERE reference=?').bind(ref).first()).review_status, 'under_review')
  check('clarification actions audited', Boolean(await db.prepare("SELECT 1 FROM audit_log WHERE action='clarification.request' AND actor='mediator@example.com'").first()), true)

  const draft = await call('/api/participant/drafts', { kind: 'challenge', organizationId: orgA, payload: { title: 'Half-written', statement: 'Draft text' } }, owner)
  check('participant saves server draft', draft.status, 201)
  check('draft listed for author', (await call('/api/participant/drafts', null, owner)).body.items.map((d) => d.title), ['Half-written'])
  check('draft private to author', (await call(`/api/participant/drafts/${draft.body.id}`, null, b)).status, 404)
  check('draft cannot name a foreign organization', (await call('/api/participant/drafts', { kind: 'challenge', organizationId: orgA, payload: {} }, b)).status, 422)
  check('stale draft version refused', (await call(`/api/participant/drafts/${draft.body.id}`, { version: 0, payload: { title: 'x' } }, owner, 'PUT')).status, 409)
  check('current draft version saves', (await call(`/api/participant/drafts/${draft.body.id}`, { version: 1, organizationId: orgA, payload: { title: 'Revised' } }, owner, 'PUT')).body.version, 2)
  check('draft content restored', (await call(`/api/participant/drafts/${draft.body.id}`, null, owner)).body.payload.title, 'Revised')
  check('oversized draft refused', (await call('/api/participant/drafts', { kind: 'challenge', payload: { statement: 'x'.repeat(210_000) } }, owner)).status < 500, true)
  await db.prepare("UPDATE submission_drafts SET expires_at='2000-01-01' WHERE id=?").bind(draft.body.id).run()
  check('expired draft unavailable', (await call(`/api/participant/drafts/${draft.body.id}`, null, owner)).status, 404)

  /* ---------------------------------------------------------- step 6 */
  const q = `/api/participant/records/${ref}/qualification`
  const sq = `${caseUrl}/qualification`
  const bad = await call(q, { category: 'measurement', label: 'Exhaust temperature', value: 420, sourceKind: 'participant_statement' }, owner)
  check('unit required', [bad.status, Boolean(bad.body.fields.unit)], [422, true])
  check('free-text unit refused', (await call(q, { category: 'measurement', label: 'Length', value: 3, unit: 'furlongs', sourceKind: 'participant_statement' }, owner)).body.fields.unit !== undefined, true)
  check('future observation refused', (await call(q, { category: 'measurement', label: 'Temp', value: 1, unit: '°C', observedOn: '2099-01-01', sourceKind: 'measurement_record' }, owner)).status, 422)
  check('participant cannot claim staff estimate', (await call(q, { category: 'measurement', label: 'Temp', value: 1, unit: '°C', sourceKind: 'staff_estimate' }, owner)).status, 422)
  const measured = await call(q, { category: 'measurement', label: 'Exhaust temperature', value: 420, unit: '°C', observedOn: '2026-10-01', sourceKind: 'measurement_record', sourceDetail: 'Stack thermocouple log' }, owner)
  check('participant records sourced measurement', measured.status, 201)
  check('cost needs attributable share', (await call(q, { category: 'cost', label: 'Fuel loss', value: 1000, currency: 'INR', period: 'per_month', sourceKind: 'document' }, owner)).body.fields.attributionPct !== undefined, true)
  check('range must ascend', (await call(sq, { category: 'constraint', label: 'Coating temperature', comparator: 'between', value: 500, valueMax: 300, unit: '°C', sourceKind: 'staff_estimate' }, mediator)).status, 422)
  check('participant records attributable cost', (await call(q, { category: 'cost', label: 'Fuel lost through heat', value: 250000, currency: 'INR', period: 'per_year', attributionPct: 60, observedOn: '2026-09-30', sourceKind: 'document' }, owner)).status, 201)
  check('success criterion records target', (await call(q, { category: 'success_criterion', label: 'Exhaust temperature', comparator: 'lte', baseline: 420, value: 300, unit: '°C', targetDate: '2027-06-30', sourceKind: 'participant_statement' }, owner)).status, 201)
  check('mediator adds internal estimate', (await call(sq, { category: 'cost', label: 'Retrofit estimate', value: 900000, currency: 'INR', period: 'one_off', attributionPct: 100, observedOn: '2026-11-01', sourceKind: 'staff_estimate' }, mediator)).status, 201)
  const participantView = (await call(q, null, owner)).body
  check('participant sees only participant statements', participantView.items.every((i) => i.createdRole === 'participant'), true)
  check('participant view omits verification notes', participantView.items.some((i) => Object.hasOwn(i, 'verificationNote')), false)
  check('participant cannot verify', (await call(`${q}/${measured.body.id}/verification`, { verification: 'independently_verified' }, owner)).status, 403)
  check('document check needs linked file', (await call(`${sq}/${measured.body.id}/verification`, { verification: 'document_checked' }, mediator)).status, 422)
  check('dispute needs reason', (await call(`${sq}/${measured.body.id}/verification`, { verification: 'disputed' }, admin)).status, 422)
  check('staff verifies measurement', (await call(`${sq}/${measured.body.id}/verification`, { verification: 'independently_verified', note: 'Site visit' }, mediator)).status, 200)
  check('verification recorded', (await call(sq, null, admin)).body.items.find((i) => i.id === measured.body.id).verifiedBy, 'mediator@example.com')
  check('edit resets verification', (await call(`${q}/${measured.body.id}`, { category: 'measurement', label: 'Exhaust temperature', value: 410, unit: '°C', observedOn: '2026-10-01', sourceKind: 'measurement_record' }, owner, 'PUT')).status, 200)
  check('edited value is unverified again', (await call(sq, null, admin)).body.items.find((i) => i.id === measured.body.id).verification, 'unverified')
  check('file from another case cannot be linked', (await call(sq, { category: 'measurement', label: 'x', value: 1, unit: 'kg', sourceKind: 'document', evidenceId: (await db.prepare('SELECT id FROM evidence WHERE reference=?').bind(existingInnovation.reference).first()).id }, admin)).status, 422)
  const staffView = (await call(sq, null, admin)).body
  check('completeness ready with measurement, cost and criterion', staffView.completeness.ready, true)
  const estimate = staffView.items.find((i) => i.sourceKind === 'staff_estimate')
  check('participant cannot touch staff item', (await call(`${q}/${estimate.id}/retire`, {}, owner)).status, 404)
  check('staff retires item', (await call(`${sq}/${estimate.id}/retire`, {}, admin)).status, 200)
  check('retired item cannot be edited', (await call(`${sq}/${estimate.id}/retire`, {}, admin)).status, 409)
  check('reviewer excluded from qualification', (await call(sq, null, reviewer)).status, 403)
  check('other company cannot read qualification', (await call(q, null, b)).status, 404)
  check('qualification changes audited', Boolean(await db.prepare("SELECT 1 FROM audit_log WHERE action='qualification.post' AND actor='mediator@example.com'").first()), true)
  check('health counts unowned cases after workflow', typeof (await call('/api/admin/health', null, admin)).body.workflow.unownedCases, 'number')
}
