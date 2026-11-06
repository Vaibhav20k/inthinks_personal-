import type { Env } from './types'
import { handleAdmin } from './admin'
import { handleTechnologies } from './technologies'
import { handleProblems } from './problems'
import { handlePublicMatches } from './public-matches'
import { coarse, isDaylight, sunTimes } from './daylight'
import { handleIntake, json } from './intake'
import { deliverOutbox } from './outbox'
import { turnstileEnabled } from './turnstile'
import { ipTag } from './ratelimit'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    // Reports whether submissions can actually be accepted, so the client can
    // say so up front instead of failing at the end of an eight-step form.
    if (url.pathname === '/api/status' && request.method === 'GET') {
      const ready = Boolean(env.DB && env.IP_SALT)
      return json({
        submissions: ready,
        uploads: ready && Boolean(env.EVIDENCE),
        // Public by design: a Turnstile site key is meant to be in the page.
        turnstileSiteKey: turnstileEnabled(env) ? env.TURNSTILE_SITE_KEY : null,
      })
    }

    // The public portfolio. Read-only, unauthenticated, and served before the
    // rate limiter reads an IP — nobody is identified to browse the site.
    if (url.pathname === '/api/matches' || url.pathname.startsWith('/api/matches/')) {
      return await handlePublicMatches(request, env, url)
    }

    if (url.pathname === '/api/problems' || url.pathname.startsWith('/api/problems/')) {
      return await handleProblems(request, env, url)
    }

    if (url.pathname === '/api/technologies' || url.pathname.startsWith('/api/technologies/')) {
      try {
        return await handleTechnologies(request, env, url)
      } catch (cause) {
        console.error('portfolio request failed', cause instanceof Error ? cause.message : 'unknown')
        return json({ error: 'Something went wrong.' }, 500)
      }
    }

    /**
     * Whether it is light where the visitor is.
     *
     * The coordinates come from the edge, so nobody is asked for permission to
     * pick a colour scheme — a geolocation prompt on page load is a bad trade
     * for that. They are rounded to a whole degree before anything is computed
     * or returned: enough to place a sunrise within a few minutes, far too
     * coarse to place a person, and nothing is stored or logged.
     */
    if (url.pathname === '/api/daylight' && request.method === 'GET') {
      const cf = (request as unknown as { cf?: Record<string, unknown> }).cf
      const lat = Number(cf?.latitude)
      const lon = Number(cf?.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        // No location at the edge: say so rather than invent a sunrise.
        return new Response(JSON.stringify({ known: false }), {
          headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
        })
      }
      const now = new Date()
      const times = sunTimes(coarse(lat), coarse(lon), now)
      const minute = now.getUTCHours() * 60 + now.getUTCMinutes()
      return new Response(
        JSON.stringify({
          known: true,
          kind: times.kind,
          // Whole minutes: the algorithm does not claim more, and a colour
          // scheme cannot express more.
          sunriseUtcMin: times.sunriseUtcMin === null ? null : Math.round(times.sunriseUtcMin),
          sunsetUtcMin: times.sunsetUtcMin === null ? null : Math.round(times.sunsetUtcMin),
          ground: isDaylight(times, minute) ? 'light' : 'dark',
        }),
        {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            // private, and never s-maxage: this answer is one visitor's
            // location and would otherwise be served to the next one.
            'cache-control': 'private, max-age=900',
          },
        },
      )
    }

    const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0'

    if (url.pathname.startsWith('/api/admin')) {
      try {
        // The admin surface only ever sees a keyed hash of the address: it is
        // used for the audit trail and login throttling, never stored raw.
        return await handleAdmin(request, env, url, await ipTag(ip, env.IP_SALT))
      } catch (cause) {
        console.error('admin request failed', cause instanceof Error ? cause.message : 'unknown')
        return json({ error: 'Something went wrong. Please try again.' }, 500)
      }
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    try {
      const response = await handleIntake(request, env, ctx, url.pathname)
      if (response) return response
    } catch (cause) {
      // Log the shape of the failure, never the submission itself.
      console.error('submission failed', cause instanceof Error ? cause.message : 'unknown')
      return json({ error: 'Something went wrong storing the submission. Please try again.' }, 500)
    }

    return json({ error: 'Not found' }, 404)
  },

  /**
   * Cron trigger: retries outbox rows the submitting request did not deliver
   * (provider down, request cut short). See wrangler.toml [triggers].
   */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(deliverOutbox(env, { limit: 50 }).then(() => undefined))
  },
}
