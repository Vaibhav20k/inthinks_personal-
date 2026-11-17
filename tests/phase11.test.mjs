// Phase 11: pilots, discovery, voice and documents.
export async function testPhase11({ mf, db, call, check, challenge, innovation, admin, login, mediator, b }) {
  await db.batch([db.prepare('DELETE FROM rate_limit'), db.prepare('DELETE FROM email_usage')])
  const raw = (path, body, headers) => mf.dispatchFetch(`https://inthinks.test${path}`, { method: 'POST', body,
    headers: { origin: 'https://inthinks.test', ...headers } }).then(async (r) => ({ status: r.status, body: await r.json() }))

  const owner = await login('pilot-plant@example.com')
  const org = (await call('/api/participant/organizations', { name: 'Furnace Holdings' }, owner)).body.id
  const problem = (await call('/api/challenges', { ...challenge, email: 'pilot-plant@example.com', company: 'Furnace Holdings', sector: 'Manufacturing',
    title: 'Furnace door seal fails', statement: 'The furnace door seal fails every few weeks.' }, { ...owner, 'x-organization-id': org, 'idempotency-key': crypto.randomUUID() })).body.reference
  const form = new FormData()
  form.set('record', JSON.stringify({ ...innovation, title: 'High-temperature seal' }))
  const req = new Request('https://inthinks.test/api/innovations', { method: 'POST', body: form })
  const bytes = await req.arrayBuffer()
  const solution = (await (await mf.dispatchFetch(req.url, { method: 'POST', body: bytes, headers: {
    'content-type': req.headers.get('content-type'), 'content-length': String(bytes.byteLength), 'idempotency-key': crypto.randomUUID() } })).json()).reference

  /* ------------------------------------------------------------- pilots */
  const crit = (body) => call(`/api/admin/cases/${problem}/qualification`, { category: 'success_criterion', sourceKind: 'participant_statement', ...body }, admin)
  const life = (await crit({ label: 'Seal life', comparator: 'gte', value: 12, unit: 'day' })).body.id
  const temp = (await crit({ label: 'Door face temperature', comparator: 'lte', value: 120, unit: '°C' })).body.id
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO opportunities (reference,created_at,updated_at,challenge_ref,technology_ref,stage,engagement_type) VALUES ('OPP-P11-TEST',?,?,?,?,'Pilot / Validation','pilot')`)
    .bind(now, now, problem, solution).run()
  const pilot = '/api/admin/opportunities/OPP-P11-TEST/pilot'
  const start = (await call(pilot, null, admin)).body
  check('pilot is judged on the problem’s own success criteria', start.criteria.map((c) => [c.label, c.verdict]), [['Seal life', 'not_measured'], ['Door face temperature', 'not_measured']])
  check('mediator cannot run a pilot', (await call(pilot, null, mediator)).status, 403)
  check('a step needs a real date', (await call(`${pilot}/milestones`, { title: 'Install seal', dueOn: '2026-13-01' }, admin)).status, 422)
  check('admin adds a pilot step', (await call(`${pilot}/milestones`, { title: 'Install seal on line 2', dueOn: '2026-12-01' }, admin)).status, 200)
  const step = (await call(pilot, null, admin)).body.milestones[0]
  check('step is marked done', (await call(`${pilot}/milestones/${step.id}`, { title: step.title, dueOn: step.dueOn, status: 'done' }, admin, 'PUT')).status, 200)
  const result = (body) => call(`${pilot}/results`, { measuredOn: '2026-11-10', source: 'Site log, line 2', ...body }, admin)
  check('result needs a source', (await result({ criterionId: life, measured: 18, source: '' })).status, 422)
  check('result cannot be dated in the future', (await result({ criterionId: life, measured: 18, measuredOn: '2999-01-01' })).status, 422)
  check('result must be for this problem’s criteria', (await result({ criterionId: 999999, measured: 1 })).status, 422)
  await result({ criterionId: life, measured: 18 })
  await result({ criterionId: temp, measured: 130 })
  const judged = (await call(pilot, null, admin)).body
  check('verdicts follow the comparator', judged.criteria.map((c) => c.verdict), ['met', 'not_met'])
  check('pilot summary counts them', judged.summary, { met: 1, notMet: 1, total: 2 })
  await call(`/api/admin/cases/${problem}/briefs`, { title: 'Seal for hot furnace doors', summary: 'A furnace door seal that must survive repeated thermal cycling at high temperature.', figureIds: [] }, admin)
  const sb = (await call(`/api/admin/cases/${solution}/briefs`, { title: 'High-temperature door seal', summary: 'A ceramic-fibre seal rated for repeated thermal cycling on furnace doors.', figureIds: [] }, admin)).body
  await call(`/api/admin/cases/${solution}/briefs/${sb.id}/approve`, { confirmChecked: true }, admin)
  await call('/api/admin/opportunities/OPP-P11-TEST/engagement/problem/share', {}, admin)
  const seen = (await call('/api/participant/engagements/OPP-P11-TEST', null, owner)).body
  check('problem owner sees pilot progress', [seen.pilot.steps.map((s) => s.status), seen.pilot.criteriaMet, seen.pilot.criteriaTotal], [['done'], 1, 2])
  check('but not the raw measurements or sources', ['130', 'Site log', 'measured'].filter((w) => JSON.stringify(seen).includes(w)), [])

  /* ---------------------------------------------------------- discovery */
  const provider = await login('provider@example.com')
  const providerOrg = (await call('/api/participant/organizations', { name: 'Seal Makers Guild' }, provider)).body.id
  check('unverified provider sees no discovery', (await call('/api/participant/discovery', null, provider)).body, { verified: false, items: [] })
  check('mediator cannot open discovery admin', (await call('/api/admin/discovery', null, mediator)).status, 403)
  check('admin verifies the provider', (await call(`/api/admin/discovery/providers/${providerOrg}`, { verified: true }, admin)).status, 200)
  check('listing needs an approved brief', (await call(`/api/admin/discovery/cases/${problem}`, { listed: true }, admin)).status, 409)
  const pb = (await call(`/api/admin/cases/${problem}/briefs`, null, admin)).body.items[0]
  await call(`/api/admin/cases/${problem}/briefs/${pb.id}/approve`, { confirmChecked: true }, admin)
  check('admin lists the problem', (await call(`/api/admin/discovery/cases/${problem}`, { listed: true }, admin)).status, 200)
  check('not shown until the submitter agrees', (await call('/api/participant/discovery', null, provider)).body.items, [])
  check('another company cannot agree for them', (await call(`/api/participant/records/${problem}/discovery-consent`, { consent: true }, b)).status, 404)
  check('submitter agrees', (await call(`/api/participant/records/${problem}/discovery-consent`, { consent: true }, owner)).status, 200)
  const listed = (await call('/api/participant/discovery', null, provider)).body
  check('verified provider sees the anonymised problem', listed.items.map((i) => i.title), ['Seal for hot furnace doors'])
  check('without the owner’s identity or reference', ['Furnace Holdings', 'pilot-plant@example.com', problem].filter((w) => JSON.stringify(listed).includes(w)), [])
  const interest = `/api/participant/discovery/${listed.items[0].id}/interest`
  check('interest needs a real answer', (await call(interest, { note: 'yes' }, provider)).status, 422)
  check('provider tells InThinks it could solve it', (await call(interest, { note: 'Our ceramic-fibre seal lasts 30 days at 1100 °C.' }, provider)).status, 201)
  check('only once per organization', (await call(interest, { note: 'Our ceramic-fibre seal lasts 30 days at 1100 °C.' }, provider)).status, 409)
  check('unverified companies cannot send interest', (await call(interest, { note: 'We could also try something here.' }, b)).status, 403)
  const adminView = (await call('/api/admin/discovery', null, admin)).body
  check('InThinks sees who is interested', adminView.interests.some((i) => i.organization === 'Seal Makers Guild' && i.reference === problem), true)
  await call(`/api/participant/records/${problem}/discovery-consent`, { consent: false }, owner)
  check('withdrawing consent hides it at once', (await call('/api/participant/discovery', null, provider)).body.items, [])

  /* ------------------------------------------------------ voice, documents */
  const ai = { ...owner, 'x-test-ai': '1' }
  const audio = (text, headers = ai) => raw('/api/participant/voice', new TextEncoder().encode(text), { 'content-type': 'audio/webm', ...headers })
  check('voice becomes editable text', (await audio('Our furnace door reaches 900 °C')).body.text, 'Our furnace door reaches 900 °C')
  check('voice needs a signed-in participant', (await audio('hello', { 'x-test-ai': '1' })).status, 401)
  check('only audio is accepted', (await raw('/api/participant/voice', 'hi', { ...ai, 'content-type': 'text/plain' })).status, 415)
  check('silence is reported, not saved', (await audio('SILENCE')).status, 422)
  const day = `AI-VOICE:${new Date().toISOString().slice(0, 10)}`
  await db.prepare('INSERT INTO counters(name,value) VALUES (?,30) ON CONFLICT(name) DO UPDATE SET value=30').bind(day).run()
  check('voice stops at the daily limit', (await audio('one more')).status, 429)
  await db.prepare('DELETE FROM counters WHERE name=?').bind(day).run()

  const docForm = (text, type = 'text/plain') => { const f = new FormData(); f.set('document', new Blob([text], { type }), 'figures.txt'); return f }
  const readDoc = async (ref, f, headers = ai) => {
    const r = new Request('https://inthinks.test', { method: 'POST', body: f })
    return raw(`/api/participant/records/${ref}/read-document`, await r.arrayBuffer(), { 'content-type': r.headers.get('content-type'), ...headers })
  }
  const found = await readDoc(problem, docForm('Test report. The furnace shell reached 175 °C during trials. Questions: lab@example.com'))
  check('a document’s figures become suggestions', found.body.found, 1)
  const suggestion = (await call(`/api/participant/records/${problem}/follow-ups`, null, owner)).body.items.find((i) => i.suggestion)?.suggestion
  check('suggestion quotes the document', [suggestion?.value, suggestion?.quote.includes('175 °C')], [175, true])
  check('nothing is saved as a figure until confirmed', Boolean(await db.prepare("SELECT 1 FROM qualification_items WHERE reference=? AND value=175").bind(problem).first()), false)
  check('another company cannot read documents into it', (await readDoc(problem, docForm('x 1 °C'), { ...b, 'x-test-ai': '1' })).status, 404)
  check('only document types are accepted', (await readDoc(problem, docForm('x', 'image/png'))).status, 415)
}
