import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, gym / fitness-facility injury practice area (batch 2): location-
 * specific guides for Sacramento, Fresno, Long Beach, and Anaheim, extending the
 * batch-1 hub (Los Angeles, San Diego, San Francisco, San Jose).
 *
 * The signature issues are the same everywhere: the membership waiver and whether
 * the gym\u2019s conduct crossed into gross negligence, defective equipment, and the
 * AED requirement.
 *
 * Local context, genuine rather than interpolated:
 *  - Sacramento: dense big-box chains and boutique studios serving a large
 *    commuter population, with heavy free-weight and machine use.
 *  - Fresno: chain gyms and 24-hour facilities across the Central Valley, where
 *    unsupervised late-night use and equipment maintenance recur.
 *  - Long Beach: a mix of chains, CrossFit-style boxes, and boutique studios with
 *    high-intensity training and spotting issues.
 *  - Anaheim: chain gyms and resort-adjacent hotel fitness centers serving both
 *    residents and a large visitor population.
 *
 * Applied accurately (identical to batch 1):
 *  - Liability waivers bar ordinary negligence but not gross negligence (City of
 *    Santa Barbara v. Superior Court).
 *  - Defective equipment: strict product liability against the maker plus
 *    premises negligence against the gym; a waiver does not shield the maker.
 *  - Primary assumption of risk covers inherent risks but not conduct that
 *    unreasonably increases them.
 *  - AED requirement for health studios (Health & Safety Code 104113).
 *  - Evidence is time-sensitive; two-year deadline (CCP 335.1).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a waiver applies, whether conduct was gross negligence, and which deadline governs depend on facts a licensed California attorney should review promptly.'

const WAIVER =
  'A gym membership almost always includes a liability waiver, and in California a waiver can bar an ordinary-negligence claim. It cannot, however, release a gym from gross negligence \u2014 an extreme departure from the ordinary standard of care (City of Santa Barbara v. Superior Court). So a signed waiver does not automatically end a case where the gym\u2019s conduct was egregious.'

const EQUIPMENT =
  'Defective or poorly maintained equipment can support a claim on two paths: a strict product-liability claim against the manufacturer for a design or manufacturing defect, and a premises-negligence claim against the gym for failing to inspect, maintain, or remove broken equipment. A waiver generally does not shield the equipment maker at all.'

const ASSUMPTION_RISK =
  'Primary assumption of risk covers the inherent risks of exercise, but it does not excuse conduct that unreasonably increases the risk beyond what is inherent. A trainer pushing a member well past safe limits, improper spotting, missing instruction, or a known-broken machine left in service can fall outside the protected inherent risks.'

const AED =
  'California requires health studios to acquire and maintain an automated external defibrillator (AED) and to have trained staff (Health and Safety Code section 104113). When a member suffers a cardiac emergency and the facility fails to have, maintain, or use an AED as required, that failure can be part of the claim.'

const EVIDENCE =
  'Gym-injury evidence is time-sensitive: the incident report, the specific equipment involved, surveillance video, the signed membership and waiver documents, staff and witness statements, and medical records should be gathered quickly before video is overwritten and equipment is repaired or replaced. A personal-injury deadline is generally two years (Code of Civil Procedure section 335.1).'

export const SAC_GYM_SLUG = '/sacramento-gym-injury-claim'
export const FRE_GYM_SLUG = '/fresno-gym-injury-claim'
export const LB_GYM_SLUG = '/long-beach-gym-injury-claim'
export const ANAHEIM_GYM_SLUG = '/anaheim-gym-injury-claim'

export const gymInjuryCityGuidePages2: LandingPage[] = [
  {
    slug: SAC_GYM_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Gym & Fitness Injury Claims',
    title: 'Sacramento Gym & Fitness Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Sacramento gym by broken equipment, a reckless trainer, or a missing AED? A signed waiver does not automatically end your claim.',
    psychology: 'I was hurt at a Sacramento gym and I signed a waiver, so I do not know if I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento gym injury lawyer',
      'gym waiver gross negligence california',
      'broken gym equipment injury california',
      'personal trainer negligence claim california',
      'gym aed failure claim california',
    ],
    signals: [
      'Waiver vs. gross negligence',
      'Defective-equipment product liability',
      'Assumption of risk limits',
      'AED requirement (104113)',
      'Preserve video & equipment',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s dense big-box chains and boutique studios serve a large commuter population with heavy free-weight and machine use \u2014 conditions where broken equipment and reckless training recur, and where a signed waiver is not the end of the story. ${WAIVER} ${EQUIPMENT} ${ASSUMPTION_RISK} ${AED} ${EVIDENCE} Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'The equipment or conduct that caused the injury',
        'The signed membership and waiver documents',
        'The incident report and any surveillance video',
        'The equipment\u2019s maintenance and inspection history',
        'Whether a trainer\u2019s conduct increased the risk',
        'Whether an AED was present, maintained, and used',
        'Staff and witness statements',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ evaluates whether a Sacramento gym\u2019s conduct crossed into gross negligence beyond the waiver, pursues product liability against an equipment maker the waiver cannot shield, and preserves the video and equipment before they are lost. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Do I still have a claim?',
        a: 'Possibly. In California a waiver can bar an ordinary-negligence claim, but it cannot release a gym from gross negligence \u2014 an extreme departure from the standard of care. A signed waiver does not automatically end a case where the gym\u2019s conduct was egregious.',
      },
      {
        q: 'A broken machine hurt me. Who is responsible?',
        a: 'Potentially both the equipment maker, through a strict product-liability claim for a defect, and the gym, for failing to inspect, maintain, or remove broken equipment. A waiver generally does not shield the equipment manufacturer at all.',
      },
      {
        q: 'A trainer pushed me too hard and I got hurt. Is that covered?',
        a: 'It can be. Primary assumption of risk covers the inherent risks of exercise, but not conduct that unreasonably increases the risk \u2014 a trainer pushing well past safe limits, improper spotting, or missing instruction can fall outside the protected risks.',
      },
      {
        q: 'The gym had no working AED when I had a cardiac emergency. Does that matter?',
        a: 'Yes. California requires health studios to have and maintain an AED and trained staff (Health and Safety Code section 104113). A failure to have, maintain, or use an AED as required can be part of the claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the waiver, equipment, and AED facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRE_GYM_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Gym & Fitness Injury Claims',
    title: 'Fresno Gym & Fitness Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Fresno gym by broken equipment, unsupervised late-night hazards, or a missing AED? A signed waiver does not automatically end your claim.',
    psychology: 'I was hurt at a Fresno gym and I signed a waiver, so I do not know if I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno gym injury lawyer',
      'gym waiver gross negligence california',
      'broken gym equipment injury california',
      '24 hour gym injury claim california',
      'gym aed failure claim california',
    ],
    signals: [
      'Waiver vs. gross negligence',
      'Defective-equipment product liability',
      'Unsupervised late-night hazards',
      'AED requirement (104113)',
      'Preserve video & equipment',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s chain gyms and 24-hour facilities across the Central Valley see heavy unsupervised late-night use, where broken equipment left in service and the absence of staff recur \u2014 and where a signed waiver is not the end of the story. ${WAIVER} ${EQUIPMENT} ${ASSUMPTION_RISK} ${AED} ${EVIDENCE} Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'The equipment or conduct that caused the injury',
        'The signed membership and waiver documents',
        'The incident report and any surveillance video',
        'The equipment\u2019s maintenance and inspection history',
        'Whether the facility was staffed and supervised',
        'Whether an AED was present, maintained, and used',
        'Staff and witness statements',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ evaluates whether a Fresno gym\u2019s conduct \u2014 including leaving a known-broken machine in service unsupervised \u2014 crossed into gross negligence, pursues product liability against the equipment maker, and preserves the video and equipment. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Do I still have a claim?',
        a: 'Possibly. In California a waiver can bar an ordinary-negligence claim, but it cannot release a gym from gross negligence \u2014 an extreme departure from the standard of care. A signed waiver does not automatically end a case where the gym\u2019s conduct was egregious.',
      },
      {
        q: 'It was a 24-hour gym with no staff around. Does that matter?',
        a: 'It can. Leaving a known-broken machine in service, or failing to maintain equipment or provide required safety measures at an unstaffed facility, can support a premises-negligence claim and, if egregious, gross negligence beyond the waiver.',
      },
      {
        q: 'A broken machine hurt me. Who is responsible?',
        a: 'Potentially both the equipment maker, through a strict product-liability claim for a defect, and the gym, for failing to inspect, maintain, or remove broken equipment. A waiver generally does not shield the equipment manufacturer at all.',
      },
      {
        q: 'The gym had no working AED when I had a cardiac emergency. Does that matter?',
        a: 'Yes. California requires health studios to have and maintain an AED and trained staff (Health and Safety Code section 104113). A failure to have, maintain, or use an AED as required can be part of the claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the waiver, equipment, and AED facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_GYM_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Gym & Fitness Injury Claims',
    title: 'Long Beach Gym & Fitness Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Long Beach gym or training box by a reckless trainer, improper spotting, or broken equipment? A signed waiver does not automatically end your claim.',
    psychology: 'I was hurt at a Long Beach gym and I signed a waiver, so I do not know if I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach gym injury lawyer',
      'gym waiver gross negligence california',
      'crossfit injury claim california',
      'personal trainer negligence claim california',
      'broken gym equipment injury california',
    ],
    signals: [
      'Waiver vs. gross negligence',
      'Trainer / spotting conduct',
      'Defective-equipment product liability',
      'Assumption of risk limits',
      'AED requirement (104113)',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s mix of chains, CrossFit-style boxes, and boutique studios features high-intensity training and heavy spotting \u2014 exactly where a trainer\u2019s conduct can unreasonably increase the risk beyond what is inherent, and where a signed waiver is not the end of the story. ${WAIVER} ${ASSUMPTION_RISK} ${EQUIPMENT} ${AED} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The conduct or equipment that caused the injury',
        'The signed membership and waiver documents',
        'Whether a trainer\u2019s conduct increased the risk',
        'The incident report and any surveillance video',
        'The equipment\u2019s maintenance and inspection history',
        'Whether an AED was present, maintained, and used',
        'Staff and witness statements',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ evaluates whether a Long Beach trainer\u2019s conduct or a broken machine crossed the line the waiver cannot cover, pursues product liability against an equipment maker, and preserves the video and equipment before they are lost. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A trainer pushed me too hard and I got hurt. Is that covered?',
        a: 'It can be. Primary assumption of risk covers the inherent risks of exercise, but not conduct that unreasonably increases the risk \u2014 a trainer pushing well past safe limits, improper spotting, or missing instruction can fall outside the protected risks.',
      },
      {
        q: 'I signed a waiver. Do I still have a claim?',
        a: 'Possibly. In California a waiver can bar an ordinary-negligence claim, but it cannot release a gym from gross negligence \u2014 an extreme departure from the standard of care. A signed waiver does not automatically end a case where the gym\u2019s conduct was egregious.',
      },
      {
        q: 'A broken machine hurt me. Who is responsible?',
        a: 'Potentially both the equipment maker, through a strict product-liability claim for a defect, and the gym, for failing to inspect, maintain, or remove broken equipment. A waiver generally does not shield the equipment manufacturer at all.',
      },
      {
        q: 'The gym had no working AED when I had a cardiac emergency. Does that matter?',
        a: 'Yes. California requires health studios to have and maintain an AED and trained staff (Health and Safety Code section 104113). A failure to have, maintain, or use an AED as required can be part of the claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the waiver, trainer, and equipment facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_GYM_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Gym & Fitness Injury Claims',
    title: 'Anaheim Gym & Fitness Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at an Anaheim gym or hotel fitness center by broken equipment, a reckless trainer, or a missing AED? A signed waiver does not automatically end your claim.',
    psychology: 'I was hurt at an Anaheim gym and I signed a waiver, so I do not know if I have a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim gym injury lawyer',
      'gym waiver gross negligence california',
      'hotel fitness center injury california',
      'broken gym equipment injury california',
      'gym aed failure claim california',
    ],
    signals: [
      'Waiver vs. gross negligence',
      'Defective-equipment product liability',
      'Hotel fitness-center hazards',
      'Assumption of risk limits',
      'AED requirement (104113)',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s chain gyms and resort-adjacent hotel fitness centers serve both residents and a large visitor population, where an unmaintained hotel gym machine or an absent AED recurs \u2014 and where a signed waiver, or an assumption that a hotel gym carries no duty, is not the end of the story. ${WAIVER} ${EQUIPMENT} ${AED} ${ASSUMPTION_RISK} ${EVIDENCE} Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'The equipment or conduct that caused the injury',
        'Whether it was a gym or a hotel fitness center',
        'The signed membership and waiver documents (if any)',
        'The incident report and any surveillance video',
        'The equipment\u2019s maintenance and inspection history',
        'Whether an AED was present, maintained, and used',
        'Staff and witness statements',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ evaluates whether an Anaheim gym or hotel fitness center\u2019s conduct crossed into gross negligence, pursues product liability against an equipment maker, checks the AED requirement, and preserves the video and equipment before they are lost. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt in a hotel fitness center, not a gym I joined. Does that matter?',
        a: 'A hotel still owes guests reasonable care in its fitness center \u2014 maintaining equipment and, where the facility qualifies as a health studio, meeting the AED requirement. Whether you signed a waiver, and whether the conduct was egregious, still shape the claim.',
      },
      {
        q: 'I signed a waiver. Do I still have a claim?',
        a: 'Possibly. In California a waiver can bar an ordinary-negligence claim, but it cannot release a facility from gross negligence \u2014 an extreme departure from the standard of care. A signed waiver does not automatically end a case where the conduct was egregious.',
      },
      {
        q: 'A broken machine hurt me. Who is responsible?',
        a: 'Potentially both the equipment maker, through a strict product-liability claim for a defect, and the facility, for failing to inspect, maintain, or remove broken equipment. A waiver generally does not shield the equipment manufacturer at all.',
      },
      {
        q: 'The facility had no working AED when I had a cardiac emergency. Does that matter?',
        a: 'Yes. California requires health studios to have and maintain an AED and trained staff (Health and Safety Code section 104113). A failure to have, maintain, or use an AED as required can be part of the claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the waiver, equipment, and AED facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const gymInjuryCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SAC_GYM_SLUG]: {
    scenario: `A Sacramento member was injured when a cable machine\u2019s frayed pulley snapped. The gym had logged prior complaints and left it in service; the equipment maker and the gym were both pursued despite the waiver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the equipment; get the incident report.'],
      ['First days', 'Request the surveillance video and waiver documents.'],
      ['First weeks', 'Pull the maintenance and complaint history.'],
      ['Longer term', 'Gross-negligence and product theories developed.'],
    ],
    severityLadder: [
      ['The waiver', 'Bars ordinary, not gross, negligence.'],
      ['The equipment', 'A defect adds the maker as a defendant.'],
      ['The conduct', 'Leaving it in service can be egregious.'],
      ['Preserve', 'Video and equipment are time-sensitive.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the conduct was gross negligence',
      'Whether the equipment was defective',
      'Whether prior complaints show notice',
      'Whether video and equipment were preserved',
      'Whether an AED failure applies',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
      { label: 'Maker not shielded', copy: 'Product liability bypasses the waiver.' },
      { label: 'Notice matters', copy: 'Prior complaints show knowledge.' },
      { label: 'Preserve evidence', copy: 'Video overwrites; equipment is replaced.' },
    ],
    insuranceProblems: [
      'The claim is dropped because a waiver was signed.',
      'The surveillance video is overwritten before it is requested.',
      'The defective equipment is repaired or replaced.',
      'The maintenance and complaint history is never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What equipment or conduct caused the injury?' },
      { label: 'Step 2', question: 'Did you sign a waiver?' },
      { label: 'Step 3', question: 'Was there surveillance video?' },
      { label: 'Step 4', question: 'Had the problem been reported before?' },
    ],
  },
  [FRE_GYM_SLUG]: {
    scenario: `A Fresno member using a 24-hour gym alone at night was hurt on a machine flagged out of order weeks earlier but never removed. The unsupervised, ignored hazard supported gross negligence beyond the waiver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the equipment; get the incident report.'],
      ['First days', 'Request the surveillance video and waiver documents.'],
      ['First weeks', 'Pull the maintenance and out-of-order history.'],
      ['Longer term', 'Gross-negligence and product theories developed.'],
    ],
    severityLadder: [
      ['The waiver', 'Bars ordinary, not gross, negligence.'],
      ['Unsupervised', 'No staff to remove the hazard.'],
      ['The equipment', 'A defect adds the maker as a defendant.'],
      ['Preserve', 'Video and equipment are time-sensitive.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the conduct was gross negligence',
      'Whether a known-broken machine was left in service',
      'Whether the equipment was defective',
      'Whether video and records were preserved',
      'Whether an AED failure applies',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
      { label: 'Ignored hazard', copy: 'A known-broken machine is egregious.' },
      { label: 'Maker not shielded', copy: 'Product liability bypasses the waiver.' },
      { label: 'Preserve evidence', copy: 'Video overwrites; equipment is replaced.' },
    ],
    insuranceProblems: [
      'The claim is dropped because a waiver was signed.',
      'The out-of-order and maintenance history is never obtained.',
      'The surveillance video is overwritten before it is requested.',
      'The defective equipment is repaired or replaced.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What equipment caused the injury?' },
      { label: 'Step 2', question: 'Was the machine flagged out of order?' },
      { label: 'Step 3', question: 'Was the facility staffed at the time?' },
      { label: 'Step 4', question: 'Was there surveillance video?' },
    ],
  },
  [LB_GYM_SLUG]: {
    scenario: `A Long Beach member at a training box was injured when a coach loaded far too much weight and failed to spot a lift. The conduct unreasonably increased the risk beyond what is inherent, outside the waiver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the coach and get the incident report.'],
      ['First days', 'Request the surveillance video and waiver documents.'],
      ['First weeks', 'Gather witness statements and training records.'],
      ['Longer term', 'Increased-risk and gross-negligence theories developed.'],
    ],
    severityLadder: [
      ['The waiver', 'Bars ordinary, not gross, negligence.'],
      ['The conduct', 'Improper spotting increased the risk.'],
      ['Assumption of risk', 'Does not cover increased risk.'],
      ['Preserve', 'Video and witnesses are time-sensitive.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the trainer unreasonably increased the risk',
      'Whether the conduct was gross negligence',
      'Whether video and witnesses were preserved',
      'Whether training records support the claim',
      'Whether an AED failure applies',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Increased risk', copy: 'Not covered by assumption of risk.' },
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
      { label: 'Preserve video', copy: 'It captures the coaching conduct.' },
      { label: 'Witnesses matter', copy: 'They confirm the improper spotting.' },
    ],
    insuranceProblems: [
      'The claim is dropped because a waiver was signed.',
      'The surveillance video is overwritten before it is requested.',
      'Witnesses to the coaching conduct are never identified.',
      'The trainer\u2019s qualifications and records are never pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What did the trainer or coach do?' },
      { label: 'Step 2', question: 'Was there improper spotting or loading?' },
      { label: 'Step 3', question: 'Was there surveillance video?' },
      { label: 'Step 4', question: 'Were there witnesses?' },
    ],
  },
  [ANAHEIM_GYM_SLUG]: {
    scenario: `An Anaheim hotel guest was injured on an unmaintained treadmill in the hotel fitness center, which also had no working AED. The hotel\u2019s duty and the AED failure anchored the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the equipment; get an incident report.'],
      ['First days', 'Request the surveillance video and any waiver.'],
      ['First weeks', 'Pull the maintenance and AED-compliance records.'],
      ['Longer term', 'Premises, product, and AED theories developed.'],
    ],
    severityLadder: [
      ['The duty', 'Hotels owe guests reasonable care.'],
      ['The equipment', 'A defect adds the maker as a defendant.'],
      ['AED', 'A required AED must be present and working.'],
      ['Preserve', 'Video and equipment are time-sensitive.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the facility maintained the equipment',
      'Whether the equipment was defective',
      'Whether an AED was present and working',
      'Whether video and equipment were preserved',
      'Whether any waiver applies',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Hotel duty', copy: 'Guests are owed reasonable care.' },
      { label: 'AED requirement', copy: 'Health studios must maintain one.' },
      { label: 'Maker not shielded', copy: 'Product liability applies.' },
      { label: 'Preserve evidence', copy: 'Video overwrites; equipment is replaced.' },
    ],
    insuranceProblems: [
      'The hotel-fitness-center duty is never asserted.',
      'The surveillance video is overwritten before it is requested.',
      'AED compliance is never examined.',
      'The defective equipment is repaired or replaced.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a gym or a hotel fitness center?' },
      { label: 'Step 2', question: 'What equipment caused the injury?' },
      { label: 'Step 3', question: 'Was an AED present and working?' },
      { label: 'Step 4', question: 'Was there surveillance video?' },
    ],
  },
}
