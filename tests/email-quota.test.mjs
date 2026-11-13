// Email cap: 50/day, 1,500/month by default; codes outrank receipts.
export async function testEmailQuota({ db, call, check, challenge, admin }) {
  const day = new Date().toISOString().slice(0, 10)
  const setToday = (n) => db.prepare('INSERT INTO email_usage(day,sent) VALUES (?,?) ON CONFLICT(day) DO UPDATE SET sent=excluded.sent').bind(day, n).run()
  await db.batch([db.prepare('DELETE FROM rate_limit'), db.prepare('DELETE FROM email_usage')])

  const before = (await db.prepare('SELECT sent FROM email_usage WHERE day=?').bind(day).first())?.sent ?? 0
  check('code request is allowed under the cap', (await call('/api/participant/login/request', { email: 'quota@example.com' })).status, 200)
  check('real send is counted', (await db.prepare('SELECT sent FROM email_usage WHERE day=?').bind(day).first()).sent, before + 1)

  await setToday(40) // daily 50 minus the 10 reserved for codes
  await db.prepare("UPDATE outbox SET status='sent' WHERE status='pending'").run()
  const saved = await call('/api/challenges', { ...challenge, email: 'quota@example.com' }, { 'idempotency-key': crypto.randomUUID() })
  const receipt = await db.prepare("SELECT status,attempts,payload,next_attempt_at,last_error FROM outbox WHERE reference=? AND kind='ack_email'").bind(saved.body.reference).first()
  check('receipt over its share waits instead of failing', [receipt.status, receipt.attempts], ['pending', 0])
  check('waiting receipt keeps its delivery data', receipt.payload !== '{}', true)
  check('waiting receipt retries after UTC midnight', receipt.next_attempt_at > new Date().toISOString() && receipt.next_attempt_at.endsWith('T00:00:00.000Z'), true)
  check('codes still go out from the reserve', (await call('/api/participant/login/request', { email: 'quota2@example.com' })).status, 200)

  await setToday(50)
  const challenges = (await db.prepare('SELECT COUNT(*) n FROM verification_challenges').first()).n
  const refused = await call('/api/participant/login/request', { email: 'quota3@example.com' })
  check('daily cap stops verification email', [refused.status, /limit/.test(refused.body.error)], [503, true])
  check('refused request leaves no usable code', (await db.prepare('SELECT COUNT(*) n FROM verification_challenges').first()).n, challenges)

  await db.batch([db.prepare('DELETE FROM email_usage'), db.prepare('INSERT INTO email_usage(day,sent) VALUES (?,1500)').bind(`${day.slice(0, 7)}-00`)])
  check('monthly cap stops verification email', (await call('/api/participant/login/request', { email: 'quota4@example.com' })).status, 503)

  await setToday(45)
  const health = (await call('/api/admin/health', null, admin)).body
  check('health reports email use', [health.email.today, health.email.daily, health.email.monthly], [45, 50, 1500])
  check('health warns near the cap', health.warnings.some((w) => w.startsWith('Email use')), true)
  await db.batch([db.prepare('DELETE FROM email_usage'), db.prepare('DELETE FROM rate_limit')])
}
