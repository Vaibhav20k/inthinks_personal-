#!/usr/bin/env node
/**
 * Restore drill: proves a D1 export restores into a working database.
 *
 *   node scripts/restore-drill.mjs backups/<file>.sql [--migrate]
 *
 * Loads the dump into an in-memory SQLite database (the engine D1 runs on),
 * then checks: the file hash matches its manifest, integrity_check passes,
 * foreign keys resolve, and every table's row count matches the manifest.
 * With --migrate it also applies the repository's pending migrations to the
 * restored copy and checks no existing row is lost. Nothing remote is touched.
 *
 * This proves the FILE restores. It does not restore a live database; doing
 * that is `wrangler d1 execute <db> --remote --file <dump>` into an EMPTY
 * database, as described in docs/operations-runbook.md.
 *
 * Needs Node 22.5+ (node:sqlite).
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const file = process.argv[2]
if (!file || !existsSync(file)) {
  console.error('Usage: node scripts/restore-drill.mjs <export.sql>')
  process.exit(2)
}
const failures = []
const pass = (label) => console.log(`PASS ${label}`)
const fail = (label) => { failures.push(label); console.log(`FAIL ${label}`) }

const bytes = readFileSync(file)
const manifestPath = `${file}.manifest.json`
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null
if (!manifest) fail('manifest present (row counts cannot be compared)')
else if (createHash('sha256').update(bytes).digest('hex') === manifest.sha256) pass('file hash matches manifest')
else fail('file hash matches manifest')

const db = new DatabaseSync(':memory:')
const started = Date.now()
try {
  db.exec(bytes.toString('utf8'))
  pass(`dump restored in ${Date.now() - started} ms`)
} catch (cause) {
  fail(`dump restored: ${cause instanceof Error ? cause.message : cause}`)
}
const integrity = db.prepare('PRAGMA integrity_check').all().map((r) => r.integrity_check)
integrity.length === 1 && integrity[0] === 'ok' ? pass('integrity_check') : fail(`integrity_check: ${integrity.join('; ')}`)
const orphans = db.prepare('PRAGMA foreign_key_check').all()
orphans.length === 0 ? pass('foreign keys resolve') : fail(`foreign keys: ${orphans.length} orphaned row(s)`)

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name)
const counts = Object.fromEntries(tables.map((t) => [t, db.prepare(`SELECT COUNT(*) n FROM "${t}"`).get().n]))
if (manifest) {
  const names = new Set([...Object.keys(manifest.counts), ...tables.filter((t) => !t.startsWith('_cf_'))])
  const mismatched = [...names].filter((t) => (manifest.counts[t] ?? null) !== (counts[t] ?? null))
  mismatched.length === 0 ? pass(`row counts match for ${names.size} tables`) : fail(`row counts differ: ${mismatched.map((t) => `${t} ${manifest.counts[t]}→${counts[t]}`).join(', ')}`)
}
const applied = tables.includes('d1_migrations') ? db.prepare('SELECT name FROM d1_migrations ORDER BY id').all().map((r) => r.name) : []
console.log(`Migrations recorded in backup: ${applied.length ? applied.join(', ') : 'none'}`)
console.log(`Rows: ${Object.values(counts).reduce((a, b) => a + b, 0)} across ${tables.length} tables`)

// --migrate: rehearse the pending migrations on the restored copy, so a
// rollout is tested against real data before it touches the live database.
if (process.argv.includes('--migrate')) {
  const pending = readdirSync('migrations').filter((f) => f.endsWith('.sql') && !applied.includes(f)).sort()
  for (const name of pending) {
    try { db.exec(readFileSync(`migrations/${name}`, 'utf8')); pass(`pending migration ${name} applies to restored data`) }
    catch (cause) { fail(`pending migration ${name}: ${cause instanceof Error ? cause.message : cause}`) }
  }
  const after = db.prepare('PRAGMA foreign_key_check').all()
  after.length === 0 ? pass('foreign keys resolve after migrations') : fail(`foreign keys after migrations: ${after.length} orphaned row(s)`)
  const kept = tables.filter((t) => db.prepare(`SELECT COUNT(*) n FROM "${t}"`).get().n !== counts[t])
  kept.length === 0 ? pass('migrations preserve every existing row') : fail(`row counts changed by migrations: ${kept.join(', ')}`)
  if (!pending.length) console.log('No pending migrations.')
}
if (failures.length) { console.log(`${failures.length} check(s) failed.`); process.exit(1) }
console.log('Restore drill passed.')
