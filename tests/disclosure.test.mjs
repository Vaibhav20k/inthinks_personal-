// Phase 10: controlled disclosure (anonymised briefs) and engagement.
export async function testDisclosure({ mf, db, call, check, challenge, innovation, admin, login, mediator, b }) {
  await db.batch([db.prepare('DELETE FROM rate_limit'), db.prepare('DELETE FROM email_usage')])
  const owner = await login('plant@example.com'), solver = await login('lab@example.com')
  const plantOrg = (await call('/api/participant/organizations', { name: 'Kilnworks Plant' }, owner)).body.id
  const labOrg = (await call('/api/participant/organizations', { name: 'Coating Lab Collective' }, solver)).body.id
  const problem = (await call('/api/challenges', { ...challenge, email: 'plant@example.com', company: 'Kilnworks Plant', contact: 'Asha Verma', location: 'Pune',
    title: 'Kiln shell loses heat', statement: 'Our Pune kiln shell runs hot.' }, { ...owner, 'x-organization-id': plantOrg, 'idempotency-key': crypto.randomUUID() })).body.reference

  const form = new FormData()
  form.set('record', JSON.stringify({ ...innovation, email: 'lab@example.com', name: 'Ravi Menon', institution: 'Coastal Research Institute', title: 'Ceramic shell coating' }))
  const request = new Request('https://inthinks.test/api/innovations', { method: 'POST', body: form })
  const raw = await request.arrayBuffer()
  const solution = (await (await mf.dispatchFetch(request.url, { method: 'POST', body: raw, headers: {
    'content-type': request.headers.get('content-type'), 'content-length': String(raw.byteLength), 'idempotency-key': crypto.randomUUID() } })).json()).reference
  await call('/api/participant/claim', { reference: solution, organizationId: labOrg }, solver)
  check('solution saved under its organization', Boolean(await db.prepare('SELECT 1 FROM case_records WHERE reference=? AND organization_id=?').bind(solution, labOrg).first()), true)

  // Figures: one shareable, one cost, one the submitter keeps InThinks-only.
  const q = (ref, body, who) => call(`/api/${who === admin ? 'admin/cases' : 'participant/records'}/${ref}/qualification`, body, who)
  const shell = (await q(problem, { category: 'constraint', label: 'Shell temperature limit', comparator: 'lte', value: 120, unit: '°C', sourceKind: 'participant_statement' }, owner)).body.id
  const cost = (await q(problem, { category: 'cost', label: 'Yearly cost of this problem', value: 90000, currency: 'EUR', period: 'per_year', attributionPct: 50, sourceKind: 'participant_statement' }, owner)).body.id
  const secret = (await q(problem, { category: 'measurement', label: 'Line speed', value: 40, unit: 'units/h', sourceKind: 'participant_statement' }, owner)).body.id
  check('submitter marks a figure InThinks only', (await call(`/api/participant/records/${problem}/qualification/${secret}/internal`, { internalOnly: true }, owner)).status, 200)
  check('the mark shows on their figure', (await q(problem, null, owner)).body.items.find((i) => i.id === secret).internalOnly, true)
  check('another company cannot mark it', (await call(`/api/participant/records/${problem}/qualification/${secret}/internal`, { internalOnly: false }, b)).status, 404)

  const briefs = `/api/admin/cases/${problem}/briefs`
  const listed = (await call(briefs, null, admin)).body
  check('only shareable figures are offered for a brief', listed.figures.map((f) => f.id), [shell])
  const write = (body, who = admin) => call(briefs, { title: 'Hot kiln shell', summary: 'A rotary kiln shell runs above its design temperature and wastes fuel during firing.', figureIds: [], ...body }, who)
  for (const [label, body, field] of [
    ['company name is refused', { summary: 'Kilnworks Plant has a rotary kiln shell that runs far too hot during firing cycles.' }, 'the organization name'],
    ['contact name is refused', { title: 'Asha Verma kiln issue' }, 'a contact name'],
    ['site location is refused', { summary: 'A rotary kiln shell in Pune runs above its design temperature during firing.' }, 'a site location'],
    ['an email address is refused', { summary: 'A rotary kiln shell runs hot; write to someone@example.org for the plant data.' }, 'an email address'],
    ['a named company is refused', { summary: 'A rotary kiln shell at a Tata plant runs above its design temperature.' }, 'a named company'],
  ]) {
    const r = await write(body)
    check(`brief: ${label}`, [r.status, Object.values(r.body.fields ?? {}).some((m) => m.includes(field))], [422, true])
  }
  check('brief: a cost cannot be shared', (await write({ figureIds: [cost] })).status, 422)
  check('brief: an InThinks-only figure cannot be shared', (await write({ figureIds: [secret] })).status, 422)
  check('unassigned mediator cannot write a brief', (await write({}, mediator)).status, 404)
  await call(`/api/admin/access/${problem}/assignments`, { email: 'mediator@example.com' }, admin)
  const draft = await write({ figureIds: [shell] }, mediator)
  check('assigned mediator writes a draft', [draft.status, draft.body.version], [201, 1])
  check('only one open draft at a time', (await write({})).status, 409)
  check('mediator proposes it', (await call(`${briefs}/${draft.body.id}/propose`, {}, mediator)).status, 200)
  check('mediator cannot approve', (await call(`${briefs}/${draft.body.id}/approve`, { confirmChecked: true }, mediator)).status, 403)
  check('approval needs the manual name check', (await call(`${briefs}/${draft.body.id}/approve`, {}, admin)).status, 422)
  check('admin approves', (await call(`${briefs}/${draft.body.id}/approve`, { confirmChecked: true }, admin)).status, 200)
  check('an approved brief is never edited', (await call(`${briefs}/${draft.body.id}`, { title: 'Changed', summary: 'x'.repeat(50), figureIds: [] }, admin, 'PUT')).status, 409)

  const sBriefs = `/api/admin/cases/${solution}/briefs`
  check('innovator name is refused', (await call(sBriefs, { title: 'Ravi Menon coating', summary: 'A ceramic coating that lowers shell temperature on rotary kilns.', figureIds: [] }, admin)).status, 422)
  check('institution is refused', (await call(sBriefs, { title: 'Shell coating', summary: 'Developed at Coastal Research Institute, a ceramic coating for kiln shells.', figureIds: [] }, admin)).status, 422)
  const sFigure = (await q(solution, { category: 'measurement', label: 'Shell temperature reached', value: 95, unit: '°C', sourceKind: 'participant_statement' }, solver)).body.id
  const v1 = (await call(sBriefs, { title: 'Ceramic shell coating', summary: 'A sprayed ceramic coating that lowers rotary kiln shell temperature in trials.', figureIds: [sFigure] }, admin)).body
  await call(`${sBriefs}/${v1.id}/approve`, { confirmChecked: true }, admin)

  // Engagement on an opportunity between the two.
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO opportunities (reference,created_at,updated_at,challenge_ref,technology_ref,stage) VALUES ('OPP-P10-TEST',?,?,?,?,'Industry Presentation')`)
    .bind(now, now, problem, solution).run()
  const eng = '/api/admin/opportunities/OPP-P10-TEST/engagement'
  check('mediator cannot run engagement sharing', (await call(eng, null, mediator)).status, 403)
  check('nothing is visible before sharing', (await call('/api/participant/engagements', null, owner)).body.items, [])
  check('engagement type is set', (await call(eng, { engagementType: 'pilot' }, admin, 'PUT')).status, 200)
  check('problem side is shown the solution brief', (await call(`${eng}/problem/share`, {}, admin)).body.version, 1)
  await call(`${eng}/problem/next-action`, { nextAction: 'Tell us your preferred trial window', nextActionDue: '2026-12-15' }, admin, 'PUT')

  const seen = (await call('/api/participant/engagements', null, owner)).body.items
  check('problem owner sees the opportunity', [seen.length, seen[0].counterpart.title, seen[0].engagementType], [1, 'Ceramic shell coating', 'pilot'])
  check('with the shared figures', seen[0].counterpart.figures.map((f) => f.label), ['Shell temperature reached'])
  check('and the next step InThinks set', seen[0].nextAction, 'Tell us your preferred trial window')
  const text = JSON.stringify(seen)
  check('the other side stays anonymous', ['Ravi Menon', 'lab@example.com', 'Coating Lab Collective', 'Coastal Research', solution].filter((w) => text.includes(w)), [])
  check('no commercial view reaches a participant', ['atStake', 'payback', 'priority', 'response_note'].filter((w) => text.includes(w)), [])
  check('solution side sees nothing until shared', (await call('/api/participant/engagements', null, solver)).body.items, [])
  check('an unrelated company is refused', (await call('/api/participant/engagements/OPP-P10-TEST', null, b)).status, 404)

  check('asking for more information needs a question', (await call('/api/participant/engagements/OPP-P10-TEST/response', { response: 'more_info' }, owner)).status, 422)
  check('owner answers InThinks', (await call('/api/participant/engagements/OPP-P10-TEST/response', { response: 'interested', note: 'Trial in January' }, owner)).status, 200)
  const staffView = (await call(eng, null, admin)).body.sides.find((s) => s.side === 'problem')
  check('InThinks sees the answer', [staffView.response, staffView.responseNote], ['interested', 'Trial in January'])

  check('solution side hides a figure later', (await call(`/api/participant/records/${solution}/qualification/${sFigure}/internal`, { internalOnly: true }, solver)).status, 200)
  check('the figure leaves the shared view at once', (await call('/api/participant/engagements/OPP-P10-TEST', null, owner)).body.counterpart.figures, [])

  const v2 = (await call(sBriefs, { title: 'Ceramic shell coating, field data', summary: 'A sprayed ceramic coating that lowered rotary kiln shell temperature in two field trials.', figureIds: [] }, admin)).body
  await call(`${sBriefs}/${v2.id}/approve`, { confirmChecked: true }, admin)
  check('older approved version is superseded', (await db.prepare('SELECT status FROM disclosure_briefs WHERE id=?').bind(v1.id).first()).status, 'superseded')
  check('the side keeps the version it was shown', (await call('/api/participant/engagements/OPP-P10-TEST', null, owner)).body.counterpart.version, 1)
  check('staff see that a newer version exists', (await call(eng, null, admin)).body.sides.find((s) => s.side === 'problem').outdated, true)
  await call(`${eng}/problem/share`, {}, admin)
  const reshared = (await call('/api/participant/engagements/OPP-P10-TEST', null, owner)).body
  check('sharing a new version asks for a fresh answer', [reshared.counterpart.version, reshared.response], [2, 'pending'])

  await db.prepare("UPDATE organizations SET name='rotary' WHERE id=?").bind(labOrg).run()
  check('a brief that now names the other side is withheld', (await call('/api/participant/engagements/OPP-P10-TEST', null, owner)).body.counterpart, null)
  await db.prepare("UPDATE organizations SET name='Coating Lab Collective' WHERE id=?").bind(labOrg).run()

  check('revoking removes access', [(await call(`${eng}/problem/revoke`, {}, admin)).status, (await call('/api/participant/engagements/OPP-P10-TEST', null, owner)).status], [200, 404])
  check('sharing is audited', Boolean(await db.prepare("SELECT 1 FROM audit_log WHERE action='engagement.share' AND target='OPP-P10-TEST'").first()), true)
  check('approval is audited', Boolean(await db.prepare("SELECT 1 FROM audit_log WHERE action='brief.approve' AND target=?").bind(problem).first()), true)
}
