export interface Domain {
  id: string
  name: string
  note: string
  /** Seeds the generative preview so each domain gets a distinct figure. */
  seed: number
  figure: 'lattice' | 'flow' | 'wave' | 'stack' | 'orbit' | 'grid' | 'branch' | 'field' | 'helix'
}

export const domains: Domain[] = [
  { id: 'materials', name: 'Advanced Materials', note: 'Structure, surface, composite behaviour', seed: 3, figure: 'lattice' },
  { id: 'clean', name: 'Clean Technology', note: 'Emissions, capture, circularity', seed: 7, figure: 'flow' },
  { id: 'energy', name: 'Energy', note: 'Storage, conversion, distribution', seed: 11, figure: 'wave' },
  { id: 'industrial', name: 'Industrial Innovation', note: 'Process, throughput, tooling', seed: 5, figure: 'stack' },
  { id: 'built', name: 'Built Environment', note: 'Envelope, thermal, assembly', seed: 13, figure: 'grid' },
  { id: 'mobility', name: 'Mobility', note: 'Drivetrain, lightweighting, logistics', seed: 17, figure: 'orbit' },
  { id: 'consumer', name: 'Consumer Products', note: 'Use, durability, manufacture', seed: 19, figure: 'branch' },
  { id: 'digital', name: 'Digital Systems', note: 'Sensing, control, interpretation', seed: 23, figure: 'field' },
  { id: 'future', name: 'Future Technologies', note: 'Early signals, long horizons', seed: 29, figure: 'helix' },
]
