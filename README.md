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

### The signal field

`src/components/home/SignalField.tsx` is the signature visual and the site's
thesis in one figure: industry emits problem signals, researchers emit
technology signals, and one meaningful connection resolves out of the noise.

The hero is a composition rather than a headline stacked on a paragraph stacked
on buttons — industrial demand on the left, emerging technology on the right,
the qualified connection and its ID between them.

Nodes are real HTML buttons and the connection paths are computed from their
measured positions. That costs a measurement pass and buys keyboard focus,
screen-reader labels and responsive reflow — a field drawn entirely in SVG
would have none of those. Anchors are re-measured on resize and once the
webfont swaps in, since that reflows the labels.

Pointer behaviour follows the brief exactly: nodes never chase the cursor.
Hovering shifts which relationship is in focus and reveals that node's
metadata (`PROCESS / FURNACE`, `REQUIREMENT / >800 °C`, `STATUS / ACTIVE`).

`ScrollCoordinate` reports page position as a technical coordinate — `04 / 12
TECHNOLOGY DEVELOPMENT` — rather than a percentage, because a percentage cannot
say which part of the argument you are standing in.

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
- **No fabricated evidence.** The portfolio is whatever has actually been
  published — there is no placeholder data in the bundle any more, so an empty
  portfolio renders as empty rather than as invented records. No patents,
  results, partners or clients are asserted anywhere the platform generates
  text.
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
Schema is in `migrations/`, applied in order: `0001_init.sql` (intake),
`0002_admin.sql` (accounts, audit, scoring), `0003_matches.sql`,
`0004_development.sql`, `0005_opportunities.sql`, `0006_deals.sql`,
`0007_royalties.sql` and `0008_public_profiles.sql`.

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

| Role | Sees identity | Scores | Moves acquisition stage | Deal terms and royalties | Audit | Users |
|---|---|---|---|---|---|---|
| `super-admin` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `business-development` | ✓ | — | ✓ | ✓ | — | — |
| `rnd-reviewer` | — | ✓ | — | — | — | — |

The R&D reviewer row is the one that carries weight, in both directions. The
platform promises innovators their identity is private by default, so a
reviewer **cannot retrieve it** — the fields are absent from the API response,
not hidden by the frontend. The deal-terms column is the mirror: a reviewer
cannot read consideration or negotiation state either, because what a
technology is worth has no bearing on whether it works, and a review that knows
the number is not an independent one. Every admin response is assembled field
by field; there is no `SELECT *` path to the client anywhere in
`worker/admin.ts`.

### Modules

- **Overview** — counts, TRL averages and distributions, all computed from
  stored rows. No metric is seeded, estimated or projected; an empty pipeline
  reads as zero.
- **Innovations** — list with stage filter; detail carries the full submission,
  the IP disclosure, evidence, the eleven-dimension scoring rubric, acquisition
  stage, TRL tracking and internal notes.
- **Challenges** — list with status filter; detail carries the problem,
  technical environment, business impact, constraints, handling and notes.
- **Matches**, **R&D**, **Opportunities**, **Deals** and **Royalties** —
  described in their own sections below.
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

### Beyond the dashboard

The match engine, the Match Room, the R&D development workspace, the industry
opportunity pipeline, the commercial deal room and royalty management are
described in their own sections below.

## The public portfolio

The technology pages read published records, not a file in the bundle.
`GET /api/technologies` and `GET /api/technologies/:slug` are unauthenticated
and cacheable; `published = 1` is in every `WHERE` clause, and no parameter,
header or path reaches a draft.

**A submission cannot be published.** An innovator writes for assessors, under
confidence, about their own work; a public brief is written by InThinks, about
the technology, for an industrial reader. So the narrative is authored in the
R&D workspace on a blank form rather than pre-filled from the submission — the
one design decision the rest of this module follows from.

What is *not* authored is anything the internal record already knows. TRL,
public stage and domain are derived on read, so a page cannot advertise a
maturity the workspace disagrees with. The nine working stages collapse into
the seven public ones: outside the lab, `Optimisation` and `Engineering` are
both simply development.

Transfer status is the deliberate exception — stated, not read off the
opportunity pipeline. A derived one would let a reader infer that a technology
is in negotiation, which is exactly what the pipeline is private to avoid.

### The identity guard

The promise to innovators is enforced at the moment of publication, and again
on the way out. `identityLeak` refuses a draft that contains this record's
innovator, their email or the source institution, plus the shapes identity
takes when it slips into prose — any email address, a phone number, a profile
link. Names match whole-word, so an innovator called Rose does not blacklist
the word *prose*; `npm test` holds the guard to both halves of that job.

At serve time the same check runs again. A record that fails it is dropped from
the list and 404s on its own URL, with the reason logged — a public leak is
worse than a missing card, and nobody outside learns that the record exists.

### Publishing

Publishing needs the commercial capability, not the review one, and needs
development rights: a page presenting a technology as available to develop,
when InThinks holds none, is a claim it cannot make. It also needs the five
narrative sections actually written. Publishing and withdrawal are separate
audited actions, and withdrawal takes the page down immediately.

Filter facets — industries and outcomes — are validated against the explorer's
own vocabularies, so a profile cannot invent a facet nothing can filter on.
Slugs are chosen rather than derived from the name, because a slug that follows
an edited title silently breaks every link anyone has shared.

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

### R&D development workspace

A workspace opens once InThinks holds rights to develop a technology — at
`Rights Secured` or in the development portfolio. Before that there is nothing
to log against, so the list is empty by design rather than by accident.

Each workspace carries:

- **TRL** as entry, current and target against the 1–9 scale. The span between
  entry and current is the value InThinks has added.
- **Development stage** across the nine-stage sequence, from Research to
  Transfer Readiness.
- **Transfer readiness** as six dimensions — technical, validation, IP,
  scale-up, application, commercial — each `Early` / `Developing` / `Qualified`
  / `Ready`, with a note recording what the status rests on. Deliberately not a
  single percentage: "87% ready" hides which half is missing, and the missing
  half is what a buyer asks about first.
- **A development log** of experiments, test results, prototype revisions,
  pilot data, cost estimates, scale-up and manufacturing notes — with
  attachments, and with `Failure` as a first-class entry kind. A log that
  records only successes is a brochure; knowing what was ruled out, and when,
  is most of what survives technical due diligence.

An entry that asserts a TRL advances the technology record, so the log and the
readiness number cannot drift apart.

**Publication is a separate decision.** Entries are private by default. Putting
one on a public technology page requires the commercial capability, not the
review one — an R&D reviewer can log freely but cannot publish — and is audited
under its own action. The workspace shows the resulting public timeline beside
the working log, so it is always visible what an outsider would see.

Published entries are what the public technology page shows under
*Development undertaken by InThinks* — dated to the month, with the working log
staying internal. See **The public portfolio** below.

### Industry opportunity pipeline

An opportunity is one challenge paired with one technology, and it exists only
because a human approved that pairing for industry discussion. Approving a
match with `Approved for industry discussion` opens the opportunity in the same
transaction; nothing else creates one, and approving twice returns the same
reference rather than a second row.

The funnel runs eleven stages, from `Challenge Received` to
`Post-Transfer Royalty Monitoring`. The first four are **derived** — they are
counted from live challenge and match state each time the board is read, not
stored — so a challenge cannot sit in `Technical Evaluation` on the board while
its record says otherwise. Only the seven stages from `Match Approved` onward
are rows an operator can move, and the board marks the derived four so it is
never ambiguous which half is being read and which is being managed.

Moving an opportunity requires the commercial capability: an R&D reviewer is
refused, business development and admins are not. Unknown stages and the four
derived stages are both refused as move targets.

Each opportunity carries the challenge, the technology, the readiness the R&D
workspace recorded — the same six dimensions, not a re-entered copy — and a
link into that workspace. The identity rule holds here too: a reviewer opening
an opportunity sees the challenge without the company or the contact.

### Commercial deal room

A deal room opens for an opportunity that has reached `Commercial Negotiation`
and not before, because until then there are no terms and an empty deal
workspace reads as a deal that exists. One deal per opportunity; opening the
same one twice returns the same reference.

It records what the brief asks for — structure, upfront, royalty rate and
basis, territory, field of use, exclusivity, term, milestones, payment
schedule, pilot conditions, IP and manufacturing rights, technical support,
transfer documentation, agreement status and closing status.

Four things about how it holds them:

- **Money is never a float.** Amounts are an integer count of the currency's
  minor unit and rates are basis points, parsed by `parseAmountMinor` and
  `parseRateBp`, which refuse anything they cannot represent exactly.
  `1024.09 * 100` is `102408.99999999999` in JavaScript, and a licence dispute
  over a rounded paisa is a real thing. `npm test` holds both to exact values.
- **Agreement status and closing status are separate fields.** An agreement can
  be fully drafted and the deal still lapse; collapsing the two loses the
  record of what nearly happened.
- **A royalty rate without a basis means nothing**, so the basis is a named
  option — net sales, gross revenue, units, verified cost savings, sub-licence
  revenue — rather than free text. Three per cent of which number is the deal.
- **Marking a deal executed advances its opportunity** to `Technology Transfer`,
  so the pipeline cannot report a negotiation that has in fact been signed.

There is no projected value, no weighted probability and no expected close date
anywhere in the module, and the deal list deliberately shows no total. Summing
live negotiations produces a pipeline forecast, which is the one number this
platform does not keep.

**Private to the commercial roles.** The routes refuse an R&D reviewer before
they read anything — list, detail, open and every mutation — and the
opportunity page omits the deal panel for that role rather than disabling it.

> Transfer documentation is a **register**: which instruments this deal needs
> and how far each has got. It records the state of a document, not the
> document. Executed agreements are not stored here.

### Royalty management

An agreement opens when a deal that carries a royalty is executed — not before,
and not for a deal settled entirely by an upfront payment, because an empty
royalty record would make the register overstate how many live royalties exist.
Opening one moves its opportunity to `Post-Transfer Royalty Monitoring`.

It answers three questions and no others: what was reported, what is owed on
it, and what has been paid. There is no expected-revenue figure anywhere — a
royalty forecast is a guess about someone else's sales.

Four things hold the record together:

- **The schedule is generated from the term**, one row per reporting period for
  the whole length of it. A period nobody reported is therefore visibly missing
  rather than simply never created. The date arithmetic clamps to month ends,
  so a term starting 31 January produces 28 February and not 3 March — `Date`
  rolls over on its own, which drifts a schedule forward a few days a year.
- **What is owed is computed, never typed.** A percentage royalty is
  `reported × basis points ÷ 10,000`, rounded once at the end; a unit royalty is
  `per-unit × units`. The route ignores any `dueMinor` a client sends. A
  hand-entered amount due is the one number in a licence both sides later
  dispute.
- **Whether a period is settled is derived** from due, adjustments and paid —
  `Unpaid` / `Part paid` / `Settled` / `Overpaid` — rather than being a status
  someone sets. A status field that can disagree with the amounts beside it is
  a bug waiting to be filed. The workflow status alongside it carries only what
  the amounts cannot say: awaiting a statement, disputed, waived.
- **The reporting frequency is a term of the licence, not a setting.** Changing
  it rebuilds the schedule, because quarter 5 and month 5 are not the same
  period — so it can only be changed before the first statement is recorded.
  After that the schedule can be extended when the term grows, never rewritten.

**The minimum annual royalty** is exactly that — annual. A quarter that
under-performs may be made up by the next one, so the shortfall is only real
once every period in the royalty year has reported, and a year with a period
still outstanding claims no shortfall at all: an unreported quarter is not a
zero. Charging a shortfall is an explicit adjustment on a period, with a
required reason, not something the system applies on its own.

`npm test` holds the date arithmetic, the schedule, the due calculation, the
settlement rule, the next-statement date and the annual close to exact values.

**Private to the commercial roles**, on the same gate as the deal room, and not
exposed on the public site in any form.

### Configuring

```bash
npx wrangler secret put ANTHROPIC_API_KEY   # required; without it matching is disabled
npx wrangler secret put MATCH_MODEL         # optional, defaults to claude-opus-5
```

Without the key, `/api/admin/matches/generate` returns 503 and the rest of the
platform is unaffected.

### Tests

`npm test` covers the deterministic half — ranking, exclusion, readiness
reporting, affinity bounds, all four identity-guard cases, the deal room's money
and rate parsers, the royalty schedule, due calculation and annual close, and
the portfolio's identity guard, slug rules and public serialiser — the last of
these asserting that an innovator's name, email, institution and raw submission
payload do not survive the trip to the public shape. It runs as part of `npm run build`, so a regression
fails the deploy.

## Deployment

`wrangler.toml` publishes `dist/` plus the Worker.

> **The storage bindings are on, and `database_id` is a placeholder.** This
> config does not deploy until a D1 database and an R2 bucket exist on the
> account and the real id is pasted in — a binding naming a resource that is
> not there fails the whole deploy. Do the three steps below first, or comment
> both blocks out to get a deploy that works on a bare account with
> submissions switched off.

```bash
npx wrangler login

# 1. the database, then paste the id it prints into wrangler.toml
npx wrangler d1 create inthinks-submissions

# 2. the bucket (Cloudflare dashboard → R2 → Enable first; free tier is enough)
npx wrangler r2 bucket create inthinks-evidence

# 3. the schema — migrations 0001 through 0008
npx wrangler d1 migrations apply inthinks-submissions --remote

# secrets: the first two are required, the third only for matching
npx wrangler secret put SESSION_SECRET
npx wrangler secret put IP_SALT
npx wrangler secret put ANTHROPIC_API_KEY

npx wrangler deploy
```

Skipping step 3 is the failure that looks like a code bug and is not: the
bindings resolve, so `/api/status` reports true, and then every query hits a
table that does not exist.

`dist/` is git-ignored, so the `[build]` command builds it first. The install in that command is conditional — a bare
runner installs with `--include=dev` (some CI environments set
`NODE_ENV=production` and drop vite and tsc), while a machine that already has
`node_modules` skips it, because `npm ci` would delete the directory
`wrangler dev` is running from.

`not_found_handling = "single-page-application"` serves `index.html` for any
unmatched path, which is what makes client-side routes work on refresh and deep
links. `public/_headers` sets a CSP with no external origins, immutable caching
for `/assets/*` and `/fonts/*`, and no-cache on `index.html`.

**Custom domain.** Uncomment the `[[routes]]` block in `wrangler.toml` once
`inthinks.com` is a zone on the same Cloudflare account. It is left off for the
same reason the bindings were: deploying with a route the account does not own
fails the deploy.

## What is and is not here

The brief describes a private operating platform behind the public site:
authentication and roles, the admin innovation and challenge databases, the AI
match engine, the Match Room, acquisition pipeline, R&D workspace, industry
opportunity pipeline, deal room, royalty management and analytics. All of those
now exist, end to end: a challenge and an innovation arrive through intake, the
engine shortlists and a person decides, an approved match opens an opportunity,
a negotiated opportunity opens a deal, and an executed deal opens the royalty
record that outlives it.

One thing in the brief has never actually run here: the live call to the Claude
API in the match engine, because this environment has no `ANTHROPIC_API_KEY`.
The deterministic layers around it are tested; the model call is not.

Nothing else is stubbed. The public portfolio reads published records, so the
site shows whatever has been written and published and nothing otherwise —
which on a fresh database is an empty explorer, stating so.

`src/data/models.ts` types the innovation and challenge records, the fifteen
`MatchSignals` dimensions, the `MatchRecord` whose `humanReview` field is
non-optional by design, `InternalDealRecord`, and the platform roles — one
schema the public site and the Worker both agree on.
