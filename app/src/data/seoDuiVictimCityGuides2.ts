import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, drunk-driving (DUI) victim practice area (batch 2): location-specific
 * guides for San Jose, Fresno, Long Beach, and Oakland, extending the batch-1 hub
 * (LA, San Diego, Sacramento, Riverside).
 *
 * A DUI victim's civil claim is distinct from the criminal case against the
 * driver: punitive damages are frequently available, a limited set of alcohol
 * vendors can be liable, and uninsured-motorist coverage often matters because
 * impaired drivers are disproportionately uninsured.
 *
 * Local context, genuine rather than interpolated:
 *  - San Jose: high medical and wage costs mean a low-limits or uninsured impaired
 *    driver frequently leaves a large gap only the victim's own coverage can fill.
 *  - Fresno: Central Valley high uninsured-driver rates and rural highway
 *    (Route 99) DUI collisions, where the victim's own coverage is central.
 *  - Long Beach: dense Pine Avenue and downtown nightlife plus port-area roads,
 *    where the alcohol-vendor question and impaired driving recur.
 *  - Oakland: nightlife districts, a significant uninsured-driver population, and
 *    freeway DUI collisions.
 *
 * Applied accurately (a drunk driver is liable and DUI conduct often supports
 * punitive damages under Civil Code 3294; California generally immunizes alcohol
 * vendors, Bus. & Prof. Code 25602 and Civil Code 1714, with the narrow
 * obviously-intoxicated-minor exception, Bus. & Prof. Code 25602.1; the victim's
 * own UM/UIM coverage often matters; the criminal case and its restitution are
 * separate from the civil claim; pure comparative negligence; two-year deadline
 * CCP 335.1; six-month Government Claims Act deadline for a public entity).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether punitive damages, a vendor claim, or uninsured-motorist coverage applies, and which deadline controls, depends on facts a licensed California attorney should review promptly.'

const PUNITIVE =
  'A drunk driver is liable for the harm they cause, and DUI conduct frequently supports punitive damages under Civil Code section 3294 \u2014 damages meant to punish, on top of compensation for medical bills, lost income, and pain \u2014 because driving while impaired can amount to a conscious disregard for the safety of others. That possibility is a distinctive feature of a DUI victim\u2019s civil claim.'

const VENDOR =
  'California generally immunizes bars, restaurants, and social hosts who furnish alcohol (Business and Professions Code section 25602 and Civil Code section 1714), so the vendor is usually not liable. There is a narrow but important exception: a licensed vendor who serves an obviously intoxicated minor can be liable (Business and Professions Code section 25602.1), and a social host who serves alcohol to an obviously intoxicated minor can be liable. Whether this exception fits is fact-specific and worth checking early.'

const UNINSURED =
  'Impaired drivers are disproportionately uninsured, so a DUI victim\u2019s own uninsured or underinsured motorist coverage often becomes the practical source of recovery when the driver has no or minimal insurance. Identifying every policy \u2014 the victim\u2019s own UM/UIM, a household member\u2019s, and any employer coverage \u2014 is frequently what turns a hollow judgment into an actual recovery.'

const CRIMINAL =
  'The criminal DUI case against the driver is separate from the victim\u2019s civil claim. A criminal court can order restitution, but that is not the same as, and does not replace, a civil claim for full damages including pain and suffering and punitive damages. The two proceed on different tracks, and a criminal conviction can help but is not required to win the civil case.'

export const SJ_DUI_SLUG = '/san-jose-dui-accident'
export const FRESNO_DUI_SLUG = '/fresno-dui-accident'
export const LB_DUI_SLUG = '/long-beach-dui-accident'
export const OAK_DUI_SLUG = '/oakland-dui-accident'

export const duiVictimCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_DUI_SLUG,
    category: 'Cities',
    cluster: 'San Jose Drunk Driving Accident Claims',
    title: 'San Jose Drunk Driving Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a drunk driver in San Jose? Your civil claim is separate from the criminal case \u2014 punitive damages are often available, and a low-limits or uninsured driver can leave a gap only your own coverage fills.',
    psychology: 'A drunk driver hurt me in San Jose and I do not know if I can claim beyond the criminal case.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose drunk driving accident lawyer',
      'punitive damages dui accident california',
      'hit by uninsured drunk driver california',
      'underinsured drunk driver bills exceed limits california',
      'dui victim civil claim vs restitution california',
    ],
    signals: [
      'Punitive damages (3294)',
      'High-cost underinsured gap',
      'Uninsured / underinsured coverage',
      'Vendor/social-host exception (25602.1)',
      'Civil claim vs. restitution',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s high medical and wage costs shape the DUI victim\u2019s claim: even when the impaired driver is insured, low policy limits are frequently far short of the harm in a serious Silicon Valley crash, and impaired drivers are also disproportionately uninsured. ${UNINSURED} ${PUNITIVE} ${VENDOR} ${CRIMINAL} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s insurance and limits versus the actual harm',
        'Your own uninsured/underinsured motorist coverage and any household policy',
        'The criminal DUI case number and any restitution order',
        'Whether a licensed vendor served an obviously intoxicated minor',
        'Evidence of impairment \u2014 the police report, tests, and any witnesses',
        'Photographs of the vehicles and the scene',
        'Medical treatment and wage loss from first response onward',
        'The date of the crash, which starts the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a San Jose DUI victim\u2019s civil claim distinct from the criminal case, measures the gap between a low-limits driver and the true cost of a serious injury to trigger UM/UIM coverage, and develops the punitive-damages basis DUI conduct often supports. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The drunk driver had insurance but the bills are far higher. What can I do?',
        a: 'Your own underinsured motorist coverage applies when the at-fault driver had insurance but not enough to cover the harm, and it can supplement their limits up to your own coverage. In high-cost San Jose crashes that gap is often large, so identifying your UM/UIM limits and giving your insurer any required notice matters.',
      },
      {
        q: 'The driver was criminally charged. Can I still bring a civil claim?',
        a: 'Yes. The criminal DUI case is separate from your civil claim. Restitution ordered in the criminal case does not replace a civil claim for full damages, including pain and suffering and potentially punitive damages. A conviction can help but is not required.',
      },
      {
        q: 'Can I get punitive damages against a drunk driver?',
        a: 'Often, yes. DUI conduct frequently supports punitive damages under Civil Code section 3294, on top of compensation, because driving while impaired can amount to a conscious disregard for others\u2019 safety. Whether they apply depends on the facts.',
      },
      {
        q: 'Can I sue the bar that served the driver?',
        a: 'Usually not. California generally immunizes alcohol vendors, with a narrow exception where a licensed vendor served an obviously intoxicated minor (Business and Professions Code section 25602.1). Whether that exception fits is worth checking early.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the punitive and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_DUI_SLUG,
    category: 'Cities',
    cluster: 'Fresno Drunk Driving Accident Claims',
    title: 'Fresno Drunk Driving Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a drunk driver in Fresno? Your civil claim is separate from the criminal case \u2014 punitive damages are often available, and the Central Valley\u2019s high uninsured rate makes your own coverage critical.',
    psychology: 'A drunk driver hurt me in Fresno and I do not know if I can claim beyond the criminal case.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno drunk driving accident lawyer',
      'central valley dui accident claim',
      'hit by uninsured drunk driver california',
      'punitive damages dui accident california',
      'dui victim civil claim vs restitution california',
    ],
    signals: [
      'Punitive damages (3294)',
      'High Central Valley uninsured rate',
      'Uninsured / underinsured coverage',
      'Rural / highway DUI collisions',
      'Civil claim vs. restitution',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Fresno and the Central Valley combine high uninsured-driver rates with heavy rural and Route 99 highway travel, which shapes the DUI victim\u2019s claim: the impaired driver is disproportionately likely to have no insurance. ${UNINSURED} That regional reality makes uninsured and underinsured motorist coverage the practical center of many Fresno DUI claims. ${PUNITIVE} ${VENDOR} ${CRIMINAL} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s insurance, and whether they were uninsured',
        'Your own uninsured/underinsured motorist coverage and any household policy',
        'The criminal DUI case number and any restitution order',
        'Whether a licensed vendor served an obviously intoxicated minor',
        'Evidence of impairment \u2014 the police report, tests, and any witnesses',
        'Photographs of the vehicles and the scene',
        'Medical treatment from first response onward',
        'The date of the crash, which starts the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Fresno DUI victim\u2019s civil claim distinct from the criminal case, prioritises finding every uninsured-motorist and other policy given the Central Valley\u2019s high uninsured rate, and develops the punitive-damages basis DUI conduct often supports. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The drunk driver had no insurance, which is common here. What can I do?',
        a: 'The Central Valley has high uninsured-driver rates, so your own uninsured or underinsured motorist coverage often becomes the practical source of recovery. Identifying every policy \u2014 your own, a household member\u2019s, and any employer coverage \u2014 is frequently what makes recovery real.',
      },
      {
        q: 'The driver was criminally charged. Can I still bring a civil claim?',
        a: 'Yes. The criminal DUI case is separate from your civil claim. Restitution ordered in the criminal case does not replace a civil claim for full damages, including pain and suffering and potentially punitive damages. A conviction can help but is not required.',
      },
      {
        q: 'Can I get punitive damages against a drunk driver?',
        a: 'Often, yes. DUI conduct frequently supports punitive damages under Civil Code section 3294, on top of compensation, because driving while impaired can amount to a conscious disregard for others\u2019 safety. Whether they apply depends on the facts.',
      },
      {
        q: 'Can I sue the bar that served the driver?',
        a: 'Usually not. California generally immunizes alcohol vendors, with a narrow exception where a licensed vendor served an obviously intoxicated minor (Business and Professions Code section 25602.1). Whether that exception fits is worth checking early.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage and punitive questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_DUI_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Drunk Driving Accident Claims',
    title: 'Long Beach Drunk Driving Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a drunk driver in Long Beach? Your civil claim is separate from the criminal case \u2014 punitive damages are often available, and the Pine Avenue nightlife raises distinctive vendor questions.',
    psychology: 'A drunk driver hurt me in Long Beach and I do not know if I can claim beyond the criminal case.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach drunk driving accident lawyer',
      'pine avenue dui accident claim',
      'punitive damages dui accident california',
      'hit by uninsured drunk driver california',
      'can i sue the bar that served the driver california',
    ],
    signals: [
      'Punitive damages (3294)',
      'Nightlife-district vendor exception',
      'Uninsured / underinsured coverage',
      'Port-area & freeway collisions',
      'Civil claim vs. restitution',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s dense Pine Avenue and downtown nightlife, along with its port-area roads and freeways, produce recurring DUI collisions and make the alcohol-vendor question especially live. ${VENDOR} Long Beach\u2019s concentrated bar district is exactly where the obviously-intoxicated-minor exception is worth examining. ${PUNITIVE} ${UNINSURED} ${CRIMINAL} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Which bar or venue served the driver, and whether a minor was involved',
        'The driver\u2019s insurance, and whether they were uninsured',
        'Your own uninsured/underinsured motorist coverage and any household policy',
        'The criminal DUI case number and any restitution order',
        'Evidence of impairment \u2014 the police report, tests, and any witnesses',
        'Photographs of the vehicles and the scene',
        'Medical treatment from first response onward',
        'The date of the crash, which starts the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Long Beach DUI victim\u2019s civil claim distinct from the criminal case, examines the vendor question the Pine Avenue nightlife raises, develops the punitive-damages basis, and locates every uninsured-motorist and other policy. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver had been drinking on Pine Avenue. Can I sue the bar?',
        a: 'Usually not, because California generally immunizes alcohol vendors. But there is a narrow exception where a licensed vendor served an obviously intoxicated minor (Business and Professions Code section 25602.1). In Long Beach\u2019s dense bar district this exception is worth examining early, because the venue\u2019s records matter.',
      },
      {
        q: 'The driver was criminally charged. Can I still bring a civil claim?',
        a: 'Yes. The criminal DUI case is separate from your civil claim. Restitution ordered in the criminal case does not replace a civil claim for full damages, including pain and suffering and potentially punitive damages. A conviction can help but is not required.',
      },
      {
        q: 'Can I get punitive damages against a drunk driver?',
        a: 'Often, yes. DUI conduct frequently supports punitive damages under Civil Code section 3294, on top of compensation, because driving while impaired can amount to a conscious disregard for others\u2019 safety. Whether they apply depends on the facts.',
      },
      {
        q: 'The drunk driver had no insurance. What can I do?',
        a: 'Your own uninsured or underinsured motorist coverage often becomes the practical source of recovery, because impaired drivers are frequently uninsured. Identifying every policy \u2014 your own, a household member\u2019s, and any employer coverage \u2014 is frequently what makes recovery real.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the vendor and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_DUI_SLUG,
    category: 'Cities',
    cluster: 'Oakland Drunk Driving Accident Claims',
    title: 'Oakland Drunk Driving Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a drunk driver in Oakland? Your civil claim is separate from the criminal case \u2014 punitive damages are often available, and your own uninsured-motorist coverage may matter if the driver has none.',
    psychology: 'A drunk driver hurt me in Oakland and I do not know if I can claim beyond the criminal case.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland drunk driving accident lawyer',
      'punitive damages dui accident california',
      'hit by uninsured drunk driver california',
      'can i sue the bar that served the driver california',
      'dui victim civil claim vs restitution california',
    ],
    signals: [
      'Punitive damages (3294)',
      'Significant uninsured population',
      'Uninsured / underinsured coverage',
      'Nightlife & freeway collisions',
      'Civil claim vs. restitution',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s nightlife districts and busy freeways produce recurring DUI collisions, and with a significant uninsured-driver population, impaired drivers here frequently have no insurance. ${UNINSURED} ${PUNITIVE} ${VENDOR} ${CRIMINAL} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'The driver\u2019s insurance, and whether they were uninsured',
        'Your own uninsured/underinsured motorist coverage and any household policy',
        'The criminal DUI case number and any restitution order',
        'Whether a licensed vendor served an obviously intoxicated minor',
        'Evidence of impairment \u2014 the police report, tests, and any witnesses',
        'Photographs of the vehicles and the scene',
        'Medical treatment from first response onward',
        'The date of the crash, which starts the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ builds an Oakland DUI victim\u2019s civil claim distinct from the criminal case, locates every uninsured-motorist and other policy when the driver has no coverage, develops the punitive-damages basis DUI conduct often supports, and checks whether a vendor exception applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The drunk driver had no insurance. What can I do?',
        a: 'Impaired drivers are frequently uninsured, which is why your own uninsured or underinsured motorist coverage often becomes the practical source of recovery. Identifying every policy \u2014 your own, a household member\u2019s, and any employer coverage \u2014 is frequently what turns a hollow judgment into an actual recovery.',
      },
      {
        q: 'The driver was criminally charged. Can I still bring a civil claim?',
        a: 'Yes. The criminal DUI case is separate from your civil claim. Restitution ordered in the criminal case does not replace a civil claim for full damages, including pain and suffering and potentially punitive damages. A conviction can help but is not required.',
      },
      {
        q: 'Can I get punitive damages against a drunk driver?',
        a: 'Often, yes. DUI conduct frequently supports punitive damages under Civil Code section 3294, on top of compensation, because driving while impaired can amount to a conscious disregard for others\u2019 safety. Whether they apply depends on the facts.',
      },
      {
        q: 'Can I sue the bar that served the driver?',
        a: 'Usually not. California generally immunizes alcohol vendors, with a narrow exception where a licensed vendor served an obviously intoxicated minor (Business and Professions Code section 25602.1). Whether that exception fits is worth checking early.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the punitive and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const duiVictimCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_DUI_SLUG]: {
    scenario: `A San Jose professional was seriously hurt by a drunk driver carrying only minimum limits, far short of the medical bills and lost income. Underinsured motorist coverage filled the gap while the punitive basis was developed against the driver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report, impairment evidence, and witnesses.'],
      ['First days', 'The at-fault limits and your own UM/UIM identified.'],
      ['First weeks', 'The gap between limits and harm, and the punitive basis, developed.'],
      ['Longer term', 'Treatment documented; the civil claim built alongside the criminal case.'],
    ],
    severityLadder: [
      ['Underinsured', 'Low at-fault limits leave a large gap.'],
      ['Punitive path', 'DUI conduct often supports punitive damages.'],
      ['Uninsured path', 'Your own UM/UIM coverage becomes the recovery.'],
      ['Vendor exception', 'A served obviously intoxicated minor can add a defendant.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The at-fault driver\u2019s limits versus the harm',
      'Whether the DUI conduct supports punitive damages',
      'What UM/UIM coverage you carry',
      'The strength of the impairment evidence',
      'Injury severity, wage loss, and treatment continuity',
      'Whether the civil claim is kept distinct from restitution',
    ],
    settlementValueDetails: [
      { label: 'UIM fills the gap', copy: 'It supplements low at-fault limits.' },
      { label: 'Punitives are distinctive', copy: 'DUI conduct often supports them.' },
      { label: 'High costs widen the gap', copy: 'Silicon Valley harm often exceeds limits.' },
      { label: 'Civil is separate', copy: 'Restitution does not replace a civil claim.' },
    ],
    insuranceProblems: [
      'The victim settles for the driver\u2019s low limits alone.',
      'The punitive-damages basis is never developed.',
      'Underinsured-motorist coverage is overlooked.',
      'Impairment evidence is not preserved early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What were the at-fault driver\u2019s limits?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you carry?' },
      { label: 'Step 3', question: 'Was the driver criminally charged?' },
      { label: 'Step 4', question: 'Do you have the police report and impairment evidence?' },
    ],
  },
  [FRESNO_DUI_SLUG]: {
    scenario: `A Fresno commuter was hit on Route 99 by a drunk driver who, as is common in the Central Valley, had no insurance. The victim\u2019s stacked uninsured-motorist coverage became the recovery while the punitive basis was developed against the driver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report, impairment evidence, and witnesses.'],
      ['First days', 'The driver\u2019s (lack of) coverage and your own UM/UIM identified.'],
      ['First weeks', 'The punitive basis and any vendor exception developed.'],
      ['Longer term', 'Treatment documented; the civil claim built alongside the criminal case.'],
    ],
    severityLadder: [
      ['Uninsured path', 'The Central Valley\u2019s high uninsured rate makes UM/UIM central.'],
      ['Driver liability', 'The impaired driver is responsible for the harm.'],
      ['Punitive path', 'DUI conduct often supports punitive damages.'],
      ['Vendor exception', 'A served obviously intoxicated minor can add a defendant.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the driver was uninsured and what coverage you carry',
      'Whether the DUI conduct supports punitive damages',
      'Whether a vendor exception adds a defendant',
      'The strength of the impairment evidence',
      'Injury severity and treatment continuity',
      'Whether the civil claim is kept distinct from restitution',
    ],
    settlementValueDetails: [
      { label: 'Coverage is the recovery', copy: 'UM/UIM is central given high uninsured rates.' },
      { label: 'Punitives are distinctive', copy: 'DUI conduct often supports them.' },
      { label: 'Find every policy', copy: 'Own, household, and employer coverage all count.' },
      { label: 'Civil is separate', copy: 'Restitution does not replace a civil claim.' },
    ],
    insuranceProblems: [
      'Uninsured-motorist coverage is overlooked in a common uninsured-driver case.',
      'The victim assumes restitution is their only recovery.',
      'The punitive-damages basis is never developed.',
      'Impairment evidence is not preserved early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver uninsured, and what coverage do you carry?' },
      { label: 'Step 2', question: 'Was the driver criminally charged?' },
      { label: 'Step 3', question: 'Did a licensed vendor serve an obviously intoxicated minor?' },
      { label: 'Step 4', question: 'Do you have the police report and impairment evidence?' },
    ],
  },
  [LB_DUI_SLUG]: {
    scenario: `A Long Beach pedestrian was struck by a driver who had been overserved as an obviously intoxicated minor in a Pine Avenue bar. The narrow vendor exception was examined against the venue\u2019s records while the civil claim proceeded separately. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report, impairment evidence, and witnesses.'],
      ['First days', 'The venue that served the driver and any minor identified.'],
      ['First weeks', 'The vendor exception and punitive basis developed.'],
      ['Longer term', 'Treatment documented; the civil claim built alongside the criminal case.'],
    ],
    severityLadder: [
      ['Driver liability', 'The impaired driver is responsible for the harm.'],
      ['Vendor exception', 'A served obviously intoxicated minor can add a defendant.'],
      ['Punitive path', 'DUI conduct often supports punitive damages.'],
      ['Uninsured path', 'Your own UM/UIM coverage can become the recovery.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a vendor served an obviously intoxicated minor',
      'Whether the DUI conduct supports punitive damages',
      'Whether the driver was uninsured and what coverage you carry',
      'The strength of the impairment and venue evidence',
      'Injury severity and treatment continuity',
      'Whether the civil claim is kept distinct from restitution',
    ],
    settlementValueDetails: [
      { label: 'Vendor exception is narrow', copy: 'It fits only an obviously intoxicated minor.' },
      { label: 'Punitives are distinctive', copy: 'DUI conduct often supports them.' },
      { label: 'Records matter', copy: 'The venue\u2019s records must be preserved early.' },
      { label: 'Civil is separate', copy: 'Restitution does not replace a civil claim.' },
    ],
    insuranceProblems: [
      'The venue\u2019s records are lost before they are requested.',
      'The victim assumes restitution is their only recovery.',
      'The punitive-damages basis is never developed.',
      'Uninsured-motorist coverage is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where was the driver served, and was a minor involved?' },
      { label: 'Step 2', question: 'Was the driver criminally charged, and are they insured?' },
      { label: 'Step 3', question: 'What uninsured/underinsured coverage do you carry?' },
      { label: 'Step 4', question: 'Do you have the police report and impairment evidence?' },
    ],
  },
  [OAK_DUI_SLUG]: {
    scenario: `An Oakland driver was hit by a drunk driver who turned out to be uninsured. The civil claim proceeded separately from the criminal case, the punitive-damages basis was developed, and the victim\u2019s own uninsured-motorist coverage became the real source of recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report, impairment evidence, and witnesses.'],
      ['First days', 'The driver\u2019s coverage and your own UM/UIM identified.'],
      ['First weeks', 'The punitive basis and any vendor exception developed.'],
      ['Longer term', 'Treatment documented; the civil claim built alongside the criminal case.'],
    ],
    severityLadder: [
      ['Driver liability', 'The impaired driver is responsible for the harm.'],
      ['Punitive path', 'DUI conduct often supports punitive damages.'],
      ['Uninsured path', 'Your own UM/UIM coverage becomes the recovery.'],
      ['Vendor exception', 'A served obviously intoxicated minor can add a defendant.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the driver was uninsured and what coverage you carry',
      'Whether the DUI conduct supports punitive damages',
      'Whether a vendor exception adds a defendant',
      'The strength of the impairment evidence',
      'Injury severity and treatment continuity',
      'Whether the civil claim is kept distinct from restitution',
    ],
    settlementValueDetails: [
      { label: 'Coverage is the recovery', copy: 'UM/UIM matters when the driver is uninsured.' },
      { label: 'Punitives are distinctive', copy: 'DUI conduct often supports them.' },
      { label: 'Civil is separate', copy: 'Restitution does not replace a civil claim.' },
      { label: 'Vendor exception is narrow', copy: 'It fits only an obviously intoxicated minor.' },
    ],
    insuranceProblems: [
      'The victim assumes restitution is their only recovery.',
      'The punitive-damages basis is never developed.',
      'Uninsured-motorist coverage is overlooked.',
      'Impairment evidence is not preserved early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver criminally charged, and are they insured?' },
      { label: 'Step 2', question: 'What uninsured/underinsured coverage do you carry?' },
      { label: 'Step 3', question: 'Did a licensed vendor serve an obviously intoxicated minor?' },
      { label: 'Step 4', question: 'Do you have the police report and impairment evidence?' },
    ],
  },
}
