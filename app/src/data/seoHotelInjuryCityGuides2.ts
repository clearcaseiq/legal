import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, hotel guest injury (bedbugs & premises) practice area (batch 2):
 * location-specific guides for San Jose, Sacramento, Long Beach, and Oakland,
 * extending the batch-1 tourism hub (Anaheim, Los Angeles, San Diego, San
 * Francisco).
 *
 * Local context, genuine rather than interpolated:
 *  - San Jose: business-travel and convention hotels serving Silicon Valley, plus
 *    budget motels along the corridors, with high year-round occupancy.
 *  - Sacramento: capitol, convention, and business hotels plus older motels along
 *    the freeway corridors, with steady legislative and event traffic.
 *  - Long Beach: convention, cruise-terminal, and waterfront hotels plus budget
 *    motels, with heavy event and tourism turnover.
 *  - Oakland: airport-corridor and downtown hotels plus older motels, with high
 *    turnover and a mix of budget and business properties.
 *
 * Applied accurately (identical to batch 1):
 *  - Innkeeper duty to guests (business invitees) to use reasonable care.
 *  - Bedbug infestation supports negligence; concealment can add battery and
 *    fraud, opening the door to punitive damages in egregious cases.
 *  - Pools/spas under the Swimming Pool Safety Act; balconies/walkways and
 *    negligent security follow their own rules.
 *  - Evidence is time-sensitive; two-year injury deadline (CCP 335.1), three-year
 *    property-damage deadline.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a hotel breached its duty, whether it knew about and concealed an infestation, and which deadline applies depend on facts a licensed California attorney should review promptly.'

const PREMISES =
  'A hotel owes its guests \u2014 who are business invitees \u2014 a duty to use reasonable care to keep the premises reasonably safe and to warn of known dangers. That duty covers the guest room, common areas, pools, walkways, and security, and it is measured by what the hotel knew or should have known.'

const BEDBUG =
  'A bedbug infestation can support a negligence claim on its own. When a hotel knew about an infestation and concealed it \u2014 or kept renting a room it knew was infested \u2014 the conduct can also support battery and fraud or concealment theories, which in an egregious case may open the door to punitive damages. Prior complaints and pest-control records are central.'

const POOL_BALCONY =
  'Other hotel hazards follow their own rules. Pools and spas are governed by the Swimming Pool Safety Act (Health and Safety Code section 115920 and related provisions); elevated walkways and balconies carry their own inspection and maintenance duties; and a hotel can be liable for negligent security when crime against guests was foreseeable and reasonable measures were missing.'

const EVIDENCE =
  'Hotel-injury evidence is time-sensitive: photographs of the bites and the room, any captured specimens, the reservation record and any incident report, medical records, and the hotel\u2019s pest-control and prior-complaint history \u2014 often surfaced through discovery or public health records \u2014 should be gathered quickly before a room is treated and records age.'

const SOL =
  'A personal-injury deadline is generally two years from the injury (Code of Civil Procedure section 335.1), while a claim for property damage \u2014 such as belongings that must be discarded after an infestation \u2014 can run three years. Acting early also protects the perishable evidence.'

export const SJ_HOTEL_SLUG = '/san-jose-hotel-bedbug-injury-claim'
export const SAC_HOTEL_SLUG = '/sacramento-hotel-bedbug-injury-claim'
export const LB_HOTEL_SLUG = '/long-beach-hotel-bedbug-injury-claim'
export const OAK_HOTEL_SLUG = '/oakland-hotel-bedbug-injury-claim'

export const hotelInjuryCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_HOTEL_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Hotel Injury & Bedbug Claims',
    title: 'San Jose Hotel Injury & Bedbug Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bitten by bedbugs or hurt at a San Jose hotel? A hotel that knew of an infestation and concealed it can face more than negligence \u2014 and the evidence is perishable.',
    psychology: 'I was bitten or hurt at a San Jose hotel and I do not know if I can hold it responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose hotel bedbug lawyer',
      'hotel bedbug infestation claim california',
      'hotel injury lawsuit california',
      'sue hotel for bedbugs california',
      'hotel negligence guest injury california',
    ],
    signals: [
      'Innkeeper duty to guests',
      'Bedbug negligence / concealment',
      'Battery & fraud theories',
      'Pest-control & complaint records',
      'Pool / balcony / security hazards',
      'Two-year injury deadline',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s business-travel and convention hotels serving Silicon Valley, along with budget motels on the corridors, run high year-round occupancy \u2014 the churn that lets an infestation spread between rooms if a hotel does not respond. ${PREMISES} ${BEDBUG} ${POOL_BALCONY} ${EVIDENCE} ${SOL} Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'Photographs of the bites and the room',
        'Any captured bedbug specimens',
        'The reservation record and any incident report',
        'Prior guest complaints and the hotel\u2019s pest-control history',
        'Medical records from the injury onward',
        'For other hazards, the pool, balcony, or security facts',
        'Belongings discarded (property-damage claim)',
        'The date of the stay and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the perishable bedbug evidence from a San Jose stay, pursues the hotel\u2019s pest-control and prior-complaint history that can show knowledge and concealment, and identifies any battery or fraud theory beyond simple negligence. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue a hotel just for bedbugs?',
        a: 'Possibly. A bedbug infestation can support a negligence claim on its own. If the hotel knew about the infestation and concealed it or kept renting the room, the conduct can also support battery and fraud theories, which in an egregious case may open the door to punitive damages.',
      },
      {
        q: 'What evidence should I gather right away?',
        a: 'Photographs of the bites and the room, any captured specimens, your reservation record, any incident report, and medical records. This evidence is perishable \u2014 the room will be treated and records age \u2014 so gather it quickly.',
      },
      {
        q: 'I was hurt at the hotel pool, not by bedbugs. Is that covered?',
        a: 'Yes. A hotel owes guests reasonable care throughout the premises. Pools and spas are governed by the Swimming Pool Safety Act, balconies and walkways carry their own duties, and a hotel can be liable for negligent security when crime was foreseeable.',
      },
      {
        q: 'How long do I have to bring a claim?',
        a: 'A personal-injury claim is generally due within two years (Code of Civil Procedure section 335.1), while a property-damage claim for discarded belongings can run three years. Acting early also protects the perishable evidence.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the perishable evidence and the hotel\u2019s history so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_HOTEL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Hotel Injury & Bedbug Claims',
    title: 'Sacramento Hotel Injury & Bedbug Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bitten by bedbugs or hurt at a Sacramento hotel? A hotel that knew of an infestation and concealed it can face more than negligence \u2014 and the evidence is perishable.',
    psychology: 'I was bitten or hurt at a Sacramento hotel and I do not know if I can hold it responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento hotel bedbug lawyer',
      'hotel bedbug infestation claim california',
      'hotel injury lawsuit california',
      'sue hotel for bedbugs california',
      'motel injury claim california',
    ],
    signals: [
      'Innkeeper duty to guests',
      'Bedbug negligence / concealment',
      'Battery & fraud theories',
      'Pest-control & complaint records',
      'Pool / balcony / security hazards',
      'Two-year injury deadline',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s capitol, convention, and business hotels, plus older motels along the freeway corridors, see steady legislative and event traffic and high turnover \u2014 conditions in which an unaddressed infestation can spread. ${PREMISES} ${BEDBUG} ${POOL_BALCONY} ${EVIDENCE} ${SOL} Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Photographs of the bites and the room',
        'Any captured bedbug specimens',
        'The reservation record and any incident report',
        'Prior guest complaints and the hotel\u2019s pest-control history',
        'Medical records from the injury onward',
        'For other hazards, the pool, balcony, or security facts',
        'Belongings discarded (property-damage claim)',
        'The date of the stay and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the perishable bedbug evidence from a Sacramento stay, pursues the hotel\u2019s pest-control and prior-complaint history that can show knowledge and concealment, and identifies any battery or fraud theory beyond simple negligence. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue a hotel just for bedbugs?',
        a: 'Possibly. A bedbug infestation can support a negligence claim on its own. If the hotel knew about the infestation and concealed it or kept renting the room, the conduct can also support battery and fraud theories, which in an egregious case may open the door to punitive damages.',
      },
      {
        q: 'What evidence should I gather right away?',
        a: 'Photographs of the bites and the room, any captured specimens, your reservation record, any incident report, and medical records. This evidence is perishable \u2014 the room will be treated and records age \u2014 so gather it quickly.',
      },
      {
        q: 'It happened at an older motel, not a big hotel. Does that matter?',
        a: 'No. The innkeeper duty of reasonable care applies to motels and hotels alike. A budget motel that ignored prior complaints or concealed a known infestation faces the same negligence \u2014 and potentially concealment \u2014 exposure.',
      },
      {
        q: 'How long do I have to bring a claim?',
        a: 'A personal-injury claim is generally due within two years (Code of Civil Procedure section 335.1), while a property-damage claim for discarded belongings can run three years. Acting early also protects the perishable evidence.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the perishable evidence and the hotel\u2019s history so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_HOTEL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Hotel Injury & Bedbug Claims',
    title: 'Long Beach Hotel Injury & Bedbug Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bitten by bedbugs or hurt at a Long Beach hotel? A hotel that knew of an infestation and concealed it can face more than negligence \u2014 and the evidence is perishable.',
    psychology: 'I was bitten or hurt at a Long Beach hotel and I do not know if I can hold it responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach hotel bedbug lawyer',
      'hotel bedbug infestation claim california',
      'hotel injury lawsuit california',
      'sue hotel for bedbugs california',
      'hotel negligence guest injury california',
    ],
    signals: [
      'Innkeeper duty to guests',
      'Bedbug negligence / concealment',
      'Battery & fraud theories',
      'Convention / cruise-terminal turnover',
      'Pool / balcony / security hazards',
      'Two-year injury deadline',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s convention, cruise-terminal, and waterfront hotels, plus budget motels, run heavy event and tourism turnover \u2014 the churn that lets an infestation spread between rooms if a hotel does not respond. ${PREMISES} ${BEDBUG} ${POOL_BALCONY} ${EVIDENCE} ${SOL} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Photographs of the bites and the room',
        'Any captured bedbug specimens',
        'The reservation record and any incident report',
        'Prior guest complaints and the hotel\u2019s pest-control history',
        'Medical records from the injury onward',
        'For other hazards, the pool, balcony, or security facts',
        'Belongings discarded (property-damage claim)',
        'The date of the stay and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the perishable bedbug evidence from a Long Beach stay, pursues the hotel\u2019s pest-control and prior-complaint history that can show knowledge and concealment, and identifies any battery or fraud theory beyond simple negligence. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue a hotel just for bedbugs?',
        a: 'Possibly. A bedbug infestation can support a negligence claim on its own. If the hotel knew about the infestation and concealed it or kept renting the room, the conduct can also support battery and fraud theories, which in an egregious case may open the door to punitive damages.',
      },
      {
        q: 'What evidence should I gather right away?',
        a: 'Photographs of the bites and the room, any captured specimens, your reservation record, any incident report, and medical records. This evidence is perishable \u2014 the room will be treated and records age \u2014 so gather it quickly.',
      },
      {
        q: 'I was hurt at the hotel pool, not by bedbugs. Is that covered?',
        a: 'Yes. A hotel owes guests reasonable care throughout the premises. Pools and spas are governed by the Swimming Pool Safety Act, balconies and walkways carry their own duties, and a hotel can be liable for negligent security when crime was foreseeable.',
      },
      {
        q: 'How long do I have to bring a claim?',
        a: 'A personal-injury claim is generally due within two years (Code of Civil Procedure section 335.1), while a property-damage claim for discarded belongings can run three years. Acting early also protects the perishable evidence.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the perishable evidence and the hotel\u2019s history so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_HOTEL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Hotel Injury & Bedbug Claims',
    title: 'Oakland Hotel Injury & Bedbug Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bitten by bedbugs or hurt at an Oakland hotel or motel? A hotel that knew of an infestation and concealed it can face more than negligence \u2014 and the evidence is perishable.',
    psychology: 'I was bitten or hurt at an Oakland hotel and I do not know if I can hold it responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland hotel bedbug lawyer',
      'hotel bedbug infestation claim california',
      'motel injury claim california',
      'sue hotel for bedbugs california',
      'hotel negligence guest injury california',
    ],
    signals: [
      'Innkeeper duty to guests',
      'Bedbug negligence / concealment',
      'Battery & fraud theories',
      'Airport-corridor / high turnover',
      'Pool / balcony / security hazards',
      'Two-year injury deadline',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s airport-corridor and downtown hotels, plus older motels, run high turnover across budget and business properties \u2014 the churn in which an unaddressed infestation can spread between rooms. ${PREMISES} ${BEDBUG} ${POOL_BALCONY} ${EVIDENCE} ${SOL} Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'Photographs of the bites and the room',
        'Any captured bedbug specimens',
        'The reservation record and any incident report',
        'Prior guest complaints and the hotel\u2019s pest-control history',
        'Medical records from the injury onward',
        'For other hazards, the pool, balcony, or security facts',
        'Belongings discarded (property-damage claim)',
        'The date of the stay and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the perishable bedbug evidence from an Oakland stay, pursues the hotel\u2019s pest-control and prior-complaint history that can show knowledge and concealment, and identifies any battery or fraud theory beyond simple negligence. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue a hotel just for bedbugs?',
        a: 'Possibly. A bedbug infestation can support a negligence claim on its own. If the hotel knew about the infestation and concealed it or kept renting the room, the conduct can also support battery and fraud theories, which in an egregious case may open the door to punitive damages.',
      },
      {
        q: 'It happened at an older motel, not a big hotel. Does that matter?',
        a: 'No. The innkeeper duty of reasonable care applies to motels and hotels alike. A budget motel that ignored prior complaints or concealed a known infestation faces the same negligence \u2014 and potentially concealment \u2014 exposure.',
      },
      {
        q: 'What evidence should I gather right away?',
        a: 'Photographs of the bites and the room, any captured specimens, your reservation record, any incident report, and medical records. This evidence is perishable \u2014 the room will be treated and records age \u2014 so gather it quickly.',
      },
      {
        q: 'How long do I have to bring a claim?',
        a: 'A personal-injury claim is generally due within two years (Code of Civil Procedure section 335.1), while a property-damage claim for discarded belongings can run three years. Acting early also protects the perishable evidence.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the perishable evidence and the hotel\u2019s history so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const hotelInjuryCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_HOTEL_SLUG]: {
    scenario: `A San Jose business traveler woke covered in bites; the hotel\u2019s pest-control log, obtained in discovery, showed prior infestations in the same room that were never disclosed. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the bites and room; capture a specimen.'],
      ['First days', 'Save the reservation and any incident report; seek care.'],
      ['First weeks', 'Pursue the pest-control and prior-complaint history.'],
      ['Longer term', 'Negligence, concealment, and damages developed.'],
    ],
    severityLadder: [
      ['Infestation', 'Bedbugs support a negligence claim.'],
      ['Knowledge', 'Prior complaints show the hotel knew.'],
      ['Concealment', 'Hiding it can add battery and fraud.'],
      ['Preserve', 'Bites, specimens, and records are perishable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the bites to the stay.' },
      { label: 'Follow-up', copy: 'Skin reactions and infection are documented.' },
      { label: 'Continuing care', copy: 'Persistent symptoms support severity.' },
      { label: 'Documentation', copy: 'Medical bills and discarded belongings define economics.' },
    ],
    settlementDrivers: [
      'Whether the infestation is documented',
      'Whether the hotel knew of prior infestations',
      'Whether it concealed or kept renting the room',
      'Whether the evidence was preserved',
      'Whether property loss adds a claim',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Concealment adds theories', copy: 'Battery and fraud can apply.' },
      { label: 'History is key', copy: 'Pest-control logs show knowledge.' },
      { label: 'Evidence perishes', copy: 'Photograph and capture quickly.' },
      { label: 'Property loss counts', copy: 'Discarded belongings run three years.' },
    ],
    insuranceProblems: [
      'The bites and room are never photographed.',
      'The pest-control and complaint history is never pursued.',
      'A concealment theory is never developed.',
      'The property-damage claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you photograph the bites and the room?' },
      { label: 'Step 2', question: 'Do you have your reservation record?' },
      { label: 'Step 3', question: 'Did you report it to the hotel?' },
      { label: 'Step 4', question: 'Did you seek medical care?' },
    ],
  },
  [SAC_HOTEL_SLUG]: {
    scenario: `A Sacramento motel guest was bitten repeatedly; prior online complaints and a public-health record showed the property had a known, recurring infestation. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the bites and room; capture a specimen.'],
      ['First days', 'Save the reservation and any incident report; seek care.'],
      ['First weeks', 'Pursue the pest-control and prior-complaint history.'],
      ['Longer term', 'Negligence, concealment, and damages developed.'],
    ],
    severityLadder: [
      ['Infestation', 'Bedbugs support a negligence claim.'],
      ['Knowledge', 'Prior complaints show the hotel knew.'],
      ['Concealment', 'Hiding it can add battery and fraud.'],
      ['Preserve', 'Bites, specimens, and records are perishable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the bites to the stay.' },
      { label: 'Follow-up', copy: 'Skin reactions and infection are documented.' },
      { label: 'Continuing care', copy: 'Persistent symptoms support severity.' },
      { label: 'Documentation', copy: 'Medical bills and discarded belongings define economics.' },
    ],
    settlementDrivers: [
      'Whether the infestation is documented',
      'Whether the hotel knew of prior infestations',
      'Whether it concealed or kept renting the room',
      'Whether the evidence was preserved',
      'Whether property loss adds a claim',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'History is key', copy: 'Complaints and health records show knowledge.' },
      { label: 'Concealment adds theories', copy: 'Battery and fraud can apply.' },
      { label: 'Evidence perishes', copy: 'Photograph and capture quickly.' },
      { label: 'Property loss counts', copy: 'Discarded belongings run three years.' },
    ],
    insuranceProblems: [
      'The bites and room are never photographed.',
      'The pest-control and complaint history is never pursued.',
      'A concealment theory is never developed.',
      'The property-damage claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you photograph the bites and the room?' },
      { label: 'Step 2', question: 'Do you have your reservation record?' },
      { label: 'Step 3', question: 'Did you report it to the hotel?' },
      { label: 'Step 4', question: 'Did you seek medical care?' },
    ],
  },
  [LB_HOTEL_SLUG]: {
    scenario: `A Long Beach convention guest was bitten during a busy event weekend; the hotel had suppressed prior complaints while continuing to rent the affected block of rooms. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the bites and room; capture a specimen.'],
      ['First days', 'Save the reservation and any incident report; seek care.'],
      ['First weeks', 'Pursue the pest-control and prior-complaint history.'],
      ['Longer term', 'Negligence, concealment, and damages developed.'],
    ],
    severityLadder: [
      ['Infestation', 'Bedbugs support a negligence claim.'],
      ['Knowledge', 'Prior complaints show the hotel knew.'],
      ['Concealment', 'Hiding it can add battery and fraud.'],
      ['Preserve', 'Bites, specimens, and records are perishable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the bites to the stay.' },
      { label: 'Follow-up', copy: 'Skin reactions and infection are documented.' },
      { label: 'Continuing care', copy: 'Persistent symptoms support severity.' },
      { label: 'Documentation', copy: 'Medical bills and discarded belongings define economics.' },
    ],
    settlementDrivers: [
      'Whether the infestation is documented',
      'Whether the hotel knew of prior infestations',
      'Whether it concealed or kept renting the rooms',
      'Whether the evidence was preserved',
      'Whether property loss adds a claim',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Concealment adds theories', copy: 'Battery and fraud can apply.' },
      { label: 'History is key', copy: 'Pest-control logs show knowledge.' },
      { label: 'Evidence perishes', copy: 'Photograph and capture quickly.' },
      { label: 'Property loss counts', copy: 'Discarded belongings run three years.' },
    ],
    insuranceProblems: [
      'The bites and room are never photographed.',
      'The pest-control and complaint history is never pursued.',
      'A concealment theory is never developed.',
      'The property-damage claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you photograph the bites and the room?' },
      { label: 'Step 2', question: 'Do you have your reservation record?' },
      { label: 'Step 3', question: 'Did you report it to the hotel?' },
      { label: 'Step 4', question: 'Did you seek medical care?' },
    ],
  },
  [OAK_HOTEL_SLUG]: {
    scenario: `An Oakland airport-corridor motel guest was bitten; the property\u2019s pest-control records revealed repeated treatments in the same room that were never disclosed to incoming guests. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the bites and room; capture a specimen.'],
      ['First days', 'Save the reservation and any incident report; seek care.'],
      ['First weeks', 'Pursue the pest-control and prior-complaint history.'],
      ['Longer term', 'Negligence, concealment, and damages developed.'],
    ],
    severityLadder: [
      ['Infestation', 'Bedbugs support a negligence claim.'],
      ['Knowledge', 'Prior treatments show the hotel knew.'],
      ['Concealment', 'Hiding it can add battery and fraud.'],
      ['Preserve', 'Bites, specimens, and records are perishable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the bites to the stay.' },
      { label: 'Follow-up', copy: 'Skin reactions and infection are documented.' },
      { label: 'Continuing care', copy: 'Persistent symptoms support severity.' },
      { label: 'Documentation', copy: 'Medical bills and discarded belongings define economics.' },
    ],
    settlementDrivers: [
      'Whether the infestation is documented',
      'Whether the hotel knew of prior infestations',
      'Whether it concealed or kept renting the room',
      'Whether the evidence was preserved',
      'Whether property loss adds a claim',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'History is key', copy: 'Pest-control logs show knowledge.' },
      { label: 'Concealment adds theories', copy: 'Battery and fraud can apply.' },
      { label: 'Evidence perishes', copy: 'Photograph and capture quickly.' },
      { label: 'Property loss counts', copy: 'Discarded belongings run three years.' },
    ],
    insuranceProblems: [
      'The bites and room are never photographed.',
      'The pest-control and complaint history is never pursued.',
      'A concealment theory is never developed.',
      'The property-damage claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you photograph the bites and the room?' },
      { label: 'Step 2', question: 'Do you have your reservation record?' },
      { label: 'Step 3', question: 'Did you report it to the hotel?' },
      { label: 'Step 4', question: 'Did you seek medical care?' },
    ],
  },
}
