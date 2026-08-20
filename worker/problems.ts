import { parseList } from './portfolio'
import type { Env } from './types'

/**
 * The public industrial-problem endpoints.
 *
 * Unauthenticated and cacheable — this is the challenge register anyone may
 * read. It mirrors the technology endpoints, and for the same reason: two
 * properties matter more than anything else.
 *
 *   1. Only published profiles are served. `published = 1` is in every WHERE
 *      clause; no query parameter, header or path reaches a draft.
 *   2. Every response is assembled from named columns of `challenge_profiles`.
 *      The confidential side of a challenge — company, contact, plant,
 *      operating data, commercial impact — lives on `challenges` and is not
 *      joined here at all. There is no query in this file that could return
 *      it, which is a stronger guarantee than remembering not to select it.
 */

const json = (body: unknown, status = 200, cache = 'public, max-age=60, s-maxage=300') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache },
  })

/** Columns the public site is allowed to see. Never `SELECT *`. */
const COLUMNS = `reference, record_type, slug, title, sector, priority_area, target,
  summary, problem, current_approach, target_outcome, constraints, environment,
  impact, outcomes, minimum_trl, status, published_at`

function publicProblem(row: Record<string, unknown>) {
  return {
    id: String(row.reference ?? ''),
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    sector: String(row.sector ?? ''),
    priorityArea: String(row.priority_area ?? ''),
    target: String(row.target ?? ''),
    summary: String(row.summary ?? ''),
    problem: String(row.problem ?? ''),
    currentApproach: String(row.current_approach ?? ''),
    targetOutcome: String(row.target_outcome ?? ''),
    constraints: parseList(row.constraints as string),
    // Stored as "term: value" pairs and split on read, so the public shape
    // matches what the page already renders for the example records.
    environment: parseList(row.environment as string).map((line) => {
      const at = line.indexOf(':')
      return at === -1
        ? { term: line, value: '' }
        : { term: line.slice(0, at).trim(), value: line.slice(at + 1).trim() }
    }),
    impact: parseList(row.impact as string),
    outcomes: parseList(row.outcomes as string),
    minimumTrl: Number(row.minimum_trl ?? 4),
    status: String(row.status ?? 'Open challenge'),
    /** Demo records are labelled in the UI; the flag travels with the record. */
    demo: row.record_type === 'demo',
  }
}

export async function handleProblems(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, 'no-store')
  }
  // With no database the site falls back to its examples, exactly as the
  // technology explorer does. An empty list is the honest answer, not an error.
  if (!env.DB) return json({ items: [] })

  const single = url.pathname.match(/^\/api\/problems\/([a-z0-9-]{1,80})$/)
  if (single) {
    const row = await env.DB
      .prepare(`SELECT ${COLUMNS} FROM challenge_profiles WHERE slug = ? AND published = 1`)
      .bind(single[1])
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404, 'no-store')
    return json({ problem: publicProblem(row) })
  }

  const rows = await env.DB
    .prepare(`SELECT ${COLUMNS} FROM challenge_profiles WHERE published = 1 ORDER BY published_at DESC LIMIT 200`)
    .all<Record<string, unknown>>()

  return json({ items: rows.results.map(publicProblem) })
}
