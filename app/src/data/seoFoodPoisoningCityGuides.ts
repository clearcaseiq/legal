import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, foodborne-illness (food poisoning) practice area: location-specific
 * guides for Los Angeles, San Francisco, San Diego, and Fresno.
 *
 * A serious food-poisoning claim is a distinct product-and-premises problem: the
 * hard part is proving the source and linking the illness to a specific food or
 * establishment, which depends on medical testing and public-health outbreak
 * records more than on eyewitness accounts.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: one of the densest restaurant scenes in the country, with a
 *    large county public-health department that investigates outbreaks.
 *  - San Francisco: a national dining destination with high restaurant density
 *    and an active public-health apparatus.
 *  - San Diego: heavy tourism, cruise-ship dining, and border-region produce.
 *  - Fresno: the heart of California agriculture, where produce is grown,
 *    processed, and packed at the source, raising grower and processor liability.
 *
 * Applied accurately:
 *  - Contaminated or adulterated food is treated as a defective product, so a
 *    strict product-liability claim can lie against a restaurant, grocer,
 *    distributor, processor, or grower, alongside claims for negligence and
 *    breach of the implied warranty of merchantability (California Commercial
 *    Code).
 *  - The central challenge is causation: linking the illness to a specific food.
 *    Medical testing (stool cultures and pathogen typing) and public-health
 *    investigation records that connect a cluster of cases (including national
 *    databases used to fingerprint outbreaks) are the strongest evidence.
 *  - Preserving the suspect food, receipts, and reporting the illness to the
 *    local health department can be decisive.
 *  - Pure comparative negligence, the two-year deadline (Code of Civil Procedure
 *    section 335.1), and the six-month Government Claims Act deadline where a
 *    public entity (for example, a school or government cafeteria) is involved.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether the source can be proven, which party in the food chain is responsible, and which deadline controls depend on facts a licensed California attorney should review promptly.'

const PRODUCT =
  'Contaminated or adulterated food is treated in California as a defective product, so a strict product-liability claim can lie against a restaurant, grocer, distributor, processor, or grower \u2014 alongside claims for negligence and for breach of the implied warranty of merchantability under the California Commercial Code. That means a claimant need not always prove someone was careless, only that the food was unsafe and caused the illness.'

const CAUSATION =
  'The central challenge in a food-poisoning case is causation \u2014 linking the illness to a specific food or establishment rather than to something the person ate earlier. Medical testing (a stool culture identifying the pathogen and its type) and public-health investigation records that connect a cluster of cases are the strongest evidence, because they tie an individual illness to a documented source rather than a guess.'

const OUTBREAK =
  'Public-health departments investigate outbreaks and, when several people fall ill from the same source, can link the cases using laboratory pathogen fingerprinting shared through national databases. That outbreak evidence can transform a hard-to-prove single illness into part of a documented cluster, which is why reporting the illness to the local health department promptly matters.'

const PRESERVE =
  'Some of the most useful evidence is easy to lose: any leftover suspect food (kept refrigerated or frozen), the receipt or order record proving where and when the food was bought, the packaging and lot number for a retail product, and a timeline of what was eaten and when symptoms began. Preserving these early, before the food is discarded, can be decisive.'

export const LA_FOOD_SLUG = '/los-angeles-food-poisoning'
export const SF_FOOD_SLUG = '/san-francisco-food-poisoning'
export const SD_FOOD_SLUG = '/san-diego-food-poisoning'
export const FRESNO_FOOD_SLUG = '/fresno-food-poisoning'

export const foodPoisoningCityGuidePages: LandingPage[] = [
  {
    slug: LA_FOOD_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Food Poisoning Claims',
    title: 'Los Angeles Food Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Seriously sick from a restaurant or grocery in Los Angeles? Contaminated food is a defective product \u2014 but the case turns on proving the source through testing and public-health records.',
    psychology: 'I got seriously ill from food in LA and I do not know how to prove where it came from.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles food poisoning lawyer',
      'sick after eating at a restaurant who is liable california',
      'how to prove food poisoning source california',
      'salmonella e coli restaurant claim california',
      'report food poisoning los angeles health department',
    ],
    signals: [
      'Contaminated food = product',
      'Implied warranty (Commercial Code)',
      'Causation via testing',
      'Public-health outbreak records',
      'Preserve food & receipts',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles has one of the densest restaurant scenes in the country and a large county public-health department that actively investigates outbreaks \u2014 which both raises the chance of exposure and creates the records a claim depends on. ${PRODUCT} ${CAUSATION} ${OUTBREAK} ${PRESERVE} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity (such as a school cafeteria) is involved. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Where and when the suspect food was eaten or bought',
        'Any leftover food, kept refrigerated or frozen',
        'The receipt, order record, or packaging and lot number',
        'Whether a stool test identified the pathogen and its type',
        'Whether you reported the illness to the county health department',
        'Whether others who ate the same food also fell ill',
        'A timeline of what was eaten and when symptoms began',
        'Medical treatment from first symptoms onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds an LA food-poisoning claim around the causation evidence that decides it \u2014 pathogen testing and county public-health outbreak records \u2014 identifies the responsible party in the food chain, and prompts to preserve the suspect food and receipts before they are lost. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I got sick after eating out. Can I bring a claim?',
        a: 'Possibly. Contaminated or adulterated food is treated as a defective product, so a strict product-liability claim can lie against the restaurant, grocer, distributor, or processor, alongside negligence and breach of the implied warranty of merchantability. The hard part is proving the food caused the illness.',
      },
      {
        q: 'How do I prove which food made me sick?',
        a: 'Causation is the central challenge. Medical testing \u2014 a stool culture identifying the pathogen and its type \u2014 and public-health investigation records that connect a cluster of cases are the strongest evidence, because they tie your illness to a documented source rather than a guess.',
      },
      {
        q: 'Should I report the illness to the health department?',
        a: 'Yes, promptly. Los Angeles County investigates outbreaks and can link cases using laboratory pathogen fingerprinting. If several people fell ill from the same source, that outbreak evidence can transform a hard-to-prove single illness into part of a documented cluster.',
      },
      {
        q: 'What should I keep as evidence?',
        a: 'Any leftover suspect food, kept refrigerated or frozen; the receipt or order record; the packaging and lot number for a retail product; and a timeline of what you ate and when symptoms began. Preserving these before the food is discarded can be decisive.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the causation evidence, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_FOOD_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Food Poisoning Claims',
    title: 'San Francisco Food Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Seriously sick from a restaurant in San Francisco? Contaminated food is a defective product \u2014 and in a dense dining city, public-health outbreak records often make the case.',
    psychology: 'I got seriously ill from food in San Francisco and I do not know how to prove where it came from.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco food poisoning lawyer',
      'sick after eating at a restaurant who is liable california',
      'how to prove food poisoning source california',
      'norovirus restaurant outbreak claim california',
      'report food poisoning san francisco health department',
    ],
    signals: [
      'Contaminated food = product',
      'Dense dining-destination exposure',
      'Causation via testing',
      'Public-health outbreak records',
      'Preserve food & receipts',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Francisco is a national dining destination with high restaurant density and an active public-health apparatus, so outbreaks are both a real risk and, when they occur, well documented \u2014 which is exactly the evidence a claim needs. ${PRODUCT} ${CAUSATION} ${OUTBREAK} In a compact, high-volume dining city, a single contaminated kitchen can sicken many patrons, making the cluster evidence especially powerful. ${PRESERVE} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Where and when the suspect food was eaten or bought',
        'Any leftover food, kept refrigerated or frozen',
        'The receipt, order record, or packaging and lot number',
        'Whether a stool test identified the pathogen and its type',
        'Whether you reported the illness to the health department',
        'Whether others who ate the same food also fell ill',
        'A timeline of what was eaten and when symptoms began',
        'Medical treatment from first symptoms onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a San Francisco food-poisoning claim around pathogen testing and public-health outbreak records, connects an individual illness to any documented cluster from the same kitchen, and prompts to preserve the suspect food and receipts. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I got sick after eating out in San Francisco. Can I bring a claim?',
        a: 'Possibly. Contaminated or adulterated food is treated as a defective product, so a strict product-liability claim can lie against the restaurant, grocer, or distributor, alongside negligence and breach of the implied warranty of merchantability. Proving the food caused the illness is the key.',
      },
      {
        q: 'How do I prove which restaurant made me sick?',
        a: 'Medical testing \u2014 a stool culture identifying the pathogen and its type \u2014 and public-health investigation records that connect a cluster of cases are the strongest evidence. In a dense dining city, a single contaminated kitchen can sicken many patrons, making that cluster evidence powerful.',
      },
      {
        q: 'Should I report the illness to the health department?',
        a: 'Yes, promptly. San Francisco investigates outbreaks and can link cases using laboratory pathogen fingerprinting. Reporting quickly helps tie your illness to a documented source if others were affected.',
      },
      {
        q: 'What should I keep as evidence?',
        a: 'Any leftover suspect food, kept refrigerated or frozen; the receipt or order record; and a timeline of what you ate and when symptoms began. Preserving these before the food is discarded can be decisive.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the causation evidence, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_FOOD_SLUG,
    category: 'Cities',
    cluster: 'San Diego Food Poisoning Claims',
    title: 'San Diego Food Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Seriously sick from a restaurant, resort, or cruise in San Diego? Contaminated food is a defective product \u2014 and tourism and cruise dining add their own evidence questions.',
    psychology: 'I got seriously ill from food in San Diego and I do not know how to prove where it came from.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego food poisoning lawyer',
      'sick after eating at a restaurant who is liable california',
      'cruise ship food poisoning claim',
      'how to prove food poisoning source california',
      'resort food poisoning outbreak claim california',
    ],
    signals: [
      'Contaminated food = product',
      'Tourism / resort / cruise dining',
      'Causation via testing',
      'Public-health outbreak records',
      'Preserve food & receipts',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s heavy tourism, resort and cruise dining, and border-region produce broaden the range of food-poisoning claims and the questions they raise \u2014 a resort or cruise outbreak can involve many out-of-town victims and, for a cruise, different rules entirely. ${PRODUCT} ${CAUSATION} ${OUTBREAK} A tourist outbreak often disperses victims across the country, which makes the public-health cluster evidence and prompt reporting even more important. ${PRESERVE} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1). Civil cases are filed in San Diego County Superior Court, though a cruise-related claim may follow different rules and a shorter contractual deadline.`,
      whatToTrack: [
        'Where and when the suspect food was eaten \u2014 restaurant, resort, or cruise',
        'For a cruise, the ticket contract and its claim deadline',
        'Any leftover food, kept refrigerated or frozen',
        'The receipt, order record, or packaging and lot number',
        'Whether a stool test identified the pathogen and its type',
        'Whether you reported the illness to the health department',
        'Whether others who ate the same food also fell ill',
        'Medical treatment from first symptoms onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a San Diego food-poisoning claim around pathogen testing and outbreak records, flags when a cruise contract imposes different rules and a shorter deadline, and prompts to preserve the suspect food and receipts before a traveling victim loses them. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I got sick on a cruise or at a resort. Is that different?',
        a: 'It can be. A resort outbreak often involves many out-of-town victims, which makes public-health cluster evidence important. A cruise-related claim may follow different rules entirely and a shorter contractual deadline set in the ticket, so the ticket contract should be reviewed promptly.',
      },
      {
        q: 'I got sick after eating out. Can I bring a claim?',
        a: 'Possibly. Contaminated or adulterated food is treated as a defective product, so a strict product-liability claim can lie against the restaurant, resort, grocer, or distributor, alongside negligence and breach of the implied warranty of merchantability. Proving causation is the key.',
      },
      {
        q: 'How do I prove which food made me sick?',
        a: 'Medical testing \u2014 a stool culture identifying the pathogen and its type \u2014 and public-health investigation records that connect a cluster of cases are the strongest evidence, tying your illness to a documented source. This matters even more when a tourist outbreak scatters victims across the country.',
      },
      {
        q: 'What should I keep as evidence?',
        a: 'Any leftover suspect food, kept refrigerated or frozen; the receipt or order record; for a cruise, the ticket contract; and a timeline of what you ate and when symptoms began. Preserving these early is important, especially when traveling.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the causation evidence, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_FOOD_SLUG,
    category: 'Cities',
    cluster: 'Fresno Food Poisoning & Produce Contamination Claims',
    title: 'Fresno Food Poisoning & Produce Contamination Claims',
    eyebrow: 'California local injury guide',
    description:
      'Seriously sick from contaminated produce or food in the Fresno area? At the heart of California agriculture, a claim can reach a grower, processor, or packer \u2014 not just a retailer.',
    psychology: 'I got seriously ill from food in the Fresno area and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno food poisoning lawyer',
      'contaminated produce illness claim california',
      'e coli lettuce recall injury california',
      'how to prove food poisoning source california',
      'grower processor food contamination liability california',
    ],
    signals: [
      'Contaminated food = product',
      'Grower / processor / packer liability',
      'Produce recalls & lot tracing',
      'Causation via testing',
      'Public-health outbreak records',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Fresno sits at the heart of California agriculture, where produce is grown, processed, and packed at the source \u2014 which gives its food-poisoning claims a distinctive shape: liability can reach up the chain to a grower, processor, or packer, not just the retailer that sold the food. ${PRODUCT} When contaminated produce triggers a recall, the lot and packing records that trace the food back to its origin become central evidence. ${CAUSATION} ${OUTBREAK} ${PRESERVE} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1). Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'The specific produce or product and its packaging and lot number',
        'Any recall notice covering the product',
        'Where and when it was bought, with the receipt',
        'Whether a stool test identified the pathogen and its type',
        'Whether you reported the illness to the health department',
        'Whether the product traces to a specific grower or processor',
        'Any leftover product, kept refrigerated or frozen',
        'Medical treatment from first symptoms onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Fresno-area food or produce-contamination claim by tracing the lot and packing records up the chain to the grower, processor, or packer, aligning them with pathogen testing and recall and outbreak records, and prompting to preserve the product and its packaging. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Contaminated produce made me sick. Who is responsible?',
        a: 'Liability can reach up the chain. Contaminated food is treated as a defective product, so a strict product-liability claim can lie against the grower, processor, packer, distributor, and retailer, alongside negligence and breach of the implied warranty of merchantability. The packing and lot records that trace the food back to its origin are central.',
      },
      {
        q: 'There was a recall on the product I ate. Does that help?',
        a: 'Yes. A recall notice and the lot and packing records that trace the product to its origin can be powerful evidence, especially when combined with medical testing linking your illness to the same pathogen. Keeping the packaging and lot number is important.',
      },
      {
        q: 'How do I prove which food made me sick?',
        a: 'Medical testing \u2014 a stool culture identifying the pathogen and its type \u2014 and public-health investigation and recall records that connect a cluster of cases are the strongest evidence, tying your illness to a documented source rather than a guess.',
      },
      {
        q: 'What should I keep as evidence?',
        a: 'The product\u2019s packaging and lot number, any leftover product kept refrigerated or frozen, the receipt, any recall notice, and a timeline of what you ate and when symptoms began. Preserving these before the product is discarded can be decisive.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the tracing and causation evidence, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const foodPoisoningCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_FOOD_SLUG]: {
    scenario: `An LA diner was hospitalised after a restaurant meal, and a stool test identified the pathogen. When the county linked several patrons to the same kitchen, the individual illness became part of a documented outbreak. ${NOT_ADVICE}`,
    timeline: [
      ['First symptoms', 'Seek care; ask for a stool test to identify the pathogen.'],
      ['First days', 'Report to the county health department; preserve any food and receipts.'],
      ['First weeks', 'Outbreak and testing records developed to prove the source.'],
      ['Longer term', 'Treatment documented; the responsible party in the chain identified.'],
    ],
    severityLadder: [
      ['Product path', 'Contaminated food is a defective product.'],
      ['Causation', 'Testing ties the illness to a pathogen.'],
      ['Outbreak link', 'A documented cluster proves the source.'],
      ['Serious harm', 'Hospitalisation and lasting complications.'],
    ],
    treatmentProgression: [
      { label: 'First care', copy: 'Records and testing document the illness.' },
      { label: 'Lab confirmation', copy: 'Pathogen typing supports causation.' },
      { label: 'Continuing care', copy: 'Complications show lasting harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether testing identified the pathogen and its type',
      'Whether a public-health outbreak links the cases',
      'Which party in the food chain is responsible',
      'Whether the suspect food and receipts were preserved',
      'Illness severity and treatment continuity',
      'Whether the illness was reported promptly',
    ],
    settlementValueDetails: [
      { label: 'Food is a product', copy: 'Strict liability can apply without proving carelessness.' },
      { label: 'Causation is the case', copy: 'Testing and outbreak records prove the source.' },
      { label: 'Report early', copy: 'Health-department records build the cluster.' },
      { label: 'Preserve the food', copy: 'The suspect food itself is evidence.' },
    ],
    insuranceProblems: [
      'The source is dismissed as unprovable.',
      'The suspect food is discarded before it is tested.',
      'The illness is never reported to the health department.',
      'No stool test is done to identify the pathogen.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where and when did you eat the suspect food?' },
      { label: 'Step 2', question: 'Did a stool test identify the pathogen?' },
      { label: 'Step 3', question: 'Did you report the illness to the health department?' },
      { label: 'Step 4', question: 'Did others who ate the same food fall ill?' },
    ],
  },
  [SF_FOOD_SLUG]: {
    scenario: `Several patrons of a busy San Francisco restaurant fell ill the same weekend. Pathogen typing and the health department\u2019s cluster investigation tied the cases to one contaminated kitchen. ${NOT_ADVICE}`,
    timeline: [
      ['First symptoms', 'Seek care; ask for a stool test to identify the pathogen.'],
      ['First days', 'Report to the health department; preserve any food and receipts.'],
      ['First weeks', 'Cluster and testing records developed to prove the source.'],
      ['Longer term', 'Treatment documented; the responsible establishment identified.'],
    ],
    severityLadder: [
      ['Product path', 'Contaminated food is a defective product.'],
      ['Cluster link', 'Multiple patrons point to one kitchen.'],
      ['Causation', 'Testing ties the illness to a pathogen.'],
      ['Serious harm', 'Hospitalisation and lasting complications.'],
    ],
    treatmentProgression: [
      { label: 'First care', copy: 'Records and testing document the illness.' },
      { label: 'Lab confirmation', copy: 'Pathogen typing supports causation.' },
      { label: 'Continuing care', copy: 'Complications show lasting harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether testing identified the pathogen and its type',
      'Whether a cluster of patrons links to one kitchen',
      'Whether the illness was reported promptly',
      'Whether the suspect food and receipts were preserved',
      'Illness severity and treatment continuity',
      'Which establishment is responsible',
    ],
    settlementValueDetails: [
      { label: 'Clusters are powerful', copy: 'Many patrons from one kitchen prove the source.' },
      { label: 'Food is a product', copy: 'Strict liability can apply.' },
      { label: 'Report early', copy: 'Health-department records build the cluster.' },
      { label: 'Preserve the food', copy: 'The suspect food itself is evidence.' },
    ],
    insuranceProblems: [
      'The cluster is never connected to the kitchen.',
      'The suspect food is discarded before testing.',
      'The illness is never reported.',
      'No stool test is done.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where and when did you eat the suspect food?' },
      { label: 'Step 2', question: 'Did others who ate there also fall ill?' },
      { label: 'Step 3', question: 'Did a stool test identify the pathogen?' },
      { label: 'Step 4', question: 'Did you report the illness to the health department?' },
    ],
  },
  [SD_FOOD_SLUG]: {
    scenario: `A tourist fell ill after a San Diego resort buffet, then flew home. Because victims scattered nationwide, the health-department cluster and pathogen typing \u2014 and the cruise contract deadline \u2014 had to be handled fast. ${NOT_ADVICE}`,
    timeline: [
      ['First symptoms', 'Seek care; ask for a stool test to identify the pathogen.'],
      ['First days', 'Report to the health department; check any cruise contract deadline.'],
      ['First weeks', 'Cluster and testing records developed despite scattered victims.'],
      ['Longer term', 'Treatment documented; the responsible party identified.'],
    ],
    severityLadder: [
      ['Product path', 'Contaminated food is a defective product.'],
      ['Tourism spread', 'Scattered victims make cluster evidence key.'],
      ['Cruise rules', 'A ticket contract can change the rules and deadline.'],
      ['Serious harm', 'Hospitalisation and lasting complications.'],
    ],
    treatmentProgression: [
      { label: 'First care', copy: 'Records and testing document the illness.' },
      { label: 'Lab confirmation', copy: 'Pathogen typing supports causation.' },
      { label: 'Continuing care', copy: 'Complications show lasting harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether testing identified the pathogen and its type',
      'Whether a public-health cluster links the cases',
      'Whether a cruise contract imposes different rules/deadline',
      'Whether the suspect food and receipts were preserved',
      'Illness severity and treatment continuity',
      'Whether the illness was reported promptly',
    ],
    settlementValueDetails: [
      { label: 'Clusters prove the source', copy: 'Even scattered victims can be linked.' },
      { label: 'Cruise rules differ', copy: 'A ticket contract can shorten the deadline.' },
      { label: 'Food is a product', copy: 'Strict liability can apply.' },
      { label: 'Move fast', copy: 'Traveling victims lose evidence quickly.' },
    ],
    insuranceProblems: [
      'A cruise contract deadline is missed.',
      'Scattered victims are never linked into a cluster.',
      'The suspect food is discarded before testing.',
      'No stool test is done.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a restaurant, resort, or cruise?' },
      { label: 'Step 2', question: 'For a cruise, what does the ticket contract say?' },
      { label: 'Step 3', question: 'Did a stool test identify the pathogen?' },
      { label: 'Step 4', question: 'Did you report the illness to the health department?' },
    ],
  },
  [FRESNO_FOOD_SLUG]: {
    scenario: `A family was sickened by contaminated packaged produce, and a recall covered the same lot. The packing records traced the product to a specific processor, and pathogen typing tied the illness to that source. ${NOT_ADVICE}`,
    timeline: [
      ['First symptoms', 'Seek care; ask for a stool test; keep the packaging and lot number.'],
      ['First days', 'Check for a recall; report to the health department.'],
      ['First weeks', 'Lot and packing records traced up the chain.'],
      ['Longer term', 'Treatment documented; the grower or processor identified.'],
    ],
    severityLadder: [
      ['Product path', 'Contaminated produce is a defective product.'],
      ['Chain liability', 'Grower, processor, and packer can be reached.'],
      ['Recall & lot', 'Recall and packing records trace the source.'],
      ['Serious harm', 'Hospitalisation and lasting complications.'],
    ],
    treatmentProgression: [
      { label: 'First care', copy: 'Records and testing document the illness.' },
      { label: 'Lab confirmation', copy: 'Pathogen typing supports causation.' },
      { label: 'Continuing care', copy: 'Complications show lasting harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the lot and packing records trace the source',
      'Whether a recall covers the product',
      'Whether testing identified the pathogen and its type',
      'Which party up the chain is responsible',
      'Whether the packaging and product were preserved',
      'Illness severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Chain reaches the source', copy: 'Grower and processor liability is available.' },
      { label: 'Lot records trace it', copy: 'Packing data links the food to its origin.' },
      { label: 'Recalls corroborate', copy: 'A recall strengthens the causation case.' },
      { label: 'Keep the packaging', copy: 'The lot number is essential evidence.' },
    ],
    insuranceProblems: [
      'The packaging and lot number are thrown away.',
      'The claim stops at the retailer, not the source.',
      'No stool test ties the illness to the pathogen.',
      'A recall on the product is never checked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What product, and do you have its packaging and lot number?' },
      { label: 'Step 2', question: 'Is there a recall covering the product?' },
      { label: 'Step 3', question: 'Did a stool test identify the pathogen?' },
      { label: 'Step 4', question: 'Did you report the illness to the health department?' },
    ],
  },
}
