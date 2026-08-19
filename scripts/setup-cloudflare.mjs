#!/usr/bin/env node
/**
 * Creates the two resources the Worker binds to, and wires them up.
 *
 * The manual version of this is four commands with a copy-paste in the middle:
 * create the database, find the id in the output, paste it into wrangler.toml,
 * create the bucket, apply the migrations. The paste is where it goes wrong —
 * a wrong or forgotten id fails the deploy with an error that points at the
 * binding rather than at the id.
 *
 *   npx wrangler login
 *   node scripts/setup-cloudflare.mjs
 *
 * Safe to run twice. It checks for each resource before creating it, and only
 * writes the id into wrangler.toml if what is there is not already correct.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const DB = 'inthinks-submissions'
const BUCKET = 'inthinks-evidence'
const TOML = 'wrangler.toml'

const run = (args, { quiet = false } = {}) => {
  try {
    return execFileSync('npx', ['wrangler', ...args], {
      encoding: 'utf8',
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
    })
  } catch (error) {
    return { failed: true, output: `${error.stdout ?? ''}${error.stderr ?? ''}` }
  }
}

const step = (n, text) => console.log(`\n[${n}] ${text}`)

/* ------------------------------------------------------------ 0. signed in */

const who = run(['whoami'], { quiet: true })
if (who.failed || /not authenticated/i.test(who)) {
  console.error('Not signed in to Cloudflare. Run this first:\n\n  npx wrangler login\n')
  process.exit(1)
}
console.log(String(who).split('\n').filter((l) => /account/i.test(l)).slice(0, 3).join('\n') || 'Signed in.')

/* ------------------------------------------------------------- 1. database */

step(1, `D1 database "${DB}"`)
let databaseId = null

const list = run(['d1', 'list', '--json'], { quiet: true })
if (!list.failed) {
  try {
    const existing = JSON.parse(String(list)).find((d) => d.name === DB)
    if (existing) {
      databaseId = existing.uuid ?? existing.database_id
      console.log(`    already exists — ${databaseId}`)
    }
  } catch { /* not JSON on some versions; fall through to create */ }
}

if (!databaseId) {
  const created = run(['d1', 'create', DB], { quiet: true })
  const text = created.failed ? created.output : String(created)
  const match = text.match(/database_id\s*=\s*"([0-9a-f-]{36})"/i) ?? text.match(/"uuid"\s*:\s*"([0-9a-f-]{36})"/i)
  if (!match) {
    console.error(`    could not create it, and could not read an id from the output:\n${text}`)
    process.exit(1)
  }
  databaseId = match[1]
  console.log(`    created — ${databaseId}`)
}

/* ------------------------------------------------- 2. put the id in config */

step(2, `${TOML}`)
const toml = readFileSync(TOML, 'utf8')
const current = toml.match(/database_id\s*=\s*"([^"]*)"/)
if (!current) {
  console.error('    no database_id line found — is the [[d1_databases]] block commented out?')
  process.exit(1)
}
if (current[1] === databaseId) {
  console.log('    already correct')
} else {
  writeFileSync(TOML, toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`))
  console.log(`    set database_id (was "${current[1]}")`)
  console.log('    commit this change — the deploy reads it from the repository')
}

/* --------------------------------------------------------------- 3. bucket */

step(3, `R2 bucket "${BUCKET}"`)
const buckets = run(['r2', 'bucket', 'list'], { quiet: true })
if (!buckets.failed && String(buckets).includes(BUCKET)) {
  console.log('    already exists')
} else {
  const made = run(['r2', 'bucket', 'create', BUCKET], { quiet: true })
  if (made.failed) {
    console.error(`    failed: ${made.output.trim().split('\n').slice(-3).join(' ')}`)
    console.error('    If it says R2 is not enabled: Cloudflare dashboard → R2 → Enable, then run this again.')
    process.exit(1)
  }
  console.log('    created')
}

/* ----------------------------------------------------------- 4. migrations */

step(4, 'schema — migrations 0001 through 0008')
console.log('    (this is the step that is easy to skip, and skipping it makes')
console.log('     every API call fail against a table that does not exist)')
const migrated = run(['d1', 'migrations', 'apply', DB, '--remote'])
if (migrated.failed) {
  console.error(`    failed:\n${migrated.output}`)
  process.exit(1)
}
console.log('    applied')

/* -------------------------------------------------------------- 5. secrets */

step(5, 'secrets still to set, by hand')
console.log(`
    npx wrangler secret put SESSION_SECRET     # required — admin sign-in
    npx wrangler secret put IP_SALT            # required — rate limiting
    npx wrangler secret put ANTHROPIC_API_KEY  # optional — matching 503s without it

  Then the first admin account:

    node scripts/create-admin.mjs              # prints SQL to run against the database

  Then deploy:

    npx wrangler deploy
`)
console.log('Database and bucket are ready.')
