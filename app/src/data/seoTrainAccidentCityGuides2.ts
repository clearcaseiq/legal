import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, train / rail-accident practice area (batch 2):
 * location-specific guides for Oakland, Anaheim, Fresno, and Riverside,
 * extending the batch-1 hub (Los Angeles, San Jose, San Diego, Sacramento).
 *
 * Applied accurately (identical framework to batch 1):
 *  - Passenger railroads are common carriers owing the highest duty (Civil Code
 *    2100/2101).
 *  - Grade-crossing collisions can involve the railroad, the public crossing
 *    entity, and freight operators.
 *  - Who was hurt shapes the claim (passenger / motorist-pedestrian / FELA employee).
 *  - Public rail operators trigger the six-month Government Claims Act deadline
 *    (Gov. Code 911.2).
 *  - Rail evidence (event recorder, signal logs, video) is perishable; some
 *    crossing-design claims raise federal preemption.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Which parties are liable, whether a six-month claim applies, and how federal rules affect a rail case depend on facts a licensed California attorney should review promptly.'

const COMMON_CARRIER =
  'A passenger railroad is a common carrier and owes its passengers the highest duty of care consistent with practical operation (Civil Code sections 2100 and 2101) \u2014 a higher standard than ordinary negligence. A passenger hurt by a sudden stop, a derailment, a boarding-gap fall, or an on-board hazard is owed that heightened duty.'

const GRADE_CROSSING =
  'A grade-crossing collision \u2014 where a road meets the tracks \u2014 can involve several defendants at once: the railroad that operated the train, the public entity responsible for the crossing and its warning devices (gates, lights, signage, sightlines), and any freight operator that shares the corridor. Whether the crossing\u2019s warnings and design were adequate is often the central question.'

const WHO =
  'Who was hurt shapes the claim. A fare-paying passenger is owed the common carrier\u2019s highest duty; a motorist or pedestrian struck at a crossing pursues the railroad and the entity responsible for the crossing; and an injured railroad employee is covered not by workers\u2019 compensation but by the Federal Employers Liability Act (FELA), a fault-based federal system.'

const SIX_MONTH =
  'Where the rail operator is a public entity \u2014 as the major California commuter and intercity systems are \u2014 the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit can be filed, far shorter than the two-year deadline for an ordinary injury claim. Missing it can bar the claim, so a rail case must be assessed immediately.'

const EVIDENCE =
  'Rail evidence is time-sensitive and largely in the operator\u2019s hands: the locomotive event recorder (the train\u2019s \u201cblack box\u201d), signal and crossing-maintenance logs, dispatch records, and on-board and crossing video. A prompt preservation demand is essential before this data is overwritten, and some crossing-design claims raise federal-preemption questions that must be navigated.'

export const OAK_TRAIN_SLUG = '/oakland-train-accident'
export const ANAHEIM_TRAIN_SLUG = '/anaheim-train-accident'
export const FRESNO_TRAIN_SLUG = '/fresno-train-accident'
export const RIV_TRAIN_SLUG = '/riverside-train-accident'

export const trainAccidentCityGuidePages2: LandingPage[] = [
  {
    slug: OAK_TRAIN_SLUG,
    category: 'Cities',
    cluster: 'Oakland Train & Rail Accident Claims',
    title: 'Oakland Train & Rail Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on BART, Amtrak, Capitol Corridor, or at a rail crossing in Oakland? A passenger railroad owes the highest duty of care \u2014 and a public operator can trigger a six-month deadline.',
    psychology: 'I was hurt in an Oakland rail incident and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland train accident lawyer',
      'bart injury claim california',
      'railroad crossing collision california',
      'six month government claim rail california',
      'common carrier highest duty train california',
    ],
    signals: [
      'Common carrier highest duty',
      'Grade-crossing defendants',
      'Passenger vs. crossing vs. FELA',
      'Six-month public-entity claim',
      'Perishable event-recorder data',
      'Possible federal preemption',
    ],
    sections: {
      whyItMatters: `Oakland is a dense rail hub \u2014 BART, Amtrak, Capitol Corridor, and freight corridors \u2014 so passenger injuries, grade-crossing collisions, and pedestrian strikes are all common. ${COMMON_CARRIER} ${GRADE_CROSSING} ${WHO} ${SIX_MONTH} ${EVIDENCE} Civil cases are filed in Alameda County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether you were a passenger, motorist, pedestrian, or employee',
        'Which rail operator was involved',
        'Whether the operator is a public entity (six-month claim)',
        'The crossing\u2019s gates, lights, signage, and sightlines',
        'The event recorder and signal/dispatch logs',
        'On-board and crossing video',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the six-month public-entity deadline immediately, sends a preservation demand for the event recorder and video, and identifies the railroad and the crossing entity as separate defendants. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt as a BART passenger. What duty applies?',
        a: 'A passenger railroad is a common carrier owing the highest duty of care consistent with practical operation (Civil Code 2100/2101) \u2014 higher than ordinary negligence.',
      },
      {
        q: 'How long do I have to file against a public rail operator?',
        a: 'Where the operator is a public entity, the Government Claims Act requires a written claim within six months of the injury (Government Code 911.2) before suit \u2014 far shorter than two years.',
      },
      {
        q: 'Who is responsible for a crossing collision?',
        a: 'Potentially the railroad, the public entity responsible for the crossing and its warning devices, and any freight operator sharing the corridor. Whether the warnings and design were adequate is often central.',
      },
      {
        q: 'What evidence needs to be preserved?',
        a: 'The locomotive event recorder, signal and crossing-maintenance logs, dispatch records, and on-board and crossing video \u2014 through a prompt demand before it is overwritten.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the rail evidence and flags deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_TRAIN_SLUG,
    category: 'Cities',
    cluster: 'Anaheim Train & Rail Accident Claims',
    title: 'Anaheim Train & Rail Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on Metrolink, Amtrak, or at a rail crossing in Anaheim? A passenger railroad owes the highest duty of care \u2014 and a public operator can trigger a six-month deadline.',
    psychology: 'I was hurt in an Anaheim rail incident and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim train accident lawyer',
      'metrolink injury claim california',
      'railroad crossing collision california',
      'six month government claim rail california',
      'common carrier highest duty train california',
    ],
    signals: [
      'Common carrier highest duty',
      'Grade-crossing defendants',
      'Passenger vs. crossing vs. FELA',
      'Six-month public-entity claim',
      'Perishable event-recorder data',
      'Possible federal preemption',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s ARTIC hub, Metrolink and Amtrak service, and shared freight corridors near the resort district produce passenger injuries and grade-crossing collisions. ${COMMON_CARRIER} ${GRADE_CROSSING} ${WHO} ${SIX_MONTH} ${EVIDENCE} Civil cases are filed in Orange County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether you were a passenger, motorist, pedestrian, or employee',
        'Which rail operator was involved',
        'Whether the operator is a public entity (six-month claim)',
        'The crossing\u2019s gates, lights, signage, and sightlines',
        'The event recorder and signal/dispatch logs',
        'On-board and crossing video',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the six-month public-entity deadline immediately, sends a preservation demand for the event recorder and video, and identifies the railroad and the crossing entity as separate defendants. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt as a Metrolink passenger. What duty applies?',
        a: 'A passenger railroad is a common carrier owing the highest duty of care consistent with practical operation (Civil Code 2100/2101) \u2014 higher than ordinary negligence.',
      },
      {
        q: 'How long do I have to file against a public rail operator?',
        a: 'Where the operator is a public entity, the Government Claims Act requires a written claim within six months (Government Code 911.2) before suit \u2014 far shorter than two years.',
      },
      {
        q: 'Who is responsible for a crossing collision?',
        a: 'Potentially the railroad, the public entity responsible for the crossing and its warning devices, and any freight operator sharing the corridor.',
      },
      {
        q: 'What evidence needs to be preserved?',
        a: 'The locomotive event recorder, signal and crossing-maintenance logs, dispatch records, and on-board and crossing video \u2014 through a prompt demand before it is overwritten.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the rail evidence and flags deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_TRAIN_SLUG,
    category: 'Cities',
    cluster: 'Fresno Train & Rail Accident Claims',
    title: 'Fresno Train & Rail Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on Amtrak San Joaquins, at a rail crossing, or by freight rail in Fresno? A passenger railroad owes the highest duty of care \u2014 and a public operator can trigger a six-month deadline.',
    psychology: 'I was hurt in a Fresno rail incident and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno train accident lawyer',
      'amtrak san joaquins injury claim california',
      'railroad crossing collision california',
      'six month government claim rail california',
      'freight train pedestrian california',
    ],
    signals: [
      'Common carrier highest duty',
      'Grade-crossing defendants',
      'Passenger vs. crossing vs. FELA',
      'Six-month public-entity claim',
      'Perishable event-recorder data',
      'Possible federal preemption',
    ],
    sections: {
      whyItMatters: `Fresno sits on the busy San Joaquin Valley rail corridor \u2014 Amtrak San Joaquins, heavy freight, and numerous at-grade crossings \u2014 where crossing collisions and pedestrian strikes are recurring. ${COMMON_CARRIER} ${GRADE_CROSSING} ${WHO} ${SIX_MONTH} ${EVIDENCE} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether you were a passenger, motorist, pedestrian, or employee',
        'Which rail operator was involved',
        'Whether the operator is a public entity (six-month claim)',
        'The crossing\u2019s gates, lights, signage, and sightlines',
        'The event recorder and signal/dispatch logs',
        'On-board and crossing video',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the six-month public-entity deadline immediately, sends a preservation demand for the event recorder and video, and identifies the railroad and the crossing entity as separate defendants. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A train hit a vehicle at a Fresno crossing. Who is responsible?',
        a: 'Potentially the railroad, the public entity responsible for the crossing and its warning devices, and any freight operator sharing the corridor. Whether the warnings and design were adequate is often central.',
      },
      {
        q: 'How long do I have to file against a public rail operator?',
        a: 'Where the operator is a public entity, the Government Claims Act requires a written claim within six months (Government Code 911.2) before suit \u2014 far shorter than two years.',
      },
      {
        q: 'I was hurt as an Amtrak passenger. What duty applies?',
        a: 'A passenger railroad is a common carrier owing the highest duty of care consistent with practical operation (Civil Code 2100/2101).',
      },
      {
        q: 'What evidence needs to be preserved?',
        a: 'The locomotive event recorder, signal and crossing-maintenance logs, dispatch records, and any crossing video \u2014 through a prompt demand before it is overwritten.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the rail evidence and flags deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIV_TRAIN_SLUG,
    category: 'Cities',
    cluster: 'Riverside Train & Rail Accident Claims',
    title: 'Riverside Train & Rail Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on Metrolink, at a rail crossing, or by freight rail in Riverside? A passenger railroad owes the highest duty of care \u2014 and a public operator can trigger a six-month deadline.',
    psychology: 'I was hurt in a Riverside rail incident and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside train accident lawyer',
      'metrolink injury claim california',
      'railroad crossing collision california',
      'six month government claim rail california',
      'freight train crossing california',
    ],
    signals: [
      'Common carrier highest duty',
      'Grade-crossing defendants',
      'Passenger vs. crossing vs. FELA',
      'Six-month public-entity claim',
      'Perishable event-recorder data',
      'Possible federal preemption',
    ],
    sections: {
      whyItMatters: `Riverside is a major Inland Empire rail junction with heavy freight traffic, Metrolink commuter service, and numerous at-grade crossings, where crossing collisions and pedestrian strikes are frequent. ${COMMON_CARRIER} ${GRADE_CROSSING} ${WHO} ${SIX_MONTH} ${EVIDENCE} Civil cases are filed in Riverside County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether you were a passenger, motorist, pedestrian, or employee',
        'Which rail operator was involved',
        'Whether the operator is a public entity (six-month claim)',
        'The crossing\u2019s gates, lights, signage, and sightlines',
        'The event recorder and signal/dispatch logs',
        'On-board and crossing video',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the six-month public-entity deadline immediately, sends a preservation demand for the event recorder and video, and identifies the railroad and the crossing entity as separate defendants. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A freight train hit a vehicle at a Riverside crossing. Who is responsible?',
        a: 'Potentially the railroad that operated the train, the public entity responsible for the crossing and its warning devices, and any freight operator sharing the corridor.',
      },
      {
        q: 'How long do I have to file against a public rail operator?',
        a: 'Where the operator is a public entity, the Government Claims Act requires a written claim within six months (Government Code 911.2) before suit \u2014 far shorter than two years.',
      },
      {
        q: 'I was hurt as a Metrolink passenger. What duty applies?',
        a: 'A passenger railroad is a common carrier owing the highest duty of care consistent with practical operation (Civil Code 2100/2101).',
      },
      {
        q: 'What evidence needs to be preserved?',
        a: 'The locomotive event recorder, signal and crossing-maintenance logs, dispatch records, and any crossing video \u2014 through a prompt demand before it is overwritten.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the rail evidence and flags deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const trainAccidentCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [OAK_TRAIN_SLUG]: {
    scenario: `An Oakland BART passenger was injured in a sudden stop. Because BART is a public common carrier, the claim ran under the highest-duty standard with the six-month Government Claims Act deadline controlling. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; note the operator and car.'],
      ['First days', 'Identify whether the operator is a public entity.'],
      ['First weeks', 'File or preserve the six-month claim.'],
      ['Longer term', 'Preserve the event recorder and video.'],
    ],
    severityLadder: [
      ['Passenger', 'Common carrier owes highest duty.'],
      ['Crossing', 'Railroad plus crossing entity.'],
      ['Public entity', 'Six-month claim applies.'],
      ['Evidence', 'Event-recorder data is perishable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the highest duty was breached',
      'Whether the six-month deadline was met',
      'Whether the event recorder was preserved',
      'Who was hurt and in what role',
      'Injury severity and treatment continuity',
      'Whether video corroborates the account',
    ],
    settlementValueDetails: [
      { label: 'Duty', copy: 'The highest-duty standard aids passengers.' },
      { label: 'Deadline', copy: 'A public entity shortens it to six months.' },
      { label: 'Evidence', copy: 'The black box and video are decisive.' },
      { label: 'Role', copy: 'Passenger, motorist, or FELA changes the claim.' },
    ],
    insuranceProblems: [
      'The six-month deadline is missed.',
      'The event recorder is overwritten.',
      'The crossing entity is never joined.',
      'Video is lost before a demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger, motorist, or pedestrian?' },
      { label: 'Step 2', question: 'Which rail operator was involved?' },
      { label: 'Step 3', question: 'When did it happen?' },
      { label: 'Step 4', question: 'Was it at a crossing?' },
    ],
  },
  [ANAHEIM_TRAIN_SLUG]: {
    scenario: `A motorist was struck at an Anaheim grade crossing where the gate timing was in question. Claims ran against the railroad and the public crossing entity, with a six-month claim filed. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the crossing.'],
      ['First days', 'Identify the railroad and crossing entity.'],
      ['First weeks', 'File or preserve the six-month claim.'],
      ['Longer term', 'Preserve the event recorder and signal logs.'],
    ],
    severityLadder: [
      ['Crossing', 'Railroad plus crossing entity.'],
      ['Warnings', 'Gates, lights, and sightlines matter.'],
      ['Public entity', 'Six-month claim applies.'],
      ['Preemption', 'Some design claims raise it.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the crossing warnings were adequate',
      'Whether the six-month deadline was met',
      'Whether the event recorder was preserved',
      'Whether federal preemption is raised',
      'Injury severity and treatment continuity',
      'Whether video corroborates the account',
    ],
    settlementValueDetails: [
      { label: 'Warnings', copy: 'Inadequate devices drive fault.' },
      { label: 'Deadline', copy: 'A public entity shortens it to six months.' },
      { label: 'Evidence', copy: 'The black box and signal logs are decisive.' },
      { label: 'Preemption', copy: 'A design claim must be navigated.' },
    ],
    insuranceProblems: [
      'The six-month deadline is missed.',
      'The signal logs are overwritten.',
      'Only the railroad is pursued.',
      'Crossing video is lost.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it at a rail crossing?' },
      { label: 'Step 2', question: 'What warnings were present?' },
      { label: 'Step 3', question: 'When did it happen?' },
      { label: 'Step 4', question: 'Which railroad was involved?' },
    ],
  },
  [FRESNO_TRAIN_SLUG]: {
    scenario: `A pedestrian was struck by freight rail near a Fresno crossing with obstructed sightlines. Claims ran against the operator and the crossing entity, with signal and maintenance logs preserved. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the crossing and sightlines.'],
      ['First days', 'Identify the railroad and crossing entity.'],
      ['First weeks', 'File or preserve any public-entity claim.'],
      ['Longer term', 'Preserve the event recorder and maintenance logs.'],
    ],
    severityLadder: [
      ['Crossing', 'Railroad plus crossing entity.'],
      ['Sightlines', 'Obstructions raise design questions.'],
      ['Public entity', 'Six-month claim may apply.'],
      ['Preemption', 'Some design claims raise it.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the crossing design was adequate',
      'Whether sightlines were obstructed',
      'Whether any six-month deadline was met',
      'Whether the event recorder was preserved',
      'Injury severity and treatment continuity',
      'Whether federal preemption is raised',
    ],
    settlementValueDetails: [
      { label: 'Design', copy: 'Obstructed sightlines drive fault.' },
      { label: 'Deadline', copy: 'A public crossing entity may shorten it.' },
      { label: 'Evidence', copy: 'The black box and logs are decisive.' },
      { label: 'Preemption', copy: 'A design claim must be navigated.' },
    ],
    insuranceProblems: [
      'A public-entity deadline is missed.',
      'The maintenance logs are overwritten.',
      'The crossing entity is never joined.',
      'Video is lost before a demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it at a crossing?' },
      { label: 'Step 2', question: 'Were sightlines obstructed?' },
      { label: 'Step 3', question: 'When did it happen?' },
      { label: 'Step 4', question: 'Which railroad was involved?' },
    ],
  },
  [RIV_TRAIN_SLUG]: {
    scenario: `A vehicle was struck at a Riverside freight crossing with a malfunctioning gate. Claims ran against the railroad and the public crossing entity, with signal logs and the event recorder preserved. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; photograph the crossing and gate.'],
      ['First days', 'Identify the railroad and crossing entity.'],
      ['First weeks', 'File or preserve any six-month claim.'],
      ['Longer term', 'Preserve the event recorder and signal logs.'],
    ],
    severityLadder: [
      ['Crossing', 'Railroad plus crossing entity.'],
      ['Warnings', 'A malfunctioning gate drives fault.'],
      ['Public entity', 'Six-month claim may apply.'],
      ['Preemption', 'Some design claims raise it.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the gate or warnings malfunctioned',
      'Whether any six-month deadline was met',
      'Whether the event recorder was preserved',
      'Whether federal preemption is raised',
      'Injury severity and treatment continuity',
      'Whether video corroborates the account',
    ],
    settlementValueDetails: [
      { label: 'Warnings', copy: 'A failed gate drives fault.' },
      { label: 'Deadline', copy: 'A public entity may shorten it.' },
      { label: 'Evidence', copy: 'The black box and signal logs are decisive.' },
      { label: 'Preemption', copy: 'A design claim must be navigated.' },
    ],
    insuranceProblems: [
      'A six-month deadline is missed.',
      'The signal logs are overwritten.',
      'Only the railroad is pursued.',
      'Crossing video is lost.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it at a rail crossing?' },
      { label: 'Step 2', question: 'Did the gate or lights work?' },
      { label: 'Step 3', question: 'When did it happen?' },
      { label: 'Step 4', question: 'Which railroad was involved?' },
    ],
  },
}
