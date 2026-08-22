import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, uninsured and hit-and-run motorist practice area (batch 2):
 * location-specific guides for San Diego, San Jose, Sacramento, and Oakland,
 * extending the batch-1 hub (LA, San Bernardino, Fresno, Bakersfield).
 *
 * A crash caused by an uninsured, underinsured, or fled driver is a distinct
 * problem: the recovery frequently comes from the victim's own uninsured and
 * underinsured motorist (UM/UIM) coverage rather than the at-fault driver, and
 * the rules and deadlines for those claims differ from an ordinary third-party
 * claim.
 *
 * Local context, genuine rather than interpolated:
 *  - San Diego: a busy border region where a crash can involve a Mexican-insured
 *    or uninsured foreign vehicle, plus many active-duty service members carrying
 *    out-of-state auto policies, both of which complicate the coverage question.
 *  - San Jose: high medical and wage costs mean a low-limits at-fault driver often
 *    leaves a large underinsured gap even when the driver is insured.
 *  - Sacramento: heavy commuter corridors and a large volume of state and public
 *    fleet vehicles, alongside ordinary uninsured drivers.
 *  - Oakland: elevated urban hit-and-run rates and a significant uninsured-driver
 *    population, where phantom-vehicle corroboration is often decisive.
 *
 * Applied accurately (UM applies when the at-fault driver is uninsured or fled;
 * UIM applies when limits are too low, Insurance Code 11580.2; hit-and-run UM can
 * require corroboration of a phantom vehicle and often physical contact; coverage
 * can span more than one policy with prompt written notice to the own insurer
 * required; UM/UIM disputes generally go to arbitration under the policy with
 * their own timing rules separate from the two-year deadline CCP 335.1; pure
 * comparative negligence).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether UM or UIM coverage applies, how a hit-and-run must be corroborated, and which timing rules control depend on facts a licensed California attorney should review promptly.'

const UM =
  'Uninsured motorist coverage applies when the at-fault driver has no insurance at all or fled the scene in a hit-and-run, and underinsured motorist coverage applies when the driver had insurance but not enough to cover the harm (Insurance Code section 11580.2). This coverage on the victim\u2019s own policy is often the practical source of recovery when the responsible driver cannot pay.'

const HIT_RUN =
  'A hit-and-run claim through uninsured motorist coverage can require corroboration that a phantom vehicle caused the crash, and in many situations physical contact with the fleeing vehicle. That is why the police report, independent witnesses, and any camera footage are so important \u2014 they establish that another vehicle was responsible even though the driver is gone.'

const MULTIPLE =
  'Coverage can sometimes be found across more than one policy \u2014 the victim\u2019s own, a household member\u2019s, or a resident relative\u2019s \u2014 which can matter when a single policy is not enough. Identifying every policy that might respond is frequently what makes a real recovery possible, but prompt written notice to the victim\u2019s own insurer is typically required, so delay can jeopardise the claim.'

const PROCESS =
  'A dispute over uninsured or underinsured motorist coverage is generally resolved by arbitration under the terms of the policy rather than by a jury, and it carries its own timing and notice rules that are separate from the two-year deadline (Code of Civil Procedure section 335.1) governing a claim against the at-fault driver. Because these rules are unforgiving and the insurer is the victim\u2019s own, an early, careful approach matters.'

export const SD_UM_SLUG = '/san-diego-uninsured-motorist-accident'
export const SJ_UM_SLUG = '/san-jose-uninsured-motorist-accident'
export const SAC_UM_SLUG = '/sacramento-uninsured-motorist-accident'
export const OAK_UM_SLUG = '/oakland-uninsured-motorist-accident'

export const uninsuredMotoristCityGuidePages2: LandingPage[] = [
  {
    slug: SD_UM_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Uninsured & Hit-and-Run Accident Claims',
    title: 'San Diego Uninsured & Hit-and-Run Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured, foreign-insured, or fled driver in San Diego? Your own uninsured-motorist coverage is often the recovery \u2014 and a border or military policy can complicate the coverage question.',
    psychology: 'An uninsured or fled driver hurt me in San Diego and I do not know how I can be paid.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego hit and run accident lawyer',
      'uninsured motorist claim california',
      'hit by mexican insured car san diego',
      'underinsured motorist claim california',
      'military out of state policy uninsured motorist',
    ],
    signals: [
      'UM / UIM coverage (11580.2)',
      'Border / foreign-insured vehicles',
      'Out-of-state military policies',
      'Hit-and-run corroboration',
      'Prompt notice to own insurer',
      'Arbitration, not jury',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s position as a major border region means a crash can involve a Mexican-insured or entirely uninsured foreign vehicle whose coverage will not respond to a California claim, and its large active-duty population often carries out-of-state auto policies with different UM/UIM terms \u2014 both of which complicate the coverage question. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Pure comparative negligence applies. A claim against an identified at-fault driver is filed in San Diego County Superior Court, while a UM/UIM dispute typically proceeds to arbitration.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured, foreign-insured, or fled',
        'Your own uninsured/underinsured motorist coverage and limits',
        'Whether your policy is an out-of-state (military) policy',
        'Any household or resident-relative policy that might respond',
        'The police report and hit-and-run report number',
        'Independent witnesses and any camera or dashcam footage',
        'Prompt written notice to your own insurer',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ sorts out whether a foreign-insured or out-of-state military policy changes a San Diego crash, identifies every uninsured and underinsured motorist policy that might respond, assembles hit-and-run corroboration, and flags the prompt-notice and arbitration rules. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hit by a car with Mexican insurance that will not pay. What can I do?',
        a: 'A Mexican-insured or uninsured foreign vehicle often will not respond to a California claim, which means your own uninsured motorist coverage is frequently the practical source of recovery. Identifying every policy that might respond \u2014 your own, a household member\u2019s, or a resident relative\u2019s \u2014 matters in a border crash.',
      },
      {
        q: 'I am active-duty with an out-of-state auto policy. Does that change my claim?',
        a: 'It can. An out-of-state policy may have different uninsured and underinsured motorist terms, limits, and notice rules than a California policy. Because those differences affect what you can recover and how quickly you must act, an early review of the exact policy language is important.',
      },
      {
        q: 'The driver who hit me fled the scene. How can I be paid?',
        a: 'Your own uninsured motorist coverage applies to a hit-and-run, but it can require corroboration that a phantom vehicle caused the crash, and in many situations physical contact. The police report, independent witnesses, and any camera footage are important to establish another vehicle was responsible.',
      },
      {
        q: 'Is a UM/UIM claim handled like a normal lawsuit?',
        a: 'Usually not. A dispute over uninsured or underinsured motorist coverage is generally resolved by arbitration under your policy, with its own timing and notice rules separate from the two-year deadline for a claim against the at-fault driver. Prompt written notice to your own insurer is typically required.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage and corroboration questions, and the notice rules so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_UM_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Uninsured & Hit-and-Run Accident Claims',
    title: 'San Jose Uninsured & Hit-and-Run Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured or minimally insured driver in San Jose? With high medical and wage costs, even an insured driver\u2019s low limits can leave a large underinsured gap your own coverage can fill.',
    psychology: 'A low-limits or uninsured driver hurt me in San Jose and the bills far exceed their insurance.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose hit and run accident lawyer',
      'underinsured motorist claim california',
      'hit by driver with low insurance limits california',
      'uninsured motorist claim california',
      'medical bills exceed at fault driver limits california',
    ],
    signals: [
      'UM / UIM coverage (11580.2)',
      'High-cost underinsured gap',
      'Multiple-policy coverage',
      'Hit-and-run corroboration',
      'Prompt notice to own insurer',
      'Arbitration, not jury',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s high medical and wage costs create a distinctive underinsured problem: even when the at-fault driver is insured, minimum or low policy limits are frequently far short of the actual harm in a serious Silicon Valley crash, leaving a large gap that only the victim\u2019s own underinsured motorist coverage can fill. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Pure comparative negligence applies. A claim against an identified at-fault driver is filed in Santa Clara County Superior Court, while a UM/UIM dispute typically proceeds to arbitration.`,
      whatToTrack: [
        'The at-fault driver\u2019s limits versus the actual harm',
        'Your own uninsured/underinsured motorist coverage and limits',
        'Any household or resident-relative policy that might respond',
        'Whether the at-fault driver was uninsured or fled',
        'The police report and any hit-and-run report number',
        'Independent witnesses and any camera or dashcam footage',
        'Prompt written notice to your own insurer',
        'Medical treatment and wage loss from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ measures the gap between a low-limits San Jose driver and the true cost of a serious injury, triggers the victim\u2019s underinsured motorist coverage, identifies every policy that might respond, and flags the prompt-notice and arbitration rules. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver had insurance but the bills are far higher than their limits. What can I do?',
        a: 'That is exactly what underinsured motorist coverage is for: it applies when the at-fault driver had insurance but not enough to cover the harm (Insurance Code section 11580.2), and it can supplement their limits up to your own coverage. In high-cost San Jose crashes, that gap is often large, so identifying your UIM limits is important.',
      },
      {
        q: 'Should I accept the at-fault driver\u2019s policy limits?',
        a: 'Be careful \u2014 accepting a low-limits settlement without preserving your underinsured motorist claim and giving your own insurer any required notice can jeopardise your UIM recovery. Because the steps and notice rules matter, it is worth reviewing before you settle.',
      },
      {
        q: 'The driver who hit me fled or had no insurance. How can I be paid?',
        a: 'Your own uninsured motorist coverage applies when the driver has no insurance or fled the scene. A hit-and-run claim can require corroboration of a phantom vehicle and often physical contact, so the police report, witnesses, and any footage matter.',
      },
      {
        q: 'Is a UM/UIM claim handled like a normal lawsuit?',
        a: 'Usually not. It is generally resolved by arbitration under your policy, with its own timing and notice rules separate from the two-year deadline for a claim against the at-fault driver. Prompt written notice to your own insurer is typically required.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage and gap questions, and the notice rules so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_UM_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Uninsured & Hit-and-Run Accident Claims',
    title: 'Sacramento Uninsured & Hit-and-Run Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured driver or a hit-and-run on a Sacramento commute? Your own uninsured-motorist coverage is often the recovery \u2014 and a phantom-vehicle claim has to be corroborated.',
    psychology: 'An uninsured or fled driver hurt me in Sacramento and I do not know how I can be paid.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento hit and run accident lawyer',
      'uninsured motorist claim california',
      'hit by driver with no insurance california',
      'underinsured motorist claim california',
      'freeway hit and run coverage california',
    ],
    signals: [
      'UM / UIM coverage (11580.2)',
      'Commuter-corridor crashes',
      'Hit-and-run corroboration',
      'Multiple-policy coverage',
      'Prompt notice to own insurer',
      'Arbitration, not jury',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s heavy commuter corridors \u2014 the region\u2019s freeways carry large daily volumes \u2014 produce frequent crashes, and when the at-fault driver is uninsured or flees, the victim\u2019s own coverage becomes the recovery. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Pure comparative negligence applies. A claim against an identified at-fault driver is filed in Sacramento County Superior Court, while a UM/UIM dispute typically proceeds to arbitration.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured or fled the scene',
        'Your own uninsured/underinsured motorist coverage and limits',
        'Any household or resident-relative policy that might respond',
        'The police report and hit-and-run report number',
        'Independent witnesses and any freeway-camera or dashcam footage',
        'Whether there was physical contact with the fleeing vehicle',
        'Prompt written notice to your own insurer',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every uninsured and underinsured motorist policy that might respond to a Sacramento commuter crash, assembles the corroboration a freeway hit-and-run requires, and flags the prompt-notice and arbitration rules that make UM/UIM claims different. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me on the freeway fled. How can I be paid?',
        a: 'Your own uninsured motorist coverage applies to a hit-and-run, but it can require corroboration that a phantom vehicle caused the crash, and in many situations physical contact. On a busy commute, the police report, independent witnesses, and any freeway-camera or dashcam footage are important to establish another vehicle was responsible.',
      },
      {
        q: 'The driver had no insurance. What can I do?',
        a: 'Uninsured motorist coverage on your own policy applies when the at-fault driver has no insurance, and it is often the practical source of recovery. Coverage can sometimes be found across more than one policy \u2014 your own, a household member\u2019s, or a resident relative\u2019s \u2014 so identifying every policy matters.',
      },
      {
        q: 'The driver had insurance but not enough. Is that covered?',
        a: 'That is what underinsured motorist coverage is for: it applies when the at-fault driver had insurance but not enough (Insurance Code section 11580.2), and can supplement their limits up to your own coverage.',
      },
      {
        q: 'Is a UM/UIM claim handled like a normal lawsuit?',
        a: 'Usually not. It is generally resolved by arbitration under your policy, with its own timing and notice rules separate from the two-year deadline for a claim against the at-fault driver. Prompt written notice to your own insurer is typically required.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage and corroboration questions, and the notice rules so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_UM_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Uninsured & Hit-and-Run Accident Claims',
    title: 'Oakland Uninsured & Hit-and-Run Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured driver or a hit-and-run in Oakland? With elevated urban hit-and-run rates, your own uninsured-motorist coverage is often the recovery \u2014 and corroboration is decisive.',
    psychology: 'An uninsured or fled driver hurt me in Oakland and I do not know how I can be paid.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland hit and run accident lawyer',
      'uninsured motorist claim california',
      'hit by driver with no insurance california',
      'underinsured motorist claim california',
      'phantom vehicle hit and run coverage california',
    ],
    signals: [
      'UM / UIM coverage (11580.2)',
      'Elevated urban hit-and-run rates',
      'Hit-and-run corroboration',
      'Multiple-policy coverage',
      'Prompt notice to own insurer',
      'Arbitration, not jury',
    ],
    sections: {
      whyItMatters: `Oakland has elevated urban hit-and-run rates and a significant uninsured-driver population, which means many crash victims cannot recover from the at-fault driver and must turn to their own coverage \u2014 and where the driver fled, corroborating the phantom vehicle is often decisive. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Pure comparative negligence applies. A claim against an identified at-fault driver is filed in Alameda County Superior Court, while a UM/UIM dispute typically proceeds to arbitration.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured or fled the scene',
        'Your own uninsured/underinsured motorist coverage and limits',
        'Any household or resident-relative policy that might respond',
        'The police report and hit-and-run report number',
        'Independent witnesses and any traffic-camera or dashcam footage',
        'Whether there was physical contact with the fleeing vehicle',
        'Prompt written notice to your own insurer',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ assembles the corroboration an Oakland hit-and-run claim requires given the city\u2019s elevated rates, identifies every uninsured and underinsured motorist policy that might respond, and flags the prompt-notice and arbitration rules that make UM/UIM claims different. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me fled the scene, which is common here. How can I be paid?',
        a: 'Your own uninsured motorist coverage applies to a hit-and-run, but it can require corroboration that a phantom vehicle caused the crash, and in many situations physical contact. Because Oakland\u2019s hit-and-run rate is high, the police report, independent witnesses, and any camera footage are especially important to establish another vehicle was responsible.',
      },
      {
        q: 'The driver had no insurance. What can I do?',
        a: 'Uninsured motorist coverage on your own policy applies when the at-fault driver has no insurance, and it is often the practical source of recovery. Coverage can sometimes be found across more than one policy \u2014 your own, a household member\u2019s, or a resident relative\u2019s \u2014 so identifying every policy matters.',
      },
      {
        q: 'The driver had insurance but not enough. Is that covered?',
        a: 'That is what underinsured motorist coverage is for: it applies when the at-fault driver had insurance but not enough (Insurance Code section 11580.2), and can supplement their limits up to your own coverage.',
      },
      {
        q: 'Is a UM/UIM claim handled like a normal lawsuit?',
        a: 'Usually not. It is generally resolved by arbitration under your policy, with its own timing and notice rules separate from the two-year deadline for a claim against the at-fault driver. Prompt written notice to your own insurer is typically required.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage and corroboration questions, and the notice rules so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const uninsuredMotoristCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SD_UM_SLUG]: {
    scenario: `A San Diego driver was hit by a car with Mexican insurance that would not respond to a California claim. With no coverage from the at-fault vehicle, the victim\u2019s own uninsured motorist coverage became the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; capture witnesses and any footage.'],
      ['First days', 'Prompt written notice to your own insurer; policies identified.'],
      ['First weeks', 'Foreign-insurance status and every own policy developed.'],
      ['Longer term', 'Treatment documented; the UM/UIM claim advanced to arbitration.'],
    ],
    severityLadder: [
      ['Foreign-insured', 'A Mexican-insured vehicle may not respond here.'],
      ['Uninsured', 'No coverage from the at-fault driver.'],
      ['Out-of-state policy', 'A military policy may have different terms.'],
      ['Multiple policies', 'More than one own policy may respond.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the at-fault vehicle was foreign-insured or uninsured',
      'What UM/UIM coverage you and your household carry',
      'Whether your policy is an out-of-state (military) policy',
      'Whether prompt notice was given to your insurer',
      'Injury severity and treatment continuity',
      'The strength of the police report and witnesses',
    ],
    settlementValueDetails: [
      { label: 'Own coverage is the recovery', copy: 'UM/UIM applies when the driver cannot pay.' },
      { label: 'Foreign insurance may not pay', copy: 'A border crash often turns to your policy.' },
      { label: 'Check the policy terms', copy: 'An out-of-state policy differs.' },
      { label: 'Notice and arbitration', copy: 'UM/UIM claims follow their own rules.' },
    ],
    insuranceProblems: [
      'The victim assumes the foreign insurer will pay and waits.',
      'Prompt notice to the own insurer is missed.',
      'An out-of-state policy\u2019s terms are never reviewed.',
      'Only one policy is identified when more could respond.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the at-fault vehicle foreign-insured or uninsured?' },
      { label: 'Step 2', question: 'Is your policy a California or out-of-state policy?' },
      { label: 'Step 3', question: 'What UM/UIM coverage do you and your household carry?' },
      { label: 'Step 4', question: 'Have you notified your own insurer in writing?' },
    ],
  },
  [SJ_UM_SLUG]: {
    scenario: `A San Jose professional was seriously hurt by a driver carrying only minimum limits, far short of the medical bills and lost income. Underinsured motorist coverage supplemented the driver\u2019s limits up to the victim\u2019s own, closing the gap. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; capture witnesses and any footage.'],
      ['First days', 'The at-fault limits and your own UIM identified.'],
      ['First weeks', 'The gap between the limits and the harm developed.'],
      ['Longer term', 'Treatment documented; the UIM claim advanced to arbitration.'],
    ],
    severityLadder: [
      ['Underinsured', 'The driver\u2019s low limits leave a large gap.'],
      ['High-cost harm', 'Medical and wage costs exceed the limits.'],
      ['UIM path', 'Your own coverage supplements the shortfall.'],
      ['Multiple policies', 'More than one policy may respond.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'The at-fault driver\u2019s limits versus the harm',
      'What UIM coverage you carry',
      'Whether the UIM claim was preserved before settling',
      'Whether prompt notice was given to your insurer',
      'Injury severity, wage loss, and treatment continuity',
      'The strength of the police report and records',
    ],
    settlementValueDetails: [
      { label: 'UIM fills the gap', copy: 'It supplements low at-fault limits.' },
      { label: 'High costs widen the gap', copy: 'Silicon Valley harm often exceeds limits.' },
      { label: 'Preserve the claim', copy: 'Do not settle away the UIM right.' },
      { label: 'Notice and arbitration', copy: 'UM/UIM claims follow their own rules.' },
    ],
    insuranceProblems: [
      'The victim settles for the driver\u2019s low limits alone.',
      'The UIM claim is jeopardised by an uncoordinated settlement.',
      'Prompt notice to the own insurer is missed.',
      'The gap between limits and harm is undervalued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What were the at-fault driver\u2019s limits?' },
      { label: 'Step 2', question: 'What UIM coverage do you carry?' },
      { label: 'Step 3', question: 'Have you notified your own insurer in writing?' },
      { label: 'Step 4', question: 'Do the bills and wage loss exceed the driver\u2019s limits?' },
    ],
  },
  [SAC_UM_SLUG]: {
    scenario: `A Sacramento commuter was struck by a car that sped off in freeway traffic. Freeway-camera footage and a witness corroborated the phantom vehicle, and the victim\u2019s own uninsured motorist coverage became the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; capture witnesses and any footage.'],
      ['First days', 'Prompt written notice to your own insurer; policies identified.'],
      ['First weeks', 'Hit-and-run corroboration and every policy developed.'],
      ['Longer term', 'Treatment documented; the UM/UIM claim advanced to arbitration.'],
    ],
    severityLadder: [
      ['Hit-and-run', 'A fled driver requires phantom-vehicle corroboration.'],
      ['Commuter setting', 'Freeway crashes make footage critical.'],
      ['Uninsured', 'No coverage from the at-fault driver.'],
      ['Multiple policies', 'More than one policy may respond.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the fled or uninsured driver can be corroborated',
      'What UM/UIM coverage you and your household carry',
      'Whether freeway-camera footage and witnesses were secured',
      'Whether prompt notice was given to your insurer',
      'Injury severity and treatment continuity',
      'The strength of the police report',
    ],
    settlementValueDetails: [
      { label: 'Corroboration is key', copy: 'A freeway hit-and-run needs proof of a phantom vehicle.' },
      { label: 'Own coverage is the recovery', copy: 'UM/UIM applies when the driver cannot pay.' },
      { label: 'Footage matters', copy: 'Camera and witnesses establish the crash.' },
      { label: 'Notice and arbitration', copy: 'UM/UIM claims follow their own rules.' },
    ],
    insuranceProblems: [
      'The footage is lost before it is preserved.',
      'The phantom vehicle is never corroborated.',
      'Prompt notice to the own insurer is missed.',
      'Only one policy is identified when more could respond.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the driver flee, and is there footage or a witness?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you and your household carry?' },
      { label: 'Step 3', question: 'Have you notified your own insurer in writing?' },
      { label: 'Step 4', question: 'Do you have the police and hit-and-run report?' },
    ],
  },
  [OAK_UM_SLUG]: {
    scenario: `An Oakland driver was struck by a car that never stopped. Traffic-camera footage and witnesses corroborated the phantom vehicle, and the victim\u2019s own uninsured motorist coverage \u2014 across two household policies \u2014 became the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; capture witnesses and any footage.'],
      ['First days', 'Prompt written notice to your own insurer; policies identified.'],
      ['First weeks', 'Hit-and-run corroboration and every policy developed.'],
      ['Longer term', 'Treatment documented; the UM/UIM claim advanced to arbitration.'],
    ],
    severityLadder: [
      ['Hit-and-run', 'A fled driver requires phantom-vehicle corroboration.'],
      ['High local rate', 'Urban hit-and-runs are especially common here.'],
      ['Uninsured', 'No coverage from the at-fault driver.'],
      ['Multiple policies', 'More than one policy may respond.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the fled or uninsured driver can be corroborated',
      'What UM/UIM coverage you and your household carry',
      'Whether traffic-camera footage and witnesses were secured',
      'Whether prompt notice was given to your insurer',
      'Injury severity and treatment continuity',
      'The strength of the police report',
    ],
    settlementValueDetails: [
      { label: 'Corroboration is key', copy: 'An urban hit-and-run needs proof of a phantom vehicle.' },
      { label: 'Own coverage is the recovery', copy: 'UM/UIM applies when the driver cannot pay.' },
      { label: 'Find every policy', copy: 'Household and relative policies may respond.' },
      { label: 'Notice and arbitration', copy: 'UM/UIM claims follow their own rules.' },
    ],
    insuranceProblems: [
      'The victim assumes there is no recovery after a hit-and-run.',
      'The camera footage is lost before it is preserved.',
      'Prompt notice to the own insurer is missed.',
      'Only one policy is identified when more could respond.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the driver flee, and is there footage or a witness?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you and your household carry?' },
      { label: 'Step 3', question: 'Have you notified your own insurer in writing?' },
      { label: 'Step 4', question: 'Do you have the police and hit-and-run report?' },
    ],
  },
}
