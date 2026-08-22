import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, train / railroad and grade-crossing accident practice area:
 * location-specific guides for the major California commuter- and
 * intercity-rail corridors \u2014 Los Angeles (Metrolink), San Jose (Caltrain),
 * San Diego (Coaster / Pacific Surfliner), and Sacramento (Capitol Corridor).
 *
 * A commuter- or intercity-rail claim is distinct from a light-rail or bus
 * transit claim: the operators are often separate public joint-powers agencies,
 * grade-crossing collisions add city, county, or state and freight-railroad
 * defendants, the evidence includes event recorders and signal-maintenance
 * records, and injured railroad employees fall under a separate federal statute.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: Metrolink commuter rail across Southern California, operated
 *    by a public joint-powers agency, sharing corridors with freight and Amtrak.
 *  - San Jose: Caltrain along the Peninsula corridor, a public joint-powers
 *    agency, with numerous grade crossings and a recently electrified line.
 *  - San Diego: the Coaster and Amtrak Pacific Surfliner along the coastal
 *    corridor, operated by a public transit district, with well-known bluff and
 *    crossing hazards.
 *  - Sacramento: the Amtrak Capitol Corridor plus heavy freight (Union Pacific)
 *    crossings throughout the region and the Central Valley.
 *
 * Applied accurately:
 *  - A passenger railroad is a common carrier and owes its passengers the
 *    highest duty of care (Civil Code sections 2100 and 2101).
 *  - A grade-crossing collision can involve several defendants: the railroad,
 *    the public entity responsible for the crossing and its warning devices, and
 *    a freight operator \u2014 and whether the warnings were adequate is central.
 *  - Where the operator is a public entity, the Government Claims Act requires a
 *    formal written claim within six months (Government Code section 911.2)
 *    before any lawsuit \u2014 far shorter than the two-year injury deadline.
 *  - Injured railroad employees are covered by the Federal Employers Liability
 *    Act (FELA), a federal fault-based system, not state workers\u2019 compensation.
 *  - The evidence is time-sensitive: the locomotive event recorder, signal and
 *    crossing-maintenance records, dispatch and video data must be preserved
 *    quickly. Some crossing-design claims raise federal-preemption questions.
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

export const LA_TRAIN_SLUG = '/los-angeles-train-accident'
export const SJ_TRAIN_SLUG = '/san-jose-train-accident'
export const SD_TRAIN_SLUG = '/san-diego-train-accident'
export const SAC_TRAIN_SLUG = '/sacramento-train-accident'

export const trainAccidentCityGuidePages: LandingPage[] = [
  {
    slug: LA_TRAIN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Train & Railroad Accident Claims',
    title: 'Los Angeles Train & Railroad Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a Metrolink, Amtrak, or grade-crossing accident in the LA area? A public rail operator carries a six-month deadline \u2014 and the train\u2019s data must be preserved fast.',
    psychology: 'I was hurt on a Metrolink train or at an LA-area crossing and I do not know who to claim against or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles metrolink accident lawyer',
      'train crossing accident claim california',
      'commuter rail injury lawsuit california',
      'sue metrolink for injury california',
      'railroad accident deadline california',
    ],
    signals: [
      'Common carrier duty (2100)',
      'Grade-crossing defendants',
      'Public operator six-month claim (911.2)',
      'Event recorder & signal data',
      'FELA for rail employees',
      'Federal preemption issues',
    ],
    sections: {
      whyItMatters: `Metrolink commuter rail runs across Southern California under a public joint-powers agency and shares corridors with freight and Amtrak, so an LA-area rail injury can involve a passenger claim, a grade-crossing collision, or an employee claim \u2014 each with different rules. ${COMMON_CARRIER} ${GRADE_CROSSING} ${WHO} ${SIX_MONTH} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court after any required government claim.`,
      whatToTrack: [
        'Whether you were a passenger, a motorist/pedestrian, or an employee',
        'The operator (Metrolink, Amtrak, freight) and any crossing entity',
        'The date of injury, which starts any six-month clock',
        'The exact location and, for a crossing, the warning devices present',
        'Photographs of the scene, sightlines, and any gates or signals',
        'Witnesses and any on-board or crossing video',
        'A prompt demand to preserve the event recorder and signal logs',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether an LA-area rail claim runs against Metrolink, Amtrak, a freight operator, or a crossing entity, moves immediately on the six-month deadline, and issues the preservation demand for the event recorder and signal data. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a Metrolink train. What duty did they owe me?',
        a: 'As a passenger railroad, Metrolink is a common carrier and owes its passengers the highest duty of care consistent with practical operation (Civil Code sections 2100 and 2101) \u2014 higher than ordinary negligence. That applies to sudden stops, derailments, boarding-gap falls, and on-board hazards.',
      },
      {
        q: 'How long do I have to file against a public rail operator?',
        a: 'Much less time than usual. Because the major California commuter and intercity operators are public entities, the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit. Missing it can bar the claim, so act immediately.',
      },
      {
        q: 'Who is liable for a grade-crossing collision?',
        a: 'Often several parties: the railroad that operated the train, the public entity responsible for the crossing and its warning devices, and any freight operator sharing the corridor. Whether the gates, lights, signage, and sightlines were adequate is usually central.',
      },
      {
        q: 'I was hurt working for the railroad. Is that workers\u2019 comp?',
        a: 'No. Injured railroad employees are covered by the Federal Employers Liability Act (FELA), a fault-based federal system, not state workers\u2019 compensation. It works differently and requires proving the railroad\u2019s negligence.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the preservation demands, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_TRAIN_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Train & Railroad Accident Claims',
    title: 'San Jose Train & Railroad Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a Caltrain or grade-crossing accident on the Peninsula? A public rail operator carries a six-month deadline \u2014 and the crossing and train data must be preserved fast.',
    psychology: 'I was hurt on Caltrain or at a Peninsula crossing and I do not know who to claim against or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose caltrain accident lawyer',
      'train crossing accident claim california',
      'commuter rail injury lawsuit california',
      'sue caltrain for injury california',
      'railroad accident deadline california',
    ],
    signals: [
      'Common carrier duty (2100)',
      'Grade-crossing defendants',
      'Public operator six-month claim (911.2)',
      'Event recorder & signal data',
      'FELA for rail employees',
      'Federal preemption issues',
    ],
    sections: {
      whyItMatters: `Caltrain runs the Peninsula corridor under a public joint-powers agency, with numerous grade crossings and a recently electrified line \u2014 so a San Jose-area rail injury can be a passenger claim, a crossing collision, or an employee claim, each governed by different rules. ${COMMON_CARRIER} ${GRADE_CROSSING} ${WHO} ${SIX_MONTH} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court after any required government claim.`,
      whatToTrack: [
        'Whether you were a passenger, a motorist/pedestrian, or an employee',
        'The operator (Caltrain, freight) and any crossing entity',
        'The date of injury, which starts any six-month clock',
        'The exact crossing and the warning devices present',
        'Photographs of the scene, sightlines, gates, and signals',
        'Witnesses and any on-board or crossing video',
        'A prompt demand to preserve the event recorder and signal logs',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Peninsula rail claim runs against Caltrain, a freight operator, or a crossing entity, moves immediately on the six-month deadline, and issues the preservation demand for the event recorder and signal data. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a Caltrain train. What duty did they owe me?',
        a: 'As a passenger railroad, Caltrain is a common carrier and owes its passengers the highest duty of care consistent with practical operation (Civil Code sections 2100 and 2101) \u2014 higher than ordinary negligence. That applies to sudden stops, boarding-gap falls, and on-board hazards.',
      },
      {
        q: 'How long do I have to file against Caltrain?',
        a: 'Much less time than usual. Because Caltrain is operated by a public entity, the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit. Missing it can bar the claim, so act immediately.',
      },
      {
        q: 'Who is liable for a crossing collision on the Peninsula?',
        a: 'Often several parties: the railroad, the public entity responsible for the crossing and its warning devices, and any freight operator sharing the corridor. Whether the gates, lights, signage, and sightlines were adequate is usually central.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The locomotive event recorder, signal and crossing-maintenance logs, dispatch records, and on-board and crossing video \u2014 all largely in the operator\u2019s hands and quickly overwritten. A prompt preservation demand is essential.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the preservation demands, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_TRAIN_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Train & Railroad Accident Claims',
    title: 'San Diego Train & Railroad Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a Coaster, Amtrak, or coastal-corridor rail accident in San Diego? A public rail operator carries a six-month deadline \u2014 and the train\u2019s data must be preserved fast.',
    psychology: 'I was hurt on the Coaster or Amtrak or at a San Diego crossing and I do not know who to claim against or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego coaster train accident lawyer',
      'amtrak accident claim california',
      'commuter rail injury lawsuit california',
      'train crossing accident claim california',
      'railroad accident deadline california',
    ],
    signals: [
      'Common carrier duty (2100)',
      'Coastal corridor & crossings',
      'Public operator six-month claim (911.2)',
      'Event recorder & signal data',
      'FELA for rail employees',
      'Federal preemption issues',
    ],
    sections: {
      whyItMatters: `The Coaster and Amtrak Pacific Surfliner run San Diego\u2019s coastal corridor under a public transit district, with well-known bluff and crossing hazards \u2014 so a rail injury here can be a passenger claim, a crossing collision, or an employee claim, each with its own rules. ${COMMON_CARRIER} ${GRADE_CROSSING} ${WHO} ${SIX_MONTH} ${EVIDENCE} Civil cases are filed in San Diego County Superior Court after any required government claim.`,
      whatToTrack: [
        'Whether you were a passenger, a motorist/pedestrian, or an employee',
        'The operator (Coaster/NCTD, Amtrak, freight) and any crossing entity',
        'The date of injury, which starts any six-month clock',
        'The exact location and, for a crossing, the warning devices present',
        'Photographs of the scene, sightlines, gates, and signals',
        'Witnesses and any on-board or crossing video',
        'A prompt demand to preserve the event recorder and signal logs',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a San Diego rail claim runs against the Coaster operator, Amtrak, a freight operator, or a crossing entity, moves immediately on the six-month deadline, and issues the preservation demand for the event recorder and signal data. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on the Coaster or Amtrak. What duty did they owe me?',
        a: 'As passenger railroads, they are common carriers and owe passengers the highest duty of care consistent with practical operation (Civil Code sections 2100 and 2101) \u2014 higher than ordinary negligence. That applies to sudden stops, derailments, boarding-gap falls, and on-board hazards.',
      },
      {
        q: 'How long do I have to file against the Coaster operator?',
        a: 'Much less time than usual. Because it is operated by a public transit district, the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit. Missing it can bar the claim, so act immediately.',
      },
      {
        q: 'Who is liable for a coastal-corridor crossing collision?',
        a: 'Often several parties: the railroad, the public entity responsible for the crossing and its warning devices, and any freight operator sharing the corridor. Whether the gates, lights, signage, and sightlines were adequate is usually central.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The locomotive event recorder, signal and crossing-maintenance logs, dispatch records, and on-board and crossing video \u2014 largely in the operator\u2019s hands and quickly overwritten. A prompt preservation demand is essential.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the preservation demands, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_TRAIN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Train & Railroad Accident Claims',
    title: 'Sacramento Train & Railroad Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a Capitol Corridor, Amtrak, or freight-crossing accident near Sacramento? A public rail operator carries a six-month deadline \u2014 and the train\u2019s data must be preserved fast.',
    psychology: 'I was hurt on the Capitol Corridor or at a Sacramento-area crossing and I do not know who to claim against or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento amtrak accident lawyer',
      'capitol corridor train injury claim california',
      'freight train crossing accident california',
      'commuter rail injury lawsuit california',
      'railroad accident deadline california',
    ],
    signals: [
      'Common carrier duty (2100)',
      'Freight & intercity crossings',
      'Public operator six-month claim (911.2)',
      'Event recorder & signal data',
      'FELA for rail employees',
      'Federal preemption issues',
    ],
    sections: {
      whyItMatters: `The Amtrak Capitol Corridor plus heavy freight (Union Pacific) traffic mean the Sacramento region has both intercity passenger service and numerous freight crossings throughout the city and the Central Valley \u2014 so a rail injury here can be a passenger claim, a crossing collision, or an employee claim. ${COMMON_CARRIER} ${GRADE_CROSSING} A freight-crossing collision brings the freight railroad and the crossing entity into play. ${WHO} ${SIX_MONTH} ${EVIDENCE} Civil cases are filed in Sacramento County Superior Court after any required government claim.`,
      whatToTrack: [
        'Whether you were a passenger, a motorist/pedestrian, or an employee',
        'The operator (Capitol Corridor/Amtrak, Union Pacific freight) and crossing entity',
        'The date of injury, which starts any six-month clock',
        'The exact crossing and the warning devices present',
        'Photographs of the scene, sightlines, gates, and signals',
        'Witnesses and any on-board or crossing video',
        'A prompt demand to preserve the event recorder and signal logs',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Sacramento-area rail claim runs against the Capitol Corridor operator, Amtrak, a freight railroad, or a crossing entity, moves immediately on any six-month deadline, and issues the preservation demand for the event recorder and signal data. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on the Capitol Corridor. What duty did they owe me?',
        a: 'As a passenger railroad, it is a common carrier and owes passengers the highest duty of care consistent with practical operation (Civil Code sections 2100 and 2101) \u2014 higher than ordinary negligence. That applies to sudden stops, boarding-gap falls, and on-board hazards.',
      },
      {
        q: 'A freight train hit me at a crossing. Who is liable?',
        a: 'Often several parties: the freight railroad that operated the train, the public entity responsible for the crossing and its warning devices, and sometimes another operator sharing the corridor. Whether the gates, lights, signage, and sightlines were adequate is usually central.',
      },
      {
        q: 'How long do I have to file against a public rail operator?',
        a: 'Much less time than usual. Where the operator is a public entity, the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit. Missing it can bar the claim, so act immediately.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The locomotive event recorder, signal and crossing-maintenance logs, dispatch records, and on-board and crossing video \u2014 largely in the operator\u2019s hands and quickly overwritten. A prompt preservation demand is essential.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the preservation demands, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const trainAccidentCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_TRAIN_SLUG]: {
    scenario: `An LA-area passenger was thrown when a Metrolink train stopped abruptly. Because the operator is a public entity, the six-month claim was presented in time, and a preservation demand secured the event recorder before it was overwritten. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the operator, location, and any crossing devices; photograph.'],
      ['First days', 'Issue a preservation demand for the event recorder and signal logs.'],
      ['Six-month mark', 'The government claim presented to the public operator.'],
      ['Longer term', 'Liability among operators and crossing entities developed.'],
    ],
    severityLadder: [
      ['Who was hurt', 'Passenger, motorist, or employee changes the rules.'],
      ['Common carrier', 'Passengers are owed the highest duty.'],
      ['Deadline', 'Public operators carry a six-month claim.'],
      ['Evidence', 'The event recorder must be preserved fast.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether you were a passenger, motorist, or employee',
      'Whether the common carrier duty applies',
      'Whether the six-month claim was met',
      'Whether the event recorder and signal data were preserved',
      'Whether a crossing entity shares liability',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Highest duty', copy: 'Passengers are owed more than ordinary care.' },
      { label: 'Deadline is short', copy: 'Six months for a public operator.' },
      { label: 'Preserve the data', copy: 'The event recorder is quickly overwritten.' },
      { label: 'Multiple defendants', copy: 'Crossing collisions add parties.' },
    ],
    insuranceProblems: [
      'The six-month claim deadline is missed.',
      'The event recorder and signal logs are overwritten.',
      'The wrong operator or crossing entity is targeted.',
      'A FELA claim is treated as ordinary workers\u2019 comp.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger, motorist, or employee?' },
      { label: 'Step 2', question: 'Which operator and, if a crossing, which entity?' },
      { label: 'Step 3', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 4', question: 'Has a preservation demand been sent?' },
    ],
  },
  [SJ_TRAIN_SLUG]: {
    scenario: `A San Jose motorist was struck at a Caltrain crossing where the sightlines were obscured. The claim named the operator and the crossing entity, and a preservation demand secured the signal-maintenance and crossing video. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the crossing, gates, signals, and sightlines.'],
      ['First days', 'Issue a preservation demand for the event recorder and signal logs.'],
      ['Six-month mark', 'The government claim presented to the public operator.'],
      ['Longer term', 'Warning-adequacy and preemption issues developed.'],
    ],
    severityLadder: [
      ['Crossing defendants', 'Operator and crossing entity may both be liable.'],
      ['Warning adequacy', 'Gates, lights, and sightlines are central.'],
      ['Deadline', 'Public operators carry a six-month claim.'],
      ['Evidence', 'Signal logs and video must be preserved fast.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the crossing warnings were adequate',
      'Whether the operator and crossing entity share liability',
      'Whether the six-month claim was met',
      'Whether the signal logs and video were preserved',
      'Whether federal preemption affects the design claim',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Warnings matter', copy: 'Gates, lights, and sightlines drive liability.' },
      { label: 'Multiple defendants', copy: 'Operator and crossing entity may both answer.' },
      { label: 'Deadline is short', copy: 'Six months for a public operator.' },
      { label: 'Preserve the data', copy: 'Signal logs and video are overwritten fast.' },
    ],
    insuranceProblems: [
      'The signal-maintenance logs and video are overwritten.',
      'The six-month claim deadline is missed.',
      'The crossing entity is never identified.',
      'A federal-preemption defense goes unanswered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What crossing, and what warnings were present?' },
      { label: 'Step 2', question: 'Which operator ran the train?' },
      { label: 'Step 3', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 4', question: 'Has a preservation demand been sent?' },
    ],
  },
  [SD_TRAIN_SLUG]: {
    scenario: `A San Diego passenger fell in a boarding gap on the coastal corridor. As the operator is a public transit district, the six-month claim was filed, and a preservation demand secured the event recorder and station video. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the operator and location; photograph the gap or hazard.'],
      ['First days', 'Issue a preservation demand for the event recorder and video.'],
      ['Six-month mark', 'The government claim presented to the transit district.'],
      ['Longer term', 'Common-carrier and liability issues developed.'],
    ],
    severityLadder: [
      ['Common carrier', 'Passengers are owed the highest duty.'],
      ['Who was hurt', 'Passenger, motorist, or employee changes the rules.'],
      ['Deadline', 'Public operators carry a six-month claim.'],
      ['Evidence', 'The event recorder and video must be preserved.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the common carrier duty applies',
      'Whether the six-month claim was met',
      'Whether the event recorder and video were preserved',
      'Whether a crossing entity shares liability',
      'Whether you were a passenger, motorist, or employee',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Highest duty', copy: 'Passengers are owed more than ordinary care.' },
      { label: 'Deadline is short', copy: 'Six months for a public operator.' },
      { label: 'Preserve the data', copy: 'The event recorder and video are overwritten.' },
      { label: 'Multiple defendants', copy: 'Crossing collisions add parties.' },
    ],
    insuranceProblems: [
      'The six-month claim deadline is missed.',
      'The event recorder and station video are overwritten.',
      'The wrong operator or crossing entity is targeted.',
      'A FELA claim is treated as ordinary workers\u2019 comp.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger, motorist, or employee?' },
      { label: 'Step 2', question: 'Which operator and, if a crossing, which entity?' },
      { label: 'Step 3', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 4', question: 'Has a preservation demand been sent?' },
    ],
  },
  [SAC_TRAIN_SLUG]: {
    scenario: `A Sacramento-area driver was struck by a freight train at a poorly marked crossing. The claim named the freight railroad and the crossing entity, and a preservation demand secured the event recorder and signal-maintenance records. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the crossing, gates, signals, and sightlines.'],
      ['First days', 'Issue a preservation demand for the event recorder and signal logs.'],
      ['Six-month mark', 'Any government claim presented to the crossing entity.'],
      ['Longer term', 'Warning-adequacy and freight-liability issues developed.'],
    ],
    severityLadder: [
      ['Crossing defendants', 'Freight railroad and crossing entity may both be liable.'],
      ['Warning adequacy', 'Gates, lights, and sightlines are central.'],
      ['Deadline', 'A public crossing entity carries a six-month claim.'],
      ['Evidence', 'The event recorder and signal logs must be preserved.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the crossing warnings were adequate',
      'Whether the freight railroad and crossing entity share liability',
      'Whether any six-month claim was met',
      'Whether the event recorder and signal logs were preserved',
      'Whether federal preemption affects the design claim',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Warnings matter', copy: 'Gates, lights, and sightlines drive liability.' },
      { label: 'Multiple defendants', copy: 'Railroad and crossing entity may both answer.' },
      { label: 'Preserve the data', copy: 'The event recorder is overwritten fast.' },
      { label: 'Deadline can be short', copy: 'A public crossing entity means six months.' },
    ],
    insuranceProblems: [
      'The event recorder and signal logs are overwritten.',
      'The crossing entity is never identified.',
      'Any six-month claim deadline is missed.',
      'A federal-preemption defense goes unanswered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What crossing, and what warnings were present?' },
      { label: 'Step 2', question: 'Was it a freight or a passenger train?' },
      { label: 'Step 3', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 4', question: 'Has a preservation demand been sent?' },
    ],
  },
}
