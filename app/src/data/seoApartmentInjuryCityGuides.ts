import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, apartment / landlord premises-injury practice area:
 * location-specific guides for Los Angeles, Oakland, San Francisco, and
 * Sacramento.
 *
 * An injury caused by a dangerous condition in a rental building \u2014 a broken
 * stair, a collapsed balcony or deck, a missing smoke or carbon-monoxide
 * detector, an unsafe fire escape, or a long-ignored repair \u2014 is a distinct
 * premises-liability claim against the landlord or property owner, separate from
 * a negligent-security claim (which turns on a third party\u2019s criminal act).
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: an enormous rental market with recurring stairway, balcony,
 *    and deferred-maintenance hazards across older multi-unit buildings.
 *  - Oakland: aging housing stock and a history of deferred maintenance and
 *    fire-safety failures in older and converted buildings.
 *  - San Francisco: dense, old, rent-controlled buildings where stairs, fire
 *    escapes, and light-well hazards recur and habitability disputes are common.
 *  - Sacramento: a large and growing rental market spanning older downtown
 *    buildings and newer suburban complexes.
 *
 * Applied accurately:
 *  - A landlord owes tenants and their guests a duty of reasonable care to keep
 *    the property in a safe condition (Civil Code section 1714 and the Rowland v.
 *    Christian factors), and is liable for a dangerous condition the landlord
 *    knew or should have known about and had a reasonable chance to fix.
 *  - The implied warranty of habitability (Civil Code sections 1941 and 1941.1)
 *    requires landlords to maintain rentals in a livable, safe condition, and a
 *    documented failure to repair can support an injury claim.
 *  - California\u2019s balcony-inspection law (Senate Bill 721) requires periodic
 *    inspection of exterior elevated elements \u2014 balconies, decks, stairways \u2014
 *    in buildings with three or more units, enacted after a fatal balcony
 *    collapse; a missed inspection can be powerful evidence.
 *  - Landlords must provide working smoke and carbon-monoxide detectors (Health
 *    and Safety Code sections 13113.7 and 17926).
 *  - Notice is central: tenant complaints, prior repair requests, and city code
 *    violations show the landlord knew. Pure comparative negligence applies.
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

export const LA_APT_SLUG = '/los-angeles-apartment-injury-claim'
export const OAK_APT_SLUG = '/oakland-apartment-injury-claim'
export const SF_APT_SLUG = '/san-francisco-apartment-injury-claim'
export const SAC_APT_SLUG = '/sacramento-apartment-injury-claim'

export const apartmentInjuryCityGuidePages: LandingPage[] = [
  {
    slug: LA_APT_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Apartment & Landlord Injury Claims',
    title: 'Los Angeles Apartment & Landlord Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a broken stair, a collapsed balcony, or an ignored repair in an LA apartment? A landlord who knew of the hazard can be liable \u2014 and the notice records tell the story.',
    psychology: 'A dangerous condition in my LA apartment building hurt me and I do not know if I can hold the landlord responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles apartment injury lawyer',
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
      whyItMatters: `Los Angeles\u2019s enormous rental market includes many older multi-unit buildings where stairway failures, balcony and deck hazards, and deferred maintenance recur \u2014 the exact conditions that create landlord liability when a tenant or guest is hurt. ${DUTY} ${HABITABILITY} ${BALCONY} ${DETECTORS} ${NOTICE} Civil cases are filed in Los Angeles County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ identifies the LA building\u2019s owner and manager, gathers the complaint, repair, and code-violation records that establish notice, checks the SB 721 inspection history for balcony and deck failures, and preserves the condition before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue my landlord if a broken stair or railing hurt me?',
        a: 'Possibly. A landlord owes a duty of reasonable care to keep the property safe (Civil Code section 1714) and is liable for a dangerous condition they knew or should have known about and had a reasonable chance to fix. A broken stair, unsafe railing, or rotted deck can qualify.',
      },
      {
        q: 'A balcony or deck collapsed. Does that change my claim?',
        a: 'It can strengthen it. California\u2019s balcony-inspection law (Senate Bill 721) requires periodic inspection of balconies, decks, and stairways in buildings with three or more units. A missed or ignored inspection can be powerful evidence of negligence.',
      },
      {
        q: 'What if the landlord never fixed something I complained about?',
        a: 'That is central. These cases turn on notice \u2014 your prior complaints and repair requests, maintenance history, and any code violations show the landlord knew about the hazard and had time to fix it. Preserving that record is essential.',
      },
      {
        q: 'I was hurt in a fire with no working smoke alarm. Is that a claim?',
        a: 'It can be. Landlords must provide working smoke and carbon-monoxide detectors (Health and Safety Code sections 13113.7 and 17926). A fire or carbon-monoxide injury in a unit with missing or non-working detectors points directly to a violation of these duties.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_APT_SLUG,
    category: 'Cities',
    cluster: 'Oakland Apartment & Landlord Injury Claims',
    title: 'Oakland Apartment & Landlord Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a dangerous condition or a fire-safety failure in an Oakland rental? Aging housing stock and deferred maintenance can point straight to landlord liability.',
    psychology: 'A dangerous condition or fire in my Oakland building hurt me and I do not know if the landlord is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland apartment injury lawyer',
      'landlord negligence unsafe building california',
      'apartment fire injury lawsuit california',
      'sue landlord for deferred maintenance california',
      'apartment premises liability california',
    ],
    signals: [
      'Landlord duty of care (1714)',
      'Habitability (1941)',
      'Deferred maintenance / fire safety',
      'Smoke/CO detectors',
      'Notice & code violations',
      'Balcony/deck inspection (SB 721)',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s aging housing stock and history of deferred maintenance and fire-safety failures in older and converted buildings make landlord-liability claims common \u2014 and code-enforcement records here often document the hazard long before an injury. ${DUTY} ${HABITABILITY} ${DETECTORS} A fire injury in a building with blocked exits or missing detectors, or an injury from a long-ignored structural hazard, can point directly to the landlord\u2019s breach. ${BALCONY} ${NOTICE} Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'The exact condition or fire-safety failure that caused the injury',
        'Photographs and measurements before any repair',
        'Prior complaints and repair requests to the landlord or manager',
        'City code-enforcement violations and inspection history',
        'Whether exits, detectors, and fire escapes were adequate',
        'For balcony/deck failures, the SB 721 inspection history',
        'The identity of the owner and any management company',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ pulls the Oakland building\u2019s code-enforcement and complaint history to establish notice, examines fire-safety and detector compliance, checks the SB 721 inspection record, and preserves the condition before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My Oakland building is old and poorly maintained. Does that help my claim?',
        a: 'It can. These cases turn on notice, and Oakland\u2019s code-enforcement records, prior tenant complaints, and repair history can show the landlord knew about a hazard and failed to fix it. Those records are important to obtain early.',
      },
      {
        q: 'I was hurt in an apartment fire. Can I claim against the landlord?',
        a: 'Possibly. Landlords must provide working smoke and carbon-monoxide detectors (Health and Safety Code sections 13113.7 and 17926) and keep exits and fire escapes safe. A fire injury with missing detectors, blocked exits, or ignored hazards can point directly to a violation.',
      },
      {
        q: 'Can I sue my landlord for a dangerous condition?',
        a: 'Possibly. A landlord owes a duty of reasonable care to keep the property safe (Civil Code section 1714) and is liable for a dangerous condition they knew or should have known about and had a reasonable chance to fix.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The notice record \u2014 tenant complaints, repair requests, and city code violations \u2014 plus photographs of the condition before it is repaired, and, for a balcony or deck, the SB 721 inspection history. Document the hazard early, because landlords often repair it quickly after an injury.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_APT_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Apartment & Landlord Injury Claims',
    title: 'San Francisco Apartment & Landlord Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt on a stairway, fire escape, or in an ignored repair in a San Francisco apartment? Dense, old buildings and strong tenant records can point to landlord liability.',
    psychology: 'A dangerous condition in my old San Francisco building hurt me and I do not know if I can hold the landlord responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco apartment injury lawyer',
      'landlord negligence stairway fall california',
      'fire escape injury lawsuit california',
      'sue landlord for unsafe apartment california',
      'apartment premises liability california',
    ],
    signals: [
      'Landlord duty of care (1714)',
      'Habitability (1941)',
      'Old-building stair/fire-escape hazards',
      'Notice & DBI records',
      'Smoke/CO detectors',
      'Balcony/deck inspection (SB 721)',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s dense, old, largely rent-controlled housing stock produces recurring hazards \u2014 worn stairs, aging fire escapes, and light-well and structural issues \u2014 and its active code-enforcement and inspection system can create a strong documentary trail of notice. ${DUTY} ${HABITABILITY} Habitability disputes are common here, and the same records that document a landlord\u2019s failure to repair can support an injury claim. ${BALCONY} ${DETECTORS} ${NOTICE} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'The exact condition that caused the injury (stair, fire escape, railing)',
        'Photographs and measurements before any repair',
        'Prior complaints and repair requests to the landlord or manager',
        'Building-inspection and code-enforcement (DBI) records',
        'For balcony/deck/stairway failures, the SB 721 inspection history',
        'Whether smoke and CO detectors were present and working',
        'The identity of the owner and any management company',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ gathers the San Francisco building-inspection and complaint records that establish notice, checks the SB 721 inspection history for stair and deck failures, examines detector and habitability compliance, and preserves the condition before it is repaired. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A worn stair or old fire escape hurt me. Can I claim?',
        a: 'Possibly. A landlord owes a duty of reasonable care to keep the property safe (Civil Code section 1714) and is liable for a dangerous condition \u2014 a worn stair, an unsafe fire escape, a broken railing \u2014 they knew or should have known about and had a reasonable chance to fix.',
      },
      {
        q: 'My building has a history of code violations. Does that help?',
        a: 'It can. These cases turn on notice, and San Francisco\u2019s building-inspection and code-enforcement records, along with your prior complaints, can show the landlord knew about a hazard and failed to fix it. Those records are important to obtain.',
      },
      {
        q: 'How does the balcony-inspection law apply?',
        a: 'California\u2019s balcony-inspection law (Senate Bill 721) requires periodic inspection of balconies, decks, and stairways in buildings with three or more units. Where one of those elements failed, a missed or ignored inspection can be powerful evidence of negligence.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The notice record \u2014 complaints, repair requests, and inspection or code-enforcement history \u2014 plus photographs of the condition before it is repaired. Landlords often repair the hazard quickly after an injury, so documenting it early is critical.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_APT_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Apartment & Landlord Injury Claims',
    title: 'Sacramento Apartment & Landlord Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt by a dangerous condition in a Sacramento rental \u2014 an older downtown building or a suburban complex? A landlord who knew of the hazard can be liable.',
    psychology: 'A dangerous condition in my Sacramento apartment hurt me and I do not know if the landlord is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento apartment injury lawyer',
      'landlord negligence unsafe apartment california',
      'apartment stairway fall lawsuit california',
      'sue landlord for dangerous condition california',
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
      whyItMatters: `Sacramento\u2019s large and growing rental market spans older downtown buildings and newer suburban complexes, and dangerous conditions \u2014 failing stairs and railings, balcony and deck hazards, and ignored repairs \u2014 arise in both, creating landlord liability when a tenant or guest is hurt. ${DUTY} ${HABITABILITY} ${BALCONY} ${DETECTORS} ${NOTICE} Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'The exact condition that caused the injury',
        'Photographs and measurements before any repair',
        'Prior complaints and repair requests to the landlord or manager',
        'Any city code-enforcement violations for the building',
        'For balcony/deck failures, the SB 721 inspection history',
        'Whether smoke and CO detectors were present and working',
        'The identity of the owner and any management company',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the Sacramento building\u2019s owner and manager, gathers the complaint, repair, and code-violation records that establish notice, checks the SB 721 inspection history, and preserves the condition before it is repaired. ${NOT_ADVICE}`,
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
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the notice records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const apartmentInjuryCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_APT_SLUG]: {
    scenario: `An LA tenant fell when a long-complained-about exterior stair gave way. The repair requests and city code violations established notice, and photographs taken before the landlord rebuilt the stair preserved the condition. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph and measure the condition; note the exact location.'],
      ['First days', 'Gather prior complaints and repair requests; identify the owner.'],
      ['First weeks', 'Pull code-enforcement and any SB 721 inspection records.'],
      ['Longer term', 'Notice and comparative-fault issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous condition', 'The hazard breached the duty of care.'],
      ['Notice', 'Complaints and violations show the landlord knew.'],
      ['Inspection', 'SB 721 records matter for balcony/deck/stair failures.'],
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
      'Detector and fire-safety compliance goes unexamined.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What condition caused the injury, and where?' },
      { label: 'Step 2', question: 'Had you complained about it before?' },
      { label: 'Step 3', question: 'Did you photograph it before any repair?' },
      { label: 'Step 4', question: 'Who owns and manages the building?' },
    ],
  },
  [OAK_APT_SLUG]: {
    scenario: `An Oakland tenant was burned in a fire in a unit with no working smoke detector and a blocked exit. The city\u2019s code-enforcement file documented prior violations, establishing the landlord\u2019s notice. ${NOT_ADVICE}`,
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
  [SF_APT_SLUG]: {
    scenario: `A San Francisco tenant fell on a decayed fire escape. The Department of Building Inspection file and prior habitability complaints established notice, and photographs preserved the condition before it was replaced. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Photograph the condition; note the exact location.'],
      ['First days', 'Gather prior complaints and repair requests; identify the owner.'],
      ['First weeks', 'Pull DBI inspection and any SB 721 records.'],
      ['Longer term', 'Notice and habitability issues developed; treatment documented.'],
    ],
    severityLadder: [
      ['Dangerous condition', 'The old-building hazard breached the duty.'],
      ['Notice', 'DBI records and complaints show the landlord knew.'],
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
      'Whether DBI records establish notice',
      'Whether an SB 721 inspection was missed',
      'Whether the condition was photographed before repair',
      'Whether habitability records support the claim',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'DBI file shows notice', copy: 'Inspection records prove knowledge.' },
      { label: 'Inspection law helps', copy: 'A missed SB 721 inspection is strong evidence.' },
      { label: 'Habitability overlaps', copy: 'Repair-failure records support the injury claim.' },
      { label: 'Preserve the hazard', copy: 'Photos before repair are critical.' },
    ],
    insuranceProblems: [
      'The DBI and complaint records are never requested.',
      'The condition is repaired before it is documented.',
      'The SB 721 inspection history is ignored.',
      'Habitability records that show notice go unused.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What condition caused the injury, and where?' },
      { label: 'Step 2', question: 'Had you complained about it before?' },
      { label: 'Step 3', question: 'Did you photograph it before any repair?' },
      { label: 'Step 4', question: 'Who owns and manages the building?' },
    ],
  },
  [SAC_APT_SLUG]: {
    scenario: `A Sacramento tenant was hurt when a balcony railing gave way at a suburban complex. The absence of a required SB 721 inspection, plus prior repair requests, established the landlord\u2019s negligence. ${NOT_ADVICE}`,
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
