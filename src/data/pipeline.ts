/** The seven-stage core pipeline. A real sequence, so the numbering earns itself. */
export const pipeline = [
  {
    index: '01',
    key: 'discover',
    title: 'Discover',
    body: 'Identify promising technologies emerging from academic and research ecosystems.',
  },
  {
    index: '02',
    key: 'evaluate',
    title: 'Evaluate',
    body: 'Assess novelty, technical merit, IP position, feasibility and application potential.',
  },
  {
    index: '03',
    key: 'acquire',
    title: 'Acquire',
    body: 'Selected technologies enter the development portfolio through suitable commercial or IP arrangements.',
  },
  {
    index: '04',
    key: 'develop',
    title: 'Develop',
    body: 'Engineering, experimentation, optimisation and prototype development.',
  },
  {
    index: '05',
    key: 'validate',
    title: 'Validate',
    body: 'Test performance and adapt technologies against target industry requirements.',
  },
  {
    index: '06',
    key: 'match',
    title: 'Match',
    body: 'Structured industry challenges are compared against the portfolio, then qualified by technical review.',
  },
  {
    index: '07',
    key: 'transfer',
    title: 'Transfer',
    body: 'Prepare qualified technologies for licensing, acquisition or technology transfer.',
  },
] as const

/** The industry-side journey, from the buyer's point of view. */
export const industryJourney = [
  { index: '01', title: 'Submit', body: 'Share the problem.' },
  { index: '02', title: 'Structure', body: 'InThinks translates the challenge into technical requirements.' },
  { index: '03', title: 'Search', body: 'Relevant technologies are identified across the innovation portfolio.' },
  { index: '04', title: 'Evaluate', body: 'Potential solutions are reviewed for technical applicability.' },
  { index: '05', title: 'Develop', body: 'Where required, selected technologies are adapted and matured toward the application.' },
  { index: '06', title: 'Validate', body: 'Technical and commercial suitability is assessed.' },
  { index: '07', title: 'Transfer', body: 'Qualified technologies move toward commercial engagement and technology transfer.' },
] as const

/** Section 25 — where the value is actually created. */
export const valueChain = {
  before: {
    title: 'Early innovation',
    points: [
      'High uncertainty',
      'Limited testing',
      'Limited engineering',
      'Unclear application',
      'Incomplete commercial pathway',
    ],
  },
  middle: {
    title: 'InThinks value add',
    points: [
      'Technical due diligence',
      'IP review',
      'Engineering',
      'Experimentation',
      'Prototype improvement',
      'Application development',
      'Industry adaptation',
      'Validation',
      'Commercial assessment',
      'Technology packaging',
    ],
  },
  after: {
    title: 'Transfer-ready technology',
    points: [
      'Higher maturity',
      'Clearer application',
      'Validated performance',
      'Defined industry relevance',
      'Structured IP',
      'Transfer pathway',
    ],
  },
} as const

/** The commercial structures a transfer may take. Structures only — never terms. */
export const transferStructures = [
  {
    title: 'Technology transfer',
    body: 'Qualified technology and know-how transferred through one-time commercial consideration.',
  },
  {
    title: 'Licensing',
    body: 'Defined commercial rights provided to the industry partner under agreed terms.',
  },
  {
    title: 'Upfront + royalty',
    body: 'An initial technology-transfer payment alongside an ongoing royalty.',
  },
  {
    title: 'Assignment',
    body: 'Ownership of selected IP transferred where that is the appropriate structure.',
  },
  {
    title: 'Co-development',
    body: 'InThinks and the industry partner jointly complete remaining development.',
  },
  {
    title: 'Pilot & validation',
    body: 'Application-specific evaluation ahead of a commercial structure being agreed.',
  },
] as const

export const TRANSFER_TERMS_NOTE =
  'Commercial structures are designed according to the technology, application and industry requirements, and may include upfront fees, licensing, milestones and ongoing royalties.'

/** Section 13 — why a matured technology is worth more than the idea was. */
export const valueGap = {
  before: {
    title: 'Early innovation',
    points: [
      'Proof of concept',
      'Incomplete testing',
      'Unclear application fit',
      'Low TRL',
      'Limited engineering',
      'Unclear commercial pathway',
    ],
  },
  middle: {
    title: 'InThinks value addition',
    points: [
      'Technical due diligence',
      'IP review',
      'R&D',
      'Prototype refinement',
      'Testing',
      'Engineering',
      'Application development',
      'Manufacturability',
      'Industrial adaptation',
      'Validation',
      'Commercial packaging',
    ],
  },
  after: {
    title: 'Industry-ready opportunity',
    points: [
      'Clearer use case',
      'Higher TRL',
      'Reduced technical uncertainty',
      'Stronger evidence',
      'Transfer pathway',
      'Commercial structure',
    ],
  },
} as const

/** Section 54 — controlled disclosure, stated per audience. */
export const confidentiality = [
  {
    audience: 'For innovators',
    points: [
      'Identity is private by default',
      'Proprietary technical information is controlled',
      'Public technology profiles are anonymised',
      'Commercial arrangements use formal agreements',
    ],
  },
  {
    audience: 'For industry',
    points: [
      'Problem statements remain confidential',
      'NDA-based engagement can be requested',
      'Sensitive company information is not publicly displayed',
      'Only approved information enters technology discussions',
    ],
  },
  {
    audience: 'InThinks',
    points: [
      'Disclosure is progressive, stage by stage',
      'Only the information required for each stage of evaluation is shared',
      'Innovator and counterparty identities are separated until both agree',
      'Nothing is published without authorisation',
    ],
  },
] as const

/** Section 26 — the dimensions a challenge is structured across. */
export const challengeDimensions = [
  'Performance',
  'Material',
  'Process',
  'Environment',
  'Cost',
  'TRL',
  'Application',
  'Constraints',
] as const

export const institutions = [
  'IITs',
  'NITs',
  'IISc',
  'IISERs',
  'NISER',
  'Leading Private Universities',
  'Research Ecosystems',
] as const

export const INSTITUTION_DISCLAIMER =
  'Institution names indicate potential sources of innovator talent and do not imply institutional endorsement or formal partnership unless specifically stated.'
