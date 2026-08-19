#!/usr/bin/env node
/**
 * Points www.inthinks.com at the apex.
 *
 * This is not something wrangler.toml can express. A Worker cannot do it
 * either: `run_worker_first = ["/api/*"]` means page requests are served
 * straight from the asset layer and the Worker is never invoked, so a redirect
 * written in the Worker would fire on /api/* and nowhere else. The redirect has
 * to happen at the edge, ahead of both — which is a Cloudflare redirect rule.
 *
 * Two things have to exist for that to work, and the second one is the one
 * that gets missed:
 *
 *   1. A redirect rule in the `http_request_dynamic_redirect` phase.
 *   2. A proxied DNS record for www. Without it nothing resolves, so nothing
 *      reaches Cloudflare and the rule never runs. The record never serves
 *      traffic — 192.0.2.1 is TEST-NET-1, reserved and unroutable — it exists
 *      only so the hostname terminates at the edge.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... node scripts/setup-www-redirect.mjs [--dry-run]
 *
 * The token needs permission to read DNS and edit the zone's rulesets. If it
 * does not, Cloudflare says which permission is missing and this prints that
 * verbatim rather than guessing.
 */

const API = 'https://api.cloudflare.com/client/v4'
const APEX = process.env.APEX_DOMAIN ?? 'inthinks.com'
const WWW = `www.${APEX}`
const PHASE = 'http_request_dynamic_redirect'
const RULE_REF = 'inthinks_www_to_apex'
const DRY = process.argv.includes('--dry-run')

const token = process.env.CLOUDFLARE_API_TOKEN
if (!token) {
  console.error('Set CLOUDFLARE_API_TOKEN. Create one at:')
  console.error('  https://dash.cloudflare.com/profile/api-tokens')
  process.exit(1)
}

async function api(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
  const body = await response.json().catch(() => null)
  return { ok: response.ok && body?.success !== false, status: response.status, body }
}

/** Cloudflare's own error text, which names the missing permission. */
const explain = (result) =>
  (result.body?.errors ?? []).map((e) => `${e.code}: ${e.message}`).join('; ') ||
  `HTTP ${result.status}`

const rule = {
  ref: RULE_REF,
  description: `Redirect ${WWW} to the apex so the site has one canonical address`,
  expression: `http.host eq "${WWW}"`,
  action: 'redirect',
  action_parameters: {
    from_value: {
      // Path only. The query string is appended by preserve_query_string —
      // concatenating http.request.uri.query here as well would send it twice.
      target_url: { expression: `concat("https://${APEX}", http.request.uri.path)` },
      status_code: 301,
      preserve_query_string: true,
    },
  },
}

/* ------------------------------------------------------------------- zone */

const zones = await api(`/zones?name=${encodeURIComponent(APEX)}`)
if (!zones.ok) {
  console.error(`Could not list zones — ${explain(zones)}`)
  process.exit(1)
}
const zone = zones.body?.result?.[0]
if (!zone) {
  console.error(`${APEX} is not a zone on this account. Add the domain in Cloudflare first.`)
  process.exit(1)
}
console.log(`zone ${APEX} → ${zone.id}`)

/* -------------------------------------------------------------------- dns */

const dns = await api(`/zones/${zone.id}/dns_records?name=${encodeURIComponent(WWW)}`)
if (!dns.ok) {
  console.error(`Could not read DNS — ${explain(dns)}`)
  process.exit(1)
}
const existingRecord = dns.body?.result?.[0]

if (existingRecord) {
  console.log(`dns  ${WWW} → exists (${existingRecord.type} ${existingRecord.content}, ` +
    `${existingRecord.proxied ? 'proxied' : 'DNS-only'})`)
  if (!existingRecord.proxied) {
    console.log('     ⚠ not proxied. A redirect rule only runs on proxied traffic;')
    console.log('       turn the orange cloud on for this record or the rule never fires.')
  }
} else if (DRY) {
  console.log(`dns  ${WWW} → would create A 192.0.2.1, proxied`)
} else {
  const created = await api(`/zones/${zone.id}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'A', name: WWW, content: '192.0.2.1', proxied: true,
      comment: 'Redirect-only. TEST-NET-1, never serves traffic; exists so www terminates at the edge.',
    }),
  })
  if (!created.ok) {
    console.error(`Could not create the DNS record — ${explain(created)}`)
    process.exit(1)
  }
  console.log(`dns  ${WWW} → created A 192.0.2.1, proxied`)
}

/* ---------------------------------------------------------------- ruleset */

const entrypoint = await api(`/zones/${zone.id}/rulesets/phases/${PHASE}/entrypoint`)

if (entrypoint.ok) {
  const ruleset = entrypoint.body.result
  const rules = ruleset.rules ?? []
  console.log(`rules  existing redirect ruleset ${ruleset.id} with ${rules.length} rule(s)`)

  const already = rules.find((r) => r.ref === RULE_REF)
  if (already) {
    console.log(`rules  ${RULE_REF} is already there (${already.enabled === false ? 'disabled' : 'enabled'}). Nothing to do.`)
    process.exit(0)
  }
  if (DRY) {
    console.log('rules  would POST one rule, appending to the existing list:')
    console.log(JSON.stringify(rule, null, 2))
    process.exit(0)
  }
  // POST appends. PUT would replace every rule in the ruleset, which would
  // silently delete redirects someone else set up.
  const added = await api(`/zones/${zone.id}/rulesets/${ruleset.id}/rules`, {
    method: 'POST',
    body: JSON.stringify(rule),
  })
  if (!added.ok) {
    console.error(`Could not add the rule — ${explain(added)}`)
    process.exit(1)
  }
  console.log(`rules  appended ${RULE_REF}, ${rules.length} existing rule(s) untouched`)
} else if (entrypoint.status === 404) {
  console.log('rules  no redirect ruleset on this zone yet')
  if (DRY) {
    console.log('rules  would PUT a new entrypoint ruleset containing one rule:')
    console.log(JSON.stringify(rule, null, 2))
    process.exit(0)
  }
  const put = await api(`/zones/${zone.id}/rulesets/phases/${PHASE}/entrypoint`, {
    method: 'PUT',
    body: JSON.stringify({ rules: [rule] }),
  })
  if (!put.ok) {
    console.error(`Could not create the ruleset — ${explain(put)}`)
    process.exit(1)
  }
  console.log(`rules  created the redirect ruleset with ${RULE_REF}`)
} else {
  console.error(`Could not read the redirect ruleset — ${explain(entrypoint)}`)
  process.exit(1)
}

console.log(`\n${WWW} now 301s to https://${APEX}, path and query preserved.`)
console.log('Check it once DNS has propagated:')
console.log(`  curl -sI https://${WWW}/technologies?a=1 | head -3`)
