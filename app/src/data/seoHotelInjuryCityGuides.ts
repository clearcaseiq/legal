import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, hotel guest injury (bedbugs & premises) practice area:
 * location-specific guides for California\u2019s tourism metros \u2014 Anaheim, Los
 * Angeles, San Diego, and San Francisco.
 *
 * This is distinct from the general slip-and-fall and negligent-security hubs:
 * its signature fact pattern is a hotel bedbug infestation, which can support
 * negligence and, where a hotel knew and concealed it, battery and fraud
 * theories \u2014 alongside the broader innkeeper duty to guests.
 *
 * Local context, genuine rather than interpolated:
 *  - Anaheim: the Disneyland resort district, wall-to-wall hotels serving family
 *    tourism.
 *  - Los Angeles: an enormous hotel market spanning budget motels to luxury.
 *  - San Diego: beach resorts and convention hotels with heavy year-round
 *    tourism.
 *  - San Francisco: dense downtown and tourist-district hotels with high
 *    turnover.
 *
 * Applied accurately:
 *  - A hotel owes its guests \u2014 business invitees \u2014 a duty to use reasonable care
 *    to keep the premises safe and to warn of known dangers.
 *  - A bedbug infestation can support a negligence claim; where a hotel knew of
 *    the infestation and concealed it or kept renting the room, the conduct can
 *    also support battery and fraud/concealment theories that may open the door
 *    to punitive damages.
 *  - Other hotel hazards follow their own rules: pools and spas under the
 *    Swimming Pool Safety Act (Health and Safety Code section 115920 and related
 *    provisions), elevated walkways and balconies, and negligent security for
 *    foreseeable crime.
 *  - The evidence is time-sensitive: photographs of the bites and the room,
 *    captured specimens, the reservation and any incident report, medical
 *    records, and the hotel\u2019s pest-control and prior-complaint history (often
 *    revealed in discovery or public health records) should be gathered quickly.
 *  - A personal-injury deadline is generally two years (Code of Civil Procedure
 *    section 335.1); property-damage claims can run three years.
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

export const ANAHEIM_HOTEL_SLUG = '/anaheim-hotel-bedbug-injury-claim'
export const LA_HOTEL_SLUG = '/los-angeles-hotel-bedbug-injury-claim'
export const SD_HOTEL_SLUG = '/san-diego-hotel-bedbug-injury-claim'
export const SF_HOTEL_SLUG = '/san-francisco-hotel-bedbug-injury-claim'

export const hotelInjuryCityGuidePages: LandingPage[] = [
  {
    slug: ANAHEIM_HOTEL_SLUG,
    category: 'Cities',
    cluster: 'Anaheim Hotel Bedbug & Guest Injury Claims',
    title: 'Anaheim Hotel Bedbug & Guest Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bitten by bedbugs or hurt at an Anaheim resort-district hotel? A concealed infestation can support negligence, battery, and fraud claims.',
    psychology: 'We stayed at an Anaheim hotel near Disneyland and woke up covered in bedbug bites.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim hotel bedbug lawyer',
      'hotel bedbug lawsuit california',
      'motel bedbug bites claim california',
      'hotel guest injury lawyer california',
      'hotel concealed bedbugs punitive damages california',
    ],
    signals: [
      'Innkeeper duty to guests',
      'Bedbug negligence & concealment',
      'Battery / fraud can add punitive exposure',
      'Pool, balcony & security hazards',
      'Preserve specimens and records fast',
      'Two-year injury deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s Disneyland resort district is wall-to-wall hotels serving heavy family tourism, and high turnover is exactly where bedbug infestations spread between rooms. ${PREMISES} ${BEDBUG} ${POOL_BALCONY} ${EVIDENCE} ${SOL} Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'The hotel, room number, and dates of stay',
        'Photos of the bites and the room',
        'Any captured bedbug specimens',
        'The reservation record and any incident report',
        'Whether staff acknowledged prior problems',
        'Medical treatment for bites or reactions',
        'Belongings that had to be discarded',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps an Anaheim guest document the bites and room, preserve specimens and the reservation record, and pursue the hotel\u2019s pest-control and prior-complaint history that shows what it knew. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue a hotel for bedbug bites?',
        a: 'Possibly. A bedbug infestation can support a negligence claim, and if the hotel knew and concealed it or kept renting the room, the conduct can also support battery and fraud theories that may open the door to punitive damages.',
      },
      {
        q: 'What makes a bedbug case stronger?',
        a: 'Evidence that the hotel knew \u2014 prior guest complaints, pest-control records, or public health reports \u2014 and rented the room anyway. That knowledge is central to concealment and punitive-damages theories.',
      },
      {
        q: 'What should I do right away?',
        a: 'Photograph the bites and room, capture any specimens, keep the reservation record, report it to management in writing, and get medical care. This evidence is perishable once the room is treated.',
      },
      {
        q: 'Can I recover for ruined belongings?',
        a: 'Often yes. Property damage \u2014 such as luggage and clothing that must be discarded \u2014 can be part of the claim, and a property-damage claim can run three years while the injury deadline is generally two.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the evidence, the hotel\u2019s history, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LA_HOTEL_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Hotel Bedbug & Guest Injury Claims',
    title: 'Los Angeles Hotel Bedbug & Guest Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bitten by bedbugs or hurt at an LA hotel or motel? A concealed infestation can support negligence, battery, and fraud claims against the operator.',
    psychology: 'I got bedbug bites at an LA motel and later learned other guests had complained too.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles hotel bedbug lawyer',
      'hotel bedbug lawsuit california',
      'motel bedbug bites claim california',
      'hotel guest injury lawyer california',
      'hotel concealed bedbugs punitive damages california',
    ],
    signals: [
      'Innkeeper duty to guests',
      'Bedbug negligence & concealment',
      'Battery / fraud can add punitive exposure',
      'Pool, balcony & security hazards',
      'Preserve specimens and records fast',
      'Two-year injury deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s enormous hotel market spans budget motels to luxury towers, and the budget end in particular sees repeat bedbug problems that a prior-complaint history can expose. ${PREMISES} ${BEDBUG} ${POOL_BALCONY} ${EVIDENCE} ${SOL} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The hotel, room number, and dates of stay',
        'Photos of the bites and the room',
        'Any captured bedbug specimens',
        'The reservation record and any incident report',
        'Prior guest complaints and reviews',
        'Medical treatment for bites or reactions',
        'Belongings that had to be discarded',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps an LA guest document the bites and room, preserve specimens and records, and gather the prior-complaint and pest-control history that shows what the hotel knew. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Other guests complained about bedbugs before me. Does that matter?',
        a: 'Yes. Prior complaints, reviews, and pest-control records can show the hotel knew of the problem and rented the room anyway, which supports concealment and, in an egregious case, punitive damages.',
      },
      {
        q: 'What claims can a bedbug case involve?',
        a: 'Negligence based on the infestation, and where the hotel knew and concealed it, battery and fraud or concealment theories as well. The hotel\u2019s knowledge is the key factor.',
      },
      {
        q: 'What evidence should I preserve?',
        a: 'Photos of the bites and room, captured specimens, the reservation record, a written report to management, and medical records. This evidence is perishable once the room is treated.',
      },
      {
        q: 'How long do I have to file?',
        a: 'Generally two years for the injury (Code of Civil Procedure section 335.1) and up to three years for property damage such as discarded belongings.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the hotel\u2019s history, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_HOTEL_SLUG,
    category: 'Cities',
    cluster: 'San Diego Hotel Bedbug & Guest Injury Claims',
    title: 'San Diego Hotel Bedbug & Guest Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bitten by bedbugs or hurt at a San Diego resort or convention hotel? A concealed infestation can support negligence, battery, and fraud claims.',
    psychology: 'We were bitten by bedbugs at a San Diego beach hotel during our vacation.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego hotel bedbug lawyer',
      'hotel bedbug lawsuit california',
      'resort bedbug bites claim california',
      'hotel guest injury lawyer california',
      'hotel concealed bedbugs punitive damages california',
    ],
    signals: [
      'Innkeeper duty to guests',
      'Bedbug negligence & concealment',
      'Battery / fraud can add punitive exposure',
      'Pool, balcony & security hazards',
      'Preserve specimens and records fast',
      'Two-year injury deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s beach resorts and convention hotels see heavy year-round tourism and constant guest turnover, the conditions in which bedbugs move between rooms and pool and balcony hazards affect vacationing families. ${PREMISES} ${BEDBUG} ${POOL_BALCONY} ${EVIDENCE} ${SOL} Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The hotel, room number, and dates of stay',
        'Photos of the bites and the room',
        'Any captured bedbug specimens',
        'The reservation record and any incident report',
        'Any pool, spa, or balcony hazard involved',
        'Medical treatment for bites or reactions',
        'Belongings that had to be discarded',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Diego guest document the bites, room, and any pool or balcony hazard, preserve specimens and records, and pursue the hotel\u2019s pest-control and complaint history. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'We were on vacation from out of state. Can we still bring a California claim?',
        a: 'Generally yes. A claim over an injury at a California hotel is typically brought in California regardless of where the guest lives, and the hotel\u2019s duty to guests applies the same way.',
      },
      {
        q: 'Can a bedbug case include punitive damages?',
        a: 'It can in an egregious case. Where a hotel knew about an infestation and concealed it or kept renting the room, battery and fraud theories can support punitive damages.',
      },
      {
        q: 'What about a pool or balcony injury at the hotel?',
        a: 'Those follow their own rules \u2014 the Swimming Pool Safety Act for pools and spas, and inspection and maintenance duties for balconies \u2014 within the hotel\u2019s general duty to keep guests safe.',
      },
      {
        q: 'What evidence should I preserve?',
        a: 'Photos, captured specimens, the reservation record, a written report, and medical records, gathered quickly before the room is treated.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the hotel\u2019s history, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_HOTEL_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Hotel Bedbug & Guest Injury Claims',
    title: 'San Francisco Hotel Bedbug & Guest Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bitten by bedbugs or hurt at a San Francisco hotel? A concealed infestation can support negligence, battery, and fraud claims against the operator.',
    psychology: 'I got bedbug bites at a downtown San Francisco hotel and the front desk brushed it off.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco hotel bedbug lawyer',
      'hotel bedbug lawsuit california',
      'motel bedbug bites claim california',
      'hotel guest injury lawyer california',
      'hotel concealed bedbugs punitive damages california',
    ],
    signals: [
      'Innkeeper duty to guests',
      'Bedbug negligence & concealment',
      'Battery / fraud can add punitive exposure',
      'Pool, balcony & security hazards',
      'Preserve specimens and records fast',
      'Two-year injury deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s dense downtown and tourist-district hotels run at high occupancy and turnover, and when the front desk brushes off a bedbug report, the paper trail of complaints and pest-control visits becomes decisive. ${PREMISES} ${BEDBUG} ${POOL_BALCONY} ${EVIDENCE} ${SOL} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'The hotel, room number, and dates of stay',
        'Photos of the bites and the room',
        'Any captured bedbug specimens',
        'The reservation record and any incident report',
        'How staff responded to the complaint',
        'Medical treatment for bites or reactions',
        'Belongings that had to be discarded',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Francisco guest document the bites and the dismissive response, preserve specimens and records, and pursue the hotel\u2019s complaint and pest-control history through the proper channels. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The front desk ignored my complaint. Does that help my case?',
        a: 'It can. A dismissive response, especially against a backdrop of prior complaints or pest-control visits, supports the argument that the hotel knew of the problem \u2014 which is central to concealment and punitive theories.',
      },
      {
        q: 'What claims can a bedbug case involve?',
        a: 'Negligence for the infestation, and where the hotel knew and concealed it, battery and fraud or concealment theories that may open the door to punitive damages.',
      },
      {
        q: 'What should I preserve right away?',
        a: 'Photos of the bites and room, captured specimens, the reservation record, a written report to management, and medical records \u2014 before the room is treated and the evidence is gone.',
      },
      {
        q: 'How long do I have to file?',
        a: 'Generally two years for the injury (Code of Civil Procedure section 335.1) and up to three years for property damage such as discarded belongings.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the hotel\u2019s history, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const hotelInjuryCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [ANAHEIM_HOTEL_SLUG]: {
    scenario: `An Anaheim family near Disneyland woke to bites; captured specimens and photos, plus the hotel\u2019s prior-complaint history obtained later, showed the operator knew and kept renting the room. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Photograph bites and room; capture specimens.'],
      ['Report', 'Notify management in writing; keep the reservation.'],
      ['Records', 'Pursue pest-control and complaint history.'],
      ['Longer term', 'Negligence and concealment theories developed.'],
    ],
    severityLadder: [
      ['Duty', 'Hotels owe guests reasonable care.'],
      ['Negligence', 'An infestation can breach that duty.'],
      ['Concealment', 'Known-and-hidden adds battery/fraud.'],
      ['Punitive', 'Egregious concealment can expose punitives.'],
    ],
    treatmentProgression: [
      { label: 'Bites & reactions', copy: 'Skin reactions are documented.' },
      { label: 'Medical care', copy: 'Treatment for reactions is recorded.' },
      { label: 'Property loss', copy: 'Discarded belongings are itemized.' },
      { label: 'Documentation', copy: 'Photos and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the hotel knew of the infestation',
      'Whether prior complaints or records exist',
      'Whether specimens and photos were preserved',
      'The severity of the reactions',
      'The property loss involved',
      'Whether concealment supports punitive damages',
    ],
    settlementValueDetails: [
      { label: 'Knowledge is key', copy: 'Prior complaints prove it.' },
      { label: 'Preserve specimens', copy: 'They confirm the infestation.' },
      { label: 'Concealment adds value', copy: 'It can support punitives.' },
      { label: 'Property counts', copy: 'Discarded belongings are recoverable.' },
    ],
    insuranceProblems: [
      'The room is treated before evidence is gathered.',
      'No specimens or photos were kept.',
      'The complaint was only verbal.',
      'The hotel\u2019s prior history is never pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which hotel and room, and what dates?' },
      { label: 'Step 2', question: 'Do you have photos or specimens?' },
      { label: 'Step 3', question: 'Did you report it, and how?' },
      { label: 'Step 4', question: 'What treatment and losses resulted?' },
    ],
  },
  [LA_HOTEL_SLUG]: {
    scenario: `An LA motel guest later found online reviews and health records showing repeated bedbug complaints. That prior-complaint history transformed a simple negligence case into a concealment claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Photograph bites and room; capture specimens.'],
      ['Report', 'Notify management in writing; keep the reservation.'],
      ['Records', 'Gather reviews and prior-complaint history.'],
      ['Longer term', 'Negligence and concealment theories developed.'],
    ],
    severityLadder: [
      ['Duty', 'Hotels owe guests reasonable care.'],
      ['Negligence', 'An infestation can breach that duty.'],
      ['Pattern', 'Prior complaints show knowledge.'],
      ['Punitive', 'Concealment can expose punitives.'],
    ],
    treatmentProgression: [
      { label: 'Bites & reactions', copy: 'Skin reactions are documented.' },
      { label: 'Medical care', copy: 'Treatment for reactions is recorded.' },
      { label: 'Property loss', copy: 'Discarded belongings are itemized.' },
      { label: 'Documentation', copy: 'Photos and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether prior complaints show knowledge',
      'Whether specimens and photos were preserved',
      'Whether the hotel concealed the problem',
      'The severity of the reactions',
      'The property loss involved',
      'Whether punitive exposure exists',
    ],
    settlementValueDetails: [
      { label: 'Prior complaints help', copy: 'They establish knowledge.' },
      { label: 'Preserve specimens', copy: 'They confirm the infestation.' },
      { label: 'Concealment adds value', copy: 'It can support punitives.' },
      { label: 'Property counts', copy: 'Discarded belongings are recoverable.' },
    ],
    insuranceProblems: [
      'The reviews and complaint history are never gathered.',
      'The room is treated before evidence is preserved.',
      'No specimens or photos were kept.',
      'The complaint was only verbal.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which hotel and room, and what dates?' },
      { label: 'Step 2', question: 'Are there prior complaints or reviews?' },
      { label: 'Step 3', question: 'Do you have photos or specimens?' },
      { label: 'Step 4', question: 'What treatment and losses resulted?' },
    ],
  },
  [SD_HOTEL_SLUG]: {
    scenario: `A visiting family bitten at a San Diego beach hotel filed in California where the injury occurred. Photos, specimens, and the reservation supported the claim despite living out of state. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Photograph bites and room; capture specimens.'],
      ['Report', 'Notify management in writing; keep the reservation.'],
      ['Records', 'Pursue pest-control and complaint history.'],
      ['Longer term', 'Negligence and concealment theories developed.'],
    ],
    severityLadder: [
      ['Duty', 'Hotels owe guests reasonable care.'],
      ['Negligence', 'An infestation can breach that duty.'],
      ['Venue', 'The claim is brought in California.'],
      ['Punitive', 'Concealment can expose punitives.'],
    ],
    treatmentProgression: [
      { label: 'Bites & reactions', copy: 'Skin reactions are documented.' },
      { label: 'Medical care', copy: 'Treatment for reactions is recorded.' },
      { label: 'Property loss', copy: 'Discarded belongings are itemized.' },
      { label: 'Documentation', copy: 'Photos and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the hotel knew of the infestation',
      'Whether specimens and photos were preserved',
      'Whether any pool or balcony hazard applies',
      'The severity of the reactions',
      'The property loss involved',
      'Whether concealment supports punitive damages',
    ],
    settlementValueDetails: [
      { label: 'Venue in California', copy: 'Out-of-state guests can still sue here.' },
      { label: 'Preserve specimens', copy: 'They confirm the infestation.' },
      { label: 'Knowledge is key', copy: 'Records show what the hotel knew.' },
      { label: 'Property counts', copy: 'Discarded belongings are recoverable.' },
    ],
    insuranceProblems: [
      'The family assumes they must sue in their home state.',
      'The room is treated before evidence is preserved.',
      'No specimens or photos were kept.',
      'The complaint was only verbal.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which hotel and room, and what dates?' },
      { label: 'Step 2', question: 'Do you have photos or specimens?' },
      { label: 'Step 3', question: 'Was any pool or balcony hazard involved?' },
      { label: 'Step 4', question: 'What treatment and losses resulted?' },
    ],
  },
  [SF_HOTEL_SLUG]: {
    scenario: `A San Francisco hotel front desk dismissed a guest\u2019s bedbug report. The written complaint and later-obtained pest-control logs showed the hotel had treated the same room before. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Photograph bites and room; capture specimens.'],
      ['Report', 'Put the complaint in writing despite the brush-off.'],
      ['Records', 'Pursue pest-control and complaint history.'],
      ['Longer term', 'Negligence and concealment theories developed.'],
    ],
    severityLadder: [
      ['Duty', 'Hotels owe guests reasonable care.'],
      ['Negligence', 'An infestation can breach that duty.'],
      ['Dismissal', 'Ignoring a report can show knowledge.'],
      ['Punitive', 'Concealment can expose punitives.'],
    ],
    treatmentProgression: [
      { label: 'Bites & reactions', copy: 'Skin reactions are documented.' },
      { label: 'Medical care', copy: 'Treatment for reactions is recorded.' },
      { label: 'Property loss', copy: 'Discarded belongings are itemized.' },
      { label: 'Documentation', copy: 'Photos and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the hotel knew of the infestation',
      'Whether the complaint was documented',
      'Whether pest-control logs show prior treatment',
      'The severity of the reactions',
      'The property loss involved',
      'Whether concealment supports punitive damages',
    ],
    settlementValueDetails: [
      { label: 'Document the brush-off', copy: 'A written report preserves it.' },
      { label: 'Pest logs help', copy: 'Prior treatment shows knowledge.' },
      { label: 'Preserve specimens', copy: 'They confirm the infestation.' },
      { label: 'Property counts', copy: 'Discarded belongings are recoverable.' },
    ],
    insuranceProblems: [
      'The complaint was only verbal and denied later.',
      'The room is treated before evidence is preserved.',
      'No specimens or photos were kept.',
      'The pest-control history is never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which hotel and room, and what dates?' },
      { label: 'Step 2', question: 'Did you report it, and how did staff respond?' },
      { label: 'Step 3', question: 'Do you have photos or specimens?' },
      { label: 'Step 4', question: 'What treatment and losses resulted?' },
    ],
  },
}
