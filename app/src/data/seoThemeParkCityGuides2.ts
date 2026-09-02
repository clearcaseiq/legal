import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, theme-park / amusement-ride injury practice area (batch 2):
 * location-specific guides for California\u2019s other major theme-park towns \u2014 Buena
 * Park (Knott\u2019s Berry Farm), Valencia / Santa Clarita (Six Flags Magic Mountain),
 * Vallejo (Six Flags Discovery Kingdom), and Gilroy (Gilroy Gardens), extending
 * the batch-1 hub (Anaheim, Los Angeles, San Diego, Santa Clara).
 *
 * Applied accurately (identical to batch 1):
 *  - Roller coasters and similar rides are common carriers owing utmost care
 *    (Civil Code 2100; Gomez v. Superior Court).
 *  - Off-ride slip/trip/fall follows ordinary premises liability.
 *  - Defective rides, restraints, or components: strict product liability.
 *  - State ride inspection; park operation/maintenance and incident records are
 *    central; a waiver rarely ends the inquiry (gross negligence and the
 *    common-carrier duty survive it).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether the common-carrier duty, a premises claim, a product claim, or a waiver applies depends on facts a licensed California attorney should review promptly.'

const COMMON_CARRIER =
  'California treats roller coasters and similar amusement rides as common carriers, which means the operator owes the heightened duty of utmost care under Civil Code section 2100 \u2014 a standard set by the California Supreme Court in Gomez v. Superior Court and substantially higher than ordinary negligence. On a ride, the park must use the highest care consistent with the ride\u2019s operation, which is often the decisive legal point in a ride-injury claim.'

const PREMISES =
  'Not every park injury happens on a ride. Slip, trip, and fall injuries on walkways, in queues, in restaurants, and in restrooms fall under ordinary premises-liability rules, which require the park to keep its premises reasonably safe and to warn of or fix hazards it knew or should have known about. The location of the injury \u2014 on a ride versus elsewhere \u2014 can change the legal standard that applies.'

const PRODUCT =
  'Where a ride, a restraint, a harness, or a component was defective, a strict product-liability claim can lie against the manufacturer, distributor, and seller, in addition to any claim against the park \u2014 without proof of negligence. Preserving the ride records and, where possible, the component itself is important, because the defect is the evidence.'

const RECORDS =
  'Permanent amusement rides in California are inspected under state oversight, and the park\u2019s ride-operation, inspection, and maintenance records \u2014 along with incident reports and any prior complaints about the same ride \u2014 are central evidence. A ticket or season-pass waiver may limit ordinary-negligence claims, but it generally cannot waive gross negligence, and the common-carrier duty constrains what a park can disclaim, so a waiver is rarely the end of the inquiry.'

export const BUENAPARK_PARK_SLUG = '/buena-park-theme-park-injury'
export const VALENCIA_PARK_SLUG = '/valencia-theme-park-injury'
export const VALLEJO_PARK_SLUG = '/vallejo-theme-park-injury'
export const GILROY_PARK_SLUG = '/gilroy-theme-park-injury'

export const themeParkCityGuidePages2: LandingPage[] = [
  {
    slug: BUENAPARK_PARK_SLUG,
    category: 'Cities',
    cluster: 'Buena Park Theme Park Injury Claims',
    title: 'Buena Park Theme Park & Amusement Ride Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Buena Park amusement ride or elsewhere in the park? On a ride the operator owes utmost care \u2014 a far higher standard than ordinary negligence.',
    psychology: 'I was hurt at a Buena Park theme park and I do not know what standard applies or whether my ticket waiver ends it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'buena park theme park injury lawyer',
      'roller coaster injury claim california',
      'amusement ride accident lawsuit california',
      'theme park waiver gross negligence california',
      'defective ride restraint claim california',
    ],
    signals: [
      'Common-carrier utmost care (rides)',
      'Premises liability (off-ride)',
      'Defective ride / restraint product',
      'State inspection & ride records',
      'Waiver rarely ends it',
      'Prior-complaint history',
    ],
    sections: {
      whyItMatters: `Buena Park is home to a major amusement park with high-thrill coasters and heavy year-round crowds, so both ride and off-ride injuries are common \u2014 and the standard turns on where the injury happened. ${COMMON_CARRIER} ${PREMISES} ${PRODUCT} ${RECORDS} Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Whether the injury happened on a ride or elsewhere',
        'The specific ride, restraint, or component involved',
        'The incident report and any prior complaints about the ride',
        'The park\u2019s ride-operation, inspection, and maintenance records',
        'Any ticket or season-pass waiver',
        'Surveillance or ride-camera footage',
        'Witness statements',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier utmost-care standard to a Buena Park ride injury, pursues the ride and inspection records and any product defect, and evaluates whether a waiver can be overcome by gross negligence or the carrier duty. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What standard applies to a roller coaster injury?',
        a: 'California treats roller coasters and similar rides as common carriers, so the operator owes the heightened duty of utmost care under Civil Code section 2100 (Gomez v. Superior Court) \u2014 substantially higher than ordinary negligence. That is often the decisive legal point in a ride-injury claim.',
      },
      {
        q: 'My ticket had a waiver. Does that end my claim?',
        a: 'Rarely. A waiver may limit ordinary-negligence claims, but it generally cannot waive gross negligence, and the common-carrier duty constrains what a park can disclaim on its rides. A waiver is rarely the end of the inquiry.',
      },
      {
        q: 'A restraint or harness failed. Who is responsible?',
        a: 'Potentially the park and, through a strict product-liability claim, the manufacturer and seller of the defective restraint or component \u2014 without proof of negligence. Preserving the component and the ride records is important, because the defect is the evidence.',
      },
      {
        q: 'I slipped on a walkway, not on a ride. Is that different?',
        a: 'Yes. Off-ride slip, trip, and fall injuries follow ordinary premises-liability rules \u2014 the park must keep its premises reasonably safe and fix or warn of hazards it knew or should have known about. The location changes the standard that applies.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the ride records, product facts, and waiver analysis so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: VALENCIA_PARK_SLUG,
    category: 'Cities',
    cluster: 'Valencia Theme Park Injury Claims',
    title: 'Valencia Theme Park & Amusement Ride Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Valencia / Santa Clarita amusement ride or elsewhere in the park? On a ride the operator owes utmost care \u2014 a far higher standard than ordinary negligence.',
    psychology: 'I was hurt at a Valencia theme park and I do not know what standard applies or whether my season pass waiver ends it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'valencia theme park injury lawyer',
      'roller coaster injury claim california',
      'six flags injury lawsuit california',
      'theme park waiver gross negligence california',
      'defective ride restraint claim california',
    ],
    signals: [
      'Common-carrier utmost care (rides)',
      'Premises liability (off-ride)',
      'Defective ride / restraint product',
      'State inspection & ride records',
      'Season-pass waiver rarely ends it',
      'Prior-complaint history',
    ],
    sections: {
      whyItMatters: `Valencia and Santa Clarita are home to one of the country\u2019s most coaster-dense theme parks, where high-speed and high-thrill rides mean serious ride injuries do occur \u2014 and the standard turns on where the injury happened. ${COMMON_CARRIER} ${PREMISES} ${PRODUCT} ${RECORDS} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether the injury happened on a ride or elsewhere',
        'The specific ride, restraint, or component involved',
        'The incident report and any prior complaints about the ride',
        'The park\u2019s ride-operation, inspection, and maintenance records',
        'Any ticket or season-pass waiver',
        'Surveillance or ride-camera footage',
        'Witness statements',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier utmost-care standard to a Valencia ride injury, pursues the ride and inspection records and any product defect, and evaluates whether a season-pass waiver can be overcome by gross negligence or the carrier duty. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What standard applies to a roller coaster injury?',
        a: 'California treats roller coasters and similar rides as common carriers, so the operator owes the heightened duty of utmost care under Civil Code section 2100 (Gomez v. Superior Court) \u2014 substantially higher than ordinary negligence.',
      },
      {
        q: 'My season pass had a waiver. Does that end my claim?',
        a: 'Rarely. A waiver may limit ordinary-negligence claims, but it generally cannot waive gross negligence, and the common-carrier duty constrains what a park can disclaim on its rides. A waiver is rarely the end of the inquiry.',
      },
      {
        q: 'A restraint or harness failed. Who is responsible?',
        a: 'Potentially the park and, through a strict product-liability claim, the manufacturer and seller of the defective restraint or component \u2014 without proof of negligence. Preserving the component and the ride records is important.',
      },
      {
        q: 'I was hurt off a ride. Is that different?',
        a: 'Yes. Off-ride slip, trip, and fall injuries follow ordinary premises-liability rules, which is a different standard from the common-carrier utmost-care duty that applies on a ride.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the ride records, product facts, and waiver analysis so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: VALLEJO_PARK_SLUG,
    category: 'Cities',
    cluster: 'Vallejo Theme Park Injury Claims',
    title: 'Vallejo Theme Park & Amusement Ride Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Vallejo amusement ride, at a marine or animal attraction, or elsewhere in the park? On a ride the operator owes utmost care \u2014 a far higher standard.',
    psychology: 'I was hurt at a Vallejo theme park and I do not know what standard applies or whether my waiver ends it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'vallejo theme park injury lawyer',
      'roller coaster injury claim california',
      'amusement park injury lawsuit california',
      'theme park waiver gross negligence california',
      'defective ride restraint claim california',
    ],
    signals: [
      'Common-carrier utmost care (rides)',
      'Premises liability (off-ride)',
      'Defective ride / restraint product',
      'State inspection & ride records',
      'Waiver rarely ends it',
      'Prior-complaint history',
    ],
    sections: {
      whyItMatters: `Vallejo\u2019s combined amusement and marine park draws large crowds to coasters, water attractions, and animal exhibits alike, so both ride and off-ride injuries occur \u2014 and the standard turns on where the injury happened. ${COMMON_CARRIER} ${PREMISES} ${PRODUCT} ${RECORDS} Civil cases are filed in Solano County Superior Court.`,
      whatToTrack: [
        'Whether the injury happened on a ride or elsewhere',
        'The specific ride, restraint, or component involved',
        'The incident report and any prior complaints about the ride',
        'The park\u2019s ride-operation, inspection, and maintenance records',
        'Any ticket or season-pass waiver',
        'Surveillance or ride-camera footage',
        'Witness statements',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier utmost-care standard to a Vallejo ride injury, pursues the ride and inspection records and any product defect, and evaluates whether a waiver can be overcome by gross negligence or the carrier duty. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What standard applies to a roller coaster injury?',
        a: 'California treats roller coasters and similar rides as common carriers, so the operator owes the heightened duty of utmost care under Civil Code section 2100 (Gomez v. Superior Court) \u2014 substantially higher than ordinary negligence.',
      },
      {
        q: 'My ticket had a waiver. Does that end my claim?',
        a: 'Rarely. A waiver may limit ordinary-negligence claims, but it generally cannot waive gross negligence, and the common-carrier duty constrains what a park can disclaim on its rides. A waiver is rarely the end of the inquiry.',
      },
      {
        q: 'A restraint or harness failed. Who is responsible?',
        a: 'Potentially the park and, through a strict product-liability claim, the manufacturer and seller of the defective restraint or component \u2014 without proof of negligence. Preserving the component and the ride records is important.',
      },
      {
        q: 'I slipped on a walkway, not on a ride. Is that different?',
        a: 'Yes. Off-ride slip, trip, and fall injuries follow ordinary premises-liability rules \u2014 the park must keep its premises reasonably safe. The location changes the standard that applies.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the ride records, product facts, and waiver analysis so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: GILROY_PARK_SLUG,
    category: 'Cities',
    cluster: 'Gilroy Theme Park Injury Claims',
    title: 'Gilroy Theme Park & Family Attraction Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Gilroy family-park ride or elsewhere in the park? On a ride the operator owes utmost care \u2014 a far higher standard than ordinary negligence.',
    psychology: 'I was hurt at a Gilroy theme park and I do not know what standard applies or whether my ticket waiver ends it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'gilroy theme park injury lawyer',
      'amusement ride injury claim california',
      'family park ride accident california',
      'theme park waiver gross negligence california',
      'defective ride restraint claim california',
    ],
    signals: [
      'Common-carrier utmost care (rides)',
      'Premises liability (off-ride)',
      'Defective ride / restraint product',
      'State inspection & ride records',
      'Waiver rarely ends it',
      'Prior-complaint history',
    ],
    sections: {
      whyItMatters: `Gilroy\u2019s family-oriented theme park draws crowds to gentler rides and garden attractions, but ride and off-ride injuries \u2014 including to children \u2014 still occur, and the standard turns on where the injury happened. ${COMMON_CARRIER} ${PREMISES} ${PRODUCT} ${RECORDS} Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'Whether the injury happened on a ride or elsewhere',
        'The specific ride, restraint, or component involved',
        'The incident report and any prior complaints about the ride',
        'The park\u2019s ride-operation, inspection, and maintenance records',
        'Any ticket or season-pass waiver',
        'Whether a child was injured (tolling may apply)',
        'Surveillance or ride-camera footage and witnesses',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the common-carrier utmost-care standard to a Gilroy ride injury, pursues the ride and inspection records and any product defect, and evaluates whether a waiver can be overcome by gross negligence or the carrier duty. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What standard applies to an amusement-ride injury?',
        a: 'California treats roller coasters and similar rides as common carriers, so the operator owes the heightened duty of utmost care under Civil Code section 2100 (Gomez v. Superior Court) \u2014 substantially higher than ordinary negligence.',
      },
      {
        q: 'My child was hurt on a ride. Does a waiver a parent signed bind the child?',
        a: 'It is complicated. A waiver may limit some claims, but it generally cannot waive gross negligence, the common-carrier duty constrains what a park can disclaim, and a minor\u2019s claim can be subject to tolling. A signed waiver is rarely the end of the inquiry.',
      },
      {
        q: 'A restraint or harness failed. Who is responsible?',
        a: 'Potentially the park and, through a strict product-liability claim, the manufacturer and seller of the defective restraint or component \u2014 without proof of negligence. Preserving the component and the ride records is important.',
      },
      {
        q: 'I was hurt off a ride. Is that different?',
        a: 'Yes. Off-ride slip, trip, and fall injuries follow ordinary premises-liability rules, a different standard from the common-carrier utmost-care duty on a ride.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the ride records, product facts, and waiver analysis so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const themeParkCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [BUENAPARK_PARK_SLUG]: {
    scenario: `A Buena Park rider was injured when a coaster restraint released mid-ride. The common-carrier utmost-care standard governed, and the restraint maker faced a product claim the ticket waiver could not shield. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the ride and seat.'],
      ['First days', 'Request ride-camera footage; preserve the component.'],
      ['First weeks', 'Pull ride-operation, inspection, and maintenance records.'],
      ['Longer term', 'Carrier-duty and product theories developed.'],
    ],
    severityLadder: [
      ['On a ride', 'Utmost care applies.'],
      ['Defect', 'The restraint maker can be strictly liable.'],
      ['Records', 'Inspection and complaint history matter.'],
      ['Waiver', 'It rarely ends the inquiry.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the ride.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the utmost-care standard applies',
      'Whether a restraint or component was defective',
      'Whether inspection and complaint records show fault',
      'Whether footage and the component were preserved',
      'Whether a waiver can be overcome',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher standard', copy: 'Rides owe utmost care.' },
      { label: 'Maker not shielded', copy: 'Product liability bypasses the waiver.' },
      { label: 'Records are key', copy: 'Inspection and complaint history.' },
      { label: 'Waiver has limits', copy: 'Gross negligence and carrier duty survive.' },
    ],
    insuranceProblems: [
      'The higher common-carrier standard is never asserted.',
      'The ride-camera footage is overwritten.',
      'The defective component is not preserved.',
      'The claim is dropped because a waiver was signed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you on a ride or elsewhere?' },
      { label: 'Step 2', question: 'What ride and component were involved?' },
      { label: 'Step 3', question: 'Is there ride-camera footage?' },
      { label: 'Step 4', question: 'Did you get an incident report?' },
    ],
  },
  [VALENCIA_PARK_SLUG]: {
    scenario: `A Valencia rider suffered a neck injury from violent shaking on a coaster with a documented history of similar complaints. The inspection records and complaint history overcame the season-pass waiver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the ride and seat.'],
      ['First days', 'Request ride-camera footage; identify the ride.'],
      ['First weeks', 'Pull inspection, maintenance, and complaint records.'],
      ['Longer term', 'Carrier-duty and gross-negligence theories developed.'],
    ],
    severityLadder: [
      ['On a ride', 'Utmost care applies.'],
      ['History', 'Prior complaints show notice.'],
      ['Records', 'Inspection history matters.'],
      ['Waiver', 'It rarely ends the inquiry.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the ride.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the utmost-care standard applies',
      'Whether prior complaints show notice',
      'Whether inspection records show fault',
      'Whether footage was preserved',
      'Whether the season-pass waiver can be overcome',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher standard', copy: 'Rides owe utmost care.' },
      { label: 'History is key', copy: 'Prior complaints prove notice.' },
      { label: 'Records are key', copy: 'Inspection and maintenance logs.' },
      { label: 'Waiver has limits', copy: 'Gross negligence and carrier duty survive.' },
    ],
    insuranceProblems: [
      'The higher common-carrier standard is never asserted.',
      'The prior-complaint history is never obtained.',
      'The ride-camera footage is overwritten.',
      'The claim is dropped because a waiver was signed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you on a ride or elsewhere?' },
      { label: 'Step 2', question: 'What ride was involved?' },
      { label: 'Step 3', question: 'Is there ride-camera footage?' },
      { label: 'Step 4', question: 'Did you get an incident report?' },
    ],
  },
  [VALLEJO_PARK_SLUG]: {
    scenario: `A Vallejo visitor was injured when a water-ride harness failed. The common-carrier duty applied on the ride, and the harness maker faced a product claim the ticket waiver could not shield. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the ride and seat.'],
      ['First days', 'Request footage; preserve the harness component.'],
      ['First weeks', 'Pull inspection, maintenance, and complaint records.'],
      ['Longer term', 'Carrier-duty and product theories developed.'],
    ],
    severityLadder: [
      ['On a ride', 'Utmost care applies.'],
      ['Defect', 'The harness maker can be strictly liable.'],
      ['Records', 'Inspection and complaint history matter.'],
      ['Waiver', 'It rarely ends the inquiry.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the ride.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the utmost-care standard applies',
      'Whether a harness or component was defective',
      'Whether inspection and complaint records show fault',
      'Whether footage and the component were preserved',
      'Whether a waiver can be overcome',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher standard', copy: 'Rides owe utmost care.' },
      { label: 'Maker not shielded', copy: 'Product liability bypasses the waiver.' },
      { label: 'Records are key', copy: 'Inspection and complaint history.' },
      { label: 'Waiver has limits', copy: 'Gross negligence and carrier duty survive.' },
    ],
    insuranceProblems: [
      'The higher common-carrier standard is never asserted.',
      'The footage is overwritten.',
      'The defective component is not preserved.',
      'The claim is dropped because a waiver was signed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you on a ride or elsewhere?' },
      { label: 'Step 2', question: 'What ride and component were involved?' },
      { label: 'Step 3', question: 'Is there footage?' },
      { label: 'Step 4', question: 'Did you get an incident report?' },
    ],
  },
  [GILROY_PARK_SLUG]: {
    scenario: `A child was injured on a Gilroy family ride when a lap bar failed to secure. A minor\u2019s tolling and the common-carrier duty meant the parent\u2019s ticket waiver did not end the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the ride.'],
      ['First days', 'Request footage; preserve the component.'],
      ['First weeks', 'Pull inspection, maintenance, and complaint records.'],
      ['Longer term', 'Carrier-duty, product, and tolling issues developed.'],
    ],
    severityLadder: [
      ['On a ride', 'Utmost care applies.'],
      ['Minor', 'Tolling can extend the deadline.'],
      ['Defect', 'The component maker can be strictly liable.'],
      ['Waiver', 'It rarely ends the inquiry.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the ride.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the utmost-care standard applies',
      'Whether a component was defective',
      'Whether a minor\u2019s tolling applies',
      'Whether footage and the component were preserved',
      'Whether the parent-signed waiver can be overcome',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Higher standard', copy: 'Rides owe utmost care.' },
      { label: 'Minor tolling', copy: 'The deadline can extend for a child.' },
      { label: 'Maker not shielded', copy: 'Product liability bypasses the waiver.' },
      { label: 'Waiver has limits', copy: 'Gross negligence and carrier duty survive.' },
    ],
    insuranceProblems: [
      'The higher common-carrier standard is never asserted.',
      'The claim is dropped because a parent signed a waiver.',
      'The footage is overwritten.',
      'The defective component is not preserved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a child injured, and on a ride?' },
      { label: 'Step 2', question: 'What ride and component were involved?' },
      { label: 'Step 3', question: 'Is there footage?' },
      { label: 'Step 4', question: 'Did you get an incident report?' },
    ],
  },
}
