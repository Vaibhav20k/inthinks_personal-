import type { IndustrialProblem, PublicMatch, Technology } from './models'

/**
 * ILLUSTRATIVE EXAMPLES — not the portfolio.
 *
 * These exist so the site can show what a technology profile, a problem
 * statement and a qualified match look like before any real record has been
 * published. They are shown only when the live portfolio is empty, and every
 * surface that renders one says plainly that it is an example.
 *
 * They are written to be recognisable industrial situations rather than
 * inventions: no company is named, no performance figure is claimed as
 * measured, no patent or partner is asserted, and nothing here corresponds to
 * a real innovator or a real plant. An industry visitor who enquires about one
 * must not find that InThinks has been describing something that does not
 * exist — which is the entire reason for the labelling.
 *
 * Delete this file once real records are published; nothing depends on it
 * except the empty state.
 */

export const exampleTechnologies: Technology[] = [
  {
    id: 'EXAMPLE / MAT / 001',
    slug: 'example-low-temperature-hardening',
    name: 'Low-Temperature Surface Hardening',
    domain: 'Advanced Materials',
    domainCode: 'MAT',
    thesis:
      'A hard, wear-resistant surface produced below 200 °C, on components that cannot survive a furnace.',
    problem:
      'Conventional case hardening runs above 800 °C. Assembled parts, heat-treated alloys and anything carrying a polymer seal cannot go through it, so those components are replaced on wear rather than treated.',
    principle:
      'A plasma-assisted route drives the hardening species into the surface at low temperature, so the bulk material never reaches a temperature that would change its properties or distort the part.',
    whyItMatters:
      'A pump housing or valve body that is currently scrapped on wear could instead be treated in place. That turns a capital replacement into a maintenance operation, which is a different line in a different budget.',
    validation:
      'Illustrative. A real profile states only what evidence supports, and names the environment the evidence came from.',
    applications: ['Pump housings', 'Valve bodies', 'Hydraulic components'],
    sectors: ['Manufacturing', 'Energy'],
    outcomes: ['life', 'durability', 'opex'],
    entryTrl: 3,
    currentTrl: 5,
    targetTrl: 8,
    stage: 'Prototype Optimisation',
    ipStatus: 'To Be Confirmed',
    nextMilestones: [
      'Extended-duration wear testing against an abrasive medium',
      'Manufacturability assessment at production volume',
    ],
    transferStatus: 'Under Development',
  },
  {
    id: 'EXAMPLE / ENR / 002',
    slug: 'example-low-grade-heat-recovery',
    name: 'Low-Grade Heat Recovery',
    domain: 'Energy',
    domainCode: 'ENR',
    thesis:
      'Recovery aimed at heat streams below 120 °C, which are too low-grade to justify conventional equipment.',
    problem:
      'Most industrial waste heat leaves as warm water or flue gas well under 150 °C. Conventional recovery equipment needs a bigger temperature difference to pay back, so this heat is vented — not because it is worthless, but because nothing economic collects it.',
    principle:
      'A working fluid selected for a low boiling point, in a compact cycle sized for the stream rather than the plant, so the capital cost scales with what is actually being recovered.',
    whyItMatters:
      'Low-grade heat is the largest single category of industrial energy loss. Anything that changes its economics changes a site energy balance without changing the process that produces it.',
    validation:
      'Illustrative. Recovery figures depend entirely on the stream, and a real profile would state which stream was measured.',
    applications: ['Process cooling water', 'Flue gas economisers', 'Compressor jackets'],
    sectors: ['Energy', 'Chemicals', 'Manufacturing'],
    outcomes: ['energy', 'efficiency', 'emissions'],
    entryTrl: 4,
    currentTrl: 5,
    targetTrl: 8,
    stage: 'Validation',
    ipStatus: 'To Be Confirmed',
    nextMilestones: [
      'Demonstration on a real plant stream rather than a rig',
      'Payback model against a measured stream, not a nominal one',
    ],
    transferStatus: 'Under Development',
  },
  {
    id: 'EXAMPLE / CLN / 003',
    slug: 'example-selective-metal-recovery',
    name: 'Selective Metal Recovery from Process Water',
    domain: 'Clean Technology',
    domainCode: 'CLN',
    thesis:
      'Pulling one valuable metal back out of a dilute mixed stream, rather than treating the whole stream as waste.',
    problem:
      'Rinse and process waters carry dissolved metals at concentrations too low for conventional recovery and too high to discharge. The usual answer precipitates everything together, which produces a sludge that is a disposal cost rather than a product.',
    principle:
      'A selective sorbent that binds one target species in preference to the rest, so the metal comes off the column as something with a buyer instead of as part of a mixed cake.',
    whyItMatters:
      'It changes a stream from a treatment cost to a recovered material, and reduces what leaves the site as hazardous waste at the same time.',
    validation:
      'Illustrative. Selectivity is chemistry-specific; a real profile would name the species and the matrix it was demonstrated in.',
    applications: ['Plating rinse water', 'Mine drainage', 'Catalyst regeneration'],
    sectors: ['Chemicals', 'Mining', 'Manufacturing'],
    outcomes: ['recovery', 'waste', 'water'],
    entryTrl: 3,
    currentTrl: 4,
    targetTrl: 7,
    stage: 'Development',
    ipStatus: 'To Be Confirmed',
    nextMilestones: [
      'Selectivity confirmed in a genuine mixed effluent matrix',
      'Column regeneration cycle life',
    ],
    transferStatus: 'Under Development',
  },
]

export const exampleProblems: IndustrialProblem[] = [
  {
    id: 'EXAMPLE / CH / 001',
    slug: 'example-reheating-furnace-heat-loss',
    title: 'Heat loss from reheating furnace shells',
    sector: 'Manufacturing',
    summary:
      'A rolling mill loses a significant share of its fuel through the furnace shell, and the existing insulation degrades faster than the maintenance window allows.',
    problem:
      'The furnace runs continuously above 1,100 °C. Shell temperatures indicate steady radiant loss across a large surface. Refractory and insulation degrade under thermal cycling, and replacing them requires a shutdown the production schedule cannot absorb more than once a year.',
    currentApproach:
      'Periodic re-lining with conventional refractory. It works, but performance decays through the campaign and the shutdown cost dominates the decision about when to do it.',
    targetOutcome:
      'A measurable reduction in shell heat loss that holds across a full campaign, installable within an existing shutdown window, with no change to the furnace control philosophy.',
    constraints: [
      'Survives continuous operation above 1,100 °C',
      'Installable without extending the annual shutdown',
      'No modification to burner or control systems',
      'Must not introduce a contamination route to the product',
    ],
    environment: [
      { term: 'Process', value: 'Continuous reheating furnace' },
      { term: 'Operating temperature', value: '> 1,100 °C' },
      { term: 'Duty', value: 'Continuous, campaign-based' },
      { term: 'Access', value: 'Annual shutdown only' },
    ],
    impact: ['Energy consumption', 'High cost', 'Emissions'],
    outcomes: ['energy', 'thermal', 'emissions', 'opex'],
    minimumTrl: 4,
    status: 'Open for technologies',
  },
  {
    id: 'EXAMPLE / CH / 002',
    slug: 'example-pump-wear-in-abrasive-slurry',
    title: 'Pump wear in abrasive slurry service',
    sector: 'Mining',
    summary:
      'Slurry pump internals wear out well before the planned maintenance interval, and each change-out costs more in lost throughput than in parts.',
    problem:
      'Pumps handling abrasive slurry lose impeller and casing material steadily. Replacement is scheduled around failure rather than around production, so the real cost is unplanned downtime rather than components. Harder replacement alloys have been tried and shift the problem rather than removing it.',
    currentApproach:
      'Scheduled replacement of wet-end components, with harder alloys where the budget allows. Wear rate improves somewhat; the failure mode does not change.',
    targetOutcome:
      'A component life long enough to align change-outs with the planned maintenance interval, so the intervention becomes scheduled rather than reactive.',
    constraints: [
      'Retrofit to existing pump geometry — no re-engineering of the pump',
      'No reduction in hydraulic efficiency',
      'Survives slurry chemistry as well as abrasion',
      'Repairable in the site workshop, not only at the manufacturer',
    ],
    environment: [
      { term: 'Process', value: 'Centrifugal slurry pumping' },
      { term: 'Medium', value: 'Abrasive mineral slurry' },
      { term: 'Duty', value: 'Continuous' },
      { term: 'Constraint', value: 'Existing pump envelope' },
    ],
    impact: ['Downtime', 'Maintenance', 'High cost'],
    outcomes: ['life', 'durability', 'opex'],
    minimumTrl: 5,
    status: 'Technologies identified',
  },
  {
    id: 'EXAMPLE / CH / 003',
    slug: 'example-metal-bearing-rinse-water',
    title: 'Metal-bearing rinse water with no viable recovery route',
    sector: 'Chemicals',
    summary:
      'A finishing line produces rinse water carrying a valuable metal at a concentration that is expensive to treat and uneconomic to recover.',
    problem:
      'Rinse water leaves the line with dissolved metal too dilute for conventional recovery and too concentrated to discharge. Current treatment precipitates everything together, producing a mixed sludge that is disposed of as hazardous waste — so a valuable material is being paid for twice, once as feedstock and once as disposal.',
    currentApproach:
      'Chemical precipitation and filter pressing, with the cake sent offsite. Compliant, and the metal is unrecoverable once it is in the cake.',
    targetOutcome:
      'Recovery of the target metal in a form with a buyer, and a corresponding reduction in hazardous waste leaving the site.',
    constraints: [
      'Fits within the existing effluent plant footprint',
      'No change to the finishing chemistry upstream',
      'Discharge consent must still be met at all times',
      'Recovered material must meet a purity a buyer will accept',
    ],
    environment: [
      { term: 'Process', value: 'Metal finishing rinse' },
      { term: 'Stream', value: 'Dilute aqueous, mixed species' },
      { term: 'Duty', value: 'Continuous during production' },
      { term: 'Constraint', value: 'Existing effluent plant footprint' },
    ],
    impact: ['Waste', 'Regulatory issue', 'High cost'],
    outcomes: ['recovery', 'waste', 'water'],
    minimumTrl: 4,
    status: 'Under technical evaluation',
  },
]

/**
 * Example pairings.
 *
 * Each one carries what a real qualified match carries: the reasoning, and the
 * questions still open. A match presented without its open questions is a
 * sales claim, and the platform's whole position is that the engine shortlists
 * and a person qualifies.
 */
export const exampleMatches: PublicMatch[] = [
  {
    problemSlug: 'example-reheating-furnace-heat-loss',
    technologySlug: 'example-low-grade-heat-recovery',
    rationale:
      'The problem is stated as heat loss, but the recoverable quantity sits in the low-grade band where conventional equipment does not pay back — which is the band this technology is aimed at. It does not reduce the loss; it changes what the loss is worth.',
    openQuestions: [
      'Whether the shell loss is collectable at all, or too diffuse to gather',
      'Whether a recovery unit can be installed without extending the shutdown',
      'What the site would do with recovered heat at that grade',
    ],
    stage: 'Qualified',
  },
  {
    problemSlug: 'example-pump-wear-in-abrasive-slurry',
    technologySlug: 'example-low-temperature-hardening',
    rationale:
      'The pump wet end cannot be furnace-treated once assembled, and the constraint is explicitly a retrofit to existing geometry. A hardening route that runs below 200 °C is one of the few that can treat a finished component without distorting it.',
    openQuestions: [
      'Whether the treated depth survives abrasion rather than only adhesive wear',
      'Whether the site workshop can re-treat after repair, as the constraint requires',
      'Effect on hydraulic efficiency, which the problem says may not drop',
    ],
    stage: 'In technical discussion',
  },
  {
    problemSlug: 'example-metal-bearing-rinse-water',
    technologySlug: 'example-selective-metal-recovery',
    rationale:
      'A direct read: the problem is that precipitation takes everything together, and selectivity is precisely what would separate the valuable species from the rest. The constraint on footprint is the open risk rather than the chemistry.',
    openQuestions: [
      'Whether selectivity holds in this specific matrix',
      'Whether a column fits the existing effluent plant footprint',
      'Whether recovered purity reaches a grade a buyer will take',
    ],
    stage: 'Pilot proposed',
  },
]
