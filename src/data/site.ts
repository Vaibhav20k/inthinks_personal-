export const site = {
  name: 'InThinks',
  wordmark: 'INTHINKS',
  line: 'Early innovation. Industry ready.',
  triad: 'Discover. Develop. Transfer.',
  email: 'hello@inthinks.com',
  domain: 'inthinks.com',
} as const

export const nav = [
  { label: 'Technologies', to: '/technologies' },
  { label: 'For Industry', to: '/for-industry' },
  { label: 'For Innovators', to: '/for-innovators' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Technology Transfer', to: '/technology-transfer' },
  { label: 'About', to: '/about' },
] as const

export const footerGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Technologies', to: '/technologies' },
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
