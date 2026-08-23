import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, security-guard / bouncer excessive-force practice area (batch 2):
 * location-specific guides for Oakland, Fresno, Long Beach, and Anaheim,
 * extending the batch-1 hub (Los Angeles, San Diego, Sacramento, San Jose).
 *
 * Applied accurately (identical to batch 1):
 *  - A guard may use only reasonable force; excess is a battery.
 *  - Venue and security company can be vicariously liable and directly liable for
 *    negligent hiring/training/retention/supervision.
 *  - Guards are BSIS-licensed; licensing and training history are relevant.
 *  - Surveillance and bystander video are perishable; preserve fast.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether force was excessive, and who is liable, depend on facts a licensed California attorney should review promptly.'

const FORCE =
  'A security guard or bouncer may use only reasonable force to eject or detain a person, and force beyond what is reasonable under the circumstances is a battery. The central question is whether the force used was reasonable \u2014 a chokehold, a strike after a person was already subdued, or force wildly out of proportion to the situation generally is not.'

const EMPLOYER =
  'Liability does not stop with the guard. Both the venue and the security company can be vicariously liable for a guard acting within the scope of employment, and directly liable for negligent hiring, training, retention, or supervision \u2014 for example, keeping on a guard with a known history of using excessive force. These deeper-pocketed defendants are often central.'

const LICENSING =
  'California security guards are licensed and regulated by the Bureau of Security and Investigative Services (BSIS), which sets training and background requirements. A guard\u2019s BSIS licensing status and history, and whether the security company met its screening and training obligations, are directly relevant to both the battery and the negligent-hiring claims.'

const EVIDENCE =
  'The evidence is often perishable and must be secured quickly: surveillance video from the venue and nearby businesses, any bystander phone video, the incident report, the guard\u2019s BSIS licensing and history, witness contact information, medical records, and any police report. Venue surveillance video is frequently overwritten within days, so a prompt preservation demand matters.'

export const OAK_GUARD_SLUG = '/oakland-security-guard-assault-claim'
export const FRESNO_GUARD_SLUG = '/fresno-security-guard-assault-claim'
export const LB_GUARD_SLUG = '/long-beach-security-guard-assault-claim'
export const ANAHEIM_GUARD_SLUG = '/anaheim-security-guard-assault-claim'

export const securityForceCityGuidePages2: LandingPage[] = [
  {
    slug: OAK_GUARD_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Security Guard & Bouncer Assault Claims',
    title: 'Oakland Security Guard & Bouncer Assault Claims',
    eyebrow: 'California local injury guide',
    description:
      'Beaten or choked by a bouncer or security guard in Oakland? Force beyond what is reasonable is a battery \u2014 and the venue and security company can be liable too.',
    psychology: 'A bouncer hurt me at an Oakland venue and I do not know whether the force was legal or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland bouncer assault lawyer',
      'security guard excessive force claim california',
      'nightclub chokehold injury california',
      'negligent hiring security guard california',
      'bsis guard license history california',
    ],
    signals: [
      'Only reasonable force is allowed',
      'Excess is a battery',
      'Venue + security company liable',
      'Negligent hiring / training',
      'BSIS licensing history',
      'Perishable venue video',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s Uptown and Jack London nightlife keeps bouncers busy, and ejections that turn into chokeholds or strikes after a patron is subdued produce serious injuries. ${FORCE} ${EMPLOYER} ${LICENSING} ${EVIDENCE} Civil cases are filed in Alameda County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Exactly what force was used and when',
        'Whether you were already subdued',
        'Venue and nearby-business surveillance video',
        'Any bystander phone video',
        'The incident report and any police report',
        'The guard\u2019s BSIS license and history',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ sends a fast preservation demand for the venue video, pursues the venue and the security company for negligent hiring and supervision, and pulls the guard\u2019s BSIS licensing history. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'When is a bouncer\u2019s force illegal?',
        a: 'A guard may use only reasonable force to eject or detain. Force beyond what is reasonable \u2014 a chokehold, a strike after you were already subdued, or force wildly out of proportion \u2014 is a battery.',
      },
      {
        q: 'Can I sue the club, not just the bouncer?',
        a: 'Often yes. The venue and the security company can be vicariously liable for a guard acting within the scope of employment, and directly liable for negligent hiring, training, retention, or supervision.',
      },
      {
        q: 'Does the guard\u2019s license matter?',
        a: 'Yes. California guards are licensed by BSIS. The guard\u2019s licensing status and history, and whether the company met its screening and training obligations, are directly relevant to both the battery and negligent-hiring claims.',
      },
      {
        q: 'How fast do I need to act on video?',
        a: 'Quickly. Venue surveillance video is frequently overwritten within days, so a prompt preservation demand is important \u2014 along with any bystander phone video.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the video and licensing evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_GUARD_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Security Guard & Bouncer Assault Claims',
    title: 'Fresno Security Guard & Bouncer Assault Claims',
    eyebrow: 'California local injury guide',
    description:
      'Beaten or choked by a bouncer or security guard in Fresno? Force beyond what is reasonable is a battery \u2014 and the venue and security company can be liable too.',
    psychology: 'A bouncer hurt me at a Fresno venue and I do not know whether the force was legal or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno bouncer assault lawyer',
      'security guard excessive force claim california',
      'nightclub chokehold injury california',
      'negligent hiring security guard california',
      'bsis guard license history california',
    ],
    signals: [
      'Only reasonable force is allowed',
      'Excess is a battery',
      'Venue + security company liable',
      'Negligent hiring / training',
      'BSIS licensing history',
      'Perishable venue video',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s Tower District bars and event venues rely on bouncers and contract guards, and ejections that escalate into excessive force cause serious injuries. ${FORCE} ${EMPLOYER} ${LICENSING} ${EVIDENCE} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Exactly what force was used and when',
        'Whether you were already subdued',
        'Venue and nearby-business surveillance video',
        'Any bystander phone video',
        'The incident report and any police report',
        'The guard\u2019s BSIS license and history',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ sends a fast preservation demand for the venue video, pursues the venue and the security company for negligent hiring and supervision, and pulls the guard\u2019s BSIS licensing history. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'When is a bouncer\u2019s force illegal?',
        a: 'A guard may use only reasonable force to eject or detain. Force beyond what is reasonable \u2014 a chokehold, a strike after you were already subdued, or force wildly out of proportion \u2014 is a battery.',
      },
      {
        q: 'Can I sue the venue, not just the bouncer?',
        a: 'Often yes. The venue and the security company can be vicariously liable for a guard acting within the scope of employment, and directly liable for negligent hiring, training, retention, or supervision.',
      },
      {
        q: 'Does the guard\u2019s license matter?',
        a: 'Yes. The guard\u2019s BSIS licensing status and history, and whether the company met its screening and training obligations, are directly relevant to both the battery and negligent-hiring claims.',
      },
      {
        q: 'How fast do I need to act on video?',
        a: 'Quickly. Venue surveillance video is frequently overwritten within days, so a prompt preservation demand is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the video and licensing evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_GUARD_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Security Guard & Bouncer Assault Claims',
    title: 'Long Beach Security Guard & Bouncer Assault Claims',
    eyebrow: 'California local injury guide',
    description:
      'Beaten or choked by a bouncer or security guard in Long Beach? Force beyond what is reasonable is a battery \u2014 and the venue and security company can be liable too.',
    psychology: 'A bouncer hurt me at a Long Beach venue and I do not know whether the force was legal or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach bouncer assault lawyer',
      'security guard excessive force claim california',
      'nightclub chokehold injury california',
      'negligent hiring security guard california',
      'bsis guard license history california',
    ],
    signals: [
      'Only reasonable force is allowed',
      'Excess is a battery',
      'Venue + security company liable',
      'Negligent hiring / training',
      'BSIS licensing history',
      'Perishable venue video',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s Pine Avenue nightlife and waterfront event venues keep bouncers and contract guards busy, and ejections that turn violent produce serious injuries. ${FORCE} ${EMPLOYER} ${LICENSING} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Exactly what force was used and when',
        'Whether you were already subdued',
        'Venue and nearby-business surveillance video',
        'Any bystander phone video',
        'The incident report and any police report',
        'The guard\u2019s BSIS license and history',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ sends a fast preservation demand for the venue video, pursues the venue and the security company for negligent hiring and supervision, and pulls the guard\u2019s BSIS licensing history. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'When is a bouncer\u2019s force illegal?',
        a: 'A guard may use only reasonable force to eject or detain. Force beyond what is reasonable \u2014 a chokehold, a strike after you were already subdued, or force wildly out of proportion \u2014 is a battery.',
      },
      {
        q: 'Can I sue the club, not just the bouncer?',
        a: 'Often yes. The venue and the security company can be vicariously liable, and directly liable for negligent hiring, training, retention, or supervision.',
      },
      {
        q: 'Does the guard\u2019s license matter?',
        a: 'Yes. The guard\u2019s BSIS licensing status and history, and whether the company met its screening and training obligations, are directly relevant to both the battery and negligent-hiring claims.',
      },
      {
        q: 'How fast do I need to act on video?',
        a: 'Quickly. Venue surveillance video is frequently overwritten within days, so a prompt preservation demand is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the video and licensing evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_GUARD_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Security Guard & Bouncer Assault Claims',
    title: 'Anaheim Security Guard & Bouncer Assault Claims',
    eyebrow: 'California local injury guide',
    description:
      'Beaten or choked by a security guard or bouncer at an Anaheim venue, resort, or event? Force beyond what is reasonable is a battery \u2014 and the venue and security company can be liable too.',
    psychology: 'A guard hurt me at an Anaheim venue and I do not know whether the force was legal or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim security guard assault lawyer',
      'security guard excessive force claim california',
      'event venue guard chokehold injury california',
      'negligent hiring security guard california',
      'bsis guard license history california',
    ],
    signals: [
      'Only reasonable force is allowed',
      'Excess is a battery',
      'Venue + security company liable',
      'Negligent hiring / training',
      'BSIS licensing history',
      'Perishable venue video',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s resort corridor, stadium, arena, and convention venues employ large numbers of contract guards, and force used to eject or detain patrons that goes beyond reasonable produces serious injuries. ${FORCE} ${EMPLOYER} ${LICENSING} ${EVIDENCE} Civil cases are filed in Orange County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Exactly what force was used and when',
        'Whether you were already subdued',
        'Venue and nearby-business surveillance video',
        'Any bystander phone video',
        'The incident report and any police report',
        'The guard\u2019s BSIS license and history',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ sends a fast preservation demand for the venue video, pursues the venue and the security company for negligent hiring and supervision, and pulls the guard\u2019s BSIS licensing history. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'When is a guard\u2019s force illegal?',
        a: 'A guard may use only reasonable force to eject or detain. Force beyond what is reasonable \u2014 a chokehold, a strike after you were already subdued, or force wildly out of proportion \u2014 is a battery.',
      },
      {
        q: 'Can I sue the venue, not just the guard?',
        a: 'Often yes. The venue and the security company can be vicariously liable, and directly liable for negligent hiring, training, retention, or supervision.',
      },
      {
        q: 'Does the guard\u2019s license matter?',
        a: 'Yes. The guard\u2019s BSIS licensing status and history, and whether the company met its screening and training obligations, are directly relevant to both the battery and negligent-hiring claims.',
      },
      {
        q: 'How fast do I need to act on video?',
        a: 'Quickly. Venue surveillance video is frequently overwritten within days, so a prompt preservation demand is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the video and licensing evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const securityForceCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [OAK_GUARD_SLUG]: {
    scenario: `An Oakland patron was put in a chokehold by a bouncer after he had already stopped resisting. Bystander video and the guard\u2019s prior excessive-force complaints supported battery and negligent-retention claims. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; identify the venue and guard.'],
      ['First days', 'Send a preservation demand for venue video.'],
      ['First weeks', 'Pull the guard\u2019s BSIS history; find witnesses.'],
      ['Longer term', 'Develop negligent-hiring and battery claims.'],
    ],
    severityLadder: [
      ['Reasonable force', 'Allowed to eject or detain.'],
      ['Excess', 'A chokehold is a battery.'],
      ['Employer', 'Venue and company can be liable.'],
      ['Licensing', 'BSIS history matters.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the force was excessive',
      'Whether you were already subdued',
      'Whether venue video was preserved',
      'Whether negligent hiring applies',
      'The guard\u2019s BSIS history',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Excess', copy: 'A chokehold is generally a battery.' },
      { label: 'Employer', copy: 'Venue and company are deeper pockets.' },
      { label: 'Licensing', copy: 'BSIS history supports negligent hiring.' },
      { label: 'Evidence', copy: 'Venue video is perishable.' },
    ],
    insuranceProblems: [
      'The venue video is overwritten before a demand.',
      'The guard\u2019s BSIS history is never pulled.',
      'Only the guard, not the company, is pursued.',
      'Witnesses are never contacted.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What force did the guard use?' },
      { label: 'Step 2', question: 'Were you already subdued?' },
      { label: 'Step 3', question: 'Is there any video?' },
      { label: 'Step 4', question: 'Which venue and company was it?' },
    ],
  },
  [FRESNO_GUARD_SLUG]: {
    scenario: `A Fresno bar patron was struck by a bouncer during an ejection and suffered a facial fracture. The venue video and the security company\u2019s thin training records supported the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; identify the venue and guard.'],
      ['First days', 'Send a preservation demand for venue video.'],
      ['First weeks', 'Pull the guard\u2019s BSIS history; find witnesses.'],
      ['Longer term', 'Develop negligent-training and battery claims.'],
    ],
    severityLadder: [
      ['Reasonable force', 'Allowed to eject or detain.'],
      ['Excess', 'A strike can be a battery.'],
      ['Employer', 'Venue and company can be liable.'],
      ['Licensing', 'BSIS history matters.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Fractures are documented.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the force was excessive',
      'Whether venue video was preserved',
      'Whether training was inadequate',
      'The guard\u2019s BSIS history',
      'Whether negligent hiring applies',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Excess', copy: 'A strike can be a battery.' },
      { label: 'Employer', copy: 'Venue and company are deeper pockets.' },
      { label: 'Training', copy: 'Thin records support negligence.' },
      { label: 'Evidence', copy: 'Venue video is perishable.' },
    ],
    insuranceProblems: [
      'The venue video is overwritten before a demand.',
      'The training records are never requested.',
      'Only the guard is pursued.',
      'Witnesses are never contacted.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What force did the guard use?' },
      { label: 'Step 2', question: 'Is there any video?' },
      { label: 'Step 3', question: 'Which venue and company was it?' },
      { label: 'Step 4', question: 'When did it happen?' },
    ],
  },
  [LB_GUARD_SLUG]: {
    scenario: `A Long Beach club patron was slammed to the ground by a bouncer after being ejected. Nearby-business video captured the assault, and the security company\u2019s retention of a guard with prior complaints framed the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; identify the venue and guard.'],
      ['First days', 'Send a preservation demand for venue and nearby video.'],
      ['First weeks', 'Pull the guard\u2019s BSIS history; find witnesses.'],
      ['Longer term', 'Develop negligent-retention and battery claims.'],
    ],
    severityLadder: [
      ['Reasonable force', 'Allowed to eject or detain.'],
      ['Excess', 'A takedown after ejection is a battery.'],
      ['Employer', 'Venue and company can be liable.'],
      ['Licensing', 'BSIS history matters.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the force was excessive',
      'Whether you were already ejected',
      'Whether video was preserved',
      'Whether negligent retention applies',
      'The guard\u2019s BSIS history',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Excess', copy: 'A takedown after ejection is a battery.' },
      { label: 'Employer', copy: 'Venue and company are deeper pockets.' },
      { label: 'Retention', copy: 'Keeping a known guard is negligence.' },
      { label: 'Evidence', copy: 'Nearby video is perishable.' },
    ],
    insuranceProblems: [
      'The video is overwritten before a demand.',
      'The guard\u2019s prior complaints are never found.',
      'Only the guard is pursued.',
      'Witnesses are never contacted.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What force did the guard use?' },
      { label: 'Step 2', question: 'Were you already ejected?' },
      { label: 'Step 3', question: 'Is there any video?' },
      { label: 'Step 4', question: 'Which venue and company was it?' },
    ],
  },
  [ANAHEIM_GUARD_SLUG]: {
    scenario: `An Anaheim event-venue guard used a prohibited restraint on a patron who posed no threat. The venue\u2019s surveillance and the contract company\u2019s screening failures supported battery and negligent-hiring claims. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; identify the venue and company.'],
      ['First days', 'Send a preservation demand for venue video.'],
      ['First weeks', 'Pull the guard\u2019s BSIS history; find witnesses.'],
      ['Longer term', 'Develop negligent-hiring and battery claims.'],
    ],
    severityLadder: [
      ['Reasonable force', 'Allowed to eject or detain.'],
      ['Excess', 'A prohibited restraint is a battery.'],
      ['Employer', 'Venue and company can be liable.'],
      ['Licensing', 'BSIS history matters.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the force was excessive',
      'Whether the patron posed a threat',
      'Whether venue video was preserved',
      'Whether negligent hiring applies',
      'The guard\u2019s BSIS history',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Excess', copy: 'A prohibited restraint is a battery.' },
      { label: 'Employer', copy: 'Venue and company are deeper pockets.' },
      { label: 'Licensing', copy: 'BSIS history supports negligent hiring.' },
      { label: 'Evidence', copy: 'Venue video is perishable.' },
    ],
    insuranceProblems: [
      'The venue video is overwritten before a demand.',
      'The guard\u2019s BSIS history is never pulled.',
      'Only the guard is pursued.',
      'Witnesses are never contacted.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What force did the guard use?' },
      { label: 'Step 2', question: 'Did you pose any threat?' },
      { label: 'Step 3', question: 'Is there any video?' },
      { label: 'Step 4', question: 'Which venue and company was it?' },
    ],
  },
}
