import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, elevator / escalator injury practice area (batch 2):
 * location-specific guides for San Jose, Oakland, Long Beach, and Fresno,
 * extending the batch-1 hub (Los Angeles, San Francisco, San Diego, Sacramento).
 *
 * Applied accurately (identical to batch 1):
 *  - Owner and maintenance company both owe a duty; a passenger-carrying elevator/
 *    escalator is a common carrier owing utmost care (Civil Code 2100).
 *  - The maintenance contractor can be independently liable; service/inspection
 *    records and prior-malfunction history are central.
 *  - Cal/OSHA Elevator, Ride and Tramway Unit permits and periodic inspections;
 *    a lapsed permit or failed inspection is significant.
 *  - Res ipsa loquitur can apply to a sudden drop, misleveling, abrupt stop,
 *    collapse, or entrapment.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Who is liable for an escalator or elevator injury, and which deadline applies, depend on facts a licensed California attorney should review promptly.'

const DUTY =
  'A property owner and the elevator or escalator maintenance company both owe a duty to keep the device reasonably safe. Because California treats an elevator or escalator carrying passengers as a common carrier, the operator owes the heightened duty of utmost care (Civil Code section 2100) \u2014 a standard higher than ordinary negligence.'

const MAINTENANCE =
  'The maintenance contractor \u2014 often a national elevator company under a service contract \u2014 can be independently liable for negligent inspection, repair, or maintenance. Its service and inspection records, and the history of prior malfunctions or repairs on the same unit, are central to showing what went wrong and whether it was known.'

const INSPECTION =
  'California requires a permit and periodic inspection of elevators and escalators by the Cal/OSHA Elevator, Ride and Tramway Unit. A lapsed permit, or an overdue or failed inspection, is significant evidence that the device was not maintained to the standard the law requires, and the permit and inspection history should be obtained early.'

const RES_IPSA =
  'Where a device malfunctions in a way that ordinarily does not happen without negligence \u2014 a sudden drop or misleveling, an abrupt stop, an escalator collapse, or an entrapment \u2014 the doctrine of res ipsa loquitur may help establish negligence even without direct proof of the specific failure. The device\u2019s condition and the maintenance records still need to be preserved and examined.'

export const SJ_ELEV_SLUG = '/san-jose-elevator-escalator-injury-claim'
export const OAK_ELEV_SLUG = '/oakland-elevator-escalator-injury-claim'
export const LB_ELEV_SLUG = '/long-beach-elevator-escalator-injury-claim'
export const FRESNO_ELEV_SLUG = '/fresno-elevator-escalator-injury-claim'

export const elevatorCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_ELEV_SLUG,
    category: 'Cities',
    cluster: 'San Jose Elevator & Escalator Injury Claims',
    title: 'San Jose Elevator & Escalator Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by an elevator drop, misleveling, or escalator failure in San Jose? A passenger-carrying device is a common carrier owing utmost care \u2014 and the maintenance company can be liable too.',
    psychology: 'An elevator or escalator hurt me in San Jose and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose elevator accident lawyer',
      'escalator injury claim california',
      'elevator misleveling drop lawsuit california',
      'elevator maintenance company liability california',
      'common carrier elevator utmost care california',
    ],
    signals: [
      'Common-carrier utmost care',
      'Owner + maintenance company liable',
      'Cal/OSHA permit & inspection',
      'Prior-malfunction history',
      'Res ipsa loquitur',
      'Preserve device & records',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s high-rise offices, transit stations, and busy shopping centers rely on heavily used elevators and escalators, where a sudden drop, misleveling, or escalator failure can cause serious injuries. ${DUTY} ${MAINTENANCE} ${INSPECTION} ${RES_IPSA} Civil cases are filed in Santa Clara County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The device, its location, and unit number',
        'The property owner and the maintenance company',
        'The service and inspection records',
        'The Cal/OSHA permit and inspection history',
        'Any history of prior malfunctions on the unit',
        'Surveillance footage of the incident',
        'Witness statements',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ pursues the owner and the maintenance company together, obtains the Cal/OSHA permit and inspection history and the service records, and preserves the device and any prior-malfunction history. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What standard applies to an elevator injury?',
        a: 'A passenger-carrying elevator or escalator is treated as a common carrier, so the operator owes the heightened duty of utmost care (Civil Code 2100) \u2014 higher than ordinary negligence.',
      },
      {
        q: 'Can the maintenance company be liable, not just the building?',
        a: 'Yes. The maintenance contractor \u2014 often a national elevator company \u2014 can be independently liable for negligent inspection, repair, or maintenance. Its service records and the unit\u2019s prior-malfunction history are central.',
      },
      {
        q: 'How do I prove what went wrong?',
        a: 'Where a device malfunctions in a way that ordinarily does not happen without negligence \u2014 a sudden drop, misleveling, abrupt stop, or entrapment \u2014 res ipsa loquitur may help establish negligence even without direct proof of the specific failure.',
      },
      {
        q: 'Does the inspection history matter?',
        a: 'Yes. California requires Cal/OSHA permits and periodic inspection. A lapsed permit or an overdue or failed inspection is significant evidence the device was not maintained to the required standard.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the device and maintenance records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_ELEV_SLUG,
    category: 'Cities',
    cluster: 'Oakland Elevator & Escalator Injury Claims',
    title: 'Oakland Elevator & Escalator Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by an elevator drop, misleveling, or escalator failure in Oakland? A passenger-carrying device is a common carrier owing utmost care \u2014 and the maintenance company can be liable too.',
    psychology: 'An elevator or escalator hurt me in Oakland and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland elevator accident lawyer',
      'escalator injury claim california',
      'elevator misleveling drop lawsuit california',
      'elevator maintenance company liability california',
      'BART escalator injury california',
    ],
    signals: [
      'Common-carrier utmost care',
      'Owner + maintenance company liable',
      'Cal/OSHA permit & inspection',
      'Public transit = 6-month claim',
      'Res ipsa loquitur',
      'Preserve device & records',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s transit stations, high-rises, and older buildings rely on heavily used elevators and escalators \u2014 and where a device is at a public transit agency, a six-month government claim can apply. ${DUTY} ${MAINTENANCE} ${INSPECTION} ${RES_IPSA} A device at a public agency requires a written claim within six months (Government Code section 911.2). Civil cases are filed in Alameda County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The device, its location, and unit number',
        'Whether the location is a public transit agency',
        'The property owner and the maintenance company',
        'The service and inspection records',
        'The Cal/OSHA permit and inspection history',
        'Any history of prior malfunctions on the unit',
        'Surveillance footage of the incident',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ pursues the owner and maintenance company together, flags a public-agency six-month deadline early, and obtains the Cal/OSHA permit and inspection history and the service records. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What standard applies to an elevator injury?',
        a: 'A passenger-carrying elevator or escalator is treated as a common carrier, so the operator owes the heightened duty of utmost care (Civil Code 2100) \u2014 higher than ordinary negligence.',
      },
      {
        q: 'It happened at a transit station. Is the deadline different?',
        a: 'It can be. If the device is owned by a public transit agency, a written government claim can be required within six months of the injury (Government Code 911.2) \u2014 far shorter than the ordinary deadline.',
      },
      {
        q: 'Can the maintenance company be liable, not just the owner?',
        a: 'Yes. The maintenance contractor can be independently liable for negligent inspection, repair, or maintenance. Its service records and the unit\u2019s prior-malfunction history are central.',
      },
      {
        q: 'How do I prove what went wrong?',
        a: 'A sudden drop, misleveling, abrupt stop, or entrapment can support res ipsa loquitur, which may help establish negligence even without direct proof of the specific failure.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the device and maintenance records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_ELEV_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Elevator & Escalator Injury Claims',
    title: 'Long Beach Elevator & Escalator Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by an elevator drop, misleveling, or escalator failure in Long Beach? A passenger-carrying device is a common carrier owing utmost care \u2014 and the maintenance company can be liable too.',
    psychology: 'An elevator or escalator hurt me in Long Beach and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach elevator accident lawyer',
      'escalator injury claim california',
      'elevator misleveling drop lawsuit california',
      'elevator maintenance company liability california',
      'hotel elevator injury california',
    ],
    signals: [
      'Common-carrier utmost care',
      'Owner + maintenance company liable',
      'Cal/OSHA permit & inspection',
      'Prior-malfunction history',
      'Res ipsa loquitur',
      'Preserve device & records',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s hotels, convention center, cruise terminal, and older downtown buildings rely on heavily used elevators and escalators, where a sudden drop, misleveling, or escalator failure can cause serious injuries. ${DUTY} ${MAINTENANCE} ${INSPECTION} ${RES_IPSA} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The device, its location, and unit number',
        'The property owner and the maintenance company',
        'The service and inspection records',
        'The Cal/OSHA permit and inspection history',
        'Any history of prior malfunctions on the unit',
        'Surveillance footage of the incident',
        'Witness statements',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ pursues the owner and the maintenance company together, obtains the Cal/OSHA permit and inspection history and the service records, and preserves the device and any prior-malfunction history. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What standard applies to an elevator injury?',
        a: 'A passenger-carrying elevator or escalator is treated as a common carrier, so the operator owes the heightened duty of utmost care (Civil Code 2100) \u2014 higher than ordinary negligence.',
      },
      {
        q: 'Can the maintenance company be liable, not just the hotel?',
        a: 'Yes. The maintenance contractor can be independently liable for negligent inspection, repair, or maintenance. Its service records and the unit\u2019s prior-malfunction history are central.',
      },
      {
        q: 'How do I prove what went wrong?',
        a: 'A sudden drop, misleveling, abrupt stop, or entrapment can support res ipsa loquitur, which may help establish negligence even without direct proof of the specific failure.',
      },
      {
        q: 'Does the inspection history matter?',
        a: 'Yes. A lapsed Cal/OSHA permit or an overdue or failed inspection is significant evidence the device was not maintained to the required standard.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the device and maintenance records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_ELEV_SLUG,
    category: 'Cities',
    cluster: 'Fresno Elevator & Escalator Injury Claims',
    title: 'Fresno Elevator & Escalator Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by an elevator drop, misleveling, or escalator failure in Fresno? A passenger-carrying device is a common carrier owing utmost care \u2014 and the maintenance company can be liable too.',
    psychology: 'An elevator or escalator hurt me in Fresno and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno elevator accident lawyer',
      'escalator injury claim california',
      'elevator misleveling drop lawsuit california',
      'elevator maintenance company liability california',
      'common carrier elevator utmost care california',
    ],
    signals: [
      'Common-carrier utmost care',
      'Owner + maintenance company liable',
      'Cal/OSHA permit & inspection',
      'Prior-malfunction history',
      'Res ipsa loquitur',
      'Preserve device & records',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s medical buildings, government offices, and older downtown structures rely on aging elevators and escalators, where deferred maintenance can lead to a sudden drop, misleveling, or escalator failure. ${DUTY} ${MAINTENANCE} ${INSPECTION} ${RES_IPSA} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The device, its location, and unit number',
        'The property owner and the maintenance company',
        'The service and inspection records',
        'The Cal/OSHA permit and inspection history',
        'Any history of prior malfunctions on the unit',
        'Surveillance footage of the incident',
        'Witness statements',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ pursues the owner and the maintenance company together, obtains the Cal/OSHA permit and inspection history and the service records, and preserves the device and any prior-malfunction history. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What standard applies to an elevator injury?',
        a: 'A passenger-carrying elevator or escalator is treated as a common carrier, so the operator owes the heightened duty of utmost care (Civil Code 2100) \u2014 higher than ordinary negligence.',
      },
      {
        q: 'The building\u2019s elevator is old. Does deferred maintenance matter?',
        a: 'Very much. A lapsed Cal/OSHA permit, an overdue or failed inspection, and a history of prior malfunctions are significant evidence the device was not maintained to the required standard.',
      },
      {
        q: 'Can the maintenance company be liable, not just the owner?',
        a: 'Yes. The maintenance contractor can be independently liable for negligent inspection, repair, or maintenance. Its service records and the unit\u2019s prior-malfunction history are central.',
      },
      {
        q: 'How do I prove what went wrong?',
        a: 'A sudden drop, misleveling, abrupt stop, or entrapment can support res ipsa loquitur, which may help establish negligence even without direct proof of the specific failure.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the device and maintenance records so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const elevatorCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_ELEV_SLUG]: {
    scenario: `A San Jose office elevator misleveled and dropped, injuring a passenger. The common-carrier duty applied, and the maintenance company\u2019s service records showed a known, unrepaired fault. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the unit number.'],
      ['First days', 'Request surveillance footage; identify the maintainer.'],
      ['First weeks', 'Pull Cal/OSHA permit and service records.'],
      ['Longer term', 'Develop utmost-care and res ipsa theories.'],
    ],
    severityLadder: [
      ['Common carrier', 'Utmost care applies.'],
      ['Maintainer', 'Independent liability.'],
      ['Inspection', 'Permit lapses show fault.'],
      ['Res ipsa', 'Malfunction implies negligence.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the device.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the utmost-care standard applies',
      'Whether the maintainer is independently liable',
      'Whether inspection lapses show fault',
      'Whether prior malfunctions were known',
      'Whether the device was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher standard', copy: 'Elevators owe utmost care.' },
      { label: 'Maintainer', copy: 'It can be independently liable.' },
      { label: 'Inspection', copy: 'Permit lapses show fault.' },
      { label: 'Res ipsa', copy: 'A malfunction implies negligence.' },
    ],
    insuranceProblems: [
      'The common-carrier standard is never asserted.',
      'The maintenance records are never obtained.',
      'The surveillance footage is overwritten.',
      'The prior-malfunction history is ignored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What device and location was it?' },
      { label: 'Step 2', question: 'Who maintains the device?' },
      { label: 'Step 3', question: 'Is there surveillance footage?' },
      { label: 'Step 4', question: 'When did the injury happen?' },
    ],
  },
  [OAK_ELEV_SLUG]: {
    scenario: `An Oakland transit-station escalator abruptly reversed, injuring riders. Because the device belonged to a public agency, a six-month government claim controlled the timeline. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the station and unit.'],
      ['First days', 'Confirm the public agency and the deadline.'],
      ['First weeks', 'File or preserve the six-month government claim.'],
      ['Longer term', 'Pull permit, inspection, and service records.'],
    ],
    severityLadder: [
      ['Common carrier', 'Utmost care applies.'],
      ['Public agency', 'Six-month claim applies.'],
      ['Maintainer', 'Independent liability.'],
      ['Res ipsa', 'Malfunction implies negligence.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the device.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public-agency deadline applies',
      'Whether the utmost-care standard applies',
      'Whether the maintainer is independently liable',
      'Whether inspection lapses show fault',
      'Whether footage was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Deadline', copy: 'A public agency shortens it.' },
      { label: 'Higher standard', copy: 'Escalators owe utmost care.' },
      { label: 'Maintainer', copy: 'It can be independently liable.' },
      { label: 'Res ipsa', copy: 'A malfunction implies negligence.' },
    ],
    insuranceProblems: [
      'A public-agency six-month deadline is missed.',
      'The maintenance records are never obtained.',
      'The station footage is overwritten.',
      'The common-carrier standard is never asserted.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it at a public transit station?' },
      { label: 'Step 2', question: 'When did the injury happen?' },
      { label: 'Step 3', question: 'Which unit and station was it?' },
      { label: 'Step 4', question: 'Is there station footage?' },
    ],
  },
  [LB_ELEV_SLUG]: {
    scenario: `A Long Beach hotel guest was injured when an elevator dropped between floors and entrapped them. The hotel and the national maintenance company both faced the utmost-care standard. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the unit number.'],
      ['First days', 'Request footage; identify the maintenance company.'],
      ['First weeks', 'Pull Cal/OSHA permit and service records.'],
      ['Longer term', 'Develop utmost-care and res ipsa theories.'],
    ],
    severityLadder: [
      ['Common carrier', 'Utmost care applies.'],
      ['Maintainer', 'Independent liability.'],
      ['Entrapment', 'Malfunction implies negligence.'],
      ['Inspection', 'Permit lapses show fault.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the device.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the utmost-care standard applies',
      'Whether the maintainer is independently liable',
      'Whether inspection lapses show fault',
      'Whether prior malfunctions were known',
      'Whether footage was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher standard', copy: 'Elevators owe utmost care.' },
      { label: 'Maintainer', copy: 'It can be independently liable.' },
      { label: 'Res ipsa', copy: 'An entrapment implies negligence.' },
      { label: 'Inspection', copy: 'Permit lapses show fault.' },
    ],
    insuranceProblems: [
      'The maintenance records are never obtained.',
      'The hotel footage is overwritten.',
      'The common-carrier standard is never asserted.',
      'The prior-malfunction history is ignored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What device and location was it?' },
      { label: 'Step 2', question: 'Who maintains the device?' },
      { label: 'Step 3', question: 'Were you entrapped or dropped?' },
      { label: 'Step 4', question: 'Is there surveillance footage?' },
    ],
  },
  [FRESNO_ELEV_SLUG]: {
    scenario: `A Fresno medical-building elevator with a lapsed permit and repeated prior repairs dropped, injuring a visitor. The inspection lapse and repair history established negligent maintenance. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the unit number.'],
      ['First days', 'Request footage; identify the maintenance company.'],
      ['First weeks', 'Pull Cal/OSHA permit and prior-repair history.'],
      ['Longer term', 'Develop utmost-care and res ipsa theories.'],
    ],
    severityLadder: [
      ['Common carrier', 'Utmost care applies.'],
      ['Inspection', 'A lapsed permit shows fault.'],
      ['Maintainer', 'Independent liability.'],
      ['Res ipsa', 'Malfunction implies negligence.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the device.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the permit had lapsed',
      'Whether prior malfunctions were known',
      'Whether the utmost-care standard applies',
      'Whether the maintainer is independently liable',
      'Whether the device was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Inspection', copy: 'A lapsed permit shows fault.' },
      { label: 'History', copy: 'Prior repairs show notice.' },
      { label: 'Higher standard', copy: 'Elevators owe utmost care.' },
      { label: 'Maintainer', copy: 'It can be independently liable.' },
    ],
    insuranceProblems: [
      'The permit and inspection history are never pulled.',
      'The prior-repair history is ignored.',
      'The maintenance records are never obtained.',
      'The common-carrier standard is never asserted.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What device and building was it?' },
      { label: 'Step 2', question: 'Was the permit current?' },
      { label: 'Step 3', question: 'Who maintains the device?' },
      { label: 'Step 4', question: 'When did the injury happen?' },
    ],
  },
}
