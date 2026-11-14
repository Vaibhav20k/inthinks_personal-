import type { IndustrialProblem, PublicMatch, Technology } from './models'

/**
 * ILLUSTRATIVE EXAMPLES — removed on 14 Nov 2026.
 *
 * The site used to show ten invented technologies, problems and matches while
 * nothing real was published. Visitors read them as other people's real
 * statements, so they are gone: the public registers now show only records an
 * administrator has published, and an empty state until then.
 *
 * The empty arrays and helpers stay so every page keeps compiling and falls
 * back to its own empty state. Delete this file once nothing imports it.
 */
export const exampleTechnologies: Technology[] = []
export const exampleProblems: IndustrialProblem[] = []
export const exampleMatches: PublicMatch[] = []

/**
 * A match's URL, derived from its reference rather than stored beside it.
 *
 * `MATCH / 001` becomes `match-001`. One definition, because a slug that is
 * computed in the link and parsed in the route will disagree the first time
 * either is edited, and the failure is a 404 on a record that exists.
 */
export const matchSlug = (m: PublicMatch) =>
  m.id.toLowerCase().replace(/\s*\/\s*/g, '-')

export const findExampleMatch = (slug: string) =>
  exampleMatches.find((m) => matchSlug(m) === slug)

/** How many published matches involve a given record. Derived, never stored. */
export const matchesForTechnology = (slug: string) =>
  exampleMatches.filter((m) => m.technologySlug === slug)
export const matchesForProblem = (slug: string) =>
  exampleMatches.filter((m) => m.problemSlug === slug)
