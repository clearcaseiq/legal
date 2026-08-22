import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, burn injury practice area: location-specific guides for Los Angeles,
 * San Francisco, San Diego, and Sacramento.
 *
 * Burn injuries are a distinct catastrophic-injury practice area: the causes,
 * the responsible parties, and the evidence differ sharply from a typical
 * accident case, and the local built environment drives the pattern.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: an enormous stock of older multi-unit apartments where
 *    residential fires and landlord-habitability failures (missing or defective
 *    smoke and carbon-monoxide detectors, blocked exits) recur, alongside a wave
 *    of lithium-ion battery fires from e-bikes and scooters.
 *  - San Francisco: dense, older housing and an aging gas network, where gas
 *    explosions and utility-caused fires, plus landlord-habitability failures in
 *    multi-unit buildings, drive burn claims.
 *  - San Diego: heavy industrial, refinery, and shipyard work plus large
 *    federal and military installations, where workplace burns and the
 *    third-party-versus-workers'-comp question, and federal-claim rules, recur.
 *  - Sacramento: an aging gas distribution network and older apartment stock,
 *    where gas explosions, utility-caused fires, and residential fires drive
 *    burn claims, with public-entity questions never far away.
 *
 * Applied accurately:
 *  - A landlord owes a duty to maintain habitable premises (Civil Code section
 *    1941) and to install and maintain working smoke alarms and, where required,
 *    carbon-monoxide detectors (Health and Safety Code sections 13113.7 and
 *    17926); a failure that causes or worsens a fire injury can be negligence.
 *  - A defective product that ignites or explodes -- a space heater, wiring, a
 *    water heater, or a lithium-ion battery in an e-bike or scooter -- can carry
 *    strict product liability against the manufacturer, distributor, and seller.
 *  - A workplace burn is generally covered by workers' compensation against the
 *    employer, but a separate third-party claim can lie against a product
 *    manufacturer, a property owner, or another contractor, which is where full
 *    damages and a lawyer usually matter.
 *  - A utility can be liable for a gas explosion or a utility-ignited fire.
 *  - Pure comparative negligence, the two-year deadline (Code of Civil Procedure
 *    section 335.1), and the six-month Government Claims Act deadline where a
 *    public entity is involved.
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

export const LA_BURN_SLUG = '/los-angeles-burn-injury'
export const SF_BURN_SLUG = '/san-francisco-burn-injury'
export const SD_BURN_SLUG = '/san-diego-burn-injury'
export const SAC_BURN_SLUG = '/sacramento-burn-injury'

export const burnInjuryCityGuidePages: LandingPage[] = [
  {
    slug: LA_BURN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Burn Injury Claims',
    title: 'Los Angeles Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Burned in an apartment fire, an e-bike battery fire, or a workplace explosion in Los Angeles? A claim can reach a landlord, a product manufacturer, or a workplace third party \u2014 each with its own insurance.',
    psychology: 'I was badly burned in LA and do not know who is responsible or how to pay for the treatment.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles apartment fire injury lawyer',
      'landlord no smoke detector fire california',
      'e-bike battery fire injury who is liable',
      'burned at work third party claim california',
      'space heater fire injury claim los angeles',
    ],
    signals: [
      'Landlord habitability (1941)',
      'Smoke / CO detector duty',
      'Lithium-ion battery fires',
      'Product liability (strict)',
      'Workplace third-party claim',
      'Burn severity & disfigurement',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s vast stock of older multi-unit apartments shapes its burn-injury pattern: residential fires in buildings with missing or dead smoke detectors, blocked exits, or faulty wiring are a recurring cause, and a newer wave of lithium-ion battery fires from e-bikes and scooters has added to it. ${LANDLORD} ${PRODUCT} That lithium-battery path is especially live in LA, where dense apartment living and heavy e-bike use meet. ${WORKPLACE} LA\u2019s industrial, refinery-adjacent, and film-production work also produces workplace burns where a third-party claim can matter. ${SEVERITY} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether smoke and carbon-monoxide detectors were present and working',
        'Whether exits were blocked or locked and repair requests ignored',
        'The product that started the fire and its manufacturer and seller',
        'For an e-bike or scooter, the battery and charger make and model',
        'For a workplace burn, any product or property owner beyond the employer',
        'Photographs of the scene, the product, and the injuries',
        'The fire department origin-and-cause report',
        'Medical treatment from first response and burn-unit care onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Los Angeles burn claim around the landlord-habitability failures that often drive apartment fires, preserves the defective product \u2014 including e-bike and scooter batteries \u2014 for a strict-liability claim, and separates a workplace third-party claim from workers\u2019 compensation so full damages are pursued. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My apartment had no working smoke detector when the fire started. Does that matter?',
        a: 'Yes. A landlord must keep a rental habitable and must install and maintain working smoke alarms and, where required, carbon-monoxide detectors under Health and Safety Code sections 13113.7 and 17926. A missing or dead detector, a blocked exit, or an ignored repair request that causes or worsens a fire injury is frequently the core of a residential burn claim.',
      },
      {
        q: 'The fire started with an e-bike or scooter battery. Who is responsible?',
        a: 'A lithium-ion battery that overheats or explodes can carry strict product liability against the manufacturer, distributor, and seller, without proof of negligence. Preserving the battery, charger, and the device \u2014 not discarding the burned remains \u2014 is critical, because the product itself is the evidence.',
      },
      {
        q: 'I was burned at work. Is workers\u2019 comp my only option?',
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
  {
    slug: SF_BURN_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Burn Injury Claims',
    title: 'San Francisco Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Burned in a gas explosion, a residential fire, or a utility-caused fire in San Francisco? A claim can reach a landlord, a product manufacturer, or a utility \u2014 each with its own insurance.',
    psychology: 'I was badly burned in San Francisco and do not know who is responsible or how to pay for the treatment.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco gas explosion injury lawyer',
      'apartment fire landlord liability california',
      'utility caused fire injury claim california',
      'landlord no smoke detector fire san francisco',
      'burn injury lawyer san francisco',
    ],
    signals: [
      'Gas explosion / utility fire',
      'Landlord habitability (1941)',
      'Smoke / CO detector duty',
      'Product liability (strict)',
      'Dense older housing stock',
      'Burn severity & disfigurement',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s dense, older housing and its aging gas network shape its burn-injury pattern: gas explosions and utility-caused fires, alongside residential fires in multi-unit buildings, are recurring causes. A utility can be liable for a gas explosion or a utility-ignited fire, bringing its own substantial insurance into play. ${LANDLORD} San Francisco\u2019s older, densely packed buildings make blocked exits, shared-wall fire spread, and detector failures especially consequential. ${PRODUCT} ${WORKPLACE} ${SEVERITY} Pure comparative negligence applies, the deadline is generally two years (Code of Civil Procedure section 335.1), and a six-month Government Claims Act deadline can apply if a public entity is involved. Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Whether a gas leak, explosion, or utility line was involved',
        'Whether smoke and carbon-monoxide detectors were present and working',
        'Whether exits were blocked and how fire spread through the building',
        'The product or appliance that started the fire, if any',
        'Any repair requests or complaints the landlord ignored',
        'Photographs of the scene, the product, and the injuries',
        'The fire department origin-and-cause report',
        'Medical treatment from first response and burn-unit care onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a San Francisco burn claim around the utility, landlord-habitability, and product paths that drive the city\u2019s fires, identifies whether a gas or utility failure brings a utility\u2019s insurance into play, and separates any workplace third-party claim from workers\u2019 compensation. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A gas explosion or a utility line caused the fire. Who is responsible?',
        a: 'A utility can be liable for a gas explosion or a utility-ignited fire, and that brings its own substantial insurance into play alongside any landlord or product claim. Because these causes involve technical origin-and-cause questions, preserving the scene and the fire department report early matters.',
      },
      {
        q: 'My building had no working smoke detector or blocked exits. Does that matter?',
        a: 'Yes. A landlord must keep a rental habitable and maintain working smoke alarms and, where required, carbon-monoxide detectors under Health and Safety Code sections 13113.7 and 17926. In San Francisco\u2019s dense, older buildings, a dead detector, a blocked exit, or fire spread through shared walls is frequently the core of a residential burn claim.',
      },
      {
        q: 'I was burned at work. Is workers\u2019 comp my only option?',
        a: 'Not necessarily. Workers\u2019 compensation covers a workplace burn against your employer regardless of fault, but does not pay for pain and suffering. A separate third-party claim against a product manufacturer, a property owner, or another contractor can pursue full damages.',
      },
      {
        q: 'Why do burn cases need a lawyer more than other injuries?',
        a: 'Burns are among the most severe and expensive injuries \u2014 grafts, multiple surgeries, long burn-unit stays, and permanent scarring and disfigurement. That severity makes finding every responsible party and every layer of insurance decisive.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the liability questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_BURN_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Burn Injury Claims',
    title: 'San Diego Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Burned in an industrial, refinery, shipyard, or apartment fire in San Diego? A claim can reach a product manufacturer, a property owner, or a workplace third party \u2014 and a burn on a federal or military site follows different rules.',
    psychology: 'I was badly burned in San Diego and do not know who is responsible or how to pay for the treatment.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego industrial burn injury lawyer',
      'burned at work third party claim california',
      'refinery explosion injury claim california',
      'military base burn injury ftca',
      'apartment fire landlord liability san diego',
    ],
    signals: [
      'Industrial / refinery / shipyard',
      'Workplace third-party claim',
      'Product liability (strict)',
      'Federal / military (FTCA)',
      'Landlord habitability (1941)',
      'Burn severity & disfigurement',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s heavy industrial, refinery, and shipyard work, plus its large federal and military installations, shape its burn-injury pattern: workplace burns and explosions are a recurring cause, which puts the third-party-versus-workers\u2019-compensation question at the center. ${WORKPLACE} ${PRODUCT} On San Diego\u2019s many federal and military sites, a burn can involve the Federal Tort Claims Act and its distinct procedure and deadline, or contractor and product claims where a service member\u2019s own remedies are limited. ${LANDLORD} ${SEVERITY} Pure comparative negligence applies, the state deadline is generally two years (Code of Civil Procedure section 335.1), a six-month Government Claims Act deadline can apply for a public entity, and a federal claim carries its own separate deadline. Civil cases are filed in San Diego County Superior Court, though a federal claim proceeds under federal rules.`,
      whatToTrack: [
        'Whether the burn happened at work and who employed you',
        'Any product, property owner, or other contractor beyond the employer',
        'Whether a refinery, industrial, or shipyard process was involved',
        'Whether the site was federal or military (FTCA rules)',
        'The product or equipment that caused the burn and its maker',
        'Photographs of the scene, the equipment, and the injuries',
        'The fire or agency origin-and-cause report',
        'Medical treatment from first response and burn-unit care onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a San Diego burn claim by separating a workplace third-party claim from workers\u2019 compensation, preserving the defective equipment or product for a strict-liability claim, and flagging early when a federal or military site brings the Federal Tort Claims Act and its distinct deadline into play. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was burned at work in a refinery or shipyard. Is workers\u2019 comp my only option?',
        a: 'Not necessarily. Workers\u2019 compensation covers a workplace burn against your employer regardless of fault, but it does not pay for pain and suffering. A separate third-party claim \u2014 against a product manufacturer, a property owner, or another contractor on the site \u2014 can pursue full damages, which matters greatly in severe industrial burns.',
      },
      {
        q: 'The burn happened on a military base or federal site. Does that change things?',
        a: 'Yes. A burn on a federal or military site can involve the Federal Tort Claims Act, which has its own procedure and a distinct deadline, and a service member\u2019s own remedies may be limited \u2014 though contractor and product claims may still exist. Because these rules are unforgiving, an early assessment is especially important.',
      },
      {
        q: 'The equipment or product that burned me was defective. Who is liable?',
        a: 'A defective product or piece of equipment that ignites, overheats, or explodes can carry strict product liability against the manufacturer, distributor, and seller, without proof of negligence. Preserving the item rather than discarding it is critical, because the product is the evidence.',
      },
      {
        q: 'Why do burn cases need a lawyer more than other injuries?',
        a: 'Burns are among the most severe and expensive injuries \u2014 grafts, multiple surgeries, long burn-unit stays, and permanent scarring and disfigurement. Finding every responsible party and every layer of insurance is decisive and difficult to do alone.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the liability questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_BURN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Burn Injury Claims',
    title: 'Sacramento Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Burned in a gas explosion, a residential fire, or a utility-caused fire in Sacramento? A claim can reach a utility, a landlord, or a product manufacturer \u2014 and a public entity brings a six-month deadline.',
    psychology: 'I was badly burned in Sacramento and do not know who is responsible or how to pay for the treatment.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento gas explosion injury lawyer',
      'apartment fire landlord liability california',
      'utility caused fire injury claim california',
      'landlord no smoke detector fire sacramento',
      'burn injury lawyer sacramento',
    ],
    signals: [
      'Gas explosion / utility fire',
      'Landlord habitability (1941)',
      'Smoke / CO detector duty',
      'Product liability (strict)',
      'Public-entity 6-month deadline',
      'Burn severity & disfigurement',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s aging gas distribution network and older apartment stock shape its burn-injury pattern: gas explosions, utility-caused fires, and residential fires are recurring causes. A utility can be liable for a gas explosion or a utility-ignited fire, bringing its own substantial insurance into play, and where a public entity or a publicly owned utility is involved, the six-month Government Claims Act deadline can apply. ${LANDLORD} ${PRODUCT} ${WORKPLACE} ${SEVERITY} Pure comparative negligence applies, the state deadline is generally two years (Code of Civil Procedure section 335.1), and the six-month claims deadline against a public entity is a distinctive Sacramento risk given how many claims involve public utilities and agencies. Civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Whether a gas leak, explosion, or utility line was involved',
        'Whether a public entity or public utility is a defendant (six-month rule)',
        'Whether smoke and carbon-monoxide detectors were present and working',
        'The product or appliance that started the fire, if any',
        'Any repair requests or complaints the landlord ignored',
        'Photographs of the scene, the product, and the injuries',
        'The fire department origin-and-cause report',
        'Medical treatment from first response and burn-unit care onward',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a Sacramento burn claim around the utility, landlord-habitability, and product paths that drive the area\u2019s fires, flags immediately when a public entity or public utility triggers the six-month claims deadline, and separates any workplace third-party claim from workers\u2019 compensation. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A gas explosion or a utility caused the fire. Who is responsible, and is there a shorter deadline?',
        a: 'A utility can be liable for a gas explosion or a utility-ignited fire, bringing its own insurance into play. If the utility or another defendant is a public entity, the six-month Government Claims Act deadline can apply \u2014 far shorter than the usual two years \u2014 so an early assessment is critical in Sacramento.',
      },
      {
        q: 'My apartment had no working smoke detector. Does that matter?',
        a: 'Yes. A landlord must keep a rental habitable and maintain working smoke alarms and, where required, carbon-monoxide detectors under Health and Safety Code sections 13113.7 and 17926. A missing or dead detector, a blocked exit, or an ignored repair request that causes or worsens a fire injury is frequently the core of a residential burn claim.',
      },
      {
        q: 'I was burned at work. Is workers\u2019 comp my only option?',
        a: 'Not necessarily. Workers\u2019 compensation covers a workplace burn against your employer regardless of fault, but does not pay for pain and suffering. A separate third-party claim against a product manufacturer, a property owner, or another contractor can pursue full damages.',
      },
      {
        q: 'Why do burn cases need a lawyer more than other injuries?',
        a: 'Burns are among the most severe and expensive injuries \u2014 grafts, multiple surgeries, long burn-unit stays, and permanent scarring and disfigurement. That severity makes finding every responsible party and every layer of insurance decisive.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the liability questions, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const burnInjuryCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_BURN_SLUG]: {
    scenario: `A tenant was badly burned in an LA apartment fire that spread because the smoke detectors were dead and the rear exit was blocked, and it started with a charging e-bike battery. The landlord-habitability failures and the preserved battery built parallel claims. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the product; note detectors and exits; get the fire report.'],
      ['First days', 'The landlord and the product manufacturer identified.'],
      ['First weeks', 'Habitability failures and the product defect developed.'],
      ['Longer term', 'Burn-unit treatment and disfigurement documented.'],
    ],
    severityLadder: [
      ['Landlord path', 'Missing detectors or blocked exits cause or worsen injury.'],
      ['Product path', 'A defective battery or appliance ignites the fire.'],
      ['Workplace path', 'A third party beyond the employer is responsible.'],
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
      'Whether a workplace third party is also responsible',
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
      'The claim is limited to workers\u2019 comp with no third party.',
      'The severity of a burn is undervalued early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were smoke and CO detectors present and working?' },
      { label: 'Step 2', question: 'What product or appliance started the fire?' },
      { label: 'Step 3', question: 'Did the burn happen at work, and who else was involved?' },
      { label: 'Step 4', question: 'Have you preserved the product and photographs?' },
    ],
  },
  [SF_BURN_SLUG]: {
    scenario: `A resident was burned when a gas leak ignited in an older San Francisco building, and the fire spread fast because a shared-wall path and a dead detector let it. The utility, gas, and habitability questions were developed together. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the scene; note gas, detectors, and exits; get the fire report.'],
      ['First days', 'The utility, landlord, and any product identified.'],
      ['First weeks', 'Utility, habitability, and product paths developed.'],
      ['Longer term', 'Burn-unit treatment and disfigurement documented.'],
    ],
    severityLadder: [
      ['Utility path', 'A gas explosion or utility fire brings the utility in.'],
      ['Landlord path', 'Detector failures and blocked exits worsen injury.'],
      ['Product path', 'A defective appliance ignites the fire.'],
      ['Catastrophic harm', 'Grafts, surgeries, and permanent scarring.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Burn-unit records tie the injuries to the fire.' },
      { label: 'Surgery', copy: 'Grafts and procedures document severity.' },
      { label: 'Continuing care', copy: 'Scar revision and therapy show lasting harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a gas leak or utility line was involved',
      'Whether smoke and CO detectors were present and working',
      'How the fire spread through the building',
      'Whether a defective appliance was involved',
      'Whether the scene and product were preserved',
      'Burn severity, disfigurement, and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Utilities add coverage', copy: 'A gas or utility fire brings substantial insurance.' },
      { label: 'Habitability anchors fault', copy: 'Detector and exit failures drive landlord liability.' },
      { label: 'Products add a path', copy: 'A defective appliance opens strict liability.' },
      { label: 'Origin evidence is key', copy: 'The fire report and preserved scene decide cause.' },
    ],
    insuranceProblems: [
      'The gas or utility cause is never technically investigated.',
      'Habitability failures in an older building are overlooked.',
      'The defective appliance is discarded before testing.',
      'The severity of a burn is undervalued early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a gas leak, explosion, or utility line involved?' },
      { label: 'Step 2', question: 'Were smoke and CO detectors present and working?' },
      { label: 'Step 3', question: 'How did the fire spread through the building?' },
      { label: 'Step 4', question: 'Have you preserved the scene and the fire report?' },
    ],
  },
  [SD_BURN_SLUG]: {
    scenario: `A shipyard worker was burned when defective equipment flashed over, and workers\u2019 comp alone left the medical bills and pain uncovered. A third-party claim against the equipment maker, and a check for federal-site rules, opened full damages. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the equipment; identify the employer and any third party.'],
      ['First days', 'The product maker and any property owner identified.'],
      ['First weeks', 'Third-party path and any FTCA question developed.'],
      ['Longer term', 'Burn-unit treatment and disfigurement documented.'],
    ],
    severityLadder: [
      ['Workplace path', 'A third party beyond the employer is responsible.'],
      ['Product path', 'Defective equipment or a product causes the burn.'],
      ['Federal path', 'A military or federal site changes the rules.'],
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
      'Whether defective equipment or a product caused the burn',
      'Whether the site was federal or military (FTCA)',
      'Whether the equipment was preserved',
      'Which deadline applies to each defendant',
      'Burn severity, disfigurement, and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Third parties matter', copy: 'A claim beyond comp pursues full damages.' },
      { label: 'Products add coverage', copy: 'Defective equipment opens strict liability.' },
      { label: 'Federal rules differ', copy: 'FTCA changes procedure and the deadline.' },
      { label: 'Preserve equipment', copy: 'The item itself proves the defect.' },
    ],
    insuranceProblems: [
      'The claim is limited to workers\u2019 comp with no third party.',
      'The defective equipment is discarded before testing.',
      'A federal-site deadline is missed for lack of an early check.',
      'The severity of a burn is undervalued early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the burn happen at work, and who employed you?' },
      { label: 'Step 2', question: 'Was a product, property owner, or contractor involved?' },
      { label: 'Step 3', question: 'Was the site federal or military?' },
      { label: 'Step 4', question: 'Have you preserved the equipment and photographs?' },
    ],
  },
  [SAC_BURN_SLUG]: {
    scenario: `A family was burned when a gas line failure ignited their Sacramento apartment, and a public utility was involved \u2014 which meant a six-month claims deadline, not two years. Filing the government claim in time preserved the case. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Preserve the scene; note gas, detectors, and any public entity.'],
      ['First days', 'The utility, landlord, and public-entity status identified.'],
      ['First weeks', 'The six-month claim filed if a public entity is involved.'],
      ['Longer term', 'Burn-unit treatment and disfigurement documented.'],
    ],
    severityLadder: [
      ['Public-entity path', 'A public utility triggers the six-month deadline.'],
      ['Utility path', 'A gas explosion or utility fire brings the utility in.'],
      ['Landlord path', 'Detector failures and blocked exits worsen injury.'],
      ['Catastrophic harm', 'Grafts, surgeries, and permanent scarring.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Burn-unit records tie the injuries to the fire.' },
      { label: 'Surgery', copy: 'Grafts and procedures document severity.' },
      { label: 'Continuing care', copy: 'Scar revision and therapy show lasting harm.' },
      { label: 'Documentation', copy: 'Bills, wage loss, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a public entity or public utility is a defendant',
      'Whether the six-month claim was filed in time',
      'Whether a gas leak or utility line was involved',
      'Whether smoke and CO detectors were present and working',
      'Whether the scene and product were preserved',
      'Burn severity, disfigurement, and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Deadline is short', copy: 'A public entity means six months, not two years.' },
      { label: 'Utilities add coverage', copy: 'A gas or utility fire brings substantial insurance.' },
      { label: 'Habitability anchors fault', copy: 'Detector and exit failures drive landlord liability.' },
      { label: 'Move fast', copy: 'The claims deadline can arrive before treatment ends.' },
    ],
    insuranceProblems: [
      'The six-month public-entity deadline is missed.',
      'The gas or utility cause is never technically investigated.',
      'Habitability failures are overlooked in an older building.',
      'The severity of a burn is undervalued early.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is a public entity or public utility a possible defendant?' },
      { label: 'Step 2', question: 'Was a gas leak, explosion, or utility line involved?' },
      { label: 'Step 3', question: 'Were smoke and CO detectors present and working?' },
      { label: 'Step 4', question: 'Have you preserved the scene and the fire report?' },
    ],
  },
}
