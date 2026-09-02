import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, swimming-pool and drowning injury practice area (batch 2):
 * location-specific guides for Los Angeles, San Diego, San Jose, and Long Beach,
 * extending the batch-1 hot-inland hub (Sacramento, Fresno, Bakersfield,
 * Riverside).
 *
 * These coastal and major metros add dense apartment, hotel/resort, HOA, and
 * public-pool contexts to the hub.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: an enormous stock of apartment and condo common-area pools,
 *    hotel and rooftop pools, gym pools, and short-term-rental pools, where the
 *    party that controlled the pool (landlord, HOA, hotel, host) is the question.
 *  - San Diego: heavy tourism with hotel and resort pools, backyard pools, and
 *    large military installations where an on-base pool can route a claim through
 *    the Federal Tort Claims Act.
 *  - San Jose: apartment, HOA, and community pools plus city public pools, where
 *    barrier and supervision failures and the public-entity deadline recur.
 *  - Long Beach: apartment and hotel pools serving the convention and tourism
 *    trade, and city-run public pools that raise the six-month claim rule.
 *
 * Applied accurately (premises duty of the owner/landlord/HOA/hotel; California
 * Swimming Pool Safety Act barrier and fencing requirements, Health & Safety Code
 * 115920 et seq.; attractive-nuisance doctrine for children; strict product
 * liability for a defective drain, cover, or pump, with the federal Virginia
 * Graeme Baker Pool and Spa Safety Act on drain entrapment; public-entity
 * six-month Government Claims Act deadline; FTCA for a federal/on-base pool; pure
 * comparative negligence; two-year deadline CCP 335.1; minor tolling).
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

export const LA_POOL_SLUG = '/los-angeles-pool-drowning-injury'
export const SD_POOL_SLUG = '/san-diego-pool-drowning-injury'
export const SJ_POOL_SLUG = '/san-jose-pool-drowning-injury'
export const LB_POOL_SLUG = '/long-beach-pool-drowning-injury'

export const poolDrowningCityGuidePages2: LandingPage[] = [
  {
    slug: LA_POOL_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Pool & Drowning Injury Claims',
    title: 'Los Angeles Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'A pool injury or drowning at an LA apartment, hotel, gym, or short-term-rental pool? A claim can reach the landlord, HOA, hotel, or host who controlled the pool, or a product maker \u2014 and a public pool brings a six-month deadline.',
    psychology: 'Someone in my family was hurt or drowned at an LA pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles pool drowning accident lawyer',
      'apartment pool no fence child drowning california',
      'hotel pool drowning liability california',
      'airbnb pool drowning who is liable california',
      'pool safety act barrier requirement california',
    ],
    signals: [
      'Premises liability (landlord/HOA/hotel)',
      'Pool Safety Act barrier (115920)',
      'Attractive nuisance (children)',
      'Hotel / short-term-rental pools',
      'Defective drain/pump (product)',
      'Public-pool six-month deadline',
    ],
    sections: {
      whyItMatters: `Los Angeles has an enormous stock of apartment and condo common-area pools, hotel and rooftop pools, gym pools, and short-term-rental pools, and the first question in almost every case is who controlled the pool \u2014 the landlord, the homeowners association, the hotel, or the rental host. ${PREMISES} ${BARRIER} ${CHILD} A short-term-rental pool adds the host\u2019s and sometimes the platform\u2019s responsibility to provide required barriers and warn of hazards. ${PRODUCT} ${PUBLIC} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), though a minor\u2019s deadline can be tolled. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Who owned or controlled the pool \u2014 landlord, HOA, hotel, host, or public entity',
        'Whether a required barrier or fence was missing, broken, or propped open',
        'Whether the gate self-closed and self-latched',
        'For a hotel or gym, whether supervision or lifeguarding was provided',
        'For a short-term rental, the host listing and any warnings',
        'Any defective drain, cover, or pump',
        'Photographs of the pool, barrier, and scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies who controlled an LA pool \u2014 landlord, HOA, hotel, or rental host \u2014 builds the claim around the Swimming Pool Safety Act barrier requirements and the premises duty, pursues a product claim for a defective drain or pump, and flags when a public pool triggers the six-month deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A child got into an apartment pool that had no working fence. Who is responsible?',
        a: 'California\u2019s Swimming Pool Safety Act (Health and Safety Code section 115920 and following) requires drowning-prevention features such as approved fencing with self-closing, self-latching gates for many pools. A missing, broken, or propped-open barrier is frequently central to a child-drowning claim, and the landlord or owner who controlled the pool may be responsible.',
      },
      {
        q: 'The drowning happened at a hotel or short-term-rental pool. Who can be liable?',
        a: 'The hotel or the rental host who controlled the pool owes a duty to provide required barriers, maintain the pool, and warn of hazards, and a hotel that advertises a pool may owe supervision or safety measures. Whether a barrier was compliant, whether hazards were disclosed, and whether any lifeguarding was provided are central questions.',
      },
      {
        q: 'The injury involved a drain or pump. Can I claim against the maker?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective pool cover can carry strict product liability against the manufacturer and seller. The federal Virginia Graeme Baker Pool and Spa Safety Act addresses drain-entrapment hazards in particular, so preserving the component matters.',
      },
      {
        q: 'The pool is a public or community pool. Is the deadline different?',
        a: 'Yes. A claim involving a public entity brings the six-month Government Claims Act deadline into play, far shorter than the usual two years, and a formal claim must be filed before any lawsuit. Identifying a public owner early is time-critical.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the barrier and supervision questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_POOL_SLUG,
    category: 'Cities',
    cluster: 'San Diego Pool & Drowning Injury Claims',
    title: 'San Diego Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'A pool injury or drowning at a San Diego hotel, resort, apartment, or on-base pool? A claim can reach the owner, hotel, or landlord \u2014 and a pool on a military base can route the claim through the FTCA.',
    psychology: 'Someone in my family was hurt or drowned at a San Diego pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego pool drowning accident lawyer',
      'hotel resort pool drowning liability california',
      'apartment pool no fence child drowning california',
      'military base pool drowning claim ftca',
      'pool safety act barrier requirement california',
    ],
    signals: [
      'Premises liability (owner/hotel/landlord)',
      'Pool Safety Act barrier (115920)',
      'Hotel / resort pools',
      'Federal / on-base (FTCA)',
      'Defective drain/pump (product)',
      'Attractive nuisance (children)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s heavy tourism fills its hotel and resort pools, alongside the backyard and apartment pools common to a warm coastal region and the pools on its large military installations. ${PREMISES} ${BARRIER} A hotel or resort that advertises a pool owes duties to maintain it, provide required barriers, and, where it staffs the pool, supervise it. ${CHILD} The distinctive local wrinkle is federal: a drowning at a pool on a base or federal enclave can route the claim through the Federal Tort Claims Act, which requires an administrative claim on Standard Form 95 to the responsible agency, usually within two years, before any lawsuit. ${PRODUCT} ${PUBLIC} Pure comparative negligence applies, the state deadline is generally two years (Code of Civil Procedure section 335.1), though a minor\u2019s deadline can be tolled. Civil cases against private parties are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Who owned or controlled the pool \u2014 owner, hotel, landlord, or a federal entity',
        'Whether the pool was on a base or federal enclave (FTCA)',
        'Whether a required barrier or fence was missing, broken, or propped open',
        'For a hotel or resort, whether supervision or lifeguarding was provided',
        'Whether a child reached the water unsupervised',
        'Any defective drain, cover, or pump',
        'Photographs of the pool, barrier, and scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ checks first for a federal or on-base connection that can route a San Diego pool claim through the FTCA and its Standard Form 95 deadline, then builds the premises and barrier claim against a hotel, resort, or owner, and pursues a product claim for a defective drain or pump. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The drowning happened at a pool on a military base. Is that an ordinary claim?',
        a: 'Not necessarily. A drowning at a pool on a base or federal enclave can fall under the Federal Tort Claims Act, which requires an administrative claim on Standard Form 95 to the responsible agency, usually within two years, before any lawsuit. Because San Diego has so many federal installations, identifying that connection early is essential.',
      },
      {
        q: 'The drowning happened at a hotel or resort pool. Who can be liable?',
        a: 'The hotel or resort that controlled the pool owes a duty to maintain it, provide required barriers, and, where it staffs the pool, supervise it. Whether the barrier was compliant, whether hazards were addressed, and whether any advertised lifeguarding was provided are central questions.',
      },
      {
        q: 'A child got into a pool with no fence. Who is responsible?',
        a: 'California\u2019s Swimming Pool Safety Act requires drowning-prevention features such as approved fencing with self-closing, self-latching gates for many pools. A missing barrier is frequently central to a child-drowning claim, and the owner or operator who controlled the pool may be responsible, with the attractive-nuisance doctrine adding heightened responsibility toward children.',
      },
      {
        q: 'The injury involved a drain or pump. Can I claim against the maker?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective pool cover can carry strict product liability against the manufacturer and seller. The federal Virginia Graeme Baker Pool and Spa Safety Act addresses drain-entrapment hazards, so preserving the component matters.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the barrier, federal, and supervision questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_POOL_SLUG,
    category: 'Cities',
    cluster: 'San Jose Pool & Drowning Injury Claims',
    title: 'San Jose Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'A pool injury or drowning at a San Jose apartment, HOA, or city pool? A claim can reach an owner, a landlord or HOA, or a product maker \u2014 and a public pool brings a six-month deadline.',
    psychology: 'Someone in my family was hurt or drowned at a San Jose pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose pool drowning accident lawyer',
      'apartment pool no fence child drowning california',
      'hoa pool child drowning liability california',
      'community pool drowning claim california',
      'pool safety act barrier requirement california',
    ],
    signals: [
      'Premises liability (owner/landlord/HOA)',
      'Pool Safety Act barrier (115920)',
      'Attractive nuisance (children)',
      'HOA & community pools',
      'Public-pool six-month deadline',
      'Defective drain/pump (product)',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s dense apartment and condo stock, HOA-governed community pools, and city public pools make barrier and supervision failures a recurring cause of pool injuries and drownings. ${PREMISES} Where a homeowners association governs a community pool, its duty to maintain a safe pool and required barriers comes into play alongside any landlord or owner. ${BARRIER} ${CHILD} ${PRODUCT} ${PUBLIC} San Jose\u2019s city-run pools make the public-entity six-month deadline a live consideration. Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), though a minor\u2019s deadline can be tolled. Civil cases are filed in Santa Clara County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ builds a San Jose pool claim around the premises and barrier duties of the owner, landlord, or HOA, develops an HOA\u2019s maintenance and inspection records for a community pool, pursues a product claim for a defective drain or pump, and flags when a city pool triggers the six-month deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A child drowned at an HOA community pool. Can the association be responsible?',
        a: 'Yes, potentially. A homeowners association that governs a community pool owes a duty to maintain a safe pool and the required barriers under the Swimming Pool Safety Act. A missing or broken barrier, or a failure to fix a known hazard, can make the association responsible, and its maintenance and inspection records are important.',
      },
      {
        q: 'The pool is a city or community pool. Is the deadline different?',
        a: 'Yes. A claim involving a public entity \u2014 a city or community pool \u2014 brings the six-month Government Claims Act deadline into play, far shorter than the usual two years, and a formal claim must be filed before any lawsuit. Identifying a public owner early is time-critical.',
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
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the barrier and supervision questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_POOL_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Pool & Drowning Injury Claims',
    title: 'Long Beach Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'A pool injury or drowning at a Long Beach apartment, hotel, or city pool? A claim can reach an owner, a landlord or hotel, or a product maker \u2014 and a city-run public pool brings a six-month deadline.',
    psychology: 'Someone in my family was hurt or drowned at a Long Beach pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach pool drowning accident lawyer',
      'apartment pool no fence child drowning california',
      'hotel pool drowning liability california',
      'community pool drowning claim california',
      'pool safety act barrier requirement california',
    ],
    signals: [
      'Premises liability (owner/landlord/hotel)',
      'Pool Safety Act barrier (115920)',
      'Attractive nuisance (children)',
      'Hotel / convention pools',
      'Public-pool six-month deadline',
      'Defective drain/pump (product)',
    ],
    sections: {
      whyItMatters: `Long Beach combines a dense apartment stock with hotel pools serving its convention and tourism trade and city-run public pools, all of which produce pool-injury and drowning claims. ${PREMISES} ${BARRIER} A hotel that advertises a pool owes duties to maintain it, provide required barriers, and, where it staffs the pool, supervise it. ${CHILD} ${PRODUCT} ${PUBLIC} Long Beach\u2019s city-run public pools make the public-entity six-month deadline a live consideration. Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), though a minor\u2019s deadline can be tolled. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Who owned or controlled the pool \u2014 owner, landlord, hotel, or public entity',
        'Whether a required barrier or fence was missing, broken, or propped open',
        'Whether the gate self-closed and self-latched',
        'For a hotel, whether supervision or lifeguarding was provided',
        'Whether a child reached the water unsupervised',
        'Any defective drain, cover, or pump',
        'Photographs of the pool, barrier, and scene',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Long Beach pool claim around the Swimming Pool Safety Act barrier requirements and the premises duty of the owner, landlord, or hotel, pursues a product claim for a defective drain or pump, and flags when a city-run pool triggers the six-month deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A child got into an apartment pool that had no working fence. Who is responsible?',
        a: 'California\u2019s Swimming Pool Safety Act (Health and Safety Code section 115920 and following) requires drowning-prevention features such as approved fencing with self-closing, self-latching gates for many pools. A missing, broken, or propped-open barrier is frequently central to a child-drowning claim, and the landlord or owner who controlled the pool may be responsible.',
      },
      {
        q: 'The drowning happened at a hotel pool. Who can be liable?',
        a: 'The hotel that controlled the pool owes a duty to maintain it, provide required barriers, and, where it staffs the pool, supervise it. Whether the barrier was compliant, whether hazards were addressed, and whether any advertised lifeguarding was provided are central questions.',
      },
      {
        q: 'The pool is a city or community pool. Is the deadline different?',
        a: 'Yes. A claim involving a public entity brings the six-month Government Claims Act deadline into play, far shorter than the usual two years, and a formal claim must be filed before any lawsuit. Identifying a public owner early is time-critical.',
      },
      {
        q: 'The injury involved a drain or pump. Can I claim against the maker?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective pool cover can carry strict product liability against the manufacturer and seller. The federal Virginia Graeme Baker Pool and Spa Safety Act addresses drain-entrapment hazards, so preserving the component matters.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the barrier and supervision questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const poolDrowningCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [LA_POOL_SLUG]: {
    scenario: `A child reached an LA apartment pool through a gate that no longer self-latched and drowned. The Swimming Pool Safety Act barrier requirements and the complex\u2019s maintenance failures established the premises claim, and the gate hardware was preserved. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the barrier and gate; identify who controlled the pool.'],
      ['First days', 'Landlord, HOA, hotel, host, or public entity identified.'],
      ['First weeks', 'Barrier compliance and any prior complaints developed.'],
      ['Longer term', 'Treatment and the full loss documented.'],
    ],
    severityLadder: [
      ['Barrier failure', 'A missing or broken barrier lets a child reach the water.'],
      ['Control question', 'Landlord, hotel, or host who controlled the pool.'],
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
      'Who controlled the pool \u2014 landlord, HOA, hotel, or host',
      'Whether the required barrier was present and working',
      'Whether the gate self-closed and self-latched',
      'Whether a defective drain or pump adds a product claim',
      'Whether a public entity and its six-month deadline apply',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Barriers anchor fault', copy: 'The Pool Safety Act sets the standard.' },
      { label: 'Find who controlled it', copy: 'Landlord, hotel, or host owes the duty.' },
      { label: 'Attractive nuisance', copy: 'Children are owed heightened care near pools.' },
      { label: 'Products add coverage', copy: 'A defective drain opens strict liability.' },
    ],
    insuranceProblems: [
      'The family is blamed without examining the barrier.',
      'The gate hardware is repaired before it is preserved.',
      'The party that controlled the pool is misidentified.',
      'A product claim for the drain or pump is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Who owned or controlled the pool?' },
      { label: 'Step 2', question: 'Was the barrier present, and did the gate self-latch?' },
      { label: 'Step 3', question: 'Was it an apartment, hotel, rental, or public pool?' },
      { label: 'Step 4', question: 'Did a drain, cover, or pump play a role?' },
    ],
  },
  [SD_POOL_SLUG]: {
    scenario: `A drowning occurred at a pool tied to a San Diego base, and an ordinary claim stalled. Recognising a federal connection, a Standard Form 95 was presented to the agency in time while barrier and maintenance facts were preserved. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the pool was on a base; photograph the barrier.'],
      ['First days', 'Federal vs. private control identified.'],
      ['Within two years', 'Standard Form 95 presented if a federal connection exists.'],
      ['Longer term', 'Treatment and the full loss documented.'],
    ],
    severityLadder: [
      ['Federal path', 'An on-base pool routes through the FTCA.'],
      ['Barrier failure', 'A missing barrier lets a child reach the water.'],
      ['Hotel / resort', 'A staffed pool owes supervision duties.'],
      ['Product path', 'A defective drain or pump adds a defendant.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the pool incident.' },
      { label: 'Critical care', copy: 'Near-drowning care documents severity.' },
      { label: 'Continuing care', copy: 'Neurological follow-up shows lasting harm.' },
      { label: 'Documentation', copy: 'Bills, future care, and loss define economics.' },
    ],
    settlementDrivers: [
      'Whether the pool was on a base or federal enclave (FTCA)',
      'Whether the required barrier was present and working',
      'Whether a hotel or resort provided supervision',
      'Whether a defective drain or pump adds a product claim',
      'Which deadline applies to each defendant',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Federal is different', copy: 'The FTCA and Form 95 govern an on-base claim.' },
      { label: 'Barriers anchor fault', copy: 'The Pool Safety Act sets the standard.' },
      { label: 'Hotels owe duties', copy: 'A staffed pool must be supervised.' },
      { label: 'Products add coverage', copy: 'A defective drain opens strict liability.' },
    ],
    insuranceProblems: [
      'A federal-connected claim is filed as ordinary and stalls.',
      'The Standard Form 95 deadline is missed.',
      'The family is blamed without examining the barrier.',
      'A product claim for the drain or pump is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the pool on a base or federal enclave?' },
      { label: 'Step 2', question: 'Who owned or controlled the pool?' },
      { label: 'Step 3', question: 'Was the barrier present and compliant?' },
      { label: 'Step 4', question: 'Did a drain, cover, or pump play a role?' },
    ],
  },
  [SJ_POOL_SLUG]: {
    scenario: `A child drowned at a San Jose HOA-governed community pool where the fence gate had a broken latch. The association\u2019s maintenance records and the barrier requirements established the claim against the HOA. ${NOT_ADVICE}`,
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
      ['Public-pool path', 'A city pool triggers the six-month rule.'],
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
      'A public-pool six-month deadline is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the pool governed by an HOA or association?' },
      { label: 'Step 2', question: 'Was the barrier present, and did the gate self-latch?' },
      { label: 'Step 3', question: 'Are the HOA maintenance records available?' },
      { label: 'Step 4', question: 'Was the pool public or community-run?' },
    ],
  },
  [LB_POOL_SLUG]: {
    scenario: `A child reached a Long Beach hotel pool that was left unsupervised behind a gate that no longer latched. The hotel\u2019s barrier and maintenance failures established the premises claim, and the gate hardware was preserved. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the barrier and gate; identify who controlled the pool.'],
      ['First days', 'The hotel, landlord, or public entity identified.'],
      ['First weeks', 'Barrier compliance and supervision practices developed.'],
      ['Longer term', 'Treatment and the full loss documented.'],
    ],
    severityLadder: [
      ['Barrier failure', 'A gate that will not latch lets a child reach the water.'],
      ['Supervision', 'An advertised or staffed pool owes oversight.'],
      ['Product path', 'A defective drain or pump adds a defendant.'],
      ['Public-pool path', 'A city pool triggers the six-month rule.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the pool incident.' },
      { label: 'Critical care', copy: 'Near-drowning care documents severity.' },
      { label: 'Continuing care', copy: 'Neurological follow-up shows lasting harm.' },
      { label: 'Documentation', copy: 'Bills, future care, and loss define economics.' },
    ],
    settlementDrivers: [
      'Who controlled the pool \u2014 hotel, landlord, or public entity',
      'Whether the required barrier was present and working',
      'Whether supervision or lifeguarding was provided',
      'Whether a defective drain or pump adds a product claim',
      'Whether a public entity and its six-month deadline apply',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Barriers anchor fault', copy: 'The Pool Safety Act sets the standard.' },
      { label: 'Hotels owe duties', copy: 'A staffed or advertised pool must be supervised.' },
      { label: 'Attractive nuisance', copy: 'Children are owed heightened care near pools.' },
      { label: 'Products add coverage', copy: 'A defective drain opens strict liability.' },
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
      { label: 'Step 3', question: 'Was the pool staffed or advertised as supervised?' },
      { label: 'Step 4', question: 'Was the pool public or community-run?' },
    ],
  },
}
