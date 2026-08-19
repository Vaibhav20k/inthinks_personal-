import type { IndustrialProblem, PublicMatch, Technology } from './models'

/**
 * ILLUSTRATIVE EXAMPLES — not the portfolio.
 *
 * Every record here carries `demo: true`. That flag, not the reference number,
 * is what makes a record show as illustrative — so the IDs read like the real
 * ones the platform issues, and a record graduates from demo to live by losing
 * a flag rather than by being renamed and breaking its own URL.
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


const tech = (t: Omit<Technology, 'demo'>): Technology => ({ ...t, demo: true })

export const exampleTechnologies: Technology[] = [
  tech({
    id: 'INT / MAT / 001',
    slug: 'low-temperature-surface-hardening',
    name: 'Low-Temperature Surface Hardening',
    domain: 'Advanced Materials',
    domainCode: 'MAT',
    thesis: 'A hard, wear-resistant surface produced below 200 °C, on components that cannot survive a furnace.',
    problem:
      'Conventional case hardening runs above 800 °C. Assembled parts, heat-treated alloys and anything carrying a polymer seal cannot go through it, so those components are replaced on wear rather than treated.',
    principle:
      'A plasma-assisted route drives the hardening species into the surface at low temperature, so the bulk material never reaches a temperature that would change its properties or distort the part.',
    whyItMatters:
      'A component that is currently scrapped on wear could instead be treated in place. That turns a capital replacement into a maintenance operation, which is a different line in a different budget.',
    validation: 'Illustrative. A real profile states only what evidence supports, and names the environment it came from.',
    applications: ['Tooling', 'Pump and valve internals', 'Hydraulic components'],
    sectors: ['Manufacturing', 'Automotive'],
    potentialIndustries: ['Automotive', 'Manufacturing', 'Tooling'],
    outcomes: ['life', 'durability', 'opex'],
    entryTrl: 3, currentTrl: 5, targetTrl: 8,
    stage: 'Prototype Optimisation', ipStatus: 'To Be Confirmed', transferStatus: 'Under Development',
    nextMilestones: ['Extended-duration wear testing', 'Manufacturability at production volume'],
  }),
  tech({
    id: 'INT / ENR / 002',
    slug: 'low-grade-heat-recovery',
    name: 'Low-Grade Heat Recovery System',
    domain: 'Energy',
    domainCode: 'ENR',
    thesis: 'Recovery aimed at heat streams below 120 °C, which are too low-grade to justify conventional equipment.',
    problem:
      'Most industrial waste heat leaves as warm water or flue gas well under 150 °C. Conventional recovery needs a bigger temperature difference to pay back, so this heat is vented — not because it is worthless, but because nothing economic collects it.',
    principle:
      'A working fluid selected for a low boiling point, in a cycle sized for the stream rather than the plant, so capital cost scales with what is actually recovered.',
    whyItMatters:
      'Low-grade heat is the largest single category of industrial energy loss. Anything that changes its economics changes a site energy balance without changing the process that produces it.',
    validation: 'Illustrative. Recovery depends entirely on the stream; a real profile would state which stream was measured.',
    applications: ['Process cooling water', 'Flue gas economisers', 'Compressor jackets'],
    sectors: ['Energy', 'Chemicals', 'Manufacturing'],
    potentialIndustries: ['Steel', 'Cement', 'Chemicals', 'Manufacturing'],
    outcomes: ['energy', 'efficiency', 'emissions'],
    entryTrl: 3, currentTrl: 5, targetTrl: 8,
    stage: 'Validation', ipStatus: 'To Be Confirmed', transferStatus: 'Under Development',
    nextMilestones: ['Demonstration on a plant stream rather than a rig', 'Payback against a measured stream'],
  }),
  tech({
    id: 'INT / CLN / 003',
    slug: 'selective-metal-recovery',
    name: 'Selective Metal Recovery from Process Water',
    domain: 'Clean Technology',
    domainCode: 'CLN',
    thesis: 'Pulling one valuable metal back out of a dilute mixed stream, rather than treating the whole stream as waste.',
    problem:
      'Rinse and process waters carry dissolved metals too dilute for conventional recovery and too concentrated to discharge. The usual answer precipitates everything together, producing a sludge that is a disposal cost rather than a product.',
    principle:
      'A selective sorbent that binds one target species in preference to the rest, so the metal comes off the column as something with a buyer instead of as part of a mixed cake.',
    whyItMatters:
      'It changes a stream from a treatment cost into a recovered material, and reduces what leaves the site as hazardous waste at the same time.',
    validation: 'Illustrative. Selectivity is chemistry-specific; a real profile would name the species and the matrix.',
    applications: ['Plating rinse water', 'Mine drainage', 'Catalyst regeneration'],
    sectors: ['Chemicals', 'Mining', 'Manufacturing'],
    potentialIndustries: ['Mining', 'Metals', 'Electronics', 'Chemicals'],
    outcomes: ['recovery', 'waste', 'water'],
    entryTrl: 2, currentTrl: 4, targetTrl: 7,
    stage: 'Development', ipStatus: 'To Be Confirmed', transferStatus: 'Under Development',
    nextMilestones: ['Selectivity in a genuine mixed effluent', 'Column regeneration cycle life'],
  }),
  tech({
    id: 'INT / MAT / 004',
    slug: 'thermal-barrier-composite-coating',
    name: 'Thermal Barrier Composite Coating',
    domain: 'Advanced Materials',
    domainCode: 'MAT',
    thesis: 'A coating intended to cut radiant and conducted loss from hot industrial surfaces without relining them.',
    problem:
      'Furnace and kiln shells lose heat continuously across a very large surface. Improving it usually means refractory work, which means a shutdown — so the loss is tolerated between major outages rather than addressed.',
    principle:
      'A layered composite combining a low-conductivity matrix with a reflective component, applied to the outer surface so the intervention does not touch the process side.',
    whyItMatters:
      'If loss can be reduced from the outside, the work fits into a short outage instead of a relining campaign, which changes when it can be done at all.',
    validation: 'Illustrative. Any real figure would have to name the surface, the temperature and the duration measured.',
    applications: ['Furnace shells', 'Kiln exteriors', 'Steam and process lines'],
    sectors: ['Manufacturing', 'Energy', 'Construction'],
    potentialIndustries: ['Steel', 'Cement', 'Power', 'Petrochemical'],
    outcomes: ['thermal', 'energy', 'emissions', 'opex'],
    entryTrl: 3, currentTrl: 5, targetTrl: 8,
    stage: 'Validation', ipStatus: 'To Be Confirmed', transferStatus: 'Industry Evaluation',
    nextMilestones: ['Durability through a full campaign', 'Application method inside a short outage'],
  }),
  tech({
    id: 'INT / WTR / 005',
    slug: 'low-energy-water-treatment',
    name: 'Low-Energy Industrial Water Treatment',
    domain: 'Clean Technology',
    domainCode: 'CLN',
    thesis: 'Treating industrial water to the same standard with markedly less pumping and separation energy.',
    problem:
      'Treatment energy is dominated by pressure. Membrane and separation stages need it, so the energy bill scales with volume rather than with how dirty the water actually is.',
    principle:
      'A staged approach that removes the bulk load at low pressure first, so the energy-intensive stage handles a far smaller duty.',
    whyItMatters:
      'Water treatment is a fixed operating cost most plants have stopped questioning. Reducing its energy does not change the process it serves.',
    validation: 'Illustrative. Performance depends on the influent; a real profile would state the water it was tested on.',
    applications: ['Process water reuse', 'Effluent polishing', 'Cooling tower blowdown'],
    sectors: ['Chemicals', 'Manufacturing', 'Agriculture'],
    potentialIndustries: ['Textiles', 'Chemicals', 'Food Processing', 'Manufacturing'],
    outcomes: ['water', 'energy', 'opex'],
    entryTrl: 2, currentTrl: 4, targetTrl: 7,
    stage: 'Development', ipStatus: 'To Be Confirmed', transferStatus: 'Under Development',
    nextMilestones: ['Continuous operation on a real effluent', 'Energy measured against the incumbent stage'],
  }),
  tech({
    id: 'INT / CIR / 006',
    slug: 'polymer-waste-conversion',
    name: 'Industrial Polymer Waste Conversion',
    domain: 'Clean Technology',
    domainCode: 'CLN',
    thesis: 'Converting mixed polymer waste that cannot be mechanically recycled back into usable feedstock.',
    problem:
      'Mixed and contaminated polymer streams defeat mechanical recycling, because sorting to the required purity costs more than the output is worth. They are downcycled or discarded.',
    principle:
      'A chemical conversion route tolerant of mixed input, producing a feedstock specified by chemistry rather than by the purity of what went in.',
    whyItMatters:
      'It changes the economics of the streams nobody currently competes for, which is where the volume is.',
    validation: 'Illustrative. Yield and quality depend on feedstock; a real profile would state the mix tested.',
    applications: ['Mixed post-industrial polymer', 'Multi-layer packaging', 'End-of-life components'],
    sectors: ['Chemicals', 'Manufacturing', 'Consumer Products'],
    potentialIndustries: ['Plastics', 'Packaging', 'Automotive', 'Consumer Goods'],
    outcomes: ['waste', 'recovery', 'material'],
    entryTrl: 3, currentTrl: 5, targetTrl: 8,
    stage: 'Validation', ipStatus: 'To Be Confirmed', transferStatus: 'Pilot Opportunity',
    nextMilestones: ['Feedstock tolerance across real mixed waste', 'Economics at plant scale'],
  }),
  tech({
    id: 'INT / ENR / 007',
    slug: 'passive-industrial-cooling-material',
    name: 'Passive Industrial Cooling Material',
    domain: 'Built Environment',
    domainCode: 'BLT',
    thesis: 'A surface that rejects solar gain and radiates heat away, reducing cooling demand with no energy input.',
    problem:
      'Industrial roofs and enclosures absorb solar heat all day and pass it inside, so cooling plant runs hardest exactly when supply is most constrained.',
    principle:
      'A coating engineered to reflect across the solar band while emitting strongly in the atmospheric window, so the surface sheds heat to the sky rather than into the building.',
    whyItMatters:
      'It reduces a load rather than serving it more efficiently, and it has no moving parts to maintain.',
    validation: 'Illustrative. Performance is climate-dependent; a real profile would state where it was measured.',
    applications: ['Industrial roofing', 'Equipment enclosures', 'Storage tanks'],
    sectors: ['Construction', 'Infrastructure', 'Manufacturing'],
    potentialIndustries: ['Infrastructure', 'Manufacturing', 'Logistics'],
    outcomes: ['energy', 'thermal', 'opex'],
    entryTrl: 2, currentTrl: 4, targetTrl: 7,
    stage: 'Development', ipStatus: 'To Be Confirmed', transferStatus: 'Under Development',
    nextMilestones: ['Soiling and weathering over a full year', 'Performance on a real substrate'],
  }),
  tech({
    id: 'INT / CLN / 008',
    slug: 'carbon-mineralisation',
    name: 'Carbon Capture Mineralisation Process',
    domain: 'Clean Technology',
    domainCode: 'CLN',
    thesis: 'Reacting selected CO₂ streams with industrial residues to produce a stable mineral product.',
    problem:
      'Captured CO₂ needs somewhere to go. Storage requires geology and infrastructure that most industrial sites do not have, so capture stalls at the point of asking what happens next.',
    principle:
      'Carbonating alkaline industrial residues so the CO₂ ends up chemically bound in a solid that is stable and, in some cases, saleable.',
    whyItMatters:
      'It gives a site with a CO₂ stream and a residue stream a route that uses both, without depending on transport or geology.',
    validation: 'Illustrative. Rates and product quality depend on the residue; a real profile would name it.',
    applications: ['Process CO₂ streams', 'Alkaline industrial residues', 'Construction aggregate'],
    sectors: ['Chemicals', 'Construction', 'Manufacturing'],
    potentialIndustries: ['Cement', 'Steel', 'Chemicals', 'Construction'],
    outcomes: ['emissions', 'waste', 'recovery'],
    entryTrl: 3, currentTrl: 4, targetTrl: 7,
    stage: 'Development', ipStatus: 'To Be Confirmed', transferStatus: 'Under Development',
    nextMilestones: ['Reaction rate on a real residue', 'Product acceptance against a construction specification'],
  }),
  tech({
    id: 'INT / MAT / 009',
    slug: 'corrosion-resistant-surface-treatment',
    name: 'Corrosion-Resistant Surface Treatment',
    domain: 'Advanced Materials',
    domainCode: 'MAT',
    thesis: 'A surface treatment that holds up where the corrosion is chemical and hot, not just wet.',
    problem:
      'Equipment in hot process streams degrades from the surface inward. Bulk alloys that resist it are expensive and often cannot be formed into the part that is needed, so the usual answer is to accept the replacement interval.',
    principle:
      'A treated surface layer chemically bound to the substrate rather than deposited on it, so it resists spalling under the thermal cycling that defeats a conventional coating.',
    whyItMatters:
      'It separates the corrosion problem from the alloy choice. A component can be made from the material that suits the duty and treated for the environment, instead of being made from whatever survives it.',
    validation: 'Illustrative. Resistance is specific to the corrodent and the temperature; a real profile would name both.',
    applications: ['Heat exchanger internals', 'Flue and duct components', 'Process vessel surfaces'],
    sectors: ['Energy', 'Chemicals', 'Manufacturing'],
    potentialIndustries: ['Power', 'Chemicals', 'Process industry'],
    outcomes: ['life', 'durability', 'opex'],
    entryTrl: 3, currentTrl: 5, targetTrl: 8,
    stage: 'Validation', ipStatus: 'To Be Confirmed', transferStatus: 'Industry Evaluation',
    nextMilestones: ['Long-duration exposure at temperature', 'Behaviour at welds and edges'],
  }),
  tech({
    id: 'INT / MFG / 010',
    slug: 'low-energy-drying',
    name: 'Low-Energy Drying Technology',
    domain: 'Industrial Processes',
    domainCode: 'MFG',
    thesis: 'Removing water from a product without paying the full latent heat of evaporation for all of it.',
    problem:
      'Thermal drying is one of the largest energy loads in any plant that makes something wet and ships it dry. Most of the energy goes into a phase change, and conventional dryers recover very little of it.',
    principle:
      'Displacing part of the thermal duty with a non-evaporative separation stage, so the dryer only has to evaporate what is left rather than everything.',
    whyItMatters:
      'Drying energy is a line most plants have written off as fixed. A process that moves part of the load off the burner changes a fixed cost into a variable one.',
    validation: 'Illustrative. Savings depend heavily on the feed and the moisture target; a real profile would state both.',
    applications: ['Food and ingredient drying', 'Mineral concentrate drying', 'Sludge and residue drying'],
    sectors: ['Manufacturing', 'Agriculture', 'Chemicals'],
    potentialIndustries: ['Food processing', 'Minerals', 'Chemicals'],
    outcomes: ['energy', 'opex', 'emissions'],
    entryTrl: 2, currentTrl: 4, targetTrl: 7,
    stage: 'Development', ipStatus: 'Under Evaluation', transferStatus: 'Under Development',
    nextMilestones: ['Energy balance on a real feed at throughput', 'Product quality against the existing dryer'],
  }),
]

const problem = (p: Omit<IndustrialProblem, 'demo'>): IndustrialProblem => ({ ...p, demo: true })

export const exampleProblems: IndustrialProblem[] = [
  problem({
    id: 'CH / STL / 001',
    slug: 'furnace-heat-loss',
    title: 'Excessive heat loss from reheating furnaces',
    sector: 'Manufacturing',
    priorityArea: 'Energy',
    target: '10–15% reduction in loss',
    summary: 'A significant share of furnace energy leaves through refractory surfaces and the shell.',
    problem:
      'The furnace runs continuously above 1,100 °C. Shell temperatures indicate steady radiant loss across a large area. Refractory degrades under thermal cycling, and replacing it needs a shutdown the production schedule cannot absorb more than once a year.',
    currentApproach:
      'Conventional refractory lining and insulation, re-lined periodically. It works, but performance decays through the campaign and the shutdown cost dominates when it is done.',
    targetOutcome:
      'A measurable reduction in shell heat loss that holds across a full campaign, installable within an existing shutdown, with no change to the furnace control philosophy.',
    constraints: [
      'Survives continuous operation above 1,100 °C',
      'Retrofit preferred — no major furnace redesign',
      'Installable within the annual shutdown window',
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
    status: 'Technology search',
  }),
  problem({
    id: 'CH / CEM / 002',
    slug: 'low-grade-waste-heat',
    title: 'Waste heat below economical recovery temperature',
    sector: 'Manufacturing',
    priorityArea: 'Energy',
    target: 'Useful recovery below 120 °C',
    summary: 'Large volumes of low-grade waste heat go unused because conventional recovery does not pay back.',
    problem:
      'Exhaust and cooling streams leave the process well below the temperature at which standard recovery equipment is economic. The heat is real and continuous; the equipment to collect it costs more than the energy is worth at that grade.',
    currentApproach: 'The streams are vented or cooled. Recovery has been assessed and rejected on payback, not on feasibility.',
    targetOutcome: 'Recovery of useful energy from streams below the threshold where conventional equipment stops paying back.',
    constraints: [
      'Must pay back without a subsidy assumption',
      'Fits alongside existing plant, not in place of it',
      'No reduction in process availability',
    ],
    environment: [
      { term: 'Process', value: 'Kiln exhaust and cooling circuits' },
      { term: 'Stream temperature', value: '80–120 °C' },
      { term: 'Duty', value: 'Continuous' },
      { term: 'Constraint', value: 'Existing plant layout' },
    ],
    impact: ['Energy consumption', 'Emissions', 'High cost'],
    outcomes: ['energy', 'efficiency', 'emissions'],
    minimumTrl: 4,
    status: 'Technology search',
  }),
  problem({
    id: 'CH / MFG / 003',
    slug: 'premature-tool-wear',
    title: 'Premature surface wear of industrial components',
    sector: 'Manufacturing',
    priorityArea: 'Materials',
    target: '2× service life',
    summary: 'High-wear components need frequent replacement, and the downtime costs more than the parts.',
    problem:
      'Tooling and wear surfaces lose material steadily in service. Replacement is scheduled around failure rather than around production, so the real cost is unplanned downtime. Harder replacement alloys shift the problem rather than removing it.',
    currentApproach: 'Conventional hardening and coating, with harder grades where the budget allows. Wear rate improves; the failure mode does not change.',
    targetOutcome: 'Component life long enough to align change-outs with the planned maintenance interval, so the intervention becomes scheduled rather than reactive.',
    constraints: [
      'Retrofit to existing component geometry',
      'Lower processing energy than conventional hardening',
      'Repairable in the site workshop',
      'No dimensional distortion of finished parts',
    ],
    environment: [
      { term: 'Process', value: 'Forming and machining' },
      { term: 'Loading', value: 'Cyclic, abrasive contact' },
      { term: 'Duty', value: 'Continuous shift operation' },
      { term: 'Constraint', value: 'Finished component geometry' },
    ],
    impact: ['Downtime', 'Maintenance', 'High cost'],
    outcomes: ['life', 'durability', 'opex'],
    minimumTrl: 5,
    status: 'Candidate technologies identified',
  }),
  problem({
    id: 'CH / MIN / 004',
    slug: 'metal-loss-in-process-water',
    title: 'Metal loss in industrial process water',
    sector: 'Mining',
    priorityArea: 'Water',
    target: 'Recover the target metal, meet consent',
    summary: 'Valuable metals stay dissolved in process water and are currently treated as waste.',
    problem:
      'Process and rinse water leaves with dissolved metal too dilute to recover conventionally and too concentrated to discharge. Treatment precipitates everything together, so a valuable material is paid for twice — once as feedstock, once as disposal.',
    currentApproach: 'Chemical precipitation and filter pressing, with the cake sent offsite as hazardous waste. Compliant, and the metal is unrecoverable once it is in the cake.',
    targetOutcome: 'Recovery of the target metal in a saleable form, with a corresponding reduction in hazardous waste leaving the site.',
    constraints: [
      'Fits within the existing effluent plant footprint',
      'No change to upstream process chemistry',
      'Discharge consent met at all times',
      'Recovered material must meet a purity a buyer will accept',
    ],
    environment: [
      { term: 'Process', value: 'Process and rinse water' },
      { term: 'Stream', value: 'Dilute aqueous, mixed species' },
      { term: 'Duty', value: 'Continuous during production' },
      { term: 'Constraint', value: 'Existing effluent plant footprint' },
    ],
    impact: ['Waste', 'Regulatory issue', 'High cost'],
    outcomes: ['recovery', 'waste', 'water'],
    minimumTrl: 4,
    status: 'Match identified',
  }),
  problem({
    id: 'CH / CHE / 005',
    slug: 'water-treatment-energy',
    title: 'High energy requirement for water treatment',
    sector: 'Chemicals',
    priorityArea: 'Water',
    target: '−25% treatment power',
    summary: 'Pumping and separation dominate the energy cost of treating process water.',
    problem:
      'Treatment energy scales with volume rather than with contamination, because the pressure-driven stages run at full duty regardless of load. The plant meets its standards; it does so expensively.',
    currentApproach: 'Conventional pressure-driven separation, run continuously. Reliable and energy-intensive.',
    targetOutcome: 'A reduction in treatment energy with no loss of water quality and no change to discharge compliance.',
    constraints: [
      'Water quality standards unchanged',
      'Retrofit into the existing treatment train',
      'No increase in chemical consumption',
    ],
    environment: [
      { term: 'Process', value: 'Process water treatment' },
      { term: 'Stage', value: 'Pressure-driven separation' },
      { term: 'Duty', value: 'Continuous' },
      { term: 'Constraint', value: 'Existing treatment train' },
    ],
    impact: ['Energy consumption', 'High cost'],
    outcomes: ['water', 'energy', 'opex'],
    minimumTrl: 4,
    status: 'Technology search',
  }),
  problem({
    id: 'CH / AUT / 006',
    slug: 'battery-enclosure-thermal-management',
    title: 'Thermal management of battery enclosures',
    sector: 'Automotive',
    priorityArea: 'Thermal',
    target: 'Even temperature under load',
    summary: 'Battery systems develop uneven heat distribution under demanding duty cycles.',
    problem:
      'Under sustained load, temperature varies across the pack. The hottest cells set the limit for the whole system, so capacity and life are governed by the worst-placed cell rather than the average.',
    currentApproach: 'Active cooling sized for the worst case, which adds mass, parasitic load and another thing that can fail.',
    targetOutcome: 'More even temperature across the pack using lightweight passive means, reducing dependence on active cooling.',
    constraints: [
      'Minimal added mass',
      'No electrically conductive path between cells',
      'Survives vibration and thermal cycling',
      'Compatible with existing pack architecture',
    ],
    environment: [
      { term: 'System', value: 'Battery enclosure' },
      { term: 'Duty', value: 'High-rate cycling' },
      { term: 'Constraint', value: 'Mass and packaging volume' },
      { term: 'Environment', value: 'Vibration, wide ambient range' },
    ],
    impact: ['Product failure', 'Safety', 'Throughput'],
    outcomes: ['thermal', 'life', 'efficiency'],
    minimumTrl: 4,
    status: 'Open challenge',
  }),
  problem({
    id: 'CH / PLN / 007',
    slug: 'mixed-polymer-waste',
    title: 'Difficult-to-recycle mixed polymer waste',
    sector: 'Manufacturing',
    priorityArea: 'Circularity',
    target: 'Convert to usable feedstock',
    summary: 'Mixed polymer streams have little recycling value and are downcycled or discarded.',
    problem:
      'The waste is mixed by construction rather than by accident — multi-layer and composite parts cannot be separated economically. Sorting to the purity mechanical recycling needs costs more than the output is worth.',
    currentApproach: 'Downcycling into low-value applications where possible, disposal where not.',
    targetOutcome: 'Conversion of the mixed stream into a feedstock with a specification and a buyer.',
    constraints: [
      'Tolerates mixed and contaminated input',
      'No pre-sorting beyond what already happens',
      'Output must meet a usable specification',
    ],
    environment: [
      { term: 'Stream', value: 'Mixed post-industrial polymer' },
      { term: 'Composition', value: 'Multi-layer, variable' },
      { term: 'Duty', value: 'Batch, continuous arisings' },
      { term: 'Constraint', value: 'No economic pre-sorting' },
    ],
    impact: ['Waste', 'High cost', 'Regulatory issue'],
    outcomes: ['waste', 'recovery', 'material'],
    minimumTrl: 4,
    status: 'Match identified',
  }),
  problem({
    id: 'CH / INF / 008',
    slug: 'industrial-cooling-demand',
    title: 'Cooling demand in industrial structures',
    sector: 'Infrastructure',
    priorityArea: 'Energy',
    target: 'Lower peak cooling load',
    summary: 'Roofs and enclosures absorb solar heat, raising cooling demand at exactly the wrong time of day.',
    problem:
      'Large roof and wall areas take on solar gain through the day and pass it inside. Cooling plant peaks when ambient temperature and tariff both peak, so the cost of the load is worse than its size suggests.',
    currentApproach: 'Additional cooling capacity, and insulation where it can be retrofitted. Both serve the load rather than reducing it.',
    targetOutcome: 'A reduction in surface temperature and in the peak cooling load, without adding plant to maintain.',
    constraints: [
      'Retrofit to existing roofs and enclosures',
      'Durable outdoors without frequent reapplication',
      'No structural loading increase',
    ],
    environment: [
      { term: 'Structure', value: 'Industrial roofing and enclosures' },
      { term: 'Exposure', value: 'Full solar, outdoor' },
      { term: 'Duty', value: 'Year-round, peak in summer' },
      { term: 'Constraint', value: 'Existing structure' },
    ],
    impact: ['Energy consumption', 'High cost'],
    outcomes: ['energy', 'thermal', 'opex'],
    minimumTrl: 4,
    status: 'Candidate technologies identified',
  }),
  problem({
    id: 'CH / PWR / 009',
    slug: 'high-temperature-corrosion',
    title: 'Corrosion of high-temperature process equipment',
    sector: 'Energy',
    priorityArea: 'Asset life',
    target: '2\u00d7 service life, no redesign',
    summary: 'Components in hot, chemically aggressive streams degrade well before the plant they sit in.',
    problem:
      'Surfaces exposed to hot process gas thin and pit faster than the maintenance interval assumes. Replacement is planned around the failure rather than the duty, and an unplanned one takes the unit with it.',
    currentApproach:
      'Higher-grade alloys where the geometry allows, and scheduled replacement where it does not. Both are priced in rather than solved.',
    targetOutcome:
      'A meaningful extension of component life in the same environment, achieved without changing the equipment design or the process.',
    constraints: [
      'Survives continuous high-temperature exposure',
      'Applicable to existing component geometry',
      'No change to process chemistry',
      'Must not shed material into the stream',
    ],
    environment: [
      { term: 'Process', value: 'Hot process gas' },
      { term: 'Operating temperature', value: 'Sustained high temperature' },
      { term: 'Environment', value: 'Chemically aggressive' },
      { term: 'Access', value: 'Planned outage only' },
    ],
    impact: ['High cost', 'Downtime'],
    outcomes: ['life', 'durability', 'opex'],
    minimumTrl: 4,
    status: 'Technology search',
  }),
  problem({
    id: 'CH / FNB / 010',
    slug: 'drying-energy-consumption',
    title: 'High energy consumption in drying operations',
    sector: 'Manufacturing',
    priorityArea: 'Energy',
    target: '\u2265 20% reduction in drying energy',
    summary: 'Thermal drying dominates site energy, and the load has been treated as fixed.',
    problem:
      'Product arrives wet and has to leave dry, and the dryer pays the full latent heat for every kilogram of water. It is the largest single energy line on the site and has not moved in years.',
    currentApproach:
      'Heat recovery on the exhaust and tighter control of the setpoint. Both trim the load; neither changes what the dryer is being asked to do.',
    targetOutcome:
      'A material reduction in energy per kilogram of water removed, with no change to product quality or to throughput.',
    constraints: [
      'No reduction in throughput',
      'Product quality specification unchanged',
      'Retrofit within existing plant footprint',
      'Food-contact compatible where applicable',
    ],
    environment: [
      { term: 'Process', value: 'Continuous thermal drying' },
      { term: 'Duty', value: 'Continuous, production-linked' },
      { term: 'Constraint', value: 'Fixed throughput and quality spec' },
      { term: 'Access', value: 'Scheduled maintenance window' },
    ],
    impact: ['Energy consumption', 'High cost', 'Emissions'],
    outcomes: ['energy', 'opex', 'emissions'],
    minimumTrl: 4,
    status: 'Candidate technologies identified',
  }),
]

const match = (m: Omit<PublicMatch, 'demo'>): PublicMatch => ({ ...m, demo: true })

/**
 * Example pairings.
 *
 * Each carries what a real qualified match carries: the reasoning, the fit
 * dimension by dimension, the single next step, and what is still open. Fit is
 * words rather than a number on purpose — a percentage implies a measurement
 * nobody took, and averaging a strong mechanism fit against a moderate TRL fit
 * produces a figure that describes neither. `Moderate` on TRL is the useful
 * part of the answer.
 *
 * None is `AI candidate`: raw engine output is a shortlist, and publishing one
 * unreviewed would be the platform asserting something no person has checked.
 */
export const exampleMatches: PublicMatch[] = [
  match({
    id: 'MATCH / 001',
    problemSlug: 'furnace-heat-loss',
    technologySlug: 'thermal-barrier-composite-coating',
    matchClass: 'Strong candidate',
    status: 'Technical review',
    rationale:
      'The problem is loss through the shell, and the constraint is that the fix must not mean relining. A barrier applied to the outer surface addresses the loss without touching the process side, which is what makes it fit the shutdown window rather than the campaign.',
    fit: [
      { dimension: 'Mechanism', rating: 'Strong' },
      { dimension: 'Application', rating: 'Strong' },
      { dimension: 'TRL', rating: 'Moderate' },
      { dimension: 'Implementation', rating: 'Promising' },
    ],
    developmentRequired: 'Medium',
    nextStep: 'Application-specific durability and high-temperature validation.',
    openQuestions: [
      'Whether adhesion survives thermal cycling across a full campaign',
      'Whether it can be applied inside the existing shutdown window',
      'Measured loss reduction on a shell of this size, not a coupon',
    ],
  }),
  match({
    id: 'MATCH / 002',
    problemSlug: 'low-grade-waste-heat',
    technologySlug: 'low-grade-heat-recovery',
    matchClass: 'Strong candidate',
    status: 'Qualified match',
    rationale:
      'A direct read. The problem is defined by streams sitting below the temperature at which conventional recovery pays back, and that band is exactly what this technology is aimed at. The open risk is economic, not technical.',
    fit: [
      { dimension: 'Mechanism', rating: 'Strong' },
      { dimension: 'Application', rating: 'Strong' },
      { dimension: 'TRL', rating: 'Promising' },
      { dimension: 'Implementation', rating: 'Moderate' },
    ],
    developmentRequired: 'Medium',
    nextStep: 'Define the temperature range and the economic recovery threshold.',
    openQuestions: [
      'The actual temperature and flow of the streams available',
      'What the site would do with recovered heat at that grade',
      'Whether payback holds without a subsidy assumption',
    ],
  }),
  match({
    id: 'MATCH / 003',
    problemSlug: 'premature-tool-wear',
    technologySlug: 'low-temperature-surface-hardening',
    matchClass: 'Promising match',
    status: 'Technical review',
    rationale:
      'The constraint is a retrofit to finished geometry, which rules out furnace hardening — components would distort. A route running below 200 °C is one of very few that can treat a finished part, and it also answers the processing-energy half of the ask.',
    fit: [
      { dimension: 'Mechanism', rating: 'Promising' },
      { dimension: 'Application', rating: 'Strong' },
      { dimension: 'TRL', rating: 'Moderate' },
      { dimension: 'Implementation', rating: 'Promising' },
    ],
    developmentRequired: 'Medium',
    nextStep: 'Material-specific wear testing against the incumbent treatment.',
    openQuestions: [
      'Whether treated depth survives abrasion rather than only adhesive wear',
      'Whether the site workshop can re-treat after repair',
      'Whether 2× service life is reachable or only an improvement',
    ],
  }),
  match({
    id: 'MATCH / 004',
    problemSlug: 'metal-loss-in-process-water',
    technologySlug: 'selective-metal-recovery',
    matchClass: 'Strong candidate',
    status: 'Industry evaluation',
    rationale:
      'The problem is precisely that precipitation takes everything together, and selectivity is what would separate the valuable species from the rest. Mechanism and objective line up almost exactly; the risk sits in the footprint constraint.',
    fit: [
      { dimension: 'Mechanism', rating: 'Strong' },
      { dimension: 'Application', rating: 'Strong' },
      { dimension: 'TRL', rating: 'Moderate' },
      { dimension: 'Implementation', rating: 'Moderate' },
    ],
    developmentRequired: 'Medium',
    nextStep: 'Test selectivity against the actual process-water chemistry.',
    openQuestions: [
      'Whether selectivity holds in this specific matrix',
      'Whether a column fits the existing effluent plant footprint',
      'Whether recovered purity reaches a grade a buyer will take',
    ],
  }),
  match({
    id: 'MATCH / 005',
    problemSlug: 'mixed-polymer-waste',
    technologySlug: 'polymer-waste-conversion',
    matchClass: 'Promising match',
    status: 'R&D required',
    rationale:
      'Both sides are defined by the same constraint: no economic pre-sorting. A conversion route specified by output chemistry rather than by input purity is the shape of answer the problem is asking for.',
    fit: [
      { dimension: 'Mechanism', rating: 'Promising' },
      { dimension: 'Application', rating: 'Strong' },
      { dimension: 'TRL', rating: 'Moderate' },
      { dimension: 'Implementation', rating: 'Limited' },
    ],
    developmentRequired: 'High',
    nextStep: 'Analyse feedstock compatibility and the economics at arising volume.',
    openQuestions: [
      'Yield across the real mix rather than a prepared sample',
      'Whether the output meets a specification a buyer will take',
      'Whether the economics work at the volume this site arises',
    ],
  }),
  match({
    id: 'MATCH / 006',
    problemSlug: 'industrial-cooling-demand',
    technologySlug: 'passive-industrial-cooling-material',
    matchClass: 'Candidate match',
    status: 'Technical review',
    rationale:
      'The problem is solar gain into large surfaces and the requirement is to reduce the load rather than serve it. A passive radiative surface does exactly that, with nothing added that needs maintaining.',
    fit: [
      { dimension: 'Mechanism', rating: 'Strong' },
      { dimension: 'Application', rating: 'Promising' },
      { dimension: 'TRL', rating: 'Limited' },
      { dimension: 'Implementation', rating: 'Promising' },
    ],
    developmentRequired: 'High',
    nextStep: 'Validate cooling performance under the target climate and substrate.',
    openQuestions: [
      'Performance in this climate rather than a reference one',
      'Soiling and weathering over a full year',
      'Adhesion to the existing roof substrate',
    ],
  }),
  match({
    id: 'MATCH / 007',
    problemSlug: 'high-temperature-corrosion',
    technologySlug: 'corrosion-resistant-surface-treatment',
    matchClass: 'Promising match',
    status: 'Technical review',
    rationale:
      'Both sides are about a surface failing in a hot, aggressive stream rather than a component being the wrong shape. A treatment bound to the substrate is the right class of answer here, because a deposited coating is what thermal cycling usually takes off first.',
    fit: [
      { dimension: 'Mechanism', rating: 'Strong' },
      { dimension: 'Application', rating: 'Promising' },
      { dimension: 'TRL', rating: 'Promising' },
      { dimension: 'Implementation', rating: 'Moderate' },
    ],
    developmentRequired: 'Medium',
    nextStep: 'Long-duration exposure testing against the real corrodent and temperature.',
    openQuestions: [
      'Which corrodent actually drives the loss, and at what temperature',
      'Behaviour at welds and edges, where these treatments usually fail first',
      'Whether existing components can be treated in place or must come out',
    ],
  }),
  match({
    id: 'MATCH / 008',
    problemSlug: 'drying-energy-consumption',
    technologySlug: 'low-energy-drying',
    matchClass: 'Strong candidate',
    status: 'Industry evaluation',
    rationale:
      'The problem is that a dryer pays latent heat for all of the water, and the technology exists to make it pay for less of it. That is a direct read on mechanism; what is unresolved is whether it holds on this feed at this throughput.',
    fit: [
      { dimension: 'Mechanism', rating: 'Strong' },
      { dimension: 'Application', rating: 'Strong' },
      { dimension: 'TRL', rating: 'Moderate' },
      { dimension: 'Implementation', rating: 'Promising' },
    ],
    developmentRequired: 'High',
    nextStep: 'Pilot against real throughput and the actual moisture target.',
    openQuestions: [
      'Energy per kilogram of water removed on this feed, not a reference one',
      'Whether product quality holds against the existing dryer',
      'Whether it retrofits inside the current footprint',
    ],
  }),
]

/**
 * A match's URL, derived from its reference rather than stored beside it.
 *
 * `MATCH / 001` becomes `match-001`. One definition, because a slug that is
 * computed in the link and parsed in the route will disagree the first time
 * either is edited, and the failure is a 404 on a record that exists.
 */
export const matchSlug = (m: PublicMatch) =>
  m.id.toLowerCase().replace(/\s*\/\s*/g, '-')

export const findExampleMatch = (slug: string) =>
  exampleMatches.find((m) => matchSlug(m) === slug)

/** How many published matches involve a given record. Derived, never stored. */
export const matchesForTechnology = (slug: string) =>
  exampleMatches.filter((m) => m.technologySlug === slug)
export const matchesForProblem = (slug: string) =>
  exampleMatches.filter((m) => m.problemSlug === slug)
