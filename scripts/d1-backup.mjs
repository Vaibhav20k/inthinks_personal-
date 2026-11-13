#!/usr/bin/env node
/**
 * Exports a D1 database to a SQL file and writes a manifest of row counts and
 * a SHA-256, so scripts/restore-drill.mjs can prove the file restores to the
 * same data.
 *
 *   node scripts/d1-backup.mjs --env staging [--out backups]
 *   node scripts/d1-backup.mjs --env production [--out backups]
 *
 * Requires `npx wrangler login`. Read-only against the database, but Cloudflare
 * documents that a database may briefly stop serving queries while an export
 * runs, so schedule production exports for a quiet period.
 *
 * Backups contain confidential submissions. `backups/` is git-ignored; store
 * the files encrypted, outside this repository, and delete them on schedule.
 * D1 Time Travel (point-in-time restore) is separate and covers recent history
 * without any file; see docs/operations-runbook.md.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, i, all) =>
  value.startsWith('--') ? [...pairs, [value.slice(2), all[i + 1]]] : pairs, []))
const targets = {
  staging: { database: 'inthinks-staging', config: 'wrangler.staging.toml' },
  production: { database: 'inthinks-submissions', config: 'wrangler.toml' },
}
const target = targets[args.env]
if (!target) {
  console.error('Usage: node scripts/d1-backup.mjs --env staging|production [--out backups]')
  process.exit(2)
}
const out = args.out ?? 'backups'
mkdirSync(out, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const file = join(out, `${target.database}-${stamp}.sql`)

// Wrangler's own entry point under this Node, without a shell: arguments
// (including SQL and paths with spaces) are passed exactly, never re-parsed.
const wrangler = (...rest) => {
  try {
    return execFileSync(process.execPath, [join('node_modules', 'wrangler', 'bin', 'wrangler.js'), ...rest, '-c', target.config],
      { encoding: 'utf8', env: { ...process.env, CI: '1' }, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (cause) {
    // On Windows, Node can abort on a libuv assertion while exiting after the
    // command has completed. Accept that exit only when the output says the
    // work finished; every caller below still validates what it received.
    if (/UV_HANDLE_CLOSING/.test(String(cause.stderr)) && cause.stdout) return cause.stdout
    throw cause
  }
}
/** Runs one or more statements; returns each statement's rows. */
const query = (sql) => {
  const output = wrangler('d1', 'execute', target.database, '--remote', '--json', '--command', sql)
  const parsed = JSON.parse(output.slice(output.search(/[[{]/)))
  if (!Array.isArray(parsed)) throw new Error(`D1 query failed: ${parsed.error?.notes?.[0]?.text ?? parsed.error?.text ?? 'unknown error'}`)
  return parsed.map((statement) => statement.results)
}

// Counts first, export second: a write between the two shows up as a mismatch
// in the drill rather than passing silently.
const tables = query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name")[0].map((r) => r.name)
// One statement per table: D1 rejects long compound SELECTs.
const counts = tables.length
  ? Object.fromEntries(query(tables.map((t) => `SELECT COUNT(*) AS n FROM "${t}"`).join('; ')).map((rows, i) => [tables[i], rows[0].n]))
  : {}
wrangler('d1', 'export', target.database, '--remote', '--output', file)
if (!existsSync(file) || statSync(file).size === 0) throw new Error('Export produced no file.')
const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex')
const manifest = { database: target.database, exportedAt: new Date().toISOString(), file, sha256, counts }
writeFileSync(`${file}.manifest.json`, JSON.stringify(manifest, null, 2))
console.log(`Exported ${tables.length} tables to ${file}`)
console.log(`Manifest ${file}.manifest.json (sha256 ${sha256.slice(0, 16)}…)`)
console.log(`Verify with: node scripts/restore-drill.mjs ${file}`)
