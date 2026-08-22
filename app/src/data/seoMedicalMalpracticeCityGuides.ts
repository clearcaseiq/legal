import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, medical-malpractice practice area: city-specific guides for Los
 * Angeles, San Francisco, San Diego, and Sacramento.
 *
 * Medical malpractice is a distinct claim type governed by MICRA, and the
 * genuinely local, actionable fact is which kind of institution treated the
 * patient. A private hospital or physician runs under MICRA's ordinary rules; a
 * public hospital \u2014 a county facility or a University of California medical
 * center run by the Regents \u2014 is a public entity, so the Government Claims Act's
 * six-month presentation deadline applies; and a federal facility (a VA or
 * military hospital) runs under the Federal Tort Claims Act with its own
 * administrative claim. That mix differs by metro, which makes the deadline both
 * local and decisive.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: a vast mix of private systems, the LA County public hospitals
 *    (LAC+USC, Harbor-UCLA, Olive View-UCLA), and the VA Greater Los Angeles \u2014
 *    three different deadline regimes in one city.
 *  - San Francisco: UCSF (a UC/Regents public entity), Zuckerberg San Francisco
 *    General (a city-and-county public hospital), the SF VA, and a heavy Kaiser
 *    presence with admission arbitration.
 *  - San Diego: UC San Diego Health (Regents), county facilities, a large
 *    military and veteran care footprint (Naval Medical Center San Diego, VA San
 *    Diego) that routes claims to the FTCA, and private systems.
 *  - Sacramento: UC Davis Medical Center (Regents), county facilities, the VA
 *    Northern California, and a dominant Kaiser presence whose admission
 *    arbitration agreements are routinely in play.
 *
 * Applied accurately:
 *  - MICRA sets the statute of limitations (Code of Civil Procedure section
 *    340.5): one year from discovery of the injury, or three years from the
 *    injury, whichever is first, with tolling for fraud, concealment, or a
 *    foreign object.
 *  - A 90-day notice of intent to sue is required before filing (Code of Civil
 *    Procedure section 364).
 *  - MICRA caps non-economic damages (Civil Code section 3333.2); Assembly Bill
 *    35 raised the cap effective January 1, 2023 and steps it up annually \u2014 the
 *    cap does not limit economic damages such as medical costs and lost earnings.
 *  - A public hospital (county or UC/Regents) is a public entity, so a written
 *    claim must be presented within six months under the Government Claims Act.
 *  - A federal facility (VA or military) runs under the Federal Tort Claims Act,
 *    which requires an administrative claim on a Standard Form 95, generally
 *    within two years, before suit.
 *  - Admission arbitration agreements are common, especially with Kaiser, and
 *    their enforceability depends on how and by whom they were signed.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Which deadline applies, whether care fell below the standard, and whether an arbitration agreement is enforceable depend on facts a licensed California attorney should review promptly.'

const MICRA_SOL =
  'Medical-malpractice deadlines are set by MICRA (Code of Civil Procedure section 340.5): one year from when the patient discovered or should have discovered the injury, or three years from the injury itself, whichever comes first \u2014 shorter and more complex than the ordinary two-year rule, with limited tolling for fraud, concealment, or a foreign object left in the body.'

const NOTICE =
  'Before filing a medical-malpractice suit, California requires a 90-day notice of intent to sue (Code of Civil Procedure section 364). It is a procedural step that is easy to overlook and that interacts with the statute of limitations, so it needs to be planned rather than discovered late.'

const CAP =
  'MICRA caps non-economic damages \u2014 pain and suffering \u2014 under Civil Code section 3333.2. Assembly Bill 35 raised that cap effective January 1, 2023 and steps it up each year, and separate, higher caps apply in wrongful-death cases. The cap does not limit economic damages such as past and future medical costs and lost earnings, so how a case is valued depends heavily on the economic side.'

const PUBLIC =
  'The single most consequential local question is what kind of institution provided the care. A private hospital or physician runs under MICRA\u2019s ordinary rules. A public hospital \u2014 a county facility, or a University of California medical center run by the Regents \u2014 is a public entity, so a written claim must be presented within six months under the Government Claims Act, far shorter than the MICRA period. A federal facility, a VA or military hospital, runs under the Federal Tort Claims Act with an administrative claim on a Standard Form 95. Getting this classification wrong can forfeit an otherwise strong claim.'

const ARBITRATION =
  'Many health systems \u2014 Kaiser most prominently \u2014 ask patients to sign an arbitration agreement at enrollment or admission, which can move a dispute out of court. Whether it binds the patient depends on how and by whom it was signed and how it was presented, and these agreements are frequently contested, so an enrollment packet does not automatically foreclose a claim.'

const STANDARD =
  'A medical-malpractice claim is not about a bad outcome; it is about whether the care fell below the professional standard \u2014 what a reasonably careful provider would have done in the same circumstances \u2014 and whether that failure caused the harm. It is proved through the medical records and qualified expert review, which is why obtaining and preserving the complete chart early matters.'

export const LA_MEDMAL_SLUG = '/los-angeles-medical-malpractice-claim'
export const SF_MEDMAL_SLUG = '/san-francisco-medical-malpractice-claim'
export const SD_MEDMAL_SLUG = '/san-diego-medical-malpractice-claim'
export const SAC_MEDMAL_SLUG = '/sacramento-medical-malpractice-claim'

export const medicalMalpracticeCityGuidePages: LandingPage[] = [
  {
    slug: LA_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Los Angeles Medical Malpractice Claims',
    title: 'Los Angeles Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'In LA the first question in a malpractice claim is often the deadline: a county or UC hospital triggers a six-month clock, a VA hospital the federal process, and a private one MICRA\u2019s shorter-than-usual limit.',
    psychology: 'A doctor or hospital in LA may have harmed me or a loved one and I do not know if I have a claim or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles medical malpractice lawyer',
      'surgical error hospital claim california',
      'misdiagnosis lawsuit california deadline',
      'suing a county hospital california claim',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'MICRA deadline (340.5)',
      'Public vs private vs VA hospital',
      '90-day notice (364)',
      'MICRA non-economic cap',
      'Kaiser admission arbitration',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Los Angeles contains three different medical-malpractice deadline regimes side by side, which is why the threshold question here is not what went wrong but who provided the care. ${PUBLIC} LA runs some of the largest public hospitals in the state \u2014 LAC+USC, Harbor-UCLA and Olive View-UCLA are county facilities, and the VA Greater Los Angeles is federal \u2014 alongside a vast private sector. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'What kind of institution provided the care \u2014 private, county, UC, or VA/military',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Which providers were involved and their roles',
        'Any arbitration agreement signed at enrollment or admission, and by whom',
        'Whether a foreign object, fraud, or concealment might toll the deadline',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ first classifies the LA institution \u2014 private, county, UC, or federal \u2014 because that decides whether the six-month, the MICRA, or the FTCA clock governs, then gathers the complete chart the standard-of-care question turns on and assesses any admission arbitration agreement. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'How long do I have to bring a medical-malpractice claim in California?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from when you discovered or should have discovered the injury, or three years from the injury itself, whichever is first \u2014 with limited tolling for fraud, concealment, or a foreign object. But if a county or UC hospital was involved, a six-month government claim deadline applies instead, and a VA or military facility runs on the federal process, so the institution decides the clock.',
      },
      {
        q: 'The hospital was a county or UC facility. Is the deadline different?',
        a: 'Yes, and dramatically. A county hospital and a University of California medical center run by the Regents are public entities, so the Government Claims Act requires a written claim within six months of the injury rather than the MICRA period. LAC+USC, Harbor-UCLA and Olive View-UCLA are county facilities, so a claim involving one of them is on the short clock, which is missed constantly because nothing about the care signals it.',
      },
      {
        q: 'A bad outcome happened, but was it malpractice?',
        a: 'Not every bad outcome is malpractice. A claim requires that the care fell below the professional standard \u2014 what a reasonably careful provider would have done \u2014 and that the failure caused the harm. That is established through the complete medical records and qualified expert review, so obtaining and preserving the full chart early is essential to knowing whether a claim exists.',
      },
      {
        q: 'I signed a Kaiser arbitration agreement. Can I still bring a claim?',
        a: 'Often, yes, but through arbitration rather than court. Kaiser and other systems commonly require an arbitration agreement at enrollment, and whether and how it applies depends on how and by whom it was signed. These agreements are frequently contested, and a claim can still proceed \u2014 it simply may proceed in a different forum, which is worth understanding early.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Francisco Medical Malpractice Claims',
    title: 'San Francisco Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Francisco care often means UCSF or SF General \u2014 both public entities on a six-month clock \u2014 or Kaiser with its arbitration agreement, each of which changes a malpractice claim before the medicine is even examined.',
    psychology: 'A hospital or doctor in San Francisco may have harmed me and I do not know the deadline or whether arbitration applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco medical malpractice lawyer',
      'suing ucsf medical malpractice claim',
      'sf general hospital malpractice deadline',
      'kaiser malpractice arbitration california',
      'misdiagnosis lawsuit california deadline',
    ],
    signals: [
      'UCSF / SF General (public, six-month)',
      'MICRA deadline (340.5)',
      'Kaiser admission arbitration',
      '90-day notice (364)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `In San Francisco the leading providers are heavily weighted toward public and integrated systems, which changes a malpractice claim at the outset. ${PUBLIC} UCSF is a University of California medical center run by the Regents, and Zuckerberg San Francisco General is a city-and-county hospital \u2014 both public entities, so a claim involving either runs on the six-month Government Claims Act clock rather than the MICRA period. The SF VA is federal, and Kaiser\u2019s large local presence brings admission arbitration into play. ${ARBITRATION} ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} Because the City and County of San Francisco are a single consolidated government, private civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'Whether care was at UCSF or SF General (public) or a private or federal facility',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Any Kaiser or other enrollment arbitration agreement, and by whom it was signed',
        'Which providers were involved and their roles',
        'Whether a foreign object, fraud, or concealment might toll the deadline',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the San Francisco public-entity question immediately \u2014 UCSF and SF General put a claim on a six-month clock \u2014 and assesses a Kaiser arbitration agreement, while gathering the complete chart the standard-of-care analysis depends on. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at UCSF. Is a malpractice claim different there?',
        a: 'Yes. UCSF is a University of California medical center operated by the Regents, which is a public entity, so a written claim must be presented within six months of the injury under the Government Claims Act rather than under the ordinary MICRA period. That is a much shorter clock, and it is missed frequently because nothing about the treatment itself signals that a public entity is involved.',
      },
      {
        q: 'What about SF General?',
        a: 'Zuckerberg San Francisco General is a city-and-county public hospital, so the same six-month Government Claims Act deadline applies to a malpractice claim involving it. As with UCSF, the shortened clock is the first thing to protect, because the MICRA discovery rule that patients often rely on does not extend a public-entity claim.',
      },
      {
        q: 'How long do I have if it was a private hospital or doctor?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from when you discovered or should have discovered the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing, so the timeline needs to be planned carefully.',
      },
      {
        q: 'I have Kaiser. Does arbitration block my claim?',
        a: 'Not block \u2014 it may redirect. Kaiser typically requires an arbitration agreement at enrollment, so a dispute may proceed in arbitration rather than court. Whether and how it applies depends on how and by whom it was signed, and these agreements are frequently contested, so it is worth assessing early rather than assuming it ends the matter.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Diego Medical Malpractice Claims',
    title: 'San Diego Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Diego\u2019s large military and veteran care footprint means many malpractice claims run under the federal process, while UC San Diego care triggers a six-month clock \u2014 two forks that a private-hospital timeline never sees.',
    psychology: 'A hospital or doctor in San Diego may have harmed me and I do not know if it was military, UC, or private care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego medical malpractice lawyer',
      'military hospital malpractice claim ftca',
      'suing uc san diego health malpractice',
      'va hospital malpractice claim california',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'Military / VA (FTCA, Form 95)',
      'UC San Diego (public, six-month)',
      'MICRA deadline (340.5)',
      '90-day notice (364)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s medical landscape is shaped by an unusually large military and veteran care presence, which puts the federal fork front and centre. ${PUBLIC} A claim arising from care at Naval Medical Center San Diego or the VA San Diego runs under the Federal Tort Claims Act, which requires an administrative claim on a Standard Form 95, generally within two years, before any lawsuit \u2014 a wholly different process from the state\u2019s. UC San Diego Health is a University of California facility run by the Regents, a public entity on the six-month Government Claims Act clock, while the region\u2019s large private systems run under MICRA. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Whether care was military or VA (federal), UC San Diego (public), or private',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'For military or VA care, the facility and command, which direct a Standard Form 95',
        'Any enrollment or admission arbitration agreement, and by whom it was signed',
        'Whether a foreign object, fraud, or concealment might toll the deadline',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the two San Diego forks that most often derail a malpractice claim \u2014 federal military or VA care, which moves the case onto the Standard Form 95 process, and UC San Diego, which puts it on a six-month clock \u2014 and gathers the complete chart the standard-of-care analysis needs. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at a military or VA hospital. Is the claim different?',
        a: 'Yes, substantially. Care at a military hospital such as Naval Medical Center San Diego or at the VA San Diego generally runs under the Federal Tort Claims Act, which requires an administrative claim on a Standard Form 95 to the responsible federal agency, generally within two years, before you can sue. It is a different process and timeline from California\u2019s, and pursuing it incorrectly can forfeit the claim, so it must be identified early.',
      },
      {
        q: 'My care was at UC San Diego Health. Does that change the deadline?',
        a: 'Yes. UC San Diego Health is a University of California facility operated by the Regents, a public entity, so a written claim must be presented within six months of the injury under the Government Claims Act rather than the ordinary MICRA period. The shortened clock is the first thing to protect.',
      },
      {
        q: 'How long do I have if it was a private hospital or doctor?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from discovery of the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing, so the timeline must be planned rather than assumed.',
      },
      {
        q: 'Was a bad result actually malpractice?',
        a: 'Not necessarily. A claim requires that the care fell below the professional standard \u2014 what a reasonably careful provider would have done \u2014 and that the failure caused the harm, established through the complete records and qualified expert review. Obtaining and preserving the full chart early is essential to knowing whether a claim exists.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Sacramento Medical Malpractice Claims',
    title: 'Sacramento Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'Sacramento care often means UC Davis \u2014 a public entity on a six-month clock \u2014 or Kaiser with its arbitration agreement, each of which reshapes a malpractice claim before the medicine is examined.',
    psychology: 'A hospital or doctor in Sacramento may have harmed me and I do not know the deadline or whether arbitration applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento medical malpractice lawyer',
      'suing uc davis medical center malpractice',
      'kaiser malpractice arbitration california',
      'misdiagnosis lawsuit california deadline',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'UC Davis (public, six-month)',
      'Kaiser admission arbitration',
      'MICRA deadline (340.5)',
      '90-day notice (364)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s two dominant providers pull a malpractice claim in different procedural directions from the start. ${PUBLIC} UC Davis Medical Center is a University of California facility run by the Regents, a public entity, so a claim involving it runs on the six-month Government Claims Act clock rather than the MICRA period. Kaiser has a dominant regional presence and routinely requires an arbitration agreement at enrollment. ${ARBITRATION} The VA Northern California is federal, on the Standard Form 95 process, while other private systems run under MICRA. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} Private civil cases are filed in Sacramento County Superior Court.`,
      whatToTrack: [
        'Whether care was at UC Davis (public), Kaiser, the VA (federal), or another private provider',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Any Kaiser or other enrollment arbitration agreement, and by whom it was signed',
        'Which providers were involved and their roles',
        'Whether a foreign object, fraud, or concealment might toll the deadline',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the Sacramento forks immediately \u2014 UC Davis puts a claim on a six-month clock, Kaiser brings an arbitration agreement, the VA the federal process \u2014 and gathers the complete chart the standard-of-care question turns on. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at UC Davis Medical Center. Is the deadline different?',
        a: 'Yes. UC Davis Medical Center is a University of California facility operated by the Regents, a public entity, so a written claim must be presented within six months of the injury under the Government Claims Act rather than the ordinary MICRA period. That shortened clock is the first thing to protect, because the MICRA discovery rule does not extend a public-entity claim.',
      },
      {
        q: 'I have Kaiser. Does arbitration block my claim?',
        a: 'Not block \u2014 it may redirect. Kaiser typically requires an arbitration agreement at enrollment, so a dispute may proceed in arbitration rather than court. Whether and how it applies depends on how and by whom it was signed, and these agreements are frequently contested, so it is worth assessing early rather than assuming it ends the matter.',
      },
      {
        q: 'How long do I have if it was another private hospital or doctor?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from when you discovered or should have discovered the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing, so the timeline needs to be planned carefully.',
      },
      {
        q: 'Does the MICRA cap mean my claim is not worth pursuing?',
        a: 'Not on its own. MICRA caps non-economic damages such as pain and suffering (Civil Code section 3333.2), and Assembly Bill 35 raised that cap effective 2023 with annual increases. Crucially, the cap does not limit economic damages \u2014 past and future medical costs and lost earnings \u2014 which are often the larger part of a serious claim, so value depends heavily on the economic side.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const medicalMalpracticeCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_MEDMAL_SLUG]: {
    scenario: `An LA family pursued a surgical-error claim for months as an ordinary malpractice case before learning the surgery had been at a county hospital \u2014 a public entity whose six-month Government Claims Act deadline had nearly passed. Classifying the institution first would have protected the claim from the start. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Classify the institution \u2014 private, county, UC, or VA \u2014 and request the complete chart.'],
      ['First weeks', 'Present the six-month government claim if a county or UC hospital was involved.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice of intent to sue prepared where MICRA governs.'],
    ],
    severityLadder: [
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['County or UC', 'Public entity on a six-month claim.'],
      ['VA / military', 'Federal Tort Claims Act and Standard Form 95.'],
      ['Arbitration', 'A Kaiser or similar agreement may redirect the forum.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, operative and nursing notes tell the story.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Corrective care', copy: 'Later treatment documents the harm and its consequences.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'What kind of institution provided the care',
      'Whether the applicable deadline was protected',
      'Whether the care fell below the standard and caused the harm',
      'Whether an arbitration agreement applies',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'Institution first', copy: 'Private, county, UC, or VA decides the deadline and process.' },
      { label: 'Six-month risk', copy: 'A county or UC hospital shortens the clock dramatically.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'Standard of care is proved through the complete chart.' },
    ],
    insuranceProblems: [
      'A public-hospital claim is pursued as ordinary malpractice and misses six months.',
      'The complete chart is never obtained, leaving the standard-of-care question unanswerable.',
      'An arbitration agreement is accepted without challenge.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at a private, county, UC, or VA/military facility?' },
      { label: 'Step 2', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 3', question: 'Has the complete medical chart been requested?' },
      { label: 'Step 4', question: 'Did you sign an arbitration agreement at enrollment?' },
    ],
  },
  [SF_MEDMAL_SLUG]: {
    scenario: `A San Francisco patient harmed at UCSF assumed she had the usual MICRA period to act. Because UCSF is a UC/Regents public entity, a six-month government claim deadline actually governed, and identifying that early was what kept the claim alive. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether care was at UCSF or SF General (public) or elsewhere; request the chart.'],
      ['First weeks', 'Present the six-month government claim if a public hospital was involved.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs; arbitration assessed.'],
    ],
    severityLadder: [
      ['UCSF / SF General', 'Public entities on a six-month claim.'],
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['Kaiser', 'An enrollment arbitration agreement may redirect the forum.'],
      ['VA', 'Federal Tort Claims Act and Standard Form 95.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, operative and nursing notes tell the story.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Corrective care', copy: 'Later treatment documents the harm and its consequences.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether care was at a public entity like UCSF or SF General',
      'Whether the applicable deadline was protected',
      'Whether the care fell below the standard and caused the harm',
      'Whether a Kaiser arbitration agreement applies',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'UCSF is public', copy: 'A UC/Regents facility runs on the six-month clock.' },
      { label: 'SF General too', copy: 'A city-and-county hospital carries the same short deadline.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'Standard of care is proved through the complete chart.' },
    ],
    insuranceProblems: [
      'A UCSF or SF General claim is treated as ordinary malpractice and misses six months.',
      'The complete chart is never obtained.',
      'A Kaiser arbitration agreement is accepted without challenge.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at UCSF, SF General, Kaiser, the VA, or another provider?' },
      { label: 'Step 2', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 3', question: 'Has the complete medical chart been requested?' },
      { label: 'Step 4', question: 'Did you sign an arbitration agreement at enrollment?' },
    ],
  },
  [SD_MEDMAL_SLUG]: {
    scenario: `A veteran harmed at a San Diego VA hospital filed what he thought was an ordinary malpractice claim. Because the care was federal, it actually required a Standard Form 95 administrative claim first \u2014 a step that, identified early, kept the Federal Tort Claims Act route open. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether care was military/VA (federal), UC San Diego (public), or private; request the chart.'],
      ['First weeks', 'File the Standard Form 95 for federal care, or the six-month claim for UC/county care.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs.'],
    ],
    severityLadder: [
      ['VA / military', 'Federal Tort Claims Act and Standard Form 95.'],
      ['UC San Diego', 'A UC/Regents public entity on a six-month claim.'],
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['Arbitration', 'An enrollment agreement may redirect the forum.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, operative and nursing notes tell the story.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Corrective care', copy: 'Later treatment documents the harm and its consequences.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether care was federal (VA/military), public (UC San Diego), or private',
      'Whether the correct administrative deadline was met',
      'Whether the care fell below the standard and caused the harm',
      'Whether an arbitration agreement applies',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'Federal fork', copy: 'VA or military care moves the claim to the Standard Form 95 process.' },
      { label: 'UC is public', copy: 'UC San Diego runs on the six-month government-claims clock.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'Standard of care is proved through the complete chart.' },
    ],
    insuranceProblems: [
      'A VA or military claim is filed as ordinary malpractice and misses the Form 95 step.',
      'A UC San Diego claim misses the six-month deadline.',
      'The complete chart is never obtained.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care military/VA, UC San Diego, or private?' },
      { label: 'Step 2', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 3', question: 'Has the complete medical chart been requested?' },
      { label: 'Step 4', question: 'For federal care, which facility and command was involved?' },
    ],
  },
  [SAC_MEDMAL_SLUG]: {
    scenario: `A Sacramento patient harmed at UC Davis assumed the MICRA discovery rule gave her time. Because UC Davis is a UC/Regents public entity, a six-month government claim deadline governed, and flagging it early is what preserved the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether care was at UC Davis (public), Kaiser, the VA, or another provider; request the chart.'],
      ['First weeks', 'Present the six-month government claim if UC Davis or a county facility was involved.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs; arbitration assessed.'],
    ],
    severityLadder: [
      ['UC Davis', 'A UC/Regents public entity on a six-month claim.'],
      ['Kaiser', 'An enrollment arbitration agreement may redirect the forum.'],
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['VA', 'Federal Tort Claims Act and Standard Form 95.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, operative and nursing notes tell the story.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Corrective care', copy: 'Later treatment documents the harm and its consequences.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether care was at UC Davis (public), Kaiser, the VA, or another private provider',
      'Whether the applicable deadline was protected',
      'Whether the care fell below the standard and caused the harm',
      'Whether a Kaiser arbitration agreement applies',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'UC Davis is public', copy: 'A UC/Regents facility runs on the six-month clock.' },
      { label: 'Kaiser arbitration', copy: 'An enrollment agreement may move the dispute out of court.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'Standard of care is proved through the complete chart.' },
    ],
    insuranceProblems: [
      'A UC Davis claim is treated as ordinary malpractice and misses six months.',
      'A Kaiser arbitration agreement is accepted without challenge.',
      'The complete chart is never obtained.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at UC Davis, Kaiser, the VA, or another provider?' },
      { label: 'Step 2', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 3', question: 'Has the complete medical chart been requested?' },
      { label: 'Step 4', question: 'Did you sign an arbitration agreement at enrollment?' },
    ],
  },
}
