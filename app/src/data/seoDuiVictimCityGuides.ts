import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, drunk-driving (DUI) victim practice area: location-specific guides
 * for Los Angeles, San Diego, Sacramento, and Riverside.
 *
 * A DUI victim's civil claim is distinct from the criminal case against the
 * driver: punitive damages are frequently available, a limited set of alcohol
 * vendors can be liable, and uninsured-motorist coverage often matters because
 * impaired drivers are disproportionately uninsured.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: sprawling freeways and dense nightlife across many districts,
 *    with a high volume of DUI collisions and frequently uninsured drivers.
 *  - San Diego: concentrated nightlife (the Gaslamp Quarter, Pacific Beach) and a
 *    heavy military and tourist population, producing recurring DUI collisions.
 *  - Sacramento: a hub where impaired driving on the region's freeways and the
 *    involvement of state and public vehicles can raise public-entity questions.
 *  - Riverside and the Inland Empire: long commute distances, some of the state's
 *    highest uninsured-driver rates, and freeway DUI collisions.
 *
 * Applied accurately:
 *  - A drunk driver is liable for the harm they cause, and DUI conduct frequently
 *    supports punitive damages (Civil Code section 3294) on top of compensatory
 *    damages, because it can amount to a conscious disregard for safety.
 *  - California generally immunizes those who furnish alcohol (Business and
 *    Professions Code section 25602 and Civil Code section 1714), with a narrow
 *    exception: a licensed vendor who serves an obviously intoxicated minor can be
 *    liable (Business and Professions Code section 25602.1), and a social host who
 *    serves alcohol to an obviously intoxicated minor can be liable (Civil Code
 *    section 1714).
 *  - Uninsured and underinsured motorist coverage on the victim's own policy
 *    often matters because impaired drivers are frequently uninsured.
 *  - The criminal case can order restitution, but that is separate from and does
 *    not replace the civil claim for full damages.
 *  - Pure comparative negligence, the two-year deadline (Code of Civil Procedure
 *    section 335.1), and the six-month Government Claims Act deadline where a
 *    public entity is involved.
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

export const LA_DUI_SLUG = '/los-angeles-dui-accident'
export const SD_DUI_SLUG = '/san-diego-dui-accident'
export const SAC_DUI_SLUG = '/sacramento-dui-accident'
export const RIV_DUI_SLUG = '/riverside-dui-accident'

export const duiVictimCityGuidePages: LandingPage[] = [
  {
    slug: LA_DUI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Drunk Driving Accident Claims',
    title: 'Los Angeles Drunk Driving Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a drunk driver in Los Angeles? Your civil claim is separate from the criminal case \u2014 punitive damages are often available, and your own uninsured-motorist coverage may matter if the driver has none.',
    psychology: 'A drunk driver hurt me in LA and I do not know if I can claim beyond the criminal case.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles drunk driving accident lawyer',
      'punitive damages dui accident california',
      'hit by uninsured drunk driver california',
      'can i sue the bar that served the driver california',
      'dui victim civil claim vs restitution california',
    ],
    signals: [
      'Punitive damages (3294)',
      'Vendor/social-host exception (25602.1)',
      'Uninsured / underinsured coverage',
      'Civil claim vs. restitution',
      'Two-year deadline (335.1)',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s sprawling freeways and dense, spread-out nightlife produce a high volume of DUI collisions, and impaired drivers here are frequently uninsured. ${PUNITIVE} ${VENDOR} ${UNINSURED} ${CRIMINAL} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Los Angeles County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ builds an LA DUI victim\u2019s civil claim distinct from the criminal case, develops the punitive-damages basis that DUI conduct often supports, locates every uninsured-motorist and other policy when the driver has no coverage, and checks whether a vendor exception applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver was criminally charged. Can I still bring a civil claim?',
        a: 'Yes. The criminal DUI case is separate from your civil claim. A criminal court can order restitution, but that does not replace a civil claim for full damages, including pain and suffering and potentially punitive damages. A conviction can help your civil case but is not required.',
      },
      {
        q: 'Can I get punitive damages against a drunk driver?',
        a: 'Often, yes. DUI conduct frequently supports punitive damages under Civil Code section 3294 \u2014 damages meant to punish, on top of compensation \u2014 because driving while impaired can amount to a conscious disregard for others\u2019 safety. Whether they apply depends on the facts.',
      },
      {
        q: 'The drunk driver had no insurance. What can I do?',
        a: 'Impaired drivers are frequently uninsured, which is why your own uninsured or underinsured motorist coverage often becomes the practical source of recovery. Identifying every policy \u2014 your own, a household member\u2019s, and any employer coverage \u2014 is frequently what turns a hollow judgment into an actual recovery.',
      },
      {
        q: 'Can I sue the bar that served the driver?',
        a: 'Usually not. California generally immunizes those who furnish alcohol, with a narrow exception: a licensed vendor who serves an obviously intoxicated minor can be liable under Business and Professions Code section 25602.1, and a social host who serves an obviously intoxicated minor can be liable. Whether that exception fits is worth checking early.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the punitive and coverage questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_DUI_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Drunk Driving Accident Claims',
    title: 'San Diego Drunk Driving Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a drunk driver in San Diego? Your civil claim is separate from the criminal case \u2014 punitive damages are often available, and the city\u2019s nightlife districts raise distinctive vendor questions.',
    psychology: 'A drunk driver hurt me in San Diego and I do not know if I can claim beyond the criminal case.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego drunk driving accident lawyer',
      'gaslamp quarter dui accident claim',
      'punitive damages dui accident california',
      'hit by uninsured drunk driver california',
      'can i sue the bar that served the driver california',
    ],
    signals: [
      'Punitive damages (3294)',
      'Nightlife-district vendor exception',
      'Military / tourist drivers',
      'Uninsured / underinsured coverage',
      'Civil claim vs. restitution',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s concentrated nightlife \u2014 the Gaslamp Quarter and Pacific Beach in particular \u2014 combined with a heavy military and tourist population, produces recurring DUI collisions and makes the alcohol-vendor question especially live. ${VENDOR} San Diego\u2019s dense bar districts are exactly where the obviously-intoxicated-minor exception is worth examining. ${PUNITIVE} ${UNINSURED} ${CRIMINAL} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in San Diego County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ builds a San Diego DUI victim\u2019s civil claim distinct from the criminal case, examines the vendor question that the city\u2019s dense nightlife districts raise, develops the punitive-damages basis, and locates every uninsured-motorist and other policy. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver had been drinking in the Gaslamp. Can I sue the bar?',
        a: 'Usually not, because California generally immunizes alcohol vendors. But there is a narrow exception where a licensed vendor served an obviously intoxicated minor (Business and Professions Code section 25602.1). In San Diego\u2019s dense bar districts this exception is worth examining early, because the venue\u2019s records matter.',
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
    slug: SAC_DUI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Drunk Driving Accident Claims',
    title: 'Sacramento Drunk Driving Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a drunk driver in Sacramento? Your civil claim is separate from the criminal case \u2014 punitive damages are often available, and a state or public vehicle can raise a six-month deadline.',
    psychology: 'A drunk driver hurt me in Sacramento and I do not know if I can claim beyond the criminal case.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento drunk driving accident lawyer',
      'punitive damages dui accident california',
      'hit by uninsured drunk driver california',
      'state vehicle dui accident claim california',
      'dui victim civil claim vs restitution california',
    ],
    signals: [
      'Punitive damages (3294)',
      'Public / state vehicle questions',
      'Public-entity six-month deadline',
      'Uninsured / underinsured coverage',
      'Civil claim vs. restitution',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s freeway network sees recurring impaired-driving collisions, and as the seat of state government it also sees more incidents involving state and public vehicles, which can add a public-entity dimension. Where a public entity or public employee is involved, a six-month Government Claims Act deadline can apply, far shorter than the usual two years. ${PUNITIVE} ${VENDOR} ${UNINSURED} ${CRIMINAL} Pure comparative negligence applies. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Whether a public entity, state vehicle, or public employee was involved (six-month rule)',
        'The driver\u2019s insurance, and whether they were uninsured',
        'Your own uninsured/underinsured motorist coverage and any household policy',
        'The criminal DUI case number and any restitution order',
        'Whether a licensed vendor served an obviously intoxicated minor',
        'Evidence of impairment \u2014 the police report, tests, and any witnesses',
        'Medical treatment from first response onward',
        'The date of the crash, which starts the applicable deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Sacramento DUI victim\u2019s civil claim distinct from the criminal case, flags immediately when a public entity or state vehicle triggers the six-month deadline, develops the punitive-damages basis, and locates every uninsured-motorist and other policy. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A state or public vehicle was involved. Is there a shorter deadline?',
        a: 'Possibly. Where a public entity, state vehicle, or public employee is involved, a six-month Government Claims Act deadline can apply \u2014 far shorter than the usual two years \u2014 so the claim must be assessed and filed quickly. This is a distinctive Sacramento issue.',
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
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage and deadline questions, and the punitive-damages basis so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIV_DUI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Drunk Driving Accident Claims',
    title: 'Riverside Drunk Driving Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by a drunk driver in Riverside or the Inland Empire? Your civil claim is separate from the criminal case \u2014 punitive damages are often available, and the region\u2019s high uninsured rate makes your own coverage critical.',
    psychology: 'A drunk driver hurt me in Riverside and I do not know if I can claim beyond the criminal case.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside drunk driving accident lawyer',
      'inland empire dui accident claim',
      'hit by uninsured drunk driver california',
      'punitive damages dui accident california',
      'dui victim civil claim vs restitution california',
    ],
    signals: [
      'Punitive damages (3294)',
      'High uninsured-driver rate',
      'Uninsured / underinsured coverage',
      'Freeway / long-commute collisions',
      'Civil claim vs. restitution',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Riverside and the wider Inland Empire combine long commute distances and heavy freeway travel with some of the state\u2019s highest uninsured-driver rates, which shapes the DUI victim\u2019s claim: the impaired driver is disproportionately likely to have no insurance. ${UNINSURED} That regional reality makes uninsured and underinsured motorist coverage the practical center of many Inland Empire DUI claims. ${PUNITIVE} ${VENDOR} ${CRIMINAL} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Riverside County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ builds a Riverside DUI victim\u2019s civil claim distinct from the criminal case, prioritises finding every uninsured-motorist and other policy given the Inland Empire\u2019s high uninsured rate, and develops the punitive-damages basis that DUI conduct often supports. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The drunk driver had no insurance, which is common here. What can I do?',
        a: 'The Inland Empire has some of the state\u2019s highest uninsured-driver rates, so your own uninsured or underinsured motorist coverage often becomes the practical source of recovery. Identifying every policy \u2014 your own, a household member\u2019s, and any employer coverage \u2014 is frequently what makes recovery real.',
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
]

export const duiVictimCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_DUI_SLUG]: {
    scenario: `An LA driver was hit by a drunk driver who turned out to be uninsured. The civil claim proceeded separately from the criminal case, the punitive-damages basis was developed, and the victim\u2019s own uninsured-motorist coverage became the real source of recovery. ${NOT_ADVICE}`,
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
      'Whether the DUI conduct supports punitive damages',
      'Whether the driver was uninsured and what coverage you carry',
      'Whether a vendor exception adds a defendant',
      'The strength of the impairment evidence',
      'Injury severity and treatment continuity',
      'Whether the civil claim is kept distinct from restitution',
    ],
    settlementValueDetails: [
      { label: 'Punitives are distinctive', copy: 'DUI conduct often supports them.' },
      { label: 'Coverage is the recovery', copy: 'UM/UIM matters when the driver is uninsured.' },
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
  [SD_DUI_SLUG]: {
    scenario: `A San Diego pedestrian was struck by a driver who had been overserved as an obviously intoxicated minor in a Gaslamp bar. The narrow vendor exception was examined against the venue\u2019s records while the civil claim proceeded separately. ${NOT_ADVICE}`,
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
  [SAC_DUI_SLUG]: {
    scenario: `A Sacramento commuter was hit by an impaired driver in a state vehicle. Because a public entity was involved, a six-month government claim had to be filed while the civil claim and its punitive basis were developed separately from the criminal case. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report, impairment evidence, and witnesses.'],
      ['First days', 'Public-entity status and your own UM/UIM identified.'],
      ['Six-month mark', 'A government claim filed if a public entity is involved.'],
      ['Longer term', 'Treatment documented; the civil claim built alongside the criminal case.'],
    ],
    severityLadder: [
      ['Public-entity path', 'A state vehicle triggers the six-month rule.'],
      ['Driver liability', 'The impaired driver is responsible for the harm.'],
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
      'Whether a public entity and its six-month deadline are in play',
      'Whether the DUI conduct supports punitive damages',
      'Whether the driver was uninsured and what coverage you carry',
      'The strength of the impairment evidence',
      'Injury severity and treatment continuity',
      'Whether the civil claim is kept distinct from restitution',
    ],
    settlementValueDetails: [
      { label: 'Deadline can be short', copy: 'A public entity means six months.' },
      { label: 'Punitives are distinctive', copy: 'DUI conduct often supports them.' },
      { label: 'Coverage is the recovery', copy: 'UM/UIM matters when the driver is uninsured.' },
      { label: 'Civil is separate', copy: 'Restitution does not replace a civil claim.' },
    ],
    insuranceProblems: [
      'The six-month public-entity deadline is missed.',
      'The victim assumes restitution is their only recovery.',
      'The punitive-damages basis is never developed.',
      'Uninsured-motorist coverage is overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a public entity, state vehicle, or employee involved?' },
      { label: 'Step 2', question: 'Was the driver criminally charged, and are they insured?' },
      { label: 'Step 3', question: 'What uninsured/underinsured coverage do you carry?' },
      { label: 'Step 4', question: 'Do you have the police report and impairment evidence?' },
    ],
  },
  [RIV_DUI_SLUG]: {
    scenario: `A Riverside commuter was hit by a drunk driver who, as is common in the Inland Empire, had no insurance. The victim\u2019s stacked uninsured-motorist coverage became the recovery while the punitive basis was developed against the driver. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report, impairment evidence, and witnesses.'],
      ['First days', 'The driver\u2019s (lack of) coverage and your own UM/UIM identified.'],
      ['First weeks', 'The punitive basis and any vendor exception developed.'],
      ['Longer term', 'Treatment documented; the civil claim built alongside the criminal case.'],
    ],
    severityLadder: [
      ['Uninsured path', 'The Inland Empire\u2019s high uninsured rate makes UM/UIM central.'],
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
}
