import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, construction-accident (third-party) practice area (batch 2):
 * city-specific guides for Sacramento, Fresno, Oakland, and Long Beach, extending
 * the batch-1 hub (LA, SF, San Jose, San Diego).
 *
 * Scoped carefully to THIRD-PARTY liability (against non-employers) rather than
 * workers' compensation against the employer, which is a different system.
 *
 * Local context, genuine rather than interpolated:
 *  - Sacramento: heavy public-works and Caltrans road, bridge, and state-facility
 *    construction, where a public entity is often the owner (six-month claim rule)
 *    and a state vehicle or agency may be a defendant.
 *  - Fresno: highway (Route 99) and high-speed-rail construction, warehouse and
 *    distribution builds, and agricultural construction in extreme summer heat,
 *    where heat-illness safety orders and equipment on rural roads recur.
 *  - Oakland: Port of Oakland and marine-terminal construction, bridge and freeway
 *    seismic retrofit work, and dense urban builds, with public-entity owners.
 *  - Long Beach: port, refinery, and petrochemical construction and heavy
 *    industrial builds, where marine-terminal work can fall under the federal
 *    Longshore and Harbor Workers' Compensation Act rather than state comp.
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

export const SAC_CONSTRUCTION_SLUG = '/sacramento-construction-accident'
export const FRESNO_CONSTRUCTION_SLUG = '/fresno-construction-accident'
export const OAK_CONSTRUCTION_SLUG = '/oakland-construction-accident'
export const LB_CONSTRUCTION_SLUG = '/long-beach-construction-accident'

export const constructionCityGuidePages2: LandingPage[] = [
  {
    slug: SAC_CONSTRUCTION_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Construction Accident Claims',
    title: 'Sacramento Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Sacramento road, bridge, or state-facility project? Workers\u2019 comp is not your only option \u2014 a third-party claim can pursue full damages comp does not pay, and a public-entity owner brings a six-month deadline.',
    psychology: 'I was hurt on a construction site in Sacramento and was told workers\u2019 comp is all I get \u2014 is that true?',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento construction accident claim',
      'can i sue if hurt on a construction site california',
      'third party claim construction injury california',
      'caltrans road construction injury who is liable',
      'workers comp vs personal injury construction california',
    ],
    signals: [
      'Third-party (non-employer) claim',
      'Privette / Hooker / Kinsman',
      'Public-entity 6-month deadline',
      'Comp lien coordination',
      'Cal/OSHA safety orders',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s construction is heavy on public works \u2014 Caltrans road and bridge projects, state-facility builds, and the infrastructure that serves the capital \u2014 alongside private commercial and residential development, all with the layered contractor structure that creates third-party claims. The point that matters most to an injured worker is that comp is not the end of the story. ${THIRD_PARTY} On a Sacramento public-works site, the party at fault may be another sub, the general contractor, the maker of failed equipment, or a negligent driver in a highway work zone. ${PRIVETTE} A distinctive Sacramento wrinkle is that many owners are public entities, which triggers the six-month Government Claims Act deadline rather than two years, and a state vehicle or agency can be a defendant. ${OSHA} ${LIEN} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs a private third-party claim, but the six-month rule can apply against a public entity. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Whether the owner is a public entity (six-month rule)',
        'Every company on the site, and which one you actually worked for',
        'Which non-employer\u2019s conduct or equipment caused the injury',
        'For a work zone, any negligent driver and their insurer',
        'Who controlled the work area and the hazard (Privette exceptions)',
        'The Cal/OSHA investigation and any citations',
        'The workers\u2019 comp claim and the carrier\u2019s lien',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ flags immediately when a public-entity owner triggers the six-month claims deadline on a Sacramento project, separates comp from the third-party claim, maps every non-employer at fault including a work-zone driver, and frames the Privette questions while coordinating the comp lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The project was a state or public road job. Does that change the deadline?',
        a: 'It can. If a public entity owns the project or a public employee\u2019s negligence contributed, a claim can be governed by the Government Claims Act, which generally requires a written claim within six months \u2014 far shorter than the usual two years. Identifying a public-entity connection early is one of the most important steps in a Sacramento case.',
      },
      {
        q: 'I was told workers\u2019 comp is all I can get. Is that right?',
        a: 'Not necessarily. Workers\u2019 comp is generally the only claim against your own employer, but a separate third-party claim can be brought against a non-employer whose negligence caused your injury \u2014 another sub, the general contractor, the owner, an equipment manufacturer, or a negligent driver in a work zone. That claim can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'What is the Privette rule I keep hearing about?',
        a: 'Privette generally says a party that hires an independent contractor is not liable to that contractor\u2019s employees, subject to exceptions \u2014 notably retained control that affirmatively contributed to the injury (Hooker) and a concealed hazard the hirer knew of (Kinsman). Which side of those lines your case falls on is often the whole dispute.',
      },
      {
        q: 'If I sue a third party, what happens to my workers\u2019 comp?',
        a: 'They can proceed together, but the workers\u2019 comp insurer usually holds a lien to be reimbursed from any third-party recovery. That lien needs to be planned for and negotiated so you keep a fair share, which is why coordinating both claims from the start matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the third-party, public-entity, and Privette questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_CONSTRUCTION_SLUG,
    category: 'Cities',
    cluster: 'Fresno Construction Accident Claims',
    title: 'Fresno Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Fresno highway, rail, warehouse, or agricultural construction site? Workers\u2019 comp is not your only option \u2014 a third-party claim against another contractor, the site owner, or an equipment maker can pursue full damages comp does not pay.',
    psychology: 'I was hurt on a construction site in the Fresno area and was told workers\u2019 comp is all I get \u2014 is that true?',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno construction accident claim',
      'can i sue if hurt on a construction site california',
      'third party claim construction injury california',
      'highway construction work zone injury who is liable',
      'workers comp vs personal injury construction california',
    ],
    signals: [
      'Third-party (non-employer) claim',
      'Privette / Hooker / Kinsman',
      'Work zone / heat-illness orders',
      'Comp lien coordination',
      'Cal/OSHA safety orders',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `The Fresno area\u2019s construction runs on highway work along Route 99, the high-speed-rail buildout, warehouse and distribution projects, and agricultural construction \u2014 much of it in extreme summer heat \u2014 with the layered contractor structure that creates third-party claims. The essential message for an injured worker is that comp is not the only avenue. ${THIRD_PARTY} On a Fresno-area site, the party at fault may be another sub, the general contractor, the site owner, the maker of failed equipment, or a negligent driver on a rural highway work zone. ${PRIVETTE} Heat is a distinctive local hazard: Cal/OSHA\u2019s heat-illness safety orders require water, shade, and rest, and a violation by a responsible party can help establish fault. ${OSHA} ${LIEN} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs the third-party claim, with the six-month rule if a public entity is involved. Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'Every company on the site, and which one you actually worked for',
        'Which non-employer\u2019s conduct or equipment caused the injury',
        'For a work zone, any negligent driver and their insurer',
        'Whether heat-illness safety orders (water, shade, rest) were followed',
        'Who controlled the work area and the hazard (Privette exceptions)',
        'The Cal/OSHA investigation and any citations',
        'The workers\u2019 comp claim and the carrier\u2019s lien',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates comp from the third-party claim on a Fresno-area site, maps every non-employer at fault including a rural work-zone driver, checks whether heat-illness safety orders were followed, and frames the Privette questions while coordinating the comp lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was told workers\u2019 comp is all I can get. Is that right?',
        a: 'Not necessarily. Workers\u2019 comp is generally the only claim against your own employer, but a separate third-party claim can be brought against a non-employer whose negligence caused your injury \u2014 another sub, the general contractor, the site owner, an equipment manufacturer, or a negligent driver in a work zone. That claim can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'I was hurt by heat on a job with no water or shade. Does that matter?',
        a: 'It can. Cal/OSHA\u2019s heat-illness safety orders require access to water, shade, and rest breaks, and a violation by a responsible party can help establish that it fell below the standard of care. Combined with who controlled the site, that can support a third-party claim beyond comp.',
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
    slug: OAK_CONSTRUCTION_SLUG,
    category: 'Cities',
    cluster: 'Oakland Construction Accident Claims',
    title: 'Oakland Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on an Oakland port, bridge-retrofit, or urban construction site? Workers\u2019 comp is not your only option \u2014 a third-party claim against another contractor, the site owner, or an equipment maker can pursue full damages comp does not pay.',
    psychology: 'I was hurt on a construction site in Oakland and was told workers\u2019 comp is all I get \u2014 is that true?',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland construction accident claim',
      'can i sue if hurt on a construction site california',
      'third party claim construction injury california',
      'bridge or freeway retrofit injury who is liable',
      'workers comp vs personal injury construction california',
    ],
    signals: [
      'Third-party (non-employer) claim',
      'Privette / Hooker / Kinsman',
      'Port / bridge-retrofit work',
      'Public-entity owner',
      'Cal/OSHA safety orders',
      'Comp lien coordination',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s construction spans the Port of Oakland and its marine terminals, bridge and freeway seismic-retrofit work, and dense urban development, with the layered contractor structure that creates third-party claims. The core point for an injured worker is that comp is not the whole story. ${THIRD_PARTY} On an Oakland port or retrofit site, the party at fault may be another trade, the general contractor, the site or public-entity owner, or the maker of a crane, hoist, or component that failed. ${PRIVETTE} Because much of this work is on public infrastructure, a public-entity owner can bring the six-month Government Claims Act deadline into play. ${OSHA} ${LIEN} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs a private third-party claim, with the six-month rule if a public entity is involved. Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'Whether the owner is a public entity (six-month rule)',
        'Every company on the site, and which one you actually worked for',
        'Which non-employer\u2019s conduct or equipment caused the injury',
        'For crane or hoist work, the equipment and its owner',
        'Who controlled the work area and the hazard (Privette exceptions)',
        'The Cal/OSHA investigation and any citations',
        'The workers\u2019 comp claim and the carrier\u2019s lien',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates comp from the third-party claim on an Oakland port or retrofit site, flags a public-entity owner\u2019s six-month deadline, targets the crane, hoist, and equipment parties, and frames the Privette questions while coordinating the comp lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was told workers\u2019 comp is all I can get. Is that right?',
        a: 'Not necessarily. Workers\u2019 comp is generally the only claim against your own employer, but a separate third-party claim can be brought against a non-employer whose negligence caused your injury \u2014 another trade, the general contractor, the owner, or an equipment manufacturer. That claim can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'The project is a public bridge or freeway job. Does that change the deadline?',
        a: 'It can. If a public entity owns the project, a claim can be governed by the Government Claims Act, which generally requires a written claim within six months \u2014 far shorter than the usual two years. Identifying a public-entity connection early is important on Oakland retrofit and infrastructure work.',
      },
      {
        q: 'A crane or hoist failed. Who is responsible?',
        a: 'Potentially the company that owned or operated the crane or hoist, and the manufacturer if a component was defective \u2014 all third-party claims separate from workers\u2019 comp. Port and retrofit work make Cal/OSHA compliance central, and a citation can help establish the standard of care.',
      },
      {
        q: 'If I sue a third party, what happens to my workers\u2019 comp?',
        a: 'They can proceed together, but the workers\u2019 comp insurer usually holds a lien to be reimbursed from any third-party recovery. That lien needs to be planned for and negotiated so you keep a fair share, which is why coordinating both claims from the start matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the third-party, public-entity, and Privette questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_CONSTRUCTION_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Construction Accident Claims',
    title: 'Long Beach Construction Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a Long Beach port, refinery, or industrial construction site? Workers\u2019 comp is not your only option \u2014 a third-party claim can pursue full damages comp does not pay, and marine-terminal work can fall under a different federal system.',
    psychology: 'I was hurt on a construction site in Long Beach, maybe at the port, and was told workers\u2019 comp is all I get.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach construction accident claim',
      'can i sue if hurt on a construction site california',
      'third party claim construction injury california',
      'refinery or port construction injury who is liable',
      'longshore harbor workers compensation construction',
    ],
    signals: [
      'Third-party (non-employer) claim',
      'Privette / Hooker / Kinsman',
      'Port / refinery / industrial',
      'Longshore (LHWCA) overlap',
      'Cal/OSHA safety orders',
      'Comp lien coordination',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s construction is dominated by the port, refineries and petrochemical facilities, and heavy industrial builds, with the layered contractor structure that creates third-party claims. The foundational point for an injured worker is the same: comp is not the only claim. ${THIRD_PARTY} On a Long Beach industrial or port site, the party at fault may be another sub, the general contractor, the site owner, or the maker of failed equipment such as a valve, crane, or pipe. ${PRIVETTE} A distinctive local wrinkle is that some marine-terminal and over-water work can fall under the federal Longshore and Harbor Workers\u2019 Compensation Act rather than California\u2019s state comp system \u2014 a different framework with its own rules \u2014 so identifying which system applies is an early, important question, though a third-party claim against a non-employer can still lie either way. ${OSHA} ${LIEN} Pure comparative negligence applies, and the ordinary two-year deadline (Code of Civil Procedure section 335.1) governs the third-party claim, with the six-month rule if a public entity is involved. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether the work was on a marine terminal or over water (LHWCA)',
        'Every company on the site, and which one you actually worked for',
        'Which non-employer\u2019s conduct or equipment caused the injury',
        'The specific equipment, valve, crane, or pipe that failed and its maker',
        'Who controlled the work area and the hazard (Privette exceptions)',
        'The Cal/OSHA investigation and any citations',
        'The workers\u2019 comp (or LHWCA) claim and any lien',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ checks early whether marine-terminal work falls under the federal Longshore Act, separates the comp claim from the third-party claim, preserves failed equipment for a product claim, and frames the Privette questions while coordinating any lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt on a marine terminal or over-water job. Is my claim the same as any other?',
        a: 'Not necessarily. Some marine-terminal and over-water work falls under the federal Longshore and Harbor Workers\u2019 Compensation Act rather than California\u2019s state comp system, which has its own rules. A third-party claim against a non-employer whose negligence caused the injury can still exist either way, but identifying which system governs is an important early step.',
      },
      {
        q: 'I was told workers\u2019 comp is all I can get. Is that right?',
        a: 'Not necessarily. Comp (state or federal Longshore) is generally the only claim against your own employer, but a separate third-party claim can be brought against a non-employer whose negligence caused your injury \u2014 another sub, the general contractor, the site owner, or an equipment manufacturer. That claim can pursue full damages, including pain and suffering that comp does not pay.',
      },
      {
        q: 'A defective valve or piece of equipment failed. Who is liable?',
        a: 'A defective valve, crane, pipe, or piece of equipment that fails can support a product-liability claim against its manufacturer or supplier \u2014 a third-party claim separate from workers\u2019 comp. Preserving the item rather than letting it be repaired or discarded is critical, because it is the evidence.',
      },
      {
        q: 'What is the Privette rule?',
        a: 'Privette generally says a party that hires an independent contractor is not liable to that contractor\u2019s employees, subject to exceptions \u2014 notably retained control that affirmatively contributed to the injury (Hooker) and a concealed hazard the hirer knew of (Kinsman). Which side of those lines your case falls on is often the whole dispute.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the third-party, Longshore, and Privette questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const constructionCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SAC_CONSTRUCTION_SLUG]: {
    scenario: `A worker was struck in a Sacramento highway work zone by a vehicle on a Caltrans project, and because a public entity owned the job, the six-month claims deadline applied. Filing the government claim in time preserved a third-party claim against the driver and the contractor. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the owner is public; identify the driver and companies.'],
      ['First days', 'The comp claim opened; public vs. private paths identified.'],
      ['First weeks', 'The six-month government claim filed if a public entity is involved.'],
      ['Longer term', 'The comp lien coordinated and treatment documented.'],
    ],
    severityLadder: [
      ['Public-entity path', 'A public owner triggers the six-month deadline.'],
      ['Third party', 'A non-employer or driver at fault opens a full claim.'],
      ['Employer only', 'Comp is the exclusive remedy against your employer.'],
      ['Privette fight', 'Control and hazard facts decide hirer liability.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public entity owns the project (six-month rule)',
      'Which non-employer or driver caused the injury',
      'Whether a Privette exception applies',
      'The Cal/OSHA findings and any citations',
      'How the comp lien is coordinated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'A public owner means six months, not two years.' },
      { label: 'Comp is not the end', copy: 'A third-party claim adds pain-and-suffering damages.' },
      { label: 'Work-zone drivers count', copy: 'A negligent driver is a separate defendant.' },
      { label: 'Plan the lien', copy: 'Coordinating comp protects the net recovery.' },
    ],
    insuranceProblems: [
      'The six-month public-entity deadline is missed.',
      'The worker is told comp is the only option.',
      'The work-zone driver is never pursued.',
      'The comp lien eats an unplanned share of recovery.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is the project owned by a public entity?' },
      { label: 'Step 2', question: 'Which company did you work for, and who else was on site?' },
      { label: 'Step 3', question: 'Did a driver or another company cause the injury?' },
      { label: 'Step 4', question: 'Has a comp claim been opened?' },
    ],
  },
  [FRESNO_CONSTRUCTION_SLUG]: {
    scenario: `A worker on a Route 99 project collapsed from heat illness on a job with no water or shade, and was told only comp applied. Cal/OSHA heat-illness citations against a responsible party and a third-party claim pursued the full damages comp does not pay. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note water, shade, and rest conditions; identify companies.'],
      ['First days', 'The comp claim opened; the third-party path identified.'],
      ['First weeks', 'The Cal/OSHA heat-illness investigation developed.'],
      ['Longer term', 'The comp lien coordinated and treatment documented.'],
    ],
    severityLadder: [
      ['Employer only', 'Comp is the exclusive remedy against your employer.'],
      ['Third party', 'A non-employer at fault opens a full-damages claim.'],
      ['Heat-illness order', 'A safety-order violation helps prove fault.'],
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
      'Whether heat-illness safety orders were followed',
      'Whether a Privette exception applies',
      'The Cal/OSHA findings and any citations',
      'How the comp lien is coordinated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Comp is not the end', copy: 'A third-party claim adds pain-and-suffering damages.' },
      { label: 'Heat orders matter', copy: 'A water/shade/rest violation helps prove fault.' },
      { label: 'Privette is the fight', copy: 'Control and concealed hazards decide hirer liability.' },
      { label: 'Plan the lien', copy: 'Coordinating comp protects the net recovery.' },
    ],
    insuranceProblems: [
      'The worker is told comp is the only option.',
      'The heat-illness failures are never examined.',
      'The at-fault non-employer is never identified.',
      'The comp lien eats an unplanned share of recovery.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were water, shade, and rest breaks provided?' },
      { label: 'Step 2', question: 'Which company did you work for, and who else was on site?' },
      { label: 'Step 3', question: 'Whose conduct or equipment caused the injury?' },
      { label: 'Step 4', question: 'Has a comp claim been opened?' },
    ],
  },
  [OAK_CONSTRUCTION_SLUG]: {
    scenario: `A worker on an Oakland freeway seismic-retrofit job was hurt when another trade\u2019s crane lift failed, and because a public entity owned the project, the six-month claims deadline applied. Filing in time preserved a third-party claim against the crane company and the manufacturer. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the public-entity owner; preserve the crane and identify companies.'],
      ['First days', 'The comp claim opened; public vs. private paths identified.'],
      ['First weeks', 'The six-month government claim filed; equipment facts developed.'],
      ['Longer term', 'The comp lien coordinated and treatment documented.'],
    ],
    severityLadder: [
      ['Public-entity path', 'A public owner triggers the six-month deadline.'],
      ['Third party', 'A non-employer at fault opens a full-damages claim.'],
      ['Crane / hoist', 'The equipment owner and maker may be liable.'],
      ['Privette fight', 'Control and hazard facts decide hirer liability.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public entity owns the project (six-month rule)',
      'Which non-employer\u2019s negligence caused the injury',
      'Whether a crane, hoist, or component failed',
      'Whether a Privette exception applies',
      'How the comp lien is coordinated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'A public owner means six months, not two years.' },
      { label: 'Equipment parties', copy: 'The crane or hoist owner and maker may be liable.' },
      { label: 'Comp is not the end', copy: 'A third-party claim adds pain-and-suffering damages.' },
      { label: 'Plan the lien', copy: 'Coordinating comp protects the net recovery.' },
    ],
    insuranceProblems: [
      'The six-month public-entity deadline is missed.',
      'The failed crane or hoist is removed before it is preserved.',
      'The worker is told comp is the only option.',
      'The comp lien eats an unplanned share of recovery.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is the project owned by a public entity?' },
      { label: 'Step 2', question: 'Did a crane, hoist, or component fail?' },
      { label: 'Step 3', question: 'Who controlled the work area and the hazard?' },
      { label: 'Step 4', question: 'Has a comp claim been opened?' },
    ],
  },
  [LB_CONSTRUCTION_SLUG]: {
    scenario: `A worker on a Long Beach marine terminal was hurt when a defective valve failed, and the case first had to sort out whether the federal Longshore Act or state comp applied. Either way, a third-party product claim against the valve maker pursued the full damages. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note whether the work was on a marine terminal; preserve the equipment.'],
      ['First days', 'Whether Longshore or state comp applies identified.'],
      ['First weeks', 'The third-party product path against the maker developed.'],
      ['Longer term', 'Any lien coordinated and treatment documented.'],
    ],
    severityLadder: [
      ['System question', 'Longshore (federal) or state comp governs.'],
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
      'Whether Longshore (federal) or state comp governs',
      'Which non-employer\u2019s negligence or equipment caused the injury',
      'Whether the failed equipment was preserved',
      'Whether a Privette exception applies',
      'The Cal/OSHA findings and any citations',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'System matters', copy: 'Longshore and state comp are different frameworks.' },
      { label: 'Comp is not the end', copy: 'A third-party claim adds pain-and-suffering damages.' },
      { label: 'Preserve equipment', copy: 'The failed valve or part proves the defect.' },
      { label: 'Privette is the fight', copy: 'Control and concealed hazards decide hirer liability.' },
    ],
    insuranceProblems: [
      'The wrong comp system is assumed and the claim stalls.',
      'The failed equipment is repaired before it is preserved.',
      'The worker is told comp is the only option.',
      'The at-fault non-employer is never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the work on a marine terminal or over water?' },
      { label: 'Step 2', question: 'What equipment, valve, or part failed?' },
      { label: 'Step 3', question: 'Which company did you work for, and who else was on site?' },
      { label: 'Step 4', question: 'Has the failed equipment been preserved?' },
    ],
  },
}
