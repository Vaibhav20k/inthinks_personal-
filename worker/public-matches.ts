import { parseList } from './portfolio'
import type { Env } from './types'

/**
 * The public match endpoints.
 *
 * Only published match profiles, and only where both ends are themselves
 * published. The admin side refuses to publish a match whose challenge or
 * technology is still a draft, but that check runs at the moment of
 * publication — and either end can be unpublished afterwards. So the condition
 * is repeated in the read query: a match whose technology was withdrawn this
 * morning stops being served this morning, rather than pointing at a 404 until
 * somebody notices.
 *
 * Nothing here touches `matches`, the engine's own table. Its rows carry
 * internal references and unreviewed candidates, and there is no query in this
 * file that could reach them.
 */

const json = (body: unknown, status = 200, cache = 'public, max-age=60, s-maxage=300') =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache,
      'x-robots-tag': 'noindex, nofollow',
    },
  })

/**
 * Published on all three, joined on profile references.
 *
 * The public shape names the two ends by their *slugs*, because that is what
 * the site links to and what the example records already use — so a published
 * match and an illustrative one render through the same component.
 */
const SELECT = `
  SELECT m.reference, m.record_type, m.slug, m.match_class, m.status, m.rationale,
         m.next_step, m.open_questions, m.fit, m.development_required,
         c.slug AS problem_slug, t.slug AS technology_slug
    FROM match_profiles m
    JOIN challenge_profiles c ON c.reference = m.problem_ref AND c.published = 1
    JOIN technology_profiles t ON t.reference = m.technology_ref AND t.published = 1
   WHERE m.published = 1`

function publicMatch(row: Record<string, unknown>) {
  let fit: { dimension: string; rating: string }[] = []
  try {
    const parsed = JSON.parse(String(row.fit ?? '[]'))
    if (Array.isArray(parsed)) fit = parsed
  } catch {
    /* a malformed fit reads as none rather than breaking the page */
  }
  return {
    id: String(row.reference ?? ''),
    slug: String(row.slug ?? ''),
    problemSlug: String(row.problem_slug ?? ''),
    technologySlug: String(row.technology_slug ?? ''),
    matchClass: String(row.match_class ?? 'Candidate match'),
    status: String(row.status ?? 'Technical review'),
    rationale: String(row.rationale ?? ''),
    nextStep: String(row.next_step ?? ''),
    openQuestions: parseList(row.open_questions as string),
    fit,
    developmentRequired: String(row.development_required ?? 'Medium'),
    demo: row.record_type === 'demo',
  }
}

export async function handlePublicMatches(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, 'no-store')
  if (!env.DB) return json({ items: [] })

  const single = url.pathname.match(/^\/api\/matches\/([a-z0-9-]{1,80})$/)
  if (single) {
    const row = await env.DB.prepare(`${SELECT} AND m.slug = ?`).bind(single[1])
      .first<Record<string, unknown>>()
    if (!row) return json({ error: 'Not found' }, 404, 'no-store')
    return json({ match: publicMatch(row) })
  }

  const rows = await env.DB.prepare(`${SELECT} ORDER BY m.published_at DESC LIMIT 200`)
    .all<Record<string, unknown>>()
  return json({ items: rows.results.map(publicMatch) })
}
