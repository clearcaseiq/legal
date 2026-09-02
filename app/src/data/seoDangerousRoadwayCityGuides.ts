import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, dangerous-roadway and dangerous-condition-of-public-property
 * practice area: location-specific guides for Los Angeles, Oakland, Sacramento,
 * and San Jose.
 *
 * A claim that a dangerous public road or property caused an injury is distinct:
 * it runs against a government entity under the Government Claims Act, carries a
 * six-month deadline, and must overcome government-specific defenses such as
 * design immunity. This is a real, separate claim type from an ordinary
 * driver-versus-driver case.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: an enormous freeway and arterial network with recurring
 *    complaints about potholes, faded markings, and hazardous intersection
 *    design.
 *  - Oakland: a well-documented street-maintenance and pavement backlog, with
 *    potholes and deteriorated roads a persistent hazard.
 *  - Sacramento: state highways and state-owned roads throughout the capital
 *    region, putting the state transportation agency in play.
 *  - San Jose: a large, fast-growing street network in Silicon Valley with
 *    intersection and bike-infrastructure design questions.
 *
 * Applied accurately:
 *  - A public entity can be liable for a dangerous condition of public property
 *    (Government Code section 835) where the condition created a foreseeable risk,
 *    the entity created it or had notice and time to fix it, and it caused the
 *    injury.
 *  - The claim runs through the Government Claims Act, which requires a formal
 *    claim within six months before any lawsuit (Government Code section 911.2) \u2014
 *    far shorter than the two-year deadline for an ordinary injury claim.
 *  - The entity may raise design immunity (Government Code section 830.6) for a
 *    condition built to an approved design, though that defense has limits,
 *    especially where conditions changed after approval.
 *  - Notice and causation turn on records \u2014 prior complaints, work orders,
 *    collision history at the location \u2014 that must be preserved and requested
 *    early, and the physical condition should be photographed before it is
 *    repaired.
 *  - Pure comparative negligence applies, and a private party (for example, a
 *    negligent driver or a contractor) can share responsibility.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a public entity is liable, whether design immunity applies, and how the six-month deadline runs depend on facts a licensed California attorney should review promptly.'

const DANGEROUS =
  'A public entity can be liable for a dangerous condition of public property under Government Code section 835 where the condition created a reasonably foreseeable risk of the kind of injury that occurred, the entity either created the condition or had notice of it and enough time to fix it, and the condition was a substantial cause of the injury. A poorly designed intersection, a deep pothole, a missing or obscured sign, faded markings, or an unsafe roadway feature can all qualify.'

const SIX_MONTH =
  'A claim against a public entity runs through the Government Claims Act, which requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit can be filed \u2014 far shorter than the two-year deadline for an ordinary injury claim. Missing this deadline can bar the claim entirely, which is why a road-condition case must be assessed immediately.'

const IMMUNITY =
  'A public entity will often raise design immunity (Government Code section 830.6), arguing the condition was built according to a plan approved in advance. That defense has real limits: it can fail where the approved design was itself unreasonable, where the condition was not actually built to the plan, or where changed conditions after approval made a once-safe design dangerous and the entity had notice. Anticipating and answering this defense is central to a road-condition case.'

const RECORDS =
  'These cases are won or lost on records that document notice and causation: prior complaints and service requests about the same hazard, maintenance and work-order history, the collision history at the location, and the design and inspection files. Because a public entity often repairs the condition quickly after a crash, photographing and measuring the physical condition immediately \u2014 before it is fixed \u2014 is critical.'

export const LA_ROAD_SLUG = '/los-angeles-dangerous-road-accident'
export const OAK_ROAD_SLUG = '/oakland-dangerous-road-accident'
export const SAC_ROAD_SLUG = '/sacramento-dangerous-road-accident'
export const SJ_ROAD_SLUG = '/san-jose-dangerous-road-accident'

export const dangerousRoadwayCityGuidePages: LandingPage[] = [
  {
    slug: LA_ROAD_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Dangerous Road & Public Property Claims',
    title: 'Los Angeles Dangerous Road & Public Property Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured by a pothole, a bad intersection, or a dangerous road in Los Angeles? A claim against a public entity is possible \u2014 but it carries a six-month deadline and government-specific defenses.',
    psychology: 'A dangerous road or pothole hurt me in LA and I do not know if I can claim against the city or state.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles pothole accident claim',
      'dangerous intersection injury lawsuit california',
      'sue the city for a dangerous road california',
      'government claim deadline road injury california',
      'dangerous condition of public property california',
    ],
    signals: [
      'Dangerous condition (835)',
      'Six-month claim (911.2)',
      'Design immunity defense (830.6)',
      'Notice & complaint records',
      'Preserve the condition',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s enormous freeway and arterial network generates recurring hazards \u2014 potholes, faded markings, and intersections with questionable design \u2014 which makes dangerous-condition claims a real but demanding path, because they run against a public entity. ${DANGEROUS} ${SIX_MONTH} ${IMMUNITY} ${RECORDS} Pure comparative negligence applies, and a negligent driver or contractor can share responsibility. Civil cases are filed in Los Angeles County Superior Court after the government claim is presented.`,
      whatToTrack: [
        'The exact location and the specific hazard (pothole, sign, design)',
        'Photographs and measurements of the condition before it is repaired',
        'Which entity owns the road \u2014 city, county, or state',
        'Prior complaints or service requests about the same hazard',
        'The collision history at the location',
        'The date of injury, which starts the six-month clock',
        'Any private party (driver, contractor) who also contributed',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies which public entity owns an LA road, moves immediately on the six-month claim deadline, gathers the complaint and maintenance records that establish notice, and anticipates the design-immunity defense. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue the city or state for a pothole or bad intersection?',
        a: 'Possibly. A public entity can be liable for a dangerous condition of public property under Government Code section 835 where the condition created a foreseeable risk, the entity created it or had notice and time to fix it, and it caused the injury. A deep pothole, a bad intersection design, or faded markings can all qualify.',
      },
      {
        q: 'How long do I have to file against a government entity?',
        a: 'Much less time than usual. A claim against a public entity requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the two-year deadline for an ordinary injury claim. Missing it can bar the claim entirely, so act immediately.',
      },
      {
        q: 'The city says the road was built to an approved design. Does that end my claim?',
        a: 'Not necessarily. Design immunity (Government Code section 830.6) can be raised, but it has limits: it can fail where the approved design was unreasonable, where the road was not built to the plan, or where changed conditions after approval made it dangerous and the entity had notice. Answering this defense is central.',
      },
      {
        q: 'What evidence matters most?',
        a: 'Records that show notice and causation \u2014 prior complaints, maintenance and work-order history, and the collision history at the location \u2014 plus photographs and measurements of the condition taken before it is repaired. Public entities often fix the hazard quickly, so documenting it early is critical.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_ROAD_SLUG,
    category: 'Cities',
    cluster: 'Oakland Dangerous Road & Public Property Claims',
    title: 'Oakland Dangerous Road & Public Property Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured by a pothole or deteriorated road in Oakland? With a well-documented pavement backlog, notice records can be strong \u2014 but a claim carries a six-month deadline.',
    psychology: 'A pothole or bad road hurt me in Oakland and I do not know if I can claim against the city.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland pothole accident claim',
      'deteriorated road injury lawsuit california',
      'sue the city for a dangerous road california',
      'government claim deadline road injury california',
      'pavement backlog road hazard claim california',
    ],
    signals: [
      'Dangerous condition (835)',
      'Documented pavement backlog',
      'Six-month claim (911.2)',
      'Notice & complaint records',
      'Design immunity defense (830.6)',
      'Preserve the condition',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s well-documented street-maintenance and pavement backlog makes potholes and deteriorated roads a persistent hazard \u2014 and, unusually, that documentation can help establish the notice a dangerous-condition claim requires. ${DANGEROUS} A long-standing, reported pothole or a road on a known repair backlog can go a long way toward showing the city had notice and time to fix it. ${SIX_MONTH} ${IMMUNITY} ${RECORDS} Pure comparative negligence applies, and a negligent driver or contractor can share responsibility. Civil cases are filed in Alameda County Superior Court after the government claim is presented.`,
      whatToTrack: [
        'The exact location and the specific hazard',
        'Photographs and measurements of the condition before it is repaired',
        'Prior complaints, 311 requests, or backlog listings for the road',
        'Maintenance and work-order history for the location',
        'The collision history at the location',
        'The date of injury, which starts the six-month clock',
        'Any private party who also contributed',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds an Oakland dangerous-road claim around the notice that the city\u2019s own backlog and complaint records can establish, moves quickly on the six-month deadline, and anticipates the design-immunity defense. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Oakland is known for bad roads. Does that help my claim?',
        a: 'It can. A dangerous-condition claim requires showing the city had notice of the hazard and time to fix it, and Oakland\u2019s documented pavement backlog, 311 complaint records, and repair listings can help establish that a long-standing pothole or deteriorated road was known. Those records are important to obtain.',
      },
      {
        q: 'Can I sue the city for a pothole?',
        a: 'Possibly. A public entity can be liable for a dangerous condition of public property under Government Code section 835 where the condition created a foreseeable risk, the entity had notice and time to fix it, and it caused the injury. A deep, reported pothole can qualify.',
      },
      {
        q: 'How long do I have to file?',
        a: 'A claim against a public entity requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the usual two years. Missing it can bar the claim, so act immediately.',
      },
      {
        q: 'What evidence matters most?',
        a: 'Prior complaints and 311 requests, maintenance and work-order history, backlog listings, and the collision history \u2014 plus photographs and measurements of the condition before it is repaired. The city often fixes the hazard quickly after a crash, so document it early.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_ROAD_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Dangerous Road & Public Property Claims',
    title: 'Sacramento Dangerous Road & Public Property Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured on a dangerous state highway or road in the Sacramento region? A claim can run against the city, county, or the state transportation agency \u2014 with a six-month deadline.',
    psychology: 'A dangerous road hurt me in the Sacramento area and I do not know which government entity to claim against.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento dangerous road accident claim',
      'state highway defect injury lawsuit california',
      'sue caltrans for a dangerous road california',
      'government claim deadline road injury california',
      'dangerous condition of public property california',
    ],
    signals: [
      'Dangerous condition (835)',
      'State highway / state agency',
      'Six-month claim (911.2)',
      'Design immunity defense (830.6)',
      'Notice & complaint records',
      'Preserve the condition',
    ],
    sections: {
      whyItMatters: `The Sacramento region is threaded with state highways and state-owned roads, which means a dangerous-road claim here often runs against the state transportation agency in addition to, or instead of, a city or county \u2014 and identifying the right entity is the essential first step. ${DANGEROUS} ${SIX_MONTH} ${IMMUNITY} State-highway claims frequently draw a strong design-immunity defense, so the design and change-of-condition records matter especially here. ${RECORDS} Pure comparative negligence applies, and a private party can share responsibility. Civil cases are filed in Sacramento County Superior Court after the government claim is presented.`,
      whatToTrack: [
        'Which entity owns the road \u2014 state, county, or city',
        'The exact location and the specific hazard',
        'Photographs and measurements of the condition before it is repaired',
        'Prior complaints and service requests about the hazard',
        'The design, inspection, and maintenance files',
        'The collision history at the location',
        'The date of injury, which starts the six-month clock',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Sacramento-area road is state, county, or city owned, presents the six-month claim to the right entity, and gathers the design and change-of-condition records needed to answer the design-immunity defense common on state highways. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A state highway was dangerous. Who do I claim against?',
        a: 'Often the state transportation agency, which owns and maintains state highways \u2014 though a city or county may own an adjoining road. Identifying the right entity is the essential first step, because the claim must be presented to the correct public entity within the deadline.',
      },
      {
        q: 'Can I bring a claim for a dangerous road?',
        a: 'Possibly. A public entity can be liable for a dangerous condition of public property under Government Code section 835 where the condition created a foreseeable risk, the entity created it or had notice and time to fix it, and it caused the injury.',
      },
      {
        q: 'How long do I have to file?',
        a: 'A claim against a public entity requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the usual two years. Missing it can bar the claim, so act immediately.',
      },
      {
        q: 'The state says the highway met an approved design. Does that end my claim?',
        a: 'Not necessarily. Design immunity (Government Code section 830.6) is common on state highways, but it has limits: it can fail where the design was unreasonable, where the road was not built to the plan, or where changed conditions made it dangerous and the state had notice. The design and change-of-condition records are key.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the ownership and notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_ROAD_SLUG,
    category: 'Cities',
    cluster: 'San Jose Dangerous Road & Public Property Claims',
    title: 'San Jose Dangerous Road & Public Property Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured by a dangerous intersection, road, or bike-lane hazard in San Jose? A claim against a public entity is possible \u2014 with a six-month deadline and government-specific defenses.',
    psychology: 'A dangerous road or intersection hurt me in San Jose and I do not know if I can claim against the city.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose dangerous intersection injury claim',
      'bike lane hazard injury lawsuit california',
      'sue the city for a dangerous road california',
      'government claim deadline road injury california',
      'dangerous condition of public property california',
    ],
    signals: [
      'Dangerous condition (835)',
      'Intersection & bike-lane design',
      'Six-month claim (911.2)',
      'Design immunity defense (830.6)',
      'Notice & complaint records',
      'Preserve the condition',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s large, fast-growing street network in Silicon Valley raises recurring intersection-design and bike-infrastructure questions, from confusing intersections to bike lanes that end abruptly or run through hazards \u2014 fertile ground for dangerous-condition claims. ${DANGEROUS} Design questions are especially prominent here, which puts both the notice records and the design-immunity analysis at the center. ${SIX_MONTH} ${IMMUNITY} ${RECORDS} Pure comparative negligence applies, and a private party can share responsibility. Civil cases are filed in Santa Clara County Superior Court after the government claim is presented.`,
      whatToTrack: [
        'The exact location and the specific hazard or design flaw',
        'For a bike-lane hazard, the lane layout and any abrupt ending',
        'Photographs and measurements of the condition before it is repaired',
        'Which entity owns the road \u2014 city, county, or state',
        'Prior complaints or service requests about the hazard',
        'The design, inspection, and collision history for the location',
        'The date of injury, which starts the six-month clock',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a San Jose dangerous-condition claim around the intersection or bike-lane design at issue, moves quickly on the six-month deadline, gathers the complaint and design records that establish notice, and anticipates the design-immunity defense. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A confusing intersection or bad bike lane caused my crash. Can I claim?',
        a: 'Possibly. A public entity can be liable for a dangerous condition of public property under Government Code section 835 where the condition \u2014 including a hazardous intersection or bike-lane design \u2014 created a foreseeable risk, the entity had notice and time to fix it, and it caused the injury.',
      },
      {
        q: 'How long do I have to file?',
        a: 'A claim against a public entity requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the usual two years. Missing it can bar the claim, so act immediately.',
      },
      {
        q: 'The city says the intersection met an approved design. Does that end my claim?',
        a: 'Not necessarily. Design immunity (Government Code section 830.6) can be raised, but it has limits: it can fail where the design was unreasonable, where the road was not built to the plan, or where changed conditions made it dangerous and the city had notice. Answering this defense is central.',
      },
      {
        q: 'What evidence matters most?',
        a: 'Prior complaints, the design and inspection files, and the collision history for the location \u2014 plus photographs and measurements of the condition before it is repaired. Public entities often fix the hazard quickly, so document it early.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const dangerousRoadwayCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_ROAD_SLUG]: {
    scenario: `An LA rider was thrown by a deep, long-reported pothole. Photographs taken before the city patched it, plus the prior service requests, established the notice a dangerous-condition claim requires \u2014 and the six-month claim was filed in time. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph and measure the hazard; note the exact location.'],
      ['First days', 'Identify the owning entity; request complaint and maintenance records.'],
      ['Six-month mark', 'The government claim presented to the right entity.'],
      ['Longer term', 'Notice and design-immunity issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous condition', 'The hazard created a foreseeable risk.'],
      ['Notice', 'Prior complaints show the entity knew.'],
      ['Immunity test', 'Design immunity must be anticipated.'],
      ['Deadline', 'The six-month claim must be met.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the condition was dangerous under section 835',
      'Whether the entity had notice and time to fix it',
      'Whether design immunity can be overcome',
      'Whether the six-month claim was met',
      'Whether the condition was photographed before repair',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Notice is decisive', copy: 'Prior complaints show the entity knew.' },
      { label: 'Deadline is short', copy: 'Six months, not two years.' },
      { label: 'Answer immunity', copy: 'Design immunity has real limits.' },
      { label: 'Preserve the hazard', copy: 'Photos before repair are critical.' },
    ],
    insuranceProblems: [
      'The six-month claim deadline is missed.',
      'The hazard is repaired before it is documented.',
      'The complaint and maintenance records are never requested.',
      'The design-immunity defense goes unanswered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the hazard, and exactly where?' },
      { label: 'Step 2', question: 'Which entity owns the road?' },
      { label: 'Step 3', question: 'Were there prior complaints about it?' },
      { label: 'Step 4', question: 'Did you photograph it before any repair?' },
    ],
  },
  [OAK_ROAD_SLUG]: {
    scenario: `An Oakland cyclist was hurt by a deteriorated stretch of road on the city\u2019s known repair backlog. The backlog listing and 311 complaint history established notice, and the six-month claim was presented in time. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph and measure the hazard; note the exact location.'],
      ['First days', 'Pull the 311 history and backlog listing; request work orders.'],
      ['Six-month mark', 'The government claim presented to the city.'],
      ['Longer term', 'Notice developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous condition', 'The deteriorated road created a foreseeable risk.'],
      ['Notice', 'The backlog and 311 records show the city knew.'],
      ['Immunity test', 'Design immunity must be anticipated.'],
      ['Deadline', 'The six-month claim must be met.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the backlog and 311 records establish notice',
      'Whether the condition was dangerous under section 835',
      'Whether the six-month claim was met',
      'Whether the condition was photographed before repair',
      'Whether design immunity can be overcome',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Backlog shows notice', copy: 'The city\u2019s own records prove knowledge.' },
      { label: 'Deadline is short', copy: 'Six months, not two years.' },
      { label: 'Preserve the hazard', copy: 'Photos before repair are critical.' },
      { label: 'Answer immunity', copy: 'Design immunity has real limits.' },
    ],
    insuranceProblems: [
      'The 311 and backlog records are never obtained.',
      'The six-month claim deadline is missed.',
      'The hazard is repaired before it is documented.',
      'The design-immunity defense goes unanswered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the hazard, and exactly where?' },
      { label: 'Step 2', question: 'Was it a reported or backlog road?' },
      { label: 'Step 3', question: 'Did you photograph it before any repair?' },
      { label: 'Step 4', question: 'When did the injury occur (six-month clock)?' },
    ],
  },
  [SAC_ROAD_SLUG]: {
    scenario: `A Sacramento-area driver was hurt by a defect on a state highway. Identifying the state transportation agency as owner, presenting the six-month claim to it, and gathering the design and change-of-condition records answered the design-immunity defense. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph and measure the hazard; note the exact location.'],
      ['First days', 'Confirm the owning entity (state, county, or city).'],
      ['Six-month mark', 'The government claim presented to the right entity.'],
      ['Longer term', 'Design and change-of-condition records developed.'],
    ],
    severityLadder: [
      ['Right entity', 'State highways point to the state agency.'],
      ['Dangerous condition', 'The defect created a foreseeable risk.'],
      ['Immunity test', 'Design immunity is common on state roads.'],
      ['Deadline', 'The six-month claim must be met.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the right public entity was identified',
      'Whether the condition was dangerous under section 835',
      'Whether design immunity can be overcome',
      'Whether the six-month claim was met',
      'Whether the design and change records were obtained',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Identify the owner', copy: 'State highways point to the state agency.' },
      { label: 'Immunity is common', copy: 'State roads draw a design-immunity defense.' },
      { label: 'Change records matter', copy: 'Changed conditions can defeat immunity.' },
      { label: 'Deadline is short', copy: 'Six months, not two years.' },
    ],
    insuranceProblems: [
      'The claim is presented to the wrong entity.',
      'The six-month claim deadline is missed.',
      'The design and change-of-condition records are never obtained.',
      'The hazard is repaired before it is documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a state highway, county, or city road?' },
      { label: 'Step 2', question: 'What was the defect, and exactly where?' },
      { label: 'Step 3', question: 'Did you photograph it before any repair?' },
      { label: 'Step 4', question: 'When did the injury occur (six-month clock)?' },
    ],
  },
  [SJ_ROAD_SLUG]: {
    scenario: `A San Jose cyclist crashed where a bike lane ended abruptly at a poorly designed intersection. The design files and prior complaints established the dangerous condition, and the six-month claim was presented in time. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the layout and hazard; note the exact location.'],
      ['First days', 'Identify the owning entity; request design files and complaints.'],
      ['Six-month mark', 'The government claim presented to the right entity.'],
      ['Longer term', 'Design-immunity and notice issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous design', 'A bad intersection or bike lane created a risk.'],
      ['Notice', 'Prior complaints show the entity knew.'],
      ['Immunity test', 'Design immunity must be anticipated.'],
      ['Deadline', 'The six-month claim must be met.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the intersection or bike-lane design was dangerous',
      'Whether the entity had notice',
      'Whether design immunity can be overcome',
      'Whether the six-month claim was met',
      'Whether the layout was photographed before any change',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Design is central', copy: 'Bad intersections and bike lanes qualify.' },
      { label: 'Notice helps', copy: 'Prior complaints show the entity knew.' },
      { label: 'Answer immunity', copy: 'Design immunity has real limits.' },
      { label: 'Deadline is short', copy: 'Six months, not two years.' },
    ],
    insuranceProblems: [
      'The six-month claim deadline is missed.',
      'The layout is changed before it is documented.',
      'The design files and complaints are never requested.',
      'The design-immunity defense goes unanswered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the design flaw, and exactly where?' },
      { label: 'Step 2', question: 'Which entity owns the road or bike lane?' },
      { label: 'Step 3', question: 'Were there prior complaints about it?' },
      { label: 'Step 4', question: 'When did the injury occur (six-month clock)?' },
    ],
  },
}
