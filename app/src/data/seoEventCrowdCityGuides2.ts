import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, event / concert / festival crowd-injury practice area (batch 2):
 * location-specific guides for San Diego, Sacramento, Oakland, and San Jose,
 * extending the batch-1 hub (Indio, Los Angeles, San Francisco, San Bernardino).
 *
 * Applied accurately (identical to batch 1):
 *  - Organizers, venues, and security contractors owe a crowd-management duty.
 *  - Responsibility is layered across promoter/venue/security/vendors.
 *  - A waiver cannot release gross negligence (City of Santa Barbara).
 *  - Public venues can require a six-month government claim (Gov. Code 911.2);
 *    private-venue PI deadline is generally two years (CCP 335.1).
 *  - Event evidence is perishable and often crowd-sourced.
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

export const SD_EVENT_SLUG = '/san-diego-concert-crowd-injury-claim'
export const SAC_EVENT_SLUG = '/sacramento-festival-crowd-injury-claim'
export const OAK_EVENT_SLUG = '/oakland-concert-crowd-injury-claim'
export const SJ_EVENT_SLUG = '/san-jose-concert-crowd-injury-claim'

export const eventCrowdCityGuidePages2: LandingPage[] = [
  {
    slug: SD_EVENT_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Event Crowd Injury Claims',
    title: 'San Diego Concert, Festival & Event Crowd Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a crowd surge or crush at a San Diego concert, festival, or convention? Organizers and security owe a crowd-management duty, and a waiver cannot release gross negligence.',
    psychology: 'I was hurt in a crowd at a San Diego event and I do not know who is responsible or whether my ticket waiver ends it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego concert crowd injury lawyer',
      'festival crowd crush claim california',
      'event security negligence california',
      'crowd surge injury lawsuit california',
      'public venue event injury claim deadline',
    ],
    signals: [
      'Crowd-management duty',
      'Layered promoter/venue/security fault',
      'Waiver cannot release gross negligence',
      'Public venue = 6-month claim',
      'Perishable crowd-sourced evidence',
      '2-year PI deadline (private)',
    ],
    sections: {
      whyItMatters: `San Diego hosts massive conventions, waterfront concerts, and stadium and amphitheater events where crowd surges, ingress and egress failures, and heat exposure cause serious injuries. ${PREMISES} ${LAYERED} ${WAIVER} ${PUBLIC} ${EVIDENCE} Some downtown and bayfront venues are publicly owned, so the six-month rule can apply. Civil cases are filed in San Diego County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The event, venue, and whether the venue is public',
        'Attendee video and photographs of the surge or crush',
        'The crowd-management and medical plans',
        'Permits, capacity approvals, and staffing records',
        'Which parties promoted, owned, and secured the event',
        'Any ticket terms or signed waiver',
        'Whether a six-month government claim is required',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the promoter, venue, and security contractor, flags a public venue and its six-month deadline early, preserves crowd-sourced video and the event\u2019s safety plans, and evaluates whether a crush was gross negligence beyond a waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who is responsible for a crowd-crush injury?',
        a: 'Often several parties: the promoter, the venue owner, and the security or crowd-management contractor each owe a duty to plan for and manage the crowd. Responsibility is usually layered, and more than one can share fault.',
      },
      {
        q: 'My ticket had a waiver. Does that end my claim?',
        a: 'Not for gross negligence. A waiver may limit some claims, but it cannot release gross negligence \u2014 an extreme departure from the standard of care. A foreseeable, ignored crush is frequently argued as gross negligence beyond any waiver.',
      },
      {
        q: 'The event was at a public venue. Is the deadline different?',
        a: 'Yes. If the venue is a public entity, a six-month government claim can be required before a lawsuit (Government Code 911.2) \u2014 far shorter than the usual two-year period, so identifying a public owner early is critical.',
      },
      {
        q: 'What evidence matters most?',
        a: 'Attendee video and photos, the crowd-management and medical plans, permits and capacity approvals, staffing records, and internal communications. Much of it is controlled by organizers and can be lost, so it must be preserved quickly.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the crowd-safety facts and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_EVENT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Event Crowd Injury Claims',
    title: 'Sacramento Concert, Festival & Event Crowd Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a crowd surge or crush at a Sacramento concert, festival, or fair? Organizers and security owe a crowd-management duty, and a waiver cannot release gross negligence.',
    psychology: 'I was hurt in a crowd at a Sacramento event and I do not know who is responsible or whether the government deadline applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento concert crowd injury lawyer',
      'festival crowd crush claim california',
      'state fair crowd injury california',
      'crowd surge injury lawsuit california',
      'public venue event injury claim deadline',
    ],
    signals: [
      'Crowd-management duty',
      'Layered promoter/venue/security fault',
      'Waiver cannot release gross negligence',
      'Public venue = 6-month claim',
      'Perishable crowd-sourced evidence',
      '2-year PI deadline (private)',
    ],
    sections: {
      whyItMatters: `Sacramento hosts the state fair, arena concerts, and large downtown festivals, and several venues \u2014 the fairgrounds and city facilities among them \u2014 are publicly owned, which makes the six-month rule a live issue. ${PREMISES} ${LAYERED} ${WAIVER} ${PUBLIC} ${EVIDENCE} Civil cases are filed in Sacramento County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The event, venue, and whether the venue is public',
        'Attendee video and photographs of the surge or crush',
        'The crowd-management and medical plans',
        'Permits, capacity approvals, and staffing records',
        'Which parties promoted, owned, and secured the event',
        'Any ticket terms or signed waiver',
        'Whether a six-month government claim is required',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the promoter, venue, and security contractor, flags a public venue and its six-month deadline early, preserves crowd-sourced video and the event\u2019s safety plans, and evaluates whether a crush was gross negligence beyond a waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The injury was at the state fair. Does the government deadline apply?',
        a: 'Likely. A publicly owned fairground or venue can require a six-month government claim before a lawsuit (Government Code 911.2) \u2014 far shorter than the usual two-year period, so identifying a public owner early is critical.',
      },
      {
        q: 'Who is responsible for a crowd-crush injury?',
        a: 'Often several parties: the promoter, the venue owner, and the security or crowd-management contractor each owe a duty. Responsibility is usually layered, and more than one can share fault.',
      },
      {
        q: 'My ticket had a waiver. Does that end my claim?',
        a: 'Not for gross negligence. A waiver may limit some claims, but it cannot release gross negligence. A foreseeable, ignored crush is frequently argued as gross negligence beyond any waiver.',
      },
      {
        q: 'What evidence matters most?',
        a: 'Attendee video and photos, the crowd-management and medical plans, permits and capacity approvals, staffing records, and internal communications \u2014 much of it controlled by organizers and easily lost.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the crowd-safety facts and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_EVENT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Event Crowd Injury Claims',
    title: 'Oakland Concert, Festival & Event Crowd Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a crowd surge or crush at an Oakland concert, arena event, or festival? Organizers and security owe a crowd-management duty, and a waiver cannot release gross negligence.',
    psychology: 'I was hurt in a crowd at an Oakland event and I do not know who is responsible or whether the government deadline applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland concert crowd injury lawyer',
      'arena crowd crush claim california',
      'event security negligence california',
      'crowd surge injury lawsuit california',
      'public venue event injury claim deadline',
    ],
    signals: [
      'Crowd-management duty',
      'Layered promoter/venue/security fault',
      'Waiver cannot release gross negligence',
      'Public venue = 6-month claim',
      'Perishable crowd-sourced evidence',
      '2-year PI deadline (private)',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s arena and coliseum complex and its downtown and waterfront festivals draw large crowds, and public ownership of the arena complex makes the six-month rule a recurring question. ${PREMISES} ${LAYERED} ${WAIVER} ${PUBLIC} ${EVIDENCE} Civil cases are filed in Alameda County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The event, venue, and whether the venue is public',
        'Attendee video and photographs of the surge or crush',
        'The crowd-management and medical plans',
        'Permits, capacity approvals, and staffing records',
        'Which parties promoted, owned, and secured the event',
        'Any ticket terms or signed waiver',
        'Whether a six-month government claim is required',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the promoter, venue, and security contractor, flags a public venue and its six-month deadline early, preserves crowd-sourced video and the event\u2019s safety plans, and evaluates whether a crush was gross negligence beyond a waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The event was at a public arena. Is the deadline different?',
        a: 'Yes. If the venue is a public entity, a six-month government claim can be required before a lawsuit (Government Code 911.2) \u2014 far shorter than the usual two-year period, so identifying a public owner early is critical.',
      },
      {
        q: 'Who is responsible for a crowd-crush injury?',
        a: 'Often several parties: the promoter, the venue owner, and the security or crowd-management contractor each owe a duty. Responsibility is usually layered, and more than one can share fault.',
      },
      {
        q: 'My ticket had a waiver. Does that end my claim?',
        a: 'Not for gross negligence. A waiver may limit some claims, but it cannot release gross negligence. A foreseeable, ignored crush is frequently argued as gross negligence beyond any waiver.',
      },
      {
        q: 'What evidence matters most?',
        a: 'Attendee video and photos, the crowd-management and medical plans, permits and capacity approvals, staffing records, and internal communications \u2014 much of it controlled by organizers and easily lost.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the crowd-safety facts and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_EVENT_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Event Crowd Injury Claims',
    title: 'San Jose Concert, Festival & Event Crowd Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a crowd surge or crush at a San Jose arena concert, festival, or convention? Organizers and security owe a crowd-management duty, and a waiver cannot release gross negligence.',
    psychology: 'I was hurt in a crowd at a San Jose event and I do not know who is responsible or whether the government deadline applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose concert crowd injury lawyer',
      'arena crowd crush claim california',
      'event security negligence california',
      'crowd surge injury lawsuit california',
      'public venue event injury claim deadline',
    ],
    signals: [
      'Crowd-management duty',
      'Layered promoter/venue/security fault',
      'Waiver cannot release gross negligence',
      'Public venue = 6-month claim',
      'Perishable crowd-sourced evidence',
      '2-year PI deadline (private)',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s arena, convention center, and downtown festivals host major concerts and events, and city ownership of several venues makes the six-month rule a live issue. ${PREMISES} ${LAYERED} ${WAIVER} ${PUBLIC} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The event, venue, and whether the venue is public',
        'Attendee video and photographs of the surge or crush',
        'The crowd-management and medical plans',
        'Permits, capacity approvals, and staffing records',
        'Which parties promoted, owned, and secured the event',
        'Any ticket terms or signed waiver',
        'Whether a six-month government claim is required',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the promoter, venue, and security contractor, flags a public venue and its six-month deadline early, preserves crowd-sourced video and the event\u2019s safety plans, and evaluates whether a crush was gross negligence beyond a waiver. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The event was at a city-owned venue. Is the deadline different?',
        a: 'Yes. If the venue is a public entity, a six-month government claim can be required before a lawsuit (Government Code 911.2) \u2014 far shorter than the usual two-year period, so identifying a public owner early is critical.',
      },
      {
        q: 'Who is responsible for a crowd-crush injury?',
        a: 'Often several parties: the promoter, the venue owner, and the security or crowd-management contractor each owe a duty. Responsibility is usually layered, and more than one can share fault.',
      },
      {
        q: 'My ticket had a waiver. Does that end my claim?',
        a: 'Not for gross negligence. A waiver may limit some claims, but it cannot release gross negligence. A foreseeable, ignored crush is frequently argued as gross negligence beyond any waiver.',
      },
      {
        q: 'What evidence matters most?',
        a: 'Attendee video and photos, the crowd-management and medical plans, permits and capacity approvals, staffing records, and internal communications \u2014 much of it controlled by organizers and easily lost.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the crowd-safety facts and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const eventCrowdCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SD_EVENT_SLUG]: {
    scenario: `A San Diego bayfront concertgoer was injured in a surge at a barrier that had been placed to funnel too many people through one gate. The promoter, venue, and security contractor each faced scrutiny, and a ticket waiver did not release the crush claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; note the venue and gate.'],
      ['First days', 'Gather attendee video; identify the promoter and security.'],
      ['First weeks', 'Demand the crowd-management plan, permits, and staffing.'],
      ['Longer term', 'Check for a public owner and the six-month deadline.'],
    ],
    severityLadder: [
      ['Duty', 'Organizers must manage the crowd.'],
      ['Layered fault', 'Promoter, venue, and security share it.'],
      ['Waiver', 'Gross negligence survives it.'],
      ['Public owner', 'Six-month claim may apply.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the event.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether crowd management was negligent',
      'Which parties share fault',
      'Whether a crush was gross negligence',
      'Whether the venue is public',
      'Whether crowd-sourced evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Duty', copy: 'Organizers must plan for the crowd.' },
      { label: 'Layered fault', copy: 'Several defendants can share it.' },
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
      { label: 'Deadline', copy: 'A public owner shortens it.' },
    ],
    insuranceProblems: [
      'The crowd-sourced video is never gathered.',
      'The crowd-management plan is never demanded.',
      'A public owner\u2019s six-month deadline is missed.',
      'The claim is dropped because a ticket had a waiver.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What event and venue were involved?' },
      { label: 'Step 2', question: 'Is the venue publicly owned?' },
      { label: 'Step 3', question: 'Do you have or know of attendee video?' },
      { label: 'Step 4', question: 'When did the injury happen?' },
    ],
  },
  [SAC_EVENT_SLUG]: {
    scenario: `A visitor was trampled at a Sacramento fairground concert when a gate opened late and the crowd surged. Because the fairground is publicly owned, a six-month government claim controlled the timeline. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; note the venue and gate.'],
      ['First days', 'Confirm the public owner; gather attendee video.'],
      ['First weeks', 'File or preserve the six-month government claim.'],
      ['Longer term', 'Demand the crowd-management plan and staffing.'],
    ],
    severityLadder: [
      ['Duty', 'Organizers must manage the crowd.'],
      ['Public owner', 'Six-month claim applies.'],
      ['Layered fault', 'Promoter, venue, and security share it.'],
      ['Waiver', 'Gross negligence survives it.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the event.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public owner\u2019s deadline applies',
      'Whether crowd management was negligent',
      'Which parties share fault',
      'Whether a crush was gross negligence',
      'Whether crowd-sourced evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Deadline', copy: 'A public fairground shortens it.' },
      { label: 'Duty', copy: 'Organizers must plan for the crowd.' },
      { label: 'Layered fault', copy: 'Several defendants can share it.' },
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
    ],
    insuranceProblems: [
      'A public owner\u2019s six-month deadline is missed.',
      'The crowd-sourced video is never gathered.',
      'The crowd-management plan is never demanded.',
      'The claim is dropped because a ticket had a waiver.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the venue a fairground or public facility?' },
      { label: 'Step 2', question: 'When did the injury happen?' },
      { label: 'Step 3', question: 'Do you have or know of attendee video?' },
      { label: 'Step 4', question: 'What caused the surge?' },
    ],
  },
  [OAK_EVENT_SLUG]: {
    scenario: `An Oakland arena patron was injured in a crush at a poorly staffed exit. The publicly owned complex triggered a six-month claim, and the security contractor and promoter both faced fault. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; note the venue and exit.'],
      ['First days', 'Confirm the public owner; gather attendee video.'],
      ['First weeks', 'File or preserve the six-month government claim.'],
      ['Longer term', 'Demand the crowd-management plan and staffing.'],
    ],
    severityLadder: [
      ['Duty', 'Organizers must manage the crowd.'],
      ['Public owner', 'Six-month claim applies.'],
      ['Layered fault', 'Promoter, venue, and security share it.'],
      ['Waiver', 'Gross negligence survives it.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the event.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public owner\u2019s deadline applies',
      'Whether crowd management was negligent',
      'Which parties share fault',
      'Whether a crush was gross negligence',
      'Whether crowd-sourced evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Deadline', copy: 'A public arena shortens it.' },
      { label: 'Duty', copy: 'Organizers must plan for the crowd.' },
      { label: 'Layered fault', copy: 'Several defendants can share it.' },
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
    ],
    insuranceProblems: [
      'A public owner\u2019s six-month deadline is missed.',
      'The crowd-sourced video is never gathered.',
      'The staffing records are never demanded.',
      'The claim is dropped because a ticket had a waiver.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the venue publicly owned?' },
      { label: 'Step 2', question: 'When did the injury happen?' },
      { label: 'Step 3', question: 'Do you have or know of attendee video?' },
      { label: 'Step 4', question: 'What caused the crush?' },
    ],
  },
  [SJ_EVENT_SLUG]: {
    scenario: `A San Jose arena concertgoer was injured when a general-admission floor was oversold and a surge began. The city-owned venue raised the six-month claim, and the promoter and security contractor shared scrutiny for capacity. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; note the venue and area.'],
      ['First days', 'Confirm the public owner; gather attendee video.'],
      ['First weeks', 'File or preserve the six-month government claim.'],
      ['Longer term', 'Demand the capacity approvals and crowd plan.'],
    ],
    severityLadder: [
      ['Duty', 'Organizers must manage the crowd.'],
      ['Public owner', 'Six-month claim applies.'],
      ['Capacity', 'Overselling shows fault.'],
      ['Waiver', 'Gross negligence survives it.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injury to the event.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public owner\u2019s deadline applies',
      'Whether capacity was oversold',
      'Which parties share fault',
      'Whether a surge was gross negligence',
      'Whether crowd-sourced evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Deadline', copy: 'A city-owned venue shortens it.' },
      { label: 'Capacity', copy: 'Overselling shows fault.' },
      { label: 'Layered fault', copy: 'Several defendants can share it.' },
      { label: 'Waiver has limits', copy: 'Gross negligence survives it.' },
    ],
    insuranceProblems: [
      'A public owner\u2019s six-month deadline is missed.',
      'The capacity approvals are never demanded.',
      'The crowd-sourced video is never gathered.',
      'The claim is dropped because a ticket had a waiver.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the venue city-owned?' },
      { label: 'Step 2', question: 'When did the injury happen?' },
      { label: 'Step 3', question: 'Was the area oversold or overcrowded?' },
      { label: 'Step 4', question: 'Do you have or know of attendee video?' },
    ],
  },
}
