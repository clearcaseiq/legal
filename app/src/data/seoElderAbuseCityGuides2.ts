import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, nursing-home and elder-abuse practice area (batch 2): location-
 * specific guides for Santa Ana (Orange County), Riverside, Fresno, and Long
 * Beach, extending the batch-1 hub (LA, San Diego, Sacramento, San Jose).
 *
 * Genuinely local context rather than interpolated copy:
 *  - Santa Ana / Orange County: a dense concentration of skilled-nursing and
 *    assisted-living facilities serving a large retiree population, with heavy use
 *    of admission arbitration clauses.
 *  - Riverside: an Inland Empire market with rapid senior-population growth and
 *    facilities cited for understaffing across a spread-out county.
 *  - Fresno: a Central Valley hub serving a wide rural region, where facilities
 *    are often the only option for miles and understaffing is a recurring theme.
 *  - Long Beach: an older coastal population and a mix of skilled-nursing and
 *    assisted-living facilities, with the city\u2019s own public long-term-care
 *    exposure at times.
 *
 * Applied accurately (identical to batch 1):
 *  - The Elder Abuse Act (Welf. & Inst. Code section 15600 et seq.) protects those
 *    65+ and dependent adults from physical abuse, neglect, and financial abuse.
 *  - Enhanced remedies (section 15657) on clear-and-convincing proof of neglect or
 *    abuse with recklessness, oppression, fraud, or malice: attorney fees/costs
 *    and, where the elder has died, pre-death pain and suffering.
 *  - Genuine neglect is distinct from ordinary professional negligence (which is
 *    governed by MICRA and its shorter deadlines/limits).
 *  - The evidence is documentary: staffing records, care plan, chart, and CDPH
 *    inspection and citation history.
 *  - Admission arbitration agreements are common and frequently contested.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether conduct amounts to elder neglect or abuse, whether enhanced remedies apply, and whether an arbitration agreement is enforceable depend on facts a licensed California attorney should review promptly.'

const ELDER_ACT =
  'The Elder Abuse and Dependent Adult Civil Protection Act (Welfare and Institutions Code section 15600 and following) protects people 65 and older and dependent adults from physical abuse, neglect, and financial abuse. Neglect includes the failure to provide the care a reasonable person would provide \u2014 for example, failing to prevent pressure ulcers, malnutrition, dehydration, falls, or to attend to medical needs.'

const ENHANCED =
  'When a plaintiff proves by clear and convincing evidence that a facility is liable for neglect or abuse and acted with recklessness, oppression, fraud, or malice, the Act allows enhanced remedies (Welfare and Institutions Code section 15657): reasonable attorney fees and costs on top of damages, and, where the elder has died, recovery of the decedent\u2019s pre-death pain and suffering that ordinary survival law would otherwise bar. These remedies change how a case is valued and litigated.'

const NEGLECT_VS_MED =
  'A genuine neglect claim under the Act \u2014 often rooted in chronic understaffing \u2014 is legally distinct from ordinary professional negligence. That distinction matters: a professional-negligence framing is governed by MICRA and its shorter deadlines and damage limits, while a true neglect claim is not. Characterising the conduct correctly is central to the case.'

const EVIDENCE =
  'These cases are documentary. The staffing records, the resident\u2019s care plan and medical chart, incident reports, and the facility\u2019s state inspection and citation history from the California Department of Public Health tell the story of whether care fell below what the law requires. Requesting and preserving these records early is essential.'

const ARBITRATION =
  'Most facilities ask families to sign an arbitration agreement at admission, which can push a dispute out of court. Whether it binds the resident depends on who signed it, whether they had authority, and how it was presented \u2014 and these agreements are frequently and successfully contested. Do not assume an admission packet forecloses a claim.'

export const SANTAANA_ELDER_SLUG = '/santa-ana-nursing-home-abuse-claim'
export const RIVERSIDE_ELDER_SLUG = '/riverside-nursing-home-abuse-claim'
export const FRESNO_ELDER_SLUG = '/fresno-nursing-home-abuse-claim'
export const LB_ELDER_SLUG = '/long-beach-nursing-home-abuse-claim'

export const elderAbuseCityGuidePages2: LandingPage[] = [
  {
    slug: SANTAANA_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Santa Ana Nursing Home & Elder Abuse Claims',
    title: 'Santa Ana Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried an Orange County nursing home neglected or abused a loved one? California\u2019s Elder Abuse Act carries enhanced remedies \u2014 and staffing and inspection records tell the story, even when an admission arbitration clause is in the way.',
    psychology: 'A loved one was hurt or neglected in a Santa Ana or Orange County facility and I do not know if I can hold it accountable.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'santa ana nursing home neglect lawyer',
      'orange county elder abuse claim california',
      'pressure ulcer nursing home lawsuit california',
      'nursing home arbitration agreement enforceable california',
      'sue assisted living facility california',
    ],
    signals: [
      'Elder Abuse Act (15600)',
      'Enhanced remedies (15657)',
      'Neglect vs. med-mal',
      'Staffing & CDPH records',
      'Admission arbitration clause',
      'Understaffing pattern',
    ],
    sections: {
      whyItMatters: `Santa Ana and the surrounding Orange County market have a dense concentration of skilled-nursing and assisted-living facilities serving a large retiree population, and premium OC facilities lean heavily on arbitration agreements signed at admission. ${ELDER_ACT} ${ENHANCED} ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'The facility name and the resident\u2019s admission date',
        'The specific harm \u2014 pressure ulcer, fall, dehydration, malnutrition, medication error',
        'The care plan and whether it was followed',
        'Signs of understaffing (missed care, delayed responses)',
        'Any arbitration agreement signed at admission and by whom',
        'Photographs of injuries and conditions',
        'The facility\u2019s CDPH inspection and citation history',
        'Medical treatment and any hospital transfers',
      ],
      howClearCaseHelps: `ClearCaseIQ frames whether an Orange County facility\u2019s conduct is neglect under the Elder Abuse Act rather than ordinary negligence, gathers the staffing, care-plan, and CDPH citation records that prove it, and assesses any admission arbitration agreement. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What counts as nursing-home neglect in California?',
        a: 'Under the Elder Abuse Act (Welfare and Institutions Code section 15600 and following), neglect is the failure to provide the care a reasonable person would provide \u2014 for example, failing to prevent pressure ulcers, malnutrition, dehydration, or falls, or to attend to medical needs. Chronic understaffing is a common root cause.',
      },
      {
        q: 'We signed an arbitration agreement at admission. Can we still bring a claim?',
        a: 'Often, yes. Admission arbitration agreements are common in Orange County but frequently contested. Whether one binds the resident depends on who signed it, whether they had authority, and how it was presented. Do not assume an admission packet forecloses a claim.',
      },
      {
        q: 'How is an elder-abuse claim different from a medical-malpractice claim?',
        a: 'A genuine neglect claim under the Act is distinct from ordinary professional negligence. That matters because a professional-negligence framing is governed by MICRA and its shorter deadlines and damage limits, while a true neglect claim is not, and the Act allows enhanced remedies.',
      },
      {
        q: 'What are the enhanced remedies?',
        a: 'When a plaintiff proves by clear and convincing evidence that a facility is liable for neglect or abuse and acted with recklessness, oppression, fraud, or malice, the Act (section 15657) allows recovery of attorney fees and costs and, where the elder has died, the decedent\u2019s pre-death pain and suffering that ordinary survival law would bar.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIVERSIDE_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Nursing Home & Elder Abuse Claims',
    title: 'Riverside Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried a Riverside nursing home neglected or abused a loved one? California\u2019s Elder Abuse Act carries enhanced remedies \u2014 and staffing and inspection records tell the story across the Inland Empire.',
    psychology: 'A loved one was hurt or neglected in a Riverside-area facility and I do not know if I can hold it accountable.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside nursing home neglect lawyer',
      'inland empire elder abuse claim california',
      'pressure ulcer nursing home lawsuit california',
      'nursing home understaffing neglect california',
      'sue assisted living facility california',
    ],
    signals: [
      'Elder Abuse Act (15600)',
      'Enhanced remedies (15657)',
      'Neglect vs. med-mal',
      'Staffing & CDPH records',
      'Understaffing pattern',
      'Admission arbitration clause',
    ],
    sections: {
      whyItMatters: `Riverside and the Inland Empire have a rapidly growing senior population and a spread-out network of facilities, several of which appear in state citations for understaffing \u2014 the exact condition that turns ordinary care failures into actionable neglect. ${ELDER_ACT} ${ENHANCED} ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'The facility name and the resident\u2019s admission date',
        'The specific harm \u2014 pressure ulcer, fall, dehydration, malnutrition, medication error',
        'The care plan and whether it was followed',
        'Signs of understaffing (missed care, delayed responses)',
        'Any arbitration agreement signed at admission and by whom',
        'Photographs of injuries and conditions',
        'The facility\u2019s CDPH inspection and citation history',
        'Medical treatment and any hospital transfers',
      ],
      howClearCaseHelps: `ClearCaseIQ frames whether a Riverside facility\u2019s conduct is neglect under the Elder Abuse Act rather than ordinary negligence, gathers the staffing, care-plan, and CDPH citation records that prove it, and assesses any admission arbitration agreement. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What counts as nursing-home neglect in California?',
        a: 'Under the Elder Abuse Act, neglect is the failure to provide the care a reasonable person would provide \u2014 for example, failing to prevent pressure ulcers, malnutrition, dehydration, or falls, or to attend to medical needs. Chronic understaffing is a common root cause.',
      },
      {
        q: 'How is an elder-abuse claim different from a medical-malpractice claim?',
        a: 'A genuine neglect claim under the Act is distinct from ordinary professional negligence. That matters because a professional-negligence framing is governed by MICRA and its shorter deadlines and damage limits, while a true neglect claim is not, and the Act allows enhanced remedies.',
      },
      {
        q: 'What are the enhanced remedies?',
        a: 'When a plaintiff proves by clear and convincing evidence that a facility is liable for neglect or abuse and acted with recklessness, oppression, fraud, or malice, the Act (section 15657) allows recovery of attorney fees and costs and, where the elder has died, the decedent\u2019s pre-death pain and suffering that ordinary survival law would bar.',
      },
      {
        q: 'We signed an arbitration agreement at admission. Can we still bring a claim?',
        a: 'Often, yes. Admission arbitration agreements are common but frequently contested. Whether one binds the resident depends on who signed it, whether they had authority, and how it was presented.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Nursing Home & Elder Abuse Claims',
    title: 'Fresno Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried a Fresno nursing home neglected or abused a loved one? California\u2019s Elder Abuse Act carries enhanced remedies \u2014 and staffing and inspection records tell the story across the Central Valley.',
    psychology: 'A loved one was hurt or neglected in a Fresno-area facility and I do not know if I can hold it accountable.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno nursing home neglect lawyer',
      'central valley elder abuse claim california',
      'pressure ulcer nursing home lawsuit california',
      'nursing home understaffing neglect california',
      'sue assisted living facility california',
    ],
    signals: [
      'Elder Abuse Act (15600)',
      'Enhanced remedies (15657)',
      'Neglect vs. med-mal',
      'Staffing & CDPH records',
      'Understaffing pattern',
      'Admission arbitration clause',
    ],
    sections: {
      whyItMatters: `Fresno is the health-care hub for a wide rural region, so its skilled-nursing and assisted-living facilities often serve families with few alternatives for miles \u2014 a market where understaffing recurs in state citations and turns ordinary care failures into actionable neglect. ${ELDER_ACT} ${ENHANCED} ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'The facility name and the resident\u2019s admission date',
        'The specific harm \u2014 pressure ulcer, fall, dehydration, malnutrition, medication error',
        'The care plan and whether it was followed',
        'Signs of understaffing (missed care, delayed responses)',
        'Any arbitration agreement signed at admission and by whom',
        'Photographs of injuries and conditions',
        'The facility\u2019s CDPH inspection and citation history',
        'Medical treatment and any hospital transfers',
      ],
      howClearCaseHelps: `ClearCaseIQ frames whether a Fresno facility\u2019s conduct is neglect under the Elder Abuse Act rather than ordinary negligence, gathers the staffing, care-plan, and CDPH citation records that prove it, and assesses any admission arbitration agreement. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What counts as nursing-home neglect in California?',
        a: 'Under the Elder Abuse Act, neglect is the failure to provide the care a reasonable person would provide \u2014 for example, failing to prevent pressure ulcers, malnutrition, dehydration, or falls, or to attend to medical needs. Chronic understaffing is a common root cause.',
      },
      {
        q: 'How is an elder-abuse claim different from a medical-malpractice claim?',
        a: 'A genuine neglect claim under the Act is distinct from ordinary professional negligence. That matters because a professional-negligence framing is governed by MICRA and its shorter deadlines and damage limits, while a true neglect claim is not, and the Act allows enhanced remedies.',
      },
      {
        q: 'What are the enhanced remedies?',
        a: 'When a plaintiff proves by clear and convincing evidence that a facility is liable for neglect or abuse and acted with recklessness, oppression, fraud, or malice, the Act (section 15657) allows recovery of attorney fees and costs and, where the elder has died, the decedent\u2019s pre-death pain and suffering that ordinary survival law would bar.',
      },
      {
        q: 'We signed an arbitration agreement at admission. Can we still bring a claim?',
        a: 'Often, yes. Admission arbitration agreements are common but frequently contested. Whether one binds the resident depends on who signed it, whether they had authority, and how it was presented.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Nursing Home & Elder Abuse Claims',
    title: 'Long Beach Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried a Long Beach nursing home neglected or abused a loved one? California\u2019s Elder Abuse Act carries enhanced remedies \u2014 and staffing and inspection records tell the story.',
    psychology: 'A loved one was hurt or neglected in a Long Beach facility and I do not know if I can hold it accountable.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach nursing home neglect lawyer',
      'elder abuse claim california',
      'pressure ulcer nursing home lawsuit california',
      'nursing home understaffing neglect california',
      'sue assisted living facility california',
    ],
    signals: [
      'Elder Abuse Act (15600)',
      'Enhanced remedies (15657)',
      'Neglect vs. med-mal',
      'Staffing & CDPH records',
      'Understaffing pattern',
      'Admission arbitration clause',
    ],
    sections: {
      whyItMatters: `Long Beach has an older coastal population and a mix of skilled-nursing and assisted-living facilities, and like the rest of Los Angeles County its facilities show recurring understaffing in state citations \u2014 the condition that turns ordinary care failures into actionable neglect. ${ELDER_ACT} ${ENHANCED} ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The facility name and the resident\u2019s admission date',
        'The specific harm \u2014 pressure ulcer, fall, dehydration, malnutrition, medication error',
        'The care plan and whether it was followed',
        'Signs of understaffing (missed care, delayed responses)',
        'Any arbitration agreement signed at admission and by whom',
        'Photographs of injuries and conditions',
        'The facility\u2019s CDPH inspection and citation history',
        'Medical treatment and any hospital transfers',
      ],
      howClearCaseHelps: `ClearCaseIQ frames whether a Long Beach facility\u2019s conduct is neglect under the Elder Abuse Act rather than ordinary negligence, gathers the staffing, care-plan, and CDPH citation records that prove it, and assesses any admission arbitration agreement. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What counts as nursing-home neglect in California?',
        a: 'Under the Elder Abuse Act, neglect is the failure to provide the care a reasonable person would provide \u2014 for example, failing to prevent pressure ulcers, malnutrition, dehydration, or falls, or to attend to medical needs. Chronic understaffing is a common root cause.',
      },
      {
        q: 'How is an elder-abuse claim different from a medical-malpractice claim?',
        a: 'A genuine neglect claim under the Act is distinct from ordinary professional negligence. That matters because a professional-negligence framing is governed by MICRA and its shorter deadlines and damage limits, while a true neglect claim is not, and the Act allows enhanced remedies.',
      },
      {
        q: 'What are the enhanced remedies?',
        a: 'When a plaintiff proves by clear and convincing evidence that a facility is liable for neglect or abuse and acted with recklessness, oppression, fraud, or malice, the Act (section 15657) allows recovery of attorney fees and costs and, where the elder has died, the decedent\u2019s pre-death pain and suffering that ordinary survival law would bar.',
      },
      {
        q: 'We signed an arbitration agreement at admission. Can we still bring a claim?',
        a: 'Often, yes. Admission arbitration agreements are common but frequently contested. Whether one binds the resident depends on who signed it, whether they had authority, and how it was presented.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const elderAbuseCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SANTAANA_ELDER_SLUG]: {
    scenario: `An Orange County family was told an admission arbitration clause barred their claim after their mother\u2019s untreated pressure ulcer. The clause was contestable \u2014 signed by a relative without authority \u2014 and the staffing and CDPH records showed neglect supporting enhanced remedies. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Photograph injuries; request the chart, care plan, and staffing records.'],
      ['First weeks', 'Pull the facility\u2019s CDPH inspection and citation history.'],
      ['Assessment', 'Frame the conduct as neglect; assess the arbitration clause.'],
      ['Longer term', 'Enhanced-remedies and arbitration challenge developed.'],
    ],
    severityLadder: [
      ['Neglect', 'Care fell below what the law requires.'],
      ['Understaffing', 'Records show a root-cause pattern.'],
      ['Recklessness', 'Clear and convincing proof unlocks enhanced remedies.'],
      ['Arbitration', 'The admission clause must be assessed.'],
    ],
    treatmentProgression: [
      { label: 'Discovery of harm', copy: 'Photographs and the chart document the injury.' },
      { label: 'Records', copy: 'Staffing and care-plan records show the failure.' },
      { label: 'Citations', copy: 'CDPH history establishes a pattern.' },
      { label: 'Ongoing care', copy: 'Treatment and transfers define the harm.' },
    ],
    settlementDrivers: [
      'Whether the conduct is neglect under the Elder Abuse Act',
      'Whether an arbitration clause is enforceable',
      'Whether understaffing shows a pattern',
      'Whether recklessness supports enhanced remedies',
      'The CDPH citation history',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Test arbitration', copy: 'OC admission clauses are often contestable.' },
      { label: 'Neglect, not med-mal', copy: 'The framing changes the deadlines and remedies.' },
      { label: 'Enhanced remedies', copy: 'Fees and pre-death pain/suffering can apply.' },
      { label: 'Records decide it', copy: 'Staffing and CDPH history prove the pattern.' },
    ],
    insuranceProblems: [
      'The arbitration clause is accepted without challenge.',
      'The staffing and care-plan records are never requested.',
      'The claim is framed as ordinary negligence, triggering MICRA limits.',
      'The CDPH citation history goes unexamined.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What facility, and what was the harm?' },
      { label: 'Step 2', question: 'Who signed any arbitration form, and did they have authority?' },
      { label: 'Step 3', question: 'Were there signs of understaffing?' },
      { label: 'Step 4', question: 'Has the chart and care plan been requested?' },
    ],
  },
  [RIVERSIDE_ELDER_SLUG]: {
    scenario: `A Riverside family found their father dehydrated and with a fall injury in an understaffed Inland Empire facility. The staffing records and the facility\u2019s CDPH citation history showed a pattern of neglect supporting enhanced remedies under the Elder Abuse Act. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Photograph injuries; request the chart, care plan, and staffing records.'],
      ['First weeks', 'Pull the facility\u2019s CDPH inspection and citation history.'],
      ['Assessment', 'Frame the conduct as neglect, not ordinary negligence.'],
      ['Longer term', 'Arbitration enforceability and enhanced remedies developed.'],
    ],
    severityLadder: [
      ['Neglect', 'Care fell below what the law requires.'],
      ['Understaffing', 'Records show a root-cause pattern.'],
      ['Recklessness', 'Clear and convincing proof unlocks enhanced remedies.'],
      ['Arbitration', 'The admission clause must be assessed.'],
    ],
    treatmentProgression: [
      { label: 'Discovery of harm', copy: 'Photographs and the chart document the injury.' },
      { label: 'Records', copy: 'Staffing and care-plan records show the failure.' },
      { label: 'Citations', copy: 'CDPH history establishes a pattern.' },
      { label: 'Ongoing care', copy: 'Treatment and transfers define the harm.' },
    ],
    settlementDrivers: [
      'Whether the conduct is neglect under the Elder Abuse Act',
      'Whether understaffing shows a pattern',
      'Whether recklessness supports enhanced remedies',
      'Whether an arbitration clause is enforceable',
      'The CDPH citation history',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Neglect, not med-mal', copy: 'The framing changes the deadlines and remedies.' },
      { label: 'Enhanced remedies', copy: 'Fees and pre-death pain/suffering can apply.' },
      { label: 'Records decide it', copy: 'Staffing and CDPH history prove the pattern.' },
      { label: 'Test arbitration', copy: 'Admission clauses are often contestable.' },
    ],
    insuranceProblems: [
      'The staffing and care-plan records are never requested.',
      'The claim is framed as ordinary negligence, triggering MICRA limits.',
      'The arbitration clause is accepted without challenge.',
      'The CDPH citation history goes unexamined.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What facility, and what was the harm?' },
      { label: 'Step 2', question: 'Were there signs of understaffing?' },
      { label: 'Step 3', question: 'Did anyone sign an arbitration form?' },
      { label: 'Step 4', question: 'Has the chart and care plan been requested?' },
    ],
  },
  [FRESNO_ELDER_SLUG]: {
    scenario: `A Fresno family\u2019s mother developed malnutrition in the only facility available near their rural home. The staffing records and CDPH citation history showed chronic understaffing \u2014 supporting a neglect claim and enhanced remedies rather than an ordinary-negligence framing. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Photograph injuries; request the chart, care plan, and staffing records.'],
      ['First weeks', 'Pull the facility\u2019s CDPH inspection and citation history.'],
      ['Assessment', 'Frame the conduct as neglect, not ordinary negligence.'],
      ['Longer term', 'Arbitration enforceability and enhanced remedies developed.'],
    ],
    severityLadder: [
      ['Neglect', 'Care fell below what the law requires.'],
      ['Understaffing', 'Records show a root-cause pattern.'],
      ['Recklessness', 'Clear and convincing proof unlocks enhanced remedies.'],
      ['Arbitration', 'The admission clause must be assessed.'],
    ],
    treatmentProgression: [
      { label: 'Discovery of harm', copy: 'Photographs and the chart document the injury.' },
      { label: 'Records', copy: 'Staffing and care-plan records show the failure.' },
      { label: 'Citations', copy: 'CDPH history establishes a pattern.' },
      { label: 'Ongoing care', copy: 'Treatment and transfers define the harm.' },
    ],
    settlementDrivers: [
      'Whether the conduct is neglect under the Elder Abuse Act',
      'Whether understaffing shows a pattern',
      'Whether recklessness supports enhanced remedies',
      'Whether an arbitration clause is enforceable',
      'The CDPH citation history',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Neglect, not med-mal', copy: 'The framing changes the deadlines and remedies.' },
      { label: 'Enhanced remedies', copy: 'Fees and pre-death pain/suffering can apply.' },
      { label: 'Records decide it', copy: 'Staffing and CDPH history prove the pattern.' },
      { label: 'Test arbitration', copy: 'Admission clauses are often contestable.' },
    ],
    insuranceProblems: [
      'The staffing and care-plan records are never requested.',
      'The claim is framed as ordinary negligence, triggering MICRA limits.',
      'The arbitration clause is accepted without challenge.',
      'The CDPH citation history goes unexamined.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What facility, and what was the harm?' },
      { label: 'Step 2', question: 'Were there signs of understaffing?' },
      { label: 'Step 3', question: 'Did anyone sign an arbitration form?' },
      { label: 'Step 4', question: 'Has the chart and care plan been requested?' },
    ],
  },
  [LB_ELDER_SLUG]: {
    scenario: `A Long Beach family found their father with an advanced pressure ulcer after months in an understaffed facility. The staffing records and the facility\u2019s CDPH citation history showed a pattern of neglect supporting enhanced remedies under the Elder Abuse Act. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Photograph injuries; request the chart, care plan, and staffing records.'],
      ['First weeks', 'Pull the facility\u2019s CDPH inspection and citation history.'],
      ['Assessment', 'Frame the conduct as neglect, not ordinary negligence.'],
      ['Longer term', 'Arbitration enforceability and enhanced remedies developed.'],
    ],
    severityLadder: [
      ['Neglect', 'Care fell below what the law requires.'],
      ['Understaffing', 'Records show a root-cause pattern.'],
      ['Recklessness', 'Clear and convincing proof unlocks enhanced remedies.'],
      ['Arbitration', 'The admission clause must be assessed.'],
    ],
    treatmentProgression: [
      { label: 'Discovery of harm', copy: 'Photographs and the chart document the injury.' },
      { label: 'Records', copy: 'Staffing and care-plan records show the failure.' },
      { label: 'Citations', copy: 'CDPH history establishes a pattern.' },
      { label: 'Ongoing care', copy: 'Treatment and transfers define the harm.' },
    ],
    settlementDrivers: [
      'Whether the conduct is neglect under the Elder Abuse Act',
      'Whether understaffing shows a pattern',
      'Whether recklessness supports enhanced remedies',
      'Whether an arbitration clause is enforceable',
      'The CDPH citation history',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Neglect, not med-mal', copy: 'The framing changes the deadlines and remedies.' },
      { label: 'Enhanced remedies', copy: 'Fees and pre-death pain/suffering can apply.' },
      { label: 'Records decide it', copy: 'Staffing and CDPH history prove the pattern.' },
      { label: 'Test arbitration', copy: 'Admission clauses are often contestable.' },
    ],
    insuranceProblems: [
      'The staffing and care-plan records are never requested.',
      'The claim is framed as ordinary negligence, triggering MICRA limits.',
      'The arbitration clause is accepted without challenge.',
      'The CDPH citation history goes unexamined.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What facility, and what was the harm?' },
      { label: 'Step 2', question: 'Were there signs of understaffing?' },
      { label: 'Step 3', question: 'Did anyone sign an arbitration form?' },
      { label: 'Step 4', question: 'Has the chart and care plan been requested?' },
    ],
  },
}
