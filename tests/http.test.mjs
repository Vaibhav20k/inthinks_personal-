import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

await build({ entryPoints: ['tests/http-worker.ts'], bundle: true, format: 'esm', platform: 'browser', external: ['node:*'], outfile: '.test-build/http-worker.mjs' })
let providerStatus = 503
const deliveries = []
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, scriptPath: '.test-build/http-worker.mjs', compatibilityDate: '2026-08-18', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], r2Buckets: ['EVIDENCE'],
  bindings: { IP_SALT: 'isolated-test-salt', SESSION_SECRET: 'isolated-test-session', PASSWORD_LOGIN: 'on',
    RESEND_API_KEY: 'fake-key', ACK_FROM: 'test@example.com', NOTIFY_WEBHOOK: 'https://notices.test/' },
  outboundService: async request => {
    deliveries.push({ url: request.url, body: await request.json() })
    return new Response('{}', { status: providerStatus })
  },
}))
const db = await mf.getD1Database('DB')
let checks = 0
function check(label, actual, expected) { assert.deepEqual(actual, expected, label); checks++; console.log(`PASS ${label}`) }
async function call(path, body, headers = {}, method = body ? 'POST' : 'GET') {
  const r = await mf.dispatchFetch(`https://inthinks.test${path}`, {
    method, headers: { origin: 'https://inthinks.test', ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: r.status, body: await r.json(), headers: r.headers }
}
const challenge = { title: 'Synthetic heat loss', statement: 'Heat escapes from an industrial kiln.', sector: 'Manufacturing', company: 'Synthetic A', contact: 'Test Owner', email: 'owner@example.com' }
const innovation = { title: 'Synthetic coating', summary: 'A low emissivity test coating', category: 'Materials', problem: 'Kiln heat loss', trl: '4', isInventor: 'Yes', owner: 'Test owner', patentFiled: 'No', name: 'Test Innovator', email: 'innovator@example.com', declarations: ['accurate','authority','ownership','coinventors','confidential','evaluate','contact'] }
try {
  // Real migrations, isolated ephemeral D1; no .wrangler developer data touched.
  for (const file of (await readdir('migrations')).filter(f => f.endsWith('.sql')).sort()) {
    if (file.startsWith('0014')) {
      await db.prepare(`INSERT INTO challenges(reference,created_at,confidentiality,company,contact_name,email,sector,title,payload)
        VALUES ('CH-LEGACY-0001','2026-01-01','standard','Legacy test','Legacy','legacy@example.com','Test','Legacy title','{"statement":"preserve me"}')`).run()
    }
    const sql = (await readFile(`migrations/${file}`, 'utf8')).replace(/--[^\n]*/g, '')
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean)
    await db.batch(statements.map(s => db.prepare(s)))
  }
  check('all migration files apply', true, true)
  check('existing submissions backfilled as unowned',(await db.prepare("SELECT organization_id FROM case_records WHERE reference='CH-LEGACY-0001'").first()).organization_id,null)
  check('migration preserves legacy answers',(await db.prepare("SELECT payload FROM challenges WHERE reference='CH-LEGACY-0001'").first()).payload,'{"statement":"preserve me"}')
  await db.batch([db.prepare("DELETE FROM case_records WHERE reference='CH-LEGACY-0001'"),db.prepare("DELETE FROM challenges WHERE reference='CH-LEGACY-0001'")])
  check('invalid submission rejected', (await call('/api/challenges', {})).status, 422)
  const key = crypto.randomUUID()
  const first = await call('/api/challenges', challenge, { 'idempotency-key': key })
  check('challenge saved despite notification failure', first.status, 201)
  check('same submission returns original reference', (await call('/api/challenges', challenge, { 'idempotency-key': key })).body.reference, first.body.reference)
  check('only one challenge stored', (await db.prepare('SELECT COUNT(*) n FROM challenges').first()).n, 1)
  check('both notifications retained for retry', (await db.prepare("SELECT COUNT(*) n FROM outbox WHERE status='pending' AND attempts=1").first()).n, 2)
  providerStatus = 200
  await db.prepare("UPDATE outbox SET next_attempt_at='2000-01-01'").run()
  await call('/test/outbox', {})
  check('notifications recover after provider outage', (await db.prepare("SELECT COUNT(*) n FROM outbox WHERE status='sent' AND payload='{}'").first()).n, 2)
  const concurrentKey = crypto.randomUUID()
  const simultaneous = await Promise.all([1,2].map(() => call('/api/challenges', challenge, { 'idempotency-key': concurrentKey })))
  check('simultaneous retries share reference', simultaneous[0].body.reference, simultaneous[1].body.reference)
  check('concurrent retries write one record', (await db.prepare('SELECT COUNT(*) n FROM challenges').first()).n, 2)
  const form = new FormData()
  form.set('record', JSON.stringify(innovation)); form.append('files', new Blob(['test evidence']), 'test.txt')
  const uploadKey = crypto.randomUUID()
  const upload = async headers => {
    const request = new Request('https://inthinks.test/api/innovations', { method: 'POST', body: form })
    const bytes = await request.arrayBuffer()
    return mf.dispatchFetch(request.url, { method: 'POST', body: bytes, headers: {
      'content-type': request.headers.get('content-type'), 'content-length': String(bytes.byteLength), 'idempotency-key': uploadKey, ...headers,
    } })
  }
  check('R2 failure returns retryable error', (await upload({ 'x-test-upload-failure': '1' })).status, 502)
  check('R2 failure leaves no innovation', (await db.prepare('SELECT COUNT(*) n FROM innovations').first()).n, 0)
  const saved = await upload({}); const savedBody = await saved.json()
  check('retry after R2 recovery saves innovation', saved.status, 201)
  check('file manifest committed', (await db.prepare('SELECT COUNT(*) n FROM evidence').first()).n, 1)
  check('upload replay retains reference', (await (await upload({})).json()).reference, savedBody.reference)
  const token = (await call('/test/session', { email: 'admin@example.com', role: 'admin' })).body.token
  const admin = { cookie: `inthinks_admin=${token}` }
  const passwordHash = (await call('/test/hash')).body.hash
  await db.prepare("UPDATE users SET password_hash=?,password_salt='test-salt' WHERE email='admin@example.com'").bind(passwordHash).run()
  check('real password login works locally',(await call('/api/admin/login',{email:'admin@example.com',password:'test-password'})).status,200)
  for (let attempt=0;attempt<9;attempt++) await call('/api/admin/login',{email:'admin@example.com',password:'incorrect'})
  check('admin login is throttled',(await call('/api/admin/login',{email:'admin@example.com',password:'incorrect'})).status,429)
  check('admin changes review status', (await call(`/api/admin/challenges/${first.body.reference}`, { reviewStatus: 'under_review' }, admin, 'PATCH')).status, 200)
  check('review status persists', (await call(`/api/admin/challenges/${first.body.reference}`, null, admin)).body.reviewStatus, 'under_review')
  const skipped = await call('/api/challenges',challenge,{'idempotency-key':crypto.randomUUID(),'x-test-email-unconfigured':'1'})
  const job = await db.prepare("SELECT id,payload FROM outbox WHERE reference=? AND status='skipped'").bind(skipped.body.reference).first()
  check('unconfigured delivery retains retry payload',Boolean(job?.payload && job.payload !== '{}'),true)
  check('admin retries skipped delivery after configuration',(await call(`/api/admin/outbox/${job.id}/retry`,{},admin)).status,200)
  check('recovered skipped job clears private payload',(await db.prepare('SELECT payload FROM outbox WHERE id=?').bind(job.id).first()).payload,'{}')
  check('anonymous admin request refused', (await call('/api/admin/challenges')).status, 401)
  check('email receipt excludes technical content', deliveries.filter(d => d.url.includes('resend')).every(d => !d.body.text.includes(challenge.statement)), true)
  // Added ownership/isolation checks run in the same database after intake checks.
  const { testOwnership } = await import('./ownership.test.mjs')
  const state = await testOwnership({ mf, db, call, check, challenge, innovation, admin, deliveries })
  const { testWorkflow } = await import('./workflow.test.mjs')
  await testWorkflow({ ...state, mf, db, call, check, innovation, admin })
  const { testEmailQuota } = await import('./email-quota.test.mjs')
  await testEmailQuota({ db, call, check, challenge, admin })
  const { testMatching } = await import('./matching.test.mjs')
  await testMatching({ mf, db, call, check, innovation, challenge, admin, deliveries })
  check('database foreign-key integrity',(await db.prepare('PRAGMA foreign_key_check').all()).results,[])
  console.log(`${checks} HTTP integration checks passed.`)
} finally { await mf.dispose() }
