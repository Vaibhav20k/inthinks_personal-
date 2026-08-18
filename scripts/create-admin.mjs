#!/usr/bin/env node
/**
 * Prints the SQL to create or update an admin account.
 *
 * The password hash is computed here rather than by an endpoint on purpose:
 * a bootstrap route that can mint the first super-admin is an attack surface
 * that exists forever to solve a problem you have once. This script has no
 * network access and no presence in the deployed Worker.
 *
 *   node scripts/create-admin.mjs you@example.com super-admin
 *
 * It reads the password from stdin, prints SQL, and runs nothing.
 */
import { pbkdf2, randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'
import { promisify } from 'node:util'

const derive = promisify(pbkdf2)

// Must match worker/auth.ts exactly, or the hash will never verify.
const ITERATIONS = 210_000
const KEY_LENGTH = 32
const DIGEST = 'sha256'

const ROLES = ['super-admin', 'admin', 'business-development', 'rnd-reviewer']

const [email, role] = process.argv.slice(2)

if (!email || !role) {
  console.error('Usage: node scripts/create-admin.mjs <email> <role>')
  console.error(`Roles: ${ROLES.join(', ')}`)
  process.exit(1)
}
if (!ROLES.includes(role)) {
  console.error(`Unknown role "${role}". Roles: ${ROLES.join(', ')}`)
  process.exit(1)
}

const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: false })
process.stderr.write('Password (min 12 characters): ')

const password = await new Promise((resolve) => rl.question('', (answer) => {
  rl.close()
  resolve(answer)
}))

if (!password || password.length < 12) {
  console.error('\nA password of at least 12 characters is required.')
  process.exit(1)
}

const salt = randomBytes(16).toString('hex')
const hash = (await derive(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)).toString('hex')
const now = new Date().toISOString()
const esc = (v) => String(v).replace(/'/g, "''")

const sql = `INSERT INTO users (email, role, password_hash, password_salt, created_at) VALUES ('${esc(email.toLowerCase())}', '${esc(role)}', '${hash}', '${salt}', '${now}') ON CONFLICT(email) DO UPDATE SET role = excluded.role, password_hash = excluded.password_hash, password_salt = excluded.password_salt, disabled = 0, token_version = users.token_version + 1;`

process.stderr.write('\n\nRun one of these:\n\n')
process.stderr.write('  Local:  npx wrangler d1 execute inthinks-submissions --local -c wrangler.local.toml --command "<SQL>"\n')
process.stderr.write('  Remote: npx wrangler d1 execute inthinks-submissions --remote --command "<SQL>"\n\n')
process.stderr.write('SQL:\n\n')

// Only the SQL goes to stdout, so the command can be piped.
console.log(sql)
