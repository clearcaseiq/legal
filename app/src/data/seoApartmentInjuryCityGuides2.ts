import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, apartment / landlord premises-injury practice area (batch 2):
 * location-specific guides for San Diego, San Jose, Fresno, and Riverside,
 * extending the batch-1 hub (Los Angeles, Oakland, San Francisco, Sacramento).
 *
 * Local context, genuine rather than interpolated:
 *  - San Diego: a large coastal rental market with older beach-area buildings and
 *    balcony/deck exposure, plus a fatal balcony collapse in the region that drove
 *    the SB 721 inspection law into public attention.
 *  - San Jose: a high-cost Silicon Valley market with older converted buildings
 *    and large complexes, where deferred maintenance and stair/deck hazards recur.
 *  - Fresno: a Central Valley market with older low-income housing stock and a
 *    recurring pattern of code-enforcement violations and deferred repairs.
 *  - Riverside: a fast-growing Inland Empire market mixing older units and newer
 *    complexes, where balcony, stair, and detector failures recur.
 *
 * Applied accurately (identical to batch 1):
 *  - Landlord duty of reasonable care (Civil Code 1714; Rowland v. Christian).
 *  - Implied warranty of habitability (Civil Code 1941 and 1941.1).
 *  - Balcony-inspection law SB 721 for exterior elevated elements (3+ units).
 *  - Smoke and CO detector duties (Health & Safety Code 13113.7 and 17926).
 *  - Notice is central; pure comparative negligence.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a landlord is liable, whether they had notice of a hazard, and how the deadlines run depend on facts a licensed California attorney should review promptly.'

const DUTY =
  'A landlord owes tenants and their guests a duty of reasonable care to keep the property in a safe condition (Civil Code section 1714 and the Rowland v. Christian factors). The landlord is liable for a dangerous condition \u2014 a broken stair, a rotted deck, an unsafe railing \u2014 that the landlord knew or reasonably should have known about and had a reasonable opportunity to repair.'

const HABITABILITY =
  'The implied warranty of habitability (Civil Code sections 1941 and 1941.1) requires landlords to keep rentals in a livable, safe condition. A documented failure to repair a known dangerous condition \u2014 and the tenant complaints, repair requests, and code violations that prove the landlord knew \u2014 can support an injury claim.'

const BALCONY =
  'California\u2019s balcony-inspection law (Senate Bill 721) requires periodic inspection of exterior elevated elements \u2014 balconies, decks, and stairways \u2014 in buildings with three or more units, a law enacted after a fatal balcony collapse. Where a balcony, deck, or stairway failed, a missed or ignored inspection can be powerful evidence of negligence.'

const DETECTORS =
  'Landlords must provide working smoke and carbon-monoxide detectors (Health and Safety Code sections 13113.7 and 17926). A fire or carbon-monoxide injury in a unit with missing or non-working detectors points directly to a violation of these duties.'

const NOTICE =
  'These cases turn on notice. Tenant complaints, prior repair requests, maintenance and work-order history, and city code-enforcement violations show the landlord knew or should have known about the hazard and had time to fix it. Preserving that record \u2014 and photographing the condition before it is repaired \u2014 is essential. Pure comparative negligence applies.'

export const SD_APT_SLUG = '/san-diego-apartment-injury-claim'
export const SJ_APT_SLUG = '/san-jose-apartment-injury-claim'
export const FRE_APT_SLUG = '/fresno-apartment-injury-claim'
export const RIV_APT_SLUG = '/riverside-apartment-injury-claim'

export const apartmentInjuryCityGuidePages2: LandingPage[] = [
  {
    slug: SD_APT_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Apartment & Landlord Injury Claims',
    title: 'San Diego Apartment & Landlord Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a collapsed balcony, a broken stair, or an ignored repair in a San Diego rental? A landlord who knew of the hazard can be liable \u2014 and the SB 721 inspection history matters.',
    psychology: 'A dangerous condition in my San Diego apartment building hurt me and I do not know if the landlord is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego apartment injury lawyer',
      'balcony collapse lawsuit california',
      'landlord negligence broken stairs california',
      'sue landlord for unsafe apartment california',
      'apartment premises liability california',
    ],
    signals: [
      'Landlord duty of care (1714)',
      'Habitability (1941)',
      'Balcony/deck inspection (SB 721)',
      'Notice & complaint records',
      'Smoke/CO detectors',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s large coastal rental market includes many older beach-area buildings with balconies and decks exposed to salt air and weathering, and a fatal balcony collapse in the region helped drive the SB 721 inspection law \u2014 so balcony, deck, and stairway failures are a recurring source of landlord liability. ${DUTY} ${HABITABILITY} ${BALCONY} ${DETECTORS} ${NOTICE} Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The exact condition that caused the injury (stair, railing, balcony, deck)',
        'Photographs and measurements before any repair',
        'Prior complaints and repair requests to the landlord or manager',
        'Any city code-enforcement violations for the building',
        'For balcony/deck failures, the SB 721 inspection history',
        'Whether smoke and CO detectors were present and working',
        'The identity of the owner and any management company',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the San Diego building\u2019s owner and manager, gathers the complaint, repair, and code-violation records that establish notice, checks the SB 721 inspection history for balcony and deck failures, and preserves the condition before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A balcony or deck collapsed at my building. Does that change my claim?',
        a: 'It can strengthen it. California\u2019s balcony-inspection law (Senate Bill 721) requires periodic inspection of balconies, decks, and stairways in buildings with three or more units \u2014 a law driven in part by a fatal collapse. A missed or ignored inspection can be powerful evidence of negligence.',
      },
      {
        q: 'Can I sue my landlord if a broken stair or railing hurt me?',
        a: 'Possibly. A landlord owes a duty of reasonable care to keep the property safe (Civil Code section 1714) and is liable for a dangerous condition they knew or should have known about and had a reasonable chance to fix.',
      },
      {
        q: 'What if the landlord never fixed something I complained about?',
        a: 'That is central. These cases turn on notice \u2014 your prior complaints and repair requests, maintenance history, and any code violations show the landlord knew about the hazard and had time to fix it. Preserving that record is essential.',
      },
      {
        q: 'I was hurt in a fire with no working smoke alarm. Is that a claim?',
        a: 'It can be. Landlords must provide working smoke and carbon-monoxide detectors (Health and Safety Code sections 13113.7 and 17926). A fire injury in a unit with missing or non-working detectors points directly to a violation of these duties.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_APT_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Apartment & Landlord Injury Claims',
    title: 'San Jose Apartment & Landlord Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a dangerous condition or an ignored repair in a San Jose rental? Older converted buildings and deferred maintenance can point to landlord liability.',
    psychology: 'A dangerous condition in my San Jose apartment hurt me and I do not know if the landlord is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose apartment injury lawyer',
      'landlord negligence unsafe apartment california',
      'apartment stairway fall lawsuit california',
      'sue landlord for deferred maintenance california',
      'apartment premises liability california',
    ],
    signals: [
      'Landlord duty of care (1714)',
      'Habitability (1941)',
      'Deferred maintenance / stair-deck hazards',
      'Balcony/deck inspection (SB 721)',
      'Notice & complaint records',
      'Smoke/CO detectors',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s high-cost Silicon Valley rental market mixes older converted buildings with large complexes, and deferred maintenance, stair and deck hazards, and ignored repairs recur \u2014 the exact conditions that create landlord liability when a tenant or guest is hurt. ${DUTY} ${HABITABILITY} ${BALCONY} ${DETECTORS} ${NOTICE} Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'The exact condition that caused the injury (stair, railing, balcony, deck)',
        'Photographs and measurements before any repair',
        'Prior complaints and repair requests to the landlord or manager',
        'Any city code-enforcement violations for the building',
        'For balcony/deck failures, the SB 721 inspection history',
        'Whether smoke and CO detectors were present and working',
        'The identity of the owner and any management company',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the San Jose building\u2019s owner and manager, gathers the complaint, repair, and code-violation records that establish notice, checks the SB 721 inspection history, and preserves the condition before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue my landlord for a dangerous condition?',
        a: 'Possibly. A landlord owes a duty of reasonable care to keep the property safe (Civil Code section 1714) and is liable for a dangerous condition they knew or should have known about and had a reasonable chance to fix \u2014 a failing stair, an unsafe railing, or a rotted deck can qualify.',
      },
      {
        q: 'What if I complained and the landlord never fixed it?',
        a: 'That is central. These cases turn on notice \u2014 your prior complaints and repair requests, maintenance history, and any code violations show the landlord knew about the hazard and had time to fix it. Preserving that record is essential.',
      },
      {
        q: 'A balcony or deck failed. Does that change my claim?',
        a: 'It can strengthen it. California\u2019s balcony-inspection law (Senate Bill 721) requires periodic inspection of balconies, decks, and stairways in buildings with three or more units. A missed or ignored inspection can be powerful evidence of negligence.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The notice record \u2014 complaints, repair requests, and code violations \u2014 plus photographs of the condition before it is repaired, and, for a balcony or deck, the SB 721 inspection history. Landlords often repair the hazard quickly after an injury, so document it early.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRE_APT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Apartment & Landlord Injury Claims',
    title: 'Fresno Apartment & Landlord Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a dangerous condition or a fire-safety failure in a Fresno rental? Older housing stock and code-enforcement records can point straight to landlord liability.',
    psychology: 'A dangerous condition in my Fresno apartment hurt me and I do not know if the landlord is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno apartment injury lawyer',
      'landlord negligence unsafe building california',
      'apartment fire injury lawsuit california',
      'sue landlord for code violations california',
      'apartment premises liability california',
    ],
    signals: [
      'Landlord duty of care (1714)',
      'Habitability (1941)',
      'Code violations / deferred repairs',
      'Smoke/CO detectors',
      'Notice & complaint records',
      'Balcony/deck inspection (SB 721)',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s older, largely low-income housing stock has a recurring pattern of code-enforcement violations and deferred repairs \u2014 records that often document a hazard long before a tenant or guest is hurt, and that go directly to the landlord\u2019s notice. ${DUTY} ${HABITABILITY} ${DETECTORS} ${BALCONY} ${NOTICE} Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'The exact condition or fire-safety failure that caused the injury',
        'Photographs and measurements before any repair',
        'Prior complaints and repair requests to the landlord or manager',
        'City code-enforcement violations and inspection history',
        'Whether smoke and CO detectors were present and working',
        'For balcony/deck failures, the SB 721 inspection history',
        'The identity of the owner and any management company',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ pulls the Fresno building\u2019s code-enforcement and complaint history to establish notice, examines fire-safety and detector compliance, checks the SB 721 inspection record, and preserves the condition before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My building has a history of code violations. Does that help my claim?',
        a: 'It can. These cases turn on notice, and code-enforcement records, prior tenant complaints, and repair history can show the landlord knew about a hazard and failed to fix it. Those records are important to obtain early.',
      },
      {
        q: 'I was hurt in an apartment fire. Can I claim against the landlord?',
        a: 'Possibly. Landlords must provide working smoke and carbon-monoxide detectors (Health and Safety Code sections 13113.7 and 17926) and keep exits safe. A fire injury with missing detectors, blocked exits, or ignored hazards can point directly to a violation.',
      },
      {
        q: 'Can I sue my landlord for a dangerous condition?',
        a: 'Possibly. A landlord owes a duty of reasonable care to keep the property safe (Civil Code section 1714) and is liable for a dangerous condition they knew or should have known about and had a reasonable chance to fix.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The notice record \u2014 complaints, repair requests, and code violations \u2014 plus photographs of the condition before it is repaired. Document the hazard early, because landlords often repair it quickly after an injury.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIV_APT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Apartment & Landlord Injury Claims',
    title: 'Riverside Apartment & Landlord Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a broken stair, a failed balcony, or an ignored repair in a Riverside rental? A landlord who knew of the hazard can be liable \u2014 and the notice records tell the story.',
    psychology: 'A dangerous condition in my Riverside apartment hurt me and I do not know if the landlord is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside apartment injury lawyer',
      'landlord negligence broken stairs california',
      'balcony collapse lawsuit california',
      'sue landlord for unsafe apartment california',
      'apartment premises liability california',
    ],
    signals: [
      'Landlord duty of care (1714)',
      'Habitability (1941)',
      'Balcony/deck inspection (SB 721)',
      'Notice & complaint records',
      'Smoke/CO detectors',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s fast-growing Inland Empire rental market mixes older units with newer complexes, and balcony, stair, and detector failures recur across both \u2014 creating landlord liability when a tenant or guest is hurt by a hazard the owner knew about. ${DUTY} ${HABITABILITY} ${BALCONY} ${DETECTORS} ${NOTICE} Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'The exact condition that caused the injury (stair, railing, balcony, deck)',
        'Photographs and measurements before any repair',
        'Prior complaints and repair requests to the landlord or manager',
        'Any city code-enforcement violations for the building',
        'For balcony/deck failures, the SB 721 inspection history',
        'Whether smoke and CO detectors were present and working',
        'The identity of the owner and any management company',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the Riverside building\u2019s owner and manager, gathers the complaint, repair, and code-violation records that establish notice, checks the SB 721 inspection history, and preserves the condition before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue my landlord if a broken stair or railing hurt me?',
        a: 'Possibly. A landlord owes a duty of reasonable care to keep the property safe (Civil Code section 1714) and is liable for a dangerous condition they knew or should have known about and had a reasonable chance to fix. A broken stair, unsafe railing, or rotted deck can qualify.',
      },
      {
        q: 'A balcony or deck failed. Does that change my claim?',
        a: 'It can strengthen it. California\u2019s balcony-inspection law (Senate Bill 721) requires periodic inspection of balconies, decks, and stairways in buildings with three or more units. A missed or ignored inspection can be powerful evidence of negligence.',
      },
      {
        q: 'What if the landlord never fixed something I complained about?',
        a: 'That is central. These cases turn on notice \u2014 your prior complaints and repair requests, maintenance history, and any code violations show the landlord knew about the hazard and had time to fix it. Preserving that record is essential.',
      },
      {
        q: 'I was hurt in a fire with no working smoke alarm. Is that a claim?',
        a: 'It can be. Landlords must provide working smoke and carbon-monoxide detectors (Health and Safety Code sections 13113.7 and 17926). A fire injury in a unit with missing or non-working detectors points directly to a violation of these duties.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const apartmentInjuryCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SD_APT_SLUG]: {
    scenario: `A San Diego guest fell when a weathered beach-area balcony railing gave way. The building\u2019s missing SB 721 inspection and prior repair requests established the landlord\u2019s negligence. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph and measure the condition; note the exact location.'],
      ['First days', 'Gather prior complaints and repair requests; identify the owner.'],
      ['First weeks', 'Pull the SB 721 inspection and any code-enforcement records.'],
      ['Longer term', 'Notice and comparative-fault issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous condition', 'The failed railing breached the duty of care.'],
      ['Notice', 'Complaints and missed inspection show the landlord knew.'],
      ['Inspection', 'SB 721 records matter for balcony/deck failures.'],
      ['Preserve', 'Photograph the condition before repair.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the fall.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the condition was dangerous',
      'Whether the landlord had notice',
      'Whether an SB 721 inspection was missed',
      'Whether the condition was photographed before repair',
      'Whether detectors and safety features complied',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Inspection law helps', copy: 'A missed SB 721 inspection is strong evidence.' },
      { label: 'Notice is decisive', copy: 'Complaints and violations show knowledge.' },
      { label: 'Preserve the hazard', copy: 'Photos before repair are critical.' },
      { label: 'Identify the owner', copy: 'Owner and manager may share liability.' },
    ],
    insuranceProblems: [
      'The SB 721 inspection history is ignored.',
      'The complaint and repair records are never requested.',
      'The condition is repaired before it is documented.',
      'The owner and management company are never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What condition caused the injury, and where?' },
      { label: 'Step 2', question: 'Was it a balcony, deck, or stairway?' },
      { label: 'Step 3', question: 'Had you complained about it before?' },
      { label: 'Step 4', question: 'Did you photograph it before any repair?' },
    ],
  },
  [SJ_APT_SLUG]: {
    scenario: `A San Jose tenant fell on a deteriorated exterior stair at an older converted building. Prior repair requests and the city code file established the landlord\u2019s notice. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph and measure the condition; note the exact location.'],
      ['First days', 'Gather prior complaints and repair requests; identify the owner.'],
      ['First weeks', 'Pull code-enforcement and any SB 721 inspection records.'],
      ['Longer term', 'Notice and comparative-fault issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous condition', 'The hazard breached the duty of care.'],
      ['Notice', 'Complaints and violations show the landlord knew.'],
      ['Inspection', 'SB 721 records matter for stair/deck failures.'],
      ['Preserve', 'Photograph the condition before repair.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the fall.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the condition was dangerous',
      'Whether the landlord had notice',
      'Whether an SB 721 inspection was missed',
      'Whether the condition was photographed before repair',
      'Whether detectors and safety features complied',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Notice is decisive', copy: 'Complaints and violations show knowledge.' },
      { label: 'Inspection law helps', copy: 'A missed SB 721 inspection is strong evidence.' },
      { label: 'Preserve the hazard', copy: 'Photos before repair are critical.' },
      { label: 'Identify the owner', copy: 'Owner and manager may share liability.' },
    ],
    insuranceProblems: [
      'The complaint and code-violation records are never requested.',
      'The condition is repaired before it is documented.',
      'The SB 721 inspection history is ignored.',
      'The owner and management company are never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What condition caused the injury, and where?' },
      { label: 'Step 2', question: 'Had you complained about it before?' },
      { label: 'Step 3', question: 'Did you photograph it before any repair?' },
      { label: 'Step 4', question: 'Who owns and manages the building?' },
    ],
  },
  [FRE_APT_SLUG]: {
    scenario: `A Fresno tenant was burned in a fire in a unit with no working smoke detector. The city code-enforcement file documented prior violations, establishing the landlord\u2019s notice. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Document the fire-safety failure and the condition.'],
      ['First days', 'Gather prior complaints; identify the owner.'],
      ['First weeks', 'Pull code-enforcement and fire-inspection records.'],
      ['Longer term', 'Notice and detector-compliance issues developed.'],
    ],
    severityLadder: [
      ['Dangerous condition', 'The fire-safety failure breached the duty.'],
      ['Notice', 'Code violations show the landlord knew.'],
      ['Detectors', 'Missing detectors point to a statutory violation.'],
      ['Preserve', 'Document the condition before repair.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the fire.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether detectors and exits complied',
      'Whether the landlord had notice of the hazard',
      'Whether code-enforcement records document violations',
      'Whether the condition was documented before repair',
      'Whether the owner and manager are identified',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Detectors are statutory', copy: 'Missing detectors point to a violation.' },
      { label: 'Code file shows notice', copy: 'Prior violations prove knowledge.' },
      { label: 'Preserve the scene', copy: 'Document the failure before repair.' },
      { label: 'Identify the owner', copy: 'Owner and manager may share liability.' },
    ],
    insuranceProblems: [
      'The code-enforcement and fire-inspection records are never obtained.',
      'Detector and exit compliance goes unexamined.',
      'The condition is repaired before it is documented.',
      'The owner and management company are never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the fire-safety or structural failure?' },
      { label: 'Step 2', question: 'Were detectors and exits working?' },
      { label: 'Step 3', question: 'Had violations or complaints been recorded?' },
      { label: 'Step 4', question: 'Who owns and manages the building?' },
    ],
  },
  [RIV_APT_SLUG]: {
    scenario: `A Riverside tenant was hurt when a balcony railing gave way at a newer complex. The absence of a required SB 721 inspection, plus prior repair requests, established the landlord\u2019s negligence. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph and measure the condition; note the exact location.'],
      ['First days', 'Gather prior complaints and repair requests; identify the owner.'],
      ['First weeks', 'Pull the SB 721 inspection and any code-enforcement records.'],
      ['Longer term', 'Notice and comparative-fault issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous condition', 'The failed railing breached the duty of care.'],
      ['Notice', 'Complaints and missed inspection show the landlord knew.'],
      ['Inspection', 'SB 721 records matter for balcony/deck failures.'],
      ['Preserve', 'Photograph the condition before repair.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie the injuries to the fall.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the condition was dangerous',
      'Whether the landlord had notice',
      'Whether an SB 721 inspection was missed',
      'Whether the condition was photographed before repair',
      'Whether detectors and safety features complied',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Inspection law helps', copy: 'A missed SB 721 inspection is strong evidence.' },
      { label: 'Notice is decisive', copy: 'Complaints and violations show knowledge.' },
      { label: 'Preserve the hazard', copy: 'Photos before repair are critical.' },
      { label: 'Identify the owner', copy: 'Owner and manager may share liability.' },
    ],
    insuranceProblems: [
      'The SB 721 inspection history is ignored.',
      'The complaint and repair records are never requested.',
      'The condition is repaired before it is documented.',
      'The owner and management company are never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What condition caused the injury, and where?' },
      { label: 'Step 2', question: 'Was it a balcony, deck, or stairway?' },
      { label: 'Step 3', question: 'Had you complained about it before?' },
      { label: 'Step 4', question: 'Did you photograph it before any repair?' },
    ],
  },
}
