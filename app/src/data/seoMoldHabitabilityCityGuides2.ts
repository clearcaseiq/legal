import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, toxic-mold / habitability practice area (batch 2):
 * location-specific guides for San Diego, San Jose, Sacramento, and Fresno,
 * extending the batch-1 hub (Los Angeles, Oakland, San Francisco, Long Beach).
 *
 * Applied accurately (identical to batch 1):
 *  - Implied warranty of habitability (Civil Code 1941).
 *  - Notice-and-opportunity-to-repair requirement; documented complaints are central.
 *  - Mold personal-injury turns on contested medical causation; property/relocation
 *    damages are more straightforward.
 *  - Anti-retaliation protection (Civil Code 1942.5).
 *  - Mold evidence is perishable; gather before remediation.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a unit was uninhabitable, whether mold caused a health effect, and which deadline applies depend on facts a licensed California attorney should review promptly.'

const WARRANTY =
  'Every residential lease in California carries an implied warranty of habitability (Civil Code section 1941), which requires the landlord to keep the unit in a livable condition. Unaddressed water intrusion \u2014 from leaks, plumbing failures, or roof or window problems \u2014 and the mold that follows can breach that warranty when the landlord fails to remedy it.'

const NOTICE =
  'A habitability claim generally requires that the tenant gave the landlord notice of the problem and a reasonable opportunity to repair it. That is why documented complaints \u2014 dated emails, texts, letters, or maintenance requests \u2014 and the landlord\u2019s failure to act are central: they establish both the defect and the landlord\u2019s knowledge.'

const CAUSATION =
  'Mold personal-injury claims are contested on medical causation. Connecting specific health effects \u2014 respiratory illness, sinus problems, or allergic reactions \u2014 to the mold requires medical evidence and often expert testimony, because landlords\u2019 insurers dispute the link. Property damage, out-of-pocket costs, and relocation expenses are more straightforward to prove and are often part of the claim.'

const RETALIATION =
  'California protects tenants who assert their habitability rights: a landlord generally may not retaliate \u2014 by eviction, a rent increase, or reduced services \u2014 against a tenant who has complained about conditions or pursued a habitability remedy (Civil Code section 1942.5). Retaliatory conduct after a complaint can itself support a claim.'

const EVIDENCE =
  'Mold evidence is perishable and should be gathered before any remediation: dated photographs and video of the mold and its source, mold testing or air sampling, records of the water intrusion, and every written complaint and the landlord\u2019s response, along with medical records tying symptoms to the exposure. Once a unit is cleaned or repaired, the proof can be gone.'

export const SD_MOLD_SLUG = '/san-diego-toxic-mold-apartment-claim'
export const SJ_MOLD_SLUG = '/san-jose-toxic-mold-apartment-claim'
export const SAC_MOLD_SLUG = '/sacramento-toxic-mold-apartment-claim'
export const FRESNO_MOLD_SLUG = '/fresno-toxic-mold-apartment-claim'

export const moldHabitabilityCityGuidePages2: LandingPage[] = [
  {
    slug: SD_MOLD_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Toxic Mold & Habitability Claims',
    title: 'San Diego Toxic Mold & Habitability Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sick or displaced by mold in a San Diego rental the landlord ignored? Every lease carries an implied warranty of habitability \u2014 and documented complaints are the key.',
    psychology: 'My San Diego apartment has mold the landlord will not fix and it is making my family sick.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego toxic mold apartment lawyer',
      'landlord will not fix mold california',
      'implied warranty of habitability california',
      'mold health claim tenant california',
      'landlord retaliation complaint california',
    ],
    signals: [
      'Implied warranty of habitability',
      'Notice & chance to repair',
      'Contested medical causation',
      'Property & relocation damages',
      'Anti-retaliation protection',
      'Preserve mold before cleanup',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s coastal humidity and aging rental stock make water intrusion and mold common, and tenants are often ignored until it affects their health. ${WARRANTY} ${NOTICE} ${CAUSATION} ${RETALIATION} ${EVIDENCE} Civil cases are filed in San Diego County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Dated photos and video of the mold and its source',
        'Every written complaint and the landlord\u2019s response',
        'Records of the water intrusion or leak',
        'Any mold testing or air sampling',
        'Medical records tying symptoms to the exposure',
        'Property damage and relocation expenses',
        'Any retaliation after a complaint',
        'Medical treatment from the exposure onward',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the mold evidence before remediation, assembles the complaint history proving notice, and separates the readily provable property and relocation damages from the contested medical-causation claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Does my landlord have to fix mold?',
        a: 'Generally yes. Every residential lease carries an implied warranty of habitability (Civil Code 1941). Unaddressed water intrusion and the mold that follows can breach that warranty when the landlord fails to remedy it after notice.',
      },
      {
        q: 'Why do my complaints matter so much?',
        a: 'A habitability claim generally requires that you gave the landlord notice and a reasonable chance to repair. Dated emails, texts, and maintenance requests establish both the defect and the landlord\u2019s knowledge.',
      },
      {
        q: 'Can I prove the mold made me sick?',
        a: 'Mold personal-injury claims are contested on medical causation and often need expert testimony. Property damage, out-of-pocket costs, and relocation expenses are more straightforward and are often part of the claim.',
      },
      {
        q: 'My landlord threatened eviction after I complained. Is that legal?',
        a: 'Generally not. California protects tenants from retaliation \u2014 eviction, rent increases, or reduced services \u2014 after a habitability complaint (Civil Code 1942.5). Retaliatory conduct can itself support a claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the mold evidence and complaint history so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_MOLD_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Toxic Mold & Habitability Claims',
    title: 'San Jose Toxic Mold & Habitability Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sick or displaced by mold in a San Jose rental the landlord ignored? Every lease carries an implied warranty of habitability \u2014 and documented complaints are the key.',
    psychology: 'My San Jose apartment has mold the landlord will not fix and it is making my family sick.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose toxic mold apartment lawyer',
      'landlord will not fix mold california',
      'implied warranty of habitability california',
      'mold health claim tenant california',
      'landlord retaliation complaint california',
    ],
    signals: [
      'Implied warranty of habitability',
      'Notice & chance to repair',
      'Contested medical causation',
      'Property & relocation damages',
      'Anti-retaliation protection',
      'Preserve mold before cleanup',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s high rents and aging apartment stock leave tenants reluctant to move even when leaks and mold go unrepaired, and deferred maintenance in a tight market is common. ${WARRANTY} ${NOTICE} ${CAUSATION} ${RETALIATION} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Dated photos and video of the mold and its source',
        'Every written complaint and the landlord\u2019s response',
        'Records of the water intrusion or leak',
        'Any mold testing or air sampling',
        'Medical records tying symptoms to the exposure',
        'Property damage and relocation expenses',
        'Any retaliation after a complaint',
        'Medical treatment from the exposure onward',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the mold evidence before remediation, assembles the complaint history proving notice, and separates the readily provable property and relocation damages from the contested medical-causation claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Does my landlord have to fix mold?',
        a: 'Generally yes. Every residential lease carries an implied warranty of habitability (Civil Code 1941). Unaddressed water intrusion and the mold that follows can breach it when the landlord fails to remedy it after notice.',
      },
      {
        q: 'Why do my complaints matter so much?',
        a: 'A habitability claim generally requires notice and a reasonable chance to repair. Dated emails, texts, and maintenance requests establish both the defect and the landlord\u2019s knowledge.',
      },
      {
        q: 'Can I prove the mold made me sick?',
        a: 'Mold personal-injury claims are contested on medical causation and often need expert testimony. Property damage and relocation expenses are more straightforward and are often part of the claim.',
      },
      {
        q: 'My landlord threatened eviction after I complained. Is that legal?',
        a: 'Generally not. California protects tenants from retaliation after a habitability complaint (Civil Code 1942.5). Retaliatory conduct can itself support a claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the mold evidence and complaint history so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_MOLD_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Toxic Mold & Habitability Claims',
    title: 'Sacramento Toxic Mold & Habitability Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sick or displaced by mold in a Sacramento rental the landlord ignored? Every lease carries an implied warranty of habitability \u2014 and documented complaints are the key.',
    psychology: 'My Sacramento apartment has mold the landlord will not fix and it is making my family sick.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento toxic mold apartment lawyer',
      'landlord will not fix mold california',
      'implied warranty of habitability california',
      'mold health claim tenant california',
      'landlord retaliation complaint california',
    ],
    signals: [
      'Implied warranty of habitability',
      'Notice & chance to repair',
      'Contested medical causation',
      'Property & relocation damages',
      'Anti-retaliation protection',
      'Preserve mold before cleanup',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s winter rains and older housing stock produce frequent roof and plumbing leaks, and the mold that follows is a recurring habitability problem when landlords delay repairs. ${WARRANTY} ${NOTICE} ${CAUSATION} ${RETALIATION} ${EVIDENCE} Civil cases are filed in Sacramento County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Dated photos and video of the mold and its source',
        'Every written complaint and the landlord\u2019s response',
        'Records of the water intrusion or leak',
        'Any mold testing or air sampling',
        'Medical records tying symptoms to the exposure',
        'Property damage and relocation expenses',
        'Any retaliation after a complaint',
        'Medical treatment from the exposure onward',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the mold evidence before remediation, assembles the complaint history proving notice, and separates the readily provable property and relocation damages from the contested medical-causation claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Does my landlord have to fix mold?',
        a: 'Generally yes. Every residential lease carries an implied warranty of habitability (Civil Code 1941). Unaddressed water intrusion and the mold that follows can breach it when the landlord fails to remedy it after notice.',
      },
      {
        q: 'Why do my complaints matter so much?',
        a: 'A habitability claim generally requires notice and a reasonable chance to repair. Dated written complaints establish both the defect and the landlord\u2019s knowledge.',
      },
      {
        q: 'Can I prove the mold made me sick?',
        a: 'Mold personal-injury claims are contested on medical causation and often need expert testimony. Property damage and relocation expenses are more straightforward and are often part of the claim.',
      },
      {
        q: 'My landlord threatened eviction after I complained. Is that legal?',
        a: 'Generally not. California protects tenants from retaliation after a habitability complaint (Civil Code 1942.5). Retaliatory conduct can itself support a claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the mold evidence and complaint history so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_MOLD_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Toxic Mold & Habitability Claims',
    title: 'Fresno Toxic Mold & Habitability Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sick or displaced by mold in a Fresno rental the landlord ignored? Every lease carries an implied warranty of habitability \u2014 and documented complaints are the key.',
    psychology: 'My Fresno apartment has mold the landlord will not fix and it is making my family sick.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno toxic mold apartment lawyer',
      'landlord will not fix mold california',
      'implied warranty of habitability california',
      'mold health claim tenant california',
      'landlord retaliation complaint california',
    ],
    signals: [
      'Implied warranty of habitability',
      'Notice & chance to repair',
      'Contested medical causation',
      'Property & relocation damages',
      'Anti-retaliation protection',
      'Preserve mold before cleanup',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s low-income and older rental housing sees frequent plumbing leaks and deferred maintenance, and mold that goes unaddressed becomes both a health and a habitability problem. ${WARRANTY} ${NOTICE} ${CAUSATION} ${RETALIATION} ${EVIDENCE} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Dated photos and video of the mold and its source',
        'Every written complaint and the landlord\u2019s response',
        'Records of the water intrusion or leak',
        'Any mold testing or air sampling',
        'Medical records tying symptoms to the exposure',
        'Property damage and relocation expenses',
        'Any retaliation after a complaint',
        'Medical treatment from the exposure onward',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the mold evidence before remediation, assembles the complaint history proving notice, and separates the readily provable property and relocation damages from the contested medical-causation claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Does my landlord have to fix mold?',
        a: 'Generally yes. Every residential lease carries an implied warranty of habitability (Civil Code 1941). Unaddressed water intrusion and the mold that follows can breach it when the landlord fails to remedy it after notice.',
      },
      {
        q: 'Why do my complaints matter so much?',
        a: 'A habitability claim generally requires notice and a reasonable chance to repair. Dated written complaints establish both the defect and the landlord\u2019s knowledge.',
      },
      {
        q: 'Can I prove the mold made me sick?',
        a: 'Mold personal-injury claims are contested on medical causation and often need expert testimony. Property damage and relocation expenses are more straightforward and are often part of the claim.',
      },
      {
        q: 'My landlord threatened eviction after I complained. Is that legal?',
        a: 'Generally not. California protects tenants from retaliation after a habitability complaint (Civil Code 1942.5). Retaliatory conduct can itself support a claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the mold evidence and complaint history so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const moldHabitabilityCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SD_MOLD_SLUG]: {
    scenario: `A San Diego tenant reported a persistent leak for months; mold spread and the family developed respiratory symptoms. The dated complaint history proved notice, and photos taken before cleanup preserved the proof. ${NOT_ADVICE}`,
    timeline: [
      ['At first sign', 'Photograph the mold and source; report in writing.'],
      ['First weeks', 'Keep every complaint and the landlord\u2019s response.'],
      ['Before cleanup', 'Get mold testing; preserve the evidence.'],
      ['Longer term', 'Tie symptoms to exposure with medical records.'],
    ],
    severityLadder: [
      ['Warranty', 'Habitability requires a livable unit.'],
      ['Notice', 'Complaints establish knowledge.'],
      ['Property damages', 'Readily provable.'],
      ['Injury', 'Medical causation is contested.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Symptoms are documented.' },
      { label: 'Evaluation', copy: 'A provider links exposure to symptoms.' },
      { label: 'Continuing care', copy: 'Respiratory follow-up is tracked.' },
      { label: 'Documentation', copy: 'Bills and relocation costs are recorded.' },
    ],
    settlementDrivers: [
      'Whether notice and a chance to repair are shown',
      'Whether the evidence was preserved before cleanup',
      'Whether medical causation is supported',
      'The property and relocation damages',
      'Whether retaliation occurred',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Warranty', copy: 'Habitability underlies the claim.' },
      { label: 'Notice', copy: 'Complaints prove knowledge.' },
      { label: 'Damages', copy: 'Property and relocation are provable.' },
      { label: 'Retaliation', copy: 'It can add a claim.' },
    ],
    insuranceProblems: [
      'The mold is cleaned before it is documented.',
      'The complaint history is never assembled.',
      'Medical causation is left unsupported.',
      'Relocation costs are never tallied.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you report the problem in writing?' },
      { label: 'Step 2', question: 'Do you have photos of the mold?' },
      { label: 'Step 3', question: 'Did anyone develop symptoms?' },
      { label: 'Step 4', question: 'Has the unit been cleaned yet?' },
    ],
  },
  [SJ_MOLD_SLUG]: {
    scenario: `A San Jose tenant stayed despite mold because rents were unaffordable; the landlord ignored repeated maintenance requests. The written requests proved notice, and relocation costs anchored the damages. ${NOT_ADVICE}`,
    timeline: [
      ['At first sign', 'Photograph the mold and source; report in writing.'],
      ['First weeks', 'Keep every maintenance request and response.'],
      ['Before cleanup', 'Get mold testing; preserve the evidence.'],
      ['Longer term', 'Tie symptoms to exposure with medical records.'],
    ],
    severityLadder: [
      ['Warranty', 'Habitability requires a livable unit.'],
      ['Notice', 'Requests establish knowledge.'],
      ['Property damages', 'Readily provable.'],
      ['Injury', 'Medical causation is contested.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Symptoms are documented.' },
      { label: 'Evaluation', copy: 'A provider links exposure to symptoms.' },
      { label: 'Continuing care', copy: 'Respiratory follow-up is tracked.' },
      { label: 'Documentation', copy: 'Bills and relocation costs are recorded.' },
    ],
    settlementDrivers: [
      'Whether notice and a chance to repair are shown',
      'Whether the evidence was preserved before cleanup',
      'Whether medical causation is supported',
      'The property and relocation damages',
      'Whether retaliation occurred',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Warranty', copy: 'Habitability underlies the claim.' },
      { label: 'Notice', copy: 'Maintenance requests prove knowledge.' },
      { label: 'Damages', copy: 'Relocation costs are provable.' },
      { label: 'Retaliation', copy: 'It can add a claim.' },
    ],
    insuranceProblems: [
      'The mold is cleaned before it is documented.',
      'The maintenance-request history is lost.',
      'Medical causation is left unsupported.',
      'Relocation costs are never tallied.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you submit maintenance requests?' },
      { label: 'Step 2', question: 'Do you have photos of the mold?' },
      { label: 'Step 3', question: 'Did anyone develop symptoms?' },
      { label: 'Step 4', question: 'Has the unit been cleaned yet?' },
    ],
  },
  [SAC_MOLD_SLUG]: {
    scenario: `A Sacramento winter leak went unrepaired for a season and mold spread across a bedroom wall. The tenant\u2019s dated emails proved notice, and photos before remediation preserved the source. ${NOT_ADVICE}`,
    timeline: [
      ['At first sign', 'Photograph the mold and source; report in writing.'],
      ['First weeks', 'Keep every email and the landlord\u2019s response.'],
      ['Before cleanup', 'Get mold testing; preserve the evidence.'],
      ['Longer term', 'Tie symptoms to exposure with medical records.'],
    ],
    severityLadder: [
      ['Warranty', 'Habitability requires a livable unit.'],
      ['Notice', 'Emails establish knowledge.'],
      ['Property damages', 'Readily provable.'],
      ['Injury', 'Medical causation is contested.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Symptoms are documented.' },
      { label: 'Evaluation', copy: 'A provider links exposure to symptoms.' },
      { label: 'Continuing care', copy: 'Respiratory follow-up is tracked.' },
      { label: 'Documentation', copy: 'Bills and relocation costs are recorded.' },
    ],
    settlementDrivers: [
      'Whether notice and a chance to repair are shown',
      'Whether the evidence was preserved before cleanup',
      'Whether medical causation is supported',
      'The property and relocation damages',
      'Whether retaliation occurred',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Warranty', copy: 'Habitability underlies the claim.' },
      { label: 'Notice', copy: 'Dated emails prove knowledge.' },
      { label: 'Damages', copy: 'Property and relocation are provable.' },
      { label: 'Retaliation', copy: 'It can add a claim.' },
    ],
    insuranceProblems: [
      'The mold is cleaned before it is documented.',
      'The email history is never assembled.',
      'Medical causation is left unsupported.',
      'Relocation costs are never tallied.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you report the leak in writing?' },
      { label: 'Step 2', question: 'Do you have photos of the mold?' },
      { label: 'Step 3', question: 'Did anyone develop symptoms?' },
      { label: 'Step 4', question: 'Has the unit been cleaned yet?' },
    ],
  },
  [FRESNO_MOLD_SLUG]: {
    scenario: `A Fresno family in low-income housing reported a plumbing leak repeatedly; mold spread and a child developed asthma symptoms. The written complaints proved notice despite the landlord\u2019s inaction. ${NOT_ADVICE}`,
    timeline: [
      ['At first sign', 'Photograph the mold and source; report in writing.'],
      ['First weeks', 'Keep every complaint and the landlord\u2019s response.'],
      ['Before cleanup', 'Get mold testing; preserve the evidence.'],
      ['Longer term', 'Tie symptoms to exposure with medical records.'],
    ],
    severityLadder: [
      ['Warranty', 'Habitability requires a livable unit.'],
      ['Notice', 'Complaints establish knowledge.'],
      ['Property damages', 'Readily provable.'],
      ['Injury', 'Medical causation is contested.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Symptoms are documented.' },
      { label: 'Evaluation', copy: 'A provider links exposure to symptoms.' },
      { label: 'Continuing care', copy: 'Pediatric respiratory follow-up is tracked.' },
      { label: 'Documentation', copy: 'Bills and relocation costs are recorded.' },
    ],
    settlementDrivers: [
      'Whether notice and a chance to repair are shown',
      'Whether the evidence was preserved before cleanup',
      'Whether medical causation is supported',
      'The property and relocation damages',
      'Whether retaliation occurred',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Warranty', copy: 'Habitability underlies the claim.' },
      { label: 'Notice', copy: 'Complaints prove knowledge.' },
      { label: 'Damages', copy: 'Property and relocation are provable.' },
      { label: 'Retaliation', copy: 'It can add a claim.' },
    ],
    insuranceProblems: [
      'The mold is cleaned before it is documented.',
      'The complaint history is never assembled.',
      'Medical causation is left unsupported.',
      'Relocation costs are never tallied.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you report the leak in writing?' },
      { label: 'Step 2', question: 'Do you have photos of the mold?' },
      { label: 'Step 3', question: 'Did a child develop symptoms?' },
      { label: 'Step 4', question: 'Has the unit been cleaned yet?' },
    ],
  },
}
