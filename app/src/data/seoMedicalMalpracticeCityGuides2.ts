import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, medical-malpractice practice area (batch 2): city-specific guides
 * for Santa Ana (Orange County), San Jose, Fresno, and Long Beach, extending the
 * batch-1 hub (Los Angeles, San Francisco, San Diego, Sacramento).
 *
 * Same organising idea as batch 1: the genuinely local, actionable fact is which
 * kind of institution treated the patient, because that decides the deadline.
 * Private care runs under MICRA; a county or UC/Regents hospital is a public
 * entity on the six-month Government Claims Act clock; and a VA or military
 * facility runs under the Federal Tort Claims Act. That mix differs by metro:
 *  - Orange County / Santa Ana: UC Irvine Health (UCI Medical Center, a
 *    UC/Regents public entity) alongside large private systems (Hoag,
 *    Providence), with Kaiser arbitration in play.
 *  - San Jose: Santa Clara Valley Medical Center (a county safety-net public
 *    hospital), Stanford care nearby (private), the VA Palo Alto (federal), and a
 *    dominant Kaiser presence.
 *  - Fresno: the region\u2019s Level I trauma care where UCSF Fresno residents train,
 *    which can implicate the UC/Regents public entity, plus the Fresno VA
 *    (federal) and few alternatives across the Central Valley.
 *  - Long Beach: the VA Long Beach (a major federal facility), the LA County
 *    public hospital system serving the area (Harbor-UCLA nearby), and large
 *    private systems (Long Beach Memorial, MemorialCare).
 *
 * Applied identically to batch 1 (MICRA CCP 340.5; 90-day notice CCP 364; AB 35
 * non-economic cap under Civil Code 3333.2; six-month Government Claims Act for
 * public entities; FTCA Standard Form 95 for federal facilities; admission
 * arbitration frequently contested).
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

export const SANTAANA_MEDMAL_SLUG = '/santa-ana-medical-malpractice-claim'
export const SJ_MEDMAL_SLUG = '/san-jose-medical-malpractice-claim'
export const FRESNO_MEDMAL_SLUG = '/fresno-medical-malpractice-claim'
export const LB_MEDMAL_SLUG = '/long-beach-medical-malpractice-claim'

export const medicalMalpracticeCityGuidePages2: LandingPage[] = [
  {
    slug: SANTAANA_MEDMAL_SLUG,
    category: 'Cities',
    cluster: 'Santa Ana Medical Malpractice Claims',
    title: 'Orange County Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'In Orange County a malpractice claim turns first on the institution: UC Irvine care triggers a six-month clock, a VA facility the federal process, and private systems like Hoag or Providence MICRA\u2019s shorter-than-usual limit.',
    psychology: 'A doctor or hospital in Orange County may have harmed me and I do not know the deadline or whether arbitration applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'orange county medical malpractice lawyer',
      'suing uc irvine medical center malpractice',
      'santa ana surgical error claim california',
      'kaiser malpractice arbitration california',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'UC Irvine (public, six-month)',
      'MICRA deadline (340.5)',
      'Kaiser admission arbitration',
      '90-day notice (364)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Orange County pairs a large, high-end private hospital sector with one major public academic center, which is why the threshold question is who provided the care. ${PUBLIC} UC Irvine Health (UCI Medical Center in Orange) is a University of California facility run by the Regents \u2014 a public entity on the six-month Government Claims Act clock \u2014 while Hoag, Providence and the region\u2019s other large systems run under MICRA, and Kaiser\u2019s presence brings admission arbitration into play. Veterans in the county are often served by the VA Long Beach, which routes a claim to the federal process. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'What kind of institution provided the care \u2014 private, UC Irvine, or VA/military',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Any Kaiser or other enrollment arbitration agreement, and by whom it was signed',
        'Which providers were involved and their roles',
        'Whether a foreign object, fraud, or concealment might toll the deadline',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ classifies the Orange County institution first \u2014 UC Irvine puts a claim on a six-month clock, a VA facility on the federal process, private systems under MICRA \u2014 then gathers the complete chart the standard-of-care question turns on and assesses any arbitration agreement. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at UC Irvine Medical Center. Is the deadline different?',
        a: 'Yes. UC Irvine Health is a University of California facility operated by the Regents, a public entity, so a written claim must be presented within six months of the injury under the Government Claims Act rather than the ordinary MICRA period. The shortened clock is the first thing to protect, because nothing about the treatment itself signals that a public entity is involved.',
      },
      {
        q: 'How long do I have if it was a private hospital like Hoag or Providence?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from when you discovered or should have discovered the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing, so the timeline must be planned carefully.',
      },
      {
        q: 'I have Kaiser. Does arbitration block my claim?',
        a: 'Not block \u2014 it may redirect. Kaiser typically requires an arbitration agreement at enrollment, so a dispute may proceed in arbitration rather than court. Whether and how it applies depends on how and by whom it was signed, and these agreements are frequently contested, so it is worth assessing early rather than assuming it ends the matter.',
      },
      {
        q: 'A bad outcome happened, but was it malpractice?',
        a: 'Not every bad outcome is malpractice. A claim requires that the care fell below the professional standard \u2014 what a reasonably careful provider would have done \u2014 and that the failure caused the harm, established through the complete records and qualified expert review. Obtaining and preserving the full chart early is essential to knowing whether a claim exists.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SJ_MEDMAL_SLUG,
    category: 'Cities',
    cluster: 'San Jose Medical Malpractice Claims',
    title: 'San Jose Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Jose care often means Santa Clara Valley Medical Center \u2014 a county public hospital on a six-month clock \u2014 or Kaiser with its arbitration agreement, each of which reshapes a malpractice claim before the medicine is examined.',
    psychology: 'A hospital or doctor in San Jose may have harmed me and I do not know the deadline or whether arbitration applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose medical malpractice lawyer',
      'santa clara valley medical center malpractice claim',
      'suing a county hospital california claim',
      'kaiser malpractice arbitration california',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'Valley Medical Center (county, six-month)',
      'Kaiser admission arbitration',
      'MICRA deadline (340.5)',
      '90-day notice (364)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s providers weight heavily toward integrated and public systems, which changes a malpractice claim at the outset. ${PUBLIC} Santa Clara Valley Medical Center is a county safety-net public hospital \u2014 a major trauma and specialty center \u2014 so a claim involving it runs on the six-month Government Claims Act clock rather than the MICRA period. Kaiser has a dominant regional presence with admission arbitration, Stanford care in the area is private, and the VA Palo Alto serves local veterans through the federal process. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'Whether care was at Santa Clara Valley Medical Center (county) or a private/federal facility',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Any Kaiser or other enrollment arbitration agreement, and by whom it was signed',
        'Which providers were involved and their roles',
        'Whether a foreign object, fraud, or concealment might toll the deadline',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the San Jose public-entity question immediately \u2014 Santa Clara Valley Medical Center puts a claim on a six-month clock \u2014 assesses a Kaiser arbitration agreement, and gathers the complete chart the standard-of-care analysis depends on. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at Santa Clara Valley Medical Center. Is the deadline different?',
        a: 'Yes, and dramatically. Santa Clara Valley Medical Center is a county public hospital, so the Government Claims Act requires a written claim within six months of the injury rather than the MICRA period. As a county safety-net and trauma center it treats a large volume of serious cases, and the shortened clock is missed constantly because nothing about the care signals it.',
      },
      {
        q: 'I have Kaiser. Does arbitration block my claim?',
        a: 'Not block \u2014 it may redirect. Kaiser typically requires an arbitration agreement at enrollment, so a dispute may proceed in arbitration rather than court. Whether and how it applies depends on how and by whom it was signed, and these agreements are frequently contested, so it is worth assessing early rather than assuming it ends the matter.',
      },
      {
        q: 'How long do I have if it was a private hospital or doctor?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from when you discovered or should have discovered the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing, so the timeline needs to be planned carefully.',
      },
      {
        q: 'Does the MICRA cap mean my claim is not worth pursuing?',
        a: 'Not on its own. MICRA caps non-economic damages such as pain and suffering (Civil Code section 3333.2), and Assembly Bill 35 raised that cap effective 2023 with annual increases. Crucially, the cap does not limit economic damages \u2014 past and future medical costs and lost earnings \u2014 which are often the larger part of a serious claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_MEDMAL_SLUG,
    category: 'Cities',
    cluster: 'Fresno Medical Malpractice Claims',
    title: 'Fresno Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'In the Central Valley the trauma center may be the only option for miles, and whether UCSF Fresno teaching physicians or the Fresno VA were involved can move a malpractice claim onto a public or federal deadline.',
    psychology: 'A hospital or doctor in Fresno may have harmed me and I do not know the deadline or which providers were involved.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno medical malpractice lawyer',
      'ucsf fresno malpractice claim california',
      'central valley surgical error claim',
      'va hospital malpractice claim california',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'UCSF Fresno teaching physicians (UC)',
      'Fresno VA (FTCA, Form 95)',
      'MICRA deadline (340.5)',
      '90-day notice (364)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Fresno is the health-care hub for a wide Central Valley region, so its major hospitals often serve patients with few alternatives for miles \u2014 which makes getting the institutional question right especially important. ${PUBLIC} Fresno\u2019s Level I trauma care is a teaching environment where UCSF Fresno resident and faculty physicians are involved, which can implicate the University of California and the Regents as a public entity on the six-month clock; the Fresno VA is federal, on the Standard Form 95 process; and the region\u2019s private systems run under MICRA. Because the same hospital may be the only realistic provider, understanding exactly which physicians and which entity were responsible is central. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in Fresno County Superior Court.`,
      whatToTrack: [
        'Whether treating physicians were UCSF Fresno faculty or residents, which can implicate the UC/Regents',
        'Whether care was at the VA (federal), a private hospital, or a public entity',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Which providers were involved and their exact roles and affiliations',
        'Whether a foreign object, fraud, or concealment might toll the deadline',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ works out which entity the Fresno care actually implicates \u2014 UCSF Fresno teaching physicians (UC/Regents, six-month), the VA (federal Form 95), or a private provider (MICRA) \u2014 because in a region with few alternatives that classification decides the deadline, then gathers the complete chart. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'UCSF Fresno physicians treated me. Does that change the deadline?',
        a: 'It can. Where the treating faculty or resident physicians are part of UCSF Fresno, the University of California and the Regents \u2014 a public entity \u2014 may be implicated, which would require a written claim within six months of the injury under the Government Claims Act rather than the MICRA period. Because the roles and affiliations of the treating physicians decide this, identifying exactly who was involved is central.',
      },
      {
        q: 'My care was at the Fresno VA. Is the claim different?',
        a: 'Yes, substantially. Care at the VA generally runs under the Federal Tort Claims Act, which requires an administrative claim on a Standard Form 95 to the responsible federal agency, generally within two years, before you can sue. It is a different process and timeline from California\u2019s, and pursuing it incorrectly can forfeit the claim, so it must be identified early.',
      },
      {
        q: 'How long do I have if it was a private hospital or doctor?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from discovery of the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing, so the timeline must be planned rather than assumed.',
      },
      {
        q: 'The hospital was the only trauma center around. Does that affect a claim?',
        a: 'It does not change the legal standard, but it affects the practical picture. A claim still requires that the care fell below the professional standard and caused the harm, proved through the records and expert review. Where a single hospital serves a wide region, identifying which physicians and which entity were responsible \u2014 and obtaining the complete chart \u2014 is often the harder practical step.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_MEDMAL_SLUG,
    category: 'Cities',
    cluster: 'Long Beach Medical Malpractice Claims',
    title: 'Long Beach Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'Long Beach hosts a major VA facility, so many malpractice claims run under the federal process, while LA County public hospitals serving the area trigger a six-month clock \u2014 forks a private-hospital timeline never sees.',
    psychology: 'A hospital or doctor in Long Beach may have harmed me and I do not know if it was VA, county, or private care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach medical malpractice lawyer',
      'va long beach malpractice claim ftca',
      'suing a county hospital california claim',
      'surgical error hospital claim california',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'VA Long Beach (FTCA, Form 95)',
      'LA County public hospital (six-month)',
      'MICRA deadline (340.5)',
      '90-day notice (364)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s medical landscape is shaped by a major federal facility and its place in Los Angeles County, which puts two non-MICRA forks front and centre. ${PUBLIC} The VA Long Beach is a large federal hospital, so a claim arising from its care runs under the Federal Tort Claims Act and its Standard Form 95 process. Residents of the area are also served by the LA County public hospital system \u2014 Harbor-UCLA is nearby \u2014 which is a public entity on the six-month Government Claims Act clock, while Long Beach Memorial, MemorialCare and the region\u2019s other large systems run under MICRA. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'Whether care was at the VA (federal), an LA County public hospital, or a private system',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'For VA care, the facility, which directs a Standard Form 95',
        'Any enrollment or admission arbitration agreement, and by whom it was signed',
        'Whether a foreign object, fraud, or concealment might toll the deadline',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the two Long Beach forks that most often derail a malpractice claim \u2014 VA care, which moves the case onto the Standard Form 95 process, and an LA County public hospital, which puts it on a six-month clock \u2014 and gathers the complete chart the standard-of-care analysis needs. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at the VA Long Beach. Is the claim different?',
        a: 'Yes, substantially. Care at the VA generally runs under the Federal Tort Claims Act, which requires an administrative claim on a Standard Form 95 to the responsible federal agency, generally within two years, before you can sue. It is a different process and timeline from California\u2019s, and pursuing it incorrectly can forfeit the claim, so it must be identified early.',
      },
      {
        q: 'My care was at a county hospital. Is the deadline different?',
        a: 'Yes. An LA County public hospital such as Harbor-UCLA is a public entity, so the Government Claims Act requires a written claim within six months of the injury rather than the MICRA period. The shortened clock is the first thing to protect, because it is missed frequently when a claim is treated as ordinary malpractice.',
      },
      {
        q: 'How long do I have if it was Long Beach Memorial or another private hospital?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from when you discovered or should have discovered the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing.',
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
]

export const medicalMalpracticeCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SANTAANA_MEDMAL_SLUG]: {
    scenario: `An Orange County family pursued a surgical-error claim as ordinary malpractice before learning the operation had been at UC Irvine \u2014 a UC/Regents public entity whose six-month Government Claims Act deadline had nearly passed. Classifying the institution first would have protected the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Classify the institution \u2014 private, UC Irvine, or VA \u2014 and request the complete chart.'],
      ['First weeks', 'Present the six-month government claim if UC Irvine was involved.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs; arbitration assessed.'],
    ],
    severityLadder: [
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['UC Irvine', 'A UC/Regents public entity on a six-month claim.'],
      ['VA', 'Federal Tort Claims Act and Standard Form 95.'],
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
      { label: 'Institution first', copy: 'Private, UC Irvine, or VA decides the deadline and process.' },
      { label: 'Six-month risk', copy: 'UC Irvine shortens the clock dramatically.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'Standard of care is proved through the complete chart.' },
    ],
    insuranceProblems: [
      'A UC Irvine claim is pursued as ordinary malpractice and misses six months.',
      'The complete chart is never obtained.',
      'An arbitration agreement is accepted without challenge.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at a private hospital, UC Irvine, or a VA facility?' },
      { label: 'Step 2', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 3', question: 'Has the complete medical chart been requested?' },
      { label: 'Step 4', question: 'Did you sign an arbitration agreement at enrollment?' },
    ],
  },
  [SJ_MEDMAL_SLUG]: {
    scenario: `A San Jose patient harmed at Santa Clara Valley Medical Center assumed she had the usual MICRA period. Because the hospital is a county public entity, a six-month government claim deadline governed, and identifying that early kept the claim alive. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether care was at Valley Medical Center (county) or elsewhere; request the chart.'],
      ['First weeks', 'Present the six-month government claim if the county hospital was involved.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs; arbitration assessed.'],
    ],
    severityLadder: [
      ['Valley Medical Center', 'A county public entity on a six-month claim.'],
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
      'Whether care was at a county public entity like Valley Medical Center',
      'Whether the applicable deadline was protected',
      'Whether the care fell below the standard and caused the harm',
      'Whether a Kaiser arbitration agreement applies',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'County is public', copy: 'Valley Medical Center runs on the six-month clock.' },
      { label: 'Kaiser arbitration', copy: 'An enrollment agreement may move the dispute out of court.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'Standard of care is proved through the complete chart.' },
    ],
    insuranceProblems: [
      'A county-hospital claim is treated as ordinary malpractice and misses six months.',
      'A Kaiser arbitration agreement is accepted without challenge.',
      'The complete chart is never obtained.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at Valley Medical Center, Kaiser, the VA, or another provider?' },
      { label: 'Step 2', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 3', question: 'Has the complete medical chart been requested?' },
      { label: 'Step 4', question: 'Did you sign an arbitration agreement at enrollment?' },
    ],
  },
  [FRESNO_MEDMAL_SLUG]: {
    scenario: `A Central Valley patient was harmed at Fresno\u2019s trauma center, treated by physicians she did not realise were UCSF Fresno faculty. Because that could implicate the UC/Regents as a public entity, the six-month clock was flagged \u2014 a deadline that would have quietly expired otherwise. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Identify the treating physicians and their affiliations; request the complete chart.'],
      ['First weeks', 'Present the six-month claim if UC/Regents physicians were involved, or Form 95 for VA care.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs.'],
    ],
    severityLadder: [
      ['UCSF Fresno faculty', 'May implicate the UC/Regents on a six-month claim.'],
      ['VA', 'Federal Tort Claims Act and Standard Form 95.'],
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['Few alternatives', 'A single regional provider complicates the practical picture.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, operative and nursing notes tell the story.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Corrective care', copy: 'Later treatment documents the harm and its consequences.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether the treating physicians were UCSF Fresno faculty or residents',
      'Whether care was federal (VA), public, or private',
      'Whether the applicable deadline was protected',
      'Whether the care fell below the standard and caused the harm',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'Who treated you', copy: 'UCSF Fresno affiliation can move the claim to a six-month clock.' },
      { label: 'Federal fork', copy: 'VA care moves the claim to the Standard Form 95 process.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'Standard of care is proved through the complete chart.' },
    ],
    insuranceProblems: [
      'A UC-affiliated claim misses the six-month deadline.',
      'A VA claim is filed as ordinary malpractice and misses the Form 95 step.',
      'The complete chart is never obtained.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were the treating physicians UCSF Fresno faculty or residents?' },
      { label: 'Step 2', question: 'Was the care at the VA, a private hospital, or a public entity?' },
      { label: 'Step 3', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 4', question: 'Has the complete medical chart been requested?' },
    ],
  },
  [LB_MEDMAL_SLUG]: {
    scenario: `A veteran harmed at the VA Long Beach filed what he thought was an ordinary malpractice claim. Because the care was federal, it actually required a Standard Form 95 administrative claim first \u2014 a step that, identified early, kept the Federal Tort Claims Act route open. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether care was VA (federal), LA County (public), or private; request the chart.'],
      ['First weeks', 'File the Standard Form 95 for VA care, or the six-month claim for county care.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs.'],
    ],
    severityLadder: [
      ['VA', 'Federal Tort Claims Act and Standard Form 95.'],
      ['LA County hospital', 'A public entity on a six-month claim.'],
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
      'Whether care was federal (VA), public (LA County), or private',
      'Whether the correct administrative deadline was met',
      'Whether the care fell below the standard and caused the harm',
      'Whether an arbitration agreement applies',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'Federal fork', copy: 'VA care moves the claim to the Standard Form 95 process.' },
      { label: 'County is public', copy: 'An LA County hospital runs on the six-month clock.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'Standard of care is proved through the complete chart.' },
    ],
    insuranceProblems: [
      'A VA claim is filed as ordinary malpractice and misses the Form 95 step.',
      'An LA County hospital claim misses the six-month deadline.',
      'The complete chart is never obtained.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at the VA, an LA County hospital, or a private system?' },
      { label: 'Step 2', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 3', question: 'Has the complete medical chart been requested?' },
      { label: 'Step 4', question: 'For VA care, which facility was involved?' },
    ],
  },
}
