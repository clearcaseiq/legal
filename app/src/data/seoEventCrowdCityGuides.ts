import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, concert / festival / crowd-crush injury practice area:
 * location-specific guides for California\u2019s major live-event markets \u2014 Indio,
 * Los Angeles, San Francisco, and San Bernardino.
 *
 * This is distinct from a plain slip-and-fall or the negligent-security hub: its
 * signature fact pattern is a large live event where negligent crowd planning
 * and management \u2014 crushes, surges, stampedes, and inadequate staffing \u2014 causes
 * mass-casualty injuries, involving a layered set of event defendants.
 *
 * Local context, genuine rather than interpolated:
 *  - Indio: Coachella and Stagecoach at the Empire Polo Club, with enormous
 *    desert crowds and extreme heat.
 *  - Los Angeles: stadiums, arenas, and clubs hosting concerts and festivals
 *    year-round.
 *  - San Francisco: large park festivals such as those in Golden Gate Park (city
 *    property) and arena shows.
 *  - San Bernardino: amphitheater and fairground festivals drawing regional
 *    crowds.
 *
 * Applied accurately:
 *  - Event organizers, promoters, venue owners, and security contractors owe
 *    attendees a duty to reasonably plan for and manage the crowd. Negligent
 *    crowd management \u2014 overselling, poor ingress and egress, missing barriers,
 *    inadequate staffing, or ignored surges \u2014 can support liability, as can
 *    inadequate medical staffing and heat planning.
 *  - Responsibility is usually layered across several defendants: the promoter,
 *    the venue owner, the security company, and sometimes performers or vendors,
 *    each of whose role in the planning and response must be untangled.
 *  - A ticket\u2019s terms or a waiver may limit some claims, but a waiver cannot
 *    release gross negligence (City of Santa Barbara v. Superior Court), and mass
 *    crowd-safety failures are frequently argued as gross negligence.
 *  - Where the venue is a public entity \u2014 a city park or a public arena \u2014 a
 *    six-month government claim can be required (Government Code section 911.2)
 *    before suing, which is far shorter than the usual deadline.
 *  - The evidence is perishable and often crowd-sourced: attendee video and
 *    photos, the event\u2019s crowd-management and medical plans, permits, staffing
 *    records, and communications should be preserved quickly. A personal-injury
 *    deadline is generally two years (Code of Civil Procedure section 335.1).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether crowd management was negligent, which event parties are responsible, and which deadline applies depend on facts a licensed California attorney should review promptly.'

const PREMISES =
  'Event organizers, promoters, venue owners, and security contractors owe attendees a duty to reasonably plan for and manage the crowd. Negligent crowd management \u2014 overselling capacity, poor ingress and egress, missing barriers, inadequate staffing, or ignoring a dangerous surge \u2014 can support liability, and so can inadequate medical staffing or heat planning at a large event.'

const LAYERED =
  'Responsibility at a major event is usually layered across several defendants: the promoter, the venue owner, the security or crowd-management contractor, and sometimes performers or vendors. Each party\u2019s role in planning the event and responding to a developing emergency has to be untangled, and more than one can share fault.'

const WAIVER =
  'A ticket\u2019s terms or a signed waiver may limit some claims, but a waiver cannot release gross negligence \u2014 an extreme departure from the standard of care (City of Santa Barbara v. Superior Court). Mass crowd-safety failures, such as a foreseeable and ignored crush, are frequently argued as gross negligence beyond any waiver.'

const PUBLIC =
  'Where the venue is a public entity \u2014 a city park, a public amphitheater, or a government-owned arena \u2014 a six-month government claim can be required before a lawsuit (Government Code section 911.2). That deadline is far shorter than the usual personal-injury period, so identifying a public owner early is critical.'

const EVIDENCE =
  'Event evidence is perishable and often crowd-sourced: attendee video and photographs, the event\u2019s crowd-management and medical plans, permits and capacity approvals, staffing records, and internal communications should be preserved quickly. Much of it is controlled by the organizers and can be lost. A personal-injury deadline is generally two years (Code of Civil Procedure section 335.1).'

export const INDIO_EVENT_SLUG = '/indio-festival-crowd-injury-claim'
export const LA_EVENT_SLUG = '/los-angeles-concert-crowd-injury-claim'
export const SF_EVENT_SLUG = '/san-francisco-festival-crowd-injury-claim'
export const SB_EVENT_SLUG = '/san-bernardino-festival-crowd-injury-claim'

export const eventCrowdCityGuidePages: LandingPage[] = [
  {
    slug: INDIO_EVENT_SLUG,
    category: 'Cities',
    cluster: 'Indio Festival Crowd Injury Claims',
    title: 'Indio Festival & Crowd-Crush Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a crowd crush or from heat at a Coachella-area festival? Negligent crowd and heat planning can support claims against the layered event parties.',
    psychology: 'I was crushed in the crowd at a festival near Indio and no one was managing it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'indio festival injury lawyer',
      'coachella crowd crush lawsuit california',
      'concert crowd surge injury california',
      'festival heat illness claim california',
      'event promoter negligence california',
    ],
    signals: [
      'Duty to plan and manage the crowd',
      'Layered event defendants',
      'Waivers do not bar gross negligence',
      'Heat and medical planning duties',
      'Preserve attendee video and plans',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Indio\u2019s Coachella and Stagecoach festivals at the Empire Polo Club draw enormous desert crowds in extreme heat, a combination that makes crowd-management and heat-planning failures especially dangerous. ${PREMISES} ${LAYERED} ${WAIVER} ${PUBLIC} ${EVIDENCE} Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'Where in the venue the crush or surge occurred',
        'Whether staff or security were managing the area',
        'Any attendee video and photos of the crowd',
        'The event\u2019s crowd and medical plans, if obtainable',
        'Whether heat and water access were adequate',
        'Which promoter, venue, and security firm were involved',
        'The medical response you received',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps an Indio-festival attendee preserve crowd-sourced video, identify the layered promoter, venue, and security defendants, and pursue the event\u2019s crowd and heat plans that show what was planned. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue over a crowd crush at a festival?',
        a: 'Possibly. Organizers, promoters, venues, and security contractors owe a duty to reasonably plan for and manage the crowd, and negligent crowd management \u2014 overselling, poor flow, missing barriers, or ignored surges \u2014 can support liability.',
      },
      {
        q: 'The ticket had a waiver. Does that end my claim?',
        a: 'Not necessarily. A waiver may limit ordinary claims, but it cannot release gross negligence (City of Santa Barbara v. Superior Court), and a foreseeable, ignored crowd crush is frequently argued as gross negligence.',
      },
      {
        q: 'I suffered heat illness. Is that covered?',
        a: 'It can be. A large desert festival carries a duty to plan for heat \u2014 shade, water access, and medical staffing \u2014 and inadequate heat and medical planning can be part of a claim.',
      },
      {
        q: 'Who is responsible at a festival?',
        a: 'Usually several parties: the promoter, the venue owner, the security or crowd-management contractor, and sometimes vendors. Each role in the planning and emergency response has to be untangled.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the evidence, the event parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LA_EVENT_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Concert Crowd Injury Claims',
    title: 'Los Angeles Concert & Crowd-Crush Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a crowd surge at an LA concert, arena, or club? Negligent crowd management can support claims against the promoter, venue, and security firm.',
    psychology: 'I was injured in a crowd surge at an LA concert and security did nothing.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles concert injury lawyer',
      'crowd surge injury lawsuit california',
      'nightclub crowd crush injury california',
      'arena event negligence california',
      'event promoter negligence california',
    ],
    signals: [
      'Duty to plan and manage the crowd',
      'Layered event defendants',
      'Waivers do not bar gross negligence',
      'Negligent-security overlap',
      'Preserve attendee video and plans',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles hosts concerts and festivals year-round across stadiums, arenas, and packed clubs, where an oversold floor or an unmanaged surge can injure many attendees at once. ${PREMISES} ${LAYERED} ${WAIVER} ${PUBLIC} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Where in the venue the crush or surge occurred',
        'Whether staff or security were managing the area',
        'Any attendee video and photos of the crowd',
        'The event\u2019s crowd and medical plans, if obtainable',
        'Whether the floor or section was oversold',
        'Which promoter, venue, and security firm were involved',
        'The medical response you received',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps an LA concertgoer preserve crowd-sourced video, identify the layered promoter, venue, and security defendants, and pursue the crowd-management plan and staffing records. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Security ignored a dangerous surge. Can the venue be liable?',
        a: 'Possibly. A venue and its security contractor owe a duty to manage the crowd, and failing to respond to a developing surge or oversold section can support liability, overlapping with a negligent-security claim.',
      },
      {
        q: 'Does the ticket waiver block my claim?',
        a: 'Not necessarily. A waiver may limit ordinary claims but cannot release gross negligence (City of Santa Barbara v. Superior Court), and ignoring an obvious crush is often argued as gross negligence.',
      },
      {
        q: 'What if the venue is a public arena?',
        a: 'If the venue is a public entity, a six-month government claim may be required before suing (Government Code section 911.2), which is much shorter than the usual deadline, so the owner should be identified early.',
      },
      {
        q: 'Who can be responsible?',
        a: 'Usually the promoter, the venue owner, and the security or crowd-management contractor, and sometimes vendors \u2014 each role in planning and response must be examined.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the event parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_EVENT_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Festival Crowd Injury Claims',
    title: 'San Francisco Festival & Crowd-Crush Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a crowd at a San Francisco park festival or arena show? A public-park venue can trigger a six-month claim deadline you must not miss.',
    psychology: 'I was hurt in the crowd at a festival in a San Francisco park and need to know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco festival injury lawyer',
      'outside lands crowd injury lawsuit california',
      'concert crowd surge injury california',
      'park event negligence california',
      'public venue injury six month claim california',
    ],
    signals: [
      'Duty to plan and manage the crowd',
      'Layered event defendants',
      'Public-park six-month claim (911.2)',
      'Waivers do not bar gross negligence',
      'Preserve attendee video and plans',
      'Act quickly on the deadline',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s large park festivals \u2014 including those staged in city-owned Golden Gate Park \u2014 and its arena shows create dense crowds, and the public-property setting can shorten the deadline to act to just six months. ${PREMISES} ${LAYERED} ${PUBLIC} ${WAIVER} ${EVIDENCE} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Whether the event was on public park property',
        'Where in the venue the crush or surge occurred',
        'Any attendee video and photos of the crowd',
        'The event\u2019s crowd and medical plans, if obtainable',
        'Which promoter, venue, and security firm were involved',
        'Whether a public entity co-hosted or owned the site',
        'The medical response you received',
        'The date of injury, for the six-month deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Francisco festival attendee determine whether a public park owner triggers a six-month claim, preserve crowd-sourced video, and identify the layered promoter, venue, and security defendants. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The festival was in a city park. Does that change my deadline?',
        a: 'It can. A claim against a public entity generally requires a government claim within six months (Government Code section 911.2), which is much shorter than the usual two years, so a public-park venue makes acting quickly essential.',
      },
      {
        q: 'Can I sue over a crowd injury at a park festival?',
        a: 'Possibly. Organizers, promoters, and any public co-host owe a duty to plan for and manage the crowd, and negligent crowd management can support liability \u2014 with the public-entity rules layered on top.',
      },
      {
        q: 'Does a ticket waiver end my claim?',
        a: 'Not necessarily. A waiver may limit ordinary claims but cannot release gross negligence (City of Santa Barbara v. Superior Court), and a foreseeable, ignored crush is often argued as gross negligence.',
      },
      {
        q: 'Who is responsible?',
        a: 'Usually the promoter, the venue or public owner, and the security or crowd-management contractor, and sometimes vendors \u2014 each role in planning and response has to be examined.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the event parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_EVENT_SLUG,
    category: 'Cities',
    cluster: 'San Bernardino Festival Crowd Injury Claims',
    title: 'San Bernardino Festival & Crowd-Crush Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a crowd at a San Bernardino amphitheater or fairground festival? Negligent crowd and heat planning can support claims against the event parties.',
    psychology: 'I was hurt in a crowd at an amphitheater festival near San Bernardino.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino festival injury lawyer',
      'amphitheater crowd injury lawsuit california',
      'concert crowd surge injury california',
      'festival heat illness claim california',
      'event promoter negligence california',
    ],
    signals: [
      'Duty to plan and manage the crowd',
      'Layered event defendants',
      'Waivers do not bar gross negligence',
      'Heat and medical planning duties',
      'Preserve attendee video and plans',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Bernardino\u2019s amphitheater and fairground festivals draw large regional crowds to the Inland Empire\u2019s hot summers, where crowd-flow and heat planning again become central to safety. ${PREMISES} ${LAYERED} ${WAIVER} ${PUBLIC} ${EVIDENCE} Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'Where in the venue the crush or surge occurred',
        'Whether staff or security were managing the area',
        'Any attendee video and photos of the crowd',
        'The event\u2019s crowd and medical plans, if obtainable',
        'Whether heat and water access were adequate',
        'Which promoter, venue, and security firm were involved',
        'The medical response you received',
        'The injuries and treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Bernardino festival attendee preserve crowd-sourced video, identify the layered promoter, venue, and security defendants, and pursue the crowd and heat plans that show what was planned. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue over a crowd injury at an amphitheater festival?',
        a: 'Possibly. Organizers, promoters, venues, and security contractors owe a duty to plan for and manage the crowd, and negligent crowd management or inadequate staffing can support liability.',
      },
      {
        q: 'I suffered heat illness at the festival. Is that a claim?',
        a: 'It can be. A large outdoor summer festival carries a duty to plan for heat \u2014 shade, water, and medical staffing \u2014 and inadequate heat and medical planning can be part of a claim.',
      },
      {
        q: 'Does the ticket waiver block my claim?',
        a: 'Not necessarily. A waiver may limit ordinary claims but cannot release gross negligence (City of Santa Barbara v. Superior Court), and an ignored crowd crush is often argued as gross negligence.',
      },
      {
        q: 'Who can be responsible?',
        a: 'Usually the promoter, the venue owner, and the security or crowd-management contractor, and sometimes vendors \u2014 each role in planning and response must be examined.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the event parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const eventCrowdCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [INDIO_EVENT_SLUG]: {
    scenario: `An Indio festivalgoer was crushed against a barrier during an unmanaged surge in extreme heat. Attendee video and the event\u2019s thin crowd and heat plans supported claims against the promoter, venue, and security firm. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Save your video; note where and when.'],
      ['Preserve', 'Demand crowd, medical, and heat plans.'],
      ['Map parties', 'Identify promoter, venue, and security.'],
      ['Longer term', 'Layered negligence theories developed.'],
    ],
    severityLadder: [
      ['Duty', 'Organizers must manage the crowd.'],
      ['Negligence', 'Surges and heat gaps breach it.'],
      ['Gross negligence', 'Ignored crushes are not waived.'],
      ['Evidence', 'Video and plans prove it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Crush and heat injuries are severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether crowd management was negligent',
      'Whether heat and medical planning were adequate',
      'Whether the conduct was gross negligence',
      'Which event parties share fault',
      'Whether video and plans were preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Video is key', copy: 'It captures the surge.' },
      { label: 'Heat planning counts', copy: 'Desert events must plan for it.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Layered defendants', copy: 'Several parties may share fault.' },
    ],
    insuranceProblems: [
      'Attendee video is deleted before it is saved.',
      'The event plans are never obtained.',
      'The waiver is treated as a complete defense.',
      'Only one party is blamed of several.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where in the venue were you injured?' },
      { label: 'Step 2', question: 'Do you have video or photos?' },
      { label: 'Step 3', question: 'Was heat or water access a problem?' },
      { label: 'Step 4', question: 'What was the medical response?' },
    ],
  },
  [LA_EVENT_SLUG]: {
    scenario: `An LA concertgoer was injured when an oversold floor surged toward the stage and security failed to intervene. Crowd-sourced video and staffing records tied the promoter, venue, and security firm to the failure. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Save your video; note where and when.'],
      ['Preserve', 'Demand the crowd plan and staffing records.'],
      ['Map parties', 'Identify promoter, venue, and security.'],
      ['Longer term', 'Layered negligence theories developed.'],
    ],
    severityLadder: [
      ['Duty', 'Venues must manage the crowd.'],
      ['Oversell', 'A packed floor is a hazard.'],
      ['Security', 'Failing to intervene breaches the duty.'],
      ['Evidence', 'Video and records prove it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Crush injuries can be severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether the section was oversold',
      'Whether security failed to respond',
      'Whether the conduct was gross negligence',
      'Which event parties share fault',
      'Whether video and records were preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Oversell matters', copy: 'Capacity records reveal it.' },
      { label: 'Security overlap', copy: 'A negligent-security claim can join.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Layered defendants', copy: 'Several parties may share fault.' },
    ],
    insuranceProblems: [
      'Crowd-sourced video is not preserved.',
      'Capacity and staffing records are withheld.',
      'The waiver is treated as a complete defense.',
      'Only one party is blamed of several.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where in the venue were you injured?' },
      { label: 'Step 2', question: 'Was the floor or section oversold?' },
      { label: 'Step 3', question: 'Did security respond to the surge?' },
      { label: 'Step 4', question: 'Do you have video or photos?' },
    ],
  },
  [SF_EVENT_SLUG]: {
    scenario: `A San Francisco park-festival attendee was hurt in a crowd on city property. Recognizing the public-park owner triggered a six-month government claim that had to be filed alongside the private-party claims. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Save your video; confirm the venue owner.'],
      ['Deadline', 'File a six-month claim if a public entity owns it.'],
      ['Map parties', 'Identify promoter, owner, and security.'],
      ['Longer term', 'Public and private theories developed.'],
    ],
    severityLadder: [
      ['Public owner', 'A park triggers a six-month claim.'],
      ['Duty', 'Organizers must manage the crowd.'],
      ['Negligence', 'Poor crowd control breaches it.'],
      ['Evidence', 'Video and plans prove it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Crush injuries can be severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether a public entity owns the venue',
      'Whether the six-month deadline is met',
      'Whether crowd management was negligent',
      'Which event parties share fault',
      'Whether video and plans were preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'A public park means six months.' },
      { label: 'Identify the owner', copy: 'It sets which rules apply.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Layered defendants', copy: 'Public and private parties.' },
    ],
    insuranceProblems: [
      'The six-month public-entity deadline is missed.',
      'The public owner is never identified.',
      'Attendee video is not preserved.',
      'The waiver is treated as a complete defense.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the event on public park property?' },
      { label: 'Step 2', question: 'When were you injured?' },
      { label: 'Step 3', question: 'Do you have video or photos?' },
      { label: 'Step 4', question: 'Who promoted and secured the event?' },
    ],
  },
  [SB_EVENT_SLUG]: {
    scenario: `A San Bernardino amphitheater festival oversold a general-admission pit on a hot day; a surge and thin medical staffing injured several attendees. The plans and video anchored claims against the layered parties. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Save your video; note where and when.'],
      ['Preserve', 'Demand crowd, medical, and heat plans.'],
      ['Map parties', 'Identify promoter, venue, and security.'],
      ['Longer term', 'Layered negligence theories developed.'],
    ],
    severityLadder: [
      ['Duty', 'Organizers must manage the crowd.'],
      ['Negligence', 'Surges and thin staffing breach it.'],
      ['Gross negligence', 'Ignored crushes are not waived.'],
      ['Evidence', 'Video and plans prove it.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Crush and heat injuries are severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and records are gathered.' },
    ],
    settlementDrivers: [
      'Whether crowd management was negligent',
      'Whether heat and medical planning were adequate',
      'Whether the conduct was gross negligence',
      'Which event parties share fault',
      'Whether video and plans were preserved',
      'The severity of the injuries',
    ],
    settlementValueDetails: [
      { label: 'Pit surges', copy: 'General-admission pits are high-risk.' },
      { label: 'Heat planning counts', copy: 'Inland summers demand it.' },
      { label: 'Waivers have limits', copy: 'Gross negligence is not barred.' },
      { label: 'Layered defendants', copy: 'Several parties may share fault.' },
    ],
    insuranceProblems: [
      'Attendee video is deleted before it is saved.',
      'The event plans are never obtained.',
      'The waiver is treated as a complete defense.',
      'Only one party is blamed of several.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where in the venue were you injured?' },
      { label: 'Step 2', question: 'Were you in a general-admission pit?' },
      { label: 'Step 3', question: 'Was heat or medical response a problem?' },
      { label: 'Step 4', question: 'Do you have video or photos?' },
    ],
  },
}
