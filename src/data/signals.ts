/**
 * Section 5 — the two sides of the hero field, and the metadata each node reveals.
 *
 * These used to be hand-written labels and invented reference numbers, which
 * meant the site's central image described a database that did not exist:
 * `INT / MAT / 024` appeared on the homepage and nowhere else, and a visitor
 * who went looking for it found nothing. Every node is now a real record from
 * the published set, and every qualified pair is a real match — so hovering a
 * node in the hero and opening the Technology Explorer show the same reference.
 *
 * The short label is written here rather than derived from the record title. A
 * node is one line of 11px mono; "Excessive heat loss from reheating furnaces"
 * is not going to fit in it, and truncating it would read as a bug.
 */

import { exampleProblems, exampleTechnologies } from './examples'

export interface Signal {
  id: string
  /** The record's reference, shown above the label. */
  ref: string
  label: string
  meta: [string, string][]
}

/** Display order on the left, and the short label each problem shows. */
const DEMAND = [
  { slug: 'furnace-heat-loss', label: 'Thermal loss' },
  { slug: 'low-grade-waste-heat', label: 'Waste heat' },
  { slug: 'premature-tool-wear', label: 'Surface wear' },
  { slug: 'metal-loss-in-process-water', label: 'Metal loss' },
  { slug: 'mixed-polymer-waste', label: 'Polymer waste' },
  { slug: 'industrial-cooling-demand', label: 'Cooling demand' },
]

/**
 * Display order on the right. Deliberately not the same order as the left: the
 * pairs are what they are, and a list ordered to make every connection
 * horizontal would suggest the match was decided by position.
 */
const TECHNOLOGY = [
  { slug: 'thermal-barrier-composite-coating', label: 'Thermal barrier' },
  { slug: 'low-temperature-surface-hardening', label: 'Surface hardening' },
  { slug: 'low-grade-heat-recovery', label: 'Heat recovery' },
  { slug: 'polymer-waste-conversion', label: 'Waste conversion' },
  { slug: 'selective-metal-recovery', label: 'Metal recovery' },
  { slug: 'passive-industrial-cooling-material', label: 'Passive cooling' },
]

/** A record that has gone missing drops out of the field rather than rendering blank. */
export const demandSignals: Signal[] = DEMAND.flatMap(({ slug, label }) => {
  const p = exampleProblems.find((x) => x.slug === slug)
  if (!p) return []
  return [{
    id: slug,
    ref: p.id,
    label,
    meta: [
      ['INDUSTRY', p.sector],
      ['PRIORITY', p.priorityArea],
      ['TARGET', p.target],
      ['STATUS', p.status],
    ] as [string, string][],
  }]
})

export const technologySignals: Signal[] = TECHNOLOGY.flatMap(({ slug, label }) => {
  const t = exampleTechnologies.find((x) => x.slug === slug)
  if (!t) return []
  return [{
    id: slug,
    ref: t.id,
    label,
    meta: [
      ['DOMAIN', t.domain],
      ['CURRENT TRL', String(t.currentTrl).padStart(2, '0')],
      ['TARGET TRL', String(t.targetTrl).padStart(2, '0')],
      ['STATUS', t.stage],
    ] as [string, string][],
  }]
})

export interface QualifiedPair {
  demand: number
  technology: number
  /** The problem reference, shown on the left of the readout. */
  problemRef: string
  /** The technology reference, shown on the right. */
  id: string
}

/**
 * Which demand signal resolves to which technology.
 *
 * Indices are resolved from the slugs rather than written by hand, so
 * reordering either column above cannot silently rewire the connections.
 */
const QUALIFIED: [string, string][] = [
  ['furnace-heat-loss', 'thermal-barrier-composite-coating'],
  ['low-grade-waste-heat', 'low-grade-heat-recovery'],
  ['premature-tool-wear', 'low-temperature-surface-hardening'],
  ['metal-loss-in-process-water', 'selective-metal-recovery'],
  ['mixed-polymer-waste', 'polymer-waste-conversion'],
  ['industrial-cooling-demand', 'passive-industrial-cooling-material'],
]

export const qualifiedPairs: QualifiedPair[] = QUALIFIED.flatMap(([p, t]) => {
  const demand = demandSignals.findIndex((s) => s.id === p)
  const technology = technologySignals.findIndex((s) => s.id === t)
  // A pair whose either end is missing is dropped: half a connection is worse
  // than no connection, because the field would draw a line to nothing.
  if (demand < 0 || technology < 0) return []
  return [{ demand, technology, problemRef: demandSignals[demand].ref, id: technologySignals[technology].ref }]
})

/** Section 7 — the thread's name as it travels down the page. */
export const threadStages = [
  { id: 'top', label: 'Match signal' },
  { id: 'engine', label: 'Technology path' },
  { id: 'pipeline', label: 'Development progress' },
  { id: 'transfer', label: 'Commercial pathway' },
] as const
