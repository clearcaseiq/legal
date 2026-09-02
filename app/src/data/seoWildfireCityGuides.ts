import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, wildfire and utility-caused fire practice area: location-specific
 * guides for Los Angeles, Santa Rosa (wine country), Chico / Paradise (Butte
 * County), and San Diego.
 *
 * Wildfire claims are a distinctively California, high-stakes practice area:
 * where a utility's equipment ignites a fire, California law provides powerful
 * theories against the utility, and the claims combine property loss, personal
 * injury, and wrongful death with their own processes and deadlines.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: recent catastrophic wind-driven fires across the region's
 *    wildland-urban interface, with utility ignition a recurring question.
 *  - Santa Rosa and wine country: repeated destructive fires across Sonoma and
 *    Napa, several tied to utility equipment.
 *  - Chico and Paradise (Butte County): the site of California's deadliest and
 *    most destructive wildfire, tied to utility transmission equipment.
 *  - San Diego: a long history of major backcountry fires, some tied to utility
 *    lines, across its fire-prone eastern communities.
 *
 * Applied accurately:
 *  - Under California's inverse-condemnation doctrine, a utility whose equipment
 *    substantially causes a fire can be liable for the resulting property damage
 *    without proof of negligence; negligence, public nuisance, and (for injuries
 *    and deaths) other tort theories also apply.
 *  - A wildfire claim can combine real and personal property loss, business and
 *    income loss, evacuation and additional-living expenses, personal injury
 *    (including burns and smoke inhalation), emotional distress, and wrongful
 *    death.
 *  - Large fires are frequently resolved through dedicated claims processes or
 *    settlement funds, and separately through the victim's own insurance, with
 *    the two coordinated so a victim is not left short.
 *  - Deadlines differ by claim: personal injury generally two years (Code of
 *    Civil Procedure section 335.1), property damage generally three years (Code
 *    of Civil Procedure section 338), a six-month Government Claims Act deadline
 *    where a public entity is involved, and any claims-process deadlines.
 *  - Pure comparative negligence applies.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a utility or another party is responsible, which claims and processes apply, and which deadline controls depend on facts a licensed California attorney should review promptly.'

const INVERSE =
  'Under California\u2019s inverse-condemnation doctrine, a utility whose equipment substantially causes a fire can be liable for the resulting property damage without proof of negligence \u2014 a powerful theory unique to this area. Alongside it, negligence and public nuisance, and for injuries and deaths other tort theories, can apply. Establishing that utility equipment ignited the fire is therefore the central question.'

const SCOPE =
  'A wildfire claim is rarely just one loss: it can combine the destruction of a home and its contents, business and income loss, evacuation and additional-living expenses, personal injury from burns or smoke inhalation, severe emotional distress, and wrongful death. Capturing the full scope \u2014 not just the structure \u2014 is what makes a claim whole, and much of it is easy to under-document in the chaos after a fire.'

const PROCESS =
  'Large fires are frequently resolved through dedicated claims processes or settlement funds set up for the disaster, and separately through the victim\u2019s own property insurance. These run on parallel tracks with different rules, and coordinating them \u2014 so a recovery from one does not undercut the other and no deadline is missed \u2014 is a large part of a wildfire case.'

const DEADLINES =
  'Wildfire deadlines differ by the kind of claim: personal injury generally carries a two-year deadline (Code of Civil Procedure section 335.1), property damage generally three years (Code of Civil Procedure section 338), a public entity brings a six-month Government Claims Act deadline, and a dedicated claims process or settlement fund can impose its own bar date. Because these run at once and some are short, an early, organised approach is essential.'

export const LA_FIRE_SLUG = '/los-angeles-wildfire-claim'
export const SANTAROSA_FIRE_SLUG = '/santa-rosa-wildfire-claim'
export const CHICO_FIRE_SLUG = '/chico-paradise-wildfire-claim'
export const SD_FIRE_SLUG = '/san-diego-wildfire-claim'

export const wildfireCityGuidePages: LandingPage[] = [
  {
    slug: LA_FIRE_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Wildfire Claims',
    title: 'Los Angeles Wildfire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a home or were injured in a Los Angeles-area wildfire? Where utility equipment ignited the fire, California law provides powerful claims \u2014 combining property, injury, and wrongful-death losses.',
    psychology: 'A wildfire destroyed our home or hurt my family in the LA area and I do not know what claims we have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles wildfire lawyer',
      'utility caused wildfire claim california',
      'inverse condemnation wildfire california',
      'wildfire property loss and injury claim california',
      'wildfire settlement fund claim california',
    ],
    signals: [
      'Inverse condemnation (utility)',
      'Wildland-urban interface fires',
      'Property + injury + death losses',
      'Claims process vs. own insurance',
      'Two / three-year & 6-month deadlines',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `The Los Angeles region\u2019s recent catastrophic, wind-driven fires have swept through its wildland-urban interface, and utility ignition is a recurring question in these events. ${INVERSE} ${SCOPE} ${PROCESS} ${DEADLINES} Pure comparative negligence applies. Civil cases are filed in Los Angeles County Superior Court, though a dedicated claims process may proceed separately.`,
      whatToTrack: [
        'Whether utility equipment is suspected of igniting the fire',
        'The full scope of loss \u2014 home, contents, business, income',
        'Evacuation and additional-living expenses',
        'Any personal injury \u2014 burns, smoke inhalation \u2014 or death',
        'Your own property insurance policy and its coverage',
        'Any dedicated claims process or settlement fund and its deadline',
        'Photographs and an inventory of what was lost',
        'Medical treatment for any injuries from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ organises an LA wildfire claim around the inverse-condemnation theory against a utility, captures the full scope of loss beyond the structure, and coordinates the dedicated claims process with the victim\u2019s own insurance so no deadline is missed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A utility\u2019s equipment may have started the fire. What claims do I have?',
        a: 'Under California\u2019s inverse-condemnation doctrine, a utility whose equipment substantially causes a fire can be liable for the resulting property damage without proof of negligence, alongside negligence and public nuisance, and other theories for injuries and deaths. Establishing that utility equipment ignited the fire is the central question.',
      },
      {
        q: 'What losses can a wildfire claim cover?',
        a: 'A wildfire claim can combine the destruction of a home and contents, business and income loss, evacuation and additional-living expenses, personal injury from burns or smoke inhalation, emotional distress, and wrongful death. Capturing the full scope, not just the structure, is what makes a claim whole.',
      },
      {
        q: 'There is a settlement fund and I also have insurance. How do those work together?',
        a: 'They run on parallel tracks with different rules. A dedicated claims process or settlement fund and your own property insurance must be coordinated so a recovery from one does not undercut the other and no deadline is missed. That coordination is a large part of a wildfire case.',
      },
      {
        q: 'How long do I have to file?',
        a: 'It differs by claim: personal injury generally two years (Code of Civil Procedure section 335.1), property damage generally three years (Code of Civil Procedure section 338), six months where a public entity is involved, and any bar date set by a claims process. Because these run at once and some are short, an early approach is essential.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the facts, the claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SANTAROSA_FIRE_SLUG,
    category: 'Cities',
    cluster: 'Santa Rosa & Wine Country Wildfire Claims',
    title: 'Santa Rosa & Wine Country Wildfire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a home, vineyard, or business in a Sonoma or Napa wildfire? Where utility equipment ignited the fire, California law provides powerful claims \u2014 including for business and income loss.',
    psychology: 'A wildfire destroyed our home or business in wine country and I do not know what claims we have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'santa rosa wildfire lawyer',
      'sonoma napa wildfire claim california',
      'utility caused wildfire claim california',
      'vineyard business loss wildfire california',
      'inverse condemnation wildfire california',
    ],
    signals: [
      'Inverse condemnation (utility)',
      'Vineyard & business loss',
      'Repeated wine-country fires',
      'Claims process vs. own insurance',
      'Two / three-year & 6-month deadlines',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Sonoma and Napa have endured repeated destructive fires, several tied to utility equipment, which makes wine country a center of California wildfire litigation \u2014 and gives its claims a distinctive business dimension, from vineyards and wineries to tourism-dependent enterprises. ${INVERSE} ${SCOPE} Wine-country claims often carry substantial business and income loss alongside home loss, which needs careful documentation. ${PROCESS} ${DEADLINES} Pure comparative negligence applies. Civil cases are filed in Sonoma or Napa County Superior Court, though a dedicated claims process may proceed separately.`,
      whatToTrack: [
        'Whether utility equipment is suspected of igniting the fire',
        'The full scope of loss \u2014 home, contents, vineyard, business, income',
        'Business interruption and lost harvest or inventory',
        'Evacuation and additional-living expenses',
        'Any personal injury or death',
        'Your own property and business insurance and its coverage',
        'Any dedicated claims process or settlement fund and its deadline',
        'Photographs and an inventory of what was lost',
      ],
      howClearCaseHelps: `ClearCaseIQ organises a wine-country wildfire claim around the inverse-condemnation theory against a utility, documents the business and income loss that is often the largest component here, and coordinates the claims process with the victim\u2019s own insurance. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A utility\u2019s equipment may have started the fire. What claims do I have?',
        a: 'Under California\u2019s inverse-condemnation doctrine, a utility whose equipment substantially causes a fire can be liable for the resulting property damage without proof of negligence, alongside negligence and public nuisance. This theory has been central to wine-country fire litigation.',
      },
      {
        q: 'My vineyard or business was destroyed. Can I recover those losses?',
        a: 'Yes. A wildfire claim can include business interruption, lost harvest or inventory, and income loss alongside the loss of a home and contents. In wine country these business losses are often the largest component, so they need careful documentation.',
      },
      {
        q: 'There is a settlement fund and I also have insurance. How do those work together?',
        a: 'They run on parallel tracks with different rules and must be coordinated so a recovery from one does not undercut the other and no deadline is missed. That coordination is a large part of a wildfire case.',
      },
      {
        q: 'How long do I have to file?',
        a: 'It differs by claim: personal injury generally two years (Code of Civil Procedure section 335.1), property damage generally three years (Code of Civil Procedure section 338), six months where a public entity is involved, and any bar date set by a claims process. Some are short, so act early.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: CHICO_FIRE_SLUG,
    category: 'Cities',
    cluster: 'Chico & Paradise Wildfire Claims',
    title: 'Chico & Paradise Wildfire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Affected by a Butte County wildfire around Paradise or Chico? Where utility equipment ignited the fire, California law provides powerful claims \u2014 combining property, injury, and wrongful-death losses.',
    psychology: 'A wildfire destroyed our home or hurt my family in the Paradise area and I do not know what claims we have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'paradise wildfire lawyer',
      'butte county wildfire claim california',
      'utility caused wildfire claim california',
      'wildfire settlement fund claim california',
      'inverse condemnation wildfire california',
    ],
    signals: [
      'Inverse condemnation (utility)',
      'Transmission-equipment ignition',
      'Property + injury + death losses',
      'Claims process / settlement fund',
      'Two / three-year & 6-month deadlines',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Butte County \u2014 Paradise and the surrounding communities near Chico \u2014 was the site of California\u2019s deadliest and most destructive wildfire, tied to utility transmission equipment, which shaped the modern law of utility wildfire liability and the large settlement processes that followed. ${INVERSE} ${SCOPE} ${PROCESS} Many Butte County victims recover through a dedicated settlement process as well as their own insurance, and coordinating the two is essential. ${DEADLINES} Pure comparative negligence applies. Civil cases are filed in Butte County Superior Court, though a dedicated claims process may proceed separately.`,
      whatToTrack: [
        'Whether utility transmission equipment ignited the fire',
        'The full scope of loss \u2014 home, contents, business, income',
        'Evacuation and additional-living expenses',
        'Any personal injury \u2014 burns, smoke inhalation \u2014 or death',
        'Your own property insurance policy and its coverage',
        'Any dedicated settlement process and its bar date',
        'Photographs and an inventory of what was lost',
        'Medical treatment for any injuries from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ organises a Butte County wildfire claim around the utility inverse-condemnation theory that Paradise litigation established, captures the full scope of loss, and coordinates any dedicated settlement process with the victim\u2019s own insurance so no bar date is missed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The fire was tied to utility equipment. What claims do I have?',
        a: 'Under California\u2019s inverse-condemnation doctrine, a utility whose equipment substantially causes a fire can be liable for the resulting property damage without proof of negligence, alongside negligence and public nuisance, and other theories for injuries and deaths. This doctrine was central to the Paradise-area litigation.',
      },
      {
        q: 'There is a settlement process and I also have insurance. How do those work together?',
        a: 'They run on parallel tracks with different rules. Many Butte County victims recover through a dedicated settlement process as well as their own property insurance, and coordinating them so a recovery from one does not undercut the other and no bar date is missed is essential.',
      },
      {
        q: 'What losses can a wildfire claim cover?',
        a: 'It can combine the destruction of a home and contents, business and income loss, evacuation and additional-living expenses, personal injury from burns or smoke inhalation, emotional distress, and wrongful death. Capturing the full scope, not just the structure, is what makes a claim whole.',
      },
      {
        q: 'How long do I have to file?',
        a: 'It differs by claim: personal injury generally two years (Code of Civil Procedure section 335.1), property damage generally three years (Code of Civil Procedure section 338), six months where a public entity is involved, and any bar date set by a settlement process. Some are short, so act early.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_FIRE_SLUG,
    category: 'Cities',
    cluster: 'San Diego Wildfire Claims',
    title: 'San Diego Wildfire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a home or were injured in a San Diego County backcountry wildfire? Where utility lines ignited the fire, California law provides powerful claims \u2014 combining property, injury, and wrongful-death losses.',
    psychology: 'A wildfire destroyed our home or hurt my family in San Diego County and I do not know what claims we have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego wildfire lawyer',
      'backcountry wildfire claim california',
      'utility caused wildfire claim california',
      'inverse condemnation wildfire california',
      'wildfire property loss and injury claim california',
    ],
    signals: [
      'Inverse condemnation (utility)',
      'Backcountry / east-county fires',
      'Property + injury + death losses',
      'Claims process vs. own insurance',
      'Two / three-year & 6-month deadlines',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `San Diego County has a long history of major backcountry fires across its fire-prone eastern communities, some tied to utility lines, which keeps utility ignition and the resulting claims a recurring reality here. ${INVERSE} ${SCOPE} ${PROCESS} ${DEADLINES} Pure comparative negligence applies. Civil cases are filed in San Diego County Superior Court, though a dedicated claims process may proceed separately.`,
      whatToTrack: [
        'Whether utility lines are suspected of igniting the fire',
        'The full scope of loss \u2014 home, contents, business, income',
        'Evacuation and additional-living expenses',
        'Any personal injury \u2014 burns, smoke inhalation \u2014 or death',
        'Your own property insurance policy and its coverage',
        'Any dedicated claims process or settlement fund and its deadline',
        'Photographs and an inventory of what was lost',
        'Medical treatment for any injuries from first response onward',
      ],
      howClearCaseHelps: `ClearCaseIQ organises a San Diego County wildfire claim around the inverse-condemnation theory against a utility, captures the full scope of loss beyond the structure, and coordinates any dedicated claims process with the victim\u2019s own insurance so no deadline is missed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A utility\u2019s lines may have started the fire. What claims do I have?',
        a: 'Under California\u2019s inverse-condemnation doctrine, a utility whose equipment substantially causes a fire can be liable for the resulting property damage without proof of negligence, alongside negligence and public nuisance, and other theories for injuries and deaths. Establishing that utility lines ignited the fire is the central question.',
      },
      {
        q: 'What losses can a wildfire claim cover?',
        a: 'A wildfire claim can combine the destruction of a home and contents, business and income loss, evacuation and additional-living expenses, personal injury from burns or smoke inhalation, emotional distress, and wrongful death. Capturing the full scope, not just the structure, is what makes a claim whole.',
      },
      {
        q: 'There is a settlement fund and I also have insurance. How do those work together?',
        a: 'They run on parallel tracks with different rules and must be coordinated so a recovery from one does not undercut the other and no deadline is missed. That coordination is a large part of a wildfire case.',
      },
      {
        q: 'How long do I have to file?',
        a: 'It differs by claim: personal injury generally two years (Code of Civil Procedure section 335.1), property damage generally three years (Code of Civil Procedure section 338), six months where a public entity is involved, and any bar date set by a claims process. Some are short, so act early.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the facts, the claims, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const wildfireCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_FIRE_SLUG]: {
    scenario: `An LA-area family lost their home and a parent suffered smoke-inhalation injuries in a wind-driven fire linked to utility equipment. The inverse-condemnation theory, the full scope of loss, and the parallel insurance claim were coordinated. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Document the loss; preserve the insurance policy; note utility involvement.'],
      ['First weeks', 'Inverse-condemnation theory and the full loss scope developed.'],
      ['Ongoing', 'The claims process and own insurance coordinated.'],
      ['Longer term', 'Injuries treated and documented; deadlines tracked.'],
    ],
    severityLadder: [
      ['Property loss', 'Home, contents, and additional-living expenses.'],
      ['Business/income', 'Lost income and business interruption.'],
      ['Injury', 'Burns and smoke inhalation.'],
      ['Death', 'A wrongful-death claim on top of the losses.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie injuries to the fire.' },
      { label: 'Imaging/pulmonary', copy: 'Smoke-inhalation findings support severity.' },
      { label: 'Continuing care', copy: 'Follow-up shows lasting harm.' },
      { label: 'Documentation', copy: 'Losses, bills, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether utility equipment ignited the fire',
      'The full scope of property, business, and income loss',
      'The severity of any injuries or a death',
      'How the claims process and own insurance are coordinated',
      'Whether every deadline is tracked',
      'The quality of the loss inventory and documentation',
    ],
    settlementValueDetails: [
      { label: 'Inverse condemnation', copy: 'Utility property liability without proving negligence.' },
      { label: 'Full scope matters', copy: 'Not just the structure but all losses.' },
      { label: 'Coordinate recoveries', copy: 'Fund and insurance must work together.' },
      { label: 'Deadlines vary', copy: 'Injury, property, and claims dates differ.' },
    ],
    insuranceProblems: [
      'Only the structure is claimed, missing contents and income.',
      'The utility-ignition theory is never developed.',
      'A claims-process bar date is missed.',
      'The insurance and settlement recoveries are not coordinated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is utility equipment suspected of igniting the fire?' },
      { label: 'Step 2', question: 'What did you lose \u2014 home, contents, business, income?' },
      { label: 'Step 3', question: 'Were there injuries or a death?' },
      { label: 'Step 4', question: 'Is there a claims process, and what does your policy cover?' },
    ],
  },
  [SANTAROSA_FIRE_SLUG]: {
    scenario: `A wine-country family lost a home and a vineyard business to a fire tied to utility equipment. The business-interruption and lost-harvest losses, often the largest component, were documented alongside the inverse-condemnation claim. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Document the loss; preserve property and business insurance.'],
      ['First weeks', 'Inverse-condemnation theory and business loss developed.'],
      ['Ongoing', 'The claims process and own insurance coordinated.'],
      ['Longer term', 'The full loss quantified; deadlines tracked.'],
    ],
    severityLadder: [
      ['Property loss', 'Home, contents, and additional-living expenses.'],
      ['Vineyard/business', 'Lost harvest, inventory, and interruption.'],
      ['Income loss', 'Ongoing lost revenue.'],
      ['Injury/death', 'Personal injury or death on top of the losses.'],
    ],
    treatmentProgression: [
      { label: 'Assessment', copy: 'The full scope of loss is inventoried.' },
      { label: 'Business records', copy: 'Harvest and revenue data quantify loss.' },
      { label: 'Continuing loss', copy: 'Interruption shows lasting harm.' },
      { label: 'Documentation', copy: 'Losses, bills, and future loss define economics.' },
    ],
    settlementDrivers: [
      'Whether utility equipment ignited the fire',
      'The scope of vineyard, business, and income loss',
      'The property and contents loss',
      'How the claims process and own insurance are coordinated',
      'Whether every deadline is tracked',
      'The quality of the business documentation',
    ],
    settlementValueDetails: [
      { label: 'Inverse condemnation', copy: 'Utility property liability without proving negligence.' },
      { label: 'Business loss is large', copy: 'Harvest and interruption often dominate.' },
      { label: 'Coordinate recoveries', copy: 'Fund and insurance must work together.' },
      { label: 'Deadlines vary', copy: 'Injury, property, and claims dates differ.' },
    ],
    insuranceProblems: [
      'The business and harvest loss is under-documented.',
      'The utility-ignition theory is never developed.',
      'A claims-process bar date is missed.',
      'The insurance and settlement recoveries are not coordinated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is utility equipment suspected of igniting the fire?' },
      { label: 'Step 2', question: 'What business or vineyard loss did you suffer?' },
      { label: 'Step 3', question: 'What did you lose at home \u2014 structure and contents?' },
      { label: 'Step 4', question: 'Is there a claims process, and what does your policy cover?' },
    ],
  },
  [CHICO_FIRE_SLUG]: {
    scenario: `A Paradise-area family recovered through both a dedicated settlement process and their own insurance after a fire tied to utility transmission equipment. Coordinating the two and meeting the bar date preserved the full recovery. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Document the loss; preserve the insurance policy.'],
      ['First weeks', 'Utility-ignition theory and the full loss developed.'],
      ['Ongoing', 'The settlement process and own insurance coordinated.'],
      ['Bar date', 'The dedicated process claim filed in time.'],
    ],
    severityLadder: [
      ['Property loss', 'Home, contents, and additional-living expenses.'],
      ['Injury', 'Burns and smoke inhalation.'],
      ['Death', 'A wrongful-death claim on top of the losses.'],
      ['Process', 'A dedicated settlement fund and its bar date.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie injuries to the fire.' },
      { label: 'Imaging/pulmonary', copy: 'Smoke-inhalation findings support severity.' },
      { label: 'Continuing care', copy: 'Follow-up shows lasting harm.' },
      { label: 'Documentation', copy: 'Losses, bills, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether utility transmission equipment ignited the fire',
      'The full scope of property and personal loss',
      'How the settlement process and own insurance are coordinated',
      'Whether the process bar date is met',
      'The severity of any injuries or a death',
      'The quality of the loss documentation',
    ],
    settlementValueDetails: [
      { label: 'Inverse condemnation', copy: 'Utility property liability without proving negligence.' },
      { label: 'Two recoveries', copy: 'A settlement process and insurance can both apply.' },
      { label: 'Meet the bar date', copy: 'The process deadline can be strict.' },
      { label: 'Full scope matters', copy: 'All losses, not just the structure.' },
    ],
    insuranceProblems: [
      'The settlement-process bar date is missed.',
      'The insurance and process recoveries are not coordinated.',
      'Only the structure is claimed, missing other losses.',
      'The utility-ignition theory is not developed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the fire tied to utility equipment?' },
      { label: 'Step 2', question: 'Is there a dedicated settlement process, and its bar date?' },
      { label: 'Step 3', question: 'What did you lose, and were there injuries or a death?' },
      { label: 'Step 4', question: 'What does your own insurance cover?' },
    ],
  },
  [SD_FIRE_SLUG]: {
    scenario: `A San Diego backcountry family lost their home in a fire tied to utility lines. The inverse-condemnation theory, the full scope of loss, and the parallel insurance claim were developed and coordinated. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Document the loss; preserve the insurance policy; note utility lines.'],
      ['First weeks', 'Inverse-condemnation theory and the full loss developed.'],
      ['Ongoing', 'The claims process and own insurance coordinated.'],
      ['Longer term', 'Injuries treated and documented; deadlines tracked.'],
    ],
    severityLadder: [
      ['Property loss', 'Home, contents, and additional-living expenses.'],
      ['Business/income', 'Lost income and business interruption.'],
      ['Injury', 'Burns and smoke inhalation.'],
      ['Death', 'A wrongful-death claim on top of the losses.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Records tie injuries to the fire.' },
      { label: 'Imaging/pulmonary', copy: 'Smoke-inhalation findings support severity.' },
      { label: 'Continuing care', copy: 'Follow-up shows lasting harm.' },
      { label: 'Documentation', copy: 'Losses, bills, and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether utility lines ignited the fire',
      'The full scope of property, business, and income loss',
      'The severity of any injuries or a death',
      'How the claims process and own insurance are coordinated',
      'Whether every deadline is tracked',
      'The quality of the loss inventory and documentation',
    ],
    settlementValueDetails: [
      { label: 'Inverse condemnation', copy: 'Utility property liability without proving negligence.' },
      { label: 'Full scope matters', copy: 'Not just the structure but all losses.' },
      { label: 'Coordinate recoveries', copy: 'Fund and insurance must work together.' },
      { label: 'Deadlines vary', copy: 'Injury, property, and claims dates differ.' },
    ],
    insuranceProblems: [
      'Only the structure is claimed, missing contents and income.',
      'The utility-ignition theory is never developed.',
      'A claims-process bar date is missed.',
      'The insurance and settlement recoveries are not coordinated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Are utility lines suspected of igniting the fire?' },
      { label: 'Step 2', question: 'What did you lose \u2014 home, contents, business, income?' },
      { label: 'Step 3', question: 'Were there injuries or a death?' },
      { label: 'Step 4', question: 'Is there a claims process, and what does your policy cover?' },
    ],
  },
}
