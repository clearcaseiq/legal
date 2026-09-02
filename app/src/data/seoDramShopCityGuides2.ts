import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, dram-shop / alcohol over-service practice area (batch 2):
 * location-specific guides for San Jose, Fresno, Long Beach, and Oakland,
 * extending the batch-1 hub (Los Angeles, San Diego, Sacramento, San Francisco).
 *
 * Applied accurately (identical to batch 1):
 *  - California generally immunizes alcohol providers (B&P 25602; Civil 1714).
 *  - Narrow exception: service to an obviously intoxicated minor (B&P 25602.1;
 *    Civil 1714(d)); social-host exception for furnishing to under-21 at a home.
 *  - The primary claim is usually against the intoxicated driver/patron; UM/UIM
 *    coverage often matters.
 *  - Over-service evidence (POS records, video, server statements) is time-sensitive;
 *    PI deadline generally two years (CCP 335.1).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a narrow exception to California\u2019s alcohol-provider immunity applies \u2014 and who can be held responsible \u2014 depends on facts a licensed California attorney should review promptly.'

const IMMUNITY =
  'California generally immunizes those who furnish alcohol from liability for injuries an intoxicated person later causes; the law treats the drinking, not the serving, as the proximate cause (Business and Professions Code section 25602; Civil Code section 1714). This default defeats most claims against a bar for merely over-serving an adult, which is why the specific exceptions matter so much.'

const MINOR_EXCEPTION =
  'The central exception is service to a minor. A licensed vendor \u2014 a bar, club, or restaurant \u2014 that sells or serves alcohol to an obviously intoxicated person under 21 can be held liable for injuries that result (Business and Professions Code section 25602.1; Civil Code section 1714(d)). Establishing the patron\u2019s age and obvious intoxication at the time of service is the heart of the claim.'

const SOCIAL_HOST =
  'Social hosts are generally immune as well, but there is an exception: an adult who knowingly furnishes alcohol at a residence to a person under 21 can face liability for resulting harm (Civil Code section 1714(c)\u2013(d)). Home parties where minors are served are the usual setting for this claim.'

const PRIMARY =
  'Because the vendor and host claims are narrow, the primary claim is usually against the intoxicated driver or patron directly. The injured person\u2019s own uninsured or underinsured-motorist coverage is often important, especially when the at-fault person carries little or no insurance.'

const EVIDENCE =
  'Over-service evidence is time-sensitive and should be preserved quickly: receipts and point-of-sale records, surveillance video from the venue, server and witness statements about how much and to whom alcohol was served, and any age or blood-alcohol evidence. Much of it is overwritten or discarded within days. A personal-injury deadline is generally two years (Code of Civil Procedure section 335.1).'

export const SJ_DRAM_SLUG = '/san-jose-bar-overservice-injury-claim'
export const FRESNO_DRAM_SLUG = '/fresno-bar-overservice-injury-claim'
export const LB_DRAM_SLUG = '/long-beach-bar-overservice-injury-claim'
export const OAK_DRAM_SLUG = '/oakland-bar-overservice-injury-claim'

export const dramShopCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_DRAM_SLUG,
    category: 'Cities',
    cluster: 'San Jose Bar & Nightclub Over-Service Claims',
    title: 'San Jose Bar & Nightclub Over-Service Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a drunk driver or patron over-served at a San Jose bar? California immunizes most alcohol service, but serving an obviously intoxicated minor is a key exception.',
    psychology: 'A drunk driver hurt me after leaving a San Jose bar and I want to know whether the bar can be held responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose bar overservice injury lawyer',
      'dram shop california minor exception',
      'bar liability drunk driver california',
      'social host liability minor california',
      'uninsured motorist drunk driver claim california',
    ],
    signals: [
      'Provider immunity is the default',
      'Minor-service exception (25602.1)',
      'Social-host exception (under 21)',
      'Primary claim vs. the driver',
      'UM/UIM coverage often matters',
      'POS records & video perishable',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s downtown and SoFA nightlife district produces late-night drunk-driving crashes, and families understandably ask whether the bar is responsible. Usually the answer turns on a narrow exception. ${IMMUNITY} ${MINOR_EXCEPTION} ${SOCIAL_HOST} ${PRIMARY} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the person served was under 21',
        'Whether they were obviously intoxicated when served',
        'Receipts and point-of-sale records from the venue',
        'Surveillance video from the bar and surrounding area',
        'Server and witness statements',
        'The at-fault driver\u2019s insurance limits',
        'Your own UM/UIM coverage',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ evaluates whether a minor-service or social-host exception applies, moves quickly to preserve POS records and venue video before they are overwritten, and assesses the driver\u2019s coverage and your own UM/UIM. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue the bar that over-served the driver?',
        a: 'Usually not for merely over-serving an adult \u2014 California immunizes alcohol providers and treats the drinking, not the serving, as the cause (B&P 25602; Civil 1714). The main exception is service to an obviously intoxicated person under 21.',
      },
      {
        q: 'What is the minor exception?',
        a: 'A licensed vendor that sells or serves alcohol to an obviously intoxicated person under 21 can be liable for resulting injuries (B&P 25602.1; Civil 1714(d)). Establishing the patron\u2019s age and obvious intoxication at the time of service is the heart of the claim.',
      },
      {
        q: 'What about a house party?',
        a: 'Social hosts are generally immune, but an adult who knowingly furnishes alcohol at a home to someone under 21 can face liability for resulting harm (Civil 1714(c)\u2013(d)).',
      },
      {
        q: 'The driver has little insurance. What can I do?',
        a: 'The primary claim is usually against the driver directly, and your own uninsured or underinsured-motorist coverage is often important when the at-fault person carries little or no insurance.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the over-service evidence and coverage facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_DRAM_SLUG,
    category: 'Cities',
    cluster: 'Fresno Bar & Nightclub Over-Service Claims',
    title: 'Fresno Bar & Nightclub Over-Service Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a drunk driver or patron over-served at a Fresno bar? California immunizes most alcohol service, but serving an obviously intoxicated minor is a key exception.',
    psychology: 'A drunk driver hurt me after leaving a Fresno bar and I want to know whether the bar can be held responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno bar overservice injury lawyer',
      'dram shop california minor exception',
      'bar liability drunk driver california',
      'social host liability minor california',
      'uninsured motorist drunk driver claim california',
    ],
    signals: [
      'Provider immunity is the default',
      'Minor-service exception (25602.1)',
      'Social-host exception (under 21)',
      'Primary claim vs. the driver',
      'UM/UIM coverage often matters',
      'POS records & video perishable',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s Tower District nightlife and highway crashes produce serious drunk-driving injuries, and the region\u2019s high uninsured-driver rate makes both the exception analysis and UM/UIM coverage matter. ${IMMUNITY} ${MINOR_EXCEPTION} ${SOCIAL_HOST} ${PRIMARY} ${EVIDENCE} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the person served was under 21',
        'Whether they were obviously intoxicated when served',
        'Receipts and point-of-sale records from the venue',
        'Surveillance video from the bar and surrounding area',
        'Server and witness statements',
        'The at-fault driver\u2019s insurance limits',
        'Your own UM/UIM coverage',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ evaluates whether a minor-service or social-host exception applies, moves quickly to preserve POS records and venue video before they are overwritten, and assesses the driver\u2019s coverage and your own UM/UIM. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue the bar that over-served the driver?',
        a: 'Usually not for merely over-serving an adult \u2014 California immunizes alcohol providers (B&P 25602; Civil 1714). The main exception is service to an obviously intoxicated person under 21.',
      },
      {
        q: 'What is the minor exception?',
        a: 'A licensed vendor that serves alcohol to an obviously intoxicated person under 21 can be liable for resulting injuries (B&P 25602.1; Civil 1714(d)). Establishing age and obvious intoxication at service is the heart of the claim.',
      },
      {
        q: 'The driver was uninsured. What can I do?',
        a: 'Fresno has a high uninsured-driver rate, so your own uninsured or underinsured-motorist coverage is often the most important source of recovery. The primary claim is against the driver directly.',
      },
      {
        q: 'What about a house party?',
        a: 'An adult who knowingly furnishes alcohol at a home to someone under 21 can face liability for resulting harm (Civil 1714(c)\u2013(d)); social hosts are otherwise generally immune.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the over-service evidence and coverage facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_DRAM_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Bar & Nightclub Over-Service Claims',
    title: 'Long Beach Bar & Nightclub Over-Service Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a drunk driver or patron over-served at a Long Beach bar? California immunizes most alcohol service, but serving an obviously intoxicated minor is a key exception.',
    psychology: 'A drunk driver hurt me after leaving a Long Beach bar and I want to know whether the bar can be held responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach bar overservice injury lawyer',
      'dram shop california minor exception',
      'bar liability drunk driver california',
      'social host liability minor california',
      'uninsured motorist drunk driver claim california',
    ],
    signals: [
      'Provider immunity is the default',
      'Minor-service exception (25602.1)',
      'Social-host exception (under 21)',
      'Primary claim vs. the driver',
      'UM/UIM coverage often matters',
      'POS records & video perishable',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s Pine Avenue and waterfront nightlife draws heavy weekend crowds, and drunk-driving crashes along Ocean Boulevard and the 710 corridor are common. The bar\u2019s responsibility usually turns on a narrow exception. ${IMMUNITY} ${MINOR_EXCEPTION} ${SOCIAL_HOST} ${PRIMARY} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the person served was under 21',
        'Whether they were obviously intoxicated when served',
        'Receipts and point-of-sale records from the venue',
        'Surveillance video from the bar and surrounding area',
        'Server and witness statements',
        'The at-fault driver\u2019s insurance limits',
        'Your own UM/UIM coverage',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ evaluates whether a minor-service or social-host exception applies, moves quickly to preserve POS records and venue video before they are overwritten, and assesses the driver\u2019s coverage and your own UM/UIM. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue the bar that over-served the driver?',
        a: 'Usually not for merely over-serving an adult \u2014 California immunizes alcohol providers (B&P 25602; Civil 1714). The main exception is service to an obviously intoxicated person under 21.',
      },
      {
        q: 'What is the minor exception?',
        a: 'A licensed vendor that serves alcohol to an obviously intoxicated person under 21 can be liable for resulting injuries (B&P 25602.1; Civil 1714(d)). Establishing age and obvious intoxication at service is the heart of the claim.',
      },
      {
        q: 'What about a house party?',
        a: 'An adult who knowingly furnishes alcohol at a home to someone under 21 can face liability for resulting harm (Civil 1714(c)\u2013(d)); social hosts are otherwise generally immune.',
      },
      {
        q: 'The driver has little insurance. What can I do?',
        a: 'The primary claim is usually against the driver directly, and your own uninsured or underinsured-motorist coverage is often important when the at-fault person carries little or no insurance.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the over-service evidence and coverage facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_DRAM_SLUG,
    category: 'Cities',
    cluster: 'Oakland Bar & Nightclub Over-Service Claims',
    title: 'Oakland Bar & Nightclub Over-Service Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a drunk driver or patron over-served at an Oakland bar? California immunizes most alcohol service, but serving an obviously intoxicated minor is a key exception.',
    psychology: 'A drunk driver hurt me after leaving an Oakland bar and I want to know whether the bar can be held responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland bar overservice injury lawyer',
      'dram shop california minor exception',
      'bar liability drunk driver california',
      'social host liability minor california',
      'uninsured motorist drunk driver claim california',
    ],
    signals: [
      'Provider immunity is the default',
      'Minor-service exception (25602.1)',
      'Social-host exception (under 21)',
      'Primary claim vs. the driver',
      'UM/UIM coverage often matters',
      'POS records & video perishable',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s Uptown and Jack London nightlife and the region\u2019s freeway crashes produce serious drunk-driving injuries, and a high uninsured-driver rate makes UM/UIM coverage important. The bar\u2019s responsibility usually turns on a narrow exception. ${IMMUNITY} ${MINOR_EXCEPTION} ${SOCIAL_HOST} ${PRIMARY} ${EVIDENCE} Civil cases are filed in Alameda County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether the person served was under 21',
        'Whether they were obviously intoxicated when served',
        'Receipts and point-of-sale records from the venue',
        'Surveillance video from the bar and surrounding area',
        'Server and witness statements',
        'The at-fault driver\u2019s insurance limits',
        'Your own UM/UIM coverage',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ evaluates whether a minor-service or social-host exception applies, moves quickly to preserve POS records and venue video before they are overwritten, and assesses the driver\u2019s coverage and your own UM/UIM. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue the bar that over-served the driver?',
        a: 'Usually not for merely over-serving an adult \u2014 California immunizes alcohol providers (B&P 25602; Civil 1714). The main exception is service to an obviously intoxicated person under 21.',
      },
      {
        q: 'What is the minor exception?',
        a: 'A licensed vendor that serves alcohol to an obviously intoxicated person under 21 can be liable for resulting injuries (B&P 25602.1; Civil 1714(d)). Establishing age and obvious intoxication at service is the heart of the claim.',
      },
      {
        q: 'The driver was uninsured. What can I do?',
        a: 'Your own uninsured or underinsured-motorist coverage is often the most important source of recovery when the at-fault driver carries little or no insurance. The primary claim is against the driver directly.',
      },
      {
        q: 'What about a house party?',
        a: 'An adult who knowingly furnishes alcohol at a home to someone under 21 can face liability for resulting harm (Civil 1714(c)\u2013(d)); social hosts are otherwise generally immune.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the over-service evidence and coverage facts so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const dramShopCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_DRAM_SLUG]: {
    scenario: `A San Jose club kept serving an obviously drunk 20-year-old who then caused a crash. The minor-service exception applied, and POS records and door-scan age data were preserved before deletion. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; identify the venue.'],
      ['First days', 'Send a preservation demand for POS and video.'],
      ['First weeks', 'Gather server and witness statements; confirm age.'],
      ['Longer term', 'Assess the driver\u2019s coverage and your UM/UIM.'],
    ],
    severityLadder: [
      ['Adult served', 'Immunity usually applies.'],
      ['Minor served', 'The exception can apply.'],
      ['Home party', 'Social-host exception for under-21.'],
      ['Coverage', 'UM/UIM often matters.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a minor was served',
      'Whether obvious intoxication is shown',
      'Whether POS and video were preserved',
      'The driver\u2019s coverage and your UM/UIM',
      'Injury severity and treatment continuity',
      'Whether age evidence exists',
    ],
    settlementValueDetails: [
      { label: 'Immunity', copy: 'The default defeats most bar claims.' },
      { label: 'Minor exception', copy: 'It is the main path against a venue.' },
      { label: 'Evidence', copy: 'POS records and video are perishable.' },
      { label: 'Coverage', copy: 'UM/UIM backs up a low-limit driver.' },
    ],
    insuranceProblems: [
      'The POS records are overwritten before a demand.',
      'The venue video is deleted within days.',
      'The patron\u2019s age is never established.',
      'The UM/UIM claim is never opened.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the person served under 21?' },
      { label: 'Step 2', question: 'Which venue served them?' },
      { label: 'Step 3', question: 'Does the driver have insurance?' },
      { label: 'Step 4', question: 'Do you have UM/UIM coverage?' },
    ],
  },
  [FRESNO_DRAM_SLUG]: {
    scenario: `A Fresno driver with no insurance caused a crash after a night out. The bar-service claim failed on immunity, but the injured person\u2019s UM/UIM coverage provided the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; note the driver\u2019s coverage.'],
      ['First days', 'Open a UM/UIM claim with your own insurer.'],
      ['First weeks', 'Check for any minor-service or host exception.'],
      ['Longer term', 'Preserve any venue evidence if an exception fits.'],
    ],
    severityLadder: [
      ['Adult served', 'Immunity usually applies.'],
      ['Uninsured driver', 'UM/UIM becomes central.'],
      ['Minor served', 'The exception can apply.'],
      ['Home party', 'Social-host exception for under-21.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the driver is uninsured',
      'Whether you have UM/UIM coverage',
      'Whether a minor-service exception applies',
      'Whether venue evidence was preserved',
      'Injury severity and treatment continuity',
      'Whether obvious intoxication is shown',
    ],
    settlementValueDetails: [
      { label: 'Coverage', copy: 'UM/UIM is often the main recovery.' },
      { label: 'Immunity', copy: 'The default defeats most bar claims.' },
      { label: 'Minor exception', copy: 'It is the main path against a venue.' },
      { label: 'Evidence', copy: 'Venue records are perishable.' },
    ],
    insuranceProblems: [
      'The UM/UIM claim is never opened.',
      'The POS records are overwritten before a demand.',
      'The patron\u2019s age is never established.',
      'The venue video is deleted within days.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Does the at-fault driver have insurance?' },
      { label: 'Step 2', question: 'Do you have UM/UIM coverage?' },
      { label: 'Step 3', question: 'Was the person served under 21?' },
      { label: 'Step 4', question: 'Which venue served them?' },
    ],
  },
  [LB_DRAM_SLUG]: {
    scenario: `A Long Beach patron served past obvious intoxication was under 21 and caused a crash on Ocean Boulevard. The minor-service exception applied, and waterfront and venue video corroborated the service. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; identify the venue.'],
      ['First days', 'Send a preservation demand for POS and video.'],
      ['First weeks', 'Gather server and witness statements; confirm age.'],
      ['Longer term', 'Assess the driver\u2019s coverage and your UM/UIM.'],
    ],
    severityLadder: [
      ['Adult served', 'Immunity usually applies.'],
      ['Minor served', 'The exception can apply.'],
      ['Home party', 'Social-host exception for under-21.'],
      ['Coverage', 'UM/UIM often matters.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a minor was served',
      'Whether obvious intoxication is shown',
      'Whether POS and video were preserved',
      'The driver\u2019s coverage and your UM/UIM',
      'Injury severity and treatment continuity',
      'Whether age evidence exists',
    ],
    settlementValueDetails: [
      { label: 'Immunity', copy: 'The default defeats most bar claims.' },
      { label: 'Minor exception', copy: 'It is the main path against a venue.' },
      { label: 'Evidence', copy: 'POS records and video are perishable.' },
      { label: 'Coverage', copy: 'UM/UIM backs up a low-limit driver.' },
    ],
    insuranceProblems: [
      'The POS records are overwritten before a demand.',
      'The venue video is deleted within days.',
      'The patron\u2019s age is never established.',
      'The UM/UIM claim is never opened.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the person served under 21?' },
      { label: 'Step 2', question: 'Which venue served them?' },
      { label: 'Step 3', question: 'Does the driver have insurance?' },
      { label: 'Step 4', question: 'Do you have UM/UIM coverage?' },
    ],
  },
  [OAK_DRAM_SLUG]: {
    scenario: `An Oakland social host knowingly served alcohol to under-21 guests, one of whom caused a crash. The social-host exception applied, and the primary claim ran against the driver with UM/UIM backstop. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get the police report; identify the host and driver.'],
      ['First days', 'Document who furnished alcohol and to whom.'],
      ['First weeks', 'Gather witness statements confirming ages.'],
      ['Longer term', 'Assess the driver\u2019s coverage and your UM/UIM.'],
    ],
    severityLadder: [
      ['Adult served', 'Immunity usually applies.'],
      ['Home party', 'Social-host exception for under-21.'],
      ['Minor at venue', 'Vendor exception can apply.'],
      ['Coverage', 'UM/UIM often matters.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the crash.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a host furnished alcohol to under-21',
      'Whether ages are established',
      'The driver\u2019s coverage and your UM/UIM',
      'Whether witness statements corroborate service',
      'Injury severity and treatment continuity',
      'Whether a vendor exception also applies',
    ],
    settlementValueDetails: [
      { label: 'Social-host', copy: 'Furnishing to under-21 is the exception.' },
      { label: 'Immunity', copy: 'The default defeats most claims.' },
      { label: 'Primary claim', copy: 'It runs against the driver.' },
      { label: 'Coverage', copy: 'UM/UIM backs up a low-limit driver.' },
    ],
    insuranceProblems: [
      'The host\u2019s furnishing is never documented.',
      'The guests\u2019 ages are never established.',
      'The UM/UIM claim is never opened.',
      'Witnesses are never interviewed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did an adult furnish alcohol at a home?' },
      { label: 'Step 2', question: 'Were the guests under 21?' },
      { label: 'Step 3', question: 'Does the driver have insurance?' },
      { label: 'Step 4', question: 'Do you have UM/UIM coverage?' },
    ],
  },
}
