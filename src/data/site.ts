export const site = {
  name: 'InThinks',
  wordmark: 'INTHINKS',
  line: 'Early innovation. Industry ready.',
  triad: 'Discover. Develop. Transfer.',
  email: 'hello@inthinks.com',
  domain: 'inthinks.com',
} as const

/**
 * The registered office.
 *
 * Held in parts rather than as two lines of text, because the same address has
 * to be rendered three ways: as the two lines a reader sees, as a maps query,
 * and as the PostalAddress in the page's structured data. Three hand-written
 * copies would disagree the first time a single one of them was corrected.
 */
export const office = {
  street: '352, MG Road, Sultanpur',
  locality: 'New Delhi',
  postalCode: '110030',
  country: 'India',
  countryCode: 'IN',
} as const

/** How the address reads on the page: street, then city, code and country. */
export const officeLines = [
  office.street,
  `${office.locality} \u2014 ${office.postalCode}, ${office.country}`,
] as const

/** One line, for a maps query and for anything that needs it flattened. */
export const officeOneLine =
  `${office.street}, ${office.locality} ${office.postalCode}, ${office.country}`

/**
 * Opens the address in whatever map app the visitor has. The universal Google
 * Maps URL rather than a place ID: no key, no embed, and it hands off to the
 * native app on a phone instead of loading a second map inside the page.
 */
export const officeMapUrl =
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(officeOneLine)}`

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
      { label: 'Contact', to: '/contact' },
      { label: 'Confidentiality', to: '/confidentiality' },
    ],
  },
] as const
