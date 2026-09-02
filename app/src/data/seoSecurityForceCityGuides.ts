import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, excessive-force-by-security-guard / bouncer practice area:
 * location-specific guides for Los Angeles, San Diego, Sacramento, and San Jose.
 *
 * This is distinct from a negligent-security claim (where a venue fails to
 * protect a guest from a third party): here the guard or bouncer is the one who
 * caused the harm. It combines an intentional-tort (battery) claim with the
 * venue\u2019s and the security company\u2019s liability for hiring, training, and
 * supervising that person.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: a dense nightlife, concert, and retail loss-prevention scene.
 *  - San Diego: the Gaslamp Quarter and beach-bar nightlife.
 *  - Sacramento: downtown nightlife and arena-event venues.
 *  - San Jose: downtown clubs and large event venues.
 *
 * Applied accurately:
 *  - A guard or bouncer may use only reasonable force to eject or detain a
 *    person; force beyond what is reasonable under the circumstances is a
 *    battery. The central question is whether the force used was reasonable.
 *  - Both the venue and the security company can be vicariously liable for a
 *    guard acting within the scope of employment, and directly liable for
 *    negligent hiring, training, retention, or supervision.
 *  - California security guards are licensed and regulated by the Bureau of
 *    Security and Investigative Services (BSIS), with training and background
 *    requirements; a guard\u2019s history and the company\u2019s screening are relevant.
 *  - The evidence is often perishable: surveillance and phone video, incident
 *    reports, the guard\u2019s BSIS licensing and history, witnesses, medical
 *    records, and any police report \u2014 and venue video is frequently overwritten
 *    within days. The deadline is generally two years (Code of Civil Procedure
 *    section 335.1).
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

export const LA_GUARD_SLUG = '/los-angeles-security-guard-assault-claim'
export const SD_GUARD_SLUG = '/san-diego-security-guard-assault-claim'
export const SAC_GUARD_SLUG = '/sacramento-security-guard-assault-claim'
export const SJ_GUARD_SLUG = '/san-jose-security-guard-assault-claim'

export const securityForceCityGuidePages: LandingPage[] = [
  {
    slug: LA_GUARD_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Security Guard & Bouncer Assault Claims',
    title: 'Los Angeles Security Guard & Bouncer Assault Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a bouncer or security guard in LA? Only reasonable force is allowed \u2014 and the venue and security company may be liable too. Video is often erased fast.',
    psychology: 'A bouncer or guard hurt me at an LA venue and I do not know if that was allowed or who I can hold responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles bouncer assault lawyer',
      'security guard excessive force claim california',
      'beaten by bouncer lawsuit california',
      'nightclub security injury attorney california',
      'negligent hiring security guard california',
    ],
    signals: [
      'Only reasonable force allowed',
      'Venue & security company liability',
      'Negligent hiring / training',
      'BSIS licensing & guard history',
      'Preserve venue & phone video',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s dense nightlife, concert, and retail loss-prevention scene means encounters with bouncers and security guards are common \u2014 and when one uses force beyond what the situation called for, the harm can be serious and the responsibility broad. ${FORCE} ${EMPLOYER} ${LICENSING} ${EVIDENCE} The deadline is generally two years. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Exactly what happened and what force was used',
        'The venue and the security company involved',
        'Surveillance and bystander phone video \u2014 preserve it now',
        'The guard\u2019s identity and BSIS licensing/history',
        'Witness names and contact information',
        'Any police report and incident report',
        'Medical treatment from the injury onward',
        'Whether the guard had a known history of force',
      ],
      howClearCaseHelps: `ClearCaseIQ moves fast to demand preservation of the LA venue\u2019s surveillance video, identifies the guard and the security company, checks BSIS licensing and history, and frames both the battery and the negligent-hiring claims. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Was the bouncer allowed to use force on me?',
        a: 'Only reasonable force to eject or detain you. Force beyond what is reasonable under the circumstances \u2014 a chokehold, a strike after you were already subdued, or force wildly out of proportion \u2014 is generally a battery. The central question is whether the force was reasonable.',
      },
      {
        q: 'Can I hold the club or security company responsible, not just the guard?',
        a: 'Often yes. Both the venue and the security company can be vicariously liable for a guard acting within the scope of employment, and directly liable for negligent hiring, training, retention, or supervision \u2014 for example, keeping a guard with a known history of excessive force. These defendants are frequently central.',
      },
      {
        q: 'What should I do right away?',
        a: 'Preserve the video. Venue surveillance is frequently overwritten within days, so a prompt written preservation demand is important, along with saving any bystander phone video, getting witness contact information, and seeking medical care that documents the injuries.',
      },
      {
        q: 'Does the guard\u2019s license matter?',
        a: 'Yes. California guards are licensed and regulated by the Bureau of Security and Investigative Services (BSIS). The guard\u2019s licensing status and history, and whether the company met its screening and training duties, are directly relevant to the claims.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the evidence, the parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_GUARD_SLUG,
    category: 'Cities',
    cluster: 'San Diego Security Guard & Bouncer Assault Claims',
    title: 'San Diego Security Guard & Bouncer Assault Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a bouncer in San Diego\u2019s Gaslamp or a beach bar? Only reasonable force is allowed \u2014 and the venue and security company may be liable too.',
    psychology: 'A bouncer hurt me in the Gaslamp and I do not know if that was allowed or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego bouncer assault lawyer',
      'security guard excessive force claim california',
      'gaslamp nightclub injury lawsuit california',
      'beaten by bouncer attorney california',
      'negligent hiring security guard california',
    ],
    signals: [
      'Only reasonable force allowed',
      'Venue & security company liability',
      'Negligent hiring / training',
      'BSIS licensing & guard history',
      'Preserve venue & phone video',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s Gaslamp Quarter and beach-bar nightlife concentrate large crowds and heavy security presence, where a bouncer\u2019s use of excessive force can cause serious injury \u2014 and where responsibility often extends to the venue and the security company. ${FORCE} ${EMPLOYER} ${LICENSING} ${EVIDENCE} The deadline is generally two years. Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Exactly what happened and what force was used',
        'The venue and the security company involved',
        'Surveillance and bystander phone video \u2014 preserve it now',
        'The guard\u2019s identity and BSIS licensing/history',
        'Witness names and contact information',
        'Any police report and incident report',
        'Medical treatment from the injury onward',
        'Whether the guard had a known history of force',
      ],
      howClearCaseHelps: `ClearCaseIQ demands preservation of the San Diego venue\u2019s surveillance video, identifies the guard and the security company, checks BSIS licensing and history, and frames both the battery and the negligent-hiring claims. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Was the bouncer allowed to use force on me?',
        a: 'Only reasonable force to eject or detain you. Force beyond what is reasonable \u2014 a chokehold, a strike after you were subdued, or force out of proportion \u2014 is generally a battery. Whether the force was reasonable is the central question.',
      },
      {
        q: 'Can I hold the venue or security company responsible?',
        a: 'Often yes. Both can be vicariously liable for a guard within the scope of employment, and directly liable for negligent hiring, training, retention, or supervision. These defendants are frequently central to the case.',
      },
      {
        q: 'What should I do right away?',
        a: 'Preserve the video, which is often overwritten within days, and save any bystander phone video, get witness contact information, and seek medical care documenting the injuries.',
      },
      {
        q: 'Does the guard\u2019s license matter?',
        a: 'Yes. California guards are licensed by the Bureau of Security and Investigative Services (BSIS). The guard\u2019s history and whether the company met its screening and training duties are directly relevant.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_GUARD_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Security Guard & Bouncer Assault Claims',
    title: 'Sacramento Security Guard & Bouncer Assault Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a bouncer or guard at a Sacramento club or arena event? Only reasonable force is allowed \u2014 and the venue and security company may be liable too.',
    psychology: 'A guard hurt me at a Sacramento venue and I do not know if that was allowed or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento bouncer assault lawyer',
      'security guard excessive force claim california',
      'nightclub security injury lawsuit california',
      'arena event security force attorney california',
      'negligent hiring security guard california',
    ],
    signals: [
      'Only reasonable force allowed',
      'Venue & security company liability',
      'Negligent hiring / training',
      'BSIS licensing & guard history',
      'Preserve venue & phone video',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s downtown nightlife and arena-event venues bring large crowds under heavy security, and a guard who uses excessive force at a club or an event can cause serious harm for which the venue and the security company may share responsibility. ${FORCE} ${EMPLOYER} ${LICENSING} ${EVIDENCE} The deadline is generally two years. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Exactly what happened and what force was used',
        'The venue and the security company involved',
        'Surveillance and bystander phone video \u2014 preserve it now',
        'The guard\u2019s identity and BSIS licensing/history',
        'Witness names and contact information',
        'Any police report and incident report',
        'Medical treatment from the injury onward',
        'Whether the guard had a known history of force',
      ],
      howClearCaseHelps: `ClearCaseIQ demands preservation of the Sacramento venue\u2019s surveillance video, identifies the guard and the security company, checks BSIS licensing and history, and frames both the battery and the negligent-hiring claims. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Was the guard allowed to use force on me?',
        a: 'Only reasonable force to eject or detain you. Force beyond what is reasonable \u2014 a chokehold, a strike after you were subdued, or force out of proportion \u2014 is generally a battery. Whether the force was reasonable is the central question.',
      },
      {
        q: 'Can I hold the venue or security company responsible?',
        a: 'Often yes. Both can be vicariously liable for a guard within the scope of employment, and directly liable for negligent hiring, training, retention, or supervision. These defendants are frequently central.',
      },
      {
        q: 'What should I do right away?',
        a: 'Preserve the video, which is often overwritten within days, and save any bystander phone video, get witness contact information, and seek medical care documenting the injuries.',
      },
      {
        q: 'Does the guard\u2019s license matter?',
        a: 'Yes. California guards are licensed by the Bureau of Security and Investigative Services (BSIS). The guard\u2019s history and whether the company met its screening and training duties are directly relevant.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_GUARD_SLUG,
    category: 'Cities',
    cluster: 'San Jose Security Guard & Bouncer Assault Claims',
    title: 'San Jose Security Guard & Bouncer Assault Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a bouncer or guard at a San Jose club or event venue? Only reasonable force is allowed \u2014 and the venue and security company may be liable too.',
    psychology: 'A guard hurt me at a San Jose venue and I do not know if that was allowed or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose bouncer assault lawyer',
      'security guard excessive force claim california',
      'nightclub security injury lawsuit california',
      'event venue security force attorney california',
      'negligent hiring security guard california',
    ],
    signals: [
      'Only reasonable force allowed',
      'Venue & security company liability',
      'Negligent hiring / training',
      'BSIS licensing & guard history',
      'Preserve venue & phone video',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s downtown clubs and large event venues employ substantial security, and when a guard or bouncer uses more force than the situation called for, the injury can be serious and responsibility can reach the venue and the security company. ${FORCE} ${EMPLOYER} ${LICENSING} ${EVIDENCE} The deadline is generally two years. Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'Exactly what happened and what force was used',
        'The venue and the security company involved',
        'Surveillance and bystander phone video \u2014 preserve it now',
        'The guard\u2019s identity and BSIS licensing/history',
        'Witness names and contact information',
        'Any police report and incident report',
        'Medical treatment from the injury onward',
        'Whether the guard had a known history of force',
      ],
      howClearCaseHelps: `ClearCaseIQ demands preservation of the San Jose venue\u2019s surveillance video, identifies the guard and the security company, checks BSIS licensing and history, and frames both the battery and the negligent-hiring claims. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Was the guard allowed to use force on me?',
        a: 'Only reasonable force to eject or detain you. Force beyond what is reasonable \u2014 a chokehold, a strike after you were subdued, or force out of proportion \u2014 is generally a battery. Whether the force was reasonable is the central question.',
      },
      {
        q: 'Can I hold the venue or security company responsible?',
        a: 'Often yes. Both can be vicariously liable for a guard within the scope of employment, and directly liable for negligent hiring, training, retention, or supervision. These defendants are frequently central.',
      },
      {
        q: 'What should I do right away?',
        a: 'Preserve the video, which is often overwritten within days, and save any bystander phone video, get witness contact information, and seek medical care documenting the injuries.',
      },
      {
        q: 'Does the guard\u2019s license matter?',
        a: 'Yes. California guards are licensed by the Bureau of Security and Investigative Services (BSIS). The guard\u2019s history and whether the company met its screening and training duties are directly relevant.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the parties, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const securityForceCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_GUARD_SLUG]: {
    scenario: `An LA club patron was struck repeatedly by a bouncer after already being restrained. A preservation demand saved the surveillance video, and the guard\u2019s BSIS history supported a negligent-retention claim against the venue. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical care; note the guard, venue, and witnesses.'],
      ['First days', 'Send a video-preservation demand; save phone video.'],
      ['First weeks', 'Identify the security company; check BSIS history.'],
      ['Longer term', 'Battery and negligent-hiring claims developed.'],
    ],
    severityLadder: [
      ['Reasonable force?', 'Force beyond it is battery.'],
      ['Employer liability', 'Venue and company may answer.'],
      ['Guard history', 'A pattern supports negligent retention.'],
      ['Evidence', 'Video must be preserved fast.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the force was unreasonable',
      'Whether video captured the incident',
      'Whether the venue/company is liable',
      'Whether the guard had a known history',
      'Whether witnesses are identified',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Force is the issue', copy: 'Excess force is battery.' },
      { label: 'Deep pockets', copy: 'Venue and company can answer.' },
      { label: 'Preserve video', copy: 'It is often erased in days.' },
      { label: 'History matters', copy: 'A pattern shows negligent retention.' },
    ],
    insuranceProblems: [
      'Surveillance video is overwritten before preservation.',
      'Only the guard, not the venue/company, is pursued.',
      'The guard\u2019s BSIS history is never checked.',
      'Witnesses are never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What force did the guard use?' },
      { label: 'Step 2', question: 'What venue and security company were involved?' },
      { label: 'Step 3', question: 'Is there any video?' },
      { label: 'Step 4', question: 'Were there witnesses?' },
    ],
  },
  [SD_GUARD_SLUG]: {
    scenario: `A San Diego Gaslamp patron was injured by a bouncer\u2019s chokehold. Bystander phone video and the venue\u2019s surveillance, preserved early, established the force was unreasonable. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical care; note the guard, venue, and witnesses.'],
      ['First days', 'Send a video-preservation demand; save phone video.'],
      ['First weeks', 'Identify the security company; check BSIS history.'],
      ['Longer term', 'Battery and negligent-hiring claims developed.'],
    ],
    severityLadder: [
      ['Reasonable force?', 'A chokehold is often not.'],
      ['Employer liability', 'Venue and company may answer.'],
      ['Guard history', 'A pattern supports negligent retention.'],
      ['Evidence', 'Video must be preserved fast.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the force was unreasonable',
      'Whether video captured the incident',
      'Whether the venue/company is liable',
      'Whether the guard had a known history',
      'Whether witnesses are identified',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Force is the issue', copy: 'Excess force is battery.' },
      { label: 'Deep pockets', copy: 'Venue and company can answer.' },
      { label: 'Preserve video', copy: 'It is often erased in days.' },
      { label: 'Phone video helps', copy: 'Bystanders often capture it.' },
    ],
    insuranceProblems: [
      'Surveillance video is overwritten before preservation.',
      'Only the guard is pursued.',
      'The guard\u2019s BSIS history is never checked.',
      'Witnesses are never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What force did the guard use?' },
      { label: 'Step 2', question: 'What venue and security company were involved?' },
      { label: 'Step 3', question: 'Is there any video?' },
      { label: 'Step 4', question: 'Were there witnesses?' },
    ],
  },
  [SAC_GUARD_SLUG]: {
    scenario: `A Sacramento arena-event guest was thrown to the ground by event security. The venue\u2019s and contractor\u2019s records, plus the guard\u2019s BSIS history, framed both battery and negligent-hiring claims. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical care; note the guard, venue, and witnesses.'],
      ['First days', 'Send a video-preservation demand; save phone video.'],
      ['First weeks', 'Identify the security company; check BSIS history.'],
      ['Longer term', 'Battery and negligent-hiring claims developed.'],
    ],
    severityLadder: [
      ['Reasonable force?', 'Force beyond it is battery.'],
      ['Employer liability', 'Venue and company may answer.'],
      ['Guard history', 'A pattern supports negligent retention.'],
      ['Evidence', 'Video must be preserved fast.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the force was unreasonable',
      'Whether video captured the incident',
      'Whether the venue/company is liable',
      'Whether the guard had a known history',
      'Whether witnesses are identified',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Force is the issue', copy: 'Excess force is battery.' },
      { label: 'Deep pockets', copy: 'Venue and company can answer.' },
      { label: 'Preserve video', copy: 'It is often erased in days.' },
      { label: 'History matters', copy: 'A pattern shows negligent retention.' },
    ],
    insuranceProblems: [
      'Surveillance video is overwritten before preservation.',
      'Only the guard is pursued.',
      'The guard\u2019s BSIS history is never checked.',
      'Witnesses are never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What force did the guard use?' },
      { label: 'Step 2', question: 'What venue and security company were involved?' },
      { label: 'Step 3', question: 'Is there any video?' },
      { label: 'Step 4', question: 'Were there witnesses?' },
    ],
  },
  [SJ_GUARD_SLUG]: {
    scenario: `A San Jose club patron was injured when a bouncer struck him after he was already outside. The preserved video showed the force was gratuitous, and the security company\u2019s training records supported the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical care; note the guard, venue, and witnesses.'],
      ['First days', 'Send a video-preservation demand; save phone video.'],
      ['First weeks', 'Identify the security company; check BSIS history.'],
      ['Longer term', 'Battery and negligent-hiring claims developed.'],
    ],
    severityLadder: [
      ['Reasonable force?', 'Force after ejection is often not.'],
      ['Employer liability', 'Venue and company may answer.'],
      ['Training', 'Poor training supports direct liability.'],
      ['Evidence', 'Video must be preserved fast.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings document severity.' },
      { label: 'Continuing care', copy: 'Consistency supports the claim.' },
      { label: 'Documentation', copy: 'Bills and any future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the force was unreasonable',
      'Whether video captured the incident',
      'Whether the venue/company is liable',
      'Whether training or screening was inadequate',
      'Whether witnesses are identified',
      'Injury severity and treatment',
    ],
    settlementValueDetails: [
      { label: 'Force is the issue', copy: 'Excess force is battery.' },
      { label: 'Deep pockets', copy: 'Venue and company can answer.' },
      { label: 'Preserve video', copy: 'It is often erased in days.' },
      { label: 'Training matters', copy: 'Poor training supports liability.' },
    ],
    insuranceProblems: [
      'Surveillance video is overwritten before preservation.',
      'Only the guard is pursued.',
      'The company\u2019s training records are never obtained.',
      'Witnesses are never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What force did the guard use, and when?' },
      { label: 'Step 2', question: 'What venue and security company were involved?' },
      { label: 'Step 3', question: 'Is there any video?' },
      { label: 'Step 4', question: 'Were there witnesses?' },
    ],
  },
}
