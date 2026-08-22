import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, motorcycle practice area (batch 2): city-specific guides for Long
 * Beach, Riverside (Inland Empire), Fresno, and Oakland.
 *
 * These round out the motorcycle geo hub (batch 1 covered Los Angeles, San
 * Diego, San Jose, and Sacramento) with genuinely local riding context:
 *  - Long Beach: Pacific Coast Highway coastal cruising through dense urban
 *    boulevards, plus constant port-truck traffic on shared roads and the
 *    left-turn collisions that dominate busy arterials.
 *  - Riverside / Inland Empire: long freeway commutes where lane splitting
 *    happens in heavy congestion, canyon and mountain routes (Ortega Highway,
 *    Palms to Pines), heavy truck traffic, and one of the highest uninsured-
 *    driver rates in the state.
 *  - Fresno: the Highway 99 corridor and rural Valley highways shared with farm
 *    equipment and trucks, extreme summer heat, and an uninsured-motorist rate
 *    among the highest in California.
 *  - Oakland: lane splitting on the I-880 and I-580 commute, the winding Oakland
 *    hills canyon roads, and a well-documented pavement-and-pothole hazard that
 *    is uniquely dangerous to two wheels.
 *
 * Motorcycle-specific California law, applied accurately:
 *  - Lane splitting is legal (Veh. Code section 21658.1); the question is whether
 *    the rider split reasonably, not whether they split at all.
 *  - Left-turn collisions typically put fault on the turning driver (Veh. Code
 *    section 21801).
 *  - All riders and passengers must wear a DOT-compliant helmet (Veh. Code
 *    section 27803); non-use is at most comparative fault for head injuries.
 *  - Pure comparative negligence, and uninsured/underinsured motorist coverage
 *    under Insurance Code section 11580.2.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether lane-splitting conduct was reasonable, whether a public entity or road defect is involved, and how comparative fault is assessed depend on facts a licensed California attorney should review promptly.'

const LANE_SPLITTING =
  'Lane splitting is legal in California under Vehicle Code section 21658.1, and California is the only state to have expressly authorised it. Insurers routinely try to blame a rider simply for splitting, but the question is whether the rider was splitting reasonably for the conditions, not whether they were splitting at all. Speed differential, traffic flow and lane position are the facts that decide it.'

const LEFT_TURN =
  'The most common motorcycle collision is a car turning left across a rider\u2019s path, and Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic that is close enough to be a hazard. Drivers frequently say they \u201cnever saw\u201d the motorcycle, which usually describes a failure to look rather than a defence.'

const HELMET =
  'Unlike bicyclists, every motorcycle rider and passenger in California must wear a DOT-compliant helmet under Vehicle Code section 27803. If a helmet was not worn, an insurer may raise it as comparative fault for head injuries, but it does not bar the claim, it has no bearing on non-head injuries, and under pure comparative negligence it would at most reduce recovery.'

const UM_UIM =
  'Motorcyclists are disproportionately hurt by drivers with no or minimal insurance, so the rider\u2019s own uninsured/underinsured motorist coverage is frequently the main source of recovery. UM/UIM is first-party coverage under Insurance Code section 11580.2 with its own notice requirements and deadlines, and underinsured coverage typically pays only the gap above the at-fault driver\u2019s limits, so identifying every applicable policy early matters.'

const ROAD_DEFECT =
  'A road hazard that is trivial to a car \u2014 a pothole, a raised edge, loose gravel, or a poorly marked lane shift \u2014 can be catastrophic on two wheels. Where a dangerous roadway condition contributed, a dangerous-condition-of-public-property claim against the responsible agency may exist under Government Code section 835, but it carries the six-month Government Claims Act deadline, far shorter than the ordinary two years.'

export const LONGBEACH_MOTORCYCLE_SLUG = '/long-beach-motorcycle-accident'
export const RIVERSIDE_MOTORCYCLE_SLUG = '/riverside-motorcycle-accident'
export const FRESNO_MOTORCYCLE_SLUG = '/fresno-motorcycle-accident'
export const OAKLAND_MOTORCYCLE_SLUG = '/oakland-motorcycle-accident'

export const motorcycleCityGuidePages2: LandingPage[] = [
  {
    slug: LONGBEACH_MOTORCYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Motorcycle Accident Claims',
    title: 'Long Beach Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Long Beach riders mix Pacific Coast Highway cruising with dense urban boulevards and constant port-truck traffic. A claim here usually turns on a left-turning driver, whether lane splitting was reasonable, and the rider\u2019s own coverage.',
    psychology: 'I was hit on my motorcycle in Long Beach and the driver is blaming me for riding a bike.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach motorcycle accident claim',
      'is lane splitting legal in california',
      'car turned left into my motorcycle who is at fault',
      'motorcycle hit by uninsured driver california',
      'pacific coast highway motorcycle crash',
    ],
    signals: [
      'Lane splitting legal (21658.1)',
      'Left-turn driver (21801)',
      'Port-truck traffic',
      'UM/UIM coverage',
      'Helmet comparative fault',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Long Beach motorcycle claims come out of a distinctive mix: coastal cruising along Pacific Coast Highway and Ocean Boulevard, dense urban arterials packed with turning traffic, and the relentless flow of port drayage trucks that share the same roads. The most common collision here is the same one that dominates statewide. ${LEFT_TURN} On Long Beach\u2019s busy boulevards, a car turning left across a rider on PCH or a downtown street is the archetypal crash, and the driver\u2019s \u201cI never saw the bike\u201d is usually an admission, not a defence. Congestion also means lane splitting. ${LANE_SPLITTING} The port-truck presence adds a serious hazard, because a large truck\u2019s blind spots and wide turns are especially dangerous to a rider, and a truck-involved motorcycle crash brings the layered commercial-carrier issues on top of the ordinary claim. ${UM_UIM} ${HELMET} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs unless a public entity is involved. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether the other driver was turning left across your path',
        'Whether you were lane splitting and how the traffic was moving',
        'Whether a commercial or port truck was involved',
        'The other driver\u2019s insurance and your own UM/UIM coverage',
        'The corridor \u2014 PCH, a boulevard, or a surface street',
        'Whether any road condition contributed',
        'Helmet use, relevant only to head-injury comparative fault',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a Long Beach motorcycle crash around the left-turn rule and a reasonable-lane-splitting analysis, so the rider is not blamed simply for riding, and flags a port-truck involvement that adds commercial-carrier defendants. It surfaces the rider\u2019s UM/UIM coverage that often matters most. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A car turned left into me on PCH. Who is at fault?',
        a: 'Usually the turning driver. Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic close enough to be a hazard, and a left turn across a rider\u2019s path is the most common motorcycle collision. \u201cI never saw the motorcycle\u201d generally describes a failure to look rather than a defence.',
      },
      {
        q: 'The insurer says I was at fault for lane splitting. Is that right?',
        a: 'Usually not by itself. Lane splitting is legal in California under Vehicle Code section 21658.1. The question is whether you split reasonably for the conditions \u2014 speed differential, traffic flow, lane position \u2014 not whether you split at all, so blaming you merely for splitting is generally wrong.',
      },
      {
        q: 'A port truck was involved. Does that change the claim?',
        a: 'It can add defendants and coverage. A truck-involved crash brings layered commercial-carrier issues \u2014 the driver, the motor carrier, and possibly others \u2014 and the higher insurance limits interstate carriers must carry, on top of the ordinary motorcycle claim. It also makes preserving the truck\u2019s records important.',
      },
      {
        q: 'The driver who hit me had little or no insurance. What now?',
        a: 'Your own uninsured/underinsured motorist coverage is often the main source of recovery, because riders are disproportionately hurt by under-insured drivers. UM/UIM is first-party coverage under Insurance Code section 11580.2 with its own deadlines, so identifying every applicable policy early is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the liability and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIVERSIDE_MOTORCYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Motorcycle Accident Claims',
    title: 'Riverside Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Inland Empire riders face long freeway commutes, canyon routes like the Ortega Highway, heavy truck traffic, and one of the highest uninsured-driver rates in California \u2014 so the rider\u2019s own coverage often matters most.',
    psychology: 'I was hit on my motorcycle near Riverside and worry the other driver has no insurance.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside motorcycle accident claim',
      'motorcycle hit by uninsured driver california',
      'is lane splitting legal in california',
      'ortega highway motorcycle crash',
      'car turned left into my motorcycle who is at fault',
    ],
    signals: [
      'High uninsured-driver rate',
      'UM/UIM coverage',
      'Lane splitting legal (21658.1)',
      'Canyon / mountain route',
      'Left-turn driver (21801)',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Riverside and the Inland Empire produce motorcycle claims shaped by long distances, heavy freight and thin insurance. Riders here log long freeway commutes on the I-10, I-15, SR-60 and I-215 \u2014 corridors saturated with the region\u2019s warehouse-driven truck traffic \u2014 and ride canyon and mountain routes like the Ortega Highway and Palms to Pines for sport. Two local realities dominate. The first is uninsured drivers: the Inland Empire has one of the highest uninsured-motorist rates in California, which makes the rider\u2019s own coverage the practical centre of many claims. ${UM_UIM} The second is congestion-driven lane splitting on the commute. ${LANE_SPLITTING} The canyon routes add single-vehicle and road-hazard questions \u2014 gravel, decreasing-radius turns and pavement edges that are far more dangerous on two wheels \u2014 while the freeway truck traffic brings the layered commercial-carrier issues when a truck is involved. ${LEFT_TURN} ${HELMET} ${ROAD_DEFECT} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs private claims. Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'Whether the other driver was insured, and your own UM/UIM coverage',
        'Whether you were lane splitting and how traffic was moving',
        'Whether the other driver was turning left across your path',
        'Whether a commercial truck was involved',
        'On a canyon route, any road condition or hazard',
        'The corridor or route where the crash happened',
        'Helmet use, relevant only to head-injury comparative fault',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ puts the uninsured-driver reality first for an Inland Empire crash, surfacing the rider\u2019s UM/UIM coverage and its deadlines, while applying the lane-splitting and left-turn rules and flagging canyon road-hazard and truck-involvement issues. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me had no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured/underinsured motorist coverage, which is the main source of recovery in many Inland Empire claims because the region has one of the highest uninsured-driver rates in the state. UM/UIM is first-party coverage under Insurance Code section 11580.2 with its own deadlines, so identify every applicable policy early.',
      },
      {
        q: 'The insurer says I was at fault for lane splitting. Is that right?',
        a: 'Usually not by itself. Lane splitting is legal in California under Vehicle Code section 21658.1. The question is whether you split reasonably for the conditions \u2014 speed differential, traffic flow, lane position \u2014 not whether you split at all.',
      },
      {
        q: 'I crashed on a canyon road where the pavement was bad. Is anyone responsible?',
        a: 'Possibly. A road hazard that is trivial to a car can be catastrophic on two wheels, and where a dangerous roadway condition contributed, a dangerous-condition-of-public-property claim against the responsible agency may exist under Government Code section 835. It carries a six-month claim deadline, far shorter than the ordinary two years, so acting quickly matters.',
      },
      {
        q: 'A car turned left into me. Who is at fault?',
        a: 'Usually the turning driver. Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic close enough to be a hazard, and a left turn across a rider\u2019s path is the most common motorcycle collision.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage and liability questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_MOTORCYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Motorcycle Accident Claims',
    title: 'Fresno Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Central Valley riders share Highway 99 and rural roads with farm equipment and trucks, ride in extreme heat, and face one of the highest uninsured-driver rates in California \u2014 so the rider\u2019s own coverage often decides the claim.',
    psychology: 'I was hit on my motorcycle around Fresno and worry the other driver has no insurance.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno motorcycle accident claim',
      'motorcycle hit by uninsured driver california',
      'is lane splitting legal in california',
      'highway 99 motorcycle crash',
      'car turned left into my motorcycle who is at fault',
    ],
    signals: [
      'High uninsured-driver rate',
      'UM/UIM coverage',
      'Highway 99 / rural roads',
      'Farm equipment / trucks',
      'Left-turn driver (21801)',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Fresno motorcycle claims reflect the Central Valley\u2019s roads, weather and insurance realities. Riders share Highway 99 and rural Valley highways with long-haul trucks and seasonal farm equipment, ride in extreme summer heat that affects both pavement and fatigue, and face one of the highest uninsured-motorist rates in the state. That last factor is decisive in many claims. ${UM_UIM} The rural mix creates distinctive collisions: slow-moving farm equipment entering or crossing a highway, trucks with wide turns and blind spots, and higher-speed rural roads where a crash is more likely to be severe. ${LEFT_TURN} Where a truck is involved, the layered commercial-carrier issues apply on top of the motorcycle claim. Lane splitting is less central than in the coastal metros but still legal where congestion occurs. ${LANE_SPLITTING} ${HELMET} Rural roads also raise road-condition questions where a hazard contributed. ${ROAD_DEFECT} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs private claims. Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'Whether the other driver was insured, and your own UM/UIM coverage',
        'Whether farm equipment or a truck was involved',
        'Whether the other driver was turning left across your path',
        'The road and whether it was a higher-speed rural highway',
        'Any road condition or hazard that contributed',
        'Whether heat or visibility played a role',
        'Helmet use, relevant only to head-injury comparative fault',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ leads with the uninsured-driver reality for a Fresno crash, surfacing the rider\u2019s UM/UIM coverage, and applies the left-turn and lane-splitting rules while flagging farm-equipment, truck-involvement and rural road-hazard issues distinctive to the Valley. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me had no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured/underinsured motorist coverage, which is the main source of recovery in many Central Valley claims because the region has one of the highest uninsured-driver rates in the state. UM/UIM is first-party coverage under Insurance Code section 11580.2 with its own deadlines.',
      },
      {
        q: 'I hit farm equipment that pulled onto the highway. Who is responsible?',
        a: 'It depends on the facts, but a vehicle or equipment entering or crossing a highway generally must yield to traffic close enough to be a hazard. Slow-moving farm equipment on rural Valley highways is a known danger to riders, and the operator or the farm operation may be responsible if it failed to yield or was improperly marked or lit.',
      },
      {
        q: 'Is lane splitting legal, and can I be blamed for it?',
        a: 'Lane splitting is legal in California under Vehicle Code section 21658.1. You can be blamed only if you split unreasonably for the conditions \u2014 not merely for splitting at all \u2014 so an insurer blaming you just for splitting is generally wrong.',
      },
      {
        q: 'A car turned left into me. Who is at fault?',
        a: 'Usually the turning driver. Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic close enough to be a hazard, and a left turn across a rider\u2019s path is the most common motorcycle collision.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage and liability questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAKLAND_MOTORCYCLE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Motorcycle Accident Claims',
    title: 'Oakland Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Oakland riders lane split on the I-880 and I-580 commute and ride the winding Oakland hills \u2014 where a documented pavement-and-pothole problem is uniquely dangerous on two wheels and can support a road-defect claim on a short deadline.',
    psychology: 'I crashed my motorcycle in Oakland, maybe on bad pavement or in traffic, and do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland motorcycle accident claim',
      'is lane splitting legal in california',
      'motorcycle crash pothole road defect claim california',
      'car turned left into my motorcycle who is at fault',
      'motorcycle hit by uninsured driver california',
    ],
    signals: [
      'Lane splitting legal (21658.1)',
      'Road defect / pothole (Gov. 835)',
      'Six-month claim deadline',
      'Left-turn driver (21801)',
      'UM/UIM coverage',
      'Oakland hills canyon route',
    ],
    sections: {
      whyItMatters: `Oakland motorcycle claims are shaped by the East Bay commute and the city\u2019s roads. Riders lane split through the heavy I-880 and I-580 congestion and ride the winding roads of the Oakland hills for sport, and one local factor stands out: Oakland has a well-documented pavement problem, with potholes and deteriorated road surfaces that are a nuisance to cars but genuinely dangerous on two wheels. ${ROAD_DEFECT} That makes a road-defect analysis unusually important here, and the six-month claim deadline against a public agency is easy to miss. On the commute, lane splitting is central. ${LANE_SPLITTING} The ordinary collisions still dominate. ${LEFT_TURN} ${UM_UIM} The hills add canyon road-hazard and single-vehicle questions, and West Oakland\u2019s port-truck traffic can bring a commercial truck into a crash with its layered carrier issues. ${HELMET} Pure comparative negligence applies, the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs private claims, and the six-month rule governs public-entity claims. Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'Whether a pothole or road defect contributed, and which agency is responsible',
        'The six-month deadline if a public entity may be liable',
        'Whether you were lane splitting and how traffic was moving',
        'Whether the other driver was turning left across your path',
        'The other driver\u2019s insurance and your own UM/UIM coverage',
        'Whether a port or commercial truck was involved',
        'Helmet use, relevant only to head-injury comparative fault',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ gives an Oakland crash the road-defect analysis it often needs \u2014 identifying the responsible agency and the six-month claim deadline before it passes \u2014 while applying the lane-splitting and left-turn rules and surfacing the rider\u2019s UM/UIM coverage. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I crashed because of a pothole or bad pavement. Can I make a claim?',
        a: 'Possibly. A road hazard that is trivial to a car can be catastrophic on two wheels, and Oakland has a documented pavement problem. Where a dangerous roadway condition contributed, a dangerous-condition-of-public-property claim against the responsible agency may exist under Government Code section 835 \u2014 but it carries a six-month claim deadline, far shorter than the ordinary two years, so acting quickly is essential.',
      },
      {
        q: 'The insurer says I was at fault for lane splitting on the 880. Is that right?',
        a: 'Usually not by itself. Lane splitting is legal in California under Vehicle Code section 21658.1. The question is whether you split reasonably for the conditions \u2014 speed differential, traffic flow, lane position \u2014 not whether you split at all.',
      },
      {
        q: 'A car turned left into me. Who is at fault?',
        a: 'Usually the turning driver. Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic close enough to be a hazard, and a left turn across a rider\u2019s path is the most common motorcycle collision.',
      },
      {
        q: 'The driver who hit me had little or no insurance. What now?',
        a: 'Your own uninsured/underinsured motorist coverage is often the main source of recovery, because riders are disproportionately hurt by under-insured drivers. UM/UIM is first-party coverage under Insurance Code section 11580.2 with its own deadlines, so identify every applicable policy early.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the road-defect, liability and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const motorcycleCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [LONGBEACH_MOTORCYCLE_SLUG]: {
    scenario: `A rider on PCH was cut off by a car turning left into a driveway, and the insurer blamed the rider for splitting earlier in the ride. The left-turn violation controlled fault, and the rider\u2019s UM coverage filled the gap left by the driver\u2019s low limits. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph positions; get the driver\u2019s insurance and witnesses.'],
      ['First days', 'Your own UM/UIM coverage identified and notified.'],
      ['First weeks', 'Left-turn liability and any truck involvement developed.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Minor', 'A low-speed drop with soft-tissue injury.'],
      ['Moderate', 'Fractures or road rash needing ongoing care.'],
      ['Serious', 'Surgery or lasting impairment.'],
      ['Catastrophic', 'A truck-involved or high-speed boulevard impact.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the other driver was turning left',
      'Whether lane splitting was reasonable',
      'Whether a commercial truck was involved',
      'The other driver\u2019s limits and your UM/UIM coverage',
      'Injury severity and treatment continuity',
      'Any head-injury helmet argument',
    ],
    settlementValueDetails: [
      { label: 'Left turn controls', copy: 'The turning driver usually owns fault.' },
      { label: 'Splitting is legal', copy: 'Reasonableness, not the act, is the question.' },
      { label: 'UM/UIM matters', copy: 'It fills the gap on low-limit drivers.' },
      { label: 'Trucks add coverage', copy: 'A carrier brings higher limits and more defendants.' },
    ],
    insuranceProblems: [
      'The rider is blamed merely for lane splitting.',
      'The driver\u2019s low limits are treated as the ceiling.',
      'A helmet argument is applied to non-head injuries.',
      'A port-truck role is never investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the other driver turning left across your path?' },
      { label: 'Step 2', question: 'Were you lane splitting, and how was traffic moving?' },
      { label: 'Step 3', question: 'Was a commercial or port truck involved?' },
      { label: 'Step 4', question: 'What are the driver\u2019s limits and your UM/UIM coverage?' },
    ],
  },
  [RIVERSIDE_MOTORCYCLE_SLUG]: {
    scenario: `An Inland Empire commuter was struck by an uninsured driver on the 60, and the at-fault driver had nothing to collect. The rider\u2019s UM coverage, identified and notified early, became the source of recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph positions; get any insurance and witnesses.'],
      ['First days', 'Your own UM/UIM coverage identified and notified.'],
      ['First weeks', 'Liability and any road-hazard or truck issues developed.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Minor', 'A low-speed drop with soft-tissue injury.'],
      ['Moderate', 'Fractures or road rash needing ongoing care.'],
      ['Serious', 'Surgery or lasting impairment.'],
      ['Catastrophic', 'A high-speed freeway or canyon impact.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the other driver was insured',
      'Your own UM/UIM coverage and its deadlines',
      'Whether lane splitting was reasonable',
      'Any canyon road-hazard or truck involvement',
      'Injury severity and treatment continuity',
      'Any head-injury helmet argument',
    ],
    settlementValueDetails: [
      { label: 'UM/UIM is central', copy: 'A high uninsured rate makes it the main source.' },
      { label: 'Notify early', copy: 'First-party coverage has its own deadlines.' },
      { label: 'Splitting is legal', copy: 'Reasonableness, not the act, is the question.' },
      { label: 'Road hazards count', copy: 'A canyon defect can support a short-deadline claim.' },
    ],
    insuranceProblems: [
      'No UM/UIM claim is opened after an uninsured hit.',
      'The rider is blamed merely for lane splitting.',
      'A canyon road-defect claim misses the six-month deadline.',
      'A helmet argument is applied to non-head injuries.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the other driver insured?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you carry?' },
      { label: 'Step 3', question: 'Did a road hazard or truck contribute?' },
      { label: 'Step 4', question: 'Were you lane splitting, and how was traffic?' },
    ],
  },
  [FRESNO_MOTORCYCLE_SLUG]: {
    scenario: `A rider on Highway 99 was hit by farm equipment pulling onto the highway, and the other driver was uninsured. The equipment operator\u2019s failure to yield established fault, and the rider\u2019s UM coverage backed the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph positions; identify the equipment or driver and any insurer.'],
      ['First days', 'Your own UM/UIM coverage identified and notified.'],
      ['First weeks', 'Failure-to-yield liability and any truck issues developed.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Minor', 'A low-speed drop with soft-tissue injury.'],
      ['Moderate', 'Fractures or road rash needing ongoing care.'],
      ['Serious', 'Surgery or lasting impairment.'],
      ['Catastrophic', 'A high-speed rural highway impact.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the other driver was insured',
      'Your own UM/UIM coverage and its deadlines',
      'Whether farm equipment or a truck failed to yield',
      'Whether the road was a higher-speed rural highway',
      'Injury severity and treatment continuity',
      'Any head-injury helmet argument',
    ],
    settlementValueDetails: [
      { label: 'UM/UIM is central', copy: 'A high uninsured rate makes it the main source.' },
      { label: 'Failure to yield', copy: 'Equipment entering a highway must yield.' },
      { label: 'Rural speed', copy: 'Higher speeds make rural crashes more severe.' },
      { label: 'Splitting is legal', copy: 'Reasonableness, not the act, is the question.' },
    ],
    insuranceProblems: [
      'No UM/UIM claim is opened after an uninsured hit.',
      'A farm-equipment operator\u2019s failure to yield is overlooked.',
      'The rider is blamed merely for lane splitting.',
      'A helmet argument is applied to non-head injuries.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the other driver or operator insured?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you carry?' },
      { label: 'Step 3', question: 'Did farm equipment or a truck fail to yield?' },
      { label: 'Step 4', question: 'What road and speed were involved?' },
    ],
  },
  [OAKLAND_MOTORCYCLE_SLUG]: {
    scenario: `A commuter went down on a deep pothole on an Oakland arterial and nearly waited past the deadline. Recognising a road-defect claim, a written claim reached the responsible agency within six months while the injuries were documented. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the defect with scale; note the exact location.'],
      ['First week', 'The responsible agency and the six-month deadline confirmed.'],
      ['Six months', 'Written claim presented if a public entity is responsible.'],
      ['Longer term', 'Prior-complaint and repair history and treatment gathered.'],
    ],
    severityLadder: [
      ['Minor', 'A low-speed drop with soft-tissue injury.'],
      ['Moderate', 'Fractures or road rash needing ongoing care.'],
      ['Serious', 'Surgery or lasting impairment.'],
      ['Road defect', 'A dangerous-condition claim on the six-month clock.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a pothole or road defect contributed',
      'Whether the six-month claim was presented in time',
      'Whether lane splitting was reasonable',
      'Whether the other driver was turning left',
      'The other driver\u2019s limits and your UM/UIM coverage',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Road defects count', copy: 'Bad pavement is dangerous on two wheels.' },
      { label: 'Six-month clock', copy: 'A public-entity claim runs on a short deadline.' },
      { label: 'Splitting is legal', copy: 'Reasonableness, not the act, is the question.' },
      { label: 'UM/UIM matters', copy: 'It fills the gap on low-limit drivers.' },
    ],
    insuranceProblems: [
      'A road-defect claim misses the six-month deadline.',
      'The defect is repaired before it is photographed.',
      'The rider is blamed merely for lane splitting.',
      'A helmet argument is applied to non-head injuries.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did a pothole or road defect contribute?' },
      { label: 'Step 2', question: 'Which agency is responsible for that road?' },
      { label: 'Step 3', question: 'Were you lane splitting, and how was traffic?' },
      { label: 'Step 4', question: 'What are the driver\u2019s limits and your UM/UIM coverage?' },
    ],
  },
}
