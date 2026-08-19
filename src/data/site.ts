export const site = {
  name: 'InThinks',
  wordmark: 'INTHINKS',
  line: 'Early innovation. Industry ready.',
  triad: 'Discover. Develop. Transfer.',
  email: 'hello@inthinks.com',
  domain: 'inthinks.com',
} as const

/**
 * Technologies, Problems and Matches sit together and in that order: what has
 * been built, what needs building for, and where the two have been put
 * together. Showing only the first told half the story — the platform has two
 * intakes, and an innovator cannot recognise a problem nobody published.
 */
export const nav = [
  { label: 'About', to: '/about' },
  { label: 'Technologies', to: '/technologies' },
  { label: 'Problems', to: '/problems' },
  { label: 'Matches', to: '/matches' },
  { label: 'For Industry', to: '/for-industry' },
  { label: 'For Innovators', to: '/for-innovators' },
  { label: 'How It Works', to: '/how-it-works' },
] as const

export const footerGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Technologies', to: '/technologies' },
      { label: 'Industrial Problems', to: '/problems' },
      { label: 'Matches', to: '/matches' },
      { label: 'How It Works', to: '/how-it-works' },
      { label: 'Technology Transfer', to: '/technology-transfer' },
    ],
  },
  {
    title: 'Participate',
    links: [
      { label: 'For Industry', to: '/for-industry' },
      { label: 'For Innovators', to: '/for-innovators' },
      { label: 'Submit a Challenge', to: '/submit-challenge' },
      { label: 'Submit an Innovation', to: '/submit-innovation' },
    ],
  },
  {
    title: 'Studio',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Confidentiality', to: '/confidentiality' },
    ],
  },
] as const
