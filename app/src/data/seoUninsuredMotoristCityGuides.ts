import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, uninsured and hit-and-run motorist practice area: location-specific
 * guides for Los Angeles, San Bernardino, Fresno, and Bakersfield.
 *
 * A crash caused by an uninsured, underinsured, or fled driver is a distinct
 * problem: the recovery frequently comes from the victim's own uninsured and
 * underinsured motorist (UM/UIM) coverage rather than the at-fault driver, and
 * the rules and deadlines for those claims differ from an ordinary third-party
 * claim.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: among the highest hit-and-run rates in the country, with a
 *    large uninsured-driver population.
 *  - San Bernardino and the Inland Empire: some of the state's highest
 *    uninsured-driver rates and long freeway commutes.
 *  - Fresno: high uninsured-driver rates across the Central Valley.
 *  - Bakersfield: high uninsured rates and heavy rural and highway driving.
 *
 * Applied accurately:
 *  - Uninsured motorist coverage applies when the at-fault driver has no
 *    insurance or fled (a hit-and-run), and underinsured motorist coverage
 *    applies when the at-fault driver's limits are too low to cover the harm
 *    (Insurance Code section 11580.2).
 *  - A hit-and-run UM claim can require corroboration of the phantom vehicle, and
 *    in many cases physical contact, which is why the police report and witnesses
 *    matter so much.
 *  - Coverage can sometimes be found across more than one policy (the victim's
 *    own, a household member's, and a resident-relative's), and prompt written
 *    notice to the victim's own insurer is typically required.
 *  - A UM/UIM dispute is generally resolved by arbitration under the policy
 *    rather than a jury, and the claim carries its own timing rules separate from
 *    the two-year deadline (Code of Civil Procedure section 335.1) that governs a
 *    claim against the at-fault driver.
 *  - Pure comparative negligence applies.
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

export const LA_UM_SLUG = '/los-angeles-uninsured-motorist-accident'
export const SB_UM_SLUG = '/san-bernardino-uninsured-motorist-accident'
export const FRESNO_UM_SLUG = '/fresno-uninsured-motorist-accident'
export const BAKERSFIELD_UM_SLUG = '/bakersfield-uninsured-motorist-accident'

export const uninsuredMotoristCityGuidePages: LandingPage[] = [
  {
    slug: LA_UM_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Uninsured & Hit-and-Run Accident Claims',
    title: 'Los Angeles Uninsured & Hit-and-Run Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured driver or a hit-and-run in Los Angeles? Your own uninsured-motorist coverage is often the recovery \u2014 but a phantom-vehicle claim has to be corroborated.',
    psychology: 'An uninsured or fled driver hurt me in LA and I do not know how I can be paid.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles hit and run accident lawyer',
      'uninsured motorist claim california',
      'hit by driver with no insurance california',
      'underinsured motorist claim california',
      'phantom vehicle hit and run coverage california',
    ],
    signals: [
      'UM / UIM coverage (11580.2)',
      'Hit-and-run corroboration',
      'Multiple-policy coverage',
      'Prompt notice to own insurer',
      'Arbitration, not jury',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Los Angeles has among the highest hit-and-run rates in the country and a large uninsured-driver population, which means many LA crash victims cannot recover from the at-fault driver and must turn to their own coverage. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Pure comparative negligence applies. A claim against an identified at-fault driver is filed in Los Angeles County Superior Court, while a UM/UIM dispute typically proceeds to arbitration.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured or fled the scene',
        'Your own uninsured/underinsured motorist coverage and limits',
        'Any household or resident-relative policy that might respond',
        'The police report and hit-and-run report number',
        'Independent witnesses and any camera or dashcam footage',
        'Whether there was physical contact with the fleeing vehicle',
        'Prompt written notice to your own insurer',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every uninsured and underinsured motorist policy that might respond to an LA crash, assembles the corroboration a hit-and-run claim requires, and flags the prompt-notice and arbitration rules that make UM/UIM claims different from an ordinary claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me fled the scene. How can I be paid?',
        a: 'Your own uninsured motorist coverage applies to a hit-and-run, but it can require corroboration that a phantom vehicle caused the crash, and in many situations physical contact with the fleeing vehicle. The police report, independent witnesses, and any camera footage are important because they establish another vehicle was responsible even though the driver is gone.',
      },
      {
        q: 'The driver had no insurance. What can I do?',
        a: 'Uninsured motorist coverage on your own policy applies when the at-fault driver has no insurance, and it is often the practical source of recovery. Coverage can sometimes be found across more than one policy \u2014 your own, a household member\u2019s, or a resident relative\u2019s \u2014 so identifying every policy that might respond matters.',
      },
      {
        q: 'The driver had insurance but not enough. Is that covered?',
        a: 'That is what underinsured motorist coverage is for: it applies when the at-fault driver had insurance but not enough to cover the harm (Insurance Code section 11580.2). It can supplement the driver\u2019s limits up to your own coverage, so identifying your UIM limits is important.',
      },
      {
        q: 'Is a UM/UIM claim handled like a normal lawsuit?',
        a: 'Usually not. A dispute over uninsured or underinsured motorist coverage is generally resolved by arbitration under your policy rather than by a jury, and it carries its own timing and notice rules separate from the two-year deadline for a claim against the at-fault driver. Prompt written notice to your own insurer is typically required.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the coverage and corroboration questions, and the notice rules so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_UM_SLUG,
    category: 'Cities',
    cluster: 'San Bernardino Uninsured & Hit-and-Run Accident Claims',
    title: 'San Bernardino Uninsured & Hit-and-Run Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured driver or a hit-and-run in San Bernardino or the Inland Empire? With some of the state\u2019s highest uninsured rates, your own coverage is often the recovery.',
    psychology: 'An uninsured or fled driver hurt me in the Inland Empire and I do not know how I can be paid.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino hit and run accident lawyer',
      'inland empire uninsured motorist claim',
      'hit by driver with no insurance california',
      'underinsured motorist claim california',
      'high uninsured driver rate california claim',
    ],
    signals: [
      'UM / UIM coverage (11580.2)',
      'Highest-in-state uninsured rates',
      'Hit-and-run corroboration',
      'Multiple-policy coverage',
      'Prompt notice to own insurer',
      'Arbitration, not jury',
    ],
    sections: {
      whyItMatters: `San Bernardino and the Inland Empire have some of the state\u2019s highest uninsured-driver rates and long freeway commutes, which makes the uninsured and underinsured motorist question central to most serious crashes here \u2014 the at-fault driver frequently cannot pay. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Pure comparative negligence applies. A claim against an identified at-fault driver is filed in San Bernardino County Superior Court, while a UM/UIM dispute typically proceeds to arbitration.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured or fled the scene',
        'Your own uninsured/underinsured motorist coverage and limits',
        'Any household or resident-relative policy that might respond',
        'The police report and hit-and-run report number',
        'Independent witnesses and any camera or dashcam footage',
        'Whether there was physical contact with the fleeing vehicle',
        'Prompt written notice to your own insurer',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ prioritises finding every uninsured and underinsured motorist policy given the Inland Empire\u2019s high uninsured rate, assembles the corroboration a hit-and-run claim requires, and flags the prompt-notice and arbitration rules that make UM/UIM claims different. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me had no insurance, which is common here. What can I do?',
        a: 'The Inland Empire has some of the state\u2019s highest uninsured-driver rates, so your own uninsured motorist coverage is often the practical source of recovery. Coverage can sometimes be found across more than one policy \u2014 your own, a household member\u2019s, or a resident relative\u2019s \u2014 so identifying every policy matters.',
      },
      {
        q: 'The driver who hit me fled the scene. How can I be paid?',
        a: 'Your own uninsured motorist coverage applies to a hit-and-run, but it can require corroboration that a phantom vehicle caused the crash, and in many situations physical contact. The police report, independent witnesses, and any camera footage are important to establish another vehicle was responsible.',
      },
      {
        q: 'The driver had insurance but not enough. Is that covered?',
        a: 'That is what underinsured motorist coverage is for: it applies when the at-fault driver had insurance but not enough (Insurance Code section 11580.2), and can supplement their limits up to your own coverage. Identifying your UIM limits is important.',
      },
      {
        q: 'Is a UM/UIM claim handled like a normal lawsuit?',
        a: 'Usually not. A dispute over uninsured or underinsured motorist coverage is generally resolved by arbitration under your policy, with its own timing and notice rules separate from the two-year deadline for a claim against the at-fault driver. Prompt written notice to your own insurer is typically required.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the coverage and corroboration questions, and the notice rules so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_UM_SLUG,
    category: 'Cities',
    cluster: 'Fresno Uninsured & Hit-and-Run Accident Claims',
    title: 'Fresno Uninsured & Hit-and-Run Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured driver or a hit-and-run in Fresno? With high Central Valley uninsured rates, your own uninsured-motorist coverage is often the recovery.',
    psychology: 'An uninsured or fled driver hurt me in Fresno and I do not know how I can be paid.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno hit and run accident lawyer',
      'central valley uninsured motorist claim',
      'hit by driver with no insurance california',
      'underinsured motorist claim california',
      'phantom vehicle hit and run coverage california',
    ],
    signals: [
      'UM / UIM coverage (11580.2)',
      'High Central Valley uninsured rates',
      'Hit-and-run corroboration',
      'Multiple-policy coverage',
      'Prompt notice to own insurer',
      'Arbitration, not jury',
    ],
    sections: {
      whyItMatters: `Fresno and the Central Valley have high uninsured-driver rates, so an uninsured or underinsured motorist claim is often the only realistic path to recovery after a serious Fresno crash \u2014 the at-fault driver frequently has no or minimal coverage. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Pure comparative negligence applies. A claim against an identified at-fault driver is filed in Fresno County Superior Court, while a UM/UIM dispute typically proceeds to arbitration.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured or fled the scene',
        'Your own uninsured/underinsured motorist coverage and limits',
        'Any household or resident-relative policy that might respond',
        'The police report and hit-and-run report number',
        'Independent witnesses and any camera or dashcam footage',
        'Whether there was physical contact with the fleeing vehicle',
        'Prompt written notice to your own insurer',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ prioritises finding every uninsured and underinsured motorist policy given the Central Valley\u2019s high uninsured rate, assembles the corroboration a hit-and-run claim requires, and flags the prompt-notice and arbitration rules that make UM/UIM claims different. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver had no insurance, which is common here. What can I do?',
        a: 'Fresno and the Central Valley have high uninsured-driver rates, so your own uninsured motorist coverage is often the practical source of recovery. Coverage can sometimes be found across more than one policy \u2014 your own, a household member\u2019s, or a resident relative\u2019s \u2014 so identifying every policy matters.',
      },
      {
        q: 'The driver who hit me fled the scene. How can I be paid?',
        a: 'Your own uninsured motorist coverage applies to a hit-and-run, but it can require corroboration that a phantom vehicle caused the crash, and in many situations physical contact. The police report, independent witnesses, and any camera footage are important.',
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
  {
    slug: BAKERSFIELD_UM_SLUG,
    category: 'Cities',
    cluster: 'Bakersfield Uninsured & Hit-and-Run Accident Claims',
    title: 'Bakersfield Uninsured & Hit-and-Run Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured driver or a hit-and-run in Bakersfield? With high uninsured rates and heavy highway driving, your own uninsured-motorist coverage is often the recovery.',
    psychology: 'An uninsured or fled driver hurt me in Bakersfield and I do not know how I can be paid.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield hit and run accident lawyer',
      'kern county uninsured motorist claim',
      'hit by driver with no insurance california',
      'underinsured motorist claim california',
      'highway hit and run coverage california',
    ],
    signals: [
      'UM / UIM coverage (11580.2)',
      'High uninsured rates',
      'Rural & highway driving',
      'Hit-and-run corroboration',
      'Prompt notice to own insurer',
      'Arbitration, not jury',
    ],
    sections: {
      whyItMatters: `Bakersfield combines high uninsured-driver rates with heavy rural and highway driving, where hit-and-runs on open roads and uninsured drivers are recurring problems \u2014 which puts the uninsured and underinsured motorist question at the center of most serious crashes. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Pure comparative negligence applies. A claim against an identified at-fault driver is filed in Kern County Superior Court, while a UM/UIM dispute typically proceeds to arbitration.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured or fled the scene',
        'Your own uninsured/underinsured motorist coverage and limits',
        'Any household or resident-relative policy that might respond',
        'The police report and hit-and-run report number',
        'Independent witnesses and any camera or dashcam footage',
        'Whether there was physical contact with the fleeing vehicle',
        'Prompt written notice to your own insurer',
        'Medical treatment from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ prioritises finding every uninsured and underinsured motorist policy given Bakersfield\u2019s high uninsured rate, assembles the corroboration a highway hit-and-run claim requires, and flags the prompt-notice and arbitration rules that make UM/UIM claims different. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver had no insurance, which is common here. What can I do?',
        a: 'Bakersfield has high uninsured-driver rates, so your own uninsured motorist coverage is often the practical source of recovery. Coverage can sometimes be found across more than one policy \u2014 your own, a household member\u2019s, or a resident relative\u2019s \u2014 so identifying every policy matters.',
      },
      {
        q: 'A driver ran me off a highway and fled. How can I be paid?',
        a: 'Your own uninsured motorist coverage applies to a hit-and-run, but it can require corroboration that a phantom vehicle caused the crash, and in many situations physical contact. On open highways this corroboration \u2014 the police report, witnesses, and any dashcam footage \u2014 is especially important.',
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

export const uninsuredMotoristCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_UM_SLUG]: {
    scenario: `An LA driver was struck by a car that sped off. Witnesses and intersection-camera footage corroborated the phantom vehicle, and the victim\u2019s own uninsured motorist coverage \u2014 across two household policies \u2014 became the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; capture witnesses and any footage.'],
      ['First days', 'Prompt written notice to your own insurer; policies identified.'],
      ['First weeks', 'Hit-and-run corroboration and every policy developed.'],
      ['Longer term', 'Treatment documented; the UM/UIM claim advanced to arbitration.'],
    ],
    severityLadder: [
      ['Uninsured driver', 'No coverage from the at-fault driver.'],
      ['Hit-and-run', 'A fled driver requires phantom-vehicle corroboration.'],
      ['Underinsured', 'Low limits leave a gap UIM can fill.'],
      ['Multiple policies', 'More than one policy may respond.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the at-fault driver was uninsured or fled',
      'Whether a hit-and-run is corroborated',
      'What UM/UIM coverage you and your household carry',
      'Whether prompt notice was given to your insurer',
      'Injury severity and treatment continuity',
      'The strength of the police report and witnesses',
    ],
    settlementValueDetails: [
      { label: 'Own coverage is the recovery', copy: 'UM/UIM applies when the driver cannot pay.' },
      { label: 'Corroboration is key', copy: 'A hit-and-run needs a phantom-vehicle showing.' },
      { label: 'Find every policy', copy: 'Household and relative policies may respond.' },
      { label: 'Notice and arbitration', copy: 'UM/UIM claims follow their own rules.' },
    ],
    insuranceProblems: [
      'The victim assumes there is no recovery after a hit-and-run.',
      'Prompt notice to the own insurer is missed.',
      'Only one policy is identified when more could respond.',
      'The phantom vehicle is never corroborated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver uninsured or did they flee?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you and your household carry?' },
      { label: 'Step 3', question: 'Do you have the police report and witnesses?' },
      { label: 'Step 4', question: 'Have you notified your own insurer in writing?' },
    ],
  },
  [SB_UM_SLUG]: {
    scenario: `An Inland Empire commuter was hit by an uninsured driver on the freeway. With the at-fault driver unable to pay, stacked uninsured motorist coverage across two policies became the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; capture witnesses and any footage.'],
      ['First days', 'Prompt written notice to your own insurer; policies identified.'],
      ['First weeks', 'Every responding policy developed.'],
      ['Longer term', 'Treatment documented; the UM/UIM claim advanced to arbitration.'],
    ],
    severityLadder: [
      ['Uninsured driver', 'No coverage from the at-fault driver.'],
      ['High local rate', 'Uninsured drivers are especially common here.'],
      ['Multiple policies', 'More than one policy may respond.'],
      ['Underinsured', 'Low limits leave a gap UIM can fill.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the at-fault driver was uninsured',
      'What UM/UIM coverage you and your household carry',
      'Whether every responding policy was identified',
      'Whether prompt notice was given to your insurer',
      'Injury severity and treatment continuity',
      'The strength of the police report and witnesses',
    ],
    settlementValueDetails: [
      { label: 'Own coverage is the recovery', copy: 'UM/UIM applies when the driver cannot pay.' },
      { label: 'Find every policy', copy: 'Household and relative policies may respond.' },
      { label: 'Notice and arbitration', copy: 'UM/UIM claims follow their own rules.' },
      { label: 'High uninsured rate', copy: 'Own coverage is central in the Inland Empire.' },
    ],
    insuranceProblems: [
      'Prompt notice to the own insurer is missed.',
      'Only one policy is identified when more could respond.',
      'The victim assumes an uninsured driver means no recovery.',
      'The UM/UIM timing rules are overlooked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the at-fault driver uninsured?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you and your household carry?' },
      { label: 'Step 3', question: 'Have you notified your own insurer in writing?' },
      { label: 'Step 4', question: 'Do you have the police report and witnesses?' },
    ],
  },
  [FRESNO_UM_SLUG]: {
    scenario: `A Fresno family was hit by a driver with minimal insurance far short of the medical bills. Underinsured motorist coverage supplemented the driver\u2019s limits up to the family\u2019s own coverage. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; capture witnesses and any footage.'],
      ['First days', 'The at-fault limits and your own UIM identified.'],
      ['First weeks', 'The gap between the driver\u2019s limits and the harm developed.'],
      ['Longer term', 'Treatment documented; the UIM claim advanced to arbitration.'],
    ],
    severityLadder: [
      ['Underinsured', 'The driver\u2019s low limits leave a gap.'],
      ['UIM path', 'Your own coverage supplements the shortfall.'],
      ['Uninsured', 'Some drivers have no coverage at all.'],
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
      'Whether every responding policy was identified',
      'Whether prompt notice was given to your insurer',
      'Injury severity and treatment continuity',
      'The strength of the police report and records',
    ],
    settlementValueDetails: [
      { label: 'UIM fills the gap', copy: 'It supplements low at-fault limits.' },
      { label: 'Own coverage matters', copy: 'Your limits set the ceiling.' },
      { label: 'Find every policy', copy: 'Household and relative policies may respond.' },
      { label: 'Notice and arbitration', copy: 'UM/UIM claims follow their own rules.' },
    ],
    insuranceProblems: [
      'The victim settles for the driver\u2019s low limits alone.',
      'The UIM coverage is never triggered.',
      'Prompt notice to the own insurer is missed.',
      'The gap between limits and harm is undervalued.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What were the at-fault driver\u2019s limits?' },
      { label: 'Step 2', question: 'What UIM coverage do you carry?' },
      { label: 'Step 3', question: 'Have you notified your own insurer in writing?' },
      { label: 'Step 4', question: 'Do the bills exceed the driver\u2019s limits?' },
    ],
  },
  [BAKERSFIELD_UM_SLUG]: {
    scenario: `A Bakersfield driver was run off a rural highway by a car that never stopped. Dashcam footage and a witness corroborated the phantom vehicle, and the driver\u2019s own uninsured motorist coverage became the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; secure dashcam footage and witnesses.'],
      ['First days', 'Prompt written notice to your own insurer; policies identified.'],
      ['First weeks', 'Hit-and-run corroboration and every policy developed.'],
      ['Longer term', 'Treatment documented; the UM claim advanced to arbitration.'],
    ],
    severityLadder: [
      ['Hit-and-run', 'A fled driver requires phantom-vehicle corroboration.'],
      ['Highway setting', 'Open-road crashes make evidence critical.'],
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
      'Whether dashcam footage and witnesses were secured',
      'Whether prompt notice was given to your insurer',
      'Injury severity and treatment continuity',
      'The strength of the police report',
    ],
    settlementValueDetails: [
      { label: 'Corroboration is key', copy: 'A highway hit-and-run needs proof of a phantom vehicle.' },
      { label: 'Own coverage is the recovery', copy: 'UM/UIM applies when the driver cannot pay.' },
      { label: 'Footage matters', copy: 'Dashcam and witnesses establish the crash.' },
      { label: 'Notice and arbitration', copy: 'UM/UIM claims follow their own rules.' },
    ],
    insuranceProblems: [
      'The dashcam footage is lost before it is preserved.',
      'The phantom vehicle is never corroborated.',
      'Prompt notice to the own insurer is missed.',
      'The victim assumes there is no recovery.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the driver flee, and is there footage or a witness?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you and your household carry?' },
      { label: 'Step 3', question: 'Have you notified your own insurer in writing?' },
      { label: 'Step 4', question: 'Do you have the police and hit-and-run report?' },
    ],
  },
}
