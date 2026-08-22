import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, e-scooter and shared-micromobility practice area: city-specific
 * guides for Los Angeles, San Diego, San Francisco, and Long Beach.
 *
 * A new practice area for the geo hub, chosen because shared e-scooters (Lime,
 * Bird, Lyft) concentrate in exactly these cities and raise issues found nowhere
 * else in the hub: rental-app arbitration clauses and liability waivers,
 * operator maintenance liability, product defects, e-scooter Vehicle Code rules,
 * and pedestrians struck by scooter riders.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles / Santa Monica: the birthplace of shared dockless scooters,
 *    with dense deployment, sidewalk-clutter and improper-parking hazards, and
 *    heavy use on busy corridors.
 *  - San Diego: intense tourist scooter use in the beach and boardwalk areas,
 *    geofencing and speed limits, and boardwalk riding restrictions.
 *  - San Francisco: a permitted-operator program in a dense city where Muni
 *    tracks, hills, and rain create scooter-specific hazards.
 *  - Long Beach: an early pilot city with beachfront and downtown deployment.
 *
 * Applied accurately:
 *  - Two rider claim paths: a defect or malfunction (brakes, throttle, a
 *    cracked stem) can support a product-liability and negligent-maintenance
 *    claim against the operator or manufacturer; a road hazard (a pothole, a
 *    Muni track, a raised edge) can support a dangerous-condition-of-public-
 *    property claim under Government Code section 835 on the six-month deadline.
 *  - Rental app user agreements routinely include arbitration clauses and
 *    liability waivers; these are heavily litigated and generally cannot waive
 *    liability for gross negligence or a product defect, so a waiver is not the
 *    end of a claim.
 *  - E-scooter rules under Vehicle Code sections 21220-21235: no sidewalk
 *    riding, use of bike lanes where available, a helmet requirement for riders
 *    under 18, a roughly 15 mph limit, and a valid driver license or permit.
 *  - A pedestrian struck by a scooter rider brings an ordinary negligence claim
 *    against the rider, and may look to the rider's or their own homeowner's or
 *    UM coverage.
 *  - Pure comparative negligence, and the two-year personal-injury deadline
 *    (Code of Civil Procedure section 335.1), with the six-month rule for public
 *    entities.
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

export const LA_SCOOTER_SLUG = '/los-angeles-scooter-accident'
export const SD_SCOOTER_SLUG = '/san-diego-scooter-accident'
export const SF_SCOOTER_SLUG = '/san-francisco-scooter-accident'
export const LONGBEACH_SCOOTER_SLUG = '/long-beach-scooter-accident'

export const scooterCityGuidePages: LandingPage[] = [
  {
    slug: LA_SCOOTER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles E-Scooter Accident Claims',
    title: 'Los Angeles E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'LA and Santa Monica launched the shared-scooter era, and injuries followed. A claim here turns on whether the scooter malfunctioned, whether a road hazard was to blame, and whether the app\u2019s arbitration clause and waiver actually hold.',
    psychology: 'I was hurt on a rented e-scooter in LA, or hit by one, and do not know if the app agreement blocks my claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles e scooter accident claim',
      'lime bird scooter brakes failed injury',
      'hit by a scooter rider on the sidewalk',
      'scooter app arbitration waiver enforceable california',
      'injured on a rented scooter who is liable',
    ],
    signals: [
      'Defect / maintenance (operator)',
      'Road hazard (Gov. 835, six-month)',
      'Arbitration clause / waiver',
      'E-scooter rules (21220-21235)',
      'Pedestrian struck by rider',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Los Angeles \u2014 and Santa Monica in particular \u2014 is where the shared dockless e-scooter era began, and the region still has some of the densest deployment in the country, so both rider injuries and pedestrian injuries are common. ${PATHS} In a city with as much deferred street maintenance as LA, the road-hazard path is frequently in play, and the six-month deadline against a public agency is easy to miss. The threshold obstacle in nearly every scooter case is the app. ${WAIVER} ${RULES} Los Angeles also sees a heavy volume of the second kind of case: pedestrians struck by scooter riders on sidewalks despite the sidewalk-riding ban, and people tripping over scooters dumped across walkways. ${PEDESTRIAN} Pure comparative negligence applies. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs private claims, and the six-month rule governs public-entity claims. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether the scooter malfunctioned \u2014 brakes, throttle, stem, or wheel',
        'The operator and the specific scooter\u2019s ID number',
        'Whether a road hazard or transit track contributed',
        'The six-month deadline if a public agency may be responsible',
        'The app agreement, and how it was presented',
        'For a pedestrian, the rider\u2019s identity and any insurance',
        'Photographs of the scooter, the hazard, and the scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ sorts an LA scooter injury into the defect path (operator or manufacturer) or the road-hazard path (a six-month public-entity claim), preserves the scooter\u2019s ID and the app agreement, and treats the arbitration clause and waiver as contestable rather than fatal. For a struck pedestrian it pursues the rider and any coverage. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The scooter\u2019s brakes failed and I crashed. Who is responsible?',
        a: 'A malfunction like failed brakes can support a product-liability and negligent-maintenance claim against the operator that put the scooter on the street or the manufacturer that made it. Documenting the specific scooter\u2019s ID number and preserving evidence of the failure quickly is important, because the operator controls the device.',
      },
      {
        q: 'I clicked "agree" in the app. Does that block my claim?',
        a: 'Not necessarily. Rental scooter apps routinely include arbitration clauses and liability waivers, but these are heavily litigated, and California generally does not allow a waiver to excuse gross negligence or a product defect. How the agreement was presented and what caused the injury determine whether it holds, so a waiver is not automatically the end of a claim.',
      },
      {
        q: 'A scooter rider hit me on the sidewalk. What are my options?',
        a: 'You bring an ordinary negligence claim against the rider, who was likely violating the sidewalk-riding ban. Recovery can come from the rider\u2019s homeowner\u2019s or renter\u2019s liability coverage or, in some circumstances, your own uninsured-motorist coverage. Identifying the rider at the scene is important.',
      },
      {
        q: 'I crashed because of a pothole while riding. Can I claim against the city?',
        a: 'Possibly. Where a dangerous roadway condition caused the crash, a dangerous-condition-of-public-property claim against the responsible agency may exist under Government Code section 835 \u2014 but it carries a six-month claim deadline, far shorter than the ordinary two years, so acting quickly is essential.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the defect, hazard, and waiver questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_SCOOTER_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego E-Scooter Accident Claims',
    title: 'San Diego E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Diego\u2019s beaches and boardwalks draw heavy tourist scooter use, with geofencing and riding bans in play. A claim turns on whether the scooter malfunctioned, whether a hazard was to blame, and whether the app\u2019s waiver holds.',
    psychology: 'I was hurt on a rented e-scooter in San Diego, maybe while visiting, or hit by one, and do not know my rights.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego e scooter accident claim',
      'lime bird scooter brakes failed injury',
      'boardwalk scooter crash san diego',
      'scooter app arbitration waiver enforceable california',
      'hit by a scooter rider san diego',
    ],
    signals: [
      'Defect / maintenance (operator)',
      'Boardwalk / geofencing rules',
      'Arbitration clause / waiver',
      'Out-of-area visitor',
      'Pedestrian struck by rider',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s beach and boardwalk districts \u2014 Mission Beach, Pacific Beach, the Embarcadero \u2014 draw some of the heaviest tourist e-scooter use in the state, which shapes its injury pattern. ${PATHS} San Diego has responded with geofencing that slows or stops scooters in certain zones and with riding bans on some boardwalks, and whether a scooter was operating where and how it should have been can matter to both liability and comparative fault. ${WAIVER} ${RULES} The tourist factor is significant: many injured riders and struck pedestrians are visitors who leave San Diego soon after, so gathering the scooter ID, the app details and photographs before departure is important \u2014 though a crash in California is governed by California law regardless of residency and can be pursued from out of state. ${PEDESTRIAN} Crowded boardwalks make pedestrian-struck-by-rider cases especially common here. Pure comparative negligence applies. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs private claims, and the six-month rule governs public-entity claims. Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Whether the scooter malfunctioned \u2014 brakes, throttle, stem, or wheel',
        'The operator and the specific scooter\u2019s ID number',
        'Whether geofencing or a boardwalk ban was involved',
        'Whether you are an out-of-area visitor',
        'The app agreement, and how it was presented',
        'For a pedestrian, the rider\u2019s identity and any insurance',
        'Photographs of the scooter, any hazard, and the scene',
        'Medical treatment from first response onward, before leaving town',
      ],
      howClearCaseHelps: `ClearCaseIQ sorts a San Diego scooter injury into the defect or hazard path, treats the app\u2019s arbitration clause and waiver as contestable, and handles the out-of-area visitor problem by prompting to capture the scooter ID, app details, and photographs before departure. For a struck pedestrian it pursues the rider and any coverage. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was visiting and got hurt on a scooter, then went home. Can I still claim?',
        a: 'Yes. A crash in California is governed by California law regardless of where you live, and you can pursue the claim from out of state. Because evidence is harder to gather after you leave, it helps to record the scooter\u2019s ID number, capture the app details, and take photographs before departure.',
      },
      {
        q: 'The scooter malfunctioned. Who is responsible?',
        a: 'A malfunction like failed brakes or a stuck throttle can support a product-liability and negligent-maintenance claim against the operator that deployed the scooter or the manufacturer. Documenting the specific scooter\u2019s ID and preserving evidence of the failure quickly is important because the operator controls the device.',
      },
      {
        q: 'I clicked "agree" in the app. Does that block my claim?',
        a: 'Not necessarily. Arbitration clauses and liability waivers in scooter apps are heavily litigated, and California generally does not allow a waiver to excuse gross negligence or a product defect. How the agreement was presented and what caused the injury determine whether it holds.',
      },
      {
        q: 'A scooter rider hit me on the boardwalk. What are my options?',
        a: 'You bring an ordinary negligence claim against the rider, especially where boardwalk riding was restricted. Recovery can come from the rider\u2019s homeowner\u2019s or renter\u2019s liability coverage or, in some circumstances, your own uninsured-motorist coverage. Identifying the rider at the scene is important.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the defect, hazard, and waiver questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_SCOOTER_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco E-Scooter Accident Claims',
    title: 'San Francisco E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Francisco\u2019s permitted scooter operators share dense streets where Muni tracks, hills, and rain create scooter-specific hazards. A claim turns on a malfunction, a road hazard, and whether the app\u2019s waiver actually holds.',
    psychology: 'I was hurt on a rented e-scooter in San Francisco, or hit by one, and do not know if the app agreement blocks my claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco e scooter accident claim',
      'scooter wheel caught in muni tracks injury',
      'lime bird scooter brakes failed injury',
      'scooter app arbitration waiver enforceable california',
      'hit by a scooter rider san francisco',
    ],
    signals: [
      'Defect / maintenance (operator)',
      'Muni-track / road hazard (Gov. 835)',
      'Arbitration clause / waiver',
      'E-scooter rules (21220-21235)',
      'Pedestrian struck by rider',
      'Six-month vs. two-year deadline',
    ],
    sections: {
      whyItMatters: `San Francisco runs a permitted e-scooter program in one of the densest, most challenging riding environments in the country, and its geography creates hazards other cities do not share. ${PATHS} The road-hazard path is unusually important here because of Muni tracks: a small scooter wheel catching in an embedded rail groove is a well-known cause of sudden, serious falls, and where the track condition or the roadway is dangerous a claim under Government Code section 835 against the responsible agency may exist \u2014 on the six-month deadline. The city\u2019s steep hills and frequent rain add braking and traction hazards that make a malfunction or a poorly maintained scooter especially dangerous. ${WAIVER} ${RULES} ${PEDESTRIAN} Pure comparative negligence applies. The six-month rule governs public-entity claims while the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs claims against a private operator or rider. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Whether a Muni track or road hazard caused the fall',
        'The six-month deadline if a public agency may be responsible',
        'Whether the scooter malfunctioned \u2014 brakes, throttle, stem, or wheel',
        'The operator and the specific scooter\u2019s ID number',
        'Whether hills or rain contributed',
        'The app agreement, and how it was presented',
        'For a pedestrian, the rider\u2019s identity and any insurance',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ gives a San Francisco scooter fall the road-hazard analysis it often needs \u2014 including the Muni-track question and the six-month public-entity deadline \u2014 while sorting a defect path against the operator or manufacturer and treating the app\u2019s waiver as contestable. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My scooter wheel caught in a Muni track and I fell. Is anyone responsible?',
        a: 'Possibly. A small scooter wheel catching in an embedded rail groove is a known cause of serious falls, and where the track condition or roadway is dangerous a dangerous-condition-of-public-property claim under Government Code section 835 against the responsible agency may exist. It carries a six-month claim deadline, far shorter than the ordinary two years, so acting quickly is essential.',
      },
      {
        q: 'The scooter\u2019s brakes failed on a hill. Who is responsible?',
        a: 'A malfunction like failed brakes can support a product-liability and negligent-maintenance claim against the operator that deployed the scooter or the manufacturer. San Francisco\u2019s hills make braking failures especially dangerous, so documenting the scooter\u2019s ID and preserving evidence of the failure quickly is important.',
      },
      {
        q: 'I clicked "agree" in the app. Does that block my claim?',
        a: 'Not necessarily. Arbitration clauses and liability waivers in scooter apps are heavily litigated, and California generally does not allow a waiver to excuse gross negligence or a product defect. How the agreement was presented and what caused the injury determine whether it holds.',
      },
      {
        q: 'A scooter rider hit me. What are my options?',
        a: 'You bring an ordinary negligence claim against the rider. Recovery can come from the rider\u2019s homeowner\u2019s or renter\u2019s liability coverage or, in some circumstances, your own uninsured-motorist coverage. Identifying the rider at the scene is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the defect, hazard, and waiver questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LONGBEACH_SCOOTER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach E-Scooter Accident Claims',
    title: 'Long Beach E-Scooter Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Long Beach was an early shared-scooter pilot city, with heavy beachfront and downtown deployment. A claim turns on whether the scooter malfunctioned, whether a road hazard was to blame, and whether the app\u2019s arbitration clause and waiver hold.',
    psychology: 'I was hurt on a rented e-scooter in Long Beach, or hit by one, and do not know if the app agreement blocks my claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach e scooter accident claim',
      'lime bird scooter brakes failed injury',
      'beachfront scooter crash long beach',
      'scooter app arbitration waiver enforceable california',
      'hit by a scooter rider long beach',
    ],
    signals: [
      'Defect / maintenance (operator)',
      'Road hazard (Gov. 835, six-month)',
      'Arbitration clause / waiver',
      'E-scooter rules (21220-21235)',
      'Pedestrian struck by rider',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Long Beach was one of the early California cities to pilot shared e-scooters, and its beachfront path, downtown core and waterfront attractions keep deployment dense, so both rider and pedestrian injuries are common. ${PATHS} The beachfront bike-and-scooter path and the downtown streets each create their own hazards, and the road-hazard path with its six-month public-entity deadline is often in play. ${WAIVER} ${RULES} The mix of local commuters, beach visitors and tourists means many struck pedestrians and some injured riders are from out of the area, so capturing the scooter ID and app details early matters. ${PEDESTRIAN} Pure comparative negligence applies. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs private claims, and the six-month rule governs public-entity claims. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether the scooter malfunctioned \u2014 brakes, throttle, stem, or wheel',
        'The operator and the specific scooter\u2019s ID number',
        'Whether a road hazard or the beach path condition contributed',
        'The six-month deadline if a public agency may be responsible',
        'The app agreement, and how it was presented',
        'For a pedestrian, the rider\u2019s identity and any insurance',
        'Photographs of the scooter, any hazard, and the scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ sorts a Long Beach scooter injury into the defect or road-hazard path, preserves the scooter ID and app agreement, and treats the arbitration clause and waiver as contestable rather than fatal. For a struck pedestrian it pursues the rider and any coverage. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The scooter malfunctioned and I crashed. Who is responsible?',
        a: 'A malfunction like failed brakes or a stuck throttle can support a product-liability and negligent-maintenance claim against the operator that deployed the scooter or the manufacturer. Documenting the specific scooter\u2019s ID and preserving evidence of the failure quickly is important because the operator controls the device.',
      },
      {
        q: 'I clicked "agree" in the app. Does that block my claim?',
        a: 'Not necessarily. Arbitration clauses and liability waivers in scooter apps are heavily litigated, and California generally does not allow a waiver to excuse gross negligence or a product defect. How the agreement was presented and what caused the injury determine whether it holds.',
      },
      {
        q: 'A scooter rider hit me on the beach path. What are my options?',
        a: 'You bring an ordinary negligence claim against the rider. Recovery can come from the rider\u2019s homeowner\u2019s or renter\u2019s liability coverage or, in some circumstances, your own uninsured-motorist coverage. Identifying the rider at the scene is important.',
      },
      {
        q: 'I crashed because of a pothole or path defect. Can I claim against the city?',
        a: 'Possibly. Where a dangerous roadway or path condition caused the crash, a dangerous-condition-of-public-property claim under Government Code section 835 against the responsible agency may exist \u2014 but it carries a six-month claim deadline, far shorter than the ordinary two years, so acting quickly is essential.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the defect, hazard, and waiver questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const scooterCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_SCOOTER_SLUG]: {
    scenario: `A rider went over the handlebars when a rented scooter\u2019s brakes failed on a Santa Monica corridor, and the company pointed to the app waiver. Because a product defect is generally not waivable, the scooter\u2019s ID was preserved and the claim proceeded against the operator. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Record the scooter ID and operator; photograph the device and scene.'],
      ['First days', 'The app agreement captured; the defect-or-hazard path identified.'],
      ['First weeks', 'The operator, manufacturer, or public agency identified.'],
      ['Longer term', 'Treatment and the waiver analysis documented.'],
    ],
    severityLadder: [
      ['Defect', 'A malfunction points to the operator or manufacturer.'],
      ['Road hazard', 'A dangerous condition on the six-month clock.'],
      ['Pedestrian', 'A negligence claim against the rider.'],
      ['Waiver raised', 'The app waiver is asserted but often contestable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the scooter malfunctioned',
      'Whether a road hazard and a public entity are involved',
      'Whether the arbitration clause or waiver holds',
      'The operator or manufacturer identity',
      'For a pedestrian, the rider and any coverage',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Defects are not waivable', copy: 'A product defect generally survives a waiver.' },
      { label: 'Two paths', copy: 'Defect vs. road hazard changes the defendant and clock.' },
      { label: 'Preserve the ID', copy: 'The scooter ID ties the device to the operator.' },
      { label: 'Six-month risk', copy: 'A public-entity hazard claim runs on a short clock.' },
    ],
    insuranceProblems: [
      'The app waiver is treated as ending the claim.',
      'The scooter ID is never recorded and the device disappears.',
      'A road-hazard claim misses the six-month deadline.',
      'A struck pedestrian never identifies the rider.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the scooter malfunction, or did a hazard cause it?' },
      { label: 'Step 2', question: 'Do you have the scooter ID and operator?' },
      { label: 'Step 3', question: 'What did the app agreement say and how was it shown?' },
      { label: 'Step 4', question: 'If a pedestrian, who was the rider?' },
    ],
  },
  [SD_SCOOTER_SLUG]: {
    scenario: `A visiting tourist was hurt when a scooter\u2019s throttle stuck on a Mission Beach path and flew home two days later. Because the scooter ID and app details were captured before departure, the claim against the operator held together from out of state. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Record the scooter ID and operator; photograph the device and scene.'],
      ['Before leaving', 'App details and evidence gathered while still in town.'],
      ['First weeks', 'The operator or manufacturer identified; the waiver analysed.'],
      ['Longer term', 'Treatment documented and the claim positioned.'],
    ],
    severityLadder: [
      ['Defect', 'A malfunction points to the operator or manufacturer.'],
      ['Boardwalk ban', 'Riding restrictions affect comparative fault.'],
      ['Pedestrian', 'A negligence claim against the rider.'],
      ['Out-of-area', 'The visitor leaves before evidence is gathered.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the scooter malfunctioned',
      'Whether evidence was gathered before the visitor left',
      'Whether the arbitration clause or waiver holds',
      'Whether geofencing or a boardwalk ban was involved',
      'For a pedestrian, the rider and any coverage',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Defects are not waivable', copy: 'A product defect generally survives a waiver.' },
      { label: 'Gather before leaving', copy: 'Evidence is far harder to collect after departure.' },
      { label: 'Visitors can still claim', copy: 'California law governs regardless of home state.' },
      { label: 'Preserve the ID', copy: 'The scooter ID ties the device to the operator.' },
    ],
    insuranceProblems: [
      'The visitor leaves before recording the scooter ID.',
      'The app waiver is treated as ending the claim.',
      'A boardwalk-ban argument is treated as a complete bar.',
      'A struck pedestrian never identifies the rider.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you record the scooter ID before leaving?' },
      { label: 'Step 2', question: 'Did the scooter malfunction, or did a hazard cause it?' },
      { label: 'Step 3', question: 'What did the app agreement say and how was it shown?' },
      { label: 'Step 4', question: 'Was geofencing or a boardwalk ban involved?' },
    ],
  },
  [SF_SCOOTER_SLUG]: {
    scenario: `A commuter\u2019s scooter wheel caught in a Muni track groove and threw them onto the pavement. Recognising a road-hazard claim, a written claim reached the responsible agency within six months while the operator\u2019s maintenance was also examined. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the track or hazard with scale; record the scooter ID.'],
      ['First week', 'The responsible agency and the six-month deadline confirmed.'],
      ['Six months', 'Written claim presented if a public entity is responsible.'],
      ['Longer term', 'Operator maintenance and treatment documented.'],
    ],
    severityLadder: [
      ['Muni track', 'A wheel-catch fall points to a road-hazard claim.'],
      ['Defect', 'A malfunction points to the operator or manufacturer.'],
      ['Pedestrian', 'A negligence claim against the rider.'],
      ['Missed claim', 'The six-month deadline passes and bars the claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a Muni track or road hazard caused the fall',
      'Whether the six-month claim was presented in time',
      'Whether the scooter malfunctioned',
      'Whether the arbitration clause or waiver holds',
      'For a pedestrian, the rider and any coverage',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Track falls count', copy: 'A wheel-catch can support a road-hazard claim.' },
      { label: 'Six-month clock', copy: 'A public-entity claim runs on a short deadline.' },
      { label: 'Defects are not waivable', copy: 'A product defect generally survives a waiver.' },
      { label: 'Preserve the ID', copy: 'The scooter ID ties the device to the operator.' },
    ],
    insuranceProblems: [
      'A Muni-track road-hazard claim misses the six-month deadline.',
      'The hazard is never photographed with scale.',
      'The app waiver is treated as ending the claim.',
      'A struck pedestrian never identifies the rider.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did a Muni track or road hazard cause the fall?' },
      { label: 'Step 2', question: 'Which agency is responsible for that location?' },
      { label: 'Step 3', question: 'Did the scooter also malfunction?' },
      { label: 'Step 4', question: 'What did the app agreement say and how was it shown?' },
    ],
  },
  [LONGBEACH_SCOOTER_SLUG]: {
    scenario: `A rider was thrown when a scooter\u2019s stem cracked on the beachfront path, and the company raised the app waiver. Because a product defect is generally not waivable, the scooter ID was preserved and the claim proceeded against the operator. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Record the scooter ID and operator; photograph the device and scene.'],
      ['First days', 'The app agreement captured; the defect-or-hazard path identified.'],
      ['First weeks', 'The operator, manufacturer, or public agency identified.'],
      ['Longer term', 'Treatment and the waiver analysis documented.'],
    ],
    severityLadder: [
      ['Defect', 'A malfunction points to the operator or manufacturer.'],
      ['Road hazard', 'A dangerous condition on the six-month clock.'],
      ['Pedestrian', 'A negligence claim against the rider.'],
      ['Waiver raised', 'The app waiver is asserted but often contestable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the scooter malfunctioned',
      'Whether a road hazard and a public entity are involved',
      'Whether the arbitration clause or waiver holds',
      'The operator or manufacturer identity',
      'For a pedestrian, the rider and any coverage',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Defects are not waivable', copy: 'A product defect generally survives a waiver.' },
      { label: 'Two paths', copy: 'Defect vs. road hazard changes the defendant and clock.' },
      { label: 'Preserve the ID', copy: 'The scooter ID ties the device to the operator.' },
      { label: 'Six-month risk', copy: 'A public-entity hazard claim runs on a short clock.' },
    ],
    insuranceProblems: [
      'The app waiver is treated as ending the claim.',
      'The scooter ID is never recorded and the device disappears.',
      'A road-hazard claim misses the six-month deadline.',
      'A struck pedestrian never identifies the rider.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the scooter malfunction, or did a hazard cause it?' },
      { label: 'Step 2', question: 'Do you have the scooter ID and operator?' },
      { label: 'Step 3', question: 'What did the app agreement say and how was it shown?' },
      { label: 'Step 4', question: 'If a pedestrian, who was the rider?' },
    ],
  },
}
