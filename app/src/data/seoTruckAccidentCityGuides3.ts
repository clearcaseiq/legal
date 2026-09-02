import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, truck-accident practice area (batch 3): city-specific guides for
 * San Diego, San Jose, Bakersfield, and Anaheim, extending the batch-1
 * (Riverside, Long Beach, Fresno, Oakland) and batch-2 (Los Angeles, San
 * Bernardino, Sacramento, Stockton) freight hub.
 *
 * Genuinely local freight context rather than interpolated copy:
 *  - San Diego: the I-5/I-805/I-15 corridors carry cross-border freight from the
 *    Otay Mesa and Tecate ports of entry, plus military and distribution hauling.
 *  - San Jose: US-101/I-880/I-680 move Silicon Valley last-mile delivery,
 *    construction hauling, and tech distribution through dense, high-value roads.
 *  - Bakersfield: the I-5/Highway 99/Highway 58 crossroads and the Grapevine mix
 *    oilfield trucks, agricultural haulers, and long-haul freight.
 *  - Anaheim: SR-91/I-5/SR-57 funnel distribution, last-mile, and tourist-corridor
 *    delivery through northern Orange County.
 *
 * Truck-accident law, applied accurately (identical to batches 1-2):
 *  - Federal Motor Carrier Safety Regulations govern interstate carriers:
 *    hours-of-service limits, ELD records, inspection/maintenance files, and
 *    post-crash drug and alcohol testing.
 *  - Liability is usually layered: driver, motor carrier (negligent hiring,
 *    training, retention), and sometimes a broker, shipper, trailer/chassis
 *    owner, or maintenance contractor.
 *  - Critical evidence (ELD/hours data, the engine control module, dashcam,
 *    maintenance files) is kept only briefly, so a prompt spoliation letter is
 *    essential.
 *  - Interstate carriers must carry far higher minimum liability limits.
 *  - Pure comparative negligence, and the two-year personal-injury deadline
 *    (Code of Civil Procedure section 335.1), with the six-month Government Claims
 *    Act deadline where a public entity is involved.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Which parties are liable, which federal rules apply, and how comparative fault is assessed depend on facts a licensed California attorney should review promptly.'

const FMCSA =
  'Interstate trucking is governed by the Federal Motor Carrier Safety Regulations, which limit a driver\u2019s hours of service, require electronic logging of those hours, mandate vehicle inspection and maintenance records, and require drug and alcohol testing after a serious crash. Violations of these rules \u2014 an over-hours driver, a skipped inspection, a failed test \u2014 are often the core of a truck-accident claim.'

const LAYERED =
  'Truck-accident liability is rarely just the driver. The motor carrier is usually responsible for its driver and can also be directly liable for negligent hiring, training, supervision, or retention, and depending on the load and equipment a broker, the shipper, the trailer or chassis owner, or a maintenance contractor may share responsibility. Identifying every party is what opens the coverage needed for a serious injury.'

const PRESERVE =
  'The evidence that decides these cases disappears fast: the electronic logging and hours data, the engine control module or \u201cblack box,\u201d any dashcam footage, and the maintenance and inspection files are kept only briefly and can be overwritten or discarded within weeks. A prompt written spoliation letter demanding the carrier preserve them is often the single most important early step.'

const INSURANCE =
  'Because interstate motor carriers must carry far higher minimum liability limits than ordinary drivers, a properly built truck claim usually reaches coverage a car claim never could \u2014 but only if the carrier and its policy are identified and the claim is supported by the federal records.'

export const SD_TRUCK_SLUG = '/san-diego-truck-accident'
export const SJ_TRUCK_SLUG = '/san-jose-truck-accident'
export const BAKERSFIELD_TRUCK_SLUG = '/bakersfield-truck-accident'
export const ANAHEIM_TRUCK_SLUG = '/anaheim-truck-accident'

export const truckAccidentCityGuidePages3: LandingPage[] = [
  {
    slug: SD_TRUCK_SLUG,
    category: 'Cities',
    cluster: 'San Diego Truck Accident Claims',
    title: 'San Diego Truck Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Diego\u2019s I-5, I-805, and I-15 carry cross-border freight from Otay Mesa plus military and distribution hauling. A truck claim here turns on federal records, layered liability, and preserving evidence before it disappears.',
    psychology: 'I was hit by a big truck in San Diego and do not know who is responsible or how to protect the evidence.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego truck accident claim',
      'otay mesa border truck accident california',
      'hit by a semi truck on the 15 who is liable',
      'truck accident black box evidence preservation',
      'who is liable in a truck accident california',
    ],
    signals: [
      'FMCSA / hours-of-service',
      'Layered carrier liability',
      'Cross-border / Otay Mesa freight',
      'ELD / black-box preservation',
      'Higher carrier insurance limits',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s freight profile is unusual because so much of it crosses the border. The Otay Mesa and Tecate ports of entry funnel Mexican-origin cargo onto the I-805, I-15, and I-5, where it mixes with military hauling and regional distribution, so collisions with commercial trucks are common and often involve carriers and drivers based outside the United States. Two features make a truck claim fundamentally different from a car claim. The first is federal regulation. ${FMCSA} The second is layered liability. ${LAYERED} A cross-border load can add a freight forwarder, a customs broker, and a drayage carrier to the usual defendants, which makes identifying every party especially important here. ${INSURANCE} None of it works without evidence that vanishes. ${PRESERVE} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs unless a public entity is involved. Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The carrier name and USDOT number on the truck',
        'Whether the load was cross-border cargo from Otay Mesa or Tecate',
        'A prompt spoliation letter for ELD, black-box, dashcam, and maintenance files',
        'Whether a freight forwarder, broker, or drayage carrier was involved',
        'Whether the driver was an employee or owner-operator',
        'The corridor and exact location of the collision',
        'Post-crash drug and alcohol testing of the driver',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ treats a San Diego truck collision as the layered, federally regulated claim it is: it prompts to capture the carrier and USDOT number, to send a preservation letter before the ELD and black-box data cycle out, and to trace a cross-border load back through the forwarder, broker, and drayage carrier so the full coverage is reached. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A cross-border truck from Otay Mesa hit me. Who can be liable?',
        a: 'Often several parties: the driver, the motor carrier (including for negligent hiring or training), and sometimes a freight forwarder, a customs broker, or a drayage carrier that moved the load from the border. Cross-border freight makes these multi-party claims common, and identifying every responsible party opens the coverage a serious injury needs.',
      },
      {
        q: 'What evidence do I need to protect, and how fast?',
        a: 'The electronic logging and hours data, the engine control module or \u201cblack box,\u201d any dashcam footage, and the maintenance and inspection files \u2014 all of which can be overwritten or discarded within weeks. A prompt written spoliation letter demanding the carrier preserve them is usually the single most important early step.',
      },
      {
        q: 'The truck or carrier is based in Mexico. Can I still claim?',
        a: 'Often yes. Carriers operating on U.S. highways must comply with federal safety rules and carry insurance, and a claim can involve U.S.-based forwarders, brokers, or drayage carriers connected to the load. A California attorney can assess the coverage and the correct parties.',
      },
      {
        q: 'The trucker seemed at fault but works for a big company. Does that help?',
        a: 'Usually yes. A motor carrier is generally responsible for its driver acting in the scope of employment and can be directly liable for negligent hiring, training, or retention, which brings the company\u2019s larger insurance into play.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the liability and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_TRUCK_SLUG,
    category: 'Cities',
    cluster: 'San Jose Truck Accident Claims',
    title: 'San Jose Truck Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Jose\u2019s US-101, I-880, and I-680 carry Silicon Valley last-mile delivery, construction hauling, and tech distribution. A truck claim here turns on federal records, layered liability, and preserving evidence fast.',
    psychology: 'I was hit by a big truck in San Jose and do not know who is responsible or how to protect the evidence.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose truck accident claim',
      'delivery truck accident silicon valley california',
      'hit by a semi truck on the 880 who is liable',
      'truck accident black box evidence preservation',
      'who is liable in a truck accident california',
    ],
    signals: [
      'FMCSA / hours-of-service',
      'Layered carrier liability',
      'Last-mile / construction hauling',
      'High-cost injury exposure',
      'Higher carrier insurance limits',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s freight is dominated by last-mile delivery, construction hauling for the region\u2019s constant building, and distribution serving the tech economy, moving on a dense US-101, I-880, and I-680. Because medical and wage costs here are among the highest in the state, a serious truck collision produces a large claim \u2014 and reaching adequate coverage depends on the two features that separate a truck claim from a car claim. The first is federal regulation. ${FMCSA} The second is layered liability. ${LAYERED} A last-mile delivery collision often involves a national retailer or platform, a delivery service partner, and a driver, each a potential defendant. ${INSURANCE} All of it depends on evidence that vanishes. ${PRESERVE} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs unless a public entity is involved. Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'The carrier name and USDOT number on the truck',
        'Whether it was a last-mile delivery, construction, or distribution truck',
        'A prompt spoliation letter for ELD, black-box, dashcam, and maintenance files',
        'Whether a retailer, platform, or delivery service partner was involved',
        'Whether the driver was an employee or owner-operator',
        'The corridor and exact location of the collision',
        'Post-crash drug and alcohol testing of the driver',
        'Medical treatment and wage loss from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ treats a San Jose truck collision as the layered, federally regulated claim it is: it prompts to capture the carrier and USDOT number, to send a preservation letter before the ELD and black-box data cycle out, and to identify the retailer, platform, or delivery service partner behind a last-mile driver so the full coverage is reached. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A delivery truck hit me in San Jose. Who can be liable?',
        a: 'Often several parties: the driver, the motor carrier or delivery service partner, and sometimes the national retailer or platform whose goods were being delivered. Last-mile delivery makes these multi-party claims common, and identifying every responsible party opens the coverage a serious injury needs.',
      },
      {
        q: 'What evidence do I need to protect, and how fast?',
        a: 'The electronic logging and hours data, the engine control module or \u201cblack box,\u201d any dashcam footage, and the maintenance and inspection files \u2014 all of which can be overwritten or discarded within weeks. A prompt written spoliation letter demanding the carrier preserve them is usually the single most important early step.',
      },
      {
        q: 'Why does the high cost of living here matter to my claim?',
        a: 'Because medical care and lost wages in the San Jose area are among the highest in the state, a serious truck injury generates a large claim. Reaching the carrier\u2019s higher federal insurance limits, rather than a minimal offer, depends on building the claim on the preserved federal records.',
      },
      {
        q: 'The trucker seemed at fault but works for a big company. Does that help?',
        a: 'Usually yes. A motor carrier is generally responsible for its driver acting in the scope of employment and can be directly liable for negligent hiring, training, or retention, which brings the company\u2019s larger insurance into play.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the liability and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_TRUCK_SLUG,
    category: 'Cities',
    cluster: 'Bakersfield Truck Accident Claims',
    title: 'Bakersfield Truck Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bakersfield\u2019s I-5, Highway 99, Highway 58, and the Grapevine mix oilfield trucks, agricultural haulers, and long-haul freight. A truck claim here turns on federal records, layered liability, and preserving evidence fast.',
    psychology: 'I was hit by a big truck near Bakersfield, maybe on the Grapevine, and do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield truck accident claim',
      'grapevine truck accident california',
      'oilfield truck accident kern county',
      'agricultural hauler truck accident california',
      'who is liable in a truck accident california',
    ],
    signals: [
      'FMCSA / hours-of-service',
      'Oilfield & agricultural haulers',
      'Grapevine / grade collisions',
      'Layered carrier liability',
      'Higher carrier insurance limits',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Bakersfield sits at the crossroads of the I-5, Highway 99, and Highway 58, where long-haul freight, Kern County oilfield trucks, and agricultural haulers all converge, and the Grapevine grade on the I-5 adds steep-descent brake and load failures to the mix. Two features make a truck claim fundamentally different from a car claim. The first is federal regulation. ${FMCSA} Agricultural haulers sometimes claim hours-of-service exemptions that the electronic logs can confirm or disprove, which makes preserving those records especially important here. The second is layered liability. ${LAYERED} An oilfield or ag load can add an operator, a labor contractor, or an equipment owner to the defendants. ${INSURANCE} All of it depends on evidence that vanishes. ${PRESERVE} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs unless a public entity is involved. Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'The carrier name and USDOT number on the truck',
        'Whether it was an oilfield, agricultural, or long-haul truck',
        'Whether any agricultural hours exemption is being claimed',
        'A prompt spoliation letter for ELD, brake, and maintenance files',
        'Whether the crash involved the Grapevine or another grade',
        'Whether the driver was an employee or owner-operator',
        'Post-crash drug and alcohol testing of the driver',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ treats a Bakersfield truck collision as the layered, federally regulated claim it is: it prompts to capture the carrier and USDOT number, to test any claimed agricultural exemption against the electronic logs, and to send a preservation letter for the brake and maintenance files that decide grade-crash cases. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An oilfield or ag truck hit me near Bakersfield. Who can be liable?',
        a: 'Often several parties: the driver, the motor carrier, and sometimes an oilfield operator, a labor contractor, or an equipment owner behind the load. These multi-party claims are common in Kern County, and identifying every responsible party opens the coverage a serious injury needs.',
      },
      {
        q: 'The carrier says the driver was exempt from hours limits. Is that true?',
        a: 'Not necessarily. Some agricultural operations have narrow hours-of-service exemptions, but they apply only in specific circumstances. The electronic logs, preserved in time, often show whether the exemption genuinely applied or an over-hours violation occurred.',
      },
      {
        q: 'What evidence do I need to protect, and how fast?',
        a: 'The electronic logging and hours data, the engine control module or \u201cblack box,\u201d any dashcam footage, and the maintenance and brake-inspection files \u2014 which can be overwritten or discarded within weeks. A prompt written spoliation letter demanding the carrier preserve them is usually the single most important early step.',
      },
      {
        q: 'The crash happened on the Grapevine. Does that change the case?',
        a: 'It can. Steep-descent crashes often turn on brakes and load securement, so the maintenance and inspection files become central. Preserving those records before they are discarded is critical to proving a maintenance violation.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the liability and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_TRUCK_SLUG,
    category: 'Cities',
    cluster: 'Anaheim Truck Accident Claims',
    title: 'Anaheim Truck Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Anaheim\u2019s SR-91, I-5, and SR-57 funnel distribution, last-mile, and tourist-corridor delivery through northern Orange County. A truck claim here turns on federal records, layered liability, and preserving evidence fast.',
    psychology: 'I was hit by a big truck in Anaheim and do not know who is responsible or how to protect the evidence.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim truck accident claim',
      'hit by a semi truck on the 91 who is liable',
      'delivery truck accident orange county california',
      'truck accident black box evidence preservation',
      'who is liable in a truck accident california',
    ],
    signals: [
      'FMCSA / hours-of-service',
      'Layered carrier liability',
      'Distribution & last-mile delivery',
      'ELD / black-box preservation',
      'Higher carrier insurance limits',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Anaheim carries heavy commercial traffic on the SR-91, I-5, and SR-57 \u2014 distribution feeding northern Orange County\u2019s warehouses, last-mile delivery to a dense population, and constant supply runs to the resort and convention district \u2014 so collisions with commercial trucks are common. Two features make a truck claim fundamentally different from a car claim. The first is federal regulation. ${FMCSA} The second is layered liability. ${LAYERED} A distribution or delivery collision often involves a retailer or platform, a carrier, and a driver, each a potential defendant with its own coverage. ${INSURANCE} All of it depends on evidence that vanishes. ${PRESERVE} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs unless a public entity is involved. Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'The carrier name and USDOT number on the truck',
        'Whether it was a distribution, last-mile, or supply-run truck',
        'A prompt spoliation letter for ELD, black-box, dashcam, and maintenance files',
        'Whether a retailer, platform, broker, or shipper was involved',
        'Whether the driver was an employee or owner-operator',
        'The corridor and exact location of the collision',
        'Post-crash drug and alcohol testing of the driver',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ treats an Anaheim truck collision as the layered, federally regulated claim it is: it prompts to capture the carrier and USDOT number, to send a preservation letter before the ELD and black-box data cycle out, and to identify the retailer, platform, broker, or shipper behind the driver so the full coverage is reached. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A distribution or delivery truck hit me in Anaheim. Who can be liable?',
        a: 'Often several parties: the driver, the motor carrier (including for negligent hiring or training), and sometimes a retailer, platform, broker, or shipper behind the load. Orange County\u2019s distribution and delivery volume makes these multi-party claims common, and identifying every responsible party opens the coverage a serious injury needs.',
      },
      {
        q: 'What evidence do I need to protect, and how fast?',
        a: 'The electronic logging and hours data, the engine control module or \u201cblack box,\u201d any dashcam footage, and the maintenance and inspection files \u2014 all of which can be overwritten or discarded within weeks. A prompt written spoliation letter demanding the carrier preserve them is usually the single most important early step.',
      },
      {
        q: 'Why is a truck claim different from a car claim?',
        a: 'Interstate trucking is governed by the Federal Motor Carrier Safety Regulations \u2014 hours-of-service limits, electronic logs, maintenance records, and post-crash testing \u2014 and violations of these are often the heart of the case. Carriers also must carry far higher insurance limits than ordinary drivers.',
      },
      {
        q: 'The trucker seemed at fault but works for a big company. Does that help?',
        a: 'Usually yes. A motor carrier is generally responsible for its driver acting in the scope of employment and can be directly liable for negligent hiring, training, or retention, which brings the company\u2019s larger insurance into play.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the liability and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const truckAccidentCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [SD_TRUCK_SLUG]: {
    scenario: `A driver was struck on the I-805 by a drayage rig that had just cleared Otay Mesa, and the carrier pointed only at its owner-operator. A prompt preservation letter secured the ELD data, and tracing the load through the forwarder and broker opened the full coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Record the carrier name and USDOT number; note the corridor.'],
      ['First days', 'Spoliation letter sent for ELD, black-box, and maintenance files.'],
      ['First weeks', 'Forwarder, broker, drayage carrier, and policy identified.'],
      ['Longer term', 'Federal-record violations and treatment documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured single carrier.'],
      ['Cross-border', 'Forwarder, broker, and drayage carrier all in play.'],
      ['Records at risk', 'ELD and black-box data must be preserved fast.'],
      ['Catastrophic', 'A high-speed freeway impact with severe injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the carrier and USDOT number were identified',
      'Whether the load was traced through the forwarder and broker',
      'Whether ELD, black-box, and maintenance records were preserved',
      'Any hours-of-service or maintenance violations',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Trace the load', copy: 'Cross-border cargo reveals more defendants.' },
      { label: 'Records win cases', copy: 'ELD and black-box data prove the violation.' },
      { label: 'Preserve immediately', copy: 'The data cycles out within weeks.' },
      { label: 'Higher limits apply', copy: 'Interstate carriers carry large policies.' },
    ],
    insuranceProblems: [
      'Only the owner-operator is pursued while the load parties hide.',
      'The ELD and black-box data are overwritten before demand.',
      'A foreign-carrier claim is treated as impossible to pursue.',
      'A serious injury is met with a minimal-limits offer.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the load cross-border cargo from Otay Mesa or Tecate?' },
      { label: 'Step 2', question: 'What carrier and USDOT number were on the truck?' },
      { label: 'Step 3', question: 'Has a preservation letter been sent for the records?' },
      { label: 'Step 4', question: 'Was the driver an employee or owner-operator?' },
    ],
  },
  [SJ_TRUCK_SLUG]: {
    scenario: `A San Jose commuter was hit by a last-mile delivery truck on the I-880, and the delivery service partner pointed only at its driver. Identifying the retailer and platform behind the load, and preserving the ELD data, opened the coverage a high-cost injury demanded. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Record the carrier name and USDOT number; note the corridor.'],
      ['First days', 'Spoliation letter sent for ELD, black-box, and maintenance files.'],
      ['First weeks', 'Retailer, platform, delivery partner, and policy identified.'],
      ['Longer term', 'Federal-record violations, wage loss, and treatment documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured single carrier.'],
      ['Layered', 'Retailer, platform, and delivery partner all in play.'],
      ['Records at risk', 'ELD and black-box data must be preserved fast.'],
      ['Catastrophic', 'A high-speed impact with severe, high-cost injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'High wage loss and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the carrier and USDOT number were identified',
      'Whether the retailer, platform, or delivery partner was reached',
      'Whether ELD, black-box, and maintenance records were preserved',
      'Any hours-of-service or maintenance violations',
      'Injury severity, wage loss, and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Reach the platform', copy: 'The retailer or platform brings larger coverage.' },
      { label: 'High costs raise value', copy: 'Silicon Valley wage loss is substantial.' },
      { label: 'Records win cases', copy: 'ELD and black-box data prove the violation.' },
      { label: 'Higher limits apply', copy: 'Interstate carriers carry large policies.' },
    ],
    insuranceProblems: [
      'Only the driver is pursued while the platform hides.',
      'The ELD and black-box data are overwritten before demand.',
      'High wage loss is undervalued in the offer.',
      'A serious injury is met with a minimal-limits offer.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a last-mile, construction, or distribution truck?' },
      { label: 'Step 2', question: 'What retailer, platform, or partner was behind the load?' },
      { label: 'Step 3', question: 'Has a preservation letter been sent for the records?' },
      { label: 'Step 4', question: 'Was the driver an employee or owner-operator?' },
    ],
  },
  [BAKERSFIELD_TRUCK_SLUG]: {
    scenario: `A driver was hit by a truck on the Grapevine descent when its brakes failed. The maintenance files, preserved before they could be discarded, revealed a skipped brake inspection, and an oilfield operator behind the load was added as a defendant. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Record the carrier and USDOT number; note the grade and truck type.'],
      ['First days', 'Spoliation letter sent for brake, ELD, and maintenance files.'],
      ['First weeks', 'Operator, contractor, or equipment owner and policy identified.'],
      ['Longer term', 'Brake-maintenance or hours violations and treatment documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured single carrier.'],
      ['Grade failure', 'A brake or load failure on the Grapevine.'],
      ['Exemption dispute', 'A claimed agricultural hours exemption in question.'],
      ['Catastrophic', 'A high-speed grade impact with severe injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the carrier and USDOT number were identified',
      'Whether brake, ELD, and maintenance records were preserved',
      'Whether an agricultural hours exemption genuinely applied',
      'Whether an operator, contractor, or equipment owner shares liability',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Brakes are the story', copy: 'Grade crashes turn on maintenance records.' },
      { label: 'Test the exemption', copy: 'Logs show whether an ag exemption truly applied.' },
      { label: 'Preserve immediately', copy: 'The data cycles out within weeks.' },
      { label: 'Higher limits apply', copy: 'Interstate carriers carry large policies.' },
    ],
    insuranceProblems: [
      'The maintenance files are discarded before demand.',
      'A false agricultural exemption goes unchallenged.',
      'Only the owner-operator is pursued while the operator hides.',
      'A serious injury is met with a minimal-limits offer.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it an oilfield, agricultural, or long-haul truck?' },
      { label: 'Step 2', question: 'Did the crash involve the Grapevine or another grade?' },
      { label: 'Step 3', question: 'Has a preservation letter targeted the brake records?' },
      { label: 'Step 4', question: 'Was an agricultural hours exemption claimed?' },
    ],
  },
  [ANAHEIM_TRUCK_SLUG]: {
    scenario: `A driver was struck by a distribution truck on the SR-91, and the carrier pointed only at its driver. A prompt preservation letter secured the ELD data, and identifying the retailer and broker behind the load opened the full coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Record the carrier name and USDOT number; note the corridor.'],
      ['First days', 'Spoliation letter sent for ELD, black-box, and maintenance files.'],
      ['First weeks', 'Retailer, broker, shipper, and carrier policy identified.'],
      ['Longer term', 'Federal-record violations and treatment documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured single carrier.'],
      ['Layered', 'Driver, carrier, retailer, and broker all in play.'],
      ['Records at risk', 'ELD and black-box data must be preserved fast.'],
      ['Catastrophic', 'A high-speed freeway impact with severe injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the carrier and USDOT number were identified',
      'Whether a retailer, broker, or shipper shares liability',
      'Whether ELD, black-box, and maintenance records were preserved',
      'Any hours-of-service or maintenance violations',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Layers open coverage', copy: 'Multiple defendants mean more available insurance.' },
      { label: 'Records win cases', copy: 'ELD and black-box data prove the violation.' },
      { label: 'Preserve immediately', copy: 'The data cycles out within weeks.' },
      { label: 'Higher limits apply', copy: 'Interstate carriers carry large policies.' },
    ],
    insuranceProblems: [
      'Only the driver is pursued while the load parties hide.',
      'The ELD and black-box data are overwritten before demand.',
      'The carrier claims an exemption that the data disproves.',
      'A serious injury is met with a minimal-limits offer.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a distribution, last-mile, or supply-run truck?' },
      { label: 'Step 2', question: 'What carrier and USDOT number were on the truck?' },
      { label: 'Step 3', question: 'Has a preservation letter been sent for the records?' },
      { label: 'Step 4', question: 'Was a retailer, broker, or shipper behind the load?' },
    ],
  },
}
