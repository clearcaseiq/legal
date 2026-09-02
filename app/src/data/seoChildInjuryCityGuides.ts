import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, daycare / school child-injury (negligent-supervision) practice
 * area: location-specific guides for Los Angeles, San Diego, San Jose, and
 * Sacramento.
 *
 * A child hurt at a daycare, school, or camp raises a distinct claim built on
 * the heightened duty those providers owe to supervise children in their care.
 * The rules differ sharply depending on whether the provider is a licensed
 * private daycare, a public school district (a government entity with a short
 * deadline), or a federal facility.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: a very large public school district and a dense market of
 *    licensed childcare centers.
 *  - San Diego: public districts and licensed centers, plus base childcare where
 *    a federal facility routes the claim through the Federal Tort Claims Act.
 *  - San Jose: a Silicon Valley market with a heavy reliance on licensed
 *    daycare and after-school care.
 *  - Sacramento: public districts and state-region childcare serving a wide area.
 *
 * Applied accurately:
 *  - Schools and childcare providers owe a heightened duty to supervise the
 *    children in their care; negligent supervision \u2014 a lapse that allows a
 *    foreseeable injury \u2014 is the core theory.
 *  - A licensed daycare must meet California Community Care Licensing (Title 22)
 *    standards, including staff-to-child ratios and safety requirements;
 *    licensing citations from the Department of Social Services can document
 *    violations.
 *  - An injury at a public school is a claim against a public entity: the
 *    Government Claims Act requires a formal written claim within six months
 *    (Government Code section 911.2), and school districts owe students a special
 *    duty of supervision.
 *  - Base or federal childcare is governed by the Federal Tort Claims Act, which
 *    requires an administrative claim first.
 *  - The evidence is the incident report, supervision and staffing logs, any
 *    licensing citations, and playground- or equipment-maintenance records.
 *    Where abuse is alleged, separate mandated-reporter duties and extended
 *    deadlines apply and should be reviewed by counsel. Comparative negligence
 *    applies but is assessed carefully for young children.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a provider was negligent, which deadline applies, and how a child\u2019s claim is handled depend on facts a licensed California attorney should review promptly.'

const DUTY =
  'Schools, daycares, and camps owe a heightened duty to supervise the children in their care. The core theory is negligent supervision \u2014 a lapse in adequate supervision that allowed a foreseeable injury, whether from another child, a playground hazard, unsafe equipment, or an unsecured exit. What supervision was reasonable depends on the children\u2019s ages and the known risks.'

const LICENSING =
  'A licensed daycare must meet California\u2019s Community Care Licensing standards (Title 22), including staff-to-child ratios, supervision, and facility-safety requirements. Where those standards were not met, the licensing citation and inspection history from the Department of Social Services can help establish that care fell below what the law requires.'

const PUBLIC_SCHOOL =
  'An injury at a public school is a claim against a public entity, and school districts owe students a special duty of supervision. Because the district is a public entity, the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than an ordinary deadline \u2014 so a public-school injury must be assessed immediately.'

const FEDERAL =
  'Childcare on a military base or at another federal facility is governed by the Federal Tort Claims Act, which requires an administrative claim to the agency first and follows federal rules and deadlines rather than the state licensing and claims scheme. Identifying whether the provider was private, public, or federal is an essential first step.'

const EVIDENCE =
  'These cases are built on the incident report, the supervision and staffing logs, any licensing citations, and the playground- or equipment-maintenance records \u2014 documents that show whether supervision and safety met the standard. Requesting them early, before they are lost, is important. Where abuse is alleged, separate mandated-reporter duties and extended deadlines apply and should be reviewed by counsel.'

export const LA_CHILD_SLUG = '/los-angeles-daycare-school-injury-claim'
export const SD_CHILD_SLUG = '/san-diego-daycare-school-injury-claim'
export const SJ_CHILD_SLUG = '/san-jose-daycare-school-injury-claim'
export const SAC_CHILD_SLUG = '/sacramento-daycare-school-injury-claim'

export const childInjuryCityGuidePages: LandingPage[] = [
  {
    slug: LA_CHILD_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Daycare & School Injury Claims',
    title: 'Los Angeles Daycare & School Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Was your child hurt at an LA daycare or school? Providers owe a heightened duty to supervise \u2014 and a public school carries a short six-month deadline.',
    psychology: 'My child was hurt at an LA daycare or school and I do not know if the provider is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles daycare injury lawyer',
      'child hurt at school claim california',
      'negligent supervision daycare california',
      'school playground injury lawsuit california',
      'daycare licensing violation injury california',
    ],
    signals: [
      'Heightened duty to supervise',
      'Daycare licensing (Title 22)',
      'Public school six-month claim (911.2)',
      'Incident & staffing records',
      'Playground/equipment safety',
      'Careful comparative fault for children',
    ],
    sections: {
      whyItMatters: `Los Angeles has a very large public school district and a dense market of licensed childcare centers, so children\u2019s injuries arise across very different providers \u2014 each with its own rules. ${DUTY} ${LICENSING} ${PUBLIC_SCHOOL} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court after any required claim.`,
      whatToTrack: [
        'Whether the provider was a licensed daycare, public school, or other',
        'How the injury happened and whether supervision lapsed',
        'The incident report and who was supervising',
        'Staff-to-child ratios at the time',
        'Any licensing citations or prior complaints',
        'Playground or equipment condition and maintenance',
        'The date of injury, which starts any six-month clock',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether an LA provider was a licensed daycare or a public school \u2014 which decides the rules and deadlines \u2014 gathers the incident, staffing, and licensing records, and moves quickly on any six-month claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I bring a claim if my child was hurt at daycare or school?',
        a: 'Possibly. Schools, daycares, and camps owe a heightened duty to supervise children in their care, and negligent supervision \u2014 a lapse that allowed a foreseeable injury \u2014 is the core theory. Whether the supervision was reasonable depends on the children\u2019s ages and the known risks.',
      },
      {
        q: 'My child was hurt at a public school. How long do I have?',
        a: 'Much less time than usual. An injury at a public school is a claim against a public entity, and the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit. It must be assessed immediately.',
      },
      {
        q: 'Does a daycare licensing violation help my claim?',
        a: 'It can. A licensed daycare must meet Community Care Licensing (Title 22) standards, including staff-to-child ratios and safety. A licensing citation or inspection history from the Department of Social Services can help show that care fell below what the law requires.',
      },
      {
        q: 'My young child was partly blamed. Does that end the claim?',
        a: 'Not necessarily. California applies comparative negligence, but a very young child\u2019s capacity for fault is assessed carefully, and the provider\u2019s duty was to supervise precisely to prevent foreseeable harm. This should be reviewed by an attorney.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_CHILD_SLUG,
    category: 'Cities',
    cluster: 'San Diego Daycare & School Injury Claims',
    title: 'San Diego Daycare & School Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Was your child hurt at a San Diego daycare or school \u2014 or on a base? Providers owe a heightened duty, and base childcare follows a separate federal path.',
    psychology: 'My child was hurt at a San Diego daycare, school, or on a base and I do not know what rules apply.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego daycare injury lawyer',
      'child hurt at school claim california',
      'military base childcare injury california',
      'negligent supervision daycare california',
      'school playground injury lawsuit california',
    ],
    signals: [
      'Heightened duty to supervise',
      'Base / federal childcare (FTCA)',
      'Daycare licensing (Title 22)',
      'Public school six-month claim (911.2)',
      'Incident & staffing records',
      'Playground/equipment safety',
    ],
    sections: {
      whyItMatters: `San Diego has public districts, a dense market of licensed centers, and childcare on military bases \u2014 and where the provider was a federal facility, the claim follows an entirely different, federal route, making the first question who ran the program. ${FEDERAL} ${DUTY} ${LICENSING} ${PUBLIC_SCHOOL} ${EVIDENCE} Civil cases against private or district providers are filed in San Diego County Superior Court after any required claim.`,
      whatToTrack: [
        'Whether the provider was private, a public school, or federal/base',
        'How the injury happened and whether supervision lapsed',
        'The incident report and who was supervising',
        'Staff-to-child ratios at the time',
        'Any licensing citations or prior complaints',
        'Playground or equipment condition and maintenance',
        'The applicable deadline \u2014 six-month claim, FTCA, or ordinary',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ first determines whether a San Diego provider was private, a public district, or a federal/base program \u2014 which decides the path \u2014 then gathers the incident, staffing, and licensing records and addresses the applicable deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My child was hurt at base childcare. Does that change the claim?',
        a: 'Yes. Childcare on a military base or another federal facility is governed by the Federal Tort Claims Act, which requires an administrative claim first and follows federal rules and deadlines. Identifying whether the provider was private, public, or federal is the essential first step.',
      },
      {
        q: 'Can I bring a claim for a daycare or school injury?',
        a: 'Possibly. Schools, daycares, and camps owe a heightened duty to supervise children, and negligent supervision \u2014 a lapse that allowed a foreseeable injury \u2014 is the core theory. Whether the supervision was reasonable depends on the children\u2019s ages and the known risks.',
      },
      {
        q: 'My child was hurt at a public school. How long do I have?',
        a: 'Much less time than usual. It is a claim against a public entity, and the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit. Act immediately.',
      },
      {
        q: 'Does a daycare licensing violation help my claim?',
        a: 'It can. A licensed daycare must meet Community Care Licensing (Title 22) standards. A licensing citation or inspection history from the Department of Social Services can help show that care fell below the standard.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the records and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_CHILD_SLUG,
    category: 'Cities',
    cluster: 'San Jose Daycare & School Injury Claims',
    title: 'San Jose Daycare & School Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Was your child hurt at a San Jose daycare, after-school program, or school? Providers owe a heightened duty to supervise \u2014 and licensing records can prove a lapse.',
    psychology: 'My child was hurt at a San Jose daycare or after-school program and I do not know if the provider is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose daycare injury lawyer',
      'child hurt at school claim california',
      'after school program injury california',
      'negligent supervision daycare california',
      'daycare licensing violation injury california',
    ],
    signals: [
      'Heightened duty to supervise',
      'Daycare & after-school licensing (Title 22)',
      'Public school six-month claim (911.2)',
      'Incident & staffing records',
      'Playground/equipment safety',
      'Careful comparative fault for children',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s Silicon Valley families rely heavily on licensed daycare and after-school care, so many children\u2019s injuries here happen in licensed programs where staff-to-child ratios and supervision standards are the central question. ${DUTY} ${LICENSING} ${PUBLIC_SCHOOL} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court after any required claim.`,
      whatToTrack: [
        'Whether the provider was a licensed daycare/after-school or a public school',
        'How the injury happened and whether supervision lapsed',
        'The incident report and who was supervising',
        'Staff-to-child ratios at the time',
        'Any licensing citations or prior complaints',
        'Playground or equipment condition and maintenance',
        'The date of injury, which starts any six-month clock',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ gathers the incident, staffing, and Community Care Licensing records for a San Jose daycare or after-school program to show whether supervision and ratios met the standard, and addresses any public-school deadline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My child was hurt at a licensed daycare or after-school program. What matters?',
        a: 'Whether supervision met the standard. Licensed programs must meet Community Care Licensing (Title 22) requirements, including staff-to-child ratios and safety. The incident report, staffing logs, and any licensing citations show whether care fell below what the law requires.',
      },
      {
        q: 'Can I bring a claim for a school or daycare injury?',
        a: 'Possibly. Providers owe a heightened duty to supervise children, and negligent supervision \u2014 a lapse that allowed a foreseeable injury \u2014 is the core theory. Whether supervision was reasonable depends on the children\u2019s ages and the known risks.',
      },
      {
        q: 'My child was hurt at a public school. How long do I have?',
        a: 'Much less time than usual. It is a claim against a public entity, and the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit. Act immediately.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The incident report, supervision and staffing logs, any licensing citations, and playground- or equipment-maintenance records. Request them early, before they are lost, because they show whether supervision and safety met the standard.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the records and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_CHILD_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Daycare & School Injury Claims',
    title: 'Sacramento Daycare & School Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Was your child hurt at a Sacramento-area daycare or school? Providers owe a heightened duty to supervise \u2014 and a public school carries a short six-month deadline.',
    psychology: 'My child was hurt at a Sacramento-area daycare or school and I do not know if the provider is responsible or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento daycare injury lawyer',
      'child hurt at school claim california',
      'negligent supervision daycare california',
      'school playground injury lawsuit california',
      'daycare licensing violation injury california',
    ],
    signals: [
      'Heightened duty to supervise',
      'Daycare licensing (Title 22)',
      'Public school six-month claim (911.2)',
      'Incident & staffing records',
      'Playground/equipment safety',
      'Careful comparative fault for children',
    ],
    sections: {
      whyItMatters: `The Sacramento region\u2019s public districts and licensed childcare centers serve a wide area, and children\u2019s injuries here span both settings \u2014 each with its own rules and deadlines. ${DUTY} ${LICENSING} ${PUBLIC_SCHOOL} ${EVIDENCE} Civil cases are filed in Sacramento County Superior Court after any required claim.`,
      whatToTrack: [
        'Whether the provider was a licensed daycare or a public school',
        'How the injury happened and whether supervision lapsed',
        'The incident report and who was supervising',
        'Staff-to-child ratios at the time',
        'Any licensing citations or prior complaints',
        'Playground or equipment condition and maintenance',
        'The date of injury, which starts any six-month clock',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Sacramento-area provider was a licensed daycare or a public school \u2014 which decides the rules and deadlines \u2014 gathers the incident, staffing, and licensing records, and moves quickly on any six-month claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I bring a claim if my child was hurt at daycare or school?',
        a: 'Possibly. Schools, daycares, and camps owe a heightened duty to supervise children, and negligent supervision \u2014 a lapse that allowed a foreseeable injury \u2014 is the core theory. Whether supervision was reasonable depends on the children\u2019s ages and the known risks.',
      },
      {
        q: 'My child was hurt at a public school. How long do I have?',
        a: 'Much less time than usual. It is a claim against a public entity, and the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit. Act immediately.',
      },
      {
        q: 'Does a daycare licensing violation help my claim?',
        a: 'It can. A licensed daycare must meet Community Care Licensing (Title 22) standards, including staff-to-child ratios and safety. A licensing citation or inspection history from the Department of Social Services can help show that care fell below the standard.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The incident report, supervision and staffing logs, any licensing citations, and playground- or equipment-maintenance records. Request them early, before they are lost.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the records and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const childInjuryCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_CHILD_SLUG]: {
    scenario: `An LA child was hurt on playground equipment while staff were understaffed and distracted. The incident report, staffing logs, and a licensing citation showed the supervision lapse. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Get the incident report; identify the provider type.'],
      ['First weeks', 'Request staffing logs and licensing citation history.'],
      ['If public school', 'Present the six-month government claim in time.'],
      ['Longer term', 'Supervision and safety issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Duty', 'The provider owed a heightened duty to supervise.'],
      ['Lapse', 'Understaffing allowed a foreseeable injury.'],
      ['Records', 'Citations and logs prove the lapse.'],
      ['Deadline', 'A public school means six months.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether supervision met the standard',
      'Whether ratios or licensing rules were violated',
      'Whether the incident and staffing records show a lapse',
      'Whether any six-month deadline was met',
      'Playground or equipment condition',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Supervision is central', copy: 'Negligent supervision is the theory.' },
      { label: 'Citations help', copy: 'Licensing violations show a lapse.' },
      { label: 'Deadline can be short', copy: 'A public school means six months.' },
      { label: 'Get the records', copy: 'Incident and staffing logs are key.' },
    ],
    insuranceProblems: [
      'The incident report and staffing logs are never obtained.',
      'A public-school six-month deadline is missed.',
      'Licensing citation history is ignored.',
      'The provider type (private vs. public) is misidentified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a licensed daycare, public school, or other?' },
      { label: 'Step 2', question: 'How did the injury happen?' },
      { label: 'Step 3', question: 'Have you obtained the incident report?' },
      { label: 'Step 4', question: 'When did the injury occur (six-month clock)?' },
    ],
  },
  [SD_CHILD_SLUG]: {
    scenario: `A San Diego child was hurt at a base childcare program. Recognising it as a federal facility routed the claim through the Federal Tort Claims Act rather than the state licensing and claims scheme. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether the provider was private, public, or federal.'],
      ['First weeks', 'Get the incident report; request staffing and any citations.'],
      ['Path', 'Choose FTCA, six-month claim, or ordinary as applicable.'],
      ['Longer term', 'Supervision and safety issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Right path', 'Private, public, or federal decides the rules.'],
      ['Duty', 'A heightened duty to supervise applied.'],
      ['Lapse', 'A supervision lapse allowed the injury.'],
      ['Records', 'Reports and logs prove the lapse.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the provider was private, public, or federal',
      'Whether supervision met the standard',
      'Whether an FTCA claim or six-month claim applies',
      'Whether the incident and staffing records show a lapse',
      'Playground or equipment condition',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Path first', copy: 'Federal childcare needs the FTCA process.' },
      { label: 'Supervision is central', copy: 'Negligent supervision is the theory.' },
      { label: 'Deadlines vary', copy: 'FTCA, six-month, or ordinary.' },
      { label: 'Get the records', copy: 'Incident and staffing logs are key.' },
    ],
    insuranceProblems: [
      'A federal provider is treated as private, missing the FTCA path.',
      'The applicable deadline is misjudged.',
      'The incident report and staffing logs are never obtained.',
      'Licensing citation history is ignored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the provider private, public, or federal/base?' },
      { label: 'Step 2', question: 'How did the injury happen?' },
      { label: 'Step 3', question: 'Have you obtained the incident report?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
  [SJ_CHILD_SLUG]: {
    scenario: `A San Jose child was injured at an after-school program that exceeded its staff-to-child ratio. The Community Care Licensing citation for the ratio violation documented the supervision lapse. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Get the incident report; identify the licensed program.'],
      ['First weeks', 'Request staffing logs and the licensing citation history.'],
      ['Assessment', 'Compare the ratios and supervision to the standard.'],
      ['Longer term', 'Supervision and safety issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Duty', 'The program owed a heightened duty to supervise.'],
      ['Ratio', 'Exceeding the ratio is a licensing violation.'],
      ['Lapse', 'The violation allowed a foreseeable injury.'],
      ['Records', 'Citations and logs prove it.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether staff-to-child ratios were met',
      'Whether supervision met the standard',
      'Whether the licensing citation documents a violation',
      'Whether the incident and staffing records show a lapse',
      'Playground or equipment condition',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Ratios matter', copy: 'A ratio violation is strong evidence.' },
      { label: 'Supervision is central', copy: 'Negligent supervision is the theory.' },
      { label: 'Citations help', copy: 'Licensing records show the lapse.' },
      { label: 'Get the records', copy: 'Incident and staffing logs are key.' },
    ],
    insuranceProblems: [
      'The staffing logs and ratios are never examined.',
      'The licensing citation history is ignored.',
      'The incident report is never obtained.',
      'A public-school deadline (if applicable) is missed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a licensed daycare/after-school or a school?' },
      { label: 'Step 2', question: 'How many staff were supervising?' },
      { label: 'Step 3', question: 'Have you obtained the incident report?' },
      { label: 'Step 4', question: 'How did the injury happen?' },
    ],
  },
  [SAC_CHILD_SLUG]: {
    scenario: `A Sacramento-area child was hurt at a public school during an unsupervised recess. Recognising the public-entity involvement, the six-month claim was presented, and the incident report showed the supervision lapse. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Get the incident report; confirm the provider is a public school.'],
      ['Six-month mark', 'Present the government claim to the district in time.'],
      ['Assessment', 'Compare supervision to the district\u2019s duty.'],
      ['Longer term', 'Supervision and safety issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Public entity', 'A district triggers a six-month claim.'],
      ['Duty', 'Districts owe a special duty to supervise.'],
      ['Lapse', 'Inadequate supervision allowed the injury.'],
      ['Records', 'The incident report proves it.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the six-month claim was met',
      'Whether the district\u2019s supervision met its duty',
      'Whether the incident record shows a lapse',
      'Playground or equipment condition',
      'Whether prior complaints show a known risk',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'A public school means six months.' },
      { label: 'Special duty', copy: 'Districts owe students supervision.' },
      { label: 'Records prove it', copy: 'The incident report is central.' },
      { label: 'Known risks', copy: 'Prior complaints strengthen the claim.' },
    ],
    insuranceProblems: [
      'The six-month claim deadline is missed.',
      'The incident report is never obtained.',
      'Prior complaints showing a known risk are ignored.',
      'Playground-maintenance records are never requested.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was it a public school or a private provider?' },
      { label: 'Step 2', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 3', question: 'How did the injury happen?' },
      { label: 'Step 4', question: 'Have you obtained the incident report?' },
    ],
  },
}
