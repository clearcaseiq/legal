import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, e-scooter injury practice area (batch 3):
 * location-specific guides for Fresno, Riverside, San Bernardino, Bakersfield,
 * and Anaheim, bringing the e-scooter hub to the 12-metro standard alongside
 * batch 1 (Los Angeles, San Diego, San Francisco, Long Beach) and batch 2
 * (San Jose, Sacramento, Oakland, Santa Monica).
 *
 * Applied accurately (identical to batches 1 and 2):
 *  - Two paths: scooter product/maintenance failure vs. dangerous condition of
 *    public property (Gov. Code 835, six-month claim).
 *  - App arbitration clauses/waivers are heavily litigated; a waiver generally can\u2019t
 *    excuse gross negligence or a product defect.
 *  - Vehicle Code 21220\u201321235 rules shape comparative fault; pure comparative
 *    negligence reduces, not bars, recovery.
 *  - Pedestrians struck by scooters bring ordinary negligence; parked-scooter
 *    trip-and-falls can point back to the operator.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether an arbitration clause or waiver is enforceable, whether a defect, a road hazard, or a public entity is involved, and how comparative fault is assessed depend on facts a licensed California attorney should review promptly.'

const PATHS =
  'An e-scooter injury usually follows one of two paths. If the scooter itself failed \u2014 brakes that would not stop, a throttle that stuck, a stem or wheel that cracked \u2014 a product-liability and negligent-maintenance claim can lie against the operator that put it on the street or the manufacturer that made it. If a road hazard caused the crash \u2014 a pothole, a raised edge, or an embedded transit track \u2014 a dangerous-condition-of-public-property claim against the responsible agency may exist under Government Code section 835, but it carries the six-month Government Claims Act deadline.'

const WAIVER =
  'Rental scooter apps routinely make riders agree to arbitration clauses and liability waivers, and companies raise them immediately. But these terms are heavily litigated, and California generally does not allow a waiver to excuse gross negligence or a product defect, so an app agreement is not automatically the end of a claim. How the agreement was presented and what the injury was determine whether it holds.'

const RULES =
  'California treats motorised scooters under Vehicle Code sections 21220 to 21235: riders may not ride on sidewalks, must use a bike lane where one is available, must have a valid driver license or permit, face a roughly 15 mph limit, and must wear a helmet if under 18. These rules shape comparative fault, but under pure comparative negligence a rider\u2019s own violation reduces rather than automatically bars recovery, especially where a defect or road hazard was the real cause.'

const PEDESTRIAN =
  'A pedestrian struck by a scooter rider brings an ordinary negligence claim against the rider, and recovery can come from the rider\u2019s homeowner\u2019s or renter\u2019s liability coverage, or from the pedestrian\u2019s own uninsured-motorist coverage in some circumstances. Improperly parked scooters that block a sidewalk can also cause trip-and-fall injuries, which may point back to the operator.'

export const FRESNO_SCOOTER_SLUG = '/fresno-scooter-accident'
export const RIV_SCOOTER_SLUG = '/riverside-scooter-accident'
export const SB_SCOOTER_SLUG = '/san-bernardino-scooter-accident'
export const BAK_SCOOTER_SLUG = '/bakersfield-scooter-accident'
export const ANA_SCOOTER_SLUG = '/anaheim-scooter-accident'

const SIGNALS = [
  'Product / maintenance path',
  'Dangerous-road path (Gov 835)',
  'Waiver can\u2019t excuse defect',
  'VC 21220\u201321235 rules',
  'Pure comparative negligence',
  'Six-month public-entity claim',
]

const EXAMPLE_QUERIES = (city: string) => [
  `${city} scooter accident lawyer`,
  'lime bird scooter injury claim california',
  'scooter brake failure lawsuit california',
  'scooter app arbitration waiver california',
  'pothole scooter crash city claim california',
]

const WHAT_TO_TRACK = [
  'Whether the scooter failed \u2014 brakes, throttle, stem, wheel',
  'The scooter operator and its maintenance records',
  'Whether a road hazard caused the crash',
  'Whether a public agency owns the roadway',
  'The app agreement and how it was presented',
  'Photographs of the scooter and the scene',
  'Whether a pedestrian was struck',
  'Medical treatment from the injury onward',
]

const HOW_HELPS = `ClearCaseIQ separates a scooter defect or maintenance failure from a dangerous-roadway claim, flags a public agency\u2019s six-month deadline, and evaluates whether an app arbitration clause or waiver actually holds. ${NOT_ADVICE}`

const description = (city: string) =>
  `Hurt on a rental e-scooter in ${city}, or struck by one? A defect, a road hazard, or a rider can be responsible \u2014 and an app waiver rarely ends a defect claim.`

const psychology = (city: string) =>
  `I crashed a rental scooter in ${city} and the app says I signed away my rights.`

const BASE_FAQS = [
  {
    q: 'The brakes failed. Who is responsible?',
    a: 'A product-liability and negligent-maintenance claim can lie against the operator that put the scooter on the street or the manufacturer that made it. Preserving the scooter and its maintenance records matters.',
  },
  {
    q: 'I was not wearing a helmet. Does that end it?',
    a: 'No. Under pure comparative negligence, a rider\u2019s own violation reduces rather than automatically bars recovery, especially where a defect or road hazard was the real cause.',
  },
  {
    q: 'Is ClearCaseIQ a law firm?',
    a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the scooter and roadway evidence so a licensed California attorney can review a complete file.',
  },
]

const WAIVER_FAQ = {
  q: 'The app made me agree to arbitration and a waiver. Is my claim over?',
  a: 'Not necessarily. These terms are heavily litigated, and California generally does not allow a waiver to excuse gross negligence or a product defect. How the agreement was presented and what the injury was determine whether it holds.',
}

const CITY_FAQ = {
  q: 'A pothole caused my crash. Can I claim against the city?',
  a: 'Possibly, under a dangerous-condition-of-public-property claim (Government Code 835) \u2014 but it carries a six-month Government Claims Act deadline, so a public-roadway crash must be assessed immediately.',
}

export const scooterCityGuidePages3: LandingPage[] = [
  {
    slug: FRESNO_SCOOTER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno E-Scooter Accident Claims',
    title: 'Fresno E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description: description('Fresno'),
    psychology: psychology('Fresno'),
    cta: 'Start Local Case Assessment',
    exampleQueries: EXAMPLE_QUERIES('fresno'),
    signals: SIGNALS,
    sections: {
      whyItMatters: `Fresno\u2019s downtown and Fulton corridor have added rental scooters alongside wide, fast arterials, where failed brakes, cracked stems, and potholed lanes all cause crashes. ${PATHS} ${WAIVER} ${RULES} ${PEDESTRIAN} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: WHAT_TO_TRACK,
      howClearCaseHelps: HOW_HELPS,
    },
    faqs: [WAIVER_FAQ, CITY_FAQ, ...BASE_FAQS],
  },
  {
    slug: RIV_SCOOTER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside E-Scooter Accident Claims',
    title: 'Riverside E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description: description('Riverside'),
    psychology: psychology('Riverside'),
    cta: 'Start Local Case Assessment',
    exampleQueries: EXAMPLE_QUERIES('riverside'),
    signals: SIGNALS,
    sections: {
      whyItMatters: `Riverside\u2019s university district and downtown mall corridor draw heavy scooter use, and crashes from scooter defects or Inland Empire roadway hazards are common. ${PATHS} ${WAIVER} ${RULES} ${PEDESTRIAN} Civil cases are filed in Riverside County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: WHAT_TO_TRACK,
      howClearCaseHelps: HOW_HELPS,
    },
    faqs: [WAIVER_FAQ, CITY_FAQ, ...BASE_FAQS],
  },
  {
    slug: SB_SCOOTER_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino E-Scooter Accident Claims',
    title: 'San Bernardino E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description: description('San Bernardino'),
    psychology: psychology('San Bernardino'),
    cta: 'Start Local Case Assessment',
    exampleQueries: EXAMPLE_QUERIES('san bernardino'),
    signals: SIGNALS,
    sections: {
      whyItMatters: `San Bernardino\u2019s wide arterials and transit corridors put rental scooters near fast traffic and uneven pavement, where both defects and road hazards cause crashes. ${PATHS} ${WAIVER} ${RULES} ${PEDESTRIAN} Civil cases are filed in San Bernardino County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: WHAT_TO_TRACK,
      howClearCaseHelps: HOW_HELPS,
    },
    faqs: [WAIVER_FAQ, CITY_FAQ, ...BASE_FAQS],
  },
  {
    slug: BAK_SCOOTER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield E-Scooter Accident Claims',
    title: 'Bakersfield E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description: description('Bakersfield'),
    psychology: psychology('Bakersfield'),
    cta: 'Start Local Case Assessment',
    exampleQueries: EXAMPLE_QUERIES('bakersfield'),
    signals: SIGNALS,
    sections: {
      whyItMatters: `Bakersfield\u2019s downtown and college corridors have added rental scooters to wide, high-speed roads, where a scooter failure or a potholed lane can throw a rider into traffic. ${PATHS} ${WAIVER} ${RULES} ${PEDESTRIAN} Civil cases are filed in Kern County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: WHAT_TO_TRACK,
      howClearCaseHelps: HOW_HELPS,
    },
    faqs: [WAIVER_FAQ, CITY_FAQ, ...BASE_FAQS],
  },
  {
    slug: ANA_SCOOTER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim E-Scooter Accident Claims',
    title: 'Anaheim E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description: description('Anaheim'),
    psychology: psychology('Anaheim'),
    cta: 'Start Local Case Assessment',
    exampleQueries: EXAMPLE_QUERIES('anaheim'),
    signals: SIGNALS,
    sections: {
      whyItMatters: `Anaheim\u2019s resort district and convention corridor fill with rental scooters and tourists on foot, where scooter defects, roadway hazards, and pedestrian collisions all arise. ${PATHS} ${WAIVER} ${RULES} ${PEDESTRIAN} Civil cases are filed in Orange County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: WHAT_TO_TRACK,
      howClearCaseHelps: HOW_HELPS,
    },
    faqs: [WAIVER_FAQ, CITY_FAQ, ...BASE_FAQS],
  },
]

const productTopic = (scenarioCity: string): TopicContent => ({
  scenario: `A ${scenarioCity} rider was thrown when a rental scooter\u2019s brakes failed. The preserved scooter and the operator\u2019s maintenance logs supported a defect claim the app waiver could not bar. ${NOT_ADVICE}`,
  timeline: [
    ['At the scene', 'Photograph the scooter; note its ID number.'],
    ['First days', 'Report the failure; request the maintenance log.'],
    ['First weeks', 'Assess the app agreement\u2019s enforceability.'],
    ['Longer term', 'Develop product and maintenance claims.'],
  ],
  severityLadder: [
    ['Defect', 'A brake failure is a product claim.'],
    ['Maintenance', 'The operator can be negligent.'],
    ['Waiver', 'It can\u2019t excuse a defect.'],
    ['Comparative fault', 'It reduces, not bars.'],
  ],
  treatmentProgression: [
    { label: 'First response', copy: 'Injuries are documented.' },
    { label: 'Imaging', copy: 'Objective findings support severity.' },
    { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
    { label: 'Documentation', copy: 'Bills and future care define economics.' },
  ],
  settlementDrivers: [
    'Whether the scooter was preserved',
    'Whether a defect or maintenance failure is shown',
    'Whether the app waiver holds',
    'How comparative fault is assessed',
    'Injury severity and treatment continuity',
    'Whether the operator is identified',
  ],
  settlementValueDetails: [
    { label: 'Defect', copy: 'A brake failure is a product claim.' },
    { label: 'Waiver', copy: 'It can\u2019t excuse a defect.' },
    { label: 'Maintenance', copy: 'Operator logs show fault.' },
    { label: 'Comparative fault', copy: 'It reduces, not bars.' },
  ],
  insuranceProblems: [
    'The scooter is returned and lost.',
    'The maintenance log is never requested.',
    'The claim is dropped over an app waiver.',
    'A public-roadway deadline is missed.',
  ],
  intakeSteps: [
    { label: 'Step 1', question: 'Did the scooter malfunction?' },
    { label: 'Step 2', question: 'Which app or operator was it?' },
    { label: 'Step 3', question: 'Do you have the scooter ID?' },
    { label: 'Step 4', question: 'Was a road hazard involved?' },
  ],
})

const roadwayTopic = (scenarioCity: string): TopicContent => ({
  scenario: `A ${scenarioCity} rider hit a deep pothole in a bike lane and was thrown. A dangerous-condition claim against the responsible agency ran under Government Code 835, with the six-month deadline controlling. ${NOT_ADVICE}`,
  timeline: [
    ['At the scene', 'Photograph the pothole and the scene.'],
    ['First days', 'Identify the responsible public agency.'],
    ['First weeks', 'File or preserve the six-month claim.'],
    ['Longer term', 'Develop dangerous-condition and defect claims.'],
  ],
  severityLadder: [
    ['Road hazard', 'A pothole can be a dangerous condition.'],
    ['Public entity', 'Six-month claim applies.'],
    ['Defect', 'A scooter failure is a product claim.'],
    ['Comparative fault', 'It reduces, not bars.'],
  ],
  treatmentProgression: [
    { label: 'First response', copy: 'Injuries are documented.' },
    { label: 'Imaging', copy: 'Objective findings support severity.' },
    { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
    { label: 'Documentation', copy: 'Bills and future care define economics.' },
  ],
  settlementDrivers: [
    'Whether a dangerous condition existed',
    'Whether the public-entity deadline was met',
    'Whether the agency had notice',
    'Whether the scooter also failed',
    'How comparative fault is assessed',
    'Injury severity and treatment continuity',
  ],
  settlementValueDetails: [
    { label: 'Road hazard', copy: 'A pothole can be actionable.' },
    { label: 'Deadline', copy: 'A public entity shortens it.' },
    { label: 'Notice', copy: 'The agency\u2019s knowledge matters.' },
    { label: 'Comparative fault', copy: 'It reduces, not bars.' },
  ],
  insuranceProblems: [
    'The six-month deadline is missed.',
    'The road hazard is never documented.',
    'The responsible agency is misidentified.',
    'The claim is dropped over an app waiver.',
  ],
  intakeSteps: [
    { label: 'Step 1', question: 'Did a road hazard cause it?' },
    { label: 'Step 2', question: 'Who owns the roadway?' },
    { label: 'Step 3', question: 'When did it happen?' },
    { label: 'Step 4', question: 'Do you have photos of the hazard?' },
  ],
})

export const scooterCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [FRESNO_SCOOTER_SLUG]: productTopic('Fresno'),
  [RIV_SCOOTER_SLUG]: roadwayTopic('Riverside'),
  [SB_SCOOTER_SLUG]: productTopic('San Bernardino'),
  [BAK_SCOOTER_SLUG]: roadwayTopic('Bakersfield'),
  [ANA_SCOOTER_SLUG]: productTopic('Anaheim'),
}
