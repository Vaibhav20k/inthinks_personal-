import type { IndustrialProblem, PublicMatch, Technology, TimelineEntry } from './models'
import { exampleMatches, exampleProblems, exampleTechnologies } from './examples'

/**
 * The public portfolio, read from the Worker.
 *
 * The site used to carry a placeholder portfolio in the bundle. It now asks
 * the API, which serves only profiles someone published — so an empty
 * portfolio renders as empty rather than as invented records, and a technology
 * appears the moment it is published rather than the next time the site is
 * built.
 */

export interface TechnologyDetail {
  technology: Technology
  timeline: TimelineEntry[]
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed (${response.status})`)
  }
  return (await response.json()) as T
}

export const fetchTechnologies = () =>
  get<{ items: Technology[] }>('/api/technologies').then((r) => r.items)

export const fetchTechnology = async (slug: string) => {
  const body = await get<Partial<TechnologyDetail>>(`/api/technologies/${encodeURIComponent(slug)}`)
  // A 200 is not proof of a technology. Anything without one is treated as
  // missing rather than rendered half-built.
  if (!body?.technology?.slug) throw new Error('Not found')
  return { technology: body.technology, timeline: body.timeline ?? [] }
}

/* ------------------------------------------------------------- the examples */

/**
 * What to show when nothing has been published.
 *
 * A blank explorer reads as a broken site rather than as a new one, so the
 * examples stand in — but they are never mixed with real records and never
 * presented as the portfolio. The `usingExamples` flag drives a visible notice
 * wherever they appear, and the moment one real record is published the whole
 * example set disappears rather than padding the list out.
 */
export interface Portfolio {
  technologies: Technology[]
  usingExamples: boolean
}

export const loadPortfolio = async (): Promise<Portfolio> => {
  const items = await fetchTechnologies().catch(() => [] as Technology[])
  return items.length > 0
    ? { technologies: items, usingExamples: false }
    : { technologies: exampleTechnologies, usingExamples: true }
}

/**
 * Industrial problems.
 *
 * There is no published-challenge endpoint yet, so these are the examples
 * only, and the page says so. When the endpoint exists this becomes the same
 * shape as `loadPortfolio` and nothing above it changes.
 */
export const loadProblems = async (): Promise<{ problems: IndustrialProblem[]; usingExamples: boolean }> =>
  ({ problems: exampleProblems, usingExamples: true })

export const loadMatches = async (): Promise<{ matches: PublicMatch[]; usingExamples: boolean }> =>
  ({ matches: exampleMatches, usingExamples: true })

export const findExampleProblem = (slug: string) => exampleProblems.find((p) => p.slug === slug)
export const findExampleTechnology = (slug: string) => exampleTechnologies.find((t) => t.slug === slug)
