import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, defective consumer product / lithium-battery fire practice area:
 * location-specific guides for Los Angeles, San Francisco, San Diego, and
 * Oakland.
 *
 * This is distinct from the vehicle-defect / crashworthiness hub (which covers
 * cars) and from the burn-injury hub (which centers on damages and landlord
 * duties): it centers on the product-liability framework itself \u2014 strict
 * liability across the chain of distribution, online-marketplace liability, and
 * the urgent need to preserve the product \u2014 with lithium-ion battery fires as the
 * recurring fact pattern.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: enormous consumer volume, plus a surge of e-bike and scooter
 *    battery fires in apartments.
 *  - San Francisco: a tech-heavy market saturated with e-mobility devices and
 *    early-adopter gadgets.
 *  - San Diego: a large consumer base and heavy e-mobility use along the coast.
 *  - Oakland: aging multi-unit housing where a battery fire can spread quickly.
 *
 * Applied accurately:
 *  - California applies strict product liability: a product with a design,
 *    manufacturing, or warning (failure-to-warn) defect can create liability
 *    without the injured person having to prove negligence.
 *  - Everyone in the chain of distribution can be liable \u2014 the manufacturer, the
 *    distributor, and the retailer \u2014 and an online marketplace can be liable as
 *    part of that chain (Bolger v. Amazon.com, LLC).
 *  - Lithium-ion batteries in e-bikes, scooters, hoverboards, phones, and vaping
 *    devices can overheat, ignite, or explode; defective cells, missing
 *    protection circuits, uncertified chargers, and inadequate warnings are
 *    recurring issues.
 *  - The product is the evidence: the device and its remains, the charger,
 *    packaging, receipts, and any fire-department origin-and-cause report should
 *    be preserved before anything is discarded or repaired. A recall does not
 *    itself prove a defect but can support the claim.
 *  - A personal-injury deadline is generally two years (Code of Civil Procedure
 *    section 335.1), and the discovery rule can matter for a latent defect.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a product was defective, which parties in the distribution chain are responsible, and which deadline applies depend on facts a licensed California attorney should review promptly.'

const STRICT =
  'California applies strict product liability: a product with a design defect, a manufacturing defect, or a failure-to-warn defect can create liability without the injured person having to prove the maker was negligent. The focus is on the product\u2019s condition and the harm it caused rather than on carelessness.'

const CHAIN =
  'Liability extends across the entire chain of distribution \u2014 the manufacturer, the distributor, and the retailer can each be responsible for a defective product. An online marketplace can also be liable as part of that chain when it is integral to bringing the product to the consumer (Bolger v. Amazon.com, LLC), which matters for the many devices bought online.'

const BATTERY =
  'Lithium-ion batteries \u2014 in e-bikes, scooters, hoverboards, phones, power tools, and vaping devices \u2014 can overheat, ignite, or explode. Defective cells, missing or failed protection circuits, incompatible or uncertified chargers, and inadequate warnings are recurring problems, and the resulting fires can cause severe burns and destroy homes.'

const PRESERVE =
  'In a product case the product is the evidence: the device and whatever survives a fire, the charger, the packaging, receipts, and any fire-department origin-and-cause report should be preserved before anything is discarded, repaired, or returned. A related recall does not by itself prove a defect, but it can support the claim.'

const SOL =
  'A personal-injury deadline is generally two years from the injury (Code of Civil Procedure section 335.1). The discovery rule can matter when a defect is latent and the cause is not immediately known, but waiting risks both the deadline and the loss of the physical evidence.'

export const LA_PRODUCT_SLUG = '/los-angeles-defective-product-battery-fire-claim'
export const SF_PRODUCT_SLUG = '/san-francisco-defective-product-battery-fire-claim'
export const SD_PRODUCT_SLUG = '/san-diego-defective-product-battery-fire-claim'
export const OAK_PRODUCT_SLUG = '/oakland-defective-product-battery-fire-claim'

export const consumerProductCityGuidePages: LandingPage[] = [
  {
    slug: LA_PRODUCT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Defective Product & Battery Fire Claims',
    title: 'Los Angeles Defective Product & Battery Fire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured by a defective product or e-bike battery fire in LA? Strict liability reaches the whole chain \u2014 and the product is the key evidence to preserve.',
    psychology: 'An e-bike battery caught fire in my LA apartment and I want to know who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles defective product lawyer',
      'e-bike battery fire lawsuit california',
      'lithium battery explosion injury california',
      'amazon defective product liability california',
      'product recall injury claim california',
    ],
    signals: [
      'Strict product liability',
      'Whole chain of distribution',
      'Online-marketplace liability (Bolger)',
      'Lithium-battery fire pattern',
      'Preserve the product as evidence',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s enormous consumer market \u2014 and a surge of e-bike and scooter battery fires in apartments \u2014 makes defective-product claims common, and they follow a framework distinct from a car-crash case. ${STRICT} ${CHAIN} ${BATTERY} ${PRESERVE} ${SOL} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The exact product, model, and where it was bought',
        'The device, charger, and any remains after a fire',
        'Packaging, manuals, and receipts',
        'Whether the item was subject to a recall',
        'Any fire-department origin-and-cause report',
        'Every seller in the chain, including online',
        'The injuries and property damage',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps an LA victim preserve the device and charger before they are discarded, identify every seller in the chain including online marketplaces, and gather the recall and fire-report evidence. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I have to prove the company was careless?',
        a: 'Not for a strict product-liability claim. California allows recovery for a design, manufacturing, or failure-to-warn defect based on the product\u2019s condition and the harm it caused, without proving negligence.',
      },
      {
        q: 'I bought the item on Amazon. Can the marketplace be liable?',
        a: 'Possibly. An online marketplace can be liable as part of the chain of distribution when it is integral to bringing the product to the consumer (Bolger v. Amazon.com, LLC), so the seller path online is worth identifying.',
      },
      {
        q: 'My e-bike battery burned my apartment. What should I do first?',
        a: 'Preserve the evidence. Keep the device, charger, and any remains, the packaging and receipts, and obtain any fire-department origin-and-cause report, because the product itself is the central proof.',
      },
      {
        q: 'The product was recalled. Does that win my case?',
        a: 'Not by itself. A recall does not automatically prove a defect caused your injury, but it can support the claim, and the product and records still need to be preserved and analyzed.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the product evidence, the sellers, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_PRODUCT_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Defective Product & Battery Fire Claims',
    title: 'San Francisco Defective Product & Battery Fire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured by a defective gadget or e-mobility battery fire in SF? Strict liability reaches the whole chain \u2014 and the product is the key evidence.',
    psychology: 'A lithium battery in my device exploded in San Francisco and I need to know my options.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco defective product lawyer',
      'e-bike battery fire lawsuit california',
      'lithium battery explosion injury california',
      'amazon defective product liability california',
      'e-scooter battery fire injury california',
    ],
    signals: [
      'Strict product liability',
      'Whole chain of distribution',
      'Online-marketplace liability (Bolger)',
      'Lithium-battery fire pattern',
      'Preserve the product as evidence',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s tech-heavy market is saturated with e-mobility devices and early-adopter gadgets, which puts many lithium-ion batteries into daily use and into the fire statistics. ${STRICT} ${CHAIN} ${BATTERY} ${PRESERVE} ${SOL} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'The exact product, model, and where it was bought',
        'The device, charger, and any remains after a fire',
        'Packaging, manuals, and receipts',
        'Whether the item was subject to a recall',
        'Any fire-department origin-and-cause report',
        'Every seller in the chain, including online',
        'The injuries and property damage',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Francisco victim preserve the device and charger, trace every seller in the chain including online marketplaces, and gather the recall and fire-report evidence. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What kinds of defect can I claim?',
        a: 'California recognizes design, manufacturing, and failure-to-warn defects under strict product liability, so you do not have to prove negligence \u2014 the focus is on the product\u2019s condition and the harm.',
      },
      {
        q: 'The gadget was bought from an online marketplace. Does that matter?',
        a: 'It can help. A marketplace can be liable as part of the chain of distribution when it is integral to delivering the product (Bolger v. Amazon.com, LLC), which is relevant for the many devices bought online.',
      },
      {
        q: 'What should I keep after a battery explosion?',
        a: 'Keep the device, charger, and remains, the packaging and receipts, and get any fire-department origin-and-cause report. The product is the central evidence and should not be discarded.',
      },
      {
        q: 'How long do I have to file?',
        a: 'Generally two years from the injury (Code of Civil Procedure section 335.1). The discovery rule can matter for a latent defect, but waiting risks both the deadline and loss of the physical evidence.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the product evidence, the sellers, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_PRODUCT_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Defective Product & Battery Fire Claims',
    title: 'San Diego Defective Product & Battery Fire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured by a defective product or battery fire in San Diego? Strict liability reaches the whole chain \u2014 and the product is the key evidence to preserve.',
    psychology: 'A defective product hurt me in San Diego and I do not know who I can hold responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego defective product lawyer',
      'e-bike battery fire lawsuit california',
      'lithium battery explosion injury california',
      'amazon defective product liability california',
      'product recall injury claim california',
    ],
    signals: [
      'Strict product liability',
      'Whole chain of distribution',
      'Online-marketplace liability (Bolger)',
      'Lithium-battery fire pattern',
      'Preserve the product as evidence',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s large consumer base and heavy coastal e-mobility use put many devices \u2014 and many lithium-ion batteries \u2014 into everyday circulation, and a defective-product claim there follows the strict-liability framework rather than a negligence one. ${STRICT} ${CHAIN} ${BATTERY} ${PRESERVE} ${SOL} Civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The exact product, model, and where it was bought',
        'The device, charger, and any remains after a fire',
        'Packaging, manuals, and receipts',
        'Whether the item was subject to a recall',
        'Any fire-department origin-and-cause report',
        'Every seller in the chain, including online',
        'The injuries and property damage',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps a San Diego victim preserve the device and charger, identify every seller in the chain including online marketplaces, and gather the recall and fire-report evidence. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need to prove the manufacturer was negligent?',
        a: 'No. Under California\u2019s strict product liability, a design, manufacturing, or failure-to-warn defect can create liability based on the product\u2019s condition and the harm it caused, without proving negligence.',
      },
      {
        q: 'Who can I hold responsible?',
        a: 'Potentially everyone in the chain of distribution \u2014 the manufacturer, distributor, and retailer \u2014 and an online marketplace when it is integral to delivering the product (Bolger v. Amazon.com, LLC).',
      },
      {
        q: 'What evidence is most important?',
        a: 'The product itself \u2014 the device, charger, and any remains \u2014 plus packaging, receipts, any recall notice, and any fire-department origin-and-cause report. It should be preserved before anything is discarded.',
      },
      {
        q: 'How long do I have to file?',
        a: 'Generally two years from the injury (Code of Civil Procedure section 335.1), though the discovery rule can matter for a latent defect. Preserving the product early is just as important as the deadline.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the product evidence, the sellers, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_PRODUCT_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Defective Product & Battery Fire Claims',
    title: 'Oakland Defective Product & Battery Fire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Injured by a battery fire or defective product in Oakland? Strict liability reaches the whole chain \u2014 and in older housing a fire can spread fast.',
    psychology: 'A battery fire spread through my older Oakland building and I lost everything.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland defective product lawyer',
      'e-bike battery fire lawsuit california',
      'lithium battery explosion injury california',
      'apartment battery fire liability california',
      'amazon defective product liability california',
    ],
    signals: [
      'Strict product liability',
      'Whole chain of distribution',
      'Online-marketplace liability (Bolger)',
      'Lithium-battery fire pattern',
      'Preserve the product as evidence',
      'Two-year deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s aging multi-unit housing means a lithium-battery fire can spread quickly and injure more than the device owner, adding property and displacement losses to the injury claim. ${STRICT} ${CHAIN} ${BATTERY} ${PRESERVE} ${SOL} Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'The exact product, model, and where it was bought',
        'The device, charger, and any remains after a fire',
        'Packaging, manuals, and receipts',
        'Whether the item was subject to a recall',
        'Any fire-department origin-and-cause report',
        'Every seller in the chain, including online',
        'Injuries, property loss, and displacement',
        'The date of injury, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ helps an Oakland victim preserve the device and charger after a fire, coordinate with the fire-department origin-and-cause findings, and identify every seller in the chain including online marketplaces. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A neighbor\u2019s battery fire injured me. Can I still have a product claim?',
        a: 'Possibly. A defective product\u2019s strict-liability claim is not limited to the buyer \u2014 someone harmed by the defect can pursue it. The device, charger, and fire-origin evidence still need to be preserved and analyzed.',
      },
      {
        q: 'Do I have to prove negligence?',
        a: 'No. California\u2019s strict product liability allows recovery for a design, manufacturing, or failure-to-warn defect based on the product\u2019s condition and the harm it caused.',
      },
      {
        q: 'Who can be responsible?',
        a: 'Potentially the manufacturer, distributor, and retailer in the chain of distribution, and an online marketplace when it is integral to delivering the product (Bolger v. Amazon.com, LLC).',
      },
      {
        q: 'What should I preserve?',
        a: 'The device, charger, and remains, packaging and receipts, any recall notice, and the fire-department origin-and-cause report. The product is the central evidence and should not be discarded.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the product evidence, the sellers, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const consumerProductCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_PRODUCT_SLUG]: {
    scenario: `An LA renter\u2019s e-bike battery ignited overnight. Preserving the charred pack and charger, plus the fire-department origin report, anchored a strict-liability claim against the maker and the online seller. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the device, charger, and remains.'],
      ['Records', 'Gather receipts, packaging, and any recall.'],
      ['Fire report', 'Obtain the origin-and-cause findings.'],
      ['Longer term', 'Chain-of-distribution defendants identified.'],
    ],
    severityLadder: [
      ['Defect type', 'Design, manufacturing, or warning.'],
      ['Strict liability', 'No negligence proof required.'],
      ['Chain', 'Maker, seller, and marketplace can be liable.'],
      ['Evidence', 'The product itself proves the case.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Burn injuries are often severe.' },
      { label: 'Burn / specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and property losses are recorded.' },
    ],
    settlementDrivers: [
      'Whether a defect is identified in the product',
      'Whether the product and charger were preserved',
      'Which sellers are in the chain of distribution',
      'Whether a recall or fire report supports the claim',
      'The severity of injuries and property loss',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Preserve the product', copy: 'It is the central evidence.' },
      { label: 'Whole chain', copy: 'Maker, retailer, and marketplace.' },
      { label: 'No negligence needed', copy: 'Strict liability applies.' },
      { label: 'Recall helps', copy: 'It supports but does not prove the case.' },
    ],
    insuranceProblems: [
      'The burned device is thrown away before inspection.',
      'Only the retailer is named, not the whole chain.',
      'The online seller\u2019s role is never identified.',
      'The fire report is not obtained.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What product caused the injury?' },
      { label: 'Step 2', question: 'Do you still have the device and charger?' },
      { label: 'Step 3', question: 'Where and how was it purchased?' },
      { label: 'Step 4', question: 'Was there a fire report or recall?' },
    ],
  },
  [SF_PRODUCT_SLUG]: {
    scenario: `A San Francisco early-adopter\u2019s gadget battery exploded while charging. Keeping the device and the uncertified charger revealed a missing protection circuit, supporting a design-defect claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the device, charger, and remains.'],
      ['Records', 'Gather receipts, packaging, and any recall.'],
      ['Analysis', 'Have the product examined for a defect.'],
      ['Longer term', 'Chain-of-distribution defendants identified.'],
    ],
    severityLadder: [
      ['Defect type', 'Design, manufacturing, or warning.'],
      ['Strict liability', 'No negligence proof required.'],
      ['Chain', 'Maker, seller, and marketplace can be liable.'],
      ['Evidence', 'The product itself proves the case.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Burn and blast injuries are severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and property losses are recorded.' },
    ],
    settlementDrivers: [
      'Whether a defect is identified in the product',
      'Whether the device and charger were preserved',
      'Which sellers are in the chain of distribution',
      'Whether a recall supports the claim',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Charger matters', copy: 'An uncertified charger can be the defect.' },
      { label: 'Preserve the product', copy: 'It is the central evidence.' },
      { label: 'Whole chain', copy: 'Maker, retailer, and marketplace.' },
      { label: 'No negligence needed', copy: 'Strict liability applies.' },
    ],
    insuranceProblems: [
      'The device is returned to the seller and lost.',
      'The charger is discarded as unimportant.',
      'The online seller\u2019s role is never identified.',
      'The claim is filed as negligence, not strict liability.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What product and charger were involved?' },
      { label: 'Step 2', question: 'Do you still have both?' },
      { label: 'Step 3', question: 'Where and how was it purchased?' },
      { label: 'Step 4', question: 'Was there a recall for the item?' },
    ],
  },
  [SD_PRODUCT_SLUG]: {
    scenario: `A San Diego family was hurt when a recalled product failed. The recall notice plus the preserved product supported a claim against the manufacturer and the retailer that sold it. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the product and any remains.'],
      ['Records', 'Gather receipts, packaging, and the recall.'],
      ['Analysis', 'Have the product examined for a defect.'],
      ['Longer term', 'Chain-of-distribution defendants identified.'],
    ],
    severityLadder: [
      ['Defect type', 'Design, manufacturing, or warning.'],
      ['Strict liability', 'No negligence proof required.'],
      ['Chain', 'Maker, seller, and marketplace can be liable.'],
      ['Recall', 'It supports but does not prove the case.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Product injuries can be severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Bills and property losses are recorded.' },
    ],
    settlementDrivers: [
      'Whether a defect is identified in the product',
      'Whether the product was preserved',
      'Which sellers are in the chain of distribution',
      'Whether a recall supports the claim',
      'The severity of the injuries',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Recall helps', copy: 'It supports the defect theory.' },
      { label: 'Preserve the product', copy: 'It is the central evidence.' },
      { label: 'Whole chain', copy: 'Maker and retailer both liable.' },
      { label: 'No negligence needed', copy: 'Strict liability applies.' },
    ],
    insuranceProblems: [
      'The product is discarded after the recall.',
      'Only the manufacturer is named, not the retailer.',
      'The online seller\u2019s role is never identified.',
      'The deadline passes while the cause is investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What product caused the injury?' },
      { label: 'Step 2', question: 'Was it subject to a recall?' },
      { label: 'Step 3', question: 'Do you still have the product?' },
      { label: 'Step 4', question: 'Where and how was it purchased?' },
    ],
  },
  [OAK_PRODUCT_SLUG]: {
    scenario: `An Oakland battery fire spread from one unit through an older building, injuring neighbors. The fire-origin report and the preserved device supported claims for the injured neighbors, not just the device owner. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Preserve the device and coordinate with investigators.'],
      ['Records', 'Gather receipts, packaging, and any recall.'],
      ['Fire report', 'Obtain the origin-and-cause findings.'],
      ['Longer term', 'Chain-of-distribution defendants identified.'],
    ],
    severityLadder: [
      ['Defect type', 'Design, manufacturing, or warning.'],
      ['Strict liability', 'No negligence proof required.'],
      ['Chain', 'Maker, seller, and marketplace can be liable.'],
      ['Bystanders', 'Injured neighbors can also claim.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Burn and smoke injuries are severe.' },
      { label: 'Specialist care', copy: 'Ongoing treatment is documented.' },
      { label: 'Rehabilitation', copy: 'Recovery is tracked over time.' },
      { label: 'Documentation', copy: 'Injury, property, and displacement losses.' },
    ],
    settlementDrivers: [
      'Whether a defect is identified in the product',
      'Whether the device and fire report were preserved',
      'Which sellers are in the chain of distribution',
      'Whether bystanders were harmed',
      'The severity of injuries and property loss',
      'Whether the deadline is met',
    ],
    settlementValueDetails: [
      { label: 'Bystanders count', copy: 'Neighbors harmed can claim too.' },
      { label: 'Fire report matters', copy: 'It ties the fire to the device.' },
      { label: 'Whole chain', copy: 'Maker, retailer, and marketplace.' },
      { label: 'Displacement adds up', copy: 'Property and housing losses count.' },
    ],
    insuranceProblems: [
      'The device is destroyed or lost after the fire.',
      'Neighbors are told they have no claim.',
      'The fire report is not obtained.',
      'The online seller\u2019s role is never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What device started the fire?' },
      { label: 'Step 2', question: 'Were you the owner or a neighbor?' },
      { label: 'Step 3', question: 'Is there a fire-department report?' },
      { label: 'Step 4', question: 'What were the injuries and losses?' },
    ],
  },
}
