# inthinks

Landing page template for **inthinks.com** — a single-page marketing site built
with React 19, Vite and Tailwind CSS v4.

## Getting started

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build to dist/
npm run preview  # serve the production build
```

## Project layout

```
index.html              page shell, <title> and meta description
src/
  main.jsx              React entrypoint
  App.jsx               composes the page sections in order
  index.css             Tailwind import + design tokens (@theme)
  content.js            ALL page copy lives here
  components/
    Nav.jsx             sticky header, scroll state, mobile menu
    Hero.jsx            headline, CTAs, mock app preview, stats
    Features.jsx        six-card feature grid
    HowItWorks.jsx      three numbered steps
    Testimonial.jsx     pull quote
    Pricing.jsx         three-tier pricing table
    Faq.jsx             accordion
    Cta.jsx             email capture band
    Footer.jsx          link columns + colophon
    Section.jsx         shared section wrapper + heading
    Icon.jsx            inline SVG icon set
    Logo.jsx            wordmark
```

## Customising

**Copy** — every headline, feature, price and FAQ entry is a string in
`src/content.js`. Edit that one file to re-skin the page; no component changes
needed.

**Colours and type** — defined as Tailwind theme tokens in the `@theme` block of
`src/index.css`. The `ink-*` scale drives surfaces and text, `brand-*` drives
accents. Change the hex values there and the whole page follows.

**Sections** — add, remove or reorder by editing the JSX in `src/App.jsx`.

## Notes

- The page is dark-first. Sections are composed from theme tokens, so a light
  variant is a token swap rather than a rewrite.
- Responsive from 320px up, including a slide-down mobile nav.
- The email form in `Cta.jsx` is a stub — wire `onSubmit` to your own signup
  endpoint.
