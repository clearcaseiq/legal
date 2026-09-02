import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, negligent-security practice area: city-specific guides for Los
 * Angeles, Oakland, San Francisco, and San Diego.
 *
 * A new practice area for the geo hub, distinct from slip-and-fall: negligent
 * security is about a property owner's duty to take reasonable measures to
 * protect people from FORESEEABLE third-party crime (an assault, robbery, or
 * shooting) at apartments, bars and clubs, parking structures, hotels, and
 * retail. This is a sensitive, trauma-adjacent topic and the copy is written
 * with care and without sensationalism.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: nightlife venues, large parking structures, and sprawling
 *    apartment complexes where foreseeability turns on prior similar incidents.
 *  - Oakland: apartment complexes and businesses where security measures and a
 *    property's incident history are central.
 *  - San Francisco: hotels, parking garages, and transit-adjacent properties in
 *    a dense downtown.
 *  - San Diego: the Gaslamp nightlife district and hotels drawing large crowds.
 *
 * Applied accurately:
 *  - A landowner owes a duty of reasonable care that can include protecting
 *    lawful visitors from foreseeable criminal acts of third parties. California
 *    ties the scope of that duty to foreseeability: the more foreseeable the
 *    harm (for example, from prior similar incidents), the greater the burden a
 *    reasonable owner must undertake, and costly measures such as security
 *    guards generally require heightened foreseeability (Ann M. v. Pacific Plaza
 *    Shopping Center; Delgado v. Trax Bar & Grill).
 *  - The property's history of prior similar crimes, the adequacy of lighting,
 *    locks, cameras, and guards, and any ignored warnings are the core facts.
 *  - The criminal is also responsible, but is often unidentified or unable to
 *    pay, which is why the property owner's responsibility matters.
 *  - Pure comparative negligence, and the two-year personal-injury deadline
 *    (Code of Civil Procedure section 335.1), with the six-month Government
 *    Claims Act deadline where a public entity is involved.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether the harm was foreseeable, what security measures were reasonable, and how comparative fault is assessed depend on facts a licensed California attorney should review promptly.'

const DUTY =
  'A property owner in California owes lawful visitors a duty of reasonable care, and that duty can include taking reasonable measures to protect them from foreseeable criminal acts by third parties. The scope of the duty is tied to foreseeability: the more foreseeable the harm \u2014 for example, from prior similar incidents at or near the property \u2014 the more a reasonable owner is expected to do. Costly measures such as security guards generally require heightened foreseeability, while lower-cost measures like adequate lighting and working locks can be required on a lesser showing.'

const FORESEEABILITY =
  'The heart of a negligent-security case is foreseeability, which usually comes from the property\u2019s own history: prior assaults, robberies, or other violent crimes at the location or immediately around it put the owner on notice. Records of prior incidents, police calls for service, and the owner\u2019s own knowledge are therefore central, and they must be gathered before they become hard to obtain.'

const MEASURES =
  'What a reasonable owner should have done is the second half of the case: whether the lighting was adequate, whether locks, gates, and access controls worked, whether cameras existed and functioned, whether promised or posted security was actually present, and whether the owner ignored complaints or warnings. Photographs of the conditions and preservation of any surveillance video are important because both change quickly.'

const CRIMINAL =
  'The person who committed the crime is of course responsible, but is frequently never identified or has no ability to pay, which is exactly why a property owner\u2019s failure to provide reasonable security matters \u2014 it can be the only realistic source of recovery for a serious injury. Pursuing the owner does not excuse the criminal; it holds accountable the party whose negligence made the harm possible.'

export const LA_NEGSECURITY_SLUG = '/los-angeles-negligent-security'
export const OAKLAND_NEGSECURITY_SLUG = '/oakland-negligent-security'
export const SF_NEGSECURITY_SLUG = '/san-francisco-negligent-security'
export const SD_NEGSECURITY_SLUG = '/san-diego-negligent-security'

export const negligentSecurityCityGuidePages: LandingPage[] = [
  {
    slug: LA_NEGSECURITY_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Negligent Security Claims',
    title: 'Los Angeles Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Assaulted at an LA apartment, club, hotel, or parking structure? A property owner can be responsible when a foreseeable crime was made possible by inadequate security \u2014 and the property\u2019s history of prior incidents is often the key.',
    psychology: 'I was attacked at a property in LA and wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles negligent security claim',
      'assaulted at an apartment complex who is liable california',
      'attacked in a parking structure inadequate security',
      'property owner liability for assault california',
      'nightclub assault negligent security los angeles',
    ],
    signals: [
      'Foreseeability / prior incidents',
      'Adequacy of security measures',
      'Apartment / club / parking structure',
      'Surveillance video preservation',
      'Owner, not just the assailant',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Los Angeles negligent-security claims arise across the settings where large numbers of people gather in the owner\u2019s care \u2014 apartment complexes, nightlife venues, hotels, retail centres, and the vast parking structures that serve them. ${DUTY} ${FORESEEABILITY} In Los Angeles, where many properties have documented histories of prior incidents, that foreseeability analysis is frequently favourable to an injured person, provided the records are obtained. ${MEASURES} ${CRIMINAL} Pure comparative negligence applies, so an owner may argue the visitor contributed, but that reduces rather than bars recovery. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs, with the six-month rule if a public entity owns the property. Civil cases are filed in Los Angeles County Superior Court. These cases involve serious, often traumatic harm, and the aim here is simply to explain how responsibility is assessed.`,
      whatToTrack: [
        'The property, its owner or management, and the exact location',
        'Any history of prior crimes at or near the property',
        'The lighting, locks, gates, cameras, and any security presence',
        'Whether complaints or warnings were ignored',
        'Any surveillance video, and a prompt demand to preserve it',
        'The police report and any investigation',
        'Witnesses to the incident or the conditions',
        'Medical and, where relevant, psychological treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ frames an LA negligent-security claim around the two questions that decide it \u2014 whether the crime was foreseeable from the property\u2019s history, and whether the security measures were reasonable \u2014 and prompts to obtain prior-incident records and preserve surveillance video before they disappear. It keeps the focus on the owner\u2019s responsibility, not only the assailant. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can a property owner really be responsible for a crime someone else committed?',
        a: 'Yes, in appropriate cases. A California property owner owes lawful visitors a duty of reasonable care that can include protecting them from foreseeable third-party crime. If the harm was foreseeable \u2014 often from prior similar incidents at the property \u2014 and the owner failed to take reasonable security measures, the owner can share responsibility even though someone else committed the act.',
      },
      {
        q: 'What makes a crime "foreseeable"?',
        a: 'Usually the property\u2019s own history: prior assaults, robberies, or other violent crimes at or immediately around the location put the owner on notice. Records of prior incidents, police calls for service, and the owner\u2019s knowledge are central, and California ties the amount of security an owner must provide to how foreseeable the harm was.',
      },
      {
        q: 'The attacker was never caught. Do I still have a claim?',
        a: 'Possibly. The person who committed the crime is responsible but is frequently never identified or unable to pay, which is exactly why a property owner\u2019s failure to provide reasonable security matters \u2014 it can be the only realistic source of recovery. Pursuing the owner holds accountable the party whose negligence made the harm possible.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The property\u2019s prior-incident history, the condition of lighting, locks, gates, and cameras, whether security was present, and any surveillance video \u2014 which is often overwritten within days or weeks. Obtaining incident records and demanding preservation of the video quickly is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the foreseeability and security questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAKLAND_NEGSECURITY_SLUG,
    category: 'Cities',
    cluster: 'Oakland Negligent Security Claims',
    title: 'Oakland Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Assaulted at an Oakland apartment complex, business, or parking area? A property owner can be responsible when a foreseeable crime was made possible by inadequate security \u2014 and the property\u2019s incident history is central.',
    psychology: 'I was attacked at a property in Oakland and wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland negligent security claim',
      'assaulted at an apartment complex who is liable california',
      'property owner liability for assault california',
      'inadequate security apartment lighting locks',
      'attacked at a business negligent security oakland',
    ],
    signals: [
      'Foreseeability / prior incidents',
      'Adequacy of security measures',
      'Apartment complex / business',
      'Surveillance video preservation',
      'Owner, not just the assailant',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Oakland negligent-security claims most often center on apartment complexes and businesses, where the adequacy of security and the property\u2019s history of incidents are decisive. ${DUTY} ${FORESEEABILITY} For an Oakland apartment complex or business with documented prior incidents, that history is often the foundation of the claim, so obtaining the records is the first priority. ${MEASURES} In the residential setting, tenants\u2019 repeated complaints about broken gates, burned-out lighting, or failed locks are particularly important, because they show the owner\u2019s knowledge. ${CRIMINAL} Pure comparative negligence applies. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs, with the six-month rule if a public entity owns the property. Civil cases are filed in Alameda County Superior Court. These are serious, often traumatic matters, and the purpose here is to explain how responsibility is assessed.`,
      whatToTrack: [
        'The property, its owner or management, and the exact location',
        'Any history of prior crimes at or near the property',
        'The lighting, locks, gates, cameras, and any security presence',
        'Tenant complaints or warnings that were ignored',
        'Any surveillance video, and a prompt demand to preserve it',
        'The police report and any investigation',
        'Witnesses to the incident or the conditions',
        'Medical and, where relevant, psychological treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ frames an Oakland negligent-security claim around foreseeability and the adequacy of security, and in the apartment setting emphasises tenant complaints about broken gates, lighting, and locks that establish the owner\u2019s knowledge \u2014 while prompting to preserve video and obtain incident records. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can a landlord be responsible for an assault at the complex?',
        a: 'Yes, in appropriate cases. A landlord owes tenants and lawful visitors a duty of reasonable care that can include protecting them from foreseeable third-party crime. If the harm was foreseeable \u2014 often from prior incidents \u2014 and the owner failed to take reasonable measures such as working gates, lighting, and locks, the owner can share responsibility.',
      },
      {
        q: 'I complained about the broken gate and lights before this happened. Does that matter?',
        a: 'It can matter a great deal. Repeated complaints about broken gates, burned-out lighting, or failed locks show the owner\u2019s knowledge of the hazard and can strengthen a claim, because they establish both foreseeability and a failure to take reasonable, lower-cost measures.',
      },
      {
        q: 'The attacker was never caught. Do I still have a claim?',
        a: 'Possibly. The person who committed the crime is responsible but is frequently never identified or unable to pay, which is why a property owner\u2019s failure to provide reasonable security matters \u2014 it can be the only realistic source of recovery. Pursuing the owner holds accountable the party whose negligence made the harm possible.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The property\u2019s prior-incident history, tenant complaints, the condition of lighting, locks, and gates, and any surveillance video \u2014 which is often overwritten within days or weeks. Obtaining records and demanding preservation of the video quickly is important.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the foreseeability and security questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_NEGSECURITY_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Negligent Security Claims',
    title: 'San Francisco Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Assaulted at a San Francisco hotel, garage, or downtown property? A property owner can be responsible when a foreseeable crime was made possible by inadequate security \u2014 and the property\u2019s history of prior incidents is often the key.',
    psychology: 'I was attacked at a property in San Francisco and wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco negligent security claim',
      'assaulted at a hotel who is liable california',
      'attacked in a parking garage inadequate security',
      'property owner liability for assault california',
      'downtown assault negligent security san francisco',
    ],
    signals: [
      'Foreseeability / prior incidents',
      'Adequacy of security measures',
      'Hotel / parking garage',
      'Surveillance video preservation',
      'Owner, not just the assailant',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Francisco negligent-security claims frequently involve hotels, parking garages, and dense downtown and transit-adjacent properties, where large numbers of visitors pass through the owner\u2019s care. ${DUTY} ${FORESEEABILITY} In a downtown hotel or garage with a documented history of incidents, that record is often the foundation of the claim. ${MEASURES} Hotels in particular raise questions about door and key-card security, staffing, and whether posted or promised security was actually present, while parking garages raise lighting, access control, and camera questions. ${CRIMINAL} Pure comparative negligence applies. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs, with the six-month rule if a public entity owns the property. Civil cases are filed in San Francisco County Superior Court. These are serious, often traumatic matters, and the purpose here is to explain how responsibility is assessed.`,
      whatToTrack: [
        'The property, its owner or management, and the exact location',
        'Any history of prior crimes at or near the property',
        'For a hotel, door and key-card security and staffing',
        'For a garage, lighting, access control, and cameras',
        'Whether promised or posted security was present',
        'Any surveillance video, and a prompt demand to preserve it',
        'The police report and any investigation',
        'Medical and, where relevant, psychological treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a San Francisco negligent-security claim around foreseeability and the adequacy of security, tailored to hotels (door and key-card controls, staffing) and garages (lighting, access, cameras), and prompts to obtain prior-incident records and preserve surveillance video before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can a hotel be responsible for an assault on its property?',
        a: 'Yes, in appropriate cases. A hotel owes guests and lawful visitors a duty of reasonable care that can include protecting them from foreseeable third-party crime. If the harm was foreseeable \u2014 often from prior incidents \u2014 and the hotel failed to take reasonable measures such as working door and key-card security and adequate staffing, it can share responsibility.',
      },
      {
        q: 'What makes a crime "foreseeable"?',
        a: 'Usually the property\u2019s own history: prior assaults, robberies, or other violent crimes at or around the location put the owner on notice. California ties the amount of security an owner must provide to how foreseeable the harm was, so prior-incident records and police calls for service are central.',
      },
      {
        q: 'The attacker was never caught. Do I still have a claim?',
        a: 'Possibly. The person who committed the crime is responsible but is frequently never identified or unable to pay, which is why a property owner\u2019s failure to provide reasonable security matters \u2014 it can be the only realistic source of recovery. Pursuing the owner holds accountable the party whose negligence made the harm possible.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The property\u2019s prior-incident history, the security measures in place, and any surveillance video \u2014 which is often overwritten within days or weeks. Obtaining records and demanding preservation of the video quickly is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the foreseeability and security questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_NEGSECURITY_SLUG,
    category: 'Cities',
    cluster: 'San Diego Negligent Security Claims',
    title: 'San Diego Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Assaulted in San Diego\u2019s Gaslamp nightlife, a hotel, or a parking area? A property owner can be responsible when a foreseeable crime was made possible by inadequate security \u2014 and the venue\u2019s history of prior incidents is often the key.',
    psychology: 'I was attacked at a property in San Diego and wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego negligent security claim',
      'assaulted at a nightclub who is liable california',
      'gaslamp assault inadequate security',
      'property owner liability for assault california',
      'hotel assault negligent security san diego',
    ],
    signals: [
      'Foreseeability / prior incidents',
      'Adequacy of security measures',
      'Nightlife venue / hotel',
      'Surveillance video preservation',
      'Owner, not just the assailant',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Diego negligent-security claims often center on the Gaslamp Quarter\u2019s dense nightlife, hotels, and the parking areas that serve large weekend and event crowds. ${DUTY} ${FORESEEABILITY} A bar or nightclub with a documented history of altercations, or a hotel or garage with prior incidents, provides the foreseeability that anchors many of these claims. ${MEASURES} Nightlife venues in particular raise questions about the number and training of security staff, crowd management, alcohol service to already-intoxicated patrons, and whether the venue ejected or failed to control a known aggressor. ${CRIMINAL} Pure comparative negligence applies. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs, with the six-month rule if a public entity owns the property. Civil cases are filed in San Diego County Superior Court. These are serious, often traumatic matters, and the purpose here is to explain how responsibility is assessed.`,
      whatToTrack: [
        'The venue, its owner or management, and the exact location',
        'Any history of prior altercations or crimes at the venue',
        'The number, training, and conduct of security staff',
        'Whether alcohol was served to an already-intoxicated aggressor',
        'Whether a known aggressor was controlled or ejected',
        'Any surveillance video, and a prompt demand to preserve it',
        'The police report and any investigation',
        'Medical and, where relevant, psychological treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a San Diego negligent-security claim around foreseeability and the adequacy of security, tailored to nightlife venues \u2014 security staffing and training, crowd control, over-service, and handling of a known aggressor \u2014 and prompts to preserve video and obtain prior-incident records before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can a bar or nightclub be responsible for an assault by another patron?',
        a: 'Yes, in appropriate cases. A venue owes patrons a duty of reasonable care that can include protecting them from foreseeable third-party violence. If the harm was foreseeable \u2014 often from prior altercations at the venue \u2014 and the venue failed to take reasonable measures such as adequate, trained security and crowd control, it can share responsibility.',
      },
      {
        q: 'The venue kept serving an obviously drunk person who then attacked me. Does that matter?',
        a: 'It can be relevant. Whether a venue continued serving an already-intoxicated aggressor, and whether it controlled or ejected a known troublemaker, are part of assessing whether the venue took reasonable measures. Combined with the venue\u2019s history and security staffing, these facts can support a negligent-security claim.',
      },
      {
        q: 'The attacker was never caught. Do I still have a claim?',
        a: 'Possibly. The person who committed the crime is responsible but is frequently never identified or unable to pay, which is why a venue\u2019s failure to provide reasonable security matters \u2014 it can be the only realistic source of recovery. Pursuing the owner holds accountable the party whose negligence made the harm possible.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The venue\u2019s prior-incident history, its security staffing and conduct, and any surveillance video \u2014 which is often overwritten within days or weeks. Obtaining records and demanding preservation of the video quickly is important.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the foreseeability and security questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const negligentSecurityCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_NEGSECURITY_SLUG]: {
    scenario: `A resident was assaulted in an LA apartment complex\u2019s parking structure where the gate had been broken for months and lighting had failed. The property\u2019s prior-incident history and ignored complaints established foreseeability, and the surveillance video was preserved in time. ${NOT_ADVICE}`,
    timeline: [
      ['After the incident', 'Report to police; note the property, owner, and conditions.'],
      ['First days', 'Written demand sent to preserve surveillance video.'],
      ['First weeks', 'Prior-incident records and complaint history gathered.'],
      ['Longer term', 'Medical and psychological treatment documented.'],
    ],
    severityLadder: [
      ['Foreseeable', 'Prior incidents put the owner on notice.'],
      ['Low-cost failure', 'Broken lighting, locks, or gates were ignored.'],
      ['Guard question', 'Costly measures need heightened foreseeability.'],
      ['Serious harm', 'Physical and psychological injury are documented.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Psychological care', copy: 'Trauma treatment is part of the harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the crime was foreseeable from prior incidents',
      'Whether lighting, locks, gates, and cameras were adequate',
      'Whether complaints or warnings were ignored',
      'Whether surveillance video was preserved',
      'The severity of physical and psychological harm',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Foreseeability anchors it', copy: 'Prior incidents set the duty\u2019s scope.' },
      { label: 'Low-cost failures count', copy: 'Ignored lighting and locks are powerful facts.' },
      { label: 'Owner, not just attacker', copy: 'The owner can be the realistic recovery source.' },
      { label: 'Preserve the video', copy: 'Footage is overwritten within days.' },
    ],
    insuranceProblems: [
      'The claim is dismissed as \u201cjust the criminal\u2019s fault.\u201d',
      'Prior-incident records are never obtained.',
      'The surveillance video is overwritten before demand.',
      'Ignored complaints are never documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Had prior crimes happened at or near the property?' },
      { label: 'Step 2', question: 'What were the lighting, locks, gates, and cameras like?' },
      { label: 'Step 3', question: 'Were complaints or warnings ignored?' },
      { label: 'Step 4', question: 'Has a demand been sent to preserve the video?' },
    ],
  },
  [OAKLAND_NEGSECURITY_SLUG]: {
    scenario: `A tenant who had repeatedly reported a broken security gate was assaulted in the complex. The documented complaints established the owner\u2019s knowledge, and the prior-incident history anchored the foreseeability of the harm. ${NOT_ADVICE}`,
    timeline: [
      ['After the incident', 'Report to police; note the property, owner, and conditions.'],
      ['First days', 'Written demand sent to preserve surveillance video.'],
      ['First weeks', 'Complaint history and prior-incident records gathered.'],
      ['Longer term', 'Medical and psychological treatment documented.'],
    ],
    severityLadder: [
      ['Foreseeable', 'Prior incidents put the owner on notice.'],
      ['Ignored complaints', 'Reported broken gates or locks show knowledge.'],
      ['Guard question', 'Costly measures need heightened foreseeability.'],
      ['Serious harm', 'Physical and psychological injury are documented.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Psychological care', copy: 'Trauma treatment is part of the harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the crime was foreseeable from prior incidents',
      'Whether tenant complaints established the owner\u2019s knowledge',
      'Whether lighting, locks, and gates were adequate',
      'Whether surveillance video was preserved',
      'The severity of physical and psychological harm',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Complaints are powerful', copy: 'Reported failures show the owner\u2019s knowledge.' },
      { label: 'Foreseeability anchors it', copy: 'Prior incidents set the duty\u2019s scope.' },
      { label: 'Owner, not just attacker', copy: 'The owner can be the realistic recovery source.' },
      { label: 'Preserve the video', copy: 'Footage is overwritten within days.' },
    ],
    insuranceProblems: [
      'The claim is dismissed as \u201cjust the criminal\u2019s fault.\u201d',
      'Tenant complaints are never documented.',
      'Prior-incident records are never obtained.',
      'The surveillance video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Had you reported broken gates, lighting, or locks?' },
      { label: 'Step 2', question: 'Had prior crimes happened at the property?' },
      { label: 'Step 3', question: 'What security measures were in place?' },
      { label: 'Step 4', question: 'Has a demand been sent to preserve the video?' },
    ],
  },
  [SF_NEGSECURITY_SLUG]: {
    scenario: `A hotel guest was assaulted after a stranger followed them through a door that should have required a key card. The hotel\u2019s prior incidents and its failed access control anchored the claim, and the footage was preserved in time. ${NOT_ADVICE}`,
    timeline: [
      ['After the incident', 'Report to police and the hotel; note staffing and access.'],
      ['First days', 'Written demand sent to preserve surveillance video.'],
      ['First weeks', 'Prior-incident records and security details gathered.'],
      ['Longer term', 'Medical and psychological treatment documented.'],
    ],
    severityLadder: [
      ['Foreseeable', 'Prior incidents put the owner on notice.'],
      ['Access failure', 'Door or key-card security did not work.'],
      ['Guard question', 'Costly measures need heightened foreseeability.'],
      ['Serious harm', 'Physical and psychological injury are documented.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Psychological care', copy: 'Trauma treatment is part of the harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the crime was foreseeable from prior incidents',
      'For a hotel, door and key-card security and staffing',
      'For a garage, lighting, access control, and cameras',
      'Whether surveillance video was preserved',
      'The severity of physical and psychological harm',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Access controls matter', copy: 'Failed door or key-card security is central.' },
      { label: 'Foreseeability anchors it', copy: 'Prior incidents set the duty\u2019s scope.' },
      { label: 'Owner, not just attacker', copy: 'The owner can be the realistic recovery source.' },
      { label: 'Preserve the video', copy: 'Footage is overwritten within days.' },
    ],
    insuranceProblems: [
      'The claim is dismissed as \u201cjust the criminal\u2019s fault.\u201d',
      'The hotel\u2019s access-control failure is never examined.',
      'Prior-incident records are never obtained.',
      'The surveillance video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did door, key-card, or access security fail?' },
      { label: 'Step 2', question: 'Had prior crimes happened at the property?' },
      { label: 'Step 3', question: 'Was promised or posted security present?' },
      { label: 'Step 4', question: 'Has a demand been sent to preserve the video?' },
    ],
  },
  [SD_NEGSECURITY_SLUG]: {
    scenario: `A patron was attacked by an already-ejected aggressor who was let back into a Gaslamp club that had a history of altercations and too few security staff. The venue\u2019s history and staffing failures anchored the claim, and the footage was preserved. ${NOT_ADVICE}`,
    timeline: [
      ['After the incident', 'Report to police and the venue; note security and service.'],
      ['First days', 'Written demand sent to preserve surveillance video.'],
      ['First weeks', 'Prior-incident history and staffing details gathered.'],
      ['Longer term', 'Medical and psychological treatment documented.'],
    ],
    severityLadder: [
      ['Foreseeable', 'Prior altercations put the venue on notice.'],
      ['Staffing failure', 'Too few or untrained security staff.'],
      ['Over-service', 'Serving an already-intoxicated aggressor.'],
      ['Serious harm', 'Physical and psychological injury are documented.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Psychological care', copy: 'Trauma treatment is part of the harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the crime was foreseeable from prior altercations',
      'The number, training, and conduct of security staff',
      'Whether an already-intoxicated aggressor was served',
      'Whether a known aggressor was controlled or ejected',
      'Whether surveillance video was preserved',
      'The severity of physical and psychological harm',
    ],
    settlementValueDetails: [
      { label: 'Staffing is central', copy: 'Too few or untrained guards is a key failure.' },
      { label: 'Over-service counts', copy: 'Serving a drunk aggressor is relevant conduct.' },
      { label: 'Foreseeability anchors it', copy: 'Prior altercations set the duty\u2019s scope.' },
      { label: 'Preserve the video', copy: 'Footage is overwritten within days.' },
    ],
    insuranceProblems: [
      'The claim is dismissed as \u201cjust the criminal\u2019s fault.\u201d',
      'The venue\u2019s staffing and history are never examined.',
      'Over-service of the aggressor is never explored.',
      'The surveillance video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the venue have a history of altercations?' },
      { label: 'Step 2', question: 'How many security staff were present, and what did they do?' },
      { label: 'Step 3', question: 'Was an intoxicated or known aggressor served or let in?' },
      { label: 'Step 4', question: 'Has a demand been sent to preserve the video?' },
    ],
  },
}
