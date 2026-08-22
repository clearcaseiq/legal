import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, trampoline-park / inflatable / family-entertainment-center injury
 * practice area: location-specific guides for Los Angeles, San Diego,
 * Sacramento, and San Jose.
 *
 * These claims are distinct because of the liability waiver almost every guest
 * signs and the special rules that limit it \u2014 particularly that a waiver cannot
 * bar a claim for gross negligence, and that a parent generally cannot waive a
 * minor child\u2019s own right to sue. The core theory is operator negligence, often
 * alongside a product-defect claim.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: a dense market of trampoline parks and family-entertainment
 *    centers with high weekend volume.
 *  - San Diego: family and tourist-oriented entertainment venues.
 *  - Sacramento: suburban family-entertainment centers serving a wide region.
 *  - San Jose: a suburban family market with many indoor activity parks.
 *
 * Applied accurately:
 *  - Liability waivers are common but limited. A waiver can bar a claim for
 *    ordinary negligence, but it cannot bar a claim for gross negligence (City of
 *    Santa Barbara v. Superior Court), and a parent generally cannot waive a
 *    minor child\u2019s own claim \u2014 which is central because most guests are children.
 *  - The core theory is operator negligence: inadequate supervision or court
 *    monitoring, overcrowding, failing to enforce safety rules, or poor
 *    maintenance of padding, nets, springs, or anchoring.
 *  - A defective trampoline, net, inflatable, or anchor can add a strict product-
 *    liability claim against the manufacturer.
 *  - Primary assumption of risk covers the inherent risks of the activity, but an
 *    operator that increases the risk beyond what is inherent \u2014 by overcrowding a
 *    court or leaving padding worn \u2014 can still be liable.
 *  - The deadline is generally two years (Code of Civil Procedure section 335.1);
 *    for a minor, special tolling rules can apply and should be reviewed.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a waiver bars a claim, whether conduct was gross negligence, and how a minor\u2019s claim is handled depend on facts a licensed California attorney should review promptly.'

const WAIVER =
  'A liability waiver is limited by law. It can bar a claim for ordinary negligence, but it cannot bar a claim for gross negligence \u2014 an extreme departure from ordinary care (City of Santa Barbara v. Superior Court). Just as important, a parent generally cannot waive a minor child\u2019s own right to sue, which matters because most guests at these venues are children.'

const OPERATOR =
  'The core theory is operator negligence: inadequate supervision or monitoring of a court or attraction, overcrowding, failing to enforce posted safety rules (such as one jumper per trampoline), or poor maintenance of padding, nets, springs, or anchoring. Where such failures rise to an extreme departure from ordinary care, they can amount to gross negligence a waiver does not cover.'

const PRODUCT =
  'A defective trampoline, safety net, inflatable, or anchoring system can add a strict product-liability claim against the manufacturer \u2014 a claim that does not depend on the waiver at all. Preserving the equipment and identifying its maker is therefore important.'

const RISK =
  'Primary assumption of risk covers the inherent risks of an activity, but it does not protect an operator that increases the risk beyond what is inherent \u2014 for example, by overcrowding a court, allowing double-bouncing, or leaving padding worn or missing. The question is whether the operator made the activity more dangerous than it needed to be.'

export const LA_TRAMP_SLUG = '/los-angeles-trampoline-park-injury-claim'
export const SD_TRAMP_SLUG = '/san-diego-trampoline-park-injury-claim'
export const SAC_TRAMP_SLUG = '/sacramento-trampoline-park-injury-claim'
export const SJ_TRAMP_SLUG = '/san-jose-trampoline-park-injury-claim'

export const trampolineParkCityGuidePages: LandingPage[] = [
  {
    slug: LA_TRAMP_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Trampoline Park & Play-Center Injury Claims',
    title: 'Los Angeles Trampoline Park & Play-Center Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at an LA trampoline park or play center after signing a waiver? A waiver does not bar gross negligence \u2014 and a parent cannot waive a child\u2019s claim.',
    psychology: 'My child was hurt at an LA trampoline park but I signed a waiver and I do not know if we can still make a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles trampoline park injury lawyer',
      'trampoline park waiver claim california',
      'child hurt trampoline park lawsuit california',
      'gross negligence waiver california',
      'family entertainment center injury california',
    ],
    signals: [
      'Waiver does not bar gross negligence',
      'Parent cannot waive a minor\u2019s claim',
      'Operator negligence',
      'Product-defect claim possible',
      'Assumption of risk has limits',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s dense market of trampoline parks and family-entertainment centers sees high weekend volume \u2014 and high injury rates \u2014 where the waiver every guest signs is not the end of the story it appears to be. ${WAIVER} ${OPERATOR} ${PRODUCT} ${RISK} The deadline is generally two years, with special rules for minors. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The waiver signed and who signed it (adult vs. for a minor)',
        'How the injury happened and what rule or failure was involved',
        'Whether the court was overcrowded or unsupervised',
        'The condition of padding, nets, springs, or anchoring',
        'Any incident report and surveillance video',
        'Whether an equipment defect may be involved',
        'Whether the injured person is a minor',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ analyses the LA venue\u2019s waiver against California\u2019s limits, gathers the incident report and video, documents overcrowding or maintenance failures that can amount to gross negligence, and flags any product-defect or minor\u2019s claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Can I still bring a claim?',
        a: 'Possibly. A waiver can bar a claim for ordinary negligence, but it cannot bar a claim for gross negligence \u2014 an extreme departure from ordinary care (City of Santa Barbara v. Superior Court). And a parent generally cannot waive a minor child\u2019s own claim, which matters at these venues.',
      },
      {
        q: 'My child was hurt and I signed for them. Does the waiver end it?',
        a: 'Not necessarily. A parent generally cannot waive a minor child\u2019s own right to sue in California. The child may have a claim in their own name even though you signed, and special deadline rules for minors can apply.',
      },
      {
        q: 'What counts as gross negligence at a trampoline park?',
        a: 'An extreme departure from ordinary care \u2014 for example, badly overcrowding a court, ignoring posted safety rules, or leaving padding worn or missing over springs. Whether conduct rises to that level is fact-specific and should be reviewed by an attorney.',
      },
      {
        q: 'Could the equipment maker be responsible?',
        a: 'Possibly. A defective trampoline, net, inflatable, or anchor can support a strict product-liability claim against the manufacturer, which does not depend on the waiver. Preserving the equipment and identifying its maker helps.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the waiver, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_TRAMP_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Trampoline Park & Play-Center Injury Claims',
    title: 'San Diego Trampoline Park & Play-Center Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a San Diego trampoline park or entertainment venue despite a waiver? A waiver does not bar gross negligence \u2014 and a parent cannot waive a child\u2019s claim.',
    psychology: 'My family was hurt at a San Diego entertainment venue but there was a waiver and I do not know our rights.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego trampoline park injury lawyer',
      'trampoline park waiver claim california',
      'child hurt play center lawsuit california',
      'gross negligence waiver california',
      'family entertainment center injury california',
    ],
    signals: [
      'Waiver does not bar gross negligence',
      'Parent cannot waive a minor\u2019s claim',
      'Operator negligence',
      'Product-defect claim possible',
      'Assumption of risk has limits',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s family- and tourist-oriented entertainment venues draw large crowds, and an injury there \u2014 despite the waiver at the door \u2014 can still support a claim where the operator was grossly negligent or the injured guest is a child. ${WAIVER} ${OPERATOR} ${PRODUCT} ${RISK} The deadline is generally two years, with special rules for minors. Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The waiver signed and who signed it (adult vs. for a minor)',
        'How the injury happened and what rule or failure was involved',
        'Whether the venue was overcrowded or unsupervised',
        'The condition of equipment, padding, nets, or anchoring',
        'Any incident report and surveillance video',
        'Whether an equipment defect may be involved',
        'Whether the injured person is a minor',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ analyses a San Diego venue\u2019s waiver against California\u2019s limits, gathers the incident report and video, documents overcrowding or maintenance failures, and flags any product-defect or minor\u2019s claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Can I still bring a claim?',
        a: 'Possibly. A waiver can bar ordinary negligence, but it cannot bar gross negligence \u2014 an extreme departure from ordinary care (City of Santa Barbara v. Superior Court). A parent also generally cannot waive a minor child\u2019s own claim.',
      },
      {
        q: 'My child was hurt and I signed for them. Does the waiver end it?',
        a: 'Not necessarily. A parent generally cannot waive a minor child\u2019s own right to sue in California, so the child may have a claim in their own name, and special deadline rules for minors can apply.',
      },
      {
        q: 'What counts as gross negligence?',
        a: 'An extreme departure from ordinary care \u2014 for example, badly overcrowding an attraction, ignoring posted safety rules, or leaving worn or missing padding. Whether conduct reaches that level is fact-specific.',
      },
      {
        q: 'Could the equipment maker be responsible?',
        a: 'Possibly. A defective trampoline, net, inflatable, or anchor can support a strict product-liability claim that does not depend on the waiver. Preserving the equipment helps.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the waiver, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_TRAMP_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Trampoline Park & Play-Center Injury Claims',
    title: 'Sacramento Trampoline Park & Play-Center Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Sacramento-area trampoline park or play center after signing a waiver? A waiver does not bar gross negligence \u2014 and a parent cannot waive a child\u2019s claim.',
    psychology: 'My child was hurt at a Sacramento-area play center but I signed a waiver and I do not know if we can still make a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento trampoline park injury lawyer',
      'trampoline park waiver claim california',
      'child hurt trampoline park lawsuit california',
      'gross negligence waiver california',
      'family entertainment center injury california',
    ],
    signals: [
      'Waiver does not bar gross negligence',
      'Parent cannot waive a minor\u2019s claim',
      'Operator negligence',
      'Product-defect claim possible',
      'Assumption of risk has limits',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Suburban family-entertainment centers across the Sacramento region draw steady crowds of children, and an injury at one \u2014 despite the waiver \u2014 can still support a claim where the operator was grossly negligent or the injured guest is a minor. ${WAIVER} ${OPERATOR} ${PRODUCT} ${RISK} The deadline is generally two years, with special rules for minors. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'The waiver signed and who signed it (adult vs. for a minor)',
        'How the injury happened and what rule or failure was involved',
        'Whether the court or attraction was overcrowded or unsupervised',
        'The condition of padding, nets, springs, or anchoring',
        'Any incident report and surveillance video',
        'Whether an equipment defect may be involved',
        'Whether the injured person is a minor',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ analyses a Sacramento-area venue\u2019s waiver against California\u2019s limits, gathers the incident report and video, documents supervision or maintenance failures, and flags any product-defect or minor\u2019s claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Can I still bring a claim?',
        a: 'Possibly. A waiver can bar ordinary negligence, but not gross negligence \u2014 an extreme departure from ordinary care (City of Santa Barbara v. Superior Court). And a parent generally cannot waive a minor child\u2019s own claim.',
      },
      {
        q: 'My child was hurt and I signed for them. Does the waiver end it?',
        a: 'Not necessarily. A parent generally cannot waive a minor child\u2019s own right to sue in California, so the child may have a claim in their own name, and special deadline rules for minors can apply.',
      },
      {
        q: 'What counts as gross negligence?',
        a: 'An extreme departure from ordinary care \u2014 for example, badly overcrowding a court, ignoring posted safety rules, or leaving worn or missing padding. Whether conduct reaches that level is fact-specific.',
      },
      {
        q: 'Could the equipment maker be responsible?',
        a: 'Possibly. A defective trampoline, net, inflatable, or anchor can support a strict product-liability claim that does not depend on the waiver. Preserving the equipment helps.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the waiver, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_TRAMP_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Trampoline Park & Play-Center Injury Claims',
    title: 'San Jose Trampoline Park & Play-Center Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a San Jose trampoline park or indoor activity park after signing a waiver? A waiver does not bar gross negligence \u2014 and a parent cannot waive a child\u2019s claim.',
    psychology: 'My child was hurt at a San Jose indoor activity park but I signed a waiver and I do not know our options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose trampoline park injury lawyer',
      'trampoline park waiver claim california',
      'indoor activity park injury lawsuit california',
      'gross negligence waiver california',
      'family entertainment center injury california',
    ],
    signals: [
      'Waiver does not bar gross negligence',
      'Parent cannot waive a minor\u2019s claim',
      'Operator negligence',
      'Product-defect claim possible',
      'Assumption of risk has limits',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s suburban family market supports many indoor activity and trampoline parks, and an injury at one \u2014 despite the waiver every guest signs \u2014 can still support a claim where the operator was grossly negligent or the injured guest is a child. ${WAIVER} ${OPERATOR} ${PRODUCT} ${RISK} The deadline is generally two years, with special rules for minors. Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'The waiver signed and who signed it (adult vs. for a minor)',
        'How the injury happened and what rule or failure was involved',
        'Whether the attraction was overcrowded or unsupervised',
        'The condition of padding, nets, springs, or anchoring',
        'Any incident report and surveillance video',
        'Whether an equipment defect may be involved',
        'Whether the injured person is a minor',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ analyses a San Jose venue\u2019s waiver against California\u2019s limits, gathers the incident report and video, documents overcrowding or maintenance failures, and flags any product-defect or minor\u2019s claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Can I still bring a claim?',
        a: 'Possibly. A waiver can bar ordinary negligence, but not gross negligence \u2014 an extreme departure from ordinary care (City of Santa Barbara v. Superior Court). And a parent generally cannot waive a minor child\u2019s own claim.',
      },
      {
        q: 'My child was hurt and I signed for them. Does the waiver end it?',
        a: 'Not necessarily. A parent generally cannot waive a minor child\u2019s own right to sue in California, so the child may have a claim in their own name, and special deadline rules for minors can apply.',
      },
      {
        q: 'What counts as gross negligence?',
        a: 'An extreme departure from ordinary care \u2014 for example, badly overcrowding an attraction, ignoring posted safety rules, or leaving worn or missing padding. Whether conduct reaches that level is fact-specific.',
      },
      {
        q: 'Could the equipment maker be responsible?',
        a: 'Possibly. A defective trampoline, net, inflatable, or anchor can support a strict product-liability claim that does not depend on the waiver. Preserving the equipment helps.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the waiver, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const trampolineParkCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_TRAMP_SLUG]: {
    scenario: `An LA child broke a leg when a park let too many jumpers onto one court and a double-bounce sent them off. Overcrowding despite posted rules raised a gross-negligence question the waiver did not cover, and the child\u2019s own claim survived. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the incident report; note the crowding and rules.'],
      ['First days', 'Preserve the waiver and request surveillance video.'],
      ['First weeks', 'Assess gross negligence and any product defect.'],
      ['Longer term', 'The minor\u2019s claim and treatment documented.'],
    ],
    severityLadder: [
      ['Waiver limits', 'It does not bar gross negligence.'],
      ['Minor\u2019s claim', 'A parent cannot waive it.'],
      ['Operator fault', 'Overcrowding increases the risk.'],
      ['Product?', 'A defect adds a separate claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether conduct rises to gross negligence',
      'Whether the injured guest is a minor',
      'Whether overcrowding or rule-breaking is shown',
      'Whether the video and incident report are obtained',
      'Whether an equipment defect is involved',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Waiver has limits', copy: 'Gross negligence is not barred.' },
      { label: 'Kids\u2019 claims survive', copy: 'A parent cannot waive them.' },
      { label: 'Get the video', copy: 'It shows crowding and rule-breaking.' },
      { label: 'Product angle', copy: 'A defect avoids the waiver entirely.' },
    ],
    insuranceProblems: [
      'The claim is dropped on seeing the waiver.',
      'Surveillance video is never requested and is overwritten.',
      'The minor\u2019s separate claim is overlooked.',
      'A product defect is never investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Who signed the waiver, and for whom?' },
      { label: 'Step 2', question: 'Was the court crowded or unsupervised?' },
      { label: 'Step 3', question: 'Is the injured person a minor?' },
      { label: 'Step 4', question: 'How did the injury happen?' },
    ],
  },
  [SD_TRAMP_SLUG]: {
    scenario: `A San Diego guest was hurt on an inflatable with a torn seam that staff knew about. The known defect and failure to close the attraction raised gross negligence beyond the waiver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the incident report; photograph the equipment.'],
      ['First days', 'Preserve the waiver; request video and maintenance logs.'],
      ['First weeks', 'Assess gross negligence and any product defect.'],
      ['Longer term', 'Liability and treatment documented.'],
    ],
    severityLadder: [
      ['Waiver limits', 'It does not bar gross negligence.'],
      ['Known defect', 'Ignoring it increases the risk.'],
      ['Operator fault', 'Failing to close the attraction.'],
      ['Product?', 'A defect adds a separate claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether staff knew of the hazard',
      'Whether conduct rises to gross negligence',
      'Whether the video and maintenance logs are obtained',
      'Whether an equipment defect is involved',
      'Whether the injured guest is a minor',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Known hazard', copy: 'Ignoring it can be gross negligence.' },
      { label: 'Waiver has limits', copy: 'Gross negligence is not barred.' },
      { label: 'Get the logs', copy: 'Maintenance records show notice.' },
      { label: 'Product angle', copy: 'A defect avoids the waiver entirely.' },
    ],
    insuranceProblems: [
      'The claim is dropped on seeing the waiver.',
      'Maintenance logs and video are never obtained.',
      'The equipment is repaired before it is examined.',
      'The minor\u2019s separate claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What equipment or attraction was involved?' },
      { label: 'Step 2', question: 'Did staff seem aware of a problem?' },
      { label: 'Step 3', question: 'Who signed the waiver, and for whom?' },
      { label: 'Step 4', question: 'Is the injured person a minor?' },
    ],
  },
  [SAC_TRAMP_SLUG]: {
    scenario: `A Sacramento-area child was hurt where worn padding left springs exposed. The maintenance failure raised gross negligence, and the child\u2019s own claim was not barred by the parent\u2019s waiver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the incident report; photograph the worn padding.'],
      ['First days', 'Preserve the waiver; request video and maintenance logs.'],
      ['First weeks', 'Assess gross negligence and any product defect.'],
      ['Longer term', 'The minor\u2019s claim and treatment documented.'],
    ],
    severityLadder: [
      ['Waiver limits', 'It does not bar gross negligence.'],
      ['Maintenance fault', 'Exposed springs increase the risk.'],
      ['Minor\u2019s claim', 'A parent cannot waive it.'],
      ['Product?', 'A defect adds a separate claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether maintenance failures are documented',
      'Whether conduct rises to gross negligence',
      'Whether the injured guest is a minor',
      'Whether the video and logs are obtained',
      'Whether an equipment defect is involved',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Maintenance matters', copy: 'Worn padding shows neglect.' },
      { label: 'Waiver has limits', copy: 'Gross negligence is not barred.' },
      { label: 'Kids\u2019 claims survive', copy: 'A parent cannot waive them.' },
      { label: 'Get the logs', copy: 'Maintenance records show neglect.' },
    ],
    insuranceProblems: [
      'The claim is dropped on seeing the waiver.',
      'The padding is repaired before it is documented.',
      'Maintenance logs and video are never obtained.',
      'The minor\u2019s separate claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was padding worn or missing where you were hurt?' },
      { label: 'Step 2', question: 'Who signed the waiver, and for whom?' },
      { label: 'Step 3', question: 'Is the injured person a minor?' },
      { label: 'Step 4', question: 'How did the injury happen?' },
    ],
  },
  [SJ_TRAMP_SLUG]: {
    scenario: `A San Jose guest was hurt when an unsupervised foam pit was too shallow. The staffing and configuration failure raised gross negligence beyond the waiver, and the equipment maker was also examined. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the incident report; note the supervision and setup.'],
      ['First days', 'Preserve the waiver; request video and staffing records.'],
      ['First weeks', 'Assess gross negligence and any product defect.'],
      ['Longer term', 'Liability and treatment documented.'],
    ],
    severityLadder: [
      ['Waiver limits', 'It does not bar gross negligence.'],
      ['Configuration fault', 'A shallow pit increases the risk.'],
      ['Supervision', 'Understaffing compounds it.'],
      ['Product?', 'A defect adds a separate claim.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the setup or supervision was unsafe',
      'Whether conduct rises to gross negligence',
      'Whether the video and staffing records are obtained',
      'Whether an equipment defect is involved',
      'Whether the injured guest is a minor',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Setup matters', copy: 'An unsafe configuration increases risk.' },
      { label: 'Waiver has limits', copy: 'Gross negligence is not barred.' },
      { label: 'Get the records', copy: 'Staffing logs and video help.' },
      { label: 'Product angle', copy: 'A defect avoids the waiver entirely.' },
    ],
    insuranceProblems: [
      'The claim is dropped on seeing the waiver.',
      'Staffing records and video are never obtained.',
      'The configuration is changed before it is documented.',
      'The minor\u2019s separate claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What attraction was involved, and how was it set up?' },
      { label: 'Step 2', question: 'Was staff supervising it?' },
      { label: 'Step 3', question: 'Who signed the waiver, and for whom?' },
      { label: 'Step 4', question: 'Is the injured person a minor?' },
    ],
  },
}
