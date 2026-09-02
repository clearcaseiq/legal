import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, aviation-accident practice area (general aviation, helicopter, and
 * charter): location-specific guides for Los Angeles, San Diego, San Jose, and
 * Sacramento, each anchored to a major general-aviation airport region.
 *
 * Aviation claims are among the most specialised in personal injury: they turn
 * on federal investigation procedures, a federal statute of repose that limits
 * manufacturer claims, and a multi-defendant structure spanning pilots,
 * operators, manufacturers, and maintenance facilities.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: Van Nuys is one of the busiest general-aviation airports in the
 *    country, with heavy charter and helicopter-tour activity.
 *  - San Diego: busy general-aviation fields alongside extensive military
 *    airspace.
 *  - San Jose: general-aviation and business-charter activity in the South Bay.
 *  - Sacramento: general-aviation fields serving a region with significant
 *    agricultural aviation.
 *
 * Applied accurately:
 *  - There are usually several potential defendants: the pilot or operator, a
 *    charter or tour company, the aircraft or component manufacturer (a product-
 *    liability claim), and a maintenance or repair facility. Where air traffic
 *    control is involved, a claim against the federal government runs through the
 *    Federal Tort Claims Act.
 *  - The National Transportation Safety Board investigates. Its factual findings
 *    can inform a case, but its probable-cause determination is not admissible in
 *    civil litigation (49 U.S.C. section 1154(b)), and the wreckage is in federal
 *    custody and must be preserved for examination.
 *  - The General Aviation Revitalization Act (GARA) sets an 18-year statute of
 *    repose that limits most claims against manufacturers of general-aviation
 *    aircraft and components, subject to exceptions. The ordinary two-year
 *    California deadline (Code of Civil Procedure section 335.1) applies to the
 *    non-manufacturer claims.
 *  - The evidence is technical: maintenance logs, the pilot\u2019s records and
 *    training, weather and air-traffic-control data, and expert examination of
 *    the wreckage.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Aviation claims involve overlapping federal and state rules; who is liable and which deadlines and defenses apply depend on facts a licensed attorney experienced in aviation should review promptly.'

const PARTIES =
  'An aviation crash usually has several potential defendants: the pilot or operator, a charter or tour company, the aircraft or component manufacturer (a product-liability claim), and a maintenance or repair facility whose work may have failed. Where air traffic control played a role, a claim against the federal government runs through the Federal Tort Claims Act. Identifying every responsible party early is essential.'

const NTSB =
  'The National Transportation Safety Board investigates civil aviation accidents. Its factual findings can inform a case, but its probable-cause determination is not admissible in civil litigation (49 U.S.C. section 1154(b)), so an independent expert analysis is required. The wreckage is held in federal custody during the investigation and must be preserved for later examination.'

const GARA =
  'The General Aviation Revitalization Act (GARA) sets an 18-year federal statute of repose that limits most claims against manufacturers of general-aviation aircraft and components, subject to important exceptions. It does not bar claims against pilots, operators, or maintenance providers, which follow the ordinary two-year California deadline (Code of Civil Procedure section 335.1). Assessing GARA early is critical to a manufacturer claim.'

const EVIDENCE =
  'Aviation cases are built on technical evidence: the aircraft\u2019s maintenance logs and airworthiness records, the pilot\u2019s certificates, training, and hours, the weather briefing and air-traffic-control communications and radar data, and an expert examination of the wreckage. Securing and preserving these records early is central to establishing what failed.'

export const LA_AV_SLUG = '/los-angeles-aviation-accident-claim'
export const SD_AV_SLUG = '/san-diego-aviation-accident-claim'
export const SJ_AV_SLUG = '/san-jose-aviation-accident-claim'
export const SAC_AV_SLUG = '/sacramento-aviation-accident-claim'

export const aviationCityGuidePages: LandingPage[] = [
  {
    slug: LA_AV_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Aviation & Helicopter Accident Claims',
    title: 'Los Angeles Aviation & Helicopter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured in an LA-area small-plane or helicopter crash? Several parties may be liable, the NTSB report is not the last word, and GARA can limit manufacturer claims.',
    psychology: 'A small plane or helicopter crash hurt me or my family near LA and I have no idea who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles aviation accident lawyer',
      'helicopter crash claim california',
      'small plane crash lawsuit california',
      'charter flight injury attorney california',
      'ntsb report civil case california',
    ],
    signals: [
      'Pilot, operator, maker & maintenance',
      'NTSB probable cause not admissible',
      'GARA 18-year repose (manufacturers)',
      'Preserve wreckage & maintenance logs',
      'FTCA where ATC is involved',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `With Van Nuys among the busiest general-aviation airports in the country and heavy charter and helicopter-tour activity, the Los Angeles area sees more small-aircraft operations \u2014 and crashes \u2014 than almost anywhere, and each case is a specialised, multi-defendant matter. ${PARTIES} ${NTSB} ${GARA} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court, or in federal court where an FTCA claim is involved.`,
      whatToTrack: [
        'The aircraft, operator, and type of flight (charter, tour, private)',
        'The NTSB investigation and case number',
        'Preservation of the wreckage and maintenance logs',
        'The pilot\u2019s certificates, training, and hours',
        'Weather, ATC communications, and radar data',
        'The aircraft and component manufacturers, for GARA',
        'Whether air traffic control may have contributed',
        'Medical treatment and, in a fatality, wrongful-death eligibility',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every potential defendant in an LA-area crash \u2014 pilot, operator, manufacturer, maintenance provider, and any ATC role \u2014 arranges preservation of the wreckage and records, and flags GARA and FTCA issues for aviation counsel. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who can be responsible for a small-plane or helicopter crash?',
        a: 'Often several parties: the pilot or operator, a charter or tour company, the aircraft or component manufacturer, and a maintenance or repair facility. Where air traffic control contributed, the federal government can be a defendant through the Federal Tort Claims Act. Identifying every party early is essential.',
      },
      {
        q: 'The NTSB will find the cause. Does that decide my case?',
        a: 'No. The NTSB investigates and its factual findings can inform a case, but its probable-cause determination is not admissible in civil litigation (49 U.S.C. section 1154(b)). An independent expert analysis of the wreckage and records is required.',
      },
      {
        q: 'The aircraft was old. Can I still sue the manufacturer?',
        a: 'It depends on GARA. The General Aviation Revitalization Act sets an 18-year statute of repose limiting most claims against manufacturers of general-aviation aircraft and components, with exceptions. It does not bar claims against pilots, operators, or maintenance providers. Assessing GARA early is critical.',
      },
      {
        q: 'What must be preserved?',
        a: 'The wreckage \u2014 which is in federal custody during the investigation \u2014 along with the maintenance logs, the pilot\u2019s records, and the weather and air-traffic-control data. Securing these early is central to proving what failed.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the parties, the records, and the deadlines so a licensed California attorney experienced in aviation can review a complete file.',
      },
    ],
  },
  {
    slug: SD_AV_SLUG,
    category: 'Cities',
    cluster: 'San Diego Aviation & Helicopter Accident Claims',
    title: 'San Diego Aviation & Helicopter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured in a San Diego-area aircraft crash? Several parties may be liable, and where military airspace or ATC is involved, a federal claim may apply.',
    psychology: 'An aircraft crash hurt me or my family near San Diego, possibly involving military airspace, and I do not know the rules.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego aviation accident lawyer',
      'helicopter crash claim california',
      'small plane crash lawsuit california',
      'military aircraft accident claim california',
      'charter flight injury attorney california',
    ],
    signals: [
      'Pilot, operator, maker & maintenance',
      'Military airspace / FTCA issues',
      'NTSB probable cause not admissible',
      'GARA 18-year repose (manufacturers)',
      'Preserve wreckage & maintenance logs',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s busy general-aviation fields sit alongside extensive military airspace, so an aircraft crash here can involve not only the usual private defendants but federal actors \u2014 changing the path to a federal claim. ${PARTIES} ${NTSB} ${GARA} ${EVIDENCE} Civil cases are filed in San Diego County Superior Court, or in federal court where an FTCA claim is involved.`,
      whatToTrack: [
        'The aircraft, operator, and type of flight',
        'Whether military airspace, aircraft, or ATC was involved',
        'The NTSB investigation and case number',
        'Preservation of the wreckage and maintenance logs',
        'The pilot\u2019s certificates, training, and hours',
        'Weather, ATC communications, and radar data',
        'The aircraft and component manufacturers, for GARA',
        'Medical treatment and, in a fatality, wrongful-death eligibility',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether a San Diego-area crash involves a private operator or a federal/military actor \u2014 which decides the path \u2014 maps every defendant, arranges preservation of the wreckage and records, and flags GARA and FTCA issues. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Military airspace or aircraft may have been involved. Does that change my claim?',
        a: 'It can. A claim against the federal government \u2014 including for the role of military aircraft or air traffic control \u2014 runs through the Federal Tort Claims Act, which requires an administrative claim first and follows federal rules. Identifying any federal role early is essential.',
      },
      {
        q: 'Who can be responsible for an aircraft crash?',
        a: 'Often several parties: the pilot or operator, a charter or tour company, the aircraft or component manufacturer, and a maintenance or repair facility \u2014 plus the federal government where ATC or a federal aircraft contributed.',
      },
      {
        q: 'Does the NTSB report decide my case?',
        a: 'No. Its factual findings can inform a case, but its probable-cause determination is not admissible in civil litigation (49 U.S.C. section 1154(b)). Independent expert analysis is required.',
      },
      {
        q: 'The aircraft was old. Can I still sue the manufacturer?',
        a: 'It depends on GARA\u2019s 18-year statute of repose, which limits most manufacturer claims with exceptions but does not bar claims against pilots, operators, or maintenance providers. Assessing it early is critical.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the parties, the records, and the deadlines so a licensed attorney experienced in aviation can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_AV_SLUG,
    category: 'Cities',
    cluster: 'San Jose Aviation & Charter Accident Claims',
    title: 'San Jose Aviation & Charter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured in a South Bay small-plane, charter, or helicopter crash? Several parties may be liable, the NTSB report is not the last word, and GARA can limit maker claims.',
    psychology: 'A small plane or charter crash hurt me or my family near San Jose and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose aviation accident lawyer',
      'small plane crash lawsuit california',
      'charter flight injury claim california',
      'helicopter crash attorney california',
      'ntsb report civil case california',
    ],
    signals: [
      'Pilot, operator, maker & maintenance',
      'NTSB probable cause not admissible',
      'GARA 18-year repose (manufacturers)',
      'Preserve wreckage & maintenance logs',
      'FTCA where ATC is involved',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `The South Bay\u2019s general-aviation and business-charter activity means small-aircraft and helicopter crashes around San Jose are specialised, multi-defendant cases that turn on federal procedure and technical evidence. ${PARTIES} ${NTSB} ${GARA} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court, or in federal court where an FTCA claim is involved.`,
      whatToTrack: [
        'The aircraft, operator, and type of flight (charter, business, private)',
        'The NTSB investigation and case number',
        'Preservation of the wreckage and maintenance logs',
        'The pilot\u2019s certificates, training, and hours',
        'Weather, ATC communications, and radar data',
        'The aircraft and component manufacturers, for GARA',
        'Whether air traffic control may have contributed',
        'Medical treatment and, in a fatality, wrongful-death eligibility',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every potential defendant in a South Bay crash, arranges preservation of the wreckage and records, obtains the weather and ATC data, and flags GARA and FTCA issues for aviation counsel. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who can be responsible for a small-plane or charter crash?',
        a: 'Often several parties: the pilot or operator, a charter company, the aircraft or component manufacturer, and a maintenance or repair facility. Where air traffic control contributed, the federal government can be a defendant through the FTCA.',
      },
      {
        q: 'Does the NTSB report decide my case?',
        a: 'No. Its factual findings can inform a case, but its probable-cause determination is not admissible in civil litigation (49 U.S.C. section 1154(b)). An independent expert analysis of the wreckage and records is required.',
      },
      {
        q: 'The aircraft was old. Can I still sue the manufacturer?',
        a: 'It depends on GARA\u2019s 18-year statute of repose, which limits most manufacturer claims with exceptions but does not bar claims against pilots, operators, or maintenance providers. Assessing it early is critical.',
      },
      {
        q: 'What must be preserved?',
        a: 'The wreckage \u2014 in federal custody during the investigation \u2014 along with the maintenance logs, the pilot\u2019s records, and the weather and air-traffic-control data. Securing these early is central.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the parties, the records, and the deadlines so a licensed attorney experienced in aviation can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_AV_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Aviation & Agricultural-Aircraft Accident Claims',
    title: 'Sacramento Aviation & Agricultural-Aircraft Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured in a Sacramento-area aircraft crash, including ag aviation? Several parties may be liable, and GARA and NTSB rules shape every aviation claim.',
    psychology: 'An aircraft crash hurt me or my family near Sacramento, maybe an ag plane, and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento aviation accident lawyer',
      'small plane crash lawsuit california',
      'crop duster accident claim california',
      'helicopter crash attorney california',
      'charter flight injury claim california',
    ],
    signals: [
      'Pilot, operator, maker & maintenance',
      'Agricultural-aviation operators',
      'NTSB probable cause not admissible',
      'GARA 18-year repose (manufacturers)',
      'Preserve wreckage & maintenance logs',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `The Sacramento region\u2019s general-aviation fields serve an area with significant agricultural aviation, so crashes here can involve crop-dusting and other ag operators in addition to the usual private and charter flights \u2014 each a specialised, multi-defendant case. ${PARTIES} ${NTSB} ${GARA} ${EVIDENCE} Civil cases are filed in Sacramento County Superior Court, or in federal court where an FTCA claim is involved.`,
      whatToTrack: [
        'The aircraft, operator, and type of flight (private, charter, ag)',
        'The NTSB investigation and case number',
        'Preservation of the wreckage and maintenance logs',
        'The pilot\u2019s certificates, training, and hours',
        'Weather, ATC communications, and radar data',
        'The aircraft and component manufacturers, for GARA',
        'Whether air traffic control may have contributed',
        'Medical treatment and, in a fatality, wrongful-death eligibility',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every potential defendant in a Sacramento-area crash \u2014 including agricultural operators \u2014 arranges preservation of the wreckage and records, and flags GARA and FTCA issues for aviation counsel. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who can be responsible for an aircraft crash?',
        a: 'Often several parties: the pilot or operator (including an agricultural operator), a charter company, the aircraft or component manufacturer, and a maintenance or repair facility. Where air traffic control contributed, the federal government can be a defendant through the FTCA.',
      },
      {
        q: 'Does the NTSB report decide my case?',
        a: 'No. Its factual findings can inform a case, but its probable-cause determination is not admissible in civil litigation (49 U.S.C. section 1154(b)). Independent expert analysis is required.',
      },
      {
        q: 'The aircraft was old. Can I still sue the manufacturer?',
        a: 'It depends on GARA\u2019s 18-year statute of repose, which limits most manufacturer claims with exceptions but does not bar claims against pilots, operators, or maintenance providers. Assessing it early is critical.',
      },
      {
        q: 'What must be preserved?',
        a: 'The wreckage \u2014 in federal custody during the investigation \u2014 along with the maintenance logs, the pilot\u2019s records, and the weather and air-traffic-control data. Securing these early is central.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the parties, the records, and the deadlines so a licensed attorney experienced in aviation can review a complete file.',
      },
    ],
  },
]

export const aviationCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_AV_SLUG]: {
    scenario: `An LA-area helicopter tour crashed. Beyond the NTSB inquiry, an independent expert examined the preserved wreckage and maintenance logs, and claims proceeded against the operator and a component maker. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the operator and aircraft; locate the NTSB case.'],
      ['First weeks', 'Preserve the wreckage and secure maintenance logs.'],
      ['Investigation', 'Independent experts examine the evidence.'],
      ['Longer term', 'Multi-defendant liability and GARA issues developed.'],
    ],
    severityLadder: [
      ['Parties', 'Pilot, operator, maker, maintenance.'],
      ['NTSB limits', 'Probable cause is not admissible.'],
      ['GARA', 'Repose may limit maker claims.'],
      ['Evidence', 'Wreckage and logs must be preserved.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Records establish the injuries.' },
      { label: 'Specialist care', copy: 'Severe trauma is documented.' },
      { label: 'Continuing care', copy: 'Long-term needs are assessed.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'How many liable parties are identified',
      'Whether the wreckage and logs are preserved',
      'The strength of independent expert analysis',
      'Whether GARA limits a manufacturer claim',
      'Whether ATC (FTCA) contributed',
      'Injury severity or wrongful-death eligibility',
    ],
    settlementValueDetails: [
      { label: 'Multiple defendants', copy: 'Several parties may answer.' },
      { label: 'Experts decide it', copy: 'The NTSB report does not.' },
      { label: 'Watch GARA', copy: 'Repose can bar a maker claim.' },
      { label: 'Preserve evidence', copy: 'Wreckage and logs are key.' },
    ],
    insuranceProblems: [
      'The case leans on the inadmissible NTSB probable cause.',
      'The wreckage or logs are not preserved for experts.',
      'A GARA exception is never explored.',
      'An ATC (FTCA) role is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What type of flight and aircraft was it?' },
      { label: 'Step 2', question: 'Who operated the flight?' },
      { label: 'Step 3', question: 'Is there an NTSB case number?' },
      { label: 'Step 4', question: 'Where is the wreckage now?' },
    ],
  },
  [SD_AV_SLUG]: {
    scenario: `A San Diego-area crash raised a possible air-traffic-control role. Identifying the federal element routed part of the claim through the FTCA while private claims proceeded in state court. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Determine any military or ATC involvement.'],
      ['First weeks', 'Preserve the wreckage; secure logs and ATC data.'],
      ['Path', 'Split federal (FTCA) and state claims accordingly.'],
      ['Longer term', 'Multi-defendant liability and GARA issues developed.'],
    ],
    severityLadder: [
      ['Federal role?', 'Military or ATC changes the path.'],
      ['Parties', 'Pilot, operator, maker, maintenance.'],
      ['NTSB limits', 'Probable cause is not admissible.'],
      ['GARA', 'Repose may limit maker claims.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Records establish the injuries.' },
      { label: 'Specialist care', copy: 'Severe trauma is documented.' },
      { label: 'Continuing care', copy: 'Long-term needs are assessed.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a federal (FTCA) role exists',
      'How many liable parties are identified',
      'Whether the wreckage and logs are preserved',
      'The strength of independent expert analysis',
      'Whether GARA limits a manufacturer claim',
      'Injury severity or wrongful-death eligibility',
    ],
    settlementValueDetails: [
      { label: 'Federal path', copy: 'ATC or military means FTCA.' },
      { label: 'Multiple defendants', copy: 'Several parties may answer.' },
      { label: 'Experts decide it', copy: 'The NTSB report does not.' },
      { label: 'Watch GARA', copy: 'Repose can bar a maker claim.' },
    ],
    insuranceProblems: [
      'A federal (FTCA) role is overlooked.',
      'The case leans on the inadmissible NTSB probable cause.',
      'The wreckage or logs are not preserved.',
      'A GARA exception is never explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was military airspace or ATC involved?' },
      { label: 'Step 2', question: 'What type of flight and aircraft was it?' },
      { label: 'Step 3', question: 'Is there an NTSB case number?' },
      { label: 'Step 4', question: 'Where is the wreckage now?' },
    ],
  },
  [SJ_AV_SLUG]: {
    scenario: `A South Bay charter crash was blamed by insurers on pilot error alone. An independent expert examination of the maintenance logs revealed a component failure, adding a manufacturer claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the operator and aircraft; locate the NTSB case.'],
      ['First weeks', 'Preserve the wreckage and secure maintenance logs.'],
      ['Investigation', 'Independent experts examine the components.'],
      ['Longer term', 'Multi-defendant liability and GARA issues developed.'],
    ],
    severityLadder: [
      ['Beyond pilot error', 'Components and maintenance are examined.'],
      ['Parties', 'Pilot, operator, maker, maintenance.'],
      ['NTSB limits', 'Probable cause is not admissible.'],
      ['GARA', 'Repose may limit maker claims.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Records establish the injuries.' },
      { label: 'Specialist care', copy: 'Severe trauma is documented.' },
      { label: 'Continuing care', copy: 'Long-term needs are assessed.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a component or maintenance failure is found',
      'How many liable parties are identified',
      'Whether the wreckage and logs are preserved',
      'The strength of independent expert analysis',
      'Whether GARA limits a manufacturer claim',
      'Injury severity or wrongful-death eligibility',
    ],
    settlementValueDetails: [
      { label: 'Not just the pilot', copy: 'Components may have failed.' },
      { label: 'Experts decide it', copy: 'The NTSB report does not.' },
      { label: 'Multiple defendants', copy: 'Several parties may answer.' },
      { label: 'Watch GARA', copy: 'Repose can bar a maker claim.' },
    ],
    insuranceProblems: [
      'Everything is blamed on the pilot with no expert review.',
      'The wreckage or logs are not preserved.',
      'A GARA exception is never explored.',
      'The case leans on the inadmissible NTSB probable cause.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What type of flight and aircraft was it?' },
      { label: 'Step 2', question: 'Who operated and maintained the aircraft?' },
      { label: 'Step 3', question: 'Is there an NTSB case number?' },
      { label: 'Step 4', question: 'Where is the wreckage now?' },
    ],
  },
  [SAC_AV_SLUG]: {
    scenario: `A Sacramento-area agricultural aircraft crashed. Identifying the ag operator and preserving the maintenance logs and wreckage set up claims against the operator and a component maker. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the operator (including ag) and aircraft.'],
      ['First weeks', 'Preserve the wreckage and secure maintenance logs.'],
      ['Investigation', 'Independent experts examine the evidence.'],
      ['Longer term', 'Multi-defendant liability and GARA issues developed.'],
    ],
    severityLadder: [
      ['Operator type', 'Ag operators add specific issues.'],
      ['Parties', 'Pilot, operator, maker, maintenance.'],
      ['NTSB limits', 'Probable cause is not admissible.'],
      ['GARA', 'Repose may limit maker claims.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Records establish the injuries.' },
      { label: 'Specialist care', copy: 'Severe trauma is documented.' },
      { label: 'Continuing care', copy: 'Long-term needs are assessed.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'How many liable parties are identified',
      'Whether the wreckage and logs are preserved',
      'The strength of independent expert analysis',
      'Whether GARA limits a manufacturer claim',
      'Whether ATC (FTCA) contributed',
      'Injury severity or wrongful-death eligibility',
    ],
    settlementValueDetails: [
      { label: 'Operator matters', copy: 'Ag operators raise specific issues.' },
      { label: 'Experts decide it', copy: 'The NTSB report does not.' },
      { label: 'Multiple defendants', copy: 'Several parties may answer.' },
      { label: 'Watch GARA', copy: 'Repose can bar a maker claim.' },
    ],
    insuranceProblems: [
      'The wreckage or logs are not preserved for experts.',
      'The case leans on the inadmissible NTSB probable cause.',
      'A GARA exception is never explored.',
      'An ATC (FTCA) role is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What type of flight and aircraft was it?' },
      { label: 'Step 2', question: 'Who operated the aircraft?' },
      { label: 'Step 3', question: 'Is there an NTSB case number?' },
      { label: 'Step 4', question: 'Where is the wreckage now?' },
    ],
  },
}
