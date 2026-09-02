import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, wrongful death practice area (batch 3): location-specific guides for
 * Riverside, San Bernardino, Bakersfield, and Anaheim, extending the batch-1 (LA,
 * SF, San Diego, Sacramento) and batch-2 (San Jose, Fresno, Long Beach, Oakland)
 * hub.
 *
 * Wrongful death is a distinct, high-stakes practice area: two claims arise from
 * one death (the family's wrongful-death claim and the estate's survival claim),
 * eligibility is limited to a defined group (CCP 377.60), and the responsible
 * party and applicable deadline are shaped by where and how the death happened.
 *
 * Local context, genuine rather than interpolated:
 *  - Riverside: I-215/60/91 fatal crashes and warehouse/logistics work deaths
 *    (a third-party claim beyond comp); RTA public-entity fork.
 *  - San Bernardino: Cajon Pass / I-15 fatal crashes and Inland Empire warehouse
 *    work deaths (a third-party claim beyond comp); Omnitrans public-entity fork.
 *  - Bakersfield: Highway 99/58 fatal crashes and oilfield/agricultural work
 *    deaths, where claimants may sit in the dependency tier and immigration status
 *    is no bar; commercial-truck deaths on the freight corridors.
 *  - Anaheim: I-5/SR-91 and tourist-corridor pedestrian fatalities, with OCTA
 *    (common carrier and public entity) raising a heightened duty and six-month
 *    deadline; hospitality/venue work deaths.
 *
 * Applied accurately (CCP 377.60 eligibility tiers; separate estate survival
 * claim; measure compensates lost support, services, and love/companionship, not
 * the survivors' grief; deadline generally two years under CCP 335.1, six months
 * for a public entity, FTCA for federal, MICRA for a medical death; common
 * carrier's utmost-care duty; pure comparative negligence).
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

export const RIV_WD_SLUG = '/riverside-wrongful-death'
export const SB_WD_SLUG = '/san-bernardino-wrongful-death'
export const BAKERSFIELD_WD_SLUG = '/bakersfield-wrongful-death'
export const ANAHEIM_WD_SLUG = '/anaheim-wrongful-death'

export const wrongfulDeathCityGuidePages3: LandingPage[] = [
  {
    slug: RIV_WD_SLUG,
    category: 'Cities',
    cluster: 'Riverside Wrongful Death Claims',
    title: 'Riverside Wrongful Death Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a family member in a Riverside crash or warehouse death? Two claims arise \u2014 the family\u2019s and the estate\u2019s \u2014 and a work death can reach beyond workers\u2019 comp to third parties.',
    psychology: 'My family member was killed in Riverside and I do not know who can file or what we can recover.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside wrongful death lawyer',
      'who can file wrongful death claim california',
      'warehouse worker death third party california',
      'fatal car accident claim riverside',
      'wrongful death deadline california',
    ],
    signals: [
      'Eligibility tiers (377.60)',
      'Wrongful-death + survival claim',
      'Commuter freeway fatalities',
      'Third-party work death beyond comp',
      'Warehouse / logistics deaths',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s long commutes on the I-215, 60, and 91 produce fatal crashes, and the Inland Empire\u2019s warehouse and logistics economy produces work fatalities \u2014 both of which shape who is responsible. A work-related death is often more than a workers\u2019-compensation matter: where a party other than the employer \u2014 an equipment maker, a contractor, a negligent driver \u2014 caused it, the survivors may have a separate third-party wrongful-death claim that reaches damages compensation does not. ${ELIGIBILITY} ${TWO_CLAIMS} ${NOT_GRIEF} ${DEADLINE} Pure comparative negligence applies. Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'Who survives the deceased (spouse, partner, children) and in what tier',
        'For a work death, every non-employer party and any comp claim',
        'Whether a public entity (RTA, city road) was involved',
        'Whether an estate representative has been or must be appointed',
        'The deceased\u2019s earnings, benefits, and household contributions',
        'The medical records between injury and death (survival claim)',
        'Photographs, reports, and witness details from the scene',
        'The date of death, which starts the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ maps who has standing under California\u2019s wrongful-death tiers, identifies any third-party work-death claim beyond workers\u2019 comp, and separates the family\u2019s claim from the estate\u2019s survival claim in a Riverside death. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My relative was killed at a warehouse. Do we only have a workers\u2019-comp death benefit?',
        a: 'Not necessarily. Workers\u2019 compensation is generally the exclusive remedy against the employer, but where a party other than the employer \u2014 an equipment manufacturer, a contractor, or a negligent driver \u2014 caused the death, the survivors may have a separate third-party wrongful-death claim that reaches damages comp does not. Identifying every non-employer party is central.',
      },
      {
        q: 'Who is allowed to file a wrongful-death claim in California?',
        a: 'The law limits it (Code of Civil Procedure section 377.60): first a surviving spouse or domestic partner and the deceased\u2019s children; where none survive, those who would inherit by intestate succession; and a further group who were financially dependent on the deceased. The right claimant is essential.',
      },
      {
        q: 'What is a survival claim?',
        a: 'It is a separate claim belonging to the estate for the deceased\u2019s own losses before death. It is valued differently from the family\u2019s wrongful-death claim and pursued alongside it; overlooking it leaves value on the table.',
      },
      {
        q: 'How long do we have to file?',
        a: 'Generally two years from the death (Code of Civil Procedure section 335.1), but shorter where a public entity is involved (six months), for a federal claim, or for a medical death under MICRA. Because eligibility and estate steps take time, the work should begin immediately.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises who has standing, the two claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_WD_SLUG,
    category: 'Cities',
    cluster: 'San Bernardino Wrongful Death Claims',
    title: 'San Bernardino Wrongful Death Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a family member on the Cajon Pass, a freeway, or in a warehouse death? Two claims arise \u2014 and a work death can reach beyond workers\u2019 comp to third parties.',
    psychology: 'My family member was killed in San Bernardino and I do not know who can file or how long we have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino wrongful death lawyer',
      'who can file wrongful death claim california',
      'cajon pass fatal crash claim california',
      'warehouse worker death third party california',
      'wrongful death deadline california',
    ],
    signals: [
      'Eligibility tiers (377.60)',
      'Wrongful-death + survival claim',
      'Cajon Pass / I-15 fatalities',
      'Third-party work death beyond comp',
      'Warehouse / logistics deaths',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `High-speed crashes on the Cajon Pass and I-15, and work fatalities across the Inland Empire\u2019s warehouse economy, drive the wrongful-death pattern around San Bernardino. A work-related death is often more than a workers\u2019-compensation matter: where a party other than the employer caused it, the survivors may have a separate third-party wrongful-death claim reaching damages comp does not, and a fatal grade crash can involve a commercial carrier with its own coverage. ${ELIGIBILITY} ${TWO_CLAIMS} ${NOT_GRIEF} ${DEADLINE} Pure comparative negligence applies. Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'Who survives the deceased and in what tier',
        'For a work death, every non-employer party and any comp claim',
        'For a truck crash, the carrier, broker, and their coverage',
        'Whether a public entity (Omnitrans, city road) was involved',
        'Whether an estate representative has been or must be appointed',
        'The deceased\u2019s earnings, benefits, and household contributions',
        'The medical records between injury and death (survival claim)',
        'The date of death, which starts the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ confirms who has standing, identifies any third-party work-death claim beyond workers\u2019 comp, traces any commercial-carrier coverage behind a grade crash, and separates the family\u2019s claim from the estate\u2019s survival claim in a San Bernardino death. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My relative was killed at a warehouse. Do we only have workers\u2019 comp?',
        a: 'Not necessarily. Workers\u2019 compensation is generally the exclusive remedy against the employer, but where a party other than the employer \u2014 an equipment manufacturer, a contractor, or a negligent driver \u2014 caused the death, the survivors may have a separate third-party wrongful-death claim that reaches damages comp does not. Identifying every non-employer party is central.',
      },
      {
        q: 'The death was in a truck crash on the pass. Who can be responsible?',
        a: 'Potentially several parties beyond the driver \u2014 the trucking company, a broker, a maintenance provider, or a cargo loader \u2014 each with their own insurance. Tracing every responsible party and layer of coverage is often what makes the difference in a fatal commercial-truck case.',
      },
      {
        q: 'Who is allowed to file a wrongful-death claim in California?',
        a: 'The law limits it (Code of Civil Procedure section 377.60): first a surviving spouse or domestic partner and the deceased\u2019s children; where none survive, those who would inherit by intestate succession; and a further dependency-based group. The right claimant is essential.',
      },
      {
        q: 'How long do we have to file?',
        a: 'Generally two years from the death (Code of Civil Procedure section 335.1), but shorter where a public entity is involved (six months), for a federal claim, or for a medical death under MICRA. Because eligibility and estate steps take time, the work should begin immediately.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises who has standing, the two claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_WD_SLUG,
    category: 'Cities',
    cluster: 'Bakersfield Wrongful Death Claims',
    title: 'Bakersfield Wrongful Death Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a family member in a Bakersfield-area crash or an oilfield or farm death? Two claims arise \u2014 and a work death can reach beyond workers\u2019 comp, with immigration status no bar to recovery.',
    psychology: 'My family member was killed in a Bakersfield-area crash or at work and I do not know who can file or what we can recover.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield wrongful death lawyer',
      'who can file wrongful death claim california',
      'oilfield worker death claim california',
      'farm worker death claim california',
      'wrongful death deadline california',
    ],
    signals: [
      'Eligibility tiers (377.60)',
      'Wrongful-death + survival claim',
      'Oilfield / agricultural fatalities',
      'Third-party work death beyond comp',
      'Status no bar to recovery',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `High-speed Highway 99 and 58 crashes and oilfield and agricultural incidents drive the wrongful-death pattern around Bakersfield. A work-related death is often more than a workers\u2019-compensation matter: where a party other than the employer \u2014 an operator, an equipment maker, a contractor, a negligent driver \u2014 caused it, the survivors may have a separate third-party wrongful-death claim that reaches damages compensation does not. In oilfield and farm deaths the eligible claimants may sit in the dependency-based tier, and a person\u2019s immigration status does not bar recovery. ${ELIGIBILITY} ${TWO_CLAIMS} ${NOT_GRIEF} ${DEADLINE} Pure comparative negligence applies. Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'Who survives the deceased and in what tier, including financial dependents',
        'For a work death, every non-employer party and any comp claim',
        'Whether a vehicle or equipment defect contributed',
        'Whether an estate representative has been or must be appointed',
        'The deceased\u2019s earnings, benefits, and household contributions',
        'The medical records between injury and death (survival claim)',
        'Photographs, reports, and witness details from the scene',
        'The date of death, which starts the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ confirms who has standing \u2014 including dependency-based claimants \u2014 identifies any third-party work-death claim beyond workers\u2019 comp, and separates the family\u2019s wrongful-death claim from the estate\u2019s survival claim in a Bakersfield-area death. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My relative was killed in the oilfield or on a farm. Do we only have a workers\u2019-comp death benefit?',
        a: 'Not necessarily. Workers\u2019 compensation is generally the exclusive remedy against the employer, but where a party other than the employer \u2014 an operator, an equipment manufacturer, a contractor, or a negligent driver \u2014 caused the death, the survivors may have a separate third-party wrongful-death claim that reaches damages comp does not. Identifying every non-employer party is central.',
      },
      {
        q: 'Does immigration status affect a wrongful-death claim?',
        a: 'No. A person\u2019s immigration status does not bar a wrongful-death recovery in California, and eligible survivors can pursue the claim regardless of status. What matters is the relationship to the deceased and the eligibility tiers under the statute.',
      },
      {
        q: 'Who is allowed to file a wrongful-death claim in California?',
        a: 'The law limits it (Code of Civil Procedure section 377.60): first a surviving spouse or domestic partner and the deceased\u2019s children; where none survive, those who would inherit by intestate succession; and a further group who were financially dependent on the deceased. In some family situations the dependency tier is where standing lies, so it should be assessed carefully.',
      },
      {
        q: 'How long do we have to file?',
        a: 'Generally two years from the death (Code of Civil Procedure section 335.1), but shorter where a public entity is involved (six months), for a federal claim, or for a medical death under MICRA. Because eligibility and estate steps take time, the work should begin immediately.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises who has standing, the two claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_WD_SLUG,
    category: 'Cities',
    cluster: 'Anaheim Wrongful Death Claims',
    title: 'Anaheim Wrongful Death Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a family member in an Anaheim traffic, pedestrian, or venue death? Two claims arise \u2014 and an OCTA bus brings a heightened duty and a six-month deadline.',
    psychology: 'My family member was killed in Anaheim and I do not know who can file or how long we have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim wrongful death lawyer',
      'who can file wrongful death claim california',
      'octa bus fatal accident claim california',
      'pedestrian death claim anaheim',
      'wrongful death deadline california',
    ],
    signals: [
      'Eligibility tiers (377.60)',
      'Wrongful-death + survival claim',
      'OCTA common carrier / public',
      'Public-entity six-month deadline',
      'Tourist-corridor fatalities',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s I-5 and SR-91 crashes, its dense tourist-corridor pedestrian traffic, and its hospitality and venue economy all produce fatalities \u2014 and a common local factor is transit: where an OCTA bus is involved, it owes a common carrier\u2019s heightened duty of utmost care, and as a public entity it triggers the six-month Government Claims Act deadline, as does any city vehicle or dangerous road. A venue or hospitality work death instead runs against private operators. ${ELIGIBILITY} ${TWO_CLAIMS} ${NOT_GRIEF} ${DEADLINE} Pure comparative negligence applies. Civil cases are filed in Orange County Superior Court after any required claim.`,
      whatToTrack: [
        'Who survives the deceased and in what tier',
        'Whether an OCTA bus, city vehicle, or public road was involved',
        'Whether a public entity triggers the six-month rule',
        'The date of death, which starts any six-month clock',
        'Whether an estate representative has been or must be appointed',
        'The deceased\u2019s earnings, benefits, and household contributions',
        'The medical records between injury and death (survival claim)',
        'Photographs, reports, and witness details from the scene',
      ],
      howClearCaseHelps: `ClearCaseIQ flags whether an OCTA common-carrier duty and a public-entity six-month deadline apply to an Anaheim death, maps who has standing under the wrongful-death tiers, and separates the family\u2019s claim from the estate\u2019s survival claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An OCTA bus or city vehicle was involved. Does that change things?',
        a: 'Yes, in two ways. As a common carrier, OCTA owes a heightened duty of utmost care, which can strengthen liability; but as a public entity, it \u2014 like any city vehicle or dangerous road \u2014 triggers the six-month Government Claims Act deadline, far shorter than the usual two years, so the claim must be filed quickly.',
      },
      {
        q: 'Who is allowed to file a wrongful-death claim in California?',
        a: 'The law limits it (Code of Civil Procedure section 377.60): first a surviving spouse or domestic partner and the deceased\u2019s children; where none survive, those who would inherit by intestate succession; and a further group who were financially dependent on the deceased. The right claimant is essential.',
      },
      {
        q: 'Does grief count in the claim?',
        a: 'California compensates the survivors\u2019 loss of support, services, and the deceased\u2019s love, companionship, and guidance, but it does not compensate the survivors\u2019 own grief and sorrow. The claim is built from the documented economic and relational loss.',
      },
      {
        q: 'What is a survival claim?',
        a: 'It is a separate claim belonging to the estate for the deceased\u2019s own losses before death. It is valued differently from the family\u2019s wrongful-death claim and pursued alongside it; overlooking it leaves value on the table.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises who has standing, the two claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const wrongfulDeathCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [RIV_WD_SLUG]: {
    scenario: `A family lost a warehouse worker killed by a contractor\u2019s equipment. A third-party wrongful-death claim reached beyond the workers\u2019-comp death benefit, and the survival claim was pursued alongside the family\u2019s. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Confirm who may file; identify every party.'],
      ['First weeks', 'Estate representative appointed; the equipment preserved.'],
      ['Assessment', 'The third-party claim and economic loss documented.'],
      ['Longer term', 'The survival claim and full loss developed.'],
    ],
    severityLadder: [
      ['Eligibility', 'Confirming the right claimant under the tiers.'],
      ['Comp vs. third party', 'A non-employer party can be liable beyond comp.'],
      ['Two claims', 'Family wrongful-death and estate survival claims.'],
      ['Full loss', 'Support, services, and companionship documented.'],
    ],
    treatmentProgression: [
      { label: 'Records', copy: 'Medical records between injury and death anchor the survival claim.' },
      { label: 'Economics', copy: 'Earnings and support define the economic loss.' },
      { label: 'Household', copy: 'The deceased\u2019s services carry real value.' },
      { label: 'Documentation', copy: 'Funeral costs and future support complete the picture.' },
    ],
    settlementDrivers: [
      'Whether a third party beyond the employer is liable',
      'Whether the right claimant brings the claim',
      'Whether both claims are pursued',
      'The documented economic and relational loss',
      'Whether the deadline was met',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'A third-party claim reaches full damages.' },
      { label: 'Two claims, two measures', copy: 'Family and estate claims differ.' },
      { label: 'Build from facts', copy: 'Documented loss, not an average, sets value.' },
      { label: 'Standing is decisive', copy: 'The right claimant must bring it.' },
    ],
    insuranceProblems: [
      'Only the comp death benefit is pursued, missing the third-party claim.',
      'The survival claim is overlooked.',
      'The wrong claimant challenges the case.',
      'The economic loss is undervalued without documentation.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a party other than the employer at fault?' },
      { label: 'Step 2', question: 'Who survives the deceased, and in what tier?' },
      { label: 'Step 3', question: 'Has the equipment been preserved?' },
      { label: 'Step 4', question: 'Has an estate representative been appointed?' },
    ],
  },
  [SB_WD_SLUG]: {
    scenario: `A family lost a relative in a fatal crash with a commercial truck on the Cajon Pass. Tracing the trucking company, broker, and their coverage \u2014 beyond the driver \u2014 opened the full value, and the survival claim was pursued alongside the family\u2019s. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Confirm who may file; identify the driver, carrier, and broker.'],
      ['First weeks', 'Estate representative appointed; coverage traced.'],
      ['Assessment', 'Every layer of commercial coverage identified.'],
      ['Longer term', 'The survival claim and full loss documented.'],
    ],
    severityLadder: [
      ['Eligibility', 'Confirming the right claimant under the tiers.'],
      ['Many defendants', 'Carrier, broker, and others beyond the driver.'],
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
      'Whether every responsible party and layer of coverage is found',
      'Whether a third-party work-death claim exists beyond comp',
      'Whether the right claimant brings the claim',
      'Whether both claims are pursued',
      'The documented economic and relational loss',
      'Whether the deadline was met',
    ],
    settlementValueDetails: [
      { label: 'Trace the coverage', copy: 'Carrier and broker policies matter.' },
      { label: 'Beyond comp', copy: 'A third-party claim reaches full damages.' },
      { label: 'Two claims, two measures', copy: 'Family and estate claims differ.' },
      { label: 'Build from facts', copy: 'Documented loss, not an average, sets value.' },
    ],
    insuranceProblems: [
      'Only the driver\u2019s policy is pursued, missing the carrier and broker.',
      'A third-party work-death claim is missed.',
      'The survival claim is overlooked.',
      'The wrong claimant challenges the case.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a commercial truck, carrier, or broker involved?' },
      { label: 'Step 2', question: 'Was a party other than an employer at fault?' },
      { label: 'Step 3', question: 'Who survives the deceased, and in what tier?' },
      { label: 'Step 4', question: 'Has an estate representative been appointed?' },
    ],
  },
  [BAKERSFIELD_WD_SLUG]: {
    scenario: `A family lost an oilfield worker killed by equipment operated by another company. A third-party wrongful-death claim reached beyond the workers\u2019-comp death benefit, the dependency tier established standing, and immigration status was no bar to recovery. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Confirm who may file, including dependents; identify every party.'],
      ['First weeks', 'Estate representative appointed; the equipment preserved.'],
      ['Assessment', 'The third-party claim and economic loss documented.'],
      ['Longer term', 'The survival claim and full loss developed.'],
    ],
    severityLadder: [
      ['Eligibility', 'Dependency tier may hold standing.'],
      ['Comp vs. third party', 'A non-employer party can be liable beyond comp.'],
      ['Two claims', 'Family wrongful-death and estate survival claims.'],
      ['Full loss', 'Support, services, and companionship documented.'],
    ],
    treatmentProgression: [
      { label: 'Records', copy: 'Medical records between injury and death anchor the survival claim.' },
      { label: 'Economics', copy: 'Earnings and support define the economic loss.' },
      { label: 'Household', copy: 'The deceased\u2019s services carry real value.' },
      { label: 'Documentation', copy: 'Funeral costs and future support complete the picture.' },
    ],
    settlementDrivers: [
      'Whether a third party beyond the employer is liable',
      'Whether the right claimant \u2014 including dependents \u2014 brings the claim',
      'Whether a vehicle or equipment defect contributed',
      'Whether both claims are pursued',
      'The documented economic and relational loss',
      'Whether the deadline was met',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'A third-party claim reaches full damages.' },
      { label: 'Status is no bar', copy: 'Immigration status does not defeat recovery.' },
      { label: 'Standing is decisive', copy: 'The dependency tier may apply.' },
      { label: 'Build from facts', copy: 'Documented loss, not an average, sets value.' },
    ],
    insuranceProblems: [
      'Only the comp death benefit is pursued, missing the third-party claim.',
      'Dependency-based claimants are overlooked.',
      'The equipment is not preserved for a defect claim.',
      'The survival claim is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a party other than the employer at fault?' },
      { label: 'Step 2', question: 'Who survives or depended on the deceased?' },
      { label: 'Step 3', question: 'Has the equipment or vehicle been preserved?' },
      { label: 'Step 4', question: 'Has an estate representative been appointed?' },
    ],
  },
  [ANAHEIM_WD_SLUG]: {
    scenario: `A family lost a parent struck by an OCTA bus in a crosswalk. The common carrier\u2019s heightened duty strengthened liability, but the six-month public-entity deadline meant the government claim had to be filed quickly to keep the case alive. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Confirm who may file; identify any OCTA or city vehicle.'],
      ['First weeks', 'Estate representative appointed; scene evidence preserved.'],
      ['Six-month mark', 'A government claim filed if a public entity is involved.'],
      ['Longer term', 'Economic loss and the survival claim documented.'],
    ],
    severityLadder: [
      ['Common carrier', 'An OCTA bus owes utmost care.'],
      ['Public-entity path', 'A transit agency triggers the six-month rule.'],
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
      'Whether an OCTA common-carrier duty applies',
      'Whether the six-month public-entity deadline was met',
      'Whether the right claimant brings the claim',
      'Whether both claims are pursued',
      'The documented economic and relational loss',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Duty is heightened', copy: 'Common carriers owe utmost care.' },
      { label: 'Deadline is short', copy: 'A public entity means six months.' },
      { label: 'Two claims, two measures', copy: 'Family and estate claims differ.' },
      { label: 'Build from facts', copy: 'Documented loss, not an average, sets value.' },
    ],
    insuranceProblems: [
      'The transit-agency six-month deadline is missed.',
      'The survival claim is overlooked.',
      'The economic loss is undervalued without documentation.',
      'The wrong claimant challenges the case.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was an OCTA bus, city vehicle, or public road involved?' },
      { label: 'Step 2', question: 'When did the death occur (six-month clock)?' },
      { label: 'Step 3', question: 'Who survives the deceased, and in what tier?' },
      { label: 'Step 4', question: 'Has an estate representative been appointed?' },
    ],
  },
}
