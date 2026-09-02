import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, spinal-cord-injury / paralysis practice area (batch 2):
 * location-specific guides for San Jose, Fresno, Long Beach, and Oakland,
 * extending the batch-1 hub (LA, San Diego, San Francisco, Sacramento).
 *
 * An SCI claim rides on an underlying negligence claim; the damages are
 * catastrophic and lifelong, and the case turns on finding every source of
 * coverage to meet a value ordinary policies cannot.
 *
 * Local context, genuine rather than interpolated:
 *  - San Jose: high-wage knowledge work, so lost earning capacity can be
 *    enormous; freeway and motorcycle crashes; VTA public-entity six-month fork.
 *  - Fresno: high-speed Highway 99 crashes and agricultural rollover / farm-
 *    equipment injuries, with long distances to specialised spinal rehabilitation.
 *  - Long Beach: port and industrial falls-from-height and struck-by injuries,
 *    often a third-party claim beyond workers\u2019 compensation.
 *  - Oakland: freeway and motorcycle crashes and construction falls, with AC
 *    Transit and city vehicles raising a public-entity six-month fork.
 *
 * Applied accurately (underlying negligence required; deadline follows it \u2014 two
 * years under CCP 335.1, six months under the Government Claims Act for a public
 * entity; catastrophic, largely economic, lifelong damages requiring a life-care
 * plan and economist; finding every coverage source \u2014 additional defendants,
 * umbrella/commercial policies, and UM/UIM \u2014 often decisive; third-party claims
 * beyond workers\u2019 comp; pure comparative negligence).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether another party is liable, which deadline applies, and what coverage is available depend on facts a licensed California attorney should review promptly.'

const WHAT_SCI =
  'A spinal-cord injury can be incomplete, leaving some function, or complete, causing total loss of movement and sensation below the level of the injury, and it can result in paraplegia or tetraplegia. The level of the injury largely determines the lifelong care and equipment needed, and the injury is generally permanent \u2014 which is why the case is built around the future, not just the past.'

const UNDERLYING =
  'A paralysis claim rests on an underlying negligence claim: the at-fault party \u2014 a driver, property owner, product maker, or other responsible party \u2014 must still be shown to have caused the event. The deadline follows that underlying claim, generally two years (Code of Civil Procedure section 335.1), but as short as six months where a public entity is involved (Government Claims Act).'

const CATASTROPHIC =
  'Spinal-cord-injury damages are catastrophic and largely economic: lifelong attendant or skilled nursing care, home and vehicle modifications, adaptive equipment, ongoing medical and therapy costs, and lost earning capacity, alongside substantial non-economic damages. A detailed life-care plan and an economist are essential to quantify decades of future need, which usually dwarfs the past medical bills.'

const INSURANCE =
  'Because the value of a spinal-cord-injury case far exceeds a minimum auto policy, the difference between a fair result and an inadequate one is often finding every source of coverage: additional at-fault parties, employer or commercial policies, umbrella coverage, and the injured person\u2019s own uninsured/underinsured motorist (UM/UIM) coverage. Identifying all of it early is frequently decisive.'

const THIRD_PARTY =
  'Where the injury happened on the job, workers\u2019 compensation is generally the exclusive remedy against the employer, but a separate third-party claim \u2014 against an equipment manufacturer, a different contractor, or a property owner \u2014 can reach the catastrophic damages compensation does not, so identifying every non-employer party is central.'

export const SJ_SCI_SLUG = '/san-jose-spinal-cord-injury-claim'
export const FRESNO_SCI_SLUG = '/fresno-spinal-cord-injury-claim'
export const LB_SCI_SLUG = '/long-beach-spinal-cord-injury-claim'
export const OAK_SCI_SLUG = '/oakland-spinal-cord-injury-claim'

export const spinalInjuryCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_SCI_SLUG,
    category: 'Cities',
    cluster: 'San Jose Spinal Cord Injury & Paralysis Claims',
    title: 'San Jose Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury or paralysis in a San Jose crash? The case is built around lifelong care and finding every source of coverage \u2014 and high wages can make the earning-capacity loss enormous.',
    psychology: 'I or a loved one was paralyzed in a San Jose accident and I do not know how we will pay for a lifetime of care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose spinal cord injury lawyer',
      'paralysis accident claim california',
      'paraplegia lawsuit california',
      'catastrophic injury attorney california',
      'life care plan spinal injury california',
    ],
    signals: [
      'Underlying negligence required',
      'High lost earning capacity',
      'VTA / public entity (six-month)',
      'Catastrophic lifelong damages',
      'Life-care plan & economist',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `Freeway and motorcycle crashes cause catastrophic spinal injuries around San Jose, and the region\u2019s high wages mean the lost-earning-capacity component of a paralysis case can be enormous \u2014 on top of the lifelong care every such case requires. ${WHAT_SCI} ${UNDERLYING} Where a VTA vehicle or a public road is involved, a six-month Government Claims Act deadline applies. ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'The underlying event (crash, fall, product) and who was at fault',
        'Whether a VTA or other public vehicle or road was involved',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their insurance coverage',
        'Employer, commercial, and umbrella policies in play',
        'The injured person\u2019s own UM/UIM coverage',
        'Detailed pre-injury earnings and career trajectory',
        'Current and projected lifelong care and equipment needs',
      ],
      howClearCaseHelps: `ClearCaseIQ ties a San Jose paralysis case to the at-fault party, flags any VTA or public-entity six-month deadline, searches for every source of coverage, and documents both the lifelong care and the high earning-capacity loss for a life-care plan and economist. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My career earnings were high. Does that increase the claim?',
        a: 'Yes, potentially and substantially. Lost earning capacity is a major economic component of a paralysis case, and in a high-wage, high-skill economy the loss over a working life can be very large. Documenting pre-injury earnings and career trajectory, and having an economist project the loss, is central to valuing the case fairly.',
      },
      {
        q: 'A VTA train or bus was involved. Does the deadline change?',
        a: 'Yes. VTA is a public entity, so where its vehicle or a public road is involved, the Government Claims Act requires a written claim within six months of the injury \u2014 far shorter than the usual two years. Identifying public-entity involvement immediately is essential.',
      },
      {
        q: 'The at-fault driver has only a small policy. Is that all we can recover?',
        a: 'Not necessarily. Because the value far exceeds a minimum policy, the case often turns on finding every source of coverage \u2014 additional at-fault parties, employer or commercial policies, umbrella coverage, and your own UM/UIM coverage. Identifying all of it early is frequently decisive.',
      },
      {
        q: 'How is a paralysis case valued?',
        a: 'Around the future \u2014 lifelong attendant or nursing care, home and vehicle modification, adaptive equipment, medical care, and lost earning capacity \u2014 quantified by a life-care plan and an economist, alongside non-economic damages.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_SCI_SLUG,
    category: 'Cities',
    cluster: 'Fresno Spinal Cord Injury & Paralysis Claims',
    title: 'Fresno Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury in a Fresno-area crash, rollover, or on a farm? The case is built around lifelong care and every source of coverage \u2014 and a workplace injury can reach beyond workers\u2019 comp.',
    psychology: 'I or a loved one was paralyzed in a Fresno-area crash or at work and I do not know who is responsible or how we will fund care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno spinal cord injury lawyer',
      'paralysis accident claim california',
      'rollover crash paralysis california',
      'farm equipment injury paralysis california',
      'catastrophic injury attorney california',
    ],
    signals: [
      'Underlying negligence required',
      'Highway 99 crashes / rollovers',
      'Agricultural / farm-equipment injuries',
      'Third-party claim beyond comp',
      'Life-care plan & economist',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `High-speed Highway 99 crashes and rollovers, and agricultural and farm-equipment injuries, cause catastrophic spinal damage around Fresno \u2014 often far from the specialised spinal rehabilitation the injury will require for life. ${WHAT_SCI} ${UNDERLYING} ${THIRD_PARTY} A rollover can also raise a vehicle- or equipment-defect claim against a manufacturer. ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'The underlying event (highway crash, rollover, farm equipment) and who was at fault',
        'For a work injury, every non-employer party and any comp claim',
        'Whether a vehicle or equipment defect contributed to a rollover',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their coverage',
        'Employer, commercial, and umbrella policies in play',
        'The injured person\u2019s own UM/UIM coverage',
        'Current and projected lifelong care and equipment needs',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every potentially liable party in a Fresno paralysis case \u2014 including a third party beyond workers\u2019 comp and any equipment maker \u2014 searches for every coverage source, and organises the lifelong care picture for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was paralyzed in a farm or work injury. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. Workers\u2019 compensation is generally the exclusive remedy against your employer, but a separate third-party claim \u2014 against an equipment manufacturer, a different contractor, or another party \u2014 can recover the catastrophic damages comp does not. Identifying every non-employer party is central.',
      },
      {
        q: 'My injury happened in a rollover. Could the vehicle be at fault?',
        a: 'Possibly. A rollover can raise a vehicle- or equipment-defect claim \u2014 for example, a roof crush or restraint failure \u2014 against a manufacturer, in addition to any driver at fault. Preserving the vehicle and equipment for inspection is important, so this should be assessed early.',
      },
      {
        q: 'How is a paralysis case valued?',
        a: 'Around the future \u2014 lifelong attendant or nursing care, home and vehicle modification, adaptive equipment, medical care, and lost earning capacity \u2014 quantified by a life-care plan and an economist, alongside non-economic damages.',
      },
      {
        q: 'The at-fault party has only a small policy. Is that all we can recover?',
        a: 'Not necessarily. The case often turns on finding every source of coverage \u2014 additional parties, employer or commercial and umbrella policies, and your own UM/UIM coverage. Identifying all of it early is frequently decisive.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_SCI_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Spinal Cord Injury & Paralysis Claims',
    title: 'Long Beach Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury at the Long Beach port, on a jobsite, or in a crash? The case is built around lifelong care \u2014 and a workplace injury often reaches beyond workers\u2019 comp.',
    psychology: 'I or a loved one was paralyzed at the port, on the job, or in a Long Beach crash and I do not know how we will fund a lifetime of care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach spinal cord injury lawyer',
      'paralysis accident claim california',
      'fall from height paralysis third party california',
      'port injury paralysis claim california',
      'catastrophic injury attorney california',
    ],
    signals: [
      'Underlying negligence required',
      'Port / industrial falls & struck-by',
      'Third-party claim beyond comp',
      'Catastrophic lifelong damages',
      'Life-care plan & economist',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s port and industrial economy produces catastrophic spinal injuries from falls from height and struck-by incidents, and its dense traffic adds vehicle and motorcycle crashes \u2014 and each can involve multiple potentially liable parties and layers of coverage. ${WHAT_SCI} ${UNDERLYING} ${THIRD_PARTY} ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The underlying event (fall, struck-by, crash) and who was at fault',
        'For a jobsite injury, every non-employer party and any comp claim',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their coverage',
        'Employer, commercial, and umbrella policies in play',
        'The injured person\u2019s own UM/UIM coverage',
        'Whether equipment should be preserved for a product claim',
        'Current and projected lifelong care and equipment needs',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every potentially liable party in a Long Beach paralysis case \u2014 including third parties beyond a workers\u2019-comp claim \u2014 searches for every coverage source, and organises the lifelong care picture for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was paralyzed in a fall or struck-by at the port or on a jobsite. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. Workers\u2019 compensation is generally the exclusive remedy against your employer, but a separate third-party claim \u2014 against an equipment manufacturer, a different contractor, or the property owner \u2014 can recover the catastrophic damages comp does not. Identifying every non-employer party is central.',
      },
      {
        q: 'How is a paralysis case valued?',
        a: 'Around the future \u2014 lifelong attendant or nursing care, home and vehicle modification, adaptive equipment, medical care, and lost earning capacity \u2014 quantified by a life-care plan and an economist, alongside non-economic damages.',
      },
      {
        q: 'The at-fault party has limited coverage. Is that all we can recover?',
        a: 'Not necessarily. The case often turns on finding every source of coverage \u2014 additional parties, employer or commercial and umbrella policies, and your own UM/UIM coverage. Identifying all of it early is frequently decisive.',
      },
      {
        q: 'What do I have to prove?',
        a: 'That another party\u2019s negligence caused the event, and that it caused the spinal injury. The claim rides on the underlying liability, and the deadline follows it \u2014 generally two years, or six months if a public entity is involved.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_SCI_SLUG,
    category: 'Cities',
    cluster: 'Oakland Spinal Cord Injury & Paralysis Claims',
    title: 'Oakland Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury in an Oakland crash, fall, or on a jobsite? The case is built around lifelong care \u2014 and an AC Transit bus or city vehicle adds a six-month deadline.',
    psychology: 'I or a loved one was paralyzed in an Oakland accident and I do not know who is responsible or how we will fund care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland spinal cord injury lawyer',
      'paralysis accident claim california',
      'ac transit bus paralysis claim california',
      'construction fall paralysis third party california',
      'catastrophic injury attorney california',
    ],
    signals: [
      'Underlying negligence required',
      'AC Transit / city vehicle (public)',
      'Six-month claim if public entity',
      'Third-party claim beyond comp',
      'Life-care plan & economist',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `Freeway and motorcycle crashes and construction falls cause catastrophic spinal injuries in Oakland, and a common local wrinkle is public-entity involvement \u2014 an AC Transit bus or a city vehicle or road \u2014 which shortens the deadline dramatically on top of the lifelong-care and coverage work every paralysis case requires. ${WHAT_SCI} ${UNDERLYING} Where a public entity is involved, the Government Claims Act requires a formal claim within six months (Government Code section 911.2), far shorter than the usual two years. ${THIRD_PARTY} ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in Alameda County Superior Court after any required claim.`,
      whatToTrack: [
        'The underlying event (crash, fall, jobsite) and who was at fault',
        'Whether an AC Transit bus, city vehicle, or public road was involved',
        'The date of injury, which starts any six-month clock',
        'For a jobsite injury, every non-employer party and any comp claim',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their coverage, including UM/UIM',
        'Employer, commercial, and umbrella policies in play',
        'Current and projected lifelong care and equipment needs',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether an Oakland paralysis case involves a public entity \u2014 and its six-month deadline \u2014 maps every liable party including third parties beyond comp, searches for every coverage source, and organises the lifelong care picture for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An AC Transit bus or city vehicle was involved. Does the deadline change?',
        a: 'Yes. AC Transit and the city are public entities, so where their vehicle or a public road is involved, the Government Claims Act requires a written claim within six months of the injury (Government Code section 911.2) \u2014 far shorter than the usual two years. Identifying public-entity involvement immediately is essential.',
      },
      {
        q: 'I was paralyzed in a fall at work. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. Workers\u2019 compensation is generally the exclusive remedy against your employer, but a separate third-party claim \u2014 against an equipment manufacturer, a different contractor, or the property owner \u2014 can recover the catastrophic damages comp does not. Identifying every non-employer party is central.',
      },
      {
        q: 'How is a paralysis case valued?',
        a: 'Around the future \u2014 lifelong attendant or nursing care, home and vehicle modification, adaptive equipment, medical care, and lost earning capacity \u2014 quantified by a life-care plan and an economist, alongside non-economic damages.',
      },
      {
        q: 'The at-fault party has only a small policy. Is that all we can recover?',
        a: 'Not necessarily. The case often turns on finding every source of coverage \u2014 additional parties, employer or commercial and umbrella policies, and your own UM/UIM coverage. Identifying all of it early is frequently decisive.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const spinalInjuryCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_SCI_SLUG]: {
    scenario: `A San Jose engineer paralyzed by a distracted driver faced both a lifetime of care and the loss of a high-earning career. An economist projected the substantial earning-capacity loss, and additional umbrella and UM/UIM coverage was found beyond the driver\u2019s policy. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve evidence; identify the at-fault party and any public vehicle.'],
      ['First weeks', 'Search for every coverage source; open UM/UIM.'],
      ['Assessment', 'Build the life-care plan and earning-capacity analysis with experts.'],
      ['Longer term', 'Coverage and catastrophic-damages issues developed.'],
    ],
    severityLadder: [
      ['Underlying fault', 'The at-fault party must be proven.'],
      ['Injury level', 'It defines lifelong needs.'],
      ['Earning capacity', 'High wages make the loss large.'],
      ['Life-care plan', 'It quantifies decades of need.'],
    ],
    treatmentProgression: [
      { label: 'Acute care', copy: 'Records establish the injury and its level.' },
      { label: 'Rehabilitation', copy: 'Function and prognosis are documented.' },
      { label: 'Home & equipment', copy: 'Modifications and adaptive needs are assessed.' },
      { label: 'Life-care plan', copy: 'Decades of future need are quantified.' },
    ],
    settlementDrivers: [
      'Whether the underlying negligence is clear',
      'Whether a public entity (VTA) shortens the deadline',
      'The level and completeness of the injury',
      'The scope of high lost earning capacity',
      'How many coverage sources are identified',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'Earning loss is large', copy: 'High wages drive the economic loss.' },
      { label: 'Future dominates', copy: 'Lifelong care dwarfs past bills.' },
      { label: 'Find all coverage', copy: 'Multiple policies fund the result.' },
      { label: 'UM/UIM matters', copy: 'Your own coverage can be decisive.' },
    ],
    insuranceProblems: [
      'The high earning-capacity loss is never quantified.',
      'Only the at-fault driver\u2019s minimum policy is pursued.',
      'A VTA or public-entity six-month deadline is missed.',
      'No life-care plan quantifies future need.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the injury, and who was at fault?' },
      { label: 'Step 2', question: 'Was a VTA or public vehicle involved?' },
      { label: 'Step 3', question: 'What were your pre-injury earnings and career?' },
      { label: 'Step 4', question: 'What lifelong care and equipment are needed?' },
    ],
  },
  [FRESNO_SCI_SLUG]: {
    scenario: `A Fresno-area farm worker paralyzed in an equipment rollover had a workers\u2019-comp claim, but a third-party claim against the equipment maker and a defect claim over the rollover reached the catastrophic damages comp could not. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Open comp; identify every non-employer party; preserve the equipment.'],
      ['First weeks', 'Assess a defect claim; find all coverage.'],
      ['Assessment', 'Build the life-care plan with medical and economic experts.'],
      ['Longer term', 'Third-party and product-liability issues developed.'],
    ],
    severityLadder: [
      ['Comp vs. third party', 'Comp covers the employer; others may be liable.'],
      ['Defect possible', 'A rollover can implicate the equipment.'],
      ['Injury level', 'It defines lifelong needs.'],
      ['Life-care plan', 'It quantifies decades of need.'],
    ],
    treatmentProgression: [
      { label: 'Acute care', copy: 'Records establish the injury and its level.' },
      { label: 'Rehabilitation', copy: 'Function and prognosis are documented.' },
      { label: 'Home & equipment', copy: 'Modifications and adaptive needs are assessed.' },
      { label: 'Life-care plan', copy: 'Decades of future need are quantified.' },
    ],
    settlementDrivers: [
      'Whether a third party beyond the employer is liable',
      'Whether a vehicle or equipment defect contributed',
      'The level and completeness of the injury',
      'How many coverage sources are identified',
      'The strength of the life-care plan',
      'How the comp lien is negotiated',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'Third-party claims reach catastrophic damages.' },
      { label: 'Preserve the equipment', copy: 'A defect claim needs the machine.' },
      { label: 'Future dominates', copy: 'Lifelong care dwarfs past bills.' },
      { label: 'Find all coverage', copy: 'Multiple policies fund the result.' },
    ],
    insuranceProblems: [
      'Only the comp claim is pursued, missing the third-party claim.',
      'The equipment is not preserved for a defect claim.',
      'No life-care plan quantifies future need.',
      'Available coverage is never fully explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How did the injury happen \u2014 crash, rollover, or equipment?' },
      { label: 'Step 2', question: 'Who, besides an employer, may be at fault?' },
      { label: 'Step 3', question: 'Has the vehicle or equipment been preserved?' },
      { label: 'Step 4', question: 'What lifelong care and equipment are needed?' },
    ],
  },
  [LB_SCI_SLUG]: {
    scenario: `A Long Beach dockworker paralyzed in a fall from height had a workers\u2019-comp claim, but a third-party claim against the scaffold supplier and the site\u2019s general contractor reached the catastrophic damages comp could not. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Open comp; identify every non-employer party.'],
      ['First weeks', 'Preserve equipment; find all coverage.'],
      ['Assessment', 'Build the life-care plan with medical and economic experts.'],
      ['Longer term', 'Third-party liability and coverage issues developed.'],
    ],
    severityLadder: [
      ['Comp vs. third party', 'Comp covers the employer; others may be liable.'],
      ['Underlying fault', 'Negligence must be proven.'],
      ['Injury level', 'It defines lifelong needs.'],
      ['Life-care plan', 'It quantifies decades of need.'],
    ],
    treatmentProgression: [
      { label: 'Acute care', copy: 'Records establish the injury and its level.' },
      { label: 'Rehabilitation', copy: 'Function and prognosis are documented.' },
      { label: 'Home & equipment', copy: 'Modifications and adaptive needs are assessed.' },
      { label: 'Life-care plan', copy: 'Decades of future need are quantified.' },
    ],
    settlementDrivers: [
      'Whether a third party beyond the employer is liable',
      'The level and completeness of the injury',
      'How many coverage sources are identified',
      'The strength of the life-care plan',
      'How the comp lien is negotiated',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'Third-party claims reach catastrophic damages.' },
      { label: 'Future dominates', copy: 'Lifelong care dwarfs past bills.' },
      { label: 'Find all coverage', copy: 'Multiple policies fund the result.' },
      { label: 'Mind the lien', copy: 'A comp lien must be negotiated.' },
    ],
    insuranceProblems: [
      'Only the comp claim is pursued, missing the third-party claim.',
      'No life-care plan quantifies future need.',
      'Additional liable parties and coverage are missed.',
      'Equipment is not preserved for a product claim.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How did the injury happen \u2014 fall, struck-by, or crash?' },
      { label: 'Step 2', question: 'Who, besides an employer, may be at fault?' },
      { label: 'Step 3', question: 'What is the level and completeness of the injury?' },
      { label: 'Step 4', question: 'What lifelong care and equipment are needed?' },
    ],
  },
  [OAK_SCI_SLUG]: {
    scenario: `An Oakland motorcyclist paralyzed in a crash with a city vehicle faced a lifetime of care. Recognising the public-entity involvement, a six-month claim was filed, and additional coverage plus a life-care plan framed the value. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether an AC Transit bus, city vehicle, or public road was involved.'],
      ['Six-month mark', 'Any government claim presented to the right entity.'],
      ['Assessment', 'Build the life-care plan; find all coverage.'],
      ['Longer term', 'Catastrophic-damages and coverage issues developed.'],
    ],
    severityLadder: [
      ['Public entity?', 'It triggers a six-month deadline.'],
      ['Underlying fault', 'Negligence must be proven.'],
      ['Injury level', 'It defines lifelong needs.'],
      ['Life-care plan', 'It quantifies decades of need.'],
    ],
    treatmentProgression: [
      { label: 'Acute care', copy: 'Records establish the injury and its level.' },
      { label: 'Rehabilitation', copy: 'Function and prognosis are documented.' },
      { label: 'Home & equipment', copy: 'Modifications and adaptive needs are assessed.' },
      { label: 'Life-care plan', copy: 'Decades of future need are quantified.' },
    ],
    settlementDrivers: [
      'Whether a public entity is involved (six-month claim)',
      'Whether a third party beyond an employer is liable',
      'The level and completeness of the injury',
      'How many coverage sources are identified',
      'The strength of the life-care plan',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Deadline can be short', copy: 'AC Transit or the city means six months.' },
      { label: 'Future dominates', copy: 'Lifelong care dwarfs past bills.' },
      { label: 'Find all coverage', copy: 'Multiple policies fund the result.' },
      { label: 'Plan the lifetime', copy: 'A life-care plan anchors value.' },
    ],
    insuranceProblems: [
      'A public-entity six-month deadline is missed.',
      'Only the at-fault party\u2019s minimum policy is pursued.',
      'A third-party claim beyond comp is missed.',
      'No life-care plan quantifies future need.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was an AC Transit bus, city vehicle, or public road involved?' },
      { label: 'Step 2', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 3', question: 'Who, besides an employer, may be at fault?' },
      { label: 'Step 4', question: 'What lifelong care and equipment are needed?' },
    ],
  },
}
