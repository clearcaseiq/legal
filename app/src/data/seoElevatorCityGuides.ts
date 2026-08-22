import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, escalator / elevator-injury practice area: location-specific guides
 * for Los Angeles, San Francisco, San Diego, and Sacramento.
 *
 * These claims are distinct because they combine premises liability with the
 * separate liability of the elevator/escalator maintenance company, the
 * heightened common-carrier duty that applies to devices carrying passengers,
 * a state permit-and-inspection regime, and the doctrine of res ipsa loquitur.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: dense high-rises, large malls, and Metro rail stations.
 *  - San Francisco: high-rise buildings, hotels, and BART and Muni stations.
 *  - San Diego: hotels, shopping centers, and trolley stations.
 *  - Sacramento: state office buildings (public entities) and light-rail stations.
 *
 * Applied accurately:
 *  - A property owner and the elevator/escalator maintenance company both owe a
 *    duty to keep the device reasonably safe. California treats an elevator (and
 *    an escalator) carrying passengers as a common carrier, so the operator owes
 *    the heightened duty of utmost care (Civil Code section 2100).
 *  - The maintenance contractor can be independently liable for negligent
 *    inspection, repair, or maintenance; its records are central.
 *  - California requires a permit and periodic inspection of conveyances by the
 *    Cal/OSHA Elevator, Ride and Tramway Unit; a lapsed permit or a failed or
 *    overdue inspection is significant evidence.
 *  - Where a device malfunctions in a way that ordinarily does not happen without
 *    negligence \u2014 a sudden drop, an abrupt stop, an escalator collapse or entrapment
 *    \u2014 res ipsa loquitur may help establish negligence.
 *  - The evidence is perishable: the device\u2019s condition, the maintenance and
 *    inspection logs, the current permit, and surveillance video should be
 *    secured. The deadline is generally two years (Code of Civil Procedure
 *    section 335.1), or six months where a public entity (such as a transit
 *    agency or a state building) is involved.
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

export const LA_ELEV_SLUG = '/los-angeles-elevator-escalator-injury-claim'
export const SF_ELEV_SLUG = '/san-francisco-elevator-escalator-injury-claim'
export const SD_ELEV_SLUG = '/san-diego-elevator-escalator-injury-claim'
export const SAC_ELEV_SLUG = '/sacramento-elevator-escalator-injury-claim'

export const elevatorCityGuidePages: LandingPage[] = [
  {
    slug: LA_ELEV_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Elevator & Escalator Injury Claims',
    title: 'Los Angeles Elevator & Escalator Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on an elevator or escalator in an LA high-rise, mall, or Metro station? The owner and maintenance company owe a high duty \u2014 and inspection records tell the story.',
    psychology: 'An elevator or escalator malfunctioned and hurt me in LA and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles elevator injury lawyer',
      'escalator accident claim california',
      'elevator malfunction lawsuit california',
      'mall escalator injury attorney california',
      'elevator maintenance negligence california',
    ],
    signals: [
      'Owner & maintenance-company liability',
      'Common-carrier duty (Civil Code 2100)',
      'State permit & inspection (Cal/OSHA)',
      'Res ipsa loquitur may apply',
      'Preserve device & maintenance logs',
      'Six-month claim if public (transit)',
    ],
    sections: {
      whyItMatters: `With dense high-rises, large malls, and Metro rail stations, Los Angeles relies heavily on elevators and escalators \u2014 and when one drops, stops abruptly, collapses, or traps a passenger, both the owner and the maintenance company can be responsible. ${DUTY} ${MAINTENANCE} ${INSPECTION} ${RES_IPSA} The deadline is generally two years, or six months if a public entity such as Metro is involved. Civil cases are filed in Los Angeles County Superior Court after any required claim.`,
      whatToTrack: [
        'The building or station and the device involved',
        'The maintenance/service company under contract',
        'How the device malfunctioned',
        'The permit and Cal/OSHA inspection history',
        'The maintenance and prior-repair records',
        'Surveillance video of the incident',
        'Whether a public entity (transit) was involved',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies both the LA property owner and the maintenance company, requests the permit, inspection, and service history, preserves the surveillance video, and flags any six-month public-entity deadline for a transit-station device. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who is responsible for an elevator or escalator injury?',
        a: 'Often two parties: the property owner and the maintenance company that services the device. Because a passenger-carrying elevator or escalator is treated as a common carrier in California, the operator owes a heightened duty of utmost care (Civil Code section 2100).',
      },
      {
        q: 'I do not know exactly what failed. Can I still have a claim?',
        a: 'Possibly. Where a device malfunctions in a way that ordinarily does not happen without negligence \u2014 a sudden drop, an abrupt stop, a collapse, or an entrapment \u2014 the doctrine of res ipsa loquitur may help establish negligence. Preserving the device and the maintenance records is still important.',
      },
      {
        q: 'Do inspection records matter?',
        a: 'Yes. California requires a permit and periodic Cal/OSHA inspection of elevators and escalators. A lapsed permit or an overdue or failed inspection is significant evidence that the device was not maintained to the required standard.',
      },
      {
        q: 'It happened at a Metro station. Does that change the deadline?',
        a: 'It can. If a public entity such as a transit agency owns the device, the Government Claims Act requires a formal claim within six months of the injury \u2014 far shorter than the usual two years \u2014 so it must be assessed immediately.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the parties, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_ELEV_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Elevator & Escalator Injury Claims',
    title: 'San Francisco Elevator & Escalator Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on an elevator or escalator in an SF high-rise, hotel, or BART/Muni station? The owner and maintenance company owe a high duty \u2014 and records tell the story.',
    psychology: 'An elevator or escalator malfunctioned and hurt me in San Francisco and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco elevator injury lawyer',
      'escalator accident claim california',
      'bart escalator injury lawsuit california',
      'elevator malfunction attorney california',
      'elevator maintenance negligence california',
    ],
    signals: [
      'Owner & maintenance-company liability',
      'Common-carrier duty (Civil Code 2100)',
      'State permit & inspection (Cal/OSHA)',
      'Res ipsa loquitur may apply',
      'Preserve device & maintenance logs',
      'Six-month claim if public (transit)',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s high-rise buildings, hotels, and heavily used BART and Muni stations depend on elevators and escalators, and their frequent breakdowns \u2014 especially in transit stations \u2014 can cause serious falls, collapses, and entrapments. ${DUTY} ${MAINTENANCE} ${INSPECTION} ${RES_IPSA} The deadline is generally two years, or six months if a public entity such as BART or Muni is involved. Civil cases are filed in San Francisco County Superior Court after any required claim.`,
      whatToTrack: [
        'The building or station and the device involved',
        'The maintenance/service company under contract',
        'How the device malfunctioned',
        'The permit and Cal/OSHA inspection history',
        'The maintenance and prior-repair records',
        'Surveillance video of the incident',
        'Whether a public entity (BART, Muni) was involved',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies both the San Francisco property owner and the maintenance company, requests the permit, inspection, and service history, preserves the video, and flags any six-month public-entity deadline for a transit-station device. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'It happened at a BART or Muni station. Does that change the deadline?',
        a: 'Yes, likely. If a public entity such as BART or Muni owns the device, the Government Claims Act requires a formal claim within six months of the injury \u2014 far shorter than the usual two years \u2014 so it must be assessed immediately.',
      },
      {
        q: 'Who is responsible for an elevator or escalator injury?',
        a: 'Often the property owner and the maintenance company that services the device. Because a passenger-carrying elevator or escalator is a common carrier in California, the operator owes a heightened duty of utmost care (Civil Code section 2100).',
      },
      {
        q: 'I do not know exactly what failed. Can I still have a claim?',
        a: 'Possibly. Where a device malfunctions in a way that ordinarily does not happen without negligence, res ipsa loquitur may help establish negligence. Preserving the device and maintenance records is still important.',
      },
      {
        q: 'Do inspection records matter?',
        a: 'Yes. California requires a permit and periodic Cal/OSHA inspection. A lapsed permit or an overdue or failed inspection is significant evidence the device was not maintained to standard.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the parties, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_ELEV_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Elevator & Escalator Injury Claims',
    title: 'San Diego Elevator & Escalator Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on an elevator or escalator in a San Diego hotel, mall, or trolley station? The owner and maintenance company owe a high duty \u2014 and records tell the story.',
    psychology: 'An elevator or escalator malfunctioned and hurt me in San Diego and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego elevator injury lawyer',
      'escalator accident claim california',
      'hotel elevator malfunction lawsuit california',
      'trolley station escalator injury attorney california',
      'elevator maintenance negligence california',
    ],
    signals: [
      'Owner & maintenance-company liability',
      'Common-carrier duty (Civil Code 2100)',
      'State permit & inspection (Cal/OSHA)',
      'Res ipsa loquitur may apply',
      'Preserve device & maintenance logs',
      'Six-month claim if public (transit)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s hotels, shopping centers, and trolley stations put heavy demand on elevators and escalators, and a device that drops, stops abruptly, or collapses can cause serious injury for which both the owner and the maintenance company may answer. ${DUTY} ${MAINTENANCE} ${INSPECTION} ${RES_IPSA} The deadline is generally two years, or six months if a public entity such as the transit system is involved. Civil cases are filed in San Diego County Superior Court after any required claim.`,
      whatToTrack: [
        'The building or station and the device involved',
        'The maintenance/service company under contract',
        'How the device malfunctioned',
        'The permit and Cal/OSHA inspection history',
        'The maintenance and prior-repair records',
        'Surveillance video of the incident',
        'Whether a public entity (transit) was involved',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies both the San Diego property owner and the maintenance company, requests the permit, inspection, and service history, preserves the video, and flags any six-month public-entity deadline for a transit-station device. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who is responsible for an elevator or escalator injury?',
        a: 'Often the property owner and the maintenance company that services the device. Because a passenger-carrying elevator or escalator is a common carrier in California, the operator owes a heightened duty of utmost care (Civil Code section 2100).',
      },
      {
        q: 'I do not know exactly what failed. Can I still have a claim?',
        a: 'Possibly. Where a device malfunctions in a way that ordinarily does not happen without negligence, res ipsa loquitur may help establish negligence. Preserving the device and maintenance records is still important.',
      },
      {
        q: 'Do inspection records matter?',
        a: 'Yes. California requires a permit and periodic Cal/OSHA inspection. A lapsed permit or an overdue or failed inspection is significant evidence the device was not maintained to standard.',
      },
      {
        q: 'It happened at a trolley station. Does that change the deadline?',
        a: 'It can. If a public transit agency owns the device, the Government Claims Act requires a formal claim within six months of the injury \u2014 far shorter than the usual two years \u2014 so it must be assessed immediately.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the parties, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_ELEV_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Elevator & Escalator Injury Claims',
    title: 'Sacramento Elevator & Escalator Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on an elevator or escalator in a Sacramento office building or light-rail station? A public building carries a six-month deadline \u2014 and records tell the story.',
    psychology: 'An elevator or escalator malfunctioned and hurt me in Sacramento and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento elevator injury lawyer',
      'escalator accident claim california',
      'elevator malfunction lawsuit california',
      'light rail station escalator injury attorney california',
      'elevator maintenance negligence california',
    ],
    signals: [
      'Owner & maintenance-company liability',
      'Common-carrier duty (Civil Code 2100)',
      'Public building/transit six-month claim',
      'State permit & inspection (Cal/OSHA)',
      'Res ipsa loquitur may apply',
      'Preserve device & maintenance logs',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s many state office buildings and light-rail stations mean elevator and escalator injuries here often involve a public entity \u2014 which triggers a much shorter deadline \u2014 in addition to the owner and maintenance company. ${DUTY} ${MAINTENANCE} ${INSPECTION} ${RES_IPSA} The deadline is generally two years, or six months if a public entity such as a state building or the light-rail system is involved. Civil cases are filed in Sacramento County Superior Court after any required claim.`,
      whatToTrack: [
        'The building or station and the device involved',
        'Whether a public entity (state building, light rail) owns it',
        'The maintenance/service company under contract',
        'How the device malfunctioned',
        'The permit and Cal/OSHA inspection history',
        'The maintenance and prior-repair records',
        'The date of injury, which starts any six-month clock',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether a Sacramento device is owned by a public entity \u2014 and its six-month deadline \u2014 identifies the maintenance company, and requests the permit, inspection, and service history along with any surveillance video. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'It happened in a state building or at a light-rail station. Does the deadline change?',
        a: 'Yes. If a public entity owns the device, the Government Claims Act requires a formal claim within six months of the injury (Government Code section 911.2) \u2014 far shorter than the usual two years \u2014 so it must be assessed immediately.',
      },
      {
        q: 'Who is responsible for an elevator or escalator injury?',
        a: 'Often the property owner and the maintenance company that services the device. Because a passenger-carrying elevator or escalator is a common carrier in California, the operator owes a heightened duty of utmost care (Civil Code section 2100).',
      },
      {
        q: 'I do not know exactly what failed. Can I still have a claim?',
        a: 'Possibly. Where a device malfunctions in a way that ordinarily does not happen without negligence, res ipsa loquitur may help establish negligence. Preserving the device and maintenance records is still important.',
      },
      {
        q: 'Do inspection records matter?',
        a: 'Yes. California requires a permit and periodic Cal/OSHA inspection. A lapsed permit or an overdue or failed inspection is significant evidence the device was not maintained to standard.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the parties, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const elevatorCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_ELEV_SLUG]: {
    scenario: `An LA mall escalator stopped abruptly, causing a pileup fall. The maintenance company\u2019s service logs showed a known issue, and res ipsa supported the claim against both the owner and the contractor. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the device and building; get medical care.'],
      ['First days', 'Send preservation demands for the device and video.'],
      ['First weeks', 'Request permit, inspection, and service history.'],
      ['Longer term', 'Owner and maintenance-company liability developed.'],
    ],
    severityLadder: [
      ['Two defendants', 'Owner and maintenance company.'],
      ['High duty', 'Common-carrier utmost care applies.'],
      ['Inspection', 'A lapse shows neglect.'],
      ['Res ipsa', 'The malfunction implies negligence.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the maintenance was negligent',
      'Whether the permit/inspection lapsed',
      'Whether res ipsa applies',
      'Whether the device and logs were preserved',
      'Whether a public entity shortens the deadline',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Two defendants', copy: 'Owner and contractor can answer.' },
      { label: 'High duty', copy: 'Common carriers owe utmost care.' },
      { label: 'Records decide it', copy: 'Service and inspection logs are key.' },
      { label: 'Preserve the device', copy: 'It supports res ipsa.' },
    ],
    insuranceProblems: [
      'Service logs and inspection history are never obtained.',
      'The device is repaired before it is examined.',
      'Surveillance video is overwritten.',
      'A public-entity six-month deadline is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it an elevator or escalator, and where?' },
      { label: 'Step 2', question: 'How did it malfunction?' },
      { label: 'Step 3', question: 'Who owns the building or station?' },
      { label: 'Step 4', question: 'Is there any video?' },
    ],
  },
  [SF_ELEV_SLUG]: {
    scenario: `A San Francisco BART-station escalator collapsed a step, causing a fall. Because a public entity owned it, a six-month claim was presented, and the inspection history was obtained. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the station and device; get medical care.'],
      ['Six-month mark', 'Present any public-entity claim in time.'],
      ['First weeks', 'Request permit, inspection, and service history.'],
      ['Longer term', 'Owner and maintenance-company liability developed.'],
    ],
    severityLadder: [
      ['Public entity?', 'It triggers a six-month claim.'],
      ['High duty', 'Common-carrier utmost care applies.'],
      ['Inspection', 'A lapse shows neglect.'],
      ['Res ipsa', 'The malfunction implies negligence.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public-entity six-month claim was met',
      'Whether the maintenance was negligent',
      'Whether the permit/inspection lapsed',
      'Whether res ipsa applies',
      'Whether the device and logs were preserved',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'A transit agency means six months.' },
      { label: 'High duty', copy: 'Common carriers owe utmost care.' },
      { label: 'Records decide it', copy: 'Inspection logs are key.' },
      { label: 'Two defendants', copy: 'Owner and contractor can answer.' },
    ],
    insuranceProblems: [
      'A public-entity six-month deadline is missed.',
      'Service logs and inspection history are never obtained.',
      'The device is repaired before it is examined.',
      'Surveillance video is overwritten.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it at a BART/Muni station or a building?' },
      { label: 'Step 2', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 3', question: 'How did the device malfunction?' },
      { label: 'Step 4', question: 'Is there any video?' },
    ],
  },
  [SD_ELEV_SLUG]: {
    scenario: `A San Diego hotel elevator misleveled and dropped, injuring a guest. The maintenance contractor\u2019s records revealed skipped service, supporting claims against the hotel and the contractor. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the hotel and device; get medical care.'],
      ['First days', 'Send preservation demands for the device and video.'],
      ['First weeks', 'Request permit, inspection, and service history.'],
      ['Longer term', 'Owner and maintenance-company liability developed.'],
    ],
    severityLadder: [
      ['Two defendants', 'Hotel and maintenance company.'],
      ['High duty', 'Common-carrier utmost care applies.'],
      ['Inspection', 'A lapse shows neglect.'],
      ['Res ipsa', 'The malfunction implies negligence.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the maintenance was negligent',
      'Whether the permit/inspection lapsed',
      'Whether res ipsa applies',
      'Whether the device and logs were preserved',
      'Whether a public entity shortens the deadline',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Two defendants', copy: 'Hotel and contractor can answer.' },
      { label: 'High duty', copy: 'Common carriers owe utmost care.' },
      { label: 'Records decide it', copy: 'Service history is key.' },
      { label: 'Preserve the device', copy: 'It supports res ipsa.' },
    ],
    insuranceProblems: [
      'Service logs and inspection history are never obtained.',
      'The device is repaired before it is examined.',
      'Surveillance video is overwritten.',
      'A public-entity six-month deadline is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it an elevator or escalator, and where?' },
      { label: 'Step 2', question: 'How did it malfunction?' },
      { label: 'Step 3', question: 'Who owns the building or station?' },
      { label: 'Step 4', question: 'Is there any video?' },
    ],
  },
  [SAC_ELEV_SLUG]: {
    scenario: `A Sacramento state-building elevator dropped between floors, injuring a worker. Recognising the public-entity owner, a six-month claim was presented, and the inspection permit was found to be overdue. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the building and device; get medical care.'],
      ['Six-month mark', 'Present any public-entity claim in time.'],
      ['First weeks', 'Request permit, inspection, and service history.'],
      ['Longer term', 'Owner and maintenance-company liability developed.'],
    ],
    severityLadder: [
      ['Public entity?', 'It triggers a six-month claim.'],
      ['High duty', 'Common-carrier utmost care applies.'],
      ['Inspection', 'An overdue permit shows neglect.'],
      ['Res ipsa', 'The malfunction implies negligence.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public-entity six-month claim was met',
      'Whether the maintenance was negligent',
      'Whether the permit/inspection lapsed',
      'Whether res ipsa applies',
      'Whether the device and logs were preserved',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'A public building means six months.' },
      { label: 'High duty', copy: 'Common carriers owe utmost care.' },
      { label: 'Records decide it', copy: 'Permit and inspection logs are key.' },
      { label: 'Two defendants', copy: 'Owner and contractor can answer.' },
    ],
    insuranceProblems: [
      'A public-entity six-month deadline is missed.',
      'Service logs and inspection history are never obtained.',
      'The device is repaired before it is examined.',
      'Surveillance video is overwritten.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a public building or transit station?' },
      { label: 'Step 2', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 3', question: 'How did the device malfunction?' },
      { label: 'Step 4', question: 'Is there any video?' },
    ],
  },
}
