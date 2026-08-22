import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, boating and watercraft practice area: location-specific guides for
 * San Diego, the Sacramento-San Joaquin Delta, Long Beach, and Newport Beach.
 *
 * A new, geography-driven practice area: these are the California waters where
 * recreational boating, personal watercraft, and rentals concentrate, and where
 * boating-injury claims actually arise.
 *
 * Local context, genuine rather than interpolated:
 *  - San Diego: heavy recreational boating and jet-ski use on San Diego Bay and
 *    Mission Bay, with dense rental operations serving tourists.
 *  - Sacramento-San Joaquin Delta: a vast network of waterways popular for
 *    houseboats, water-skiing, and wakeboarding, with narrow channels and mixed
 *    traffic.
 *  - Long Beach: the harbor and Alamitos Bay, mixing recreational craft with
 *    commercial and port traffic.
 *  - Newport Beach: one of the largest recreational harbors on the West Coast,
 *    with intense summer congestion and rental activity.
 *
 * Applied accurately:
 *  - California's Harbors and Navigation Code governs vessel operation, including
 *    the prohibition on boating under the influence (a 0.08 blood-alcohol limit
 *    for operators, Harbors and Navigation Code section 655), speed and
 *    right-of-way rules, and equipment requirements.
 *  - Claims can lie against a negligent operator, a rental company (for a
 *    defective vessel, inadequate instruction, or renting to an unfit operator),
 *    a manufacturer (product defect), or another boater.
 *  - Incidents on navigable waters can fall under federal maritime (admiralty)
 *    law, which can change the applicable rules and deadlines; a maritime
 *    personal-injury claim often carries a three-year limit, while a California
 *    state claim carries the two-year deadline (Code of Civil Procedure section
 *    335.1). Which applies is fact-specific and should be assessed promptly.
 *  - Pure comparative negligence, with the six-month Government Claims Act
 *    deadline where a public entity (for example, a harbor district) is involved.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether federal maritime law or California law applies, which deadline controls, and how comparative fault is assessed depend on facts a licensed California attorney should review promptly.'

const RULES =
  'California\u2019s Harbors and Navigation Code governs how vessels must be operated \u2014 including speed and right-of-way rules, equipment requirements, and the prohibition on boating under the influence, which sets a 0.08 blood-alcohol limit for operators under Harbors and Navigation Code section 655. A violation of these rules, such as excessive speed in a congested area or an intoxicated operator, is frequently the core of a boating-injury claim.'

const PARTIES =
  'Responsibility often extends beyond the operator at the wheel. A rental company can be liable for renting a defective vessel, for giving inadequate instruction, or for renting to someone plainly unfit to operate; a manufacturer can be liable for a product defect; and another boater can be liable for a collision. Identifying every responsible party is what opens the coverage a serious on-water injury requires.'

const MARITIME =
  'A boating incident on navigable waters can fall under federal maritime (admiralty) law rather than, or alongside, California law, and that distinction can change the rules that apply and the deadline to sue \u2014 a maritime personal-injury claim often carries a three-year limit, while a California state claim carries a two-year deadline. Because which framework applies is fact-specific, and getting it wrong can forfeit a claim, an early assessment is especially important in boating cases.'

const EVIDENCE =
  'On-water evidence is uniquely perishable: there is rarely a police report of the usual kind, witnesses scatter, rental and instruction records can be discarded, and the vessels are moved or repaired quickly. Identifying the operators and their insurance, the rental company, and any witnesses \u2014 and photographing the vessels and the scene \u2014 early is critical.'

export const SD_BOATING_SLUG = '/san-diego-boating-accident'
export const DELTA_BOATING_SLUG = '/sacramento-delta-boating-accident'
export const LONGBEACH_BOATING_SLUG = '/long-beach-boating-accident'
export const NEWPORT_BOATING_SLUG = '/newport-beach-boating-accident'

export const boatingCityGuidePages: LandingPage[] = [
  {
    slug: SD_BOATING_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Boating Accident Claims',
    title: 'San Diego Boating Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a boat or jet-ski accident on San Diego or Mission Bay? A claim can reach the operator, a rental company, or a manufacturer \u2014 and whether federal maritime or California law applies can change your deadline.',
    psychology: 'I was hurt in a boating or jet-ski accident in San Diego and do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego boating accident claim',
      'jet ski rental accident who is liable california',
      'boating under the influence injury california',
      'boat accident maritime law deadline california',
      'injured on a rented boat san diego',
    ],
    signals: [
      'Harbors & Navigation Code',
      'Boating under the influence (655)',
      'Rental-operator liability',
      'Jet-ski / personal watercraft',
      'Maritime vs. California law',
      'Perishable on-water evidence',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s protected bays \u2014 San Diego Bay and Mission Bay \u2014 host some of the densest recreational boating and personal-watercraft use in the state, much of it by tourists on rented boats and jet skis, which shapes the injury pattern. ${RULES} On crowded summer water, excessive speed, reckless wake, and operating under the influence are recurring causes. ${PARTIES} The heavy rental market makes the rental-company path especially important here, whether for a defective craft, cursory instruction, or renting to an obviously unfit operator. ${MARITIME} ${EVIDENCE} Pure comparative negligence applies, and the six-month Government Claims Act deadline can apply if a harbor or public entity is involved. Civil cases are filed in San Diego County Superior Court, though a maritime claim may proceed under federal rules.`,
      whatToTrack: [
        'The operators of each vessel and their insurance',
        'The rental company and its instruction and rental records',
        'Whether an operator was under the influence',
        'Whether a jet ski or personal watercraft was involved',
        'Whether the incident was on navigable waters (maritime law)',
        'Photographs of the vessels and the scene',
        'Witnesses, who scatter quickly on the water',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a San Diego boating claim around the Harbors and Navigation Code violations that often drive it, pursues the rental company alongside the operator, and flags early whether federal maritime law and its different deadline may apply \u2014 while prompting to capture the perishable on-water evidence. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a rented jet ski or boat. Can I claim against the rental company?',
        a: 'Possibly. A rental company can be liable for renting a defective vessel, for giving inadequate instruction, or for renting to someone plainly unfit to operate \u2014 in addition to the operator\u2019s own responsibility. San Diego\u2019s heavy rental market makes this path common, so the rental and instruction records matter.',
      },
      {
        q: 'The other operator had been drinking. Does that matter?',
        a: 'Yes. California prohibits boating under the influence, with a 0.08 blood-alcohol limit for operators under Harbors and Navigation Code section 655, and an intoxicated operator is frequently the core of a claim. Documenting the signs of impairment and any testing is important.',
      },
      {
        q: 'Does maritime law or California law apply to my case?',
        a: 'It depends on the facts. An incident on navigable waters can fall under federal maritime law, which can change the applicable rules and the deadline \u2014 a maritime personal-injury claim often carries a three-year limit while a California state claim carries two years. Because getting this wrong can forfeit a claim, an early assessment is especially important.',
      },
      {
        q: 'What should I do about evidence?',
        a: 'Act quickly. On-water evidence is uniquely perishable: witnesses scatter, rental and instruction records can be discarded, and vessels are moved or repaired. Identify the operators and their insurance, the rental company, and any witnesses, and photograph the vessels and scene as soon as possible.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the liability and maritime questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: DELTA_BOATING_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Delta Boating Accident Claims',
    title: 'Sacramento Delta Boating Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt boating, water-skiing, or on a houseboat in the Sacramento-San Joaquin Delta? A claim can reach the operator, a rental company, or a manufacturer \u2014 and the Delta\u2019s narrow channels and mixed traffic raise distinctive fault questions.',
    psychology: 'I was hurt in a boating accident in the Delta and do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento delta boating accident claim',
      'water skiing accident who is liable california',
      'houseboat rental accident california',
      'boating under the influence injury california',
      'boat collision narrow channel delta',
    ],
    signals: [
      'Harbors & Navigation Code',
      'Water-skiing / towed-sports rules',
      'Houseboat / rental liability',
      'Narrow-channel right-of-way',
      'Boating under the influence (655)',
      'Perishable on-water evidence',
    ],
    sections: {
      whyItMatters: `The Sacramento-San Joaquin Delta is one of the largest inland boating areas in the West \u2014 a maze of rivers, sloughs, and channels popular for houseboating, water-skiing, wakeboarding, and cruising \u2014 and its geography creates distinctive hazards. ${RULES} The Delta\u2019s narrow channels and blind bends make right-of-way and speed questions central, and its towed-sports popularity brings specific rules about observers, tow lines, and skier-down flags into play. ${PARTIES} Houseboat and ski-boat rentals are a large part of Delta recreation, so the rental-company path \u2014 defective equipment, inadequate instruction, or renting to an unfit operator \u2014 recurs. Alcohol is a frequent factor on multi-day houseboat trips, making the boating-under-the-influence rules important. ${MARITIME} ${EVIDENCE} Pure comparative negligence applies. Civil cases are filed in the county of the incident \u2014 often Sacramento, San Joaquin, or Contra Costa County Superior Court \u2014 though a maritime claim may proceed under federal rules.`,
      whatToTrack: [
        'The operators of each vessel and their insurance',
        'For towed sports, the observer, tow line, and skier-down flag',
        'Whether a narrow channel or blind bend was involved',
        'The rental company and its instruction and rental records',
        'Whether an operator was under the influence',
        'Whether the incident was on navigable waters (maritime law)',
        'Photographs of the vessels and the scene, and any witnesses',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Delta boating claim around the channel right-of-way, speed, and towed-sports rules that drive fault there, pursues houseboat and ski-boat rental companies alongside operators, and flags whether federal maritime law and its deadline may apply \u2014 while prompting to capture perishable evidence. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt water-skiing or wakeboarding. What rules apply?',
        a: 'California\u2019s Harbors and Navigation Code includes specific requirements for towed water sports, such as having a proper observer, and rules around tow lines and displaying a skier-down flag. A failure to follow these, along with an operator\u2019s speed and control, is often central to a towed-sports injury claim.',
      },
      {
        q: 'Two boats collided in a narrow Delta channel. Who is at fault?',
        a: 'It turns on right-of-way and speed. The Delta\u2019s narrow channels and blind bends make the navigation rules and each operator\u2019s speed and lookout central, and fault is assessed under those rules. Pure comparative negligence means fault can be shared, reducing rather than barring recovery.',
      },
      {
        q: 'The accident happened on a rented houseboat or ski boat. Can I claim against the rental company?',
        a: 'Possibly. A rental company can be liable for a defective vessel, inadequate instruction, or renting to someone plainly unfit to operate, in addition to the operator\u2019s responsibility. The rental and instruction records are important, so identifying the company early matters.',
      },
      {
        q: 'Does maritime law or California law apply?',
        a: 'It depends on the facts. An incident on navigable waters can fall under federal maritime law, which can change the rules and the deadline \u2014 often three years for a maritime personal-injury claim versus two years under California law. An early assessment is important because getting it wrong can forfeit a claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the liability and maritime questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LONGBEACH_BOATING_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Boating Accident Claims',
    title: 'Long Beach Boating Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt boating in Long Beach harbor or Alamitos Bay? A claim can reach the operator, a rental company, or a manufacturer \u2014 and mixing recreational craft with commercial and port traffic raises distinctive fault questions.',
    psychology: 'I was hurt in a boating accident in Long Beach and do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach boating accident claim',
      'jet ski rental accident who is liable california',
      'boat accident maritime law deadline california',
      'boating under the influence injury california',
      'recreational and commercial boat collision california',
    ],
    signals: [
      'Harbors & Navigation Code',
      'Recreational vs. commercial traffic',
      'Rental-operator liability',
      'Boating under the influence (655)',
      'Maritime vs. California law',
      'Perishable on-water evidence',
    ],
    sections: {
      whyItMatters: `Long Beach boating claims come from a busy mix of waters \u2014 the recreational activity of Alamitos Bay and the marina alongside the commercial and port traffic of one of the country\u2019s largest harbors. ${RULES} That mix is the distinctive local factor: recreational boaters and personal-watercraft riders share water with far larger commercial vessels, and collisions or wake incidents involving that traffic raise questions of right-of-way, speed, and which navigation rules govern. Where a commercial vessel is involved, the operator\u2019s employer and its insurance come into play, and a passenger on a commercial vessel may benefit from a common carrier\u2019s heightened duty. ${PARTIES} ${MARITIME} Harbor and port waters make the maritime-law question especially live here. ${EVIDENCE} Pure comparative negligence applies, and the six-month Government Claims Act deadline can apply if a harbor or public entity is involved. Civil cases are filed in Los Angeles County Superior Court, though a maritime claim may proceed under federal rules.`,
      whatToTrack: [
        'The operators of each vessel and their insurance',
        'Whether a commercial or port vessel was involved',
        'If a commercial vessel, its owner and operator\u2019s employer',
        'The rental company and its instruction and rental records',
        'Whether an operator was under the influence',
        'Whether the incident was on navigable waters (maritime law)',
        'Photographs of the vessels and the scene, and any witnesses',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Long Beach boating claim around the recreational-versus-commercial traffic mix, identifying a commercial vessel\u2019s owner and any common-carrier duty, pursuing the rental company alongside the operator, and flagging the maritime-law question that is especially live in harbor waters. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A commercial or charter vessel was involved. Does that change my claim?',
        a: 'It can. Where a commercial vessel is involved, its owner and the operator\u2019s employer come into play, bringing their insurance, and a passenger on a commercial vessel may benefit from a common carrier\u2019s heightened duty of care. Harbor and port waters also make the federal maritime-law question especially likely.',
      },
      {
        q: 'I was hurt on a rented boat or jet ski. Can I claim against the rental company?',
        a: 'Possibly. A rental company can be liable for a defective vessel, inadequate instruction, or renting to someone plainly unfit to operate, in addition to the operator\u2019s responsibility. Identifying the company and preserving the rental and instruction records early matters.',
      },
      {
        q: 'Does maritime law or California law apply?',
        a: 'It depends on the facts, and in Long Beach\u2019s harbor and port waters maritime law is especially likely to be in play. Maritime law can change the rules and the deadline \u2014 often three years for a maritime personal-injury claim versus two years under California law \u2014 so an early assessment is important.',
      },
      {
        q: 'The other operator had been drinking. Does that matter?',
        a: 'Yes. California prohibits boating under the influence, with a 0.08 blood-alcohol limit for operators under Harbors and Navigation Code section 655, and an intoxicated operator is frequently the core of a claim. Documenting impairment and any testing is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the liability and maritime questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: NEWPORT_BOATING_SLUG,
    category: 'Attorney Intent',
    cluster: 'Newport Beach Boating Accident Claims',
    title: 'Newport Beach Boating Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt boating in Newport Harbor? One of the West Coast\u2019s busiest recreational harbors packs boats, rentals, and personal watercraft into tight summer water. A claim can reach the operator, a rental company, or a manufacturer.',
    psychology: 'I was hurt in a boating accident in Newport Beach and do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'newport beach boating accident claim',
      'jet ski rental accident who is liable california',
      'boat collision crowded harbor california',
      'boating under the influence injury california',
      'injured on a rented boat newport beach',
    ],
    signals: [
      'Harbors & Navigation Code',
      'Harbor congestion / right-of-way',
      'Rental-operator liability',
      'Boating under the influence (655)',
      'Maritime vs. California law',
      'Perishable on-water evidence',
    ],
    sections: {
      whyItMatters: `Newport Harbor is one of the largest recreational boat harbors on the West Coast, and in summer it packs sailboats, powerboats, Duffy electric boats, kayaks, paddleboards, and personal watercraft into tight, congested water \u2014 the defining local hazard. ${RULES} In that congestion, speed, wake, and right-of-way are the recurring fault questions, and the mix of very different craft \u2014 fast powerboats near slow paddlecraft \u2014 makes collisions and wake injuries common. ${PARTIES} Newport\u2019s heavy rental and charter activity makes the rental-company path important, whether for a defective vessel, cursory instruction, or renting to an unfit operator. ${MARITIME} ${EVIDENCE} Pure comparative negligence applies, and the six-month Government Claims Act deadline can apply if a harbor or public entity is involved. Civil cases are filed in Orange County Superior Court, though a maritime claim may proceed under federal rules.`,
      whatToTrack: [
        'The operators of each vessel and their insurance',
        'The type of craft involved, from powerboats to paddlecraft',
        'Whether speed, wake, or right-of-way in congestion was a factor',
        'The rental or charter company and its records',
        'Whether an operator was under the influence',
        'Whether the incident was on navigable waters (maritime law)',
        'Photographs of the vessels and the scene, and any witnesses',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Newport Beach boating claim around the harbor-congestion speed, wake, and right-of-way questions that drive fault there, pursues the rental or charter company alongside the operator, and flags whether federal maritime law and its deadline may apply \u2014 while prompting to capture perishable evidence. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A powerboat\u2019s wake threw me from a paddleboard or small boat. Is that a claim?',
        a: 'Possibly. Operators are responsible for their wake and must operate at a safe speed for the conditions, and Newport\u2019s congestion mixes fast powerboats with slow paddlecraft. A wake or speed-related injury can support a claim under the Harbors and Navigation Code rules, with fault assessed under pure comparative negligence.',
      },
      {
        q: 'I was hurt on a rented or chartered boat. Can I claim against the company?',
        a: 'Possibly. A rental or charter company can be liable for a defective vessel, inadequate instruction, or renting to someone plainly unfit to operate, in addition to the operator\u2019s responsibility. Identifying the company and preserving the records early matters.',
      },
      {
        q: 'Does maritime law or California law apply?',
        a: 'It depends on the facts. An incident on navigable waters can fall under federal maritime law, which can change the rules and the deadline \u2014 often three years for a maritime personal-injury claim versus two years under California law. An early assessment is important because getting it wrong can forfeit a claim.',
      },
      {
        q: 'The other operator had been drinking. Does that matter?',
        a: 'Yes. California prohibits boating under the influence, with a 0.08 blood-alcohol limit for operators under Harbors and Navigation Code section 655, and an intoxicated operator is frequently the core of a claim. Documenting impairment and any testing is important.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the liability and maritime questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const boatingCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [SD_BOATING_SLUG]: {
    scenario: `A tourist was thrown from a rented jet ski when it was struck by a speeding boat on Mission Bay, and the operator claimed it was an accident no one could avoid. The rental records, the speeding operator\u2019s intoxication, and preserved witness details built the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify each operator and vessel; get insurance and witnesses.'],
      ['First days', 'The rental company and its records identified.'],
      ['First weeks', 'The maritime-vs.-California question assessed.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Operator fault', 'Speed, wake, or influence causes the injury.'],
      ['Rental path', 'A defect or bad instruction implicates the company.'],
      ['Maritime', 'Navigable-water rules and a different deadline.'],
      ['Serious harm', 'High-speed on-water impacts are severe.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether an operator violated the navigation rules',
      'Whether an operator was under the influence',
      'Whether a rental company is also responsible',
      'Whether maritime or California law and deadline apply',
      'Whether perishable evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Rules drive fault', copy: 'Speed, wake, and BUI anchor liability.' },
      { label: 'Rentals add coverage', copy: 'The company can be liable alongside the operator.' },
      { label: 'Deadline is fact-specific', copy: 'Maritime vs. state law changes the clock.' },
      { label: 'Move fast', copy: 'On-water evidence disappears quickly.' },
    ],
    insuranceProblems: [
      'The crash is dismissed as an unavoidable accident.',
      'The rental company\u2019s role is never examined.',
      'Witnesses scatter before they are identified.',
      'The wrong deadline is assumed and a claim is forfeited.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Who operated each vessel, and were any rented?' },
      { label: 'Step 2', question: 'Was speed, wake, or influence involved?' },
      { label: 'Step 3', question: 'Was the incident on navigable waters?' },
      { label: 'Step 4', question: 'Did you capture witnesses and photographs?' },
    ],
  },
  [DELTA_BOATING_SLUG]: {
    scenario: `A wakeboarder was hurt when the boat had no observer and turned into a blind Delta bend. The missing observer and the channel right-of-way rules established fault, and the ski-boat rental company\u2019s role was examined. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify operators and the observer; get insurance and witnesses.'],
      ['First days', 'The rental company and its records identified.'],
      ['First weeks', 'Channel right-of-way and towed-sports rules developed.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Towed sports', 'Observer and flag rules govern liability.'],
      ['Channel collision', 'Right-of-way and speed at blind bends.'],
      ['Rental path', 'A defect or bad instruction implicates the company.'],
      ['Serious harm', 'On-water impacts are severe.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether towed-sports rules (observer, flag) were followed',
      'Whether channel right-of-way and speed were violated',
      'Whether a rental company is also responsible',
      'Whether an operator was under the influence',
      'Whether maritime or California law and deadline apply',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Observer rules count', copy: 'Missing an observer is a powerful fact.' },
      { label: 'Channels drive fault', copy: 'Right-of-way at blind bends is central.' },
      { label: 'Rentals add coverage', copy: 'The company can be liable alongside the operator.' },
      { label: 'Move fast', copy: 'On-water evidence disappears quickly.' },
    ],
    insuranceProblems: [
      'The missing observer is never raised.',
      'The rental company\u2019s role is never examined.',
      'Witnesses scatter before they are identified.',
      'The wrong deadline is assumed and a claim is forfeited.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'For towed sports, was there a proper observer?' },
      { label: 'Step 2', question: 'Did a narrow channel or blind bend contribute?' },
      { label: 'Step 3', question: 'Was the boat rented, and from whom?' },
      { label: 'Step 4', question: 'Was any operator under the influence?' },
    ],
  },
  [LONGBEACH_BOATING_SLUG]: {
    scenario: `A recreational boater was injured by the wake of a commercial vessel in Long Beach harbor. Identifying the vessel\u2019s owner and operator\u2019s employer opened commercial coverage, and the maritime-law question was assessed early. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify each vessel and operator; note any commercial vessel.'],
      ['First days', 'A commercial vessel\u2019s owner and employer identified.'],
      ['First weeks', 'The maritime-vs.-California question assessed.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Recreational', 'Operator fault under the navigation rules.'],
      ['Commercial', 'The vessel owner and employer add coverage.'],
      ['Maritime', 'Harbor waters make maritime law likely.'],
      ['Serious harm', 'On-water impacts are severe.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a commercial or port vessel was involved',
      'The commercial vessel\u2019s owner and operator\u2019s employer',
      'Whether an operator violated the navigation rules',
      'Whether maritime or California law and deadline apply',
      'Whether perishable evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Commercial adds coverage', copy: 'The owner and employer bring larger policies.' },
      { label: 'Common carrier', copy: 'A commercial passenger may get a higher duty.' },
      { label: 'Maritime is likely', copy: 'Harbor waters raise the federal-law question.' },
      { label: 'Move fast', copy: 'On-water evidence disappears quickly.' },
    ],
    insuranceProblems: [
      'The commercial vessel\u2019s owner is never identified.',
      'The maritime-law question is ignored until too late.',
      'Witnesses scatter before they are identified.',
      'The rental company\u2019s role is never examined.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a commercial or port vessel involved?' },
      { label: 'Step 2', question: 'Who owned it and employed the operator?' },
      { label: 'Step 3', question: 'Was the incident on navigable harbor waters?' },
      { label: 'Step 4', question: 'Did you capture witnesses and photographs?' },
    ],
  },
  [NEWPORT_BOATING_SLUG]: {
    scenario: `A paddleboarder in crowded Newport Harbor was struck by a powerboat\u2019s wake and speed near the channel. The congestion, the operator\u2019s speed, and the charter company\u2019s role built the claim, with the maritime question assessed early. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify each craft and operator; get insurance and witnesses.'],
      ['First days', 'The rental or charter company and its records identified.'],
      ['First weeks', 'The maritime-vs.-California question assessed.'],
      ['Longer term', 'Treatment and comparative-fault position documented.'],
    ],
    severityLadder: [
      ['Congestion', 'Speed, wake, and right-of-way in tight water.'],
      ['Rental path', 'A defect or bad instruction implicates the company.'],
      ['Maritime', 'Navigable-water rules and a different deadline.'],
      ['Serious harm', 'On-water impacts are severe.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether speed, wake, or right-of-way in congestion was a factor',
      'Whether a rental or charter company is also responsible',
      'Whether an operator was under the influence',
      'Whether maritime or California law and deadline apply',
      'Whether perishable evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Congestion drives fault', copy: 'Speed and wake near paddlecraft are central.' },
      { label: 'Rentals add coverage', copy: 'The company can be liable alongside the operator.' },
      { label: 'Deadline is fact-specific', copy: 'Maritime vs. state law changes the clock.' },
      { label: 'Move fast', copy: 'On-water evidence disappears quickly.' },
    ],
    insuranceProblems: [
      'The wake or speed is dismissed as ordinary harbor risk.',
      'The rental or charter company\u2019s role is never examined.',
      'Witnesses scatter before they are identified.',
      'The wrong deadline is assumed and a claim is forfeited.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What craft were involved, and how congested was it?' },
      { label: 'Step 2', question: 'Was speed, wake, or right-of-way a factor?' },
      { label: 'Step 3', question: 'Was any vessel rented or chartered?' },
      { label: 'Step 4', question: 'Was the incident on navigable waters?' },
    ],
  },
}
