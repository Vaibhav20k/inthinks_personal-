import { err, ok } from './types'
import type { Env, Result } from './types'

/**
 * Admin authentication and authorisation.
 *
 * The governing rule is deny-by-default: if no authentication mechanism is
 * configured, the admin surface is unreachable rather than open. A dashboard
 * over unpublished IP disclosures and confidential industrial problems must
 * never be one missing environment variable away from being public.
 *
 * Two mechanisms, in order of preference:
 *
 *  1. Cloudflare Access. If ACCESS_TEAM_DOMAIN and ACCESS_AUD are set, the
 *     Access JWT is verified against the team's published keys. Identity comes
 *     from Cloudflare; we never see or store a password.
 *  2. Password login, for accounts not fronted by Access. PBKDF2-SHA256 over
 *     WebCrypto, and a stateless HMAC-signed session cookie.
 */

export type Role = 'super-admin' | 'admin' | 'business-development' | 'rnd-reviewer'

export const ROLES: Role[] = ['super-admin', 'admin', 'business-development', 'rnd-reviewer']

export interface Actor {
  email: string
  role: Role
}

/**
 * Capabilities, resolved server-side on every request.
 *
 * `viewInnovatorIdentity` is the one that carries real weight. An R&D reviewer
 * assesses the technology, not the person, and the platform promises
 * innovators that their identity is private by default — so the reviewer role
 * genuinely cannot retrieve it, rather than merely not being shown it.
 *
 * `viewCommercialTerms` is the mirror of it. The deal room is private to the
 * commercial roles: a reviewer cannot read consideration, royalty rates or
 * negotiation state, because what a technology is worth has no bearing on
 * whether it works, and a review that knows the number is not independent.
 */
export interface Capabilities {
  viewSubmissions: boolean
  viewInnovatorIdentity: boolean
  viewChallengeContacts: boolean
  score: boolean
  moveAcquisitionStage: boolean
  editReviewState: boolean
  downloadEvidence: boolean
  viewCommercialTerms: boolean
  manageUsers: boolean
  viewAudit: boolean
}

export function capabilities(role: Role): Capabilities {
  const admin = role === 'admin' || role === 'super-admin'
  return {
    viewSubmissions: true,
    viewInnovatorIdentity: admin || role === 'business-development',
    viewChallengeContacts: admin || role === 'business-development',
    score: admin || role === 'rnd-reviewer',
    moveAcquisitionStage: admin || role === 'business-development',
    editReviewState: admin || role === 'rnd-reviewer',
    downloadEvidence: true,
    viewCommercialTerms: admin || role === 'business-development',
    manageUsers: role === 'super-admin',
    viewAudit: admin,
  }
}

/* ---------------------------------------------------------------- encoding */

const enc = new TextEncoder()

const b64urlToBytes = (input: string) => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const bytesToB64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Length-independent comparison, so a mismatch leaks no timing signal. */
function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/* ---------------------------------------------------------------- passwords */

const PBKDF2_ITERATIONS = 210_000

export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(bits)
}

export const newSalt = () => crypto.randomUUID().replace(/-/g, '')

/* ----------------------------------------------------------------- sessions */

interface SessionClaims {
  email: string
  role: Role
  v: number
  exp: number
}

const SESSION_TTL_SECONDS = 8 * 60 * 60

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  return bytesToB64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message))))
}

export async function issueSession(secret: string, actor: Actor, tokenVersion: number) {
  const claims: SessionClaims = {
    email: actor.email,
    role: actor.role,
    v: tokenVersion,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const body = bytesToB64url(enc.encode(JSON.stringify(claims)))
  return `${body}.${await hmac(secret, body)}`
}

export async function readSession(secret: string, token: string): Promise<SessionClaims | null> {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  if (!constantTimeEqual(signature, await hmac(secret, body))) return null
  try {
    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as SessionClaims
    if (claims.exp * 1000 < Date.now()) return null
    return claims
  } catch {
    return null
  }
}

export const SESSION_COOKIE = 'inthinks_admin'

/** HttpOnly so script cannot read it, Strict so it never rides a cross-site request. */
export const sessionCookie = (token: string, maxAge = SESSION_TTL_SECONDS) =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`

export const clearedCookie = () =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`

function cookieValue(header: string | null, name: string) {
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return rest.join('=')
  }
  return null
}

/* ------------------------------------------------------- Cloudflare Access */

interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string }

let jwksCache: { at: number; keys: Jwk[] } | null = null

async function accessKeys(teamDomain: string): Promise<Jwk[]> {
  if (jwksCache && Date.now() - jwksCache.at < 10 * 60 * 1000) return jwksCache.keys
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`)
  if (!response.ok) return []
  const body = (await response.json()) as { keys?: Jwk[] }
  jwksCache = { at: Date.now(), keys: body.keys ?? [] }
  return jwksCache.keys
}

/**
 * Verifies a Cloudflare Access assertion: RS256 signature against the team's
 * published key, plus audience, issuer and expiry. A JWT that merely parses is
 * not a credential — every one of these checks has to pass.
 */
async function verifyAccessJwt(token: string, teamDomain: string, aud: string): Promise<string | null> {
  const [headerPart, payloadPart, signaturePart] = token.split('.')
  if (!headerPart || !payloadPart || !signaturePart) return null

  let header: { kid?: string; alg?: string }
  let payload: { aud?: string | string[]; iss?: string; exp?: number; email?: string }
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(headerPart)))
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadPart)))
  } catch {
    return null
  }
  if (header.alg !== 'RS256' || !header.kid) return null

  const jwk = (await accessKeys(teamDomain)).find((k) => k.kid === header.kid)
  if (!jwk) return null

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(signaturePart),
    enc.encode(`${headerPart}.${payloadPart}`),
  )
  if (!valid) return null

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud ?? '']
  if (!audiences.includes(aud)) return null
  if (payload.iss !== `https://${teamDomain}`) return null
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null

  return payload.email ?? null
}

/* ----------------------------------------------------------- authentication */

export interface AuthContext {
  actor: Actor
  can: Capabilities
  db: D1Database
}

export function adminConfigured(env: Env) {
  const access = Boolean(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD)
  const passwords = Boolean(env.SESSION_SECRET)
  return { access, passwords, any: access || passwords }
}

async function lookup(db: D1Database, email: string) {
  return db
    .prepare('SELECT email, role, token_version, disabled FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first<{ email: string; role: string; token_version: number; disabled: number }>()
}

/**
 * Resolves the caller, or refuses.
 *
 * Every admin request goes through here. A user row is required even when
 * Cloudflare Access vouches for the identity — Access proves who someone is,
 * it does not decide what they may do here.
 */
export async function authenticate(env: Env, request: Request): Promise<Result<AuthContext>> {
  if (!env.DB) return err(503, 'The admin database is not configured on this deployment.')
  const config = adminConfigured(env)
  if (!config.any) {
    return err(503, 'Admin access is not configured on this deployment.')
  }

  let email: string | null = null

  if (config.access) {
    const assertion =
      request.headers.get('cf-access-jwt-assertion') ??
      cookieValue(request.headers.get('cookie'), 'CF_Authorization')
    if (assertion) {
      email = await verifyAccessJwt(assertion, env.ACCESS_TEAM_DOMAIN!, env.ACCESS_AUD!)
    }
  }

  if (!email && config.passwords) {
    const token = cookieValue(request.headers.get('cookie'), SESSION_COOKIE)
    if (token) {
      const claims = await readSession(env.SESSION_SECRET!, token)
      if (claims) {
        const row = await lookup(env.DB, claims.email)
        // A session survives only while it matches the user's current token
        // version, so disabling an account or rotating it ends every session.
        if (row && !row.disabled && row.token_version === claims.v) {
          email = claims.email
        }
      }
    }
  }

  if (!email) return err(401, 'Not signed in')

  const row = await lookup(env.DB, email)
  if (!row) return err(403, 'This account has no access to the InThinks admin.')
  if (row.disabled) return err(403, 'This account is disabled.')
  if (!ROLES.includes(row.role as Role)) return err(403, 'This account has no usable role.')

  const role = row.role as Role
  return ok({ actor: { email: row.email, role }, can: capabilities(role), db: env.DB })
}

export { constantTimeEqual }
