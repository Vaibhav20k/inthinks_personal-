/**
 * Data models for the InThinks platform.
 *
 * The public site is static, but these are the record shapes the internal
 * systems are meant to grow into — the innovation database, the challenge
 * database, and the inputs a matching engine would score against. They live
 * here so the public components and any future backend agree on one schema.
 */

export type TRL = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export const TRL_DEFINITIONS: Record<TRL, string> = {
  1: 'Basic principles observed',
  2: 'Technology concept formulated',
  3: 'Experimental proof of concept',
  4: 'Technology validated in lab',
  5: 'Validated in relevant environment',
  6: 'Prototype demonstrated',
  7: 'System prototype demonstrated',
  8: 'System complete and qualified',
  9: 'Proven operationally',
}

export type Confidentiality =
  | 'standard'
  | 'nda-required'
  | 'open-innovation'

/** Public-facing lifecycle of a technology in the development portfolio. */
export type DevelopmentStage =
  | 'Under Evaluation'
  | 'Technical Review'
  | 'Development'
  | 'Prototype Optimisation'
  | 'Validation'
  | 'Industrialisation'
  | 'Transfer Preparation'

export type IpStatus =
  | 'Under Evaluation'
  | 'Filing In Preparation'
  | 'Application Filed'
  | 'Rights Secured'
  | 'To Be Confirmed'

export type TransferStatus =
  | 'Under Development'
  | 'Industry Evaluation'
  | 'Pilot Opportunity'
  | 'Transfer Ready'

export const TRANSFER_STATUSES: TransferStatus[] = [
  'Under Development',
  'Industry Evaluation',
  'Pilot Opportunity',
  'Transfer Ready',
]

/**
 * Public technology record — what the site is allowed to show.
 *
 * Deliberately excludes innovator identity, source institution, acquisition
 * terms, margins, unpublished patent detail and confidential implementation.
 * Those belong to `InternalInnovationRecord` and never reach the client.
 */
export interface Technology {
  id: string
  slug: string
  name: string
  domain: string
  domainCode: string
  thesis: string
  problem: string
  principle: string
  whyItMatters: string
  developmentByInThinks: string[]
  validation: string
  applications: string[]
  sectors: string[]
  outcomes: string[]
  entryTrl: TRL
  currentTrl: TRL
  targetTrl: TRL
  stage: DevelopmentStage
  ipStatus: IpStatus
  transferStatus: TransferStatus
  nextMilestones: string[]
  /** True while this is structural placeholder content, shown as such in the UI. */
  placeholder: boolean
}

/**
 * Internal innovation record — the submission plus everything evaluation
 * adds to it. Never serialised to the public site.
 */
export interface InternalInnovationRecord {
  innovationId: string
  title: string
  category: string
  summary: string
  problemSolved: string
  scientificPrinciple: string
  applications: string[]
  sourceInstitution?: string
  innovator: { name: string; email: string; phone?: string }
  coInventors: string[]
  ownership: string
  patentStatus: string
  entryTrl: TRL
  currentTrl: TRL
  targetTrl: TRL
  scores: {
    technical?: number
    novelty?: number
    commercial?: number
    scalability?: number
  }
  ipRisk?: 'low' | 'medium' | 'high'
  developmentStatus: string
  documents: string[]
  confidentiality: Confidentiality
  matchTags: string[]
  industryOpportunities: string[]
  acquisitionStatus: string
  commercialRights: string
  internalNotes?: string
}

/** Internal challenge record, mirroring the industry submission flow. */
export interface InternalChallengeRecord {
  challengeId: string
  company: string
  contact: { name: string; designation: string; email: string; phone?: string }
  sector: string
  problemTitle: string
  problemStatement: string
  currentSolution: string
  targetResult: string
  technicalConstraints: string[]
  operatingEnvironment: Record<string, string>
  economicImpact: string[]
  timeline: string
  requiredTrl?: TRL
  confidentiality: Confidentiality
  matchStatus: ChallengeStatus
  assignedAnalyst?: string
  relevantInnovations: string[]
  commercialStatus: string
  documents: string[]
  notes?: string
}

export type ChallengeStatus =
  | 'Received'
  | 'Under Review'
  | 'Technology Search'
  | 'Candidates Identified'
  | 'Technical Evaluation'
  | 'Solutions Presented'
  | 'Pilot Discussion'
  | 'Commercial Discussion'
  | 'Technology Transfer'
  | 'Closed'

export type InnovationStatus =
  | 'Submitted'
  | 'Initial Review'
  | 'Technical Review'
  | 'Additional Information Required'
  | 'Qualified'
  | 'Development Discussion'
  | 'Commercial Agreement'
  | 'In Development'
  | 'Industry Opportunity Identified'
  | 'Commercial Discussion'
  | 'Transferred'
  | 'Archived'

/**
 * Dimensions a match is scored across. Semantic similarity is intended to be
 * one signal among these, and a recommendation is only ever a shortlist —
 * qualification requires human technical review.
 */
export interface MatchSignals {
  problemSimilarity: number
  applicationOverlap: number
  industryRelevance: number
  mechanismFit: number
  materialCompatibility: number
  operatingConditions: number
  performanceTarget: number
  trlGap: number
  scalability: number
  deploymentComplexity: number
  ipAvailability: number
  commercialReadiness: number
  costCompatibility: number
  regulatoryConstraints: number
  geographicRelevance: number
}

export type PlatformRole =
  | 'admin'
  | 'rnd-reviewer'
  | 'business-development'
  | 'innovator'
  | 'industry-user'

/**
 * Commercial structures a transfer may take. Public pages name these
 * structures; they never carry consideration, margin or negotiation detail.
 */
export type DealStructure =
  | 'upfront-transfer'
  | 'upfront-royalty'
  | 'licensing'
  | 'assignment'
  | 'milestone'
  | 'co-development'

/**
 * Internal commercial record. Deliberately separate from every public type so
 * that no consideration, margin or negotiation field can reach the client
 * through a shared shape.
 *
 * Money is an integer count of the currency's minor unit and a rate is basis
 * points, never a float: a licence dispute over a rounded paisa is a real
 * thing, and `1024.09 * 100` is not `102409` in this language.
 *
 * The deal room in `worker/deals.ts` is the live implementation of this shape.
 */
export interface InternalDealRecord {
  dealId: string
  opportunityId: string
  technologyId: string
  challengeId: string
  structure: DealStructure
  currency: string
  /** Minor units. 1,024.09 is 102409. */
  upfrontMinor?: number
  /** Basis points. 5.25% is 525. */
  royaltyBp?: number
  royaltyBasis?: string
  territory?: string
  fieldOfUse?: string
  exclusivity: string
  termMonths?: number
  milestones: { label: string; due?: string; status: string }[]
  payments: { label: string; due?: string; amountMinor: number; status: string }[]
  documents: { kind: string; title?: string; status: string }[]
  ipRights: string
  manufacturingRights: string
  /** How far the paperwork has travelled — separate from whether it closed. */
  agreementStatus: string
  closingStatus: 'Open' | 'Executed' | 'Withdrawn' | 'Lapsed'
  internalNotes?: string
}

/**
 * A match between a challenge and a technology.
 *
 * `signals` is machine-produced; `humanReview` is not optional by design.
 * No match reaches an industry counterparty on the strength of the signals
 * alone — the engine shortlists, a reviewer qualifies.
 */
export interface MatchRecord {
  matchId: string
  challengeId: string
  technologyId: string
  signals: MatchSignals
  compositeScore: number
  rationale: string
  technicalConflicts: string[]
  missingEvidence: string[]
  requiredDevelopment: string[]
  ipRisk: 'low' | 'medium' | 'high'
  trlGap: number
  humanReview: {
    reviewer?: string
    decision: 'pending' | 'qualified' | 'rejected'
    note?: string
  }
}
