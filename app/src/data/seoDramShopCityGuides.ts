import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, dram-shop / over-service (bar & nightclub liability) practice area:
 * location-specific guides for California nightlife metros \u2014 Los Angeles, San
 * Diego, Sacramento, and San Francisco.
 *
 * This is distinct from a plain DUI-victim claim: it centers on the narrow
 * circumstances in which a bar, club, restaurant, or social host can be liable
 * for serving alcohol, against the backdrop of California\u2019s broad statutory
 * immunity for alcohol providers.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: dense nightlife and club districts across the county.
 *  - San Diego: the Gaslamp Quarter plus a large under-21 military and college
 *    population near the bases and universities.
 *  - Sacramento: downtown and midtown bar corridors.
 *  - San Francisco: compact, high-density bar and nightlife districts.
 *
 * Applied accurately:
 *  - California generally immunizes those who furnish alcohol from liability for
 *    injuries caused by an intoxicated person; the drinking, not the serving, is
 *    treated as the proximate cause (Business and Professions Code section 25602;
 *    Civil Code section 1714). This is the default, and it defeats most claims
 *    against a bar for simply over-serving an adult.
 *  - The key statutory exception: a licensed vendor who sells or serves alcohol
 *    to an obviously intoxicated minor can be liable for resulting injuries
 *    (Business and Professions Code section 25602.1; Civil Code section 1714(d)).
 *  - Social hosts are generally immune, but an adult who knowingly serves alcohol
 *    at a home to a minor can face liability (Civil Code section 1714(c)\u2013(d)).
 *  - Because the vendor claim is narrow, the primary claim is usually against the
 *    intoxicated driver or patron directly, with the injured person\u2019s own
 *    uninsured/underinsured-motorist coverage often important.
 *  - The evidence is time-sensitive: receipts and POS records, surveillance
 *    video, server and witness statements, and any blood-alcohol or age evidence
 *    should be preserved quickly. A personal-injury deadline is generally two
 *    years (Code of Civil Procedure section 335.1).
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

export const LA_DRAM_SLUG = '/los-angeles-bar-overservice-injury-claim'
export const SD_DRAM_SLUG = '/san-diego-bar-overservice-injury-claim'
export const SAC_DRAM_SLUG = '/sacramento-bar-overservice-injury-claim'
export const SF_DRAM_SLUG = '/san-francisco-bar-overservice-injury-claim'

export const dramShopCityGuidePages: LandingPage[] = [
  {
    slug: LA_DRAM_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Bar & Nightclub Over-Service Claims',
    title: 'Los Angeles Bar & Nightclub Over-Service Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by an over-served drinker in LA? California immunizes most alcohol service \u2014 but serving an obviously intoxicated minor is a key exception.',
    psychology: 'A bar in LA kept serving someone who then hurt me, and I want to know if the bar is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles bar overservice lawyer',
      'can i sue a bar for overserving california',
      'dram shop law california',
      'bar served minor accident california',
      'nightclub liability drunk patron california',
    ],
    signals: [
      'Broad alcohol-provider immunity',
      'Service-to-a-minor exception (25602.1)',
      'Social-host exception (1714(d))',
      'Primary claim vs. the drinker',
      'UM/UIM coverage often matters',
      'Preserve receipts and video fast',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s dense nightlife and club districts generate many alcohol-related injuries, but California law makes claims against the venue itself narrow. ${IMMUNITY} ${MINOR_EXCEPTION} ${SOCIAL_HOST} ${PRIMARY} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Which venue served the alcohol, and when',
        'Whether the person served was under 21',
        'Whether they were obviously intoxicated when served',
        'Receipts, POS records, and surveillance video',
        'Server and witness statements',
        'The at-fault person\u2019s identity and insurance',
        'Your own UM/UIM coverage',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps an LA victim move fast to preserve venue receipts and surveillance, identify whether a service-to-a-minor exception applies, and locate all responsible parties and coverage. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue the bar that kept serving the person who hurt me?',
        a: 'Usually not for over-serving an adult. California generally immunizes alcohol providers, treating the drinking rather than the serving as the cause (Business and Professions Code section 25602). The main exception is serving an obviously intoxicated minor (section 25602.1).',
      },
      {
        q: 'What if the bar served a minor?',
        a: 'That is the key exception. A licensed vendor that serves alcohol to an obviously intoxicated person under 21 can be liable for resulting injuries (Business and Professions Code section 25602.1; Civil Code section 1714(d)). Proving age and obvious intoxication at service is central.',
      },
      {
        q: 'Who is my primary claim against?',
        a: 'Usually the intoxicated driver or patron directly. Because the venue claim is narrow, that direct claim \u2014 plus your own uninsured/underinsured-motorist coverage \u2014 is often the main path to recovery.',
      },
      {
        q: 'What evidence disappears quickly?',
        a: 'Receipts, point-of-sale records, and surveillance video are often overwritten within days, and server memories fade. Preserving them fast is critical to any over-service claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the venue evidence, the parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_DRAM_SLUG,
    category: 'Cities',
    cluster: 'San Diego Bar & Nightclub Over-Service Claims',
    title: 'San Diego Bar & Nightclub Over-Service Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by an over-served drinker in San Diego? California immunizes most service \u2014 but Gaslamp venues that serve intoxicated minors are a key exception.',
    psychology: 'A Gaslamp bar over-served someone underage who then caused my injuries.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego bar overservice lawyer',
      'can i sue a bar for overserving california',
      'gaslamp nightclub liability california',
      'bar served minor accident california',
      'dram shop law california',
    ],
    signals: [
      'Broad alcohol-provider immunity',
      'Service-to-a-minor exception (25602.1)',
      'Social-host exception (1714(d))',
      'Primary claim vs. the drinker',
      'UM/UIM coverage often matters',
      'Preserve receipts and video fast',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s Gaslamp Quarter nightlife, combined with a large under-21 military and college population near the bases and universities, makes service-to-a-minor exceptions especially relevant here. ${IMMUNITY} ${MINOR_EXCEPTION} ${SOCIAL_HOST} ${PRIMARY} ${EVIDENCE} Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Which venue served the alcohol, and when',
        'Whether the person served was under 21',
        'Whether they were obviously intoxicated when served',
        'Whether the person was active-duty or a student',
        'Receipts, POS records, and surveillance video',
        'Server and witness statements',
        'The at-fault person\u2019s identity and insurance',
        'Your own UM/UIM coverage',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Diego victim preserve Gaslamp venue receipts and surveillance quickly, assess whether an obviously-intoxicated-minor exception applies, and identify all responsible parties and coverage. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A Gaslamp bar served an underage patron who hurt me. Can it be liable?',
        a: 'Possibly. Serving alcohol to an obviously intoxicated person under 21 is the key exception to California\u2019s alcohol-provider immunity (Business and Professions Code section 25602.1). Establishing the patron\u2019s age and obvious intoxication at service is central.',
      },
      {
        q: 'Can I sue a bar for over-serving an adult?',
        a: 'Generally not. California immunizes alcohol providers for injuries caused by adults they serve, treating the drinking as the cause (Business and Professions Code section 25602). The minor exception is the main path against a venue.',
      },
      {
        q: 'Who is my primary claim against?',
        a: 'Usually the intoxicated driver or patron directly, along with your own uninsured/underinsured-motorist coverage, because the venue claim is narrow.',
      },
      {
        q: 'What evidence should be preserved right away?',
        a: 'Receipts, point-of-sale records, and surveillance video, which venues often overwrite within days, plus server and witness statements about who was served.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the venue evidence, the parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_DRAM_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Bar & Nightclub Over-Service Claims',
    title: 'Sacramento Bar & Nightclub Over-Service Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by an over-served drinker in Sacramento? California immunizes most service \u2014 but serving an obviously intoxicated minor is a key exception.',
    psychology: 'A downtown Sacramento bar over-served someone who then hurt me or my family.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento bar overservice lawyer',
      'can i sue a bar for overserving california',
      'dram shop law california',
      'bar served minor accident california',
      'nightclub liability drunk patron california',
    ],
    signals: [
      'Broad alcohol-provider immunity',
      'Service-to-a-minor exception (25602.1)',
      'Social-host exception (1714(d))',
      'Primary claim vs. the drinker',
      'UM/UIM coverage often matters',
      'Preserve receipts and video fast',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s downtown and midtown bar corridors draw heavy weekend crowds, but a claim against a venue for over-service is narrow under California law and usually turns on a specific exception. ${IMMUNITY} ${MINOR_EXCEPTION} ${SOCIAL_HOST} ${PRIMARY} ${EVIDENCE} Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Which venue served the alcohol, and when',
        'Whether the person served was under 21',
        'Whether they were obviously intoxicated when served',
        'Receipts, POS records, and surveillance video',
        'Server and witness statements',
        'Whether a home party and social host were involved',
        'The at-fault person\u2019s identity and insurance',
        'Your own UM/UIM coverage',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a Sacramento victim preserve venue receipts and surveillance quickly, evaluate whether a minor or social-host exception applies, and identify all responsible parties and coverage. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue the bar that over-served the driver who hit me?',
        a: 'Usually not for over-serving an adult. California immunizes alcohol providers, treating the drinking rather than the serving as the cause (Business and Professions Code section 25602). The main exception is serving an obviously intoxicated minor (section 25602.1).',
      },
      {
        q: 'What if the alcohol was served at a house party?',
        a: 'Social hosts are generally immune, but an adult who knowingly furnishes alcohol at a home to a minor can face liability (Civil Code section 1714(c)\u2013(d)). The facts of who served whom matter.',
      },
      {
        q: 'Who is my primary claim against?',
        a: 'Usually the intoxicated driver or patron directly, along with your own uninsured/underinsured-motorist coverage, because the venue and host claims are narrow.',
      },
      {
        q: 'What evidence disappears quickly?',
        a: 'Receipts, point-of-sale records, and surveillance video are often overwritten within days, and server memories fade, so preserving them fast is critical.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the venue evidence, the parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_DRAM_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Bar & Nightclub Over-Service Claims',
    title: 'San Francisco Bar & Nightclub Over-Service Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by an over-served drinker in San Francisco? California immunizes most service \u2014 but serving an obviously intoxicated minor is a key exception.',
    psychology: 'A San Francisco bar over-served someone who then caused my injuries, and I want to know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco bar overservice lawyer',
      'can i sue a bar for overserving california',
      'dram shop law california',
      'bar served minor accident california',
      'nightclub liability drunk patron california',
    ],
    signals: [
      'Broad alcohol-provider immunity',
      'Service-to-a-minor exception (25602.1)',
      'Social-host exception (1714(d))',
      'Primary claim vs. the drinker',
      'UM/UIM coverage often matters',
      'Preserve receipts and video fast',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s compact, high-density bar and nightlife districts mean many venues in a small area, but California law still makes a claim against any of them for over-service narrow. ${IMMUNITY} ${MINOR_EXCEPTION} ${SOCIAL_HOST} ${PRIMARY} ${EVIDENCE} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Which venue served the alcohol, and when',
        'Whether the person served was under 21',
        'Whether they were obviously intoxicated when served',
        'Receipts, POS records, and surveillance video',
        'Server and witness statements',
        'The at-fault person\u2019s identity and insurance',
        'Your own UM/UIM coverage',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Francisco victim identify the correct venue among many nearby, preserve its receipts and surveillance quickly, and assess whether a service-to-a-minor exception applies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue a San Francisco bar for over-serving an adult?',
        a: 'Generally not. California immunizes alcohol providers for injuries caused by adults they serve, treating the drinking as the cause (Business and Professions Code section 25602). Serving an obviously intoxicated minor is the key exception (section 25602.1).',
      },
      {
        q: 'There were several bars nearby. Does it matter which one served the person?',
        a: 'Yes. Identifying the specific venue that served the person \u2014 and whether that person was an obviously intoxicated minor \u2014 is essential, which is why receipts, video, and witness statements from the correct venue matter.',
      },
      {
        q: 'Who is my primary claim against?',
        a: 'Usually the intoxicated driver or patron directly, along with your own uninsured/underinsured-motorist coverage, because the venue claim is narrow.',
      },
      {
        q: 'What evidence should be preserved right away?',
        a: 'Receipts, point-of-sale records, and surveillance video, which venues often overwrite within days, plus server and witness statements about who was served.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the venue evidence, the parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const dramShopCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_DRAM_SLUG]: {
    scenario: `An LA club kept serving a visibly drunk patron who later crashed into a family. The vendor claim was narrow because the patron was an adult, so the family\u2019s recovery centered on the driver and their own UIM coverage. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the venue; note the time of service.'],
      ['Preserve', 'Demand receipts and surveillance quickly.'],
      ['Assess', 'Check for a service-to-a-minor exception.'],
      ['Longer term', 'Driver and UM/UIM claims developed.'],
    ],
    severityLadder: [
      ['Immunity', 'Adult over-service is usually protected.'],
      ['Minor exception', 'Serving a minor can create liability.'],
      ['Driver claim', 'The direct claim is usually primary.'],
      ['UM/UIM', 'Your own coverage often matters.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'DUI-crash injuries are often severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether a minor was served',
      'Whether obvious intoxication at service is shown',
      'Whether venue evidence was preserved',
      'The at-fault person\u2019s insurance',
      'Available UM/UIM coverage',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Immunity is broad', copy: 'Adult over-service rarely qualifies.' },
      { label: 'Minor is the key', copy: 'Age and intoxication drive the claim.' },
      { label: 'Preserve fast', copy: 'Video is overwritten in days.' },
      { label: 'Find all coverage', copy: 'UM/UIM can fill the gap.' },
    ],
    insuranceProblems: [
      'Venue surveillance is overwritten before it is requested.',
      'The over-served patron was an adult, defeating the vendor claim.',
      'The at-fault driver is underinsured.',
      'UM/UIM coverage is never explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which venue served the alcohol?' },
      { label: 'Step 2', question: 'Was the person served under 21?' },
      { label: 'Step 3', question: 'Who caused your injuries, and are they insured?' },
      { label: 'Step 4', question: 'Do you have UM/UIM coverage?' },
    ],
  },
  [SD_DRAM_SLUG]: {
    scenario: `A Gaslamp bar served an obviously intoxicated 20-year-old who then caused a crash. Because the patron was a minor, the service-to-a-minor exception opened a claim against the venue alongside the driver. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the Gaslamp venue and time of service.'],
      ['Preserve', 'Demand receipts, ID scans, and surveillance.'],
      ['Assess', 'Confirm age and obvious intoxication.'],
      ['Longer term', 'Vendor and driver claims developed.'],
    ],
    severityLadder: [
      ['Immunity', 'Adult over-service is usually protected.'],
      ['Minor exception', 'Serving a minor can create liability.'],
      ['Age proof', 'ID scans and records establish it.'],
      ['Driver claim', 'The direct claim proceeds too.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'DUI-crash injuries are often severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the patron was under 21',
      'Whether obvious intoxication at service is shown',
      'Whether ID scans and video were preserved',
      'The at-fault person\u2019s insurance',
      'Available UM/UIM coverage',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Minor is the key', copy: 'Age and intoxication drive the claim.' },
      { label: 'ID scans help', copy: 'They can establish the patron\u2019s age.' },
      { label: 'Preserve fast', copy: 'Video is overwritten in days.' },
      { label: 'Two defendants', copy: 'Venue and driver may share fault.' },
    ],
    insuranceProblems: [
      'ID-scan and surveillance records are not preserved.',
      'The venue disputes that the patron was obviously intoxicated.',
      'The at-fault driver is underinsured.',
      'UM/UIM coverage is never explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which Gaslamp venue served the alcohol?' },
      { label: 'Step 2', question: 'Was the person served under 21?' },
      { label: 'Step 3', question: 'Was the person obviously intoxicated?' },
      { label: 'Step 4', question: 'Who caused your injuries, and are they insured?' },
    ],
  },
  [SAC_DRAM_SLUG]: {
    scenario: `A Sacramento house party host knowingly served alcohol to minors, one of whom later crashed. The social-host exception for furnishing alcohol to a minor supported a claim against the host. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify who served the alcohol and where.'],
      ['Preserve', 'Gather messages, photos, and witness accounts.'],
      ['Assess', 'Check the minor and social-host exceptions.'],
      ['Longer term', 'Host and driver claims developed.'],
    ],
    severityLadder: [
      ['Immunity', 'Most service is protected.'],
      ['Minor exception', 'Serving a minor can create liability.'],
      ['Social host', 'Furnishing to a minor at home qualifies.'],
      ['Driver claim', 'The direct claim proceeds too.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'DUI-crash injuries are often severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether a minor was furnished alcohol',
      'Whether a social host knowingly served',
      'Whether the evidence was preserved',
      'The at-fault person\u2019s insurance',
      'Available UM/UIM coverage',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Social host counts', copy: 'Serving a minor at home can qualify.' },
      { label: 'Minor is the key', copy: 'Age drives both exceptions.' },
      { label: 'Preserve fast', copy: 'Messages and video can disappear.' },
      { label: 'Find all coverage', copy: 'Homeowner and UM/UIM may apply.' },
    ],
    insuranceProblems: [
      'The host denies knowing the guest was a minor.',
      'Messages and photos are deleted before they are gathered.',
      'The at-fault driver is underinsured.',
      'UM/UIM coverage is never explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where and by whom was the alcohol served?' },
      { label: 'Step 2', question: 'Was the person served under 21?' },
      { label: 'Step 3', question: 'Was it a licensed venue or a home?' },
      { label: 'Step 4', question: 'Who caused your injuries, and are they insured?' },
    ],
  },
  [SF_DRAM_SLUG]: {
    scenario: `In a dense SF bar district, several venues were nearby, and pinning down which one served the obviously intoxicated minor was the whole case. Fast preservation of the correct venue\u2019s records made the claim viable. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the specific serving venue.'],
      ['Preserve', 'Demand that venue\u2019s receipts and surveillance.'],
      ['Assess', 'Confirm age and obvious intoxication.'],
      ['Longer term', 'Vendor and driver claims developed.'],
    ],
    severityLadder: [
      ['Immunity', 'Adult over-service is usually protected.'],
      ['Right venue', 'The correct bar must be identified.'],
      ['Minor exception', 'Serving a minor can create liability.'],
      ['Driver claim', 'The direct claim proceeds too.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'DUI-crash injuries are often severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the correct venue is identified',
      'Whether the patron was under 21',
      'Whether obvious intoxication at service is shown',
      'Whether venue evidence was preserved',
      'Available UM/UIM coverage',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Right venue matters', copy: 'The wrong bar defeats the claim.' },
      { label: 'Minor is the key', copy: 'Age and intoxication drive the claim.' },
      { label: 'Preserve fast', copy: 'Video is overwritten in days.' },
      { label: 'Find all coverage', copy: 'UM/UIM can fill the gap.' },
    ],
    insuranceProblems: [
      'The wrong venue is blamed and the right one is missed.',
      'Surveillance is overwritten before it is requested.',
      'The over-served patron was an adult, defeating the vendor claim.',
      'UM/UIM coverage is never explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which specific venue served the person?' },
      { label: 'Step 2', question: 'Was the person served under 21?' },
      { label: 'Step 3', question: 'Was the person obviously intoxicated?' },
      { label: 'Step 4', question: 'Who caused your injuries, and are they insured?' },
    ],
  },
}
