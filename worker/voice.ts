import type { Env } from './types'
import type { Participant } from './participant-auth'
import { reply } from './access-http'
import { accessibleCase } from './participant-records'
import { caseText } from './intake-checklist'
import { blankIdentity, readFigures } from './intake-extract'

/**
 * Phase 11: voice and documents, on Cloudflare Workers AI (same account, no
 * third-party API, free daily allowance). Nothing uploaded here is stored:
 * audio becomes text the participant edits before submitting, and a document
 * becomes figure suggestions the participant must still confirm one by one.
 */

export const VOICE_MODEL = '@cf/openai/whisper-large-v3-turbo'
const MAX_AUDIO = 3 * 1024 * 1024
const MAX_DOCUMENT = 10 * 1024 * 1024
const DOCUMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'csv', 'text/plain': 'txt',
}

/** One unit from today's allowance for `kind`; false when used up. */
async function reserve(db: D1Database, kind: string, limit: number) {
  const name = `${kind}:${new Date().toISOString().slice(0, 10)}`
  const row = await db.prepare(`INSERT INTO counters (name, value) SELECT ?, 1 WHERE ? > 0
      ON CONFLICT(name) DO UPDATE SET value = value + 1 WHERE counters.value < ? RETURNING value`).bind(name, limit, limit).first()
  return Boolean(row)
}
const dailyLimit = (value: string | undefined, fallback: number) => {
  const n = Number(value)
  return value !== undefined && Number.isSafeInteger(n) && n >= 0 ? n : fallback
}

function base64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

/** Participant routes: POST /voice, POST /records/:ref/read-document. */
export async function voiceRoutes(request: Request, env: Env, user: Participant, path: string): Promise<Response | null> {
  const db = env.DB!
  if (path === '/voice') {
    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405)
    if (!env.AI) return reply({ error: 'Voice input is not available right now. Please type instead.' }, 503)
    const type = request.headers.get('content-type') ?? ''
    if (!/^audio\//.test(type)) return reply({ error: 'Send a voice recording.' }, 415)
    const size = Number(request.headers.get('content-length') ?? 0)
    if (size > MAX_AUDIO) return reply({ error: 'Keep the recording under about two minutes.' }, 413)
    const bytes = new Uint8Array(await request.arrayBuffer())
    if (!bytes.length) return reply({ error: 'The recording was empty.' }, 422)
    if (bytes.length > MAX_AUDIO) return reply({ error: 'Keep the recording under about two minutes.' }, 413)
    if (!await reserve(db, 'AI-VOICE', dailyLimit(env.AI_VOICE_DAILY_LIMIT, 30)))
      return reply({ error: 'Voice input has reached today’s limit. Please type instead, or try tomorrow.' }, 429)
    try {
      const out = await env.AI.run(VOICE_MODEL, { audio: base64(bytes), task: 'transcribe' }) as { text?: unknown }
      const text = typeof out?.text === 'string' ? out.text.trim() : ''
      if (!text) return reply({ error: 'Nothing could be heard in the recording. Please try again closer to the microphone.' }, 422)
      return reply({ text: text.slice(0, 6000) })
    } catch (cause) {
      console.warn(JSON.stringify({ event: 'inthinks.voice', error: cause instanceof Error ? cause.message.slice(0, 120) : 'unknown' }))
      return reply({ error: 'The recording could not be read. Please type instead.' }, 502)
    }
  }

  const doc = path.match(/^\/records\/([A-Za-z0-9-]{1,32})\/read-document$/)
  if (!doc) return null
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405)
  const record = await accessibleCase(db, doc[1], user.email)
  if (!record) return reply({ error: 'Not found.' }, 404)
  if (!env.AI) return reply({ error: 'Reading documents is not available right now.' }, 503)
  if (Number(request.headers.get('content-length') ?? 0) > MAX_DOCUMENT + 64 * 1024) return reply({ error: 'Documents must be under 10 MB.' }, 413)
  const form = await request.formData().catch(() => null)
  const file = form?.get('document')
  if (!file || typeof file === 'string') return reply({ error: 'Choose a document.' }, 422)
  if (!DOCUMENT_TYPES[file.type]) return reply({ error: 'Use a PDF, Word, Excel, CSV or text file.' }, 415)
  if (file.size > MAX_DOCUMENT) return reply({ error: 'Documents must be under 10 MB.' }, 413)
  const source = await caseText(db, record.reference)
  if (!source) return reply({ error: 'Not found.' }, 404)
  let text = ''
  try {
    if (!env.AI.toMarkdown) return reply({ error: 'Reading documents is not available right now.' }, 503)
    const converted = await env.AI.toMarkdown({ name: `document.${DOCUMENT_TYPES[file.type]}`, blob: file }) as { format?: string; data?: string; error?: string }
    text = converted?.format === 'error' || typeof converted?.data !== 'string' ? '' : converted.data
  } catch (cause) {
    console.warn(JSON.stringify({ event: 'inthinks.document', error: cause instanceof Error ? cause.message.slice(0, 120) : 'unknown' }))
  }
  if (!text.trim()) return reply({ error: 'No text could be read from that document.' }, 422)
  const found = await readFigures(env, record.reference, source.kind, source.sector, blankIdentity(text).slice(0, 6000))
  return reply({ found, message: found ? `Found ${found} figure${found === 1 ? '' : 's'}. Check and confirm each one below.` : 'No new figures for your checklist were found in that document.' })
}
