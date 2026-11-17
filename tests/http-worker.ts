// Test entry point only. Production always builds worker/index.ts.
import app from '../worker/index'
import { deliverOutbox } from '../worker/outbox'
import { hashPassword, issueSession } from '../worker/auth'
import type { Env } from '../worker/types'

// Deterministic stand-in for Workers AI: hashed bag of words, unit length.
let aiCalls = 0
const fakeAi = {
  async run(model: string, input: unknown) {
    aiCalls++
    if (model.includes('whisper')) {
      // Voice: the "audio" is base64 text; silence is an empty clip.
      const said = new TextDecoder().decode(Uint8Array.from(atob((input as { audio: string }).audio), (c) => c.charCodeAt(0)))
      return { text: said.startsWith('SILENCE') ? '' : said }
    }
    if (!model.includes('bge')) {
      // Figure reader: finds "<n> °C" in the record, and also invents a value
      // that is not in the text, which the grounding check must reject.
      const prompt = (input as { messages: { content: string }[] }).messages.at(-1)!.content
      const record = prompt.split('<record>')[1] ?? ''
      const tempKey = prompt.match(/key "([a-z_]+)": [^\n]*unit one of: °C/)?.[1]
      const pctKey = prompt.match(/key "([a-z_]+)": [^\n]*unit one of: %/)?.[1]
      const hit = record.match(/[^.\n]*?(\d+)\s*°C[^.\n]*/)
      const figures = [
        ...(tempKey && hit ? [{ key: tempKey, value: Number(hit[1]), unit: '°C', quote: hit[0].trim() }] : []),
        ...(pctKey ? [{ key: pctKey, value: 37, unit: '%', quote: 'improve by 37%' }] : []),
      ]
      return { choices: [{ message: { content: '```json\n' + JSON.stringify({ figures }) + '\n```' } }] }
    }
    const texts = (input as { text: string[] }).text
    return { data: texts.map((t) => {
      const v = new Array(64).fill(0)
      for (const w of t.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
        let h = 0; for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) >>> 0
        v[h % 64] += 1
      }
      const n = Math.hypot(...v) || 1
      return v.map((x) => x / n)
    }) }
  },
}
;(fakeAi as Record<string, unknown>).toMarkdown = async (file: { name: string; blob: Blob }) => {
  aiCalls++
  // Documents: the "document" bytes are plain text.
  return { id: '1', name: file.name, mimeType: file.blob.type, format: 'markdown', tokens: 1, data: await file.blob.text() }
}
const failingAi = { async run() { aiCalls++; throw new Error('daily allowance used') } }

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
    if (path === '/test/ai-calls') return Response.json({ calls: aiCalls })
    if (path === '/test/hash') return Response.json({ hash: await hashPassword('test-password', 'test-salt') })
    if (request.headers.get('x-test-upload-failure') === '1') {
      env = { ...env, EVIDENCE: { put: async () => { throw new Error('injected R2 outage') }, delete: async () => {} } as unknown as R2Bucket }
    }
    const aiMode = request.headers.get('x-test-ai')
    if (aiMode) env = { ...env, AI: aiMode === 'fail' ? failingAi : fakeAi }
    if (request.headers.get('x-test-email-unconfigured') === '1') env = { ...env, RESEND_API_KEY: undefined }
    const response = await app.fetch(request, env, ctx)
    await Promise.all(tasks)
    return response
  },
}
