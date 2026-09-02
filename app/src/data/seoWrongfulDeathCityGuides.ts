import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, wrongful death practice area: location-specific guides for Los
 * Angeles, San Francisco, San Diego, and Sacramento.
 *
 * Wrongful death is a distinct, high-stakes practice area: two claims arise
 * from one death (the family's wrongful-death claim and the estate's survival
 * claim), eligibility is limited to a defined group, and the responsible party
 * and the applicable deadline are shaped by where and how the death happened.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: the state's highest volume of fatal traffic and workplace
 *    incidents, frequently involving large employer, commercial, and product
 *    defendants, and dangerous-road claims against public entities.
 *  - San Francisco: dense pedestrian and transit fatalities where a common
 *    carrier's heightened duty (Muni, BART) and high-earner economic loss shape
 *    valuation.
 *  - San Diego: large federal and military installations and a border region,
 *    where a death on a federal site can involve the Federal Tort Claims Act and
 *    its distinct procedure and deadline.
 *  - Sacramento: the seat of state government, where deaths involving state
 *    vehicles, agencies, and public property put the six-month Government Claims
 *    Act deadline at the center.
 *
 * Applied accurately:
 *  - California limits who may bring a wrongful-death claim (Code of Civil
 *    Procedure section 377.60): first a surviving spouse or domestic partner and
 *    children, then those who would inherit by intestate succession, and a
 *    further dependency-based group.
 *  - A separate survival claim belongs to the estate for the deceased's own
 *    pre-death losses; what it can recover depends on current law and the timing
 *    of the case, which a California attorney should assess.
 *  - The deadline is generally two years (Code of Civil Procedure section
 *    335.1), a six-month Government Claims Act deadline applies where a public
 *    entity is involved, a federal claim carries its own deadline, and a medical
 *    death is governed by MICRA's shorter limits and non-economic caps.
 *  - Pure comparative negligence applies.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Who may bring a wrongful-death claim, how the two claims are valued, and which deadline controls depend on facts a licensed California attorney should review promptly.'

const ELIGIBILITY =
  'California limits who may bring a wrongful-death claim (Code of Civil Procedure section 377.60): the primary tier is a surviving spouse or registered domestic partner and the deceased\u2019s children; where none survive, standing extends to those who would inherit under intestate succession, such as parents or siblings; and a further group may qualify if they were financially dependent on the deceased. Getting the right claimant is decisive, because the wrong one can derail an otherwise strong case.'

const TWO_CLAIMS =
  'A death gives rise to two distinct claims: the family\u2019s wrongful-death claim for what the survivors lost \u2014 financial support, household services, and the love, companionship, and guidance of the deceased \u2014 and a separate survival claim belonging to the estate for the deceased\u2019s own losses before death. The two are valued differently and pursued together, and overlooking the survival claim leaves value on the table.'

const NOT_GRIEF =
  'California\u2019s wrongful-death measure is specific and sometimes counterintuitive: it compensates the survivors\u2019 loss of support, services, and the deceased\u2019s love, companionship, and guidance, but it does not compensate the survivors\u2019 own grief and sorrow. Building the claim from the documented economic and relational loss, rather than an average, is what establishes its real value.'

const DEADLINE =
  'The deadline to bring a California wrongful-death claim is generally two years from the death (Code of Civil Procedure section 335.1), but it can be far shorter: a six-month Government Claims Act deadline applies where a public entity is involved, a federal claim carries its own deadline, and a death from medical care is governed by MICRA\u2019s shorter limits. Because appointing an estate representative and confirming eligibility both take time, the work should begin immediately.'

export const LA_WD_SLUG = '/los-angeles-wrongful-death'
export const SF_WD_SLUG = '/san-francisco-wrongful-death'
export const SD_WD_SLUG = '/san-diego-wrongful-death'
export const SAC_WD_SLUG = '/sacramento-wrongful-death'

export const wrongfulDeathCityGuidePages: LandingPage[] = [
  {
    slug: LA_WD_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Wrongful Death Claims',
    title: 'Los Angeles Wrongful Death Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a family member in an LA crash, workplace incident, or defective-product death? Two claims arise \u2014 the family\u2019s and the estate\u2019s \u2014 and who may file is limited by law.',
    psychology: 'My family member was killed in Los Angeles and I do not know who can file or how long we have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles wrongful death lawyer',
      'who can file wrongful death claim california',
      'wrongful death vs survival claim california',
      'fatal car accident claim los angeles',
      'wrongful death deadline california',
    ],
    signals: [
      'Eligibility tiers (377.60)',
      'Wrongful-death + survival claim',
      'Large employer / product defendants',
      'Dangerous-road public-entity claim',
      'Two-year / six-month deadlines',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Los Angeles sees the state\u2019s highest volume of fatal traffic and workplace incidents, and its deaths frequently involve large employer, commercial, and product defendants \u2014 which means more coverage but also more sophisticated opposition. ${ELIGIBILITY} ${TWO_CLAIMS} ${NOT_GRIEF} Where a dangerous road or public property contributed, a claim against a public entity brings the six-month deadline into play alongside the usual two years. ${DEADLINE} Pure comparative negligence applies. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Who survives the deceased (spouse, partner, children) and in what tier',
        'Whether an estate representative has been or must be appointed',
        'Every responsible party \u2014 driver, employer, product maker, property owner',
        'Whether a dangerous road or public entity contributed (six-month rule)',
        'The deceased\u2019s earnings, benefits, and household contributions',
        'The medical records between injury and death (survival claim)',
        'Photographs, reports, and witness details from the scene',
        'The date of death, which starts the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ maps who has standing under California\u2019s wrongful-death tiers, separates the family\u2019s claim from the estate\u2019s survival claim so neither is left on the table, and identifies every responsible party and any public-entity deadline in an LA death. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who is allowed to file a wrongful-death claim in California?',
        a: 'The law limits it (Code of Civil Procedure section 377.60): first a surviving spouse or domestic partner and the deceased\u2019s children; where none survive, those who would inherit by intestate succession, such as parents or siblings; and a further group who were financially dependent on the deceased. Getting the right claimant is decisive because the wrong one can derail the case.',
      },
      {
        q: 'What is the difference between a wrongful-death claim and a survival claim?',
        a: 'The wrongful-death claim is the family\u2019s claim for what they lost \u2014 support, services, and the deceased\u2019s love and companionship. The survival claim belongs to the estate for the deceased\u2019s own losses before death. They are valued differently and pursued together, and overlooking the survival claim leaves value on the table.',
      },
      {
        q: 'A dangerous road or public property contributed to the death. Does that change the deadline?',
        a: 'Yes. Where a public entity is involved, a six-month Government Claims Act deadline can apply \u2014 far shorter than the usual two years \u2014 so the claim must be assessed and filed quickly. Los Angeles\u2019s dangerous-road claims make this a common issue.',
      },
      {
        q: 'Does grief count in the claim?',
        a: 'California compensates the survivors\u2019 loss of support, services, and the deceased\u2019s love, companionship, and guidance, but it does not compensate the survivors\u2019 own grief and sorrow. The claim is built from the documented economic and relational loss.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises who has standing, the two claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_WD_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Wrongful Death Claims',
    title: 'San Francisco Wrongful Death Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a family member in an SF pedestrian, transit, or traffic death? Two claims arise \u2014 the family\u2019s and the estate\u2019s \u2014 and a common carrier or high earnings can shape the value.',
    psychology: 'My family member was killed in San Francisco and I do not know who can file or how long we have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco wrongful death lawyer',
      'who can file wrongful death claim california',
      'muni bart fatal accident claim california',
      'pedestrian death claim san francisco',
      'wrongful death deadline california',
    ],
    signals: [
      'Eligibility tiers (377.60)',
      'Wrongful-death + survival claim',
      'Common carrier (Muni / BART)',
      'High-earner economic loss',
      'Public-entity six-month deadline',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s dense streets produce a high share of pedestrian and transit fatalities, and two local factors shape those claims. First, where a common carrier such as Muni or BART is involved, it owes a heightened duty of utmost care, and a public transit agency triggers the six-month Government Claims Act deadline. Second, the city\u2019s high earnings can make the economic-loss component of a wrongful-death claim substantial, which makes documenting the deceased\u2019s earnings and benefits especially important. ${ELIGIBILITY} ${TWO_CLAIMS} ${NOT_GRIEF} ${DEADLINE} Pure comparative negligence applies. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Who survives the deceased and in what tier',
        'Whether a common carrier (Muni, BART) was involved',
        'Whether a public transit agency triggers the six-month rule',
        'The deceased\u2019s earnings, benefits, and household contributions',
        'Whether an estate representative has been or must be appointed',
        'The medical records between injury and death (survival claim)',
        'Photographs, reports, and witness details from the scene',
        'The date of death, which starts the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a common carrier\u2019s heightened duty and a public-transit deadline apply, documents the high-earner economic loss that drives value in San Francisco, and separates the family\u2019s wrongful-death claim from the estate\u2019s survival claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A Muni bus or BART train was involved in the death. Does that change things?',
        a: 'Yes. A common carrier such as Muni or BART owes a heightened duty of utmost care to its passengers, which can strengthen a claim, but a public transit agency also triggers the six-month Government Claims Act deadline \u2014 far shorter than the usual two years \u2014 so the claim must be filed quickly.',
      },
      {
        q: 'Who is allowed to file a wrongful-death claim in California?',
        a: 'The law limits it (Code of Civil Procedure section 377.60): first a surviving spouse or domestic partner and the deceased\u2019s children; then those who would inherit by intestate succession; and a further dependency-based group. The right claimant is essential to a valid claim.',
      },
      {
        q: 'How is the value of a wrongful-death claim determined?',
        a: 'It is built from what the survivors lost \u2014 the deceased\u2019s financial support, household services, and love, companionship, and guidance \u2014 not from an average. San Francisco\u2019s high earnings can make the economic-loss component substantial, so documenting the deceased\u2019s earnings and benefits matters. Grief itself is not compensated.',
      },
      {
        q: 'What is a survival claim?',
        a: 'It is a separate claim belonging to the estate for the deceased\u2019s own losses before death. It is valued differently from the family\u2019s wrongful-death claim and pursued alongside it; overlooking it leaves value on the table.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises who has standing, the two claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_WD_SLUG,
    category: 'Cities',
    cluster: 'San Diego Wrongful Death Claims',
    title: 'San Diego Wrongful Death Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a family member in a San Diego crash, workplace incident, or a death on a federal or military site? Two claims arise \u2014 and a federal-site death follows different rules.',
    psychology: 'My family member was killed in San Diego and I do not know who can file or how long we have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego wrongful death lawyer',
      'who can file wrongful death claim california',
      'military base death claim ftca',
      'fatal car accident claim san diego',
      'wrongful death deadline california',
    ],
    signals: [
      'Eligibility tiers (377.60)',
      'Wrongful-death + survival claim',
      'Federal / military (FTCA)',
      'Border-region collisions',
      'Two-year / six-month deadlines',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s large federal and military installations and its border region shape its wrongful-death pattern. A death on a federal or military site can involve the Federal Tort Claims Act, with its own administrative procedure and a distinct deadline, and a service member\u2019s own remedies may be limited \u2014 though contractor and product claims may still exist. Border-region and freeway collisions frequently involve commercial and out-of-area defendants whose coverage must be traced. ${ELIGIBILITY} ${TWO_CLAIMS} ${NOT_GRIEF} ${DEADLINE} Pure comparative negligence applies. Civil cases are filed in San Diego County Superior Court, though a federal claim proceeds under federal rules.`,
      whatToTrack: [
        'Who survives the deceased and in what tier',
        'Whether the death occurred on a federal or military site (FTCA)',
        'Every responsible party, including commercial or out-of-area defendants',
        'Whether an estate representative has been or must be appointed',
        'The deceased\u2019s earnings, benefits, and household contributions',
        'The medical records between injury and death (survival claim)',
        'Photographs, reports, and witness details from the scene',
        'The date of death, which starts the applicable deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ flags early when a federal or military site brings the Federal Tort Claims Act and its distinct deadline into play, traces the coverage behind commercial and out-of-area defendants, and separates the family\u2019s wrongful-death claim from the estate\u2019s survival claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The death happened on a military base or federal site. Does that change the claim?',
        a: 'Yes. A death on a federal or military site can involve the Federal Tort Claims Act, which has its own administrative procedure and a distinct deadline, and a service member\u2019s own remedies may be limited \u2014 though contractor and product claims may still exist. Because these rules are unforgiving, an early assessment is essential.',
      },
      {
        q: 'Who is allowed to file a wrongful-death claim in California?',
        a: 'The law limits it (Code of Civil Procedure section 377.60): first a surviving spouse or domestic partner and the deceased\u2019s children; then those who would inherit by intestate succession; and a further dependency-based group. The right claimant is essential.',
      },
      {
        q: 'What is the difference between a wrongful-death claim and a survival claim?',
        a: 'The wrongful-death claim is the family\u2019s claim for what they lost; the survival claim belongs to the estate for the deceased\u2019s own losses before death. They are valued differently and pursued together, and the survival claim should not be overlooked.',
      },
      {
        q: 'How long do we have to file?',
        a: 'Generally two years from the death (Code of Civil Procedure section 335.1), but it can be far shorter \u2014 six months where a public entity is involved, a separate deadline for a federal claim, and MICRA\u2019s shorter limits for a medical death. Because these vary, the work should begin immediately.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises who has standing, the two claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_WD_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Wrongful Death Claims',
    title: 'Sacramento Wrongful Death Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a family member in a Sacramento crash or a death involving a state vehicle, agency, or public property? Two claims arise \u2014 and a public entity brings a six-month deadline.',
    psychology: 'My family member was killed in Sacramento and I do not know who can file or how long we have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento wrongful death lawyer',
      'who can file wrongful death claim california',
      'state vehicle fatal accident claim california',
      'government claim deadline death california',
      'wrongful death deadline california',
    ],
    signals: [
      'Eligibility tiers (377.60)',
      'Wrongful-death + survival claim',
      'State vehicle / agency defendants',
      'Public-entity six-month deadline',
      'Dangerous condition of public property',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `As the seat of state government, Sacramento sees a higher share of deaths involving state vehicles, agencies, and public property, which puts the Government Claims Act at the center. Where a public entity is a defendant \u2014 a state or municipal vehicle, or a dangerous condition of public property such as a poorly designed intersection \u2014 a six-month claims deadline applies, far shorter than the usual two years, and a formal claim must be filed before any lawsuit. ${ELIGIBILITY} ${TWO_CLAIMS} ${NOT_GRIEF} ${DEADLINE} Pure comparative negligence applies. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Whether a public entity, state vehicle, or agency is a defendant (six-month rule)',
        'Whether a dangerous condition of public property contributed',
        'Who survives the deceased and in what tier',
        'Whether an estate representative has been or must be appointed',
        'The deceased\u2019s earnings, benefits, and household contributions',
        'The medical records between injury and death (survival claim)',
        'Photographs, reports, and witness details from the scene',
        'The date of death, which starts the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ flags immediately when a state vehicle, agency, or dangerous condition of public property triggers the six-month claims deadline, preserves the dangerous-condition evidence, and separates the family\u2019s wrongful-death claim from the estate\u2019s survival claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A state vehicle or a dangerous road contributed to the death. Is there a shorter deadline?',
        a: 'Yes. Where a public entity is a defendant \u2014 a state or municipal vehicle, or a dangerous condition of public property \u2014 a six-month Government Claims Act deadline applies, and a formal claim must be filed before any lawsuit. This is a common and time-critical issue in Sacramento.',
      },
      {
        q: 'Who is allowed to file a wrongful-death claim in California?',
        a: 'The law limits it (Code of Civil Procedure section 377.60): first a surviving spouse or domestic partner and the deceased\u2019s children; then those who would inherit by intestate succession; and a further dependency-based group. The right claimant is essential.',
      },
      {
        q: 'What is a survival claim?',
        a: 'It is a separate claim belonging to the estate for the deceased\u2019s own losses before death. It is valued differently from the family\u2019s wrongful-death claim and pursued alongside it; overlooking it leaves value on the table.',
      },
      {
        q: 'Does grief count in the claim?',
        a: 'California compensates the survivors\u2019 loss of support, services, and the deceased\u2019s love, companionship, and guidance, but not their own grief and sorrow. The claim is built from documented economic and relational loss.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises who has standing, the two claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const wrongfulDeathCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_WD_SLUG]: {
    scenario: `A family lost a parent in an LA crash with a commercial truck on a poorly designed intersection. Confirming the eligible claimants, appointing an estate representative, and filing a six-month public-entity claim alongside the trucking claim preserved both paths. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Confirm who survives and who may file; secure the scene evidence.'],
      ['First weeks', 'Estate representative appointed; every defendant identified.'],
      ['Six-month mark', 'A government claim filed if a public entity is involved.'],
      ['Longer term', 'Economic loss and the survival claim documented.'],
    ],
    severityLadder: [
      ['Eligibility', 'Confirming the right claimant under the tiers.'],
      ['Two claims', 'Family wrongful-death and estate survival claims.'],
      ['Public-entity path', 'A dangerous road triggers the six-month rule.'],
      ['Full loss', 'Support, services, and companionship documented.'],
    ],
    treatmentProgression: [
      { label: 'Records', copy: 'Medical records between injury and death anchor the survival claim.' },
      { label: 'Economics', copy: 'Earnings and benefits define the economic loss.' },
      { label: 'Household', copy: 'The deceased\u2019s services carry real value.' },
      { label: 'Documentation', copy: 'Funeral costs and future support complete the picture.' },
    ],
    settlementDrivers: [
      'Whether the right claimant brings the claim',
      'Whether both the wrongful-death and survival claims are pursued',
      'Whether a public entity and its six-month deadline are in play',
      'Every responsible party and layer of insurance',
      'The documented economic and relational loss',
      'Whether the deadline was met',
    ],
    settlementValueDetails: [
      { label: 'Standing is decisive', copy: 'The wrong claimant can derail a strong case.' },
      { label: 'Two claims, two measures', copy: 'Family and estate claims are valued differently.' },
      { label: 'Deadlines vary', copy: 'A public entity means six months, not two years.' },
      { label: 'Build from facts', copy: 'Documented loss, not an average, sets value.' },
    ],
    insuranceProblems: [
      'The wrong family member files and the claim is challenged.',
      'The survival claim is overlooked entirely.',
      'A six-month public-entity deadline is missed.',
      'The economic loss is undervalued without documentation.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Who survives the deceased, and in what tier?' },
      { label: 'Step 2', question: 'Was a public entity or dangerous road involved?' },
      { label: 'Step 3', question: 'Has an estate representative been appointed?' },
      { label: 'Step 4', question: 'What were the deceased\u2019s earnings and contributions?' },
    ],
  },
  [SF_WD_SLUG]: {
    scenario: `A family lost a high-earning parent struck by a Muni bus. The common carrier\u2019s heightened duty strengthened liability, but the six-month transit-agency deadline meant the claim had to be filed fast, and the economic loss was documented carefully. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Confirm who may file; identify the common carrier and agency.'],
      ['First weeks', 'Estate representative appointed; economic loss documented.'],
      ['Six-month mark', 'A government claim filed for the transit agency.'],
      ['Longer term', 'The survival claim and full loss developed.'],
    ],
    severityLadder: [
      ['Common carrier', 'A heightened duty of utmost care applies.'],
      ['Public-entity path', 'A transit agency triggers the six-month rule.'],
      ['High-earner loss', 'Substantial economic loss to document.'],
      ['Two claims', 'Family wrongful-death and estate survival claims.'],
    ],
    treatmentProgression: [
      { label: 'Records', copy: 'Medical records between injury and death anchor the survival claim.' },
      { label: 'Economics', copy: 'High earnings and benefits define the economic loss.' },
      { label: 'Household', copy: 'The deceased\u2019s services carry real value.' },
      { label: 'Documentation', copy: 'Funeral costs and future support complete the picture.' },
    ],
    settlementDrivers: [
      'Whether a common carrier\u2019s heightened duty applies',
      'Whether the six-month transit-agency deadline was met',
      'Whether both claims are pursued',
      'The documented high-earner economic loss',
      'Whether the right claimant brings the claim',
      'The relational loss to the survivors',
    ],
    settlementValueDetails: [
      { label: 'Duty is heightened', copy: 'Common carriers owe utmost care.' },
      { label: 'Deadline is short', copy: 'A transit agency means six months.' },
      { label: 'Earnings drive value', copy: 'High incomes make economic loss substantial.' },
      { label: 'Two claims, two measures', copy: 'Family and estate claims differ.' },
    ],
    insuranceProblems: [
      'The transit-agency six-month deadline is missed.',
      'The high-earner economic loss is understated.',
      'The survival claim is overlooked.',
      'The wrong claimant challenges the case.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a common carrier such as Muni or BART involved?' },
      { label: 'Step 2', question: 'Who survives the deceased, and in what tier?' },
      { label: 'Step 3', question: 'What were the deceased\u2019s earnings and benefits?' },
      { label: 'Step 4', question: 'Has an estate representative been appointed?' },
    ],
  },
  [SD_WD_SLUG]: {
    scenario: `A family lost a relative in a collision near a military installation, and the federal-site question determined the path. An early check confirmed whether the Federal Tort Claims Act applied and preserved a separate contractor claim, keeping both alive. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Confirm who may file; check for a federal or military site.'],
      ['First weeks', 'Estate representative appointed; every defendant identified.'],
      ['Deadline check', 'FTCA or state deadline confirmed for each defendant.'],
      ['Longer term', 'Economic loss and the survival claim documented.'],
    ],
    severityLadder: [
      ['Federal path', 'A federal or military site changes the rules.'],
      ['Eligibility', 'Confirming the right claimant under the tiers.'],
      ['Two claims', 'Family wrongful-death and estate survival claims.'],
      ['Full loss', 'Support, services, and companionship documented.'],
    ],
    treatmentProgression: [
      { label: 'Records', copy: 'Medical records between injury and death anchor the survival claim.' },
      { label: 'Economics', copy: 'Earnings and benefits define the economic loss.' },
      { label: 'Household', copy: 'The deceased\u2019s services carry real value.' },
      { label: 'Documentation', copy: 'Funeral costs and future support complete the picture.' },
    ],
    settlementDrivers: [
      'Whether a federal or military site brings FTCA into play',
      'Which deadline applies to each defendant',
      'Whether both claims are pursued',
      'Every responsible party and layer of insurance',
      'Whether the right claimant brings the claim',
      'The documented economic and relational loss',
    ],
    settlementValueDetails: [
      { label: 'Federal rules differ', copy: 'FTCA changes procedure and the deadline.' },
      { label: 'Standing is decisive', copy: 'The wrong claimant can derail the case.' },
      { label: 'Two claims, two measures', copy: 'Family and estate claims differ.' },
      { label: 'Trace the coverage', copy: 'Commercial and out-of-area defendants matter.' },
    ],
    insuranceProblems: [
      'A federal-claim deadline is missed for lack of an early check.',
      'The survival claim is overlooked.',
      'Out-of-area defendants\u2019 coverage is never traced.',
      'The wrong claimant challenges the case.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the death occur on a federal or military site?' },
      { label: 'Step 2', question: 'Who survives the deceased, and in what tier?' },
      { label: 'Step 3', question: 'Who are all the responsible parties?' },
      { label: 'Step 4', question: 'Has an estate representative been appointed?' },
    ],
  },
  [SAC_WD_SLUG]: {
    scenario: `A family lost a relative when a state vehicle ran a light. Because a public entity was the defendant, a six-month government claim had to be filed before any lawsuit, and confirming the eligible claimants early kept the case on track. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Confirm who may file; check for a public entity or state vehicle.'],
      ['First weeks', 'Estate representative appointed; dangerous-condition evidence preserved.'],
      ['Six-month mark', 'A government claim filed before any lawsuit.'],
      ['Longer term', 'Economic loss and the survival claim documented.'],
    ],
    severityLadder: [
      ['Public-entity path', 'A state vehicle or agency triggers the six-month rule.'],
      ['Dangerous condition', 'Public property design can add a defendant.'],
      ['Eligibility', 'Confirming the right claimant under the tiers.'],
      ['Two claims', 'Family wrongful-death and estate survival claims.'],
    ],
    treatmentProgression: [
      { label: 'Records', copy: 'Medical records between injury and death anchor the survival claim.' },
      { label: 'Economics', copy: 'Earnings and benefits define the economic loss.' },
      { label: 'Household', copy: 'The deceased\u2019s services carry real value.' },
      { label: 'Documentation', copy: 'Funeral costs and future support complete the picture.' },
    ],
    settlementDrivers: [
      'Whether a public entity and its six-month deadline are in play',
      'Whether a dangerous condition of public property contributed',
      'Whether both claims are pursued',
      'Whether the right claimant brings the claim',
      'The documented economic and relational loss',
      'Whether the deadline was met',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'A public entity means six months, not two years.' },
      { label: 'Claim before suit', copy: 'A formal claim must precede a lawsuit.' },
      { label: 'Two claims, two measures', copy: 'Family and estate claims differ.' },
      { label: 'Build from facts', copy: 'Documented loss, not an average, sets value.' },
    ],
    insuranceProblems: [
      'The six-month public-entity deadline is missed.',
      'The dangerous-condition evidence is lost before it is preserved.',
      'The survival claim is overlooked.',
      'The wrong claimant challenges the case.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a public entity, state vehicle, or agency involved?' },
      { label: 'Step 2', question: 'Did a dangerous condition of public property contribute?' },
      { label: 'Step 3', question: 'Who survives the deceased, and in what tier?' },
      { label: 'Step 4', question: 'Has an estate representative been appointed?' },
    ],
  },
}
