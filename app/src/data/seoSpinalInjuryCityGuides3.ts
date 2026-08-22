import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, spinal-cord-injury / paralysis practice area (batch 3):
 * location-specific guides for Riverside, San Bernardino, Bakersfield, and
 * Anaheim, extending the batch-1 (LA, San Diego, San Francisco, Sacramento) and
 * batch-2 (San Jose, Fresno, Long Beach, Oakland) hub.
 *
 * An SCI claim rides on an underlying negligence claim; the damages are
 * catastrophic and lifelong, and the case turns on finding every source of
 * coverage to meet a value ordinary policies cannot.
 *
 * Local context, genuine rather than interpolated:
 *  - Riverside: I-215/60/91 crashes and warehouse falls-from-height / struck-by
 *    injuries, often a third-party claim beyond workers\u2019 comp; RTA public fork.
 *  - San Bernardino: Cajon Pass / I-15 crashes and Inland Empire warehouse falls,
 *    often a third-party claim; Omnitrans public fork.
 *  - Bakersfield: Highway 99/58 crashes and rollovers, and oilfield/agricultural
 *    falls-from-height, often a third-party claim beyond workers\u2019 comp.
 *  - Anaheim: I-5/SR-91 crashes and construction / hospitality falls, with OCTA as
 *    a public-entity six-month fork.
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

export const RIV_SCI_SLUG = '/riverside-spinal-cord-injury-claim'
export const SB_SCI_SLUG = '/san-bernardino-spinal-cord-injury-claim'
export const BAKERSFIELD_SCI_SLUG = '/bakersfield-spinal-cord-injury-claim'
export const ANAHEIM_SCI_SLUG = '/anaheim-spinal-cord-injury-claim'

export const spinalInjuryCityGuidePages3: LandingPage[] = [
  {
    slug: RIV_SCI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Spinal Cord Injury & Paralysis Claims',
    title: 'Riverside Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury in a Riverside crash or at a warehouse? The case is built around lifelong care \u2014 and a warehouse fall often reaches beyond workers\u2019 comp to third parties.',
    psychology: 'I or a loved one was paralyzed in a Riverside crash or at work and I do not know who is responsible or how we will fund care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside spinal cord injury lawyer',
      'paralysis accident claim california',
      'warehouse fall paralysis third party california',
      'catastrophic injury attorney california',
      'life care plan spinal injury california',
    ],
    signals: [
      'Underlying negligence required',
      'Commuter freeway crashes',
      'Warehouse falls & struck-by',
      'Third-party claim beyond comp',
      'Life-care plan & economist',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s long commutes on the I-215, 60, and 91 produce catastrophic crashes, and the Inland Empire\u2019s vast warehouse economy produces falls-from-height and struck-by spinal injuries \u2014 each of which can involve several liable parties and layers of coverage. ${WHAT_SCI} ${UNDERLYING} ${THIRD_PARTY} Where an RTA bus or a public road is involved, a six-month Government Claims Act deadline applies. ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'The underlying event (crash, fall, struck-by) and who was at fault',
        'For a warehouse injury, every non-employer party and any comp claim',
        'Whether a public transit vehicle or road was involved',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their coverage',
        'Employer, commercial, and umbrella policies in play',
        'The injured person\u2019s own UM/UIM coverage',
        'Current and projected lifelong care and equipment needs',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every potentially liable party in a Riverside paralysis case \u2014 including a third party beyond workers\u2019 comp \u2014 flags any public-entity deadline, searches for every coverage source, and organises the lifelong care picture for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was paralyzed in a fall at a warehouse. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. Workers\u2019 compensation is generally the exclusive remedy against your employer, but a separate third-party claim \u2014 against an equipment manufacturer, a different contractor, or the property owner \u2014 can recover the catastrophic damages comp does not. Identifying every non-employer party is central.',
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
    slug: SB_SCI_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Spinal Cord Injury & Paralysis Claims',
    title: 'San Bernardino Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury on the Cajon Pass, a freeway, or at a warehouse? The case is built around lifelong care \u2014 and a workplace fall often reaches beyond workers\u2019 comp.',
    psychology: 'I or a loved one was paralyzed in a San Bernardino crash or at work and I do not know how we will fund a lifetime of care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino spinal cord injury lawyer',
      'paralysis accident claim california',
      'cajon pass crash paralysis california',
      'warehouse fall paralysis third party california',
      'catastrophic injury attorney california',
    ],
    signals: [
      'Underlying negligence required',
      'Cajon Pass / I-15 crashes',
      'Warehouse falls & struck-by',
      'Third-party claim beyond comp',
      'Life-care plan & economist',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `High-speed crashes on the Cajon Pass and I-15, and falls-from-height and struck-by injuries across the Inland Empire\u2019s warehouse economy, cause catastrophic spinal damage around San Bernardino \u2014 and Arrowhead Regional is the county trauma center that receives the worst of them. ${WHAT_SCI} ${UNDERLYING} ${THIRD_PARTY} Where an Omnitrans bus or a public road is involved, a six-month Government Claims Act deadline applies. ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'The underlying event (grade crash, fall, struck-by) and who was at fault',
        'For a warehouse injury, every non-employer party and any comp claim',
        'Whether a public transit vehicle or road was involved',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their coverage',
        'Employer, commercial, and umbrella policies in play',
        'The injured person\u2019s own UM/UIM coverage',
        'Current and projected lifelong care and equipment needs',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every potentially liable party in a San Bernardino paralysis case \u2014 including a third party beyond workers\u2019 comp \u2014 searches for every coverage source, and organises the lifelong care picture for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was paralyzed in a warehouse fall. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. Workers\u2019 compensation is generally the exclusive remedy against your employer, but a separate third-party claim \u2014 against an equipment manufacturer, a different contractor, or the property owner \u2014 can recover the catastrophic damages comp does not. Identifying every non-employer party is central.',
      },
      {
        q: 'The at-fault party has limited coverage. Is that all we can recover?',
        a: 'Not necessarily. The case often turns on finding every source of coverage \u2014 additional parties, employer or commercial and umbrella policies, and your own UM/UIM coverage. Identifying all of it early is frequently decisive.',
      },
      {
        q: 'How is a paralysis case valued?',
        a: 'Around the future \u2014 lifelong attendant or nursing care, home and vehicle modification, adaptive equipment, medical care, and lost earning capacity \u2014 quantified by a life-care plan and an economist, alongside non-economic damages.',
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
    slug: BAKERSFIELD_SCI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Spinal Cord Injury & Paralysis Claims',
    title: 'Bakersfield Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury in a Bakersfield-area crash, rollover, or oilfield fall? The case is built around lifelong care \u2014 and a workplace injury can reach beyond workers\u2019 comp.',
    psychology: 'I or a loved one was paralyzed in a Bakersfield-area crash or at work and I do not know who is responsible or how we will fund care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield spinal cord injury lawyer',
      'paralysis accident claim california',
      'rollover crash paralysis california',
      'oilfield fall paralysis third party california',
      'catastrophic injury attorney california',
    ],
    signals: [
      'Underlying negligence required',
      'Highway 99/58 crashes / rollovers',
      'Oilfield / agricultural falls',
      'Third-party claim beyond comp',
      'Life-care plan & economist',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `High-speed Highway 99 and 58 crashes and rollovers, and falls-from-height in Kern County\u2019s oilfield and agricultural work, cause catastrophic spinal damage around Bakersfield \u2014 often far from the specialised spinal rehabilitation the injury will require for life. ${WHAT_SCI} ${UNDERLYING} ${THIRD_PARTY} A rollover can also raise a vehicle- or equipment-defect claim against a manufacturer. ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'The underlying event (highway crash, rollover, oilfield fall) and who was at fault',
        'For a work injury, every non-employer party and any comp claim',
        'Whether a vehicle or equipment defect contributed to a rollover',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their coverage',
        'Employer, commercial, and umbrella policies in play',
        'The injured person\u2019s own UM/UIM coverage',
        'Current and projected lifelong care and equipment needs',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every potentially liable party in a Bakersfield paralysis case \u2014 including a third party beyond workers\u2019 comp and any equipment maker \u2014 searches for every coverage source, and organises the lifelong care picture for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was paralyzed in an oilfield or farm injury. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. Workers\u2019 compensation is generally the exclusive remedy against your employer, but a separate third-party claim \u2014 against an equipment manufacturer, a different contractor, or another party \u2014 can recover the catastrophic damages comp does not. Identifying every non-employer party is central.',
      },
      {
        q: 'My injury happened in a rollover. Could the vehicle be at fault?',
        a: 'Possibly. A rollover can raise a vehicle- or equipment-defect claim \u2014 for example, a roof crush or restraint failure \u2014 against a manufacturer, in addition to any driver at fault. Preserving the vehicle for inspection is important, so this should be assessed early.',
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
    slug: ANAHEIM_SCI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Spinal Cord Injury & Paralysis Claims',
    title: 'Anaheim Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury in an Anaheim crash, on a jobsite, or at a venue? The case is built around lifelong care \u2014 and an OCTA bus or public road adds a six-month deadline.',
    psychology: 'I or a loved one was paralyzed in an Anaheim accident and I do not know who is responsible or how we will fund care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim spinal cord injury lawyer',
      'paralysis accident claim california',
      'octa bus paralysis claim california',
      'construction fall paralysis third party california',
      'catastrophic injury attorney california',
    ],
    signals: [
      'Underlying negligence required',
      'OCTA / public road (six-month)',
      'Construction / hospitality falls',
      'Third-party claim beyond comp',
      'Life-care plan & economist',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s I-5 and SR-91 crashes, its construction sites, and its dense hospitality and venue economy all cause catastrophic spinal injuries \u2014 each of which can involve several liable parties and layers of coverage. ${WHAT_SCI} ${UNDERLYING} ${THIRD_PARTY} Where an OCTA bus or a public road is involved, a six-month Government Claims Act deadline applies, far shorter than the usual two years. ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in Orange County Superior Court after any required claim.`,
      whatToTrack: [
        'The underlying event (crash, fall, venue incident) and who was at fault',
        'Whether an OCTA bus or a public road was involved',
        'The date of injury, which starts any six-month clock',
        'For a jobsite injury, every non-employer party and any comp claim',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their coverage, including UM/UIM',
        'Employer, commercial, and umbrella policies in play',
        'Current and projected lifelong care and equipment needs',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether an Anaheim paralysis case involves a public entity \u2014 and its six-month deadline \u2014 maps every liable party including third parties beyond comp, searches for every coverage source, and organises the lifelong care picture for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An OCTA bus or public road was involved. Does the deadline change?',
        a: 'Yes. OCTA and the city are public entities, so where a bus or a public road is involved, the Government Claims Act requires a written claim within six months of the injury \u2014 far shorter than the usual two years. Identifying public-entity involvement immediately is essential.',
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

export const spinalInjuryCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [RIV_SCI_SLUG]: {
    scenario: `A Riverside warehouse worker paralyzed in a fall from a loading dock had a workers\u2019-comp claim, but a third-party claim against the property owner and the equipment supplier reached the catastrophic damages comp could not. ${NOT_ADVICE}`,
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
  [SB_SCI_SLUG]: {
    scenario: `A driver paralyzed in a high-speed crash descending the Cajon Pass faced a lifetime of care. Additional umbrella and UM/UIM coverage beyond the at-fault driver\u2019s policy, and a life-care plan, framed the value. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve evidence; identify the at-fault party and any public vehicle.'],
      ['First weeks', 'Search for every coverage source; open UM/UIM.'],
      ['Assessment', 'Build the life-care plan and earning-capacity analysis with experts.'],
      ['Longer term', 'Coverage and catastrophic-damages issues developed.'],
    ],
    severityLadder: [
      ['Underlying fault', 'The at-fault party must be proven.'],
      ['Injury level', 'It defines lifelong needs.'],
      ['Coverage search', 'Multiple policies may apply.'],
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
      'The level and completeness of the injury',
      'How many coverage sources are identified',
      'The strength of the life-care plan',
      'Whether UM/UIM coverage applies',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Find all coverage', copy: 'Multiple policies fund the result.' },
      { label: 'UM/UIM matters', copy: 'Your own coverage can be decisive.' },
      { label: 'Future dominates', copy: 'Lifelong care dwarfs past bills.' },
      { label: 'Plan the lifetime', copy: 'A life-care plan anchors value.' },
    ],
    insuranceProblems: [
      'Only the at-fault driver\u2019s minimum policy is pursued.',
      'UM/UIM coverage is never opened.',
      'No life-care plan quantifies future need.',
      'Additional liable parties are missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the injury, and who was at fault?' },
      { label: 'Step 2', question: 'What coverage \u2014 including your own UM/UIM \u2014 exists?' },
      { label: 'Step 3', question: 'What is the level and completeness of the injury?' },
      { label: 'Step 4', question: 'What lifelong care and equipment are needed?' },
    ],
  },
  [BAKERSFIELD_SCI_SLUG]: {
    scenario: `A Bakersfield farm worker paralyzed in an equipment rollover had a workers\u2019-comp claim, but a third-party claim against the equipment maker and a defect claim over the rollover reached the catastrophic damages comp could not. ${NOT_ADVICE}`,
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
  [ANAHEIM_SCI_SLUG]: {
    scenario: `An Anaheim worker paralyzed in a fall on a hotel construction site had a workers\u2019-comp claim, but a third-party claim against the general contractor and equipment supplier reached the catastrophic damages comp could not. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Open comp; identify every non-employer party and any public entity.'],
      ['First weeks', 'Preserve equipment; find all coverage.'],
      ['Assessment', 'Build the life-care plan with medical and economic experts.'],
      ['Longer term', 'Third-party liability and coverage issues developed.'],
    ],
    severityLadder: [
      ['Public entity?', 'It triggers a six-month deadline.'],
      ['Comp vs. third party', 'Comp covers the employer; others may be liable.'],
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
      { label: 'Deadline can be short', copy: 'OCTA or the city means six months.' },
      { label: 'Beyond comp', copy: 'Third-party claims reach catastrophic damages.' },
      { label: 'Future dominates', copy: 'Lifelong care dwarfs past bills.' },
      { label: 'Find all coverage', copy: 'Multiple policies fund the result.' },
    ],
    insuranceProblems: [
      'A public-entity six-month deadline is missed.',
      'Only the comp claim is pursued, missing the third-party claim.',
      'No life-care plan quantifies future need.',
      'Additional liable parties and coverage are missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was an OCTA bus, city vehicle, or public road involved?' },
      { label: 'Step 2', question: 'Who, besides an employer, may be at fault?' },
      { label: 'Step 3', question: 'What is the level and completeness of the injury?' },
      { label: 'Step 4', question: 'What lifelong care and equipment are needed?' },
    ],
  },
}
