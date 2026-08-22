import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, construction-accident (third-party) practice area (batch 3):
 * city-specific guides for Riverside, San Bernardino, Bakersfield, and Anaheim,
 * extending the batch-1 (LA, SF, San Jose, San Diego) and batch-2 (Sacramento,
 * Fresno, Oakland, Long Beach) hub.
 *
 * Scoped carefully to THIRD-PARTY liability (against non-employers) rather than
 * workers' compensation against the employer, which is a different system.
 *
 * Local context, genuine rather than interpolated:
 *  - Riverside: warehouse and distribution builds, I-215/91 roadwork (Caltrans, a
 *    public entity), and fast residential growth, with equipment on busy roads.
 *  - San Bernardino: the Inland Empire logistics construction boom, I-15 and Cajon
 *    Pass roadwork, and rail projects, with public-entity owners on road jobs.
 *  - Bakersfield: energy and oilfield construction, Highway 99/58 roadwork, and
 *    agricultural and solar builds in extreme summer heat (heat-illness orders).
 *  - Anaheim: hotel, stadium, and resort-corridor construction and I-5 widening
 *    (Caltrans, a public entity), with dense urban and tourist-area builds.
 *
 * Applied accurately (workers' comp is generally the exclusive remedy against the
 * worker's own employer under Labor Code 3600; a separate third-party claim can
 * lie against a non-employer -- another sub, the GC, the site/owner, an equipment
 * manufacturer, or a negligent driver; Privette with the Hooker retained-control
 * and Kinsman concealed-hazard exceptions; the comp carrier's lien; Cal/OSHA
 * safety orders set the standard of care; pure comparative negligence; two-year
 * deadline CCP 335.1; six-month Government Claims Act deadline for a public
 * entity; FTCA where the United States is responsible).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a third-party claim exists, how the Privette doctrine and its exceptions apply, and how a comp lien is handled depend on facts a licensed California attorney should review promptly.'

const THIRD_PARTY =
  'Workers\u2019 compensation is generally the only claim an injured worker has against their own employer, no matter who was at fault. But it is not the only claim available: where a different party \u2014 another subcontractor, the general contractor, the site or property owner, the maker of defective equipment, or a negligent driver \u2014 caused the injury, a separate third-party lawsuit can be brought against that party. A third-party claim can pursue full damages, including pain and suffering that workers\u2019 compensation does not pay, so identifying every non-employer at fault is the heart of a construction case.'

const PRIVETTE =
  'A recurring hurdle is the Privette doctrine: a party that hires an independent contractor generally is not liable to that contractor\u2019s employees. But there are important exceptions \u2014 most notably when the hirer retained control over the work and its exercise of that control affirmatively contributed to the injury (the Hooker exception), or when the hirer knew of a concealed hazard the contractor did not (the Kinsman exception). Which side of these lines a case falls on is often the whole dispute, so the facts about who controlled the site and the hazard matter enormously.'

const LIEN =
  'When a third-party recovery is obtained, the workers\u2019 compensation insurer usually holds a lien to be reimbursed for the benefits it paid. That lien has to be planned for and negotiated so the injured worker keeps a fair share of the recovery, which is why coordinating the comp claim and the third-party claim from the start matters.'

const OSHA =
  'Cal/OSHA safety orders set detailed requirements for fall protection, scaffolding, trenching, cranes, and more, and a violation can help establish that a responsible party fell below the standard of care. The Cal/OSHA investigation and any citations become important evidence in the third-party claim.'

export const RIV_CONSTRUCTION_SLUG = '/riverside-construction-accident'
export const SB_CONSTRUCTION_SLUG = '/san-bernardino-construction-accident'
export const BAKERSFIELD_CONSTRUCTION_SLUG = '/bakersfield-construction-accident'
export const ANAHEIM_CONSTRUCTION_SLUG = '/anaheim-construction-accident'

export const constructionCityGuidePages3: LandingPage[] = [
  {
    slug: RIV_CONSTRUCTION_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Construction Accident Claims',
    title: 'Riverside Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Riverside jobsite, warehouse build, or roadwork project? Beyond workers\u2019 comp, a third-party claim against a non-employer can pursue full damages.',
    psychology: 'I was hurt on a Riverside construction site and I do not know if I have anything beyond workers\u2019 comp.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside construction accident lawyer',
      'third party construction injury claim california',
      'warehouse construction fall claim california',
      'roadwork accident caltrans claim california',
      'privette exception california',
    ],
    signals: [
      'Third-party claim beyond comp',
      'Warehouse / distribution builds',
      'Roadwork (Caltrans public)',
      'Privette / Hooker / Kinsman',
      'Cal/OSHA standard of care',
      'Comp-lien coordination',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s warehouse and distribution construction boom, its I-215 and 91 roadwork, and its fast residential growth put many workers on busy, complex sites \u2014 and the key question after an injury is often who other than the employer was at fault. ${THIRD_PARTY} ${PRIVETTE} ${OSHA} ${LIEN} Civil cases are filed in Riverside County Superior Court, generally within two years, or six months where a public entity (such as Caltrans on a road job) is involved.`,
      whatToTrack: [
        'Every company and party on the jobsite, not just the employer',
        'Who controlled the site and the specific hazard (Privette exceptions)',
        'For roadwork, whether Caltrans or a public entity was the owner',
        'The equipment involved and its manufacturer',
        'Any Cal/OSHA investigation and citations',
        'Whether a negligent driver struck a roadwork zone',
        'The workers\u2019 compensation claim and its lien',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every non-employer party on a Riverside jobsite, tests the Privette exceptions, flags any public-entity (Caltrans) deadline on roadwork, and coordinates the third-party claim with the workers\u2019-comp lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have workers\u2019 comp. Can I also sue?',
        a: 'Possibly. Workers\u2019 compensation is generally the only claim against your own employer, but where a different party \u2014 another subcontractor, the general contractor, the site owner, an equipment maker, or a negligent driver \u2014 caused the injury, a separate third-party lawsuit can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'What is the Privette doctrine?',
        a: 'It is the rule that a party hiring an independent contractor generally is not liable to that contractor\u2019s employees. But exceptions exist \u2014 the Hooker exception where the hirer retained control and its exercise contributed to the injury, and the Kinsman exception for a concealed hazard the hirer knew of. Which side of these lines a case falls on is often the whole dispute.',
      },
      {
        q: 'The injury happened on Caltrans roadwork. Does the deadline change?',
        a: 'It can. Where a public entity such as Caltrans is a responsible owner, a written government claim generally must be presented within six months \u2014 far shorter than the usual two years \u2014 so identifying public-entity involvement immediately is essential.',
      },
      {
        q: 'Will a third-party recovery affect my comp benefits?',
        a: 'The comp insurer usually holds a lien to be reimbursed from a third-party recovery. That lien must be planned for and negotiated so you keep a fair share, which is why coordinating both claims from the start matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the parties, the Privette facts, and the lien so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_CONSTRUCTION_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Construction Accident Claims',
    title: 'San Bernardino Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a San Bernardino logistics build, roadwork project, or rail job? Beyond workers\u2019 comp, a third-party claim against a non-employer can pursue full damages.',
    psychology: 'I was hurt on a San Bernardino construction site and I do not know if I have anything beyond workers\u2019 comp.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino construction accident lawyer',
      'third party construction injury claim california',
      'warehouse construction fall claim california',
      'roadwork accident caltrans claim california',
      'privette exception california',
    ],
    signals: [
      'Third-party claim beyond comp',
      'Logistics construction boom',
      'Roadwork (Caltrans public)',
      'Privette / Hooker / Kinsman',
      'Cal/OSHA standard of care',
      'Comp-lien coordination',
    ],
    sections: {
      whyItMatters: `San Bernardino sits at the centre of the Inland Empire\u2019s logistics construction boom, with heavy warehouse builds, I-15 and Cajon Pass roadwork, and rail projects \u2014 large, multi-employer sites where the key question after an injury is often who other than the employer was at fault. ${THIRD_PARTY} ${PRIVETTE} ${OSHA} ${LIEN} Civil cases are filed in San Bernardino County Superior Court, generally within two years, or six months where a public entity (such as Caltrans on a road job) is involved.`,
      whatToTrack: [
        'Every company and party on the jobsite, not just the employer',
        'Who controlled the site and the specific hazard (Privette exceptions)',
        'For roadwork, whether Caltrans or a public entity was the owner',
        'The equipment involved and its manufacturer',
        'Any Cal/OSHA investigation and citations',
        'Whether a negligent driver struck a work zone',
        'The workers\u2019 compensation claim and its lien',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every non-employer party on a San Bernardino jobsite, tests the Privette exceptions, flags any public-entity (Caltrans) deadline on roadwork, and coordinates the third-party claim with the workers\u2019-comp lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have workers\u2019 comp. Can I also sue?',
        a: 'Possibly. Workers\u2019 compensation is generally the only claim against your own employer, but where a different party \u2014 another subcontractor, the general contractor, the site owner, an equipment maker, or a negligent driver \u2014 caused the injury, a separate third-party lawsuit can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'What is the Privette doctrine?',
        a: 'It is the rule that a party hiring an independent contractor generally is not liable to that contractor\u2019s employees. But exceptions exist \u2014 the Hooker exception where the hirer retained control and its exercise contributed to the injury, and the Kinsman exception for a concealed hazard the hirer knew of. Which side of these lines a case falls on is often the whole dispute.',
      },
      {
        q: 'The injury happened on Caltrans roadwork. Does the deadline change?',
        a: 'It can. Where a public entity such as Caltrans is a responsible owner, a written government claim generally must be presented within six months \u2014 far shorter than the usual two years \u2014 so identifying public-entity involvement immediately is essential.',
      },
      {
        q: 'Will a third-party recovery affect my comp benefits?',
        a: 'The comp insurer usually holds a lien to be reimbursed from a third-party recovery. That lien must be planned for and negotiated so you keep a fair share, which is why coordinating both claims from the start matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the parties, the Privette facts, and the lien so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_CONSTRUCTION_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Construction Accident Claims',
    title: 'Bakersfield Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Bakersfield energy, roadwork, or solar construction job? Beyond workers\u2019 comp, a third-party claim against a non-employer can pursue full damages.',
    psychology: 'I was hurt on a Bakersfield-area construction site and I do not know if I have anything beyond workers\u2019 comp.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield construction accident lawyer',
      'third party construction injury claim california',
      'oilfield construction injury claim california',
      'heat illness construction california',
      'privette exception california',
    ],
    signals: [
      'Third-party claim beyond comp',
      'Energy / oilfield construction',
      'Solar & agricultural builds',
      'Heat-illness safety orders',
      'Cal/OSHA standard of care',
      'Comp-lien coordination',
    ],
    sections: {
      whyItMatters: `Bakersfield\u2019s energy and oilfield construction, its Highway 99/58 roadwork, and its agricultural and solar builds put many workers on complex sites in extreme summer heat \u2014 and the key question after an injury is often who other than the employer was at fault. ${THIRD_PARTY} ${PRIVETTE} ${OSHA} Cal/OSHA heat-illness safety orders also set requirements for shade, water, and rest that a responsible party can violate. ${LIEN} Civil cases are filed in Kern County Superior Court, generally within two years, or six months where a public entity (such as Caltrans on a road job) is involved.`,
      whatToTrack: [
        'Every company and party on the jobsite, not just the employer',
        'Who controlled the site and the specific hazard (Privette exceptions)',
        'Whether heat-illness measures (shade, water, rest) were provided',
        'For roadwork, whether Caltrans or a public entity was the owner',
        'The equipment involved and its manufacturer',
        'Any Cal/OSHA investigation and citations',
        'The workers\u2019 compensation claim and its lien',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every non-employer party on a Bakersfield energy or roadwork jobsite, tests the Privette exceptions, examines any heat-illness or Cal/OSHA violation, and coordinates the third-party claim with the workers\u2019-comp lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have workers\u2019 comp. Can I also sue?',
        a: 'Possibly. Workers\u2019 compensation is generally the only claim against your own employer, but where a different party \u2014 another subcontractor, the general contractor, the site owner, an equipment maker, or a negligent driver \u2014 caused the injury, a separate third-party lawsuit can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'I suffered heat illness on a jobsite. Can that support a claim?',
        a: 'It can be part of one. Cal/OSHA heat-illness safety orders require shade, water, and rest breaks, and a responsible party\u2019s violation can help establish that it fell below the standard of care. Whether a non-employer is liable depends on who controlled the conditions.',
      },
      {
        q: 'What is the Privette doctrine?',
        a: 'It is the rule that a party hiring an independent contractor generally is not liable to that contractor\u2019s employees. But exceptions exist \u2014 the Hooker exception where the hirer retained control and its exercise contributed to the injury, and the Kinsman exception for a concealed hazard the hirer knew of. Which side of these lines a case falls on is often the whole dispute.',
      },
      {
        q: 'Will a third-party recovery affect my comp benefits?',
        a: 'The comp insurer usually holds a lien to be reimbursed from a third-party recovery. That lien must be planned for and negotiated so you keep a fair share, which is why coordinating both claims from the start matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the parties, the Privette facts, and the lien so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_CONSTRUCTION_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Construction Accident Claims',
    title: 'Anaheim Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on an Anaheim hotel, stadium, or resort-corridor build, or on I-5 roadwork? Beyond workers\u2019 comp, a third-party claim against a non-employer can pursue full damages.',
    psychology: 'I was hurt on an Anaheim construction site and I do not know if I have anything beyond workers\u2019 comp.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim construction accident lawyer',
      'third party construction injury claim california',
      'hotel construction fall claim california',
      'roadwork accident caltrans claim california',
      'privette exception california',
    ],
    signals: [
      'Third-party claim beyond comp',
      'Hotel / stadium / resort builds',
      'I-5 roadwork (Caltrans public)',
      'Privette / Hooker / Kinsman',
      'Cal/OSHA standard of care',
      'Comp-lien coordination',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s hotel, stadium, and resort-corridor construction and its I-5 widening put many workers on dense, multi-employer sites in a busy tourist area \u2014 and the key question after an injury is often who other than the employer was at fault. ${THIRD_PARTY} ${PRIVETTE} ${OSHA} ${LIEN} Civil cases are filed in Orange County Superior Court, generally within two years, or six months where a public entity (such as Caltrans on the I-5 widening) is involved.`,
      whatToTrack: [
        'Every company and party on the jobsite, not just the employer',
        'Who controlled the site and the specific hazard (Privette exceptions)',
        'For roadwork, whether Caltrans or a public entity was the owner',
        'The equipment involved and its manufacturer',
        'Any Cal/OSHA investigation and citations',
        'Whether a negligent driver struck a work zone',
        'The workers\u2019 compensation claim and its lien',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ maps every non-employer party on an Anaheim jobsite, tests the Privette exceptions, flags any public-entity (Caltrans) deadline on the I-5 widening, and coordinates the third-party claim with the workers\u2019-comp lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have workers\u2019 comp. Can I also sue?',
        a: 'Possibly. Workers\u2019 compensation is generally the only claim against your own employer, but where a different party \u2014 another subcontractor, the general contractor, the site owner, an equipment maker, or a negligent driver \u2014 caused the injury, a separate third-party lawsuit can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'What is the Privette doctrine?',
        a: 'It is the rule that a party hiring an independent contractor generally is not liable to that contractor\u2019s employees. But exceptions exist \u2014 the Hooker exception where the hirer retained control and its exercise contributed to the injury, and the Kinsman exception for a concealed hazard the hirer knew of. Which side of these lines a case falls on is often the whole dispute.',
      },
      {
        q: 'The injury happened on the I-5 widening. Does the deadline change?',
        a: 'It can. Where a public entity such as Caltrans is a responsible owner, a written government claim generally must be presented within six months \u2014 far shorter than the usual two years \u2014 so identifying public-entity involvement immediately is essential.',
      },
      {
        q: 'Will a third-party recovery affect my comp benefits?',
        a: 'The comp insurer usually holds a lien to be reimbursed from a third-party recovery. That lien must be planned for and negotiated so you keep a fair share, which is why coordinating both claims from the start matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the parties, the Privette facts, and the lien so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const constructionCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [RIV_CONSTRUCTION_SLUG]: {
    scenario: `A Riverside worker fell on a warehouse build when a general contractor\u2019s crew removed a guardrail. A third-party claim under the Hooker exception reached the full damages workers\u2019 comp could not, once retained control was shown. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify every company on site; preserve the scene.'],
      ['First weeks', 'Assess Privette exceptions; open comp.'],
      ['Investigation', 'Cal/OSHA findings and control facts gathered.'],
      ['Longer term', 'Third-party liability and lien coordinated.'],
    ],
    severityLadder: [
      ['Who was on site', 'Every non-employer party is identified.'],
      ['Privette test', 'Hooker or Kinsman may apply.'],
      ['Standard of care', 'Cal/OSHA violations help establish it.'],
      ['Damages', 'Full damages beyond comp.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Surgery/therapy', copy: 'Treatment builds the record.' },
      { label: 'Recovery', copy: 'Work capacity is assessed.' },
      { label: 'Long-term', copy: 'Lasting limitations documented.' },
    ],
    settlementDrivers: [
      'Whether a non-employer party is at fault',
      'Whether a Privette exception applies',
      'Whether Cal/OSHA violations establish the standard',
      'The severity of the injuries',
      'How the comp lien is negotiated',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'A third-party claim reaches full damages.' },
      { label: 'Control decides', copy: 'Retained control opens the Hooker path.' },
      { label: 'OSHA helps', copy: 'Citations support the standard of care.' },
      { label: 'Plan the lien', copy: 'Coordination protects the recovery.' },
    ],
    insuranceProblems: [
      'Only the comp claim is pursued, missing the third party.',
      'The Privette exceptions are never analysed.',
      'Cal/OSHA findings are not obtained.',
      'The comp lien is not planned for.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which companies were on the jobsite?' },
      { label: 'Step 2', question: 'Who controlled the work and the hazard?' },
      { label: 'Step 3', question: 'Was there a Cal/OSHA investigation?' },
      { label: 'Step 4', question: 'Have you opened a workers\u2019-comp claim?' },
    ],
  },
  [SB_CONSTRUCTION_SLUG]: {
    scenario: `A San Bernardino worker was struck by equipment operated by another subcontractor on a logistics build. A third-party claim reached the full damages workers\u2019 comp could not, and the comp lien was coordinated from the start. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify every company on site; preserve the scene.'],
      ['First weeks', 'Assess third-party fault; open comp.'],
      ['Investigation', 'Cal/OSHA findings and control facts gathered.'],
      ['Longer term', 'Third-party liability and lien coordinated.'],
    ],
    severityLadder: [
      ['Who was on site', 'Every non-employer party is identified.'],
      ['Third-party fault', 'Another sub or the GC may be liable.'],
      ['Standard of care', 'Cal/OSHA violations help establish it.'],
      ['Damages', 'Full damages beyond comp.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Surgery/therapy', copy: 'Treatment builds the record.' },
      { label: 'Recovery', copy: 'Work capacity is assessed.' },
      { label: 'Long-term', copy: 'Lasting limitations documented.' },
    ],
    settlementDrivers: [
      'Whether a non-employer party is at fault',
      'Whether a Privette exception applies',
      'Whether Cal/OSHA violations establish the standard',
      'The severity of the injuries',
      'How the comp lien is negotiated',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'A third-party claim reaches full damages.' },
      { label: 'Many parties', copy: 'Multi-employer sites have several defendants.' },
      { label: 'OSHA helps', copy: 'Citations support the standard of care.' },
      { label: 'Plan the lien', copy: 'Coordination protects the recovery.' },
    ],
    insuranceProblems: [
      'Only the comp claim is pursued, missing the third party.',
      'The Privette exceptions are never analysed.',
      'Cal/OSHA findings are not obtained.',
      'The comp lien is not planned for.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which companies were on the jobsite?' },
      { label: 'Step 2', question: 'Who caused the injury besides your employer?' },
      { label: 'Step 3', question: 'Was there a Cal/OSHA investigation?' },
      { label: 'Step 4', question: 'Have you opened a workers\u2019-comp claim?' },
    ],
  },
  [BAKERSFIELD_CONSTRUCTION_SLUG]: {
    scenario: `A Bakersfield worker on an energy build collapsed from heat illness where no shade or water was provided by the controlling contractor. The heat-illness safety-order violation supported a third-party claim beyond comp. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify every company on site; document conditions.'],
      ['First weeks', 'Assess Privette exceptions and heat-illness orders; open comp.'],
      ['Investigation', 'Cal/OSHA findings and control facts gathered.'],
      ['Longer term', 'Third-party liability and lien coordinated.'],
    ],
    severityLadder: [
      ['Who was on site', 'Every non-employer party is identified.'],
      ['Conditions', 'Heat-illness orders may be violated.'],
      ['Standard of care', 'Cal/OSHA violations help establish it.'],
      ['Damages', 'Full damages beyond comp.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care builds the record.' },
      { label: 'Recovery', copy: 'Work capacity is assessed.' },
      { label: 'Long-term', copy: 'Lasting effects documented.' },
    ],
    settlementDrivers: [
      'Whether a non-employer party controlled the conditions',
      'Whether heat-illness or Cal/OSHA orders were violated',
      'Whether a Privette exception applies',
      'The severity of the injuries',
      'How the comp lien is negotiated',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'A third-party claim reaches full damages.' },
      { label: 'Heat rules matter', copy: 'Shade, water, and rest are required.' },
      { label: 'OSHA helps', copy: 'Citations support the standard of care.' },
      { label: 'Plan the lien', copy: 'Coordination protects the recovery.' },
    ],
    insuranceProblems: [
      'Only the comp claim is pursued, missing the third party.',
      'Heat-illness conditions are never documented.',
      'Cal/OSHA findings are not obtained.',
      'The comp lien is not planned for.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which companies controlled the site?' },
      { label: 'Step 2', question: 'Were shade, water, and rest provided?' },
      { label: 'Step 3', question: 'Was there a Cal/OSHA investigation?' },
      { label: 'Step 4', question: 'Have you opened a workers\u2019-comp claim?' },
    ],
  },
  [ANAHEIM_CONSTRUCTION_SLUG]: {
    scenario: `An Anaheim worker fell on a hotel build when a subcontractor left a concealed floor opening. A third-party claim under the Kinsman exception reached the full damages workers\u2019 comp could not. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify every company on site; preserve the scene.'],
      ['First weeks', 'Assess Privette exceptions; open comp.'],
      ['Investigation', 'Cal/OSHA findings and hazard facts gathered.'],
      ['Longer term', 'Third-party liability and lien coordinated.'],
    ],
    severityLadder: [
      ['Who was on site', 'Every non-employer party is identified.'],
      ['Privette test', 'Kinsman concealed-hazard may apply.'],
      ['Standard of care', 'Cal/OSHA violations help establish it.'],
      ['Damages', 'Full damages beyond comp.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Surgery/therapy', copy: 'Treatment builds the record.' },
      { label: 'Recovery', copy: 'Work capacity is assessed.' },
      { label: 'Long-term', copy: 'Lasting limitations documented.' },
    ],
    settlementDrivers: [
      'Whether a non-employer party is at fault',
      'Whether a Privette exception applies',
      'Whether Cal/OSHA violations establish the standard',
      'The severity of the injuries',
      'How the comp lien is negotiated',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'A third-party claim reaches full damages.' },
      { label: 'Concealed hazard', copy: 'The Kinsman exception can apply.' },
      { label: 'OSHA helps', copy: 'Citations support the standard of care.' },
      { label: 'Plan the lien', copy: 'Coordination protects the recovery.' },
    ],
    insuranceProblems: [
      'Only the comp claim is pursued, missing the third party.',
      'The Privette exceptions are never analysed.',
      'Cal/OSHA findings are not obtained.',
      'The comp lien is not planned for.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which companies were on the jobsite?' },
      { label: 'Step 2', question: 'Who created or knew of the hazard?' },
      { label: 'Step 3', question: 'Was there a Cal/OSHA investigation?' },
      { label: 'Step 4', question: 'Have you opened a workers\u2019-comp claim?' },
    ],
  },
}
