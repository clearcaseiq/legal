import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, e-scooter injury practice area (batch 2):
 * location-specific guides for San Jose, Sacramento, Oakland, and Santa Monica,
 * extending the batch-1 hub (Los Angeles, San Diego, San Francisco, Long Beach).
 *
 * Applied accurately (identical to batch 1):
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

export const SJ_SCOOTER_SLUG = '/san-jose-scooter-accident'
export const SAC_SCOOTER_SLUG = '/sacramento-scooter-accident'
export const OAK_SCOOTER_SLUG = '/oakland-scooter-accident'
export const SM_SCOOTER_SLUG = '/santa-monica-scooter-accident'

export const scooterCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_SCOOTER_SLUG,
    category: 'Cities',
    cluster: 'San Jose E-Scooter Accident Claims',
    title: 'San Jose E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a rental e-scooter in San Jose, or struck by one? A defect, a road hazard, or a rider can be responsible \u2014 and an app waiver rarely ends a defect claim.',
    psychology: 'I crashed a rental scooter in San Jose and the app says I signed away my rights.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose scooter accident lawyer',
      'lime bird scooter injury claim california',
      'scooter brake failure lawsuit california',
      'scooter app arbitration waiver california',
      'pothole scooter crash city claim california',
    ],
    signals: [
      'Product / maintenance path',
      'Dangerous-road path (Gov 835)',
      'Waiver can\u2019t excuse defect',
      'VC 21220\u201321235 rules',
      'Pure comparative negligence',
      'Six-month public-entity claim',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s downtown and campus corridors are dense with rental scooters, and crashes from failed brakes, cracked stems, or potholed bike lanes are common. ${PATHS} ${WAIVER} ${RULES} ${PEDESTRIAN} Civil cases are filed in Santa Clara County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the scooter failed \u2014 brakes, throttle, stem, wheel',
        'The scooter operator and its maintenance records',
        'Whether a road hazard caused the crash',
        'Whether a public agency owns the roadway',
        'The app agreement and how it was presented',
        'Photographs of the scooter and the scene',
        'Whether a pedestrian was struck',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates a scooter defect or maintenance failure from a dangerous-roadway claim, flags a public agency\u2019s six-month deadline, and evaluates whether an app arbitration clause or waiver actually holds. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The app made me agree to arbitration and a waiver. Is my claim over?',
        a: 'Not necessarily. These terms are heavily litigated, and California generally does not allow a waiver to excuse gross negligence or a product defect. How the agreement was presented and what the injury was determine whether it holds.',
      },
      {
        q: 'The brakes failed. Who is responsible?',
        a: 'A product-liability and negligent-maintenance claim can lie against the operator that put the scooter on the street or the manufacturer that made it. Preserving the scooter and its maintenance records matters.',
      },
      {
        q: 'A pothole caused my crash. Can I claim against the city?',
        a: 'Possibly, under a dangerous-condition-of-public-property claim (Government Code 835) \u2014 but it carries a six-month Government Claims Act deadline, so a public-roadway crash must be assessed immediately.',
      },
      {
        q: 'I was not wearing a helmet. Does that end it?',
        a: 'No. Under pure comparative negligence, a rider\u2019s own violation reduces rather than automatically bars recovery, especially where a defect or road hazard was the real cause.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the scooter and roadway evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_SCOOTER_SLUG,
    category: 'Cities',
    cluster: 'Sacramento E-Scooter Accident Claims',
    title: 'Sacramento E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a rental e-scooter in Sacramento, or struck by one? A defect, a road hazard, or a rider can be responsible \u2014 and an app waiver rarely ends a defect claim.',
    psychology: 'I crashed a rental scooter in Sacramento and the app says I signed away my rights.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento scooter accident lawyer',
      'lime bird scooter injury claim california',
      'scooter brake failure lawsuit california',
      'scooter app arbitration waiver california',
      'pothole scooter crash city claim california',
    ],
    signals: [
      'Product / maintenance path',
      'Dangerous-road path (Gov 835)',
      'Waiver can\u2019t excuse defect',
      'VC 21220\u201321235 rules',
      'Pure comparative negligence',
      'Six-month public-entity claim',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s grid streets, capitol district, and light-rail corridors put rental scooters near embedded tracks and potholed lanes, where defects and road hazards both cause crashes. ${PATHS} ${WAIVER} ${RULES} ${PEDESTRIAN} Civil cases are filed in Sacramento County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the scooter failed \u2014 brakes, throttle, stem, wheel',
        'The scooter operator and its maintenance records',
        'Whether a road hazard or transit track caused the crash',
        'Whether a public agency owns the roadway',
        'The app agreement and how it was presented',
        'Photographs of the scooter and the scene',
        'Whether a pedestrian was struck',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates a scooter defect or maintenance failure from a dangerous-roadway claim, flags a public agency\u2019s six-month deadline, and evaluates whether an app arbitration clause or waiver actually holds. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The app made me agree to arbitration and a waiver. Is my claim over?',
        a: 'Not necessarily. These terms are heavily litigated, and California generally does not allow a waiver to excuse gross negligence or a product defect.',
      },
      {
        q: 'My wheel caught a light-rail track. Can I claim?',
        a: 'Possibly, under a dangerous-condition-of-public-property claim (Government Code 835) against the responsible agency \u2014 but it carries a six-month deadline, so it must be assessed immediately.',
      },
      {
        q: 'The brakes failed. Who is responsible?',
        a: 'A product-liability and negligent-maintenance claim can lie against the operator or the manufacturer. Preserving the scooter and its maintenance records matters.',
      },
      {
        q: 'I was not wearing a helmet. Does that end it?',
        a: 'No. Under pure comparative negligence, a rider\u2019s own violation reduces rather than automatically bars recovery, especially where a defect or road hazard was the real cause.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the scooter and roadway evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_SCOOTER_SLUG,
    category: 'Cities',
    cluster: 'Oakland E-Scooter Accident Claims',
    title: 'Oakland E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a rental e-scooter in Oakland, or struck by one? A defect, a road hazard, or a rider can be responsible \u2014 and an app waiver rarely ends a defect claim.',
    psychology: 'I crashed a rental scooter in Oakland and the app says I signed away my rights.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland scooter accident lawyer',
      'lime bird scooter injury claim california',
      'scooter brake failure lawsuit california',
      'scooter app arbitration waiver california',
      'pothole scooter crash city claim california',
    ],
    signals: [
      'Product / maintenance path',
      'Dangerous-road path (Gov 835)',
      'Waiver can\u2019t excuse defect',
      'VC 21220\u201321235 rules',
      'Pure comparative negligence',
      'Six-month public-entity claim',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s Uptown and Lake Merritt corridors and its notoriously potholed streets create both scooter-defect and dangerous-roadway crashes, near BART and transit tracks. ${PATHS} ${WAIVER} ${RULES} ${PEDESTRIAN} Civil cases are filed in Alameda County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the scooter failed \u2014 brakes, throttle, stem, wheel',
        'The scooter operator and its maintenance records',
        'Whether a road hazard caused the crash',
        'Whether a public agency owns the roadway',
        'The app agreement and how it was presented',
        'Photographs of the scooter and the scene',
        'Whether a pedestrian was struck',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates a scooter defect or maintenance failure from a dangerous-roadway claim, flags a public agency\u2019s six-month deadline, and evaluates whether an app arbitration clause or waiver actually holds. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The app made me agree to arbitration and a waiver. Is my claim over?',
        a: 'Not necessarily. These terms are heavily litigated, and California generally does not allow a waiver to excuse gross negligence or a product defect.',
      },
      {
        q: 'A pothole caused my crash. Can I claim against the city?',
        a: 'Possibly, under a dangerous-condition-of-public-property claim (Government Code 835) \u2014 but it carries a six-month deadline, so a public-roadway crash must be assessed immediately.',
      },
      {
        q: 'The brakes failed. Who is responsible?',
        a: 'A product-liability and negligent-maintenance claim can lie against the operator or the manufacturer. Preserving the scooter and its maintenance records matters.',
      },
      {
        q: 'I was not wearing a helmet. Does that end it?',
        a: 'No. Under pure comparative negligence, a rider\u2019s own violation reduces rather than automatically bars recovery, especially where a defect or road hazard was the real cause.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the scooter and roadway evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SM_SCOOTER_SLUG,
    category: 'Cities',
    cluster: 'Santa Monica E-Scooter Accident Claims',
    title: 'Santa Monica E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a rental e-scooter in Santa Monica, or struck by one? A defect, a road hazard, or a rider can be responsible \u2014 and an app waiver rarely ends a defect claim.',
    psychology: 'I crashed a rental scooter in Santa Monica and the app says I signed away my rights.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'santa monica scooter accident lawyer',
      'lime bird scooter injury claim california',
      'scooter brake failure lawsuit california',
      'scooter app arbitration waiver california',
      'beach path scooter crash claim california',
    ],
    signals: [
      'Product / maintenance path',
      'Dangerous-road path (Gov 835)',
      'Waiver can\u2019t excuse defect',
      'VC 21220\u201321235 rules',
      'Pure comparative negligence',
      'Six-month public-entity claim',
    ],
    sections: {
      whyItMatters: `Santa Monica is the birthplace of shared e-scooters and among the densest rental markets in the country, so scooter-defect crashes, tourist-heavy beach-path collisions, and pedestrian strikes are especially common. ${PATHS} ${WAIVER} ${RULES} ${PEDESTRIAN} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the scooter failed \u2014 brakes, throttle, stem, wheel',
        'The scooter operator and its maintenance records',
        'Whether a road or beach-path hazard caused the crash',
        'Whether a public agency owns the roadway or path',
        'The app agreement and how it was presented',
        'Photographs of the scooter and the scene',
        'Whether a pedestrian was struck',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates a scooter defect or maintenance failure from a dangerous-roadway claim, flags a public agency\u2019s six-month deadline, and evaluates whether an app arbitration clause or waiver actually holds. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The app made me agree to arbitration and a waiver. Is my claim over?',
        a: 'Not necessarily. These terms are heavily litigated, and California generally does not allow a waiver to excuse gross negligence or a product defect.',
      },
      {
        q: 'The brakes failed. Who is responsible?',
        a: 'A product-liability and negligent-maintenance claim can lie against the operator that put the scooter on the street or the manufacturer that made it. Preserving the scooter matters.',
      },
      {
        q: 'A scooter rider hit me as a pedestrian. What can I do?',
        a: 'A pedestrian struck by a scooter rider brings an ordinary negligence claim against the rider, with recovery possibly from the rider\u2019s homeowner\u2019s or renter\u2019s liability coverage or your own UM coverage in some circumstances.',
      },
      {
        q: 'A path or road hazard caused it. Can I claim against the city?',
        a: 'Possibly, under a dangerous-condition-of-public-property claim (Government Code 835) \u2014 but it carries a six-month deadline, so it must be assessed immediately.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the scooter and roadway evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const scooterCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_SCOOTER_SLUG]: {
    scenario: `A San Jose rider was thrown when a scooter\u2019s brakes failed downtown. The preserved scooter and the operator\u2019s maintenance logs supported a defect claim the app waiver could not bar. ${NOT_ADVICE}`,
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
  },
  [SAC_SCOOTER_SLUG]: {
    scenario: `A Sacramento rider\u2019s wheel caught a light-rail track groove and threw them. A dangerous-condition claim against the responsible agency ran under Government Code 835, with the six-month deadline controlling. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the track and the scene.'],
      ['First days', 'Identify the responsible public agency.'],
      ['First weeks', 'File or preserve the six-month claim.'],
      ['Longer term', 'Develop the dangerous-condition claim.'],
    ],
    severityLadder: [
      ['Road hazard', 'A dangerous condition can be actionable.'],
      ['Public entity', 'Six-month claim applies.'],
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
      'Whether a dangerous condition existed',
      'Whether the public-entity deadline was met',
      'Whether the agency had notice',
      'How comparative fault is assessed',
      'Injury severity and treatment continuity',
      'Whether the hazard was documented',
    ],
    settlementValueDetails: [
      { label: 'Road hazard', copy: 'A dangerous condition can be actionable.' },
      { label: 'Deadline', copy: 'A public entity shortens it.' },
      { label: 'Notice', copy: 'The agency\u2019s knowledge matters.' },
      { label: 'Comparative fault', copy: 'It reduces, not bars.' },
    ],
    insuranceProblems: [
      'The six-month deadline is missed.',
      'The track hazard is never documented.',
      'The responsible agency is misidentified.',
      'The claim is dropped over an app waiver.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did a road or track hazard cause it?' },
      { label: 'Step 2', question: 'Who owns the roadway?' },
      { label: 'Step 3', question: 'When did it happen?' },
      { label: 'Step 4', question: 'Do you have photos of the hazard?' },
    ],
  },
  [OAK_SCOOTER_SLUG]: {
    scenario: `An Oakland rider hit a deep pothole in a bike lane and was thrown. A dangerous-condition claim against the city ran alongside a maintenance question about the scooter. ${NOT_ADVICE}`,
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
      'The pothole is never documented.',
      'The responsible agency is misidentified.',
      'The claim is dropped over an app waiver.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did a pothole or hazard cause it?' },
      { label: 'Step 2', question: 'Who owns the roadway?' },
      { label: 'Step 3', question: 'When did it happen?' },
      { label: 'Step 4', question: 'Did the scooter also fail?' },
    ],
  },
  [SM_SCOOTER_SLUG]: {
    scenario: `A Santa Monica pedestrian was struck by a scooter rider on the beach path. An ordinary negligence claim ran against the rider, with the rider\u2019s renter\u2019s liability coverage as a source. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the rider\u2019s information and witnesses.'],
      ['First days', 'Identify the rider\u2019s liability coverage.'],
      ['First weeks', 'Check for any parked-scooter operator angle.'],
      ['Longer term', 'Develop the negligence claim.'],
    ],
    severityLadder: [
      ['Pedestrian struck', 'Ordinary negligence vs. the rider.'],
      ['Coverage', 'Renter\u2019s or homeowner\u2019s liability.'],
      ['Parked scooter', 'Trip-and-fall points to operator.'],
      ['Comparative fault', 'It reduces, not bars.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the rider is identified',
      'Whether the rider has liability coverage',
      'Whether your own UM coverage applies',
      'Whether a parked-scooter hazard is involved',
      'Injury severity and treatment continuity',
      'How comparative fault is assessed',
    ],
    settlementValueDetails: [
      { label: 'Rider', copy: 'Ordinary negligence applies.' },
      { label: 'Coverage', copy: 'Renter\u2019s/homeowner\u2019s liability can respond.' },
      { label: 'UM', copy: 'Your own coverage may apply.' },
      { label: 'Operator', copy: 'A blocked-sidewalk hazard points back.' },
    ],
    insuranceProblems: [
      'The rider is never identified.',
      'The rider\u2019s liability coverage is never found.',
      'Your own UM coverage is never checked.',
      'Witnesses are never contacted.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a pedestrian struck by a scooter?' },
      { label: 'Step 2', question: 'Did you get the rider\u2019s information?' },
      { label: 'Step 3', question: 'Was a parked scooter a trip hazard?' },
      { label: 'Step 4', question: 'Do you have UM coverage?' },
    ],
  },
}
