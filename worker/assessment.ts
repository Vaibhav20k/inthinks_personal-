import type { AuthContext } from './auth'
import { bodyObject, reply } from './access-http'
import { audit } from './audit'
import { isPlatformAdmin } from './staff-access'
import { followUps } from './intake-checklist'
import {
  DEFAULT_SETTINGS, TRUSTED_STATES, energySaving, installCost, moneyAtStake, payback, priority, validateSettings, yearlySaving,
  type EconomicsSettings, type Figure, type MatchClass,
} from './economics'

/**
 * Phase 8: private automatic assessments.
 *
 * Computed on every read from the case's active qualification items and the
 * current settings, so an assessment is never stale and never stored. Only
 * administrators and the mediator assigned to the case reach these routes
 * (see case-workflow.ts); the settings are administrators only.
 */

export async function loadSettings(db: D1Database): Promise<{ version: number; settings: EconomicsSettings; createdBy: string | null; createdAt: string | null }> {
  const row = await db.prepare('SELECT version,settings,created_by,created_at FROM economics_settings ORDER BY version DESC LIMIT 1')
    .first<{ version: number; settings: string; created_by: string; created_at: string }>()
  if (!row) return { version: 0, settings: DEFAULT_SETTINGS, createdBy: null, createdAt: null }
  let stored: Partial<EconomicsSettings> = {}
  try { stored = JSON.parse(row.settings) } catch { /* fall back to defaults below */ }
  return { version: row.version, createdBy: row.created_by, createdAt: row.created_at,
    settings: { ...DEFAULT_SETTINGS, ...stored, trust: { ...DEFAULT_SETTINGS.trust, ...(stored.trust ?? {}) } } }
}

async function loadFigures(db: D1Database, references: string[]) {
  const byRef = new Map<string, Figure[]>(references.map((r) => [r, []]))
  if (!references.length) return byRef
  const rows = await db.prepare(`SELECT id,reference,category,label,comparator,value,value_max,baseline,unit,currency,period,attribution_pct,verification
    FROM qualification_items WHERE retired_at IS NULL AND reference IN (${references.map(() => '?').join(',')}) ORDER BY id`)
    .bind(...references).all<Record<string, unknown>>()
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  for (const r of rows.results) byRef.get(String(r.reference))?.push({
    id: Number(r.id), category: String(r.category), label: String(r.label), comparator: r.comparator as string | null,
    value: n(r.value), valueMax: n(r.value_max), baseline: n(r.baseline), unit: r.unit as string | null,
    currency: r.currency as string | null, period: r.period as string | null, attributionPct: n(r.attribution_pct),
    verification: String(r.verification),
  })
  return byRef
}

const RANK: Record<string, number> = { 'Strong Match': 4, 'Promising Match': 3, 'Adjacent Opportunity': 2, 'Weak Match': 1 }
interface MatchRow { reference: string; challenge_ref: string; technology_ref: string; classification: string; title: string | null }

async function matchesFor(db: D1Database, kind: 'challenge' | 'innovation', reference: string) {
  const [own, other, join] = kind === 'challenge'
    ? ['challenge_ref', 'technology_ref', 'innovations'] : ['technology_ref', 'challenge_ref', 'challenges']
  const rows = await db.prepare(`SELECT m.reference,m.challenge_ref,m.technology_ref,COALESCE(m.review_classification,m.classification) classification,t.title
    FROM matches m LEFT JOIN ${join} t ON t.reference=m.${other}
    WHERE m.${own}=? AND m.decision<>'Rejected' LIMIT 50`).bind(reference).all<MatchRow>()
  return rows.results.sort((a, b) => (RANK[b.classification] ?? 0) - (RANK[a.classification] ?? 0))
}

export async function assessCase(db: D1Database, reference: string) {
  const record = await db.prepare('SELECT kind FROM case_records WHERE reference=?').bind(reference).first<{ kind: 'challenge' | 'innovation' }>()
  if (!record) return null
  const { version, settings } = await loadSettings(db)
  const matches = await matchesFor(db, record.kind, reference)
  const others = matches.map((m) => (record.kind === 'challenge' ? m.technology_ref : m.challenge_ref))
  const figures = await loadFigures(db, [reference, ...others])
  const own = figures.get(reference) ?? []
  const base = { reference, kind: record.kind, settingsVersion: version, currency: settings.currency, trust: settings.trust,
    figureCount: own.length }

  if (record.kind === 'challenge') {
    const stake = moneyAtStake(own, settings), saving = yearlySaving(own, settings)
    const checklist = await followUps(db, reference)
    return { ...base,
      atStake: stake.totals, saving: saving.totals,
      improvement: saving.improvement && { low: saving.improvement.low, high: saving.improvement.high, label: saving.improvement.figure.label },
      energy: energySaving(own, settings),
      used: saving.improvement ? [...stake.used, saving.improvement.figure] : stake.used,
      notes: stake.notes,
      priority: priority(own, settings, { checklistMissing: checklist ? checklist.missing : null, bestMatch: (matches[0]?.classification ?? null) as MatchClass | null }),
      matches: matches.map((m) => ({ reference: m.reference, other: m.technology_ref, title: m.title, classification: m.classification,
        payback: payback(saving.totals, installCost(figures.get(m.technology_ref) ?? []).totals) })),
    }
  }
  const install = installCost(own)
  return { ...base,
    install: install.totals, used: install.used,
    matches: matches.map((m) => {
      const saving = yearlySaving(figures.get(m.challenge_ref) ?? [], settings).totals
      return { reference: m.reference, other: m.challenge_ref, title: m.title, classification: m.classification, saving,
        payback: payback(saving, install.totals) }
    }),
  }
}

/**
 * Administrator-only settings:
 *   GET /economics-settings   current rules, defaults and recent versions
 *   PUT /economics-settings   save a new version (audited)
 */
export async function economicsRoutes(request: Request, ctx: AuthContext, path: string, ip: string): Promise<Response | null> {
  if (path !== '/economics-settings') return null
  if (!isPlatformAdmin(ctx)) return reply({ error: 'Not permitted.' }, 403)
  const { db, actor } = ctx
  if (request.method === 'GET') {
    const current = await loadSettings(db)
    const history = await db.prepare('SELECT version,created_by,created_at FROM economics_settings ORDER BY version DESC LIMIT 20').all()
    return reply({ ...current, defaults: DEFAULT_SETTINGS, states: TRUSTED_STATES, history: history.results })
  }
  if (request.method !== 'PUT') return reply({ error: 'Method not allowed.' }, 405)
  const body = await bodyObject(request)
  if (!body) return reply({ error: 'Invalid request.' }, 400)
  const parsed = validateSettings(body)
  if (!parsed.ok) return reply({ error: 'Check the highlighted fields.', fields: parsed.fields }, 422)
  const row = await db.prepare('INSERT INTO economics_settings (settings,created_by,created_at) VALUES (?,?,?) RETURNING version')
    .bind(JSON.stringify(parsed.settings), actor.email, new Date().toISOString()).first<{ version: number }>()
  await audit(db, actor, 'economics.settings', `v${row?.version}`, undefined, ip)
  return reply({ version: row?.version, settings: parsed.settings })
}
