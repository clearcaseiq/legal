import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, swimming-pool and drowning injury practice area (batch 3):
 * location-specific guides for San Francisco, Oakland, San Bernardino, and
 * Anaheim, extending the batch-1 hot-inland hub (Sacramento, Fresno, Bakersfield,
 * Riverside) and batch-2 (LA, San Diego, San Jose, Long Beach).
 *
 * Local context, genuine rather than interpolated:
 *  - San Francisco: dense apartment and condo common-area pools, hotel and rooftop
 *    pools, and Rec & Park public pools, where who controlled the pool is central.
 *  - Oakland: apartment and HOA pools, hotel pools, and city-run public pools that
 *    raise the six-month Government Claims Act deadline.
 *  - San Bernardino: a hot inland climate with heavy apartment, HOA, and motel pool
 *    use plus city public pools, where barrier and supervision failures recur.
 *  - Anaheim: a resort corridor dense with hotel and waterpark-adjacent pools,
 *    apartment pools, and city public pools serving a large tourist population.
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

export const SF_POOL_SLUG = '/san-francisco-pool-drowning-injury'
export const OAK_POOL_SLUG = '/oakland-pool-drowning-injury'
export const SB_POOL_SLUG = '/san-bernardino-pool-drowning-injury'
export const ANAHEIM_POOL_SLUG = '/anaheim-pool-drowning-injury'

export const poolDrowningCityGuidePages3: LandingPage[] = [
  {
    slug: SF_POOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Pool & Drowning Injury Claims',
    title: 'San Francisco Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Drowning or pool injury at a San Francisco apartment, hotel, or public pool? The first question is who controlled the pool \u2014 landlord, HOA, hotel, or a public entity.',
    psychology: 'Someone was hurt or drowned at a San Francisco pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco drowning accident lawyer',
      'apartment pool injury claim california',
      'hotel pool drowning lawsuit california',
      'pool barrier failure claim california',
      'public pool injury claim california',
    ],
    signals: [
      'Premises duty of the pool controller',
      'Barrier / fencing failures',
      'Attractive nuisance (children)',
      'Defective drain / pump product',
      'Public pool six-month deadline',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s pools are overwhelmingly shared \u2014 apartment and condo common-area pools, hotel and rooftop pools, and Rec & Park public pools \u2014 so the threshold question is who controlled the pool where the injury happened. ${PREMISES} ${BARRIER} ${CHILD} ${PRODUCT} ${PUBLIC} Civil cases are filed in San Francisco County Superior Court, generally within two years, or six months where a public entity owns the pool.`,
      whatToTrack: [
        'Who owned or controlled the pool (landlord, HOA, hotel, public entity)',
        'Whether required barriers, fencing, and gates were present and working',
        'Whether a child reached the water and how',
        'Whether lifeguards or supervision were required and present',
        'Whether a drain, cover, or pump may have been defective',
        'Whether a public entity owns the pool (six-month rule)',
        'Photographs of the pool and barrier conditions',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies who controlled a San Francisco pool, checks the barrier and supervision requirements, flags any public-entity six-month deadline, and preserves the physical evidence before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A child got into an apartment pool through a broken gate. Who is responsible?',
        a: 'Potentially the landlord or HOA that controlled the common-area pool. California\u2019s Swimming Pool Safety Act requires enclosing barriers with self-closing, self-latching gates, and a missing, broken, or propped-open barrier is frequently central to a child-drowning claim because it is what allowed access.',
      },
      {
        q: 'The pool was a city Rec & Park pool. Does the deadline change?',
        a: 'Yes. A public pool brings the Government Claims Act into play, which requires a formal written claim within six months of the injury \u2014 far shorter than the usual two years \u2014 so identifying a public owner early is time-critical.',
      },
      {
        q: 'Could a defective drain or pump be to blame?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective cover can carry strict product liability against the manufacturer and seller, and the federal Virginia Graeme Baker Act addresses drain-entrapment hazards in particular.',
      },
      {
        q: 'My child was hurt at a pool they were not invited to use. Is there still a claim?',
        a: 'Possibly. The attractive-nuisance doctrine can impose heightened responsibility because a pool draws children who cannot appreciate the danger, so an owner who leaves it accessible may be responsible even for an uninvited child.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises who controlled the pool and the safety evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_POOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Pool & Drowning Injury Claims',
    title: 'Oakland Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Drowning or pool injury at an Oakland apartment, HOA, or city pool? The first question is who controlled the pool \u2014 and a city pool brings a six-month deadline.',
    psychology: 'Someone was hurt or drowned at an Oakland pool and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland drowning accident lawyer',
      'apartment pool injury claim california',
      'city pool drowning claim california',
      'pool barrier failure claim california',
      'hoa pool injury lawsuit california',
    ],
    signals: [
      'Premises duty of the pool controller',
      'Barrier / fencing failures',
      'City pool six-month deadline',
      'Attractive nuisance (children)',
      'Defective drain / pump product',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s pools are largely shared \u2014 apartment and HOA pools, hotel pools, and city-run public pools \u2014 so who controlled the pool decides the claim, and a public pool shortens the deadline dramatically. ${PREMISES} ${BARRIER} ${PUBLIC} ${CHILD} ${PRODUCT} Civil cases are filed in Alameda County Superior Court, generally within two years, or six months where a public entity owns the pool.`,
      whatToTrack: [
        'Who owned or controlled the pool (landlord, HOA, hotel, public entity)',
        'Whether a city or public entity owns the pool (six-month rule)',
        'Whether required barriers, fencing, and gates were present and working',
        'Whether a child reached the water and how',
        'Whether lifeguards or supervision were required and present',
        'Whether a drain, cover, or pump may have been defective',
        'Photographs of the pool and barrier conditions',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies who controlled an Oakland pool, flags any city-pool six-month deadline, checks the barrier and supervision requirements, and preserves the physical evidence before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The drowning happened at a city public pool. Does the deadline change?',
        a: 'Yes. A public pool brings the Government Claims Act into play, which requires a formal written claim within six months of the injury \u2014 far shorter than the usual two years \u2014 so identifying a public owner early is time-critical.',
      },
      {
        q: 'A child got into an apartment or HOA pool. Who is responsible?',
        a: 'Potentially the landlord or HOA that controlled the common-area pool. California\u2019s Swimming Pool Safety Act requires enclosing barriers with self-closing, self-latching gates, and a missing, broken, or propped-open barrier is frequently central to a child-drowning claim.',
      },
      {
        q: 'Could a defective drain or pump be to blame?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective cover can carry strict product liability against the manufacturer and seller, and the federal Virginia Graeme Baker Act addresses drain-entrapment hazards in particular.',
      },
      {
        q: 'What evidence should be preserved?',
        a: 'Photographs of the pool, barriers, gates, and signage before anything is repaired, plus records of who controlled and maintained the pool. Physical conditions change quickly after an incident, so early preservation matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises who controlled the pool and the safety evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_POOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Pool & Drowning Injury Claims',
    title: 'San Bernardino Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Drowning or pool injury at a San Bernardino apartment, motel, or public pool? In a hot inland climate, barrier and supervision failures are frequently central.',
    psychology: 'Someone was hurt or drowned at a San Bernardino pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino drowning accident lawyer',
      'apartment pool injury claim california',
      'motel pool drowning lawsuit california',
      'pool barrier failure claim california',
      'public pool injury claim california',
    ],
    signals: [
      'Premises duty of the pool controller',
      'Barrier / fencing failures',
      'Attractive nuisance (children)',
      'Defective drain / pump product',
      'Public pool six-month deadline',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Bernardino\u2019s hot inland climate means heavy pool use at apartments, HOAs, motels, and city pools \u2014 and the threshold question after a drowning or injury is who controlled the pool and whether required safety features were in place. ${PREMISES} ${BARRIER} ${CHILD} ${PRODUCT} ${PUBLIC} Civil cases are filed in San Bernardino County Superior Court, generally within two years, or six months where a public entity owns the pool.`,
      whatToTrack: [
        'Who owned or controlled the pool (landlord, HOA, motel, public entity)',
        'Whether required barriers, fencing, and gates were present and working',
        'Whether a child reached the water and how',
        'Whether lifeguards or supervision were required and present',
        'Whether a drain, cover, or pump may have been defective',
        'Whether a public entity owns the pool (six-month rule)',
        'Photographs of the pool and barrier conditions',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies who controlled a San Bernardino pool, checks the barrier and supervision requirements, flags any public-entity six-month deadline, and preserves the physical evidence before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A child got into an apartment or motel pool through a broken gate. Who is responsible?',
        a: 'Potentially the landlord, HOA, or motel that controlled the pool. California\u2019s Swimming Pool Safety Act requires enclosing barriers with self-closing, self-latching gates, and a missing, broken, or propped-open barrier is frequently central to a child-drowning claim because it is what allowed access.',
      },
      {
        q: 'The pool was a city public pool. Does the deadline change?',
        a: 'Yes. A public pool brings the Government Claims Act into play, which requires a formal written claim within six months of the injury \u2014 far shorter than the usual two years \u2014 so identifying a public owner early is time-critical.',
      },
      {
        q: 'Could a defective drain or pump be to blame?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective cover can carry strict product liability against the manufacturer and seller, and the federal Virginia Graeme Baker Act addresses drain-entrapment hazards in particular.',
      },
      {
        q: 'My child was hurt at a pool they were not invited to use. Is there still a claim?',
        a: 'Possibly. The attractive-nuisance doctrine can impose heightened responsibility because a pool draws children who cannot appreciate the danger, so an owner who leaves it accessible may be responsible even for an uninvited child.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises who controlled the pool and the safety evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_POOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Pool & Drowning Injury Claims',
    title: 'Anaheim Pool & Drowning Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Drowning or pool injury at an Anaheim hotel, resort, or apartment pool? The first question is who controlled the pool \u2014 hotel, HOA, landlord, or a public entity.',
    psychology: 'Someone was hurt or drowned at an Anaheim hotel or apartment pool and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim drowning accident lawyer',
      'hotel pool drowning lawsuit california',
      'resort pool injury claim california',
      'apartment pool injury claim california',
      'pool barrier failure claim california',
    ],
    signals: [
      'Premises duty of the pool controller',
      'Hotel / resort pool operators',
      'Barrier / fencing failures',
      'Attractive nuisance (children)',
      'Defective drain / pump product',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s resort corridor is dense with hotel and resort pools serving a large tourist population, alongside apartment and city pools \u2014 and the threshold question after a drowning or injury is who controlled the pool and whether required safety features and supervision were in place. ${PREMISES} ${BARRIER} ${PRODUCT} ${CHILD} ${PUBLIC} Civil cases are filed in Orange County Superior Court, generally within two years, or six months where a public entity owns the pool.`,
      whatToTrack: [
        'Who owned or operated the pool (hotel, resort, HOA, landlord, public entity)',
        'Whether required barriers, fencing, and gates were present and working',
        'Whether lifeguards or supervision were required and present',
        'Whether a child reached the water and how',
        'Whether a drain, cover, or pump may have been defective',
        'Whether a public entity owns the pool (six-month rule)',
        'Photographs of the pool and barrier conditions',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies who operated an Anaheim hotel or resort pool, checks the barrier and supervision requirements, flags any public-entity six-month deadline, and preserves the physical evidence before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The drowning happened at a hotel or resort pool. Who is responsible?',
        a: 'Potentially the hotel or resort that operated the pool. An operator owes guests reasonable care, which can include required barriers, adequate supervision or lifeguarding where called for, and maintenance. Whether those measures were in place is central.',
      },
      {
        q: 'A child got into a pool through a broken gate. Who is responsible?',
        a: 'Potentially the owner or operator that controlled the pool. California\u2019s Swimming Pool Safety Act requires enclosing barriers with self-closing, self-latching gates, and a missing, broken, or propped-open barrier is frequently central to a child-drowning claim because it is what allowed access.',
      },
      {
        q: 'Could a defective drain or pump be to blame?',
        a: 'Possibly. A defective or missing anti-entrapment drain cover, a faulty pump, or a defective cover can carry strict product liability against the manufacturer and seller, and the federal Virginia Graeme Baker Act addresses drain-entrapment hazards in particular.',
      },
      {
        q: 'The pool was a city public pool. Does the deadline change?',
        a: 'Yes. A public pool brings the Government Claims Act into play, which requires a formal written claim within six months of the injury \u2014 far shorter than the usual two years \u2014 so identifying a public owner early is time-critical.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises who controlled the pool and the safety evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const poolDrowningCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [SF_POOL_SLUG]: {
    scenario: `A child reached a San Francisco apartment common-area pool through a gate that no longer self-latched, despite prior complaints. The landlord\u2019s barrier failure under the Swimming Pool Safety Act anchored the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify who controlled the pool; photograph the barriers.'],
      ['First weeks', 'Gather maintenance and complaint records.'],
      ['Assessment', 'Barrier, supervision, and product issues reviewed.'],
      ['Longer term', 'Liability and damages developed.'],
    ],
    severityLadder: [
      ['Who controlled it', 'Landlord, HOA, hotel, or public entity.'],
      ['Barrier failure', 'A gate or fence defect enabled access.'],
      ['Supervision', 'Was any required supervision present?'],
      ['Causation', 'The failure allowed the drowning.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The near-drowning or injury is documented.' },
      { label: 'Hospital care', copy: 'Any hypoxic injury is assessed.' },
      { label: 'Follow-up', copy: 'Neurological effects are documented.' },
      { label: 'Long-term', copy: 'Lasting harm is quantified.' },
    ],
    settlementDrivers: [
      'Who controlled the pool',
      'Whether required barriers were present and working',
      'Whether supervision was required and provided',
      'Whether a product defect contributed',
      'Whether a public entity shortens the deadline',
      'The severity of the injury',
    ],
    settlementValueDetails: [
      { label: 'Barrier is key', copy: 'The Safety Act sets the requirement.' },
      { label: 'Find the controller', copy: 'Landlord, HOA, hotel, or public.' },
      { label: 'Preserve conditions', copy: 'Photos before repairs are decisive.' },
      { label: 'Product may apply', copy: 'A defective drain adds a defendant.' },
    ],
    insuranceProblems: [
      'The pool controller is never clearly identified.',
      'Barrier conditions are repaired before documentation.',
      'A public-pool six-month deadline is missed.',
      'A product defect is never investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Who owned or controlled the pool?' },
      { label: 'Step 2', question: 'Were the barriers and gates working?' },
      { label: 'Step 3', question: 'Was supervision required and present?' },
      { label: 'Step 4', question: 'Is a public entity involved?' },
    ],
  },
  [OAK_POOL_SLUG]: {
    scenario: `A drowning occurred at an Oakland city public pool where staffing had lapsed. Recognising the public owner meant a six-month government claim governed, and it was presented in time to keep the claim alive. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Confirm the public owner; photograph the pool.'],
      ['Six-month mark', 'Present the government claim if a public entity is involved.'],
      ['Assessment', 'Supervision and barrier issues reviewed.'],
      ['Longer term', 'Liability and damages developed.'],
    ],
    severityLadder: [
      ['Public entity?', 'It triggers a six-month deadline.'],
      ['Supervision', 'Was required lifeguarding present?'],
      ['Barrier failure', 'A gate or fence defect can contribute.'],
      ['Causation', 'The failure allowed the drowning.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The near-drowning or injury is documented.' },
      { label: 'Hospital care', copy: 'Any hypoxic injury is assessed.' },
      { label: 'Follow-up', copy: 'Neurological effects are documented.' },
      { label: 'Long-term', copy: 'Lasting harm is quantified.' },
    ],
    settlementDrivers: [
      'Whether a public entity shortens the deadline',
      'Whether required supervision was present',
      'Whether barriers were present and working',
      'Whether a product defect contributed',
      'Who controlled the pool',
      'The severity of the injury',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'A public pool means six months.' },
      { label: 'Supervision matters', copy: 'Staffed pools owe adequate lifeguarding.' },
      { label: 'Preserve conditions', copy: 'Photos before repairs are decisive.' },
      { label: 'Find the controller', copy: 'Landlord, HOA, or public.' },
    ],
    insuranceProblems: [
      'A public-pool six-month deadline is missed.',
      'Staffing and supervision records are never obtained.',
      'Barrier conditions are repaired before documentation.',
      'A product defect is never investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a city or public pool?' },
      { label: 'Step 2', question: 'When did the incident occur (six-month clock)?' },
      { label: 'Step 3', question: 'Was lifeguarding required and present?' },
      { label: 'Step 4', question: 'Were the barriers and gates working?' },
    ],
  },
  [SB_POOL_SLUG]: {
    scenario: `A child drowned at a San Bernardino motel pool with a broken gate latch during a hot-weekend surge in use. The motel\u2019s barrier failure under the Swimming Pool Safety Act anchored the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify who controlled the pool; photograph the barriers.'],
      ['First weeks', 'Gather maintenance and complaint records.'],
      ['Assessment', 'Barrier, supervision, and product issues reviewed.'],
      ['Longer term', 'Liability and damages developed.'],
    ],
    severityLadder: [
      ['Who controlled it', 'Motel, landlord, HOA, or public entity.'],
      ['Barrier failure', 'A gate or fence defect enabled access.'],
      ['Supervision', 'Was any required supervision present?'],
      ['Causation', 'The failure allowed the drowning.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The near-drowning or injury is documented.' },
      { label: 'Hospital care', copy: 'Any hypoxic injury is assessed.' },
      { label: 'Follow-up', copy: 'Neurological effects are documented.' },
      { label: 'Long-term', copy: 'Lasting harm is quantified.' },
    ],
    settlementDrivers: [
      'Who controlled the pool',
      'Whether required barriers were present and working',
      'Whether supervision was required and provided',
      'Whether a product defect contributed',
      'Whether a public entity shortens the deadline',
      'The severity of the injury',
    ],
    settlementValueDetails: [
      { label: 'Barrier is key', copy: 'The Safety Act sets the requirement.' },
      { label: 'Find the controller', copy: 'Motel, landlord, HOA, or public.' },
      { label: 'Preserve conditions', copy: 'Photos before repairs are decisive.' },
      { label: 'Product may apply', copy: 'A defective drain adds a defendant.' },
    ],
    insuranceProblems: [
      'The pool controller is never clearly identified.',
      'Barrier conditions are repaired before documentation.',
      'A public-pool six-month deadline is missed.',
      'A product defect is never investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Who owned or controlled the pool?' },
      { label: 'Step 2', question: 'Were the barriers and gates working?' },
      { label: 'Step 3', question: 'Was supervision required and present?' },
      { label: 'Step 4', question: 'Is a public entity involved?' },
    ],
  },
  [ANAHEIM_POOL_SLUG]: {
    scenario: `A guest\u2019s child was pulled from an Anaheim hotel pool that had no lifeguard and an unlatched gate. The hotel operator\u2019s supervision and barrier failures anchored the premises claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the pool operator; photograph the barriers.'],
      ['First weeks', 'Gather maintenance, staffing, and complaint records.'],
      ['Assessment', 'Barrier, supervision, and product issues reviewed.'],
      ['Longer term', 'Liability and damages developed.'],
    ],
    severityLadder: [
      ['Who operated it', 'Hotel, resort, HOA, landlord, or public.'],
      ['Supervision', 'Was any required supervision present?'],
      ['Barrier failure', 'A gate or fence defect enabled access.'],
      ['Causation', 'The failure allowed the drowning.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The near-drowning or injury is documented.' },
      { label: 'Hospital care', copy: 'Any hypoxic injury is assessed.' },
      { label: 'Follow-up', copy: 'Neurological effects are documented.' },
      { label: 'Long-term', copy: 'Lasting harm is quantified.' },
    ],
    settlementDrivers: [
      'Who operated the pool',
      'Whether supervision was required and provided',
      'Whether required barriers were present and working',
      'Whether a product defect contributed',
      'Whether a public entity shortens the deadline',
      'The severity of the injury',
    ],
    settlementValueDetails: [
      { label: 'Operator duty', copy: 'Hotels owe guests reasonable care.' },
      { label: 'Barrier is key', copy: 'The Safety Act sets the requirement.' },
      { label: 'Preserve conditions', copy: 'Photos before repairs are decisive.' },
      { label: 'Product may apply', copy: 'A defective drain adds a defendant.' },
    ],
    insuranceProblems: [
      'The pool operator is never clearly identified.',
      'Staffing and barrier records are never obtained.',
      'Conditions are repaired before documentation.',
      'A product defect is never investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Who operated the pool (hotel, resort, HOA)?' },
      { label: 'Step 2', question: 'Was supervision required and present?' },
      { label: 'Step 3', question: 'Were the barriers and gates working?' },
      { label: 'Step 4', question: 'Is a public entity involved?' },
    ],
  },
}
