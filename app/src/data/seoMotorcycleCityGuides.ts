import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, motorcycle practice area: city-specific motorcycle-accident guides
 * for Los Angeles, San Diego, San Jose, and Sacramento.
 *
 * These complement the statewide motorcycle hub (value, liability, SOL, hiring)
 * with genuinely local riding context rather than interpolated copy:
 *  - Los Angeles: the country's lane-splitting and canyon-riding capital, with
 *    dense freeway congestion (405, 101, 110) and canyon roads (Mulholland, the
 *    Angeles Crest Highway) that concentrate serious motorcycle collisions.
 *  - San Diego: a large military-rider population around Camp Pendleton and the
 *    bases, year-round riding on coastal and mountain routes (Pacific Coast
 *    Highway, Sunrise Highway), and the possibility of a federal vehicle, which
 *    routes a claim through the Federal Tort Claims Act.
 *  - San Jose: South Bay canyon roads popular for sport riding (Highway 9,
 *    Skyline Boulevard, Mount Hamilton Road) plus heavy commuter lane splitting
 *    on 101, 280, and 880, in a region where self-funded health plans take a
 *    large lien out of any recovery.
 *  - Sacramento: Valley heat and the Highway 50 corridor toward the Sierra,
 *    delta back-roads, tule fog, and an unusual density of State of California
 *    vehicles that can route a claim through the state's claims program.
 *
 * Motorcycle-specific California law, applied accurately:
 *  - Lane splitting is legal (Veh. Code section 21658.1); California is the only
 *    state to have expressly authorised it, so an insurer that blames a rider
 *    merely for splitting is usually wrong.
 *  - Left-turn collisions, where a car turns across a rider's path, are the most
 *    common motorcycle crash and typically put fault on the turning driver
 *    (Veh. Code section 21801).
 *  - Unlike bicyclists, all motorcycle riders and passengers must wear a
 *    DOT-compliant helmet (Veh. Code section 27803), so helmet non-use can be
 *    raised as comparative fault for head injuries, though it does not bar a
 *    claim and does not affect non-head injuries.
 *  - Pure comparative negligence, and uninsured/underinsured motorist coverage
 *    under Insurance Code section 11580.2.
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

export const LA_MOTORCYCLE_SLUG = '/los-angeles-motorcycle-accident'
export const SD_MOTORCYCLE_SLUG = '/san-diego-motorcycle-accident'
export const SJ_MOTORCYCLE_SLUG = '/san-jose-motorcycle-accident'
export const SAC_MOTORCYCLE_SLUG = '/sacramento-motorcycle-accident'

export const motorcycleCityGuidePages: LandingPage[] = [
  {
    slug: LA_MOTORCYCLE_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Motorcycle Accident Claims',
    title: 'Los Angeles Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Los Angeles is the country\u2019s lane-splitting and canyon-riding capital. An LA motorcycle claim usually turns on whether splitting was reasonable, a left-turning driver, and the rider\u2019s own coverage when the other driver has little.',
    psychology: 'I was hit on my motorcycle in LA, maybe while lane splitting or in a canyon, and the insurer is blaming me.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles motorcycle accident claim',
      'lane splitting accident who is at fault california',
      'car turned left in front of my motorcycle la',
      'motorcycle hit by uninsured driver los angeles',
      'mulholland canyon motorcycle crash claim',
    ],
    signals: [
      'Lane-splitting collision',
      'Left-turn collision',
      'Freeway congestion (405/101/110)',
      'Canyon road (Mulholland / Angeles Crest)',
      'Uninsured or underinsured driver',
      'DOT helmet question',
    ],
    sections: {
      whyItMatters: `Los Angeles is where motorcycle claims are most contested, because two of the city\u2019s defining riding conditions are exactly the ones insurers use to shift blame. The first is lane splitting. LA\u2019s chronic freeway congestion on the 405, 101 and 110 makes splitting a daily reality, and it is legal. ${LANE_SPLITTING} The second is left-turn exposure at the city\u2019s enormous intersections, where a car turning across a rider\u2019s path is the single most common way LA riders are seriously hurt. ${LEFT_TURN} A third pattern is unique to LA\u2019s geography: canyon and mountain roads such as Mulholland Drive and the Angeles Crest Highway draw sport and recreational riders, and collisions there \u2014 with cars crossing the centre line, with road defects, or single-vehicle crashes caused by gravel or a dangerous condition \u2014 raise their own questions about roadway maintenance and, potentially, a public entity on the Government Claims Act\u2019s six-month deadline. Two financial realities shape the outcome. Motorcycle injuries tend to be severe, so the medical and wage-loss components are large and must be documented, and Los Angeles has a high share of uninsured and underinsured drivers, so the rider\u2019s own coverage is often what actually pays. ${UM_UIM} On helmets: ${HELMET} Pure comparative negligence means any genuine rider fault reduces rather than bars recovery, and the anti-motorcyclist bias insurers rely on \u2014 assumptions about speed and gear \u2014 is answered with physical evidence: scene measurements, vehicle damage and the turning driver\u2019s sight lines. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether you were lane splitting, and the speed differential and traffic flow',
        'Whether a car turned left across your path, and its position',
        'Whether the collision was on a canyon or mountain road, and any road defect',
        'Whether the at-fault driver was insured, and the limits',
        'Your own auto or motorcycle policy and its UM/UIM coverage',
        'Whether a DOT helmet was worn, relevant only to head injuries',
        'Scene measurements, vehicle damage, and the driver\u2019s sight lines',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ frames an LA motorcycle claim around the questions that decide it: whether lane splitting was reasonable rather than merely present, whether a left-turning driver failed to yield, and whether the rider\u2019s own UM/UIM must carry a claim against an underinsured driver. It documents the scene facts that answer motorcyclist bias and flags a canyon-road condition that could implicate a public entity. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was lane splitting when I was hit. Does that make it my fault?',
        a: 'Not by itself. Lane splitting is legal in California under Vehicle Code section 21658.1, and the question is whether you were splitting reasonably for the conditions \u2014 speed differential, traffic flow, lane position \u2014 not whether you were splitting at all. Insurers routinely blame the rider for splitting, and that argument is usually overstated.',
      },
      {
        q: 'A car turned left in front of me. Who is at fault?',
        a: 'Usually the turning driver. Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic close enough to be a hazard, and a car turning across a rider\u2019s path is the most common motorcycle collision. \u201cI never saw the motorcycle\u201d generally describes a failure to look rather than a defence.',
      },
      {
        q: 'The driver had little or no insurance. Can I still recover?',
        a: 'Often yes, through your own uninsured/underinsured motorist coverage, which frequently becomes the main source of recovery because riders are so often hit by underinsured drivers. It is first-party coverage with its own deadlines, and underinsured coverage pays the gap above the driver\u2019s limits, so identifying every policy early matters.',
      },
      {
        q: 'I was not wearing a helmet. Does that end my claim?',
        a: 'No. California requires a DOT helmet for all riders, so unlike a bicycle case an insurer may raise helmet non-use as comparative fault \u2014 but only for head injuries, not for other injuries, and it does not bar the claim. Under pure comparative negligence it would at most reduce recovery for the affected injuries.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage questions \u2014 including your own UM/UIM \u2014 and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_MOTORCYCLE_SLUG,
    category: 'Cities',
    cluster: 'San Diego Motorcycle Accident Claims',
    title: 'San Diego Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Diego\u2019s large military-rider population, year-round coastal and mountain riding, and the chance of a federal vehicle give its motorcycle claims a distinctive shape \u2014 including claims that run through the Federal Tort Claims Act.',
    psychology: 'I was hit on my motorcycle in San Diego, maybe by a federal or military vehicle, or on a coastal or mountain road.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego motorcycle accident claim',
      'hit by a military or federal vehicle california claim',
      'lane splitting accident who is at fault california',
      'motorcycle crash on sunrise highway or pch',
      'car turned left in front of my motorcycle san diego',
    ],
    signals: [
      'Federal or military vehicle (FTCA)',
      'Lane-splitting collision',
      'Left-turn collision',
      'Coastal / mountain route',
      'Uninsured or underinsured driver',
      'DOT helmet question',
    ],
    sections: {
      whyItMatters: `San Diego motorcycle claims carry one feature few other cities do: a large military presence. With Camp Pendleton and the Navy and Marine bases nearby, the region has a big population of active-duty riders \u2014 sport bikes are especially popular \u2014 and federal vehicles on the roads. That matters because a collision caused by a federal or military vehicle is generally not an ordinary claim; it runs under the Federal Tort Claims Act, which requires presenting an administrative claim on Standard Form 95 to the responsible federal agency within two years, before any lawsuit, on a process entirely separate from a claim against a private driver. Identifying a federal vehicle early is therefore decisive. Beyond that, San Diego\u2019s year-round riding weather keeps motorcycles on the road in every season, and its geography produces two collision environments: coastal routes such as the Pacific Coast Highway with heavy mixed traffic, and mountain and back-country roads such as Sunrise Highway, where cars crossing the centre line, road defects and single-vehicle crashes raise questions about roadway maintenance and a possible public entity on the six-month Government Claims Act deadline. The ordinary urban patterns still dominate in number: lane splitting and left-turn collisions. ${LANE_SPLITTING} ${LEFT_TURN} Motorcycle injuries tend to be severe, and where the at-fault driver is uninsured or underinsured the rider\u2019s own coverage often carries the claim. ${UM_UIM} On helmets: ${HELMET} Pure comparative negligence means any genuine rider fault reduces rather than bars recovery. Civil cases against private and local parties are filed in San Diego County Superior Court; a federal-vehicle claim proceeds through the FTCA process and, if suit follows, federal court.`,
      whatToTrack: [
        'Whether a federal or military vehicle was involved, which triggers the FTCA',
        'Whether you were lane splitting, and the speed differential and traffic flow',
        'Whether a car turned left across your path, and its position',
        'Whether the collision was on a coastal or mountain road, and any road defect',
        'Whether the at-fault driver was insured, and the limits',
        'Your own auto or motorcycle policy and its UM/UIM coverage',
        'Whether a DOT helmet was worn, relevant only to head injuries',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ checks first for a federal or military vehicle, because a San Diego claim that belongs under the Federal Tort Claims Act follows a wholly different process and a Standard Form 95 deadline. It then applies the lane-splitting and left-turn rules, flags a mountain-road condition that could implicate a public entity, and surfaces the rider\u2019s own UM/UIM when the other driver is underinsured. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A military or federal vehicle hit me. How is that claim different?',
        a: 'It generally proceeds under the Federal Tort Claims Act, not an ordinary insurance claim. You must present an administrative claim on Standard Form 95 to the responsible federal agency, typically within two years, before you can sue, and any lawsuit is in federal court. Because San Diego has so many federal and military vehicles, identifying one early is essential to using the right process and deadline.',
      },
      {
        q: 'I was lane splitting when I was hit. Is it my fault?',
        a: 'Not by itself. Lane splitting is legal in California under Vehicle Code section 21658.1, and the question is whether you were splitting reasonably for the conditions, not whether you were splitting at all. Insurers routinely blame the rider for splitting, and that argument is usually overstated.',
      },
      {
        q: 'A car turned left across my path. Who is responsible?',
        a: 'Usually the turning driver. Vehicle Code section 21801 requires a left-turning driver to yield to oncoming traffic close enough to be a hazard, and a left turn across a rider\u2019s path is the most common motorcycle collision. \u201cI never saw the motorcycle\u201d generally describes a failure to look.',
      },
      {
        q: 'I was not wearing a helmet. Does that bar my claim?',
        a: 'No. California requires a DOT helmet for all riders, so an insurer may raise helmet non-use as comparative fault \u2014 but only for head injuries, not other injuries, and it does not bar the claim. Under pure comparative negligence it would at most reduce recovery for the affected injuries.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage and process questions \u2014 including whether the FTCA applies \u2014 and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_MOTORCYCLE_SLUG,
    category: 'Cities',
    cluster: 'San Jose Motorcycle Accident Claims',
    title: 'San Jose Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Jose riders split lanes through heavy 101, 280, and 880 commute traffic and ride the South Bay canyon roads \u2014 and a Silicon Valley health plan can take a large share of any recovery.',
    psychology: 'I was hit on my motorcycle in San Jose, maybe while lane splitting or on a canyon road, and I do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose motorcycle accident claim',
      'lane splitting accident who is at fault california',
      'motorcycle crash on highway 9 or skyline',
      'car turned left in front of my motorcycle san jose',
      'health insurance lien on settlement california',
    ],
    signals: [
      'Lane-splitting collision',
      'Left-turn collision',
      'Commute traffic (101 / 280 / 880)',
      'Canyon road (Highway 9 / Skyline / Mount Hamilton)',
      'Self-funded health plan lien',
      'DOT helmet question',
    ],
    sections: {
      whyItMatters: `San Jose motorcycle claims are shaped by the South Bay\u2019s two riding environments and by Silicon Valley economics. The everyday environment is commuter lane splitting: the region\u2019s dense, slow traffic on 101, 280 and 880 makes splitting routine, and it is legal. ${LANE_SPLITTING} The weekend environment is the canyon roads that ring the valley \u2014 Highway 9, Skyline Boulevard and Mount Hamilton Road \u2014 popular for sport riding, where collisions with cars crossing the centre line, road defects, or single-vehicle crashes caused by a dangerous condition raise questions about roadway maintenance and a possible public entity on the six-month Government Claims Act deadline. In the ordinary urban setting, left-turn collisions dominate. ${LEFT_TURN} The economic feature is the same one that shapes San Jose pedestrian and bicycle claims: many injured riders here are high earners whose health coverage is a self-funded, federally governed plan, and those plans have strong reimbursement rights that can take a large, hard-to-reduce share of any recovery. Because motorcycle injuries tend to be severe, the medical bills are large, the lien is correspondingly large, and identifying the plan type early is what keeps the net recovery from collapsing. High earnings also make the wage-loss component significant but dependent on records. ${UM_UIM} On helmets: ${HELMET} Pure comparative negligence means any genuine rider fault reduces rather than bars recovery. Civil cases are filed in Santa Clara County Superior Court at the Downtown Superior Court.`,
      whatToTrack: [
        'Whether you were lane splitting, and the speed differential and traffic flow',
        'Whether a car turned left across your path, and its position',
        'Whether the collision was on a canyon road, and any road defect',
        'Whether your health plan is self-funded or fully insured, which governs the lien',
        'The running total your health plan has paid toward treatment',
        'Whether the at-fault driver was insured, and your own UM/UIM',
        'Pay records for any wage loss',
        'Whether a DOT helmet was worn, relevant only to head injuries',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the lane-splitting and left-turn rules that decide fault in San Jose, flags a canyon-road condition that could implicate a public entity, and \u2014 crucially for Silicon Valley riders \u2014 identifies whether a self-funded health plan will take a large share of a recovery, tracking that lien from the start rather than at distribution. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was lane splitting on the 101 when I was hit. Is it my fault?',
        a: 'Not by itself. Lane splitting is legal in California under Vehicle Code section 21658.1, and the question is whether you were splitting reasonably for the conditions \u2014 speed differential, traffic flow, lane position \u2014 not whether you were splitting at all. Commuter splitting is routine in the South Bay, and insurers still try to blame the rider for it.',
      },
      {
        q: 'Why might my health insurer take part of my settlement?',
        a: 'Most plans include a reimbursement provision, and in Silicon Valley many are self-funded and federally governed, which makes their recovery rights strong and hard to reduce. Because motorcycle injuries and bills tend to be large, the lien is large too, so a strong settlement can leave much less than expected unless the lien is identified and quantified at the start.',
      },
      {
        q: 'A car turned left in front of me on a canyon road. Who is at fault?',
        a: 'Usually the turning driver, under Vehicle Code section 21801, which requires yielding to oncoming traffic close enough to be a hazard. On canyon roads a dangerous roadway condition can also contribute, which may implicate the public entity that maintains the road on the six-month deadline \u2014 so the location and any defect matter.',
      },
      {
        q: 'I was not wearing a helmet. Does that end my claim?',
        a: 'No. California requires a DOT helmet for all riders, so an insurer may raise helmet non-use as comparative fault \u2014 but only for head injuries, not other injuries, and it does not bar the claim. Under pure comparative negligence it would at most reduce recovery for the affected injuries.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage and lien questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_MOTORCYCLE_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Motorcycle Accident Claims',
    title: 'Sacramento Motorcycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sacramento riders take the Highway 50 corridor toward the Sierra and the delta back-roads, face tule fog, and share streets with an unusual density of state vehicles \u2014 each of which shapes a motorcycle claim.',
    psychology: 'I was hit on my motorcycle in Sacramento, maybe by a state vehicle, on the highway to Tahoe, or in fog.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento motorcycle accident claim',
      'lane splitting accident who is at fault california',
      'hit by a state government vehicle california claim',
      'motorcycle crash on highway 50 corridor',
      'car turned left in front of my motorcycle sacramento',
    ],
    signals: [
      'Lane-splitting collision',
      'Left-turn collision',
      'State of California vehicle',
      'Highway 50 / Sierra corridor',
      'Tule fog low visibility',
      'DOT helmet question',
    ],
    sections: {
      whyItMatters: `Sacramento motorcycle claims combine ordinary riding patterns with three local features. The riding environments are the Highway 50 corridor, which carries riders from the Valley up toward the Sierra and Tahoe, and the delta back-roads to the west and south, both of which produce higher-speed collisions and, where a dangerous roadway condition or a car crossing the centre line is involved, raise roadway-maintenance and possible public-entity questions on the six-month Government Claims Act deadline. In the city, the usual patterns dominate: commuter lane splitting on the causeway and freeways, which is legal, and left-turn collisions at intersections. ${LANE_SPLITTING} ${LEFT_TURN} The first distinctive feature is the state fleet: as the capital, Sacramento has an unusual density of State of California vehicles on the roads, so a rider struck by a state vehicle presents a Government Claims Act claim through the State\u2019s Government Claims Program, again on the six-month clock rather than the ordinary two years. ${'Under the Government Claims Act a written claim must be presented within six months of the collision; the entity then has 45 days to respond, and your deadline to sue depends on whether it rejects the claim in writing.'} The second feature is tule fog: dense Central Valley fog in the cooler months cuts visibility and makes a driver\u2019s speed for the conditions central, since the basic speed law requires driving safely for the visibility. Motorcycle injuries tend to be severe, and where the at-fault driver is uninsured or underinsured the rider\u2019s own coverage often carries the claim. ${UM_UIM} On helmets: ${HELMET} Pure comparative negligence means any genuine rider fault reduces rather than bars recovery. Civil cases are filed in Sacramento County Superior Court at the Gordon D. Schaber Downtown Courthouse.`,
      whatToTrack: [
        'Whether the vehicle was a State of California vehicle',
        'Whether you were lane splitting, and the speed differential and traffic flow',
        'Whether a car turned left across your path, and its position',
        'Whether the collision was on the Highway 50 corridor or a delta road, and any road defect',
        'The visibility and whether tule fog was present',
        'Whether the at-fault driver was insured, and your own UM/UIM',
        'Whether a DOT helmet was worn, relevant only to head injuries',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags a State of California vehicle, which routes a Sacramento motorcycle claim through the State\u2019s Government Claims Program on a six-month clock, and applies the lane-splitting and left-turn rules that decide fault. It documents fog conditions where the driver\u2019s speed is central and surfaces the rider\u2019s own UM/UIM when the other driver is underinsured. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A state government vehicle hit me while I was riding. How do I claim?',
        a: 'Through the Government Claims Act, presenting a written claim to the State via its Government Claims Program, generally within six months of the collision. Because Sacramento is the state capital, state vehicles are unusually common here, and this shortened deadline applies rather than the ordinary two years.',
      },
      {
        q: 'I was lane splitting when I was hit. Does that make it my fault?',
        a: 'Not by itself. Lane splitting is legal in California under Vehicle Code section 21658.1, and the question is whether you were splitting reasonably for the conditions, not whether you were splitting at all. Insurers routinely blame the rider for splitting, and that argument is usually overstated.',
      },
      {
        q: 'It was foggy when I crashed. Does the fog excuse the driver?',
        a: 'No. Tule fog reduces visibility, but the basic speed law requires driving at a speed safe for the conditions, so a driver going too fast for the fog is negligent regardless. Fog makes the driver\u2019s speed and the lighting central to the claim, which is why documenting the conditions matters.',
      },
      {
        q: 'I was not wearing a helmet. Does that bar my claim?',
        a: 'No. California requires a DOT helmet for all riders, so an insurer may raise helmet non-use as comparative fault \u2014 but only for head injuries, not other injuries, and it does not bar the claim. Under pure comparative negligence it would at most reduce recovery for the affected injuries.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage questions \u2014 including whether a claim against the State applies \u2014 and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const motorcycleCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_MOTORCYCLE_SLUG]: {
    scenario: `A rider splitting slowed freeway traffic on the 405 was struck by a car changing lanes, and the insurer blamed the split. The speed differential and lane position showed the split was reasonable, and the rider\u2019s own UIM covered the gap when the driver\u2019s policy ran out. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the traffic flow, your speed differential, and lane position.'],
      ['First week', 'Report obtained; the driver\u2019s coverage and your own UM/UIM identified.'],
      ['First month', 'Scene measurements and vehicle damage assembled against bias.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured driver.'],
      ['Contested split', 'The insurer blames lawful lane splitting.'],
      ['Underinsured', 'The driver\u2019s limits fall short; UIM becomes central.'],
      ['Canyon crash', 'A centre-line or road-defect collision on a mountain road.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the lane split was reasonable for the conditions',
      'Whether a left-turning driver failed to yield',
      'Whether the driver was insured, and your own UM/UIM',
      'Scene measurements and vehicle damage answering bias',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Splitting is legal', copy: 'Section 21658.1 makes reasonableness the question.' },
      { label: 'Left turns dominate', copy: 'Section 21801 usually puts fault on the turning driver.' },
      { label: 'UM often carries it', copy: 'Riders are often hit by underinsured drivers.' },
      { label: 'Helmet is bounded', copy: 'Relevant only to head injuries; not a bar.' },
    ],
    insuranceProblems: [
      'The rider is blamed simply for lane splitting.',
      'Motorcyclist bias substitutes for scene evidence.',
      'The claim stalls when the driver is underinsured.',
      'Helmet non-use is treated as barring the whole claim.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you lane splitting, and what was the traffic like?' },
      { label: 'Step 2', question: 'Did a car turn left across your path?' },
      { label: 'Step 3', question: 'Was the driver insured, and do you have UM/UIM?' },
      { label: 'Step 4', question: 'Was the collision on a canyon or mountain road?' },
    ],
  },
  [SD_MOTORCYCLE_SLUG]: {
    scenario: `A rider was struck by a government vehicle near a base, and an ordinary insurance claim would have gone nowhere. Recognising it as a Federal Tort Claims Act matter, a Standard Form 95 was presented to the agency in time, keeping the claim alive. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the vehicle was federal or military; identify the agency.'],
      ['First weeks', 'Report obtained; the correct process \u2014 FTCA or ordinary \u2014 confirmed.'],
      ['Within two years', 'Standard Form 95 presented if a federal vehicle was involved.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured private driver.'],
      ['Federal vehicle', 'An FTCA claim on a Standard Form 95 process.'],
      ['Underinsured', 'The driver\u2019s limits fall short; UIM becomes central.'],
      ['Mountain crash', 'A centre-line or road-defect collision on a back-country road.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a federal or military vehicle triggers the FTCA process',
      'Whether the lane split was reasonable for the conditions',
      'Whether a left-turning driver failed to yield',
      'Whether the driver was insured, and your own UM/UIM',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Federal is different', copy: 'The FTCA and Form 95 replace an ordinary claim.' },
      { label: 'Splitting is legal', copy: 'Section 21658.1 makes reasonableness the question.' },
      { label: 'Left turns dominate', copy: 'Section 21801 usually puts fault on the turning driver.' },
      { label: 'Helmet is bounded', copy: 'Relevant only to head injuries; not a bar.' },
    ],
    insuranceProblems: [
      'A federal-vehicle claim is filed as an ordinary insurance claim and stalls.',
      'The Standard Form 95 deadline is missed.',
      'The rider is blamed simply for lane splitting.',
      'The claim stalls when the driver is underinsured.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the vehicle federal or military?' },
      { label: 'Step 2', question: 'Were you lane splitting, and what was the traffic like?' },
      { label: 'Step 3', question: 'Did a car turn left across your path?' },
      { label: 'Step 4', question: 'Was the driver insured, and do you have UM/UIM?' },
    ],
  },
  [SJ_MOTORCYCLE_SLUG]: {
    scenario: `A commuter splitting slow 280 traffic was cut off by a merging car, and the resulting surgery ran up large bills. Because his health plan was self-funded, spotting the lien early kept it from swallowing the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the traffic flow, your speed differential, and lane position.'],
      ['First week', 'Report obtained; the driver\u2019s coverage and your own UM/UIM identified.'],
      ['First month', 'Health plan identified as self-funded or fully insured; lien quantified.'],
      ['Longer term', 'Wage loss proved with records; fault position documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured driver.'],
      ['Contested split', 'The insurer blames lawful lane splitting.'],
      ['Lien-heavy', 'A self-funded plan with strong reimbursement rights.'],
      ['Canyon crash', 'A centre-line or road-defect collision on a South Bay road.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and the growing lien tracked together.' },
    ],
    settlementDrivers: [
      'Whether the lane split was reasonable for the conditions',
      'Whether a left-turning driver failed to yield',
      'Whether the health plan is self-funded',
      'The total the plan has paid, for the lien',
      'Whether the driver was insured, and your own UM/UIM',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Splitting is legal', copy: 'Section 21658.1 makes reasonableness the question.' },
      { label: 'Net versus gross', copy: 'A self-funded plan can take a large, hard-to-reduce share.' },
      { label: 'Left turns dominate', copy: 'Section 21801 usually puts fault on the turning driver.' },
      { label: 'Prove earnings', copy: 'High wage loss needs records, not assertion.' },
    ],
    insuranceProblems: [
      'The rider is blamed simply for lane splitting.',
      'A self-funded lien is quantified only at settlement.',
      'The claim stalls when the driver is underinsured.',
      'Wage loss is disputed for want of records.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you lane splitting, and what was the traffic like?' },
      { label: 'Step 2', question: 'Is your health plan self-funded or fully insured?' },
      { label: 'Step 3', question: 'Did a car turn left across your path?' },
      { label: 'Step 4', question: 'What wage loss can you document?' },
    ],
  },
  [SAC_MOTORCYCLE_SLUG]: {
    scenario: `A rider on the Highway 50 corridor was struck by a state vehicle, and the claim nearly went in on the two-year assumption. Recognising it as a Government Claims Act matter, the written claim reached the State\u2019s program within six months. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the vehicle was state, the weather, and your lane position.'],
      ['First week', 'Report obtained; public-entity or state involvement assessed.'],
      ['Six months', 'Deadline to present a written claim to the State or another entity.'],
      ['Longer term', 'Conditions and treatment documented for the fault fight.'],
    ],
    severityLadder: [
      ['Straightforward', 'A clearly at-fault, well-insured private driver.'],
      ['State vehicle', 'A claim through the State\u2019s Government Claims Program.'],
      ['Low visibility', 'A tule-fog collision where the driver\u2019s speed is central.'],
      ['Corridor crash', 'A higher-speed Highway 50 or delta-road collision.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a State or other public vehicle was involved',
      'Whether the claim is routed to the right program in time',
      'Whether the lane split was reasonable for the conditions',
      'The visibility and the driver\u2019s speed for the conditions',
      'Whether the driver was insured, and your own UM/UIM',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'State vehicles common', copy: 'The capital routes many claims through the State program.' },
      { label: 'Six-month clock', copy: 'A State or public claim runs on the short deadline.' },
      { label: 'Splitting is legal', copy: 'Section 21658.1 makes reasonableness the question.' },
      { label: 'Fog is no excuse', copy: 'The basic speed law governs speed in poor visibility.' },
    ],
    insuranceProblems: [
      'A state-vehicle claim is filed on the wrong process or deadline.',
      'A government claim is rejected as untimely at six months.',
      'The rider is blamed simply for lane splitting.',
      'Fog is treated as excusing the driver.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the vehicle a State of California vehicle?' },
      { label: 'Step 2', question: 'Were you lane splitting, and what was the traffic like?' },
      { label: 'Step 3', question: 'What were the visibility and weather conditions?' },
      { label: 'Step 4', question: 'Was the driver insured, and do you have UM/UIM?' },
    ],
  },
}
