import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, toxic-mold / uninhabitable-rental (warranty-of-habitability)
 * practice area: location-specific guides for Los Angeles, Oakland, San
 * Francisco, and Long Beach.
 *
 * This is distinct from a general apartment-premises claim: it centers on the
 * implied warranty of habitability, the notice-and-repair framework, the
 * contested medical causation of mold illness, and California\u2019s anti-retaliation
 * protections for tenants who assert their rights.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: an enormous rental market with a large stock of older units.
 *  - Oakland: aging housing where deferred maintenance and water intrusion are
 *    common.
 *  - San Francisco: old, moisture-prone buildings under rent control.
 *  - Long Beach: coastal humidity combined with older housing stock.
 *
 * Applied accurately:
 *  - Every residential lease carries an implied warranty of habitability (Civil
 *    Code section 1941), which requires the landlord to maintain the unit in a
 *    livable condition; unaddressed water intrusion and resulting mold can breach
 *    it.
 *  - The tenant generally must give the landlord notice and a reasonable
 *    opportunity to repair; documented complaints and the landlord\u2019s failure to
 *    act are central to the claim.
 *  - Mold personal-injury claims are contested on medical causation: connecting
 *    specific health effects \u2014 respiratory illness, allergic reactions \u2014 to the
 *    mold requires medical evidence and often expert testimony. Property,
 *    out-of-pocket, and relocation damages are more straightforward.
 *  - California prohibits retaliation \u2014 such as eviction or a rent increase \u2014
 *    against a tenant who asserts habitability rights (Civil Code section 1942.5).
 *  - The evidence is perishable: photographs, mold testing or air sampling, the
 *    source of the water intrusion, written complaints and responses, and medical
 *    records should be gathered before remediation destroys the proof. A personal-
 *    injury deadline is generally two years (Code of Civil Procedure section
 *    335.1); contract-based habitability claims can follow different periods.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether a unit was uninhabitable, whether mold caused a health effect, and which deadline applies depend on facts a licensed California attorney should review promptly.'

const WARRANTY =
  'Every residential lease in California carries an implied warranty of habitability (Civil Code section 1941), which requires the landlord to keep the unit in a livable condition. Unaddressed water intrusion \u2014 from leaks, plumbing failures, or roof or window problems \u2014 and the mold that follows can breach that warranty when the landlord fails to remedy it.'

const NOTICE =
  'A habitability claim generally requires that the tenant gave the landlord notice of the problem and a reasonable opportunity to repair it. That is why documented complaints \u2014 dated emails, texts, letters, or maintenance requests \u2014 and the landlord\u2019s failure to act are central: they establish both the defect and the landlord\u2019s knowledge.'

const CAUSATION =
  'Mold personal-injury claims are contested on medical causation. Connecting specific health effects \u2014 respiratory illness, sinus problems, or allergic reactions \u2014 to the mold requires medical evidence and often expert testimony, because landlords\u2019 insurers dispute the link. Property damage, out-of-pocket costs, and relocation expenses are more straightforward to prove and are often part of the claim.'

const RETALIATION =
  'California protects tenants who assert their habitability rights: a landlord generally may not retaliate \u2014 by eviction, a rent increase, or reduced services \u2014 against a tenant who has complained about conditions or pursued a habitability remedy (Civil Code section 1942.5). Retaliatory conduct after a complaint can itself support a claim.'

const EVIDENCE =
  'Mold evidence is perishable and should be gathered before any remediation: dated photographs and video of the mold and its source, mold testing or air sampling, records of the water intrusion, and every written complaint and the landlord\u2019s response, along with medical records tying symptoms to the exposure. Once a unit is cleaned or repaired, the proof can be gone.'

export const LA_MOLD_SLUG = '/los-angeles-toxic-mold-apartment-claim'
export const OAK_MOLD_SLUG = '/oakland-toxic-mold-apartment-claim'
export const SF_MOLD_SLUG = '/san-francisco-toxic-mold-apartment-claim'
export const LB_MOLD_SLUG = '/long-beach-toxic-mold-apartment-claim'

export const moldHabitabilityCityGuidePages: LandingPage[] = [
  {
    slug: LA_MOLD_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Toxic Mold & Uninhabitable Rental Claims',
    title: 'Los Angeles Toxic Mold & Uninhabitable Rental Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sick from mold in an LA rental the landlord ignored? The warranty of habitability, your documented complaints, and preserved evidence drive the claim.',
    psychology: 'My LA apartment has mold the landlord will not fix and my family is getting sick.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles toxic mold lawyer',
      'apartment mold illness claim california',
      'uninhabitable rental lawsuit california',
      'landlord ignored mold california',
      'warranty of habitability mold california',
    ],
    signals: [
      'Implied warranty of habitability (1941)',
      'Notice-and-repair framework',
      'Mold causation is contested',
      'Anti-retaliation protection (1942.5)',
      'Preserve evidence before remediation',
      'Two-year injury deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Los Angeles\u2019s enormous rental market includes a large stock of older units where leaks and unaddressed water intrusion breed mold \u2014 and where a landlord\u2019s failure to repair after notice can breach the warranty of habitability. ${WARRANTY} ${NOTICE} ${CAUSATION} ${RETALIATION} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The source and history of the water intrusion or mold',
        'Every written complaint to the landlord and any response',
        'Dated photos, video, and any mold testing',
        'Whether the landlord had a reasonable chance to repair',
        'Household members\u2019 symptoms and medical records',
        'Any retaliation after complaining',
        'Out-of-pocket, property, and relocation costs',
        'The date any injury arose, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ organises an LA tenant\u2019s complaint history and the landlord\u2019s response, preserves the mold and water-intrusion evidence before remediation, and gathers the medical records that address causation. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I have a claim if my landlord ignored the mold?',
        a: 'Possibly. Every residential lease carries an implied warranty of habitability (Civil Code section 1941), and a landlord who fails to remedy water intrusion and mold after notice can breach it. Your documented complaints and the landlord\u2019s failure to act are central.',
      },
      {
        q: 'Can I recover for getting sick from the mold?',
        a: 'It depends on medical proof. Mold personal-injury claims are contested on causation, so connecting your specific health effects to the mold requires medical evidence and often expert testimony. Property, out-of-pocket, and relocation damages are more straightforward.',
      },
      {
        q: 'Can my landlord evict me for complaining?',
        a: 'Generally not. California prohibits retaliation \u2014 eviction, a rent increase, or reduced services \u2014 against a tenant who asserts habitability rights (Civil Code section 1942.5), and retaliatory conduct after a complaint can itself support a claim.',
      },
      {
        q: 'What should I do before the landlord cleans it up?',
        a: 'Preserve the evidence. Take dated photos and video, consider mold testing, document the water source, and save every complaint and response, because once the unit is remediated the proof can be gone.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the evidence, the complaint history, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_MOLD_SLUG,
    category: 'Cities',
    cluster: 'Oakland Toxic Mold & Uninhabitable Rental Claims',
    title: 'Oakland Toxic Mold & Uninhabitable Rental Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sick from mold in an Oakland rental with deferred maintenance? The warranty of habitability and your documented complaints drive the claim.',
    psychology: 'My older Oakland unit has mold from leaks the landlord never fixed and we are getting sick.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland toxic mold lawyer',
      'apartment mold illness claim california',
      'uninhabitable rental lawsuit california',
      'deferred maintenance mold california',
      'warranty of habitability mold california',
    ],
    signals: [
      'Implied warranty of habitability (1941)',
      'Notice-and-repair framework',
      'Mold causation is contested',
      'Anti-retaliation protection (1942.5)',
      'Preserve evidence before remediation',
      'Two-year injury deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s aging housing stock, where deferred maintenance and long-standing water intrusion are common, is exactly where chronic mold takes hold \u2014 and where a landlord\u2019s repeated failure to repair after notice can breach the warranty of habitability. ${WARRANTY} ${NOTICE} ${CAUSATION} ${RETALIATION} ${EVIDENCE} Civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'The source and history of the water intrusion or mold',
        'Every written complaint to the landlord and any response',
        'Any pattern of deferred maintenance',
        'Dated photos, video, and any mold testing',
        'Household members\u2019 symptoms and medical records',
        'Any retaliation after complaining',
        'Out-of-pocket, property, and relocation costs',
        'The date any injury arose, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ documents the pattern of deferred maintenance and the complaint history in an Oakland unit, preserves the mold and water-intrusion evidence before remediation, and gathers the medical records that address causation. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My older building was never properly maintained. Does that help my claim?',
        a: 'It can. A landlord must maintain the unit under the implied warranty of habitability, and a pattern of deferred maintenance and ignored complaints can show the breach was ongoing and known. Documented complaints are central.',
      },
      {
        q: 'Can I recover for getting sick from the mold?',
        a: 'It depends on medical proof. Mold personal-injury claims are contested on causation, so connecting your health effects to the mold requires medical evidence and often expert testimony. Property and relocation damages are more straightforward.',
      },
      {
        q: 'Can my landlord retaliate for complaining?',
        a: 'Generally not. California prohibits retaliation against a tenant who asserts habitability rights (Civil Code section 1942.5), and retaliatory conduct after a complaint can itself support a claim.',
      },
      {
        q: 'What should I do before the landlord cleans it up?',
        a: 'Preserve the evidence \u2014 dated photos and video, mold testing, documentation of the water source, and every complaint and response \u2014 because once the unit is remediated the proof can be gone.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the complaint history, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_MOLD_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Toxic Mold & Uninhabitable Rental Claims',
    title: 'San Francisco Toxic Mold & Uninhabitable Rental Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sick from mold in an old San Francisco rental? The warranty of habitability, your complaints, and strong anti-retaliation protections drive the claim.',
    psychology: 'My old San Francisco apartment has mold from moisture the landlord ignores and we are getting sick.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco toxic mold lawyer',
      'apartment mold illness claim california',
      'uninhabitable rental lawsuit california',
      'rent controlled unit mold california',
      'warranty of habitability mold california',
    ],
    signals: [
      'Implied warranty of habitability (1941)',
      'Notice-and-repair framework',
      'Mold causation is contested',
      'Anti-retaliation protection (1942.5)',
      'Preserve evidence before remediation',
      'Two-year injury deadline (335.1)',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s old, moisture-prone buildings \u2014 many under rent control \u2014 are prone to persistent mold, and tenants who fear losing a rent-controlled unit are especially vulnerable to retaliation when they complain, which the law specifically forbids. ${WARRANTY} ${NOTICE} ${CAUSATION} ${RETALIATION} ${EVIDENCE} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'The source and history of the water intrusion or mold',
        'Every written complaint to the landlord and any response',
        'Dated photos, video, and any mold testing',
        'Whether the landlord had a reasonable chance to repair',
        'Household members\u2019 symptoms and medical records',
        'Any retaliation, especially around a rent-controlled unit',
        'Out-of-pocket, property, and relocation costs',
        'The date any injury arose, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ organises a San Francisco tenant\u2019s complaint history, preserves the mold and moisture evidence before remediation, documents any retaliation around a rent-controlled unit, and gathers the medical records that address causation. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I am afraid to complain and lose my rent-controlled unit. What protects me?',
        a: 'California\u2019s anti-retaliation law. A landlord generally may not retaliate \u2014 by eviction, a rent increase, or reduced services \u2014 against a tenant who asserts habitability rights (Civil Code section 1942.5). Retaliatory conduct after a complaint can itself support a claim.',
      },
      {
        q: 'Do I have a habitability claim for the mold?',
        a: 'Possibly. The implied warranty of habitability (Civil Code section 1941) requires the landlord to keep the unit livable, and a failure to remedy water intrusion and mold after notice can breach it. Documented complaints are central.',
      },
      {
        q: 'Can I recover for getting sick?',
        a: 'It depends on medical proof. Mold personal-injury claims are contested on causation and require medical evidence and often expert testimony. Property and relocation damages are more straightforward.',
      },
      {
        q: 'What should I do before it is cleaned up?',
        a: 'Preserve the evidence \u2014 dated photos and video, mold testing, the water source, and every complaint and response \u2014 because once the unit is remediated the proof can be gone.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the complaint history, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_MOLD_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Toxic Mold & Uninhabitable Rental Claims',
    title: 'Long Beach Toxic Mold & Uninhabitable Rental Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sick from mold in a Long Beach rental? Coastal humidity and older units breed mold \u2014 and the warranty of habitability and your complaints drive the claim.',
    psychology: 'My Long Beach apartment has mold that keeps coming back and the landlord will not fix the cause.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach toxic mold lawyer',
      'apartment mold illness claim california',
      'uninhabitable rental lawsuit california',
      'coastal humidity mold apartment california',
      'warranty of habitability mold california',
    ],
    signals: [
      'Implied warranty of habitability (1941)',
      'Notice-and-repair framework',
      'Mold causation is contested',
      'Anti-retaliation protection (1942.5)',
      'Preserve evidence before remediation',
      'Two-year injury deadline (335.1)',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s coastal humidity combined with older housing stock creates persistent moisture that breeds mold \u2014 and when a landlord addresses only the surface without fixing the source, the problem returns, and the warranty of habitability can be breached. ${WARRANTY} ${NOTICE} ${CAUSATION} ${RETALIATION} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The source of moisture and whether it was truly fixed',
        'Every written complaint to the landlord and any response',
        'Whether the mold recurred after surface cleaning',
        'Dated photos, video, and any mold testing',
        'Household members\u2019 symptoms and medical records',
        'Any retaliation after complaining',
        'Out-of-pocket, property, and relocation costs',
        'The date any injury arose, for the deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ documents whether a Long Beach landlord fixed the moisture source or only the surface, organises the complaint history, preserves the mold evidence before remediation, and gathers the medical records that address causation. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The landlord keeps painting over the mold but it comes back. Does that matter?',
        a: 'Yes. Addressing only the surface without fixing the underlying moisture source generally does not satisfy the duty to maintain a habitable unit, and recurring mold after cosmetic fixes can strengthen a habitability claim. Document each recurrence and complaint.',
      },
      {
        q: 'Do I have a claim for the mold?',
        a: 'Possibly. The implied warranty of habitability (Civil Code section 1941) requires the landlord to keep the unit livable, and a failure to remedy the moisture and mold after notice can breach it. Documented complaints are central.',
      },
      {
        q: 'Can I recover for getting sick?',
        a: 'It depends on medical proof. Mold personal-injury claims are contested on causation and require medical evidence and often expert testimony. Property and relocation damages are more straightforward.',
      },
      {
        q: 'Can my landlord retaliate for complaining?',
        a: 'Generally not. California prohibits retaliation against a tenant who asserts habitability rights (Civil Code section 1942.5), and retaliatory conduct after a complaint can itself support a claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the evidence, the complaint history, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const moldHabitabilityCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_MOLD_SLUG]: {
    scenario: `An LA family\u2019s repeated written complaints about a bathroom leak went unaddressed until mold spread. The dated complaints, testing, and medical records framed a habitability and injury claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report in writing; photograph the mold and source.'],
      ['If ignored', 'Document each complaint and the lack of repair.'],
      ['Before remediation', 'Test the mold and preserve the evidence.'],
      ['Longer term', 'Habitability breach and causation developed.'],
    ],
    severityLadder: [
      ['Warranty', 'Habitability requires a livable unit.'],
      ['Notice', 'Documented complaints establish knowledge.'],
      ['Causation', 'Medical proof links illness to mold.'],
      ['Damages', 'Property and relocation are straightforward.'],
    ],
    treatmentProgression: [
      { label: 'Symptoms', copy: 'Respiratory and allergic effects documented.' },
      { label: 'Medical care', copy: 'A provider ties symptoms to exposure.' },
      { label: 'Expert input', copy: 'Causation is supported for injury claims.' },
      { label: 'Documentation', copy: 'Bills and relocation costs are recorded.' },
    ],
    settlementDrivers: [
      'Whether the warranty of habitability was breached',
      'Whether complaints show notice and failure to repair',
      'Whether medical causation is supported',
      'Whether the evidence was preserved before remediation',
      'Whether retaliation occurred',
      'Property, relocation, and injury damages',
    ],
    settlementValueDetails: [
      { label: 'Notice matters', copy: 'Documented complaints are key.' },
      { label: 'Causation is contested', copy: 'Medical proof carries injury claims.' },
      { label: 'Preserve early', copy: 'Remediation destroys evidence.' },
      { label: 'Multiple damages', copy: 'Property and relocation add up.' },
    ],
    insuranceProblems: [
      'Complaints were only verbal, leaving no record.',
      'The mold was remediated before it was documented.',
      'No medical evidence links the illness to the mold.',
      'Retaliation after complaints is ignored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the source of the mold or moisture?' },
      { label: 'Step 2', question: 'Did you complain in writing?' },
      { label: 'Step 3', question: 'Who is sick, and have they seen a doctor?' },
      { label: 'Step 4', question: 'Has the landlord retaliated?' },
    ],
  },
  [OAK_MOLD_SLUG]: {
    scenario: `An Oakland tenant\u2019s years of maintenance requests showed a chronic leak the landlord never fixed. The pattern of deferred maintenance strengthened the habitability claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Gather the history of maintenance requests.'],
      ['If ignored', 'Document the ongoing failure and mold spread.'],
      ['Before remediation', 'Test the mold and preserve the evidence.'],
      ['Longer term', 'Habitability breach and causation developed.'],
    ],
    severityLadder: [
      ['Warranty', 'Habitability requires a livable unit.'],
      ['Pattern', 'Deferred maintenance shows an ongoing breach.'],
      ['Causation', 'Medical proof links illness to mold.'],
      ['Damages', 'Property and relocation are straightforward.'],
    ],
    treatmentProgression: [
      { label: 'Symptoms', copy: 'Respiratory and allergic effects documented.' },
      { label: 'Medical care', copy: 'A provider ties symptoms to exposure.' },
      { label: 'Expert input', copy: 'Causation is supported for injury claims.' },
      { label: 'Documentation', copy: 'Bills and relocation costs are recorded.' },
    ],
    settlementDrivers: [
      'Whether a pattern of deferred maintenance is shown',
      'Whether complaints establish notice',
      'Whether medical causation is supported',
      'Whether the evidence was preserved before remediation',
      'Whether retaliation occurred',
      'Property, relocation, and injury damages',
    ],
    settlementValueDetails: [
      { label: 'Pattern helps', copy: 'Ongoing neglect strengthens the claim.' },
      { label: 'Causation is contested', copy: 'Medical proof carries injury claims.' },
      { label: 'Preserve early', copy: 'Remediation destroys evidence.' },
      { label: 'Multiple damages', copy: 'Property and relocation add up.' },
    ],
    insuranceProblems: [
      'The maintenance-request history is never gathered.',
      'The mold was remediated before it was documented.',
      'No medical evidence links the illness to the mold.',
      'Retaliation after complaints is ignored.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How long has the problem persisted?' },
      { label: 'Step 2', question: 'Do you have maintenance-request records?' },
      { label: 'Step 3', question: 'Who is sick, and have they seen a doctor?' },
      { label: 'Step 4', question: 'Has the landlord retaliated?' },
    ],
  },
  [SF_MOLD_SLUG]: {
    scenario: `A San Francisco tenant hesitated to complain about mold for fear of losing a rent-controlled unit. When the landlord threatened eviction after a complaint, the retaliation itself became part of the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report in writing; photograph the mold and moisture.'],
      ['If retaliation', 'Document any eviction threat or rent change.'],
      ['Before remediation', 'Test the mold and preserve the evidence.'],
      ['Longer term', 'Habitability and retaliation claims developed.'],
    ],
    severityLadder: [
      ['Warranty', 'Habitability requires a livable unit.'],
      ['Notice', 'Documented complaints establish knowledge.'],
      ['Retaliation', 'Post-complaint conduct is protected against.'],
      ['Causation', 'Medical proof links illness to mold.'],
    ],
    treatmentProgression: [
      { label: 'Symptoms', copy: 'Respiratory and allergic effects documented.' },
      { label: 'Medical care', copy: 'A provider ties symptoms to exposure.' },
      { label: 'Expert input', copy: 'Causation is supported for injury claims.' },
      { label: 'Documentation', copy: 'Bills and relocation costs are recorded.' },
    ],
    settlementDrivers: [
      'Whether the warranty of habitability was breached',
      'Whether complaints establish notice',
      'Whether retaliation followed a complaint',
      'Whether medical causation is supported',
      'Whether the evidence was preserved before remediation',
      'Property, relocation, and injury damages',
    ],
    settlementValueDetails: [
      { label: 'Retaliation counts', copy: 'It can be a separate claim.' },
      { label: 'Notice matters', copy: 'Documented complaints are key.' },
      { label: 'Causation is contested', copy: 'Medical proof carries injury claims.' },
      { label: 'Preserve early', copy: 'Remediation destroys evidence.' },
    ],
    insuranceProblems: [
      'Fear of eviction kept complaints verbal and undocumented.',
      'Retaliation after a complaint is not documented.',
      'The mold was remediated before it was documented.',
      'No medical evidence links the illness to the mold.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did you complain, and in what form?' },
      { label: 'Step 2', question: 'Did the landlord threaten eviction or a rent change?' },
      { label: 'Step 3', question: 'Who is sick, and have they seen a doctor?' },
      { label: 'Step 4', question: 'Is the unit rent-controlled?' },
    ],
  },
  [LB_MOLD_SLUG]: {
    scenario: `A Long Beach landlord repeatedly painted over recurring mold without fixing the coastal-moisture source. The documented recurrences established that the unit remained uninhabitable. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Report in writing; photograph each recurrence.'],
      ['If recurring', 'Document that only the surface was addressed.'],
      ['Before remediation', 'Test the mold and preserve the evidence.'],
      ['Longer term', 'Habitability breach and causation developed.'],
    ],
    severityLadder: [
      ['Warranty', 'Habitability requires a livable unit.'],
      ['Surface fix', 'Cosmetic repair does not cure the defect.'],
      ['Recurrence', 'Repeated mold shows an ongoing breach.'],
      ['Causation', 'Medical proof links illness to mold.'],
    ],
    treatmentProgression: [
      { label: 'Symptoms', copy: 'Respiratory and allergic effects documented.' },
      { label: 'Medical care', copy: 'A provider ties symptoms to exposure.' },
      { label: 'Expert input', copy: 'Causation is supported for injury claims.' },
      { label: 'Documentation', copy: 'Bills and relocation costs are recorded.' },
    ],
    settlementDrivers: [
      'Whether the moisture source was actually fixed',
      'Whether recurrences show an ongoing breach',
      'Whether complaints establish notice',
      'Whether medical causation is supported',
      'Whether the evidence was preserved before remediation',
      'Property, relocation, and injury damages',
    ],
    settlementValueDetails: [
      { label: 'Surface fixes fail', copy: 'The source must be repaired.' },
      { label: 'Recurrence helps', copy: 'It shows an ongoing breach.' },
      { label: 'Causation is contested', copy: 'Medical proof carries injury claims.' },
      { label: 'Preserve early', copy: 'Remediation destroys evidence.' },
    ],
    insuranceProblems: [
      'Recurrences after cosmetic fixes are never documented.',
      'The mold was remediated before it was documented.',
      'No medical evidence links the illness to the mold.',
      'Complaints were only verbal, leaving no record.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Has the mold come back after cleaning?' },
      { label: 'Step 2', question: 'Did you complain in writing each time?' },
      { label: 'Step 3', question: 'Who is sick, and have they seen a doctor?' },
      { label: 'Step 4', question: 'What is the moisture source?' },
    ],
  },
}
