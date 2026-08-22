import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, burn injury practice area (batch 3): location-specific guides for
 * Riverside, San Bernardino, Bakersfield, and Anaheim, extending the batch-1 (LA,
 * SF, San Diego, Sacramento) and batch-2 (San Jose, Fresno, Long Beach, Oakland)
 * hub.
 *
 * Burn injuries are a distinct catastrophic-injury practice area: the causes,
 * the responsible parties, and the evidence differ sharply from a typical
 * accident case, and the local built environment drives the pattern.
 *
 * Local context, genuine rather than interpolated:
 *  - Riverside: Inland Empire warehouse and industrial fires and lithium-ion
 *    battery fires in a logistics economy, older apartment stock in a hot climate.
 *  - San Bernardino: warehouse, rail-yard, and industrial fires and explosions,
 *    with apartment fires and a hot-climate detector/habitability pattern.
 *  - Bakersfield: oilfield and refinery fires and explosions (a third-party claim
 *    beyond comp), agricultural chemical burns, and propane/farm-equipment fires.
 *  - Anaheim: apartment fires, hotel and hospitality kitchen burns, e-bike battery
 *    fires, and industrial burns, with OCTA/public-entity questions.
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

export const RIV_BURN_SLUG = '/riverside-burn-injury'
export const SB_BURN_SLUG = '/san-bernardino-burn-injury'
export const BAKERSFIELD_BURN_SLUG = '/bakersfield-burn-injury'
export const ANAHEIM_BURN_SLUG = '/anaheim-burn-injury'

export const burnInjuryCityGuidePages3: LandingPage[] = [
  {
    slug: RIV_BURN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Burn Injury Claims',
    title: 'Riverside Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Badly burned in a Riverside apartment fire, warehouse blaze, or battery fire? The case turns on finding every responsible party \u2014 landlord, product maker, or a workplace third party.',
    psychology: 'I was seriously burned in Riverside and I do not know who is responsible or how I will pay for burn care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside burn injury lawyer',
      'apartment fire injury claim california',
      'warehouse fire burn third party california',
      'lithium battery fire injury california',
      'burn injury lawsuit california',
    ],
    signals: [
      'Landlord habitability & detectors',
      'Defective-product fires',
      'Warehouse / industrial burns',
      'Third-party claim beyond comp',
      'Catastrophic burn severity',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s vast warehouse and logistics economy drives industrial and lithium-ion battery fires, and its older apartment stock in a hot climate drives residential fires where detectors and wiring are often the issue \u2014 and in each, the case turns on who is responsible. ${LANDLORD} ${PRODUCT} ${WORKPLACE} ${SEVERITY} Civil cases are filed in Riverside County Superior Court, generally within two years, or six months where a public entity or utility is involved.`,
      whatToTrack: [
        'Whether the fire was residential, industrial, or product-related',
        'For a rental, detector, wiring, and exit conditions and any repair requests',
        'For a work burn, every non-employer party and any comp claim',
        'The product involved (heater, wiring, battery) and its make',
        'Whether a utility or gas line contributed',
        'The fire department and any origin-and-cause report',
        'The full scope of burn treatment and scarring',
        'Every layer of insurance \u2014 landlord, product, utility, workplace',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party behind a Riverside burn \u2014 landlord, product maker, utility, or workplace third party \u2014 preserves the origin-and-cause evidence, and organises the burn-care record for a severe-injury claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A dead smoke alarm made my apartment fire worse. Is the landlord responsible?',
        a: 'Possibly. A landlord must keep a rental habitable and maintain working smoke alarms and, where required, carbon-monoxide detectors. A missing or dead detector, blocked exits, or faulty wiring that causes or worsens a fire injury is frequently the core of a residential burn claim.',
      },
      {
        q: 'I was burned at a warehouse. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. A burn at work is generally covered by workers\u2019 compensation regardless of fault, but that does not pay for pain and suffering. A separate third-party claim \u2014 against a product manufacturer, the property owner, or another contractor \u2014 can pursue full damages, so identifying that third party matters.',
      },
      {
        q: 'The fire started with an e-bike or heater. Can the maker be liable?',
        a: 'Possibly. A product that ignites, overheats, or explodes \u2014 including a lithium-ion battery \u2014 can carry strict product liability against the manufacturer, distributor, and seller without proof of negligence, which opens coverage a landlord or homeowner policy may not.',
      },
      {
        q: 'Why does finding every party matter so much in a burn case?',
        a: 'Because burns are among the most severe and expensive injuries \u2014 grafts, surgeries, long burn-unit stays, and permanent scarring. Finding every responsible party and every layer of insurance is often what makes a fair recovery possible.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the parties, the evidence, and the treatment so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_BURN_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Burn Injury Claims',
    title: 'San Bernardino Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Badly burned in a San Bernardino warehouse blaze, rail-yard fire, or apartment fire? The case turns on finding every responsible party \u2014 landlord, product maker, or a workplace third party.',
    psychology: 'I was seriously burned in San Bernardino and I do not know who is responsible or how I will pay for burn care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino burn injury lawyer',
      'warehouse fire burn third party california',
      'apartment fire injury claim california',
      'industrial explosion burn claim california',
      'burn injury lawsuit california',
    ],
    signals: [
      'Warehouse / rail-yard fires',
      'Landlord habitability & detectors',
      'Defective-product fires',
      'Third-party claim beyond comp',
      'Catastrophic burn severity',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `San Bernardino\u2019s warehouse, rail-yard, and industrial economy drives burns and explosions, and its apartment stock in a hot climate drives residential fires where detectors and wiring are often the issue \u2014 and in each, the case turns on who is responsible. ${WORKPLACE} ${LANDLORD} ${PRODUCT} ${SEVERITY} Civil cases are filed in San Bernardino County Superior Court, generally within two years, or six months where a public entity or utility is involved.`,
      whatToTrack: [
        'Whether the fire was industrial, residential, or product-related',
        'For a work burn, every non-employer party and any comp claim',
        'For a rental, detector, wiring, and exit conditions and any repair requests',
        'The product or equipment involved and its make',
        'Whether a utility or gas line contributed',
        'The fire department and any origin-and-cause report',
        'The full scope of burn treatment and scarring',
        'Every layer of insurance \u2014 workplace third party, landlord, product, utility',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party behind a San Bernardino burn \u2014 workplace third party, landlord, product maker, or utility \u2014 preserves the origin-and-cause evidence, and organises the burn-care record for a severe-injury claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was burned in a warehouse or rail-yard fire. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. A burn at work is generally covered by workers\u2019 compensation regardless of fault, but that does not pay for pain and suffering. A separate third-party claim \u2014 against a product manufacturer, the property owner, or another contractor \u2014 can pursue full damages, so identifying that third party matters.',
      },
      {
        q: 'A dead smoke alarm made my apartment fire worse. Is the landlord responsible?',
        a: 'Possibly. A landlord must keep a rental habitable and maintain working smoke alarms and, where required, carbon-monoxide detectors. A missing or dead detector, blocked exits, or faulty wiring that causes or worsens a fire injury is frequently the core of a residential burn claim.',
      },
      {
        q: 'An explosion or defective equipment caused the fire. Who can be liable?',
        a: 'Potentially the maker of a product that ignited or exploded (strict product liability), a utility for a gas or utility fire, or another party on the site. Preserving the equipment and the origin-and-cause evidence early is important because it decides who is responsible.',
      },
      {
        q: 'Why does finding every party matter so much in a burn case?',
        a: 'Because burns are among the most severe and expensive injuries \u2014 grafts, surgeries, long burn-unit stays, and permanent scarring. Finding every responsible party and every layer of insurance is often what makes a fair recovery possible.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the parties, the evidence, and the treatment so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_BURN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Burn Injury Claims',
    title: 'Bakersfield Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Badly burned in a Bakersfield oilfield or refinery fire, chemical burn, or apartment fire? A workplace burn often reaches beyond workers\u2019 comp to third parties.',
    psychology: 'I was seriously burned in a Bakersfield-area oilfield, plant, or fire and I do not know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield burn injury lawyer',
      'oilfield explosion burn third party california',
      'refinery fire burn claim california',
      'chemical burn injury claim california',
      'burn injury lawsuit california',
    ],
    signals: [
      'Oilfield / refinery fires & explosions',
      'Agricultural chemical burns',
      'Third-party claim beyond comp',
      'Defective-product / equipment fires',
      'Catastrophic burn severity',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `Bakersfield\u2019s oilfield, refinery, and petrochemical economy drives industrial fires and explosions, and its agricultural work drives chemical and propane burns \u2014 and where the injury happened on the job, the most important question is often who other than the employer was responsible. ${WORKPLACE} ${PRODUCT} ${LANDLORD} ${SEVERITY} Civil cases are filed in Kern County Superior Court, generally within two years, or six months where a public entity or utility is involved.`,
      whatToTrack: [
        'Whether the burn was oilfield/industrial, chemical, or residential',
        'For a work burn, every non-employer party and any comp claim',
        'The equipment, chemical, or product involved and its maker',
        'Whether another operator or contractor was on site',
        'The fire or incident report and any origin-and-cause finding',
        'For a rental, detector, wiring, and exit conditions',
        'The full scope of burn treatment and scarring',
        'Every layer of insurance \u2014 workplace third party, product, operator',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every non-employer party behind a Bakersfield oilfield, refinery, or chemical burn \u2014 operator, contractor, product maker \u2014 preserves the incident evidence, and organises the burn-care record for a severe-injury claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was burned in the oilfield or at a plant. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. A burn at work is generally covered by workers\u2019 compensation regardless of fault, but that does not pay for pain and suffering. A separate third-party claim \u2014 against another operator, a contractor, or an equipment or product maker \u2014 can pursue full damages, so identifying that third party is usually where a lawyer matters most.',
      },
      {
        q: 'A chemical caused my burn. Can I have a claim?',
        a: 'Possibly. A chemical burn can support a claim against the maker or supplier of a defective or improperly labeled product, or against another party whose negligence caused the exposure. Preserving the product, the labeling, and the safety data is important.',
      },
      {
        q: 'Equipment exploded and caused the fire. Who can be liable?',
        a: 'Potentially the maker of a product that ignited or exploded (strict product liability), or another operator or contractor on site. Preserving the equipment and the origin-and-cause evidence early is important because it decides who is responsible.',
      },
      {
        q: 'Why does finding every party matter so much in a burn case?',
        a: 'Because burns are among the most severe and expensive injuries \u2014 grafts, surgeries, long burn-unit stays, and permanent scarring. Finding every responsible party and every layer of insurance is often what makes a fair recovery possible.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the parties, the evidence, and the treatment so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_BURN_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Burn Injury Claims',
    title: 'Anaheim Burn Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Badly burned in an Anaheim apartment fire, hotel kitchen, or battery fire? The case turns on finding every responsible party \u2014 landlord, product maker, or a workplace third party.',
    psychology: 'I was seriously burned in Anaheim and I do not know who is responsible or how I will pay for burn care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim burn injury lawyer',
      'apartment fire injury claim california',
      'hotel kitchen burn claim california',
      'lithium battery fire injury california',
      'burn injury lawsuit california',
    ],
    signals: [
      'Landlord habitability & detectors',
      'Hotel / hospitality kitchen burns',
      'Defective-product / battery fires',
      'Third-party claim beyond comp',
      'Catastrophic burn severity',
      'Find every coverage source',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s dense apartment stock, its large hotel and hospitality economy in the resort corridor, and heavy e-bike use all drive burns \u2014 residential fires where detectors are the issue, kitchen and equipment burns at work, and lithium-ion battery fires \u2014 and in each, the case turns on who is responsible. ${LANDLORD} ${PRODUCT} ${WORKPLACE} ${SEVERITY} Civil cases are filed in Orange County Superior Court, generally within two years, or six months where a public entity or utility is involved.`,
      whatToTrack: [
        'Whether the fire was residential, hospitality/work, or product-related',
        'For a rental, detector, wiring, and exit conditions and any repair requests',
        'For a work burn, every non-employer party and any comp claim',
        'The product or equipment involved (battery, heater, kitchen equipment)',
        'Whether a utility or gas line contributed',
        'The fire department and any origin-and-cause report',
        'The full scope of burn treatment and scarring',
        'Every layer of insurance \u2014 landlord, product, utility, workplace',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party behind an Anaheim burn \u2014 landlord, product maker, utility, or workplace third party \u2014 preserves the origin-and-cause evidence, and organises the burn-care record for a severe-injury claim. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A dead smoke alarm made my apartment fire worse. Is the landlord responsible?',
        a: 'Possibly. A landlord must keep a rental habitable and maintain working smoke alarms and, where required, carbon-monoxide detectors. A missing or dead detector, blocked exits, or faulty wiring that causes or worsens a fire injury is frequently the core of a residential burn claim.',
      },
      {
        q: 'I was burned in a hotel or restaurant kitchen. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. A burn at work is generally covered by workers\u2019 compensation regardless of fault, but that does not pay for pain and suffering. A separate third-party claim \u2014 against an equipment maker, a property owner, or another contractor \u2014 can pursue full damages, so identifying that third party matters.',
      },
      {
        q: 'The fire started with an e-bike or appliance. Can the maker be liable?',
        a: 'Possibly. A product that ignites, overheats, or explodes \u2014 including a lithium-ion battery \u2014 can carry strict product liability against the manufacturer, distributor, and seller without proof of negligence, which opens coverage a landlord or homeowner policy may not.',
      },
      {
        q: 'Why does finding every party matter so much in a burn case?',
        a: 'Because burns are among the most severe and expensive injuries \u2014 grafts, surgeries, long burn-unit stays, and permanent scarring. Finding every responsible party and every layer of insurance is often what makes a fair recovery possible.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the parties, the evidence, and the treatment so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const burnInjuryCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [RIV_BURN_SLUG]: {
    scenario: `A Riverside tenant was badly burned when a fire spread through an apartment with a dead smoke alarm and blocked exit. The landlord\u2019s habitability failures, plus a defective heater, opened two sources of coverage for burn care. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the scene and product; get the fire report.'],
      ['First weeks', 'Identify landlord, product, and any workplace party.'],
      ['Treatment', 'Grafts and burn-unit care are documented.'],
      ['Longer term', 'Coverage and severe-injury damages developed.'],
    ],
    severityLadder: [
      ['Cause', 'Residential, industrial, or product.'],
      ['Responsible party', 'Landlord, product maker, or third party.'],
      ['Severity', 'Grafts and scarring are documented.'],
      ['Coverage', 'Every layer is pursued.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The burn is stabilised and documented.' },
      { label: 'Burn unit', copy: 'Grafts and surgeries build the record.' },
      { label: 'Rehabilitation', copy: 'Scarring and function are assessed.' },
      { label: 'Long-term', copy: 'Disfigurement and psychological harm documented.' },
    ],
    settlementDrivers: [
      'Whether a landlord\u2019s habitability duty was breached',
      'Whether a defective product ignited the fire',
      'Whether a workplace third party is liable',
      'The severity of the burns and scarring',
      'How many coverage sources are identified',
      'The origin-and-cause evidence',
    ],
    settlementValueDetails: [
      { label: 'Find every party', copy: 'Landlord, product, and workplace layers.' },
      { label: 'Product opens coverage', copy: 'Strict liability reaches the maker.' },
      { label: 'Severity drives value', copy: 'Burns are catastrophic and lasting.' },
      { label: 'Preserve the cause', copy: 'Origin-and-cause evidence decides fault.' },
    ],
    insuranceProblems: [
      'Only one responsible party is pursued.',
      'The igniting product is discarded before inspection.',
      'A workplace third-party claim is missed.',
      'The full burn-care record is never assembled.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the fire residential, industrial, or product-related?' },
      { label: 'Step 2', question: 'What product or equipment was involved?' },
      { label: 'Step 3', question: 'Who owns the property or employed you?' },
      { label: 'Step 4', question: 'What burn treatment have you needed?' },
    ],
  },
  [SB_BURN_SLUG]: {
    scenario: `A San Bernardino warehouse worker was burned when a defective piece of equipment ignited. A third-party claim against the equipment maker reached the pain-and-suffering damages workers\u2019 comp does not pay. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the equipment; get the fire/incident report.'],
      ['First weeks', 'Identify every non-employer party; open comp.'],
      ['Treatment', 'Grafts and burn-unit care are documented.'],
      ['Longer term', 'Third-party and severe-injury damages developed.'],
    ],
    severityLadder: [
      ['Cause', 'Industrial, residential, or product.'],
      ['Comp vs. third party', 'A non-employer party can be liable.'],
      ['Severity', 'Grafts and scarring are documented.'],
      ['Coverage', 'Every layer is pursued.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The burn is stabilised and documented.' },
      { label: 'Burn unit', copy: 'Grafts and surgeries build the record.' },
      { label: 'Rehabilitation', copy: 'Scarring and function are assessed.' },
      { label: 'Long-term', copy: 'Disfigurement and psychological harm documented.' },
    ],
    settlementDrivers: [
      'Whether a workplace third party is liable',
      'Whether a defective product ignited the fire',
      'The severity of the burns and scarring',
      'How many coverage sources are identified',
      'The origin-and-cause evidence',
      'How the comp lien is negotiated',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'A third-party claim reaches full damages.' },
      { label: 'Product opens coverage', copy: 'Strict liability reaches the maker.' },
      { label: 'Severity drives value', copy: 'Burns are catastrophic and lasting.' },
      { label: 'Preserve the cause', copy: 'Origin-and-cause evidence decides fault.' },
    ],
    insuranceProblems: [
      'Only the comp claim is pursued, missing the third party.',
      'The igniting equipment is discarded before inspection.',
      'The full burn-care record is never assembled.',
      'Available coverage is never fully explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the burn industrial, residential, or product-related?' },
      { label: 'Step 2', question: 'Who, besides an employer, may be at fault?' },
      { label: 'Step 3', question: 'Has the equipment been preserved?' },
      { label: 'Step 4', question: 'What burn treatment have you needed?' },
    ],
  },
  [BAKERSFIELD_BURN_SLUG]: {
    scenario: `A Bakersfield oilfield worker was burned in an explosion caused by another operator\u2019s equipment. A third-party claim reached the pain-and-suffering damages workers\u2019 comp does not pay, and the incident evidence established fault. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the equipment; get the incident report.'],
      ['First weeks', 'Identify every non-employer party; open comp.'],
      ['Treatment', 'Grafts and burn-unit care are documented.'],
      ['Longer term', 'Third-party and severe-injury damages developed.'],
    ],
    severityLadder: [
      ['Cause', 'Oilfield/industrial, chemical, or residential.'],
      ['Comp vs. third party', 'A non-employer party can be liable.'],
      ['Severity', 'Grafts and scarring are documented.'],
      ['Coverage', 'Every layer is pursued.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The burn is stabilised and documented.' },
      { label: 'Burn unit', copy: 'Grafts and surgeries build the record.' },
      { label: 'Rehabilitation', copy: 'Scarring and function are assessed.' },
      { label: 'Long-term', copy: 'Disfigurement and psychological harm documented.' },
    ],
    settlementDrivers: [
      'Whether a non-employer operator or contractor is liable',
      'Whether a defective product or chemical caused the burn',
      'The severity of the burns and scarring',
      'How many coverage sources are identified',
      'The incident and origin-and-cause evidence',
      'How the comp lien is negotiated',
    ],
    settlementValueDetails: [
      { label: 'Beyond comp', copy: 'A third-party claim reaches full damages.' },
      { label: 'Product/chemical', copy: 'Strict liability can reach a maker or supplier.' },
      { label: 'Severity drives value', copy: 'Burns are catastrophic and lasting.' },
      { label: 'Preserve the cause', copy: 'Incident evidence decides fault.' },
    ],
    insuranceProblems: [
      'Only the comp claim is pursued, missing the third party.',
      'The equipment or chemical is not preserved.',
      'The full burn-care record is never assembled.',
      'Available coverage is never fully explored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the burn oilfield/industrial, chemical, or residential?' },
      { label: 'Step 2', question: 'Who, besides an employer, may be at fault?' },
      { label: 'Step 3', question: 'Has the equipment or chemical been preserved?' },
      { label: 'Step 4', question: 'What burn treatment have you needed?' },
    ],
  },
  [ANAHEIM_BURN_SLUG]: {
    scenario: `An Anaheim tenant was badly burned in an apartment fire that spread past a blocked exit, started by a defective e-bike battery. The landlord\u2019s habitability failures and the battery maker\u2019s strict liability opened two sources of coverage. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the scene and product; get the fire report.'],
      ['First weeks', 'Identify landlord, product, and any workplace party.'],
      ['Treatment', 'Grafts and burn-unit care are documented.'],
      ['Longer term', 'Coverage and severe-injury damages developed.'],
    ],
    severityLadder: [
      ['Cause', 'Residential, hospitality/work, or product.'],
      ['Responsible party', 'Landlord, product maker, or third party.'],
      ['Severity', 'Grafts and scarring are documented.'],
      ['Coverage', 'Every layer is pursued.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'The burn is stabilised and documented.' },
      { label: 'Burn unit', copy: 'Grafts and surgeries build the record.' },
      { label: 'Rehabilitation', copy: 'Scarring and function are assessed.' },
      { label: 'Long-term', copy: 'Disfigurement and psychological harm documented.' },
    ],
    settlementDrivers: [
      'Whether a landlord\u2019s habitability duty was breached',
      'Whether a defective product ignited the fire',
      'Whether a hospitality/workplace third party is liable',
      'The severity of the burns and scarring',
      'How many coverage sources are identified',
      'The origin-and-cause evidence',
    ],
    settlementValueDetails: [
      { label: 'Find every party', copy: 'Landlord, product, and workplace layers.' },
      { label: 'Product opens coverage', copy: 'Strict liability reaches the maker.' },
      { label: 'Severity drives value', copy: 'Burns are catastrophic and lasting.' },
      { label: 'Preserve the cause', copy: 'Origin-and-cause evidence decides fault.' },
    ],
    insuranceProblems: [
      'Only one responsible party is pursued.',
      'The igniting product is discarded before inspection.',
      'A hospitality/workplace third-party claim is missed.',
      'The full burn-care record is never assembled.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the fire residential, hospitality/work, or product-related?' },
      { label: 'Step 2', question: 'What product or equipment was involved?' },
      { label: 'Step 3', question: 'Who owns the property or employed you?' },
      { label: 'Step 4', question: 'What burn treatment have you needed?' },
    ],
  },
}
