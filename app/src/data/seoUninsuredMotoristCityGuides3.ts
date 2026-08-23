import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, uninsured and hit-and-run motorist practice area (batch 3):
 * location-specific guides for San Francisco, Riverside, Long Beach, and Anaheim,
 * extending the batch-1 (LA, San Bernardino, Fresno, Bakersfield) and batch-2
 * (San Diego, San Jose, Sacramento, Oakland) hub.
 *
 * A crash caused by an uninsured, underinsured, or fled driver is a distinct
 * problem: the recovery frequently comes from the victim's own uninsured and
 * underinsured motorist (UM/UIM) coverage rather than the at-fault driver, and
 * the rules and deadlines for those claims differ from an ordinary third-party
 * claim.
 *
 * Local context, genuine rather than interpolated:
 *  - San Francisco: high medical and wage costs and heavy rideshare use mean a
 *    low-limits driver often leaves a large underinsured gap, plus elevated urban
 *    hit-and-run rates where phantom-vehicle corroboration is decisive.
 *  - Riverside: a large uninsured-driver population and long commuter corridors,
 *    where the victim's own coverage is frequently the practical recovery.
 *  - Long Beach: a significant uninsured population and hit-and-run activity on
 *    dense port-area and downtown roads.
 *  - Anaheim: heavy tourist traffic with rental and out-of-state vehicles that
 *    complicate the coverage question, plus ordinary uninsured drivers.
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

export const SF_UM_SLUG = '/san-francisco-uninsured-motorist-accident'
export const RIV_UM_SLUG = '/riverside-uninsured-motorist-accident'
export const LB_UM_SLUG = '/long-beach-uninsured-motorist-accident'
export const ANAHEIM_UM_SLUG = '/anaheim-uninsured-motorist-accident'

export const uninsuredMotoristCityGuidePages3: LandingPage[] = [
  {
    slug: SF_UM_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Uninsured Motorist Claims',
    title: 'San Francisco Uninsured & Hit-and-Run Motorist Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured, underinsured, or hit-and-run driver in San Francisco? High costs and heavy rideshare use often leave a gap only your own UM/UIM coverage can fill.',
    psychology: 'I was hit by an uninsured or fled driver in San Francisco and I do not know how I will be compensated.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco uninsured motorist lawyer',
      'hit and run injury claim california',
      'underinsured motorist claim california',
      'um uim coverage california',
      'phantom vehicle hit and run california',
    ],
    signals: [
      'UM / UIM on your own policy',
      'High costs = underinsured gap',
      'Rideshare coverage questions',
      'Hit-and-run corroboration',
      'Arbitration timing rules',
      'Prompt notice required',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s high medical and wage costs mean even an insured at-fault driver often carries too little coverage, leaving a large underinsured gap, and heavy rideshare use and elevated urban hit-and-run rates add their own coverage questions. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Any lawsuit against an identified at-fault driver is filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured, underinsured, or fled',
        'The victim\u2019s own UM/UIM coverage and limits',
        'Whether a rideshare policy or period is involved',
        'For a hit-and-run, the police report, witnesses, and any footage',
        'Any household or resident-relative policy that might respond',
        'The date of the crash and any policy notice deadlines',
        'The full medical and wage losses (the underinsured gap)',
        'Prompt written notice to the victim\u2019s own insurer',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every UM/UIM policy that might respond to a San Francisco crash, gathers the corroboration a hit-and-run claim needs, and flags the policy notice and arbitration timing that differ from the ordinary deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me had insurance, but not enough. What can I do?',
        a: 'Your own underinsured motorist (UIM) coverage may fill the gap between the at-fault driver\u2019s limits and your actual harm. In a high-cost area, that gap is often large even when the driver is insured, so identifying and opening your UM/UIM coverage promptly is important.',
      },
      {
        q: 'It was a hit-and-run. Can I still recover?',
        a: 'Possibly, through your own uninsured motorist coverage, but a hit-and-run claim can require corroboration that a phantom vehicle caused the crash and, in many situations, physical contact. The police report, independent witnesses, and any camera footage are important to establish that another vehicle was responsible.',
      },
      {
        q: 'How is a UM/UIM claim different from suing the driver?',
        a: 'A UM/UIM dispute is generally resolved by arbitration under your policy rather than by a jury, and it carries its own timing and notice rules separate from the two-year deadline for suing an at-fault driver. Prompt written notice to your own insurer is typically required, so delay can jeopardise the claim.',
      },
      {
        q: 'Could more than one policy apply?',
        a: 'Sometimes. Coverage can be found across your own policy, a household member\u2019s, or a resident relative\u2019s. Identifying every policy that might respond is frequently what makes a real recovery possible.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the coverage and corroboration so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIV_UM_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Uninsured Motorist Claims',
    title: 'Riverside Uninsured & Hit-and-Run Motorist Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured, underinsured, or hit-and-run driver in Riverside? With many uninsured drivers on long commuter corridors, your own UM/UIM coverage is often the recovery.',
    psychology: 'I was hit by an uninsured or fled driver in Riverside and I do not know how I will be compensated.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside uninsured motorist lawyer',
      'hit and run injury claim california',
      'underinsured motorist claim california',
      'um uim coverage california',
      'uninsured driver crash california',
    ],
    signals: [
      'UM / UIM on your own policy',
      'High uninsured-driver population',
      'Commuter-corridor crashes',
      'Hit-and-run corroboration',
      'Arbitration timing rules',
      'Prompt notice required',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s long commuter corridors and its large uninsured-driver population mean many serious crashes involve a driver who cannot pay \u2014 which makes the victim\u2019s own coverage the practical route to recovery. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Any lawsuit against an identified at-fault driver is filed in Riverside County Superior Court.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured, underinsured, or fled',
        'The victim\u2019s own UM/UIM coverage and limits',
        'For a hit-and-run, the police report, witnesses, and any footage',
        'Any household or resident-relative policy that might respond',
        'The date of the crash and any policy notice deadlines',
        'The full medical and wage losses',
        'Prompt written notice to the victim\u2019s own insurer',
        'Whether more than one policy can be stacked',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every UM/UIM policy that might respond to a Riverside crash, gathers the corroboration a hit-and-run claim needs, and flags the policy notice and arbitration timing that differ from the ordinary deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The driver who hit me had no insurance. What can I do?',
        a: 'Your own uninsured motorist (UM) coverage may be the practical source of recovery. It applies when the at-fault driver has no insurance at all, and in an area with many uninsured drivers it is frequently what turns a crash into an actual recovery.',
      },
      {
        q: 'It was a hit-and-run. Can I still recover?',
        a: 'Possibly, through your own uninsured motorist coverage, but a hit-and-run claim can require corroboration that a phantom vehicle caused the crash and, in many situations, physical contact. The police report, independent witnesses, and any camera footage are important.',
      },
      {
        q: 'How is a UM/UIM claim different from suing the driver?',
        a: 'A UM/UIM dispute is generally resolved by arbitration under your policy rather than by a jury, and it carries its own timing and notice rules separate from the two-year deadline for suing an at-fault driver. Prompt written notice to your own insurer is typically required.',
      },
      {
        q: 'Could more than one policy apply?',
        a: 'Sometimes. Coverage can be found across your own policy, a household member\u2019s, or a resident relative\u2019s. Identifying every policy that might respond is frequently what makes a real recovery possible.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the coverage and corroboration so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_UM_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Uninsured Motorist Claims',
    title: 'Long Beach Uninsured & Hit-and-Run Motorist Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured, underinsured, or hit-and-run driver in Long Beach? On dense port-area and downtown roads, your own UM/UIM coverage is often the recovery.',
    psychology: 'I was hit by an uninsured or fled driver in Long Beach and I do not know how I will be compensated.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach uninsured motorist lawyer',
      'hit and run injury claim california',
      'underinsured motorist claim california',
      'um uim coverage california',
      'phantom vehicle hit and run california',
    ],
    signals: [
      'UM / UIM on your own policy',
      'Port-area / downtown hit-and-run',
      'High uninsured population',
      'Hit-and-run corroboration',
      'Arbitration timing rules',
      'Prompt notice required',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s dense port-area and downtown roads see significant hit-and-run activity and a substantial uninsured-driver population \u2014 which makes the victim\u2019s own coverage the practical route to recovery when the responsible driver cannot pay or fled. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Any lawsuit against an identified at-fault driver is filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured, underinsured, or fled',
        'The victim\u2019s own UM/UIM coverage and limits',
        'For a hit-and-run, the police report, witnesses, and any footage',
        'Any household or resident-relative policy that might respond',
        'The date of the crash and any policy notice deadlines',
        'The full medical and wage losses',
        'Prompt written notice to the victim\u2019s own insurer',
        'Whether more than one policy can be stacked',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every UM/UIM policy that might respond to a Long Beach crash, gathers the corroboration a hit-and-run claim needs, and flags the policy notice and arbitration timing that differ from the ordinary deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'It was a hit-and-run near the port. Can I still recover?',
        a: 'Possibly, through your own uninsured motorist coverage, but a hit-and-run claim can require corroboration that a phantom vehicle caused the crash and, in many situations, physical contact. The police report, independent witnesses, and any camera footage \u2014 common along port-area roads \u2014 are important.',
      },
      {
        q: 'The driver who hit me had no or minimal insurance. What can I do?',
        a: 'Your own UM/UIM coverage may be the practical source of recovery \u2014 UM where the driver had none or fled, UIM where the limits were too low. Identifying and opening that coverage promptly is important.',
      },
      {
        q: 'How is a UM/UIM claim different from suing the driver?',
        a: 'A UM/UIM dispute is generally resolved by arbitration under your policy rather than by a jury, and it carries its own timing and notice rules separate from the two-year deadline for suing an at-fault driver. Prompt written notice to your own insurer is typically required.',
      },
      {
        q: 'Could more than one policy apply?',
        a: 'Sometimes. Coverage can be found across your own policy, a household member\u2019s, or a resident relative\u2019s. Identifying every policy that might respond is frequently what makes a real recovery possible.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the coverage and corroboration so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_UM_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Uninsured Motorist Claims',
    title: 'Anaheim Uninsured & Hit-and-Run Motorist Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hit by an uninsured, out-of-state, rental, or hit-and-run driver in Anaheim? Tourist traffic complicates coverage \u2014 and your own UM/UIM coverage is often the recovery.',
    psychology: 'I was hit by an uninsured or out-of-town driver in Anaheim and I do not know how I will be compensated.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim uninsured motorist lawyer',
      'hit and run injury claim california',
      'underinsured motorist claim california',
      'rental car crash coverage california',
      'um uim coverage california',
    ],
    signals: [
      'UM / UIM on your own policy',
      'Rental / out-of-state vehicles',
      'Tourist-traffic coverage puzzles',
      'Hit-and-run corroboration',
      'Arbitration timing rules',
      'Prompt notice required',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s heavy tourist traffic brings many rental and out-of-state vehicles onto its roads, which can complicate the coverage question after a crash, alongside ordinary uninsured drivers \u2014 which makes identifying every policy, including the victim\u2019s own, central. ${UM} ${HIT_RUN} ${MULTIPLE} ${PROCESS} Any lawsuit against an identified at-fault driver is filed in Orange County Superior Court.`,
      whatToTrack: [
        'Whether the at-fault driver was uninsured, underinsured, or fled',
        'Whether the vehicle was a rental or carried an out-of-state policy',
        'The victim\u2019s own UM/UIM coverage and limits',
        'For a hit-and-run, the police report, witnesses, and any footage',
        'Any household or resident-relative policy that might respond',
        'The date of the crash and any policy notice deadlines',
        'The full medical and wage losses',
        'Prompt written notice to the victim\u2019s own insurer',
      ],
      howClearCaseHelps: `ClearCaseIQ untangles the coverage behind an Anaheim crash involving a rental or out-of-state vehicle, identifies every UM/UIM policy that might respond, and flags the policy notice and arbitration timing that differ from the ordinary deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A rental or out-of-state car hit me. Whose insurance applies?',
        a: 'It can be layered \u2014 the renter\u2019s own policy, the rental company\u2019s coverage, an out-of-state policy, and your own UM/UIM coverage may all be in play. Untangling which policies respond, and in what order, is often the key task, so identifying every policy early matters.',
      },
      {
        q: 'The driver who hit me had no or minimal insurance. What can I do?',
        a: 'Your own UM/UIM coverage may be the practical source of recovery \u2014 UM where the driver had none or fled, UIM where the limits were too low. Identifying and opening that coverage promptly is important.',
      },
      {
        q: 'It was a hit-and-run. Can I still recover?',
        a: 'Possibly, through your own uninsured motorist coverage, but a hit-and-run claim can require corroboration that a phantom vehicle caused the crash and, in many situations, physical contact. The police report, independent witnesses, and any camera footage are important.',
      },
      {
        q: 'How is a UM/UIM claim different from suing the driver?',
        a: 'A UM/UIM dispute is generally resolved by arbitration under your policy rather than by a jury, and it carries its own timing and notice rules separate from the two-year deadline for suing an at-fault driver. Prompt written notice to your own insurer is typically required.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the coverage and corroboration so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const uninsuredMotoristCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [SF_UM_SLUG]: {
    scenario: `A San Francisco rideshare passenger was hurt by a low-limits driver, leaving a large gap against high medical costs. Opening the passenger\u2019s own UIM coverage and the rideshare policy period filled the shortfall. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the at-fault driver\u2019s coverage and your own.'],
      ['First weeks', 'Give prompt written notice; open UM/UIM.'],
      ['Assessment', 'Every responding policy and the gap identified.'],
      ['Longer term', 'Arbitration timing and the claim developed.'],
    ],
    severityLadder: [
      ['Coverage status', 'Uninsured, underinsured, or fled.'],
      ['The gap', 'High costs exceed low limits.'],
      ['Every policy', 'Own, household, rideshare.'],
      ['Process', 'Arbitration with its own timing.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'High wages enlarge the gap.' },
      { label: 'Total loss', copy: 'The underinsured gap is quantified.' },
    ],
    settlementDrivers: [
      'Whether the driver was uninsured or underinsured',
      'The size of the underinsured gap',
      'How many policies respond',
      'Whether prompt notice was given',
      'Whether a rideshare policy applies',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Gap is large', copy: 'High costs exceed minimum limits.' },
      { label: 'Find every policy', copy: 'Own, household, rideshare.' },
      { label: 'Notice matters', copy: 'Delay can jeopardise the claim.' },
      { label: 'Arbitration', copy: 'UM/UIM resolves outside a jury.' },
    ],
    insuranceProblems: [
      'Own UM/UIM coverage is never opened.',
      'Prompt written notice is missed.',
      'A rideshare policy period is overlooked.',
      'The full underinsured gap is never documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver uninsured, underinsured, or fled?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you carry?' },
      { label: 'Step 3', question: 'Was a rideshare trip involved?' },
      { label: 'Step 4', question: 'Have you notified your own insurer?' },
    ],
  },
  [RIV_UM_SLUG]: {
    scenario: `A Riverside commuter was hit by an uninsured driver on the 91. With no coverage from the at-fault driver, the commuter\u2019s own UM coverage \u2014 opened with prompt notice \u2014 became the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Confirm the driver was uninsured; identify your coverage.'],
      ['First weeks', 'Give prompt written notice; open UM.'],
      ['Assessment', 'Every responding policy identified.'],
      ['Longer term', 'Arbitration timing and the claim developed.'],
    ],
    severityLadder: [
      ['Coverage status', 'Uninsured, underinsured, or fled.'],
      ['Own coverage', 'UM is the practical recovery.'],
      ['Every policy', 'Own and household.'],
      ['Process', 'Arbitration with its own timing.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether the driver was uninsured',
      'The victim\u2019s own UM coverage and limits',
      'How many policies respond',
      'Whether prompt notice was given',
      'The full documented loss',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Own coverage', copy: 'UM is often the only recovery.' },
      { label: 'Find every policy', copy: 'Own and household stacking.' },
      { label: 'Notice matters', copy: 'Delay can jeopardise the claim.' },
      { label: 'Arbitration', copy: 'UM/UIM resolves outside a jury.' },
    ],
    insuranceProblems: [
      'Own UM coverage is never opened.',
      'Prompt written notice is missed.',
      'Stackable household policies are overlooked.',
      'The full loss is never documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the driver uninsured or fled?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you carry?' },
      { label: 'Step 3', question: 'Is there a household policy that could apply?' },
      { label: 'Step 4', question: 'Have you notified your own insurer?' },
    ],
  },
  [LB_UM_SLUG]: {
    scenario: `A Long Beach driver was struck by a fleeing vehicle near the port. Camera footage and a witness corroborated the phantom vehicle, and the driver\u2019s own uninsured-motorist coverage responded. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Get the police report; preserve any footage and witnesses.'],
      ['First weeks', 'Give prompt written notice; open UM.'],
      ['Assessment', 'Corroboration and coverage confirmed.'],
      ['Longer term', 'Arbitration timing and the claim developed.'],
    ],
    severityLadder: [
      ['Hit-and-run', 'Corroboration is required.'],
      ['Own coverage', 'UM is the practical recovery.'],
      ['Every policy', 'Own and household.'],
      ['Process', 'Arbitration with its own timing.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Whether the phantom vehicle is corroborated',
      'The victim\u2019s own UM coverage and limits',
      'How many policies respond',
      'Whether prompt notice was given',
      'The full documented loss',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Corroboration', copy: 'Footage and witnesses establish it.' },
      { label: 'Own coverage', copy: 'UM is often the only recovery.' },
      { label: 'Notice matters', copy: 'Delay can jeopardise the claim.' },
      { label: 'Arbitration', copy: 'UM/UIM resolves outside a jury.' },
    ],
    insuranceProblems: [
      'The phantom vehicle is never corroborated.',
      'Own UM coverage is never opened.',
      'Prompt written notice is missed.',
      'Camera footage is lost before it is preserved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was there a police report and any witnesses?' },
      { label: 'Step 2', question: 'Is there camera footage to preserve?' },
      { label: 'Step 3', question: 'What UM/UIM coverage do you carry?' },
      { label: 'Step 4', question: 'Have you notified your own insurer?' },
    ],
  },
  [ANAHEIM_UM_SLUG]: {
    scenario: `An Anaheim resident was hit by a tourist driving a rental car with thin coverage. Layering the renter\u2019s policy, the rental company\u2019s coverage, and the resident\u2019s own UIM filled the gap. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the rental, the driver\u2019s policy, and your own.'],
      ['First weeks', 'Give prompt written notice; open UM/UIM.'],
      ['Assessment', 'Every responding policy and its order identified.'],
      ['Longer term', 'Arbitration timing and the claim developed.'],
    ],
    severityLadder: [
      ['Layered coverage', 'Rental, out-of-state, and own policies.'],
      ['The gap', 'Thin coverage leaves a shortfall.'],
      ['Every policy', 'Own, household, rental.'],
      ['Process', 'Arbitration with its own timing.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injury is documented.' },
      { label: 'Treatment', copy: 'Ongoing care establishes the loss.' },
      { label: 'Wage loss', copy: 'Lost income is documented.' },
      { label: 'Total loss', copy: 'The full loss is quantified.' },
    ],
    settlementDrivers: [
      'Which rental and driver policies respond',
      'The victim\u2019s own UM/UIM coverage and limits',
      'How the policies stack and in what order',
      'Whether prompt notice was given',
      'The full documented loss',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'Untangle coverage', copy: 'Rental and out-of-state layers apply.' },
      { label: 'Own coverage', copy: 'UIM fills the remaining gap.' },
      { label: 'Notice matters', copy: 'Delay can jeopardise the claim.' },
      { label: 'Arbitration', copy: 'UM/UIM resolves outside a jury.' },
    ],
    insuranceProblems: [
      'Layered rental and out-of-state coverage is never untangled.',
      'Own UM/UIM coverage is never opened.',
      'Prompt written notice is missed.',
      'The full loss is never documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a rental or out-of-state vehicle involved?' },
      { label: 'Step 2', question: 'What UM/UIM coverage do you carry?' },
      { label: 'Step 3', question: 'Whose policies might respond, and in what order?' },
      { label: 'Step 4', question: 'Have you notified your own insurer?' },
    ],
  },
}
