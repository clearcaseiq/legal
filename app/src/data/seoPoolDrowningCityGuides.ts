import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, swimming-pool and drowning injury practice area: location-specific
 * guides for Sacramento, Fresno, Bakersfield, and Riverside.
 *
 * These hot inland metros have among the highest residential and apartment pool
 * densities in the state and long swim seasons, which is where pool-injury and
 * drowning claims concentrate.
 *
 * Local context, genuine rather than interpolated:
 *  - Sacramento: long, hot summers and widespread residential and apartment
 *    pools, plus public and community pools that raise public-entity questions.
 *  - Fresno: an intensely hot Central Valley climate and heavy apartment-pool
 *    use, where enclosure and supervision failures recur.
 *  - Bakersfield: extreme summer heat and a high density of residential pools.
 *  - Riverside and the Inland Empire: sustained heat and sprawling suburban and
 *    apartment-pool stock across many communities.
 *
 * Applied accurately:
 *  - A pool owner or operator owes a duty to keep the pool reasonably safe under
 *    ordinary premises-liability rules, which for a landlord, HOA, hotel, or gym
 *    extends to a common-area pool.
 *  - California's Swimming Pool Safety Act (Health and Safety Code section 115920
 *    and following) requires drowning-prevention safety features such as an
 *    enclosing barrier or approved fencing for many pools; a missing or defective
 *    barrier is frequently central to a child-drowning claim.
 *  - The attractive-nuisance doctrine can impose a heightened responsibility
 *    where a pool is likely to draw children who cannot appreciate the danger.
 *  - A defective drain, cover, or pump can carry strict product liability (the
 *    federal Virginia Graeme Baker Pool and Spa Safety Act addresses drain-entrapment
 *    hazards), and inadequate lifeguarding or supervision can be negligence.
 *  - A public or community pool can bring the six-month Government Claims Act
 *    deadline into play.
 *  - Pure comparative negligence, the two-year deadline (Code of Civil Procedure
 *    section 335.1), and tolling that can extend a minor's deadline.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a barrier failure, a supervision failure, a product defect, or a public-entity deadline applies depends on facts a licensed California attorney should review promptly.'

const PREMISES =
  'A pool owner or operator owes a duty to keep the pool reasonably safe under ordinary premises-liability rules, and for a landlord, homeowners association, hotel, or gym that duty extends to a common-area pool. Failing to maintain the pool, fix a known hazard, or provide required safety features can be negligence, and identifying who controlled the pool is the first step.'

const BARRIER =
  'California\u2019s Swimming Pool Safety Act (Health and Safety Code section 115920 and following) requires drowning-prevention safety features for many pools, such as an enclosing barrier or approved fencing with self-closing, self-latching gates. A missing, broken, or propped-open barrier is frequently central to a child-drowning claim, because it is often what allowed a child to reach the water unsupervised.'

const CHILD =
  'Where children are involved, the attractive-nuisance doctrine can impose a heightened responsibility: a pool is exactly the kind of feature likely to draw children who cannot appreciate the danger, so an owner who leaves it accessible may be responsible even for a child who was not invited. A minor\u2019s deadline to sue can also be extended by tolling, though the evidence should still be preserved immediately.'

const PRODUCT =
  'Some pool injuries come from a defective product rather than, or in addition to, a maintenance failure: a defective or missing anti-entrapment drain cover, a faulty pump, or a defective pool cover can carry strict product liability against the manufacturer and seller. The federal Virginia Graeme Baker Pool and Spa Safety Act addresses drain-entrapment hazards in particular, and inadequate lifeguarding or supervision at a staffed pool can be negligence.'

const PUBLIC =
  'Where the pool is public or community-run \u2014 a city or county pool, a school pool, or a community facility \u2014 a claim can involve a public entity, which brings the six-month Government Claims Act deadline into play, far shorter than the usual two years. A formal claim must be filed before any lawsuit, so identifying a public owner early is time-critical.'

export const SAC_POOL_SLUG = '/sacramento-pool-drowning-injury'
export const FRESNO_POOL_SLUG = '/fresno-pool-drowning-injury'
export const BAKERSFIELD_POOL_SLUG = '/bakersfield-pool-drowning-injury'
export const RIV_POOL_SLUG = '/riverside-pool-drowning-injury'

export const poolDrowningCityGuidePages: LandingPage[] = [
  {
    slug: SAC_POOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Pool & Drowning Injury Claims',
    title: 'Sacramento Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'A pool injury or drowning in a Sacramento apartment, home, or community pool? A claim can reach an owner, a landlord or HOA, or a product maker \u2014 and a public pool brings a six-month deadline.',
    psychology: 'Someone in my family was hurt or drowned at a Sacramento pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento pool drowning accident lawyer',
      'apartment pool no fence child drowning california',
      'pool safety act barrier requirement california',
      'community pool drowning claim california',
      'who is liable for a pool accident california',
    ],
    signals: [
      'Premises liability (owner/landlord/HOA)',
      'Pool Safety Act barrier (115920)',
      'Attractive nuisance (children)',
      'Defective drain/pump (product)',
      'Public-pool six-month deadline',
      'Minor tolling',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s long, hot summers and widespread residential, apartment, and community pools make pool injuries and drownings a recurring reality, and its many public and community pools raise the public-entity question. ${PREMISES} ${BARRIER} ${CHILD} ${PRODUCT} ${PUBLIC} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), though a minor\u2019s deadline can be tolled. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Who owned or controlled the pool \u2014 owner, landlord, HOA, or public entity',
        'Whether a required barrier or fence was missing, broken, or propped open',
        'Whether the gate self-closed and self-latched',
        'Whether a child reached the water unsupervised',
        'Any defective drain, cover, or pump',
        'Whether the pool was staffed and supervision provided',
        'Photographs of the pool, barrier, and scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Sacramento pool claim around the Swimming Pool Safety Act barrier requirements and the premises duty of the owner, landlord, or HOA, pursues a product claim for a defective drain or pump, and flags immediately when a public pool triggers the six-month deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A child got into an apartment pool that had no working fence. Who is responsible?',
        a: 'California\u2019s Swimming Pool Safety Act (Health and Safety Code section 115920 and following) requires drowning-prevention features such as an enclosing barrier or approved fencing with self-closing, self-latching gates for many pools. A missing, broken, or propped-open barrier is frequently central to a child-drowning claim, and the landlord or owner who controlled the pool may be responsible.',
      },
      {
        q: 'The pool is a public or community pool. Is the deadline different?',
        a: 'Yes. A claim involving a public entity \u2014 a city, county, or school pool, or a community facility \u2014 brings the six-month Government Claims Act deadline into play, far shorter than the usual two years, and a formal claim must be filed before any lawsuit. Identifying a public owner early is time-critical.',
      },
      {
        q: 'The injury involved a drain or pump. Can I claim against the maker?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective pool cover can carry strict product liability against the manufacturer and seller. The federal Virginia Graeme Baker Pool and Spa Safety Act addresses drain-entrapment hazards in particular, so preserving the component matters.',
      },
      {
        q: 'The pool did not invite my child. Does that matter?',
        a: 'Not necessarily. The attractive-nuisance doctrine can impose a heightened responsibility where a pool is likely to draw children who cannot appreciate the danger, so an owner who leaves it accessible may be responsible even for a child who was not invited.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the barrier and supervision questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_POOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Pool & Drowning Injury Claims',
    title: 'Fresno Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'A pool injury or drowning at a Fresno apartment or home pool? Missing fences and lax supervision are common causes \u2014 and a claim can reach an owner, a landlord, or a product maker.',
    psychology: 'Someone in my family was hurt or drowned at a Fresno pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno pool drowning accident lawyer',
      'apartment pool no fence child drowning california',
      'pool safety act barrier requirement california',
      'who is liable for a pool accident california',
      'child drowning apartment complex california',
    ],
    signals: [
      'Premises liability (owner/landlord/HOA)',
      'Pool Safety Act barrier (115920)',
      'Attractive nuisance (children)',
      'Apartment-pool supervision',
      'Defective drain/pump (product)',
      'Minor tolling',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s intensely hot Central Valley climate and heavy apartment-pool use make enclosure and supervision failures a recurring cause of drownings, especially among children. ${BARRIER} In dense apartment complexes, a propped-open gate or an unmaintained fence is a frequent factor. ${PREMISES} ${CHILD} ${PRODUCT} ${PUBLIC} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), though a minor\u2019s deadline can be tolled. Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'Who owned or controlled the pool \u2014 owner, landlord, HOA, or public entity',
        'Whether the complex maintained the required barrier and gate',
        'Whether the gate self-closed and self-latched',
        'Whether a child reached the water unsupervised',
        'Any prior complaints about the fence or gate',
        'Any defective drain, cover, or pump',
        'Photographs of the pool, barrier, and scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Fresno pool claim around the apartment complex\u2019s barrier and maintenance duties under the Swimming Pool Safety Act, develops any prior-complaint history about the fence or gate, and pursues a product claim for a defective drain or pump. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A child drowned at an apartment complex pool with a broken gate. Who is responsible?',
        a: 'The complex that controlled the pool may be responsible. California\u2019s Swimming Pool Safety Act requires drowning-prevention features such as approved fencing with self-closing, self-latching gates, and a broken or propped-open gate is frequently central to a child-drowning claim. Prior complaints about the gate strengthen that case.',
      },
      {
        q: 'The pool did not invite my child. Does that matter?',
        a: 'Not necessarily. The attractive-nuisance doctrine can impose a heightened responsibility where a pool is likely to draw children who cannot appreciate the danger, so an owner who leaves it accessible may be responsible even for a child who was not invited.',
      },
      {
        q: 'The injury involved a drain or pump. Can I claim against the maker?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective pool cover can carry strict product liability against the manufacturer and seller. The federal Virginia Graeme Baker Pool and Spa Safety Act addresses drain-entrapment hazards, so preserving the component matters.',
      },
      {
        q: 'How long do we have to bring a claim for a child?',
        a: 'The general deadline is two years (Code of Civil Procedure section 335.1), but a minor\u2019s deadline can be tolled, extending the time. Even so, the evidence \u2014 the barrier, the gate, and any complaints \u2014 should be preserved immediately, and a public pool carries a much shorter six-month deadline.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the barrier and supervision questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_POOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Pool & Drowning Injury Claims',
    title: 'Bakersfield Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'A pool injury or drowning at a Bakersfield home or apartment pool? A claim can reach an owner, a landlord or HOA, or a product maker \u2014 and missing barriers are a frequent cause.',
    psychology: 'Someone in my family was hurt or drowned at a Bakersfield pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield pool drowning accident lawyer',
      'residential pool no fence child drowning california',
      'pool safety act barrier requirement california',
      'who is liable for a pool accident california',
      'child drowning claim california',
    ],
    signals: [
      'Premises liability (owner/landlord/HOA)',
      'Pool Safety Act barrier (115920)',
      'Attractive nuisance (children)',
      'High residential-pool density',
      'Defective drain/pump (product)',
      'Minor tolling',
    ],
    sections: {
      whyItMatters: `Bakersfield\u2019s extreme summer heat and high density of residential pools make pool injuries and child drownings a recurring reality, with missing or inadequate barriers a frequent cause. ${BARRIER} ${PREMISES} ${CHILD} ${PRODUCT} ${PUBLIC} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), though a minor\u2019s deadline can be tolled. Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'Who owned or controlled the pool \u2014 owner, landlord, HOA, or public entity',
        'Whether a required barrier or fence was missing, broken, or propped open',
        'Whether the gate self-closed and self-latched',
        'Whether a child reached the water unsupervised',
        'Any defective drain, cover, or pump',
        'Whether the pool was staffed and supervision provided',
        'Photographs of the pool, barrier, and scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Bakersfield pool claim around the Swimming Pool Safety Act barrier requirements and the premises duty of the owner, landlord, or HOA, pursues a product claim for a defective drain or pump, and flags when a public pool triggers the six-month deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A child got into a residential pool with no fence. Who is responsible?',
        a: 'California\u2019s Swimming Pool Safety Act (Health and Safety Code section 115920 and following) requires drowning-prevention features such as an enclosing barrier or approved fencing for many pools. A missing barrier is frequently central to a child-drowning claim, and the owner who controlled the pool may be responsible.',
      },
      {
        q: 'The pool did not invite my child. Does that matter?',
        a: 'Not necessarily. The attractive-nuisance doctrine can impose a heightened responsibility where a pool is likely to draw children who cannot appreciate the danger, so an owner who leaves it accessible may be responsible even for a child who was not invited.',
      },
      {
        q: 'The injury involved a drain or pump. Can I claim against the maker?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective pool cover can carry strict product liability against the manufacturer and seller. The federal Virginia Graeme Baker Pool and Spa Safety Act addresses drain-entrapment hazards, so preserving the component matters.',
      },
      {
        q: 'The pool is a public or community pool. Is the deadline different?',
        a: 'Yes. A claim involving a public entity brings the six-month Government Claims Act deadline into play, far shorter than the usual two years, and a formal claim must be filed before any lawsuit. Identifying a public owner early is time-critical.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the barrier and supervision questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIV_POOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Pool & Drowning Injury Claims',
    title: 'Riverside Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'A pool injury or drowning at a Riverside or Inland Empire home, apartment, or HOA pool? A claim can reach an owner, a landlord or HOA, or a product maker \u2014 and missing barriers are a frequent cause.',
    psychology: 'Someone in my family was hurt or drowned at a Riverside pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside pool drowning accident lawyer',
      'hoa pool child drowning liability california',
      'apartment pool no fence child drowning california',
      'pool safety act barrier requirement california',
      'who is liable for a pool accident california',
    ],
    signals: [
      'Premises liability (owner/landlord/HOA)',
      'Pool Safety Act barrier (115920)',
      'Attractive nuisance (children)',
      'Suburban & HOA pools',
      'Defective drain/pump (product)',
      'Minor tolling',
    ],
    sections: {
      whyItMatters: `Riverside and the wider Inland Empire combine sustained heat with a sprawling stock of suburban, apartment, and HOA-governed pools, which makes barrier and supervision failures a recurring cause of injuries and drownings. Where a homeowners association governs a community pool, its duty to maintain a safe pool and required barriers comes into play alongside any landlord or owner. ${BARRIER} ${PREMISES} ${CHILD} ${PRODUCT} ${PUBLIC} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), though a minor\u2019s deadline can be tolled. Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'Who owned or controlled the pool \u2014 owner, landlord, HOA, or public entity',
        'For an HOA pool, the association\u2019s maintenance and inspection records',
        'Whether a required barrier or fence was missing, broken, or propped open',
        'Whether the gate self-closed and self-latched',
        'Whether a child reached the water unsupervised',
        'Any defective drain, cover, or pump',
        'Photographs of the pool, barrier, and scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Riverside pool claim around the premises and barrier duties of the owner, landlord, or HOA, develops an HOA\u2019s maintenance and inspection records for a community pool, and pursues a product claim for a defective drain or pump. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A child drowned at an HOA community pool. Can the association be responsible?',
        a: 'Yes, potentially. A homeowners association that governs a community pool owes a duty to maintain a safe pool and the required barriers under the Swimming Pool Safety Act. A missing or broken barrier, or a failure to fix a known hazard, can make the association responsible, and its maintenance and inspection records are important.',
      },
      {
        q: 'The pool did not invite my child. Does that matter?',
        a: 'Not necessarily. The attractive-nuisance doctrine can impose a heightened responsibility where a pool is likely to draw children who cannot appreciate the danger, so an owner who leaves it accessible may be responsible even for a child who was not invited.',
      },
      {
        q: 'The injury involved a drain or pump. Can I claim against the maker?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective pool cover can carry strict product liability against the manufacturer and seller. The federal Virginia Graeme Baker Pool and Spa Safety Act addresses drain-entrapment hazards, so preserving the component matters.',
      },
      {
        q: 'How long do we have to bring a claim for a child?',
        a: 'The general deadline is two years (Code of Civil Procedure section 335.1), but a minor\u2019s deadline can be tolled, extending the time. Even so, the barrier, the gate, and any records should be preserved immediately, and a public pool carries a much shorter six-month deadline.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the barrier and supervision questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const poolDrowningCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [SAC_POOL_SLUG]: {
    scenario: `A child reached an apartment pool through a gate that no longer self-latched and drowned. The Swimming Pool Safety Act barrier requirements and the complex\u2019s maintenance failures established the premises claim, and the gate hardware was preserved. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the barrier and gate; identify who controlled the pool.'],
      ['First days', 'Owner, landlord, HOA, or public entity identified.'],
      ['First weeks', 'Barrier compliance and any prior complaints developed.'],
      ['Longer term', 'Treatment and the full loss documented.'],
    ],
    severityLadder: [
      ['Barrier failure', 'A missing or broken barrier lets a child reach the water.'],
      ['Supervision', 'Inadequate lifeguarding or oversight adds fault.'],
      ['Product path', 'A defective drain or pump adds a defendant.'],
      ['Public-pool path', 'A community pool triggers the six-month rule.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the pool incident.' },
      { label: 'Critical care', copy: 'Near-drowning care documents severity.' },
      { label: 'Continuing care', copy: 'Neurological follow-up shows lasting harm.' },
      { label: 'Documentation', copy: 'Bills, future care, and loss define economics.' },
    ],
    settlementDrivers: [
      'Whether the required barrier was present and working',
      'Whether the gate self-closed and self-latched',
      'Whether supervision was adequate',
      'Whether a defective drain or pump adds a product claim',
      'Whether a public entity and its six-month deadline apply',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Barriers anchor fault', copy: 'The Pool Safety Act sets the standard.' },
      { label: 'Attractive nuisance', copy: 'Children are owed heightened care near pools.' },
      { label: 'Products add coverage', copy: 'A defective drain opens strict liability.' },
      { label: 'Deadlines vary', copy: 'A public pool means six months.' },
    ],
    insuranceProblems: [
      'The family is blamed without examining the barrier.',
      'The gate hardware is repaired before it is preserved.',
      'A public-pool six-month deadline is missed.',
      'A product claim for the drain or pump is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Who owned or controlled the pool?' },
      { label: 'Step 2', question: 'Was the barrier present, and did the gate self-latch?' },
      { label: 'Step 3', question: 'Was the pool public or community-run?' },
      { label: 'Step 4', question: 'Did a drain, cover, or pump play a role?' },
    ],
  },
  [FRESNO_POOL_SLUG]: {
    scenario: `A child slipped through a propped-open apartment pool gate that tenants had complained about for months. The prior-complaint history and the barrier requirements built the claim against the complex. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the gate and barrier; identify the complex.'],
      ['First days', 'The property manager and owner identified.'],
      ['First weeks', 'Prior complaints and barrier compliance developed.'],
      ['Longer term', 'Treatment and the full loss documented.'],
    ],
    severityLadder: [
      ['Barrier failure', 'A propped-open gate lets a child reach the water.'],
      ['Notice', 'Prior complaints show the hazard was known.'],
      ['Product path', 'A defective drain or pump adds a defendant.'],
      ['Public-pool path', 'A community pool triggers the six-month rule.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the pool incident.' },
      { label: 'Critical care', copy: 'Near-drowning care documents severity.' },
      { label: 'Continuing care', copy: 'Neurological follow-up shows lasting harm.' },
      { label: 'Documentation', copy: 'Bills, future care, and loss define economics.' },
    ],
    settlementDrivers: [
      'Whether the complex maintained the barrier and gate',
      'Whether prior complaints put it on notice',
      'Whether supervision was adequate',
      'Whether a defective drain or pump adds a product claim',
      'Whether a public entity and its six-month deadline apply',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Notice matters', copy: 'Prior complaints show a known hazard.' },
      { label: 'Barriers anchor fault', copy: 'The Pool Safety Act sets the standard.' },
      { label: 'Attractive nuisance', copy: 'Children are owed heightened care near pools.' },
      { label: 'Products add coverage', copy: 'A defective drain opens strict liability.' },
    ],
    insuranceProblems: [
      'The prior-complaint history is never obtained.',
      'The gate is fixed before it is documented.',
      'The family is blamed without examining the barrier.',
      'A product claim for the drain or pump is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which complex controlled the pool?' },
      { label: 'Step 2', question: 'Were there prior complaints about the gate or fence?' },
      { label: 'Step 3', question: 'Did the gate self-close and self-latch?' },
      { label: 'Step 4', question: 'Did a drain, cover, or pump play a role?' },
    ],
  },
  [BAKERSFIELD_POOL_SLUG]: {
    scenario: `A child reached an unfenced residential pool during extreme summer heat. The absence of a required barrier under the Swimming Pool Safety Act was central, and the owner\u2019s homeowner policy provided the coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the pool and any barrier; identify the owner.'],
      ['First days', 'The owner and any policy identified.'],
      ['First weeks', 'Barrier compliance and access route developed.'],
      ['Longer term', 'Treatment and the full loss documented.'],
    ],
    severityLadder: [
      ['Barrier failure', 'An unfenced pool lets a child reach the water.'],
      ['Attractive nuisance', 'A pool draws children who cannot judge the danger.'],
      ['Product path', 'A defective drain or pump adds a defendant.'],
      ['Public-pool path', 'A community pool triggers the six-month rule.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the pool incident.' },
      { label: 'Critical care', copy: 'Near-drowning care documents severity.' },
      { label: 'Continuing care', copy: 'Neurological follow-up shows lasting harm.' },
      { label: 'Documentation', copy: 'Bills, future care, and loss define economics.' },
    ],
    settlementDrivers: [
      'Whether the required barrier was present',
      'How the child reached the water',
      'Whether a defective drain or pump adds a product claim',
      'The coverage behind the owner',
      'Whether a public entity and its six-month deadline apply',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Barriers anchor fault', copy: 'The Pool Safety Act sets the standard.' },
      { label: 'Attractive nuisance', copy: 'Children are owed heightened care near pools.' },
      { label: 'Find the coverage', copy: 'A homeowner policy often applies.' },
      { label: 'Products add coverage', copy: 'A defective drain opens strict liability.' },
    ],
    insuranceProblems: [
      'The family is blamed without examining the barrier.',
      'The owner\u2019s policy coverage is never identified.',
      'The access route to the pool is not documented.',
      'A product claim for the drain or pump is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Who owned the pool, and was it fenced?' },
      { label: 'Step 2', question: 'How did the child reach the water?' },
      { label: 'Step 3', question: 'Did a drain, cover, or pump play a role?' },
      { label: 'Step 4', question: 'Was the pool residential, community, or public?' },
    ],
  },
  [RIV_POOL_SLUG]: {
    scenario: `A child drowned at an HOA-governed community pool where the fence gate had a broken latch. The association\u2019s maintenance records and the barrier requirements established the claim against the HOA. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the barrier and gate; identify the HOA.'],
      ['First days', 'The HOA and its management company identified.'],
      ['First weeks', 'HOA maintenance records and barrier compliance developed.'],
      ['Longer term', 'Treatment and the full loss documented.'],
    ],
    severityLadder: [
      ['Barrier failure', 'A broken gate latch lets a child reach the water.'],
      ['HOA duty', 'The association must maintain a safe community pool.'],
      ['Product path', 'A defective drain or pump adds a defendant.'],
      ['Public-pool path', 'A public pool triggers the six-month rule.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the pool incident.' },
      { label: 'Critical care', copy: 'Near-drowning care documents severity.' },
      { label: 'Continuing care', copy: 'Neurological follow-up shows lasting harm.' },
      { label: 'Documentation', copy: 'Bills, future care, and loss define economics.' },
    ],
    settlementDrivers: [
      'Whether the HOA maintained the barrier and gate',
      'The HOA\u2019s maintenance and inspection records',
      'Whether supervision was adequate',
      'Whether a defective drain or pump adds a product claim',
      'Whether a public entity and its six-month deadline apply',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'HOA owes a duty', copy: 'A community pool must be kept safe.' },
      { label: 'Barriers anchor fault', copy: 'The Pool Safety Act sets the standard.' },
      { label: 'Records are decisive', copy: 'HOA maintenance history proves the case.' },
      { label: 'Products add coverage', copy: 'A defective drain opens strict liability.' },
    ],
    insuranceProblems: [
      'The HOA maintenance records are never requested.',
      'The gate hardware is fixed before it is preserved.',
      'The family is blamed without examining the barrier.',
      'A product claim for the drain or pump is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the pool governed by an HOA or association?' },
      { label: 'Step 2', question: 'Was the barrier present, and did the gate self-latch?' },
      { label: 'Step 3', question: 'Are the HOA maintenance records available?' },
      { label: 'Step 4', question: 'Did a drain, cover, or pump play a role?' },
    ],
  },
}
