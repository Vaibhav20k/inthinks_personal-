/**
 * The problem-first entry point into the portfolio.
 *
 * An outcome is a verb and the thing it acts on, held apart rather than
 * written as one sentence. Industry does not arrive thinking "improve thermal
 * performance"; it arrives knowing it wants to REDUCE something, and only then
 * what. Splitting the two turns a flat list of fifteen into a choice of seven
 * and then a handful — which is a question someone can answer.
 *
 * `id` is unchanged and is what everything downstream stores: profile records,
 * the public API's vocabulary check, the explorer filters. The split is a
 * presentation of the same taxonomy, not a new one.
 */
export interface Outcome {
  id: string
  verb: Verb
  object: string
  /** The full phrase, for filter chips and anywhere the verb is not shown. */
  label: string
}

export const VERBS = ['REDUCE', 'IMPROVE', 'EXTEND', 'PROTECT', 'REPLACE', 'RECOVER', 'OPTIMISE'] as const
export type Verb = (typeof VERBS)[number]

export const outcomes: Outcome[] = [
  { id: 'energy', verb: 'REDUCE', object: 'Energy consumption', label: 'Reduce energy consumption' },
  { id: 'emissions', verb: 'REDUCE', object: 'Emissions', label: 'Reduce emissions' },
  { id: 'water', verb: 'REDUCE', object: 'Water use', label: 'Reduce water use' },
  { id: 'waste', verb: 'REDUCE', object: 'Waste', label: 'Reduce waste' },
  { id: 'material', verb: 'REDUCE', object: 'Material use', label: 'Reduce material use' },
  { id: 'opex', verb: 'REDUCE', object: 'Operating cost', label: 'Lower operating cost' },
  { id: 'strength', verb: 'IMPROVE', object: 'Strength', label: 'Improve strength' },
  { id: 'thermal', verb: 'IMPROVE', object: 'Thermal performance', label: 'Improve thermal performance' },
  { id: 'efficiency', verb: 'IMPROVE', object: 'Efficiency', label: 'Improve efficiency' },
  { id: 'durability', verb: 'IMPROVE', object: 'Durability', label: 'Improve durability' },
  { id: 'life', verb: 'EXTEND', object: 'Product life', label: 'Extend product life' },
  { id: 'corrosion', verb: 'PROTECT', object: 'Against corrosion', label: 'Improve corrosion resistance' },
  { id: 'hazardous', verb: 'REPLACE', object: 'Hazardous materials', label: 'Replace hazardous materials' },
  { id: 'recovery', verb: 'RECOVER', object: 'Valuable materials', label: 'Recover valuable materials' },
  { id: 'yield', verb: 'OPTIMISE', object: 'Process yield', label: 'Improve process yield' },
]

/** The objects available under one verb. Empty verbs are never offered. */
export const objectsFor = (verb: Verb) => outcomes.filter((o) => o.verb === verb)

export const sectors = [
  'Manufacturing',
  'Energy',
  'Construction',
  'Mining',
  'Automotive',
  'Chemicals',
  'Agriculture',
  'Electronics',
  'Infrastructure',
  'Consumer Products',
  'Materials',
] as const

export const domains = [
  { code: 'MAT', name: 'Advanced Materials' },
  { code: 'ENR', name: 'Energy' },
  { code: 'CLN', name: 'Clean Technology' },
  { code: 'MFG', name: 'Industrial Processes' },
  { code: 'ELC', name: 'Electronics & Sensing' },
  { code: 'BLT', name: 'Built Environment' },
] as const

export const impactOptions = [
  'High cost',
  'Downtime',
  'Quality',
  'Safety',
  'Energy consumption',
  'Waste',
  'Emissions',
  'Product failure',
  'Maintenance',
  'Throughput',
  'Regulatory issue',
  'Other',
] as const
