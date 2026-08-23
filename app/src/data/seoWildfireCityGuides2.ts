import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, wildfire practice area (batch 2):
 * location-specific guides for Redding, Napa, San Bernardino, and Ventura,
 * extending the batch-1 hub (Los Angeles, Santa Rosa, Chico/Paradise, San Diego).
 *
 * Applied accurately (identical framework to batch 1):
 *  - Inverse condemnation: a utility whose equipment substantially causes a fire
 *    can be liable for property damage without proof of negligence; negligence,
 *    public nuisance, and injury/death tort theories run alongside.
 *  - Full scope of loss (structure, contents, income, ALE, injury, distress, death).
 *  - Parallel tracks: dedicated claims processes / settlement funds and the
 *    victim\u2019s own property insurance, which must be coordinated.
 *  - Deadlines differ by claim type (PI 2 yr / property 3 yr / public entity 6 mo /
 *    fund bar dates); pure comparative negligence applies.
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

export const REDDING_FIRE_SLUG = '/redding-wildfire-claim'
export const NAPA_FIRE_SLUG = '/napa-wildfire-claim'
export const SB_FIRE_SLUG = '/san-bernardino-wildfire-claim'
export const VENTURA_FIRE_SLUG = '/ventura-wildfire-claim'

export const wildfireCityGuidePages2: LandingPage[] = [
  {
    slug: REDDING_FIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Redding Wildfire Claims',
    title: 'Redding Wildfire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a home or were injured in a Redding-area wildfire? A utility can be liable without proof of negligence \u2014 and multiple deadlines run at once.',
    psychology: 'A wildfire destroyed our Redding-area home and I do not know how to recover the full loss.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'redding wildfire lawyer',
      'carr fire claim california',
      'utility inverse condemnation wildfire california',
      'wildfire settlement fund vs insurance california',
      'wildfire property damage deadline california',
    ],
    signals: [
      'Inverse condemnation (no fault)',
      'Full scope of loss',
      'Parallel claims tracks',
      'Multiple deadlines',
      'Injury / wrongful death',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Shasta County around Redding has suffered catastrophic wildfires, including the 2018 Carr Fire, destroying homes and taking lives. ${INVERSE} ${SCOPE} ${PROCESS} ${DEADLINES} ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether utility equipment may have ignited the fire',
        'The full scope of loss \u2014 structure, contents, income, ALE',
        'Any personal injury, smoke inhalation, or death',
        'Your own property-insurance policy and claim',
        'Any dedicated claims process or settlement fund',
        'The bar dates for each track',
        'Photographs and inventories of what was lost',
        'Medical treatment for any injuries',
      ],
      howClearCaseHelps: `ClearCaseIQ documents the full scope of loss, evaluates an inverse-condemnation theory against a utility, and coordinates the settlement-fund and property-insurance tracks so no deadline is missed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I have to prove the utility was negligent?',
        a: 'For property damage, not necessarily. Under inverse condemnation, a utility whose equipment substantially causes a fire can be liable without proof of negligence. Negligence and other theories can run alongside.',
      },
      {
        q: 'I already have fire insurance. Why pursue a claim?',
        a: 'Insurance and a claim against a responsible utility (or a settlement fund) run on parallel tracks with different rules. Coordinating them can capture losses insurance alone does not, if done so one does not undercut the other.',
      },
      {
        q: 'What can a wildfire claim include?',
        a: 'The home and contents, business and income loss, evacuation and additional-living expenses, personal injury, severe emotional distress, and wrongful death \u2014 not just the structure.',
      },
      {
        q: 'How long do I have?',
        a: 'It depends on the claim: personal injury generally two years, property damage generally three, a public entity six months, and a settlement fund its own bar date. Some are short, so act early.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organizes the loss documentation and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: NAPA_FIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Napa Wildfire Claims',
    title: 'Napa Wildfire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a home, vineyard, or business, or were injured in a Napa-area wildfire? A utility can be liable without proof of negligence \u2014 and multiple deadlines run at once.',
    psychology: 'A wildfire damaged our Napa-area home and business and I do not know how to recover the full loss.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'napa wildfire lawyer',
      'wine country fire claim california',
      'utility inverse condemnation wildfire california',
      'wildfire settlement fund vs insurance california',
      'vineyard business loss wildfire california',
    ],
    signals: [
      'Inverse condemnation (no fault)',
      'Full scope of loss',
      'Parallel claims tracks',
      'Multiple deadlines',
      'Injury / wrongful death',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Napa and the surrounding wine country have repeatedly burned \u2014 including the 2017 wine-country fires and the 2020 Glass Fire \u2014 destroying homes, wineries, and vineyards. ${INVERSE} ${SCOPE} ${PROCESS} ${DEADLINES} Vineyard and winery income loss is a significant additional component here. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether utility equipment may have ignited the fire',
        'The full scope of loss \u2014 home, contents, vineyard, winery, income',
        'Any personal injury, smoke inhalation, or death',
        'Your own property-insurance policy and claim',
        'Any dedicated claims process or settlement fund',
        'The bar dates for each track',
        'Photographs and inventories of what was lost',
        'Medical treatment for any injuries',
      ],
      howClearCaseHelps: `ClearCaseIQ documents the full scope of loss including business and vineyard income, evaluates an inverse-condemnation theory against a utility, and coordinates the settlement-fund and property-insurance tracks so no deadline is missed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I have to prove the utility was negligent?',
        a: 'For property damage, not necessarily. Under inverse condemnation, a utility whose equipment substantially causes a fire can be liable without proof of negligence.',
      },
      {
        q: 'Can I recover vineyard and winery business losses?',
        a: 'Yes. A wildfire claim can include business and income loss alongside the home and contents \u2014 an important component in wine country. Capturing the full scope is what makes a claim whole.',
      },
      {
        q: 'I already have insurance. Why pursue a claim?',
        a: 'Insurance and a claim against a responsible utility (or a settlement fund) run on parallel tracks with different rules; coordinating them can capture losses insurance alone does not.',
      },
      {
        q: 'How long do I have?',
        a: 'It depends on the claim: personal injury generally two years, property damage generally three, a public entity six months, and a settlement fund its own bar date.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organizes the loss documentation and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_FIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Wildfire Claims',
    title: 'San Bernardino Wildfire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a home or were injured in a San Bernardino mountain or foothill wildfire? A utility can be liable without proof of negligence \u2014 and multiple deadlines run at once.',
    psychology: 'A wildfire threatened or destroyed our San Bernardino-area home and I do not know how to recover.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino wildfire lawyer',
      'mountain fire claim california',
      'utility inverse condemnation wildfire california',
      'wildfire settlement fund vs insurance california',
      'wildfire property damage deadline california',
    ],
    signals: [
      'Inverse condemnation (no fault)',
      'Full scope of loss',
      'Parallel claims tracks',
      'Multiple deadlines',
      'Injury / wrongful death',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `The San Bernardino Mountains and foothill communities \u2014 including Lake Arrowhead, Big Bear, and the wildland-urban interface \u2014 face recurring, fast-moving wildfires such as the Old and El Dorado fires. ${INVERSE} ${SCOPE} ${PROCESS} ${DEADLINES} Civil cases are filed in San Bernardino County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether utility equipment may have ignited the fire',
        'The full scope of loss \u2014 structure, contents, income, ALE',
        'Any personal injury, smoke inhalation, or death',
        'Your own property-insurance policy and claim',
        'Any dedicated claims process or settlement fund',
        'The bar dates for each track',
        'Photographs and inventories of what was lost',
        'Medical treatment for any injuries',
      ],
      howClearCaseHelps: `ClearCaseIQ documents the full scope of loss, evaluates an inverse-condemnation theory against a utility, and coordinates the settlement-fund and property-insurance tracks so no deadline is missed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I have to prove the utility was negligent?',
        a: 'For property damage, not necessarily. Under inverse condemnation, a utility whose equipment substantially causes a fire can be liable without proof of negligence.',
      },
      {
        q: 'What can a wildfire claim include?',
        a: 'The home and contents, business and income loss, evacuation and additional-living expenses, personal injury, severe emotional distress, and wrongful death \u2014 not just the structure.',
      },
      {
        q: 'I already have insurance. Why pursue a claim?',
        a: 'Insurance and a claim against a responsible utility (or a settlement fund) run on parallel tracks with different rules; coordinating them can capture losses insurance alone does not.',
      },
      {
        q: 'How long do I have?',
        a: 'It depends: personal injury generally two years, property damage generally three, a public entity six months, and a settlement fund its own bar date.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organizes the loss documentation and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: VENTURA_FIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Ventura Wildfire Claims',
    title: 'Ventura Wildfire Claims',
    eyebrow: 'California local injury guide',
    description:
      'Lost a home or were injured in a Ventura County wildfire? A utility can be liable without proof of negligence \u2014 and multiple deadlines run at once.',
    psychology: 'A wildfire destroyed our Ventura-area home and I do not know how to recover the full loss.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'ventura wildfire lawyer',
      'thomas fire claim california',
      'utility inverse condemnation wildfire california',
      'wildfire settlement fund vs insurance california',
      'wildfire property damage deadline california',
    ],
    signals: [
      'Inverse condemnation (no fault)',
      'Full scope of loss',
      'Parallel claims tracks',
      'Multiple deadlines',
      'Injury / wrongful death',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `Ventura County suffered the 2017 Thomas Fire \u2014 at the time one of the largest in state history \u2014 and continues to face wind-driven wildfires and the debris-flow risk that can follow. ${INVERSE} ${SCOPE} ${PROCESS} ${DEADLINES} Civil cases are filed in Ventura County Superior Court. ${NOT_ADVICE}`,
      whatToTrack: [
        'Whether utility equipment may have ignited the fire',
        'The full scope of loss \u2014 structure, contents, income, ALE',
        'Any personal injury, smoke inhalation, or death',
        'Any post-fire debris-flow damage',
        'Your own property-insurance policy and claim',
        'Any dedicated claims process or settlement fund',
        'The bar dates for each track',
        'Photographs and inventories of what was lost',
      ],
      howClearCaseHelps: `ClearCaseIQ documents the full scope of loss including any debris-flow damage, evaluates an inverse-condemnation theory against a utility, and coordinates the settlement-fund and property-insurance tracks so no deadline is missed. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I have to prove the utility was negligent?',
        a: 'For property damage, not necessarily. Under inverse condemnation, a utility whose equipment substantially causes a fire can be liable without proof of negligence.',
      },
      {
        q: 'My home was hit by a debris flow after the fire. Is that covered?',
        a: 'Post-fire debris flows are a recognized consequence of wildfire burn scars and can be part of the loss analysis. The facts should be assessed early, as different theories and deadlines may apply.',
      },
      {
        q: 'I already have insurance. Why pursue a claim?',
        a: 'Insurance and a claim against a responsible utility (or a settlement fund) run on parallel tracks with different rules; coordinating them can capture losses insurance alone does not.',
      },
      {
        q: 'How long do I have?',
        a: 'It depends: personal injury generally two years, property damage generally three, a public entity six months, and a settlement fund its own bar date.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organizes the loss documentation and deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const wildfireCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [REDDING_FIRE_SLUG]: {
    scenario: `A Redding-area family lost their home in a wind-driven fire linked to utility equipment. An inverse-condemnation claim ran alongside their own insurance, with the full scope of loss documented. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Ensure safety; begin documenting the loss.'],
      ['First days', 'Open the insurance claim; preserve inventories.'],
      ['First weeks', 'Assess an inverse-condemnation theory.'],
      ['Longer term', 'Coordinate the parallel tracks and deadlines.'],
    ],
    severityLadder: [
      ['Inverse', 'Utility liable without proving negligence.'],
      ['Scope', 'Structure, contents, income, ALE.'],
      ['Tracks', 'Fund and insurance run in parallel.'],
      ['Deadlines', 'Several run at once.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries and losses are documented.' },
      { label: 'Imaging', copy: 'Objective findings support any injury.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Inventories and bills define economics.' },
    ],
    settlementDrivers: [
      'Whether utility equipment ignited the fire',
      'How fully the loss is documented',
      'How the parallel tracks are coordinated',
      'Whether all deadlines are met',
      'Any personal injury or death',
      'The strength of the loss inventory',
    ],
    settlementValueDetails: [
      { label: 'Inverse', copy: 'No negligence needed for property damage.' },
      { label: 'Scope', copy: 'Full loss beats structure-only.' },
      { label: 'Tracks', copy: 'Coordination avoids offsets.' },
      { label: 'Deadlines', copy: 'Missing one can bar a track.' },
    ],
    insuranceProblems: [
      'Only the structure is documented.',
      'A settlement-fund bar date is missed.',
      'The insurance and fund tracks conflict.',
      'The ignition cause is never investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What did you lose?' },
      { label: 'Step 2', question: 'Which fire was it?' },
      { label: 'Step 3', question: 'Do you have property insurance?' },
      { label: 'Step 4', question: 'Was anyone injured?' },
    ],
  },
  [NAPA_FIRE_SLUG]: {
    scenario: `A Napa vintner lost a home and suffered major winery income loss in a wine-country fire. The claim documented business losses alongside the structure, with an inverse-condemnation theory against a utility. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Ensure safety; begin documenting the loss.'],
      ['First days', 'Open the insurance claim; preserve business records.'],
      ['First weeks', 'Assess an inverse-condemnation theory.'],
      ['Longer term', 'Coordinate the parallel tracks and deadlines.'],
    ],
    severityLadder: [
      ['Inverse', 'Utility liable without proving negligence.'],
      ['Scope', 'Home, vineyard, winery, income.'],
      ['Tracks', 'Fund and insurance run in parallel.'],
      ['Deadlines', 'Several run at once.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries and losses are documented.' },
      { label: 'Imaging', copy: 'Objective findings support any injury.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Business records define economics.' },
    ],
    settlementDrivers: [
      'Whether utility equipment ignited the fire',
      'How fully business losses are documented',
      'How the parallel tracks are coordinated',
      'Whether all deadlines are met',
      'Any personal injury or death',
      'The strength of the income-loss proof',
    ],
    settlementValueDetails: [
      { label: 'Inverse', copy: 'No negligence needed for property damage.' },
      { label: 'Business', copy: 'Income loss is a major component.' },
      { label: 'Tracks', copy: 'Coordination avoids offsets.' },
      { label: 'Deadlines', copy: 'Missing one can bar a track.' },
    ],
    insuranceProblems: [
      'Business income loss is under-documented.',
      'A settlement-fund bar date is missed.',
      'The insurance and fund tracks conflict.',
      'The ignition cause is never investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What did you lose?' },
      { label: 'Step 2', question: 'Was a business or vineyard affected?' },
      { label: 'Step 3', question: 'Do you have property insurance?' },
      { label: 'Step 4', question: 'Which fire was it?' },
    ],
  },
  [SB_FIRE_SLUG]: {
    scenario: `A mountain-community family near San Bernardino lost their home in a fast-moving fire. An inverse-condemnation claim ran alongside insurance, with the full scope of loss documented. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Ensure safety; begin documenting the loss.'],
      ['First days', 'Open the insurance claim; preserve inventories.'],
      ['First weeks', 'Assess an inverse-condemnation theory.'],
      ['Longer term', 'Coordinate the parallel tracks and deadlines.'],
    ],
    severityLadder: [
      ['Inverse', 'Utility liable without proving negligence.'],
      ['Scope', 'Structure, contents, income, ALE.'],
      ['Tracks', 'Fund and insurance run in parallel.'],
      ['Deadlines', 'Several run at once.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries and losses are documented.' },
      { label: 'Imaging', copy: 'Objective findings support any injury.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Inventories and bills define economics.' },
    ],
    settlementDrivers: [
      'Whether utility equipment ignited the fire',
      'How fully the loss is documented',
      'How the parallel tracks are coordinated',
      'Whether all deadlines are met',
      'Any personal injury or death',
      'The strength of the loss inventory',
    ],
    settlementValueDetails: [
      { label: 'Inverse', copy: 'No negligence needed for property damage.' },
      { label: 'Scope', copy: 'Full loss beats structure-only.' },
      { label: 'Tracks', copy: 'Coordination avoids offsets.' },
      { label: 'Deadlines', copy: 'Missing one can bar a track.' },
    ],
    insuranceProblems: [
      'Only the structure is documented.',
      'A settlement-fund bar date is missed.',
      'The insurance and fund tracks conflict.',
      'The ignition cause is never investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What did you lose?' },
      { label: 'Step 2', question: 'Which fire was it?' },
      { label: 'Step 3', question: 'Do you have property insurance?' },
      { label: 'Step 4', question: 'Was anyone injured?' },
    ],
  },
  [VENTURA_FIRE_SLUG]: {
    scenario: `A Ventura family lost their home in a wind-driven fire and later suffered debris-flow damage from the burn scar. Both losses were documented alongside an inverse-condemnation theory. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Ensure safety; begin documenting the loss.'],
      ['First days', 'Open the insurance claim; preserve inventories.'],
      ['First weeks', 'Assess inverse condemnation and debris-flow damage.'],
      ['Longer term', 'Coordinate the parallel tracks and deadlines.'],
    ],
    severityLadder: [
      ['Inverse', 'Utility liable without proving negligence.'],
      ['Scope', 'Structure, contents, debris flow, ALE.'],
      ['Tracks', 'Fund and insurance run in parallel.'],
      ['Deadlines', 'Several run at once.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries and losses are documented.' },
      { label: 'Imaging', copy: 'Objective findings support any injury.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Inventories and bills define economics.' },
    ],
    settlementDrivers: [
      'Whether utility equipment ignited the fire',
      'Whether debris-flow damage is included',
      'How the parallel tracks are coordinated',
      'Whether all deadlines are met',
      'Any personal injury or death',
      'The strength of the loss inventory',
    ],
    settlementValueDetails: [
      { label: 'Inverse', copy: 'No negligence needed for property damage.' },
      { label: 'Debris flow', copy: 'A burn-scar consequence can be included.' },
      { label: 'Tracks', copy: 'Coordination avoids offsets.' },
      { label: 'Deadlines', copy: 'Missing one can bar a track.' },
    ],
    insuranceProblems: [
      'Debris-flow damage is treated as unrelated.',
      'A settlement-fund bar date is missed.',
      'The insurance and fund tracks conflict.',
      'The ignition cause is never investigated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What did you lose?' },
      { label: 'Step 2', question: 'Was there later debris-flow damage?' },
      { label: 'Step 3', question: 'Do you have property insurance?' },
      { label: 'Step 4', question: 'Which fire was it?' },
    ],
  },
}
