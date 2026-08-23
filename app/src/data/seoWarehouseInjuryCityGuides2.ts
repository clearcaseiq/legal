import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, warehouse / fulfillment-center injury practice area (batch 2):
 * location-specific guides for Ontario, Fontana, Bakersfield, and Tracy,
 * extending the batch-1 hub (Riverside, San Bernardino, Stockton, Fresno).
 *
 * These are among California\u2019s densest logistics corridors, so the workers\u2019-comp
 * exclusivity vs. third-party-claim distinction is the whole game.
 *
 * Local context, genuine rather than interpolated:
 *  - Ontario: an Inland Empire logistics core around Ontario International Airport
 *    with massive e-commerce fulfillment and heavy temp-agency staffing.
 *  - Fontana: a rail- and freeway-served warehouse hub with major distribution
 *    centers and constant forklift and truck-dock activity.
 *  - Bakersfield: a Central Valley distribution point on I-5/Highway 99 serving
 *    agriculture and cross-state freight, with cold-storage and dock hazards.
 *  - Tracy: a Northern San Joaquin Valley fulfillment hub near the I-5/I-205/I-580
 *    junction with large e-commerce warehouses and heavy staffing-agency use.
 *
 * Applied accurately (identical to batch 1):
 *  - Workers\u2019 comp exclusive against the employer (Labor Code 3602); third-party
 *    claims against non-employers can recover what comp does not.
 *  - Third parties: equipment manufacturers, other contractors, property owners,
 *    trucking/delivery companies.
 *  - Strict product liability for defective forklifts, conveyors, balers, etc.
 *  - Special-employer doctrine complicates temp/staffing arrangements.
 *  - Preserve the machine and Cal/OSHA records; comp lien; comparative negligence.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a third-party claim exists alongside workers\u2019 compensation, and who counts as an employer versus a third party, depend on facts a licensed California attorney should review promptly.'

const COMP_EXCLUSIVE =
  'Workers\u2019 compensation is generally the exclusive remedy against your employer (Labor Code section 3602), meaning you usually cannot sue the employer directly regardless of fault. But comp does not bar a separate claim against a negligent third party who is not your employer \u2014 and that third-party claim can recover damages, such as full pain and suffering, that workers\u2019 compensation does not.'

const THIRD_PARTY =
  'A third-party claim can run against the manufacturer of a defective forklift, conveyor, pallet jack, or machine; a different contractor working on site; the owner of the property; or a delivery or trucking company whose driver caused the injury. Identifying every non-employer party is the key to a claim beyond workers\u2019 compensation.'

const PRODUCT =
  'Where defective equipment \u2014 a forklift, conveyor, pallet jack, baler, or automated system \u2014 caused the injury, its manufacturer or distributor can be strictly liable for a design or manufacturing defect or a failure to warn, without proof of ordinary negligence. Preserving the machine and its maintenance history is essential.'

const STAFFING =
  'Staffing- and temp-agency arrangements are common in warehouses and fulfillment centers, and they complicate who is an \u201cemployer.\u201d Under the special-employer doctrine, the business where you work may be treated as an employer for comp purposes, or may be a third party you can pursue \u2014 an analysis that must be done early and correctly.'

const EVIDENCE =
  'Warehouse cases turn on time-sensitive evidence: the machine or equipment itself, which should be preserved before it is repaired or returned; its maintenance and inspection logs; and any Cal/OSHA citation and inspection records documenting the hazard. A third-party recovery is also subject to the workers\u2019-compensation lien, which must be negotiated, and pure comparative negligence applies.'

export const ONT_WHSE_SLUG = '/ontario-warehouse-injury-claim'
export const FON_WHSE_SLUG = '/fontana-warehouse-injury-claim'
export const BAK_WHSE_SLUG = '/bakersfield-warehouse-injury-claim'
export const TRACY_WHSE_SLUG = '/tracy-warehouse-injury-claim'

export const warehouseInjuryCityGuidePages2: LandingPage[] = [
  {
    slug: ONT_WHSE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Ontario Warehouse & Fulfillment Injury Claims',
    title: 'Ontario Warehouse & Fulfillment Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in an Ontario warehouse or fulfillment center? Workers\u2019 comp may not be your only remedy \u2014 a claim against an equipment maker or other non-employer can recover much more.',
    psychology: 'I was hurt in an Ontario warehouse and I was told workers\u2019 comp is all I get.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'ontario warehouse injury lawyer',
      'forklift accident third party claim california',
      'warehouse injury beyond workers comp california',
      'fulfillment center injury lawsuit california',
      'defective equipment injury claim california',
    ],
    signals: [
      'Comp exclusivity (3602)',
      'Third-party claims',
      'Defective-equipment product liability',
      'Temp / special-employer analysis',
      'Preserve machine & Cal/OSHA records',
      'Comp lien & comparative fault',
    ],
    sections: {
      whyItMatters: `Ontario is an Inland Empire logistics core around the airport, packed with e-commerce fulfillment and heavy temp-agency staffing \u2014 conditions where forklift, conveyor, and dock injuries are common and where a third-party claim beyond workers\u2019 compensation is frequently available. ${COMP_EXCLUSIVE} ${THIRD_PARTY} ${PRODUCT} ${STAFFING} ${EVIDENCE} Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'The equipment or hazard that caused the injury',
        'The manufacturer and model of any machine involved',
        'Whether a temp or staffing agency employed you',
        'Every non-employer on site (contractors, owner, trucking)',
        'The machine\u2019s maintenance and inspection logs',
        'Any Cal/OSHA citation or inspection record',
        'The workers\u2019-comp claim and any lien',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the Ontario employer (workers\u2019 comp) from every non-employer third party you can pursue, preserves the machine and Cal/OSHA records, and runs the special-employer analysis that temp staffing requires. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have a workers\u2019 comp claim. Can I still sue someone?',
        a: 'Possibly. Workers\u2019 comp is generally the exclusive remedy against your employer, but it does not bar a separate claim against a negligent third party who is not your employer \u2014 such as an equipment manufacturer, another contractor, or a trucking company. That claim can recover damages comp does not, including full pain and suffering.',
      },
      {
        q: 'A forklift or conveyor malfunctioned and hurt me. What can I do?',
        a: 'Where defective equipment caused the injury, its manufacturer or distributor can be strictly liable for a design or manufacturing defect or a failure to warn, without proof of ordinary negligence. Preserving the machine and its maintenance history is essential.',
      },
      {
        q: 'I work through a temp agency. Does that change things?',
        a: 'It can. Staffing arrangements complicate who is an employer. Under the special-employer doctrine, the warehouse may be treated as an employer for comp purposes or may be a third party you can pursue. That analysis must be done early and correctly.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The machine itself, preserved before it is repaired or returned; its maintenance and inspection logs; and any Cal/OSHA citation records documenting the hazard. This evidence is time-sensitive, so acting quickly is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the employer-vs-third-party analysis and the evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FON_WHSE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fontana Warehouse & Fulfillment Injury Claims',
    title: 'Fontana Warehouse & Fulfillment Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a Fontana warehouse or distribution center? Workers\u2019 comp may not be your only remedy \u2014 a claim against an equipment maker or other non-employer can recover much more.',
    psychology: 'I was hurt in a Fontana warehouse and I was told workers\u2019 comp is all I get.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fontana warehouse injury lawyer',
      'forklift accident third party claim california',
      'warehouse injury beyond workers comp california',
      'distribution center injury lawsuit california',
      'defective equipment injury claim california',
    ],
    signals: [
      'Comp exclusivity (3602)',
      'Third-party claims',
      'Defective-equipment product liability',
      'Truck-dock & rail hazards',
      'Preserve machine & Cal/OSHA records',
      'Comp lien & comparative fault',
    ],
    sections: {
      whyItMatters: `Fontana is a rail- and freeway-served warehouse hub with major distribution centers and constant forklift and truck-dock activity \u2014 where dock, struck-by, and equipment injuries are common and a third-party claim beyond workers\u2019 compensation is frequently available. ${COMP_EXCLUSIVE} ${THIRD_PARTY} ${PRODUCT} ${STAFFING} ${EVIDENCE} Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'The equipment or hazard that caused the injury',
        'The manufacturer and model of any machine involved',
        'Whether a truck, driver, or dock operation was involved',
        'Every non-employer on site (contractors, owner, trucking)',
        'The machine\u2019s maintenance and inspection logs',
        'Any Cal/OSHA citation or inspection record',
        'The workers\u2019-comp claim and any lien',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the Fontana employer (workers\u2019 comp) from every non-employer third party you can pursue \u2014 including trucking companies at the dock \u2014 preserves the machine and Cal/OSHA records, and runs the special-employer analysis. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have a workers\u2019 comp claim. Can I still sue someone?',
        a: 'Possibly. Workers\u2019 comp is generally the exclusive remedy against your employer, but it does not bar a separate claim against a negligent third party who is not your employer \u2014 such as an equipment manufacturer, another contractor, or a trucking company. That claim can recover damages comp does not.',
      },
      {
        q: 'I was hit by a truck or at a loading dock. Who can I pursue?',
        a: 'A delivery or trucking company whose driver caused the injury is a classic third party you can pursue alongside workers\u2019 comp. Identifying the trucking company, its driver, and its insurer early is important.',
      },
      {
        q: 'A forklift or conveyor malfunctioned and hurt me. What can I do?',
        a: 'Where defective equipment caused the injury, its manufacturer or distributor can be strictly liable for a design or manufacturing defect or a failure to warn, without proof of ordinary negligence. Preserving the machine and its maintenance history is essential.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The machine itself, preserved before it is repaired or returned; its maintenance and inspection logs; and any Cal/OSHA citation records documenting the hazard. This evidence is time-sensitive, so acting quickly is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the employer-vs-third-party analysis and the evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAK_WHSE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Warehouse & Distribution Injury Claims',
    title: 'Bakersfield Warehouse & Distribution Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a Bakersfield warehouse, cold-storage, or distribution center? Workers\u2019 comp may not be your only remedy \u2014 a claim against a non-employer can recover much more.',
    psychology: 'I was hurt in a Bakersfield warehouse and I was told workers\u2019 comp is all I get.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield warehouse injury lawyer',
      'forklift accident third party claim california',
      'warehouse injury beyond workers comp california',
      'cold storage injury lawsuit california',
      'defective equipment injury claim california',
    ],
    signals: [
      'Comp exclusivity (3602)',
      'Third-party claims',
      'Defective-equipment product liability',
      'Cold-storage & dock hazards',
      'Preserve machine & Cal/OSHA records',
      'Comp lien & comparative fault',
    ],
    sections: {
      whyItMatters: `Bakersfield is a Central Valley distribution point on I-5 and Highway 99 serving agriculture and cross-state freight, with cold-storage and dock hazards on top of ordinary forklift and conveyor risks \u2014 conditions where a third-party claim beyond workers\u2019 compensation is frequently available. ${COMP_EXCLUSIVE} ${THIRD_PARTY} ${PRODUCT} ${STAFFING} ${EVIDENCE} Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'The equipment or hazard that caused the injury',
        'The manufacturer and model of any machine involved',
        'Whether cold-storage conditions contributed',
        'Every non-employer on site (contractors, owner, trucking)',
        'The machine\u2019s maintenance and inspection logs',
        'Any Cal/OSHA citation or inspection record',
        'The workers\u2019-comp claim and any lien',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the Bakersfield employer (workers\u2019 comp) from every non-employer third party you can pursue, preserves the machine and Cal/OSHA records, and runs the special-employer analysis that temp staffing requires. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have a workers\u2019 comp claim. Can I still sue someone?',
        a: 'Possibly. Workers\u2019 comp is generally the exclusive remedy against your employer, but it does not bar a separate claim against a negligent third party who is not your employer \u2014 such as an equipment manufacturer, another contractor, or a trucking company. That claim can recover damages comp does not.',
      },
      {
        q: 'A forklift or conveyor malfunctioned and hurt me. What can I do?',
        a: 'Where defective equipment caused the injury, its manufacturer or distributor can be strictly liable for a design or manufacturing defect or a failure to warn, without proof of ordinary negligence. Preserving the machine and its maintenance history is essential.',
      },
      {
        q: 'I work through a temp agency. Does that change things?',
        a: 'It can. Staffing arrangements complicate who is an employer. Under the special-employer doctrine, the warehouse may be treated as an employer for comp purposes or may be a third party you can pursue. That analysis must be done early and correctly.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The machine itself, preserved before it is repaired or returned; its maintenance and inspection logs; and any Cal/OSHA citation records documenting the hazard. This evidence is time-sensitive, so acting quickly is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the employer-vs-third-party analysis and the evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: TRACY_WHSE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Tracy Warehouse & Fulfillment Injury Claims',
    title: 'Tracy Warehouse & Fulfillment Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a Tracy warehouse or fulfillment center? Workers\u2019 comp may not be your only remedy \u2014 a claim against an equipment maker or other non-employer can recover much more.',
    psychology: 'I was hurt in a Tracy warehouse and I was told workers\u2019 comp is all I get.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'tracy warehouse injury lawyer',
      'forklift accident third party claim california',
      'warehouse injury beyond workers comp california',
      'fulfillment center injury lawsuit california',
      'defective equipment injury claim california',
    ],
    signals: [
      'Comp exclusivity (3602)',
      'Third-party claims',
      'Defective-equipment product liability',
      'Temp / special-employer analysis',
      'Preserve machine & Cal/OSHA records',
      'Comp lien & comparative fault',
    ],
    sections: {
      whyItMatters: `Tracy is a Northern San Joaquin Valley fulfillment hub near the I-5/I-205/I-580 junction, dense with large e-commerce warehouses and heavy staffing-agency use \u2014 conditions where forklift, conveyor, and struck-by injuries are common and a third-party claim beyond workers\u2019 compensation is frequently available. ${COMP_EXCLUSIVE} ${THIRD_PARTY} ${PRODUCT} ${STAFFING} ${EVIDENCE} Civil cases are filed in San Joaquin County Superior Court.`,
      whatToTrack: [
        'The equipment or hazard that caused the injury',
        'The manufacturer and model of any machine involved',
        'Whether a temp or staffing agency employed you',
        'Every non-employer on site (contractors, owner, trucking)',
        'The machine\u2019s maintenance and inspection logs',
        'Any Cal/OSHA citation or inspection record',
        'The workers\u2019-comp claim and any lien',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the Tracy employer (workers\u2019 comp) from every non-employer third party you can pursue, preserves the machine and Cal/OSHA records, and runs the special-employer analysis that temp staffing requires. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I already have a workers\u2019 comp claim. Can I still sue someone?',
        a: 'Possibly. Workers\u2019 comp is generally the exclusive remedy against your employer, but it does not bar a separate claim against a negligent third party who is not your employer \u2014 such as an equipment manufacturer, another contractor, or a trucking company. That claim can recover damages comp does not, including full pain and suffering.',
      },
      {
        q: 'I work through a temp agency. Does that change things?',
        a: 'It can. Staffing arrangements complicate who is an employer. Under the special-employer doctrine, the warehouse may be treated as an employer for comp purposes or may be a third party you can pursue. That analysis must be done early and correctly.',
      },
      {
        q: 'A forklift or conveyor malfunctioned and hurt me. What can I do?',
        a: 'Where defective equipment caused the injury, its manufacturer or distributor can be strictly liable for a design or manufacturing defect or a failure to warn, without proof of ordinary negligence. Preserving the machine and its maintenance history is essential.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The machine itself, preserved before it is repaired or returned; its maintenance and inspection logs; and any Cal/OSHA citation records documenting the hazard. This evidence is time-sensitive, so acting quickly is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the employer-vs-third-party analysis and the evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const warehouseInjuryCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [ONT_WHSE_SLUG]: {
    scenario: `An Ontario fulfillment worker employed by a temp agency was crushed by a malfunctioning conveyor. The equipment maker and the warehouse (as a possible third party) opened recovery well beyond comp. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the machine; photograph the hazard.'],
      ['First days', 'Identify the employer, the agency, and every third party.'],
      ['First weeks', 'Pull maintenance logs and Cal/OSHA records.'],
      ['Longer term', 'Third-party liability and the comp lien developed.'],
    ],
    severityLadder: [
      ['Comp vs. third party', 'Comp bars the employer, not others.'],
      ['Defective equipment', 'The maker can be strictly liable.'],
      ['Staffing', 'Special-employer analysis is needed.'],
      ['Preserve', 'The machine and logs are time-sensitive.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging/surgery', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a non-employer third party is identified',
      'Whether the equipment was defective',
      'How the special-employer analysis resolves',
      'Whether the machine and logs were preserved',
      'How the comp lien is negotiated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Third party is the key', copy: 'It recovers what comp cannot.' },
      { label: 'Product liability', copy: 'No ordinary-negligence proof needed.' },
      { label: 'Preserve the machine', copy: 'It can be repaired or returned.' },
      { label: 'Lien negotiation', copy: 'The comp lien must be resolved.' },
    ],
    insuranceProblems: [
      'Only the workers\u2019-comp claim is pursued.',
      'The defective machine is repaired or returned before inspection.',
      'The special-employer analysis is never done.',
      'Cal/OSHA and maintenance records are never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What equipment or hazard caused the injury?' },
      { label: 'Step 2', question: 'Who employed you \u2014 a temp agency?' },
      { label: 'Step 3', question: 'Was the machine preserved?' },
      { label: 'Step 4', question: 'Which non-employers were on site?' },
    ],
  },
  [FON_WHSE_SLUG]: {
    scenario: `A Fontana dock worker was struck by a delivery truck backing to a bay. The trucking company \u2014 a non-employer third party \u2014 was pursued alongside the comp claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Identify the truck and driver; photograph the dock.'],
      ['First days', 'Identify the employer and every third party.'],
      ['First weeks', 'Pull dock, camera, and Cal/OSHA records.'],
      ['Longer term', 'Third-party liability and the comp lien developed.'],
    ],
    severityLadder: [
      ['Comp vs. third party', 'Comp bars the employer, not the trucker.'],
      ['Trucking company', 'A classic third party at the dock.'],
      ['Equipment', 'A defective machine can add a defendant.'],
      ['Preserve', 'Footage and logs are time-sensitive.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging/surgery', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a trucking company or other third party is identified',
      'Whether dock camera footage was preserved',
      'Whether equipment defects contributed',
      'How the comp lien is negotiated',
      'Comparative-fault exposure',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Trucker is a third party', copy: 'Pursue it alongside comp.' },
      { label: 'Preserve footage', copy: 'Dock cameras overwrite quickly.' },
      { label: 'Third party is the key', copy: 'It recovers what comp cannot.' },
      { label: 'Lien negotiation', copy: 'The comp lien must be resolved.' },
    ],
    insuranceProblems: [
      'Only the workers\u2019-comp claim is pursued.',
      'The trucking company is never identified.',
      'Dock camera footage is overwritten before it is requested.',
      'Cal/OSHA and maintenance records are never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a truck or dock operation involved?' },
      { label: 'Step 2', question: 'Can the trucking company be identified?' },
      { label: 'Step 3', question: 'Is there dock camera footage to preserve?' },
      { label: 'Step 4', question: 'Which non-employers were on site?' },
    ],
  },
  [BAK_WHSE_SLUG]: {
    scenario: `A Bakersfield cold-storage worker was injured when a pallet jack failed on an icy floor. The equipment maker and the property owner opened recovery beyond the comp claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the equipment; photograph the conditions.'],
      ['First days', 'Identify the employer and every third party.'],
      ['First weeks', 'Pull maintenance logs and Cal/OSHA records.'],
      ['Longer term', 'Third-party liability and the comp lien developed.'],
    ],
    severityLadder: [
      ['Comp vs. third party', 'Comp bars the employer, not others.'],
      ['Defective equipment', 'The maker can be strictly liable.'],
      ['Property owner', 'May be a third party.'],
      ['Preserve', 'The equipment and logs are time-sensitive.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging/surgery', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a non-employer third party is identified',
      'Whether the equipment was defective',
      'Whether the property owner is a third party',
      'Whether the equipment and logs were preserved',
      'How the comp lien is negotiated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Third party is the key', copy: 'It recovers what comp cannot.' },
      { label: 'Product liability', copy: 'No ordinary-negligence proof needed.' },
      { label: 'Preserve the equipment', copy: 'It can be repaired or returned.' },
      { label: 'Lien negotiation', copy: 'The comp lien must be resolved.' },
    ],
    insuranceProblems: [
      'Only the workers\u2019-comp claim is pursued.',
      'The defective equipment is repaired or returned before inspection.',
      'The property owner is never evaluated as a third party.',
      'Cal/OSHA and maintenance records are never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What equipment or hazard caused the injury?' },
      { label: 'Step 2', question: 'Did cold-storage conditions contribute?' },
      { label: 'Step 3', question: 'Was the equipment preserved?' },
      { label: 'Step 4', question: 'Which non-employers were on site?' },
    ],
  },
  [TRACY_WHSE_SLUG]: {
    scenario: `A Tracy e-commerce worker employed by a staffing agency was injured by an automated sortation system. The system\u2019s manufacturer and the warehouse operator opened recovery beyond comp. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the machine; photograph the hazard.'],
      ['First days', 'Identify the employer, the agency, and every third party.'],
      ['First weeks', 'Pull maintenance logs and Cal/OSHA records.'],
      ['Longer term', 'Third-party liability and the comp lien developed.'],
    ],
    severityLadder: [
      ['Comp vs. third party', 'Comp bars the employer, not others.'],
      ['Defective equipment', 'The maker can be strictly liable.'],
      ['Staffing', 'Special-employer analysis is needed.'],
      ['Preserve', 'The machine and logs are time-sensitive.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging/surgery', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a non-employer third party is identified',
      'Whether the equipment was defective',
      'How the special-employer analysis resolves',
      'Whether the machine and logs were preserved',
      'How the comp lien is negotiated',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Third party is the key', copy: 'It recovers what comp cannot.' },
      { label: 'Product liability', copy: 'No ordinary-negligence proof needed.' },
      { label: 'Preserve the machine', copy: 'It can be repaired or returned.' },
      { label: 'Lien negotiation', copy: 'The comp lien must be resolved.' },
    ],
    insuranceProblems: [
      'Only the workers\u2019-comp claim is pursued.',
      'The defective machine is repaired or returned before inspection.',
      'The special-employer analysis is never done.',
      'Cal/OSHA and maintenance records are never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What equipment or hazard caused the injury?' },
      { label: 'Step 2', question: 'Who employed you \u2014 a staffing agency?' },
      { label: 'Step 3', question: 'Was the machine preserved?' },
      { label: 'Step 4', question: 'Which non-employers were on site?' },
    ],
  },
}
