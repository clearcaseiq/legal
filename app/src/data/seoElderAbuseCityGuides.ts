import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, nursing-home and elder-abuse practice area: location-specific
 * guides for Los Angeles, San Diego, Sacramento, and San Jose.
 *
 * A neglect or abuse claim on behalf of an elder or dependent adult in a
 * skilled-nursing or assisted-living facility is a distinct claim type. It runs
 * under the Elder Abuse and Dependent Adult Civil Protection Act, which carries
 * enhanced remedies that ordinary negligence does not, turns heavily on staffing
 * and inspection records, and frequently collides with an arbitration agreement
 * signed at admission.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: the largest concentration of skilled-nursing beds in the
 *    state, with chronic understaffing a recurring theme in state citations.
 *  - San Diego: a large retiree and military-retiree population, with federal
 *    and VA facilities that can route a claim through the Federal Tort Claims
 *    Act instead of state court.
 *  - Sacramento: the state capital, home to state-run veterans homes and
 *    public-entity facilities that can implicate the Government Claims Act.
 *  - San Jose: a high-cost Silicon Valley market with premium assisted-living
 *    and memory-care facilities that lean heavily on admission arbitration
 *    clauses.
 *
 * Applied accurately:
 *  - The Elder Abuse Act (Welfare and Institutions Code section 15600 and
 *    following) protects those 65 and older and dependent adults from physical
 *    abuse, neglect, and financial abuse.
 *  - Where a plaintiff proves by clear and convincing evidence that a facility
 *    is liable for neglect or abuse and acted with recklessness, oppression,
 *    fraud, or malice, the Act allows enhanced remedies (Welfare and
 *    Institutions Code section 15657): reasonable attorney fees and costs, and,
 *    when the elder has died, recovery of the decedent's pre-death pain and
 *    suffering that ordinary survival law would bar.
 *  - True neglect under the Act (for example, understaffing that leads to
 *    pressure ulcers, falls, dehydration, or malnutrition) is distinct from
 *    ordinary professional negligence, which matters because MICRA and its
 *    shorter deadlines apply to a professional-negligence framing but not to a
 *    genuine neglect claim.
 *  - The evidence is documentary: staffing records, the care plan, the medical
 *    chart, and the facility's state inspection and citation history from the
 *    California Department of Public Health.
 *  - Arbitration agreements signed at admission are common and often contested;
 *    their enforceability depends on who signed and how.
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

export const LA_ELDER_SLUG = '/los-angeles-nursing-home-abuse-claim'
export const SD_ELDER_SLUG = '/san-diego-nursing-home-abuse-claim'
export const SAC_ELDER_SLUG = '/sacramento-nursing-home-abuse-claim'
export const SJ_ELDER_SLUG = '/san-jose-nursing-home-abuse-claim'

export const elderAbuseCityGuidePages: LandingPage[] = [
  {
    slug: LA_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Nursing Home & Elder Abuse Claims',
    title: 'Los Angeles Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried a Los Angeles nursing home neglected or abused a loved one? California\u2019s Elder Abuse Act carries enhanced remedies \u2014 and staffing and inspection records tell the story.',
    psychology: 'A loved one was hurt or neglected in an LA nursing home and I do not know if I can hold the facility accountable.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles nursing home neglect lawyer',
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
      'Admission arbitration clause',
      'Understaffing pattern',
    ],
    sections: {
      whyItMatters: `Los Angeles has the largest concentration of skilled-nursing beds in the state, and chronic understaffing is a recurring theme in state citations \u2014 the exact condition that turns ordinary care failures into actionable neglect. ${ELDER_ACT} ${ENHANCED} ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases are filed in Los Angeles County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ frames whether an LA facility\u2019s conduct is neglect under the Elder Abuse Act rather than ordinary negligence, gathers the staffing, care-plan, and CDPH citation records that prove it, and assesses any admission arbitration agreement. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What counts as nursing-home neglect in California?',
        a: 'Under the Elder Abuse Act (Welfare and Institutions Code section 15600 and following), neglect is the failure to provide the care a reasonable person would provide \u2014 for example, failing to prevent pressure ulcers, malnutrition, dehydration, or falls, or to attend to medical needs. Chronic understaffing is a common root cause.',
      },
      {
        q: 'How is an elder-abuse claim different from a medical-malpractice claim?',
        a: 'A genuine neglect claim under the Act is distinct from ordinary professional negligence. That matters because a professional-negligence framing is governed by MICRA and its shorter deadlines and damage limits, while a true neglect claim is not, and the Act allows enhanced remedies. Characterising the conduct correctly is central.',
      },
      {
        q: 'What are the enhanced remedies?',
        a: 'When a plaintiff proves by clear and convincing evidence that a facility is liable for neglect or abuse and acted with recklessness, oppression, fraud, or malice, the Act (Welfare and Institutions Code section 15657) allows recovery of attorney fees and costs and, where the elder has died, the decedent\u2019s pre-death pain and suffering that ordinary survival law would bar.',
      },
      {
        q: 'We signed an arbitration agreement at admission. Can we still bring a claim?',
        a: 'Often, yes. Admission arbitration agreements are common but frequently contested. Whether one binds the resident depends on who signed it, whether they had authority, and how it was presented. Do not assume an admission packet forecloses a claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the staffing and inspection records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Nursing Home & Elder Abuse Claims',
    title: 'San Diego Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried a San Diego facility neglected an elder? California\u2019s Elder Abuse Act carries enhanced remedies \u2014 but a VA or federal facility can route the claim through federal law.',
    psychology: 'A loved one was neglected in a San Diego care facility and I am not sure if it is a state or a federal facility.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego nursing home neglect lawyer',
      'elder abuse claim california',
      'va nursing home neglect claim california',
      'assisted living neglect lawsuit california',
      'pressure ulcer nursing home lawsuit california',
    ],
    signals: [
      'Elder Abuse Act (15600)',
      'Enhanced remedies (15657)',
      'VA / federal facility (FTCA)',
      'Neglect vs. med-mal',
      'Staffing & CDPH records',
      'Admission arbitration clause',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s large retiree and military-retiree population means a neglect claim here can involve a private facility, a VA or other federal facility, or an assisted-living residence \u2014 and identifying which one determines the entire path. ${ELDER_ACT} ${ENHANCED} A claim against a VA or other federal facility runs through the Federal Tort Claims Act, which requires an administrative claim first and follows federal rules rather than the state Elder Abuse Act. ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases against private facilities are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Whether the facility is private, VA, or otherwise federal',
        'The facility name and the resident\u2019s admission date',
        'The specific harm \u2014 pressure ulcer, fall, dehydration, malnutrition',
        'The care plan and whether it was followed',
        'Any arbitration agreement signed at admission and by whom',
        'Photographs of injuries and conditions',
        'The facility\u2019s CDPH inspection and citation history',
        'Medical treatment and any hospital transfers',
      ],
      howClearCaseHelps: `ClearCaseIQ first determines whether a San Diego facility is private, VA, or federal \u2014 which decides whether the Elder Abuse Act or the Federal Tort Claims Act governs \u2014 then gathers the staffing, care-plan, and citation records and assesses any arbitration agreement. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The facility is a VA or federal home. Does that change my claim?',
        a: 'Yes. A claim against a VA or other federal facility runs through the Federal Tort Claims Act, which requires an administrative claim first and follows federal rules and deadlines rather than the state Elder Abuse Act. Identifying whether the facility is private or federal is the essential first step.',
      },
      {
        q: 'What counts as nursing-home neglect in California?',
        a: 'Under the Elder Abuse Act (Welfare and Institutions Code section 15600 and following), neglect is the failure to provide the care a reasonable person would provide \u2014 for example, failing to prevent pressure ulcers, malnutrition, dehydration, or falls. Understaffing is a common root cause.',
      },
      {
        q: 'What are the enhanced remedies?',
        a: 'When a plaintiff proves by clear and convincing evidence that a facility is liable for neglect or abuse and acted with recklessness, oppression, fraud, or malice, the Act (Welfare and Institutions Code section 15657) allows recovery of attorney fees and costs and, where the elder has died, the decedent\u2019s pre-death pain and suffering.',
      },
      {
        q: 'We signed an arbitration agreement. Can we still bring a claim?',
        a: 'Often, yes. Admission arbitration agreements are common but frequently contested. Whether one binds the resident depends on who signed it, whether they had authority, and how it was presented.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Nursing Home & Elder Abuse Claims',
    title: 'Sacramento Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried a Sacramento-area facility neglected an elder? California\u2019s Elder Abuse Act carries enhanced remedies \u2014 but a state-run or public facility adds a six-month deadline.',
    psychology: 'A loved one was neglected in a Sacramento-area facility and I do not know if it is a private, state, or public home.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento nursing home neglect lawyer',
      'elder abuse claim california',
      'state veterans home neglect california',
      'pressure ulcer nursing home lawsuit california',
      'public nursing facility neglect claim california',
    ],
    signals: [
      'Elder Abuse Act (15600)',
      'Enhanced remedies (15657)',
      'State / public facility',
      'Six-month claim (911.2)',
      'Staffing & CDPH records',
      'Admission arbitration clause',
    ],
    sections: {
      whyItMatters: `As the state capital, the Sacramento region is home to state-run veterans homes and public-entity facilities alongside private nursing homes \u2014 and a claim against a public entity adds a hard, early deadline. ${ELDER_ACT} ${ENHANCED} If the facility is a public entity, the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the usual deadline. ${NEGLECT_VS_MED} ${EVIDENCE} ${ARBITRATION} Civil cases against private facilities are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Whether the facility is private, state-run, or otherwise public',
        'The facility name and the resident\u2019s admission date',
        'The specific harm \u2014 pressure ulcer, fall, dehydration, malnutrition',
        'The care plan and whether it was followed',
        'The date of injury, which starts any six-month clock',
        'Any arbitration agreement signed at admission and by whom',
        'The facility\u2019s CDPH inspection and citation history',
        'Medical treatment and any hospital transfers',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether a Sacramento-area facility is private, state-run, or public \u2014 which decides whether a six-month government claim applies \u2014 then gathers the staffing, care-plan, and citation records and assesses any arbitration agreement. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The facility is state-run or public. Does that change my deadline?',
        a: 'Yes. If the facility is a public entity, the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the usual deadline. Identifying whether the facility is private or public is essential, and it must be done quickly.',
      },
      {
        q: 'What counts as nursing-home neglect in California?',
        a: 'Under the Elder Abuse Act (Welfare and Institutions Code section 15600 and following), neglect is the failure to provide the care a reasonable person would provide \u2014 for example, failing to prevent pressure ulcers, malnutrition, dehydration, or falls. Understaffing is a common root cause.',
      },
      {
        q: 'What are the enhanced remedies?',
        a: 'When a plaintiff proves by clear and convincing evidence that a facility is liable for neglect or abuse and acted with recklessness, oppression, fraud, or malice, the Act (Welfare and Institutions Code section 15657) allows recovery of attorney fees and costs and, where the elder has died, the decedent\u2019s pre-death pain and suffering.',
      },
      {
        q: 'We signed an arbitration agreement. Can we still bring a claim?',
        a: 'Often, yes. Admission arbitration agreements are common but frequently contested. Whether one binds the resident depends on who signed it, whether they had authority, and how it was presented.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_ELDER_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Nursing Home & Elder Abuse Claims',
    title: 'San Jose Nursing Home & Elder Abuse Claims',
    eyebrow: 'California local injury guide',
    description:
      'Worried a San Jose facility neglected an elder? California\u2019s Elder Abuse Act carries enhanced remedies \u2014 and premium memory-care residences lean heavily on arbitration clauses.',
    psychology: 'A loved one was neglected in a high-cost San Jose care or memory-care facility and I do not know if the arbitration form we signed blocks a claim.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose nursing home neglect lawyer',
      'elder abuse claim california',
      'memory care facility neglect lawsuit california',
      'assisted living arbitration agreement california',
      'pressure ulcer nursing home lawsuit california',
    ],
    signals: [
      'Elder Abuse Act (15600)',
      'Enhanced remedies (15657)',
      'Memory-care & assisted living',
      'Admission arbitration clause',
      'Neglect vs. med-mal',
      'Staffing & CDPH records',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s high-cost Silicon Valley market is full of premium assisted-living and memory-care residences \u2014 and those facilities lean especially hard on the arbitration clauses buried in admission packets, so whether that clause is enforceable is often the first fight. ${ARBITRATION} ${ELDER_ACT} ${ENHANCED} A high price tag does not guarantee adequate staffing, and memory-care residents are especially vulnerable to falls, wandering, and untreated conditions. ${NEGLECT_VS_MED} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'Any arbitration agreement signed at admission and by whom',
        'The facility name and the resident\u2019s admission date',
        'The specific harm \u2014 fall, wandering, pressure ulcer, dehydration',
        'For memory care, the supervision and wander-prevention plan',
        'The care plan and whether it was followed',
        'Photographs of injuries and conditions',
        'The facility\u2019s CDPH inspection and citation history',
        'Medical treatment and any hospital transfers',
      ],
      howClearCaseHelps: `ClearCaseIQ assesses whether a San Jose facility\u2019s admission arbitration clause is enforceable, frames the conduct as neglect under the Elder Abuse Act, and gathers the staffing, supervision, and citation records that memory-care and assisted-living cases turn on. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'We signed an arbitration agreement at a memory-care facility. Can we still sue?',
        a: 'Often, yes. Admission arbitration agreements are common \u2014 especially at premium assisted-living and memory-care residences \u2014 but frequently contested. Whether one binds the resident depends on who signed it, whether they had authority, and how it was presented. Do not assume it forecloses a claim.',
      },
      {
        q: 'What counts as neglect in a memory-care or assisted-living facility?',
        a: 'Under the Elder Abuse Act (Welfare and Institutions Code section 15600 and following), neglect is the failure to provide the care a reasonable person would provide. In memory care, that often means failing to prevent falls, wandering, or untreated medical conditions in vulnerable residents. A high price does not guarantee adequate staffing.',
      },
      {
        q: 'What are the enhanced remedies?',
        a: 'When a plaintiff proves by clear and convincing evidence that a facility is liable for neglect or abuse and acted with recklessness, oppression, fraud, or malice, the Act (Welfare and Institutions Code section 15657) allows recovery of attorney fees and costs and, where the elder has died, the decedent\u2019s pre-death pain and suffering.',
      },
      {
        q: 'How is this different from a medical-malpractice claim?',
        a: 'A genuine neglect claim under the Act is distinct from ordinary professional negligence, which is governed by MICRA and its shorter deadlines and damage limits. A true neglect claim is not, and it allows enhanced remedies. Characterising the conduct correctly is central.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const elderAbuseCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_ELDER_SLUG]: {
    scenario: `An LA family found their mother with an advanced pressure ulcer after months in an understaffed facility. The staffing records and the facility\u2019s CDPH citation history showed a pattern of neglect \u2014 supporting enhanced remedies under the Elder Abuse Act. ${NOT_ADVICE}`,
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
  [SD_ELDER_SLUG]: {
    scenario: `A San Diego family\u2019s father was neglected in a facility they later learned was federally run. Identifying it as a VA facility routed the claim through the Federal Tort Claims Act and its administrative-claim requirement rather than state court. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether the facility is private, VA, or federal.'],
      ['First weeks', 'Photograph injuries; request the chart and care plan.'],
      ['Assessment', 'Choose the right path \u2014 state Elder Abuse Act or FTCA.'],
      ['Longer term', 'Deadlines and enhanced remedies (if state) developed.'],
    ],
    severityLadder: [
      ['Right forum', 'Private, VA, or federal decides the path.'],
      ['Neglect', 'Care fell below what the law requires.'],
      ['Recklessness', 'Clear and convincing proof unlocks enhanced remedies.'],
      ['Arbitration', 'Private-facility clauses must be assessed.'],
    ],
    treatmentProgression: [
      { label: 'Identify facility', copy: 'Ownership determines the entire path.' },
      { label: 'Discovery of harm', copy: 'Photographs and the chart document the injury.' },
      { label: 'Records', copy: 'Staffing and care-plan records show the failure.' },
      { label: 'Ongoing care', copy: 'Treatment and transfers define the harm.' },
    ],
    settlementDrivers: [
      'Whether the facility is private, VA, or federal',
      'Whether the conduct is neglect under the Elder Abuse Act',
      'Whether an FTCA administrative claim is required',
      'Whether recklessness supports enhanced remedies',
      'Whether an arbitration clause is enforceable',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Ownership first', copy: 'Private vs. federal decides the path.' },
      { label: 'FTCA is different', copy: 'Federal facilities need an administrative claim.' },
      { label: 'Enhanced remedies', copy: 'State claims can include fees and more.' },
      { label: 'Test arbitration', copy: 'Private-facility clauses are often contestable.' },
    ],
    insuranceProblems: [
      'A federal facility is treated as a private one, missing the FTCA path.',
      'The staffing and care-plan records are never requested.',
      'The claim is framed as ordinary negligence, triggering MICRA limits.',
      'The arbitration clause is accepted without challenge.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is the facility private, VA, or federal?' },
      { label: 'Step 2', question: 'What was the harm, and when?' },
      { label: 'Step 3', question: 'Did anyone sign an arbitration form?' },
      { label: 'Step 4', question: 'Has the chart and care plan been requested?' },
    ],
  },
  [SAC_ELDER_SLUG]: {
    scenario: `A Sacramento family\u2019s relative was neglected in a state-run veterans home. Recognising it as a public entity meant a six-month government claim had to be presented before suit \u2014 a deadline they met just in time. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether the facility is private, state-run, or public.'],
      ['First weeks', 'Photograph injuries; request the chart and care plan.'],
      ['Six-month mark', 'If public, present the government claim to the right entity.'],
      ['Longer term', 'Enhanced remedies and arbitration issues developed.'],
    ],
    severityLadder: [
      ['Right entity', 'Private, state-run, or public decides the deadline.'],
      ['Neglect', 'Care fell below what the law requires.'],
      ['Deadline', 'Public facilities carry a six-month claim.'],
      ['Recklessness', 'Clear and convincing proof unlocks enhanced remedies.'],
    ],
    treatmentProgression: [
      { label: 'Identify facility', copy: 'Ownership determines the deadline.' },
      { label: 'Discovery of harm', copy: 'Photographs and the chart document the injury.' },
      { label: 'Records', copy: 'Staffing and care-plan records show the failure.' },
      { label: 'Ongoing care', copy: 'Treatment and transfers define the harm.' },
    ],
    settlementDrivers: [
      'Whether the facility is private, state-run, or public',
      'Whether a six-month government claim applies',
      'Whether the conduct is neglect under the Elder Abuse Act',
      'Whether recklessness supports enhanced remedies',
      'Whether an arbitration clause is enforceable',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Ownership first', copy: 'Public facilities carry a six-month deadline.' },
      { label: 'Deadline is short', copy: 'Six months, not the usual longer period.' },
      { label: 'Enhanced remedies', copy: 'Private claims can include fees and more.' },
      { label: 'Test arbitration', copy: 'Private-facility clauses are often contestable.' },
    ],
    insuranceProblems: [
      'A public facility is missed, and the six-month deadline lapses.',
      'The staffing and care-plan records are never requested.',
      'The claim is framed as ordinary negligence, triggering MICRA limits.',
      'The arbitration clause is accepted without challenge.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is the facility private, state-run, or public?' },
      { label: 'Step 2', question: 'What was the harm, and when?' },
      { label: 'Step 3', question: 'Did anyone sign an arbitration form?' },
      { label: 'Step 4', question: 'Has the chart and care plan been requested?' },
    ],
  },
  [SJ_ELDER_SLUG]: {
    scenario: `A San Jose family\u2019s mother wandered and fell in a premium memory-care facility. The admission arbitration clause was challenged as improperly signed, and the supervision records showed the neglect the Elder Abuse Act reaches. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Locate the admission packet and any arbitration form.'],
      ['First weeks', 'Photograph injuries; request the supervision and care plan.'],
      ['Assessment', 'Test the arbitration clause; frame the conduct as neglect.'],
      ['Longer term', 'Enhanced remedies and CDPH history developed.'],
    ],
    severityLadder: [
      ['Arbitration', 'The admission clause is often the first fight.'],
      ['Neglect', 'Falls and wandering can reflect a supervision failure.'],
      ['Recklessness', 'Clear and convincing proof unlocks enhanced remedies.'],
      ['Pattern', 'CDPH citations show whether it was systemic.'],
    ],
    treatmentProgression: [
      { label: 'Admission packet', copy: 'The arbitration clause must be assessed early.' },
      { label: 'Discovery of harm', copy: 'Photographs and the chart document the injury.' },
      { label: 'Records', copy: 'Supervision and care-plan records show the failure.' },
      { label: 'Ongoing care', copy: 'Treatment and transfers define the harm.' },
    ],
    settlementDrivers: [
      'Whether the arbitration clause is enforceable',
      'Whether the conduct is neglect under the Elder Abuse Act',
      'Whether a memory-care supervision plan was followed',
      'Whether recklessness supports enhanced remedies',
      'The CDPH citation history',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Test arbitration', copy: 'Premium facilities lean on these clauses.' },
      { label: 'Supervision matters', copy: 'Memory care turns on wander prevention.' },
      { label: 'Enhanced remedies', copy: 'Fees and pre-death pain/suffering can apply.' },
      { label: 'Records decide it', copy: 'Supervision and CDPH history prove the failure.' },
    ],
    insuranceProblems: [
      'The arbitration clause is accepted without challenge.',
      'The supervision and care-plan records are never requested.',
      'The claim is framed as ordinary negligence, triggering MICRA limits.',
      'The CDPH citation history goes unexamined.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was an arbitration form signed, and by whom?' },
      { label: 'Step 2', question: 'What was the harm \u2014 fall, wandering, or other?' },
      { label: 'Step 3', question: 'Was it a memory-care facility?' },
      { label: 'Step 4', question: 'Has the supervision and care plan been requested?' },
    ],
  },
}
