import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, electrocution / electrical-injury practice area (batch 2):
 * location-specific guides for San Jose, Fresno, Long Beach, and Riverside,
 * extending the batch-1 hub (Los Angeles, San Diego, Oakland, Sacramento).
 *
 * Applied accurately (identical to batch 1):
 *  - Liability can rest with the utility, a property owner/contractor, or a
 *    product maker (strict liability).
 *  - Utilities owe a high duty; overhead clearances under CPUC General Order 95;
 *    a municipal utility is a public entity requiring a six-month claim (Gov. 911.2).
 *  - Electrical injuries are deceptive (cardiac, neurological, internal); early
 *    specialised evaluation matters.
 *  - The tool/equipment is evidence; utility records and Cal/OSHA reports matter;
 *    a workplace electrocution often supports a third-party claim beyond workers\u2019 comp.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Who is liable for an electrical injury, and which deadline applies, depend on facts a licensed California attorney should review promptly.'

const SOURCES =
  'Liability for an electrical injury can rest with more than one party: the utility, for unsafe or poorly maintained power lines or equipment; a property owner or contractor, for unsafe wiring or work performed near lines; or the maker of a defective tool, appliance, or wiring (a strict product-liability claim). Identifying every responsible party early is central.'

const UTILITY =
  'Utilities owe a high duty of care in handling electricity, and overhead line clearances and maintenance are governed by the California Public Utilities Commission\u2019s General Order 95. Where the responsible utility is a municipal one, the claim is against a public entity and requires a formal written claim within six months of the injury (Government Code section 911.2) \u2014 far shorter than the ordinary deadline.'

const INJURY =
  'Electrical injuries are uniquely deceptive: beyond visible burns, current can cause cardiac arrhythmia, neurological damage, and internal injury that is not apparent on the surface, and symptoms can develop later. Early specialised burn and cardiac evaluation \u2014 and documentation of every effect \u2014 is important both for health and for the claim.'

const EVIDENCE =
  'Electrical-injury evidence is perishable: the tool, appliance, or equipment involved should be preserved, the scene photographed, and the utility\u2019s line-clearance and maintenance records requested before they are lost. For a workplace incident, the Cal/OSHA investigation report is important, and a workplace electrocution often supports a third-party claim beyond workers\u2019 compensation.'

export const SJ_ELEC_SLUG = '/san-jose-electrocution-injury-claim'
export const FRESNO_ELEC_SLUG = '/fresno-electrocution-injury-claim'
export const LB_ELEC_SLUG = '/long-beach-electrocution-injury-claim'
export const RIV_ELEC_SLUG = '/riverside-electrocution-injury-claim'

export const electrocutionCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_ELEC_SLUG,
    category: 'Cities',
    cluster: 'San Jose Electrocution Injury Claims',
    title: 'San Jose Electrocution & Electrical Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Shocked or burned by electricity in San Jose? Liability can reach a utility, a property owner or contractor, or a defective-product maker \u2014 and a municipal utility has a six-month deadline.',
    psychology: 'I was electrocuted in San Jose and I do not know who is responsible or how serious the hidden injury is.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose electrocution injury lawyer',
      'power line contact injury claim california',
      'defective tool electrical shock lawsuit california',
      'workplace electrocution third party claim california',
      'municipal utility injury six month claim california',
    ],
    signals: [
      'Utility, owner, or product liability',
      'High duty; CPUC GO 95',
      'Municipal utility = 6-month claim',
      'Hidden cardiac / neuro injury',
      'Preserve tool & utility records',
      'Cal/OSHA + third-party at work',
    ],
    sections: {
      whyItMatters: `San Jose is served in part by a municipal electric utility, which makes early identification of the responsible provider \u2014 and its six-month deadline \u2014 critical, alongside construction and tech-facility electrical work. ${SOURCES} ${UTILITY} ${INJURY} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The source \u2014 power line, wiring, tool, or appliance',
        'Whether a municipal utility is involved',
        'The tool or equipment, preserved',
        'The scene, photographed',
        'The utility\u2019s line-clearance and maintenance records',
        'Whether it was a workplace incident (Cal/OSHA report)',
        'Early cardiac and neurological evaluation',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, flags a municipal utility\u2019s six-month deadline early, preserves the tool and utility records, and ensures the hidden cardiac and neurological effects are documented. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who can be liable for an electrical injury?',
        a: 'More than one party: the utility for unsafe or poorly maintained lines, a property owner or contractor for unsafe wiring or work near lines, or the maker of a defective tool or appliance through strict product liability.',
      },
      {
        q: 'The utility is a city department. Is the deadline different?',
        a: 'Yes. A municipal utility is a public entity, so the Government Claims Act requires a written claim within six months of the injury (Government Code 911.2) \u2014 far shorter than the ordinary deadline.',
      },
      {
        q: 'I only have small burns. Do I still need evaluation?',
        a: 'Yes. Electrical injuries are deceptive \u2014 current can cause cardiac arrhythmia, neurological damage, and internal injury not visible on the surface, and symptoms can develop later. Early specialised evaluation matters for health and the claim.',
      },
      {
        q: 'It happened at work. Is workers\u2019 comp my only option?',
        a: 'Not necessarily. A workplace electrocution often supports a third-party claim \u2014 against a utility, a general contractor, or a product maker \u2014 beyond workers\u2019 compensation. The Cal/OSHA report is important evidence.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the equipment and utility records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_ELEC_SLUG,
    category: 'Cities',
    cluster: 'Fresno Electrocution Injury Claims',
    title: 'Fresno Electrocution & Electrical Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Shocked or burned by electricity in Fresno? Liability can reach a utility, a property owner or contractor, or a defective-product maker \u2014 and hidden injuries can be severe.',
    psychology: 'I was electrocuted in Fresno and I do not know who is responsible or how serious the hidden injury is.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno electrocution injury lawyer',
      'power line contact injury claim california',
      'agricultural electrical injury california',
      'workplace electrocution third party claim california',
      'defective tool electrical shock lawsuit california',
    ],
    signals: [
      'Utility, owner, or product liability',
      'High duty; CPUC GO 95',
      'Farm / irrigation line contact',
      'Hidden cardiac / neuro injury',
      'Preserve tool & utility records',
      'Cal/OSHA + third-party at work',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s agricultural equipment, irrigation systems, and overhead lines near farm work create recurring high-voltage contact injuries, alongside construction and residential wiring hazards. ${SOURCES} ${UTILITY} ${INJURY} ${EVIDENCE} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The source \u2014 power line, wiring, tool, or equipment',
        'Whether farm equipment contacted an overhead line',
        'The tool or equipment, preserved',
        'The scene, photographed',
        'The utility\u2019s line-clearance and maintenance records',
        'Whether it was a workplace incident (Cal/OSHA report)',
        'Early cardiac and neurological evaluation',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, pursues the utility line-clearance records for overhead-contact cases, preserves the equipment, and ensures the hidden cardiac and neurological effects are documented. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who can be liable for an electrical injury?',
        a: 'More than one party: the utility for unsafe or poorly maintained lines, a property owner or contractor for unsafe wiring or work near lines, or the maker of a defective tool through strict product liability.',
      },
      {
        q: 'Farm equipment contacted an overhead line. Who is responsible?',
        a: 'Potentially the utility, if line clearances under CPUC General Order 95 were not met, along with a property owner or employer depending on the facts. The line-clearance and maintenance records are central.',
      },
      {
        q: 'I only have small burns. Do I still need evaluation?',
        a: 'Yes. Electrical injuries are deceptive \u2014 current can cause cardiac arrhythmia, neurological damage, and internal injury not visible on the surface. Early specialised evaluation matters.',
      },
      {
        q: 'It happened at work. Is workers\u2019 comp my only option?',
        a: 'Not necessarily. A workplace electrocution often supports a third-party claim beyond workers\u2019 compensation. The Cal/OSHA report is important evidence.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the equipment and utility records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_ELEC_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Electrocution Injury Claims',
    title: 'Long Beach Electrocution & Electrical Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Shocked or burned by electricity in Long Beach? Liability can reach a utility, a property owner or contractor, or a defective-product maker \u2014 and a municipal utility has a six-month deadline.',
    psychology: 'I was electrocuted in Long Beach and I do not know who is responsible or how serious the hidden injury is.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach electrocution injury lawyer',
      'power line contact injury claim california',
      'port crane electrical injury california',
      'workplace electrocution third party claim california',
      'municipal utility injury six month claim california',
    ],
    signals: [
      'Utility, owner, or product liability',
      'High duty; CPUC GO 95',
      'Municipal utility = 6-month claim',
      'Port / industrial electrical hazards',
      'Preserve tool & utility records',
      'Cal/OSHA + third-party at work',
    ],
    sections: {
      whyItMatters: `Long Beach runs its own municipal utilities, which makes early identification of the responsible provider \u2014 and its six-month deadline \u2014 critical, alongside port cranes, marine terminals, and industrial electrical hazards. ${SOURCES} ${UTILITY} ${INJURY} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The source \u2014 power line, wiring, tool, or equipment',
        'Whether a municipal utility is involved',
        'The tool or equipment, preserved',
        'The scene, photographed',
        'The utility\u2019s line-clearance and maintenance records',
        'Whether it was a workplace or port incident (Cal/OSHA report)',
        'Early cardiac and neurological evaluation',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, flags a municipal utility\u2019s six-month deadline early, preserves the equipment and utility records, and ensures the hidden cardiac and neurological effects are documented. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who can be liable for an electrical injury?',
        a: 'More than one party: the utility for unsafe or poorly maintained lines, a property owner or contractor for unsafe wiring or work near lines, or the maker of a defective tool through strict product liability.',
      },
      {
        q: 'The utility is a city department. Is the deadline different?',
        a: 'Yes. Long Beach operates municipal utilities, and a claim against a public entity requires a written claim within six months (Government Code 911.2) \u2014 far shorter than the ordinary deadline.',
      },
      {
        q: 'It happened at the port. Is workers\u2019 comp my only option?',
        a: 'Not necessarily. A workplace or port electrocution often supports a third-party claim \u2014 against a utility, a contractor, or an equipment maker \u2014 beyond workers\u2019 compensation. Maritime rules may also apply.',
      },
      {
        q: 'I only have small burns. Do I still need evaluation?',
        a: 'Yes. Electrical injuries are deceptive \u2014 current can cause cardiac arrhythmia, neurological damage, and internal injury not visible on the surface. Early specialised evaluation matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the equipment and utility records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIV_ELEC_SLUG,
    category: 'Cities',
    cluster: 'Riverside Electrocution Injury Claims',
    title: 'Riverside Electrocution & Electrical Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Shocked or burned by electricity in Riverside? Liability can reach a utility, a property owner or contractor, or a defective-product maker \u2014 and a municipal utility has a six-month deadline.',
    psychology: 'I was electrocuted in Riverside and I do not know who is responsible or how serious the hidden injury is.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside electrocution injury lawyer',
      'power line contact injury claim california',
      'warehouse electrical injury california',
      'workplace electrocution third party claim california',
      'municipal utility injury six month claim california',
    ],
    signals: [
      'Utility, owner, or product liability',
      'High duty; CPUC GO 95',
      'Municipal utility = 6-month claim',
      'Warehouse / construction hazards',
      'Preserve tool & utility records',
      'Cal/OSHA + third-party at work',
    ],
    sections: {
      whyItMatters: `Riverside runs its own municipal utility, and the region\u2019s warehouse construction and rapid development create recurring electrical hazards from wiring, tools, and overhead lines. ${SOURCES} ${UTILITY} ${INJURY} ${EVIDENCE} Civil cases are filed in Riverside County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The source \u2014 power line, wiring, tool, or equipment',
        'Whether a municipal utility is involved',
        'The tool or equipment, preserved',
        'The scene, photographed',
        'The utility\u2019s line-clearance and maintenance records',
        'Whether it was a workplace incident (Cal/OSHA report)',
        'Early cardiac and neurological evaluation',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, flags a municipal utility\u2019s six-month deadline early, preserves the equipment and utility records, and ensures the hidden cardiac and neurological effects are documented. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who can be liable for an electrical injury?',
        a: 'More than one party: the utility for unsafe or poorly maintained lines, a property owner or contractor for unsafe wiring or work near lines, or the maker of a defective tool through strict product liability.',
      },
      {
        q: 'The utility is a city department. Is the deadline different?',
        a: 'Yes. Riverside operates a municipal utility, and a claim against a public entity requires a written claim within six months (Government Code 911.2) \u2014 far shorter than the ordinary deadline.',
      },
      {
        q: 'It happened at a warehouse construction site. What applies?',
        a: 'A workplace electrocution often supports a third-party claim \u2014 against a utility, a general contractor, or an equipment maker \u2014 beyond workers\u2019 compensation. The Cal/OSHA report is important evidence.',
      },
      {
        q: 'I only have small burns. Do I still need evaluation?',
        a: 'Yes. Electrical injuries are deceptive \u2014 current can cause cardiac arrhythmia, neurological damage, and internal injury not visible on the surface. Early specialised evaluation matters.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the equipment and utility records so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const electrocutionCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_ELEC_SLUG]: {
    scenario: `A San Jose worker contacted an energized line served by a municipal utility. The six-month government claim controlled the deadline, and General Order 95 clearances framed the utility\u2019s duty. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get emergency and cardiac care; photograph the scene.'],
      ['First days', 'Confirm whether a municipal utility is involved.'],
      ['First weeks', 'File or preserve the six-month claim; pull records.'],
      ['Longer term', 'Assess third-party and product claims.'],
    ],
    severityLadder: [
      ['Sources', 'Utility, owner, or product.'],
      ['Municipal', 'Six-month claim applies.'],
      ['Hidden injury', 'Cardiac and neuro effects.'],
      ['Workplace', 'Third-party claim beyond comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Cardiac and burn care documented.' },
      { label: 'Imaging', copy: 'Neurological findings are captured.' },
      { label: 'Continuing care', copy: 'Delayed symptoms are tracked.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a municipal utility is involved',
      'Whether the six-month deadline was met',
      'Whether GO 95 clearances were breached',
      'Whether a third-party claim applies',
      'Whether hidden injuries are documented',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Sources', copy: 'Several parties can be liable.' },
      { label: 'Deadline', copy: 'A municipal utility shortens it.' },
      { label: 'Hidden injury', copy: 'Cardiac and neuro effects matter.' },
      { label: 'Workplace', copy: 'A third-party claim can add recovery.' },
    ],
    insuranceProblems: [
      'A municipal utility\u2019s six-month deadline is missed.',
      'The line-clearance records are never obtained.',
      'Hidden cardiac injury is undocumented.',
      'Only workers\u2019 comp is pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the source of the shock?' },
      { label: 'Step 2', question: 'Is a municipal utility involved?' },
      { label: 'Step 3', question: 'Did it happen at work?' },
      { label: 'Step 4', question: 'When did the injury happen?' },
    ],
  },
  [FRESNO_ELEC_SLUG]: {
    scenario: `A Fresno farmworker\u2019s equipment contacted an overhead line that failed General Order 95 clearances. The utility line-clearance records established the breach, alongside a third-party claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get cardiac and burn care; photograph the line.'],
      ['First days', 'Preserve the equipment; note the line owner.'],
      ['First weeks', 'Request GO 95 clearance and maintenance records.'],
      ['Longer term', 'Assess third-party and employer claims.'],
    ],
    severityLadder: [
      ['Sources', 'Utility, owner, or product.'],
      ['Overhead line', 'GO 95 clearances apply.'],
      ['Hidden injury', 'Cardiac and neuro effects.'],
      ['Workplace', 'Third-party claim beyond comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Cardiac and burn care documented.' },
      { label: 'Imaging', copy: 'Neurological findings are captured.' },
      { label: 'Continuing care', copy: 'Delayed symptoms are tracked.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether GO 95 clearances were breached',
      'Whether the equipment was preserved',
      'Whether a third-party claim applies',
      'Whether hidden injuries are documented',
      'Which utility owns the line',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'GO 95', copy: 'Clearance breaches show fault.' },
      { label: 'Sources', copy: 'Utility and employer can both be liable.' },
      { label: 'Hidden injury', copy: 'Cardiac and neuro effects matter.' },
      { label: 'Workplace', copy: 'A third-party claim can add recovery.' },
    ],
    insuranceProblems: [
      'The line-clearance records are never obtained.',
      'The equipment is not preserved.',
      'Hidden cardiac injury is undocumented.',
      'Only workers\u2019 comp is pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did equipment contact an overhead line?' },
      { label: 'Step 2', question: 'Which utility owns the line?' },
      { label: 'Step 3', question: 'Did it happen at work?' },
      { label: 'Step 4', question: 'When did the injury happen?' },
    ],
  },
  [LB_ELEC_SLUG]: {
    scenario: `A Long Beach port worker was shocked by a defective crane control served by the city utility. Both a product claim and a six-month municipal claim were in play, with maritime rules also considered. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get cardiac and burn care; photograph the equipment.'],
      ['First days', 'Preserve the control unit; note the utility.'],
      ['First weeks', 'File or preserve any six-month claim; pull records.'],
      ['Longer term', 'Assess product, third-party, and maritime claims.'],
    ],
    severityLadder: [
      ['Sources', 'Utility, owner, or product.'],
      ['Municipal', 'Six-month claim applies.'],
      ['Product', 'A defective control can be strict-liable.'],
      ['Workplace', 'Third-party / maritime beyond comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Cardiac and burn care documented.' },
      { label: 'Imaging', copy: 'Neurological findings are captured.' },
      { label: 'Continuing care', copy: 'Delayed symptoms are tracked.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a municipal utility is involved',
      'Whether the control unit was preserved',
      'Whether a product defect is shown',
      'Whether a maritime or third-party claim applies',
      'Whether hidden injuries are documented',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Deadline', copy: 'A municipal utility shortens it.' },
      { label: 'Product', copy: 'A defective control can be strict-liable.' },
      { label: 'Workplace', copy: 'Third-party or maritime claims can add.' },
      { label: 'Hidden injury', copy: 'Cardiac and neuro effects matter.' },
    ],
    insuranceProblems: [
      'A municipal utility\u2019s six-month deadline is missed.',
      'The defective control is not preserved.',
      'Hidden cardiac injury is undocumented.',
      'Only workers\u2019 comp is pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the source of the shock?' },
      { label: 'Step 2', question: 'Is a municipal utility involved?' },
      { label: 'Step 3', question: 'Did it happen at the port or at work?' },
      { label: 'Step 4', question: 'When did the injury happen?' },
    ],
  },
  [RIV_ELEC_SLUG]: {
    scenario: `A Riverside warehouse worker was shocked by unsafe temporary wiring on a construction site served by the municipal utility. A third-party contractor claim ran alongside the six-month claim analysis. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get cardiac and burn care; photograph the wiring.'],
      ['First days', 'Preserve the wiring; identify the contractor.'],
      ['First weeks', 'File or preserve any six-month claim; get the Cal/OSHA report.'],
      ['Longer term', 'Assess third-party and product claims.'],
    ],
    severityLadder: [
      ['Sources', 'Utility, contractor, or product.'],
      ['Municipal', 'Six-month claim can apply.'],
      ['Contractor', 'Unsafe wiring shows fault.'],
      ['Workplace', 'Third-party claim beyond comp.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Cardiac and burn care documented.' },
      { label: 'Imaging', copy: 'Neurological findings are captured.' },
      { label: 'Continuing care', copy: 'Delayed symptoms are tracked.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether unsafe wiring shows contractor fault',
      'Whether a municipal utility is involved',
      'Whether a third-party claim applies',
      'Whether the Cal/OSHA report supports it',
      'Whether hidden injuries are documented',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Contractor', copy: 'Unsafe wiring shows fault.' },
      { label: 'Deadline', copy: 'A municipal utility can shorten it.' },
      { label: 'Workplace', copy: 'A third-party claim can add recovery.' },
      { label: 'Hidden injury', copy: 'Cardiac and neuro effects matter.' },
    ],
    insuranceProblems: [
      'The unsafe wiring is not preserved.',
      'A municipal utility\u2019s deadline is missed.',
      'Hidden cardiac injury is undocumented.',
      'Only workers\u2019 comp is pursued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the source of the shock?' },
      { label: 'Step 2', question: 'Was there a contractor on site?' },
      { label: 'Step 3', question: 'Is a municipal utility involved?' },
      { label: 'Step 4', question: 'When did the injury happen?' },
    ],
  },
}
