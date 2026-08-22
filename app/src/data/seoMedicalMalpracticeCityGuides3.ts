import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, medical-malpractice practice area (batch 3): city-specific guides
 * for Oakland, Riverside, San Bernardino, and Bakersfield, extending the batch-1
 * and batch-2 hubs. These four metros share a strong local hook: each is anchored
 * by a prominent county public hospital, which puts a malpractice claim on the
 * six-month Government Claims Act clock rather than the MICRA period.
 *
 *  - Oakland: Highland Hospital (Alameda Health System, a county public entity),
 *    UCSF Benioff Children\u2019s Oakland (UC/Regents), and Kaiser\u2019s Oakland home base
 *    with admission arbitration.
 *  - Riverside: Riverside University Health System Medical Center (a county public
 *    entity and the region\u2019s safety-net hospital), the growing UC Riverside
 *    presence, and a shortage of specialists across the Inland Empire.
 *  - San Bernardino: Arrowhead Regional Medical Center (a San Bernardino County
 *    public trauma center), Loma Linda University Medical Center (a major private
 *    referral hospital), and the VA Loma Linda (federal, FTCA).
 *  - Bakersfield: Kern Medical (a Kern County public teaching hospital) alongside
 *    private systems, with few specialists across the southern Central Valley.
 *
 * Applied identically to batches 1 and 2 (MICRA CCP 340.5; 90-day notice CCP 364;
 * AB 35 non-economic cap under Civil Code 3333.2; six-month Government Claims Act
 * for public entities; FTCA Standard Form 95 for federal facilities; admission
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

const FEW_SPECIALISTS =
  'Across the Inland Empire and the Central Valley, specialists are in short supply, so patients are frequently referred, transferred, or left waiting \u2014 and a delayed diagnosis or a failure to transfer in time can itself be the negligence. That makes the timeline of who saw the patient, when, and what was ordered especially important to reconstruct.'

export const OAK_MEDMAL_SLUG = '/oakland-medical-malpractice-claim'
export const RIVERSIDE_MEDMAL_SLUG = '/riverside-medical-malpractice-claim'
export const SANBERNARDINO_MEDMAL_SLUG = '/san-bernardino-medical-malpractice-claim'
export const BAKERSFIELD_MEDMAL_SLUG = '/bakersfield-medical-malpractice-claim'

export const medicalMalpracticeCityGuidePages3: LandingPage[] = [
  {
    slug: OAK_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Medical Malpractice Claims',
    title: 'Oakland Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'Oakland care often means Highland Hospital \u2014 a county public entity on a six-month clock \u2014 or Kaiser at its Oakland home base with an arbitration agreement, each of which reshapes a malpractice claim before the medicine is examined.',
    psychology: 'A hospital or doctor in Oakland may have harmed me and I do not know the deadline or whether arbitration applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland medical malpractice lawyer',
      'highland hospital malpractice claim california',
      'suing a county hospital california claim',
      'kaiser malpractice arbitration california',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'Highland Hospital (county, six-month)',
      'UCSF Benioff Oakland (UC)',
      'Kaiser admission arbitration',
      'MICRA deadline (340.5)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s providers weight heavily toward public and integrated systems, which changes a malpractice claim at the outset. ${PUBLIC} Highland Hospital is part of the Alameda Health System, a county public entity and the region\u2019s safety-net trauma center, so a claim involving it runs on the six-month Government Claims Act clock rather than the MICRA period. UCSF Benioff Children\u2019s Oakland is a University of California facility (UC/Regents), Kaiser is headquartered in Oakland and brings admission arbitration into play, and other systems run under MICRA. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in Alameda County Superior Court.`,
      whatToTrack: [
        'Whether care was at Highland (county), UCSF Benioff Oakland (UC), or a private/federal facility',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Any Kaiser or other enrollment arbitration agreement, and by whom it was signed',
        'Which providers were involved and their roles',
        'Whether a foreign object, fraud, or concealment might toll the deadline',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the Oakland public-entity question immediately \u2014 Highland puts a claim on a six-month clock, UCSF Benioff is also a UC entity \u2014 assesses a Kaiser arbitration agreement, and gathers the complete chart the standard-of-care analysis depends on. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at Highland Hospital. Is the deadline different?',
        a: 'Yes, and dramatically. Highland is part of the Alameda Health System, a county public entity, so the Government Claims Act requires a written claim within six months of the injury rather than the MICRA period. As a county safety-net and trauma center it treats a large volume of serious cases, and the shortened clock is missed constantly because nothing about the care signals it.',
      },
      {
        q: 'I have Kaiser. Does arbitration block my claim?',
        a: 'Not block \u2014 it may redirect. Kaiser, headquartered in Oakland, typically requires an arbitration agreement at enrollment, so a dispute may proceed in arbitration rather than court. Whether and how it applies depends on how and by whom it was signed, and these agreements are frequently contested, so it is worth assessing early rather than assuming it ends the matter.',
      },
      {
        q: 'How long do I have if it was a private hospital or doctor?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from when you discovered or should have discovered the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing.',
      },
      {
        q: 'A bad outcome happened, but was it malpractice?',
        a: 'Not every bad outcome is malpractice. A claim requires that the care fell below the professional standard \u2014 what a reasonably careful provider would have done \u2014 and that the failure caused the harm, established through the complete records and qualified expert review. Obtaining and preserving the full chart early is essential.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: RIVERSIDE_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Riverside Medical Malpractice Claims',
    title: 'Riverside Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'In Riverside the county safety-net hospital anchors serious care on a six-month clock, and an Inland Empire shortage of specialists means a delayed diagnosis or late transfer can itself be the negligence.',
    psychology: 'A hospital or doctor in Riverside may have harmed me and I do not know the deadline or whether a delay was negligent.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside medical malpractice lawyer',
      'riverside university health system malpractice claim',
      'suing a county hospital california claim',
      'delayed diagnosis lawsuit california',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'RUHS Medical Center (county, six-month)',
      'Inland Empire specialist shortage',
      'Delayed diagnosis / late transfer',
      'MICRA deadline (340.5)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s medical care is anchored by a county safety-net hospital and shaped by an Inland Empire shortage of specialists. ${PUBLIC} Riverside University Health System Medical Center is a Riverside County public entity, so a claim involving it runs on the six-month Government Claims Act clock rather than the MICRA period, and the growing UC Riverside medical presence can also implicate the UC/Regents. ${FEW_SPECIALISTS} ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'Whether care was at RUHS (county), a UC-affiliated provider, or a private/federal facility',
        'The full timeline of who saw the patient, when, and what was ordered',
        'Whether a referral, transfer, or specialist consult was delayed or never happened',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Any enrollment or admission arbitration agreement, and by whom it was signed',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ flags whether Riverside care was at the county hospital (a six-month clock) and reconstructs the referral-and-transfer timeline that, in a specialist-short region, is often where the negligence actually lies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at Riverside University Health System. Is the deadline different?',
        a: 'Yes. RUHS Medical Center is a Riverside County public entity, so the Government Claims Act requires a written claim within six months of the injury rather than the MICRA period. As the region\u2019s safety-net hospital it treats a large volume of serious cases, and the shortened clock is missed frequently.',
      },
      {
        q: 'My diagnosis was delayed because no specialist was available. Is that malpractice?',
        a: 'It can be. The Inland Empire has a shortage of specialists, but that does not excuse a failure to refer, transfer, or follow up within the professional standard of care. Whether a delay was negligent turns on what a reasonably careful provider would have done \u2014 including transferring the patient in time \u2014 which is why reconstructing the timeline of who did what, and when, matters so much.',
      },
      {
        q: 'How long do I have if it was a private hospital or doctor?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from discovery of the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing.',
      },
      {
        q: 'Does the MICRA cap mean my claim is not worth pursuing?',
        a: 'Not on its own. MICRA caps non-economic damages such as pain and suffering (Civil Code section 3333.2), raised by Assembly Bill 35 effective 2023 with annual increases. The cap does not limit economic damages \u2014 past and future medical costs and lost earnings \u2014 which are often the larger part of a serious claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SANBERNARDINO_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Bernardino Medical Malpractice Claims',
    title: 'San Bernardino Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'San Bernardino pairs a county trauma center on a six-month clock with the VA Loma Linda on the federal process \u2014 two non-MICRA forks a private-hospital timeline never sees.',
    psychology: 'A hospital or doctor in San Bernardino may have harmed me and I do not know if it was county, VA, or private care.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino medical malpractice lawyer',
      'arrowhead regional medical center malpractice claim',
      'va loma linda malpractice claim ftca',
      'suing a county hospital california claim',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'Arrowhead Regional (county, six-month)',
      'VA Loma Linda (FTCA, Form 95)',
      'Loma Linda University (private referral)',
      'MICRA deadline (340.5)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `San Bernardino\u2019s serious care runs through a county trauma center and a major federal facility, putting two non-MICRA forks front and centre. ${PUBLIC} Arrowhead Regional Medical Center is a San Bernardino County public trauma center, so a claim involving it runs on the six-month Government Claims Act clock. The VA Loma Linda is federal, on the Standard Form 95 process, while Loma Linda University Medical Center is a major private referral hospital running under MICRA. Because the region draws patients from a wide area to these anchor institutions, getting the classification right is decisive. ${FEW_SPECIALISTS} ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'Whether care was at Arrowhead (county), the VA (federal), or Loma Linda/another private facility',
        'The date of the treatment and the date you first suspected something was wrong',
        'For VA care, the facility, which directs a Standard Form 95',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Whether a referral or transfer was delayed across the region',
        'Any enrollment or admission arbitration agreement, and by whom it was signed',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the San Bernardino forks that most often derail a claim \u2014 Arrowhead (county, six-month) and the VA Loma Linda (federal Form 95) \u2014 distinguishes them from private Loma Linda University care under MICRA, and gathers the complete chart. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at Arrowhead Regional Medical Center. Is the deadline different?',
        a: 'Yes. Arrowhead is a San Bernardino County public trauma center, so the Government Claims Act requires a written claim within six months of the injury rather than the MICRA period. The shortened clock is the first thing to protect, because it is missed when a claim is treated as ordinary malpractice.',
      },
      {
        q: 'My care was at the VA Loma Linda. Is the claim different?',
        a: 'Yes, substantially. VA care generally runs under the Federal Tort Claims Act, which requires an administrative claim on a Standard Form 95 to the responsible federal agency, generally within two years, before you can sue. It is a different process and timeline from California\u2019s, and pursuing it incorrectly can forfeit the claim, so it must be identified early.',
      },
      {
        q: 'What about Loma Linda University Medical Center?',
        a: 'Loma Linda University Medical Center is a private referral hospital, so a malpractice claim involving it runs under MICRA: generally one year from discovery or three years from the injury, whichever is first, with a 90-day notice of intent to sue required before filing. It is important not to confuse the private university hospital with the separate federal VA facility.',
      },
      {
        q: 'Was a bad result actually malpractice?',
        a: 'Not necessarily. A claim requires that the care fell below the professional standard and caused the harm, established through the complete records and qualified expert review. Obtaining and preserving the full chart early is essential to knowing whether a claim exists.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Bakersfield Medical Malpractice Claims',
    title: 'Bakersfield Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'Bakersfield\u2019s county teaching hospital anchors serious care on a six-month clock, and a southern Central Valley shortage of specialists means a delayed diagnosis or late transfer can itself be the negligence.',
    psychology: 'A hospital or doctor in Bakersfield may have harmed me and I do not know the deadline or whether a delay was negligent.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield medical malpractice lawyer',
      'kern medical malpractice claim california',
      'suing a county hospital california claim',
      'delayed diagnosis lawsuit california',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'Kern Medical (county, six-month)',
      'Central Valley specialist shortage',
      'Delayed diagnosis / late transfer',
      'MICRA deadline (340.5)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Bakersfield\u2019s serious care runs through a county teaching hospital in a region where specialists are scarce. ${PUBLIC} Kern Medical is a Kern County public teaching hospital, so a claim involving it runs on the six-month Government Claims Act clock rather than the MICRA period, while the area\u2019s private systems run under MICRA. ${FEW_SPECIALISTS} ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'Whether care was at Kern Medical (county) or a private facility',
        'The full timeline of who saw the patient, when, and what was ordered',
        'Whether a referral, transfer, or specialist consult was delayed or never happened',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Any enrollment or admission arbitration agreement, and by whom it was signed',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ flags whether Bakersfield care was at Kern Medical (a county entity on a six-month clock) and reconstructs the referral-and-transfer timeline that, in a specialist-short region, is often where the negligence actually lies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at Kern Medical. Is the deadline different?',
        a: 'Yes. Kern Medical is a Kern County public teaching hospital, so the Government Claims Act requires a written claim within six months of the injury rather than the MICRA period. The shortened clock is the first thing to protect, because it is missed when a claim is treated as ordinary malpractice.',
      },
      {
        q: 'My diagnosis was delayed because no specialist was available. Is that malpractice?',
        a: 'It can be. The southern Central Valley has a shortage of specialists, but that does not excuse a failure to refer, transfer, or follow up within the professional standard of care. Whether a delay was negligent turns on what a reasonably careful provider would have done, which is why reconstructing the timeline of who did what, and when, matters so much.',
      },
      {
        q: 'How long do I have if it was a private hospital or doctor?',
        a: 'Under MICRA (Code of Civil Procedure section 340.5), generally one year from discovery of the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing.',
      },
      {
        q: 'Does the MICRA cap mean my claim is not worth pursuing?',
        a: 'Not on its own. MICRA caps non-economic damages such as pain and suffering (Civil Code section 3333.2), raised by Assembly Bill 35 effective 2023 with annual increases. The cap does not limit economic damages \u2014 past and future medical costs and lost earnings \u2014 which are often the larger part of a serious claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const medicalMalpracticeCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [OAK_MEDMAL_SLUG]: {
    scenario: `An Oakland patient harmed at Highland Hospital assumed she had the usual MICRA period. Because Highland is part of a county public entity, a six-month government claim deadline governed, and identifying that early kept the claim alive. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether care was at Highland (county), UCSF Benioff (UC), or elsewhere; request the chart.'],
      ['First weeks', 'Present the six-month government claim if a public entity was involved.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs; arbitration assessed.'],
    ],
    severityLadder: [
      ['Highland (county)', 'A county public entity on a six-month claim.'],
      ['UCSF Benioff', 'A UC/Regents public entity on a six-month claim.'],
      ['Kaiser', 'An enrollment arbitration agreement may redirect the forum.'],
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, operative and nursing notes tell the story.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Corrective care', copy: 'Later treatment documents the harm and its consequences.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether care was at a county or UC public entity',
      'Whether the applicable deadline was protected',
      'Whether the care fell below the standard and caused the harm',
      'Whether a Kaiser arbitration agreement applies',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'County is public', copy: 'Highland runs on the six-month clock.' },
      { label: 'Kaiser arbitration', copy: 'An Oakland-headquartered enrollment agreement may move the dispute out of court.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'Standard of care is proved through the complete chart.' },
    ],
    insuranceProblems: [
      'A Highland claim is treated as ordinary malpractice and misses six months.',
      'A Kaiser arbitration agreement is accepted without challenge.',
      'The complete chart is never obtained.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at Highland, UCSF Benioff, Kaiser, or another provider?' },
      { label: 'Step 2', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 3', question: 'Has the complete medical chart been requested?' },
      { label: 'Step 4', question: 'Did you sign an arbitration agreement at enrollment?' },
    ],
  },
  [RIVERSIDE_MEDMAL_SLUG]: {
    scenario: `A Riverside patient\u2019s cancer diagnosis was delayed for months while a specialist referral languished. The county safety-net hospital\u2019s six-month clock and the failure-to-refer timeline were the two things that decided whether a claim survived. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Reconstruct who saw the patient and what was ordered; request the complete chart.'],
      ['First weeks', 'Present the six-month claim if RUHS or a UC provider was involved.'],
      ['Assessment', 'Standard-of-care and causation reviewed, focusing on the referral timeline.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs.'],
    ],
    severityLadder: [
      ['RUHS (county)', 'A county public entity on a six-month claim.'],
      ['Delayed referral', 'A failure to refer or transfer may be the negligence.'],
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['Arbitration', 'An enrollment agreement may redirect the forum.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, and consult notes tell the story.' },
      { label: 'The timeline', copy: 'Who saw the patient, when, and what was ordered.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether care was at the county safety-net hospital',
      'Whether a referral or transfer was negligently delayed',
      'Whether the applicable deadline was protected',
      'Whether the care fell below the standard and caused the harm',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'County is public', copy: 'RUHS runs on the six-month clock.' },
      { label: 'Delay is negligence', copy: 'A specialist shortage does not excuse a late referral.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Timeline decides it', copy: 'Who did what, and when, is the heart of a delay claim.' },
    ],
    insuranceProblems: [
      'A county-hospital claim misses the six-month deadline.',
      'A delayed referral is excused as unavoidable given the shortage.',
      'The complete chart and referral timeline are never assembled.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at RUHS, a UC-affiliated provider, or private?' },
      { label: 'Step 2', question: 'Was a referral, transfer, or consult delayed?' },
      { label: 'Step 3', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 4', question: 'Has the complete medical chart been requested?' },
    ],
  },
  [SANBERNARDINO_MEDMAL_SLUG]: {
    scenario: `A San Bernardino veteran harmed at the VA Loma Linda filed what he thought was an ordinary malpractice claim. Because the care was federal, it actually required a Standard Form 95 first \u2014 a step that, identified early, kept the Federal Tort Claims Act route open, and distinct from the county Arrowhead six-month clock. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether care was Arrowhead (county), the VA (federal), or Loma Linda University (private); request the chart.'],
      ['First weeks', 'File the Standard Form 95 for VA care, or the six-month claim for county care.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs.'],
    ],
    severityLadder: [
      ['Arrowhead (county)', 'A county public trauma center on a six-month claim.'],
      ['VA Loma Linda', 'Federal Tort Claims Act and Standard Form 95.'],
      ['Loma Linda University', 'A private referral hospital under MICRA.'],
      ['Arbitration', 'An enrollment agreement may redirect the forum.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, operative and nursing notes tell the story.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Corrective care', copy: 'Later treatment documents the harm and its consequences.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether care was county (Arrowhead), federal (VA), or private (Loma Linda University)',
      'Whether the correct administrative deadline was met',
      'Whether the care fell below the standard and caused the harm',
      'Whether an arbitration agreement applies',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'County is public', copy: 'Arrowhead runs on the six-month clock.' },
      { label: 'Federal fork', copy: 'VA Loma Linda care moves the claim to the Standard Form 95 process.' },
      { label: 'Two Loma Lindas', copy: 'The private university hospital is distinct from the federal VA.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
    ],
    insuranceProblems: [
      'A VA claim is filed as ordinary malpractice and misses the Form 95 step.',
      'An Arrowhead claim misses the six-month deadline.',
      'The private university hospital is confused with the federal VA.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at Arrowhead, the VA Loma Linda, or Loma Linda University?' },
      { label: 'Step 2', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 3', question: 'Has the complete medical chart been requested?' },
      { label: 'Step 4', question: 'For VA care, which facility was involved?' },
    ],
  },
  [BAKERSFIELD_MEDMAL_SLUG]: {
    scenario: `A Bakersfield patient harmed at Kern Medical assumed the MICRA discovery rule gave her time. Because Kern Medical is a county public teaching hospital, a six-month government claim deadline governed, and flagging it early preserved the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether care was at Kern Medical (county) or private; request the chart.'],
      ['First weeks', 'Present the six-month government claim if the county hospital was involved.'],
      ['Assessment', 'Standard-of-care and causation reviewed, focusing on any referral delay.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs.'],
    ],
    severityLadder: [
      ['Kern Medical (county)', 'A county public teaching hospital on a six-month claim.'],
      ['Delayed referral', 'A failure to refer or transfer may be the negligence.'],
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['Arbitration', 'An enrollment agreement may redirect the forum.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, and consult notes tell the story.' },
      { label: 'The timeline', copy: 'Who saw the patient, when, and what was ordered.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether care was at the county teaching hospital',
      'Whether a referral or transfer was negligently delayed',
      'Whether the applicable deadline was protected',
      'Whether the care fell below the standard and caused the harm',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'County is public', copy: 'Kern Medical runs on the six-month clock.' },
      { label: 'Delay is negligence', copy: 'A specialist shortage does not excuse a late referral.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Timeline decides it', copy: 'Who did what, and when, is the heart of a delay claim.' },
    ],
    insuranceProblems: [
      'A Kern Medical claim is treated as ordinary malpractice and misses six months.',
      'A delayed referral is excused as unavoidable given the shortage.',
      'The complete chart and referral timeline are never assembled.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at Kern Medical or a private provider?' },
      { label: 'Step 2', question: 'Was a referral, transfer, or consult delayed?' },
      { label: 'Step 3', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 4', question: 'Has the complete medical chart been requested?' },
    ],
  },
}
