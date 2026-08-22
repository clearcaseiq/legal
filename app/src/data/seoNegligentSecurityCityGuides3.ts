import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, negligent-security practice area (batch 3): city-specific guides for
 * Riverside, San Bernardino, Bakersfield, and Anaheim, extending the batch-1 (LA,
 * Oakland, San Francisco, San Diego) and batch-2 (Sacramento, San Jose, Fresno,
 * Long Beach) hub.
 *
 * Negligent security is about a property owner's duty to take reasonable measures
 * to protect people from FORESEEABLE third-party crime (an assault, robbery, or
 * shooting) at apartments, bars and clubs, parking structures, hotels, and
 * retail. This is a sensitive, trauma-adjacent topic and the copy is written with
 * care and without sensationalism.
 *
 * Local context, genuine rather than interpolated:
 *  - Riverside: apartment complexes, downtown and university-adjacent nightlife,
 *    shopping centres, and parking structures serving events.
 *  - San Bernardino: apartment complexes, convenience-store and ATM robberies,
 *    transit centres, and shopping centres, where lighting and cameras recur.
 *  - Bakersfield: apartment complexes, bars and nightlife, convenience stores, and
 *    parking lots, where lighting and prior-incident history are decisive.
 *  - Anaheim: resort-corridor hotels, the convention centre, stadium and arena
 *    parking, bars, and apartment complexes.
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

export const RIV_NEGSECURITY_SLUG = '/riverside-negligent-security'
export const SB_NEGSECURITY_SLUG = '/san-bernardino-negligent-security'
export const BAKERSFIELD_NEGSECURITY_SLUG = '/bakersfield-negligent-security'
export const ANAHEIM_NEGSECURITY_SLUG = '/anaheim-negligent-security'

export const negligentSecurityCityGuidePages3: LandingPage[] = [
  {
    slug: RIV_NEGSECURITY_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Negligent Security Claims',
    title: 'Riverside Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Assaulted or robbed at a Riverside apartment, bar, or parking structure? A property owner can be liable for failing to protect against foreseeable crime.',
    psychology: 'I was attacked at a Riverside property and I wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside negligent security lawyer',
      'apartment assault lawsuit california',
      'parking lot attack claim california',
      'bar shooting negligent security california',
      'foreseeable crime property owner california',
    ],
    signals: [
      'Owner duty vs. foreseeable crime',
      'Prior-incident history',
      'Lighting, locks, cameras, guards',
      'Apartment / nightlife / parking',
      'Comparative negligence',
      'Preserve surveillance video',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s apartment complexes, its downtown and university-adjacent nightlife, and the parking structures serving events are the settings where negligent-security claims most often arise. ${DUTY} ${FORESEEABILITY} ${MEASURES} ${CRIMINAL} Civil cases are filed in Riverside County Superior Court, generally within two years, or six months where a public entity owns the property.`,
      whatToTrack: [
        'The property type (apartment, bar, parking, retail) and owner',
        'Prior crimes at or near the property and any police calls',
        'The lighting, locks, gates, and access controls at the scene',
        'Whether cameras existed and functioned, and any footage',
        'Whether promised or posted security was present',
        'Any complaints or warnings the owner ignored',
        'Whether a public entity owns the property (six-month rule)',
        'The injuries and treatment from the attack',
      ],
      howClearCaseHelps: `ClearCaseIQ gathers the prior-incident history that establishes foreseeability at a Riverside property, preserves the surveillance and lighting evidence before it disappears, and documents the security failures behind the attack. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'How can a property owner be responsible for a crime someone else committed?',
        a: 'A property owner owes lawful visitors a duty of reasonable care that can include reasonable measures against foreseeable third-party crime. Where prior similar incidents made the harm foreseeable and the owner failed to take reasonable steps \u2014 lighting, locks, cameras, or in some cases guards \u2014 the owner can be liable for that failure, separate from the criminal.',
      },
      {
        q: 'What makes an attack \u201cforeseeable\u201d?',
        a: 'Usually the property\u2019s own history \u2014 prior assaults, robberies, or violent crime at or immediately around the location \u2014 which puts the owner on notice. Records of prior incidents and police calls for service are central, which is why gathering them early matters.',
      },
      {
        q: 'Why pursue the property owner instead of the attacker?',
        a: 'The criminal is responsible, but is often never identified or has no ability to pay. A property owner\u2019s failure to provide reasonable security can be the only realistic source of recovery for a serious injury, and pursuing the owner does not excuse the criminal.',
      },
      {
        q: 'What evidence disappears quickly?',
        a: 'Surveillance video is often overwritten within days or weeks, and lighting and physical conditions get repaired or changed. Preserving footage and photographing the scene early can be decisive.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the foreseeability history and the security evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_NEGSECURITY_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Negligent Security Claims',
    title: 'San Bernardino Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Attacked or robbed at a San Bernardino apartment, store, or transit center? A property owner can be liable for failing to protect against foreseeable crime.',
    psychology: 'I was attacked at a San Bernardino property and I wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino negligent security lawyer',
      'apartment assault lawsuit california',
      'convenience store robbery injury california',
      'atm robbery negligent security california',
      'foreseeable crime property owner california',
    ],
    signals: [
      'Owner duty vs. foreseeable crime',
      'Prior-incident history',
      'Lighting & cameras decisive',
      'Convenience-store / ATM robberies',
      'Comparative negligence',
      'Preserve surveillance video',
    ],
    sections: {
      whyItMatters: `San Bernardino\u2019s apartment complexes, convenience stores and ATMs, transit centres, and shopping centres are the settings where negligent-security claims most often arise \u2014 and lighting and cameras are frequently the decisive facts. ${DUTY} ${FORESEEABILITY} ${MEASURES} ${CRIMINAL} Civil cases are filed in San Bernardino County Superior Court, generally within two years, or six months where a public entity owns the property.`,
      whatToTrack: [
        'The property type (apartment, store, transit, retail) and owner',
        'Prior crimes at or near the property and any police calls',
        'The lighting, locks, and access controls at the scene',
        'Whether cameras existed and functioned, and any footage',
        'Whether promised or posted security was present',
        'Any complaints or warnings the owner ignored',
        'Whether a public entity owns the property (six-month rule)',
        'The injuries and treatment from the attack',
      ],
      howClearCaseHelps: `ClearCaseIQ gathers the prior-incident history that establishes foreseeability at a San Bernardino property, preserves the surveillance and lighting evidence, and documents the security failures behind the attack. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was robbed at a convenience store or ATM. Can the property be liable?',
        a: 'Possibly. Where prior robberies or violent crime made the harm foreseeable and the owner failed to take reasonable measures \u2014 adequate lighting, working cameras, secure access \u2014 the owner can be liable for that failure. Lighting and camera conditions are often the decisive facts.',
      },
      {
        q: 'What makes an attack \u201cforeseeable\u201d?',
        a: 'Usually the property\u2019s own history \u2014 prior assaults, robberies, or violent crime at or immediately around the location \u2014 which puts the owner on notice. Records of prior incidents and police calls for service are central, which is why gathering them early matters.',
      },
      {
        q: 'Why pursue the property owner instead of the attacker?',
        a: 'The criminal is responsible, but is often never identified or has no ability to pay. A property owner\u2019s failure to provide reasonable security can be the only realistic source of recovery for a serious injury, and pursuing the owner does not excuse the criminal.',
      },
      {
        q: 'What evidence disappears quickly?',
        a: 'Surveillance video is often overwritten within days or weeks, and lighting and physical conditions get repaired or changed. Preserving footage and photographing the scene early can be decisive.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the foreseeability history and the security evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_NEGSECURITY_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Negligent Security Claims',
    title: 'Bakersfield Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Assaulted or robbed at a Bakersfield apartment, bar, or parking lot? A property owner can be liable for failing to protect against foreseeable crime.',
    psychology: 'I was attacked at a Bakersfield property and I wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield negligent security lawyer',
      'apartment assault lawsuit california',
      'bar fight injury property owner california',
      'parking lot attack claim california',
      'foreseeable crime property owner california',
    ],
    signals: [
      'Owner duty vs. foreseeable crime',
      'Prior-incident history',
      'Lighting, locks, cameras, guards',
      'Apartment / nightlife / parking',
      'Comparative negligence',
      'Preserve surveillance video',
    ],
    sections: {
      whyItMatters: `Bakersfield\u2019s apartment complexes, bars and nightlife venues, convenience stores, and parking lots are the settings where negligent-security claims most often arise \u2014 and lighting and prior-incident history are frequently decisive. ${DUTY} ${FORESEEABILITY} ${MEASURES} ${CRIMINAL} Civil cases are filed in Kern County Superior Court, generally within two years, or six months where a public entity owns the property.`,
      whatToTrack: [
        'The property type (apartment, bar, store, parking) and owner',
        'Prior crimes at or near the property and any police calls',
        'The lighting, locks, and access controls at the scene',
        'Whether cameras existed and functioned, and any footage',
        'Whether promised or posted security was present',
        'Any complaints or warnings the owner ignored',
        'Whether a public entity owns the property (six-month rule)',
        'The injuries and treatment from the attack',
      ],
      howClearCaseHelps: `ClearCaseIQ gathers the prior-incident history that establishes foreseeability at a Bakersfield property, preserves the surveillance and lighting evidence, and documents the security failures behind the attack. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was attacked at a bar or its parking lot. Can the venue be liable?',
        a: 'Possibly. A venue owes patrons reasonable care that can include measures against foreseeable violence, especially where prior incidents put it on notice. Whether adequate lighting, security, and monitoring were in place is central, and California case law recognises a duty to respond to a known, imminent threat.',
      },
      {
        q: 'What makes an attack \u201cforeseeable\u201d?',
        a: 'Usually the property\u2019s own history \u2014 prior assaults, robberies, or violent crime at or immediately around the location \u2014 which puts the owner on notice. Records of prior incidents and police calls for service are central, which is why gathering them early matters.',
      },
      {
        q: 'Why pursue the property owner instead of the attacker?',
        a: 'The criminal is responsible, but is often never identified or has no ability to pay. A property owner\u2019s failure to provide reasonable security can be the only realistic source of recovery for a serious injury, and pursuing the owner does not excuse the criminal.',
      },
      {
        q: 'What evidence disappears quickly?',
        a: 'Surveillance video is often overwritten within days or weeks, and lighting and physical conditions get repaired or changed. Preserving footage and photographing the scene early can be decisive.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the foreseeability history and the security evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_NEGSECURITY_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Negligent Security Claims',
    title: 'Anaheim Negligent Security Claims',
    eyebrow: 'California local injury guide',
    description:
      'Assaulted or robbed at an Anaheim hotel, event venue, or parking structure? A property owner can be liable for failing to protect against foreseeable crime.',
    psychology: 'I was attacked at an Anaheim hotel or venue and I wonder whether the owner should have prevented it.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim negligent security lawyer',
      'hotel assault lawsuit california',
      'event venue attack claim california',
      'parking structure robbery california',
      'foreseeable crime property owner california',
    ],
    signals: [
      'Owner duty vs. foreseeable crime',
      'Hotel / convention / venue security',
      'Prior-incident history',
      'Lighting, cameras, guards',
      'Comparative negligence',
      'Preserve surveillance video',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s resort-corridor hotels, its convention centre, its stadium and arena parking, and its bars and apartment complexes are the settings where negligent-security claims most often arise \u2014 and large venues that host crowds carry a real duty to plan for foreseeable risk. ${DUTY} ${FORESEEABILITY} ${MEASURES} ${CRIMINAL} Civil cases are filed in Orange County Superior Court, generally within two years, or six months where a public entity owns the property.`,
      whatToTrack: [
        'The property type (hotel, venue, parking, apartment) and owner',
        'Prior crimes at or near the property and any police calls',
        'The lighting, access controls, and staffing at the scene',
        'Whether cameras existed and functioned, and any footage',
        'Whether promised or posted security was present',
        'Any complaints or warnings the owner ignored',
        'Whether a public entity owns the venue (six-month rule)',
        'The injuries and treatment from the attack',
      ],
      howClearCaseHelps: `ClearCaseIQ gathers the prior-incident history that establishes foreseeability at an Anaheim hotel or venue, preserves the surveillance and staffing evidence, and documents the security failures behind the attack. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was attacked at a hotel or event venue. Can the operator be liable?',
        a: 'Possibly. A hotel or venue owes guests and patrons reasonable care that can include measures against foreseeable crime, and large venues that host crowds are expected to plan for foreseeable risk. Whether adequate security, lighting, and access controls were in place is central.',
      },
      {
        q: 'What makes an attack \u201cforeseeable\u201d?',
        a: 'Usually the property\u2019s own history \u2014 prior assaults, robberies, or violent crime at or immediately around the location \u2014 which puts the owner on notice. Records of prior incidents and police calls for service are central, which is why gathering them early matters.',
      },
      {
        q: 'Why pursue the property owner instead of the attacker?',
        a: 'The criminal is responsible, but is often never identified or has no ability to pay. A property owner\u2019s failure to provide reasonable security can be the only realistic source of recovery for a serious injury, and pursuing the owner does not excuse the criminal.',
      },
      {
        q: 'What evidence disappears quickly?',
        a: 'Surveillance video is often overwritten within days or weeks, and lighting, staffing, and physical conditions change. Preserving footage and documenting the scene early can be decisive.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the foreseeability history and the security evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const negligentSecurityCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [RIV_NEGSECURITY_SLUG]: {
    scenario: `A Riverside tenant was assaulted in an apartment parking area with broken lighting and a gate that had been inoperable for months despite complaints. The prior-incident history and ignored warnings established foreseeability. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve any video; photograph lighting and access points.'],
      ['First weeks', 'Gather prior-incident history and police calls.'],
      ['Assessment', 'Foreseeability and the security failures documented.'],
      ['Longer term', 'Liability and injury damages developed.'],
    ],
    severityLadder: [
      ['Duty', 'Reasonable care against foreseeable crime.'],
      ['Foreseeability', 'Prior incidents put the owner on notice.'],
      ['Measures', 'Lighting, locks, cameras, guards.'],
      ['Causation', 'The failure enabled the harm.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The assault injuries are documented.' },
      { label: 'Follow-up', copy: 'Ongoing physical treatment builds the record.' },
      { label: 'Psychological', copy: 'Trauma care is part of the harm.' },
      { label: 'Long-term', copy: 'Lasting effects are documented.' },
    ],
    settlementDrivers: [
      'Whether prior incidents made the harm foreseeable',
      'Whether reasonable security measures were missing',
      'Whether the failure enabled the attack',
      'Whether surveillance and lighting evidence is preserved',
      'The severity of the injuries',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'History is key', copy: 'Prior incidents establish foreseeability.' },
      { label: 'Preserve video', copy: 'Footage is overwritten quickly.' },
      { label: 'Owner is the source', copy: 'Often the only realistic recovery.' },
      { label: 'Measures matter', copy: 'Lighting and access controls are central.' },
    ],
    insuranceProblems: [
      'Surveillance video is lost before it is requested.',
      'The prior-incident history is never gathered.',
      'The claim is framed only against the unknown attacker.',
      'Lighting and access conditions are repaired unrecorded.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What type of property was it, and who owns it?' },
      { label: 'Step 2', question: 'Had crimes happened there before?' },
      { label: 'Step 3', question: 'What security was missing or broken?' },
      { label: 'Step 4', question: 'Is there surveillance video to preserve?' },
    ],
  },
  [SB_NEGSECURITY_SLUG]: {
    scenario: `A customer was robbed and injured at a San Bernardino convenience store with a broken camera and dark parking area, in a location with a string of prior robberies. Lighting and prior-incident history were the decisive facts. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve any video; photograph lighting and cameras.'],
      ['First weeks', 'Gather prior-incident history and police calls.'],
      ['Assessment', 'Foreseeability and the security failures documented.'],
      ['Longer term', 'Liability and injury damages developed.'],
    ],
    severityLadder: [
      ['Duty', 'Reasonable care against foreseeable crime.'],
      ['Foreseeability', 'Prior robberies put the owner on notice.'],
      ['Measures', 'Lighting and working cameras.'],
      ['Causation', 'The failure enabled the harm.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The injuries are documented.' },
      { label: 'Follow-up', copy: 'Ongoing physical treatment builds the record.' },
      { label: 'Psychological', copy: 'Trauma care is part of the harm.' },
      { label: 'Long-term', copy: 'Lasting effects are documented.' },
    ],
    settlementDrivers: [
      'Whether prior robberies made the harm foreseeable',
      'Whether lighting and cameras were adequate',
      'Whether the failure enabled the attack',
      'Whether surveillance evidence is preserved',
      'The severity of the injuries',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'History is key', copy: 'Prior robberies establish foreseeability.' },
      { label: 'Lighting decides', copy: 'Dark lots are a recurring failure.' },
      { label: 'Preserve video', copy: 'Footage is overwritten quickly.' },
      { label: 'Owner is the source', copy: 'Often the only realistic recovery.' },
    ],
    insuranceProblems: [
      'Surveillance video is lost before it is requested.',
      'The prior-robbery history is never gathered.',
      'The claim is framed only against the unknown attacker.',
      'Lighting conditions are changed unrecorded.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What type of property was it, and who owns it?' },
      { label: 'Step 2', question: 'Had robberies happened there before?' },
      { label: 'Step 3', question: 'Were the lighting and cameras adequate?' },
      { label: 'Step 4', question: 'Is there surveillance video to preserve?' },
    ],
  },
  [BAKERSFIELD_NEGSECURITY_SLUG]: {
    scenario: `A patron was assaulted outside a Bakersfield bar with no security and poor lighting, at a venue with a history of prior fights. The prior-incident record and absence of reasonable measures established the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve any video; photograph lighting and the scene.'],
      ['First weeks', 'Gather prior-incident history and police calls.'],
      ['Assessment', 'Foreseeability and the security failures documented.'],
      ['Longer term', 'Liability and injury damages developed.'],
    ],
    severityLadder: [
      ['Duty', 'Reasonable care against foreseeable crime.'],
      ['Foreseeability', 'Prior violence put the venue on notice.'],
      ['Measures', 'Security, lighting, and monitoring.'],
      ['Causation', 'The failure enabled the harm.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The assault injuries are documented.' },
      { label: 'Follow-up', copy: 'Ongoing physical treatment builds the record.' },
      { label: 'Psychological', copy: 'Trauma care is part of the harm.' },
      { label: 'Long-term', copy: 'Lasting effects are documented.' },
    ],
    settlementDrivers: [
      'Whether prior violence made the harm foreseeable',
      'Whether reasonable security and lighting were missing',
      'Whether the failure enabled the attack',
      'Whether surveillance evidence is preserved',
      'The severity of the injuries',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'History is key', copy: 'Prior fights establish foreseeability.' },
      { label: 'Venues must plan', copy: 'Known risks require reasonable measures.' },
      { label: 'Preserve video', copy: 'Footage is overwritten quickly.' },
      { label: 'Owner is the source', copy: 'Often the only realistic recovery.' },
    ],
    insuranceProblems: [
      'Surveillance video is lost before it is requested.',
      'The prior-incident history is never gathered.',
      'The claim is framed only against the unknown attacker.',
      'Lighting and staffing conditions are changed unrecorded.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What type of property was it, and who owns it?' },
      { label: 'Step 2', question: 'Had violence happened there before?' },
      { label: 'Step 3', question: 'What security or lighting was missing?' },
      { label: 'Step 4', question: 'Is there surveillance video to preserve?' },
    ],
  },
  [ANAHEIM_NEGSECURITY_SLUG]: {
    scenario: `A hotel guest was assaulted in an Anaheim parking structure with a propped-open access door and no patrol, at a property with prior incidents. The ignored access failure and prior history established foreseeability. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve any video; photograph access points and lighting.'],
      ['First weeks', 'Gather prior-incident history and police calls.'],
      ['Assessment', 'Foreseeability and the security failures documented.'],
      ['Longer term', 'Liability and injury damages developed.'],
    ],
    severityLadder: [
      ['Duty', 'Reasonable care against foreseeable crime.'],
      ['Foreseeability', 'Prior incidents put the operator on notice.'],
      ['Measures', 'Access controls, patrols, cameras.'],
      ['Causation', 'The failure enabled the harm.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The assault injuries are documented.' },
      { label: 'Follow-up', copy: 'Ongoing physical treatment builds the record.' },
      { label: 'Psychological', copy: 'Trauma care is part of the harm.' },
      { label: 'Long-term', copy: 'Lasting effects are documented.' },
    ],
    settlementDrivers: [
      'Whether prior incidents made the harm foreseeable',
      'Whether access controls and patrols were adequate',
      'Whether the failure enabled the attack',
      'Whether surveillance evidence is preserved',
      'The severity of the injuries',
      'Comparative-fault exposure',
    ],
    settlementValueDetails: [
      { label: 'History is key', copy: 'Prior incidents establish foreseeability.' },
      { label: 'Venues must plan', copy: 'Large venues owe crowds reasonable care.' },
      { label: 'Preserve video', copy: 'Footage is overwritten quickly.' },
      { label: 'Owner is the source', copy: 'Often the only realistic recovery.' },
    ],
    insuranceProblems: [
      'Surveillance video is lost before it is requested.',
      'The prior-incident history is never gathered.',
      'The claim is framed only against the unknown attacker.',
      'Access and staffing conditions are changed unrecorded.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What type of property was it, and who owns it?' },
      { label: 'Step 2', question: 'Had incidents happened there before?' },
      { label: 'Step 3', question: 'What access control or patrol was missing?' },
      { label: 'Step 4', question: 'Is there surveillance video to preserve?' },
    ],
  },
}
