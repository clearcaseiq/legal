import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, short-term / vacation-rental guest-injury practice area (batch 2):
 * location-specific guides for California\u2019s mountain and coastal vacation-rental
 * destinations \u2014 South Lake Tahoe, Big Bear Lake, Santa Cruz, and Mammoth Lakes,
 * extending the batch-1 hub (Los Angeles, San Diego, Palm Springs, San Francisco).
 *
 * These markets are dominated by short-term rentals rather than hotels, so the
 * host-vs-platform, insurance-coverage, and residential-hazard issues are the
 * whole ballgame.
 *
 * Local context, genuine rather than interpolated:
 *  - South Lake Tahoe: cabins with lofts, steep decks, wood stoves and gas
 *    heaters (carbon-monoxide risk), hot tubs, and icy stairs in winter.
 *  - Big Bear Lake: mountain cabins with decks and lofts, space heaters and
 *    fireplaces, hot tubs, and snow-and-ice access hazards.
 *  - Santa Cruz: beach houses and older cottages with decks, stairs to the beach,
 *    pools, and deferred maintenance in a high-turnover coastal market.
 *  - Mammoth Lakes: ski-condo and cabin rentals with lofts, decks, gas
 *    appliances (carbon-monoxide risk), hot tubs, and heavy winter access hazards.
 *
 * Applied accurately (identical to batch 1):
 *  - Host owes guests (invitees) reasonable care; private homes lack commercial
 *    safety features.
 *  - Platform host-protection insurance vs. contested direct platform liability.
 *  - Pools/spas under the Swimming Pool Safety Act; stairs/decks/balconies;
 *    required smoke and CO alarms (Health & Safety Code 13113.7, 17926, 13260).
 *  - Homeowner policies may exclude commercial use; coverage identification is
 *    decisive. Evidence is time-sensitive; two-year deadline (CCP 335.1).
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

export const TAHOE_STR_SLUG = '/south-lake-tahoe-vacation-rental-injury-claim'
export const BIGBEAR_STR_SLUG = '/big-bear-vacation-rental-injury-claim'
export const SANTACRUZ_STR_SLUG = '/santa-cruz-vacation-rental-injury-claim'
export const MAMMOTH_STR_SLUG = '/mammoth-lakes-vacation-rental-injury-claim'

export const vacationRentalCityGuidePages2: LandingPage[] = [
  {
    slug: TAHOE_STR_SLUG,
    category: 'Cities',
    cluster: 'South Lake Tahoe Vacation Rental Injury Claims',
    title: 'South Lake Tahoe Vacation Rental Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a South Lake Tahoe cabin rental \u2014 a steep deck, an icy stair, a hot tub, or carbon monoxide from a heater? The host\u2019s duty and the right insurance are the key questions.',
    psychology: 'I was hurt at a Tahoe vacation rental and I do not know who is responsible or whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'south lake tahoe vacation rental injury lawyer',
      'airbnb injury claim california',
      'cabin rental carbon monoxide claim california',
      'vacation rental deck collapse california',
      'short term rental hot tub injury california',
    ],
    signals: [
      'Host duty to guests',
      'Platform host-liability insurance',
      'Deck / loft / stair hazards',
      'Carbon-monoxide alarms',
      'Hot tub / pool barriers',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `South Lake Tahoe\u2019s rentals are cabins with lofts, steep decks, wood stoves and gas heaters that carry carbon-monoxide risk, hot tubs, and stairs that ice over in winter \u2014 residential hazards that a private home often lacks the commercial safeguards to manage. ${HOST} ${PLATFORM} ${HAZARDS} ${INSURANCE} ${EVIDENCE} Civil cases are filed in El Dorado County Superior Court.`,
      whatToTrack: [
        'The exact hazard (deck, loft, stair, hot tub, heater)',
        'The listing, photos, booking record, and host messages',
        'Photographs of the hazard before repair or relisting',
        'Whether smoke and CO alarms were present and working',
        'For a hot tub or pool, the barrier and safety features',
        'The host\u2019s insurance and any platform host-liability coverage',
        'Medical treatment from the injury onward',
        'The date of the stay and the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the listing and hazard evidence from a Tahoe rental, checks the smoke and carbon-monoxide alarm compliance and any hot-tub barrier, and identifies which insurance \u2014 the host\u2019s policy or platform host-liability coverage \u2014 actually responds. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I got carbon-monoxide sick at a cabin with a gas heater. Is that a claim?',
        a: 'Possibly. California requires working carbon-monoxide alarms (Health and Safety Code section 17926 and related provisions). A carbon-monoxide injury in a rental with a missing or non-working alarm, especially with a gas heater or wood stove, points directly to a violation of the host\u2019s duty.',
      },
      {
        q: 'Can I sue the host, or the booking platform?',
        a: 'Usually the focus is the host\u2019s conduct and the platform\u2019s host-liability insurance rather than the platform itself, whose direct liability is contested and often limited. Identifying which coverage responds is frequently decisive.',
      },
      {
        q: 'Whose insurance pays if the host\u2019s homeowner policy excludes rentals?',
        a: 'That is the hidden problem. A host\u2019s ordinary homeowner policy may exclude commercial or business use, which can leave the injury uncovered unless the platform\u2019s host-liability insurance or a separate short-term-rental policy responds. Identifying the right coverage early matters.',
      },
      {
        q: 'What evidence should I capture right away?',
        a: 'The listing and its photos, the booking record and host messages, and photographs of the hazard before the host repairs or relists. This evidence is perishable, so capture it quickly.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the hazard evidence and the coverage question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BIGBEAR_STR_SLUG,
    category: 'Cities',
    cluster: 'Big Bear Vacation Rental Injury Claims',
    title: 'Big Bear Vacation Rental Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Big Bear cabin rental \u2014 a deck, a loft ladder, a hot tub, a fireplace, or a snowy stair? The host\u2019s duty and the right insurance are the key questions.',
    psychology: 'I was hurt at a Big Bear vacation rental and I do not know who is responsible or whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'big bear vacation rental injury lawyer',
      'airbnb injury claim california',
      'cabin rental deck collapse california',
      'vacation rental loft fall california',
      'short term rental hot tub injury california',
    ],
    signals: [
      'Host duty to guests',
      'Platform host-liability insurance',
      'Deck / loft / stair hazards',
      'Fireplace / heater safety',
      'Hot tub / pool barriers',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Big Bear Lake\u2019s rentals are mountain cabins with decks and lofts, space heaters and fireplaces, hot tubs, and access hazards from snow and ice \u2014 residential dangers a private home often lacks the commercial safeguards to control. ${HOST} ${PLATFORM} ${HAZARDS} ${INSURANCE} ${EVIDENCE} Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'The exact hazard (deck, loft ladder, stair, hot tub, fireplace)',
        'The listing, photos, booking record, and host messages',
        'Photographs of the hazard before repair or relisting',
        'Whether smoke and CO alarms were present and working',
        'For a hot tub or pool, the barrier and safety features',
        'The host\u2019s insurance and any platform host-liability coverage',
        'Medical treatment from the injury onward',
        'The date of the stay and the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the listing and hazard evidence from a Big Bear rental, checks the alarm compliance and any hot-tub barrier, and identifies which insurance \u2014 the host\u2019s policy or platform host-liability coverage \u2014 actually responds. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I fell from a loft ladder or a deck at a cabin. Can I claim?',
        a: 'Possibly. A host owes guests reasonable care to keep the property safe. A dangerous loft ladder, an unmaintained deck or railing, or an icy unlit stair the host knew or should have known about can breach that duty.',
      },
      {
        q: 'Can I sue the host, or the booking platform?',
        a: 'Usually the focus is the host\u2019s conduct and the platform\u2019s host-liability insurance rather than the platform itself, whose direct liability is contested and often limited. Identifying which coverage responds is frequently decisive.',
      },
      {
        q: 'Whose insurance pays if the host\u2019s homeowner policy excludes rentals?',
        a: 'A host\u2019s ordinary homeowner policy may exclude commercial or business use, which can leave the injury uncovered unless the platform\u2019s host-liability insurance or a separate short-term-rental policy responds. Identifying the right coverage early matters.',
      },
      {
        q: 'What evidence should I capture right away?',
        a: 'The listing and its photos, the booking record and host messages, and photographs of the hazard before the host repairs or relists. This evidence is perishable, so capture it quickly.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the hazard evidence and the coverage question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SANTACRUZ_STR_SLUG,
    category: 'Cities',
    cluster: 'Santa Cruz Vacation Rental Injury Claims',
    title: 'Santa Cruz Vacation Rental Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Santa Cruz beach-house rental \u2014 a deck, a beach stairway, a pool, or a deferred repair? The host\u2019s duty and the right insurance are the key questions.',
    psychology: 'I was hurt at a Santa Cruz vacation rental and I do not know who is responsible or whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'santa cruz vacation rental injury lawyer',
      'airbnb injury claim california',
      'beach house deck collapse california',
      'vacation rental stairway fall california',
      'short term rental pool injury california',
    ],
    signals: [
      'Host duty to guests',
      'Platform host-liability insurance',
      'Deck / beach-stair hazards',
      'Pool / spa barriers',
      'Deferred coastal maintenance',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Santa Cruz\u2019s rentals are beach houses and older cottages with decks, stairways down to the beach, pools, and salt-air-driven deferred maintenance in a high-turnover coastal market \u2014 residential hazards a private home often lacks the commercial safeguards to manage. ${HOST} ${PLATFORM} ${HAZARDS} ${INSURANCE} ${EVIDENCE} Civil cases are filed in Santa Cruz County Superior Court.`,
      whatToTrack: [
        'The exact hazard (deck, beach stairway, pool, railing)',
        'The listing, photos, booking record, and host messages',
        'Photographs of the hazard before repair or relisting',
        'For a pool or spa, the barrier and safety features',
        'Whether smoke and CO alarms were present and working',
        'The host\u2019s insurance and any platform host-liability coverage',
        'Medical treatment from the injury onward',
        'The date of the stay and the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the listing and hazard evidence from a Santa Cruz rental, checks any pool barrier and deck condition, and identifies which insurance \u2014 the host\u2019s policy or platform host-liability coverage \u2014 actually responds. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A weathered deck or beach stairway gave way. Can I claim?',
        a: 'Possibly. A host owes guests reasonable care to keep the property safe. A salt-air-weakened deck, an unmaintained beach stairway, or a broken railing the host knew or should have known about can breach that duty.',
      },
      {
        q: 'Can I sue the host, or the booking platform?',
        a: 'Usually the focus is the host\u2019s conduct and the platform\u2019s host-liability insurance rather than the platform itself, whose direct liability is contested and often limited. Identifying which coverage responds is frequently decisive.',
      },
      {
        q: 'Whose insurance pays if the host\u2019s homeowner policy excludes rentals?',
        a: 'A host\u2019s ordinary homeowner policy may exclude commercial or business use, which can leave the injury uncovered unless the platform\u2019s host-liability insurance or a separate short-term-rental policy responds. Identifying the right coverage early matters.',
      },
      {
        q: 'What evidence should I capture right away?',
        a: 'The listing and its photos, the booking record and host messages, and photographs of the hazard before the host repairs or relists. This evidence is perishable, so capture it quickly.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the hazard evidence and the coverage question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: MAMMOTH_STR_SLUG,
    category: 'Cities',
    cluster: 'Mammoth Lakes Vacation Rental Injury Claims',
    title: 'Mammoth Lakes Vacation Rental Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Mammoth Lakes ski-condo or cabin rental \u2014 a loft, a deck, a hot tub, a gas appliance, or a snowy stair? The host\u2019s duty and the right insurance are the key questions.',
    psychology: 'I was hurt at a Mammoth Lakes vacation rental and I do not know who is responsible or whose insurance applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'mammoth lakes vacation rental injury lawyer',
      'airbnb injury claim california',
      'ski condo carbon monoxide claim california',
      'vacation rental loft fall california',
      'short term rental hot tub injury california',
    ],
    signals: [
      'Host duty to guests',
      'Platform host-liability insurance',
      'Loft / deck / stair hazards',
      'Carbon-monoxide alarms',
      'Hot tub / spa barriers',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Mammoth Lakes\u2019 rentals are ski condos and cabins with lofts, decks, gas appliances that carry carbon-monoxide risk, hot tubs, and heavy winter access hazards \u2014 residential dangers a private home often lacks the commercial safeguards to control. ${HOST} ${PLATFORM} ${HAZARDS} ${INSURANCE} ${EVIDENCE} Civil cases are filed in Mono County Superior Court.`,
      whatToTrack: [
        'The exact hazard (loft, deck, stair, hot tub, gas appliance)',
        'The listing, photos, booking record, and host messages',
        'Photographs of the hazard before repair or relisting',
        'Whether smoke and CO alarms were present and working',
        'For a hot tub or spa, the barrier and safety features',
        'The host\u2019s insurance and any platform host-liability coverage',
        'Medical treatment from the injury onward',
        'The date of the stay and the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the listing and hazard evidence from a Mammoth rental, checks the smoke and carbon-monoxide alarm compliance and any hot-tub barrier, and identifies which insurance \u2014 the host\u2019s policy or platform host-liability coverage \u2014 actually responds. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I got carbon-monoxide sick at a ski condo with a gas appliance. Is that a claim?',
        a: 'Possibly. California requires working carbon-monoxide alarms (Health and Safety Code section 17926 and related provisions). A carbon-monoxide injury in a rental with a missing or non-working alarm, especially with a gas furnace, heater, or stove, points directly to a violation of the host\u2019s duty.',
      },
      {
        q: 'Can I sue the host, or the booking platform?',
        a: 'Usually the focus is the host\u2019s conduct and the platform\u2019s host-liability insurance rather than the platform itself, whose direct liability is contested and often limited. Identifying which coverage responds is frequently decisive.',
      },
      {
        q: 'Whose insurance pays if the host\u2019s homeowner policy excludes rentals?',
        a: 'A host\u2019s ordinary homeowner policy may exclude commercial or business use, which can leave the injury uncovered unless the platform\u2019s host-liability insurance or a separate short-term-rental policy responds. Identifying the right coverage early matters.',
      },
      {
        q: 'What evidence should I capture right away?',
        a: 'The listing and its photos, the booking record and host messages, and photographs of the hazard before the host repairs or relists. This evidence is perishable, so capture it quickly.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the hazard evidence and the coverage question so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const vacationRentalCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [TAHOE_STR_SLUG]: {
    scenario: `A Tahoe cabin guest was sickened by carbon monoxide from a gas heater in a unit with no working CO alarm. The missing alarm and the host\u2019s homeowner-policy exclusion made coverage the central fight. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard and alarms; save the listing.'],
      ['First days', 'Preserve the booking record and host messages; seek care.'],
      ['First weeks', 'Identify the host\u2019s and platform\u2019s insurance.'],
      ['Longer term', 'Duty, causation, and coverage developed.'],
    ],
    severityLadder: [
      ['The hazard', 'Deck, loft, stair, hot tub, or CO source.'],
      ['The duty', 'Host must keep the home safe.'],
      ['Alarms/barriers', 'Missing safety features breach it.'],
      ['Coverage', 'Which policy actually responds.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the stay.' },
      { label: 'Imaging/testing', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the hazard breached the host\u2019s duty',
      'Whether required alarms or barriers were missing',
      'Which insurance actually responds',
      'Whether the evidence was preserved',
      'Whether the host knew of the hazard',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Coverage is decisive', copy: 'Homeowner policies may exclude rentals.' },
      { label: 'Alarms are statutory', copy: 'Missing CO alarms breach the duty.' },
      { label: 'Preserve the listing', copy: 'It can change after the injury.' },
      { label: 'Platform coverage', copy: 'Host-liability insurance may respond.' },
    ],
    insuranceProblems: [
      'The applicable coverage is never identified.',
      'The listing and hazard are never preserved.',
      'Alarm and barrier compliance goes unexamined.',
      'The host\u2019s prior knowledge is never pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What hazard caused the injury?' },
      { label: 'Step 2', question: 'Were smoke and CO alarms working?' },
      { label: 'Step 3', question: 'Did you save the listing and booking record?' },
      { label: 'Step 4', question: 'Who hosted the rental and on what platform?' },
    ],
  },
  [BIGBEAR_STR_SLUG]: {
    scenario: `A Big Bear guest fell through a rotted deck railing the host had been warned about. The prior host messages established notice, and the platform\u2019s host-liability coverage responded. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard; save the listing.'],
      ['First days', 'Preserve the booking record and host messages; seek care.'],
      ['First weeks', 'Identify the host\u2019s and platform\u2019s insurance.'],
      ['Longer term', 'Duty, notice, and coverage developed.'],
    ],
    severityLadder: [
      ['The hazard', 'Deck, loft ladder, stair, or hot tub.'],
      ['The duty', 'Host must keep the home safe.'],
      ['Notice', 'Prior warnings show the host knew.'],
      ['Coverage', 'Which policy actually responds.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the stay.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the hazard breached the host\u2019s duty',
      'Whether the host had notice of the hazard',
      'Which insurance actually responds',
      'Whether the evidence was preserved',
      'Whether alarms and barriers complied',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Notice matters', copy: 'Host messages can prove knowledge.' },
      { label: 'Coverage is decisive', copy: 'Homeowner policies may exclude rentals.' },
      { label: 'Preserve the listing', copy: 'It can change after the injury.' },
      { label: 'Platform coverage', copy: 'Host-liability insurance may respond.' },
    ],
    insuranceProblems: [
      'The applicable coverage is never identified.',
      'The host messages showing notice are never preserved.',
      'The listing and hazard are never documented.',
      'Alarm and barrier compliance goes unexamined.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What hazard caused the injury?' },
      { label: 'Step 2', question: 'Had the host been warned about it?' },
      { label: 'Step 3', question: 'Did you save the listing and messages?' },
      { label: 'Step 4', question: 'Who hosted the rental and on what platform?' },
    ],
  },
  [SANTACRUZ_STR_SLUG]: {
    scenario: `A Santa Cruz beach-house guest fell when a salt-air-weakened stairway to the beach collapsed. Photos before the host rebuilt it, plus the coverage question, drove the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard; save the listing.'],
      ['First days', 'Preserve the booking record and host messages; seek care.'],
      ['First weeks', 'Identify the host\u2019s and platform\u2019s insurance.'],
      ['Longer term', 'Duty, causation, and coverage developed.'],
    ],
    severityLadder: [
      ['The hazard', 'Deck, beach stairway, pool, or railing.'],
      ['The duty', 'Host must keep the home safe.'],
      ['Maintenance', 'Salt-air decay must be addressed.'],
      ['Coverage', 'Which policy actually responds.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the stay.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the hazard breached the host\u2019s duty',
      'Whether deferred maintenance was a cause',
      'Which insurance actually responds',
      'Whether the evidence was preserved',
      'Whether a pool barrier complied',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Preserve the hazard', copy: 'Photos before rebuild are critical.' },
      { label: 'Coverage is decisive', copy: 'Homeowner policies may exclude rentals.' },
      { label: 'Maintenance matters', copy: 'Salt-air decay is foreseeable.' },
      { label: 'Platform coverage', copy: 'Host-liability insurance may respond.' },
    ],
    insuranceProblems: [
      'The applicable coverage is never identified.',
      'The condition is rebuilt before it is documented.',
      'The listing and booking record are never preserved.',
      'Pool-barrier compliance goes unexamined.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What hazard caused the injury?' },
      { label: 'Step 2', question: 'Did you photograph it before any repair?' },
      { label: 'Step 3', question: 'Did you save the listing and booking record?' },
      { label: 'Step 4', question: 'Who hosted the rental and on what platform?' },
    ],
  },
  [MAMMOTH_STR_SLUG]: {
    scenario: `A Mammoth ski-condo guest was sickened by carbon monoxide from a gas furnace with no working alarm. The missing alarm and the coverage exclusion in the host\u2019s policy defined the case. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the hazard and alarms; save the listing.'],
      ['First days', 'Preserve the booking record and host messages; seek care.'],
      ['First weeks', 'Identify the host\u2019s and platform\u2019s insurance.'],
      ['Longer term', 'Duty, causation, and coverage developed.'],
    ],
    severityLadder: [
      ['The hazard', 'Loft, deck, stair, hot tub, or CO source.'],
      ['The duty', 'Host must keep the home safe.'],
      ['Alarms/barriers', 'Missing safety features breach it.'],
      ['Coverage', 'Which policy actually responds.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the stay.' },
      { label: 'Imaging/testing', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the hazard breached the host\u2019s duty',
      'Whether required alarms or barriers were missing',
      'Which insurance actually responds',
      'Whether the evidence was preserved',
      'Whether the host knew of the hazard',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Alarms are statutory', copy: 'Missing CO alarms breach the duty.' },
      { label: 'Coverage is decisive', copy: 'Homeowner policies may exclude rentals.' },
      { label: 'Preserve the listing', copy: 'It can change after the injury.' },
      { label: 'Platform coverage', copy: 'Host-liability insurance may respond.' },
    ],
    insuranceProblems: [
      'The applicable coverage is never identified.',
      'The listing and hazard are never preserved.',
      'Alarm and barrier compliance goes unexamined.',
      'The host\u2019s prior knowledge is never pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What hazard caused the injury?' },
      { label: 'Step 2', question: 'Were smoke and CO alarms working?' },
      { label: 'Step 3', question: 'Did you save the listing and booking record?' },
      { label: 'Step 4', question: 'Who hosted the rental and on what platform?' },
    ],
  },
}
