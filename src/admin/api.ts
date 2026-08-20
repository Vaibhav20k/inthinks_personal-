/**
 * Admin API client.
 *
 * Session lives in an HttpOnly cookie, so nothing here touches a token — the
 * browser attaches it and script cannot read it. Every response is already
 * filtered server-side for the caller's role; this layer never decides what
 * may be seen.
 */

export interface Capabilities {
  viewSubmissions: boolean
  viewInnovatorIdentity: boolean
  viewChallengeContacts: boolean
  score: boolean
  moveAcquisitionStage: boolean
  editReviewState: boolean
  downloadEvidence: boolean
  viewCommercialTerms: boolean
  manageUsers: boolean
  viewAudit: boolean
}

export type Role = 'super-admin' | 'admin' | 'business-development' | 'rnd-reviewer'

export interface Me {
  email: string
  role: Role
  can: Capabilities
}

export class AdminError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminError'
    this.status = status
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    /* handled below */
  }
  if (!response.ok) {
    const message = (body as { error?: string })?.error ?? 'Request failed'
    throw new AdminError(message, response.status)
  }
  return body as T
}

export const adminConfig = () =>
  call<{ configured: boolean; access: boolean; passwords: boolean }>('/config')

export const me = () => call<Me>('/me')

export const login = (email: string, password: string) =>
  call<{ email: string; role: Role }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const logout = () => call<{ ok: true }>('/logout', { method: 'POST' })

export interface Meta {
  dimensions: { key: string; label: string }[]
  acquisitionStages: string[]
  challengeStatuses: string[]
  innovationStatuses: string[]
  developmentStages: string[]
  logKinds: string[]
  readinessDimensions: { key: string; label: string }[]
  readinessStatuses: string[]
  pipelineStages: string[]
  opportunityStages: string[]
  dealTypes: string[]
  exclusivity: string[]
  royaltyBases: string[]
  rightsPositions: string[]
  agreementStatuses: string[]
  closingStatuses: string[]
  milestoneStatuses: string[]
  paymentStatuses: string[]
  documentKinds: string[]
  documentStatuses: string[]
  dealEligibleStages: string[]
  royaltyTypes: string[]
  reportingPeriods: string[]
  royaltyStatuses: string[]
  periodStatuses: string[]
  roles: Role[]
}
export const meta = () => call<Meta>('/meta')

export interface Overview {
  innovations: number
  qualified: number
  inDevelopment: number
  challenges: number
  averageEntryTrl: number | null
  averageCurrentTrl: number | null
  byCategory: { k: string; n: number }[]
  byInstitutionType: { k: string; n: number }[] | null
  bySector: { k: string; n: number }[]
  byAcquisitionStage: { k: string; n: number }[]
}
export const overview = () => call<Overview>('/overview')

export interface InnovationSummary {
  reference: string
  createdAt: string
  status: string
  acquisitionStage: string
  title: string
  internalTitle: string | null
  category: string
  entryTrl: number
  currentTrl: number | null
  targetTrl: number | null
  reviewer: string | null
  institutionType: string | null
  evidenceCount: number
  innovator?: string
  innovatorEmail?: string
  institution?: string | null
}

export interface Score {
  dimension: string
  value: number | null
  note: string | null
  scored_by: string
  scored_at: string
}

export interface Note {
  id: number
  body: string
  author: string
  created_at: string
}

export interface EvidenceFile {
  fileName: string
  contentType: string | null
  sizeBytes: number
  url: string | null
}

export interface InnovationDetail extends InnovationSummary {
  payload: Record<string, unknown>
  identityWithheld: boolean
  scores: Score[]
  notes: Note[]
  evidence: EvidenceFile[]
}

export const innovations = (params: Record<string, string> = {}) => {
  const q = new URLSearchParams(params).toString()
  return call<{ items: InnovationSummary[] }>(`/innovations${q ? `?${q}` : ''}`)
}
export const innovation = (reference: string) => call<InnovationDetail>(`/innovations/${reference}`)

export const patchInnovation = (reference: string, patch: Record<string, unknown>) =>
  call<{ ok: true }>(`/innovations/${reference}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const setScore = (reference: string, dimension: string, value: number | null, note: string) =>
  call<{ ok: true }>(`/innovations/${reference}/scores`, {
    method: 'POST',
    body: JSON.stringify({ dimension, value, note }),
  })

export interface ChallengeSummary {
  reference: string
  createdAt: string
  status: string
  confidentiality: string
  sector: string
  title: string
  analyst: string | null
  company?: string
  contactName?: string
  designation?: string | null
  email?: string
  phone?: string | null
  location?: string | null
  website?: string | null
}

export interface ChallengeDetail extends ChallengeSummary {
  payload: Record<string, unknown>
  contactsWithheld: boolean
  notes: Note[]
}

export interface TechProfileRow {
  reference: string
  origin: 'submission' | 'authored'
  recordType: 'demo' | 'live'
  slug: string
  name: string
  currentTrl: number | null
  targetTrl: number | null
  domain: string | null
  transferStatus: string
  ipStatus: string
  acquisitionStage: string | null
  published: boolean
  publishedAt: string | null
  updatedAt: string
}

export interface ProblemProfile {
  reference: string
  origin: 'submission' | 'authored'
  recordType: 'demo' | 'live'
  slug: string
  title: string
  sector: string
  priorityArea: string
  target: string
  summary: string
  problem: string
  currentApproach: string
  targetOutcome: string
  constraints: string[]
  environment: string[]
  impact: string[]
  outcomes: string[]
  minimumTrl: number
  status: string
  published: boolean
  publishedAt: string | null
  publishedBy: string | null
  updatedAt: string
}

export const techProfiles = () =>
  call<{ items: TechProfileRow[]; recordTypes: string[] }>('/tech-profiles')

export const createTechProfile = (body: Record<string, unknown>) =>
  call<{ reference: string; slug: string }>('/tech-profiles', { method: 'POST', body: JSON.stringify(body) })

export const patchTechFacts = (reference: string, body: Record<string, unknown>) =>
  call<{ ok: true }>(`/tech-profiles/${reference}/facts`, { method: 'PATCH', body: JSON.stringify(body) })

export const problemProfiles = () =>
  call<{
    items: ProblemProfile[]
    statuses: string[]
    priorityAreas: string[]
    sectors: string[]
    recordTypes: string[]
  }>('/problem-profiles')

export const problemProfile = (reference: string) =>
  call<ProblemProfile>(`/problem-profiles/${reference}`)

export const createProblemProfile = (body: Record<string, unknown>) =>
  call<{ reference: string; slug: string }>('/problem-profiles', { method: 'POST', body: JSON.stringify(body) })

export const saveProblemProfile = (reference: string, body: Record<string, unknown>) =>
  call<{ ok: true; slug: string }>(`/problem-profiles/${reference}`, { method: 'PUT', body: JSON.stringify(body) })

export const publishProblemProfile = (reference: string, published: boolean) =>
  call<{ ok: true; published: boolean }>(`/problem-profiles/${reference}/publish`, {
    method: 'POST', body: JSON.stringify({ published }),
  })

/** Demo or live, on either kind of record — one endpoint, one audit action. */
export const setRecordType = (kind: 'tech' | 'problem' | 'match', reference: string, recordType: 'demo' | 'live') =>
  call<{ ok: true; recordType: string }>(`/${kind}-profiles/${reference}/record-type`, {
    method: 'POST', body: JSON.stringify({ recordType }),
  })

export interface MatchProfile {
  reference: string
  recordType: 'demo' | 'live'
  slug: string
  problemRef: string
  problemTitle: string | null
  problemSlug: string | null
  problemPublished: boolean
  technologyRef: string
  technologyName: string | null
  technologySlug: string | null
  technologyPublished: boolean
  sourceMatchRef: string | null
  sourceDecision: string | null
  matchClass: string
  status: string
  rationale: string
  nextStep: string
  openQuestions: string[]
  fit: { dimension: string; rating: string }[]
  developmentRequired: string
  published: boolean
  publishedAt: string | null
  updatedAt: string
}

export interface MatchProfileMeta {
  items: MatchProfile[]
  problems: { reference: string; title: string; published: boolean }[]
  technologies: { reference: string; name: string; published: boolean }[]
  classes: string[]
  statuses: string[]
  dimensions: string[]
  ratings: string[]
  developmentLevels: string[]
  recordTypes: string[]
}

export const matchProfiles = () => call<MatchProfileMeta>('/match-profiles')

export const createMatchProfile = (body: Record<string, unknown>) =>
  call<{ reference: string; slug: string }>('/match-profiles', { method: 'POST', body: JSON.stringify(body) })

export const saveMatchProfile = (reference: string, body: Record<string, unknown>) =>
  call<{ ok: true }>(`/match-profiles/${reference}`, { method: 'PUT', body: JSON.stringify(body) })

export const publishMatchProfile = (reference: string, published: boolean) =>
  call<{ ok: true; published: boolean }>(`/match-profiles/${reference}/publish`, {
    method: 'POST', body: JSON.stringify({ published }),
  })

export interface Message {
  reference: string
  created_at: string
  status: string
  name: string
  email: string
  organisation: string | null
  topic: string
  message: string
  handled_at: string | null
  handled_by: string | null
  note: string | null
}

export const messages = (params: Record<string, string> = {}) => {
  const q = new URLSearchParams(params).toString()
  return call<{ items: Message[]; statuses: string[] }>(`/messages${q ? `?${q}` : ''}`)
}

export const patchMessage = (reference: string, patch: Record<string, unknown>) =>
  call<{ ok: true }>(`/messages/${reference}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const challenges = (params: Record<string, string> = {}) => {
  const q = new URLSearchParams(params).toString()
  return call<{ items: ChallengeSummary[] }>(`/challenges${q ? `?${q}` : ''}`)
}
export const challenge = (reference: string) => call<ChallengeDetail>(`/challenges/${reference}`)

export const patchChallenge = (reference: string, patch: Record<string, unknown>) =>
  call<{ ok: true }>(`/challenges/${reference}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const addNote = (reference: string, body: string) =>
  call<{ ok: true }>(`/notes/${reference}`, { method: 'POST', body: JSON.stringify({ body }) })

export interface AuditEntry {
  at: string
  actor: string
  role: string
  action: string
  target: string | null
}
export const auditLog = () => call<{ items: AuditEntry[] }>('/audit')

export interface AdminUser {
  email: string
  role: Role
  disabled: number
  created_at: string
  last_seen_at: string | null
}
export const users = () => call<{ items: AdminUser[] }>('/users')
export const upsertUser = (payload: { email: string; role: Role; password?: string }) =>
  call<{ ok: true }>('/users', { method: 'POST', body: JSON.stringify(payload) })

/* ------------------------------------------------------------------ matches */

export const MATCH_DECISIONS = [
  'Pending',
  'Rejected',
  'Hold',
  'Information Requested',
  'Technical Review',
  'Approved for Industry Discussion',
] as const

export type MatchDecision = (typeof MATCH_DECISIONS)[number]

export interface MatchSummary {
  reference: string
  createdAt: string
  challengeRef: string
  challengeTitle: string | null
  challengeSector: string | null
  technologyRef: string
  technologyTitle: string | null
  technologyCategory: string | null
  classification: string
  decision: MatchDecision
  trlGap: number | null
  ipRisk: string | null
}

export interface MatchAnalysis {
  challengeSummary?: string
  technologySummary?: string
  whyTheyMatch?: string[]
  technicalConflicts?: string[]
  missingEvidence?: string[]
  requiredDevelopment?: string[]
  commercialPotential?: string
  internalRecommendation?: string
}

export interface MatchDetail {
  reference: string
  createdAt: string
  engine: string
  challenge: { reference: string; title: string | null; sector: string | null; confidentiality: string | null }
  technology: {
    reference: string
    title: string | null
    category: string | null
    entryTrl: number | null
    currentTrl: number | null
    targetTrl: number | null
    acquisitionStage: string | null
  }
  classification: string
  fits: {
    mechanism: string
    application: string
    trl: string
    constraint: string
    ipAvailability: string
    developmentEffort: string
  }
  trlGap: number | null
  ipRisk: string | null
  analysis: MatchAnalysis
  decision: MatchDecision
  decidedBy: string | null
  decidedAt: string | null
  decisionNote: string | null
}

export const matches = (params: Record<string, string> = {}) => {
  const q = new URLSearchParams(params).toString()
  return call<{ items: MatchSummary[] }>(`/matches${q ? `?${q}` : ''}`)
}

export const match = (reference: string) => call<MatchDetail>(`/matches/${reference}`)

export const generateMatches = (challenge: string) =>
  call<{ created: number; considered: number; shortlisted: number; engine: string }>('/matches/generate', {
    method: 'POST',
    body: JSON.stringify({ challenge }),
  })

export const decideMatch = (reference: string, decision: MatchDecision, note: string) =>
  call<{ ok: true }>(`/matches/${reference}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, note }),
  })

/* -------------------------------------------------------------- development */

export interface WorkspaceSummary {
  reference: string
  title: string
  category: string
  entryTrl: number
  currentTrl: number
  targetTrl: number | null
  developmentStage: string
  acquisitionStage: string
  reviewer: string | null
  logEntries: number
  lastActivity: string | null
}

export interface LogEntry {
  id: number
  kind: string
  title: string
  body: string | null
  occurredOn: string | null
  stage: string | null
  trl: number | null
  author: string
  createdAt: string
  published: boolean
}

export interface ReadinessRow {
  dimension: string
  status: string
  note: string | null
  updated_by: string
  updated_at: string
}

export interface Attachment {
  logId: number
  fileName: string
  sizeBytes: number
  url: string
}

export interface Workspace {
  reference: string
  title: string
  submittedTitle: string
  category: string
  entryTrl: number
  currentTrl: number
  targetTrl: number | null
  developmentStage: string
  acquisitionStage: string
  status: string
  reviewer: string | null
  log: LogEntry[]
  readiness: ReadinessRow[]
  attachments: Attachment[]
}

export const workspaces = () => call<{ items: WorkspaceSummary[] }>('/development')
export const workspace = (reference: string) => call<Workspace>(`/development/${reference}`)

export const setDevelopmentStage = (reference: string, developmentStage: string) =>
  call<{ ok: true }>(`/development/${reference}`, {
    method: 'PATCH',
    body: JSON.stringify({ developmentStage }),
  })

export const addLogEntry = (
  reference: string,
  entry: { kind: string; title: string; body: string; occurredOn: string; stage: string; trl: string },
  files: File[],
) => {
  if (files.length === 0) {
    return call<{ ok: true }>(`/development/${reference}/log`, {
      method: 'POST',
      body: JSON.stringify(entry),
    })
  }
  const form = new FormData()
  for (const [k, v] of Object.entries(entry)) form.append(k, v)
  for (const file of files) form.append('files', file, file.name)
  return call<{ ok: true }>(`/development/${reference}/log`, { method: 'POST', body: form })
}

export const publishLogEntry = (id: number, published: boolean) =>
  call<{ ok: true }>(`/development/log/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify({ published }),
  })

export const setReadiness = (reference: string, dimension: string, status: string, note: string) =>
  call<{ ok: true }>(`/development/${reference}/readiness`, {
    method: 'POST',
    body: JSON.stringify({ dimension, status, note }),
  })

/* ------------------------------------------------------------ opportunities */

export interface OpportunitySummary {
  reference: string
  createdAt: string
  updatedAt: string
  stage: string
  challengeRef: string
  challengeTitle: string | null
  challengeSector: string | null
  company: string | null
  confidentiality: string | null
  technologyRef: string
  technologyTitle: string | null
  currentTrl: number | null
  developmentStage: string | null
  owner: string | null
  nextAction: string | null
  nextActionDue: string | null
}

export interface OpportunityDetail {
  reference: string
  createdAt: string
  updatedAt: string
  stage: string
  owner: string | null
  nextAction: string | null
  nextActionDue: string | null
  note: string | null
  closedReason: string | null
  matchRef: string | null
  challenge: {
    reference: string
    title: string | null
    sector: string | null
    status: string | null
    confidentiality: string | null
    company: string | null
    contactName: string | null
    contactEmail: string | null
  }
  contactsWithheld: boolean
  technology: {
    reference: string
    title: string | null
    category: string | null
    entryTrl: number | null
    currentTrl: number | null
    targetTrl: number | null
    developmentStage: string | null
    acquisitionStage: string | null
  }
  readiness: { dimension: string; status: string; note: string | null }[]
  notes: Note[]
  deal: { reference: string; closingStatus: string } | null
  dealEligible: boolean
}

export const opportunities = (params: Record<string, string> = {}) => {
  const q = new URLSearchParams(params).toString()
  return call<{ stages: string[]; funnel: Record<string, number>; items: OpportunitySummary[] }>(
    `/opportunities${q ? `?${q}` : ''}`,
  )
}

export const opportunity = (reference: string) => call<OpportunityDetail>(`/opportunities/${reference}`)

export const patchOpportunity = (reference: string, patch: Record<string, unknown>) =>
  call<{ ok: true }>(`/opportunities/${reference}`, { method: 'PATCH', body: JSON.stringify(patch) })

/* --------------------------------------------------------------- deal room */

export interface DealSummary {
  reference: string
  createdAt: string
  updatedAt: string
  opportunityRef: string
  dealType: string
  industry: string | null
  currency: string
  upfrontMinor: number | null
  royaltyBp: number | null
  royaltyBasis: string | null
  exclusivity: string
  agreementStatus: string
  closingStatus: string
  owner: string | null
  challengeRef: string
  challengeTitle: string | null
  company: string | null
  technologyRef: string
  technologyTitle: string | null
}

export interface DealMilestone {
  id: number
  label: string
  due: string | null
  status: string
  note: string | null
}

export interface DealPayment {
  id: number
  label: string
  due: string | null
  amount_minor: number
  status: string
  note: string | null
}

export interface DealDocument {
  id: number
  kind: string
  title: string | null
  status: string
  dated: string | null
  note: string | null
}

export interface DealDetail {
  reference: string
  createdAt: string
  updatedAt: string
  opportunityRef: string
  opportunityStage: string | null
  dealType: string
  industry: string | null
  currency: string
  upfrontMinor: number | null
  royaltyBp: number | null
  royaltyBasis: string | null
  territory: string | null
  fieldOfUse: string | null
  exclusivity: string
  termMonths: number | null
  termStart: string | null
  termNote: string | null
  pilotConditions: string | null
  ipRights: string
  ipRightsNote: string | null
  manufacturingRights: string
  technicalSupport: string | null
  agreementStatus: string
  closingStatus: string
  closedAt: string | null
  closedReason: string | null
  owner: string | null
  challenge: {
    reference: string
    title: string | null
    sector: string | null
    confidentiality: string | null
    company: string | null
    contactName: string | null
    contactEmail: string | null
  }
  contactsWithheld: boolean
  technology: {
    reference: string
    title: string | null
    category: string | null
    currentTrl: number | null
    developmentStage: string | null
  }
  milestones: DealMilestone[]
  payments: DealPayment[]
  documents: DealDocument[]
  notes: Note[]
  royalty: { reference: string; status: string } | null
  royaltyEligible: boolean
}

export const deals = (params: Record<string, string> = {}) => {
  const q = new URLSearchParams(params).toString()
  return call<{
    byAgreement: { k: string; n: number }[]
    byClosing: { k: string; n: number }[]
    items: DealSummary[]
  }>(`/deals${q ? `?${q}` : ''}`)
}

export const deal = (reference: string) => call<DealDetail>(`/deals/${reference}`)

export const openDeal = (opportunity: string) =>
  call<{ ok: true; deal: string; created: boolean }>('/deals', {
    method: 'POST',
    body: JSON.stringify({ opportunity }),
  })

export const patchDeal = (reference: string, patch: Record<string, unknown>) =>
  call<{ ok: true; opportunityAdvanced: string | null }>(`/deals/${reference}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })

type DealRowKind = 'milestones' | 'payments' | 'documents'

export const addDealRow = (reference: string, kind: DealRowKind, row: Record<string, unknown>) =>
  call<{ ok: true }>(`/deals/${reference}/${kind}`, { method: 'POST', body: JSON.stringify(row) })

export const setDealRowStatus = (reference: string, kind: DealRowKind, id: number, status: string) =>
  call<{ ok: true }>(`/deals/${reference}/${kind}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

/**
 * Money in, money out.
 *
 * Amounts cross the wire as integer minor units and are only ever turned into
 * a decimal for display, so no rounding happens on the way to the database.
 */
export const money = (minor: number | null | undefined, currency: string) =>
  minor === null || minor === undefined
    ? '—'
    : new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 2 })
        .format(minor / 100)

/** Basis points back to a readable percentage: 525 → "5.25%". */
export const rate = (bp: number | null | undefined) =>
  bp === null || bp === undefined ? '—' : `${(bp / 100).toFixed(2).replace(/\.00$/, '')}%`

/* --------------------------------------------------------------- royalties */

export interface RoyaltySummary {
  reference: string
  createdAt: string
  updatedAt: string
  dealRef: string
  royaltyType: string
  currency: string
  rateBp: number | null
  perUnitMinor: number | null
  basis: string | null
  minimumAnnualMinor: number | null
  reportingPeriod: string
  status: string
  owner: string | null
  challengeRef: string
  challengeTitle: string | null
  company: string | null
  technologyRef: string
  technologyTitle: string | null
  dueMinor: number
  paidMinor: number
  overdueCount: number
}

export interface RoyaltyPeriod {
  id: number
  seq: number
  periodStart: string
  periodEnd: string
  reportedMinor: number | null
  reportedUnits: number | null
  statementReceived: string | null
  dueMinor: number
  adjustmentMinor: number
  adjustmentNote: string | null
  paidMinor: number
  paidOn: string | null
  status: string
  note: string | null
  settlement: 'Unpaid' | 'Part paid' | 'Settled' | 'Overpaid' | 'Nothing due'
}

export interface RoyaltyYear {
  year: number
  from: string
  to: string
  dueMinor: number
  paidMinor: number
  minimumMinor: number
  shortfallMinor: number
  complete: boolean
}

export interface RoyaltyDetail {
  reference: string
  createdAt: string
  updatedAt: string
  dealRef: string
  dealType: string | null
  opportunityRef: string | null
  royaltyType: string
  currency: string
  rateBp: number | null
  perUnitMinor: number | null
  basis: string | null
  minimumAnnualMinor: number | null
  reportingPeriod: string
  termMonths: number | null
  termStart: string | null
  territory: string | null
  fieldOfUse: string | null
  status: string
  endedReason: string | null
  owner: string | null
  challenge: {
    reference: string
    title: string | null
    sector: string | null
    company: string | null
    contactName: string | null
    contactEmail: string | null
  }
  contactsWithheld: boolean
  technology: { reference: string; title: string | null }
  periods: RoyaltyPeriod[]
  years: RoyaltyYear[]
  nextReporting: { date: string | null; overdue: boolean; overdueCount: number }
  totals: { dueMinor: number; paidMinor: number }
  notes: Note[]
}

export const royalties = () => call<{ items: RoyaltySummary[] }>('/royalties')

export const royalty = (reference: string) => call<RoyaltyDetail>(`/royalties/${reference}`)

export const openRoyalty = (deal: string) =>
  call<{ ok: true; royalty: string; created: boolean; periods: number }>('/royalties', {
    method: 'POST',
    body: JSON.stringify({ deal }),
  })

export const patchRoyalty = (reference: string, patch: Record<string, unknown>) =>
  call<{ ok: true; periodsAdded: number }>(`/royalties/${reference}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })

export const patchRoyaltyPeriod = (reference: string, id: number, patch: Record<string, unknown>) =>
  call<{ ok: true }>(`/royalties/${reference}/periods/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })

export const regenerateRoyaltySchedule = (reference: string) =>
  call<{ ok: true; added: number; mode: 'add' | 'replace' }>(
    `/royalties/${reference}/schedule`, { method: 'POST' },
  )

/* -------------------------------------------------------- public profiles */

export interface ProfileFields {
  slug: string
  name: string
  thesis: string
  problem: string
  principle: string
  whyItMatters: string
  validation: string
  applications: string[]
  sectors: string[]
  outcomes: string[]
  nextMilestones: string[]
  ipStatus: string
  transferStatus: string
  published: boolean
  publishedAt: string | null
  publishedBy: string | null
}

export interface ProfileState {
  reference: string
  exists: boolean
  suggestedSlug: string
  publishable: boolean
  acquisitionStage: string
  profile: ProfileFields | null
  /** Comes from the internal record — shown, never typed. */
  derived: {
    domain: string
    domainCode: string
    entryTrl: number
    currentTrl: number
    targetTrl: number
    stage: string
  }
}

export const profile = (reference: string) => call<ProfileState>(`/profiles/${reference}`)

export const saveProfile = (reference: string, fields: Record<string, unknown>) =>
  call<{ ok: true; slug: string }>(`/profiles/${reference}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  })

export const publishProfile = (reference: string, published: boolean) =>
  call<{ ok: true; published: boolean }>(`/profiles/${reference}/publish`, {
    method: 'POST',
    body: JSON.stringify({ published }),
  })
