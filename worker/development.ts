/** The development sequence a secured technology moves through. */
export const DEVELOPMENT_STAGES = [
  'Research',
  'Proof of Concept',
  'Optimisation',
  'Engineering',
  'Prototype',
  'Validation',
  'Pilot',
  'Industrial Demonstration',
  'Transfer Readiness',
] as const

/**
 * Log entry kinds.
 *
 * `Failure` is deliberately its own kind rather than a negative result buried
 * in an experiment write-up. Knowing what was ruled out, and when, is most of
 * what makes a development record credible under due diligence.
 */
export const LOG_KINDS = [
  'Experiment',
  'Test result',
  'Failure',
  'Performance improvement',
  'Prototype revision',
  'Pilot data',
  'Cost estimate',
  'Scale-up requirement',
  'Manufacturing information',
  'Report',
] as const

/** Section 21 — readiness as dimensions, never as a single number. */
export const READINESS_DIMENSIONS = [
  { key: 'technical', label: 'Technical' },
  { key: 'validation', label: 'Validation' },
  { key: 'ip', label: 'IP' },
  { key: 'scale-up', label: 'Scale-up' },
  { key: 'application', label: 'Application' },
  { key: 'commercial', label: 'Commercial' },
] as const

export const READINESS_STATUSES = ['Early', 'Developing', 'Qualified', 'Ready'] as const

export const READINESS_KEYS = READINESS_DIMENSIONS.map((d) => d.key) as readonly string[]

/**
 * A technology enters the workspace once InThinks holds rights to develop it.
 * Before that there is nothing to log against.
 */
export const DEVELOPMENT_STAGES_ELIGIBLE = ['Rights Secured', 'Development Portfolio'] as const
