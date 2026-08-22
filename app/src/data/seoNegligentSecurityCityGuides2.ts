import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, negligent-security practice area (batch 2): city-specific guides for
 * Sacramento, San Jose, Fresno, and Long Beach, extending the batch-1 hub (LA,
 * Oakland, San Francisco, San Diego).
 *
 * Negligent security is about a property owner's duty to take reasonable measures
 * to protect people from FORESEEABLE third-party crime (an assault, robbery, or
 * shooting) at apartments, bars and clubs, parking structures, hotels, and
 * retail. This is a sensitive, trauma-adjacent topic and the copy is written with
 * care and without sensationalism.
 *
 * Local context, genuine rather than interpolated:
 *  - Sacramento: apartment complexes, downtown entertainment around the arena and
 *    K Street, and state-office and public parking where a public entity may own
 *    the property (six-month claim rule).
 *  - San Jose: apartment complexes, downtown nightlife, and the large parking
 *    structures serving arena and tech-campus events.
 *  - Fresno: apartment complexes, shopping centres, and convenience-store and
 *    ATM robberies, where lighting and cameras are often the decisive facts.
 *  - Long Beach: downtown Pine Avenue nightlife, convention-centre hotels, and
 *    apartment complexes near the port.
 *
 * Applied accurately (duty of reasonable care that can include protecting lawful
 * visitors from foreseeable third-party crime; scope tied to foreseeability, with
 * costly measures like guards requiring heightened foreseeability -- Ann M. v.
 * Pacific Plaza; Delgado v. Trax Bar & Grill; prior-incident history, lighting,
 * locks, cameras, and guards; pure comparative negligence; two-year deadline CCP
 * 335.1; six-month Government Claims Act deadline for a public entity).
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

export const SAC_NEGSECURITY_SLUG = '/sacramento-negligent-security'
export const SJ_NEGSECURITY_SLUG = '/san-jose-negligent-security'
export const FRESNO_NEGSECURITY_SLUG = '/fresno-negligent-security'
export const LB_NEGSECURITY_SLUG = '/long-beach-negligent-security'

export const negligentSecurityCityGuidePages2: LandingPage[] = [
  {
    slug: SAC_NEGSECURITY_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Negligent Security Claims',
    title: 'Sacramento Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Assaulted at a Sacramento apartment, downtown venue, or parking area? A property owner can be responsible when a foreseeable crime was made possible by inadequate security \u2014 and a public-entity property brings a six-month deadline.',
    psychology: 'I was attacked at a property in Sacramento and wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento negligent security claim',
      'assaulted at an apartment complex who is liable california',
      'attacked downtown inadequate security sacramento',
      'property owner liability for assault california',
      'parking structure assault negligent security sacramento',
    ],
    signals: [
      'Foreseeability / prior incidents',
      'Adequacy of security measures',
      'Apartment / downtown venue',
      'Public-entity 6-month deadline',
      'Owner, not just the assailant',
      'Surveillance video preservation',
    ],
    sections: {
      whyItMatters: `Sacramento negligent-security claims arise at apartment complexes, the downtown entertainment district around the arena and K Street, and the many state-office and public parking areas that serve the capital. ${DUTY} ${FORESEEABILITY} A distinctive Sacramento wrinkle is that a good number of properties \u2014 public garages, state facilities, transit-adjacent lots \u2014 may be owned by a public entity, which triggers the six-month Government Claims Act deadline rather than two years. ${MEASURES} ${CRIMINAL} Pure comparative negligence applies. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs a private-property claim, but the six-month rule can apply where a public entity owns the property. Civil cases are filed in Sacramento County Superior Court. These are serious, often traumatic matters, and the purpose here is to explain how responsibility is assessed.`,
      whatToTrack: [
        'The property, its owner or management, and whether it is public',
        'Any history of prior crimes at or near the property',
        'The lighting, locks, gates, cameras, and any security presence',
        'Whether complaints or warnings were ignored',
        'Any surveillance video, and a prompt demand to preserve it',
        'The police report and any investigation',
        'Witnesses to the incident or the conditions',
        'Medical and, where relevant, psychological treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a Sacramento negligent-security claim around foreseeability and the adequacy of security, flags immediately when a public-entity property triggers the six-month claims deadline, and prompts to obtain prior-incident records and preserve surveillance video before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The assault happened in a public or state-owned parking garage. Does that change the deadline?',
        a: 'Yes. If a public entity owns the property, a claim can be governed by the Government Claims Act, which generally requires a written claim within six months \u2014 far shorter than the usual two years. Identifying whether the owner is public is one of the first and most important steps in a Sacramento case.',
      },
      {
        q: 'Can a property owner really be responsible for a crime someone else committed?',
        a: 'Yes, in appropriate cases. A California property owner owes lawful visitors a duty of reasonable care that can include protecting them from foreseeable third-party crime. If the harm was foreseeable \u2014 often from prior similar incidents \u2014 and the owner failed to take reasonable security measures, the owner can share responsibility.',
      },
      {
        q: 'The attacker was never caught. Do I still have a claim?',
        a: 'Possibly. The person who committed the crime is responsible but is frequently never identified or unable to pay, which is exactly why a property owner\u2019s failure to provide reasonable security matters \u2014 it can be the only realistic source of recovery. Pursuing the owner holds accountable the party whose negligence made the harm possible.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The property\u2019s prior-incident history, the condition of lighting, locks, gates, and cameras, and any surveillance video \u2014 which is often overwritten within days or weeks. Obtaining records and demanding preservation quickly is important, and the six-month rule for a public entity makes speed critical.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the foreseeability and security questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_NEGSECURITY_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Negligent Security Claims',
    title: 'San Jose Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Assaulted at a San Jose apartment, downtown venue, or event parking structure? A property owner can be responsible when a foreseeable crime was made possible by inadequate security \u2014 and the property\u2019s history of prior incidents is often the key.',
    psychology: 'I was attacked at a property in San Jose and wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose negligent security claim',
      'assaulted at an apartment complex who is liable california',
      'attacked in an event parking structure inadequate security',
      'property owner liability for assault california',
      'downtown assault negligent security san jose',
    ],
    signals: [
      'Foreseeability / prior incidents',
      'Adequacy of security measures',
      'Apartment / event parking',
      'Surveillance video preservation',
      'Owner, not just the assailant',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `San Jose negligent-security claims center on apartment complexes, downtown nightlife, and the large parking structures that serve arena events and the surrounding campuses, where big crowds pass through the owner\u2019s care. ${DUTY} ${FORESEEABILITY} A downtown venue or event garage with documented prior incidents provides the foreseeability that anchors many of these claims, and event nights raise questions about staffing and crowd control. ${MEASURES} In the residential setting, ignored complaints about broken gates, failed locks, and burned-out lighting establish the owner\u2019s knowledge. ${CRIMINAL} Pure comparative negligence applies. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs, with the six-month rule if a public entity owns the property. Civil cases are filed in Santa Clara County Superior Court. These are serious, often traumatic matters, and the purpose here is to explain how responsibility is assessed.`,
      whatToTrack: [
        'The property, its owner or management, and the exact location',
        'Any history of prior crimes at or near the property',
        'The lighting, locks, gates, cameras, and any security presence',
        'For an event garage, staffing and crowd control that night',
        'Whether complaints or warnings were ignored',
        'Any surveillance video, and a prompt demand to preserve it',
        'The police report and any investigation',
        'Medical and, where relevant, psychological treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a San Jose negligent-security claim around foreseeability and the adequacy of security, tailored to event parking (staffing and crowd control) and apartments (complaints about gates, locks, and lighting), and prompts to preserve video and obtain prior-incident records before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can a property owner really be responsible for a crime someone else committed?',
        a: 'Yes, in appropriate cases. A California property owner owes lawful visitors a duty of reasonable care that can include protecting them from foreseeable third-party crime. If the harm was foreseeable \u2014 often from prior similar incidents \u2014 and the owner failed to take reasonable security measures, the owner can share responsibility even though someone else committed the act.',
      },
      {
        q: 'I was assaulted in a packed event parking structure. Does the venue\u2019s planning matter?',
        a: 'It can. On event nights, whether the operator provided adequate lighting, cameras, and security staffing for the expected crowd, and whether the location had a history of prior incidents, are central to whether reasonable measures were taken. Preserving that night\u2019s footage quickly is important.',
      },
      {
        q: 'The attacker was never caught. Do I still have a claim?',
        a: 'Possibly. The person who committed the crime is responsible but is frequently never identified or unable to pay, which is why a property owner\u2019s failure to provide reasonable security matters \u2014 it can be the only realistic source of recovery. Pursuing the owner holds accountable the party whose negligence made the harm possible.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The property\u2019s prior-incident history, the condition of lighting, locks, gates, and cameras, whether security was present, and any surveillance video \u2014 which is often overwritten within days or weeks. Obtaining records and demanding preservation quickly is important.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the foreseeability and security questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_NEGSECURITY_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Negligent Security Claims',
    title: 'Fresno Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Robbed or assaulted at a Fresno apartment, shopping centre, convenience store, or ATM? A property owner can be responsible when a foreseeable crime was made possible by inadequate lighting, cameras, or security.',
    psychology: 'I was attacked at a property in Fresno and wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno negligent security claim',
      'convenience store robbery injury who is liable california',
      'assaulted at an apartment complex california',
      'atm robbery inadequate lighting liability',
      'property owner liability for assault california',
    ],
    signals: [
      'Foreseeability / prior incidents',
      'Lighting & camera adequacy',
      'Store / ATM / apartment',
      'Surveillance video preservation',
      'Owner, not just the assailant',
      'Two-year deadline',
    ],
    sections: {
      whyItMatters: `Fresno negligent-security claims frequently arise at apartment complexes, shopping centres, and convenience stores and ATMs, where robberies and assaults turn on whether basic, low-cost measures \u2014 adequate lighting, working cameras, and secured access \u2014 were in place. ${DUTY} ${FORESEEABILITY} A store or complex with a documented history of robberies or assaults provides the foreseeability that anchors the claim, and because the failures here are often inexpensive to fix, the foreseeability analysis tends to be favourable where the records exist. ${MEASURES} ${CRIMINAL} Pure comparative negligence applies. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs, with the six-month rule if a public entity owns the property. Civil cases are filed in Fresno County Superior Court. These are serious, often traumatic matters, and the purpose here is to explain how responsibility is assessed.`,
      whatToTrack: [
        'The property, its owner or management, and the exact location',
        'Any history of prior robberies or assaults at or near the property',
        'The lighting, cameras, and secured access at the location',
        'Whether promised or posted security was present',
        'Whether complaints or warnings were ignored',
        'Any surveillance video, and a prompt demand to preserve it',
        'The police report and any investigation',
        'Medical and, where relevant, psychological treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a Fresno negligent-security claim around foreseeability and the low-cost measures \u2014 lighting, cameras, and secured access \u2014 that often decide store, ATM, and apartment cases, and prompts to obtain prior-incident records and preserve surveillance video before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was robbed at a poorly lit convenience store or ATM. Can the owner be responsible?',
        a: 'Yes, in appropriate cases. A property owner owes lawful visitors a duty of reasonable care that can include protecting them from foreseeable crime. Lighting and working cameras are low-cost measures a reasonable owner may be expected to provide, especially at a location with a documented history of robberies, so their absence can support a claim.',
      },
      {
        q: 'What makes a crime "foreseeable"?',
        a: 'Usually the property\u2019s own history: prior robberies, assaults, or other violent crimes at or around the location put the owner on notice. Records of prior incidents and police calls for service are central, and California ties the amount of security an owner must provide to how foreseeable the harm was.',
      },
      {
        q: 'The attacker was never caught. Do I still have a claim?',
        a: 'Possibly. The person who committed the crime is responsible but is frequently never identified or unable to pay, which is why a property owner\u2019s failure to provide reasonable security matters \u2014 it can be the only realistic source of recovery. Pursuing the owner holds accountable the party whose negligence made the harm possible.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The property\u2019s prior-incident history, the lighting and camera conditions, and any surveillance video \u2014 which is often overwritten within days or weeks. Obtaining records and demanding preservation quickly is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the foreseeability and security questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_NEGSECURITY_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Negligent Security Claims',
    title: 'Long Beach Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Assaulted in Long Beach\u2019s Pine Avenue nightlife, a convention-centre hotel, or an apartment near the port? A property owner can be responsible when a foreseeable crime was made possible by inadequate security.',
    psychology: 'I was attacked at a property in Long Beach and wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach negligent security claim',
      'assaulted at a nightclub who is liable california',
      'hotel assault inadequate security long beach',
      'property owner liability for assault california',
      'apartment complex assault negligent security long beach',
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
      whyItMatters: `Long Beach negligent-security claims often center on the Pine Avenue and downtown nightlife, the hotels serving the convention centre and large events, and apartment complexes near the port. ${DUTY} ${FORESEEABILITY} A bar or club with a documented history of altercations, or a hotel or complex with prior incidents, provides the foreseeability that anchors many of these claims. ${MEASURES} Nightlife venues in particular raise questions about the number and training of security staff, crowd management, service to already-intoxicated patrons, and whether a known aggressor was ejected, while hotels raise door and key-card security and staffing. ${CRIMINAL} Pure comparative negligence applies. The ordinary two-year deadline (Code of Civil Procedure section 335.1) governs, with the six-month rule if a public entity owns the property. Civil cases are filed in Los Angeles County Superior Court. These are serious, often traumatic matters, and the purpose here is to explain how responsibility is assessed.`,
      whatToTrack: [
        'The venue or property, its owner or management, and the location',
        'Any history of prior altercations or crimes at the location',
        'The number, training, and conduct of security staff',
        'For a hotel, door and key-card security and staffing',
        'Whether an already-intoxicated or known aggressor was served or let in',
        'Any surveillance video, and a prompt demand to preserve it',
        'The police report and any investigation',
        'Medical and, where relevant, psychological treatment',
      ],
      howClearCaseHelps: `ClearCaseIQ frames a Long Beach negligent-security claim around foreseeability and the adequacy of security, tailored to nightlife (staffing, crowd control, over-service, handling a known aggressor) and hotels (access control and staffing), and prompts to preserve video and obtain prior-incident records before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can a bar or nightclub be responsible for an assault by another patron?',
        a: 'Yes, in appropriate cases. A venue owes patrons a duty of reasonable care that can include protecting them from foreseeable third-party violence. If the harm was foreseeable \u2014 often from prior altercations at the venue \u2014 and the venue failed to take reasonable measures such as adequate, trained security and crowd control, it can share responsibility.',
      },
      {
        q: 'The venue kept serving an obviously drunk person who then attacked me. Does that matter?',
        a: 'It can be relevant. Whether a venue continued serving an already-intoxicated aggressor, and whether it controlled or ejected a known troublemaker, are part of assessing whether the venue took reasonable measures. Combined with the venue\u2019s history and staffing, these facts can support a negligent-security claim.',
      },
      {
        q: 'The attacker was never caught. Do I still have a claim?',
        a: 'Possibly. The person who committed the crime is responsible but is frequently never identified or unable to pay, which is why a property owner\u2019s failure to provide reasonable security matters \u2014 it can be the only realistic source of recovery. Pursuing the owner holds accountable the party whose negligence made the harm possible.',
      },
      {
        q: 'What evidence matters most, and how fast?',
        a: 'The location\u2019s prior-incident history, its security staffing and conduct, and any surveillance video \u2014 which is often overwritten within days or weeks. Obtaining records and demanding preservation quickly is important.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the foreseeability and security questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const negligentSecurityCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SAC_NEGSECURITY_SLUG]: {
    scenario: `A visitor was assaulted in a Sacramento public parking garage that had a history of incidents and failed lighting. Because a public entity owned the garage, the six-month claims deadline applied \u2014 and filing the government claim in time preserved the case. ${NOT_ADVICE}`,
    timeline: [
      ['After the incident', 'Report to police; note the property and whether it is public.'],
      ['First days', 'Written demand sent to preserve surveillance video.'],
      ['First weeks', 'Government claim filed if a public entity owns the property.'],
      ['Longer term', 'Medical and psychological treatment documented.'],
    ],
    severityLadder: [
      ['Public-entity path', 'A public owner triggers the six-month deadline.'],
      ['Foreseeable', 'Prior incidents put the owner on notice.'],
      ['Low-cost failure', 'Broken lighting or cameras were ignored.'],
      ['Serious harm', 'Physical and psychological injury are documented.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the incident.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Psychological care', copy: 'Trauma treatment is part of the harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public entity owns the property (six-month rule)',
      'Whether the crime was foreseeable from prior incidents',
      'Whether lighting, cameras, and access were adequate',
      'Whether surveillance video was preserved',
      'The severity of physical and psychological harm',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'A public owner means six months, not two years.' },
      { label: 'Foreseeability anchors it', copy: 'Prior incidents set the duty\u2019s scope.' },
      { label: 'Owner, not just attacker', copy: 'The owner can be the realistic recovery source.' },
      { label: 'Preserve the video', copy: 'Footage is overwritten within days.' },
    ],
    insuranceProblems: [
      'The six-month public-entity deadline is missed.',
      'The claim is dismissed as \u201cjust the criminal\u2019s fault.\u201d',
      'Prior-incident records are never obtained.',
      'The surveillance video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is the property owned by a public entity?' },
      { label: 'Step 2', question: 'Had prior crimes happened at or near the property?' },
      { label: 'Step 3', question: 'What were the lighting, cameras, and access like?' },
      { label: 'Step 4', question: 'Has a demand been sent to preserve the video?' },
    ],
  },
  [SJ_NEGSECURITY_SLUG]: {
    scenario: `A patron was assaulted in a packed San Jose event parking structure that had prior incidents and too little staffing and lighting for the crowd. The location\u2019s history and the event-night failures anchored the claim, and the footage was preserved in time. ${NOT_ADVICE}`,
    timeline: [
      ['After the incident', 'Report to police; note the operator, staffing, and conditions.'],
      ['First days', 'Written demand sent to preserve surveillance video.'],
      ['First weeks', 'Prior-incident records and event-night details gathered.'],
      ['Longer term', 'Medical and psychological treatment documented.'],
    ],
    severityLadder: [
      ['Foreseeable', 'Prior incidents put the operator on notice.'],
      ['Staffing failure', 'Too little security for the expected crowd.'],
      ['Low-cost failure', 'Broken lighting or cameras were ignored.'],
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
      'Whether staffing and crowd control fit the event',
      'Whether lighting and cameras were adequate',
      'Whether surveillance video was preserved',
      'The severity of physical and psychological harm',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Event planning matters', copy: 'Staffing must fit the expected crowd.' },
      { label: 'Foreseeability anchors it', copy: 'Prior incidents set the duty\u2019s scope.' },
      { label: 'Owner, not just attacker', copy: 'The owner can be the realistic recovery source.' },
      { label: 'Preserve the video', copy: 'Footage is overwritten within days.' },
    ],
    insuranceProblems: [
      'The claim is dismissed as \u201cjust the criminal\u2019s fault.\u201d',
      'The event-night staffing is never examined.',
      'Prior-incident records are never obtained.',
      'The surveillance video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Had prior crimes happened at the location?' },
      { label: 'Step 2', question: 'Was staffing adequate for the event crowd?' },
      { label: 'Step 3', question: 'What were the lighting and cameras like?' },
      { label: 'Step 4', question: 'Has a demand been sent to preserve the video?' },
    ],
  },
  [FRESNO_NEGSECURITY_SLUG]: {
    scenario: `A customer was robbed and injured at a Fresno convenience store where the lighting had failed and the cameras did not work, at a location with a documented history of robberies. The low-cost failures and prior incidents anchored the claim. ${NOT_ADVICE}`,
    timeline: [
      ['After the incident', 'Report to police; note the lighting, cameras, and location.'],
      ['First days', 'Written demand sent to preserve surveillance video.'],
      ['First weeks', 'Prior-incident records and conditions gathered.'],
      ['Longer term', 'Medical and psychological treatment documented.'],
    ],
    severityLadder: [
      ['Foreseeable', 'Prior robberies put the owner on notice.'],
      ['Low-cost failure', 'Failed lighting and cameras were ignored.'],
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
      'Whether the crime was foreseeable from prior robberies',
      'Whether lighting and cameras were adequate and working',
      'Whether secured access or posted security existed',
      'Whether surveillance video was preserved',
      'The severity of physical and psychological harm',
      'How much comparative fault is genuinely in play',
    ],
    settlementValueDetails: [
      { label: 'Low-cost failures count', copy: 'Ignored lighting and cameras are powerful facts.' },
      { label: 'Foreseeability anchors it', copy: 'Prior robberies set the duty\u2019s scope.' },
      { label: 'Owner, not just attacker', copy: 'The owner can be the realistic recovery source.' },
      { label: 'Preserve the video', copy: 'Footage is overwritten within days.' },
    ],
    insuranceProblems: [
      'The claim is dismissed as \u201cjust the criminal\u2019s fault.\u201d',
      'The failed lighting and cameras are never examined.',
      'Prior-incident records are never obtained.',
      'The surveillance video is overwritten before demand.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Had prior robberies happened at the location?' },
      { label: 'Step 2', question: 'Were the lighting and cameras working?' },
      { label: 'Step 3', question: 'Was any security present or posted?' },
      { label: 'Step 4', question: 'Has a demand been sent to preserve the video?' },
    ],
  },
  [LB_NEGSECURITY_SLUG]: {
    scenario: `A patron was attacked by an already-ejected aggressor who was let back into a Long Beach Pine Avenue club that had a history of altercations and too few security staff. The venue\u2019s history and staffing failures anchored the claim, and the footage was preserved. ${NOT_ADVICE}`,
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
