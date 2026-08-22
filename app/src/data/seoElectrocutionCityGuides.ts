import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, electrocution / power-line & utility-injury practice area:
 * location-specific guides for Los Angeles, San Diego, Oakland, and Sacramento,
 * each anchored to the utility that serves the area.
 *
 * An electrical-injury claim is distinct because liability can rest with a
 * utility held to a high duty of care, a property owner or contractor, or a
 * product maker, and because a public/municipal utility can trigger a short
 * government-claim deadline. The injuries are also uniquely deceptive.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: served by Southern California Edison and, within the city, the
 *    municipal Los Angeles Department of Water and Power (a public entity).
 *  - San Diego: served by San Diego Gas & Electric.
 *  - Oakland: served by Pacific Gas & Electric.
 *  - Sacramento: served by the municipal Sacramento Municipal Utility District
 *    (a public entity).
 *
 * Applied accurately:
 *  - Liability can rest with the utility (unsafe or poorly maintained power
 *    lines or equipment), a property owner or contractor (unsafe wiring or work
 *    performed near lines), or the maker of a defective tool, appliance, or
 *    wiring (a strict product-liability claim).
 *  - Utilities owe a high duty of care around electricity, and overhead line
 *    clearances and maintenance are governed by the California Public Utilities
 *    Commission\u2019s General Order 95. A claim against a municipal utility (such as
 *    LADWP or SMUD) is a claim against a public entity, requiring a formal claim
 *    within six months (Government Code section 911.2).
 *  - Electrical injuries are deceptive: they cause deep burns, cardiac and
 *    neurological damage, and internal injury that may not be visible, so early
 *    specialised burn and cardiac evaluation is important.
 *  - The evidence is perishable: the tool or equipment involved, scene
 *    photographs, and the utility\u2019s line-clearance and maintenance records
 *    should be secured, and for a workplace incident the Cal/OSHA report obtained.
 *    A workplace electrocution often has a third-party claim beyond workers\u2019
 *    compensation. The ordinary deadline is two years (Code of Civil Procedure
 *    section 335.1).
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

export const LA_ELEC_SLUG = '/los-angeles-electrocution-injury-claim'
export const SD_ELEC_SLUG = '/san-diego-electrocution-injury-claim'
export const OAK_ELEC_SLUG = '/oakland-electrocution-injury-claim'
export const SAC_ELEC_SLUG = '/sacramento-electrocution-injury-claim'

export const electrocutionCityGuidePages: LandingPage[] = [
  {
    slug: LA_ELEC_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Electrocution & Power-Line Injury Claims',
    title: 'Los Angeles Electrocution & Power-Line Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Electrocuted or burned by a power line, wiring, or tool in LA? A utility, contractor, or maker may be liable \u2014 and a municipal utility carries a six-month deadline.',
    psychology: 'I was badly shocked or burned by electricity in LA and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles electrocution injury lawyer',
      'power line accident claim california',
      'electrical burn lawsuit california',
      'ladwp injury claim california',
      'construction electrocution attorney california',
    ],
    signals: [
      'Utility, contractor, or product liability',
      'High duty of care (GO 95)',
      'Municipal utility six-month claim (911.2)',
      'Hidden cardiac & internal injury',
      'Preserve the tool & scene',
      'Third-party claim beyond comp',
    ],
    sections: {
      whyItMatters: `Los Angeles is served by Southern California Edison and, within the city, the municipal Los Angeles Department of Water and Power \u2014 which matters because a claim involving the municipal utility is a public-entity claim with a much shorter deadline. ${SOURCES} ${UTILITY} ${INJURY} ${EVIDENCE} The ordinary deadline is two years. Civil cases are filed in Los Angeles County Superior Court after any required claim.`,
      whatToTrack: [
        'Whether a utility line, wiring, or a tool caused the injury',
        'Whether the utility involved is SCE or the municipal LADWP',
        'The tool or equipment involved \u2014 preserve it',
        'Scene photographs and any line-clearance issues',
        'The utility\u2019s maintenance and clearance records',
        'Whether it was a workplace incident (Cal/OSHA, third-party claim)',
        'The date of injury, which starts any six-month clock',
        'Specialised burn and cardiac evaluation',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether an LA electrical injury involves SCE or the municipal LADWP \u2014 which decides the deadline \u2014 preserves the tool and scene evidence, requests the utility records, and flags any third-party workplace claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who can be responsible for an electrocution?',
        a: 'Often more than one party: the utility for unsafe or poorly maintained lines or equipment, a property owner or contractor for unsafe wiring or work near lines, or the maker of a defective tool or appliance. Identifying every responsible party early is central.',
      },
      {
        q: 'The city\u2019s utility (LADWP) was involved. Does the deadline change?',
        a: 'Yes. A claim against the municipal Los Angeles Department of Water and Power is a claim against a public entity, requiring a formal written claim within six months of the injury (Government Code section 911.2) \u2014 far shorter than the ordinary two years. Identifying the utility early is essential.',
      },
      {
        q: 'My burns looked minor. Should I still be evaluated?',
        a: 'Yes. Electrical injuries are deceptive: current can cause cardiac arrhythmia, neurological damage, and internal injury not visible on the surface, and symptoms can appear later. Early specialised burn and cardiac evaluation is important for both health and the claim.',
      },
      {
        q: 'I was electrocuted at work. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. Workers\u2019 comp is generally the exclusive remedy against your employer, but a workplace electrocution often supports a third-party claim \u2014 against the utility, a different contractor, or an equipment maker \u2014 that can recover more.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_ELEC_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Electrocution & Power-Line Injury Claims',
    title: 'San Diego Electrocution & Power-Line Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Electrocuted or burned by a power line, wiring, or tool in San Diego? A utility (SDG&E), contractor, or product maker may be liable \u2014 and the evidence is perishable.',
    psychology: 'I was badly shocked or burned by electricity in San Diego and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego electrocution injury lawyer',
      'power line accident claim california',
      'electrical burn lawsuit california',
      'sdge injury claim california',
      'construction electrocution attorney california',
    ],
    signals: [
      'Utility, contractor, or product liability',
      'High duty of care (GO 95)',
      'Hidden cardiac & internal injury',
      'Preserve the tool & scene',
      'Third-party claim beyond comp',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Diego is served by San Diego Gas & Electric, which \u2014 like every utility \u2014 owes a high duty of care around its lines and equipment, so a power-line contact or equipment failure that injures someone raises the question of whether that duty was met. ${SOURCES} ${UTILITY} ${INJURY} ${EVIDENCE} The deadline is generally two years. Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Whether a utility line, wiring, or a tool caused the injury',
        'The tool or equipment involved \u2014 preserve it',
        'Scene photographs and any line-clearance issues',
        'SDG&E\u2019s maintenance and clearance records',
        'Whether it was a workplace incident (Cal/OSHA, third-party claim)',
        'Whether a property owner or contractor is involved',
        'Specialised burn and cardiac evaluation',
        'Medical treatment and any later-developing symptoms',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the San Diego tool and scene evidence, requests SDG&E\u2019s maintenance and line-clearance records, evaluates any contractor or product role, and flags any third-party workplace claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who can be responsible for an electrocution?',
        a: 'Often more than one party: the utility for unsafe or poorly maintained lines or equipment, a property owner or contractor for unsafe wiring or work near lines, or the maker of a defective tool or appliance. Identifying every responsible party early is central.',
      },
      {
        q: 'How is a utility\u2019s responsibility measured?',
        a: 'Utilities owe a high duty of care around electricity, and overhead line clearances and maintenance are governed by the California Public Utilities Commission\u2019s General Order 95. Whether SDG&E met that standard is examined through its maintenance and clearance records.',
      },
      {
        q: 'My burns looked minor. Should I still be evaluated?',
        a: 'Yes. Electrical injuries are deceptive: current can cause cardiac arrhythmia, neurological damage, and internal injury not visible on the surface, and symptoms can appear later. Early specialised evaluation matters.',
      },
      {
        q: 'I was electrocuted at work. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. A workplace electrocution often supports a third-party claim \u2014 against the utility, a different contractor, or an equipment maker \u2014 beyond the workers\u2019-comp claim against your employer.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_ELEC_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Electrocution & Power-Line Injury Claims',
    title: 'Oakland Electrocution & Power-Line Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Electrocuted or burned by a power line, wiring, or tool in Oakland? A utility (PG&E), contractor, or product maker may be liable \u2014 and the evidence is perishable.',
    psychology: 'I was badly shocked or burned by electricity in Oakland and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland electrocution injury lawyer',
      'power line accident claim california',
      'electrical burn lawsuit california',
      'pge power line injury claim california',
      'construction electrocution attorney california',
    ],
    signals: [
      'Utility, contractor, or product liability',
      'High duty of care (GO 95)',
      'Hidden cardiac & internal injury',
      'Preserve the tool & scene',
      'Third-party claim beyond comp',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Oakland is served by Pacific Gas & Electric, whose lines and equipment are subject to the high duty of care and the clearance and maintenance standards that govern every utility \u2014 so a line contact or equipment failure that injures someone raises the question of whether those standards were met. ${SOURCES} ${UTILITY} ${INJURY} ${EVIDENCE} The deadline is generally two years. Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'Whether a utility line, wiring, or a tool caused the injury',
        'The tool or equipment involved \u2014 preserve it',
        'Scene photographs and any line-clearance issues',
        'PG&E\u2019s maintenance and clearance records',
        'Whether it was a workplace incident (Cal/OSHA, third-party claim)',
        'Whether a property owner or contractor is involved',
        'Specialised burn and cardiac evaluation',
        'Medical treatment and any later-developing symptoms',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the Oakland tool and scene evidence, requests PG&E\u2019s maintenance and line-clearance records, evaluates any contractor or product role, and flags any third-party workplace claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who can be responsible for an electrocution?',
        a: 'Often more than one party: the utility for unsafe or poorly maintained lines or equipment, a property owner or contractor for unsafe wiring or work near lines, or the maker of a defective tool or appliance. Identifying every party early is central.',
      },
      {
        q: 'How is a utility\u2019s responsibility measured?',
        a: 'Utilities owe a high duty of care around electricity, and overhead line clearances and maintenance are governed by the California Public Utilities Commission\u2019s General Order 95. Whether PG&E met that standard is examined through its maintenance and clearance records.',
      },
      {
        q: 'My burns looked minor. Should I still be evaluated?',
        a: 'Yes. Electrical injuries are deceptive: current can cause cardiac arrhythmia, neurological damage, and internal injury not visible on the surface, and symptoms can appear later. Early specialised evaluation matters.',
      },
      {
        q: 'I was electrocuted at work. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. A workplace electrocution often supports a third-party claim \u2014 against the utility, a different contractor, or an equipment maker \u2014 beyond the workers\u2019-comp claim against your employer.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_ELEC_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Electrocution & Power-Line Injury Claims',
    title: 'Sacramento Electrocution & Power-Line Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Electrocuted or burned by a power line, wiring, or tool in Sacramento? The municipal utility (SMUD) carries a six-month claim deadline \u2014 and evidence is perishable.',
    psychology: 'I was badly shocked or burned by electricity in Sacramento and I do not know who is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento electrocution injury lawyer',
      'power line accident claim california',
      'electrical burn lawsuit california',
      'smud injury claim california',
      'construction electrocution attorney california',
    ],
    signals: [
      'Utility, contractor, or product liability',
      'Municipal utility six-month claim (911.2)',
      'High duty of care (GO 95)',
      'Hidden cardiac & internal injury',
      'Preserve the tool & scene',
      'Third-party claim beyond comp',
    ],
    sections: {
      whyItMatters: `Sacramento is served by the municipal Sacramento Municipal Utility District (SMUD) \u2014 which matters because a claim involving a municipal utility is a public-entity claim with a much shorter deadline than an ordinary case. ${SOURCES} ${UTILITY} ${INJURY} ${EVIDENCE} The ordinary deadline is two years. Civil cases are filed in Sacramento County Superior Court after any required claim.`,
      whatToTrack: [
        'Whether a utility line, wiring, or a tool caused the injury',
        'Whether SMUD (a public entity) was involved',
        'The tool or equipment involved \u2014 preserve it',
        'Scene photographs and any line-clearance issues',
        'The utility\u2019s maintenance and clearance records',
        'Whether it was a workplace incident (Cal/OSHA, third-party claim)',
        'The date of injury, which starts any six-month clock',
        'Specialised burn and cardiac evaluation',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Sacramento electrical injury involves the municipal SMUD \u2014 and its six-month deadline \u2014 preserves the tool and scene evidence, requests the utility records, and flags any third-party workplace claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The municipal utility (SMUD) was involved. Does the deadline change?',
        a: 'Yes. A claim against the municipal Sacramento Municipal Utility District is a claim against a public entity, requiring a formal written claim within six months of the injury (Government Code section 911.2) \u2014 far shorter than the ordinary two years. Identifying the utility early is essential.',
      },
      {
        q: 'Who can be responsible for an electrocution?',
        a: 'Often more than one party: the utility for unsafe or poorly maintained lines or equipment, a property owner or contractor for unsafe wiring or work near lines, or the maker of a defective tool or appliance. Identifying every party early is central.',
      },
      {
        q: 'My burns looked minor. Should I still be evaluated?',
        a: 'Yes. Electrical injuries are deceptive: current can cause cardiac arrhythmia, neurological damage, and internal injury not visible on the surface, and symptoms can appear later. Early specialised evaluation matters.',
      },
      {
        q: 'I was electrocuted at work. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. A workplace electrocution often supports a third-party claim \u2014 against the utility, a different contractor, or an equipment maker \u2014 beyond the workers\u2019-comp claim against your employer.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const electrocutionCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_ELEC_SLUG]: {
    scenario: `An LA worker contacted an overhead line while operating equipment. Because the municipal LADWP was involved, a six-month claim was presented, and a third-party claim proceeded beyond workers\u2019 comp. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the utility (SCE vs. LADWP) and preserve the equipment.'],
      ['Six-month mark', 'Present any government claim to a municipal utility.'],
      ['First weeks', 'Request maintenance and clearance records; note Cal/OSHA.'],
      ['Longer term', 'Third-party liability and injuries developed.'],
    ],
    severityLadder: [
      ['Which utility', 'Municipal means a six-month claim.'],
      ['Duty (GO 95)', 'Clearance and maintenance are examined.'],
      ['Hidden injury', 'Cardiac and internal harm assessed.'],
      ['Beyond comp', 'A third-party claim may exist.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Burns and cardiac status documented.' },
      { label: 'Cardiac/neuro', copy: 'Hidden effects are evaluated.' },
      { label: 'Continuing care', copy: 'Long-term effects are assessed.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a municipal utility triggers a six-month claim',
      'Whether GO 95 clearance/maintenance was met',
      'Whether the equipment and scene were preserved',
      'Whether a third-party claim exists beyond comp',
      'Whether hidden injuries are documented',
      'Injury severity',
    ],
    settlementValueDetails: [
      { label: 'Deadline can be short', copy: 'A municipal utility means six months.' },
      { label: 'GO 95 matters', copy: 'It sets the utility standard.' },
      { label: 'Beyond comp', copy: 'A third-party claim can recover more.' },
      { label: 'Preserve evidence', copy: 'The equipment and scene are key.' },
    ],
    insuranceProblems: [
      'A municipal-utility six-month deadline is missed.',
      'The equipment is not preserved.',
      'Hidden cardiac or internal injury is undocumented.',
      'A third-party claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the shock \u2014 a line, wiring, or a tool?' },
      { label: 'Step 2', question: 'Was SCE or the municipal LADWP involved?' },
      { label: 'Step 3', question: 'Did it happen at work?' },
      { label: 'Step 4', question: 'When did the injury occur (six-month clock)?' },
    ],
  },
  [SD_ELEC_SLUG]: {
    scenario: `A San Diego contractor was burned when equipment contacted an SDG&E line with inadequate clearance. The utility\u2019s clearance records under GO 95 were central to the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the equipment; photograph the scene and line.'],
      ['First weeks', 'Request SDG&E clearance and maintenance records.'],
      ['Assessment', 'Compare clearances to GO 95; note Cal/OSHA.'],
      ['Longer term', 'Third-party liability and injuries developed.'],
    ],
    severityLadder: [
      ['Clearance', 'GO 95 sets the line-clearance standard.'],
      ['Duty', 'The utility\u2019s high duty is examined.'],
      ['Hidden injury', 'Cardiac and internal harm assessed.'],
      ['Beyond comp', 'A third-party claim may exist.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Burns and cardiac status documented.' },
      { label: 'Cardiac/neuro', copy: 'Hidden effects are evaluated.' },
      { label: 'Continuing care', copy: 'Long-term effects are assessed.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether GO 95 clearance was met',
      'Whether the utility\u2019s maintenance was adequate',
      'Whether the equipment and scene were preserved',
      'Whether a third-party claim exists beyond comp',
      'Whether hidden injuries are documented',
      'Injury severity',
    ],
    settlementValueDetails: [
      { label: 'GO 95 matters', copy: 'Clearances set the standard.' },
      { label: 'Records decide it', copy: 'Maintenance history is key.' },
      { label: 'Beyond comp', copy: 'A third-party claim can recover more.' },
      { label: 'Preserve evidence', copy: 'The equipment and scene are key.' },
    ],
    insuranceProblems: [
      'The utility clearance records are never requested.',
      'The equipment is not preserved.',
      'Hidden cardiac or internal injury is undocumented.',
      'A third-party claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the shock \u2014 a line, wiring, or a tool?' },
      { label: 'Step 2', question: 'Was an overhead line involved?' },
      { label: 'Step 3', question: 'Did it happen at work?' },
      { label: 'Step 4', question: 'Where is the equipment now?' },
    ],
  },
  [OAK_ELEC_SLUG]: {
    scenario: `An Oakland worker was injured by a PG&E equipment failure. The utility\u2019s maintenance records, requested early, showed the equipment had not been serviced to standard. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the equipment; photograph the scene.'],
      ['First weeks', 'Request PG&E maintenance and clearance records.'],
      ['Assessment', 'Compare maintenance to GO 95; note Cal/OSHA.'],
      ['Longer term', 'Third-party liability and injuries developed.'],
    ],
    severityLadder: [
      ['Maintenance', 'GO 95 governs upkeep.'],
      ['Duty', 'The utility\u2019s high duty is examined.'],
      ['Hidden injury', 'Cardiac and internal harm assessed.'],
      ['Beyond comp', 'A third-party claim may exist.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Burns and cardiac status documented.' },
      { label: 'Cardiac/neuro', copy: 'Hidden effects are evaluated.' },
      { label: 'Continuing care', copy: 'Long-term effects are assessed.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the utility\u2019s maintenance met GO 95',
      'Whether the equipment failure is documented',
      'Whether the equipment and scene were preserved',
      'Whether a third-party claim exists beyond comp',
      'Whether hidden injuries are documented',
      'Injury severity',
    ],
    settlementValueDetails: [
      { label: 'Maintenance matters', copy: 'GO 95 governs upkeep.' },
      { label: 'Records decide it', copy: 'Service history is key.' },
      { label: 'Beyond comp', copy: 'A third-party claim can recover more.' },
      { label: 'Preserve evidence', copy: 'The equipment and scene are key.' },
    ],
    insuranceProblems: [
      'The utility maintenance records are never requested.',
      'The equipment is not preserved.',
      'Hidden cardiac or internal injury is undocumented.',
      'A third-party claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the shock \u2014 a line, wiring, or a tool?' },
      { label: 'Step 2', question: 'Did utility equipment fail?' },
      { label: 'Step 3', question: 'Did it happen at work?' },
      { label: 'Step 4', question: 'Where is the equipment now?' },
    ],
  },
  [SAC_ELEC_SLUG]: {
    scenario: `A Sacramento injury involved the municipal SMUD. Recognising the public entity, a six-month claim was presented in time, and the utility\u2019s maintenance records supported the case. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Confirm SMUD involvement; preserve the equipment.'],
      ['Six-month mark', 'Present the government claim to SMUD in time.'],
      ['First weeks', 'Request maintenance and clearance records; note Cal/OSHA.'],
      ['Longer term', 'Third-party liability and injuries developed.'],
    ],
    severityLadder: [
      ['Public entity', 'SMUD triggers a six-month claim.'],
      ['Duty (GO 95)', 'Clearance and maintenance are examined.'],
      ['Hidden injury', 'Cardiac and internal harm assessed.'],
      ['Beyond comp', 'A third-party claim may exist.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Burns and cardiac status documented.' },
      { label: 'Cardiac/neuro', copy: 'Hidden effects are evaluated.' },
      { label: 'Continuing care', copy: 'Long-term effects are assessed.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the six-month SMUD claim was met',
      'Whether GO 95 clearance/maintenance was met',
      'Whether the equipment and scene were preserved',
      'Whether a third-party claim exists beyond comp',
      'Whether hidden injuries are documented',
      'Injury severity',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'SMUD means a six-month claim.' },
      { label: 'GO 95 matters', copy: 'It sets the utility standard.' },
      { label: 'Beyond comp', copy: 'A third-party claim can recover more.' },
      { label: 'Preserve evidence', copy: 'The equipment and scene are key.' },
    ],
    insuranceProblems: [
      'The six-month SMUD deadline is missed.',
      'The equipment is not preserved.',
      'Hidden cardiac or internal injury is undocumented.',
      'A third-party claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the shock \u2014 a line, wiring, or a tool?' },
      { label: 'Step 2', question: 'Was the municipal SMUD involved?' },
      { label: 'Step 3', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 4', question: 'Did it happen at work?' },
    ],
  },
}
