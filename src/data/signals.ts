/** Section 5 — the two sides of the field, and the metadata each node reveals. */

export interface Signal {
  id: string
  label: string
  meta: [string, string][]
}

export const demandSignals: Signal[] = [
  { id: 'thermal', label: 'Thermal loss', meta: [['PROCESS', 'Furnace'], ['REQUIREMENT', '>800 °C'], ['STATUS', 'Active']] },
  { id: 'energy', label: 'Energy intensity', meta: [['PROCESS', 'Compression'], ['REQUIREMENT', 'Continuous duty'], ['STATUS', 'Active']] },
  { id: 'corrosion', label: 'Corrosion', meta: [['PROCESS', 'Wet handling'], ['REQUIREMENT', 'Chloride exposure'], ['STATUS', 'Active']] },
  { id: 'water', label: 'Water loss', meta: [['PROCESS', 'Cooling'], ['REQUIREMENT', 'Closed loop'], ['STATUS', 'Active']] },
  { id: 'material', label: 'Material failure', meta: [['PROCESS', 'Wear surface'], ['REQUIREMENT', 'Cyclic load'], ['STATUS', 'Active']] },
  { id: 'yield', label: 'Process yield', meta: [['PROCESS', 'Forming'], ['REQUIREMENT', 'Dimensional hold'], ['STATUS', 'Active']] },
]

export const technologySignals: Signal[] = [
  { id: 'mat', label: 'Advanced material', meta: [['ID', 'INT / MAT / 024'], ['DOMAIN', 'Advanced Materials'], ['CURRENT TRL', '05'], ['STATUS', 'Development']] },
  { id: 'coat', label: 'Novel coating', meta: [['ID', 'INT / MFG / 041'], ['DOMAIN', 'Industrial Processes'], ['CURRENT TRL', '05'], ['STATUS', 'Industrialisation']] },
  { id: 'proc', label: 'Process technology', meta: [['ID', 'INT / CLN / 032'], ['DOMAIN', 'Clean Technology'], ['CURRENT TRL', '04'], ['STATUS', 'Validation']] },
  { id: 'energy-sys', label: 'Energy system', meta: [['ID', 'INT / ENR / 017'], ['DOMAIN', 'Energy'], ['CURRENT TRL', '03'], ['STATUS', 'Development']] },
  { id: 'sensor', label: 'Sensor platform', meta: [['ID', 'INT / ELC / 056'], ['DOMAIN', 'Electronics & Sensing'], ['CURRENT TRL', '04'], ['STATUS', 'Development']] },
  { id: 'circular', label: 'Circular material', meta: [['ID', 'INT / BLT / 009'], ['DOMAIN', 'Built Environment'], ['CURRENT TRL', '03'], ['STATUS', 'Technical Review']] },
]

/** Which demand signal resolves to which technology, and the ID it surfaces. */
export const qualifiedPairs: { demand: number; technology: number; id: string }[] = [
  { demand: 0, technology: 0, id: 'INT / MAT / 024' },
  { demand: 2, technology: 1, id: 'INT / MFG / 041' },
  { demand: 3, technology: 2, id: 'INT / CLN / 032' },
  { demand: 1, technology: 3, id: 'INT / ENR / 017' },
  { demand: 5, technology: 4, id: 'INT / ELC / 056' },
  { demand: 4, technology: 5, id: 'INT / BLT / 009' },
]

/** Section 7 — the thread's name as it travels down the page. */
export const threadStages = [
  { id: 'top', label: 'Match signal' },
  { id: 'engine', label: 'Technology path' },
  { id: 'pipeline', label: 'Development progress' },
  { id: 'transfer', label: 'Commercial pathway' },
] as const
