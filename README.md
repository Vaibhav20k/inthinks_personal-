# InThinks

Homepage for **inthinks.com** — an independent ideation and innovation studio
that turns early-stage thinking into technologies, products and intellectual
property available for licensing, transfer and co-development.

Built with React 19, TypeScript, Vite and Tailwind CSS v4. Deploys to
Cloudflare Workers.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build locally
npm run deploy     # build, then wrangler deploy
```

## Design system

Everything is defined as theme tokens in `src/styles.css`; components read the
tokens and never hard-code a colour or size.

**Palette.** A warm paper ground (`--color-paper` `#f6f4f3`) with near-black
ink carrying a faint violet bias (`--color-ink` `#141216`) and graphite
secondary text. One accent — a fluorescent-tracer magenta (`--color-accent`
`#e8006f`) — held to roughly 3% of the page: section numbers, active states,
one mark per figure. `--color-accent-deep` is the AA-contrast variant for small
text. Section 07 inverts to an ink ground; it is the only dark passage, and it
marks the commercial turn.

**Type.** Archivo (variable weight *and* width) for everything readable, IBM
Plex Mono for labels, metadata, measurements and specifications. The hero runs
at `clamp(3.05rem, 7.1vw, 5.75rem)` with the width axis pushed to 112%; body
copy sits at 17–20px; mono labels at 11px with `0.16em` tracking.

Both faces are **self-hosted** from `public/fonts/` (latin subset, woff2) rather
than loaded from Google. That removes a render-blocking third-party request,
lets the CSP forbid external origins outright, keeps visitors' browsers from
connecting to Google, and — most importantly — means the typographic identity
cannot silently fall back to Helvetica if an external host is slow or blocked.
The display face is preloaded in `index.html` because the hero paints first.

**Grid.** `.container-grid` caps content at 1440px with a fluid gutter.
`.doc-columns` is the recurring structure: a 10rem margin column holding the
section number and label, with content set against it — a technical document's
marginalia. It collapses to a stacked block below `lg`.

**Structure.** Hairlines (`--rule`) do the dividing work instead of cards and
shadows. Numbering appears only where order is real: the seven journey stages,
the engagement sequence, the section index.

## Motion

No animation library. Reveals use `IntersectionObserver` plus a CSS transition;
the scroll-linked journey uses one rAF-throttled scroll listener; the hero and
lab surfaces read pointer position directly. `src/lib/motion.ts` holds all of
it: `useInView`, `useScrollProgress`, `usePointerField`, `useMediaQuery`,
`usePrefersReducedMotion`.

`prefers-reduced-motion: reduce` is handled at both levels — globally in CSS,
and in JS where the hero canvas skips its animation loop and renders the
resolved lattice, and the journey falls back to a static vertical timeline.

## Homepage sections

| # | Component | What it does |
|---|-----------|--------------|
| — | `Header` | Integrated at rest, compacts on scroll, full-screen menu below `xl` |
| 01 | `Hero` + `HeroThoughtSystem` | Canvas field: points drift, the pointer draws relationships between them, scrolling resolves them into a lattice |
| 02 | `EditorialStatement` | Positioning statement, revealed line by line out of individual clips |
| 03 | `InnovationJourney` + `JourneyFigure` | Sticky scroll-driven sequence: one SVG that accumulates from a dot → hypotheses → relationships → measurement → figure → structure → three exits |
| 04 | `SelectedInnovations` | Editorial project modules, alternating sides; development stage shown as a full scale rather than a badge |
| 05 | `DomainIndex` | Typographic index of nine domains; the hovered row draws its figure in the facing column |
| 06 | `OperatingModel` | Idea → technology spine, branching into four terminals |
| 07 | `TechnologyTransfer` | The inverted section: four pathways plus the engagement sequence |
| 08 | `Principles` | Four operating principles |
| 09 | `ExperimentCanvas` | Worksheet on drafting-grid paper — figures, measurements, an iteration log including the versions that failed |
| 10 | `InsightsIndex` | Publication index, not blog cards |
| 11 | `PartnerCTA` | Closing ask over a pointer-reactive field |
| — | `Footer` | Link groups plus the lifecycle as a compact graphic |

All visuals are generated geometry (`TechFigure`, `JourneyFigure`) — no stock
imagery, no photography.

## Content status

`src/data/` holds every string and record on the page.

The innovation records in `src/data/innovations.ts` and the entries in
`insights` are **clearly-labelled placeholders**, surfaced as such in the UI.
No project names, patents, results, clients or partners are asserted anywhere
on the page. Replace those records with real data before launch; the layouts
take them unchanged.

## Deployment

`wrangler.toml` publishes `dist/` as a static-assets-only Worker — there is no
Worker script, just `[assets]` pointing at the build output.

```bash
npx wrangler login
npx wrangler deploy
```

That single command is enough from a clean clone: `dist/` is git-ignored, so
`[build] command = "npm run build"` in `wrangler.toml` builds it first. The
same config is what Cloudflare runs if you connect the repo through the
dashboard instead.

`not_found_handling = "single-page-application"` serves `index.html` for any
unmatched path. `public/_headers` sets a CSP with **no external origins at all**
(everything is same-origin now that fonts are self-hosted), immutable caching
for `/assets/*` and `/fonts/*`, and no-cache on `index.html`.

**Custom domain.** `wrangler.toml` has a commented `[[routes]]` block for
`inthinks.com`. Uncomment it once the domain is a zone on the same Cloudflare
account — deploying with a route the account doesn't own fails.

To deploy from CI, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and
run the same command.

Verified locally against the real Workers runtime (`npx wrangler dev`): headers
applied, SPA fallback returns 200, fonts served as `font/woff2` with immutable
caching, and the page renders under the production CSP with no violations.

## Accessibility

Semantic landmarks and heading order, a skip link, visible accent focus rings
on every interactive element, the journey duplicated as an ordered list for
screen readers, `aria-hidden` on all decorative figures, and reduced-motion
paths throughout. Body copy meets AA on the paper ground; the accent is used
for small text only in its `--color-accent-deep` variant.

## Not built yet

The homepage is complete. The spec also describes standalone pages —
innovation detail pages, What We Do, How We Think, Technology Transfer and
About. Those need a router and are not in this build; the data models and
section components they would reuse are already in place.
