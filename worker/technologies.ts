import {
  identityLeak, parseList, profileProse, publicTechnology,
} from './portfolio'
import type { Env } from './types'

/**
 * The public technology endpoints.
 *
 * Unauthenticated and cacheable — this is the portfolio anyone may read. Two
 * properties matter more than anything else here:
 *
 *   1. Only published profiles are served. `published = 1` is in every WHERE
 *      clause; there is no query parameter, header or path that reaches a
 *      draft.
 *   2. Every response is assembled from named columns, and each record passes
 *      the identity guard on the way out. A profile that somehow carries the
 *      innovator's name is dropped from the list rather than served, because a
 *      public leak is worse than a missing card.
 */

const json = (body: unknown, status = 200, cache = 'public, max-age=60, s-maxage=300') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache },
  })

/** Columns the public site is allowed to see. Never `SELECT p.*`. */
const PROFILE_COLUMNS = `
  p.reference, p.slug, p.name, p.thesis, p.problem, p.principle, p.why_it_matters,
  p.validation, p.applications, p.sectors, p.outcomes, p.next_milestones,
  p.ip_status, p.transfer_status, p.published_at, p.origin, p.record_type,
  p.authored_domain_code, p.authored_entry_trl, p.authored_current_trl,
  p.authored_target_trl, p.authored_stage,
  i.category, i.entry_trl, i.current_trl, i.target_trl, i.development_stage,
  i.innovator_name, i.innovator_email, i.institution`

/** Strips the identity columns the guard needed, after it has used them. */
function safeOrNull(row: Record<string, unknown>) {
  const identity = {
    innovator_name: (row.innovator_name as string) ?? null,
    innovator_email: (row.innovator_email as string) ?? null,
    institution: (row.institution as string) ?? null,
  }
  const prose = profileProse({
    name: String(row.name ?? ''),
    thesis: String(row.thesis ?? ''),
    problem: String(row.problem ?? ''),
    principle: String(row.principle ?? ''),
    why_it_matters: String(row.why_it_matters ?? ''),
    validation: String(row.validation ?? ''),
    applications: String(row.applications ?? ''),
    sectors: String(row.sectors ?? ''),
    outcomes: String(row.outcomes ?? ''),
    next_milestones: String(row.next_milestones ?? ''),
  })
  const leak = identityLeak(prose, identity)
  if (leak) {
    // Loud in the log, silent to the reader. Nobody outside learns that a
    // record exists, and someone inside can see that one is being withheld.
    console.error(`technology ${row.reference} withheld from the public site: contains ${leak}`)
    return null
  }
  return publicTechnology(row)
}

export async function handleTechnologies(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, 'no-store')

  const detail = url.pathname.match(/^\/api\/technologies\/([a-z0-9-]{3,80})$/)

  // On a deployment with no database there is no portfolio: an empty list, and
  // a genuine 404 for any single technology. Answering a detail request with a
  // list shape is what breaks the page that asked for it.
  if (!env.DB) {
    return detail || url.pathname !== '/api/technologies'
      ? json({ error: 'Not found' }, 404, 'no-store')
      : json({ items: [] })
  }

  if (detail) {
    const row = await env.DB
      .prepare(
        `SELECT ${PROFILE_COLUMNS}
         FROM technology_profiles p
         LEFT JOIN innovations i ON i.reference = p.reference
         WHERE p.slug = ? AND p.published = 1`,
      )
      .bind(detail[1])
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404, 'no-store')

    const technology = safeOrNull(row)
    if (!technology) return json({ error: 'Not found' }, 404, 'no-store')

    // The development timeline: published entries only, and only the three
    // fields a public timeline needs. The working log stays internal.
    const log = await env.DB
      .prepare(
        `SELECT occurred_on, title, kind FROM dev_log
         WHERE reference = ? AND published = 1
         ORDER BY COALESCE(occurred_on, created_at)`,
      )
      .bind(String(row.reference))
      .all<{ occurred_on: string | null; title: string; kind: string }>()

    return json({
      technology,
      timeline: log.results.map((l) => ({ on: l.occurred_on, title: l.title, kind: l.kind })),
    })
  }

  if (url.pathname !== '/api/technologies') return json({ error: 'Not found' }, 404, 'no-store')

  const rows = await env.DB
    .prepare(
      `SELECT ${PROFILE_COLUMNS}
       FROM technology_profiles p
       LEFT JOIN innovations i ON i.reference = p.reference
       WHERE p.published = 1
       ORDER BY p.published_at DESC, p.updated_at DESC
       LIMIT 200`,
    )
    .all<Record<string, unknown>>()

  return json({ items: rows.results.map(safeOrNull).filter((t) => t !== null) })
}

export { parseList }
