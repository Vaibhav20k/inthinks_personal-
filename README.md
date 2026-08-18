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

**Colour — white, indigo, black.** White ground, black contrast sections, and a
single indigo accent held to roughly 3% of any screen: active states, a
qualified match, one mark on a figure. Never a field, never a gradient. The
greys are pulled a few degrees toward the indigo so the system reads as one hue
family. Three indigo steps exist because one value cannot serve every ground —
`--color-accent` on white (8.1:1), `--color-accent-deep` for hover and dense
small text (12:1), `--color-accent-light` for text on the black sections
(6.7:1). Every value is at or above 4.5:1 against the ground it sits on.

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
- **No claimed receipt.** There is no submission endpoint, so the flows say so
  and the confirmation reads "Draft complete", with the reference marked as
  locally generated.
- **AI stays understated.** The site says a challenge is structured across
  technical dimensions and that a human qualifies every result. No match
  percentages, no algorithm, no "AI-powered" framing.

## Accessibility

Semantic landmarks and one `h1` per route, a skip link, visible indigo focus
rings, form errors announced via `role="alert"`, focus returned to the step
heading on navigation, the scroll-driven journey duplicated as an ordered list
for screen readers, `aria-hidden` on decorative figures, and a 44px touch-target
floor applied under `pointer: coarse` so desktop density is preserved.

## Deployment

`wrangler.toml` publishes `dist/` as a static-assets-only Worker.

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
is in this build — it needs auth, a database and inference infrastructure that a
static site cannot host.

What is here is the architecture for it. `src/data/models.ts` types the
innovation and challenge records, the fifteen `MatchSignals` dimensions, the
`MatchRecord` whose `humanReview` field is non-optional by design, deal
structures and royalty shape, and the platform roles — so the public site and a
future backend already agree on one schema.
