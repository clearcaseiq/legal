import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, DUI-victim (drunk / impaired driver) practice area (batch 3):
 * location-specific guides for San Francisco, San Bernardino, Bakersfield, and
 * Anaheim, extending the batch-1 (LA, San Diego, Sacramento, Riverside) and
 * batch-2 (San Jose, Fresno, Long Beach, Oakland) hub.
 *
 * A crash caused by an impaired driver is an ordinary negligence claim with extra
 * layers: a parallel criminal case, possible dram-shop or social-host exposure in
 * narrow circumstances, restitution that does not replace a civil claim, and the
 * possibility of punitive damages against a drunk driver.
 *
 * Local context, genuine rather than interpolated:
 *  - San Francisco: dense nightlife and heavy rideshare use, where the criminal
 *    case and any commercial-host facts run alongside the civil claim.
 *  - San Bernardino: long inland corridors (I-15, I-10, I-215) with late-night
 *    impaired driving and frequent uninsured overlap.
 *  - Bakersfield: highway and rural-road impaired crashes (Highway 99, 58) with a
 *    high uninsured-driver rate that pushes recovery toward UM coverage.
 *  - Anaheim: a resort and entertainment corridor with bars, events, and tourist
 *    traffic that raise commercial-host and out-of-town-driver questions.
 *
 * Applied accurately (ordinary negligence plus per se impairment evidence; the
 * criminal case is separate and its restitution does not replace a civil claim;
 * California dram-shop immunity, Business & Professions Code 25602, with the
 * narrow obviously-intoxicated-minor exception in 25602.1; punitive damages
 * available against a drunk driver, Taylor v. Superior Court; UM/UIM coverage
 * where the drunk driver is uninsured or fled; pure comparative negligence;
 * two-year deadline CCP 335.1, six months against a public entity).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether punitive damages, a host\u2019s liability, UM coverage, or the interaction with a criminal case applies depends on facts a licensed California attorney should review promptly.'

const CIVIL_VS_CRIMINAL =
  'A drunk-driving crash usually produces two separate matters: the criminal case the state brings against the driver, and the victim\u2019s own civil claim for their injuries. They are independent \u2014 a criminal conviction can help prove the civil case, but any restitution ordered in the criminal case does not replace a full civil recovery, and a victim should not assume the criminal process will make them whole.'

const PUNITIVE =
  'Driving while intoxicated is the kind of conscious disregard for safety that can support punitive damages against the drunk driver, over and above compensation for the harm (Taylor v. Superior Court). That possibility can meaningfully change a case, but it depends on the facts and is decided under a demanding standard.'

const DRAM_SHOP =
  'California generally protects businesses that serve alcohol from liability for what an intoxicated patron later does (Business and Professions Code section 25602), so a bar or restaurant usually is not responsible. The main exception is narrow: serving an obviously intoxicated minor (section 25602.1). Whether any host or server exposure exists is fact-specific and worth checking, but it is the exception rather than the rule.'

const COVERAGE =
  'When the impaired driver is uninsured or fled, the victim\u2019s own uninsured or underinsured motorist coverage is frequently the practical route to recovery, and it carries its own notice and timing rules. Identifying every policy that might respond \u2014 the victim\u2019s own, a household member\u2019s \u2014 early is important, because notice deadlines can be short.'

export const SF_DUI_SLUG = '/san-francisco-dui-accident'
export const SB_DUI_SLUG = '/san-bernardino-dui-accident'
export const BAKERSFIELD_DUI_SLUG = '/bakersfield-dui-accident'
export const ANAHEIM_DUI_SLUG = '/anaheim-dui-accident'

export const duiVictimCityGuidePages3: LandingPage[] = [
  {
    slug: SF_DUI_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco DUI Victim Claims',
    title: 'San Francisco DUI Victim Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a drunk or impaired driver in San Francisco? Your civil claim is separate from the criminal case, and a drunk driver can face punitive damages.',
    psychology: 'A drunk driver hurt me in San Francisco and I do not know whether the criminal case covers my injuries.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco dui accident victim lawyer',
      'hit by drunk driver claim california',
      'punitive damages drunk driver california',
      'dui victim restitution vs civil claim',
      'uninsured drunk driver claim california',
    ],
    signals: [
      'Civil claim separate from criminal',
      'Punitive damages possible',
      'Dram-shop generally immune',
      'Nightlife / rideshare context',
      'UM if driver uninsured / fled',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s dense nightlife and heavy rideshare use mean impaired-driving crashes often involve a criminal case and sometimes commercial-host facts running alongside the victim\u2019s civil claim. ${CIVIL_VS_CRIMINAL} ${PUNITIVE} ${DRAM_SHOP} ${COVERAGE} Civil cases are filed in San Francisco County Superior Court, generally within two years, or six months where a public entity is involved.`,
      whatToTrack: [
        'Whether the driver was arrested or charged with DUI',
        'The criminal case number and any restitution order',
        'Whether the driver was insured, uninsured, or fled',
        'The victim\u2019s own UM/UIM coverage',
        'Where the driver had been drinking (host facts, if any)',
        'The police report and any chemical-test results',
        'The injuries and full treatment',
        'The date of the crash and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ keeps a San Francisco DUI victim\u2019s civil claim separate from the criminal case, flags where punitive damages or UM coverage may apply, and preserves the arrest and test evidence that strengthens the civil file. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The drunk driver was criminally charged. Does that cover my injuries?',
        a: 'Not fully. The criminal case is separate from your civil claim, and any restitution ordered there does not replace a full civil recovery. A conviction can help prove your civil case, but you generally need to pursue the civil claim to be made whole.',
      },
      {
        q: 'Can a drunk driver be made to pay punitive damages?',
        a: 'Possibly. Driving while intoxicated can be the kind of conscious disregard for safety that supports punitive damages over and above compensation (Taylor v. Superior Court). It depends on the facts and is decided under a demanding standard.',
      },
      {
        q: 'The driver had been drinking at a bar. Is the bar responsible?',
        a: 'Usually not. California generally protects businesses that serve alcohol from liability for what an intoxicated patron later does. The main exception is narrow \u2014 serving an obviously intoxicated minor \u2014 so whether any host exposure exists is fact-specific.',
      },
      {
        q: 'The drunk driver had no insurance. What can I do?',
        a: 'Your own uninsured or underinsured motorist coverage is frequently the practical route to recovery. It carries its own notice and timing rules, so identifying and opening that coverage promptly is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the civil claim and the DUI evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_DUI_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino DUI Victim Claims',
    title: 'San Bernardino DUI Victim Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a drunk or impaired driver on I-15, I-10, or I-215? Your civil claim is separate from the criminal case, and your own coverage may matter if the driver was uninsured.',
    psychology: 'A drunk driver hurt me in San Bernardino and I do not know how I will be compensated.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino dui accident victim lawyer',
      'hit by drunk driver claim california',
      'punitive damages drunk driver california',
      'uninsured drunk driver claim california',
      'dui victim restitution vs civil claim',
    ],
    signals: [
      'Civil claim separate from criminal',
      'Punitive damages possible',
      'Late-night corridor crashes',
      'Frequent uninsured overlap',
      'UM if driver uninsured / fled',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Bernardino\u2019s long inland corridors \u2014 I-15, I-10, and I-215 \u2014 see late-night impaired driving that frequently overlaps with uninsured drivers, so the victim\u2019s own coverage often matters alongside the civil claim against the driver. ${CIVIL_VS_CRIMINAL} ${PUNITIVE} ${COVERAGE} ${DRAM_SHOP} Civil cases are filed in San Bernardino County Superior Court, generally within two years, or six months where a public entity is involved.`,
      whatToTrack: [
        'Whether the driver was arrested or charged with DUI',
        'Whether the driver was insured, uninsured, or fled',
        'The victim\u2019s own UM/UIM coverage',
        'The criminal case number and any restitution order',
        'The police report and any chemical-test results',
        'Where the driver had been drinking (host facts, if any)',
        'The injuries and full treatment',
        'The date of the crash and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ keeps a San Bernardino DUI victim\u2019s civil claim separate from the criminal case, checks the victim\u2019s own UM coverage where the driver was uninsured, and flags where punitive damages may apply. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The drunk driver had no insurance. What can I do?',
        a: 'Your own uninsured or underinsured motorist coverage is frequently the practical route to recovery, which matters given how often impaired and uninsured driving overlap on these corridors. It carries its own notice and timing rules, so opening it promptly is important.',
      },
      {
        q: 'The drunk driver was criminally charged. Does that cover my injuries?',
        a: 'Not fully. The criminal case is separate from your civil claim, and any restitution ordered there does not replace a full civil recovery. A conviction can help prove your civil case, but you generally need to pursue the civil claim to be made whole.',
      },
      {
        q: 'Can a drunk driver be made to pay punitive damages?',
        a: 'Possibly. Driving while intoxicated can be the kind of conscious disregard for safety that supports punitive damages over and above compensation. It depends on the facts and is decided under a demanding standard.',
      },
      {
        q: 'The driver had been drinking at a bar. Is the bar responsible?',
        a: 'Usually not. California generally protects businesses that serve alcohol from liability for what an intoxicated patron later does. The main exception is narrow \u2014 serving an obviously intoxicated minor \u2014 so whether any host exposure exists is fact-specific.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the civil claim and the DUI evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_DUI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield DUI Victim Claims',
    title: 'Bakersfield DUI Victim Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a drunk or impaired driver on Highway 99 or 58? A high uninsured rate means your own coverage often matters, and a drunk driver can face punitive damages.',
    psychology: 'A drunk driver hurt me in Bakersfield and I do not know how I will be compensated.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield dui accident victim lawyer',
      'hit by drunk driver claim california',
      'uninsured drunk driver claim california',
      'punitive damages drunk driver california',
      'dui victim restitution vs civil claim',
    ],
    signals: [
      'Civil claim separate from criminal',
      'High uninsured-driver rate',
      'Highway / rural-road crashes',
      'Punitive damages possible',
      'UM if driver uninsured / fled',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Bakersfield\u2019s highway and rural-road impaired crashes \u2014 on Highway 99 and 58 \u2014 frequently involve drivers with no insurance, so the victim\u2019s own uninsured-motorist coverage often becomes the practical recovery alongside the civil claim. ${CIVIL_VS_CRIMINAL} ${COVERAGE} ${PUNITIVE} ${DRAM_SHOP} Civil cases are filed in Kern County Superior Court, generally within two years, or six months where a public entity is involved.`,
      whatToTrack: [
        'Whether the driver was arrested or charged with DUI',
        'Whether the driver was insured, uninsured, or fled',
        'The victim\u2019s own UM/UIM coverage',
        'The criminal case number and any restitution order',
        'The police report and any chemical-test results',
        'Where the driver had been drinking (host facts, if any)',
        'The injuries and full treatment',
        'The date of the crash and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ checks a Bakersfield DUI victim\u2019s own UM coverage where the driver was uninsured, keeps the civil claim separate from the criminal case, and flags where punitive damages may apply. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The drunk driver had no insurance. What can I do?',
        a: 'Your own uninsured or underinsured motorist coverage is frequently the practical route to recovery, which matters given the high uninsured-driver rate in the area. It carries its own notice and timing rules, so opening it promptly is important.',
      },
      {
        q: 'The drunk driver was criminally charged. Does that cover my injuries?',
        a: 'Not fully. The criminal case is separate from your civil claim, and any restitution ordered there does not replace a full civil recovery. A conviction can help prove your civil case, but you generally need to pursue the civil claim to be made whole.',
      },
      {
        q: 'Can a drunk driver be made to pay punitive damages?',
        a: 'Possibly. Driving while intoxicated can be the kind of conscious disregard for safety that supports punitive damages over and above compensation. It depends on the facts and is decided under a demanding standard.',
      },
      {
        q: 'The driver had been drinking at a bar. Is the bar responsible?',
        a: 'Usually not. California generally protects businesses that serve alcohol from liability for what an intoxicated patron later does. The main exception is narrow \u2014 serving an obviously intoxicated minor \u2014 so whether any host exposure exists is fact-specific.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the civil claim and the DUI evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_DUI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim DUI Victim Claims',
    title: 'Anaheim DUI Victim Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a drunk or impaired driver in Anaheim? Resort-corridor bars, events, and tourist traffic raise host and out-of-town-driver questions alongside your civil claim.',
    psychology: 'A drunk driver hurt me in Anaheim and I do not know whether the criminal case or a bar covers my injuries.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim dui accident victim lawyer',
      'hit by drunk driver claim california',
      'punitive damages drunk driver california',
      'bar liability drunk driver california',
      'out of state drunk driver claim california',
    ],
    signals: [
      'Civil claim separate from criminal',
      'Bars / events / tourist traffic',
      'Dram-shop generally immune',
      'Punitive damages possible',
      'Out-of-town / uninsured drivers',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s resort and entertainment corridor \u2014 with bars, events, and tourist traffic \u2014 raises commercial-host and out-of-town-driver questions alongside the victim\u2019s civil claim, even though host liability is the narrow exception rather than the rule. ${CIVIL_VS_CRIMINAL} ${DRAM_SHOP} ${PUNITIVE} ${COVERAGE} Civil cases are filed in Orange County Superior Court, generally within two years, or six months where a public entity is involved.`,
      whatToTrack: [
        'Whether the driver was arrested or charged with DUI',
        'Where the driver had been drinking (bar, event, host facts)',
        'Whether the driver was local, out-of-state, uninsured, or fled',
        'The victim\u2019s own UM/UIM coverage',
        'The criminal case number and any restitution order',
        'The police report and any chemical-test results',
        'The injuries and full treatment',
        'The date of the crash and any deadlines',
      ],
      howClearCaseHelps: `ClearCaseIQ checks any commercial-host facts behind an Anaheim DUI crash, keeps the civil claim separate from the criminal case, untangles out-of-state or uninsured coverage, and flags where punitive damages may apply. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver had been drinking at a bar or event. Is the venue responsible?',
        a: 'Usually not. California generally protects businesses that serve alcohol from liability for what an intoxicated patron later does. The main exception is narrow \u2014 serving an obviously intoxicated minor \u2014 so whether any host exposure exists is fact-specific and worth checking.',
      },
      {
        q: 'The drunk driver was criminally charged. Does that cover my injuries?',
        a: 'Not fully. The criminal case is separate from your civil claim, and any restitution ordered there does not replace a full civil recovery. A conviction can help prove your civil case, but you generally need to pursue the civil claim to be made whole.',
      },
      {
        q: 'The drunk driver was an out-of-state tourist. Whose insurance applies?',
        a: 'It can be layered \u2014 an out-of-state policy, a rental company\u2019s coverage, and your own UM/UIM coverage may all be in play. Untangling which policies respond, and in what order, is often the key task, so identifying every policy early matters.',
      },
      {
        q: 'Can a drunk driver be made to pay punitive damages?',
        a: 'Possibly. Driving while intoxicated can be the kind of conscious disregard for safety that supports punitive damages over and above compensation. It depends on the facts and is decided under a demanding standard.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the civil claim and the DUI evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const duiVictimCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [SF_DUI_SLUG]: {
    scenario: `A San Francisco pedestrian was struck by an impaired driver leaving a late-night venue. The criminal DUI case ran in parallel while the civil claim \u2014 with a punitive-damages theory \u2014 pursued full compensation. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Get the police report and arrest details.'],
      ['First weeks', 'Open the civil claim; check UM coverage.'],
      ['Assessment', 'Punitive and host facts reviewed.'],
      ['Longer term', 'Civil claim developed independent of the criminal case.'],
    ],
    severityLadder: [
      ['Two matters', 'Criminal case and civil claim are separate.'],
      ['Punitive', 'A drunk driver can face punitive damages.'],
      ['Host facts', 'Usually immune, narrow exceptions.'],
      ['Coverage', 'UM if the driver is uninsured or fled.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether the driver was convicted of DUI',
      'Whether punitive damages are supported',
      'Whether any host exposure exists',
      'Whether the driver was insured',
      'The victim\u2019s own UM/UIM coverage',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Separate matters', copy: 'Restitution is not full recovery.' },
      { label: 'Punitive theory', copy: 'Intoxication can support it.' },
      { label: 'Host is narrow', copy: 'Usually immune under 25602.' },
      { label: 'Check coverage', copy: 'UM if the driver cannot pay.' },
    ],
    insuranceProblems: [
      'The victim assumes restitution replaces the civil claim.',
      'A punitive-damages theory is never developed.',
      'Own UM coverage is never opened.',
      'Arrest and chemical-test evidence is not preserved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver arrested or charged with DUI?' },
      { label: 'Step 2', question: 'Was the driver insured, uninsured, or fled?' },
      { label: 'Step 3', question: 'Where had the driver been drinking?' },
      { label: 'Step 4', question: 'What UM/UIM coverage do you carry?' },
    ],
  },
  [SB_DUI_SLUG]: {
    scenario: `A San Bernardino driver was hit by an impaired, uninsured driver on I-215 late at night. The civil claim ran alongside the criminal case, and the victim\u2019s own UM coverage became the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Get the police report; confirm the driver\u2019s coverage.'],
      ['First weeks', 'Open the civil claim and your own UM claim.'],
      ['Assessment', 'Punitive and coverage facts reviewed.'],
      ['Longer term', 'Civil claim developed independent of the criminal case.'],
    ],
    severityLadder: [
      ['Two matters', 'Criminal case and civil claim are separate.'],
      ['Uninsured overlap', 'UM is often the recovery.'],
      ['Punitive', 'A drunk driver can face punitive damages.'],
      ['Coverage', 'Own and household policies checked.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether the driver was insured',
      'The victim\u2019s own UM/UIM coverage',
      'Whether punitive damages are supported',
      'Whether the driver was convicted of DUI',
      'The full documented loss',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Check coverage', copy: 'UM if the driver cannot pay.' },
      { label: 'Separate matters', copy: 'Restitution is not full recovery.' },
      { label: 'Punitive theory', copy: 'Intoxication can support it.' },
      { label: 'Notice matters', copy: 'UM has its own timing rules.' },
    ],
    insuranceProblems: [
      'Own UM coverage is never opened.',
      'The victim assumes restitution replaces the civil claim.',
      'A punitive-damages theory is never developed.',
      'Arrest and chemical-test evidence is not preserved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver arrested or charged with DUI?' },
      { label: 'Step 2', question: 'Was the driver insured, uninsured, or fled?' },
      { label: 'Step 3', question: 'What UM/UIM coverage do you carry?' },
      { label: 'Step 4', question: 'Have you notified your own insurer?' },
    ],
  },
  [BAKERSFIELD_DUI_SLUG]: {
    scenario: `A Bakersfield family was hit by an impaired, uninsured driver on Highway 99. With no coverage from the driver, the family\u2019s own UM coverage \u2014 opened with prompt notice \u2014 carried the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Get the police report; confirm the driver\u2019s coverage.'],
      ['First weeks', 'Open the civil claim and your own UM claim.'],
      ['Assessment', 'Punitive and coverage facts reviewed.'],
      ['Longer term', 'Civil claim developed independent of the criminal case.'],
    ],
    severityLadder: [
      ['Two matters', 'Criminal case and civil claim are separate.'],
      ['High uninsured', 'UM is frequently the recovery.'],
      ['Punitive', 'A drunk driver can face punitive damages.'],
      ['Coverage', 'Own and household policies checked.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether the driver was insured',
      'The victim\u2019s own UM/UIM coverage',
      'Whether punitive damages are supported',
      'Whether the driver was convicted of DUI',
      'The full documented loss',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Check coverage', copy: 'UM if the driver cannot pay.' },
      { label: 'Separate matters', copy: 'Restitution is not full recovery.' },
      { label: 'Punitive theory', copy: 'Intoxication can support it.' },
      { label: 'Notice matters', copy: 'UM has its own timing rules.' },
    ],
    insuranceProblems: [
      'Own UM coverage is never opened.',
      'The victim assumes restitution replaces the civil claim.',
      'A punitive-damages theory is never developed.',
      'Arrest and chemical-test evidence is not preserved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver arrested or charged with DUI?' },
      { label: 'Step 2', question: 'Was the driver insured, uninsured, or fled?' },
      { label: 'Step 3', question: 'What UM/UIM coverage do you carry?' },
      { label: 'Step 4', question: 'Have you notified your own insurer?' },
    ],
  },
  [ANAHEIM_DUI_SLUG]: {
    scenario: `An Anaheim visitor was struck by an out-of-state tourist who had been drinking at a resort-corridor bar. The civil claim untangled layered out-of-state coverage while a host inquiry checked the narrow exceptions. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Get the police report; identify where the driver drank.'],
      ['First weeks', 'Open the civil claim; untangle coverage.'],
      ['Assessment', 'Host, punitive, and coverage facts reviewed.'],
      ['Longer term', 'Civil claim developed independent of the criminal case.'],
    ],
    severityLadder: [
      ['Two matters', 'Criminal case and civil claim are separate.'],
      ['Host facts', 'Usually immune, narrow exceptions.'],
      ['Out-of-town', 'Layered out-of-state coverage.'],
      ['Punitive', 'A drunk driver can face punitive damages.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether any host exposure exists',
      'Which out-of-state or rental policies respond',
      'The victim\u2019s own UM/UIM coverage',
      'Whether punitive damages are supported',
      'Whether the driver was convicted of DUI',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Host is narrow', copy: 'Usually immune under 25602.' },
      { label: 'Untangle coverage', copy: 'Out-of-state layers apply.' },
      { label: 'Punitive theory', copy: 'Intoxication can support it.' },
      { label: 'Separate matters', copy: 'Restitution is not full recovery.' },
    ],
    insuranceProblems: [
      'Layered out-of-state coverage is never untangled.',
      'A host inquiry is never made where facts warrant it.',
      'Own UM coverage is never opened.',
      'The victim assumes restitution replaces the civil claim.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where had the driver been drinking?' },
      { label: 'Step 2', question: 'Was the driver local, out-of-state, or a renter?' },
      { label: 'Step 3', question: 'Was the driver insured, uninsured, or fled?' },
      { label: 'Step 4', question: 'What UM/UIM coverage do you carry?' },
    ],
  },
}
