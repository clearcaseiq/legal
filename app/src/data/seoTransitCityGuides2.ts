import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, bus and public-transit practice area (batch 2): city-specific
 * guides for San Jose, Oakland, Long Beach, and Anaheim, extending the batch-1
 * hub (Los Angeles, San Francisco, San Diego, Sacramento).
 *
 * The same two rules converge as in batch 1:
 *  - The common-carrier heightened duty of "utmost care and diligence" (Civil
 *    Code section 2100) toward passengers.
 *  - The public-entity claim rules: a written claim within six months under the
 *    Government Claims Act (Gov. Code section 911.2), and vicarious liability for
 *    employees under Government Code section 815.2.
 *
 * Local context, genuine rather than interpolated:
 *  - San Jose: the VTA bus network and light-rail lines through Silicon Valley,
 *    a public district on the six-month clock.
 *  - Oakland: AC Transit buses across the East Bay and BART trains through the
 *    Oakland core, two separate public agencies.
 *  - Long Beach: Long Beach Transit buses plus the Metro A Line light rail that
 *    terminates downtown \u2014 two different public agencies with two claim tracks.
 *  - Anaheim: OCTA buses and the ART (Anaheim Resort Transportation) shuttles
 *    serving the resort district, where a contracted operator often runs service.
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
  'Buses and light rail are common carriers, which under Civil Code section 2100 owe their passengers the \u201cutmost care and diligence\u201d \u2014 a duty higher than the ordinary reasonable-care standard. A passenger hurt by a sudden jerk, a hard stop, a fall on boarding, a door closing on them, or an operator\u2019s unsafe move benefits from that elevated standard, which makes many transit-passenger claims stronger than they first appear.'

const SIX_MONTH =
  'Most California transit is run by public agencies, so a claim against the agency must be presented in writing within six months under the Government Claims Act (Gov. Code section 911.2) \u2014 far shorter than the ordinary two years \u2014 and the agency is responsible for its employees\u2019 negligence under Government Code section 815.2. Missing that six-month deadline can end an otherwise strong claim, so acting quickly is essential.'

const WHO_HIT =
  'Who you are shapes the claim. A passenger benefits from the common-carrier heightened duty. A pedestrian, cyclist, or driver struck by a bus or train brings an ordinary negligence claim \u2014 but still against a public entity, so the same six-month deadline applies. In every case, identifying whether the operator is the public agency or a contracted private company determines who is sued and which deadline controls.'

export const SJ_TRANSIT_SLUG = '/san-jose-vta-accident'
export const OAK_TRANSIT_SLUG = '/oakland-ac-transit-accident'
export const LB_TRANSIT_SLUG = '/long-beach-bus-accident'
export const ANAHEIM_TRANSIT_SLUG = '/anaheim-octa-bus-accident'

export const transitCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_TRANSIT_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose VTA and Transit Accident Claims',
    title: 'San Jose VTA and Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by a VTA bus or light-rail train in San Jose? As a passenger you benefit from a common carrier\u2019s heightened duty of care \u2014 but because VTA is a public agency, you may have only six months to file a claim, not two years.',
    psychology: 'I was hurt on a VTA bus or light-rail train, or hit by one, and do not know my rights or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose vta accident claim',
      'injured on a vta bus who is liable',
      'hit by a vta light rail train san jose',
      'suing a public transit agency california deadline',
      'common carrier duty of care california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Public entity (six-month claim)',
      'VTA bus / light rail',
      'Passenger vs. person hit',
      'Grade-crossing collision',
      'Utmost-care standard (Civ. 2100)',
    ],
    sections: {
      whyItMatters: `San Jose is served by the Santa Clara Valley Transportation Authority (VTA), which runs a broad bus network and a light-rail system through Silicon Valley, so injuries both on transit and caused by transit are common. Two rules make these claims distinctive. ${COMMON_CARRIER} That elevated standard is why a passenger thrown by a sudden bus stop or a lurching light-rail car often has a stronger claim than they realise. ${SIX_MONTH} ${WHO_HIT} VTA\u2019s light rail runs at street level through parts of San Jose, so grade-crossing and turning collisions with pedestrians, cyclists, and cars occur \u2014 those are ordinary-negligence claims but still against a public entity on the six-month clock. Pure comparative negligence applies. The six-month deadline governs claims against VTA, while a claim against a purely private operator runs on the ordinary two years (Code of Civil Procedure section 335.1). Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'Whether you were a passenger or were hit by the vehicle',
        'The line, route, or vehicle number and the operator\u2019s name',
        'Whether the operator is VTA or a contracted company',
        'The six-month deadline if a public agency is responsible',
        'How the injury happened \u2014 a jerk, stop, door, fall, or collision',
        'Any onboard or station video and a demand to preserve it',
        'Witnesses among other passengers',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier heightened duty to a VTA passenger injury, identifies whether VTA or a contractor is responsible, and flags the six-month deadline before it passes. It prompts to preserve onboard and station video and recognises street-level light-rail crossing collisions. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt when a VTA bus stopped suddenly. Do I have a claim even without a collision?',
        a: 'Possibly yes. As a common carrier, a bus operator owes passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100 \u2014 higher than ordinary negligence \u2014 so an injury from a sudden or unnecessary hard stop can support a claim even with no collision.',
      },
      {
        q: 'How long do I have to file against VTA?',
        a: 'Usually just six months. Because VTA is a public agency, a written claim must be presented within six months under the Government Claims Act, far shorter than the ordinary two years. Missing that deadline can end an otherwise strong claim.',
      },
      {
        q: 'A VTA light-rail train hit me at a crossing. Is that different from a passenger claim?',
        a: 'The standard is different \u2014 a pedestrian or driver brings an ordinary negligence claim rather than relying on the common-carrier duty \u2014 but it is still a claim against a public entity, so the same six-month deadline applies. Preserving crossing and onboard video quickly is important.',
      },
      {
        q: 'What if a private company operated the bus?',
        a: 'It changes who is responsible and which deadline applies. A claim against a purely private operator runs on the ordinary two-year deadline rather than the six-month public-entity rule, so identifying the operator early is essential.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the duty and operator questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_TRANSIT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland AC Transit and BART Accident Claims',
    title: 'Oakland AC Transit and BART Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by an AC Transit bus or a BART train in Oakland? As a passenger you benefit from a common carrier\u2019s heightened duty of care \u2014 but because both are public agencies, you may have only six months to file a claim, not two years.',
    psychology: 'I was hurt on an AC Transit bus or a BART train, or hit by one, and do not know which agency to claim against or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland ac transit bus accident claim',
      'injured on a bart train who is liable',
      'hit by an ac transit bus oakland',
      'suing bart california deadline',
      'common carrier duty of care california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Public entity (six-month claim)',
      'AC Transit bus / BART rail',
      'Two separate agencies',
      'Passenger vs. person hit',
      'Utmost-care standard (Civ. 2100)',
    ],
    sections: {
      whyItMatters: `Oakland is served by two separate public transit agencies: AC Transit operates the East Bay bus network, and BART operates the regional rail system through the Oakland core, so identifying the correct agency is the first step in any claim. Two rules make these claims distinctive. ${COMMON_CARRIER} A passenger thrown on an AC Transit bus that brakes hard, or hurt boarding or on a BART platform, benefits from that elevated standard. ${SIX_MONTH} Because AC Transit and BART are different agencies, presenting the six-month claim to the right one matters. ${WHO_HIT} Pure comparative negligence applies. The six-month deadline governs claims against either public agency, while a claim against a purely private operator runs on the ordinary two years (Code of Civil Procedure section 335.1). Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'Whether you were a passenger or were hit by the vehicle',
        'Whether it was an AC Transit bus or a BART train',
        'The line, route, or vehicle number and the operator\u2019s name',
        'The six-month deadline and the correct agency to claim against',
        'How the injury happened \u2014 a jerk, stop, door, fall, or collision',
        'Any onboard or station video and a demand to preserve it',
        'Witnesses among other passengers',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier heightened duty to an AC Transit or BART passenger injury, and \u2014 crucially where two agencies overlap \u2014 identifies the correct public entity so the six-month claim reaches the right one before it passes. It prompts to preserve onboard and station video. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a BART platform. Which agency do I claim against?',
        a: 'BART, as a public transit district, is likely the responsible entity for a platform or train injury, and a written claim must be presented within six months under the Government Claims Act. AC Transit is a separate agency, so identifying the correct one early is essential.',
      },
      {
        q: 'I was hurt when an AC Transit bus braked hard. Do I have a claim without a collision?',
        a: 'Possibly yes. As a common carrier, the bus operator owes passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100, so an injury from a sudden or unnecessary hard stop can support a claim even with no collision.',
      },
      {
        q: 'How long do I have to file?',
        a: 'Usually just six months. Both AC Transit and BART are public agencies, so a written claim must be presented within six months under the Government Claims Act, far shorter than the ordinary two years.',
      },
      {
        q: 'A bus or train hit me while I was walking or cycling. Is that different?',
        a: 'The standard is different \u2014 you bring an ordinary negligence claim rather than relying on the common-carrier duty \u2014 but it is still a claim against a public entity, so the same six-month deadline applies.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the duty and agency questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_TRANSIT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Bus and Transit Accident Claims',
    title: 'Long Beach Bus and Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by a Long Beach Transit bus or the Metro A Line? As a passenger you benefit from a common carrier\u2019s heightened duty of care \u2014 but because both are public agencies, you may have only six months to file a claim, not two years.',
    psychology: 'I was hurt on a Long Beach Transit bus or the A Line train, or hit by one, and do not know which agency to claim against or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach transit bus accident claim',
      'injured on the metro a line who is liable',
      'hit by a bus long beach',
      'suing a public transit agency california deadline',
      'common carrier duty of care california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Public entity (six-month claim)',
      'Long Beach Transit / Metro A Line',
      'Two separate agencies',
      'Passenger vs. person hit',
      'Utmost-care standard (Civ. 2100)',
    ],
    sections: {
      whyItMatters: `Long Beach is served by Long Beach Transit\u2019s bus network and by the Metro A Line light rail, which terminates downtown after running the length of the corridor from Los Angeles \u2014 two different public agencies, so identifying the correct one is the first step. Two rules make these claims distinctive. ${COMMON_CARRIER} A passenger thrown on a bus that brakes hard, or hurt boarding the A Line, benefits from that elevated standard. ${SIX_MONTH} Because Long Beach Transit and LA Metro (which runs the A Line) are separate agencies, the six-month claim must reach the right one. ${WHO_HIT} The A Line runs at street level in places, so crossing and turning collisions with pedestrians, cyclists, and cars occur \u2014 ordinary-negligence claims but still against a public entity on the six-month clock. Pure comparative negligence applies. The six-month deadline governs claims against either public agency, while a claim against a purely private operator runs on the ordinary two years (Code of Civil Procedure section 335.1). Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether you were a passenger or were hit by the vehicle',
        'Whether it was a Long Beach Transit bus or the Metro A Line',
        'The line, route, or vehicle number and the operator\u2019s name',
        'The six-month deadline and the correct agency to claim against',
        'How the injury happened \u2014 a jerk, stop, door, fall, or collision',
        'Any onboard or station video and a demand to preserve it',
        'Witnesses among other passengers',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier heightened duty to a Long Beach Transit or A Line passenger injury, identifies which of the two agencies is responsible so the six-month claim reaches the right one, and recognises street-level A Line crossing collisions. It prompts to preserve onboard and station video. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on the Metro A Line in Long Beach. Which agency do I claim against?',
        a: 'The A Line is operated by LA Metro, a public agency, so a written claim must be presented within six months under the Government Claims Act. Long Beach Transit is a separate agency for the buses, so identifying the correct one early is essential.',
      },
      {
        q: 'I was hurt when a bus stopped suddenly. Do I have a claim without a collision?',
        a: 'Possibly yes. As a common carrier, the bus operator owes passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100, so an injury from a sudden or unnecessary hard stop can support a claim even with no collision.',
      },
      {
        q: 'How long do I have to file?',
        a: 'Usually just six months. Both Long Beach Transit and LA Metro are public agencies, so a written claim must be presented within six months under the Government Claims Act, far shorter than the ordinary two years.',
      },
      {
        q: 'The A Line train hit me at a crossing. Is that different from a passenger claim?',
        a: 'The standard is different \u2014 you bring an ordinary negligence claim rather than relying on the common-carrier duty \u2014 but it is still a claim against a public entity, so the same six-month deadline applies.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the duty and agency questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_TRANSIT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim OCTA and Resort Transit Accident Claims',
    title: 'Anaheim OCTA and Resort Transit Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on or by an OCTA bus or an Anaheim Resort shuttle? As a passenger you benefit from a common carrier\u2019s heightened duty of care \u2014 but whether a public agency or a contracted operator is responsible changes who you sue and how long you have.',
    psychology: 'I was hurt on an OCTA bus or a resort-district shuttle, or hit by one, and do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim octa bus accident claim',
      'injured on a resort shuttle who is liable',
      'hit by a bus anaheim',
      'suing a public transit agency california deadline',
      'common carrier duty of care california',
    ],
    signals: [
      'Common-carrier heightened duty',
      'Public entity (six-month claim)',
      'OCTA bus / ART shuttle',
      'Contracted private operator',
      'Passenger vs. person hit',
      'Utmost-care standard (Civ. 2100)',
    ],
    sections: {
      whyItMatters: `Anaheim is served by the Orange County Transportation Authority (OCTA) bus network and, around the resort district, by the Anaheim Resort Transportation (ART) shuttle system \u2014 and the operator question is unusually important here, because ART service is run under contract rather than directly by a transit district. Two rules make these claims distinctive. ${COMMON_CARRIER} A passenger thrown on a bus or shuttle that brakes hard benefits from that elevated standard regardless of who operates it. ${SIX_MONTH} ${WHO_HIT} In Anaheim the operator identity is the pivotal fact: a claim involving an OCTA bus runs on the six-month public-entity clock, while a claim involving a purely private contracted shuttle can run on the ordinary two years \u2014 and getting this wrong can forfeit a claim. Heavy tourist foot traffic also means many injured people are visitors who leave the area, so securing the incident report and operator details early matters. Pure comparative negligence applies. Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Whether you were a passenger or were hit by the vehicle',
        'Whether it was an OCTA bus or an ART resort shuttle',
        'Whether the operator is a public agency or a private contractor',
        'The six-month deadline if a public agency is responsible',
        'How the injury happened \u2014 a jerk, stop, door, fall, or collision',
        'Any onboard or station video and a demand to preserve it',
        'Whether you are an out-of-area visitor',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier heightened duty to an OCTA or resort-shuttle passenger injury and focuses hard on the pivotal operator question \u2014 public agency (six-month claim) versus private contractor (two years) \u2014 while flagging the out-of-area visitor timing problem. It prompts to preserve onboard and station video. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a resort-district shuttle. Is that a public-agency claim?',
        a: 'It depends on the operator. Anaheim Resort Transportation shuttles are run under contract, so the claim may be against a private operator on the ordinary two-year deadline rather than the six-month public-entity rule that governs OCTA. Identifying the operator early is essential.',
      },
      {
        q: 'I was hurt when an OCTA bus stopped suddenly. Do I have a claim without a collision?',
        a: 'Possibly yes. As a common carrier, the bus operator owes passengers the \u201cutmost care and diligence\u201d under Civil Code section 2100, so an injury from a sudden or unnecessary hard stop can support a claim even with no collision.',
      },
      {
        q: 'How long do I have to file against OCTA?',
        a: 'Usually just six months. Because OCTA is a public agency, a written claim must be presented within six months under the Government Claims Act, far shorter than the ordinary two years.',
      },
      {
        q: 'I was hurt while visiting and have gone home. Can I still claim?',
        a: 'Yes. An injury in California is governed by California law regardless of where you live, and you can pursue the claim from out of state. Because gathering the incident report and operator details is harder after you leave, act promptly \u2014 especially given the possible six-month deadline.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the duty and operator questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const transitCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_TRANSIT_SLUG]: {
    scenario: `A passenger was thrown when a VTA bus braked hard, and assumed there was no claim without a crash. The common-carrier utmost-care standard applied, and a written claim reached VTA within the six-month deadline. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the route and vehicle number; get the operator and witnesses.'],
      ['First days', 'Whether VTA or a contractor operated the vehicle confirmed.'],
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
      'Whether VTA or a private contractor is responsible',
      'Whether the six-month claim was presented in time',
      'The common-carrier utmost-care standard for passengers',
      'Whether onboard or crossing video was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher duty for riders', copy: 'Utmost care is stronger than ordinary negligence.' },
      { label: 'Six-month clock', copy: 'A public-agency claim runs on a short deadline.' },
      { label: 'Operator identity matters', copy: 'VTA or contractor changes the deadline.' },
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
      { label: 'Step 2', question: 'Was it operated by VTA or a private company?' },
      { label: 'Step 3', question: 'How long ago did the incident happen?' },
      { label: 'Step 4', question: 'Has onboard or crossing video been requested?' },
    ],
  },
  [OAK_TRANSIT_SLUG]: {
    scenario: `A rider was hurt on a BART platform and first sent a claim to AC Transit, the wrong agency. Recognising BART as the responsible district, a written claim reached it within the six-month deadline. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether it was AC Transit or BART; get the vehicle and witnesses.'],
      ['First days', 'The correct agency confirmed.'],
      ['Six months', 'Written claim presented to the responsible public agency.'],
      ['Longer term', 'Onboard or station video preserved and treatment documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Utmost-care standard under Civil Code 2100.'],
      ['Person hit', 'Ordinary negligence against a public entity.'],
      ['Wrong agency', 'A claim sent to the wrong district wastes time.'],
      ['Missed claim', 'The six-month deadline passes and bars the claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether it was an AC Transit bus or a BART train',
      'Whether the six-month claim reached the correct agency',
      'Whether you were a passenger or were hit',
      'The common-carrier utmost-care standard for passengers',
      'Whether onboard or station video was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Identify the agency', copy: 'AC Transit and BART are separate entities.' },
      { label: 'Six-month clock', copy: 'A public-agency claim runs on a short deadline.' },
      { label: 'Higher duty for riders', copy: 'Utmost care is stronger than ordinary negligence.' },
      { label: 'Video is key', copy: 'Onboard and platform footage is time-sensitive.' },
    ],
    insuranceProblems: [
      'The claim is sent to the wrong agency.',
      'The six-month deadline passes unnoticed.',
      'The passenger assumes no claim without a collision.',
      'Platform or onboard video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it an AC Transit bus or a BART train?' },
      { label: 'Step 2', question: 'Were you a passenger or hit by the vehicle?' },
      { label: 'Step 3', question: 'How long ago did the incident happen?' },
      { label: 'Step 4', question: 'Has onboard or station video been requested?' },
    ],
  },
  [LB_TRANSIT_SLUG]: {
    scenario: `A passenger was hurt boarding the Metro A Line downtown and assumed Long Beach Transit was responsible. Recognising LA Metro as the A Line operator, a written claim reached the correct agency within six months. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether it was Long Beach Transit or the A Line; get the vehicle number.'],
      ['First days', 'The correct agency confirmed.'],
      ['Six months', 'Written claim presented to the responsible public agency.'],
      ['Longer term', 'Onboard or station video preserved and treatment documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Utmost-care standard under Civil Code 2100.'],
      ['Person hit', 'Ordinary negligence against a public entity.'],
      ['Wrong agency', 'A claim sent to the wrong agency wastes time.'],
      ['Missed claim', 'The six-month deadline passes and bars the claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether it was a Long Beach Transit bus or the A Line',
      'Whether the six-month claim reached the correct agency',
      'Whether you were a passenger or were hit',
      'The common-carrier utmost-care standard for passengers',
      'Whether onboard or crossing video was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Identify the agency', copy: 'Long Beach Transit and LA Metro are separate.' },
      { label: 'Six-month clock', copy: 'A public-agency claim runs on a short deadline.' },
      { label: 'Higher duty for riders', copy: 'Utmost care is stronger than ordinary negligence.' },
      { label: 'Video is key', copy: 'Onboard and platform footage is time-sensitive.' },
    ],
    insuranceProblems: [
      'The claim is sent to the wrong agency.',
      'The six-month deadline passes unnoticed.',
      'The passenger assumes no claim without a collision.',
      'Crossing or onboard video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a Long Beach Transit bus or the A Line?' },
      { label: 'Step 2', question: 'Were you a passenger or hit by the vehicle?' },
      { label: 'Step 3', question: 'How long ago did the incident happen?' },
      { label: 'Step 4', question: 'Has onboard or station video been requested?' },
    ],
  },
  [ANAHEIM_TRANSIT_SLUG]: {
    scenario: `A visitor was hurt on a resort-district shuttle and assumed a six-month public deadline applied. Because the shuttle was run by a private contractor, the claim ran on the ordinary two years \u2014 but identifying the operator early was what made it provable. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether it was OCTA or a resort shuttle; get the operator name.'],
      ['First days', 'Public agency versus private contractor confirmed.'],
      ['Deadline', 'Six months if OCTA; two years if a private operator.'],
      ['Longer term', 'Onboard video preserved and treatment documented.'],
    ],
    severityLadder: [
      ['Passenger', 'Utmost-care standard under Civil Code 2100.'],
      ['Person hit', 'Ordinary negligence claim.'],
      ['Contractor', 'A private operator on the two-year deadline.'],
      ['Missed claim', 'A public-entity six-month deadline passes.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the operator is OCTA or a private contractor',
      'Which deadline \u2014 six months or two years \u2014 applies',
      'Whether you were a passenger or were hit',
      'The common-carrier utmost-care standard for passengers',
      'Whether the incident report was secured before leaving',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Operator is pivotal', copy: 'Public agency or contractor changes the deadline.' },
      { label: 'Higher duty for riders', copy: 'Utmost care applies regardless of operator.' },
      { label: 'Act before you leave', copy: 'Out-of-area visitors need details secured early.' },
      { label: 'Video is key', copy: 'Onboard footage is time-sensitive.' },
    ],
    insuranceProblems: [
      'The operator is never identified, confusing the deadline.',
      'A public-entity six-month deadline passes unnoticed.',
      'The visitor leaves before securing the report.',
      'Onboard video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it an OCTA bus or a resort shuttle?' },
      { label: 'Step 2', question: 'Is the operator a public agency or a contractor?' },
      { label: 'Step 3', question: 'Were you a passenger or hit by the vehicle?' },
      { label: 'Step 4', question: 'Did you secure the report before leaving the area?' },
    ],
  },
}
