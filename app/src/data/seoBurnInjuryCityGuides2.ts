import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, burn injury practice area (batch 2): location-specific guides for
 * San Jose, Fresno, Long Beach, and Oakland, extending the batch-1 hub (LA, SF,
 * San Diego, Sacramento).
 *
 * Burn injuries are a distinct catastrophic-injury practice area: the causes,
 * the responsible parties, and the evidence differ sharply from a typical
 * accident case, and the local built environment drives the pattern.
 *
 * Local context, genuine rather than interpolated:
 *  - San Jose: dense apartments and heavy e-bike/e-scooter use drive lithium-ion
 *    battery fires, alongside industrial and semiconductor chemical burns; VTA and
 *    public-entity questions where a public utility or agency is involved.
 *  - Fresno: agricultural chemical burns, propane and farm-equipment fires, and
 *    food-processing plant burns, plus older apartment stock, in a hot climate.
 *  - Long Beach: the port, refineries, and petrochemical facilities drive
 *    industrial burns and explosions where a third-party claim beyond workers'
 *    comp is central, alongside apartment fires.
 *  - Oakland: an older apartment stock with habitability failures, port and
 *    industrial burns, and e-bike battery fires, with AC Transit and city
 *    public-entity questions.
 *
 * Applied accurately (landlord habitability Civil Code 1941 and detector duties
 * Health & Safety Code 13113.7 / 17926; strict product liability for a defective
 * igniting product; workplace third-party claim beyond workers' comp; utility
 * liability for gas/utility fires; pure comparative negligence; two-year deadline
 * CCP 335.1; six-month Government Claims Act deadline for a public entity).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a landlord, a product manufacturer, a utility, or another party is responsible, and which deadline controls, depends on facts a licensed California attorney should review promptly.'

const LANDLORD =
  'A landlord owes a duty to keep a rental habitable (Civil Code section 1941) and to install and maintain working smoke alarms and, where required, carbon-monoxide detectors (Health and Safety Code sections 13113.7 and 17926). Missing or dead detectors, blocked or locked exits, faulty wiring, or an ignored repair request that causes or worsens a fire injury is frequently the core of a residential burn claim.'

const PRODUCT =
  'A fire often starts with a defective product -- a space heater, faulty wiring, a water heater, or increasingly a lithium-ion battery in an e-bike or scooter. A product that ignites, overheats, or explodes can carry strict product liability against the manufacturer, distributor, and seller, without proof of negligence, which opens coverage a landlord or homeowner policy may not.'

const WORKPLACE =
  'A burn suffered at work is generally covered by workers\u2019 compensation against the employer regardless of fault, but that system does not pay for pain and suffering and rarely makes a badly burned worker whole. A separate third-party claim -- against a product manufacturer, a property owner, or another contractor on the site -- can pursue full damages, and identifying that third party is usually where a lawyer matters most.'

const SEVERITY =
  'Burn injuries are among the most severe and expensive in personal injury: they often require skin grafts, multiple surgeries, long hospital and burn-unit stays, and leave permanent scarring, disfigurement, and psychological harm. That severity makes finding every responsible party and every layer of insurance -- landlord, product, utility, and workplace third party -- decisive rather than optional.'

export const SJ_BURN_SLUG = '/san-jose-burn-injury'
export const FRESNO_BURN_SLUG = '/fresno-burn-injury'
export const LB_BURN_SLUG = '/long-beach-burn-injury'
export const OAK_BURN_SLUG = '/oakland-burn-injury'

export const burnInjuryCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_BURN_SLUG,
    category: 'Cities',
    cluster: 'San Jose Burn Injury Claims',
    title: 'San Jose Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Burned by an e-bike battery fire, an apartment fire, or an industrial chemical burn in San Jose? A claim can reach a product manufacturer, a landlord, or a workplace third party \u2014 each with its own insurance.',
    psychology: 'I was badly burned in San Jose and do not know who is responsible or how to pay for the treatment.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose burn injury lawyer',
      'e-bike battery fire injury who is liable',
      'apartment fire landlord liability california',
      'burned at work third party claim california',
      'lithium battery fire injury claim san jose',
    ],
    signals: [
      'Lithium-ion battery fires',
      'Product liability (strict)',
      'Landlord habitability (1941)',
      'Industrial / chemical burns',
      'Workplace third-party claim',
      'Burn severity & disfigurement',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s dense apartment living and heavy e-bike and e-scooter use make lithium-ion battery fires a prominent local cause of burns, alongside the apartment fires common to any dense housing stock and the chemical burns that arise in the area\u2019s industrial and semiconductor work. ${PRODUCT} That lithium-battery path is especially live here, where charging devices in crowded units meet. ${LANDLORD} ${WORKPLACE} An industrial or semiconductor chemical burn frequently turns on a third-party claim beyond workers\u2019 compensation. ${SEVERITY} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity or public utility is involved. Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'For an e-bike or scooter, the battery and charger make and model',
        'Whether smoke and carbon-monoxide detectors were present and working',
        'The product or chemical that caused the burn and its maker',
        'For a workplace burn, any product or property owner beyond the employer',
        'Whether a public entity or public utility was involved (six-month rule)',
        'Photographs of the scene, the product, and the injuries',
        'The fire department origin-and-cause report',
        'Medical treatment from first response and burn-unit care onward',
      ],
      howClearCaseHelps: `ClearCaseIQ preserves the lithium-ion battery or defective product for a strict-liability claim, builds the landlord-habitability path where an apartment fire is involved, and separates an industrial or chemical workplace third-party claim from workers\u2019 compensation. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The fire started with an e-bike or scooter battery. Who is responsible?',
        a: 'A lithium-ion battery that overheats or explodes can carry strict product liability against the manufacturer, distributor, and seller, without proof of negligence. Preserving the battery, charger, and device \u2014 not discarding the burned remains \u2014 is critical, because the product itself is the evidence.',
      },
      {
        q: 'I suffered a chemical burn in semiconductor or industrial work. Is workers\u2019 comp my only option?',
        a: 'Not necessarily. Workers\u2019 compensation covers a workplace burn against your employer regardless of fault, but it does not pay for pain and suffering. A separate third-party claim \u2014 against a chemical or equipment manufacturer, a property owner, or another contractor \u2014 can pursue full damages, and identifying that third party is usually where a lawyer matters most.',
      },
      {
        q: 'My apartment had no working smoke detector. Does that matter?',
        a: 'Yes. A landlord must keep a rental habitable and maintain working smoke alarms and, where required, carbon-monoxide detectors under Health and Safety Code sections 13113.7 and 17926. A missing or dead detector, a blocked exit, or an ignored repair request that causes or worsens a fire injury is frequently the core of a residential burn claim.',
      },
      {
        q: 'Why do burn cases need a lawyer more than other injuries?',
        a: 'Burns are among the most severe and expensive injuries \u2014 grafts, multiple surgeries, long burn-unit stays, and permanent scarring and disfigurement. That severity makes finding every responsible party and every layer of insurance decisive, which is difficult to do alone.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the liability questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_BURN_SLUG,
    category: 'Cities',
    cluster: 'Fresno Burn Injury Claims',
    title: 'Fresno Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Burned by an agricultural chemical, a propane or farm-equipment fire, or a food-processing plant incident in Fresno? A claim can reach a product manufacturer, a property owner, or a workplace third party.',
    psychology: 'I was badly burned in the Fresno area and do not know who is responsible or how to pay for the treatment.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno burn injury lawyer',
      'agricultural chemical burn claim california',
      'propane explosion injury claim california',
      'burned at work third party claim california',
      'food processing plant burn injury california',
    ],
    signals: [
      'Agricultural chemical burns',
      'Propane / farm-equipment fires',
      'Workplace third-party claim',
      'Product liability (strict)',
      'Landlord habitability (1941)',
      'Burn severity & disfigurement',
    ],
    sections: {
      whyItMatters: `The Fresno area\u2019s agricultural and food-processing economy shapes its burn-injury pattern: chemical burns from agricultural products, propane and farm-equipment fires and explosions, and processing-plant incidents are recurring causes, alongside residential fires in older apartment stock. ${WORKPLACE} A farm or plant burn is frequently more than a workers\u2019-compensation matter \u2014 a chemical or equipment manufacturer, a property owner, or another contractor may be a third-party defendant. ${PRODUCT} ${LANDLORD} ${SEVERITY} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'The chemical, propane, or equipment involved and its manufacturer',
        'Whether the burn happened at work and who employed you',
        'Any product, property owner, or other contractor beyond the employer',
        'Whether smoke and carbon-monoxide detectors were present in a residence',
        'Photographs of the scene, the product or chemical, and the injuries',
        'The safety data sheet for any chemical involved',
        'The fire or agency origin-and-cause report',
        'Medical treatment from first response and burn-unit care onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates a farm or plant burn\u2019s third-party claim from workers\u2019 compensation, preserves the chemical, propane system, or equipment for a strict-liability claim, and organises the burn-unit treatment record that documents severity. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was burned by an agricultural chemical at work. Is workers\u2019 comp my only option?',
        a: 'Not necessarily. Workers\u2019 compensation covers a workplace burn against your employer regardless of fault, but it does not pay for pain and suffering. A separate third-party claim \u2014 against the chemical manufacturer, a property owner, or another contractor \u2014 can pursue full damages. The chemical\u2019s safety data sheet and preserved container are important evidence.',
      },
      {
        q: 'A propane tank or farm equipment exploded. Who is responsible?',
        a: 'A defective propane system or piece of farm equipment that ignites or explodes can carry strict product liability against the manufacturer, distributor, and seller, without proof of negligence \u2014 and a maintenance provider or property owner may also be responsible. Preserving the tank, regulator, or equipment rather than discarding it is critical, because the item is the evidence.',
      },
      {
        q: 'Why do burn cases need a lawyer more than other injuries?',
        a: 'Burns are among the most severe and expensive injuries \u2014 grafts, multiple surgeries, long burn-unit stays, and permanent scarring and disfigurement. That severity makes finding every responsible party and every layer of insurance decisive, which is difficult to do alone.',
      },
      {
        q: 'How long do I have to bring a Fresno burn claim?',
        a: 'Generally two years from the injury (Code of Civil Procedure section 335.1) for an ordinary claim, but as short as six months where a public entity is involved (Government Claims Act). Because burn cases involve preserving evidence and identifying multiple defendants, it is best to act quickly.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the liability questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_BURN_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Burn Injury Claims',
    title: 'Long Beach Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Burned in a Long Beach refinery, petrochemical, port, or apartment fire? A claim can reach a product manufacturer, a property owner, or a workplace third party \u2014 each with its own insurance.',
    psychology: 'I was badly burned in Long Beach and do not know who is responsible or how to pay for the treatment.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach burn injury lawyer',
      'refinery explosion injury claim california',
      'burned at work third party claim california',
      'petrochemical plant burn injury california',
      'apartment fire landlord liability long beach',
    ],
    signals: [
      'Refinery / petrochemical burns',
      'Port / industrial explosions',
      'Workplace third-party claim',
      'Product liability (strict)',
      'Landlord habitability (1941)',
      'Burn severity & disfigurement',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s refineries, petrochemical facilities, and port drive its burn-injury pattern: industrial burns, flash fires, and explosions are a recurring cause, which puts the third-party-versus-workers\u2019-compensation question at the center, alongside residential fires. ${WORKPLACE} In a refinery or petrochemical burn, a defective valve, pipe, or piece of equipment, or another contractor on the site, is frequently a third-party defendant with substantial insurance. ${PRODUCT} ${LANDLORD} ${SEVERITY} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether the burn happened at work and who employed you',
        'Any product, equipment maker, property owner, or contractor beyond the employer',
        'Whether a refinery, petrochemical, or port process was involved',
        'The specific equipment, valve, or pipe that failed and its maker',
        'Photographs of the scene, the equipment, and the injuries',
        'The agency or fire origin-and-cause report (including Cal/OSHA)',
        'For a residence, whether detectors were present and working',
        'Medical treatment from first response and burn-unit care onward',
      ],
      howClearCaseHelps: `ClearCaseIQ separates a refinery or petrochemical burn\u2019s third-party claim from workers\u2019 compensation, preserves the failed equipment for a strict-liability claim, and gathers the Cal/OSHA and origin-and-cause records that establish what failed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was burned in a refinery or petrochemical plant. Is workers\u2019 comp my only option?',
        a: 'Not necessarily. Workers\u2019 compensation covers a workplace burn against your employer regardless of fault, but it does not pay for pain and suffering. A separate third-party claim \u2014 against an equipment manufacturer, a property owner, or another contractor on the site \u2014 can pursue full damages, which matters greatly in severe industrial burns.',
      },
      {
        q: 'A defective valve or piece of equipment caused the explosion. Who is liable?',
        a: 'A defective valve, pipe, or piece of equipment that fails and causes a flash fire or explosion can carry strict product liability against the manufacturer, distributor, and seller, without proof of negligence. Preserving the item rather than discarding it is critical, because the equipment is the evidence.',
      },
      {
        q: 'Why do burn cases need a lawyer more than other injuries?',
        a: 'Burns are among the most severe and expensive injuries \u2014 grafts, multiple surgeries, long burn-unit stays, and permanent scarring and disfigurement. That severity makes finding every responsible party and every layer of insurance decisive, which is difficult to do alone.',
      },
      {
        q: 'How long do I have to bring a Long Beach burn claim?',
        a: 'Generally two years from the injury (Code of Civil Procedure section 335.1), but as short as six months where a public entity is involved (Government Claims Act). Because industrial burn cases require preserving equipment and identifying multiple defendants, acting quickly is important.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the liability questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_BURN_SLUG,
    category: 'Cities',
    cluster: 'Oakland Burn Injury Claims',
    title: 'Oakland Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Burned in an Oakland apartment fire, an e-bike battery fire, or an industrial incident? A claim can reach a landlord, a product manufacturer, or a workplace third party \u2014 each with its own insurance.',
    psychology: 'I was badly burned in Oakland and do not know who is responsible or how to pay for the treatment.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland burn injury lawyer',
      'apartment fire landlord liability california',
      'e-bike battery fire injury who is liable',
      'burned at work third party claim california',
      'landlord no smoke detector fire oakland',
    ],
    signals: [
      'Landlord habitability (1941)',
      'Smoke / CO detector duty',
      'Lithium-ion battery fires',
      'Port / industrial burns',
      'Workplace third-party claim',
      'Burn severity & disfigurement',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s older apartment stock shapes its burn-injury pattern: residential fires in buildings with missing or dead detectors, blocked exits, or faulty wiring are a recurring cause, and lithium-ion battery fires from e-bikes and scooters have added to it, alongside port and industrial burns. ${LANDLORD} ${PRODUCT} ${WORKPLACE} A port or industrial burn frequently turns on a third-party claim beyond workers\u2019 compensation. ${SEVERITY} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity such as the city or AC Transit is involved. Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'Whether smoke and carbon-monoxide detectors were present and working',
        'Whether exits were blocked or locked and repair requests ignored',
        'The product that started the fire and its manufacturer and seller',
        'For an e-bike or scooter, the battery and charger make and model',
        'For a workplace burn, any product or property owner beyond the employer',
        'Whether a public entity such as the city or AC Transit was involved',
        'Photographs of the scene, the product, and the injuries',
        'The fire department origin-and-cause report',
      ],
      howClearCaseHelps: `ClearCaseIQ builds an Oakland burn claim around the landlord-habitability failures that often drive apartment fires, preserves the defective product \u2014 including e-bike and scooter batteries \u2014 for a strict-liability claim, and separates a port or industrial third-party claim from workers\u2019 compensation. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My apartment had no working smoke detector when the fire started. Does that matter?',
        a: 'Yes. A landlord must keep a rental habitable and must install and maintain working smoke alarms and, where required, carbon-monoxide detectors under Health and Safety Code sections 13113.7 and 17926. A missing or dead detector, a blocked exit, or an ignored repair request that causes or worsens a fire injury is frequently the core of a residential burn claim.',
      },
      {
        q: 'The fire started with an e-bike or scooter battery. Who is responsible?',
        a: 'A lithium-ion battery that overheats or explodes can carry strict product liability against the manufacturer, distributor, and seller, without proof of negligence. Preserving the battery, charger, and device \u2014 not discarding the burned remains \u2014 is critical, because the product itself is the evidence.',
      },
      {
        q: 'I was burned at the port or in industrial work. Is workers\u2019 comp my only option?',
        a: 'Not necessarily. Workers\u2019 compensation covers a workplace burn against your employer regardless of fault, but it does not pay for pain and suffering. A separate third-party claim \u2014 against a product manufacturer, a property owner, or another contractor \u2014 can pursue full damages, and identifying that third party is usually where a lawyer matters most.',
      },
      {
        q: 'Why do burn cases need a lawyer more than other injuries?',
        a: 'Burns are among the most severe and expensive injuries \u2014 grafts, multiple surgeries, long burn-unit stays, and permanent scarring and disfigurement. That severity makes finding every responsible party and every layer of insurance decisive, which is difficult to do alone.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the liability questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const burnInjuryCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_BURN_SLUG]: {
    scenario: `A San Jose tenant was badly burned when a charging e-bike battery ignited in a crowded apartment and the unit\u2019s smoke detector was dead. The preserved battery and the habitability failure built parallel claims. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the battery and device; note detectors; get the fire report.'],
      ['First days', 'The product manufacturer and the landlord identified.'],
      ['First weeks', 'Product defect and habitability failures developed.'],
      ['Longer term', 'Burn-unit treatment and disfigurement documented.'],
    ],
    severityLadder: [
      ['Product path', 'A defective battery ignites the fire.'],
      ['Landlord path', 'A dead detector worsens the injury.'],
      ['Workplace path', 'A third party beyond the employer for a chemical burn.'],
      ['Catastrophic harm', 'Grafts, surgeries, and permanent scarring.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Burn-unit records tie the injuries to the fire.' },
      { label: 'Surgery', copy: 'Grafts and procedures document severity.' },
      { label: 'Continuing care', copy: 'Scar revision and therapy show lasting harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a defective battery or product started the fire',
      'Whether smoke and CO detectors were present and working',
      'Whether a workplace third party is also responsible',
      'Whether the product and scene were preserved',
      'Whether a public entity or utility shortens the deadline',
      'Burn severity, disfigurement, and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Preserve the product', copy: 'The burned battery is the evidence.' },
      { label: 'Habitability anchors fault', copy: 'Detector failures drive landlord liability.' },
      { label: 'Third parties matter', copy: 'A chemical-burn claim beyond comp pursues full damages.' },
      { label: 'Severity drives value', copy: 'Burns require costly, lifelong care.' },
    ],
    insuranceProblems: [
      'The defective battery is discarded before it can be tested.',
      'The tenant is blamed without examining the detectors.',
      'A chemical burn is limited to workers\u2019 comp with no third party.',
      'The severity of a burn is undervalued early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What product or battery started the fire?' },
      { label: 'Step 2', question: 'Were smoke and CO detectors present and working?' },
      { label: 'Step 3', question: 'Did the burn happen at work, and who else was involved?' },
      { label: 'Step 4', question: 'Have you preserved the product and photographs?' },
    ],
  },
  [FRESNO_BURN_SLUG]: {
    scenario: `A Fresno-area farm worker suffered a severe chemical burn, and workers\u2019 comp alone left the pain and disfigurement uncovered. A third-party claim against the chemical manufacturer, supported by the safety data sheet and preserved container, opened full damages. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the chemical or equipment; get the safety data sheet.'],
      ['First days', 'The employer, manufacturer, and any property owner identified.'],
      ['First weeks', 'The third-party path developed alongside the comp claim.'],
      ['Longer term', 'Burn-unit treatment and disfigurement documented.'],
    ],
    severityLadder: [
      ['Workplace path', 'A third party beyond the employer is responsible.'],
      ['Product path', 'A defective chemical, propane system, or equipment.'],
      ['Landlord path', 'A residential fire with detector failures.'],
      ['Catastrophic harm', 'Grafts, surgeries, and permanent scarring.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Burn-unit records tie the injuries to the incident.' },
      { label: 'Surgery', copy: 'Grafts and procedures document severity.' },
      { label: 'Continuing care', copy: 'Scar revision and therapy show lasting harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a third party beyond the employer is responsible',
      'Whether a defective chemical, propane system, or equipment caused it',
      'Whether the chemical container and safety data sheet were preserved',
      'Whether the equipment was preserved',
      'Which deadline applies to each defendant',
      'Burn severity, disfigurement, and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Third parties matter', copy: 'A claim beyond comp pursues full damages.' },
      { label: 'Preserve the chemical', copy: 'The container and data sheet prove the agent.' },
      { label: 'Products add coverage', copy: 'A defective propane system opens strict liability.' },
      { label: 'Severity drives value', copy: 'Burns require costly, lifelong care.' },
    ],
    insuranceProblems: [
      'The claim is limited to workers\u2019 comp with no third party.',
      'The chemical container or equipment is discarded before testing.',
      'The safety data sheet is never obtained.',
      'The severity of a burn is undervalued early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What chemical, propane system, or equipment was involved?' },
      { label: 'Step 2', question: 'Did the burn happen at work, and who employed you?' },
      { label: 'Step 3', question: 'Has the chemical or equipment been preserved?' },
      { label: 'Step 4', question: 'Have you obtained the safety data sheet?' },
    ],
  },
  [LB_BURN_SLUG]: {
    scenario: `A Long Beach refinery worker was burned when a defective valve failed and caused a flash fire. A third-party claim against the valve maker, supported by the Cal/OSHA findings and the preserved part, reached the damages comp could not. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the failed equipment; identify the employer and any third party.'],
      ['First days', 'The equipment maker and any contractor identified.'],
      ['First weeks', 'The third-party path and Cal/OSHA findings developed.'],
      ['Longer term', 'Burn-unit treatment and disfigurement documented.'],
    ],
    severityLadder: [
      ['Workplace path', 'A third party beyond the employer is responsible.'],
      ['Product path', 'A defective valve, pipe, or equipment fails.'],
      ['Landlord path', 'A residential fire with detector failures.'],
      ['Catastrophic harm', 'Grafts, surgeries, and permanent scarring.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Burn-unit records tie the injuries to the incident.' },
      { label: 'Surgery', copy: 'Grafts and procedures document severity.' },
      { label: 'Continuing care', copy: 'Scar revision and therapy show lasting harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a third party beyond the employer is responsible',
      'Whether defective equipment caused the flash fire or explosion',
      'Whether the failed equipment was preserved',
      'Whether Cal/OSHA and origin-and-cause records establish the failure',
      'Which deadline applies to each defendant',
      'Burn severity, disfigurement, and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Third parties matter', copy: 'A claim beyond comp pursues full damages.' },
      { label: 'Preserve equipment', copy: 'The failed valve or pipe proves the defect.' },
      { label: 'Agency findings help', copy: 'Cal/OSHA records establish what failed.' },
      { label: 'Severity drives value', copy: 'Burns require costly, lifelong care.' },
    ],
    insuranceProblems: [
      'The claim is limited to workers\u2019 comp with no third party.',
      'The failed equipment is discarded before testing.',
      'The Cal/OSHA and origin-and-cause records are never gathered.',
      'The severity of a burn is undervalued early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What equipment, valve, or pipe failed?' },
      { label: 'Step 2', question: 'Did the burn happen at work, and who employed you?' },
      { label: 'Step 3', question: 'Has the failed equipment been preserved?' },
      { label: 'Step 4', question: 'Was there a Cal/OSHA investigation?' },
    ],
  },
  [OAK_BURN_SLUG]: {
    scenario: `An Oakland tenant was badly burned in an apartment fire that spread because the smoke detectors were dead and the rear exit was blocked, and it started with a charging e-bike battery. The habitability failures and the preserved battery built parallel claims. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the product; note detectors and exits; get the fire report.'],
      ['First days', 'The landlord and the product manufacturer identified.'],
      ['First weeks', 'Habitability failures and the product defect developed.'],
      ['Longer term', 'Burn-unit treatment and disfigurement documented.'],
    ],
    severityLadder: [
      ['Landlord path', 'Missing detectors or blocked exits worsen injury.'],
      ['Product path', 'A defective battery or appliance ignites the fire.'],
      ['Workplace path', 'A third party beyond the employer for a port/industrial burn.'],
      ['Catastrophic harm', 'Grafts, surgeries, and permanent scarring.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Burn-unit records tie the injuries to the fire.' },
      { label: 'Surgery', copy: 'Grafts and procedures document severity.' },
      { label: 'Continuing care', copy: 'Scar revision and therapy show lasting harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether smoke and CO detectors were present and working',
      'Whether exits were blocked or repairs ignored',
      'Whether a defective product started the fire',
      'Whether a port or industrial third party is responsible',
      'Whether the product and scene were preserved',
      'Burn severity, disfigurement, and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Habitability anchors fault', copy: 'Detector and exit failures drive landlord liability.' },
      { label: 'Products add coverage', copy: 'A defective battery or appliance opens strict liability.' },
      { label: 'Third parties matter', copy: 'A workplace claim beyond comp pursues full damages.' },
      { label: 'Preserve the product', copy: 'The burned item itself is the evidence.' },
    ],
    insuranceProblems: [
      'The tenant is blamed for the fire without examining detectors.',
      'The defective product is discarded before it can be tested.',
      'A port or industrial burn is limited to workers\u2019 comp with no third party.',
      'The severity of a burn is undervalued early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were smoke and CO detectors present and working?' },
      { label: 'Step 2', question: 'What product or appliance started the fire?' },
      { label: 'Step 3', question: 'Did the burn happen at work, and who else was involved?' },
      { label: 'Step 4', question: 'Have you preserved the product and photographs?' },
    ],
  },
}
