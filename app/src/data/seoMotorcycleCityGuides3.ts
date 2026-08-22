import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, motorcycle practice area (batch 3): city-specific motorcycle-accident
 * guides for San Francisco, Anaheim, Santa Ana, and Bakersfield, extending the
 * batch-1 hub (LA, San Diego, San Jose, Sacramento) and batch-2 (Long Beach,
 * Riverside, Fresno, Oakland).
 *
 * Genuinely local riding context rather than interpolated copy:
 *  - San Francisco: dense, hilly street grid with cable-car tracks, Muni rails,
 *    and grooved pavement that pose distinctive road-surface hazards to riders,
 *    plus heavy lane splitting in stop-and-go traffic and steep-grade braking.
 *  - Anaheim: resort-district congestion, tourist and rideshare drivers unfamiliar
 *    with lane splitting, and heavy weekend/event ride volume on the 5, 57, and 91.
 *  - Santa Ana: dense Orange County arterials with high left-turn-collision volume,
 *    the OC Streetcar\u2019s new tracks, and county-vehicle exposure at the civic center.
 *  - Bakersfield: among the highest uninsured-driver rates in the state, long
 *    high-speed rural and highway riding, oilfield and ag traffic, and heat.
 *
 * Motorcycle-specific California law, applied accurately (identical to batch 1):
 *  - Lane splitting is legal (Veh. Code section 21658.1).
 *  - Left-turn collisions typically put fault on the turning driver (Veh. Code
 *    section 21801).
 *  - All riders and passengers must wear a DOT-compliant helmet (Veh. Code section
 *    27803); non-use can be raised as comparative fault only for head injuries.
 *  - Pure comparative negligence, and UM/UIM under Insurance Code section 11580.2.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether lane-splitting conduct was reasonable, whether a federal or public entity is involved, and how comparative fault is assessed depend on facts a licensed California attorney should review promptly.'

const LANE_SPLITTING =
  'Lane splitting is legal in California under Vehicle Code section 21658.1, and California is the only state to have expressly authorised it. Insurers routinely try to blame a rider simply for splitting, but the question is whether the rider was splitting reasonably for the conditions, not whether they were splitting at all. Speed differential, traffic flow and lane position are the facts that decide it.'

const LEFT_TURN =
  'The most common motorcycle collision is a car turning left across a rider\u2019s path, and Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic that is close enough to be a hazard. Drivers frequently say they \u201cnever saw\u201d the motorcycle, which usually describes a failure to look rather than a defence.'

const HELMET =
  'Unlike bicyclists, every motorcycle rider and passenger in California must wear a DOT-compliant helmet under Vehicle Code section 27803. If a helmet was not worn, an insurer may raise it as comparative fault for head injuries, but it does not bar the claim, it has no bearing on non-head injuries, and under pure comparative negligence it would at most reduce recovery.'

const UM_UIM =
  'Motorcyclists are disproportionately hurt by drivers with no or minimal insurance, so the rider\u2019s own uninsured/underinsured motorist coverage is frequently the main source of recovery. UM/UIM is first-party coverage under Insurance Code section 11580.2 with its own notice requirements and deadlines, and underinsured coverage typically pays only the gap above the at-fault driver\u2019s limits, so identifying every applicable policy early matters.'

const ROAD_DEFECT =
  'A road-surface hazard \u2014 embedded rail or streetcar tracks, grooved or broken pavement, gravel, or a dangerous roadway condition \u2014 affects a motorcycle far more than a car, and where a public entity created or failed to fix it, a dangerous-condition-of-public-property claim (Gov. Code section 835) can apply, carrying the shorter six-month Government Claims Act deadline.'

export const SF_MOTORCYCLE_SLUG = '/san-francisco-motorcycle-accident'
export const ANAHEIM_MOTORCYCLE_SLUG = '/anaheim-motorcycle-accident'
export const SANTAANA_MOTORCYCLE_SLUG = '/santa-ana-motorcycle-accident'
export const BAKERSFIELD_MOTORCYCLE_SLUG = '/bakersfield-motorcycle-accident'

export const motorcycleCityGuidePages3: LandingPage[] = [
  {
    slug: SF_MOTORCYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Motorcycle Accident Claims',
    title: 'San Francisco Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Francisco\u2019s cable-car tracks, Muni rails, and grooved hills pose road-surface hazards unique to riders. An SF motorcycle claim often turns on lane splitting, a left-turning driver, and whether a dangerous roadway condition implicates a public entity.',
    psychology: 'I went down on my motorcycle in SF \u2014 maybe on tracks or grooved pavement, or a car turned across me \u2014 and the insurer is blaming me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco motorcycle accident claim',
      'motorcycle crash on muni tracks who is liable',
      'lane splitting accident who is at fault california',
      'car turned left in front of my motorcycle sf',
      'motorcycle road defect claim california',
    ],
    signals: [
      'Lane-splitting collision',
      'Left-turn collision',
      'Track / grooved-pavement hazard',
      'Dangerous roadway (six-month)',
      'Uninsured or underinsured driver',
      'DOT helmet question',
    ],
    sections: {
      whyItMatters: `San Francisco motorcycle claims are shaped by a street environment that is uniquely hostile to two wheels. The city\u2019s cable-car tracks, embedded Muni rails, steep grades, and grooved or patched pavement create road-surface hazards that barely affect a car but can put a motorcycle down on its own, which raises a road-condition question no car claim faces. ${ROAD_DEFECT} On top of that, the two usual battlegrounds still apply. ${LANE_SPLITTING} SF\u2019s dense stop-and-go traffic makes splitting routine, and it is legal. ${LEFT_TURN} And the city\u2019s tight intersections produce frequent left-turn collisions. Two financial realities shape the outcome: motorcycle injuries tend to be severe, and many at-fault drivers carry little insurance, so the rider\u2019s own coverage often pays. ${UM_UIM} On helmets: ${HELMET} Pure comparative negligence applies, so any genuine rider fault reduces rather than bars recovery. A road-defect claim against the City or a transit agency runs on the six-month deadline, while an ordinary claim runs on two years. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Whether a track, rail, or grooved-pavement hazard contributed',
        'Whether a public entity created or failed to fix the roadway condition',
        'Whether you were lane splitting, and the speed differential and traffic flow',
        'Whether a car turned left across your path, and its position',
        'Whether the at-fault driver was insured, and the limits',
        'Your own auto or motorcycle policy and its UM/UIM coverage',
        'Whether a DOT helmet was worn, relevant only to head injuries',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ frames an SF motorcycle claim around lane-splitting reasonableness and left-turn fault, and \u2014 distinctively for San Francisco \u2014 flags a track or dangerous-pavement condition that could implicate the City or a transit agency on the six-month deadline. It drives to the rider\u2019s own UM/UIM when the driver is underinsured. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I went down on Muni or cable-car tracks. Do I have a claim?',
        a: 'Possibly. Embedded tracks and grooved pavement are road-surface hazards that affect motorcycles far more than cars, and where a public entity created or failed to maintain a dangerous condition, a dangerous-condition-of-public-property claim under Government Code section 835 can apply \u2014 but it carries a six-month deadline, so acting quickly is essential.',
      },
      {
        q: 'I was lane splitting when I was hit. Does that make it my fault?',
        a: 'Not by itself. Lane splitting is legal under Vehicle Code section 21658.1, and the question is whether you were splitting reasonably for the conditions, not whether you were splitting at all. Insurers routinely overstate this.',
      },
      {
        q: 'A car turned left in front of me. Who is at fault?',
        a: 'Usually the turning driver. Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic close enough to be a hazard, and \u201cI never saw the motorcycle\u201d generally describes a failure to look rather than a defence.',
      },
      {
        q: 'The driver had little or no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured/underinsured motorist coverage, which frequently becomes the main source of recovery. It is first-party coverage with its own deadlines, so identifying every policy early matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage and roadway-condition questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_MOTORCYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Motorcycle Accident Claims',
    title: 'Anaheim Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Anaheim\u2019s resort-district congestion and out-of-town drivers unfamiliar with lane splitting shape its motorcycle claims. An Anaheim claim usually turns on whether splitting was reasonable, a left-turning driver, and the rider\u2019s own coverage.',
    psychology: 'I was hit on my motorcycle near the Anaheim resort district, maybe by a tourist or rideshare driver, and the insurer is blaming me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim motorcycle accident claim',
      'lane splitting accident who is at fault california',
      'car turned left in front of my motorcycle anaheim',
      'motorcycle hit by rideshare driver orange county',
      'motorcycle hit by uninsured driver anaheim',
    ],
    signals: [
      'Lane-splitting collision',
      'Left-turn collision',
      'Tourist / rideshare drivers',
      'Event / weekend ride volume',
      'Uninsured or underinsured driver',
      'DOT helmet question',
    ],
    sections: {
      whyItMatters: `Anaheim motorcycle claims are shaped by the resort district. The area around Disneyland, the convention center, and the stadium and arena draws heavy tourist and rideshare traffic \u2014 drivers who are often unfamiliar with the roads and, crucially, with California\u2019s lane-splitting law \u2014 onto congested routes like the 5, 57, and 91. ${LANE_SPLITTING} An out-of-town driver\u2019s belief that splitting is illegal is not a defence; the question is whether the rider was splitting reasonably. ${LEFT_TURN} The district\u2019s dense intersections and distracted, unfamiliar drivers make left-turn collisions especially common. Weekend and event ride volume concentrates crashes at high-risk hours. Two financial realities shape the outcome: motorcycle injuries tend to be severe, and many at-fault drivers \u2014 including some rideshare drivers between rides \u2014 carry limited coverage, so the rider\u2019s own policy often pays. ${UM_UIM} On helmets: ${HELMET} Pure comparative negligence applies. Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Whether you were lane splitting, and the speed differential and traffic flow',
        'Whether a car turned left across your path, and its position',
        'Whether the at-fault driver was a tourist or rideshare driver',
        'For a rideshare driver, the app status and coverage period',
        'Whether the at-fault driver was insured, and the limits',
        'Your own auto or motorcycle policy and its UM/UIM coverage',
        'Whether a DOT helmet was worn, relevant only to head injuries',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ frames an Anaheim motorcycle claim around lane-splitting reasonableness and left-turn fault, answers the out-of-town driver\u2019s mistaken \u201csplitting is illegal\u201d assumption, and \u2014 where a rideshare driver was involved \u2014 checks the app status while driving to the rider\u2019s own UM/UIM if the driver is underinsured. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver said lane splitting is illegal. Is that right?',
        a: 'No. Lane splitting is legal in California under Vehicle Code section 21658.1 \u2014 California is the only state to expressly authorise it, so an out-of-town driver\u2019s belief that it is illegal is not a defence. The question is whether you were splitting reasonably for the conditions.',
      },
      {
        q: 'A car turned left in front of me. Who is at fault?',
        a: 'Usually the turning driver. Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic close enough to be a hazard, and \u201cI never saw the motorcycle\u201d generally describes a failure to look rather than a defence.',
      },
      {
        q: 'A rideshare driver hit me. Does that change anything?',
        a: 'It can expand coverage. If the rideshare driver had accepted a ride or had a passenger, a $1,000,000 policy may apply; if the app was on with no ride accepted, a smaller contingent policy applies. The app status at impact controls, so preserving that record helps.',
      },
      {
        q: 'The driver had little or no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured/underinsured motorist coverage, which frequently becomes the main source of recovery. It is first-party coverage with its own deadlines, so identifying every policy early matters.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SANTAANA_MOTORCYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Santa Ana Motorcycle Accident Claims',
    title: 'Santa Ana Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Santa Ana\u2019s dense arterials drive a high rate of left-turn motorcycle collisions, and the new OC Streetcar adds track hazards. A Santa Ana claim usually turns on a left-turning driver, lane-splitting reasonableness, and the rider\u2019s own coverage.',
    psychology: 'I was hit on my motorcycle in Santa Ana, maybe by a left-turning car or near the streetcar tracks, and the insurer is blaming me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'santa ana motorcycle accident claim',
      'car turned left in front of my motorcycle santa ana',
      'lane splitting accident who is at fault california',
      'oc streetcar track motorcycle hazard',
      'motorcycle hit by uninsured driver orange county',
    ],
    signals: [
      'Left-turn collision',
      'Lane-splitting collision',
      'OC Streetcar track hazard',
      'County-vehicle / civic center',
      'Uninsured or underinsured driver',
      'DOT helmet question',
    ],
    sections: {
      whyItMatters: `Santa Ana motorcycle claims are dominated by its dense Orange County arterials, where a high volume of signalised intersections produces frequent left-turn collisions \u2014 the single most common and most winnable motorcycle crash. ${LEFT_TURN} A driver\u2019s \u201cI never saw the motorcycle\u201d is usually a failure to look, not a defence. The city\u2019s congestion also makes lane splitting routine. ${LANE_SPLITTING} Two local wrinkles stand out. The OC Streetcar has introduced street-level rail through parts of Santa Ana, and embedded tracks and the construction that accompanies them are road-surface hazards that affect a motorcycle far more than a car. ${ROAD_DEFECT} And the county civic center concentrates government vehicles, so a collision with a county vehicle can route a claim through the Government Claims Act\u2019s six-month deadline. Two financial realities shape the outcome: motorcycle injuries tend to be severe, and many at-fault drivers carry little insurance, so the rider\u2019s own coverage often pays. ${UM_UIM} On helmets: ${HELMET} Pure comparative negligence applies. Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Whether a car turned left across your path, and its position',
        'Whether an OC Streetcar track or construction hazard contributed',
        'Whether a county or government vehicle was involved',
        'Whether you were lane splitting, and the speed differential and traffic flow',
        'Whether the at-fault driver was insured, and the limits',
        'Your own auto or motorcycle policy and its UM/UIM coverage',
        'Whether a DOT helmet was worn, relevant only to head injuries',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a Santa Ana motorcycle claim around left-turn fault and lane-splitting reasonableness, flags an OC Streetcar track hazard or a county-vehicle collision that could carry the six-month deadline, and drives to the rider\u2019s own UM/UIM when the driver is underinsured. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A car turned left in front of me. Who is at fault?',
        a: 'Usually the turning driver. Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic close enough to be a hazard, and a car turning across a rider\u2019s path is the most common motorcycle collision. \u201cI never saw the motorcycle\u201d generally describes a failure to look rather than a defence.',
      },
      {
        q: 'I went down near the OC Streetcar tracks. Do I have a claim?',
        a: 'Possibly. Embedded rail and the construction around it are road-surface hazards that affect motorcycles far more than cars, and where a public entity created or failed to fix a dangerous condition, a dangerous-condition claim under Government Code section 835 can apply \u2014 with a six-month deadline, so acting quickly is essential.',
      },
      {
        q: 'A county vehicle hit me. Is the deadline different?',
        a: 'Yes. A claim against a county or government vehicle is a government claim under the Government Claims Act, requiring a written claim within six months \u2014 far shorter than the ordinary two years. Identifying the owner early is critical.',
      },
      {
        q: 'The driver had little or no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured/underinsured motorist coverage, which frequently becomes the main source of recovery. It is first-party coverage with its own deadlines, so identifying every policy early matters.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage and roadway-condition questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_MOTORCYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Motorcycle Accident Claims',
    title: 'Bakersfield Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bakersfield\u2019s long high-speed rural riding and among the highest uninsured-driver rates in the state make the rider\u2019s own coverage central. A Kern County claim usually turns on a left-turning driver, UM/UIM, and answering motorcyclist bias.',
    psychology: 'I was hit on my motorcycle near Bakersfield, maybe on a rural highway by an uninsured driver, and do not know how I recover.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield motorcycle accident claim',
      'motorcycle hit by uninsured driver bakersfield',
      'car turned left in front of my motorcycle bakersfield',
      'lane splitting accident who is at fault california',
      'motorcycle uninsured motorist coverage california',
    ],
    signals: [
      'Uninsured or underinsured driver',
      'Left-turn collision',
      'Long high-speed rural riding',
      'Lane-splitting collision',
      'Motorcyclist bias / scene evidence',
      'DOT helmet question',
    ],
    sections: {
      whyItMatters: `Bakersfield motorcycle claims are dominated by one hard local fact: Kern County has among the highest uninsured-driver rates in California, so when a rider is hit, the at-fault driver frequently has no insurance or too little, and the rider\u2019s own coverage becomes the main path to recovery. ${UM_UIM} The riding environment compounds the stakes. Long, high-speed rural and highway routes, oilfield and agricultural traffic, and open desert roads mean collisions tend to be severe. ${LEFT_TURN} Left-turn collisions remain the most common serious crash, and \u201cI never saw the motorcycle\u201d is usually a failure to look. ${LANE_SPLITTING} Where splitting occurs in town traffic, it is legal and judged by reasonableness. Motorcyclist bias \u2014 assumptions that a rider on a fast rural road must have been speeding or reckless \u2014 is especially strong here and is answered with physical evidence: scene measurements, vehicle damage, and sight lines. On helmets: ${HELMET} Pure comparative negligence applies. Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'Whether the at-fault driver was insured, and the limits',
        'Your own auto or motorcycle policy and its UM/UIM coverage',
        'Whether a car turned left across your path, and its position',
        'Whether you were lane splitting, and the speed differential and traffic flow',
        'Scene measurements, vehicle damage, and sight lines against bias',
        'Whether an oilfield or agricultural vehicle was involved',
        'Whether a DOT helmet was worn, relevant only to head injuries',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a Bakersfield motorcycle claim around the rider\u2019s own UM/UIM \u2014 usually decisive in a very high uninsured-rate county \u2014 and around left-turn fault, while assembling the scene evidence that answers the strong motorcyclist bias on fast rural roads. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me had no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured/underinsured motorist coverage, which in Kern County frequently becomes the main source of recovery because so many at-fault drivers are uninsured or underinsured. It is first-party coverage with its own deadlines, so identifying every policy early matters.',
      },
      {
        q: 'A car turned left in front of me. Who is at fault?',
        a: 'Usually the turning driver. Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic close enough to be a hazard, and \u201cI never saw the motorcycle\u201d generally describes a failure to look rather than a defence.',
      },
      {
        q: 'The insurer says I must have been speeding on a rural road. Does that end my claim?',
        a: 'No. Motorcyclist bias \u2014 assuming a rider on a fast road must have been reckless \u2014 is answered with physical evidence: scene measurements, vehicle damage, and the driver\u2019s sight lines. Under pure comparative negligence, even some rider fault reduces rather than bars recovery.',
      },
      {
        q: 'I was not wearing a helmet. Does that end my claim?',
        a: 'No. California requires a DOT helmet, so an insurer may raise non-use as comparative fault \u2014 but only for head injuries, not others, and it does not bar the claim. Under pure comparative negligence it would at most reduce recovery for the affected injuries.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage questions \u2014 including your own UM/UIM \u2014 and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const motorcycleCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [SF_MOTORCYCLE_SLUG]: {
    scenario: `A rider\u2019s tire caught an embedded Muni rail on a wet grade and went down, and the insurer called it a solo crash. Documenting the track condition and the agency\u2019s maintenance history supported a dangerous-condition claim presented within six months. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the track or pavement condition and the location.'],
      ['First days', 'Whether a public entity controls the roadway condition confirmed.'],
      ['Six months', 'Government claim presented if a public entity is responsible.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured driver.'],
      ['Road defect', 'A track or grooved-pavement hazard on a public road.'],
      ['Contested split', 'The insurer blames lawful lane splitting.'],
      ['Underinsured', 'The driver\u2019s limits fall short; UIM becomes central.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a track or pavement hazard contributed',
      'Whether a public entity is responsible and the six-month deadline met',
      'Whether the lane split was reasonable for the conditions',
      'Whether the driver was insured, and your own UM/UIM',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Road defects count', copy: 'Tracks and grooves hurt riders, not cars.' },
      { label: 'Watch the deadline', copy: 'A public-entity claim runs on six months.' },
      { label: 'Splitting is legal', copy: 'Section 21658.1 makes reasonableness the question.' },
      { label: 'UM often carries it', copy: 'Riders are often hit by underinsured drivers.' },
    ],
    insuranceProblems: [
      'A track-caused crash is dismissed as solo rider error.',
      'The public-entity six-month deadline passes.',
      'The rider is blamed simply for lane splitting.',
      'The claim stalls when the driver is underinsured.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did a track or pavement condition contribute?' },
      { label: 'Step 2', question: 'Is the roadway controlled by a public entity?' },
      { label: 'Step 3', question: 'Were you lane splitting, and in what traffic?' },
      { label: 'Step 4', question: 'Was the driver insured, and do you have UM/UIM?' },
    ],
  },
  [ANAHEIM_MOTORCYCLE_SLUG]: {
    scenario: `A rider was struck by an out-of-state tourist who turned left near the resort district and insisted lane splitting was illegal. Section 21658.1 answered that, and section 21801 put fault on the turning driver; the rider\u2019s UIM covered the gap. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the turn, the traffic flow, and whether the driver was a visitor.'],
      ['First week', 'The driver\u2019s coverage and your own UM/UIM identified.'],
      ['First month', 'Scene facts assembled against the \u201csplitting is illegal\u201d claim.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured driver.'],
      ['Left turn', 'A car turned across the rider\u2019s path.'],
      ['Contested split', 'A visitor wrongly claims splitting is illegal.'],
      ['Underinsured', 'The driver\u2019s limits fall short; UIM becomes central.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a left-turning driver failed to yield',
      'Whether the lane split was reasonable for the conditions',
      'Whether a rideshare app status expands coverage',
      'Whether the driver was insured, and your own UM/UIM',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Left turns dominate', copy: 'Section 21801 usually puts fault on the turner.' },
      { label: 'Splitting is legal', copy: 'A visitor\u2019s belief otherwise is not a defence.' },
      { label: 'Rideshare can expand it', copy: 'App status may open a $1M policy.' },
      { label: 'UM often carries it', copy: 'Riders are often hit by underinsured drivers.' },
    ],
    insuranceProblems: [
      'A visitor\u2019s \u201csplitting is illegal\u201d claim goes unanswered.',
      'A rideshare driver\u2019s app status is never checked.',
      'The claim stalls when the driver is underinsured.',
      'Motorcyclist bias substitutes for scene evidence.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did a car turn left across your path?' },
      { label: 'Step 2', question: 'Was the driver a tourist or rideshare driver?' },
      { label: 'Step 3', question: 'Were you lane splitting, and in what traffic?' },
      { label: 'Step 4', question: 'Was the driver insured, and do you have UM/UIM?' },
    ],
  },
  [SANTAANA_MOTORCYCLE_SLUG]: {
    scenario: `A rider was hit by a car turning left across a Santa Ana arterial, and the driver said he never saw the motorcycle. Section 21801 put fault on the turn, and scene sight-lines confirmed it; the rider\u2019s UIM covered the underinsured gap. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the turn, sight lines, and any streetcar track or county vehicle.'],
      ['First week', 'The driver\u2019s coverage and your own UM/UIM identified.'],
      ['Six months', 'Government claim presented if a county vehicle or track condition applies.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured driver.'],
      ['Left turn', 'A car turned across the rider\u2019s path.'],
      ['Public entity', 'A streetcar track or county vehicle triggers six months.'],
      ['Underinsured', 'The driver\u2019s limits fall short; UIM becomes central.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a left-turning driver failed to yield',
      'Whether a streetcar track or county vehicle triggers a six-month claim',
      'Whether the lane split was reasonable for the conditions',
      'Whether the driver was insured, and your own UM/UIM',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Left turns dominate', copy: 'Section 21801 usually puts fault on the turner.' },
      { label: 'Watch the deadline', copy: 'A public-entity claim runs on six months.' },
      { label: 'Road defects count', copy: 'Streetcar tracks hurt riders, not cars.' },
      { label: 'UM often carries it', copy: 'Riders are often hit by underinsured drivers.' },
    ],
    insuranceProblems: [
      'A public-entity six-month deadline passes.',
      'The turning driver\u2019s failure to look is treated as a defence.',
      'The claim stalls when the driver is underinsured.',
      'Motorcyclist bias substitutes for scene evidence.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did a car turn left across your path?' },
      { label: 'Step 2', question: 'Was a streetcar track or county vehicle involved?' },
      { label: 'Step 3', question: 'Were you lane splitting, and in what traffic?' },
      { label: 'Step 4', question: 'Was the driver insured, and do you have UM/UIM?' },
    ],
  },
  [BAKERSFIELD_MOTORCYCLE_SLUG]: {
    scenario: `A rider on a rural highway was struck by an uninsured driver, and the insurer suggested the rider must have been speeding. Scene measurements refuted the bias, and the rider\u2019s own UM coverage \u2014 essential in Kern County \u2014 carried the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the road, speeds, and whether the other driver was insured.'],
      ['First week', 'The at-fault driver\u2019s coverage and your own UM/UIM identified.'],
      ['First month', 'Scene measurements assembled against motorcyclist bias.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured driver.'],
      ['Uninsured', 'The at-fault driver has no coverage; UM is central.'],
      ['Underinsured', 'The driver\u2019s limits fall short; UIM fills the gap.'],
      ['Bias fight', 'The insurer assumes rider recklessness on a fast road.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the at-fault driver was insured, and your own UM/UIM',
      'Whether a left-turning driver failed to yield',
      'Scene measurements and vehicle damage answering bias',
      'Whether the lane split, if any, was reasonable',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'UM is usually decisive', copy: 'Kern County has very high uninsured rates.' },
      { label: 'Left turns dominate', copy: 'Section 21801 usually puts fault on the turner.' },
      { label: 'Evidence beats bias', copy: 'Scene facts answer speed assumptions.' },
      { label: 'Helmet is bounded', copy: 'Relevant only to head injuries; not a bar.' },
    ],
    insuranceProblems: [
      'The claim stalls when the at-fault driver is uninsured.',
      'The rider\u2019s own UM/UIM is never invoked.',
      'Motorcyclist bias substitutes for scene evidence.',
      'Helmet non-use is treated as barring the whole claim.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the at-fault driver insured, and do you have UM/UIM?' },
      { label: 'Step 2', question: 'Did a car turn left across your path?' },
      { label: 'Step 3', question: 'What do the scene facts show about speed?' },
      { label: 'Step 4', question: 'Was a DOT helmet worn (head injuries only)?' },
    ],
  },
}
