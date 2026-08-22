import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, spinal-cord-injury / paralysis practice area: location-specific
 * guides for Los Angeles, San Diego, San Francisco, and Sacramento.
 *
 * A spinal-cord-injury (SCI) claim rides on an underlying negligence claim, but
 * it is a distinct search intent and a distinct litigation problem because the
 * damages are catastrophic and lifelong, and because the case turns on finding
 * every available source of insurance coverage to meet a value that ordinary
 * policies cannot.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: high-speed freeway and motorcycle crashes that produce
 *    catastrophic spinal injuries.
 *  - San Diego: shallow-water diving injuries at beaches and pools, alongside a
 *    military population where a federal actor can route the claim through the
 *    Federal Tort Claims Act.
 *  - San Francisco: falls from height, cyclist collisions, and construction
 *    injuries in a dense urban core.
 *  - Sacramento: regional highway crashes, with public-entity issues where a
 *    public vehicle or dangerous road is involved.
 *
 * Applied accurately:
 *  - A spinal-cord injury can be incomplete (partial loss of function) or
 *    complete (total loss below the level of injury), producing paraplegia or
 *    tetraplegia; the level of injury largely determines the lifelong needs, and
 *    the injury is generally permanent.
 *  - The claim depends on the underlying liability \u2014 the at-fault party\u2019s
 *    negligence must still be proven \u2014 and the deadline follows that claim
 *    (generally two years under Code of Civil Procedure section 335.1, or six
 *    months under the Government Claims Act if a public entity is involved).
 *  - Damages are catastrophic and largely economic: lifelong attendant or
 *    nursing care, home and vehicle modification, adaptive equipment, ongoing
 *    medical care, and lost earning capacity \u2014 requiring a life-care plan and an
 *    economist \u2014 alongside substantial non-economic damages.
 *  - Because the value far exceeds a minimum auto policy, identifying every
 *    coverage source \u2014 multiple defendants, umbrella and commercial policies,
 *    and the injured person\u2019s own UM/UIM coverage \u2014 is often decisive. Pure
 *    comparative negligence applies.
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

export const LA_SCI_SLUG = '/los-angeles-spinal-cord-injury-claim'
export const SD_SCI_SLUG = '/san-diego-spinal-cord-injury-claim'
export const SF_SCI_SLUG = '/san-francisco-spinal-cord-injury-claim'
export const SAC_SCI_SLUG = '/sacramento-spinal-cord-injury-claim'

export const spinalInjuryCityGuidePages: LandingPage[] = [
  {
    slug: LA_SCI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Spinal Cord Injury & Paralysis Claims',
    title: 'Los Angeles Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury or paralysis in an LA crash? The case is built around lifelong care \u2014 and finding every source of insurance coverage.',
    psychology: 'I or a loved one was paralyzed in an LA accident and I do not know how we will pay for a lifetime of care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles spinal cord injury lawyer',
      'paralysis accident claim california',
      'paraplegia lawsuit california',
      'catastrophic injury attorney california',
      'life care plan spinal injury california',
    ],
    signals: [
      'Underlying negligence required',
      'Catastrophic lifelong damages',
      'Life-care plan & economist',
      'Find every coverage source',
      'UM/UIM & umbrella policies',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `High-speed freeway and motorcycle crashes make catastrophic spinal injuries a reality in Los Angeles, and the legal case must be built around a lifetime of care and the coverage needed to fund it. ${WHAT_SCI} ${UNDERLYING} ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The underlying event (crash, fall, product) and who was at fault',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their insurance coverage',
        'Employer, commercial, and umbrella policies in play',
        'The injured person\u2019s own UM/UIM coverage',
        'The date of injury and whether a public entity was involved',
        'Current and projected lifelong care and equipment needs',
        'Home and vehicle modifications required',
      ],
      howClearCaseHelps: `ClearCaseIQ ties an LA paralysis case to the at-fault party, searches for every source of coverage \u2014 additional defendants, umbrella, and UM/UIM \u2014 and organises the lifelong care picture for a life-care plan and economist. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'How is a paralysis case valued?',
        a: 'Around the future. Spinal-cord-injury damages are catastrophic and largely economic \u2014 lifelong attendant or nursing care, home and vehicle modification, adaptive equipment, ongoing medical care, and lost earning capacity \u2014 which usually dwarf the past bills. A life-care plan and an economist quantify decades of need, alongside non-economic damages.',
      },
      {
        q: 'The at-fault driver has only a small policy. Is that all we can recover?',
        a: 'Not necessarily. Because the value far exceeds a minimum policy, the case often turns on finding every source of coverage \u2014 additional at-fault parties, employer or commercial policies, umbrella coverage, and your own uninsured/underinsured motorist (UM/UIM) coverage. Identifying all of it early is frequently decisive.',
      },
      {
        q: 'What do I have to prove?',
        a: 'That another party\u2019s negligence caused the event, and that it caused the spinal injury. The paralysis claim rides on the underlying liability, and the deadline follows it \u2014 generally two years, but as short as six months if a public entity is involved.',
      },
      {
        q: 'How soon should we act?',
        a: 'Immediately. Evidence must be preserved, coverage identified, and any government-claim deadline met, while the life-care planning that drives the case takes time to develop. Early action protects both the claim and the funding for care.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_SCI_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Spinal Cord Injury & Paralysis Claims',
    title: 'San Diego Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury in San Diego \u2014 in a crash, a shallow-water dive, or on a base? The case is built around lifelong care and every source of coverage.',
    psychology: 'I or a loved one was paralyzed in San Diego, maybe in the water or on a base, and I do not know what rules apply.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego spinal cord injury lawyer',
      'diving accident paralysis claim california',
      'paraplegia lawsuit california',
      'military spinal injury claim california',
      'catastrophic injury attorney california',
    ],
    signals: [
      'Underlying negligence required',
      'Diving / shallow-water injuries',
      'Federal actor / base (FTCA)',
      'Catastrophic lifelong damages',
      'Life-care plan & economist',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s beaches and pools bring a distinct hazard \u2014 shallow-water diving injuries that cause catastrophic spinal damage \u2014 alongside crashes, and its large military population means a federal actor may be involved, changing the entire path. ${WHAT_SCI} A shallow-water dive can raise premises-liability and warning-adequacy questions, while a claim involving a federal actor runs through the Federal Tort Claims Act. ${UNDERLYING} ${CATASTROPHIC} ${INSURANCE} Civil cases against private parties are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The underlying event, including any diving or shallow-water injury',
        'Whether a federal actor or base was involved',
        'The level and completeness of the spinal injury',
        'For a dive injury, the depth, warnings, and premises owner',
        'All at-fault parties and their coverage',
        'The applicable path \u2014 state negligence or FTCA',
        'Current and projected lifelong care and equipment needs',
        'Home and vehicle modifications required',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether a San Diego paralysis case involves a private party, a premises owner (for a dive injury), or a federal actor, searches for every coverage source, and organises the lifelong care picture for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was paralyzed diving into shallow water. Can I have a claim?',
        a: 'Possibly. A shallow-water diving injury can raise premises-liability questions \u2014 whether the depth was dangerous, whether warnings were adequate, and whether the owner should have prevented the hazard. As with any paralysis claim, the underlying negligence must be shown.',
      },
      {
        q: 'A federal actor or base was involved. Does that change my claim?',
        a: 'It can. Where a federal actor caused the injury or it occurred on a federal installation, the claim may run through the Federal Tort Claims Act, which requires an administrative claim first and follows federal rules and deadlines. Identifying this early is essential.',
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
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_SCI_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Spinal Cord Injury & Paralysis Claims',
    title: 'San Francisco Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury in San Francisco \u2014 a fall from height, a cyclist crash, or on a jobsite? The case is built around lifelong care and every source of coverage.',
    psychology: 'I or a loved one was paralyzed in a San Francisco fall or crash and I do not know how we will fund a lifetime of care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco spinal cord injury lawyer',
      'fall paralysis claim california',
      'construction spinal injury lawsuit california',
      'paraplegia attorney california',
      'catastrophic injury attorney california',
    ],
    signals: [
      'Underlying negligence required',
      'Falls from height / jobsite injuries',
      'Catastrophic lifelong damages',
      'Life-care plan & economist',
      'Find every coverage source',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s dense urban core produces catastrophic spinal injuries from falls from height, cyclist collisions, and construction incidents \u2014 and each of these can involve multiple potentially liable parties and layers of coverage. ${WHAT_SCI} ${UNDERLYING} For a jobsite injury, a third-party claim beyond workers\u2019 compensation \u2014 against an equipment maker, a different contractor, or the property owner \u2014 can be central. ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'The underlying event (fall, cyclist crash, jobsite) and who was at fault',
        'For a jobsite injury, every non-employer party and any comp claim',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their coverage',
        'Employer, commercial, and umbrella policies in play',
        'The date of injury and whether a public entity was involved',
        'Current and projected lifelong care and equipment needs',
        'Home and vehicle modifications required',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every potentially liable party in a San Francisco paralysis case \u2014 including third parties beyond a workers\u2019-comp claim \u2014 searches for every coverage source, and organises the lifelong care picture for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was paralyzed in a fall at work. Do I only have workers\u2019 comp?',
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
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_SCI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Spinal Cord Injury & Paralysis Claims',
    title: 'Sacramento Spinal Cord Injury & Paralysis Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a spinal cord injury in a Sacramento-area crash? The case is built around lifelong care \u2014 and a public vehicle or dangerous road adds a six-month deadline.',
    psychology: 'I or a loved one was paralyzed in a Sacramento-area accident and I do not know who is responsible or how we will fund care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento spinal cord injury lawyer',
      'paralysis accident claim california',
      'paraplegia lawsuit california',
      'catastrophic injury attorney california',
      'public entity injury claim california',
    ],
    signals: [
      'Underlying negligence required',
      'Public vehicle / dangerous road',
      'Six-month claim (911.2) if public',
      'Catastrophic lifelong damages',
      'Life-care plan & economist',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `Regional highway crashes cause catastrophic spinal injuries across the Sacramento area, and where a public vehicle or a dangerous public road is involved, a much shorter deadline applies on top of the lifelong-care and coverage work every paralysis case requires. ${WHAT_SCI} ${UNDERLYING} Where a public entity is involved, the Government Claims Act requires a formal claim within six months (Government Code section 911.2), far shorter than the usual two years. ${CATASTROPHIC} ${INSURANCE} Civil cases are filed in Sacramento County Superior Court after any required claim.`,
      whatToTrack: [
        'The underlying event and whether a public vehicle or road was involved',
        'The date of injury, which starts any six-month clock',
        'The level and completeness of the spinal injury',
        'All at-fault parties and their coverage',
        'Employer, commercial, and umbrella policies in play',
        'The injured person\u2019s own UM/UIM coverage',
        'Current and projected lifelong care and equipment needs',
        'Home and vehicle modifications required',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether a Sacramento-area paralysis case involves a public entity \u2014 and its six-month deadline \u2014 searches for every coverage source, and organises the lifelong care picture for a life-care plan and economist. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A public vehicle or bad road caused the injury. Does the deadline change?',
        a: 'Yes. Where a public entity is involved, the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the usual two years. Identifying public-entity involvement must be done immediately.',
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
        q: 'What do I have to prove?',
        a: 'That another party\u2019s negligence caused the event, and that it caused the spinal injury. The claim rides on the underlying liability, and the deadline follows it \u2014 two years generally, or six months for a public entity.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const spinalInjuryCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_SCI_SLUG]: {
    scenario: `An LA motorcyclist paralyzed by a left-turning driver faced a lifetime of care. Beyond the driver\u2019s policy, an umbrella policy and the rider\u2019s own UM/UIM coverage were found, and a life-care plan quantified the future. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve evidence; identify the at-fault party.'],
      ['First weeks', 'Search for every coverage source; open UM/UIM.'],
      ['Assessment', 'Build the life-care plan with medical and economic experts.'],
      ['Longer term', 'Coverage and catastrophic-damages issues developed.'],
    ],
    severityLadder: [
      ['Underlying fault', 'The at-fault party must be proven.'],
      ['Injury level', 'It defines lifelong needs.'],
      ['Coverage', 'Every source must be found.'],
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
      'Whether UM/UIM and umbrella coverage apply',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Future dominates', copy: 'Lifelong care dwarfs past bills.' },
      { label: 'Find all coverage', copy: 'Multiple policies fund the result.' },
      { label: 'UM/UIM matters', copy: 'Your own coverage can be decisive.' },
      { label: 'Plan the lifetime', copy: 'A life-care plan anchors value.' },
    ],
    insuranceProblems: [
      'Only the at-fault driver\u2019s minimum policy is pursued.',
      'UM/UIM and umbrella coverage are never explored.',
      'No life-care plan quantifies future need.',
      'Additional liable parties are missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the injury, and who was at fault?' },
      { label: 'Step 2', question: 'What is the level and completeness of the injury?' },
      { label: 'Step 3', question: 'What insurance might apply, including your own?' },
      { label: 'Step 4', question: 'What lifelong care and equipment are needed?' },
    ],
  },
  [SD_SCI_SLUG]: {
    scenario: `A San Diego swimmer was paralyzed diving into an unmarked shallow area at a pool. A premises-liability claim over the dangerous depth and inadequate warnings, plus a life-care plan, framed the case. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Document the depth, warnings, and premises owner.'],
      ['First weeks', 'Determine whether a federal actor was involved; find coverage.'],
      ['Assessment', 'Build the life-care plan with medical and economic experts.'],
      ['Longer term', 'Premises-liability and coverage issues developed.'],
    ],
    severityLadder: [
      ['Right path', 'Private premises vs. federal actor decides rules.'],
      ['Dangerous condition', 'Depth and warnings are examined.'],
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
      'Whether the depth or warnings were dangerous',
      'Whether a federal actor changes the path',
      'The level and completeness of the injury',
      'How many coverage sources are identified',
      'The strength of the life-care plan',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Premises focus', copy: 'Depth and warnings drive dive claims.' },
      { label: 'Path first', copy: 'Federal actors need the FTCA process.' },
      { label: 'Future dominates', copy: 'Lifelong care dwarfs past bills.' },
      { label: 'Find all coverage', copy: 'Multiple policies fund the result.' },
    ],
    insuranceProblems: [
      'The dangerous depth and warnings go undocumented.',
      'A federal actor is missed, losing the FTCA path.',
      'No life-care plan quantifies future need.',
      'Available coverage is never fully explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How did the injury happen \u2014 crash, dive, or fall?' },
      { label: 'Step 2', question: 'For a dive, what was the depth and warnings?' },
      { label: 'Step 3', question: 'Was a federal actor or base involved?' },
      { label: 'Step 4', question: 'What lifelong care and equipment are needed?' },
    ],
  },
  [SF_SCI_SLUG]: {
    scenario: `A San Francisco worker paralyzed in a fall from height had a workers\u2019-comp claim, but a third-party claim against the scaffold maker and general contractor reached the catastrophic damages comp could not. ${NOT_ADVICE}`,
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
      { label: 'Step 1', question: 'How did the injury happen \u2014 fall, crash, or jobsite?' },
      { label: 'Step 2', question: 'Who, besides an employer, may be at fault?' },
      { label: 'Step 3', question: 'What is the level and completeness of the injury?' },
      { label: 'Step 4', question: 'What lifelong care and equipment are needed?' },
    ],
  },
  [SAC_SCI_SLUG]: {
    scenario: `A Sacramento-area crash with a public vehicle left a driver paraplegic. Recognising the public-entity involvement, a six-month claim was filed, and a life-care plan quantified the lifelong need. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether a public vehicle or road was involved.'],
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
      'Whether the underlying negligence is clear',
      'The level and completeness of the injury',
      'How many coverage sources are identified',
      'The strength of the life-care plan',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Deadline can be short', copy: 'A public entity means six months.' },
      { label: 'Future dominates', copy: 'Lifelong care dwarfs past bills.' },
      { label: 'Find all coverage', copy: 'Multiple policies fund the result.' },
      { label: 'Plan the lifetime', copy: 'A life-care plan anchors value.' },
    ],
    insuranceProblems: [
      'A public-entity six-month deadline is missed.',
      'Only the at-fault party\u2019s minimum policy is pursued.',
      'UM/UIM and umbrella coverage are never explored.',
      'No life-care plan quantifies future need.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a public vehicle or road involved?' },
      { label: 'Step 2', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 3', question: 'What is the level and completeness of the injury?' },
      { label: 'Step 4', question: 'What lifelong care and equipment are needed?' },
    ],
  },
}
