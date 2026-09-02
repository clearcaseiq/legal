import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, slip-and-fall (premises liability) practice area (batch 2):
 * city-specific guides for San Jose, Fresno, Long Beach, and Oakland, extending
 * the batch-1 hub (Los Angeles, San Francisco, San Diego, Sacramento).
 *
 * Genuinely local context rather than interpolated copy:
 *  - San Jose: Silicon Valley\u2019s big-box retail, grocery, and corporate campuses,
 *    plus Santa Clara County public buildings and VTA transit, where a
 *    dangerous-condition claim on the six-month deadline can apply.
 *  - Fresno: heavy big-box and grocery volume, aging strip retail, and a large
 *    concentration of county and municipal buildings.
 *  - Long Beach: a port city of hotels, convention space, and retail that runs
 *    its own public works, so an adjacent-owner or city sidewalk question and the
 *    six-month deadline recur.
 *  - Oakland: aging commercial buildings, retail, and BART/AC Transit stations,
 *    where transit-agency and city public-property claims are common.
 *
 * California premises-liability law, applied accurately (identical to batch 1):
 *  - An owner or occupier owes a duty of reasonable care; recovery generally
 *    requires proving a dangerous condition and that the owner created it, knew of
 *    it, or should have known of it in time to fix it (the notice requirement).
 *  - On public property, a dangerous-condition claim under Government Code
 *    section 835 applies, and the six-month Government Claims Act deadline
 *    replaces the ordinary two years.
 *  - Pure comparative negligence, and the two-year personal-injury deadline
 *    (Code of Civil Procedure section 335.1).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether the notice requirement is met, whether a public entity or the six-month deadline applies, and how comparative fault is assessed depend on facts a licensed California attorney should review promptly.'

const PREMISES =
  'A property owner or occupier in California owes a duty of reasonable care to keep the premises reasonably safe. To recover for a slip- or trip-and-fall you generally must show a dangerous condition existed and that the owner created it, knew about it, or should have known about it in time to fix it \u2014 the \u201cnotice\u201d requirement. That is why documenting the hazard immediately, before it is cleaned up or repaired, is often the difference between a provable claim and a deniable one.'

const EVIDENCE =
  'The most valuable evidence disappears fast: photograph the hazard and the surrounding area before anything is cleaned, get an incident report from the store or building, note any witnesses, and \u2014 because surveillance footage is often overwritten within days or weeks \u2014 make a prompt written demand that the business preserve its video.'

const PUBLIC =
  'If the fall happened on public property \u2014 a government building, a public sidewalk maintained by a city, a transit station, or a park \u2014 a dangerous-condition-of-public-property claim under Government Code section 835 applies, and the Government Claims Act shortens the deadline to six months to present a written claim, far less than the ordinary two years.'

export const SJ_SLIPFALL_SLUG = '/san-jose-slip-and-fall'
export const FRESNO_SLIPFALL_SLUG = '/fresno-slip-and-fall'
export const LB_SLIPFALL_SLUG = '/long-beach-slip-and-fall'
export const OAK_SLIPFALL_SLUG = '/oakland-slip-and-fall'

export const slipAndFallCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_SLIPFALL_SLUG,
    category: 'Cities',
    cluster: 'San Jose Slip and Fall Claims',
    title: 'San Jose Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Jose slip-and-fall claims usually happen in big-box stores, grocery chains, and corporate campuses, or on county and transit property. Proving the owner knew or should have known about the hazard is the whole game, and the video can vanish in days.',
    psychology: 'I slipped and fell in a store or on public property in San Jose and do not know whether I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose slip and fall claim',
      'slipped in a grocery store california who is liable',
      'premises liability notice requirement california',
      'store surveillance video slip and fall preserve',
      'fell on public property california six month deadline',
    ],
    signals: [
      'Notice requirement',
      'Retail / grocery / big-box',
      'Corporate campus / VTA transit',
      'Surveillance video preservation',
      'Two-year deadline',
      'Public entity (six-month)',
    ],
    sections: {
      whyItMatters: `San Jose slip-and-fall claims cluster in Silicon Valley\u2019s big-box retailers, grocery chains, shopping centres, and corporate campuses, and on Santa Clara County public buildings and VTA transit property. ${PREMISES} Against a large retailer the notice question is the battleground \u2014 how long the spill or hazard sat, and whether staff inspected, cleaned, or warned \u2014 and the store\u2019s own surveillance video and inspection logs are the best proof. ${EVIDENCE} Corporate campuses and their contractors add a wrinkle, because the property owner, the tenant employer, and the janitorial contractor may each bear a share. ${PUBLIC} A fall in a county building or at a VTA light-rail station can therefore carry the shorter six-month deadline, so identifying whether the property is public matters early. Pure comparative negligence applies, so open-and-obvious, footwear, and distraction arguments reduce rather than bar recovery. The ordinary two-year deadline applies otherwise (Code of Civil Procedure section 335.1). Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'Exactly what the hazard was and how long it appears to have been there',
        'Photographs of the hazard before it was cleaned or repaired',
        'The store or building incident report and the manager\u2019s name',
        'A prompt written demand to preserve surveillance video',
        'Whether the property is private, corporate, or a public entity',
        'Any janitorial contractor responsible for the area',
        'Witnesses who saw the hazard or the fall',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ focuses a San Jose fall on the notice question and on preserving surveillance video before it is overwritten, sorts out whether a landlord, tenant employer, or janitorial contractor is responsible, and flags a public-entity six-month deadline for county or VTA property. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I slipped on a spill in a store. Is the store automatically liable?',
        a: 'Not automatically. You generally must show the store created the hazard, knew about it, or should have known about it in time to clean it up \u2014 the notice requirement. Proving how long the spill was there is usually the key, which is why surveillance video and inspection logs matter so much.',
      },
      {
        q: 'I fell at a corporate campus. Who is responsible?',
        a: 'It can be more than one party \u2014 the property owner, the tenant employer, and the janitorial contractor responsible for the area may each bear a share. Identifying the maintenance contract for the location is often key to finding the right defendant and coverage.',
      },
      {
        q: 'I fell at a VTA station or county building. Is the deadline different?',
        a: 'Likely yes. A fall on public property can be a dangerous-condition claim under Government Code section 835, and the Government Claims Act shortens the deadline to six months to present a written claim. Confirming whether the property is public early is important.',
      },
      {
        q: 'The store says the hazard was obvious. Does that end my claim?',
        a: 'No. California uses pure comparative negligence, so even if a hazard was somewhat open and obvious, that reduces your recovery by your share rather than barring the claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_SLIPFALL_SLUG,
    category: 'Cities',
    cluster: 'Fresno Slip and Fall Claims',
    title: 'Fresno Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'Fresno slip-and-fall claims usually happen in big-box stores, grocery chains, and aging strip retail, or on county and city property. Proving the owner knew or should have known about the hazard is the whole game, and the video can vanish in days.',
    psychology: 'I slipped and fell in a store or on public property in Fresno and do not know whether I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno slip and fall claim',
      'slipped in a grocery store california who is liable',
      'premises liability notice requirement california',
      'store surveillance video slip and fall preserve',
      'fell on public property california six month deadline',
    ],
    signals: [
      'Notice requirement',
      'Retail / grocery / big-box',
      'Aging strip retail',
      'Surveillance video preservation',
      'Two-year deadline',
      'Public entity (six-month)',
    ],
    sections: {
      whyItMatters: `Fresno slip-and-fall claims cluster in big-box retailers, grocery chains, and older strip retail, and on Fresno County and City of Fresno public buildings. ${PREMISES} Against a large retailer the notice question decides the case \u2014 how long the hazard sat and whether staff inspected or cleaned \u2014 and the store\u2019s surveillance video and inspection logs are the best proof. ${EVIDENCE} Older strip-mall properties raise a second recurring issue: deferred maintenance such as broken pavement, poor lighting, and worn stairs, where the history of the defect and any prior complaints matter. ${PUBLIC} A fall in a county building, a city facility, or a public sidewalk can carry the six-month deadline, so identifying whether the property is public matters early. Pure comparative negligence applies, so open-and-obvious and footwear arguments reduce rather than bar recovery. The ordinary two-year deadline applies otherwise (Code of Civil Procedure section 335.1). Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'Exactly what the hazard was and how long it appears to have been there',
        'Photographs of the hazard before it was cleaned or repaired',
        'The store or building incident report and the manager\u2019s name',
        'A prompt written demand to preserve surveillance video',
        'For older properties, any history of the defect or prior complaints',
        'Whether the property is private or a public entity',
        'Witnesses who saw the hazard or the fall',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ focuses a Fresno fall on the notice question and video preservation, pursues the maintenance and prior-complaint history for aging strip properties, and flags a public-entity six-month deadline for county or city property. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I slipped on a spill in a store. Is the store automatically liable?',
        a: 'Not automatically. You generally must show the store created the hazard, knew about it, or should have known about it in time to clean it up \u2014 the notice requirement. Surveillance video and inspection logs usually decide how long the hazard was present.',
      },
      {
        q: 'I tripped on broken pavement at an old strip mall. Does that count?',
        a: 'It can. A persistent physical defect like broken pavement, worn stairs, or poor lighting is a classic dangerous condition, and a long-standing defect helps show the owner should have known about it. Photographs with scale and any history of prior complaints are important.',
      },
      {
        q: 'I fell at a county or city building. Is the deadline different?',
        a: 'Likely yes. A fall on public property can be a dangerous-condition claim under Government Code section 835, and the Government Claims Act shortens the deadline to six months to present a written claim.',
      },
      {
        q: 'The store says the hazard was obvious. Does that end my claim?',
        a: 'No. California uses pure comparative negligence, so even a somewhat open-and-obvious hazard reduces your recovery by your share rather than barring the claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_SLIPFALL_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Slip and Fall Claims',
    title: 'Long Beach Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'Long Beach slip-and-fall claims often happen in hotels, convention spaces, and retail, or on city sidewalks and public property. Proving the owner knew or should have known about the hazard is the whole game, and the video can vanish in days.',
    psychology: 'I slipped and fell at a Long Beach hotel, store, or on a sidewalk and do not know whether I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach slip and fall claim',
      'fell in a hotel california claim',
      'premises liability notice requirement california',
      'store surveillance video slip and fall preserve',
      'tripped on a city sidewalk california who is liable',
    ],
    signals: [
      'Notice requirement',
      'Hotel / convention / hospitality',
      'City sidewalk / public property',
      'Surveillance video preservation',
      'Two-year deadline',
      'Public entity (six-month)',
    ],
    sections: {
      whyItMatters: `Long Beach slip-and-fall claims often arise in its hotels, convention centre, waterfront attractions, and retail \u2014 hospitality venues with heavy tourist traffic \u2014 and on the city\u2019s own sidewalks and public property. ${PREMISES} In a hotel or convention venue the notice question turns on inspection and housekeeping routines, and the venue\u2019s surveillance video is the best proof. ${EVIDENCE} Many injured people are visitors who fall and then leave the area, so getting the incident report and photographs before departure is important. ${PUBLIC} Because Long Beach is a charter city that maintains its own public works and runs its own agencies, a sidewalk or public-property fall raises the adjacent-owner-versus-city question and the six-month deadline. Pure comparative negligence applies, so open-and-obvious and distraction arguments reduce rather than bar recovery. The ordinary two-year deadline applies otherwise (Code of Civil Procedure section 335.1). Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Exactly what the hazard was and how long it appears to have been there',
        'Photographs of the hazard before it was cleaned or repaired',
        'The hotel or venue incident report and the manager\u2019s name',
        'A prompt written demand to preserve surveillance video',
        'Whether the fall was on a sidewalk or other public property',
        'Whether you are an out-of-area visitor',
        'Witnesses who saw the hazard or the fall',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ focuses a Long Beach fall on the notice question and video preservation, flags the out-of-area visitor timing problem for hotel and convention falls, and sorts out the adjacent-owner-versus-city question and six-month deadline for a sidewalk or public-property fall. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I fell in a Long Beach hotel while visiting and have gone home. Can I still claim?',
        a: 'Yes. A fall in California is governed by California law regardless of where you live, and you can pursue the claim from out of state. Because gathering the incident report and evidence is harder after you leave, obtain the report and photographs before departure and act promptly on the video.',
      },
      {
        q: 'I tripped on a Long Beach sidewalk. Who is responsible?',
        a: 'It depends. Responsibility for a public sidewalk defect can fall on the adjacent property owner or the city, and a claim against the city is a dangerous-condition claim under Government Code section 835 with a six-month deadline. Identifying the responsible party early is important.',
      },
      {
        q: 'How do I stop the hotel or store from erasing its video?',
        a: 'Make a prompt written demand that the venue preserve the footage for the date, time, and location of your fall, because many systems overwrite video within days or weeks. The video can establish how long the hazard was present.',
      },
      {
        q: 'The venue says the hazard was obvious. Does that end my claim?',
        a: 'No. California uses pure comparative negligence, so even a somewhat open-and-obvious hazard reduces your recovery by your share rather than barring the claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_SLIPFALL_SLUG,
    category: 'Cities',
    cluster: 'Oakland Slip and Fall Claims',
    title: 'Oakland Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'Oakland slip-and-fall claims happen in retail and aging commercial buildings, or on BART and AC Transit property and city sidewalks. Proving the owner knew or should have known about the hazard is the whole game, and the video can vanish in days.',
    psychology: 'I slipped and fell in a store, an old building, or at a transit station in Oakland and do not know whether I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland slip and fall claim',
      'slipped in a grocery store california who is liable',
      'premises liability notice requirement california',
      'fell at a bart station claim california',
      'tripped on a city sidewalk california who is liable',
    ],
    signals: [
      'Notice requirement',
      'Retail / aging commercial',
      'BART / AC Transit property',
      'Surveillance video preservation',
      'Two-year deadline',
      'Public entity (six-month)',
    ],
    sections: {
      whyItMatters: `Oakland slip-and-fall claims arise in its retail and often aging commercial buildings, and on public property including BART and AC Transit stations and city sidewalks. ${PREMISES} Against a retailer the notice question decides the case, and the store\u2019s surveillance video and inspection logs are the best proof. ${EVIDENCE} Oakland\u2019s older building stock raises a recurring physical-defect pattern \u2014 worn stairs, broken tile, poor lighting \u2014 where the defect history matters. ${PUBLIC} A fall at a BART or AC Transit station, or on a city sidewalk, is a dangerous-condition claim against a public entity with the six-month deadline, so identifying the responsible agency early is critical. Pure comparative negligence applies, so open-and-obvious and footwear arguments reduce rather than bar recovery. The ordinary two-year deadline applies otherwise (Code of Civil Procedure section 335.1). Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'Exactly what the hazard was and how long it appears to have been there',
        'Photographs of the hazard before it was cleaned or repaired',
        'The store or building incident report and the manager\u2019s name',
        'A prompt written demand to preserve surveillance video',
        'Whether the fall was at a BART/AC Transit station or on a sidewalk',
        'For older buildings, any history of the defect or prior complaints',
        'Witnesses who saw the hazard or the fall',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ focuses an Oakland fall on the notice question and video preservation, pursues the defect history in aging commercial buildings, and identifies the correct public agency and six-month deadline for a BART, AC Transit, or city-sidewalk fall. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I fell at a BART or AC Transit station. Is the deadline different?',
        a: 'Likely yes. A fall on transit-agency property is a dangerous-condition claim under Government Code section 835, and the Government Claims Act shortens the deadline to six months to present a written claim. Identifying the correct agency early is critical.',
      },
      {
        q: 'I tripped on worn stairs in an old Oakland building. Does that count?',
        a: 'It can. A persistent physical defect like worn stairs, broken tile, or poor lighting is a classic dangerous condition, and a long-standing defect helps show the owner should have known. Photographs with scale and any prior-complaint history are important.',
      },
      {
        q: 'I slipped on a spill in a store. Is the store automatically liable?',
        a: 'Not automatically. You generally must show the store created the hazard, knew about it, or should have known about it in time to clean it up. Surveillance video and inspection logs usually decide how long the hazard was present.',
      },
      {
        q: 'The store says the hazard was obvious. Does that end my claim?',
        a: 'No. California uses pure comparative negligence, so even a somewhat open-and-obvious hazard reduces your recovery by your share rather than barring the claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const slipAndFallCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_SLIPFALL_SLUG]: {
    scenario: `A visitor slipped on a spill on a San Jose corporate campus, and the property owner, the tenant employer, and the janitorial contractor all pointed at each other. The maintenance contract and preserved video sorted out responsibility and the notice timeline. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard; report it; get the incident report and manager.'],
      ['First days', 'Written demand sent to preserve the surveillance video.'],
      ['First weeks', 'The janitorial contract and responsible party identified.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Minor', 'A fall with soft-tissue injury that resolves.'],
      ['Moderate', 'A fracture or injury needing ongoing care.'],
      ['Serious', 'Surgery, a head injury, or lasting impairment.'],
      ['Disputed notice', 'The owner claims no knowledge of the hazard.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER or urgent-care records tie injuries to the fall.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the notice requirement can be proved',
      'Whether the surveillance video was preserved',
      'Which party \u2014 owner, employer, or contractor \u2014 is responsible',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
      'Whether a public entity and six-month deadline apply',
    ],
    settlementValueDetails: [
      { label: 'Notice is the battle', copy: 'How long the hazard sat usually decides liability.' },
      { label: 'Video is decisive', copy: 'It proves the timeline \u2014 if preserved in time.' },
      { label: 'Find the contractor', copy: 'Janitorial contracts often locate responsibility.' },
      { label: 'Watch the deadline', copy: 'Public property can shorten it to six months.' },
    ],
    insuranceProblems: [
      'The owner, employer, and contractor all deny responsibility.',
      'The video is overwritten before a demand is sent.',
      'A public-entity six-month deadline is missed.',
      'The visitor is blamed as not watching where they walked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the hazard and how long had it been there?' },
      { label: 'Step 2', question: 'Was it a store, campus, or public property?' },
      { label: 'Step 3', question: 'Has a demand been sent to preserve the video?' },
      { label: 'Step 4', question: 'Were there witnesses?' },
    ],
  },
  [FRESNO_SLIPFALL_SLUG]: {
    scenario: `A shopper tripped on broken pavement at an aging Fresno strip mall, and the owner claimed it was obvious. Photographs with scale and a history of prior complaints showed a long-standing defect the owner should have fixed. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the defect with scale; report it; get the incident report.'],
      ['First days', 'Written demand sent to preserve any surveillance video.'],
      ['First weeks', 'Defect history and any prior complaints gathered.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Minor', 'A fall with soft-tissue injury that resolves.'],
      ['Moderate', 'A fracture or injury needing ongoing care.'],
      ['Serious', 'Surgery, a head injury, or lasting impairment.'],
      ['Disputed notice', 'The owner claims no knowledge of the defect.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER or urgent-care records tie injuries to the fall.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the notice requirement can be proved',
      'How long the defect had existed',
      'Whether prior complaints exist',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
      'Whether a public entity and six-month deadline apply',
    ],
    settlementValueDetails: [
      { label: 'Notice is the battle', copy: 'A long-standing defect shows the owner should have known.' },
      { label: 'Photograph with scale', copy: 'A defect\u2019s size and permanence matter.' },
      { label: 'Prior complaints help', copy: 'They establish knowledge of the hazard.' },
      { label: 'Watch the deadline', copy: 'Public property can shorten it to six months.' },
    ],
    insuranceProblems: [
      'The owner claims the defect was obvious.',
      'No incident report is ever created.',
      'The defect is repaired before it is photographed.',
      'A prior-complaint history is never requested.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the defect and how long had it existed?' },
      { label: 'Step 2', question: 'Was it private property or a public entity?' },
      { label: 'Step 3', question: 'Were there prior complaints about the defect?' },
      { label: 'Step 4', question: 'Were there witnesses?' },
    ],
  },
  [LB_SLIPFALL_SLUG]: {
    scenario: `A convention visitor slipped in a Long Beach hotel and flew home two days later. Because the incident report and photographs were obtained before departure and the video was preserved, the notice timeline was provable from out of state. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard; report it; get the incident report and manager.'],
      ['Before leaving', 'Obtain photographs and the report; send a video-preservation demand.'],
      ['First weeks', 'Housekeeping and inspection routines gathered.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Minor', 'A fall with soft-tissue injury that resolves.'],
      ['Moderate', 'A fracture or injury needing ongoing care.'],
      ['Serious', 'Surgery, a head injury, or lasting impairment.'],
      ['Out of area', 'The visitor has left the state after the fall.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER or urgent-care records tie injuries to the fall.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the notice requirement can be proved',
      'Whether the surveillance video was preserved',
      'Whether the report and photographs were obtained before departure',
      'Injury severity and treatment continuity',
      'For a sidewalk fall, adjacent-owner versus city responsibility',
      'Whether a public entity and six-month deadline apply',
    ],
    settlementValueDetails: [
      { label: 'Notice is the battle', copy: 'How long the hazard sat usually decides liability.' },
      { label: 'Act before you leave', copy: 'Out-of-area falls need evidence secured early.' },
      { label: 'Sidewalk is different', copy: 'Owner or city responsibility must be sorted out.' },
      { label: 'Watch the deadline', copy: 'A claim against the city has a six-month deadline.' },
    ],
    insuranceProblems: [
      'The visitor leaves before securing the report and video.',
      'The video is overwritten before a demand is sent.',
      'A city sidewalk claim misses the six-month deadline.',
      'The visitor is blamed as not watching where they walked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the hazard and how long had it been there?' },
      { label: 'Step 2', question: 'Was it a hotel/venue or a public sidewalk?' },
      { label: 'Step 3', question: 'Did you obtain the report and photos before leaving?' },
      { label: 'Step 4', question: 'Has a demand been sent to preserve the video?' },
    ],
  },
  [OAK_SLIPFALL_SLUG]: {
    scenario: `A commuter slipped at an Oakland transit station and assumed only the station operator could be responsible. Identifying the correct public agency and presenting a written claim within six months kept the dangerous-condition claim alive. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard; note the station or building and operator.'],
      ['First days', 'The correct public agency identified.'],
      ['Six months', 'Deadline to present a written claim to the public entity.'],
      ['Longer term', 'Defect history and treatment documented.'],
    ],
    severityLadder: [
      ['Minor', 'A fall with soft-tissue injury that resolves.'],
      ['Moderate', 'A fracture or injury needing ongoing care.'],
      ['Serious', 'Surgery, a head injury, or lasting impairment.'],
      ['Disputed party', 'Responsibility is contested between agencies or owners.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER or urgent-care records tie injuries to the fall.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the correct public agency is identified',
      'Whether the six-month claim deadline is met',
      'For a store fall, whether notice can be proved',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
      'For older buildings, the defect and complaint history',
    ],
    settlementValueDetails: [
      { label: 'Identify the agency', copy: 'BART, AC Transit, or the city may be responsible.' },
      { label: 'Six-month deadline', copy: 'Public-property claims move fast.' },
      { label: 'Notice still matters', copy: 'A store fall turns on how long the hazard sat.' },
      { label: 'Defect history helps', copy: 'A long-standing defect shows knowledge.' },
    ],
    insuranceProblems: [
      'The wrong agency is named, wasting the six-month window.',
      'The public-entity deadline is missed.',
      'A store\u2019s video is overwritten before a demand is sent.',
      'A building\u2019s defect history is never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where did you fall \u2014 a station, building, or store?' },
      { label: 'Step 2', question: 'Which public agency or owner controls the location?' },
      { label: 'Step 3', question: 'Is the six-month deadline still open?' },
      { label: 'Step 4', question: 'Were there witnesses or prior complaints?' },
    ],
  },
}
