import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, bus and public-transit practice area: city-specific guides for Los
 * Angeles, San Francisco, San Diego, and Sacramento.
 *
 * This is a new practice area for the geo hub, chosen because two rules converge
 * in transit claims that appear nowhere else:
 *  - The common-carrier heightened duty of "utmost care and diligence" (Civil
 *    Code section 2100), which holds bus, light-rail, streetcar, and cable-car
 *    operators to a standard higher than ordinary negligence toward their
 *    passengers.
 *  - The public-entity claim rules, because most California transit is operated
 *    by public agencies: a written claim must be presented within six months
 *    under the Government Claims Act (Gov. Code section 911.2), and the agency is
 *    vicariously liable for its employees under Government Code section 815.2.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: LA Metro's vast bus network and rail lines (the B/D subway and
 *    the A/E/K light rail), plus Metrolink, all public entities on the six-month
 *    clock.
 *  - San Francisco: Muni buses, light rail, historic streetcars, and the cable
 *    cars, which produce distinctive injuries, plus BART as a separate district;
 *    Muni is part of the City and County of San Francisco.
 *  - San Diego: the MTS Trolley light-rail system and bus network, plus the
 *    Coaster, serving a border region.
 *  - Sacramento: SacRT light rail and buses in the state capital.
 *
 * Applied accurately:
 *  - A passenger benefits from the common-carrier heightened duty; a pedestrian,
 *    cyclist, or motorist hit by a transit vehicle brings an ordinary negligence
 *    claim, but still against a public entity on the six-month deadline.
 *  - Some routes are operated by contracted private companies, which changes who
 *    is sued and whether the six-month rule applies.
 *  - Pure comparative negligence, and the two-year personal-injury deadline
 *    where a private operator (not a public entity) is responsible.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a public entity or a private operator is responsible, whether the six-month claim deadline applies, and how the common-carrier duty and comparative fault are assessed depend on facts a licensed California attorney should review promptly.'

const COMMON_CARRIER =
  'Buses, light rail, streetcars, and cable cars are common carriers, which under Civil Code section 2100 owe their passengers the \u201cutmost care and diligence\u201d \u2014 a duty higher than the ordinary reasonable-care standard. A passenger hurt by a sudden jerk, a hard stop, a fall on boarding, a door closing on them, or an operator\u2019s unsafe move benefits from that elevated standard, which makes many transit-passenger claims stronger than they first appear.'

const SIX_MONTH =
  'Most California transit is run by public agencies, so a claim against the agency must be presented in writing within six months under the Government Claims Act (Gov. Code section 911.2) \u2014 far shorter than the ordinary two years \u2014 and the agency is responsible for its employees\u2019 negligence under Government Code section 815.2. Missing that six-month deadline can end an otherwise strong claim, so acting quickly is essential.'

const WHO_HIT =
  'Who you are shapes the claim. A passenger benefits from the common-carrier heightened duty. A pedestrian, cyclist, or driver struck by a bus or train brings an ordinary negligence claim \u2014 but still against a public entity, so the same six-month deadline applies. In every case, identifying whether the operator is the public agency or a contracted private company determines who is sued and which deadline controls.'

export const LA_TRANSIT_SLUG = '/los-angeles-bus-accident'
export const SF_TRANSIT_SLUG = '/san-francisco-muni-accident'
export const SD_TRANSIT_SLUG = '/san-diego-trolley-accident'
export const SAC_TRANSIT_SLUG = '/sacramento-light-rail-accident'

export const transitCityGuidePages: LandingPage[] = [
  {
    slug: LA_TRANSIT_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Bus and Transit Accident Claims',
    title: 'Los Angeles Bus and Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by an LA Metro bus or train? As a passenger you benefit from a common carrier\u2019s heightened duty of care \u2014 but because Metro is a public agency, you may have only six months to file a claim, not two years.',
    psychology: 'I was hurt on an LA Metro bus or train, or hit by one, and do not know my rights or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles metro bus accident claim',
      'injured on a metro bus who is liable',
      'hit by a metro train los angeles',
      'suing a public transit agency california deadline',
      'common carrier duty of care california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Public entity (six-month claim)',
      'Metro bus / rail',
      'Passenger vs. person hit',
      'Private contractor operator',
      'Utmost-care standard (Civ. 2100)',
    ],
    sections: {
      whyItMatters: `Los Angeles runs one of the largest transit systems in the country \u2014 LA Metro\u2019s sprawling bus network and its rail lines, including the B and D subway lines and the A, E and K light-rail lines, plus Metrolink regional trains \u2014 so injuries both on transit and caused by transit are common. Two rules make these claims distinctive. ${COMMON_CARRIER} That elevated standard is why a passenger thrown by a sudden bus stop or hurt boarding a train often has a stronger claim than they realise. ${SIX_MONTH} ${WHO_HIT} In Los Angeles that final point matters, because Metro contracts some bus service to private operating companies, and whether the responsible operator is the public agency or a contractor changes both who is named and whether the six-month rule governs. Pure comparative negligence applies. The six-month claim deadline governs claims against the public agency, while a claim against a purely private operator runs on the ordinary two years (Code of Civil Procedure section 335.1). Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether you were a passenger or were hit by the vehicle',
        'The line, route, or vehicle number and the operator\u2019s name',
        'Whether the operator is LA Metro or a contracted company',
        'The six-month deadline if a public agency is responsible',
        'How the injury happened \u2014 a jerk, stop, door, fall, or collision',
        'Any onboard or station video and a demand to preserve it',
        'Witnesses among other passengers',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier heightened duty to an LA Metro passenger injury, so the claim is measured against the utmost-care standard, and it identifies whether Metro or a contractor is responsible and flags the six-month deadline before it passes. It prompts to preserve onboard and station video. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt when a Metro bus stopped suddenly. Do I have a claim even without a collision?',
        a: 'Possibly yes. As a common carrier, a bus operator owes passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100 \u2014 a higher standard than ordinary negligence \u2014 so an injury from a sudden or unnecessary hard stop can support a claim even with no collision. How the stop happened and the operator\u2019s conduct are central.',
      },
      {
        q: 'How long do I have to file against LA Metro?',
        a: 'Usually just six months. Because LA Metro is a public agency, a written claim must be presented within six months under the Government Claims Act, far shorter than the ordinary two years. Missing that deadline can end an otherwise strong claim, so acting quickly is essential.',
      },
      {
        q: 'A Metro train or bus hit me while I was walking. Is that different from a passenger claim?',
        a: 'The standard is different \u2014 a pedestrian brings an ordinary negligence claim rather than relying on the common-carrier duty \u2014 but it is still a claim against a public entity, so the same six-month deadline applies. Preserving station and onboard video quickly is important.',
      },
      {
        q: 'What if a private company operated the bus?',
        a: 'It changes who is responsible and which deadline applies. Metro contracts some service to private operators, and a claim against a purely private company runs on the ordinary two-year deadline rather than the six-month public-entity rule. Identifying the operator early is essential to protect the claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the duty and operator questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_TRANSIT_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Muni and Transit Accident Claims',
    title: 'San Francisco Muni and Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Muni bus, train, streetcar, or cable car \u2014 or by one? As a passenger you benefit from a common carrier\u2019s heightened duty, but because Muni is part of the City, you may have only six months to file a claim.',
    psychology: 'I was hurt on Muni or a cable car, or hit by one, and do not know my rights or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco muni accident claim',
      'injured on a muni bus or train who is liable',
      'cable car injury claim san francisco',
      'suing the city for a muni accident deadline',
      'common carrier duty of care california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Public entity (six-month claim)',
      'Muni bus / rail / streetcar',
      'Cable-car injury',
      'BART (separate district)',
      'Utmost-care standard (Civ. 2100)',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s transit is unusually varied \u2014 Muni buses, light-rail Metro, historic F-line streetcars, and the world-famous cable cars, with BART running as a separate regional district \u2014 and each carries the same core legal framework. ${COMMON_CARRIER} The cable cars deserve special mention, because their open design, standing riders, grip-and-brake mechanics, and steep routes produce distinctive injuries \u2014 falls, sudden lurches, and riders thrown from the running boards \u2014 and as common carriers they too owe the utmost-care standard. ${SIX_MONTH} Muni is operated by the San Francisco Municipal Transportation Agency, part of the City and County of San Francisco, so the six-month rule squarely applies; BART, as a separate public district, has its own claim process on the same short timeline. ${WHO_HIT} Pure comparative negligence applies. The six-month claim deadline governs claims against these public agencies, while a claim against a purely private operator runs on the ordinary two years (Code of Civil Procedure section 335.1). Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Whether you were a passenger or were hit by the vehicle',
        'Which system \u2014 Muni bus, Metro, streetcar, cable car, or BART',
        'The line or vehicle number and the operator on duty',
        'The six-month deadline for the responsible agency',
        'How the injury happened \u2014 a lurch, fall, door, or collision',
        'For a cable car, your position (seat, running board, standing)',
        'Any onboard or station video and a demand to preserve it',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier heightened duty to a Muni or cable-car passenger injury and identifies the correct public agency \u2014 the City for Muni, the district for BART \u2014 so the six-month claim reaches the right place in time. It captures the distinctive cable-car injury facts and prompts to preserve video. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I fell on a cable car when it lurched. Do I have a claim?',
        a: 'Possibly yes. Cable cars are common carriers and owe passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100. Their open design and mechanics produce distinctive injuries, and a fall or a rider thrown by a sudden lurch can support a claim measured against that elevated standard. Your position on the car and how it moved are central.',
      },
      {
        q: 'How long do I have to file against Muni?',
        a: 'Usually just six months. Muni is operated by the San Francisco Municipal Transportation Agency, part of the City and County of San Francisco, so a written claim must be presented within six months under the Government Claims Act \u2014 far shorter than the ordinary two years.',
      },
      {
        q: 'Is a BART claim the same as a Muni claim?',
        a: 'The framework is similar but the entity is different. BART is a separate public district with its own claim process, though the six-month public-entity deadline still applies. Identifying the correct agency \u2014 the City for Muni, the district for BART \u2014 is essential so the claim is presented to the right place in time.',
      },
      {
        q: 'A Muni bus or train hit me while I was walking or biking. Is that different?',
        a: 'The standard is different \u2014 you bring an ordinary negligence claim rather than relying on the common-carrier duty \u2014 but it is still a claim against a public entity, so the same six-month deadline applies, and preserving station and onboard video quickly is important.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the duty and agency questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_TRANSIT_SLUG,
    category: 'Cities',
    cluster: 'San Diego Trolley and Transit Accident Claims',
    title: 'San Diego Trolley and Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by the San Diego Trolley or an MTS bus? As a passenger you benefit from a common carrier\u2019s heightened duty \u2014 but because MTS is a public agency, you may have only six months to file a claim, not two years.',
    psychology: 'I was hurt on the San Diego Trolley or an MTS bus, or hit by one, and do not know how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego trolley accident claim',
      'injured on an mts bus who is liable',
      'hit by the trolley san diego',
      'suing a public transit agency california deadline',
      'common carrier duty of care california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Public entity (six-month claim)',
      'MTS Trolley / bus',
      'Passenger vs. person hit',
      'Grade-crossing collision',
      'Utmost-care standard (Civ. 2100)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s transit centers on the MTS Trolley light-rail system and the region\u2019s bus network, with the Coaster serving the coastal corridor. The legal framework mirrors the rest of the state. ${COMMON_CARRIER} A trolley rider hurt by a sudden stop, a fall boarding or alighting, or a door problem benefits from that elevated standard. Light rail also raises a distinctive hazard: the Trolley runs at street level through many crossings, so grade-crossing collisions with pedestrians, cyclists and cars are a recurring pattern, and those cases turn on crossing signals, gates, sight lines and operator conduct. ${SIX_MONTH} ${WHO_HIT} The border region adds practical wrinkles \u2014 heavy trolley use near the San Ysidro crossing and a large transit-dependent ridership \u2014 but the deadlines and standards are the same. Pure comparative negligence applies. The six-month claim deadline governs claims against the public agency, while a claim against a purely private operator runs on the ordinary two years (Code of Civil Procedure section 335.1). Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Whether you were a passenger or were hit by the vehicle',
        'Whether it was the Trolley, an MTS bus, or the Coaster',
        'For a crossing collision, the signals, gates, and sight lines',
        'The six-month deadline if a public agency is responsible',
        'How the injury happened \u2014 a stop, fall, door, or collision',
        'The line or vehicle number and the operator on duty',
        'Any onboard or crossing video and a demand to preserve it',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier heightened duty to an MTS Trolley or bus passenger injury and develops the grade-crossing facts \u2014 signals, gates, sight lines \u2014 for a person struck at a crossing, while flagging the six-month public-entity deadline before it passes. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt when the Trolley stopped suddenly. Do I have a claim?',
        a: 'Possibly yes. As a common carrier, the Trolley owes passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100 \u2014 a higher standard than ordinary negligence \u2014 so an injury from a sudden or unnecessary stop, a boarding fall, or a door problem can support a claim. How it happened and the operator\u2019s conduct are central.',
      },
      {
        q: 'The Trolley hit me at a street crossing. What matters most?',
        a: 'Grade-crossing collisions turn on the crossing signals, gates, sight lines and the operator\u2019s conduct, because the Trolley runs at street level through many crossings. Preserving the crossing and onboard video quickly is important, and because MTS is a public agency the six-month claim deadline applies.',
      },
      {
        q: 'How long do I have to file against MTS?',
        a: 'Usually just six months. Because MTS is a public agency, a written claim must be presented within six months under the Government Claims Act, far shorter than the ordinary two years. Missing that deadline can end an otherwise strong claim.',
      },
      {
        q: 'What if a private company operated the bus?',
        a: 'It changes who is responsible and which deadline applies. A claim against a purely private operator runs on the ordinary two-year deadline rather than the six-month public-entity rule, so identifying the operator early is essential.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the duty and crossing questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_TRANSIT_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Light Rail and Transit Accident Claims',
    title: 'Sacramento Light Rail and Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by SacRT light rail or a bus? As a passenger you benefit from a common carrier\u2019s heightened duty \u2014 but because SacRT is a public agency, you may have only six months to file a claim, not two years.',
    psychology: 'I was hurt on SacRT light rail or a bus, or hit by one, and do not know how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento light rail accident claim',
      'injured on a sacrt bus who is liable',
      'hit by light rail sacramento',
      'suing a public transit agency california deadline',
      'common carrier duty of care california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Public entity (six-month claim)',
      'SacRT light rail / bus',
      'Grade-crossing collision',
      'Passenger vs. person hit',
      'Utmost-care standard (Civ. 2100)',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s transit runs on the Sacramento Regional Transit District (SacRT) light-rail lines and bus network across the state capital and its suburbs. The legal framework is the statewide one. ${COMMON_CARRIER} A light-rail rider hurt by a sudden stop, a fall on boarding or alighting, or a door closing benefits from that elevated standard. As with other street-running light rail, SacRT crosses many streets at grade, so grade-crossing collisions with pedestrians, cyclists and cars are a recurring pattern that turns on signals, gates, sight lines and operator conduct. ${SIX_MONTH} SacRT is a public agency, so the six-month rule squarely applies. ${WHO_HIT} Pure comparative negligence applies. The six-month claim deadline governs claims against the public agency, while a claim against a purely private operator runs on the ordinary two years (Code of Civil Procedure section 335.1). Civil cases are filed in Sacramento County Superior Court at the Gordon D. Schaber Downtown Courthouse.`,
      whatToTrack: [
        'Whether you were a passenger or were hit by the vehicle',
        'Whether it was SacRT light rail or a bus',
        'For a crossing collision, the signals, gates, and sight lines',
        'The six-month deadline for the public agency',
        'How the injury happened \u2014 a stop, fall, door, or collision',
        'The line or vehicle number and the operator on duty',
        'Any onboard or crossing video and a demand to preserve it',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier heightened duty to a SacRT light-rail or bus passenger injury and develops the grade-crossing facts for a person struck at a crossing, while flagging the six-month public-entity deadline that is easy to miss. It prompts to preserve onboard and crossing video. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt when SacRT light rail stopped suddenly. Do I have a claim?',
        a: 'Possibly yes. As a common carrier, SacRT owes passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100 \u2014 a higher standard than ordinary negligence \u2014 so an injury from a sudden stop, a boarding fall, or a door problem can support a claim. How it happened and the operator\u2019s conduct are central.',
      },
      {
        q: 'Light rail hit me at a street crossing. What matters most?',
        a: 'Grade-crossing collisions turn on the crossing signals, gates, sight lines and operator conduct, because the light rail runs at street level through many crossings. Preserving the crossing and onboard video quickly is important, and because SacRT is a public agency the six-month claim deadline applies.',
      },
      {
        q: 'How long do I have to file against SacRT?',
        a: 'Usually just six months. Because SacRT is a public agency, a written claim must be presented within six months under the Government Claims Act, far shorter than the ordinary two years. Missing that deadline can end an otherwise strong claim.',
      },
      {
        q: 'A pedestrian claim versus a passenger claim \u2014 does the deadline differ?',
        a: 'The legal standard differs \u2014 a passenger relies on the common-carrier heightened duty while a pedestrian brings an ordinary negligence claim \u2014 but both are claims against a public entity, so the same six-month deadline applies to each.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the duty and crossing questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const transitCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_TRANSIT_SLUG]: {
    scenario: `A passenger was thrown when a Metro bus braked hard to beat a light, and assumed there was no claim without a crash. The common-carrier utmost-care standard applied, and a written claim reached Metro within the six-month deadline. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the route and vehicle number; get the operator and witnesses.'],
      ['First days', 'Whether Metro or a contractor operated the vehicle confirmed.'],
      ['Six months', 'Written claim presented to the responsible public agency.'],
      ['Longer term', 'Onboard video preserved and treatment documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Utmost-care standard under Civil Code 2100.'],
      ['Person hit', 'Ordinary negligence against a public entity.'],
      ['Contractor', 'A private operator on the two-year deadline.'],
      ['Missed claim', 'The six-month deadline passes and bars the claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether you were a passenger or were hit',
      'Whether Metro or a private contractor is responsible',
      'Whether the six-month claim was presented in time',
      'The common-carrier utmost-care standard for passengers',
      'Whether onboard or station video was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher duty for riders', copy: 'Utmost care is stronger than ordinary negligence.' },
      { label: 'Six-month clock', copy: 'A public-agency claim runs on a short deadline.' },
      { label: 'Operator identity matters', copy: 'Metro or contractor changes the deadline.' },
      { label: 'Video is key', copy: 'Onboard footage is time-sensitive.' },
    ],
    insuranceProblems: [
      'The passenger assumes no claim without a collision.',
      'The six-month deadline passes unnoticed.',
      'A contractor operator is never identified.',
      'Onboard video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger or hit by the vehicle?' },
      { label: 'Step 2', question: 'Was it operated by Metro or a private company?' },
      { label: 'Step 3', question: 'How long ago did the incident happen?' },
      { label: 'Step 4', question: 'Has onboard or station video been requested?' },
    ],
  },
  [SF_TRANSIT_SLUG]: {
    scenario: `A rider on a cable car running board was thrown when it lurched on a hill, and thought the ride\u2019s reputation was the risk they accepted. The common-carrier utmost-care standard applied, and a City claim was presented within six months. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the line and car; get the operator and witnesses.'],
      ['First days', 'The correct agency \u2014 City for Muni, district for BART \u2014 confirmed.'],
      ['Six months', 'Written claim presented to the responsible public agency.'],
      ['Longer term', 'Onboard video preserved and treatment documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Utmost-care standard under Civil Code 2100.'],
      ['Cable car', 'Open design produces distinctive injuries.'],
      ['Person hit', 'Ordinary negligence against a public entity.'],
      ['Missed claim', 'The six-month deadline passes and bars the claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether you were a passenger or were hit',
      'Which agency \u2014 the City for Muni or the BART district',
      'Whether the six-month claim was presented in time',
      'The common-carrier utmost-care standard for passengers',
      'For a cable car, your position and how it moved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher duty for riders', copy: 'Utmost care is stronger than ordinary negligence.' },
      { label: 'Cable cars are distinctive', copy: 'Open design and mechanics raise unique risks.' },
      { label: 'Right agency, right clock', copy: 'Muni and BART each run on six months.' },
      { label: 'Video is key', copy: 'Onboard footage is time-sensitive.' },
    ],
    insuranceProblems: [
      'The rider assumes a cable car\u2019s risks are accepted.',
      'The claim is sent to the wrong agency.',
      'The six-month deadline passes unnoticed.',
      'Onboard video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which system \u2014 Muni, cable car, streetcar, or BART?' },
      { label: 'Step 2', question: 'Were you a passenger or hit by the vehicle?' },
      { label: 'Step 3', question: 'How long ago did the incident happen?' },
      { label: 'Step 4', question: 'For a cable car, where were you positioned?' },
    ],
  },
  [SD_TRANSIT_SLUG]: {
    scenario: `A pedestrian was struck by the Trolley at a downtown grade crossing where the gates were slow. The crossing and onboard video were preserved and a written claim reached MTS within six months. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the crossing, line, and car; get witnesses.'],
      ['First days', 'The crossing signals, gates, and sight lines documented.'],
      ['Six months', 'Written claim presented to the responsible public agency.'],
      ['Longer term', 'Crossing and onboard video preserved and treatment documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Utmost-care standard under Civil Code 2100.'],
      ['Grade crossing', 'Signals, gates, and sight lines at issue.'],
      ['Person hit', 'Ordinary negligence against a public entity.'],
      ['Missed claim', 'The six-month deadline passes and bars the claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether you were a passenger or were hit',
      'For a crossing, the signals, gates, and sight lines',
      'Whether the six-month claim was presented in time',
      'The common-carrier utmost-care standard for passengers',
      'Whether crossing and onboard video was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher duty for riders', copy: 'Utmost care is stronger than ordinary negligence.' },
      { label: 'Crossings are distinctive', copy: 'Street-level rail raises crossing questions.' },
      { label: 'Six-month clock', copy: 'A public-agency claim runs on a short deadline.' },
      { label: 'Video is key', copy: 'Crossing and onboard footage is time-sensitive.' },
    ],
    insuranceProblems: [
      'The crossing signals and gates are never documented.',
      'The six-month deadline passes unnoticed.',
      'Crossing video is overwritten before demand.',
      'A passenger assumes no claim without a collision.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger or hit at a crossing?' },
      { label: 'Step 2', question: 'What were the crossing signals and gates doing?' },
      { label: 'Step 3', question: 'How long ago did the incident happen?' },
      { label: 'Step 4', question: 'Has crossing or onboard video been requested?' },
    ],
  },
  [SAC_TRANSIT_SLUG]: {
    scenario: `A cyclist was struck by SacRT light rail at a street crossing, and a rider on the same train was hurt by the emergency stop. Both were public-entity claims presented within six months, with the passenger measured against the utmost-care standard. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the crossing or car; get the operator and witnesses.'],
      ['First days', 'The crossing facts or the onboard event documented.'],
      ['Six months', 'Written claim presented to SacRT.'],
      ['Longer term', 'Crossing and onboard video preserved and treatment documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Utmost-care standard under Civil Code 2100.'],
      ['Grade crossing', 'Signals, gates, and sight lines at issue.'],
      ['Person hit', 'Ordinary negligence against a public entity.'],
      ['Missed claim', 'The six-month deadline passes and bars the claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether you were a passenger or were hit',
      'For a crossing, the signals, gates, and sight lines',
      'Whether the six-month claim was presented in time',
      'The common-carrier utmost-care standard for passengers',
      'Whether crossing and onboard video was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher duty for riders', copy: 'Utmost care is stronger than ordinary negligence.' },
      { label: 'Crossings are distinctive', copy: 'Street-level rail raises crossing questions.' },
      { label: 'Six-month clock', copy: 'A public-agency claim runs on a short deadline.' },
      { label: 'Video is key', copy: 'Crossing and onboard footage is time-sensitive.' },
    ],
    insuranceProblems: [
      'The crossing signals and gates are never documented.',
      'The six-month deadline passes unnoticed.',
      'Onboard or crossing video is overwritten before demand.',
      'A passenger assumes no claim without a collision.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you a passenger or hit at a crossing?' },
      { label: 'Step 2', question: 'What were the crossing signals and gates doing?' },
      { label: 'Step 3', question: 'How long ago did the incident happen?' },
      { label: 'Step 4', question: 'Has crossing or onboard video been requested?' },
    ],
  },
}
