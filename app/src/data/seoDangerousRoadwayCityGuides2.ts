import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, dangerous-roadway and dangerous-condition-of-public-property
 * practice area (batch 2): location-specific guides for San Diego, Fresno,
 * Riverside, and Bakersfield, extending the batch-1 hub (Los Angeles, Oakland,
 * Sacramento, San Jose).
 *
 * A claim that a dangerous public road or property caused an injury is distinct:
 * it runs against a government entity under the Government Claims Act, carries a
 * six-month deadline, and must overcome government-specific defenses such as
 * design immunity. This is a real, separate claim type from an ordinary
 * driver-versus-driver case.
 *
 * Local context, genuine rather than interpolated:
 *  - San Diego: coastal and canyon roads, curving corridors, and heavy state
 *    highway mileage (I-5, I-8, I-15) where curve, guardrail, and signage design
 *    questions recur, putting Caltrans in play.
 *  - Fresno: Central Valley county and rural roads with poor markings,
 *    uncontrolled intersections, and Highway 99 hazards.
 *  - Riverside: fast-growing Inland Empire with new and widening roads, long
 *    desert corridors, and uncontrolled or newly reconfigured intersections.
 *  - Bakersfield: Kern County rural and canal-adjacent roads, oilfield haul
 *    routes, and stretches with poor lighting, markings, or shoulders.
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

export const SD_ROAD_SLUG = '/san-diego-dangerous-road-accident'
export const FRESNO_ROAD_SLUG = '/fresno-dangerous-road-accident'
export const RIV_ROAD_SLUG = '/riverside-dangerous-road-accident'
export const BAKERSFIELD_ROAD_SLUG = '/bakersfield-dangerous-road-accident'

export const dangerousRoadwayCityGuidePages2: LandingPage[] = [
  {
    slug: SD_ROAD_SLUG,
    category: 'Cities',
    cluster: 'San Diego Dangerous Road & Public Property Claims',
    title: 'San Diego Dangerous Road & Public Property Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured by a dangerous curve, missing guardrail, or bad intersection in San Diego? A claim against a city, county, or Caltrans is possible \u2014 but it carries a six-month deadline and government-specific defenses.',
    psychology: 'A dangerous road or curve hurt me in San Diego and I do not know if I can claim against the city or state.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego dangerous road accident claim',
      'missing guardrail injury lawsuit california',
      'dangerous curve accident sue caltrans california',
      'government claim deadline road injury california',
      'dangerous condition of public property california',
    ],
    signals: [
      'Dangerous condition (835)',
      'Curve / guardrail / signage design',
      'Six-month claim (911.2)',
      'Design immunity defense (830.6)',
      'Caltrans / city / county owner',
      'Preserve the condition',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s coastal and canyon geography produces curving corridors, steep grades, and heavy state-highway mileage on the I-5, I-8, and I-15, so dangerous-condition claims here often turn on curve design, missing or inadequate guardrails, and signage \u2014 and frequently point to Caltrans as well as the city or county. ${DANGEROUS} ${SIX_MONTH} ${IMMUNITY} Because so many San Diego corridors are state highways, the design-immunity defense is especially common, which makes the design and change-of-condition records central. ${RECORDS} Pure comparative negligence applies, and a negligent driver or contractor can share responsibility. Civil cases are filed in San Diego County Superior Court after the government claim is presented.`,
      whatToTrack: [
        'The exact location and the specific hazard (curve, guardrail, sign)',
        'Which entity owns the road \u2014 city, county, or Caltrans',
        'Photographs and measurements of the condition before it is repaired',
        'Prior complaints or service requests about the same hazard',
        'The collision history at the location',
        'The design and any change-of-condition records',
        'The date of injury, which starts the six-month clock',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a San Diego road belongs to the city, county, or Caltrans, moves immediately on the six-month claim deadline, gathers the design, complaint, and collision-history records, and anticipates the design-immunity defense common on state corridors. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue Caltrans or the city for a dangerous curve or missing guardrail?',
        a: 'Possibly. A public entity can be liable for a dangerous condition of public property under Government Code section 835 where the condition created a foreseeable risk, the entity created it or had notice and time to fix it, and it caused the injury. A dangerous curve, a missing or inadequate guardrail, or bad signage can all qualify \u2014 the first step is identifying the owning entity.',
      },
      {
        q: 'How long do I have to file against a government entity?',
        a: 'Much less time than usual. A claim against a public entity requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the two-year deadline for an ordinary injury claim. Missing it can bar the claim entirely, so act immediately.',
      },
      {
        q: 'Caltrans says the highway was built to an approved design. Does that end my claim?',
        a: 'Not necessarily. Design immunity (Government Code section 830.6) can be raised, but it has limits: it can fail where the approved design was unreasonable, where the road was not built to the plan, or where changed conditions after approval made it dangerous and the entity had notice. On San Diego\u2019s state corridors this defense is common and must be answered with the design and change records.',
      },
      {
        q: 'What evidence matters most?',
        a: 'Records that show notice and causation \u2014 prior complaints, maintenance history, the collision history, and the design and inspection files \u2014 plus photographs and measurements of the condition before it is repaired. Public entities often fix the hazard quickly, so documenting it early is critical.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice and design records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_ROAD_SLUG,
    category: 'Cities',
    cluster: 'Fresno Dangerous Road & Public Property Claims',
    title: 'Fresno Dangerous Road & Public Property Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured on a poorly marked rural road or uncontrolled intersection in Fresno? A claim against the city, county, or state is possible \u2014 but it carries a six-month deadline and government-specific defenses.',
    psychology: 'A dangerous rural road or intersection hurt me near Fresno and I do not know if I can claim against a public entity.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno dangerous road accident claim',
      'uncontrolled intersection injury lawsuit california',
      'rural road no markings accident california',
      'government claim deadline road injury california',
      'dangerous condition of public property california',
    ],
    signals: [
      'Dangerous condition (835)',
      'Rural roads & faded markings',
      'Uncontrolled intersections',
      'Six-month claim (911.2)',
      'Design immunity defense (830.6)',
      'Preserve the condition',
    ],
    sections: {
      whyItMatters: `Fresno and the surrounding Central Valley have long stretches of county and rural roads where faded or missing markings, uncontrolled intersections, and Highway 99 hazards recur \u2014 conditions that can support a dangerous-condition claim against the city, county, or state. ${DANGEROUS} ${SIX_MONTH} ${IMMUNITY} ${RECORDS} On rural intersections, the collision history and any prior requests for a signal or stop control can be especially telling. Pure comparative negligence applies, and a negligent driver or contractor can share responsibility. Civil cases are filed in Fresno County Superior Court after the government claim is presented.`,
      whatToTrack: [
        'The exact location and the specific hazard (markings, sign, intersection)',
        'Which entity owns the road \u2014 city, county, or state',
        'Photographs and measurements of the condition before it is repaired',
        'Prior complaints or requests for signals or stop control',
        'The collision history at the intersection or stretch',
        'The date of injury, which starts the six-month clock',
        'Any private party who also contributed',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies which public entity owns a Fresno-area rural road, moves quickly on the six-month deadline, gathers the collision history and any prior requests for traffic control that establish notice, and anticipates the design-immunity defense. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue for a crash at an uncontrolled rural intersection?',
        a: 'Possibly. A public entity can be liable for a dangerous condition of public property under Government Code section 835 where the condition created a foreseeable risk, the entity had notice and time to fix it, and it caused the injury. A repeatedly dangerous uncontrolled intersection, especially one with a collision history or prior requests for a signal, can qualify.',
      },
      {
        q: 'How long do I have to file against a government entity?',
        a: 'A claim against a public entity requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the usual two years. Missing it can bar the claim, so act immediately.',
      },
      {
        q: 'What evidence matters most for a rural-road claim?',
        a: 'The collision history at the location, any prior complaints or requests for a signal or stop sign, and maintenance records \u2014 plus photographs of the markings, sightlines, and layout before anything is changed. These records establish the notice a dangerous-condition claim requires.',
      },
      {
        q: 'The county says the intersection met the approved design. Does that end my claim?',
        a: 'Not necessarily. Design immunity (Government Code section 830.6) has limits: it can fail where the design was unreasonable, where the road was not built to the plan, or where changed conditions (like grown traffic volumes) made it dangerous and the entity had notice. Answering this defense is central.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIV_ROAD_SLUG,
    category: 'Cities',
    cluster: 'Riverside Dangerous Road & Public Property Claims',
    title: 'Riverside Dangerous Road & Public Property Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured on a newly widened road, long desert corridor, or reconfigured intersection in Riverside? A claim against the city, county, or Caltrans is possible \u2014 but it carries a six-month deadline.',
    psychology: 'A dangerous road or new intersection hurt me in Riverside and I do not know if I can claim against a public entity.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside dangerous road accident claim',
      'newly widened road design accident california',
      'reconfigured intersection injury lawsuit california',
      'government claim deadline road injury california',
      'dangerous condition of public property california',
    ],
    signals: [
      'Dangerous condition (835)',
      'New / widening road design',
      'Reconfigured intersections',
      'Six-month claim (911.2)',
      'Design immunity defense (830.6)',
      'Preserve the condition',
    ],
    sections: {
      whyItMatters: `Riverside and the wider Inland Empire have grown fast, with roads widened and intersections reconfigured to keep up \u2014 and new or changed designs, long desert corridors, and heavy commuter traffic can produce dangerous conditions that support a claim against the city, county, or Caltrans. ${DANGEROUS} ${SIX_MONTH} ${IMMUNITY} Where a road was recently redesigned or a once-safe layout was overtaken by growth, the change-of-condition angle can defeat a design-immunity defense, which makes the design and traffic-volume records important. ${RECORDS} Pure comparative negligence applies, and a negligent driver or contractor can share responsibility. Civil cases are filed in Riverside County Superior Court after the government claim is presented.`,
      whatToTrack: [
        'The exact location and the specific hazard (design, markings, sign)',
        'Which entity owns the road \u2014 city, county, or Caltrans',
        'Whether the road or intersection was recently changed or widened',
        'Photographs and measurements of the condition before it is repaired',
        'Prior complaints and the collision history at the location',
        'Traffic-volume and design records for the location',
        'The date of injury, which starts the six-month clock',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies which public entity owns a Riverside-area road, moves immediately on the six-month deadline, and develops the change-of-condition angle \u2014 recent redesigns or growth-driven volume changes \u2014 that can defeat a design-immunity defense. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A newly widened or reconfigured road caused my crash. Can I claim?',
        a: 'Possibly. A public entity can be liable for a dangerous condition of public property under Government Code section 835. A recent redesign that created a foreseeable risk, or a once-safe layout overtaken by growth where the entity had notice, can support a claim \u2014 and the recent change can also help answer a design-immunity defense.',
      },
      {
        q: 'How long do I have to file against a government entity?',
        a: 'A claim against a public entity requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the usual two years. Missing it can bar the claim, so act immediately.',
      },
      {
        q: 'The entity says the road met the approved design. Does that end my claim?',
        a: 'Not necessarily. Design immunity (Government Code section 830.6) has limits: it can fail where the design was unreasonable, where the road was not built to the plan, or where changed conditions after approval \u2014 common in the fast-growing Inland Empire \u2014 made it dangerous and the entity had notice. Answering this defense is central.',
      },
      {
        q: 'What evidence matters most?',
        a: 'Prior complaints, the collision history, and the design and traffic-volume records \u2014 plus photographs of the layout before it is changed. In the Inland Empire, records showing a recent redesign or growth-driven change of conditions are especially valuable.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice and design records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_ROAD_SLUG,
    category: 'Cities',
    cluster: 'Bakersfield Dangerous Road & Public Property Claims',
    title: 'Bakersfield Dangerous Road & Public Property Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured on a poorly lit rural road, canal-adjacent stretch, or oilfield haul route in Bakersfield? A claim against the city, county, or state is possible \u2014 but it carries a six-month deadline.',
    psychology: 'A dangerous rural or unlit road hurt me near Bakersfield and I do not know if I can claim against a public entity.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield dangerous road accident claim',
      'unlit rural road accident california',
      'canal road no guardrail injury california',
      'government claim deadline road injury california',
      'dangerous condition of public property california',
    ],
    signals: [
      'Dangerous condition (835)',
      'Unlit rural roads',
      'Canal-adjacent & haul routes',
      'Six-month claim (911.2)',
      'Design immunity defense (830.6)',
      'Preserve the condition',
    ],
    sections: {
      whyItMatters: `Kern County\u2019s rural and canal-adjacent roads, oilfield haul routes, and stretches with poor lighting, faded markings, or missing shoulders and guardrails can create dangerous conditions that support a claim against the city, county, or state. ${DANGEROUS} A canal-adjacent road without a guardrail, or an unlit stretch where a sign or reflective marking was missing, can qualify where the entity had notice and time to fix it. ${SIX_MONTH} ${IMMUNITY} ${RECORDS} Pure comparative negligence applies, and a negligent driver or contractor can share responsibility. Civil cases are filed in Kern County Superior Court after the government claim is presented.`,
      whatToTrack: [
        'The exact location and the specific hazard (lighting, guardrail, markings)',
        'Which entity owns the road \u2014 city, county, or state',
        'Photographs and measurements of the condition before it is repaired',
        'Prior complaints or requests about lighting, guardrails, or markings',
        'The collision history at the location',
        'Whether it was a canal-adjacent road or oilfield haul route',
        'The date of injury, which starts the six-month clock',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies which public entity owns a Bakersfield-area rural road, moves quickly on the six-month deadline, gathers the complaint and collision-history records that show notice of a lighting, guardrail, or marking hazard, and anticipates the design-immunity defense. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue for a crash on an unlit or unguarded rural road?',
        a: 'Possibly. A public entity can be liable for a dangerous condition of public property under Government Code section 835 where the condition created a foreseeable risk, the entity had notice and time to fix it, and it caused the injury. A canal-adjacent road without a guardrail, or an unlit stretch with a known hazard, can qualify.',
      },
      {
        q: 'How long do I have to file against a government entity?',
        a: 'A claim against a public entity requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the usual two years. Missing it can bar the claim, so act immediately.',
      },
      {
        q: 'What evidence matters most for a rural-road claim?',
        a: 'The collision history, prior complaints or requests about lighting, guardrails, or markings, and maintenance records \u2014 plus photographs of the condition, sightlines, and lack of guardrail before anything is changed. These records establish the notice a dangerous-condition claim requires.',
      },
      {
        q: 'The county says the road met the approved design. Does that end my claim?',
        a: 'Not necessarily. Design immunity (Government Code section 830.6) has limits: it can fail where the design was unreasonable, where the road was not built to the plan, or where changed conditions made it dangerous and the entity had notice. Answering this defense is central.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const dangerousRoadwayCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SD_ROAD_SLUG]: {
    scenario: `A San Diego driver was hurt where a coastal highway curve lacked an adequate guardrail. Identifying Caltrans as owner, presenting the six-month claim, and gathering the design and collision-history records answered the design-immunity defense. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the curve, guardrail, and hazard; note the exact location.'],
      ['First days', 'Confirm the owning entity (Caltrans, county, or city).'],
      ['Six-month mark', 'The government claim presented to the right entity.'],
      ['Longer term', 'Design and collision-history records developed; treatment documented.'],
    ],
    severityLadder: [
      ['Right entity', 'State corridors point to Caltrans.'],
      ['Dangerous condition', 'A bad curve or missing guardrail created a risk.'],
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
      'Whether the curve or guardrail was a dangerous condition',
      'Whether design immunity can be overcome',
      'Whether the six-month claim was met',
      'Whether the design and collision records were obtained',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Identify the owner', copy: 'State corridors point to Caltrans.' },
      { label: 'Immunity is common', copy: 'State roads draw a design-immunity defense.' },
      { label: 'Collision history matters', copy: 'A pattern of crashes shows notice.' },
      { label: 'Deadline is short', copy: 'Six months, not two years.' },
    ],
    insuranceProblems: [
      'The claim is presented to the wrong entity.',
      'The six-month claim deadline is missed.',
      'The design and collision-history records are never obtained.',
      'The hazard is repaired before it is documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a state highway, county, or city road?' },
      { label: 'Step 2', question: 'What was the hazard (curve, guardrail, sign)?' },
      { label: 'Step 3', question: 'Did you photograph it before any repair?' },
      { label: 'Step 4', question: 'When did the injury occur (six-month clock)?' },
    ],
  },
  [FRESNO_ROAD_SLUG]: {
    scenario: `A Fresno-area driver was hurt at an uncontrolled rural intersection with a long crash history. The collision records and prior requests for a stop control established notice, and the six-month claim was presented in time. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the intersection, sightlines, and markings; note the location.'],
      ['First days', 'Identify the owning entity; request collision history and prior requests.'],
      ['Six-month mark', 'The government claim presented to the right entity.'],
      ['Longer term', 'Notice and design-immunity issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous condition', 'The uncontrolled intersection created a risk.'],
      ['Notice', 'Crash history and prior requests show the entity knew.'],
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
      'Whether the collision history establishes notice',
      'Whether the condition was dangerous under section 835',
      'Whether design immunity can be overcome',
      'Whether the six-month claim was met',
      'Whether the layout was photographed before any change',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Crash history shows notice', copy: 'A pattern proves the entity knew.' },
      { label: 'Deadline is short', copy: 'Six months, not two years.' },
      { label: 'Preserve the layout', copy: 'Photos before any change are critical.' },
      { label: 'Answer immunity', copy: 'Design immunity has real limits.' },
    ],
    insuranceProblems: [
      'The collision history is never obtained.',
      'The six-month claim deadline is missed.',
      'The intersection is changed before it is documented.',
      'The design-immunity defense goes unanswered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the hazard, and exactly where?' },
      { label: 'Step 2', question: 'Which entity owns the road?' },
      { label: 'Step 3', question: 'Was there a crash history or prior requests?' },
      { label: 'Step 4', question: 'When did the injury occur (six-month clock)?' },
    ],
  },
  [RIV_ROAD_SLUG]: {
    scenario: `A Riverside driver crashed where a recently widened road created a confusing new merge. The redesign and traffic-volume records supported a change-of-condition argument that answered the design-immunity defense, and the six-month claim was filed in time. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the layout and hazard; note the exact location.'],
      ['First days', 'Identify the owning entity; request design and change records.'],
      ['Six-month mark', 'The government claim presented to the right entity.'],
      ['Longer term', 'Change-of-condition and notice issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous design', 'A new or changed layout created a risk.'],
      ['Change of condition', 'A recent redesign can defeat immunity.'],
      ['Notice', 'Prior complaints and volume records show the entity knew.'],
      ['Deadline', 'The six-month claim must be met.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the design or change of condition was dangerous',
      'Whether a recent redesign defeats design immunity',
      'Whether the entity had notice',
      'Whether the six-month claim was met',
      'Whether the layout was photographed before any change',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Change defeats immunity', copy: 'A recent redesign can beat the defense.' },
      { label: 'Growth matters', copy: 'Rising volumes can make a design dangerous.' },
      { label: 'Deadline is short', copy: 'Six months, not two years.' },
      { label: 'Preserve the layout', copy: 'Photos before any change are critical.' },
    ],
    insuranceProblems: [
      'The design and change records are never obtained.',
      'The six-month claim deadline is missed.',
      'The layout is changed before it is documented.',
      'The design-immunity defense goes unanswered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the road recently widened or reconfigured?' },
      { label: 'Step 2', question: 'Which entity owns the road?' },
      { label: 'Step 3', question: 'What was the design flaw, and exactly where?' },
      { label: 'Step 4', question: 'When did the injury occur (six-month clock)?' },
    ],
  },
  [BAKERSFIELD_ROAD_SLUG]: {
    scenario: `A Bakersfield driver was hurt on an unlit canal-adjacent road that lacked a guardrail. Prior complaints about the missing guardrail established notice, and the six-month claim was presented to the county in time. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the road, lighting, and lack of guardrail; note the location.'],
      ['First days', 'Identify the owning entity; request complaints and maintenance records.'],
      ['Six-month mark', 'The government claim presented to the right entity.'],
      ['Longer term', 'Notice and design-immunity issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous condition', 'An unlit or unguarded road created a risk.'],
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
      'Whether the lighting or guardrail hazard was dangerous',
      'Whether prior complaints establish notice',
      'Whether design immunity can be overcome',
      'Whether the six-month claim was met',
      'Whether the condition was photographed before repair',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Complaints show notice', copy: 'Prior reports prove the entity knew.' },
      { label: 'Guardrails matter', copy: 'A missing guardrail can be the condition.' },
      { label: 'Deadline is short', copy: 'Six months, not two years.' },
      { label: 'Preserve the hazard', copy: 'Photos before repair are critical.' },
    ],
    insuranceProblems: [
      'The complaint and maintenance records are never requested.',
      'The six-month claim deadline is missed.',
      'The hazard is repaired before it is documented.',
      'The design-immunity defense goes unanswered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the hazard (lighting, guardrail, markings)?' },
      { label: 'Step 2', question: 'Which entity owns the road?' },
      { label: 'Step 3', question: 'Were there prior complaints about it?' },
      { label: 'Step 4', question: 'When did the injury occur (six-month clock)?' },
    ],
  },
}
