# InThinks

Public website for **inthinks.com** — an innovation intelligence and technology
transfer platform. InThinks identifies promising early-stage technologies,
develops selected innovations through focused R&D, and connects qualified
solutions with real industrial challenges.

React 19, TypeScript, Vite, Tailwind CSS v4, React Router. Deploys to
Cloudflare Workers.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build locally
npm run deploy     # wrangler deploy (builds first)
```

## Design system

All tokens live in `src/styles.css`; components read them and never hard-code a
colour.

**Colour — white, indigo blue, black.** White ground, black contrast sections,
and a single indigo blue accent (`#1560bd`) held to roughly 3% of any screen:
active states, a qualified match, one mark on a figure. Never a field, never a
gradient. The greys are pulled toward the accent so the system reads as one hue
family. Three steps exist because one value cannot serve every ground —
`--color-accent` `#1560bd` on white (6.1:1), `--color-accent-deep` `#0e4281` for
hover and dense small text (9.9:1), `--color-accent-light` `#72aaef` for text on
the black sections (8.3:1). The two derived steps move lightness only, so all
three sit on the same hue. Every value clears AA on the ground it sits on.

**Mark.** The company logo — a gear inside a bulb — is redrawn as vector in
`src/components/primitives/Logo.tsx`, so it stays crisp at any size, themes with
the palette and costs no request. It appears in the header, footer, closing CTA
and as the browser favicon (`public/favicon.svg`). A `tone` prop switches to the
light indigo step on black grounds.

**Type.** Archivo (variable weight *and* width — the hero pushes the width axis
to 112%) with IBM Plex Mono for technology IDs, TRL, status and technical
metadata. Both self-hosted from `public/fonts/` (latin subset, woff2) rather
than Google, which removes a render-blocking third-party request, lets the CSP
forbid external origins outright, and means the typographic identity cannot
silently fall back to Helvetica.

**Structure.** Hairlines and a document margin column (`.doc-columns`) instead
of cards and shadows. Technology IDs (`INT / MAT / 024`) are treated as a brand
element via the `.ident` utility. Numbering appears only where order is real.

## Site

| Route | What it is |
|---|---|
| `/` | Homepage — twelve sections in the order the brief specifies |
| `/technologies` | Technology Explorer, filtered by problem, industry, domain, TRL and transfer status |
| `/technologies/:slug` | Technology brief — between a product page, a research note and a case study |
| `/for-industry` | The industry engagement, end to end |
| `/for-innovators` | What we look for, the path, and IP/ownership |
| `/how-it-works` | The pipeline, TRL advancement and how matching works |
| `/technology-transfer` | Commercial structures and the engagement route |
| `/about` | The thesis and why InThinks operates independently |
| `/confidentiality` | Progressive disclosure, stated per audience |
| `/submit-challenge` | Six-step industry challenge submission |
| `/submit-innovation` | Eight-step innovation submission |

### The Matchfield

`src/components/home/Matchfield.tsx` is the signature visual. Labelled
industrial challenges on the left, emerging technologies on the right, the
InThinks axis between them. It cycles through qualified matches: one pair
resolves, its path draws through the centre, the rest of the field recedes, and
the three stages that follow a match run underneath. Pointer height biases which
row is interrogated.

Every line is a real relationship between plausible neighbours — drawing all 25
pairs would read as the neural-network cliché the brief rules out, so `LATENT`
lists only the links worth showing. The readout sits below the field rather than
inside it, so nothing overlaps the relationships.

### Forms

Both flows run on one chassis (`src/components/forms/FormShell.tsx`):
per-step validation, drafts autosaved to localStorage that restore both the
answers *and* the step position, conditional fields (patent detail only appears
once a filing is declared), drag-and-drop evidence staging, a TRL ladder with
every definition visible, and reference generation (`CH-2026-XXXX`,
`INT-2026-XXXX`).

## Motion

No animation library. `src/lib/motion.ts` holds all of it — `useInView`,
`useScrollProgress`, `usePointerField`, `useMediaQuery`,
`usePrefersReducedMotion` — built on IntersectionObserver, one rAF-throttled
scroll listener and pointer position. `prefers-reduced-motion` is handled in CSS
*and* in JS: the Matchfield renders its resolved state without an animation
loop, and the scroll-driven TRL journey falls back to a static vertical
timeline.

## What this build does not claim

The brief's legal and trust rules are enforced in the UI, not just intended:

- **No institutional endorsement.** Institution names appear as sources of
  talent, with the disclaimer in the section itself, and no logos.
- **No identity exposure.** Innovator name, institution and contact details are
  collected but never reach a public technology profile. `Technology` and
  `InternalInnovationRecord` are deliberately separate types so no shared shape
  can leak one into the other.
- **No commercial detail.** Transfer *structures* are named; consideration,
  margin and negotiation terms live only in `InternalDealRecord`.
- **No fabricated evidence.** Every portfolio and narrative field in
  `src/data/technologies.ts` is a labelled placeholder, surfaced as such on the
  cards, the explorer and every brief. No patents, results, partners or clients
  are asserted.
- **No claimed receipt.** Submissions are stored and the reference is
  issued by the server, so the confirmation is only reached once the record
  exists. Where the bindings are absent, the form says so up front rather than
  claiming receipt.
- **AI stays understated.** The site says a challenge is structured across
  technical dimensions and that a human qualifies every result. No match
  percentages, no algorithm, no "AI-powered" framing.

## Accessibility

Semantic landmarks and one `h1` per route, a skip link, visible indigo focus
rings, form errors announced via `role="alert"`, focus returned to the step
heading on navigation, the scroll-driven journey duplicated as an ordered list
for screen readers, `aria-hidden` on decorative figures, and a 44px touch-target
floor applied under `pointer: coarse` so desktop density is preserved.

## Submission API

The same Worker that serves the site handles `/api/*`. `run_worker_first`
matters here: without it the SPA fallback would answer `/api/*` with
`index.html` before the Worker ever saw the request.

| Route | Method | Purpose |
|---|---|---|
| `/api/status` | GET | Whether this deployment can accept submissions and files |
| `/api/challenges` | POST | Industry challenge, JSON |
| `/api/innovations` | POST | Innovation, JSON or multipart with evidence files |

Records go to **D1**, evidence files to **R2**. Both are optional bindings: with
neither, the site still deploys and runs, `/api/status` reports `false`, and the
forms say submissions are not configured instead of pretending to accept them.

### One-time setup

`wrangler.toml` ships with the storage bindings **commented out**, so the site
deploys on a bare Cloudflare account. A binding naming a resource that does not
exist fails the entire deploy, so they stay off until you create the resources.

```bash
npx wrangler login

# 1. Records
npm run db:create                   # wrangler d1 create inthinks-submissions
#    paste the returned database_id into wrangler.toml and uncomment the
#    [[d1_databases]] block, then:
npm run db:migrate                  # applies migrations/ to the remote database

# 2. Evidence files (optional — the written record works without it)
#    Enable R2 once in the Cloudflare dashboard → R2 → Enable (free tier), then:
npm run r2:create                   # wrangler r2 bucket create inthinks-evidence
#    and uncomment the [[r2_buckets]] block in wrangler.toml.

# 3. Secrets
npx wrangler secret put IP_SALT         # any long random string
npx wrangler secret put SESSION_SECRET  # required for admin sign-in and signed downloads
npx wrangler secret put NOTIFY_WEBHOOK  # optional arrival notice

npx wrangler deploy
```

Locally, `npm run dev:db` then `npm run dev:worker` uses `wrangler.local.toml`,
which points the same bindings at wrangler's simulated D1 and R2 — no account
resources are touched.

### What the endpoint enforces

- **Server-side validation is authoritative.** `worker/validation.ts` declares
  every field with a length cap; unknown keys are dropped rather than stored, so
  the `payload` column can never accumulate arbitrary content. The client
  validates too, but only for the submitter's benefit.
- **Declarations are a gate.** An innovation is refused unless all seven are
  confirmed, checked server-side.
- **Uploads are allow-listed**, capped at 25 MB per file, 12 files, 60 MB total.
  Submitted filenames never become storage keys — objects are stored under
  `{reference}/{uuid}.{ext}` so a crafted name cannot traverse the bucket.
- **Throttling is two-tier.** A loose ceiling on requests (60 per 10 minutes)
  that only abuse reaches, and a tight one on *accepted* submissions (6),
  charged only after a record is stored. A single counter would lock someone out
  of an eight-step form for mistyping their email three times. IPs are stored
  only as salted SHA-256 hashes.
- **References are allocated atomically** — an upsert-and-return against a
  counter row per stream and year, so two simultaneous submissions cannot
  collide on `CH-2026-0001`.
- **Confidential content stays put.** The optional notification webhook receives
  the reference, company and sector only — never the problem statement or any
  technical answer. Errors log their shape, never the submission.

### Where the data lands

`challenges` and `innovations` promote the triage fields to real columns and
keep the long-form answers in a `payload` JSON column, so the question set can
change without a migration. `evidence` is the manifest pointing at R2 objects.
Schema is in `migrations/0001_init.sql`.

## Admin dashboard

`/admin` is the internal surface over submissions. It is code-split, so a
visitor to the public site never downloads it.

### Access is closed by default

With no authentication configured the admin surface is **unreachable**, not
open. A dashboard over unpublished IP disclosures and confidential industrial
problems must never be one missing environment variable away from being public,
so `authenticate()` refuses before it does anything else.

Two mechanisms, in order of preference:

1. **Cloudflare Access.** Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` and the
   Access JWT is verified properly — RS256 against the team's published JWKS,
   plus audience, issuer and expiry. Identity comes from Cloudflare; no password
   is ever stored here.
2. **Password sign-in**, for accounts not fronted by Access. PBKDF2-SHA256 at
   210k iterations over WebCrypto, and a stateless HMAC-signed session in an
   HttpOnly, Secure, SameSite=Strict cookie.

Either way a `users` row is required. Access proves *who* someone is; it does
not decide what they may do here.

### Creating the first account

```bash
node scripts/create-admin.mjs you@example.com super-admin
# prints SQL — run it with wrangler d1 execute (local or --remote)
```

The hash is computed by a local script rather than a bootstrap endpoint on
purpose: a route that can mint the first super-admin is an attack surface that
exists forever to solve a problem you have once.

### Roles

| Role | Sees identity | Scores | Moves acquisition stage | Audit | Users |
|---|---|---|---|---|---|
| `super-admin` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `admin` | ✓ | ✓ | ✓ | ✓ | — |
| `business-development` | ✓ | — | ✓ | — | — |
| `rnd-reviewer` | — | ✓ | — | — | — |

The R&D reviewer row is the one that carries weight. The platform promises
innovators their identity is private by default, so a reviewer **cannot
retrieve it** — the fields are absent from the API response, not hidden by the
frontend. Every admin response is assembled field by field; there is no
`SELECT *` path to the client anywhere in `worker/admin.ts`.

### Modules

- **Overview** — counts, TRL averages and distributions, all computed from
  stored rows. No metric is seeded, estimated or projected; an empty pipeline
  reads as zero.
- **Innovations** — list with stage filter; detail carries the full submission,
  the IP disclosure, evidence, the eleven-dimension scoring rubric, acquisition
  stage, TRL tracking and internal notes.
- **Challenges** — list with status filter; detail carries the problem,
  technical environment, business impact, constraints, handling and notes.
- **Audit log** — reads as well as writes.
- **Users** — accounts and roles, super-admin only.

### Evidence files

R2 keys never reach the browser as fetchable URLs. A download link is an HMAC
over the key and a five-minute expiry, and the route checks the signature *and*
the session. Verified against tampering: forged signature, swapped key with a
kept signature, extended expiry with a kept signature, and a valid link with no
session are all refused.

### Audit

Every detail view, list, mutation and download is recorded with actor, role,
action, target and a truncated IP hash. Reads are logged because opening a
disclosure is the sensitive action — "who looked at this submission" has to stay
answerable.

### Not built

The brief also describes an AI match engine and Match Room, an R&D development
workspace, an industry opportunity pipeline, a commercial deal room and royalty
management. Those are not in this build. The record shapes they need
(`MatchRecord` with its non-optional `humanReview`, `InternalDealRecord`,
`MatchSignals`) are typed in `src/data/models.ts`.

## Match engine

Connects the challenge database to the technology portfolio. Two layers, then a
person.

**Layer 1 — expert rules** (`worker/match-rules.ts`). Deterministic,
explainable and free. It excludes what cannot answer the challenge whatever the
prose says, and ranks the rest so only a shortlist reaches the model. Every rule
is a claim a domain expert could argue with, and each candidate carries the
signals that produced its ranking. A readiness gap lowers the ranking but never
excludes — closing that gap is what the development pipeline is for.

**Layer 2 — semantic analysis** (`worker/match-engine.ts`). Claude assesses the
shortlist and returns, per candidate: classification, six per-dimension fits,
estimated TRL gap, IP risk, why they match, technical conflicts, missing
evidence, required development, commercial potential, and a suggested next step.
Structured output via Zod, so the shape is guaranteed rather than parsed out of
prose.

Two constraints shape the module:

- **No identity reaches the model.** The candidate context is assembled from
  technical columns only — `loadTechnologies` never reads innovator name, email
  or institution — and `assertNoIdentity` throws if an email, phone number or
  LinkedIn URL ever appears in the prompt. It should never fire, which is why
  it is worth having: a change that widens the record shape breaks loudly rather
  than quietly sending an innovator's name to a third party.
- **No fake precision.** Classifications (`Strong Match`, `Promising Match`,
  `Adjacent Opportunity`, `Weak Match`) and fits (`Strong` / `Moderate` /
  `Limited` / `Unknown`), never a percentage. "93.76% match" invents confidence
  the analysis does not have.

The prompt tells the model it is one input to a decision, instructs it to be
sceptical, and requires it to report what is *unknown* rather than treat silence
as either a strength or a conflict.

### AI recommends. InThinks decides.

Enforced in `worker/matches.ts`, not in the UI. A generated match is always
written `Pending`. Only an authenticated actor can move it, regenerating never
overwrites a decision, and `Approved for Industry Discussion` — the one decision
that lets a match leave InThinks — requires the acquisition capability, so an
R&D reviewer cannot release one. That approval is audited under its own action
name, separate from ordinary decisions.

A **Match Room** presents the challenge on the left, the technology on the
right, the analysis between them, and the five decisions along the bottom. No
party identity appears anywhere on it.

### Configuring

```bash
npx wrangler secret put ANTHROPIC_API_KEY   # required; without it matching is disabled
npx wrangler secret put MATCH_MODEL         # optional, defaults to claude-opus-5
```

Without the key, `/api/admin/matches/generate` returns 503 and the rest of the
platform is unaffected.

### Tests

`npm test` covers the deterministic half — ranking, exclusion, readiness
reporting, affinity bounds, and all four identity-guard cases. It runs as part
of `npm run build`, so a regression fails the deploy.

## Deployment

`wrangler.toml` publishes `dist/` plus the Worker.

```bash
npx wrangler login
npx wrangler deploy
```

That is enough from a clean clone: `dist/` is git-ignored, so the `[build]`
command builds it first. The install in that command is conditional — a bare
runner installs with `--include=dev` (some CI environments set
`NODE_ENV=production` and drop vite and tsc), while a machine that already has
`node_modules` skips it, because `npm ci` would delete the directory
`wrangler dev` is running from.

`not_found_handling = "single-page-application"` serves `index.html` for any
unmatched path, which is what makes client-side routes work on refresh and deep
links. `public/_headers` sets a CSP with no external origins, immutable caching
for `/assets/*` and `/fonts/*`, and no-cache on `index.html`.

**Custom domain.** Uncomment the `[[routes]]` block in `wrangler.toml` once
`inthinks.com` is a zone on the same Cloudflare account.

## Not built

The brief describes a private operating platform behind the public site:
authentication and roles, the admin innovation and challenge databases, the AI
match engine, the Match Room, acquisition pipeline, R&D workspace, industry
opportunity pipeline, deal room, royalty management and analytics. None of that
is in this build.

Intake, the admin dashboard, the match engine and the Match Room now exist.
What remains from the brief is the workflow that follows an approved match: the
R&D development workspace, the industry opportunity pipeline, the commercial
deal room and royalty management.

What is here is the architecture for it. `src/data/models.ts` types the
innovation and challenge records, the fifteen `MatchSignals` dimensions, the
`MatchRecord` whose `humanReview` field is non-optional by design, deal
structures and royalty shape, and the platform roles — so the public site and a
future backend already agree on one schema.
