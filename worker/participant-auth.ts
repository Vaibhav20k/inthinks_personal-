import type { Env } from './types'
import { bodyObject, cookie, digest, emailValue, reply } from './access-http'
import { checkLogin, ipTag } from './ratelimit'

export const PARTICIPANT_COOKIE = 'inthinks_participant'
export interface Participant { email: string }
export async function participant(env: Env, request: Request): Promise<Participant | null> {
  const token = cookie(request, PARTICIPANT_COOKIE)
  if (!env.DB || !token || token.length > 100) return null
  return env.DB.prepare(`SELECT p.email FROM participant_sessions s JOIN participants p ON p.email=s.email
    WHERE s.token_hash=? AND s.expires_at>? AND p.disabled=0`)
    .bind(await digest(token), new Date().toISOString()).first<Participant>()
}
const sessionCookie = (token: string, age = 28800) =>
  `${PARTICIPANT_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`

/** Codes are never returned by the API, including local development. */
export async function participantAuth(request: Request, env: Env, path: string) {
  if (!env.DB || !env.IP_SALT) return reply({ error: 'Account access is not configured.' },503)
  const db = env.DB
  if (path === '/login/request' && request.method === 'POST') {
    if (!env.RESEND_API_KEY || !env.ACK_FROM || !env.SESSION_SECRET) return reply({ error: 'Verification email is not configured.' },503)
    const body = await bodyObject(request)
    const email = emailValue(body?.email)
    if (!email) return reply({ error: 'Enter a valid email address.' },422)
    const tag = await ipTag(request.headers.get('cf-connecting-ip') ?? '0.0.0.0',env.IP_SALT)
    if (!await checkLogin(db,`participant:${tag}`,`participant:${email}`)) return reply({ error: 'Too many requests. Try again later.' },429)
    const id = crypto.randomUUID()
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 100_000_000).padStart(8,'0')
    const now = new Date().toISOString()
    await db.batch([
      db.prepare('DELETE FROM verification_challenges WHERE expires_at<?').bind(now),
      db.prepare('DELETE FROM participant_sessions WHERE expires_at<?').bind(now),
      db.prepare('INSERT INTO verification_challenges(id,email,code_hash,expires_at) VALUES (?,?,?,?)')
        .bind(id,email,await digest(`${env.SESSION_SECRET}:${id}:${code}`),new Date(Date.now()+600_000).toISOString()),
    ])
    try {
      const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: env.ACK_FROM, to: [email], subject: 'Your InThinks verification code',
          text: `Your InThinks code is ${code}. It expires in 10 minutes. Never share it. If you did not request it, ignore this message.` }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!sent.ok) throw new Error('delivery failed')
    } catch {
      await db.prepare('DELETE FROM verification_challenges WHERE id=?').bind(id).run()
      return reply({ error: 'Unable to send the verification email. Please try again.' },503)
    }
    return reply({ requestId: id })
  }
  if (path === '/login/verify' && request.method === 'POST') {
    if (!env.SESSION_SECRET) return reply({ error: 'Account access is not configured.' },503)
    const body = await bodyObject(request)
    const id = typeof body?.requestId === 'string' ? body.requestId : ''
    const code = typeof body?.code === 'string' ? body.code : ''
    if (id.length !== 36 || !/^\d{8}$/.test(code)) return reply({ error: 'Invalid or expired code.' },401)
    const row = await db.prepare(`UPDATE verification_challenges SET attempts=attempts+1
      WHERE id=? AND consumed=0 AND attempts<5 AND expires_at>? RETURNING email,code_hash`)
      .bind(id,new Date().toISOString()).first<{email:string;code_hash:string}>()
    if (!row || row.code_hash !== await digest(`${env.SESSION_SECRET}:${id}:${code}`)) return reply({ error: 'Invalid or expired code.' },401)
    const used = await db.prepare('UPDATE verification_challenges SET consumed=1 WHERE id=? AND consumed=0 RETURNING id').bind(id).first()
    if (!used) return reply({ error: 'Invalid or expired code.' },401)
    await db.prepare('INSERT OR IGNORE INTO participants(email,verified_at) VALUES (?,?)').bind(row.email,new Date().toISOString()).run()
    const account = await db.prepare('SELECT disabled FROM participants WHERE email=?').bind(row.email).first<{disabled:number}>()
    if (account?.disabled) return reply({ error: 'Account unavailable.' },403)
    const token = crypto.randomUUID()+crypto.randomUUID()
    await db.prepare('INSERT INTO participant_sessions(token_hash,email,expires_at) VALUES (?,?,?)')
      .bind(await digest(token),row.email,new Date(Date.now()+28_800_000).toISOString()).run()
    return reply({ email: row.email },200,{ 'set-cookie': sessionCookie(token) })
  }
  if (path === '/logout' && request.method === 'POST') {
    const token = cookie(request,PARTICIPANT_COOKIE)
    if (token) await db.prepare('DELETE FROM participant_sessions WHERE token_hash=?').bind(await digest(token)).run()
    return reply({ ok:true },200,{ 'set-cookie': sessionCookie('',0) })
  }
  return null
}
