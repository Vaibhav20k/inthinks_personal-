export interface Stage {
  id: string
  index: string
  title: string
  body: string
}

/** Section 03. A genuine sequence — the numbering carries order the reader needs. */
export const journey: Stage[] = [
  {
    id: 'observe',
    index: '01',
    title: 'Observe',
    body: 'Find overlooked problems and emerging opportunities.',
  },
  {
    id: 'imagine',
    index: '02',
    title: 'Imagine',
    body: 'Develop unconventional hypotheses and concepts.',
  },
  {
    id: 'investigate',
    index: '03',
    title: 'Investigate',
    body: 'Research feasibility, materials, science and markets.',
  },
  {
    id: 'experiment',
    index: '04',
    title: 'Experiment',
    body: 'Build, test and learn quickly.',
  },
  {
    id: 'invent',
    index: '05',
    title: 'Invent',
    body: 'Translate validated thinking into technology.',
  },
  {
    id: 'productise',
    index: '06',
    title: 'Productise',
    body: 'Develop usable, scalable solutions.',
  },
  {
    id: 'transfer',
    index: '07',
    title: 'Transfer',
    body: 'License, transfer or co-develop with industry partners.',
  },
]

export const outcomes = ['License', 'Transfer', 'Co-develop'] as const
