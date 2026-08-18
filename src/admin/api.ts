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
