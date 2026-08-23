import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, nursing-home and elder-abuse practice area (batch 3): location-
 * specific guides for San Francisco, Oakland, San Bernardino, and Bakersfield,
 * extending the batch-1 hub (LA, San Diego, Sacramento, San Jose) and batch-2
 * (Santa Ana, Riverside, Fresno, Long Beach).
 *
 * Genuinely local context rather than interpolated copy:
 *  - San Francisco: high-cost skilled-nursing and assisted-living facilities and
 *    a large aging population, with heavy use of admission arbitration clauses.
 *  - Oakland: a mix of skilled-nursing and assisted-living facilities across a
 *    diverse East Bay population, with some facilities cited for understaffing.
 *  - San Bernardino: a spread-out Inland Empire county with rapid senior growth
 *    where facilities are often the only option for miles and understaffing recurs.
 *  - Bakersfield: a Central Valley market serving a wide rural region with a
 *    recurring pattern of understaffing and CDPH citations.
 *
 * Applied accurately (identical to batches 1-2):
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

export const SF_ELDER_SLUG = '/san-francisco-nursing-home-abuse-claim'
export const OAK_ELDER_SLUG = '/oakland-nursing-home-abuse-claim'
export const SB_ELDER_SLUG = '/san-bernardino-nursing-home-abuse-claim'
export const BAKERSFIELD_ELDER_SLUG = '/bakersfield-nursing-home-abuse-claim'

export const elderAbuseCityGuidePages3: LandingPage[] = [
  {
    slug: SF_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Nursing Home & Elder Abuse Claims',
    title: 'San Francisco Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried a San Francisco nursing home neglected or abused a loved one? California\u2019s Elder Abuse Act carries enhanced remedies \u2014 and staffing and inspection records tell the story, even behind an admission arbitration clause.',
    psychology: 'A loved one was hurt or neglected in a San Francisco facility and I do not know if I can hold it accountable.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco nursing home abuse lawyer',
      'elder neglect claim california',
      'bedsores nursing home lawsuit california',
      'nursing home arbitration agreement california',
      'assisted living neglect claim california',
    ],
    signals: [
      'Elder Abuse Act protection',
      'Enhanced remedies (15657)',
      'Neglect vs. MICRA negligence',
      'Staffing & CDPH records',
      'Arbitration clause contested',
      'Pre-death pain and suffering',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s high-cost skilled-nursing and assisted-living facilities serve a large aging population, and admission arbitration clauses are heavily used \u2014 so families are often told a dispute cannot go to court. ${ELDER_ACT} ${ENHANCED} ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'The specific harm (pressure ulcers, falls, malnutrition, dehydration)',
        'The facility\u2019s staffing records for the period',
        'The resident\u2019s care plan and medical chart',
        'The facility\u2019s CDPH inspection and citation history',
        'Any admission arbitration agreement and who signed it',
        'Whether the conduct was reckless (enhanced remedies)',
        'Whether the elder has since died',
        'The dates of decline and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a San Francisco case as Elder Abuse Act neglect rather than MICRA negligence where the facts fit, gathers the staffing and CDPH records that prove it, and evaluates any admission arbitration clause. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'We signed an arbitration agreement at admission. Is a court claim impossible?',
        a: 'Not necessarily. Whether an arbitration agreement binds the resident depends on who signed it, whether they had authority, and how it was presented \u2014 and these agreements are frequently and successfully contested. Do not assume an admission packet forecloses a claim.',
      },
      {
        q: 'How is elder neglect different from ordinary medical negligence?',
        a: 'A genuine neglect claim under the Elder Abuse Act \u2014 often rooted in chronic understaffing \u2014 is legally distinct from professional negligence, which is governed by MICRA\u2019s shorter deadlines and damage limits. Characterising the conduct correctly is central to the case.',
      },
      {
        q: 'What are enhanced remedies?',
        a: 'When neglect or abuse is proven by clear and convincing evidence together with recklessness, oppression, fraud, or malice, the Act allows attorney fees and costs on top of damages, and \u2014 where the elder has died \u2014 recovery of pre-death pain and suffering that ordinary survival law would otherwise bar.',
      },
      {
        q: 'What evidence matters most?',
        a: 'These cases are documentary: staffing records, the care plan and chart, incident reports, and the facility\u2019s CDPH inspection and citation history. Requesting and preserving these records early is essential before they change.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records and the legal framing so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Nursing Home & Elder Abuse Claims',
    title: 'Oakland Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried an Oakland or East Bay nursing home neglected or abused a loved one? California\u2019s Elder Abuse Act carries enhanced remedies, and staffing and inspection records tell the story.',
    psychology: 'A loved one was hurt or neglected in an Oakland facility and I do not know if I can hold it accountable.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland nursing home abuse lawyer',
      'elder neglect claim california',
      'bedsores nursing home lawsuit california',
      'understaffed nursing home california',
      'assisted living neglect claim california',
    ],
    signals: [
      'Elder Abuse Act protection',
      'Enhanced remedies (15657)',
      'Neglect vs. MICRA negligence',
      'Staffing & CDPH records',
      'Arbitration clause contested',
      'Pre-death pain and suffering',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s mix of skilled-nursing and assisted-living facilities serves a diverse East Bay population, and some facilities have been cited for understaffing \u2014 exactly the pattern that turns ordinary shortfalls into actionable neglect. ${ELDER_ACT} ${ENHANCED} ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'The specific harm (pressure ulcers, falls, malnutrition, dehydration)',
        'The facility\u2019s staffing records for the period',
        'The resident\u2019s care plan and medical chart',
        'The facility\u2019s CDPH inspection and citation history',
        'Any admission arbitration agreement and who signed it',
        'Whether the conduct was reckless (enhanced remedies)',
        'Whether the elder has since died',
        'The dates of decline and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ frames an Oakland case as Elder Abuse Act neglect rather than MICRA negligence where the facts fit, gathers the staffing and CDPH citation records that prove it, and evaluates any admission arbitration clause. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The facility was understaffed. Is that neglect?',
        a: 'Chronic understaffing is frequently at the root of a genuine neglect claim under the Elder Abuse Act, because it leads to the failures the Act addresses \u2014 unprevented pressure ulcers, falls, malnutrition, and dehydration. Staffing records and the CDPH citation history are what prove the pattern.',
      },
      {
        q: 'How is elder neglect different from ordinary medical negligence?',
        a: 'A genuine neglect claim under the Act is legally distinct from professional negligence, which is governed by MICRA\u2019s shorter deadlines and damage limits. Characterising the conduct correctly is central to the case.',
      },
      {
        q: 'We signed an arbitration agreement at admission. Is a court claim impossible?',
        a: 'Not necessarily. Whether it binds the resident depends on who signed it, whether they had authority, and how it was presented \u2014 and these agreements are frequently and successfully contested.',
      },
      {
        q: 'What are enhanced remedies?',
        a: 'When neglect or abuse is proven by clear and convincing evidence together with recklessness, oppression, fraud, or malice, the Act allows attorney fees and costs on top of damages, and \u2014 where the elder has died \u2014 recovery of pre-death pain and suffering.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records and the legal framing so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Nursing Home & Elder Abuse Claims',
    title: 'San Bernardino Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried an Inland Empire nursing home neglected or abused a loved one? California\u2019s Elder Abuse Act carries enhanced remedies, and staffing and inspection records tell the story.',
    psychology: 'A loved one was hurt or neglected in a San Bernardino facility and I do not know if I can hold it accountable.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino nursing home abuse lawyer',
      'elder neglect claim california',
      'bedsores nursing home lawsuit california',
      'understaffed nursing home california',
      'assisted living neglect claim california',
    ],
    signals: [
      'Elder Abuse Act protection',
      'Enhanced remedies (15657)',
      'Neglect vs. MICRA negligence',
      'Understaffing across a spread-out county',
      'Staffing & CDPH records',
      'Arbitration clause contested',
    ],
    sections: {
      whyItMatters: `San Bernardino County is a spread-out Inland Empire market with rapid senior growth, where a facility is often the only option for miles and understaffing recurs \u2014 exactly the pattern behind genuine neglect. ${ELDER_ACT} ${ENHANCED} ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'The specific harm (pressure ulcers, falls, malnutrition, dehydration)',
        'The facility\u2019s staffing records for the period',
        'The resident\u2019s care plan and medical chart',
        'The facility\u2019s CDPH inspection and citation history',
        'Any admission arbitration agreement and who signed it',
        'Whether the conduct was reckless (enhanced remedies)',
        'Whether the elder has since died',
        'The dates of decline and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a San Bernardino case as Elder Abuse Act neglect rather than MICRA negligence where the facts fit, gathers the staffing and CDPH records that prove it, and evaluates any admission arbitration clause. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The facility was chronically understaffed. Is that neglect?',
        a: 'Chronic understaffing is frequently at the root of a genuine neglect claim under the Elder Abuse Act, because it leads to unprevented pressure ulcers, falls, malnutrition, and dehydration. Staffing records and the CDPH citation history are what prove the pattern.',
      },
      {
        q: 'How is elder neglect different from ordinary medical negligence?',
        a: 'A genuine neglect claim under the Act is legally distinct from professional negligence, which is governed by MICRA\u2019s shorter deadlines and damage limits. Characterising the conduct correctly is central to the case.',
      },
      {
        q: 'What are enhanced remedies?',
        a: 'When neglect or abuse is proven by clear and convincing evidence together with recklessness, oppression, fraud, or malice, the Act allows attorney fees and costs on top of damages, and \u2014 where the elder has died \u2014 recovery of pre-death pain and suffering.',
      },
      {
        q: 'We signed an arbitration agreement at admission. Is a court claim impossible?',
        a: 'Not necessarily. Whether it binds the resident depends on who signed it, whether they had authority, and how it was presented \u2014 and these agreements are frequently and successfully contested.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records and the legal framing so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Nursing Home & Elder Abuse Claims',
    title: 'Bakersfield Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried a Kern County nursing home neglected or abused a loved one? California\u2019s Elder Abuse Act carries enhanced remedies, and staffing and inspection records tell the story.',
    psychology: 'A loved one was hurt or neglected in a Bakersfield facility and I do not know if I can hold it accountable.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield nursing home abuse lawyer',
      'elder neglect claim california',
      'bedsores nursing home lawsuit california',
      'understaffed nursing home california',
      'assisted living neglect claim california',
    ],
    signals: [
      'Elder Abuse Act protection',
      'Enhanced remedies (15657)',
      'Neglect vs. MICRA negligence',
      'Rural-region understaffing',
      'Staffing & CDPH records',
      'Arbitration clause contested',
    ],
    sections: {
      whyItMatters: `Bakersfield\u2019s facilities serve a wide Central Valley region, with a recurring pattern of understaffing and CDPH citations \u2014 exactly the conditions that turn ordinary shortfalls into actionable neglect under the Act. ${ELDER_ACT} ${ENHANCED} ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'The specific harm (pressure ulcers, falls, malnutrition, dehydration)',
        'The facility\u2019s staffing records for the period',
        'The resident\u2019s care plan and medical chart',
        'The facility\u2019s CDPH inspection and citation history',
        'Any admission arbitration agreement and who signed it',
        'Whether the conduct was reckless (enhanced remedies)',
        'Whether the elder has since died',
        'The dates of decline and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a Bakersfield case as Elder Abuse Act neglect rather than MICRA negligence where the facts fit, gathers the staffing and CDPH citation records that prove it, and evaluates any admission arbitration clause. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The facility has a history of CDPH citations. Does that matter?',
        a: 'Yes. The facility\u2019s state inspection and citation history from the California Department of Public Health is central evidence of whether care fell below what the law requires, and a documented pattern can support both liability and the recklessness needed for enhanced remedies.',
      },
      {
        q: 'How is elder neglect different from ordinary medical negligence?',
        a: 'A genuine neglect claim under the Act is legally distinct from professional negligence, which is governed by MICRA\u2019s shorter deadlines and damage limits. Characterising the conduct correctly is central to the case.',
      },
      {
        q: 'What are enhanced remedies?',
        a: 'When neglect or abuse is proven by clear and convincing evidence together with recklessness, oppression, fraud, or malice, the Act allows attorney fees and costs on top of damages, and \u2014 where the elder has died \u2014 recovery of pre-death pain and suffering.',
      },
      {
        q: 'We signed an arbitration agreement at admission. Is a court claim impossible?',
        a: 'Not necessarily. Whether it binds the resident depends on who signed it, whether they had authority, and how it was presented \u2014 and these agreements are frequently and successfully contested.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records and the legal framing so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const elderAbuseCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [SF_ELDER_SLUG]: {
    scenario: `A San Francisco family was told an admission arbitration clause barred court, but the resident had not signed it and the relative lacked authority. Reframed as Elder Abuse Act neglect, staffing and CDPH records drove the case. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Request the chart, care plan, and staffing records.'],
      ['First weeks', 'Pull the CDPH citation history; assess arbitration.'],
      ['Assessment', 'Neglect vs. MICRA framing decided.'],
      ['Longer term', 'Liability, enhanced remedies, and damages developed.'],
    ],
    severityLadder: [
      ['The harm', 'Ulcers, falls, malnutrition, dehydration.'],
      ['The cause', 'Understaffing or care failure.'],
      ['The framing', 'Neglect, not MICRA negligence.'],
      ['The remedies', 'Enhanced if reckless.'],
    ],
    treatmentProgression: [
      { label: 'Onset', copy: 'The decline or injury is documented.' },
      { label: 'Records', copy: 'Chart and staffing records are gathered.' },
      { label: 'CDPH history', copy: 'Citations establish the pattern.' },
      { label: 'Outcome', copy: 'The full harm is quantified.' },
    ],
    settlementDrivers: [
      'Whether the conduct is neglect under the Act',
      'Whether staffing records show the failure',
      'The CDPH citation history',
      'Whether the conduct was reckless (enhanced remedies)',
      'Whether an arbitration clause is enforceable',
      'The severity of the harm',
    ],
    settlementValueDetails: [
      { label: 'Framing matters', copy: 'Neglect avoids MICRA limits.' },
      { label: 'Records prove it', copy: 'Staffing and CDPH history.' },
      { label: 'Enhanced remedies', copy: 'Fees and pre-death suffering.' },
      { label: 'Arbitration', copy: 'Frequently contested.' },
    ],
    insuranceProblems: [
      'The case is mischaracterised as MICRA negligence.',
      'Staffing and CDPH records are never obtained.',
      'An arbitration clause is accepted without challenge.',
      'Reckless conduct supporting enhanced remedies is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What harm did the resident suffer?' },
      { label: 'Step 2', question: 'Was the facility understaffed?' },
      { label: 'Step 3', question: 'Who signed any arbitration agreement?' },
      { label: 'Step 4', question: 'Has the elder since died?' },
    ],
  },
  [OAK_ELDER_SLUG]: {
    scenario: `An Oakland resident developed advanced pressure ulcers at a facility with a documented understaffing citation history. Staffing records and the CDPH history supported an Elder Abuse Act neglect claim with enhanced remedies. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Request the chart, care plan, and staffing records.'],
      ['First weeks', 'Pull the CDPH citation history; assess arbitration.'],
      ['Assessment', 'Neglect vs. MICRA framing decided.'],
      ['Longer term', 'Liability, enhanced remedies, and damages developed.'],
    ],
    severityLadder: [
      ['The harm', 'Ulcers, falls, malnutrition, dehydration.'],
      ['The cause', 'Understaffing or care failure.'],
      ['The framing', 'Neglect, not MICRA negligence.'],
      ['The remedies', 'Enhanced if reckless.'],
    ],
    treatmentProgression: [
      { label: 'Onset', copy: 'The decline or injury is documented.' },
      { label: 'Records', copy: 'Chart and staffing records are gathered.' },
      { label: 'CDPH history', copy: 'Citations establish the pattern.' },
      { label: 'Outcome', copy: 'The full harm is quantified.' },
    ],
    settlementDrivers: [
      'Whether the conduct is neglect under the Act',
      'Whether staffing records show the failure',
      'The CDPH citation history',
      'Whether the conduct was reckless (enhanced remedies)',
      'Whether an arbitration clause is enforceable',
      'The severity of the harm',
    ],
    settlementValueDetails: [
      { label: 'Framing matters', copy: 'Neglect avoids MICRA limits.' },
      { label: 'Records prove it', copy: 'Staffing and CDPH history.' },
      { label: 'Enhanced remedies', copy: 'Fees and pre-death suffering.' },
      { label: 'Arbitration', copy: 'Frequently contested.' },
    ],
    insuranceProblems: [
      'The case is mischaracterised as MICRA negligence.',
      'Staffing and CDPH records are never obtained.',
      'An arbitration clause is accepted without challenge.',
      'Reckless conduct supporting enhanced remedies is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What harm did the resident suffer?' },
      { label: 'Step 2', question: 'Was the facility understaffed or cited?' },
      { label: 'Step 3', question: 'Who signed any arbitration agreement?' },
      { label: 'Step 4', question: 'Has the elder since died?' },
    ],
  },
  [SB_ELDER_SLUG]: {
    scenario: `A San Bernardino resident at the only facility for miles suffered repeated falls tied to chronic understaffing. Staffing records and the CDPH history framed the case as Elder Abuse Act neglect rather than MICRA negligence. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Request the chart, care plan, and staffing records.'],
      ['First weeks', 'Pull the CDPH citation history; assess arbitration.'],
      ['Assessment', 'Neglect vs. MICRA framing decided.'],
      ['Longer term', 'Liability, enhanced remedies, and damages developed.'],
    ],
    severityLadder: [
      ['The harm', 'Ulcers, falls, malnutrition, dehydration.'],
      ['The cause', 'Understaffing or care failure.'],
      ['The framing', 'Neglect, not MICRA negligence.'],
      ['The remedies', 'Enhanced if reckless.'],
    ],
    treatmentProgression: [
      { label: 'Onset', copy: 'The decline or injury is documented.' },
      { label: 'Records', copy: 'Chart and staffing records are gathered.' },
      { label: 'CDPH history', copy: 'Citations establish the pattern.' },
      { label: 'Outcome', copy: 'The full harm is quantified.' },
    ],
    settlementDrivers: [
      'Whether the conduct is neglect under the Act',
      'Whether staffing records show the failure',
      'The CDPH citation history',
      'Whether the conduct was reckless (enhanced remedies)',
      'Whether an arbitration clause is enforceable',
      'The severity of the harm',
    ],
    settlementValueDetails: [
      { label: 'Framing matters', copy: 'Neglect avoids MICRA limits.' },
      { label: 'Records prove it', copy: 'Staffing and CDPH history.' },
      { label: 'Enhanced remedies', copy: 'Fees and pre-death suffering.' },
      { label: 'Arbitration', copy: 'Frequently contested.' },
    ],
    insuranceProblems: [
      'The case is mischaracterised as MICRA negligence.',
      'Staffing and CDPH records are never obtained.',
      'An arbitration clause is accepted without challenge.',
      'Reckless conduct supporting enhanced remedies is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What harm did the resident suffer?' },
      { label: 'Step 2', question: 'Was the facility chronically understaffed?' },
      { label: 'Step 3', question: 'Who signed any arbitration agreement?' },
      { label: 'Step 4', question: 'Has the elder since died?' },
    ],
  },
  [BAKERSFIELD_ELDER_SLUG]: {
    scenario: `A Bakersfield resident became malnourished and dehydrated at a facility with a pattern of CDPH citations. That documented history supported an Elder Abuse Act neglect claim with enhanced remedies. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Request the chart, care plan, and staffing records.'],
      ['First weeks', 'Pull the CDPH citation history; assess arbitration.'],
      ['Assessment', 'Neglect vs. MICRA framing decided.'],
      ['Longer term', 'Liability, enhanced remedies, and damages developed.'],
    ],
    severityLadder: [
      ['The harm', 'Ulcers, falls, malnutrition, dehydration.'],
      ['The cause', 'Understaffing or care failure.'],
      ['The framing', 'Neglect, not MICRA negligence.'],
      ['The remedies', 'Enhanced if reckless.'],
    ],
    treatmentProgression: [
      { label: 'Onset', copy: 'The decline or injury is documented.' },
      { label: 'Records', copy: 'Chart and staffing records are gathered.' },
      { label: 'CDPH history', copy: 'Citations establish the pattern.' },
      { label: 'Outcome', copy: 'The full harm is quantified.' },
    ],
    settlementDrivers: [
      'Whether the conduct is neglect under the Act',
      'Whether staffing records show the failure',
      'The CDPH citation history',
      'Whether the conduct was reckless (enhanced remedies)',
      'Whether an arbitration clause is enforceable',
      'The severity of the harm',
    ],
    settlementValueDetails: [
      { label: 'Framing matters', copy: 'Neglect avoids MICRA limits.' },
      { label: 'Records prove it', copy: 'Staffing and CDPH history.' },
      { label: 'Enhanced remedies', copy: 'Fees and pre-death suffering.' },
      { label: 'Arbitration', copy: 'Frequently contested.' },
    ],
    insuranceProblems: [
      'The case is mischaracterised as MICRA negligence.',
      'Staffing and CDPH records are never obtained.',
      'An arbitration clause is accepted without challenge.',
      'Reckless conduct supporting enhanced remedies is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What harm did the resident suffer?' },
      { label: 'Step 2', question: 'Does the facility have a citation history?' },
      { label: 'Step 3', question: 'Who signed any arbitration agreement?' },
      { label: 'Step 4', question: 'Has the elder since died?' },
    ],
  },
}
