import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, slip-and-fall (premises liability) practice area (batch 3):
 * city-specific guides for Riverside, San Bernardino, Bakersfield, and Anaheim,
 * extending the batch-1 hub (LA, SF, San Diego, Sacramento) and batch-2 (San
 * Jose, Fresno, Long Beach, Oakland) into the Inland Empire, Central Valley, and
 * Orange County.
 *
 * Genuinely local context rather than interpolated copy:
 *  - Riverside: Inland Empire big-box and warehouse-club retail, aging strip
 *    centres, and Riverside County public buildings.
 *  - San Bernardino: big-box and older strip retail with deferred maintenance,
 *    plus a large concentration of county buildings.
 *  - Bakersfield: heavy big-box and grocery volume, oilfield-town retail, aging
 *    strip centres, and Kern County public buildings.
 *  - Anaheim: resort-district hotels, the convention center, and theme-park-
 *    adjacent retail, where out-of-area visitors fall and then leave, plus city
 *    public property.
 *
 * California premises-liability law, applied accurately (identical to batches 1-2):
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

export const RIVERSIDE_SLIPFALL_SLUG = '/riverside-slip-and-fall'
export const SANBERNARDINO_SLIPFALL_SLUG = '/san-bernardino-slip-and-fall'
export const BAKERSFIELD_SLIPFALL_SLUG = '/bakersfield-slip-and-fall'
export const ANAHEIM_SLIPFALL_SLUG = '/anaheim-slip-and-fall'

export const slipAndFallCityGuidePages3: LandingPage[] = [
  {
    slug: RIVERSIDE_SLIPFALL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Slip and Fall Claims',
    title: 'Riverside Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'Riverside slip-and-fall claims usually happen in big-box and warehouse-club stores or aging strip retail, or on county property. Proving the owner knew or should have known about the hazard is the whole game, and the video can vanish in days.',
    psychology: 'I slipped and fell in a store or on public property in Riverside and do not know whether I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside slip and fall claim',
      'slipped in a warehouse club store california who is liable',
      'premises liability notice requirement california',
      'store surveillance video slip and fall preserve',
      'fell on public property california six month deadline',
    ],
    signals: [
      'Notice requirement',
      'Big-box / warehouse club',
      'Aging strip retail',
      'Surveillance video preservation',
      'Two-year deadline',
      'Public entity (six-month)',
    ],
    sections: {
      whyItMatters: `Riverside slip-and-fall claims cluster in the Inland Empire\u2019s big-box and warehouse-club retailers, grocery chains, and older strip centres, and on Riverside County public buildings. ${PREMISES} Against a large retailer the notice question decides the case \u2014 how long the spill or hazard sat, and whether staff inspected, cleaned, or warned \u2014 and the store\u2019s surveillance video and inspection logs are the best proof. ${EVIDENCE} Older strip properties raise a second recurring issue: deferred maintenance such as broken pavement, poor lighting, and worn stairs, where the defect history matters. ${PUBLIC} A fall in a county building or facility can carry the six-month deadline, so identifying whether the property is public matters early. Pure comparative negligence applies, so open-and-obvious and footwear arguments reduce rather than bar recovery. The ordinary two-year deadline applies otherwise (Code of Civil Procedure section 335.1). Civil cases are filed in Riverside County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ focuses a Riverside fall on the notice question and video preservation, pursues the maintenance and prior-complaint history for aging strip properties, and flags a public-entity six-month deadline for county property. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I slipped on a spill in a store. Is the store automatically liable?',
        a: 'Not automatically. You generally must show the store created the hazard, knew about it, or should have known about it in time to clean it up \u2014 the notice requirement. Surveillance video and inspection logs usually decide how long the hazard was present.',
      },
      {
        q: 'I tripped on broken pavement at an old strip mall. Does that count?',
        a: 'It can. A persistent physical defect like broken pavement, worn stairs, or poor lighting is a classic dangerous condition, and a long-standing defect helps show the owner should have known. Photographs with scale and any prior-complaint history are important.',
      },
      {
        q: 'I fell at a county building. Is the deadline different?',
        a: 'Likely yes. A fall on public property can be a dangerous-condition claim under Government Code section 835, and the Government Claims Act shortens the deadline to six months to present a written claim.',
      },
      {
        q: 'The store says the hazard was obvious. Does that end my claim?',
        a: 'No. California uses pure comparative negligence, so even a somewhat open-and-obvious hazard reduces your recovery by your share rather than barring the claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SANBERNARDINO_SLIPFALL_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Slip and Fall Claims',
    title: 'San Bernardino Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Bernardino slip-and-fall claims usually happen in big-box stores and aging strip retail, or on county property. Proving the owner knew or should have known about the hazard is the whole game, and the video can vanish in days.',
    psychology: 'I slipped and fell in a store or on public property in San Bernardino and do not know whether I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino slip and fall claim',
      'slipped in a grocery store california who is liable',
      'premises liability notice requirement california',
      'store surveillance video slip and fall preserve',
      'fell on public property california six month deadline',
    ],
    signals: [
      'Notice requirement',
      'Big-box / grocery',
      'Aging strip retail / deferred maintenance',
      'Surveillance video preservation',
      'Two-year deadline',
      'Public entity (six-month)',
    ],
    sections: {
      whyItMatters: `San Bernardino slip-and-fall claims cluster in big-box retailers, grocery chains, and older strip retail with visible deferred maintenance, and on the county\u2019s large stock of public buildings. ${PREMISES} Against a large retailer the notice question decides the case, and the store\u2019s surveillance video and inspection logs are the best proof. ${EVIDENCE} Older properties raise a recurring physical-defect pattern \u2014 broken pavement, worn stairs, poor lighting \u2014 where the defect history and any prior complaints matter. ${PUBLIC} A fall in a county building or facility can carry the six-month deadline, so identifying whether the property is public matters early. Pure comparative negligence applies, so open-and-obvious and footwear arguments reduce rather than bar recovery. The ordinary two-year deadline applies otherwise (Code of Civil Procedure section 335.1). Civil cases are filed in San Bernardino County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ focuses a San Bernardino fall on the notice question and video preservation, pursues the maintenance and prior-complaint history for aging strip properties, and flags a public-entity six-month deadline for county property. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I slipped on a spill in a store. Is the store automatically liable?',
        a: 'Not automatically. You generally must show the store created the hazard, knew about it, or should have known about it in time to clean it up \u2014 the notice requirement. Surveillance video and inspection logs usually decide how long the hazard was present.',
      },
      {
        q: 'I tripped on broken pavement at an old strip mall. Does that count?',
        a: 'It can. A persistent physical defect like broken pavement, worn stairs, or poor lighting is a classic dangerous condition, and a long-standing defect helps show the owner should have known. Photographs with scale and any prior-complaint history are important.',
      },
      {
        q: 'I fell at a county building. Is the deadline different?',
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
    slug: BAKERSFIELD_SLIPFALL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Slip and Fall Claims',
    title: 'Bakersfield Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bakersfield slip-and-fall claims usually happen in big-box stores, grocery chains, and aging strip retail, or on county and city property. Proving the owner knew or should have known about the hazard is the whole game, and the video can vanish in days.',
    psychology: 'I slipped and fell in a store or on public property in Bakersfield and do not know whether I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield slip and fall claim',
      'slipped in a grocery store california who is liable',
      'premises liability notice requirement california',
      'store surveillance video slip and fall preserve',
      'fell on public property california six month deadline',
    ],
    signals: [
      'Notice requirement',
      'Big-box / grocery',
      'Aging strip retail',
      'Surveillance video preservation',
      'Two-year deadline',
      'Public entity (six-month)',
    ],
    sections: {
      whyItMatters: `Bakersfield slip-and-fall claims cluster in big-box retailers, grocery chains, and older strip retail, and on Kern County and City of Bakersfield public buildings. ${PREMISES} Against a large retailer the notice question decides the case \u2014 how long the hazard sat and whether staff inspected or cleaned \u2014 and the store\u2019s surveillance video and inspection logs are the best proof. ${EVIDENCE} Older strip-mall properties raise a second recurring issue: deferred maintenance such as broken pavement, poor lighting, and worn stairs, where the defect history matters. ${PUBLIC} A fall in a county building, a city facility, or a public sidewalk can carry the six-month deadline, so identifying whether the property is public matters early. Pure comparative negligence applies, so open-and-obvious and footwear arguments reduce rather than bar recovery. The ordinary two-year deadline applies otherwise (Code of Civil Procedure section 335.1). Civil cases are filed in Kern County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ focuses a Bakersfield fall on the notice question and video preservation, pursues the maintenance and prior-complaint history for aging strip properties, and flags a public-entity six-month deadline for county or city property. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I slipped on a spill in a store. Is the store automatically liable?',
        a: 'Not automatically. You generally must show the store created the hazard, knew about it, or should have known about it in time to clean it up \u2014 the notice requirement. Surveillance video and inspection logs usually decide how long the hazard was present.',
      },
      {
        q: 'I tripped on broken pavement at an old strip mall. Does that count?',
        a: 'It can. A persistent physical defect like broken pavement, worn stairs, or poor lighting is a classic dangerous condition, and a long-standing defect helps show the owner should have known. Photographs with scale and any prior-complaint history are important.',
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
    slug: ANAHEIM_SLIPFALL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Slip and Fall Claims',
    title: 'Anaheim Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'Anaheim slip-and-fall claims often happen in resort-district hotels, the convention center, and theme-park-adjacent retail, or on city property. Proving the owner knew or should have known about the hazard is the whole game, and the video can vanish in days.',
    psychology: 'I slipped and fell at an Anaheim hotel, resort, or store while visiting and do not know whether I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim slip and fall claim',
      'fell in a hotel california claim',
      'premises liability notice requirement california',
      'store surveillance video slip and fall preserve',
      'injured while visiting california can i still sue',
    ],
    signals: [
      'Notice requirement',
      'Hotel / convention / resort',
      'Out-of-area visitor timing',
      'Surveillance video preservation',
      'Two-year deadline',
      'Public entity (six-month)',
    ],
    sections: {
      whyItMatters: `Anaheim slip-and-fall claims often arise in its resort-district hotels, the convention center, and theme-park-adjacent retail and dining \u2014 hospitality venues with enormous tourist foot traffic \u2014 and on city public property. ${PREMISES} In a hotel or convention venue the notice question turns on inspection and housekeeping routines, and the venue\u2019s surveillance video is the best proof. ${EVIDENCE} The dominant local wrinkle is that many injured people are out-of-area visitors who fall and then leave the state within days, so getting the incident report and photographs before departure and acting promptly on the video is critical. ${PUBLIC} A fall on a city sidewalk or public property raises the six-month deadline. Pure comparative negligence applies, so open-and-obvious and distraction arguments reduce rather than bar recovery. The ordinary two-year deadline applies otherwise (Code of Civil Procedure section 335.1). Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Exactly what the hazard was and how long it appears to have been there',
        'Photographs of the hazard before it was cleaned or repaired',
        'The hotel or venue incident report and the manager\u2019s name',
        'A prompt written demand to preserve surveillance video',
        'Whether you are an out-of-area visitor and your travel timeline',
        'Whether the fall was on a sidewalk or other public property',
        'Witnesses who saw the hazard or the fall',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ focuses an Anaheim fall on the notice question and video preservation, and \u2014 given the resort district \u2014 flags the out-of-area visitor timing problem so the report, photographs, and video demand are secured before departure. It also sorts out a city public-property six-month deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I fell in an Anaheim hotel while visiting and have gone home. Can I still claim?',
        a: 'Yes. A fall in California is governed by California law regardless of where you live, and you can pursue the claim from out of state. Because gathering the incident report and evidence is harder after you leave, obtain the report and photographs before departure and act promptly on the video.',
      },
      {
        q: 'How do I stop the hotel or store from erasing its video?',
        a: 'Make a prompt written demand that the venue preserve the footage for the date, time, and location of your fall, because many systems overwrite video within days or weeks. The video can establish how long the hazard was present.',
      },
      {
        q: 'I slipped on a spill in a store. Is the store automatically liable?',
        a: 'Not automatically. You generally must show the store created the hazard, knew about it, or should have known about it in time to clean it up \u2014 the notice requirement. Surveillance video and inspection logs usually decide how long the hazard was present.',
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
]

export const slipAndFallCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [RIVERSIDE_SLIPFALL_SLUG]: {
    scenario: `A shopper slipped on a spill in a Riverside warehouse-club aisle, and the store said it had no idea it was there. The surveillance video, preserved by a prompt demand, showed the spill unattended \u2014 settling the notice question. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard; report it; get the incident report and manager.'],
      ['First days', 'Written demand sent to preserve the surveillance video.'],
      ['First weeks', 'Inspection logs and witness accounts gathered.'],
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
      'How long the hazard was present',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
      'Whether a public entity and six-month deadline apply',
    ],
    settlementValueDetails: [
      { label: 'Notice is the battle', copy: 'How long the hazard sat usually decides liability.' },
      { label: 'Video is decisive', copy: 'It proves the timeline \u2014 if preserved in time.' },
      { label: 'Obvious is not a bar', copy: 'Comparative fault reduces rather than ends a claim.' },
      { label: 'Watch the deadline', copy: 'Public property can shorten it to six months.' },
    ],
    insuranceProblems: [
      'The store claims no knowledge and the video is gone.',
      'No incident report is ever created.',
      'The shopper is blamed as not watching where they walked.',
      'Inspection logs are never requested.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the hazard and how long had it been there?' },
      { label: 'Step 2', question: 'Was an incident report made, and by whom?' },
      { label: 'Step 3', question: 'Has a demand been sent to preserve the video?' },
      { label: 'Step 4', question: 'Was it private property or a public entity?' },
    ],
  },
  [SANBERNARDINO_SLIPFALL_SLUG]: {
    scenario: `A shopper tripped on broken pavement at an aging San Bernardino strip mall, and the owner claimed it was obvious. Photographs with scale and a history of prior complaints showed a long-standing defect the owner should have fixed. ${NOT_ADVICE}`,
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
  [BAKERSFIELD_SLIPFALL_SLUG]: {
    scenario: `A shopper slipped on a spill in a Bakersfield grocery aisle, and the store denied knowledge. The surveillance video, preserved by a prompt demand, showed the spill unattended and no inspection \u2014 settling the notice question. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard; report it; get the incident report and manager.'],
      ['First days', 'Written demand sent to preserve the surveillance video.'],
      ['First weeks', 'Inspection logs and witness accounts gathered.'],
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
      'How long the hazard was present',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
      'Whether a public entity and six-month deadline apply',
    ],
    settlementValueDetails: [
      { label: 'Notice is the battle', copy: 'How long the hazard sat usually decides liability.' },
      { label: 'Video is decisive', copy: 'It proves the timeline \u2014 if preserved in time.' },
      { label: 'Obvious is not a bar', copy: 'Comparative fault reduces rather than ends a claim.' },
      { label: 'Watch the deadline', copy: 'Public property can shorten it to six months.' },
    ],
    insuranceProblems: [
      'The store claims no knowledge and the video is gone.',
      'No incident report is ever created.',
      'The shopper is blamed as not watching where they walked.',
      'Inspection logs are never requested.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the hazard and how long had it been there?' },
      { label: 'Step 2', question: 'Was an incident report made, and by whom?' },
      { label: 'Step 3', question: 'Has a demand been sent to preserve the video?' },
      { label: 'Step 4', question: 'Was it private property or a public entity?' },
    ],
  },
  [ANAHEIM_SLIPFALL_SLUG]: {
    scenario: `A convention visitor slipped in an Anaheim hotel and flew home two days later. Because the incident report and photographs were obtained before departure and the video was preserved, the notice timeline was provable from out of state. ${NOT_ADVICE}`,
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
      'How much comparative fault is genuinely in play',
      'Whether a public entity and six-month deadline apply',
    ],
    settlementValueDetails: [
      { label: 'Notice is the battle', copy: 'How long the hazard sat usually decides liability.' },
      { label: 'Act before you leave', copy: 'Out-of-area falls need evidence secured early.' },
      { label: 'Video is decisive', copy: 'It proves the timeline \u2014 if preserved in time.' },
      { label: 'Watch the deadline', copy: 'City public property has a six-month deadline.' },
    ],
    insuranceProblems: [
      'The visitor leaves before securing the report and video.',
      'The video is overwritten before a demand is sent.',
      'A city public-property claim misses the six-month deadline.',
      'The visitor is blamed as not watching where they walked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the hazard and how long had it been there?' },
      { label: 'Step 2', question: 'Was it a hotel/venue or public property?' },
      { label: 'Step 3', question: 'Did you obtain the report and photos before leaving?' },
      { label: 'Step 4', question: 'Has a demand been sent to preserve the video?' },
    ],
  },
}
