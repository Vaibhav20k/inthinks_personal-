import { assertNoIdentity } from './match-engine'
import { caseText, checklistFor } from './intake-checklist'
import type { ChecklistItem } from './intake-checklist'
import type { Env } from './types'

/**
 * Phase 7 — figures read from a submission's own text.
 *
 * Cloudflare Workers AI (same account as the records) reads the text and
 * proposes values for missing checklist items. Nothing it says is trusted:
 * a proposal is kept only if its unit is one the item allows and its exact
 * quote, number included, appears in the submission. Kept proposals wait as
 * suggestions until the participant confirms them.
 *
 * Runs are capped per UTC day (default 40) so the free allowance is never
 * exhausted by intake; matching keeps its share.
 */

// Checked live 14 Nov 2026: ~7 free-allowance units per run with thinking off.
// (@cf/meta/llama-3.1-8b-instruct was retired by Cloudflare on 30 May 2026.)
export const EXTRACT_MODEL = '@cf/zai-org/glm-4.7-flash'

const limit = (env: Env) => {
  const n = Number(env.AI_EXTRACT_DAILY_LIMIT)
  return Number.isSafeInteger(n) && n >= 0 ? n : 40
}

/** Takes one run from today's allowance; false when the day is used up. */
async function reserveRun(db: D1Database, env: Env) {
  const name = `AI-EXTRACT:${new Date().toISOString().slice(0, 10)}`
  const row = await db.prepare(`INSERT INTO counters (name, value) SELECT ?, 1 WHERE ? > 0
      ON CONFLICT(name) DO UPDATE SET value = value + 1 WHERE counters.value < ? RETURNING value`)
    .bind(name, limit(env), limit(env)).first<{ value: number }>()
  return Boolean(row)
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

function numberIn(quote: string, value: number) {
  const digits = quote.replace(/(\d),(\d)/g, '$1$2').match(/-?\d+(?:\.\d+)?/g) ?? []
  return digits.some((d) => Number(d) === value)
}

export interface Proposal { key: string; value: number; unit: string; quote: string }

/** Keeps only proposals that are grounded in the text and fit the checklist. */
export function groundProposals(raw: unknown, items: ChecklistItem[], body: string): Proposal[] {
  const list = Array.isArray((raw as { figures?: unknown })?.figures) ? (raw as { figures: unknown[] }).figures : []
  const haystack = squash(body)
  const seen = new Set<string>()
  const out: Proposal[] = []
  for (const entry of list) {
    const f = entry as Record<string, unknown>
    const item = items.find((i) => i.key === f.key)
    const value = typeof f.value === 'number' ? f.value : Number(f.value)
    const unit = String(f.unit ?? '')
    const quote = String(f.quote ?? '').slice(0, 300)
    if (!item || item.category === 'cost' || seen.has(item.key)) continue
    if (!Number.isFinite(value) || !item.units.includes(unit)) continue
    if (quote.length < 3 || !haystack.includes(squash(quote)) || !numberIn(quote, value)) continue
    seen.add(item.key)
    out.push({ key: item.key, value, unit, quote })
  }
  return out
}

function prompt(items: ChecklistItem[], body: string) {
  const wanted = items.map((i) => `- key "${i.key}": ${i.label} (unit one of: ${i.units.join(', ')})`).join('\n')
  return `Read the record below and find numbers for these figures:
${wanted}

Rules: use only numbers written in the record. Never estimate or convert. Skip a
figure if the record does not state it. "quote" must be copied exactly from the
record and contain the number.
Reply with JSON only: {"figures":[{"key":"...","value":0,"unit":"...","quote":"..."}]}

<record>
${body.slice(0, 6000)}
</record>`
}

/** Background step after a submission is saved. Never throws. */
export async function extractSuggestions(env: Env, reference: string) {
  if (!env.DB || !env.AI || env.AUTO_EXTRACT === 'off') return 0
  const db = env.DB
  try {
    const source = await caseText(db, reference)
    if (!source || !source.body.trim()) return 0
    const items = checklistFor(source.kind, source.sector).items.filter((i) => i.category !== 'cost')
    if (!items.length) return 0
    try { assertNoIdentity(source.body) } catch { return 0 } // identity never leaves; participant fills the form by hand
    if (!await reserveRun(db, env)) return 0
    const out = await env.AI.run(EXTRACT_MODEL, {
      messages: [{ role: 'system', content: 'You extract stated figures from documents and reply with JSON only.' },
        { role: 'user', content: prompt(items, source.body) }],
      max_tokens: 400, temperature: 0,
      // A reasoning model: without this it spends the token budget thinking
      // and returns no answer.
      chat_template_kwargs: { enable_thinking: false },
    }) as { response?: unknown; choices?: { message?: { content?: unknown } }[] }
    const content = out?.choices?.[0]?.message?.content ?? out?.response
    const reply = typeof content === 'string' ? content : JSON.stringify(content ?? '')
    const json = reply.match(/\{[\s\S]*\}/)?.[0]
    if (!json) { console.warn(JSON.stringify({ event: 'inthinks.intake', step: 'extract', error: 'no JSON in model reply' })); return 0 }
    const proposals = groundProposals(JSON.parse(json), items, source.body)
    if (!proposals.length) return 0
    const now = new Date().toISOString()
    await db.batch(proposals.map((p) => db.prepare(`INSERT INTO intake_suggestions (reference, item_key, value, unit, quote, model, created_at)
        VALUES (?,?,?,?,?,?,?) ON CONFLICT(reference, item_key) DO NOTHING`).bind(reference, p.key, p.value, p.unit, p.quote, EXTRACT_MODEL, now)))
    return proposals.length
  } catch (cause) {
    console.warn(JSON.stringify({ event: 'inthinks.intake', step: 'extract', error: cause instanceof Error ? cause.message.slice(0, 120) : 'unknown' }))
    return 0
  }
}
