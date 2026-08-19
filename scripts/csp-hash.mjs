#!/usr/bin/env node
/**
 * Adds the built page's inline-script hashes to the CSP.
 *
 * The ground selector has to run inline and synchronously — anything else
 * paints the wrong ground first and flips — but `script-src 'self'` refuses
 * inline scripts, and it should. The alternative is `'unsafe-inline'`, which
 * turns the whole directive off for every script on the page: a permanent
 * hole opened for one seven-line function.
 *
 * So the CSP names the exact script instead, by hash. Anything else inline is
 * still refused.
 *
 * This runs after the build and derives the hash from what actually shipped,
 * so editing the script cannot leave a stale hash behind. That is the only
 * reason it is a build step rather than a value pasted into _headers.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const HTML = 'dist/index.html'
const HEADERS = 'dist/_headers'

if (!existsSync(HTML) || !existsSync(HEADERS)) {
  console.error(`csp-hash: expected ${HTML} and ${HEADERS} — run vite build first`)
  process.exit(1)
}

const html = readFileSync(HTML, 'utf8')
// Inline only: a src= attribute means the browser checks the URL, not a hash.
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])

if (inline.length === 0) {
  console.log('csp-hash: no inline scripts; CSP left as authored')
  process.exit(0)
}

const hashes = inline.map((body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`)

const headers = readFileSync(HEADERS, 'utf8')
if (!/script-src 'self'/.test(headers)) {
  console.error("csp-hash: could not find \"script-src 'self'\" in _headers — refusing to guess")
  process.exit(1)
}
const next = headers.replace(/script-src 'self'[^;]*/, `script-src 'self' ${hashes.join(' ')}`)
writeFileSync(HEADERS, next)

console.log(`csp-hash: allowed ${hashes.length} inline script(s) by hash`)
for (const h of hashes) console.log(`  ${h}`)
