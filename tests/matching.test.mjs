// Phase 9: matching without Claude — rules, figures, Workers AI similarity, reverse matching.
export async function testMatching({ mf, db, call, check, innovation, challenge, admin, deliveries }) {
  const submitInnovation = async (record) => {
    const form = new FormData()
    form.set('record', JSON.stringify(record))
    const request = new Request('https://inthinks.test/api/innovations', { method: 'POST', body: form })
    const body = await request.arrayBuffer()
    const r = await mf.dispatchFetch(request.url, { method: 'POST', body, headers: {
      'content-type': request.headers.get('content-type'), 'content-length': String(body.byteLength), 'idempotency-key': crypto.randomUUID() } })
    return (await r.json()).reference
  }
  const ai = { ...admin, 'x-test-ai': '1' }
  const now = new Date().toISOString()
  const figure = (reference, category, label, comparator, value, unit, verification) =>
    db.prepare(`INSERT INTO qualification_items (reference, category, label, comparator, value, unit, source_kind, verification, created_by, created_role, created_at, updated_at)
      VALUES (?,?,?,?,?,?,'document',?,'test','staff',?,?)`).bind(reference, category, label, comparator, value, unit, verification, now, now).run()

  const kiln = await call('/api/challenges', { ...challenge, title: 'Kiln shell heat loss', desiredTrl: 'TRL 4-6',
    statement: 'Kiln shell surface heat loss wastes energy; we need an insulating kiln coating that lowers shell temperature.' },
    { 'idempotency-key': crypto.randomUUID() })
  const kilnRef = kiln.body.reference
  const coating = await submitInnovation({ ...innovation, title: 'Insulating kiln coating', summary: 'Ceramic insulating coating for kiln shell heat loss and lower shell temperature', problem: 'Kiln shell heat loss' })
  const battery = await submitInnovation({ ...innovation, title: 'Battery separator film', summary: 'Polymer separator for lithium cells', problem: 'Dendrite growth in batteries' })
  await db.prepare('UPDATE innovations SET current_trl=5 WHERE reference IN (?,?)').bind(coating, battery).run()
  await figure(kilnRef, 'constraint', 'Shell surface temperature', 'lte', 120, '°C', 'participant_confirmed')
  await figure(coating, 'measurement', 'Shell surface temperature', 'eq', 95, '°C', 'document_checked')

  const before = deliveries.length
  const run = await call('/api/admin/matches/generate', { challenge: kilnRef }, ai)
  check('local engine runs without Claude', [run.status, run.body.engine], [200, 'rules+figures+@cf/baai/bge-m3'])
  check('writes at most three suggestions', run.body.created <= 3 && run.body.created > 0, true)
  check('no outside AI request made', deliveries.slice(before).some((d) => /anthropic/.test(d.url)), false)
  const rows = (await db.prepare('SELECT * FROM matches WHERE challenge_ref=? ORDER BY rowid').bind(kilnRef).all()).results
  const best = rows.find((r) => r.technology_ref === coating)
  check('relevant technology is suggested', Boolean(best), true)
  check('suggestion starts pending for a person', best.decision, 'Pending')
  const analysis = JSON.parse(best.analysis)
  check('verified figure appears as evidence', analysis.whyTheyMatch.some((w) => w.startsWith('Meets "Shell surface temperature"') && w.includes('verified')), true)
  check('figure fit is strong when verified and met', best.constraint_fit, 'Strong')
  check('no percentage stored', /%/.test(best.classification), false)
  check('IP is never guessed', [best.ip_availability, analysis.missingEvidence.some((m) => /IP/.test(m))], ['Unknown', true])
  const ranked = (await call(`/api/admin/matches?challenge=${kilnRef}`, null, admin)).body.items
  const coatingRow = rows.find((r) => r.technology_ref === coating), batteryRow = rows.find((r) => r.technology_ref === battery)
  check('relevant technology classified above unrelated one', !batteryRow || ['Strong Match', 'Promising Match'].includes(coatingRow.classification) && batteryRow.classification !== 'Strong Match', true)
  check('match list returns the suggestions', ranked.length, rows.length)

  const calls = (await (await mf.dispatchFetch('https://inthinks.test/test/ai-calls')).json()).calls
  await call('/api/admin/matches/generate', { challenge: kilnRef }, ai)
  check('unchanged records are not re-embedded', (await (await mf.dispatchFetch('https://inthinks.test/test/ai-calls')).json()).calls, calls)
  check('vectors stored once per record', (await db.prepare("SELECT COUNT(*) n FROM match_embeddings WHERE reference=?").bind(kilnRef).first()).n, 1)

  await db.prepare("UPDATE qualification_items SET value=150 WHERE reference=? AND category='measurement'").bind(coating).run()
  await call('/api/admin/matches/generate', { challenge: kilnRef }, ai)
  const conflicted = await db.prepare('SELECT constraint_fit, classification, analysis FROM matches WHERE challenge_ref=? AND technology_ref=?').bind(kilnRef, coating).first()
  const ca = JSON.parse(conflicted.analysis)
  check('missed figure reported as a conflict', [conflicted.constraint_fit, ca.technicalConflicts.length > 0, ca.internalRecommendation], ['Limited', true, 'Request More Information'])
  check('conflict caps the classification', ['Strong Match', 'Promising Match'].includes(conflicted.classification), false)
  await db.prepare('UPDATE matches SET decision=? WHERE challenge_ref=? AND technology_ref=?').bind('Hold', kilnRef, coating).run()
  await call('/api/admin/matches/generate', { challenge: kilnRef }, ai)
  check('rerun never overwrites a person\'s decision', (await db.prepare('SELECT decision FROM matches WHERE challenge_ref=? AND technology_ref=?').bind(kilnRef, coating).first()).decision, 'Hold')

  await db.prepare('DELETE FROM match_embeddings').run() // force a real AI call
  const fallback = await call('/api/admin/matches/generate', { challenge: kilnRef }, { ...admin, 'x-test-ai': 'fail' })
  check('AI outage falls back to rules', [fallback.status, fallback.body.engine], [200, 'rules+figures'])
  const none = await call('/api/admin/matches/generate', { challenge: kilnRef }, admin)
  check('runs with no AI binding at all', [none.status, none.body.engine], [200, 'rules+figures'])

  const leaky = await call('/api/challenges', { ...challenge, statement: 'Kiln heat loss, contact leak@example.com for data' }, { 'idempotency-key': crypto.randomUUID() })
  const leakyRun = await call('/api/admin/matches/generate', { challenge: leaky.body.reference }, ai)
  check('identity in text is never sent to the AI', [leakyRun.status, leakyRun.body.engine], [200, 'rules+figures'])
  check('no vector stored for identity-bearing text', (await db.prepare('SELECT COUNT(*) n FROM match_embeddings WHERE reference=?').bind(leaky.body.reference).first()).n, 0)

  const reverse = await call('/api/admin/matches/generate', { technology: coating }, ai)
  check('reverse matching finds problems for a technology', [reverse.status, reverse.body.created > 0 && reverse.body.created <= 3], [200, true])
  check('one identity-bearing problem does not switch off AI for the rest', reverse.body.engine, 'rules+figures+@cf/baai/bge-m3')
  const reverseList = (await call(`/api/admin/matches?technology=${coating}`, null, admin)).body.items
  check('reverse suggestions listed by technology', reverseList.every((m) => m.technologyRef === coating) && reverseList.some((m) => m.challengeRef === kilnRef), true)
  check('reverse run audited', Boolean(await db.prepare("SELECT 1 FROM audit_log WHERE action='match.generate_reverse' AND target=?").bind(coating).first()), true)
  check('unknown technology is 404', (await call('/api/admin/matches/generate', { technology: 'IN-NOPE' }, admin)).status, 404)
  check('reference required', (await call('/api/admin/matches/generate', {}, admin)).status, 422)
}
