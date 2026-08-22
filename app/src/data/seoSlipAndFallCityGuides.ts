import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, slip-and-fall (premises liability) practice area: city-specific
 * guides for Los Angeles, San Francisco, San Diego, and Sacramento.
 *
 * These complement the statewide slip-and-fall hub (value, liability, SOL,
 * hiring) with genuinely local context rather than interpolated copy:
 *  - Los Angeles: enormous retail, grocery, restaurant, and hospitality volume,
 *    large commercial defendants with surveillance systems, and heavy tourist
 *    foot traffic.
 *  - San Francisco: a city ordinance that makes the adjacent property owner
 *    responsible for maintaining the public sidewalk, plus steep terrain,
 *    stairways, rain-slick hills, and aging buildings.
 *  - San Diego: tourism-driven hotels, resorts, pool decks, convention spaces,
 *    and beach-area businesses, where visitors fall far from home.
 *  - Sacramento: a dense concentration of state and local government buildings
 *    and public property, so a dangerous-condition-of-public-property claim on
 *    the six-month deadline is a recurring local pattern.
 *
 * California premises-liability law, applied accurately:
 *  - An owner or occupier owes a duty of reasonable care to keep property
 *    reasonably safe; recovery generally requires proving a dangerous condition
 *    and that the owner created it, knew of it, or should have known of it in
 *    time to fix it (the notice requirement).
 *  - On public property, a dangerous-condition claim under Government Code
 *    section 835 applies, and the six-month Government Claims Act deadline
 *    replaces the ordinary two years.
 *  - Pure comparative negligence (open-and-obvious hazards, footwear, and
 *    distraction reduce but do not automatically bar recovery), and the two-year
 *    personal-injury deadline (Code of Civil Procedure section 335.1).
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

export const LA_SLIPFALL_SLUG = '/los-angeles-slip-and-fall'
export const SF_SLIPFALL_SLUG = '/san-francisco-slip-and-fall'
export const SD_SLIPFALL_SLUG = '/san-diego-slip-and-fall'
export const SAC_SLIPFALL_SLUG = '/sacramento-slip-and-fall'

export const slipAndFallCityGuidePages: LandingPage[] = [
  {
    slug: LA_SLIPFALL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Slip and Fall Claims',
    title: 'Los Angeles Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'Los Angeles slip-and-fall claims usually happen in stores, restaurants, and hotels \u2014 large commercial defendants with surveillance video. Proving the owner knew or should have known about the hazard is the whole game, and the video can vanish in days.',
    psychology: 'I slipped and fell in a store, restaurant, or hotel in LA and do not know whether I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles slip and fall claim',
      'slipped in a grocery store california who is liable',
      'fell in a restaurant los angeles claim',
      'store surveillance video slip and fall preserve',
      'premises liability notice requirement california',
    ],
    signals: [
      'Notice requirement',
      'Retail / grocery / restaurant',
      'Hotel or hospitality venue',
      'Surveillance video preservation',
      'Two-year deadline',
      'Comparative fault (open/obvious)',
    ],
    sections: {
      whyItMatters: `Los Angeles slip-and-fall claims are overwhelmingly commercial: they happen in supermarkets, big-box stores, restaurants, shopping centres, hotels and entertainment venues, where enormous foot traffic meets spills, freshly mopped floors, produce debris, uneven surfaces and poor lighting. That commercial setting shapes everything. ${PREMISES} Against a large retailer or hotel chain, the notice question is usually the battleground \u2014 how long the spill or hazard was there, and whether staff inspected, cleaned or warned \u2014 and the single best proof is the store\u2019s own surveillance video and inspection logs. ${EVIDENCE} Los Angeles businesses almost all have cameras, which cuts both ways: the footage can prove how long a hazard sat unaddressed, but only if it is preserved before the system overwrites it, so a prompt preservation demand is critical. The city\u2019s tourism adds a wrinkle \u2014 many injured people are visitors who fall in a hotel or attraction and then leave the state, which makes gathering the incident report and evidence before departure important. Pure comparative negligence applies, so a defendant will argue the hazard was open and obvious, that footwear or distraction contributed, or that the visitor was not watching; those arguments reduce rather than automatically bar recovery. The ordinary two-year personal-injury deadline applies (Code of Civil Procedure section 335.1), unless a public entity is involved, in which case the six-month rule may apply. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Exactly what the hazard was and how long it appears to have been there',
        'Photographs of the hazard before it was cleaned or repaired',
        'The store or venue incident report and the manager\u2019s name',
        'A prompt written demand to preserve surveillance video',
        'Any inspection or cleaning logs for the area',
        'Witnesses who saw the hazard or the fall',
        'Whether the venue was a hotel or attraction and you are from out of area',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ focuses an LA slip-and-fall on the notice question that decides it and on preserving the surveillance video before it is overwritten \u2014 the evidence large retailers and hotels rely on and injured people usually forget. It captures the incident report and hazard photographs and flags the out-of-area visitor timing problem. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I slipped on a spill in a store. Is the store automatically liable?',
        a: 'Not automatically. You generally must show the store created the hazard, knew about it, or should have known about it in time to clean it up \u2014 the notice requirement. Proving how long the spill was there is usually the key, which is why the store\u2019s surveillance video and inspection logs matter so much.',
      },
      {
        q: 'How do I stop the store from erasing its video?',
        a: 'Make a prompt written demand that the business preserve the footage for the date, time and location of your fall, because many systems overwrite video within days or weeks. The video can establish how long the hazard was present, so preserving it early is often the single most valuable step in the claim.',
      },
      {
        q: 'The store says the hazard was obvious. Does that end my claim?',
        a: 'No. California uses pure comparative negligence, so even if a hazard was somewhat open and obvious, or footwear or distraction played a part, that reduces your recovery by your share rather than barring the claim. An owner can still be liable for a dangerous condition they should have addressed.',
      },
      {
        q: 'I fell in an LA hotel while visiting and have gone home. Can I still claim?',
        a: 'Yes. A fall in California is governed by California law regardless of where you live, and you can pursue the claim from out of state. Because gathering the incident report and evidence is harder after you leave, it helps to obtain the report and photographs before departure and to act promptly on the video.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_SLIPFALL_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Slip and Fall Claims',
    title: 'San Francisco Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'In San Francisco a city ordinance makes the adjacent property owner responsible for maintaining the public sidewalk \u2014 so a trip on a broken sidewalk may be a private claim. Add steep stairs, rain-slick hills, and old buildings, and the responsible party is not always obvious.',
    psychology: 'I tripped or slipped in San Francisco \u2014 on a sidewalk, stairs, or a hill \u2014 and do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco slip and fall claim',
      'tripped on a broken sidewalk san francisco who is liable',
      'fell on stairs in an apartment building california',
      'premises liability notice requirement california',
      'sidewalk trip and fall adjacent property owner',
    ],
    signals: [
      'Sidewalk (adjacent-owner duty)',
      'Notice requirement',
      'Stairway or steep terrain',
      'Rain-slick surface',
      'Public property (six-month)',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Francisco slip- and trip-and-fall claims carry a local rule that surprises many people: the city\u2019s ordinance generally makes the owner of the property adjacent to a public sidewalk responsible for maintaining that sidewalk. So a trip on a raised, cracked or broken sidewalk slab \u2014 common in a city of mature street trees and aging infrastructure \u2014 may be a claim against the adjacent private owner rather than only the city, which changes who to pursue and which insurance responds. Where the city itself is responsible for a public walkway, building or transit facility, a different path applies. ${PUBLIC} On private property, the ordinary premises rule governs. ${PREMISES} San Francisco\u2019s geography adds hazards other cities do not have in the same measure: steep hills and countless stairways where handrails, lighting and surface condition matter; frequent rain and fog that make tile entries, transit platforms and painted surfaces slick; and a large stock of old buildings where worn stairs and code-deficient conditions appear. In an apartment building, a fall in a common area \u2014 a stairwell, lobby or garage \u2014 points to the landlord\u2019s duty to maintain those areas. ${EVIDENCE} Pure comparative negligence applies, so a defendant will argue the hazard was obvious or that footwear or inattention contributed; those arguments reduce rather than bar recovery. The two-year personal-injury deadline applies to private claims (Code of Civil Procedure section 335.1), and the six-month rule to public-entity claims. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Whether the fall was on a public sidewalk, and the adjacent property owner',
        'Whether a public building, walkway, or transit facility was involved',
        'For a stairway, the handrail, lighting, and surface condition',
        'Whether rain or a wet surface contributed',
        'In an apartment, the common-area condition and the landlord',
        'Photographs of the hazard, with something for scale, taken promptly',
        'Any prior complaints or repair history for the condition',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags San Francisco\u2019s adjacent-owner sidewalk rule, so a broken-sidewalk trip is pursued against the right party, and separates a public-property fall (six-month deadline) from a private one. It documents stairway, rain and common-area conditions and the notice evidence that fades once a hazard is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I tripped on a broken public sidewalk. Who is responsible?',
        a: 'In San Francisco, a city ordinance generally makes the owner of the adjacent property responsible for maintaining the public sidewalk, so your claim may be against that private owner rather than only the city. Where the city is responsible for the condition, a dangerous-condition-of-public-property claim on the six-month deadline may apply instead. Identifying which is essential.',
      },
      {
        q: 'I fell on a stairway in my apartment building. Is the landlord liable?',
        a: 'Possibly. A landlord owes a duty to maintain common areas like stairwells, lobbies and garages, so a fall caused by a broken step, missing handrail or poor lighting can support a claim \u2014 subject to the notice requirement, meaning the landlord created the condition, knew of it, or should have. A history of complaints can be important.',
      },
      {
        q: 'I slipped on a wet surface when it was raining. Does the rain excuse the owner?',
        a: 'Not by itself. An owner still owes a duty of reasonable care, which can include mats, warnings or maintenance where wet entries and slick surfaces are foreseeable in San Francisco\u2019s climate. The rain may feed a comparative-fault argument, but under pure comparative negligence that reduces rather than bars recovery.',
      },
      {
        q: 'The condition looked obvious. Can I still recover?',
        a: 'Often yes. California uses pure comparative negligence, so an open-and-obvious hazard, footwear, or distraction reduces your recovery by your share rather than ending the claim. An owner can still be liable for a dangerous condition they should have addressed.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the responsibility and notice questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_SLIPFALL_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Slip and Fall Claims',
    title: 'San Diego Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Diego\u2019s hotels, resorts, pool decks, and beach-area businesses drive its slip-and-fall claims, and many injured people are visitors who fall far from home. Proving the owner knew or should have known about the hazard is the key.',
    psychology: 'I slipped and fell at a San Diego hotel, resort, or restaurant, maybe while visiting, and do not know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego slip and fall claim',
      'fell at a hotel or resort san diego claim',
      'slipped on a wet pool deck california who is liable',
      'premises liability notice requirement california',
      'store surveillance video slip and fall preserve',
    ],
    signals: [
      'Hotel / resort / pool deck',
      'Notice requirement',
      'Out-of-area visitor',
      'Surveillance video preservation',
      'Public property (six-month)',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Diego slip-and-fall claims are shaped by tourism. The region\u2019s economy runs on hotels, resorts, convention spaces, restaurants and beach-area businesses, so falls frequently happen on wet pool decks, tiled lobbies and bathrooms, outdoor dining patios, and the paths and stairs of resort properties \u2014 and a large share of the injured are visitors. ${PREMISES} Against a hotel or resort, the notice question dominates: how long the wet floor, spill or defect existed, and whether staff inspected, cleaned or warned, with the property\u2019s surveillance video and housekeeping or maintenance logs as the best evidence. ${EVIDENCE} The visitor factor makes speed even more important, because an injured tourist who returns home before gathering the incident report and evidence is at a disadvantage, though a fall in California is governed by California law regardless of residency and can be pursued from out of state. Pool decks deserve special mention: wet surfaces around pools are foreseeable, so the presence or absence of slip-resistant surfacing, warnings and drainage is often central. Where a fall happens on public property \u2014 a public beach access, a boardwalk, a convention centre operated by a public entity, or a transit facility \u2014 a different path applies. ${PUBLIC} Pure comparative negligence applies, so a defendant will argue the hazard was obvious or that footwear or inattention contributed; those arguments reduce rather than bar recovery. The two-year personal-injury deadline applies to private claims (Code of Civil Procedure section 335.1). Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The venue \u2014 hotel, resort, restaurant, or pool area \u2014 and the exact spot',
        'What the hazard was and how long it appears to have been there',
        'Photographs of the hazard before it was cleaned or repaired',
        'The property\u2019s incident report and the manager\u2019s name',
        'A prompt written demand to preserve surveillance video',
        'For a pool deck, the surfacing, warnings, and drainage',
        'Whether the property is public, which shortens the deadline',
        'Medical treatment from first response onward, especially before leaving town',
      ],
      howClearCaseHelps: `ClearCaseIQ centres a San Diego slip-and-fall on the notice question and on preserving the resort or hotel\u2019s surveillance video and logs before they cycle out, and it handles the out-of-area visitor timing problem by prompting to gather the incident report and evidence before you leave. It flags a public-property fall and its six-month clock. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I slipped on a wet pool deck at a resort. Is the resort liable?',
        a: 'Possibly. Wet surfaces around a pool are foreseeable, so a resort\u2019s duty of reasonable care can include slip-resistant surfacing, warnings and proper drainage. You generally must still show the resort created the hazard, knew of it, or should have \u2014 the notice requirement \u2014 which is why the conditions and any maintenance logs matter.',
      },
      {
        q: 'I fell at a San Diego hotel while on vacation and have gone home. Can I still claim?',
        a: 'Yes. A fall in California is governed by California law regardless of where you live, and you can pursue the claim from out of state. Because evidence is harder to gather after you leave, it helps to obtain the incident report and photographs before departure and to demand the video promptly.',
      },
      {
        q: 'How do I keep the hotel from erasing its surveillance video?',
        a: 'Make a prompt written demand that the property preserve the footage for the date, time and location of your fall, since systems often overwrite video within days or weeks. The video can show how long a hazard was present, which is central to the notice question.',
      },
      {
        q: 'The hazard seemed obvious. Does that bar my claim?',
        a: 'No. California uses pure comparative negligence, so an open-and-obvious hazard, footwear, or distraction reduces your recovery by your share rather than ending the claim. An owner can still be liable for a dangerous condition they should have addressed.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice and evidence questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_SLIPFALL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Slip and Fall Claims',
    title: 'Sacramento Slip and Fall Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sacramento\u2019s dense concentration of state and local government buildings means many falls happen on public property \u2014 a dangerous-condition claim with a six-month deadline instead of two years \u2014 alongside the usual store and apartment falls.',
    psychology: 'I slipped and fell in Sacramento, maybe at a government building or a store, and do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento slip and fall claim',
      'fell at a government building california claim',
      'dangerous condition of public property california',
      'slipped in a store sacramento who is liable',
      'premises liability notice requirement california',
    ],
    signals: [
      'Public property (Gov. Code 835)',
      'Six-month agency deadline',
      'Notice requirement',
      'Retail / grocery / restaurant',
      'Apartment common area',
      'Two-year deadline (private)',
    ],
    sections: {
      whyItMatters: `Sacramento slip-and-fall claims are distinctive because of how much of the city is public. As the state capital and a county seat, Sacramento has an unusually dense concentration of government buildings, courthouses, agency offices and public grounds, so a meaningful share of falls happen on public property \u2014 and that changes the claim fundamentally. ${PUBLIC} A fall on a slick lobby floor, a broken step, an unmarked level change or an icy or wet walkway at a state or county building is a dangerous-condition-of-public-property claim, and the six-month presentation deadline can pass long before an injured person realises the ordinary two-year rule does not apply. Recognising a public-property fall early is therefore essential. The rest of Sacramento\u2019s slip-and-fall claims follow the ordinary premises rule. ${PREMISES} They happen in the usual places \u2014 supermarkets, big-box stores, restaurants and shopping centres, where notice and surveillance video are the battleground \u2014 and in apartment common areas, where a landlord\u2019s duty to maintain stairwells, lobbies and walkways is at issue. ${EVIDENCE} The Central Valley\u2019s extreme summer heat and occasional winter wet add their own hazards, from heat-related surface issues to slick entries. Pure comparative negligence applies, so a defendant will argue the hazard was obvious or that footwear or inattention contributed; those arguments reduce rather than bar recovery. The two-year deadline applies to private claims (Code of Civil Procedure section 335.1) and the six-month rule to public-entity claims. Civil cases are filed in Sacramento County Superior Court at the Gordon D. Schaber Downtown Courthouse.`,
      whatToTrack: [
        'Whether the fall was at a government building or on public property',
        'If public, the six-month deadline to present a written claim',
        'What the hazard was and how long it appears to have been there',
        'Photographs of the hazard before it was cleaned or repaired',
        'The incident report and the manager or facility staff involved',
        'A prompt written demand to preserve any surveillance video',
        'In an apartment, the common-area condition and the landlord',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ checks first whether a Sacramento fall was on public property, because that converts it into a dangerous-condition claim on a six-month clock that is easy to miss in the capital, and otherwise applies the ordinary notice analysis for stores and apartments, preserving the video and incident report before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I fell at a state or county government building. Is that an ordinary claim?',
        a: 'No. A fall on public property is a dangerous-condition-of-public-property claim under Government Code section 835, and the Government Claims Act shortens the deadline to six months to present a written claim, rather than the ordinary two years. Because Sacramento has so many government buildings, this shortened deadline catches many people by surprise, so recognising it early is essential.',
      },
      {
        q: 'I slipped in a grocery store. Is the store automatically liable?',
        a: 'Not automatically. You generally must show the store created the hazard, knew about it, or should have known about it in time to clean it up \u2014 the notice requirement. Proving how long the hazard was there is usually the key, which is why the store\u2019s surveillance video and inspection logs matter.',
      },
      {
        q: 'I fell in the stairwell of my apartment complex. Who is responsible?',
        a: 'Possibly the landlord, who owes a duty to maintain common areas like stairwells, lobbies and walkways. A fall caused by a broken step, missing handrail or poor lighting can support a claim, subject to the notice requirement, and a history of complaints about the condition can be important.',
      },
      {
        q: 'The hazard looked obvious. Does that end my claim?',
        a: 'No. California uses pure comparative negligence, so an open-and-obvious hazard, footwear, or distraction reduces your recovery by your share rather than barring the claim. An owner or public entity can still be liable for a dangerous condition they should have addressed.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice and public-entity questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const slipAndFallCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_SLIPFALL_SLUG]: {
    scenario: `A shopper slipped on a spill that had sat in a supermarket aisle, and the store said it had no idea it was there. The surveillance video, preserved by a prompt demand, showed the spill unattended for nearly an hour \u2014 settling the notice question. ${NOT_ADVICE}`,
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
      'Whether inspection logs exist',
    ],
    settlementValueDetails: [
      { label: 'Notice is the battle', copy: 'How long the hazard sat usually decides liability.' },
      { label: 'Video is decisive', copy: 'It proves the timeline \u2014 if preserved in time.' },
      { label: 'Obvious is not a bar', copy: 'Comparative fault reduces rather than ends a claim.' },
      { label: 'Act before it cycles', copy: 'Footage is often overwritten within days.' },
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
      { label: 'Step 4', question: 'Were there witnesses?' },
    ],
  },
  [SF_SLIPFALL_SLUG]: {
    scenario: `A pedestrian tripped on a sidewalk slab lifted by a street tree, and assumed only the city could be responsible. Under San Francisco\u2019s ordinance the adjacent property owner was liable, and their insurance responded. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the defect with scale; note the adjacent property.'],
      ['First week', 'The responsible party \u2014 adjacent owner or city \u2014 identified.'],
      ['Six months', 'Deadline to present a claim if a public entity is responsible.'],
      ['Longer term', 'Prior-complaint and repair history gathered.'],
    ],
    severityLadder: [
      ['Minor', 'A fall with soft-tissue injury that resolves.'],
      ['Moderate', 'A fracture or injury needing ongoing care.'],
      ['Serious', 'Surgery, a head injury, or lasting impairment.'],
      ['Disputed party', 'Responsibility is contested between owner and city.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER or urgent-care records tie injuries to the fall.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the adjacent owner or the city is responsible',
      'Whether the notice requirement can be proved',
      'For a stairway, handrail, lighting, and surface condition',
      'Injury severity and treatment continuity',
      'Any prior complaints or repair history',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Adjacent-owner rule', copy: 'A sidewalk trip may be a private claim in SF.' },
      { label: 'Public means six months', copy: 'A city-responsible condition shortens the clock.' },
      { label: 'Terrain adds hazards', copy: 'Stairs, hills, and rain shape many SF falls.' },
      { label: 'Obvious is not a bar', copy: 'Comparative fault reduces rather than ends a claim.' },
    ],
    insuranceProblems: [
      'The claim is aimed only at the city and misses the adjacent owner.',
      'A public-property claim misses the six-month deadline.',
      'The defect is repaired before it is photographed.',
      'Rain is treated as excusing the owner.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where did you fall \u2014 sidewalk, stairs, or a building?' },
      { label: 'Step 2', question: 'What property is adjacent to the sidewalk?' },
      { label: 'Step 3', question: 'Was a public building or facility involved?' },
      { label: 'Step 4', question: 'Do you have photographs of the defect with scale?' },
    ],
  },
  [SD_SLIPFALL_SLUG]: {
    scenario: `A visiting guest slipped on an unmarked wet tile in a resort lobby and flew home two days later. Because the incident report and photographs were gathered before departure and the video was demanded promptly, the claim held together from out of state. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard; report it; get the incident report and manager.'],
      ['Before leaving', 'Evidence and witness details gathered while still in town.'],
      ['First days', 'Written demand sent to preserve the surveillance video.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Minor', 'A fall with soft-tissue injury that resolves.'],
      ['Moderate', 'A fracture or injury needing ongoing care.'],
      ['Serious', 'Surgery, a head injury, or lasting impairment.'],
      ['Out-of-area', 'The visitor leaves before evidence is gathered.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER or urgent-care records tie injuries to the fall.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the notice requirement can be proved',
      'Whether the surveillance video and logs were preserved',
      'For a pool deck, surfacing, warnings, and drainage',
      'Whether evidence was gathered before the visitor left',
      'Injury severity and treatment continuity',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Notice is the battle', copy: 'How long the hazard sat usually decides liability.' },
      { label: 'Pool decks are foreseeable', copy: 'Wet surfacing and warnings are often central.' },
      { label: 'Visitors can still claim', copy: 'California law governs regardless of home state.' },
      { label: 'Gather before leaving', copy: 'Evidence is far harder to collect after departure.' },
    ],
    insuranceProblems: [
      'The visitor leaves before securing the incident report.',
      'The resort video is overwritten before it is demanded.',
      'The resort claims no knowledge of the wet floor.',
      'The guest is blamed for not seeing the hazard.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What venue and exactly where did you fall?' },
      { label: 'Step 2', question: 'Did you get the incident report before leaving?' },
      { label: 'Step 3', question: 'Has a demand been sent to preserve the video?' },
      { label: 'Step 4', question: 'For a pool deck, what were the surfacing and warnings?' },
    ],
  },
  [SAC_SLIPFALL_SLUG]: {
    scenario: `A visitor fell on an unmarked level change in a state office lobby and nearly waited past the deadline. Recognising it as a dangerous-condition-of-public-property claim, a written claim reached the entity within six months. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard; report it; identify the building and owner.'],
      ['First week', 'Whether the property is public \u2014 and the six-month clock \u2014 confirmed.'],
      ['Six months', 'Deadline to present a written claim to the public entity.'],
      ['Longer term', 'Notice evidence and treatment documented.'],
    ],
    severityLadder: [
      ['Minor', 'A fall with soft-tissue injury that resolves.'],
      ['Moderate', 'A fracture or injury needing ongoing care.'],
      ['Serious', 'Surgery, a head injury, or lasting impairment.'],
      ['Public property', 'A dangerous-condition claim on the six-month clock.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'ER or urgent-care records tie injuries to the fall.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the fall was on public property',
      'Whether the six-month claim was presented in time',
      'Whether the notice requirement can be proved',
      'Injury severity and treatment continuity',
      'Any prior complaints or repair history',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Public means six months', copy: 'The capital\u2019s many public buildings shorten the clock.' },
      { label: 'Notice still applies', copy: 'The entity must have known or should have.' },
      { label: 'Stores are different', copy: 'Private falls run on the ordinary two years.' },
      { label: 'Obvious is not a bar', copy: 'Comparative fault reduces rather than ends a claim.' },
    ],
    insuranceProblems: [
      'A public-property claim misses the six-month deadline.',
      'The hazard is repaired before it is photographed.',
      'The store claims no knowledge and the video is gone.',
      'The visitor is blamed for not seeing the hazard.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the fall at a government building or on public property?' },
      { label: 'Step 2', question: 'What was the hazard and how long had it been there?' },
      { label: 'Step 3', question: 'Was an incident report made, and by whom?' },
      { label: 'Step 4', question: 'Do you have photographs of the hazard?' },
    ],
  },
}
