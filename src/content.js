// Single source of truth for all page copy.
// Swap these strings to re-skin the landing page — no component edits needed.

export const site = {
  name: 'inthinks',
  domain: 'inthinks.com',
  tagline: 'Ideas, engineered.',
}

export const nav = [
  { label: 'Product', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export const hero = {
  eyebrow: 'Now in open beta',
  title: 'Think it through,',
  titleAccent: 'then ship it.',
  subtitle:
    'inthinks turns scattered notes, half-formed ideas and messy research into structured plans your team can actually build from.',
  primaryCta: { label: 'Start for free', href: '#pricing' },
  secondaryCta: { label: 'See how it works', href: '#how' },
  note: 'No credit card required · 14-day trial on paid plans',
}

export const stats = [
  { value: '12k+', label: 'Ideas captured' },
  { value: '840', label: 'Teams onboard' },
  { value: '4.9/5', label: 'Average rating' },
  { value: '99.9%', label: 'Uptime' },
]

export const features = [
  {
    title: 'Capture anything',
    body: 'Drop in notes, links, voice memos or screenshots. Everything lands in one inbox instead of five different apps.',
    icon: 'inbox',
  },
  {
    title: 'Connect the dots',
    body: 'Related thoughts surface automatically, so the idea you had three weeks ago shows up exactly when it matters.',
    icon: 'graph',
  },
  {
    title: 'Structure on demand',
    body: 'Turn a pile of fragments into a brief, a spec or a roadmap in one click — then edit it like any other document.',
    icon: 'layers',
  },
  {
    title: 'Built for teams',
    body: 'Shared spaces, granular permissions and comment threads that keep the reasoning attached to the decision.',
    icon: 'users',
  },
  {
    title: 'Search that understands',
    body: 'Ask a question in plain language and get the passage you were thinking of, not a list of keyword matches.',
    icon: 'search',
  },
  {
    title: 'Yours to export',
    body: 'Markdown in, Markdown out. Full export any time, no lock-in, no proprietary formats holding your work hostage.',
    icon: 'export',
  },
]

export const steps = [
  {
    title: 'Collect',
    body: 'Send anything to your inbox — from the web clipper, the mobile app, email or the API.',
  },
  {
    title: 'Organise',
    body: 'inthinks clusters related material and suggests the structure hiding inside your notes.',
  },
  {
    title: 'Ship',
    body: 'Export a clean brief, publish to your wiki, or hand it straight to the team that builds it.',
  },
]

export const testimonial = {
  quote:
    'We replaced three tools with inthinks and our planning docs stopped being archaeology projects. Everything traces back to the thinking that produced it.',
  author: 'Placeholder Name',
  role: 'Head of Product, Example Co.',
}

export const pricing = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    blurb: 'For one person getting their thinking in order.',
    features: ['1 workspace', '500 items', 'Web + mobile apps', 'Community support'],
    cta: 'Get started',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: 'per user / month',
    blurb: 'For small teams that plan together.',
    features: [
      'Unlimited items',
      'Shared spaces & comments',
      'Semantic search',
      'Integrations & API',
      'Priority support',
    ],
    cta: 'Start free trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'talk to us',
    blurb: 'For organisations with compliance requirements.',
    features: ['SSO & SCIM', 'Audit logs', 'Data residency', 'SLA & onboarding'],
    cta: 'Contact sales',
    featured: false,
  },
]

export const faqs = [
  {
    q: 'Is this a real product?',
    a: 'This page is a template. Every string on it lives in src/content.js — replace them with your own and the layout keeps working.',
  },
  {
    q: 'Can I use my own colours and fonts?',
    a: 'Yes. The palette and font stack are defined as Tailwind theme tokens in src/index.css, so one edit there restyles the whole page.',
  },
  {
    q: 'Does it work on mobile?',
    a: 'The layout is responsive from 320px up, including a slide-down mobile navigation menu.',
  },
  {
    q: 'What about dark mode?',
    a: 'The template ships dark-first. Sections are composed from theme tokens, so a light variant is a token swap rather than a rewrite.',
  },
]

export const footer = {
  columns: [
    { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
    { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
    { title: 'Resources', links: ['Docs', 'API', 'Status', 'Support'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
  ],
}
