export type Stage =
  | 'Concept'
  | 'Research'
  | 'Experiment'
  | 'Prototype'
  | 'Development'
  | 'Productisation'

export interface Innovation {
  slug: string
  name: string
  domain: string
  thesis: string
  stage: Stage
  /** Left deliberately unasserted until real filings exist. */
  ip: string
  availability: string
  /**
   * True while this entry is structural placeholder content. Real project
   * records replace these; nothing here should be read as a claim.
   */
  placeholder: boolean
}

/**
 * PLACEHOLDER RECORDS.
 * These exist to define the data model and exercise the layout. No project
 * names, patents, results or partners are asserted. Replace with real
 * project records before the site goes live.
 */
export const innovations: Innovation[] = [
  {
    slug: 'project-01',
    name: 'Innovation One',
    domain: 'Advanced Materials',
    thesis: 'One line describing what was invented and why it matters.',
    stage: 'Experiment',
    ip: 'IP status to be confirmed',
    availability: 'Partnership status to be confirmed',
    placeholder: true,
  },
  {
    slug: 'project-02',
    name: 'Innovation Two',
    domain: 'Clean Technology',
    thesis: 'One line describing what was invented and why it matters.',
    stage: 'Prototype',
    ip: 'IP status to be confirmed',
    availability: 'Partnership status to be confirmed',
    placeholder: true,
  },
  {
    slug: 'project-03',
    name: 'Innovation Three',
    domain: 'Industrial Innovation',
    thesis: 'One line describing what was invented and why it matters.',
    stage: 'Research',
    ip: 'IP status to be confirmed',
    availability: 'Partnership status to be confirmed',
    placeholder: true,
  },
  {
    slug: 'project-04',
    name: 'Innovation Four',
    domain: 'Energy',
    thesis: 'One line describing what was invented and why it matters.',
    stage: 'Concept',
    ip: 'IP status to be confirmed',
    availability: 'Partnership status to be confirmed',
    placeholder: true,
  },
]

export const stageOrder: Stage[] = [
  'Concept',
  'Research',
  'Experiment',
  'Prototype',
  'Development',
  'Productisation',
]
