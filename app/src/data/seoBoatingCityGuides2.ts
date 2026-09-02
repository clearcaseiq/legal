import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, boating-accident practice area (batch 2):
 * location-specific guides for Lake Tahoe, San Francisco Bay, Shasta Lake, and
 * Marina del Rey, extending the batch-1 hub (San Diego, Sacramento Delta,
 * Long Beach, Newport Beach).
 *
 * Applied accurately (identical framework to batch 1):
 *  - Harbors & Navigation Code rules incl. BUI (0.08, section 655).
 *  - Multiple defendants: operator, rental company, manufacturer, other boater.
 *  - Federal maritime law can apply on navigable waters (often 3-year limit) vs.
 *    California\u2019s 2-year deadline; the distinction is fact-specific.
 *  - On-water evidence is uniquely perishable.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether federal maritime law or California law applies, which deadline controls, and how comparative fault is assessed depend on facts a licensed California attorney should review promptly.'

const RULES =
  'California\u2019s Harbors and Navigation Code governs how vessels must be operated \u2014 including speed and right-of-way rules, equipment requirements, and the prohibition on boating under the influence, which sets a 0.08 blood-alcohol limit for operators under Harbors and Navigation Code section 655. A violation of these rules, such as excessive speed in a congested area or an intoxicated operator, is frequently the core of a boating-injury claim.'

const PARTIES =
  'Responsibility often extends beyond the operator at the wheel. A rental company can be liable for renting a defective vessel, for giving inadequate instruction, or for renting to someone plainly unfit to operate; a manufacturer can be liable for a product defect; and another boater can be liable for a collision. Identifying every responsible party is what opens the coverage a serious on-water injury requires.'

const MARITIME =
  'A boating incident on navigable waters can fall under federal maritime (admiralty) law rather than, or alongside, California law, and that distinction can change the rules that apply and the deadline to sue \u2014 a maritime personal-injury claim often carries a three-year limit, while a California state claim carries a two-year deadline. Because which framework applies is fact-specific, and getting it wrong can forfeit a claim, an early assessment is especially important in boating cases.'

const EVIDENCE =
  'On-water evidence is uniquely perishable: there is rarely a police report of the usual kind, witnesses scatter, rental and instruction records can be discarded, and the vessels are moved or repaired quickly. Identifying the operators and their insurance, the rental company, and any witnesses \u2014 and photographing the vessels and the scene \u2014 early is critical.'

export const TAHOE_BOATING_SLUG = '/lake-tahoe-boating-accident'
export const SFBAY_BOATING_SLUG = '/san-francisco-bay-boating-accident'
export const SHASTA_BOATING_SLUG = '/shasta-lake-boating-accident'
export const MDR_BOATING_SLUG = '/marina-del-rey-boating-accident'

export const boatingCityGuidePages2: LandingPage[] = [
  {
    slug: TAHOE_BOATING_SLUG,
    category: 'Cities',
    cluster: 'Lake Tahoe Boating Accident Claims',
    title: 'Lake Tahoe Boating Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a boat, jet-ski, or rental-vessel accident on Lake Tahoe? The operator, a rental company, or a manufacturer may be liable \u2014 and the deadline can be shorter than you think.',
    psychology: 'I was hurt boating on Lake Tahoe and do not know whether maritime or California law applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'lake tahoe boating accident lawyer',
      'jet ski rental injury claim california',
      'boating under the influence crash california',
      'maritime vs california boating deadline',
      'boat rental company liability california',
    ],
    signals: [
      'Harbors & Nav Code rules',
      'BUI 0.08 limit',
      'Rental / manufacturer liability',
      'Maritime vs. state deadline',
      'Perishable on-water evidence',
      'Comparative fault',
    ],
    sections: {
      whyItMatters: `Lake Tahoe\u2019s heavy summer traffic of rented powerboats and personal watercraft on a large, cold, deep lake produces serious collisions and wake and jet-ski injuries. ${RULES} ${PARTIES} ${MARITIME} ${EVIDENCE} ${NOT_ADVICE}`,
      whatToTrack: [
        'The operators and their insurance',
        'Any rental company and its records',
        'Whether an operator was impaired',
        'The vessels and any product defect',
        'Whether the water is navigable (maritime question)',
        'Photographs of the vessels and scene',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, flags whether maritime or California law and deadline apply, and moves fast to preserve rental records and witness information before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Does maritime law or California law apply on Lake Tahoe?',
        a: 'It depends on whether the water is navigable and other facts. A maritime personal-injury claim often carries a three-year limit while a California claim carries two years, so an early assessment matters.',
      },
      {
        q: 'Can I sue the rental company, not just the operator?',
        a: 'Often yes. A rental company can be liable for renting a defective vessel, giving inadequate instruction, or renting to someone plainly unfit to operate.',
      },
      {
        q: 'The operator was drinking. Does that help my claim?',
        a: 'Yes. California prohibits boating under the influence with a 0.08 limit (Harbors and Navigation Code 655), and an intoxicated operator is frequently the core of a claim.',
      },
      {
        q: 'What evidence should I secure?',
        a: 'The operators and their insurance, the rental company and its records, photos of the vessels and scene, and witness information \u2014 all quickly, because on-water evidence is uniquely perishable.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the on-water evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SFBAY_BOATING_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Bay Boating Accident Claims',
    title: 'San Francisco Bay Boating Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a boat, sailboat, or charter accident on San Francisco Bay? The operator, a charter company, or a manufacturer may be liable \u2014 and maritime law often applies.',
    psychology: 'I was hurt boating on San Francisco Bay and do not know whether maritime or California law applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco bay boating accident lawyer',
      'charter boat injury claim california',
      'sailboat collision lawsuit california',
      'maritime vs california boating deadline',
      'boating under the influence crash california',
    ],
    signals: [
      'Harbors & Nav Code rules',
      'BUI 0.08 limit',
      'Charter / manufacturer liability',
      'Maritime law often applies',
      'Perishable on-water evidence',
      'Comparative fault',
    ],
    sections: {
      whyItMatters: `San Francisco Bay is heavily trafficked navigable water with charters, sailboats, ferries, and powerboats, where collisions, wake injuries, and charter incidents are common and federal maritime law frequently applies. ${RULES} ${PARTIES} ${MARITIME} ${EVIDENCE} ${NOT_ADVICE}`,
      whatToTrack: [
        'The operators and their insurance',
        'Any charter or rental company and its records',
        'Whether an operator was impaired',
        'The vessels and any product defect',
        'That the Bay is navigable (maritime law likely)',
        'Photographs of the vessels and scene',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, flags whether maritime or California law and deadline apply, and moves fast to preserve charter records and witness information before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Does maritime law apply on San Francisco Bay?',
        a: 'The Bay is navigable water, so federal maritime law frequently applies \u2014 which can change the rules and the deadline (often three years). The exact analysis is fact-specific and should be assessed early.',
      },
      {
        q: 'Can I sue the charter company?',
        a: 'Often yes. A charter or rental company can be liable for an unsafe vessel, inadequate instruction, or an unfit operator, separate from the operator\u2019s own negligence.',
      },
      {
        q: 'The operator was drinking. Does that help my claim?',
        a: 'Yes. California prohibits boating under the influence with a 0.08 limit (Harbors and Navigation Code 655), and an intoxicated operator is frequently the core of a claim.',
      },
      {
        q: 'What evidence should I secure?',
        a: 'The operators and their insurance, the charter company and its records, photos of the vessels and scene, and witness information \u2014 all quickly, because on-water evidence is uniquely perishable.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the on-water evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SHASTA_BOATING_SLUG,
    category: 'Cities',
    cluster: 'Shasta Lake Boating Accident Claims',
    title: 'Shasta Lake Boating Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a houseboat, powerboat, or personal-watercraft accident on Shasta Lake? The operator, a rental or houseboat company, or a manufacturer may be liable.',
    psychology: 'I was hurt boating on Shasta Lake and do not know who is responsible or how long I have to act.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'shasta lake boating accident lawyer',
      'houseboat rental injury claim california',
      'jet ski crash lawsuit california',
      'boating under the influence crash california',
      'boat rental company liability california',
    ],
    signals: [
      'Harbors & Nav Code rules',
      'BUI 0.08 limit',
      'Rental / houseboat liability',
      'Maritime vs. state deadline',
      'Perishable on-water evidence',
      'Comparative fault',
    ],
    sections: {
      whyItMatters: `Shasta Lake\u2019s houseboat and powerboat rental traffic on a large reservoir produces collisions, personal-watercraft injuries, and houseboat-related incidents, often involving out-of-town renters unfamiliar with the water. ${RULES} ${PARTIES} ${MARITIME} ${EVIDENCE} ${NOT_ADVICE}`,
      whatToTrack: [
        'The operators and their insurance',
        'Any rental or houseboat company and its records',
        'Whether an operator was impaired',
        'The vessels and any product defect',
        'Whether the water is navigable (maritime question)',
        'Photographs of the vessels and scene',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, flags whether maritime or California law and deadline apply, and moves fast to preserve rental records and witness information before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue the houseboat or rental company?',
        a: 'Often yes. A rental or houseboat company can be liable for renting a defective vessel, giving inadequate instruction, or renting to someone plainly unfit to operate.',
      },
      {
        q: 'Does maritime law or California law apply?',
        a: 'It depends on whether the water is navigable and other facts. The distinction can change the applicable deadline, so an early assessment matters.',
      },
      {
        q: 'The operator was drinking. Does that help my claim?',
        a: 'Yes. California prohibits boating under the influence with a 0.08 limit (Harbors and Navigation Code 655), and an intoxicated operator is frequently the core of a claim.',
      },
      {
        q: 'What evidence should I secure?',
        a: 'The operators and their insurance, the rental company and its records, photos of the vessels and scene, and witness information \u2014 all quickly, because on-water evidence is uniquely perishable.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the on-water evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: MDR_BOATING_SLUG,
    category: 'Cities',
    cluster: 'Marina del Rey Boating Accident Claims',
    title: 'Marina del Rey Boating Accident Claims',
    eyebrow: 'California local injury guide',
    description:
      'Hurt in a boat, charter, or personal-watercraft accident at Marina del Rey or off the LA coast? The operator, a charter company, or a manufacturer may be liable.',
    psychology: 'I was hurt boating out of Marina del Rey and do not know whether maritime or California law applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'marina del rey boating accident lawyer',
      'charter boat injury claim california',
      'jet ski rental crash lawsuit california',
      'maritime vs california boating deadline',
      'boating under the influence crash california',
    ],
    signals: [
      'Harbors & Nav Code rules',
      'BUI 0.08 limit',
      'Charter / manufacturer liability',
      'Maritime law often applies',
      'Perishable on-water evidence',
      'Comparative fault',
    ],
    sections: {
      whyItMatters: `Marina del Rey is one of the largest man-made small-craft harbors in the world, and its dense charter, rental, and recreational traffic on coastal navigable water produces collisions, wake injuries, and charter incidents where maritime law frequently applies. ${RULES} ${PARTIES} ${MARITIME} ${EVIDENCE} ${NOT_ADVICE}`,
      whatToTrack: [
        'The operators and their insurance',
        'Any charter or rental company and its records',
        'Whether an operator was impaired',
        'The vessels and any product defect',
        'That coastal water is navigable (maritime law likely)',
        'Photographs of the vessels and scene',
        'Witness contact information',
        'Medical treatment from the injury onward',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies every responsible party, flags whether maritime or California law and deadline apply, and moves fast to preserve charter records and witness information before they disappear. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Does maritime law apply off the LA coast?',
        a: 'Coastal navigable water frequently falls under federal maritime law, which can change the rules and the deadline (often three years). The exact analysis is fact-specific and should be assessed early.',
      },
      {
        q: 'Can I sue the charter or rental company?',
        a: 'Often yes. A charter or rental company can be liable for an unsafe vessel, inadequate instruction, or an unfit operator, separate from the operator\u2019s own negligence.',
      },
      {
        q: 'The operator was drinking. Does that help my claim?',
        a: 'Yes. California prohibits boating under the influence with a 0.08 limit (Harbors and Navigation Code 655), and an intoxicated operator is frequently the core of a claim.',
      },
      {
        q: 'What evidence should I secure?',
        a: 'The operators and their insurance, the charter company and its records, photos of the vessels and scene, and witness information \u2014 all quickly, because on-water evidence is uniquely perishable.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It preserves the on-water evidence so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const boatingCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [TAHOE_BOATING_SLUG]: {
    scenario: `A rented powerboat struck a swimmer near a Lake Tahoe shoreline. Claims ran against the operator and the rental company, with the maritime-versus-state deadline assessed early. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; identify operators and witnesses.'],
      ['First days', 'Preserve rental records; photograph the vessels.'],
      ['First weeks', 'Assess maritime vs. California law and deadline.'],
      ['Longer term', 'Develop operator and rental-company claims.'],
    ],
    severityLadder: [
      ['Rules', 'Speed, right-of-way, and BUI govern.'],
      ['Parties', 'Operator, rental, manufacturer.'],
      ['Framework', 'Maritime vs. state deadline.'],
      ['Evidence', 'On-water proof is perishable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a rule was violated',
      'Whether the operator was impaired',
      'Whether the rental company is liable',
      'Which framework and deadline applies',
      'Whether evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'BUI', copy: 'An impaired operator strengthens the claim.' },
      { label: 'Rental', copy: 'A rental company adds coverage.' },
      { label: 'Framework', copy: 'The wrong deadline can forfeit a claim.' },
      { label: 'Evidence', copy: 'On-water proof disappears fast.' },
    ],
    insuranceProblems: [
      'Rental records are discarded before a demand.',
      'The wrong deadline is assumed and the claim lapses.',
      'Only the operator, not the rental company, is pursued.',
      'Witnesses scatter and are never found.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What kind of vessel was involved?' },
      { label: 'Step 2', question: 'Was it a rental?' },
      { label: 'Step 3', question: 'Was any operator impaired?' },
      { label: 'Step 4', question: 'When did it happen?' },
    ],
  },
  [SFBAY_BOATING_SLUG]: {
    scenario: `A charter sailboat collision on San Francisco Bay injured a passenger. Because the Bay is navigable, maritime law and its longer deadline governed, alongside a charter-company claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; identify operators and witnesses.'],
      ['First days', 'Preserve charter records; photograph the vessels.'],
      ['First weeks', 'Confirm maritime framework and deadline.'],
      ['Longer term', 'Develop operator and charter-company claims.'],
    ],
    severityLadder: [
      ['Rules', 'Speed, right-of-way, and BUI govern.'],
      ['Parties', 'Operator, charter, manufacturer.'],
      ['Framework', 'Maritime law often applies.'],
      ['Evidence', 'On-water proof is perishable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a navigation rule was violated',
      'Whether the charter operator was negligent',
      'Whether the charter company is liable',
      'That maritime law and its deadline apply',
      'Whether evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Charter', copy: 'A charter company adds coverage.' },
      { label: 'Maritime', copy: 'The framework changes the deadline.' },
      { label: 'Rules', copy: 'A right-of-way violation drives fault.' },
      { label: 'Evidence', copy: 'On-water proof disappears fast.' },
    ],
    insuranceProblems: [
      'Charter records are discarded before a demand.',
      'The maritime deadline is misapplied.',
      'Only the operator is pursued.',
      'Witnesses scatter and are never found.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What kind of vessel was involved?' },
      { label: 'Step 2', question: 'Was it a charter?' },
      { label: 'Step 3', question: 'Where on the Bay did it happen?' },
      { label: 'Step 4', question: 'When did it happen?' },
    ],
  },
  [SHASTA_BOATING_SLUG]: {
    scenario: `A houseboat renter unfamiliar with Shasta Lake struck another vessel. Claims ran against the operator and the houseboat rental company for inadequate instruction. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; identify operators and witnesses.'],
      ['First days', 'Preserve rental records; photograph the vessels.'],
      ['First weeks', 'Assess maritime vs. California law and deadline.'],
      ['Longer term', 'Develop operator and rental-company claims.'],
    ],
    severityLadder: [
      ['Rules', 'Speed, right-of-way, and BUI govern.'],
      ['Parties', 'Operator, rental, manufacturer.'],
      ['Framework', 'Maritime vs. state deadline.'],
      ['Evidence', 'On-water proof is perishable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a rule was violated',
      'Whether instruction was inadequate',
      'Whether the rental company is liable',
      'Which framework and deadline applies',
      'Whether evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Instruction', copy: 'Inadequate briefing is negligence.' },
      { label: 'Rental', copy: 'A rental company adds coverage.' },
      { label: 'Framework', copy: 'The wrong deadline can forfeit a claim.' },
      { label: 'Evidence', copy: 'On-water proof disappears fast.' },
    ],
    insuranceProblems: [
      'Rental records are discarded before a demand.',
      'The wrong deadline is assumed and the claim lapses.',
      'Only the operator is pursued.',
      'Witnesses scatter and are never found.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What kind of vessel was involved?' },
      { label: 'Step 2', question: 'Was it a rental or houseboat?' },
      { label: 'Step 3', question: 'Was any operator impaired?' },
      { label: 'Step 4', question: 'When did it happen?' },
    ],
  },
  [MDR_BOATING_SLUG]: {
    scenario: `A rented personal watercraft collided with a boat off Marina del Rey. Because coastal water is navigable, maritime law governed alongside a rental-company claim. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Get medical help; identify operators and witnesses.'],
      ['First days', 'Preserve rental records; photograph the vessels.'],
      ['First weeks', 'Confirm maritime framework and deadline.'],
      ['Longer term', 'Develop operator and rental-company claims.'],
    ],
    severityLadder: [
      ['Rules', 'Speed, right-of-way, and BUI govern.'],
      ['Parties', 'Operator, rental, manufacturer.'],
      ['Framework', 'Maritime law often applies.'],
      ['Evidence', 'On-water proof is perishable.'],
    ],
    treatmentProgression: [
      { label: 'First response', copy: 'Injuries are documented.' },
      { label: 'Imaging', copy: 'Objective findings support severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Documentation', copy: 'Bills and future care define economics.' },
    ],
    settlementDrivers: [
      'Whether a navigation rule was violated',
      'Whether the operator was impaired',
      'Whether the rental company is liable',
      'That maritime law and its deadline apply',
      'Whether evidence was preserved',
      'Injury severity and treatment continuity',
    ],
    settlementValueDetails: [
      { label: 'Rental', copy: 'A rental company adds coverage.' },
      { label: 'Maritime', copy: 'The framework changes the deadline.' },
      { label: 'BUI', copy: 'An impaired operator strengthens the claim.' },
      { label: 'Evidence', copy: 'On-water proof disappears fast.' },
    ],
    insuranceProblems: [
      'Rental records are discarded before a demand.',
      'The maritime deadline is misapplied.',
      'Only the operator is pursued.',
      'Witnesses scatter and are never found.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What kind of vessel was involved?' },
      { label: 'Step 2', question: 'Was it a rental or charter?' },
      { label: 'Step 3', question: 'Was any operator impaired?' },
      { label: 'Step 4', question: 'When did it happen?' },
    ],
  },
}
