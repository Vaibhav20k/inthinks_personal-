/**
 * Phase 7 — sector checklists.
 *
 * The figures that matter for each kind of case and sector. A checklist item
 * is filled once the case has an active qualification item with the same
 * label, so participant answers and staff entries both count. Units are the
 * step-6 catalogue codes; matching (phase 9) compares figures unit for unit,
 * so a problem's limit in °C can be checked against a solution's tested °C.
 *
 * Edit freely: these are product decisions, not code logic.
 */

export type CaseKind = 'challenge' | 'innovation'

export interface ChecklistItem {
  key: string
  label: string
  category: 'measurement' | 'constraint' | 'cost' | 'success_criterion'
  /** Allowed units; the first is the default. Empty for costs. */
  units: string[]
  /** Fixed comparison for limits and targets. */
  comparator?: 'gte' | 'lte' | 'eq'
  /** Costs only. */
  period?: 'one_off' | 'per_year'
  /** What the participant is asked. Also used as a clarification question. */
  question: string
}

const COST_OF_PROBLEM: ChecklistItem = {
  key: 'problem_cost', label: 'Yearly cost of this problem', category: 'cost', units: [], period: 'per_year',
  question: 'Roughly how much does this problem cost you each year, and what share of that cost does it cause?',
}
const TARGET: ChecklistItem = {
  key: 'improvement_target', label: 'Improvement needed', category: 'success_criterion', units: ['%'], comparator: 'gte',
  question: 'By what percentage would the result need to improve for a solution to be worth adopting?',
}

const CHALLENGE: Record<string, ChecklistItem[]> = {
  default: [COST_OF_PROBLEM, TARGET],
  manufacturing: [
    { key: 'process_temperature', label: 'Temperature the solution must withstand', category: 'constraint', units: ['°C'], comparator: 'gte',
      question: 'What is the highest temperature a solution would have to work at?' },
    { key: 'energy_use', label: 'Current energy use of this process', category: 'measurement', units: ['kWh/year', 'MWh/year'],
      question: 'How much energy does this process use per year today?' },
    { key: 'downtime', label: 'Downtime per year caused by the problem', category: 'measurement', units: ['h', 'day'],
      question: 'How many hours of downtime per year does this problem cause?' },
    COST_OF_PROBLEM, TARGET,
  ],
  energy: [
    { key: 'energy_use', label: 'Current energy use of this process', category: 'measurement', units: ['MWh/year', 'kWh/year'],
      question: 'How much energy does this process use per year today?' },
    { key: 'emissions', label: 'Current emissions', category: 'measurement', units: ['tCO2e/year'],
      question: 'What are the yearly emissions linked to this problem?' },
    COST_OF_PROBLEM, TARGET,
  ],
  water: [
    { key: 'flow_rate', label: 'Flow to be treated', category: 'measurement', units: ['m3/h', 'L/min'],
      question: 'What flow of water or effluent would a solution need to handle?' },
    { key: 'outlet_limit', label: 'Required outlet concentration', category: 'constraint', units: ['mg/L', 'ppm'], comparator: 'lte',
      question: 'What outlet concentration must be reached?' },
    COST_OF_PROBLEM, TARGET,
  ],
  construction: [
    { key: 'required_strength', label: 'Strength the solution must reach', category: 'constraint', units: ['MPa'], comparator: 'gte',
      question: 'What strength (in MPa) must a solution reach?' },
    { key: 'required_service_life', label: 'Service life required', category: 'constraint', units: ['year'], comparator: 'gte',
      question: 'How many years must a solution last in service?' },
    COST_OF_PROBLEM, TARGET,
  ],
  mining: [
    { key: 'ore_throughput', label: 'Material throughput to handle', category: 'measurement', units: ['t/year', 'kg/h'],
      question: 'How much material per year would a solution need to handle?' },
    { key: 'water_use', label: 'Current water use of this process', category: 'measurement', units: ['m3/h', 'L/min'],
      question: 'How much water does this process use today?' },
    { key: 'energy_use', label: 'Current energy use of this process', category: 'measurement', units: ['MWh/year', 'kWh/year'],
      question: 'How much energy does this process use per year today?' },
    COST_OF_PROBLEM, TARGET,
  ],
  electronics: [
    { key: 'operating_temperature', label: 'Temperature the solution must withstand', category: 'constraint', units: ['°C'], comparator: 'gte',
      question: 'What is the highest temperature a solution would have to work at?' },
    { key: 'power_limit', label: 'Maximum power the solution may draw', category: 'constraint', units: ['W', 'kW'], comparator: 'lte',
      question: 'What is the most power a solution may draw?' },
    COST_OF_PROBLEM, TARGET,
  ],
  food: [
    { key: 'throughput', label: 'Throughput to handle', category: 'measurement', units: ['units/day', 'units/h', 'kg/h'],
      question: 'What throughput would a solution need to handle?' },
    { key: 'process_temperature', label: 'Temperature the solution must withstand', category: 'constraint', units: ['°C'], comparator: 'gte',
      question: 'What is the highest temperature a solution would have to work at?' },
    COST_OF_PROBLEM, TARGET,
  ],
}

const INNOVATION: Record<string, ChecklistItem[]> = {
  default: [
    { key: 'tested_temperature', label: 'Highest temperature tested', category: 'measurement', units: ['°C'],
      question: 'What is the highest temperature your solution has been tested at?' },
    { key: 'tested_improvement', label: 'Improvement measured in tests', category: 'measurement', units: ['%'],
      question: 'What improvement (in %) have tests shown?' },
    { key: 'first_install_cost', label: 'Estimated cost of a first installation', category: 'cost', units: [], period: 'one_off',
      question: 'Roughly what would a first installation cost?' },
  ],
  construction: [
    { key: 'tested_strength', label: 'Strength measured in tests', category: 'measurement', units: ['MPa'],
      question: 'What strength (in MPa) has your solution reached in tests?' },
    { key: 'tested_service_life', label: 'Service life shown or projected', category: 'measurement', units: ['year'],
      question: 'How many years of service has your solution shown or been projected to last?' },
    { key: 'first_install_cost', label: 'Estimated cost of a first installation', category: 'cost', units: [], period: 'one_off',
      question: 'Roughly what would a first installation cost?' },
  ],
  electronics: [
    { key: 'tested_temperature', label: 'Highest temperature tested', category: 'measurement', units: ['°C'],
      question: 'What is the highest temperature your solution has been tested at?' },
    { key: 'power_draw', label: 'Power drawn in operation', category: 'measurement', units: ['W', 'kW'],
      question: 'How much power does your solution draw in operation?' },
    { key: 'first_install_cost', label: 'Estimated cost of a first installation', category: 'cost', units: [], period: 'one_off',
      question: 'Roughly what would a first installation cost?' },
  ],
  energy: [
    { key: 'energy_saving', label: 'Energy saved per year in tests', category: 'measurement', units: ['kWh/year', 'MWh/year'],
      question: 'How much energy per year has your solution saved in tests or pilots?' },
    { key: 'tested_improvement', label: 'Improvement measured in tests', category: 'measurement', units: ['%'],
      question: 'What improvement (in %) have tests shown?' },
    { key: 'first_install_cost', label: 'Estimated cost of a first installation', category: 'cost', units: [], period: 'one_off',
      question: 'Roughly what would a first installation cost?' },
  ],
}

/**
 * The 11 sectors the submission forms offer (src/data/taxonomy.ts), each
 * mapped to a checklist. Keep this in step with that list.
 */
export const FORM_SECTORS: Record<string, string> = {
  Manufacturing: 'manufacturing', Automotive: 'manufacturing', Chemicals: 'manufacturing',
  Materials: 'manufacturing', 'Consumer Products': 'manufacturing',
  Energy: 'energy', Construction: 'construction', Infrastructure: 'construction',
  Mining: 'mining', Electronics: 'electronics', Agriculture: 'food',
}

/** Free-text fallback for authored records and solution industry lists. */
const SECTOR_WORDS: [RegExp, string][] = [
  [/manufactur|cement|ceramic|steel|metal|kiln|factory|textile|chemical|automotive/i, 'manufacturing'],
  [/energy|power|solar|wind|grid|oil|gas/i, 'energy'],
  [/water|wastewater|effluent|sanitation/i, 'water'],
  [/construct|building|cement|concrete|infrastructure|road|bridge/i, 'construction'],
  [/mining|mineral|ore\b|quarry/i, 'mining'],
  [/electronic|semiconductor|sensor|battery|pcb/i, 'electronics'],
  [/food|agri|dairy|beverage/i, 'food'],
]

export function sectorKey(text: string) {
  for (const [name, key] of Object.entries(FORM_SECTORS)) if (new RegExp(`\\b${name}\\b`, 'i').test(text)) return key
  for (const [pattern, key] of SECTOR_WORDS) if (pattern.test(text)) return key
  return 'default'
}

export function checklistFor(kind: CaseKind, sectorText: string) {
  const table = kind === 'challenge' ? CHALLENGE : INNOVATION
  const sector = sectorKey(sectorText)
  return { sector, items: table[sector] ?? table.default }
}

const parse = (raw: unknown) => { try { return typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown> : {} } catch { return {} } }
const text = (v: unknown) => Array.isArray(v) ? v.map(String).join(', ') : typeof v === 'string' ? v : ''

/** The case's kind, sector text and free text, read from its submission. */
export async function caseText(db: D1Database, reference: string) {
  const record = await db.prepare('SELECT kind FROM case_records WHERE reference=?').bind(reference).first<{ kind: string }>()
  if (!record) return null
  if (record.kind === 'challenge') {
    const row = await db.prepare('SELECT title, sector, payload FROM challenges WHERE reference=?').bind(reference).first<Record<string, unknown>>()
    if (!row) return null
    const p = parse(row.payload)
    return { kind: 'challenge' as const, sector: String(row.sector ?? ''),
      body: [row.title, p.statement, p.currentSolution, p.success, p.performance, p.constraints].map(text).filter(Boolean).join('\n') }
  }
  const row = await db.prepare('SELECT title, category, payload FROM innovations WHERE reference=?').bind(reference).first<Record<string, unknown>>()
  if (!row) return null
  const p = parse(row.payload)
  return { kind: 'innovation' as const, sector: `${text(p.industries)} ${row.category ?? ''}`,
    body: [row.title, p.summary, p.technical, p.problem, p.principle, p.applications, p.results].map(text).filter(Boolean).join('\n') }
}

export interface FollowUp extends ChecklistItem {
  filled: boolean
  suggestion: { id: number; value: number; unit: string; quote: string } | null
}

/** The checklist for one case: which figures exist and which are still missing. */
export async function followUps(db: D1Database, reference: string) {
  const source = await caseText(db, reference)
  if (!source) return null
  const { sector, items } = checklistFor(source.kind, source.sector)
  const labels = await db.prepare('SELECT LOWER(label) label FROM qualification_items WHERE reference=? AND retired_at IS NULL').bind(reference).all<{ label: string }>()
  const have = new Set(labels.results.map((r) => r.label))
  const suggestions = await db.prepare("SELECT id, item_key, value, unit, quote FROM intake_suggestions WHERE reference=? AND status='suggested'").bind(reference).all<Record<string, unknown>>()
  const byKey = new Map(suggestions.results.map((s) => [String(s.item_key), { id: Number(s.id), value: Number(s.value), unit: String(s.unit), quote: String(s.quote) }]))
  const list: FollowUp[] = items.map((item) => {
    const filled = have.has(item.label.toLowerCase())
    return { ...item, filled, suggestion: filled ? null : byKey.get(item.key) ?? null }
  })
  return { kind: source.kind, sector, items: list, missing: list.filter((i) => !i.filled).length }
}

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

/**
 * Participant follow-up routes under /records/:ref/follow-ups.
 *   GET                 the checklist with filled state and suggestions
 *   POST /:id/accept    turn a suggestion into the participant's own figure
 *   POST /:id/dismiss   reject a suggestion
 * The caller has already proved the participant may access the case.
 */
export async function followUpRoutes(request: Request, db: D1Database, reference: string, email: string, rest: string,
  addFigure: (body: Record<string, unknown>) => Promise<Response>) {
  if (!rest && request.method === 'GET') {
    const state = await followUps(db, reference)
    return state ? reply(state) : reply({ error: 'Not found.' }, 404)
  }
  const action = rest.match(/^\/(\d{1,12})\/(accept|dismiss)$/)
  if (!action || request.method !== 'POST') return reply({ error: 'Not found.' }, 404)
  const suggestion = await db.prepare("SELECT * FROM intake_suggestions WHERE id=? AND reference=? AND status='suggested'")
    .bind(Number(action[1]), reference).first<Record<string, unknown>>()
  if (!suggestion) return reply({ error: 'This suggestion is no longer open.' }, 409)
  const now = new Date().toISOString()
  if (action[2] === 'accept') {
    const state = await followUps(db, reference)
    const item = state?.items.find((i) => i.key === suggestion.item_key)
    if (!item) return reply({ error: 'This suggestion is no longer open.' }, 409)
    const added = await addFigure({
      category: item.category, label: item.label, comparator: item.category === 'measurement' ? null : item.comparator ?? null,
      value: suggestion.value, unit: suggestion.unit, sourceKind: 'participant_statement',
      sourceDetail: `Confirmed by the submitter from their own text: "${String(suggestion.quote).slice(0, 400)}"`,
    })
    if (!added.ok) return added
  }
  await db.prepare('UPDATE intake_suggestions SET status=?, decided_at=? WHERE id=?')
    .bind(action[2] === 'accept' ? 'accepted' : 'dismissed', now, Number(action[1])).run()
  void email
  return reply({ ok: true })
}
