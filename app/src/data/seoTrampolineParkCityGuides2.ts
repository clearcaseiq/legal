import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, trampoline-park / indoor-adventure injury practice area (batch 2):
 * location-specific guides for Fresno, Long Beach, Anaheim, and Oakland,
 * extending the batch-1 hub (Los Angeles, San Diego, Sacramento, San Jose).
 *
 * Applied accurately (identical to batch 1):
 *  - A waiver bars ordinary negligence but not gross negligence
 *    (City of Santa Barbara v. Superior Court); a parent generally cannot waive
 *    a minor child\u2019s own right to sue.
 *  - Operator negligence: supervision, overcrowding, rule enforcement,
 *    maintenance of padding/nets/springs/anchoring.
 *  - Defective equipment: strict product liability, independent of the waiver.
 *  - Primary assumption of risk does not cover risks the operator increased.
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

export const FRESNO_TRAMP_SLUG = '/fresno-trampoline-park-injury-claim'
export const LB_TRAMP_SLUG = '/long-beach-trampoline-park-injury-claim'
export const ANAHEIM_TRAMP_SLUG = '/anaheim-trampoline-park-injury-claim'
export const OAK_TRAMP_SLUG = '/oakland-trampoline-park-injury-claim'

export const trampolineParkCityGuidePages2: LandingPage[] = [
  {
    slug: FRESNO_TRAMP_SLUG,
    category: 'Cities',
    cluster: 'Fresno Trampoline Park Injury Claims',
    title: 'Fresno Trampoline Park & Indoor Adventure Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Fresno trampoline or indoor-adventure park? A signed waiver does not bar a gross-negligence claim, and a parent cannot waive a child\u2019s own right to sue.',
    psychology: 'My child was hurt at a Fresno trampoline park and the staff said the waiver I signed ends it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno trampoline park injury lawyer',
      'trampoline park waiver child california',
      'gross negligence trampoline park california',
      'defective trampoline net claim california',
      'indoor adventure park injury fresno',
    ],
    signals: [
      'Waiver bars only ordinary negligence',
      'Parent cannot waive child\u2019s claim',
      'Operator supervision / overcrowding',
      'Defective equipment product claim',
      'Assumption of risk has limits',
      'Incident report & footage',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s trampoline and indoor-adventure parks draw large numbers of children, and a broken leg, fracture, or spinal injury from double-bouncing or a foam-pit landing is common \u2014 yet families are routinely told the waiver ends everything. It does not. ${WAIVER} ${OPERATOR} ${PRODUCT} ${RISK} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The signed waiver and who signed it',
        'Whether the injured guest is a minor',
        'The court or attraction and any staff monitoring it',
        'Whether rules (one jumper, no double-bounce) were enforced',
        'The condition of padding, nets, springs, and anchoring',
        'The incident report and any surveillance footage',
        'Witness statements from other guests',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the ordinary-negligence claim a waiver can bar from the gross-negligence and minor\u2019s claims it cannot, evaluates operator supervision and any equipment defect, and preserves the footage and incident report before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Is my claim over?',
        a: 'Not necessarily. A waiver can bar ordinary negligence, but it cannot bar gross negligence \u2014 an extreme departure from ordinary care (City of Santa Barbara v. Superior Court). And a parent generally cannot waive a minor child\u2019s own right to sue.',
      },
      {
        q: 'My child was hurt. Does the waiver I signed bind them?',
        a: 'Generally not for the child\u2019s own claim. California courts have held a parent cannot waive a minor child\u2019s right to sue for injury, which is significant because most trampoline-park guests are children.',
      },
      {
        q: 'What counts as gross negligence at a trampoline park?',
        a: 'Conduct that is an extreme departure from ordinary care \u2014 for example, overcrowding a court, allowing double-bouncing, ignoring posted rules, or leaving padding or nets worn or missing. That is not covered by a waiver.',
      },
      {
        q: 'The equipment failed. Is that different?',
        a: 'Yes. A defective trampoline, net, inflatable, or anchoring system can support a strict product-liability claim against the manufacturer \u2014 a claim that does not depend on the waiver. Preserving the equipment is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the waiver, supervision, and equipment facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_TRAMP_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Trampoline Park Injury Claims',
    title: 'Long Beach Trampoline Park & Indoor Adventure Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at a Long Beach trampoline or indoor-adventure park? A signed waiver does not bar a gross-negligence claim, and a parent cannot waive a child\u2019s own right to sue.',
    psychology: 'My child was hurt at a Long Beach trampoline park and the staff said the waiver I signed ends it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach trampoline park injury lawyer',
      'trampoline park waiver child california',
      'gross negligence trampoline park california',
      'defective trampoline net claim california',
      'indoor adventure park injury long beach',
    ],
    signals: [
      'Waiver bars only ordinary negligence',
      'Parent cannot waive child\u2019s claim',
      'Operator supervision / overcrowding',
      'Defective equipment product claim',
      'Assumption of risk has limits',
      'Incident report & footage',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s trampoline and adventure parks stay busy with birthday parties and school groups, where overcrowded courts and foam-pit landings cause fractures and spinal injuries \u2014 and families are routinely told the waiver ends everything. It does not. ${WAIVER} ${OPERATOR} ${PRODUCT} ${RISK} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The signed waiver and who signed it',
        'Whether the injured guest is a minor',
        'The court or attraction and any staff monitoring it',
        'Whether rules (one jumper, no double-bounce) were enforced',
        'The condition of padding, nets, springs, and anchoring',
        'The incident report and any surveillance footage',
        'Witness statements from other guests',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the ordinary-negligence claim a waiver can bar from the gross-negligence and minor\u2019s claims it cannot, evaluates operator supervision and any equipment defect, and preserves the footage and incident report before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Is my claim over?',
        a: 'Not necessarily. A waiver can bar ordinary negligence, but it cannot bar gross negligence (City of Santa Barbara v. Superior Court). And a parent generally cannot waive a minor child\u2019s own right to sue.',
      },
      {
        q: 'My child was hurt. Does the waiver I signed bind them?',
        a: 'Generally not for the child\u2019s own claim. A parent cannot waive a minor child\u2019s right to sue for injury, which matters because most guests are children.',
      },
      {
        q: 'What counts as gross negligence at a trampoline park?',
        a: 'An extreme departure from ordinary care \u2014 overcrowding, allowing double-bouncing, ignoring posted rules, or leaving padding or nets worn or missing. A waiver does not cover it.',
      },
      {
        q: 'The equipment failed. Is that different?',
        a: 'Yes. A defective trampoline, net, inflatable, or anchoring system can support a strict product-liability claim against the manufacturer, independent of the waiver.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the waiver, supervision, and equipment facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_TRAMP_SLUG,
    category: 'Cities',
    cluster: 'Anaheim Trampoline Park Injury Claims',
    title: 'Anaheim Trampoline Park & Indoor Adventure Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at an Anaheim trampoline or indoor-adventure park? A signed waiver does not bar a gross-negligence claim, and a parent cannot waive a child\u2019s own right to sue.',
    psychology: 'My child was hurt at an Anaheim trampoline park and the staff said the waiver I signed ends it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim trampoline park injury lawyer',
      'trampoline park waiver child california',
      'gross negligence trampoline park california',
      'defective trampoline net claim california',
      'indoor adventure park injury anaheim',
    ],
    signals: [
      'Waiver bars only ordinary negligence',
      'Parent cannot waive child\u2019s claim',
      'Operator supervision / overcrowding',
      'Defective equipment product claim',
      'Assumption of risk has limits',
      'Incident report & footage',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s tourist-corridor trampoline and adventure parks draw heavy out-of-town family traffic, and crowded courts, foam pits, and ninja obstacles produce fractures and spinal injuries \u2014 yet families are routinely told the waiver ends everything. It does not. ${WAIVER} ${OPERATOR} ${PRODUCT} ${RISK} Civil cases are filed in Orange County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The signed waiver and who signed it',
        'Whether the injured guest is a minor',
        'The court or attraction and any staff monitoring it',
        'Whether rules (one jumper, no double-bounce) were enforced',
        'The condition of padding, nets, springs, and anchoring',
        'The incident report and any surveillance footage',
        'Witness statements from other guests',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the ordinary-negligence claim a waiver can bar from the gross-negligence and minor\u2019s claims it cannot, evaluates operator supervision and any equipment defect, and preserves the footage and incident report before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Is my claim over?',
        a: 'Not necessarily. A waiver can bar ordinary negligence, but it cannot bar gross negligence (City of Santa Barbara v. Superior Court). And a parent generally cannot waive a minor child\u2019s own right to sue.',
      },
      {
        q: 'We were visiting from out of town. Can we still bring a claim?',
        a: 'Yes. An injury at an Anaheim venue is governed by California law and filed in Orange County regardless of where you live. Where you live does not bar the claim.',
      },
      {
        q: 'What counts as gross negligence at a trampoline park?',
        a: 'An extreme departure from ordinary care \u2014 overcrowding, allowing double-bouncing, ignoring posted rules, or leaving padding or nets worn or missing. A waiver does not cover it.',
      },
      {
        q: 'The equipment failed. Is that different?',
        a: 'Yes. A defective trampoline, net, inflatable, or anchoring system can support a strict product-liability claim against the manufacturer, independent of the waiver.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the waiver, supervision, and equipment facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_TRAMP_SLUG,
    category: 'Cities',
    cluster: 'Oakland Trampoline Park Injury Claims',
    title: 'Oakland Trampoline Park & Indoor Adventure Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt at an Oakland-area trampoline or indoor-adventure park? A signed waiver does not bar a gross-negligence claim, and a parent cannot waive a child\u2019s own right to sue.',
    psychology: 'My child was hurt at an Oakland trampoline park and the staff said the waiver I signed ends it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland trampoline park injury lawyer',
      'trampoline park waiver child california',
      'gross negligence trampoline park california',
      'defective trampoline net claim california',
      'indoor adventure park injury east bay',
    ],
    signals: [
      'Waiver bars only ordinary negligence',
      'Parent cannot waive child\u2019s claim',
      'Operator supervision / overcrowding',
      'Defective equipment product claim',
      'Assumption of risk has limits',
      'Incident report & footage',
    ],
    sections: {
      whyItMatters: `Trampoline and indoor-adventure parks across Oakland and the East Bay stay packed with school groups and weekend crowds, where double-bouncing and foam-pit landings cause fractures and spinal injuries \u2014 and families are routinely told the waiver ends everything. It does not. ${WAIVER} ${OPERATOR} ${PRODUCT} ${RISK} Civil cases are filed in Alameda County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The signed waiver and who signed it',
        'Whether the injured guest is a minor',
        'The court or attraction and any staff monitoring it',
        'Whether rules (one jumper, no double-bounce) were enforced',
        'The condition of padding, nets, springs, and anchoring',
        'The incident report and any surveillance footage',
        'Witness statements from other guests',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the ordinary-negligence claim a waiver can bar from the gross-negligence and minor\u2019s claims it cannot, evaluates operator supervision and any equipment defect, and preserves the footage and incident report before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I signed a waiver. Is my claim over?',
        a: 'Not necessarily. A waiver can bar ordinary negligence, but it cannot bar gross negligence (City of Santa Barbara v. Superior Court). And a parent generally cannot waive a minor child\u2019s own right to sue.',
      },
      {
        q: 'My child was hurt. Does the waiver I signed bind them?',
        a: 'Generally not for the child\u2019s own claim. A parent cannot waive a minor child\u2019s right to sue for injury, which matters because most guests are children.',
      },
      {
        q: 'What counts as gross negligence at a trampoline park?',
        a: 'An extreme departure from ordinary care \u2014 overcrowding, allowing double-bouncing, ignoring posted rules, or leaving padding or nets worn or missing. A waiver does not cover it.',
      },
      {
        q: 'The equipment failed. Is that different?',
        a: 'Yes. A defective trampoline, net, inflatable, or anchoring system can support a strict product-liability claim against the manufacturer, independent of the waiver.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the waiver, supervision, and equipment facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const trampolineParkCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [FRESNO_TRAMP_SLUG]: {
    scenario: `A child fractured a leg on a Fresno court where staff allowed several jumpers per trampoline. Overcrowding was an extreme departure from ordinary care, and the parent\u2019s waiver did not bar the child\u2019s gross-negligence claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the court and staff.'],
      ['First days', 'Request surveillance footage; keep the waiver.'],
      ['First weeks', 'Document supervision, rules, and equipment condition.'],
      ['Longer term', 'Gross-negligence and minor\u2019s claims developed.'],
    ],
    severityLadder: [
      ['Ordinary negligence', 'A waiver may bar it.'],
      ['Gross negligence', 'A waiver does not.'],
      ['Minor\u2019s claim', 'A parent cannot waive it.'],
      ['Defect', 'Product liability is independent.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the court.' },
      { label: 'Imaging', copy: 'Fractures and spinal findings are documented.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether conduct was gross negligence',
      'Whether the injured guest is a minor',
      'Whether supervision and rules failed',
      'Whether equipment was defective',
      'Whether footage was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
      { label: 'Minor protected', copy: 'A parent cannot waive the child\u2019s claim.' },
      { label: 'Operator fault', copy: 'Supervision and overcrowding.' },
      { label: 'Product path', copy: 'A defect is independent of the waiver.' },
    ],
    insuranceProblems: [
      'The claim is dropped because a waiver was signed.',
      'The gross-negligence theory is never asserted.',
      'The surveillance footage is overwritten.',
      'The defective equipment is not preserved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a child injured?' },
      { label: 'Step 2', question: 'Did you sign a waiver?' },
      { label: 'Step 3', question: 'Was the court overcrowded or unsupervised?' },
      { label: 'Step 4', question: 'Is there surveillance footage?' },
    ],
  },
  [LB_TRAMP_SLUG]: {
    scenario: `A Long Beach guest landed badly in a foam pit that had degraded to the concrete base. Poor maintenance was an extreme departure from ordinary care the waiver did not cover. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the attraction.'],
      ['First days', 'Request footage; photograph the foam pit.'],
      ['First weeks', 'Document maintenance and prior complaints.'],
      ['Longer term', 'Gross-negligence theory developed.'],
    ],
    severityLadder: [
      ['Ordinary negligence', 'A waiver may bar it.'],
      ['Gross negligence', 'A waiver does not.'],
      ['Maintenance', 'Worn padding shows fault.'],
      ['Defect', 'Product liability is independent.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the attraction.' },
      { label: 'Imaging', copy: 'Fractures and spinal findings are documented.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether conduct was gross negligence',
      'Whether maintenance failed',
      'Whether rules were enforced',
      'Whether equipment was defective',
      'Whether footage was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
      { label: 'Maintenance', copy: 'Worn foam pits show fault.' },
      { label: 'Operator fault', copy: 'Supervision and rules matter.' },
      { label: 'Product path', copy: 'A defect is independent of the waiver.' },
    ],
    insuranceProblems: [
      'The claim is dropped because a waiver was signed.',
      'The gross-negligence theory is never asserted.',
      'The footage is overwritten.',
      'The pit condition is never documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What attraction caused the injury?' },
      { label: 'Step 2', question: 'Did you sign a waiver?' },
      { label: 'Step 3', question: 'Was padding worn or missing?' },
      { label: 'Step 4', question: 'Is there footage?' },
    ],
  },
  [ANAHEIM_TRAMP_SLUG]: {
    scenario: `An out-of-town child was injured at an Anaheim adventure park when a ninja-course anchor failed. Residency did not bar the claim, and the anchor maker faced a product claim independent of the waiver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the attraction.'],
      ['First days', 'Request footage; preserve the anchor component.'],
      ['First weeks', 'Document maintenance and identify the maker.'],
      ['Longer term', 'Product and gross-negligence theories developed.'],
    ],
    severityLadder: [
      ['Ordinary negligence', 'A waiver may bar it.'],
      ['Gross negligence', 'A waiver does not.'],
      ['Minor\u2019s claim', 'A parent cannot waive it.'],
      ['Defect', 'Product liability is independent.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the attraction.' },
      { label: 'Imaging', copy: 'Fractures and spinal findings are documented.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether conduct was gross negligence',
      'Whether the injured guest is a minor',
      'Whether a component was defective',
      'Whether supervision and rules failed',
      'Whether footage and the component were preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
      { label: 'Minor protected', copy: 'A parent cannot waive the child\u2019s claim.' },
      { label: 'Residency', copy: 'Out-of-town guests can still sue.' },
      { label: 'Product path', copy: 'A defect is independent of the waiver.' },
    ],
    insuranceProblems: [
      'The claim is dropped because a waiver was signed.',
      'The out-of-town family is told to sue at home.',
      'The footage is overwritten.',
      'The defective component is not preserved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a child injured?' },
      { label: 'Step 2', question: 'Did you sign a waiver?' },
      { label: 'Step 3', question: 'Did a component fail?' },
      { label: 'Step 4', question: 'Is there footage?' },
    ],
  },
  [OAK_TRAMP_SLUG]: {
    scenario: `An Oakland guest was injured double-bouncing on a crowded court staff never monitored. Failure to enforce the one-jumper rule was an extreme departure the waiver did not cover. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get an incident report; note the court.'],
      ['First days', 'Request footage; keep the waiver.'],
      ['First weeks', 'Document supervision and rule enforcement.'],
      ['Longer term', 'Gross-negligence theory developed.'],
    ],
    severityLadder: [
      ['Ordinary negligence', 'A waiver may bar it.'],
      ['Gross negligence', 'A waiver does not.'],
      ['Supervision', 'Unmonitored courts show fault.'],
      ['Defect', 'Product liability is independent.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the court.' },
      { label: 'Imaging', copy: 'Fractures and spinal findings are documented.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether conduct was gross negligence',
      'Whether supervision and rules failed',
      'Whether the court was overcrowded',
      'Whether equipment was defective',
      'Whether footage was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
      { label: 'Supervision', copy: 'Unmonitored courts show fault.' },
      { label: 'Rule enforcement', copy: 'One-jumper rules matter.' },
      { label: 'Product path', copy: 'A defect is independent of the waiver.' },
    ],
    insuranceProblems: [
      'The claim is dropped because a waiver was signed.',
      'The gross-negligence theory is never asserted.',
      'The footage is overwritten.',
      'The overcrowding is never documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the court overcrowded or unsupervised?' },
      { label: 'Step 2', question: 'Did you sign a waiver?' },
      { label: 'Step 3', question: 'Were rules being enforced?' },
      { label: 'Step 4', question: 'Is there footage?' },
    ],
  },
}
