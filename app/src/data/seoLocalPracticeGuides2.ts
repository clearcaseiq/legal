import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, batch two: pedestrian and bicycle guides for San Jose,
 * Sacramento, and Oakland.
 *
 * Each metro has a genuinely different local angle rather than an interpolated
 * one:
 *  - San Jose: Santa Clara County's high-speed expressway system (Lawrence,
 *    Central, San Tomas, Montague, Capitol), VTA light rail running at street
 *    level, and a Silicon Valley earner base where self-funded ERISA health
 *    plans take a large, hard-to-negotiate lien out of any recovery.
 *  - Sacramento: the state capital, so an unusually high density of State of
 *    California government vehicles (a Government Claims Act claim against the
 *    State via its Government Claims Program), SacRT light rail at grade, and
 *    Central Valley tule fog producing low-visibility collisions.
 *  - Oakland: AC Transit and BART everywhere, a long-documented City pavement
 *    maintenance backlog that turns potholes and failed surfaces into
 *    dangerous-condition claims, and the I-880 port-drayage corridor.
 *
 * California law woven through matches batch one: pedestrian right of way and
 * unmarked crosswalks (Veh. Code §§ 21950, 275); the 2023 Freedom to Walk Act;
 * cyclists' rights and duties (§ 21200), three-foot passing (§ 21760), and the
 * dooring prohibition (§ 22517); pure comparative negligence; and the
 * six-month Government Claims Act deadline for public entities.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a shortened public-entity deadline applies, and how comparative fault is assessed, depends on facts a licensed California attorney should review promptly.'

const CLAIMS_ACT =
  'Under the Government Claims Act a written claim must be presented to the public entity within six months of the collision, not the two years that applies to a private driver. The entity then has 45 days to respond; if it rejects the claim in writing you generally have six months from that notice to sue, and if it never answers, generally two years from the collision. Missing the six-month step usually bars the claim, though a late-claim application may be possible within a year.'

export const SJ_PEDESTRIAN_SLUG = '/san-jose-pedestrian-accident'
export const SAC_PEDESTRIAN_SLUG = '/sacramento-pedestrian-accident'
export const OAK_PEDESTRIAN_SLUG = '/oakland-pedestrian-accident'
export const SJ_BICYCLE_SLUG = '/san-jose-bicycle-accident'
export const SAC_BICYCLE_SLUG = '/sacramento-bicycle-accident'
export const OAK_BICYCLE_SLUG = '/oakland-bicycle-accident'

export const localPracticeGuidePages2: LandingPage[] = [
  {
    slug: SJ_PEDESTRIAN_SLUG,
    category: 'Cities',
    cluster: 'San Jose Pedestrian Accident Claims',
    title: 'San Jose Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Jose\u2019s county expressways are built for speed, not for people on foot, and VTA light rail runs at street level. Add Silicon Valley health plans that take a large lien out of a recovery, and a pedestrian claim here has a particular shape.',
    psychology: 'I was hit while walking in San Jose, maybe on an expressway or near the light rail, and I do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose pedestrian accident claim',
      'hit by a car on a santa clara county expressway',
      'vta light rail pedestrian accident claim',
      'pedestrian right of way california crosswalk',
      'health insurance lien on settlement california',
    ],
    signals: [
      'County expressway crossing',
      'VTA light rail or bus',
      'Self-funded health plan lien',
      'Six-month agency deadline',
      'Unmarked crosswalk at an intersection',
      'High wage loss',
    ],
    sections: {
      whyItMatters: `San Jose pedestrian claims are shaped by an unusual road network and an unusual population. The road network is the county expressway system — Lawrence, Central, San Tomas, Montague, Capitol and others — a set of high-capacity, high-speed arterials that behave more like freeways than city streets but run at grade through neighbourhoods, with long distances between signals. A pedestrian struck on one of these is far more likely to be seriously hurt, and liability turns on physical facts: crossing distance, signal phase, lighting and the driver\u2019s sight lines rather than either account. Because the expressways are county roads, a dangerous condition of the roadway itself — a missing signal, an unsafe crossing design — points to a public entity. The second network feature is VTA light rail, which runs at street level through downtown and along several corridors, so pedestrian collisions with trains and at crossings are a recurring local pattern. VTA, the City of San Jose and the County of Santa Clara are all public entities, so a collision involving one of their vehicles, or a dangerous roadway condition, is governed by the Government Claims Act and its six-month presentation deadline. ${CLAIMS_ACT} The population feature is Silicon Valley economics. A large share of injured people here are high earners with strong, employer-sponsored health coverage, and many of those plans are self-funded and governed by federal law, which means their right to be reimbursed from a settlement is generally stronger and harder to reduce than a state-regulated plan\u2019s. The practical effect is that the settlement figure and the amount actually kept can diverge sharply, and identifying the plan type early is what makes the lien manageable. High earnings also mean the wage-loss component is larger but has to be proved with records rather than asserted. California\u2019s pedestrian protections apply throughout: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing, so the fault an insurer assigns is often overstated, and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Santa Clara County Superior Court at the Downtown Superior Court on North First Street.`,
      whatToTrack: [
        'Whether the collision was on a county expressway, and exactly where',
        'Signal phase, lighting, and crossing distance at the location',
        'Whether a VTA light rail vehicle, bus, or city vehicle was involved, and the date',
        'Whether your health plan is self-funded or fully insured, which governs the lien',
        'The running total your health plan has paid toward treatment',
        'Pay records and employer confirmation for any wage loss',
        'Whether the crosswalk was marked or unmarked',
        'Which agency responded: San Jose Police on streets, CHP on freeways',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the two things that most often shape a San Jose pedestrian claim: whether a public entity — a county expressway condition, VTA, the City — has cut the deadline to six months, and whether a self-funded health plan will quietly take a large share of any recovery. It documents the expressway crossing conditions that decide fault and tracks the lien against the settlement from the start. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hit on a Santa Clara County expressway. Does that change my claim?',
        a: 'It can. The expressways are high-speed county roads, so injuries tend to be serious and liability turns on crossing distance, signal phase and lighting. If a dangerous condition of the roadway contributed, the claim runs against the county as a public entity on the six-month Government Claims Act deadline, which is far shorter than the ordinary two years.',
      },
      {
        q: 'A VTA light rail train or bus was involved. What is the deadline?',
        a: 'Six months to present a written claim, because VTA is a public entity under the Government Claims Act. Light rail runs at street level through much of San Jose, so pedestrian and crossing collisions with it are handled on the shortened government timeline, and the agency then has 45 days to respond.',
      },
      {
        q: 'Why might my health insurer take part of my settlement?',
        a: 'Most plans include a reimbursement provision, and in Silicon Valley many are self-funded and governed by federal law, which makes their recovery rights stronger and harder to reduce than a state-regulated plan\u2019s. The result is that a strong settlement can leave much less than expected unless the lien is identified and quantified at the start rather than at distribution.',
      },
      {
        q: 'I was crossing where there was no painted crosswalk. Am I at fault?',
        a: 'Not necessarily. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction under the Freedom to Walk Act. Insurers still argue pedestrian fault, but under pure comparative negligence any genuine share only reduces recovery rather than barring it.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, coverage and lien questions, and deadlines of a claim so you understand what you have and a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_PEDESTRIAN_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Pedestrian Accident Claims',
    title: 'Sacramento Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'As the state capital, Sacramento has an unusual density of State of California vehicles, SacRT light rail at street level, and Central Valley tule fog that produces low-visibility collisions — each of which changes a pedestrian claim.',
    psychology: 'I was hit while walking in Sacramento and a state vehicle, the light rail, or heavy fog was involved.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento pedestrian accident claim',
      'hit by a state government vehicle california claim',
      'sacrt light rail pedestrian accident',
      'claim against the state of california deadline',
      'tule fog accident sacramento',
    ],
    signals: [
      'State of California vehicle',
      'Government Claims Act (State)',
      'SacRT light rail crossing',
      'Tule fog low visibility',
      'Six-month agency deadline',
      'Downtown grid crossing',
    ],
    sections: {
      whyItMatters: `Sacramento pedestrian claims carry local features that come from the city\u2019s role as the state capital, its transit system, and Central Valley weather. The capital status matters most in an unexpected way: the density of State of California government vehicles on Sacramento\u2019s streets is far higher than in other cities, so a pedestrian struck by a state vehicle is a genuinely common scenario here. A claim against the State is governed by the Government Claims Act and is presented through the State\u2019s Government Claims Program, and like any public-entity claim it runs on the six-month presentation deadline rather than two years. The City of Sacramento, the County, and Sacramento Regional Transit (SacRT) are public entities too, and SacRT light rail runs at street level through downtown and beyond, so pedestrian collisions with trains or at crossings are a recurring pattern on the same shortened clock. ${CLAIMS_ACT} The weather feature is tule fog. The Central Valley produces dense, ground-level fog in the cooler months that can cut visibility to almost nothing, and it contributes both to multi-vehicle collisions and to pedestrian strikes where a driver genuinely could not see far ahead. Fog does not excuse a driver — the basic speed law requires driving at a speed safe for conditions, so travelling too fast for the visibility is itself negligence — but it does make lighting, speed and the driver\u2019s conduct central to liability, and it makes documenting the conditions important. The downtown grid, with its numbered and lettered streets and steady foot traffic, produces the more ordinary intersection collisions, where the usual California protections apply: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing. Pure comparative negligence means any genuine pedestrian fault reduces rather than bars recovery. Which agency responded depends on location: Sacramento Police on city streets, the California Highway Patrol on the freeways and for many state-facility incidents. Civil cases are filed in Sacramento County Superior Court at the Gordon D. Schaber Downtown Courthouse.`,
      whatToTrack: [
        'Whether the vehicle was a State of California vehicle, and any agency markings',
        'Whether a SacRT light rail vehicle, bus, or city vehicle was involved, and the date',
        'The visibility and weather, especially if tule fog was present',
        'The driver\u2019s apparent speed relative to the conditions',
        'The exact intersection or crossing, and whether the crosswalk was marked',
        'Signal phase and lighting at the location',
        'Which agency responded: Sacramento Police, CHP, or another',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the Sacramento-specific forks that most affect a pedestrian claim: a State of California vehicle, which routes the claim through the State\u2019s Government Claims Program on a six-month clock, and tule-fog conditions, where the driver\u2019s speed for the visibility becomes central. It also catches SacRT and city involvement and documents the conditions before they are disputed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A state government vehicle hit me. How do I claim?',
        a: 'Through the Government Claims Act, presenting a written claim to the State via its Government Claims Program, generally within six months of the collision. Because Sacramento is the state capital, state vehicles are unusually common here, and this shortened deadline applies rather than the ordinary two years. Getting the claim to the right program on time is essential.',
      },
      {
        q: 'It was foggy when I was hit. Does that mean no one is at fault?',
        a: 'No. Tule fog reduces visibility, but California\u2019s basic speed law requires driving at a speed safe for the conditions, so a driver going too fast for the fog is negligent regardless of how hard it was to see. Fog makes the driver\u2019s speed, the lighting and your visibility central to the claim, which is why documenting the conditions matters.',
      },
      {
        q: 'A SacRT light rail train was involved. What deadline applies?',
        a: 'Six months to present a written claim, because SacRT is a public entity under the Government Claims Act. Light rail runs at street level through downtown Sacramento, so pedestrian and crossing collisions with it are handled on the shortened government timeline, with 45 days for the agency to respond.',
      },
      {
        q: 'I crossed away from a painted crosswalk. Is my claim over?',
        a: 'No. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction. Insurers still argue pedestrian fault, but under pure comparative negligence any genuine share only reduces recovery rather than ending it.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, coverage questions and deadlines — including whether a claim against the State or another public entity applies — so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_PEDESTRIAN_SLUG,
    category: 'Cities',
    cluster: 'Oakland Pedestrian Accident Claims',
    title: 'Oakland Pedestrian Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'More Oakland pedestrian claims than most run against a public agency — AC Transit, BART, or the City for a road defect — and all of them carry a six-month deadline instead of two years.',
    psychology: 'I was hit while walking in Oakland and a bus, a BART vehicle, or the road itself was involved.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland pedestrian accident claim',
      'hit by an ac transit bus claim',
      'claim against city of oakland road defect',
      'pedestrian hit on international boulevard oakland',
      'pedestrian right of way california crosswalk',
    ],
    signals: [
      'AC Transit or BART vehicle',
      'City road defect',
      'High Injury Network arterial',
      'Six-month agency deadline',
      'Unmarked crosswalk at an intersection',
      'Poor lighting',
    ],
    sections: {
      whyItMatters: `Oakland pedestrian claims involve a public entity more often than in most California cities, and that single feature reshapes the deadline. AC Transit operates buses densely across the city, BART runs through it, and the City of Oakland\u2019s vehicles are on every street — all public entities under the Government Claims Act, which means a collision involving one of them carries a six-month presentation deadline rather than two years. ${CLAIMS_ACT} The second local feature is the condition of the streets themselves. Oakland has a long-documented pavement maintenance backlog, and where a pedestrian is hurt because of a dangerous condition of a public street — a failed surface, a missing or malfunctioning signal, obscured or absent signage, inadequate lighting at a crossing — the claim is a dangerous-condition claim against the entity that owns and maintains that road, on the same six-month clock. Those claims also require proof that the entity knew or should have known about the condition, which makes photographing it immediately a priority, because repairs follow complaints and the evidence often disappears within weeks. The third feature is where the collisions concentrate. Oakland\u2019s pedestrian injuries cluster on major arterials such as International Boulevard, wide fast streets where liability turns on signal timing, lighting, crossing distance and sight lines rather than on either account. Those are documentable physical facts, and capturing them early is frequently the difference between a contested claim and a clear one. California\u2019s pedestrian protections apply throughout: a crosswalk exists at intersections even when unmarked (Vehicle Code sections 275 and 21950), and the 2023 Freedom to Walk Act removed the infraction for safe mid-block crossing, so the fault an insurer assigns is often overstated. Pure comparative negligence reduces rather than bars recovery. Jurisdiction determines who wrote the report: the California Highway Patrol on the freeways, Oakland Police on city streets, and BART Police on their own property. Civil cases are filed in Alameda County Superior Court at the René C. Davidson Courthouse.`,
      whatToTrack: [
        'Whether an AC Transit, BART, or City of Oakland vehicle was involved, and the date',
        'For a road defect, photographs of the condition taken immediately, with scale',
        'The precise location, since responsibility depends on which entity owns the road',
        'Any prior complaints about the condition, which speak to notice',
        'The exact intersection or block, and whether it is a High Injury arterial',
        'Signal phase, lighting, and crossing distance',
        'Which agency responded: CHP, Oakland Police, or BART Police',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ checks first for a public entity, which in Oakland is a live question more often than elsewhere because AC Transit, BART, City vehicles and road conditions are all common causes, and each cuts the deadline to six months. For roadway claims it prompts for the photographs and notice evidence that stop being available once a defect is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An AC Transit bus or BART vehicle hit me. How long do I have?',
        a: 'Six months from the collision to present a written claim, because both are public entities under the Government Claims Act, rather than the two years that applies to a private driver. The agency then has 45 days to respond, and your deadline to sue depends on whether it rejects the claim in writing.',
      },
      {
        q: 'A road defect or bad lighting caused my crossing to be dangerous. Can I claim?',
        a: 'Possibly, through a dangerous-condition claim against the public entity that owns and maintains that street. Two cautions: the six-month government deadline applies, and you generally must show the entity knew or should have known about the condition. Photograph the defect or the crossing immediately and note the exact location, because repairs follow complaints and the evidence disappears with them.',
      },
      {
        q: 'I was hit on International Boulevard. Why does the intersection matter so much?',
        a: 'Because on Oakland\u2019s wide arterials liability rests on physical facts — signal timing, lighting, crossing distance and sight lines — that can be documented, rather than on competing accounts. A driver who says they \u201cnever saw\u201d you is often describing a failure to keep a proper lookout, and the scene conditions are what establish it.',
      },
      {
        q: 'I crossed where there was no marked crosswalk. Am I at fault?',
        a: 'Not necessarily. A crosswalk exists at most intersections even without paint, drivers must yield to pedestrians in it, and since 2023 safe mid-block crossing is not an infraction under the Freedom to Walk Act. Insurers still argue pedestrian fault, but pure comparative negligence reduces recovery by your share rather than barring it.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, coverage questions and deadlines — particularly whether a shortened government deadline applies — so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_BICYCLE_SLUG,
    category: 'Cities',
    cluster: 'San Jose Bicycle Accident Claims',
    title: 'San Jose Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Jose cyclists face high-speed county expressways, VTA light rail tracks that can trap a wheel, and a Silicon Valley health-plan lien that can take a large share of any recovery.',
    psychology: 'I crashed my bike in San Jose, maybe on an expressway or in the light rail tracks, and I do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose bicycle accident claim',
      'cyclist hit on a santa clara county expressway',
      'bike tire stuck in vta light rail tracks',
      'three foot passing law california bike',
      'doored while cycling san jose',
    ],
    signals: [
      'County expressway collision',
      'VTA track wheel-trap fall',
      'Dangerous condition / VTA',
      'Three-foot passing violation',
      'Self-funded health plan lien',
      'Dooring',
    ],
    sections: {
      whyItMatters: `San Jose bicycle claims combine a hostile road network with a distinctive rail hazard and a Silicon Valley lien problem. The road network is the county expressway system — Lawrence, Central, San Tomas, Montague, Capitol — high-speed arterials that carry heavy traffic at freeway-like speeds while cyclists use bike lanes or shoulders alongside. A collision there tends to be severe, and liability turns on the driver\u2019s passing distance, the cyclist\u2019s lane position and right of way, governed by California\u2019s three-foot passing law (Vehicle Code section 21760) and the rule giving cyclists the rights and duties of drivers (section 21200). The distinctive hazard is VTA light rail. Where light rail runs at street level, a bike tire dropping into the flangeway of an embedded track at the wrong angle can throw a rider with no other vehicle involved, and where the design or maintenance of that public track is at issue, the claim is a dangerous-condition claim against the transit agency. Because VTA and the City of San Jose are public entities, that claim — and any collision involving their vehicles or a dangerous roadway condition — runs on the Government Claims Act\u2019s six-month presentation deadline, and it needs prompt photographs of the track, location and angle, evidence that disappears quickly. ${CLAIMS_ACT} Dooring is the third pattern, common on denser streets with parallel parking, and California Vehicle Code section 22517 prohibits opening a car door into traffic when unsafe, so fault generally rests with the person who opened it. The Silicon Valley lien problem applies to cyclists as to pedestrians: many injured riders here have self-funded, federally governed health plans whose reimbursement rights are strong and hard to reduce, so the net recovery can be far less than the settlement unless the lien is identified early. Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it as to head injuries; and pure comparative negligence means any genuine share reduces rather than bars recovery. Civil cases are filed in Santa Clara County Superior Court at the Downtown Superior Court.`,
      whatToTrack: [
        'Whether the collision was on a county expressway, and where',
        'For a passing collision, the clearance the driver left and your lane position',
        'Whether the fall involved VTA light rail tracks, and exactly where',
        'Photographs of the track, flangeway, and your line of travel, taken promptly',
        'Whether a car door was opened into your path, and by whom',
        'Whether your health plan is self-funded or fully insured, for the lien',
        'Whether a VTA or city vehicle or roadway condition was involved, and the date',
        'Every provider and the running cost of care',
      ],
      howClearCaseHelps: `ClearCaseIQ recognises the San Jose track-fall claim as a dangerous-condition claim against a public entity on a six-month clock, needing photographs that vanish fast, and applies the three-foot passing and dooring rules to car collisions. It flags whether a self-funded health plan will take a large share of any recovery so the net figure is clear from the start. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My bike tire caught in the VTA light rail tracks and I fell. Do I have a claim?',
        a: 'Possibly, as a dangerous-condition claim against the transit agency where the design or maintenance of the embedded track is at issue. Because VTA and the City are public entities, it runs on the six-month Government Claims Act deadline and needs prompt photographs of the track, location and angle, which is evidence that disappears quickly.',
      },
      {
        q: 'I was hit on a county expressway. What does the law require of the driver?',
        a: 'At least three feet of clearance when passing (Vehicle Code section 21760), and cyclists have the rights and duties of drivers (section 21200). On high-speed expressways the injuries tend to be serious and liability turns on the passing distance, lane position and right of way rather than on any assumption a cyclist should not have been there.',
      },
      {
        q: 'Someone opened a car door into me. Whose fault is that?',
        a: 'Generally the person who opened the door. California Vehicle Code section 22517 prohibits opening a car door into traffic when it is unsafe, so dooring liability usually rests with the occupant, not the cyclist. The position of the door and your line of travel are the facts that establish it.',
      },
      {
        q: 'Why might my health insurer take part of my recovery?',
        a: 'Most plans have a reimbursement provision, and in Silicon Valley many are self-funded and federally governed, which makes their recovery rights strong and hard to reduce. That can leave much less than the settlement suggests unless the lien is quantified at the start rather than at distribution.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the roadway or coverage questions, the lien, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_BICYCLE_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Bicycle Accident Claims',
    title: 'Sacramento Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sacramento cyclists deal with the American River bike trail and its crossings, SacRT light rail tracks, an unusual density of state vehicles, and Central Valley fog — each of which shapes a claim differently.',
    psychology: 'I crashed my bike in Sacramento, maybe at a trail crossing, in the light rail tracks, or in fog.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento bicycle accident claim',
      'american river bike trail crossing accident',
      'bike tire stuck in sacrt light rail tracks',
      'three foot passing law california bicycle',
      'hit by a state vehicle while cycling sacramento',
    ],
    signals: [
      'Trail crossing collision',
      'SacRT track wheel-trap fall',
      'State of California vehicle',
      'Tule fog low visibility',
      'Three-foot passing violation',
      'Six-month agency deadline',
    ],
    sections: {
      whyItMatters: `Sacramento bicycle claims are shaped by the region\u2019s exceptional cycling infrastructure, its transit and state fleets, and Central Valley weather. The infrastructure centre of gravity is the American River bike trail (the Jedediah Smith Memorial Trail), one of the longest paved cycling paths in the country, which carries heavy bicycle traffic and crosses or parallels roadways at numerous points. Many serious local bike collisions happen where the trail meets a street, where liability turns on right of way, signage, sight lines and signal timing at the crossing. The transit feature is SacRT light rail, which runs at street level; as in other rail cities, a bike tire caught in the flangeway of an embedded track can throw a rider with no other vehicle involved, and where the track\u2019s design or maintenance is at issue the claim is a dangerous-condition claim against the agency. Because SacRT, the City of Sacramento, and the County are public entities — and because, as the state capital, State of California vehicles are unusually common on the roads — a collision involving any of them runs on the Government Claims Act\u2019s six-month presentation deadline (with a State claim presented through the State\u2019s Government Claims Program). ${CLAIMS_ACT} The weather feature is tule fog: dense Valley fog in the cooler months that reduces visibility and makes a driver\u2019s speed for the conditions central, since the basic speed law requires driving safely for the visibility regardless of how poor it is. Ordinary car-versus-bike collisions are governed by the three-foot passing law (Vehicle Code section 21760), the dooring prohibition (section 22517), and the rule giving cyclists the rights and duties of drivers (section 21200). Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it for head injuries; and pure comparative negligence reduces rather than bars recovery. Civil cases are filed in Sacramento County Superior Court at the Gordon D. Schaber Downtown Courthouse.`,
      whatToTrack: [
        'Whether the collision was at an American River trail crossing, and where',
        'Right of way, signage, and sight lines at the crossing',
        'Whether the fall involved SacRT light rail tracks, and exactly where',
        'Photographs of the track or crossing, taken promptly',
        'Whether a State of California, SacRT, or city vehicle was involved, and the date',
        'The visibility and whether tule fog was present',
        'For a passing collision, the clearance the driver left and your lane position',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ treats a Sacramento trail-crossing or light-rail-track fall as the claim it is — often against a public entity on a six-month clock — and flags a State of California vehicle, which routes the claim through the State\u2019s Government Claims Program. It applies the three-foot passing and dooring rules to car collisions and documents fog conditions where the driver\u2019s speed is central. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hit where the American River trail crosses a street. Who is at fault?',
        a: 'It depends on the right of way, signage and signal timing at that crossing, which are documentable facts rather than matters of recollection. Trail-crossing collisions are a common Sacramento pattern, and capturing the crossing conditions early is what usually establishes fault. If a dangerous condition of the crossing itself contributed, a public entity may be responsible on the six-month deadline.',
      },
      {
        q: 'My bike tire caught in the SacRT tracks and I fell. Do I have a claim?',
        a: 'Possibly, as a dangerous-condition claim against the transit agency where the design or maintenance of the embedded track is at issue. Because SacRT is a public entity, it runs on the six-month Government Claims Act deadline and needs prompt photographs of the track, location and angle before that evidence disappears.',
      },
      {
        q: 'A state vehicle hit me while I was cycling. How do I claim?',
        a: 'Through the Government Claims Act, presenting a written claim to the State via its Government Claims Program, generally within six months. Because Sacramento is the state capital, state vehicles are unusually common, and this shortened deadline applies rather than the ordinary two years.',
      },
      {
        q: 'A car passed too close in the fog. Does the fog excuse the driver?',
        a: 'No. The three-foot passing law still requires at least three feet of clearance, and the basic speed law requires driving at a speed safe for the conditions, so passing too close or too fast in fog is negligent regardless of the visibility. The conditions make the driver\u2019s speed and clearance central to the claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the roadway or coverage questions, and the deadlines — including whether a claim against the State or another public entity applies — so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_BICYCLE_SLUG,
    category: 'Cities',
    cluster: 'Oakland Bicycle Accident Claims',
    title: 'Oakland Bicycle Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Oakland\u2019s documented pavement backlog turns potholes and failed surfaces into dangerous-condition claims for cyclists, while AC Transit, BART, and the I-880 corridor add public entities and heavy trucks to the mix.',
    psychology: 'I crashed my bike in Oakland, maybe on a bad road surface or near a bus, and I do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland bicycle accident claim',
      'cyclist crashed on a pothole oakland claim',
      'cyclist hit by ac transit bus',
      'doored while cycling oakland',
      'three foot passing law california bike',
    ],
    signals: [
      'Pavement defect fall',
      'City road-maintenance backlog',
      'AC Transit or BART vehicle',
      'Dangerous condition claim',
      'Three-foot passing violation',
      'Six-month agency deadline',
    ],
    sections: {
      whyItMatters: `Oakland bicycle claims turn on a local fact that helps cyclists more than most realise: the City\u2019s pavement maintenance backlog. Where a rider is thrown by a pothole, a failed road surface, an unrepaired defect or a dangerous grate, and the condition is on a public street, the claim can be a dangerous-condition claim against the entity that owns and maintains that road, not merely a solo accident with no one to look to. Because the City of Oakland, AC Transit and BART are public entities, that claim — and any collision involving their vehicles — runs on the Government Claims Act\u2019s six-month presentation deadline. These roadway claims also require proof that the entity knew or should have known about the condition, so photographing the defect immediately, with something for scale and a note of the exact location, is the single most valuable step, because repairs follow complaints and the evidence is frequently gone within weeks. ${CLAIMS_ACT} AC Transit buses and BART add the ordinary public-entity collision, again on the six-month clock, and Oakland\u2019s cycling routes on streets like Telegraph and Broadway produce the familiar car-versus-bike patterns governed by the three-foot passing law (Vehicle Code section 21760), the dooring prohibition (section 22517), and the rule giving cyclists the rights and duties of drivers (section 21200). The I-880 corridor brings heavy port-drayage trucks into the eastern parts of the city, and a cyclist struck by a commercial truck faces the layered coverage and short-retention federal records that make those claims their own category. Two practical notes: adult cyclists are not required to wear helmets in California, so their absence is not fault, though an insurer may raise it for head injuries; and pure comparative negligence reduces rather than bars recovery. Jurisdiction decides who wrote the report: CHP on the freeways, Oakland Police on city streets, BART Police on their property. Civil cases are filed in Alameda County Superior Court at the René C. Davidson Courthouse.`,
      whatToTrack: [
        'Whether the fall was caused by a pothole, failed surface, grate, or other defect',
        'Photographs of the defect immediately, with scale and the exact location',
        'Any prior complaints about the condition, which speak to notice',
        'Whether an AC Transit, BART, or City of Oakland vehicle was involved, and the date',
        'For a passing collision, the clearance the driver left and your lane position',
        'Whether a car door was opened into your path, and by whom',
        'Whether a commercial truck on the I-880 corridor was involved',
        'Every provider from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ recognises the Oakland surface-defect fall as a potential dangerous-condition claim against the City rather than a no-fault accident, and prompts for the photographs and notice evidence that vanish once a defect is repaired. It catches the six-month clock when AC Transit or BART is involved and applies the three-foot passing and dooring rules to car collisions. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I crashed my bike on a pothole in Oakland. Do I have a claim?',
        a: 'Possibly, as a dangerous-condition claim against the City that owns and maintains the road, given Oakland\u2019s documented pavement backlog. Two cautions: the six-month government deadline applies, and you generally must show the entity knew or should have known about the condition. Photograph the defect immediately with scale and note the exact location, because repairs follow complaints and the evidence disappears with them.',
      },
      {
        q: 'An AC Transit bus or BART vehicle hit me. How long do I have?',
        a: 'Six months from the collision to present a written claim, because both are public entities under the Government Claims Act, rather than the two years for a private driver. The agency then has 45 days to respond, and your deadline to sue depends on whether it rejects the claim in writing.',
      },
      {
        q: 'A car passed too close and hit me. What does California require?',
        a: 'At least three feet of clearance when passing a cyclist (Vehicle Code section 21760). Cyclists also have the rights and duties of drivers (section 21200), so liability turns on the passing distance, lane position and right of way rather than on any assumption a cyclist should not have been in the lane.',
      },
      {
        q: 'I was doored on a street with parked cars. Whose fault is that?',
        a: 'Generally the person who opened the door. Vehicle Code section 22517 prohibits opening a car door into traffic when it is unsafe, so fault in a door-zone collision usually rests with the occupant rather than the cyclist. The position of the door and your line of travel establish it.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the roadway or coverage questions, and the deadlines — including the six-month clock for a road-defect or public-entity claim — so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const localPracticeGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian was struck crossing a county expressway with long gaps between signals, and the driver argued she should not have been there. The crossing distance, signal phase, and lighting told the real story — and a self-funded health plan\u2019s lien, spotted early, kept the net recovery from collapsing. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the expressway, crossing distance, signal phase, and lighting.'],
      ['First week', 'Report obtained; any VTA or city involvement assessed for the six-month clock.'],
      ['First month', 'Health plan identified as self-funded or fully insured; lien quantified.'],
      ['Longer term', 'Wage loss proved with records; comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to yield.'],
      ['Expressway', 'A high-speed county-road crossing with serious injury.'],
      ['Agency', 'A VTA or city vehicle or roadway condition, six-month clock running.'],
      ['Lien-heavy', 'A self-funded plan with strong reimbursement rights.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records tie the injuries to the impact.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and the growing lien tracked together.' },
    ],
    settlementDrivers: [
      'The expressway crossing conditions and signal phase',
      'Whether a public entity was involved',
      'Whether the health plan is self-funded',
      'The total the plan has paid, for the lien',
      'Documented wage loss',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Expressways are severe', copy: 'High-speed county roads produce serious pedestrian injuries.' },
      { label: 'Agency deadline', copy: 'VTA or a county-road condition cuts presentation to six months.' },
      { label: 'Net versus gross', copy: 'A self-funded plan can take a large, hard-to-reduce share.' },
      { label: 'Prove earnings', copy: 'High wage loss needs records, not assertion.' },
    ],
    insuranceProblems: [
      'The pedestrian is blamed for crossing a wide expressway.',
      'A government claim is rejected as untimely at six months.',
      'A self-funded lien is quantified only at settlement.',
      'Wage loss is disputed for want of records.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the crossing on a county expressway, and where?' },
      { label: 'Step 2', question: 'Was a VTA or city vehicle involved?' },
      { label: 'Step 3', question: 'Is your health plan self-funded or fully insured?' },
      { label: 'Step 4', question: 'What wage loss can you document?' },
    ],
  },
  [SAC_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian was struck by a state vehicle downtown and nearly filed an ordinary claim on the two-year assumption. The collision fell under the Government Claims Act against the State, presented through its claims program on a six-month clock — a deadline identified just in time. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the vehicle was state, transit, or private, and the weather.'],
      ['First week', 'Report obtained; public-entity involvement and any fog conditions assessed.'],
      ['Six months', 'Deadline to present a written claim to the State, SacRT, or the City.'],
      ['Longer term', 'Conditions and treatment documented for a comparative-fault fight.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to yield.'],
      ['Agency', 'A SacRT or city vehicle involved, six-month clock running.'],
      ['State', 'A State of California vehicle, claim through the State program.'],
      ['Low visibility', 'A tule-fog collision where the driver\u2019s speed is central.'],
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
      'The visibility and the driver\u2019s speed for the conditions',
      'Signal phase, lighting, and crossing markings',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'State vehicles are common', copy: 'The capital has an unusual density of them.' },
      { label: 'Six-month clock', copy: 'A State or transit claim runs on the short deadline.' },
      { label: 'Fog is no excuse', copy: 'The basic speed law requires driving safely for the visibility.' },
      { label: 'Pedestrian protections', copy: 'Unmarked crosswalks and Freedom to Walk limit fault.' },
    ],
    insuranceProblems: [
      'A state-vehicle claim is filed on the wrong process or deadline.',
      'A government claim is rejected as untimely at six months.',
      'Fog is treated as excusing the driver.',
      'The pedestrian is blamed for a lawful crossing.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the vehicle a State of California vehicle?' },
      { label: 'Step 2', question: 'Was a SacRT or city vehicle involved?' },
      { label: 'Step 3', question: 'What were the visibility and weather conditions?' },
      { label: 'Step 4', question: 'What were the signal phase and lighting at the crossing?' },
    ],
  },
  [OAK_PEDESTRIAN_SLUG]: {
    scenario: `A pedestrian was hurt at a poorly lit International Boulevard crossing where the signal was malfunctioning. Because the City is a public entity and the condition was central, the claim ran on the six-month clock and needed the crossing photographed before it was repaired. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the crossing, lighting, and any defect; note agency vehicles.'],
      ['First week', 'Report obtained from the correct agency; public-entity involvement assessed.'],
      ['Six months', 'Absolute deadline to present a written claim to any public entity.'],
      ['Longer term', 'Notice evidence and prior complaints assembled for a roadway claim.'],
    ],
    severityLadder: [
      ['Straightforward', 'A private, insured driver who clearly failed to yield.'],
      ['Agency', 'An AC Transit, BART, or city vehicle involved, six-month clock running.'],
      ['Roadway', 'A dangerous-condition claim requiring proof of notice.'],
      ['Serious', 'A high-speed arterial impact with catastrophic injury.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public entity is involved and the six-month claim was presented',
      'Photographs of any roadway or lighting defect before repair',
      'Evidence the entity knew or should have known of the condition',
      'Signal timing, lighting, and crossing distance',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Six-month rule applies often', copy: 'Oakland claims involve a public entity more than most cities.' },
      { label: 'Repairs destroy proof', copy: 'A reported defect is often fixed within weeks.' },
      { label: 'Notice requirement', copy: 'Roadway claims need proof the entity knew or should have.' },
      { label: 'Physical facts decide it', copy: 'Lighting and signal timing over either account.' },
    ],
    insuranceProblems: [
      'A government claim is rejected as untimely at six months.',
      'The entity denies notice of a since-repaired condition.',
      'The pedestrian is blamed without reference to lighting or signal timing.',
      'Responsibility is disputed among city, county, and state.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was an AC Transit, BART, or City of Oakland vehicle involved?' },
      { label: 'Step 2', question: 'Did a road or lighting condition contribute, and was it photographed?' },
      { label: 'Step 3', question: 'Exactly where did it happen, so the responsible entity is clear?' },
      { label: 'Step 4', question: 'What were the signal and lighting conditions?' },
    ],
  },
  [SJ_BICYCLE_SLUG]: {
    scenario: `A cyclist\u2019s wheel dropped into a VTA track flangeway downtown and threw him, with no car involved. Photographed that day, the track angle supported a dangerous-condition claim against the agency on a six-month clock — and his self-funded plan\u2019s lien was addressed before it ate the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the track or the passing position before anything changes.'],
      ['First week', 'Report obtained; public-entity involvement assessed for a track or roadway claim.'],
      ['First month', 'Health plan identified; lien quantified.'],
      ['Six months', 'Deadline to present a written claim to VTA or the City.'],
    ],
    severityLadder: [
      ['Straightforward', 'A car-versus-bike collision with clear driver fault.'],
      ['Expressway', 'A high-speed county-road collision with serious injury.'],
      ['Track fall', 'A single-vehicle fall implicating public track infrastructure.'],
      ['Lien-heavy', 'A self-funded plan with strong reimbursement rights.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the fall or collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and the growing lien tracked together.' },
    ],
    settlementDrivers: [
      'Whether the fall involved public track infrastructure',
      'Whether the track was photographed promptly',
      'The passing distance in a car collision',
      'Whether the health plan is self-funded',
      'Whether the six-month claim was presented in time',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Track falls are claims', copy: 'A dangerous-condition claim against the agency, not a solo accident.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs passing distance in car collisions.' },
      { label: 'Net versus gross', copy: 'A self-funded plan can take a large, hard-to-reduce share.' },
      { label: 'Helmet is bounded', copy: 'Not required for adults; relevant only to head injuries.' },
    ],
    insuranceProblems: [
      'A track fall is treated as a no-fault solo accident.',
      'The photographs that prove the track condition are never taken.',
      'A self-funded lien is quantified only at settlement.',
      'A government claim is rejected as untimely at six months.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did your wheel catch in VTA light rail tracks, and where?' },
      { label: 'Step 2', question: 'Do you have photographs of the track and your line of travel?' },
      { label: 'Step 3', question: 'For a car collision, how much room did the driver leave?' },
      { label: 'Step 4', question: 'Is your health plan self-funded or fully insured?' },
    ],
  },
  [SAC_BICYCLE_SLUG]: {
    scenario: `A cyclist was hit where the American River trail crosses a street, and the driver claimed the rider "came out of nowhere." The crossing signage and sight lines, documented early, established the right of way — and a SacRT track hazard nearby raised its own separate question. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the crossing, signage, sight lines, or any track involved.'],
      ['First week', 'Report obtained; public-entity or State involvement assessed.'],
      ['Six months', 'Deadline to present a written claim to the State, SacRT, or the City.'],
      ['Longer term', 'Conditions and treatment documented for the fault fight.'],
    ],
    severityLadder: [
      ['Straightforward', 'A car-versus-bike collision with clear driver fault.'],
      ['Trail crossing', 'A collision where the trail meets a street; right of way central.'],
      ['Track fall', 'A single-vehicle fall implicating SacRT track infrastructure.'],
      ['State/agency', 'A State or transit vehicle involved, six-month clock running.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the fall or collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The right of way and signage at a trail crossing',
      'Whether the fall involved SacRT track infrastructure',
      'Whether a State or transit vehicle was involved',
      'The passing distance and visibility in a car collision',
      'Whether the six-month claim was presented in time',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Crossings decide fault', copy: 'Right of way and signage over either account.' },
      { label: 'Track falls are claims', copy: 'A dangerous-condition claim against the agency.' },
      { label: 'State vehicles common', copy: 'The capital routes many claims through the State program.' },
      { label: 'Fog is no excuse', copy: 'The basic speed law governs passing and speed in poor visibility.' },
    ],
    insuranceProblems: [
      'The cyclist is blamed at a trail crossing without the signage examined.',
      'A track fall is treated as a no-fault solo accident.',
      'A state-vehicle claim is filed on the wrong process or deadline.',
      'Fog is treated as excusing the driver.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did it happen where the trail crosses a street, and where?' },
      { label: 'Step 2', question: 'Did your wheel catch in SacRT tracks?' },
      { label: 'Step 3', question: 'Was a State or transit vehicle involved?' },
      { label: 'Step 4', question: 'For a car collision, how much room did the driver leave?' },
    ],
  },
  [OAK_BICYCLE_SLUG]: {
    scenario: `A cyclist was thrown by a large pothole on an Oakland arterial with no other vehicle involved. Because the City had a documented maintenance backlog and prior complaints existed, a photograph taken that day turned a "solo accident" into a dangerous-condition claim — on a six-month clock. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the defect with scale and the exact location before repair.'],
      ['First week', 'Report obtained; public-entity involvement assessed.'],
      ['First month', 'Prior complaints and notice evidence gathered for a roadway claim.'],
      ['Six months', 'Deadline to present a written claim to the City or transit agency.'],
    ],
    severityLadder: [
      ['Straightforward', 'A car-versus-bike collision with clear driver fault.'],
      ['Surface defect', 'A pothole or failed surface fall implicating the City.'],
      ['Agency', 'An AC Transit or BART vehicle involved, six-month clock running.'],
      ['Commercial', 'A port-drayage truck on the I-880 corridor, layered coverage.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER records connect the injuries to the fall or collision.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a surface defect caused the fall',
      'Whether the defect was photographed before repair',
      'Evidence the City knew or should have known of the condition',
      'The passing distance in a car collision',
      'Whether a public entity or commercial truck was involved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Defect falls are claims', copy: 'The pavement backlog supports dangerous-condition claims.' },
      { label: 'Repairs destroy proof', copy: 'A reported defect is often fixed within weeks.' },
      { label: 'Notice requirement', copy: 'Roadway claims need proof the City knew or should have.' },
      { label: 'Three-foot rule', copy: 'Section 21760 governs passing distance in car collisions.' },
    ],
    insuranceProblems: [
      'A surface-defect fall is treated as a no-fault solo accident.',
      'The photographs that prove the defect are never taken.',
      'The City denies notice of a since-repaired condition.',
      'A government claim is rejected as untimely at six months.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did a pothole or failed surface cause the fall, and where?' },
      { label: 'Step 2', question: 'Do you have a photograph of the defect with scale?' },
      { label: 'Step 3', question: 'Was an AC Transit, BART, or city vehicle involved?' },
      { label: 'Step 4', question: 'For a car collision, how much room did the driver leave?' },
    ],
  },
}
