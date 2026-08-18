/**
 * The internal review rubric. Numeric 1–5 plus a qualitative note per
 * dimension. Never rendered anywhere public — these live behind the admin
 * surface and are excluded from every public serializer.
 */
export const SCORING_DIMENSIONS = [
  { key: 'technical-novelty', label: 'Technical novelty' },
  { key: 'industrial-relevance', label: 'Industrial relevance' },
  { key: 'scalability', label: 'Scalability' },
  { key: 'ip-clarity', label: 'IP clarity' },
  { key: 'technical-feasibility', label: 'Technical feasibility' },
  { key: 'trl-advancement', label: 'TRL advancement potential' },
  { key: 'commercial-attractiveness', label: 'Commercial attractiveness' },
  { key: 'development-cost', label: 'Development cost' },
  { key: 'development-complexity', label: 'Development complexity' },
  { key: 'market-potential', label: 'Market potential' },
  { key: 'strategic-fit', label: 'Strategic fit' },
] as const

export const DIMENSION_KEYS = SCORING_DIMENSIONS.map((d) => d.key) as readonly string[]

/** Acquisition stages, in order. */
export const ACQUISITION_STAGES = [
  'Submitted',
  'Initial Screening',
  'Technical Evaluation',
  'IP Review',
  'Commercial Review',
  'Acquisition Candidate',
  'Negotiation',
  'Agreement',
  'Rights Secured',
  'Development Portfolio',
  'Declined',
] as const

export const CHALLENGE_STATUSES = [
  'Received',
  'Under Review',
  'Technology Search',
  'Candidates Identified',
  'Technical Evaluation',
  'Solutions Presented',
  'Pilot Discussion',
  'Commercial Discussion',
  'Technology Transfer',
  'Closed',
] as const

export const INNOVATION_STATUSES = [
  'Submitted',
  'Initial Review',
  'Technical Review',
  'Additional Information Required',
  'Qualified',
  'Development Discussion',
  'Commercial Agreement',
  'In Development',
  'Industry Opportunity Identified',
  'Commercial Discussion',
  'Transferred',
  'Archived',
] as const
