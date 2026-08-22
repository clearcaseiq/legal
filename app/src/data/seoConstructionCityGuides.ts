import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, construction-accident (third-party) practice area: city-specific
 * guides for Los Angeles, San Francisco, San Jose, and San Diego.
 *
 * This geo-izes the statewide third-party workplace-injury hub into the metros
 * with the most construction, and is scoped carefully to THIRD-PARTY liability
 * (against non-employers) rather than workers' compensation against the
 * employer, which is a different system.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: enormous commercial, residential, and high-rise construction
 *    volume, with layered general contractors, subcontractors, and site owners.
 *  - San Francisco: dense high-rise and tech-campus buildout, crane and
 *    tower work, and constrained urban sites.
 *  - San Jose: Silicon Valley campus and data-center construction, where injured
 *    workers often have self-funded (ERISA) health plans asserting large liens.
 *  - San Diego: heavy federal and military construction, where a project on a
 *    federal enclave or involving a federal contractor can route part of a claim
 *    through the Federal Tort Claims Act.
 *
 * Applied accurately:
 *  - Workers' compensation is generally the exclusive remedy against the injured
 *    worker's own employer (Labor Code section 3600 and following), regardless of
 *    fault, and this hub does not promise a suit against the employer.
 *  - A separate third-party claim can lie against a non-employer whose negligence
 *    caused the injury: another subcontractor, the general contractor, the site
 *    or property owner, an equipment manufacturer (product liability), or a
 *    negligent driver. That claim is not subject to the comp bar.
 *  - Under Privette v. Superior Court, a party that hires an independent
 *    contractor is generally not liable to that contractor's employees, subject
 *    to recognised exceptions such as retained control that affirmatively
 *    contributed to the injury (Hooker) and a concealed hazard the hirer knew of
 *    (Kinsman). This is the central battleground in many site cases.
 *  - The workers' compensation carrier typically holds a lien for reimbursement
 *    against any third-party recovery, which must be accounted for.
 *  - Cal/OSHA safety orders can establish the standard of care.
 *  - Pure comparative negligence, and the two-year personal-injury deadline
 *    (Code of Civil Procedure section 335.1), with the six-month Government
 *    Claims Act deadline where a public entity is involved and the FTCA process
 *    where the United States is responsible.
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

export const LA_CONSTRUCTION_SLUG = '/los-angeles-construction-accident'
export const SF_CONSTRUCTION_SLUG = '/san-francisco-construction-accident'
export const SJ_CONSTRUCTION_SLUG = '/san-jose-construction-accident'
export const SD_CONSTRUCTION_SLUG = '/san-diego-construction-accident'

export const constructionCityGuidePages: LandingPage[] = [
  {
    slug: LA_CONSTRUCTION_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Construction Accident Claims',
    title: 'Los Angeles Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on an LA construction site? Workers\u2019 comp is not your only option \u2014 a third-party claim against another contractor, the site owner, or an equipment maker can pursue full damages, including pain and suffering, that comp does not pay.',
    psychology: 'I was hurt on a construction site in LA and was told workers\u2019 comp is all I get \u2014 is that true?',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles construction accident claim',
      'can i sue if hurt on a construction site california',
      'third party claim construction injury california',
      'construction fall injury who is liable besides employer',
      'workers comp vs personal injury construction california',
    ],
    signals: [
      'Third-party (non-employer) claim',
      'Privette / Hooker / Kinsman',
      'Comp lien coordination',
      'Cal/OSHA safety orders',
      'Equipment defect (product)',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Los Angeles has one of the largest construction footprints in the country \u2014 high-rise towers, commercial build-outs, sprawling residential projects \u2014 and its sites are layered with a general contractor and many subcontractors, which is exactly the structure that creates third-party claims. The message that matters most to an injured worker is this: workers\u2019 comp is not necessarily the end of the story. ${THIRD_PARTY} On a busy LA site, the party that hurt you is frequently not your employer at all \u2014 it may be another sub, the general contractor, the owner, or the manufacturer of a defective tool or piece of equipment. ${PRIVETTE} ${OSHA} ${LIEN} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs the third-party claim \u2014 separate from the workers\u2019 comp timeline \u2014 with the six-month rule if a public entity is involved. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Every company on the site, and which one you actually worked for',
        'Which non-employer\u2019s conduct or equipment caused the injury',
        'Who controlled the work area and the hazard (Privette exceptions)',
        'The Cal/OSHA investigation and any citations',
        'Whether defective equipment or a tool was involved',
        'The workers\u2019 comp claim and the carrier\u2019s lien',
        'Photographs of the site, the hazard, and the equipment',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the workers\u2019 comp claim from the third-party claim on an LA site, maps every non-employer whose negligence or equipment caused the injury, and frames the Privette control-and-hazard questions that decide those cases \u2014 while coordinating the comp lien so the recovery holds its value. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was told workers\u2019 comp is all I can get. Is that right?',
        a: 'Not necessarily. Workers\u2019 comp is generally the only claim against your own employer, but a separate third-party claim can be brought against a non-employer whose negligence caused your injury \u2014 another subcontractor, the general contractor, the site owner, or an equipment manufacturer. That claim can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'What is the Privette rule I keep hearing about?',
        a: 'Privette generally says a party that hires an independent contractor is not liable to that contractor\u2019s employees. But exceptions exist \u2014 notably when the hirer retained control and its exercise of that control affirmatively contributed to the injury (Hooker), or when the hirer knew of a concealed hazard the contractor did not (Kinsman). Which side of those lines your case falls on is often the whole dispute.',
      },
      {
        q: 'If I sue a third party, what happens to my workers\u2019 comp?',
        a: 'The two can proceed together, but the workers\u2019 comp insurer usually holds a lien to be reimbursed from any third-party recovery for the benefits it paid. That lien needs to be planned for and negotiated so you keep a fair share, which is why coordinating both claims from the start matters.',
      },
      {
        q: 'A defective tool or machine hurt me. Does that help?',
        a: 'Yes. A defective tool, machine, or piece of equipment can support a product-liability claim against its manufacturer or supplier \u2014 a third-party claim separate from workers\u2019 comp. Preserving the equipment and documenting the failure quickly is important because it may be removed or repaired.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the third-party and Privette questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_CONSTRUCTION_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Construction Accident Claims',
    title: 'San Francisco Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a San Francisco high-rise or tech-campus site? Workers\u2019 comp is not your only option \u2014 a third-party claim against another contractor, the site owner, or an equipment maker can pursue full damages comp does not pay.',
    psychology: 'I was hurt on a construction site in San Francisco and was told workers\u2019 comp is all I get \u2014 is that true?',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco construction accident claim',
      'can i sue if hurt on a construction site california',
      'third party claim construction injury california',
      'crane or scaffold accident who is liable california',
      'workers comp vs personal injury construction california',
    ],
    signals: [
      'Third-party (non-employer) claim',
      'Privette / Hooker / Kinsman',
      'High-rise / crane work',
      'Cal/OSHA safety orders',
      'Comp lien coordination',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s construction is defined by density and height \u2014 downtown high-rises, tech-campus build-outs, and constrained urban sites where cranes, tower work, and deep excavations are routine \u2014 and those conditions produce serious injuries and layered responsibility. The core point for an injured worker is the same everywhere: comp is not the whole story. ${THIRD_PARTY} On a San Francisco high-rise, the responsible party is frequently a different trade, the general contractor coordinating the site, the owner or developer, or the maker of a crane, hoist, or scaffold component that failed. ${PRIVETTE} High-rise and crane work also make Cal/OSHA compliance central. ${OSHA} ${LIEN} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs the third-party claim, with the six-month rule if a public entity is involved. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Every company on the site, and which one you actually worked for',
        'Which non-employer\u2019s conduct or equipment caused the injury',
        'For crane or scaffold work, the equipment and its owner',
        'Who controlled the work area and the hazard (Privette exceptions)',
        'The Cal/OSHA investigation and any citations',
        'The workers\u2019 comp claim and the carrier\u2019s lien',
        'Photographs of the site, the hazard, and the equipment',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the comp claim from the third-party claim on a San Francisco high-rise site, targets the crane, hoist, and scaffold parties and any equipment defect, and frames the Privette control-and-hazard questions \u2014 while coordinating the comp lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was told workers\u2019 comp is all I can get. Is that right?',
        a: 'Not necessarily. Workers\u2019 comp is generally the only claim against your own employer, but a separate third-party claim can be brought against a non-employer whose negligence caused your injury \u2014 another trade, the general contractor, the owner or developer, or an equipment manufacturer. That claim can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'A crane or scaffold failed. Who is responsible?',
        a: 'Potentially the company that owned or operated the crane or erected the scaffold, and the manufacturer if a component was defective \u2014 all third-party claims separate from workers\u2019 comp. High-rise and crane work make Cal/OSHA compliance central, and a citation can help establish the standard of care.',
      },
      {
        q: 'What is the Privette rule?',
        a: 'Privette generally says a party that hires an independent contractor is not liable to that contractor\u2019s employees, subject to exceptions \u2014 notably retained control that affirmatively contributed to the injury (Hooker) and a concealed hazard the hirer knew of (Kinsman). Which side of those lines your case falls on is often the whole dispute.',
      },
      {
        q: 'If I sue a third party, what happens to my workers\u2019 comp?',
        a: 'They can proceed together, but the workers\u2019 comp insurer usually holds a lien to be reimbursed from any third-party recovery. That lien needs to be planned for and negotiated so you keep a fair share, which is why coordinating both claims from the start matters.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the third-party and Privette questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_CONSTRUCTION_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Construction Accident Claims',
    title: 'San Jose Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Silicon Valley construction or data-center site? Workers\u2019 comp is not your only option \u2014 a third-party claim can pursue full damages comp does not pay, and a self-funded health plan\u2019s lien needs handling early.',
    psychology: 'I was hurt on a construction site in San Jose and was told workers\u2019 comp is all I get \u2014 is that true?',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose construction accident claim',
      'can i sue if hurt on a construction site california',
      'third party claim construction injury california',
      'workers comp vs personal injury construction california',
      'construction fall injury who is liable besides employer',
    ],
    signals: [
      'Third-party (non-employer) claim',
      'Privette / Hooker / Kinsman',
      'Self-funded (ERISA) health lien',
      'Comp lien coordination',
      'Cal/OSHA safety orders',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s construction runs on Silicon Valley\u2019s expansion \u2014 corporate campuses, data centers, and dense mixed-use projects \u2014 with the same layered contractor structure that creates third-party claims. The essential point for an injured worker is that comp is not the only avenue. ${THIRD_PARTY} On a Valley campus or data-center build, the party at fault is often a different trade, the general contractor, the owner, or the maker of failed equipment. ${PRIVETTE} San Jose adds a distinctive complication on the recovery side: many workers and their families are covered by large employers\u2019 self-funded (ERISA) health plans, which often assert substantial reimbursement liens against a recovery \u2014 on top of the workers\u2019 comp lien \u2014 so both must be coordinated early. ${LIEN} ${OSHA} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs the third-party claim. Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'Every company on the site, and which one you actually worked for',
        'Which non-employer\u2019s conduct or equipment caused the injury',
        'Who controlled the work area and the hazard (Privette exceptions)',
        'Whether your health plan is a self-funded (ERISA) plan',
        'The workers\u2019 comp claim and the carrier\u2019s lien',
        'The Cal/OSHA investigation and any citations',
        'Photographs of the site, the hazard, and the equipment',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the comp claim from the third-party claim on a San Jose site, maps every non-employer at fault, frames the Privette questions, and surfaces both the comp lien and any self-funded ERISA lien early so they do not erode the recovery. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was told workers\u2019 comp is all I can get. Is that right?',
        a: 'Not necessarily. Workers\u2019 comp is generally the only claim against your own employer, but a separate third-party claim can be brought against a non-employer whose negligence caused your injury \u2014 another trade, the general contractor, the owner, or an equipment manufacturer. That claim can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'Why does my health insurance matter to my recovery?',
        a: 'Many Silicon Valley workers have large employer self-funded (ERISA) health plans, which often assert a substantial reimbursement lien against any recovery \u2014 in addition to the workers\u2019 comp lien. Accounting for both early affects what you actually keep, so they should be identified and addressed as part of the claim.',
      },
      {
        q: 'What is the Privette rule?',
        a: 'Privette generally says a party that hires an independent contractor is not liable to that contractor\u2019s employees, subject to exceptions \u2014 notably retained control that affirmatively contributed to the injury (Hooker) and a concealed hazard the hirer knew of (Kinsman). Which side of those lines your case falls on is often the whole dispute.',
      },
      {
        q: 'A defective tool or machine hurt me. Does that help?',
        a: 'Yes. A defective tool, machine, or piece of equipment can support a product-liability claim against its manufacturer or supplier \u2014 a third-party claim separate from workers\u2019 comp. Preserving the equipment and documenting the failure quickly is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the third-party, Privette, and lien questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_CONSTRUCTION_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Construction Accident Claims',
    title: 'San Diego Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a San Diego construction site? Workers\u2019 comp is not your only option \u2014 a third-party claim can pursue full damages comp does not pay, and a federal or on-base project can route part of the claim through the FTCA.',
    psychology: 'I was hurt on a construction site in San Diego, maybe on a base, and was told workers\u2019 comp is all I get.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego construction accident claim',
      'can i sue if hurt on a construction site california',
      'third party claim construction injury california',
      'hurt on a construction site on a military base claim',
      'workers comp vs personal injury construction california',
    ],
    signals: [
      'Third-party (non-employer) claim',
      'Privette / Hooker / Kinsman',
      'Federal / on-base (FTCA)',
      'Comp lien coordination',
      'Cal/OSHA safety orders',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s construction spans downtown towers, sprawling residential development, and an unusually large volume of federal and military projects around the region\u2019s bases and installations. The foundational point for an injured worker is the same: comp is not the only claim. ${THIRD_PARTY} On a private San Diego site, the party at fault may be another sub, the general contractor, the owner, or an equipment maker. ${PRIVETTE} The distinctive local wrinkle is federal work: a project on a federal enclave, or one where a federal entity or contractor\u2019s negligence contributed, can route part of the claim through the Federal Tort Claims Act \u2014 which requires an administrative claim on Standard Form 95 to the responsible agency, usually within two years, before any lawsuit \u2014 so identifying a federal connection early is essential. ${OSHA} ${LIEN} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs private third-party claims, with the FTCA process for federal ones. Civil cases against private parties are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Whether the project was federal or on a base',
        'Every company on the site, and which one you actually worked for',
        'Which non-employer\u2019s conduct or equipment caused the injury',
        'Who controlled the work area and the hazard (Privette exceptions)',
        'The Cal/OSHA investigation and any citations',
        'The workers\u2019 comp claim and the carrier\u2019s lien',
        'Photographs of the site, the hazard, and the equipment',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ checks first for a federal or on-base connection that can route a San Diego construction claim through the FTCA and its Standard Form 95 deadline, then separates comp from the third-party claim, maps every non-employer at fault, and frames the Privette questions while coordinating the comp lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a construction site on a military base. Is that an ordinary claim?',
        a: 'Not necessarily. If the project was on a federal enclave, or a federal entity or contractor\u2019s negligence contributed, part of the claim can fall under the Federal Tort Claims Act, which requires an administrative claim on Standard Form 95 to the responsible agency, usually within two years, before any lawsuit. Because San Diego has so much federal construction, identifying that connection early is essential.',
      },
      {
        q: 'I was told workers\u2019 comp is all I can get. Is that right?',
        a: 'Not necessarily. Workers\u2019 comp is generally the only claim against your own employer, but a separate third-party claim can be brought against a non-employer whose negligence caused your injury \u2014 another sub, the general contractor, the owner, or an equipment manufacturer. That claim can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'What is the Privette rule?',
        a: 'Privette generally says a party that hires an independent contractor is not liable to that contractor\u2019s employees, subject to exceptions \u2014 notably retained control that affirmatively contributed to the injury (Hooker) and a concealed hazard the hirer knew of (Kinsman). Which side of those lines your case falls on is often the whole dispute.',
      },
      {
        q: 'If I sue a third party, what happens to my workers\u2019 comp?',
        a: 'They can proceed together, but the workers\u2019 comp insurer usually holds a lien to be reimbursed from any third-party recovery. That lien needs to be planned for and negotiated so you keep a fair share, which is why coordinating both claims from the start matters.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the third-party, federal, and Privette questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const constructionCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_CONSTRUCTION_SLUG]: {
    scenario: `A worker fell when another sub\u2019s crew left a floor opening unguarded on an LA high-rise, and he was told comp was all he had. A third-party claim against the other sub and the general contractor pursued the full damages comp does not pay, with the comp lien coordinated. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify every company on site and the one at fault.'],
      ['First days', 'The comp claim opened; the third-party path identified.'],
      ['First weeks', 'The Cal/OSHA investigation and Privette facts developed.'],
      ['Longer term', 'The comp lien coordinated and treatment documented.'],
    ],
    severityLadder: [
      ['Employer only', 'Comp is the exclusive remedy against your employer.'],
      ['Third party', 'A non-employer at fault opens a full-damages claim.'],
      ['Equipment defect', 'A product claim against a manufacturer.'],
      ['Privette fight', 'Control and hazard facts decide hirer liability.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Which non-employer\u2019s negligence caused the injury',
      'Whether a Privette exception (Hooker/Kinsman) applies',
      'Whether defective equipment was involved',
      'The Cal/OSHA findings and any citations',
      'How the comp lien is coordinated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Comp is not the end', copy: 'A third-party claim adds pain-and-suffering damages.' },
      { label: 'Privette is the fight', copy: 'Control and concealed hazards decide hirer liability.' },
      { label: 'Equipment defects count', copy: 'A product claim reaches the manufacturer.' },
      { label: 'Plan the lien', copy: 'Coordinating comp protects the net recovery.' },
    ],
    insuranceProblems: [
      'The worker is told comp is the only option.',
      'The at-fault non-employer is never identified.',
      'The comp lien eats an unplanned share of recovery.',
      'Defective equipment is repaired before it is preserved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which company did you work for, and who else was on site?' },
      { label: 'Step 2', question: 'Whose conduct or equipment caused the injury?' },
      { label: 'Step 3', question: 'Who controlled the work area and the hazard?' },
      { label: 'Step 4', question: 'Has a comp claim been opened?' },
    ],
  },
  [SF_CONSTRUCTION_SLUG]: {
    scenario: `A scaffold component failed on a San Francisco high-rise, and the worker assumed only comp applied. A product claim against the manufacturer and a claim against the scaffold company pursued the full damages, with Cal/OSHA citations supporting the standard of care. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify every company on site and preserve the equipment.'],
      ['First days', 'The comp claim opened; the third-party path identified.'],
      ['First weeks', 'The Cal/OSHA investigation and equipment facts developed.'],
      ['Longer term', 'The comp lien coordinated and treatment documented.'],
    ],
    severityLadder: [
      ['Employer only', 'Comp is the exclusive remedy against your employer.'],
      ['Third party', 'A non-employer at fault opens a full-damages claim.'],
      ['Crane / scaffold', 'The equipment owner and maker may be liable.'],
      ['Privette fight', 'Control and hazard facts decide hirer liability.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Which non-employer\u2019s negligence caused the injury',
      'Whether a crane, scaffold, or component failed',
      'Whether a Privette exception applies',
      'The Cal/OSHA findings and any citations',
      'How the comp lien is coordinated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Comp is not the end', copy: 'A third-party claim adds pain-and-suffering damages.' },
      { label: 'Equipment parties', copy: 'The crane or scaffold owner and maker may be liable.' },
      { label: 'OSHA sets the standard', copy: 'Citations help prove the standard of care.' },
      { label: 'Plan the lien', copy: 'Coordinating comp protects the net recovery.' },
    ],
    insuranceProblems: [
      'The worker is told comp is the only option.',
      'The failed equipment is removed before it is preserved.',
      'The at-fault non-employer is never identified.',
      'The comp lien eats an unplanned share of recovery.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which company did you work for, and who else was on site?' },
      { label: 'Step 2', question: 'Did a crane, scaffold, or component fail?' },
      { label: 'Step 3', question: 'Who controlled the work area and the hazard?' },
      { label: 'Step 4', question: 'Has a comp claim been opened?' },
    ],
  },
  [SJ_CONSTRUCTION_SLUG]: {
    scenario: `A worker on a Silicon Valley data-center build was hurt by another trade\u2019s crane lift, and both a comp lien and a self-funded ERISA plan lien loomed. Identifying the third-party claim and coordinating both liens early preserved the value of the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify every company on site and the one at fault.'],
      ['First days', 'The comp claim opened; the third-party path identified.'],
      ['First weeks', 'Any self-funded ERISA lien and the comp lien mapped.'],
      ['Longer term', 'Both liens coordinated and treatment documented.'],
    ],
    severityLadder: [
      ['Employer only', 'Comp is the exclusive remedy against your employer.'],
      ['Third party', 'A non-employer at fault opens a full-damages claim.'],
      ['Two liens', 'Comp and self-funded ERISA liens both apply.'],
      ['Privette fight', 'Control and hazard facts decide hirer liability.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Which non-employer\u2019s negligence caused the injury',
      'Whether a Privette exception applies',
      'Whether a self-funded ERISA lien applies',
      'How the comp lien is coordinated',
      'The Cal/OSHA findings and any citations',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Comp is not the end', copy: 'A third-party claim adds pain-and-suffering damages.' },
      { label: 'Two liens to plan', copy: 'Comp and ERISA liens both reduce net recovery.' },
      { label: 'Privette is the fight', copy: 'Control and concealed hazards decide hirer liability.' },
      { label: 'Coordinate early', copy: 'Handling both liens up front protects the net.' },
    ],
    insuranceProblems: [
      'The worker is told comp is the only option.',
      'A self-funded ERISA lien surprises the worker at the end.',
      'The at-fault non-employer is never identified.',
      'The comp lien is not coordinated with the recovery.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which company did you work for, and who else was on site?' },
      { label: 'Step 2', question: 'Whose conduct or equipment caused the injury?' },
      { label: 'Step 3', question: 'Is your health plan self-funded (ERISA)?' },
      { label: 'Step 4', question: 'Has a comp claim been opened?' },
    ],
  },
  [SD_CONSTRUCTION_SLUG]: {
    scenario: `A worker was injured on a project tied to a San Diego base, and an ordinary claim stalled. Recognising a federal connection, a Standard Form 95 was presented to the agency in time while a third-party claim proceeded against the private parties. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the project was federal or on-base; identify companies.'],
      ['First days', 'The comp claim opened; federal vs. private paths identified.'],
      ['Within two years', 'Standard Form 95 presented if a federal connection exists.'],
      ['Longer term', 'The comp lien coordinated and treatment documented.'],
    ],
    severityLadder: [
      ['Employer only', 'Comp is the exclusive remedy against your employer.'],
      ['Third party', 'A non-employer at fault opens a full-damages claim.'],
      ['Federal', 'An FTCA claim on a Standard Form 95 process.'],
      ['Privette fight', 'Control and hazard facts decide hirer liability.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a federal or on-base connection triggers the FTCA',
      'Which non-employer\u2019s negligence caused the injury',
      'Whether a Privette exception applies',
      'The Cal/OSHA findings and any citations',
      'How the comp lien is coordinated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Federal is different', copy: 'The FTCA and Form 95 govern a federal-connected claim.' },
      { label: 'Comp is not the end', copy: 'A third-party claim adds pain-and-suffering damages.' },
      { label: 'Privette is the fight', copy: 'Control and concealed hazards decide hirer liability.' },
      { label: 'Plan the lien', copy: 'Coordinating comp protects the net recovery.' },
    ],
    insuranceProblems: [
      'A federal-connected claim is filed as ordinary and stalls.',
      'The Standard Form 95 deadline is missed.',
      'The worker is told comp is the only option.',
      'The at-fault non-employer is never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the project federal or on a base?' },
      { label: 'Step 2', question: 'Which company did you work for, and who else was on site?' },
      { label: 'Step 3', question: 'Whose conduct or equipment caused the injury?' },
      { label: 'Step 4', question: 'Has a comp claim been opened?' },
    ],
  },
}
