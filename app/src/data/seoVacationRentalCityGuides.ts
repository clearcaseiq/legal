import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, short-term vacation rental (Airbnb / Vrbo) guest injury practice
 * area: location-specific guides for Los Angeles, San Diego, Palm Springs, and
 * San Francisco.
 *
 * This is distinct from the hotel-guest and apartment-premises hubs: its
 * signature issues are a residential host\u2019s duty (a home that usually lacks
 * commercial safety features), the role and insurance of the booking platform,
 * and the coverage gap created when a homeowner\u2019s policy excludes commercial use.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: an enormous short-term-rental market across neighborhoods and
 *    the hills.
 *  - San Diego: beach and tourist-district vacation homes with pools and decks.
 *  - Palm Springs: a resort market of private pool-and-spa vacation homes in the
 *    desert.
 *  - San Francisco: dense homes and flats with steep stairs and decks.
 *
 * Applied accurately:
 *  - A short-term-rental host owes guests \u2014 who are invitees \u2014 a duty to keep the
 *    property reasonably safe and to warn of known dangers, but a private home
 *    often lacks the commercial safety features and inspections a hotel has.
 *  - Booking platforms market host-protection insurance (for example, coverage
 *    up to a stated limit for guest injuries); the platform\u2019s own direct
 *    liability is contested and often limited, so the host\u2019s conduct and that
 *    host-liability coverage are usually the practical focus.
 *  - Common hazards follow their own rules: pools and spas under the Swimming
 *    Pool Safety Act (Health and Safety Code section 115920 and related
 *    provisions), stairs, decks, and balconies, and required smoke and
 *    carbon-monoxide alarms (Health and Safety Code sections 13113.7, 17926, and
 *    13260 and related provisions).
 *  - Insurance is the hidden problem: a host\u2019s ordinary homeowner or renter
 *    policy may exclude business or commercial use, so identifying the platform\u2019s
 *    host-liability coverage and any separate short-term-rental policy is often
 *    decisive.
 *  - The evidence is time-sensitive: the listing and its photos, the booking and
 *    messages, photographs of the hazard, and any alarm or pool-barrier
 *    condition should be captured before the host changes the property. A
 *    personal-injury deadline is generally two years (Code of Civil Procedure
 *    section 335.1).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a host breached a duty, which insurance applies, and which deadline governs depend on facts a licensed California attorney should review promptly.'

const HOST =
  'A short-term-rental host owes guests \u2014 who are invitees \u2014 a duty to keep the property reasonably safe and to warn of known dangers. But a private home often lacks the commercial safety features, signage, and routine inspections a hotel has, so ordinary residential hazards become the recurring source of serious guest injuries.'

const PLATFORM =
  'Booking platforms market host-protection insurance that can cover guest injuries up to a stated limit, but a platform\u2019s own direct liability for a host\u2019s property is contested and often limited. As a practical matter, the host\u2019s conduct and the platform\u2019s host-liability coverage \u2014 rather than a claim against the platform itself \u2014 are usually the focus.'

const HAZARDS =
  'Common vacation-rental hazards follow their own rules: pools and spas under the Swimming Pool Safety Act (Health and Safety Code section 115920 and related provisions); stairs, decks, and balconies that must be maintained; and required smoke and carbon-monoxide alarms (Health and Safety Code sections 13113.7, 17926, and 13260 and related provisions). Missing barriers or alarms are frequent failures.'

const INSURANCE =
  'Insurance is the hidden problem. A host\u2019s ordinary homeowner or renter policy may exclude business or commercial use, which can leave a guest\u2019s injury uncovered unless the platform\u2019s host-liability insurance or a separate short-term-rental policy responds. Identifying which coverage actually applies is often decisive to the outcome.'

const EVIDENCE =
  'Vacation-rental evidence is time-sensitive: the listing and its photos, the booking record and host messages, photographs of the hazard, and the condition of any pool barrier, deck, or alarm should be captured before the host repairs or relists the property. A personal-injury deadline is generally two years (Code of Civil Procedure section 335.1).'

export const LA_STR_SLUG = '/los-angeles-vacation-rental-injury-claim'
export const SD_STR_SLUG = '/san-diego-vacation-rental-injury-claim'
export const PS_STR_SLUG = '/palm-springs-vacation-rental-injury-claim'
export const SF_STR_SLUG = '/san-francisco-vacation-rental-injury-claim'

export const vacationRentalCityGuidePages: LandingPage[] = [
  {
    slug: LA_STR_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Vacation Rental Injury Claims',
    title: 'Los Angeles Airbnb & Vacation Rental Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at an LA Airbnb or Vrbo? A host\u2019s duty, the platform\u2019s insurance, and a homeowner-policy coverage gap all shape the claim.',
    psychology: 'I was injured at an LA vacation rental and the host says their insurance will not cover it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles airbnb injury lawyer',
      'vacation rental injury claim california',
      'vrbo accident lawsuit california',
      'airbnb host liability insurance california',
      'short term rental pool injury california',
    ],
    signals: [
      'Host duty to keep property safe',
      'Platform host-liability insurance',
      'Homeowner-policy commercial-use gap',
      'Pool, stairs & alarm hazards',
      'Preserve the listing and messages',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles has an enormous short-term-rental market across its neighborhoods and hillside homes, where residential properties without commercial safety features host paying guests. ${HOST} ${PLATFORM} ${HAZARDS} ${INSURANCE} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The listing, platform, and booking record',
        'Messages with the host before and after',
        'Photographs of the hazard that caused the injury',
        'Whether a pool barrier or alarm was missing',
        'Whether the home lacked basic safety features',
        'The host\u2019s insurance and the platform\u2019s coverage',
        'The medical treatment you received',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps an LA guest preserve the listing, photos, and host messages, document the hazard, and identify whether the platform\u2019s host-liability coverage applies where a homeowner policy excludes commercial use. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The host says their homeowner policy will not cover me. Am I out of luck?',
        a: 'Not necessarily. A homeowner policy may exclude commercial use, but the platform\u2019s host-liability insurance or a separate short-term-rental policy may respond. Identifying which coverage applies is often the key issue.',
      },
      {
        q: 'Can I sue the platform, like Airbnb or Vrbo?',
        a: 'A platform\u2019s direct liability is contested and often limited. In practice, the focus is usually on the host\u2019s conduct and the platform\u2019s host-liability coverage rather than a claim against the platform itself.',
      },
      {
        q: 'I was hurt by the pool at the rental. What rules apply?',
        a: 'Pools and spas are governed by the Swimming Pool Safety Act, and a missing or defective barrier can be central. A host\u2019s duty to keep the property reasonably safe covers pools, stairs, decks, and required alarms.',
      },
      {
        q: 'What should I preserve right away?',
        a: 'The listing and its photos, the booking record and host messages, photographs of the hazard, and the condition of any pool barrier or alarm \u2014 before the host repairs or relists the property.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the evidence, the coverage, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_STR_SLUG,
    category: 'Cities',
    cluster: 'San Diego Vacation Rental Injury Claims',
    title: 'San Diego Airbnb & Vacation Rental Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a San Diego beach vacation rental? A host\u2019s duty, the platform\u2019s insurance, and pool or deck hazards all shape the claim.',
    psychology: 'We rented a San Diego beach house and someone was hurt on the deck stairs.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego airbnb injury lawyer',
      'vacation rental injury claim california',
      'beach house rental accident california',
      'airbnb host liability insurance california',
      'short term rental deck collapse california',
    ],
    signals: [
      'Host duty to keep property safe',
      'Platform host-liability insurance',
      'Homeowner-policy commercial-use gap',
      'Pool, deck & stair hazards',
      'Preserve the listing and messages',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s beach and tourist-district vacation homes come with pools, decks, and stairs that see heavy guest use, and coastal decks and balconies in particular are a recurring failure point. ${HOST} ${PLATFORM} ${HAZARDS} ${INSURANCE} ${EVIDENCE} Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The listing, platform, and booking record',
        'Messages with the host before and after',
        'Photographs of the hazard that caused the injury',
        'The condition of any deck, balcony, or stairs',
        'Whether a pool barrier or alarm was missing',
        'The host\u2019s insurance and the platform\u2019s coverage',
        'The medical treatment you received',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Diego guest document a failed deck, balcony, or stair, preserve the listing and host messages, and identify whether the platform\u2019s host-liability coverage applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A deck or balcony gave way at the rental. Who is responsible?',
        a: 'The host, for failing to maintain the deck or balcony under the duty to keep the property reasonably safe, and potentially a contractor for defective work. Coastal decks require particular maintenance, and their condition should be preserved.',
      },
      {
        q: 'The host says their insurance excludes rentals. What now?',
        a: 'A homeowner policy may exclude commercial use, but the platform\u2019s host-liability insurance or a separate short-term-rental policy may respond. Identifying the applicable coverage is often the key issue.',
      },
      {
        q: 'Can I bring a California claim if I live elsewhere?',
        a: 'Generally yes. A claim over an injury at a California vacation rental is typically brought in California regardless of where the guest lives.',
      },
      {
        q: 'What should I preserve?',
        a: 'The listing and its photos, the booking record and host messages, photographs of the hazard, and the condition of any deck, pool barrier, or alarm \u2014 before the host repairs the property.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the coverage, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: PS_STR_SLUG,
    category: 'Cities',
    cluster: 'Palm Springs Vacation Rental Injury Claims',
    title: 'Palm Springs Vacation Rental & Pool Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Palm Springs pool-home rental? Pool and spa safety rules, a host\u2019s duty, and the platform\u2019s insurance all shape the claim.',
    psychology: 'Someone was hurt at the pool of our Palm Springs vacation rental with no safety barrier.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'palm springs vacation rental injury lawyer',
      'pool home rental drowning claim california',
      'airbnb pool injury lawsuit california',
      'short term rental pool safety act california',
      'airbnb host liability insurance california',
    ],
    signals: [
      'Host duty to keep property safe',
      'Swimming Pool Safety Act barriers',
      'Platform host-liability insurance',
      'Homeowner-policy commercial-use gap',
      'Preserve the listing and pool condition',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Palm Springs is a resort market built on private pool-and-spa vacation homes in the desert, which makes pool and spa safety the central issue \u2014 unfenced pools, missing barriers, and unmarked depths are recurring hazards for guests and their children. ${HOST} ${HAZARDS} ${PLATFORM} ${INSURANCE} ${EVIDENCE} Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'The listing, platform, and booking record',
        'The pool and spa condition and any barrier',
        'Photographs of the hazard that caused the injury',
        'Whether depths or hazards were marked',
        'Messages with the host before and after',
        'The host\u2019s insurance and the platform\u2019s coverage',
        'The medical treatment received',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Palm Springs guest document the pool or spa condition and any missing barrier, preserve the listing and host messages, and identify whether the platform\u2019s host-liability coverage applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The rental pool had no fence or barrier. Does that matter?',
        a: 'It can be central. Pools and spas are governed by the Swimming Pool Safety Act, and a missing or defective barrier \u2014 especially where children are present \u2014 can support a claim within the host\u2019s duty to keep the property reasonably safe.',
      },
      {
        q: 'The host says their homeowner policy will not cover the pool injury. What now?',
        a: 'A homeowner policy may exclude commercial use, but the platform\u2019s host-liability insurance or a separate short-term-rental policy may respond. Identifying the applicable coverage is often the key issue.',
      },
      {
        q: 'What if a child was hurt at the pool?',
        a: 'Children receive heightened protection, and an unsecured pool can be especially significant. The pool\u2019s condition, barrier, and any warnings should be documented before anything is changed.',
      },
      {
        q: 'What should I preserve?',
        a: 'The listing and its photos, the pool and spa condition, photographs of the hazard, the booking record and host messages \u2014 before the host repairs or relists the property.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the coverage, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_STR_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Vacation Rental Injury Claims',
    title: 'San Francisco Airbnb & Vacation Rental Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a San Francisco Airbnb or flat? Steep stairs, a host\u2019s duty, and the platform\u2019s insurance all shape the claim.',
    psychology: 'I fell on the steep stairs of a San Francisco Airbnb flat and was badly hurt.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco airbnb injury lawyer',
      'vacation rental stair fall claim california',
      'vrbo accident lawsuit california',
      'airbnb host liability insurance california',
      'short term rental injury california',
    ],
    signals: [
      'Host duty to keep property safe',
      'Platform host-liability insurance',
      'Homeowner-policy commercial-use gap',
      'Stair, deck & alarm hazards',
      'Preserve the listing and messages',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s dense homes and flats \u2014 often with steep interior stairs, exterior steps, and decks \u2014 are heavily used as short-term rentals, and stairway falls from missing handrails or poor lighting are a leading injury there. ${HOST} ${PLATFORM} ${HAZARDS} ${INSURANCE} ${EVIDENCE} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'The listing, platform, and booking record',
        'The stairway, handrail, and lighting condition',
        'Photographs of the hazard that caused the injury',
        'Messages with the host before and after',
        'Whether required alarms were present',
        'The host\u2019s insurance and the platform\u2019s coverage',
        'The medical treatment received',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Francisco guest document a stairway, handrail, or lighting defect, preserve the listing and host messages, and identify whether the platform\u2019s host-liability coverage applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I fell on steep stairs with no handrail. Is that a claim?',
        a: 'It can be. A host\u2019s duty to keep the property reasonably safe covers stairs, handrails, and lighting, and a missing handrail or poor lighting that causes a fall can support liability.',
      },
      {
        q: 'The host says their policy excludes short-term rentals. What now?',
        a: 'A homeowner policy may exclude commercial use, but the platform\u2019s host-liability insurance or a separate short-term-rental policy may respond. Identifying the applicable coverage is often the key issue.',
      },
      {
        q: 'Can I sue the platform itself?',
        a: 'A platform\u2019s direct liability is contested and often limited, so the practical focus is usually the host\u2019s conduct and the platform\u2019s host-liability coverage rather than a claim against the platform.',
      },
      {
        q: 'What should I preserve?',
        a: 'The listing and its photos, the stairway and handrail condition, photographs of the hazard, and the booking record and host messages \u2014 before the host repairs or relists the property.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the coverage, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const vacationRentalCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_STR_SLUG]: {
    scenario: `An LA guest was injured by a hazard the host knew about. The homeowner policy excluded rentals, but the platform\u2019s host-liability coverage responded once the listing and messages were preserved. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Photograph the hazard; save the listing.'],
      ['Preserve', 'Keep the booking record and host messages.'],
      ['Coverage', 'Identify host and platform insurance.'],
      ['Longer term', 'Host-liability claim developed.'],
    ],
    severityLadder: [
      ['Host duty', 'A home must be reasonably safe.'],
      ['No commercial features', 'Homes lack hotel safeguards.'],
      ['Coverage gap', 'Homeowner policies may exclude rentals.'],
      ['Platform coverage', 'Host-liability insurance may respond.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Rental injuries can be severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the host knew of the hazard',
      'Whether the property lacked safety features',
      'Which insurance actually applies',
      'Whether the listing and messages were preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Find the coverage', copy: 'Platform insurance may fill the gap.' },
      { label: 'Preserve the listing', copy: 'Photos show the condition.' },
      { label: 'Messages matter', copy: 'They can show host knowledge.' },
      { label: 'Home vs. hotel', copy: 'Missing safeguards support the claim.' },
    ],
    insuranceProblems: [
      'The homeowner policy excludes commercial use.',
      'The platform\u2019s host-liability coverage is never pursued.',
      'The listing is changed before it is preserved.',
      'Host messages are not saved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What hazard caused the injury?' },
      { label: 'Step 2', question: 'Do you have the listing and messages?' },
      { label: 'Step 3', question: 'What platform and host were involved?' },
      { label: 'Step 4', question: 'What treatment did you receive?' },
    ],
  },
  [SD_STR_SLUG]: {
    scenario: `A San Diego beach-house deck railing failed during a rental stay. Photos of the weathered deck and the host\u2019s prior awareness supported a claim, with the platform\u2019s coverage responding. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Photograph the deck and hazard.'],
      ['Preserve', 'Save the listing, booking, and messages.'],
      ['Coverage', 'Identify host and platform insurance.'],
      ['Longer term', 'Host and contractor theories developed.'],
    ],
    severityLadder: [
      ['Host duty', 'A home must be reasonably safe.'],
      ['Deck/railing', 'Coastal decks need maintenance.'],
      ['Coverage gap', 'Homeowner policies may exclude rentals.'],
      ['Platform coverage', 'Host-liability insurance may respond.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Fall injuries can be severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the deck was poorly maintained',
      'Whether the host knew of the condition',
      'Which insurance actually applies',
      'Whether the deck condition was preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Preserve the deck', copy: 'Its condition is key evidence.' },
      { label: 'Find the coverage', copy: 'Platform insurance may fill the gap.' },
      { label: 'Contractor path', copy: 'Defective work can add a defendant.' },
      { label: 'Home vs. hotel', copy: 'Missing safeguards support the claim.' },
    ],
    insuranceProblems: [
      'The deck is repaired before it is documented.',
      'The homeowner policy excludes commercial use.',
      'The platform\u2019s host-liability coverage is never pursued.',
      'Host messages are not saved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What structure or hazard failed?' },
      { label: 'Step 2', question: 'Do you have photos of its condition?' },
      { label: 'Step 3', question: 'What platform and host were involved?' },
      { label: 'Step 4', question: 'What treatment did you receive?' },
    ],
  },
  [PS_STR_SLUG]: {
    scenario: `A child was hurt at an unfenced pool of a Palm Springs rental. The missing barrier under the Pool Safety Act, documented before changes, anchored the claim, with the platform\u2019s coverage in play. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Photograph the pool and any barrier.'],
      ['Preserve', 'Save the listing, booking, and messages.'],
      ['Coverage', 'Identify host and platform insurance.'],
      ['Longer term', 'Pool-safety theories developed.'],
    ],
    severityLadder: [
      ['Host duty', 'A home must be reasonably safe.'],
      ['Pool barrier', 'The Safety Act requires it.'],
      ['Children', 'Heightened protection applies.'],
      ['Platform coverage', 'Host-liability insurance may respond.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Pool injuries can be severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether a required pool barrier was missing',
      'Whether depths and hazards were marked',
      'Which insurance actually applies',
      'Whether the pool condition was preserved',
      'The severity of the injuries',
      'Whether a child was involved',
    ],
    settlementValueDetails: [
      { label: 'Barrier is central', copy: 'The Safety Act requires it.' },
      { label: 'Children protected', copy: 'Unsecured pools are significant.' },
      { label: 'Find the coverage', copy: 'Platform insurance may fill the gap.' },
      { label: 'Preserve the pool', copy: 'Its condition is key evidence.' },
    ],
    insuranceProblems: [
      'The pool is fenced only after the injury.',
      'The homeowner policy excludes commercial use.',
      'The platform\u2019s host-liability coverage is never pursued.',
      'The pool condition is not documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was there a pool barrier or fence?' },
      { label: 'Step 2', question: 'Was a child involved?' },
      { label: 'Step 3', question: 'Do you have photos of the pool?' },
      { label: 'Step 4', question: 'What platform and host were involved?' },
    ],
  },
  [SF_STR_SLUG]: {
    scenario: `A San Francisco guest fell on a steep flat\u2019s stairs with no handrail and poor lighting. Photos of the stairway and the preserved listing supported a claim, with the platform\u2019s coverage responding. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Photograph the stairs, handrail, and lighting.'],
      ['Preserve', 'Save the listing, booking, and messages.'],
      ['Coverage', 'Identify host and platform insurance.'],
      ['Longer term', 'Host-liability claim developed.'],
    ],
    severityLadder: [
      ['Host duty', 'A home must be reasonably safe.'],
      ['Stairs', 'Handrails and lighting matter.'],
      ['Coverage gap', 'Homeowner policies may exclude rentals.'],
      ['Platform coverage', 'Host-liability insurance may respond.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Stair-fall injuries can be severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether a handrail was missing',
      'Whether lighting was inadequate',
      'Which insurance actually applies',
      'Whether the stairway condition was preserved',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Handrail matters', copy: 'Its absence can cause a fall.' },
      { label: 'Lighting matters', copy: 'Poor lighting adds risk.' },
      { label: 'Find the coverage', copy: 'Platform insurance may fill the gap.' },
      { label: 'Preserve the stairs', copy: 'Their condition is key evidence.' },
    ],
    insuranceProblems: [
      'A handrail is added only after the fall.',
      'The homeowner policy excludes commercial use.',
      'The platform\u2019s host-liability coverage is never pursued.',
      'The stairway condition is not documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was wrong with the stairs?' },
      { label: 'Step 2', question: 'Do you have photos of the stairway?' },
      { label: 'Step 3', question: 'What platform and host were involved?' },
      { label: 'Step 4', question: 'What treatment did you receive?' },
    ],
  },
}
