// Test entry point only. Production always builds worker/index.ts.
import app from '../worker/index'
import { deliverOutbox } from '../worker/outbox'
import { hashPassword, issueSession } from '../worker/auth'
import type { Env } from '../worker/types'

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const tasks: Promise<unknown>[] = []
    const ctx = { waitUntil: (p: Promise<unknown>) => tasks.push(p) } as ExecutionContext
    const path = new URL(request.url).pathname
    if (path === '/test/session') {
      const { email, role } = await request.json() as { email: string; role: 'admin' }
      await env.DB!.prepare(`INSERT OR IGNORE INTO users (email, role, created_at) VALUES (?, ?, ?)`)
        .bind(email, role, new Date().toISOString()).run()
      return Response.json({ token: await issueSession(env.SESSION_SECRET!, { email, role }, 1) })
    }
    if (path === '/test/outbox') return Response.json(await deliverOutbox(env))
    if (path === '/test/hash') return Response.json({ hash: await hashPassword('test-password', 'test-salt') })
    if (request.headers.get('x-test-upload-failure') === '1') {
      env = { ...env, EVIDENCE: { put: async () => { throw new Error('injected R2 outage') }, delete: async () => {} } as unknown as R2Bucket }
    }
    if (request.headers.get('x-test-email-unconfigured') === '1') env = { ...env, RESEND_API_KEY: undefined }
    const response = await app.fetch(request, env, ctx)
    await Promise.all(tasks)
    return response
  },
}
