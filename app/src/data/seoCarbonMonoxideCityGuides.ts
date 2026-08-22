import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, carbon-monoxide-poisoning practice area: location-specific guides
 * for Los Angeles, Oakland, San Francisco, and Sacramento.
 *
 * A carbon-monoxide (CO) poisoning claim is distinct because the hazard is
 * invisible, the symptoms are routinely misdiagnosed, and liability can rest
 * with several very different parties \u2014 a landlord who failed to maintain
 * heating or install a required alarm, the manufacturer of a defective fuel-
 * burning appliance, or an HVAC contractor who installed or serviced it
 * improperly. California\u2019s CO-alarm requirement makes a missing or non-working
 * alarm powerful evidence.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: a very large rental market with many older units and gas
 *    appliances.
 *  - Oakland: an aging housing stock where deferred maintenance is common.
 *  - San Francisco: old buildings heavily reliant on gas heating and appliances.
 *  - Sacramento: colder winters drive heavy heating use in older homes.
 *
 * Applied accurately:
 *  - CO is odorless and colorless, and its symptoms \u2014 headache, nausea,
 *    dizziness, confusion \u2014 mimic the flu and are often misdiagnosed, so the
 *    poisoning can go unrecognised until it is severe or fatal, and it can cause
 *    lasting neurological injury.
 *  - Liability can rest with a landlord who failed to maintain heating or to
 *    install a required alarm, a manufacturer of a defective furnace, water
 *    heater, or generator (a strict product-liability claim), or an HVAC
 *    contractor whose installation or repair was negligent.
 *  - California requires carbon-monoxide alarms in dwelling units that have a
 *    fuel-burning appliance or an attached garage (Health and Safety Code
 *    section 17926); a missing or non-working alarm is strong evidence of a
 *    landlord\u2019s negligence.
 *  - The evidence is perishable: the appliance and the alarm (or its absence)
 *    should be preserved, any fire-department or utility CO readings obtained,
 *    carboxyhemoglobin blood levels measured early, and maintenance and repair
 *    records collected. The deadline is generally two years (Code of Civil
 *    Procedure section 335.1), or six months for a public-entity landlord.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Who is liable for a carbon-monoxide poisoning, and which deadline applies, depend on facts a licensed California attorney should review promptly.'

const SILENT =
  'Carbon monoxide is odorless and colorless, and its symptoms \u2014 headache, nausea, dizziness, and confusion \u2014 mimic the flu, so poisoning is routinely missed until it is severe or fatal. It can also cause lasting neurological injury, which makes early recognition and documentation, including a carboxyhemoglobin blood test, especially important.'

const SOURCES =
  'Liability for a CO poisoning can rest with more than one party: a landlord who failed to maintain the heating system or to install a required alarm; the manufacturer of a defective furnace, water heater, or generator (a strict product-liability claim); or an HVAC contractor whose installation or repair was negligent. Identifying every responsible party early is central.'

const DETECTOR =
  'California requires carbon-monoxide alarms in dwelling units that have a fuel-burning appliance or an attached garage (Health and Safety Code section 17926). A missing or non-working alarm is strong evidence of a landlord\u2019s negligence, because a working alarm is exactly what the law requires to warn occupants of an invisible hazard.'

const EVIDENCE =
  'CO evidence is perishable and must be preserved quickly: the appliance suspected as the source and the alarm (or proof of its absence) should be secured, any fire-department or utility CO readings obtained, carboxyhemoglobin blood levels measured as early as possible, and the property\u2019s maintenance and repair records collected before they are lost or altered.'

export const LA_CO_SLUG = '/los-angeles-carbon-monoxide-poisoning-claim'
export const OAK_CO_SLUG = '/oakland-carbon-monoxide-poisoning-claim'
export const SF_CO_SLUG = '/san-francisco-carbon-monoxide-poisoning-claim'
export const SAC_CO_SLUG = '/sacramento-carbon-monoxide-poisoning-claim'

export const carbonMonoxideCityGuidePages: LandingPage[] = [
  {
    slug: LA_CO_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Carbon Monoxide Poisoning Claims',
    title: 'Los Angeles Carbon Monoxide Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Poisoned by carbon monoxide in an LA rental? A missing or broken CO alarm is strong evidence \u2014 and a landlord, appliance maker, or contractor may be liable.',
    psychology: 'My family got sick from carbon monoxide in our LA apartment and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles carbon monoxide poisoning lawyer',
      'apartment co poisoning claim california',
      'landlord carbon monoxide alarm law california',
      'defective furnace co poisoning california',
      'carbon monoxide injury attorney california',
    ],
    signals: [
      'Silent, often-misdiagnosed hazard',
      'Landlord, appliance, or contractor liability',
      'CO alarm required (H&S 17926)',
      'Preserve the appliance & alarm',
      'Carboxyhemoglobin testing',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s very large rental market includes many older units with gas appliances, where a poorly maintained furnace or water heater \u2014 without a working CO alarm \u2014 can poison an entire household before anyone realises the cause. ${SILENT} ${SOURCES} ${DETECTOR} ${EVIDENCE} The deadline is generally two years. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether a working CO alarm was present as the law requires',
        'The suspected source (furnace, water heater, generator)',
        'Any fire-department or utility CO readings',
        'Carboxyhemoglobin blood levels, measured early',
        'The landlord\u2019s maintenance and repair records',
        'Whether an appliance defect or bad repair is involved',
        'All household members exposed and their symptoms',
        'Medical treatment and any neurological follow-up',
      ],
      howClearCaseHelps: `ClearCaseIQ moves to preserve the LA appliance and alarm evidence, gathers the CO readings and carboxyhemoglobin results, pulls the maintenance records, and identifies each potentially liable party \u2014 landlord, manufacturer, or contractor. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'There was no carbon-monoxide alarm in my unit. Does that matter?',
        a: 'Yes, significantly. California requires CO alarms in dwelling units with a fuel-burning appliance or an attached garage (Health and Safety Code section 17926). A missing or non-working alarm is strong evidence of a landlord\u2019s negligence, because the alarm is exactly what the law requires to warn of this invisible hazard.',
      },
      {
        q: 'Who can be responsible for a carbon-monoxide poisoning?',
        a: 'Often more than one party: a landlord who failed to maintain the heating or install a required alarm, the manufacturer of a defective furnace, water heater, or generator, or an HVAC contractor whose work was negligent. Identifying every responsible party early is central.',
      },
      {
        q: 'My symptoms were mistaken for the flu. Does that hurt my claim?',
        a: 'Not necessarily. CO symptoms routinely mimic the flu and are often misdiagnosed, which is part of why the hazard is so dangerous. A carboxyhemoglobin blood test measured early is the key objective evidence, so documenting exposure as soon as it is suspected is important.',
      },
      {
        q: 'What should be preserved?',
        a: 'The appliance suspected as the source and the alarm (or proof of its absence), along with any fire-department or utility CO readings and the property\u2019s maintenance records. This evidence is perishable and can be lost or altered quickly.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_CO_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Carbon Monoxide Poisoning Claims',
    title: 'Oakland Carbon Monoxide Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Poisoned by carbon monoxide in an Oakland rental? In aging housing with deferred maintenance, a missing CO alarm or bad furnace can point to landlord liability.',
    psychology: 'My family got carbon-monoxide sick in our older Oakland apartment and I think the landlord ignored the heating.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland carbon monoxide poisoning lawyer',
      'apartment co poisoning claim california',
      'landlord carbon monoxide alarm law california',
      'deferred maintenance furnace co california',
      'carbon monoxide injury attorney california',
    ],
    signals: [
      'Silent, often-misdiagnosed hazard',
      'Deferred-maintenance heating systems',
      'CO alarm required (H&S 17926)',
      'Preserve the appliance & alarm',
      'Carboxyhemoglobin testing',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s aging housing stock, where deferred maintenance is common, is exactly where an old or neglected furnace can leak carbon monoxide \u2014 and where a missing or ignored CO alarm points to a landlord\u2019s failure. ${SILENT} ${SOURCES} ${DETECTOR} ${EVIDENCE} The deadline is generally two years. Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'Whether a working CO alarm was present as the law requires',
        'The condition and age of the heating system',
        'Any prior complaints about heating or ventilation',
        'Any fire-department or utility CO readings',
        'Carboxyhemoglobin blood levels, measured early',
        'The landlord\u2019s maintenance and repair records',
        'All household members exposed and their symptoms',
        'Medical treatment and any neurological follow-up',
      ],
      howClearCaseHelps: `ClearCaseIQ documents the condition of an Oakland unit\u2019s heating system and any prior complaints, preserves the appliance and alarm evidence, and gathers the CO readings and carboxyhemoglobin results that establish the poisoning and the landlord\u2019s failure. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My older Oakland building had a neglected furnace. Does that help my claim?',
        a: 'It can. A landlord must maintain the heating system, and prior complaints or a history of deferred maintenance can show the failure was known. Combined with a missing or non-working CO alarm, that supports a negligence claim.',
      },
      {
        q: 'There was no carbon-monoxide alarm. Does that matter?',
        a: 'Yes. California requires CO alarms in dwelling units with a fuel-burning appliance or attached garage (Health and Safety Code section 17926). A missing or non-working alarm is strong evidence of the landlord\u2019s negligence.',
      },
      {
        q: 'My symptoms were mistaken for the flu. Does that hurt my claim?',
        a: 'Not necessarily. CO symptoms routinely mimic the flu and are often misdiagnosed. A carboxyhemoglobin blood test measured early is the key objective evidence, so documenting exposure as soon as it is suspected matters.',
      },
      {
        q: 'What should be preserved?',
        a: 'The furnace or appliance suspected as the source and the alarm (or proof of its absence), any fire-department or utility CO readings, and the property\u2019s maintenance and complaint records \u2014 all of which can be lost quickly.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_CO_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Carbon Monoxide Poisoning Claims',
    title: 'San Francisco Carbon Monoxide Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Poisoned by carbon monoxide in a San Francisco building? Old gas heating and appliances \u2014 without a working CO alarm \u2014 can point to landlord or contractor liability.',
    psychology: 'My family got carbon-monoxide sick in an old San Francisco building with gas heat and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco carbon monoxide poisoning lawyer',
      'apartment co poisoning claim california',
      'landlord carbon monoxide alarm law california',
      'gas heater co poisoning california',
      'carbon monoxide injury attorney california',
    ],
    signals: [
      'Silent, often-misdiagnosed hazard',
      'Old buildings with gas heating',
      'CO alarm required (H&S 17926)',
      'Preserve the appliance & alarm',
      'Carboxyhemoglobin testing',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s old building stock relies heavily on gas heating and appliances, and in a tightly sealed older unit a poorly vented or defective gas heater can build dangerous carbon-monoxide levels without warning. ${SILENT} ${SOURCES} ${DETECTOR} ${EVIDENCE} The deadline is generally two years. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Whether a working CO alarm was present as the law requires',
        'The suspected source (gas heater, water heater, furnace)',
        'Any recent installation or repair of the appliance',
        'Any fire-department or utility CO readings',
        'Carboxyhemoglobin blood levels, measured early',
        'The landlord\u2019s and any contractor\u2019s records',
        'All household members exposed and their symptoms',
        'Medical treatment and any neurological follow-up',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the San Francisco appliance and alarm evidence, examines any recent installation or repair for contractor liability, and gathers the CO readings and carboxyhemoglobin results that establish the poisoning. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An old gas heater in my SF unit was the source. Who is responsible?',
        a: 'Potentially more than one party: the landlord for failing to maintain it or install a required alarm, the manufacturer if the appliance was defective, or a contractor whose installation or repair was negligent. Identifying each is central.',
      },
      {
        q: 'There was no carbon-monoxide alarm. Does that matter?',
        a: 'Yes. California requires CO alarms in dwelling units with a fuel-burning appliance or attached garage (Health and Safety Code section 17926). A missing or non-working alarm is strong evidence of the landlord\u2019s negligence.',
      },
      {
        q: 'The heater was recently serviced. Does that change anything?',
        a: 'It can. A negligent installation or repair can make an HVAC contractor liable in addition to the landlord. The service records and the contractor\u2019s work should be examined closely.',
      },
      {
        q: 'What should be preserved?',
        a: 'The gas heater or appliance suspected as the source and the alarm (or proof of its absence), any fire-department or utility CO readings, and the maintenance and service records \u2014 all of which can be lost quickly.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_CO_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Carbon Monoxide Poisoning Claims',
    title: 'Sacramento Carbon Monoxide Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Poisoned by carbon monoxide in a Sacramento-area home? Heavy winter heating in older homes \u2014 without a working CO alarm \u2014 can point to landlord or contractor liability.',
    psychology: 'My family got carbon-monoxide sick running the heat in our Sacramento home this winter and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento carbon monoxide poisoning lawyer',
      'apartment co poisoning claim california',
      'landlord carbon monoxide alarm law california',
      'furnace co poisoning winter california',
      'carbon monoxide injury attorney california',
    ],
    signals: [
      'Silent, often-misdiagnosed hazard',
      'Heavy winter heating in older homes',
      'CO alarm required (H&S 17926)',
      'Preserve the appliance & alarm',
      'Carboxyhemoglobin testing',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s colder winters drive heavy furnace and heater use in older homes, and a cracked heat exchanger or poorly vented furnace running for hours can flood a home with carbon monoxide \u2014 especially where no working alarm is present. ${SILENT} ${SOURCES} ${DETECTOR} ${EVIDENCE} The deadline is generally two years, or six months for a public-entity landlord. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Whether a working CO alarm was present as the law requires',
        'The suspected source (furnace, heater, water heater)',
        'Any recent service, repair, or known heating problems',
        'Any fire-department or utility CO readings',
        'Carboxyhemoglobin blood levels, measured early',
        'The landlord\u2019s and any contractor\u2019s records',
        'All household members exposed and their symptoms',
        'Medical treatment and any neurological follow-up',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the Sacramento-area furnace and alarm evidence, examines any recent service for contractor liability, and gathers the CO readings and carboxyhemoglobin results that establish the poisoning and any landlord failure. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Our furnace ran all winter and we got sick. Who is responsible?',
        a: 'Potentially the landlord for failing to maintain the furnace or install a required alarm, the manufacturer if it was defective, or a contractor whose service was negligent \u2014 for example, missing a cracked heat exchanger. Identifying each responsible party is central.',
      },
      {
        q: 'There was no carbon-monoxide alarm. Does that matter?',
        a: 'Yes. California requires CO alarms in dwelling units with a fuel-burning appliance or attached garage (Health and Safety Code section 17926). A missing or non-working alarm is strong evidence of the landlord\u2019s negligence.',
      },
      {
        q: 'My symptoms were mistaken for the flu. Does that hurt my claim?',
        a: 'Not necessarily. CO symptoms routinely mimic the flu and are often misdiagnosed. A carboxyhemoglobin blood test measured early is the key objective evidence, so documenting exposure as soon as it is suspected matters.',
      },
      {
        q: 'What should be preserved?',
        a: 'The furnace or appliance suspected as the source and the alarm (or proof of its absence), any fire-department or utility CO readings, and the maintenance and service records \u2014 all of which can be lost quickly.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the records, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const carbonMonoxideCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_CO_SLUG]: {
    scenario: `An LA family fell ill over days in an apartment with no CO alarm. A carboxyhemoglobin test confirmed poisoning, and a cracked water-heater vent \u2014 plus the missing alarm \u2014 established landlord liability. ${NOT_ADVICE}`,
    timeline: [
      ['First hours', 'Get to fresh air and to medical care; request a CO blood test.'],
      ['First days', 'Preserve the appliance and note the missing/broken alarm.'],
      ['First weeks', 'Obtain CO readings and the landlord\u2019s maintenance records.'],
      ['Longer term', 'Liability, sources, and neurological follow-up developed.'],
    ],
    severityLadder: [
      ['Alarm required', 'A missing alarm shows negligence.'],
      ['Source', 'The appliance must be identified.'],
      ['Testing', 'Carboxyhemoglobin confirms poisoning.'],
      ['Injury', 'Neurological effects can be lasting.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Oxygen treatment and CO blood testing.' },
      { label: 'Diagnosis', copy: 'Carboxyhemoglobin documents exposure.' },
      { label: 'Neuro follow-up', copy: 'Lasting effects are assessed.' },
      { label: 'Documentation', copy: 'All exposed members and care are recorded.' },
    ],
    settlementDrivers: [
      'Whether a required CO alarm was missing or broken',
      'Whether the appliance source is identified and preserved',
      'Whether carboxyhemoglobin testing confirms poisoning',
      'Whether landlord maintenance failures are shown',
      'Whether a product or contractor is also liable',
      'Severity, including neurological injury',
    ],
    settlementValueDetails: [
      { label: 'Alarm law helps', copy: 'A missing alarm is strong evidence.' },
      { label: 'Preserve the source', copy: 'The appliance proves causation.' },
      { label: 'Test early', copy: 'Carboxyhemoglobin fades quickly.' },
      { label: 'Multiple parties', copy: 'Landlord, maker, or contractor.' },
    ],
    insuranceProblems: [
      'The appliance is repaired or replaced before preservation.',
      'No carboxyhemoglobin test is done early.',
      'The missing/broken alarm goes undocumented.',
      'Maintenance records are never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was there a working CO alarm?' },
      { label: 'Step 2', question: 'What appliance is the suspected source?' },
      { label: 'Step 3', question: 'Was a CO blood test done?' },
      { label: 'Step 4', question: 'Who else was exposed, and how are they?' },
    ],
  },
  [OAK_CO_SLUG]: {
    scenario: `An Oakland tenant had complained about the old furnace for months. When the family was poisoned, the prior complaints and the missing alarm established the landlord knew and failed to act. ${NOT_ADVICE}`,
    timeline: [
      ['First hours', 'Get to fresh air and to medical care; request a CO blood test.'],
      ['First days', 'Preserve the furnace; gather prior complaints.'],
      ['First weeks', 'Obtain CO readings and maintenance records.'],
      ['Longer term', 'Notice, liability, and neurological follow-up developed.'],
    ],
    severityLadder: [
      ['Known problem', 'Prior complaints show notice.'],
      ['Alarm required', 'A missing alarm shows negligence.'],
      ['Source', 'The furnace must be identified.'],
      ['Injury', 'Neurological effects can be lasting.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Oxygen treatment and CO blood testing.' },
      { label: 'Diagnosis', copy: 'Carboxyhemoglobin documents exposure.' },
      { label: 'Neuro follow-up', copy: 'Lasting effects are assessed.' },
      { label: 'Documentation', copy: 'All exposed members and care are recorded.' },
    ],
    settlementDrivers: [
      'Whether prior complaints show the landlord knew',
      'Whether a required CO alarm was missing or broken',
      'Whether the furnace source is preserved',
      'Whether carboxyhemoglobin testing confirms poisoning',
      'Whether deferred maintenance is documented',
      'Severity, including neurological injury',
    ],
    settlementValueDetails: [
      { label: 'Notice matters', copy: 'Prior complaints show knowledge.' },
      { label: 'Alarm law helps', copy: 'A missing alarm is strong evidence.' },
      { label: 'Preserve the furnace', copy: 'It proves causation.' },
      { label: 'Test early', copy: 'Carboxyhemoglobin fades quickly.' },
    ],
    insuranceProblems: [
      'Prior complaints are never gathered.',
      'The furnace is repaired before preservation.',
      'No carboxyhemoglobin test is done early.',
      'The missing/broken alarm goes undocumented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you complain about the heating before?' },
      { label: 'Step 2', question: 'Was there a working CO alarm?' },
      { label: 'Step 3', question: 'Was a CO blood test done?' },
      { label: 'Step 4', question: 'Who else was exposed, and how are they?' },
    ],
  },
  [SF_CO_SLUG]: {
    scenario: `A San Francisco unit\u2019s recently serviced gas heater vented CO into a sealed old building. The service records made the HVAC contractor liable alongside the landlord. ${NOT_ADVICE}`,
    timeline: [
      ['First hours', 'Get to fresh air and to medical care; request a CO blood test.'],
      ['First days', 'Preserve the heater; gather recent service records.'],
      ['First weeks', 'Obtain CO readings and the contractor\u2019s work history.'],
      ['Longer term', 'Contractor and landlord liability developed.'],
    ],
    severityLadder: [
      ['Recent service', 'A bad repair implicates a contractor.'],
      ['Alarm required', 'A missing alarm shows negligence.'],
      ['Source', 'The heater must be identified.'],
      ['Injury', 'Neurological effects can be lasting.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Oxygen treatment and CO blood testing.' },
      { label: 'Diagnosis', copy: 'Carboxyhemoglobin documents exposure.' },
      { label: 'Neuro follow-up', copy: 'Lasting effects are assessed.' },
      { label: 'Documentation', copy: 'All exposed members and care are recorded.' },
    ],
    settlementDrivers: [
      'Whether a recent installation or repair was negligent',
      'Whether a required CO alarm was missing or broken',
      'Whether the heater source is preserved',
      'Whether carboxyhemoglobin testing confirms poisoning',
      'Whether landlord and contractor records are obtained',
      'Severity, including neurological injury',
    ],
    settlementValueDetails: [
      { label: 'Contractor liability', copy: 'A bad repair adds a defendant.' },
      { label: 'Alarm law helps', copy: 'A missing alarm is strong evidence.' },
      { label: 'Preserve the heater', copy: 'It proves causation.' },
      { label: 'Test early', copy: 'Carboxyhemoglobin fades quickly.' },
    ],
    insuranceProblems: [
      'The service records are never obtained.',
      'The heater is repaired before preservation.',
      'No carboxyhemoglobin test is done early.',
      'The missing/broken alarm goes undocumented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the heater recently installed or serviced?' },
      { label: 'Step 2', question: 'Was there a working CO alarm?' },
      { label: 'Step 3', question: 'Was a CO blood test done?' },
      { label: 'Step 4', question: 'Who else was exposed, and how are they?' },
    ],
  },
  [SAC_CO_SLUG]: {
    scenario: `A Sacramento family running the furnace through winter was poisoned by a cracked heat exchanger. Preserving the furnace and the carboxyhemoglobin results established the source and the harm. ${NOT_ADVICE}`,
    timeline: [
      ['First hours', 'Get to fresh air and to medical care; request a CO blood test.'],
      ['First days', 'Preserve the furnace; note the alarm status.'],
      ['First weeks', 'Obtain CO readings and service/maintenance records.'],
      ['Longer term', 'Source, liability, and neurological follow-up developed.'],
    ],
    severityLadder: [
      ['Heavy heating', 'Long furnace runs raise the risk.'],
      ['Alarm required', 'A missing alarm shows negligence.'],
      ['Source', 'A cracked exchanger must be identified.'],
      ['Injury', 'Neurological effects can be lasting.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Oxygen treatment and CO blood testing.' },
      { label: 'Diagnosis', copy: 'Carboxyhemoglobin documents exposure.' },
      { label: 'Neuro follow-up', copy: 'Lasting effects are assessed.' },
      { label: 'Documentation', copy: 'All exposed members and care are recorded.' },
    ],
    settlementDrivers: [
      'Whether the furnace source is identified and preserved',
      'Whether a required CO alarm was missing or broken',
      'Whether carboxyhemoglobin testing confirms poisoning',
      'Whether landlord maintenance failures are shown',
      'Whether a product or contractor is also liable',
      'Severity, including neurological injury',
    ],
    settlementValueDetails: [
      { label: 'Preserve the furnace', copy: 'A cracked exchanger proves causation.' },
      { label: 'Alarm law helps', copy: 'A missing alarm is strong evidence.' },
      { label: 'Test early', copy: 'Carboxyhemoglobin fades quickly.' },
      { label: 'Multiple parties', copy: 'Landlord, maker, or contractor.' },
    ],
    insuranceProblems: [
      'The furnace is repaired or replaced before preservation.',
      'No carboxyhemoglobin test is done early.',
      'The missing/broken alarm goes undocumented.',
      'Service and maintenance records are never obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the furnace running heavily when you got sick?' },
      { label: 'Step 2', question: 'Was there a working CO alarm?' },
      { label: 'Step 3', question: 'Was a CO blood test done?' },
      { label: 'Step 4', question: 'Who else was exposed, and how are they?' },
    ],
  },
}
