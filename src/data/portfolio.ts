import type { Technology, TimelineEntry } from './models'

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
