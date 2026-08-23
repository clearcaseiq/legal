import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, carbon-monoxide poisoning practice area (batch 2):
 * location-specific guides for San Diego, San Jose, Fresno, and Long Beach,
 * extending the batch-1 hub (Los Angeles, Oakland, San Francisco, Sacramento).
 *
 * Applied accurately (identical to batch 1):
 *  - CO is silent; symptoms mimic flu; carboxyhemoglobin testing matters.
 *  - Liability can rest with a landlord, a product maker (strict liability), or an
 *    HVAC contractor.
 *  - California requires CO alarms in units with fuel-burning appliances or an
 *    attached garage (Health & Safety Code 17926); a missing/non-working alarm is
 *    strong evidence of landlord negligence.
 *  - CO evidence is perishable; two-year deadline (CCP 335.1) or six months for a
 *    public-entity landlord.
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

export const SD_CO_SLUG = '/san-diego-carbon-monoxide-poisoning-claim'
export const SJ_CO_SLUG = '/san-jose-carbon-monoxide-poisoning-claim'
export const FRESNO_CO_SLUG = '/fresno-carbon-monoxide-poisoning-claim'
export const LB_CO_SLUG = '/long-beach-carbon-monoxide-poisoning-claim'

export const carbonMonoxideCityGuidePages2: LandingPage[] = [
  {
    slug: SD_CO_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Carbon Monoxide Poisoning Claims',
    title: 'San Diego Carbon Monoxide Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Poisoned by carbon monoxide in a San Diego rental or hotel? A missing or dead CO alarm is strong evidence of negligence \u2014 and a landlord, product maker, or HVAC contractor can be liable.',
    psychology: 'My family got sick from carbon monoxide in San Diego and I did not know a landlord could be responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego carbon monoxide poisoning lawyer',
      'landlord no co alarm injury california',
      'defective furnace carbon monoxide lawsuit california',
      'hotel carbon monoxide poisoning claim california',
      'carboxyhemoglobin test co poisoning california',
    ],
    signals: [
      'Silent, flu-like, often missed',
      'Landlord, product, or HVAC liability',
      'CO alarm required (HSC 17926)',
      'Carboxyhemoglobin testing',
      'Preserve appliance & alarm',
      'Neurological injury risk',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s older rental stock, vacation rentals, and hotels use gas furnaces, water heaters, and pool heaters that can leak carbon monoxide, and a missing or dead alarm is exactly what the law forbids. ${SILENT} ${SOURCES} ${DETECTOR} ${EVIDENCE} Civil cases are filed in San Diego County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The suspected appliance \u2014 furnace, water heater, generator',
        'Whether a CO alarm was present and working',
        'Any fire-department or utility CO readings',
        'A carboxyhemoglobin blood test, taken early',
        'The property\u2019s maintenance and repair records',
        'Whether a landlord, maker, or HVAC contractor is involved',
        'Whether the landlord is a public entity',
        'Medical treatment, including neurological follow-up',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, preserves the appliance and the alarm (or proof of its absence), obtains the CO readings and carboxyhemoglobin levels, and collects the maintenance records before they are altered. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The rental had no CO alarm. Does that matter?',
        a: 'A great deal. California requires CO alarms in units with a fuel-burning appliance or attached garage (Health and Safety Code 17926). A missing or non-working alarm is strong evidence of a landlord\u2019s negligence.',
      },
      {
        q: 'Who can be liable for CO poisoning?',
        a: 'More than one party: a landlord who failed to maintain the heating system or install a required alarm, the maker of a defective appliance through strict product liability, or an HVAC contractor whose work was negligent.',
      },
      {
        q: 'The doctors first said it was the flu. Can I still prove CO?',
        a: 'Often yes, if tested early. CO symptoms mimic the flu, so a carboxyhemoglobin blood test taken as early as possible \u2014 plus fire-department or utility CO readings \u2014 is important to document the poisoning.',
      },
      {
        q: 'What should be preserved?',
        a: 'The suspected appliance and the alarm (or proof of its absence), any CO readings, early carboxyhemoglobin levels, and the property\u2019s maintenance and repair records, before they are lost or altered.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the appliance, alarm, and records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_CO_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Carbon Monoxide Poisoning Claims',
    title: 'San Jose Carbon Monoxide Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Poisoned by carbon monoxide in a San Jose rental or hotel? A missing or dead CO alarm is strong evidence of negligence \u2014 and a landlord, product maker, or HVAC contractor can be liable.',
    psychology: 'My family got sick from carbon monoxide in San Jose and I did not know a landlord could be responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose carbon monoxide poisoning lawyer',
      'landlord no co alarm injury california',
      'defective furnace carbon monoxide lawsuit california',
      'apartment carbon monoxide poisoning claim california',
      'carboxyhemoglobin test co poisoning california',
    ],
    signals: [
      'Silent, flu-like, often missed',
      'Landlord, product, or HVAC liability',
      'CO alarm required (HSC 17926)',
      'Carboxyhemoglobin testing',
      'Preserve appliance & alarm',
      'Neurological injury risk',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s dense apartment housing and converted units rely on gas furnaces and water heaters, and a leaking appliance in a multi-unit building can poison a whole household or several units. ${SILENT} ${SOURCES} ${DETECTOR} ${EVIDENCE} Civil cases are filed in Santa Clara County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The suspected appliance \u2014 furnace, water heater, generator',
        'Whether a CO alarm was present and working',
        'Any fire-department or utility CO readings',
        'A carboxyhemoglobin blood test, taken early',
        'The property\u2019s maintenance and repair records',
        'Whether a landlord, maker, or HVAC contractor is involved',
        'Whether the landlord is a public entity',
        'Medical treatment, including neurological follow-up',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, preserves the appliance and the alarm (or proof of its absence), obtains the CO readings and carboxyhemoglobin levels, and collects the maintenance records before they are altered. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The apartment had no CO alarm. Does that matter?',
        a: 'A great deal. California requires CO alarms in units with a fuel-burning appliance or attached garage (Health and Safety Code 17926). A missing or non-working alarm is strong evidence of a landlord\u2019s negligence.',
      },
      {
        q: 'Who can be liable for CO poisoning?',
        a: 'A landlord who failed to maintain the heating system or install an alarm, the maker of a defective appliance through strict product liability, or an HVAC contractor whose work was negligent.',
      },
      {
        q: 'The doctors first said it was the flu. Can I still prove CO?',
        a: 'Often yes, if tested early. A carboxyhemoglobin blood test taken as early as possible, plus fire-department or utility CO readings, is important to document the poisoning.',
      },
      {
        q: 'What should be preserved?',
        a: 'The suspected appliance and the alarm (or proof of its absence), any CO readings, early carboxyhemoglobin levels, and the property\u2019s maintenance and repair records.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the appliance, alarm, and records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_CO_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Carbon Monoxide Poisoning Claims',
    title: 'Fresno Carbon Monoxide Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Poisoned by carbon monoxide in a Fresno rental or home? A missing or dead CO alarm is strong evidence of negligence \u2014 and a landlord, product maker, or HVAC contractor can be liable.',
    psychology: 'My family got sick from carbon monoxide in Fresno and I did not know a landlord could be responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno carbon monoxide poisoning lawyer',
      'landlord no co alarm injury california',
      'defective furnace carbon monoxide lawsuit california',
      'space heater carbon monoxide poisoning california',
      'carboxyhemoglobin test co poisoning california',
    ],
    signals: [
      'Silent, flu-like, often missed',
      'Landlord, product, or HVAC liability',
      'CO alarm required (HSC 17926)',
      'Carboxyhemoglobin testing',
      'Preserve appliance & alarm',
      'Neurological injury risk',
    ],
    sections: {
      whyItMatters: `Fresno\u2019s cold winters drive heavy furnace and space-heater use, and older rentals with poorly maintained gas appliances or unvented heaters create a recurring carbon-monoxide risk. ${SILENT} ${SOURCES} ${DETECTOR} ${EVIDENCE} Civil cases are filed in Fresno County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The suspected appliance \u2014 furnace, water heater, heater',
        'Whether a CO alarm was present and working',
        'Any fire-department or utility CO readings',
        'A carboxyhemoglobin blood test, taken early',
        'The property\u2019s maintenance and repair records',
        'Whether a landlord, maker, or HVAC contractor is involved',
        'Whether the landlord is a public entity',
        'Medical treatment, including neurological follow-up',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, preserves the appliance and the alarm (or proof of its absence), obtains the CO readings and carboxyhemoglobin levels, and collects the maintenance records before they are altered. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The rental had no CO alarm. Does that matter?',
        a: 'A great deal. California requires CO alarms in units with a fuel-burning appliance or attached garage (Health and Safety Code 17926). A missing or non-working alarm is strong evidence of a landlord\u2019s negligence.',
      },
      {
        q: 'A space heater caused it. Who is responsible?',
        a: 'Potentially the maker of a defective heater through strict product liability, and a landlord who supplied or allowed an unsafe or unvented heating source. The suspected appliance should be preserved.',
      },
      {
        q: 'The doctors first said it was the flu. Can I still prove CO?',
        a: 'Often yes, if tested early. A carboxyhemoglobin blood test taken as early as possible, plus CO readings, is important to document the poisoning.',
      },
      {
        q: 'What should be preserved?',
        a: 'The suspected appliance and the alarm (or proof of its absence), any CO readings, early carboxyhemoglobin levels, and the property\u2019s maintenance and repair records.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the appliance, alarm, and records so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_CO_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Carbon Monoxide Poisoning Claims',
    title: 'Long Beach Carbon Monoxide Poisoning Claims',
    eyebrow: 'California local injury guide',
    description:
      'Poisoned by carbon monoxide in a Long Beach rental, hotel, or boat? A missing or dead CO alarm is strong evidence of negligence \u2014 and a landlord, product maker, or HVAC contractor can be liable.',
    psychology: 'My family got sick from carbon monoxide in Long Beach and I did not know a landlord could be responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach carbon monoxide poisoning lawyer',
      'landlord no co alarm injury california',
      'defective furnace carbon monoxide lawsuit california',
      'boat carbon monoxide poisoning claim california',
      'carboxyhemoglobin test co poisoning california',
    ],
    signals: [
      'Silent, flu-like, often missed',
      'Landlord, product, or HVAC liability',
      'CO alarm required (HSC 17926)',
      'Carboxyhemoglobin testing',
      'Preserve appliance & alarm',
      'Boat / generator CO risk',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s older apartments, hotels, and its large marina and houseboat community all carry carbon-monoxide risk \u2014 from gas appliances to marine generators and engines that can poison people aboard. ${SILENT} ${SOURCES} ${DETECTOR} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'The suspected source \u2014 furnace, water heater, or marine generator',
        'Whether a CO alarm was present and working',
        'Any fire-department or utility CO readings',
        'A carboxyhemoglobin blood test, taken early',
        'The property or vessel maintenance records',
        'Whether a landlord, maker, or HVAC contractor is involved',
        'Whether the landlord is a public entity',
        'Medical treatment, including neurological follow-up',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, preserves the appliance or generator and the alarm (or proof of its absence), obtains the CO readings and carboxyhemoglobin levels, and collects the maintenance records before they are altered. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The rental had no CO alarm. Does that matter?',
        a: 'A great deal. California requires CO alarms in units with a fuel-burning appliance or attached garage (Health and Safety Code 17926). A missing or non-working alarm is strong evidence of a landlord\u2019s negligence.',
      },
      {
        q: 'It happened on a boat. Does that change things?',
        a: 'The sources differ \u2014 marine generators and engines are common CO hazards \u2014 but the analysis is similar: a defective product, a negligent maintainer, or an operator who failed to warn or vent can be responsible. The generator should be preserved.',
      },
      {
        q: 'The doctors first said it was the flu. Can I still prove CO?',
        a: 'Often yes, if tested early. A carboxyhemoglobin blood test taken as early as possible, plus CO readings, is important to document the poisoning.',
      },
      {
        q: 'What should be preserved?',
        a: 'The suspected appliance or generator and the alarm (or proof of its absence), any CO readings, early carboxyhemoglobin levels, and the maintenance records.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the appliance, alarm, and records so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const carbonMonoxideCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SD_CO_SLUG]: {
    scenario: `A San Diego family was poisoned by a cracked furnace heat exchanger in a rental with no working CO alarm. The missing alarm and the preserved furnace established the landlord\u2019s and maker\u2019s liability. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get to fresh air; call the fire department.'],
      ['First days', 'Get carboxyhemoglobin testing; secure the appliance.'],
      ['First weeks', 'Confirm the alarm status; pull maintenance records.'],
      ['Longer term', 'Develop landlord and product claims.'],
    ],
    severityLadder: [
      ['No alarm', 'Strong landlord-negligence evidence.'],
      ['Defect', 'A cracked exchanger is a product claim.'],
      ['Testing', 'Carboxyhemoglobin confirms exposure.'],
      ['Neuro injury', 'Lasting effects matter.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Oxygen therapy is documented.' },
      { label: 'Testing', copy: 'Carboxyhemoglobin confirms exposure.' },
      { label: 'Continuing care', copy: 'Neurological follow-up is tracked.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a CO alarm was present and working',
      'Whether the appliance was defective',
      'Whether carboxyhemoglobin was tested early',
      'Whether maintenance records show neglect',
      'Whether neurological injury is documented',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'No alarm', copy: 'It is strong negligence evidence.' },
      { label: 'Product', copy: 'A defective appliance can be strict-liable.' },
      { label: 'Testing', copy: 'Carboxyhemoglobin confirms it.' },
      { label: 'Neuro injury', copy: 'Lasting effects raise stakes.' },
    ],
    insuranceProblems: [
      'The appliance is repaired or replaced before inspection.',
      'No carboxyhemoglobin test is obtained.',
      'The alarm status is never documented.',
      'The maintenance records are altered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was there a working CO alarm?' },
      { label: 'Step 2', question: 'What appliance was the source?' },
      { label: 'Step 3', question: 'Were you tested for CO?' },
      { label: 'Step 4', question: 'Is it a rental or hotel?' },
    ],
  },
  [SJ_CO_SLUG]: {
    scenario: `A San Jose apartment household was poisoned when a shared water heater vented CO into the units, and none had alarms. The building-wide alarm failure established landlord negligence. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get to fresh air; call the fire department.'],
      ['First days', 'Get carboxyhemoglobin testing; secure the appliance.'],
      ['First weeks', 'Document the alarm absence across units.'],
      ['Longer term', 'Develop landlord and product claims.'],
    ],
    severityLadder: [
      ['No alarm', 'Strong landlord-negligence evidence.'],
      ['Shared unit', 'One source can poison many.'],
      ['Testing', 'Carboxyhemoglobin confirms exposure.'],
      ['Neuro injury', 'Lasting effects matter.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Oxygen therapy is documented.' },
      { label: 'Testing', copy: 'Carboxyhemoglobin confirms exposure.' },
      { label: 'Continuing care', copy: 'Neurological follow-up is tracked.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether alarms were present across units',
      'Whether the appliance was defective or misvented',
      'Whether carboxyhemoglobin was tested early',
      'How many occupants were exposed',
      'Whether neurological injury is documented',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'No alarm', copy: 'It is strong negligence evidence.' },
      { label: 'Shared source', copy: 'One appliance can poison many.' },
      { label: 'Testing', copy: 'Carboxyhemoglobin confirms it.' },
      { label: 'Neuro injury', copy: 'Lasting effects raise stakes.' },
    ],
    insuranceProblems: [
      'The appliance is serviced before inspection.',
      'No carboxyhemoglobin test is obtained.',
      'The alarm absence is never documented.',
      'The maintenance records are altered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were there working CO alarms?' },
      { label: 'Step 2', question: 'Were other units affected?' },
      { label: 'Step 3', question: 'Were you tested for CO?' },
      { label: 'Step 4', question: 'What was the source?' },
    ],
  },
  [FRESNO_CO_SLUG]: {
    scenario: `A Fresno tenant using an unvented space heater the landlord supplied was poisoned during a cold snap, with no alarm installed. The heater and the missing alarm framed the claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get to fresh air; call the fire department.'],
      ['First days', 'Get carboxyhemoglobin testing; secure the heater.'],
      ['First weeks', 'Document the alarm absence and heater source.'],
      ['Longer term', 'Develop landlord and product claims.'],
    ],
    severityLadder: [
      ['No alarm', 'Strong landlord-negligence evidence.'],
      ['Unvented heater', 'A defective or unsafe source.'],
      ['Testing', 'Carboxyhemoglobin confirms exposure.'],
      ['Neuro injury', 'Lasting effects matter.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Oxygen therapy is documented.' },
      { label: 'Testing', copy: 'Carboxyhemoglobin confirms exposure.' },
      { label: 'Continuing care', copy: 'Neurological follow-up is tracked.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a CO alarm was present',
      'Whether the heater was defective or unsafe',
      'Whether carboxyhemoglobin was tested early',
      'Whether the landlord supplied the heater',
      'Whether neurological injury is documented',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'No alarm', copy: 'It is strong negligence evidence.' },
      { label: 'Heater', copy: 'A defective or unsafe source.' },
      { label: 'Testing', copy: 'Carboxyhemoglobin confirms it.' },
      { label: 'Neuro injury', copy: 'Lasting effects raise stakes.' },
    ],
    insuranceProblems: [
      'The heater is discarded before inspection.',
      'No carboxyhemoglobin test is obtained.',
      'The alarm absence is never documented.',
      'The maintenance records are altered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was there a working CO alarm?' },
      { label: 'Step 2', question: 'What heating source caused it?' },
      { label: 'Step 3', question: 'Did the landlord supply it?' },
      { label: 'Step 4', question: 'Were you tested for CO?' },
    ],
  },
  [LB_CO_SLUG]: {
    scenario: `A Long Beach boater was poisoned by a marine generator exhausting near the cabin. The preserved generator and the CO readings supported product and maintenance claims. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get to fresh air; call for help.'],
      ['First days', 'Get carboxyhemoglobin testing; secure the generator.'],
      ['First weeks', 'Obtain CO readings; pull vessel maintenance records.'],
      ['Longer term', 'Develop product and maintenance claims.'],
    ],
    severityLadder: [
      ['Marine CO', 'Generators and engines are hazards.'],
      ['Defect', 'A defective generator is a product claim.'],
      ['Testing', 'Carboxyhemoglobin confirms exposure.'],
      ['Neuro injury', 'Lasting effects matter.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Oxygen therapy is documented.' },
      { label: 'Testing', copy: 'Carboxyhemoglobin confirms exposure.' },
      { label: 'Continuing care', copy: 'Neurological follow-up is tracked.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether the generator was defective or misvented',
      'Whether CO readings were obtained',
      'Whether carboxyhemoglobin was tested early',
      'Whether maintenance records show neglect',
      'Whether neurological injury is documented',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Marine CO', copy: 'Generators are common hazards.' },
      { label: 'Product', copy: 'A defective generator can be strict-liable.' },
      { label: 'Testing', copy: 'Carboxyhemoglobin confirms it.' },
      { label: 'Neuro injury', copy: 'Lasting effects raise stakes.' },
    ],
    insuranceProblems: [
      'The generator is repaired before inspection.',
      'No carboxyhemoglobin test is obtained.',
      'The CO readings are never obtained.',
      'The vessel records are altered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was the CO source?' },
      { label: 'Step 2', question: 'Was it a boat or a building?' },
      { label: 'Step 3', question: 'Were you tested for CO?' },
      { label: 'Step 4', question: 'Is the generator preserved?' },
    ],
  },
}
