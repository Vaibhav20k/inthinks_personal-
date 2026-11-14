// Phase 8: private automatic assessments and deterministic economics.
export async function testEconomics({ mf, db, call, check, challenge, innovation, admin, login, mediator, reviewer, ref: assignedRef }) {
  await db.batch([db.prepare('DELETE FROM rate_limit'), db.prepare('DELETE FROM email_usage')])
  const owner = await login('economics@example.com')
  const org = (await call('/api/participant/organizations', { name: 'Economics Ltd' }, owner)).body.id
  const saved = await call('/api/challenges', { ...challenge, email: 'economics@example.com', title: 'Kiln gas bill too high',
    statement: 'The kiln wastes gas through hot shell walls.' }, { ...owner, 'x-organization-id': org, 'idempotency-key': crypto.randomUUID() })
  const ref = saved.body.reference
  await db.prepare('DELETE FROM matches WHERE challenge_ref=?').bind(ref).run()
  const url = `/api/admin/cases/${ref}/assessment`
  const aiCalls = async () => (await (await mf.dispatchFetch('https://inthinks.test/test/ai-calls')).json()).calls
  const callsBefore = await aiCalls()

  const empty = (await call(url, null, admin)).body
  check('assessment without figures says not enough data', [empty.priority.label, empty.atStake, empty.settingsVersion], ['Not enough data', [], 0])

  const add = (body) => call(`/api/admin/cases/${ref}/qualification`, body, admin)
  const cost = (await add({ category: 'cost', label: 'Yearly cost of this problem', value: 200000, currency: 'EUR', period: 'per_year', attributionPct: 60, sourceKind: 'participant_statement' })).body.id
  await add({ category: 'success_criterion', label: 'Improvement needed', comparator: 'gte', value: 15, unit: '%', sourceKind: 'participant_statement' })
  let a = (await call(url, null, admin)).body
  check('money at stake runs from trusted to stated', a.atStake, [{ currency: 'EUR', low: 60000, high: 120000 }])
  check('yearly saving applies the improvement', a.saving, [{ currency: 'EUR', low: 9000, high: 18000 }])
  check('unverified warm-level problem is not yet a priority', a.priority.label, 'Not yet')
  check('priority gives its reasons', a.priority.reasons.some((r) => r.includes('0 of 2 figures used are checked')), true)

  await call(`/api/admin/cases/${ref}/qualification/${cost}/verification`, { verification: 'independently_verified' }, admin)
  a = (await call(url, null, admin)).body
  check('verifying a figure narrows the range', a.atStake[0].low, 120000)
  check('verified hot-level value lifts priority to warm', [a.priority.label, a.priority.score], ['Warm', 3])

  const formRequest = new Request('https://inthinks.test/api/innovations', { method: 'POST', body: (() => {
    const f = new FormData(); f.set('record', JSON.stringify({ ...innovation, title: 'Shell insulation wrap' })); return f })() })
  const formBody = await formRequest.arrayBuffer()
  const tech = (await (await mf.dispatchFetch(formRequest.url, { method: 'POST', body: formBody, headers: {
    'content-type': formRequest.headers.get('content-type'), 'content-length': String(formBody.byteLength), 'idempotency-key': crypto.randomUUID() } })).json()).reference
  await call(`/api/admin/cases/${tech}/qualification`, { category: 'cost', label: 'Estimated cost of a first installation', value: 36000, currency: 'EUR', period: 'one_off', attributionPct: 100, sourceKind: 'document' }, admin)
  await db.prepare(`INSERT INTO matches (reference,created_at,challenge_ref,technology_ref,classification,mechanism_fit,application_fit,trl_fit,constraint_fit,ip_availability,development_effort,analysis,engine)
    VALUES ('MT-P8-TEST',?,?,?,'Strong Match','Strong','Strong','Moderate','Unknown','Unknown','Unknown','{}','test')`).bind(new Date().toISOString(), ref, tech).run()
  a = (await call(url, null, admin)).body
  check('payback per match runs from best to worst case', a.matches[0].payback, { status: 'ok', currency: 'EUR', install: 36000, bestYears: 2, worstYears: 4 })
  check('strong match makes it hot', a.priority.label, 'Hot')
  const t = (await call(`/api/admin/cases/${tech}/assessment`, null, admin)).body
  check('solution side shows its installation cost', t.install, [{ currency: 'EUR', amount: 36000 }])
  check('solution side shows payback against each problem', [t.matches[0].other, t.matches[0].payback.bestYears], [ref, 2])
  await db.prepare("UPDATE matches SET decision='Rejected' WHERE reference='MT-P8-TEST'").run()
  check('a rejected match no longer counts', (await call(url, null, admin)).body.matches.length, 0)
  await db.prepare("UPDATE matches SET decision='Pending' WHERE reference='MT-P8-TEST'").run()

  // Settings: administrators only, validated, versioned and audited.
  const settingsUrl = '/api/admin/economics-settings'
  const current = (await call(settingsUrl, null, admin)).body
  check('settings start at the defaults', [current.version, current.settings.currency, current.settings.trust.unverified], [0, 'EUR', 0.5])
  check('warm above hot is refused', (await call(settingsUrl, { ...current.settings, warmValue: 200000 }, admin, 'PUT')).status, 422)
  check('trust out of order is refused', (await call(settingsUrl, { ...current.settings, trust: { ...current.settings.trust, unverified: 0.95 } }, admin, 'PUT')).body.fields.trust !== undefined, true)
  const newer = await call(settingsUrl, { ...current.settings, hotValue: 1000000 }, admin, 'PUT')
  check('admin saves a new rules version', [newer.status, newer.body.version], [200, 1])
  a = (await call(url, null, admin)).body
  check('assessment names the rules version it used', a.settingsVersion, 1)
  check('a higher hot threshold changes the label', a.priority.label, 'Warm')
  check('rules change is audited', Boolean(await db.prepare("SELECT 1 FROM audit_log WHERE action='economics.settings' AND target='v1'").first()), true)
  check('mediator cannot change the rules', (await call(settingsUrl, null, mediator)).status, 403)

  // Disputed figures are left out, never averaged in.
  await call(`/api/admin/cases/${ref}/qualification/${cost}/verification`, { verification: 'disputed', note: 'Invoice shows a lower figure' }, admin)
  a = (await call(url, null, admin)).body
  check('a disputed cost is left out', [a.atStake, a.priority.label], [[], 'Not enough data'])
  check('the panel says why it was left out', a.notes.some((n) => n.includes('disputed')), true)

  // Who can see it (C4: administrators and the assigned mediator only).
  check('assigned mediator sees the assessment', (await call(`/api/admin/cases/${assignedRef}/assessment`, null, mediator)).status, 200)
  check('unassigned mediator does not', (await call(url, null, mediator)).status, 404)
  check('technical reviewer does not', (await call(url, null, reviewer)).status, 403)
  check('participant cannot reach it', (await call(url, null, owner)).status, 401)
  const seen = JSON.stringify([
    (await call(`/api/participant/records/${ref}`, null, owner)).body,
    (await call(`/api/participant/records/${ref}/qualification`, null, owner)).body,
    (await call(`/api/participant/records/${ref}/export`, null, owner)).body,
  ])
  check('participant views carry no economics', ['atStake', 'payback', 'priority', 'settingsVersion', 'MT-P8-TEST'].filter((w) => seen.includes(w)), [])
  check('assessments never call the AI', await aiCalls(), callsBefore)
}
