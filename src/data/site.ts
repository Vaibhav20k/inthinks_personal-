export const site = {
  name: 'InThinks',
  wordmark: 'INTHINKS',
  line: 'Early innovation. Industry ready.',
  triad: 'Discover. Develop. Transfer.',
  email: 'hello@inthinks.com',
  domain: 'inthinks.com',
} as const

/**
 * Where InThinks is.
 *
 * A list rather than a single record, because there is more than one and the
 * page has to be able to say so. Order is meaning: the first is the primary
 * office and is the one that becomes the PostalAddress in the page's
 * structured data, so reordering this array changes what a search engine
 * shows beside the name.
 *
 * Held in parts rather than as lines of text, because the same address is
 * rendered three ways — the lines a reader sees, a maps query, and the
 * structured data — and three hand-written copies disagree the first time a
 * single one of them is corrected.
 */
export interface Office {
  street: string
  locality: string
  postalCode: string
  country: string
  countryCode: string
}

export const offices: Office[] = [
  {
    street: '237, 1st Floor, Gujranwala Town, Part-3',
    locality: 'New Delhi',
    postalCode: '110009',
    country: 'India',
    countryCode: 'IN',
  },
  {
    street: '352, MG Road, Sultanpur',
    locality: 'New Delhi',
    postalCode: '110030',
    country: 'India',
    countryCode: 'IN',
  },
]

/** The primary office, for anywhere that has room for exactly one. */
export const office = offices[0]

/** How an address reads on the page: street, then city, code and country. */
export const officeLines = (o: Office) => [
  o.street,
  `${o.locality} \u2014 ${o.postalCode}, ${o.country}`,
]

/** One line, for a maps query and for anything that needs it flattened. */
export const officeOneLine = (o: Office) =>
  `${o.street}, ${o.locality} ${o.postalCode}, ${o.country}`

/**
 * Opens the address in whatever map app the visitor has. The universal Google
 * Maps URL rather than a place ID: no key, no embed, and it hands off to the
 * native app on a phone instead of loading a second map inside the page.
 */
export const officeMapUrl = (o: Office) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(officeOneLine(o))}`

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
  { label: 'Contact', to: '/contact' },
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
