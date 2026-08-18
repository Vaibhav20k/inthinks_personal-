/** Section 17 — the problem-first entry point into the portfolio. */
export interface Outcome {
  id: string
  label: string
}

export const outcomes: Outcome[] = [
  { id: 'energy', label: 'Reduce energy consumption' },
  { id: 'emissions', label: 'Reduce emissions' },
  { id: 'strength', label: 'Improve strength' },
  { id: 'water', label: 'Reduce water use' },
  { id: 'waste', label: 'Reduce waste' },
  { id: 'life', label: 'Extend product life' },
  { id: 'thermal', label: 'Improve thermal performance' },
  { id: 'corrosion', label: 'Improve corrosion resistance' },
  { id: 'material', label: 'Reduce material use' },
  { id: 'efficiency', label: 'Improve efficiency' },
  { id: 'opex', label: 'Lower operating cost' },
  { id: 'hazardous', label: 'Replace hazardous materials' },
  { id: 'durability', label: 'Improve durability' },
  { id: 'recovery', label: 'Recover valuable materials' },
  { id: 'yield', label: 'Improve process yield' },
]

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
