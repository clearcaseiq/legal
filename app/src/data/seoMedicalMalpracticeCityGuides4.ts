import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, medical-malpractice practice area (batch 4): city-specific guides
 * for Anaheim, Stockton, Modesto, and Chula Vista, extending batches 1-3. Unlike
 * batch 3 (which shared a county-hospital hook), these four each carry a distinct
 * local institution profile:
 *
 *  - Anaheim: private-heavy (Kaiser Anaheim admission arbitration; AHMC Anaheim
 *    Regional; West Anaheim), plus CHOC Children\u2019s as a private pediatric referral
 *    center and a large tourist/visitor patient population. Orange County\u2019s public
 *    fork sits at UC Irvine (UC/Regents, six-month).
 *  - Stockton: San Joaquin General Hospital (a San Joaquin County public entity in
 *    French Camp, six-month) alongside private systems, with Central Valley
 *    specialist shortages and frequent transfers.
 *  - Modesto: private-heavy (Doctors Medical Center; Memorial/Sutter) with no
 *    operating county hospital, so serious and indigent cases route and transfer
 *    \u2014 a delay-and-transfer angle rather than a county-deadline one.
 *  - Chula Vista / South Bay: private (Sharp Chula Vista, Scripps) near the border,
 *    with UC San Diego as the county referral and San Diego\u2019s Navy/VA facilities as
 *    a federal (FTCA) fork for military families.
 *
 * Applied identically to earlier batches (MICRA CCP 340.5; 90-day notice CCP 364;
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
  'Across the Central Valley, specialists are in short supply, so patients are frequently referred, transferred, or left waiting \u2014 and a delayed diagnosis or a failure to transfer in time can itself be the negligence. That makes the timeline of who saw the patient, when, and what was ordered especially important to reconstruct.'

export const ANAHEIM_MEDMAL_SLUG = '/anaheim-medical-malpractice-claim'
export const STOCKTON_MEDMAL_SLUG = '/stockton-medical-malpractice-claim'
export const MODESTO_MEDMAL_SLUG = '/modesto-medical-malpractice-claim'
export const CHULAVISTA_MEDMAL_SLUG = '/chula-vista-medical-malpractice-claim'

export const medicalMalpracticeCityGuidePages4: LandingPage[] = [
  {
    slug: ANAHEIM_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Anaheim Medical Malpractice Claims',
    title: 'Anaheim Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'Anaheim care is largely private \u2014 Kaiser with its admission arbitration, community hospitals, and CHOC for children \u2014 with Orange County\u2019s public fork at UC Irvine and a large visitor population whose home-state coverage complicates a claim.',
    psychology: 'A hospital or doctor in Anaheim may have harmed me or my child and I do not know the deadline or whether arbitration applies.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim medical malpractice lawyer',
      'kaiser malpractice arbitration california',
      'choc children hospital malpractice claim',
      'medical malpractice statute of limitations california',
      'child birth injury malpractice orange county',
    ],
    signals: [
      'Kaiser Anaheim arbitration',
      'CHOC pediatric referral',
      'UC Irvine (UC, six-month)',
      'Visitor / out-of-state patients',
      'MICRA deadline (340.5)',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s hospitals are predominantly private, which keeps most claims under MICRA but puts two other questions front and centre. ${ARBITRATION} Kaiser has a large Anaheim presence, so admission arbitration is common, and CHOC Children\u2019s is a major private pediatric referral centre, meaning children\u2019s cases here often involve specialised care and their own minors\u2019 deadline rules. ${PUBLIC} Orange County\u2019s public fork sits at UC Irvine (UC/Regents, six-month), and a federal VA or military facility would move a case to the Standard Form 95 process. Anaheim\u2019s large visitor population adds a wrinkle: an out-of-state patient\u2019s home health plan and travel complicate records and coordination, but the California treatment governs the claim. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} Private civil cases are filed in Orange County Superior Court.`,
      whatToTrack: [
        'Whether care was private (Kaiser, a community hospital, CHOC) or at a UC/public or federal facility',
        'Any Kaiser or other enrollment or admission arbitration agreement, and by whom it was signed',
        'For a child, the birth or treatment date and the specific pediatric providers',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'For a visitor, the home health plan and any out-of-state follow-up records',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ assesses the Anaheim arbitration question, distinguishes private care from the UC Irvine public fork, handles the minors\u2019 deadline rules for CHOC pediatric cases, and gathers the complete chart even when a visitor\u2019s records are spread across states. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I have Kaiser. Does arbitration block my Anaheim claim?',
        a: 'Not block \u2014 it may redirect. Kaiser typically requires an arbitration agreement at enrollment, so a dispute may proceed in arbitration rather than court. Whether and how it applies depends on how and by whom it was signed, and these agreements are frequently contested, so it is worth assessing early rather than assuming it ends the matter.',
      },
      {
        q: 'My child was harmed at CHOC. Is the deadline different?',
        a: 'Cases involving children have their own rules. CHOC Children\u2019s is a private pediatric referral centre, so MICRA generally applies, but the limitations rules for minors differ from those for adults \u2014 for injuries to a child under six there is a longer outside window, and other special provisions can apply. Because the rules are specific and the stakes for a child are high, it is important to have them assessed promptly.',
      },
      {
        q: 'I was visiting from out of state when I was treated. Which law applies?',
        a: 'The California treatment generally governs the malpractice claim regardless of where you live, so California\u2019s MICRA deadlines and rules apply. The practical complication is records: your home health plan and any follow-up care out of state need to be gathered alongside the California chart, which is worth starting early.',
      },
      {
        q: 'A bad outcome happened, but was it malpractice?',
        a: 'Not every bad outcome is malpractice. A claim requires that the care fell below the professional standard \u2014 what a reasonably careful provider would have done \u2014 and that the failure caused the harm, established through the complete records and qualified expert review.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the arbitration question so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: STOCKTON_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Stockton Medical Malpractice Claims',
    title: 'Stockton Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'Stockton\u2019s county hospital puts serious care on a six-month clock, and a Central Valley shortage of specialists means a delayed diagnosis or a late transfer to Sacramento or the Bay Area can itself be the negligence.',
    psychology: 'A hospital or doctor in Stockton may have harmed me and I do not know the deadline or whether a delay was negligent.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'stockton medical malpractice lawyer',
      'san joaquin general hospital malpractice claim',
      'suing a county hospital california claim',
      'delayed diagnosis lawsuit california',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'San Joaquin General (county, six-month)',
      'Central Valley specialist shortage',
      'Delayed diagnosis / late transfer',
      'MICRA deadline (340.5)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Stockton\u2019s serious care runs through a county safety-net hospital in a region where specialists are scarce. ${PUBLIC} San Joaquin General Hospital, in nearby French Camp, is a San Joaquin County public entity, so a claim involving it runs on the six-month Government Claims Act clock rather than the MICRA period, while the area\u2019s private systems run under MICRA. ${FEW_SPECIALISTS} Complex cases are frequently transferred to Sacramento or the Bay Area, and a failure to transfer in time can be the negligence. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in San Joaquin County Superior Court.`,
      whatToTrack: [
        'Whether care was at San Joaquin General (county) or a private facility',
        'The full timeline of who saw the patient, when, and what was ordered',
        'Whether a referral, transfer, or specialist consult was delayed or never happened',
        'Whether and when the patient was transferred to Sacramento or the Bay Area',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ flags whether Stockton care was at the county hospital (a six-month clock) and reconstructs the referral-and-transfer timeline that, in a specialist-short region that ships complex cases out, is often where the negligence actually lies. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at San Joaquin General Hospital. Is the deadline different?',
        a: 'Yes. San Joaquin General is a San Joaquin County public entity, so the Government Claims Act requires a written claim within six months of the injury rather than the MICRA period. As the region\u2019s safety-net hospital it treats a large volume of serious cases, and the shortened clock is missed constantly because nothing about the care signals it.',
      },
      {
        q: 'I was not transferred in time and got worse. Is that malpractice?',
        a: 'It can be. The Central Valley has a shortage of specialists, and complex cases are often transferred to Sacramento or the Bay Area \u2014 but that does not excuse a failure to transfer or refer within the professional standard of care. Whether a delay was negligent turns on what a reasonably careful provider would have done, which is why reconstructing the timeline of who did what, and when, matters so much.',
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
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the transfer timeline so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: MODESTO_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Modesto Medical Malpractice Claims',
    title: 'Modesto Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'Modesto\u2019s care is almost entirely private, so most claims run under MICRA \u2014 but with few local specialists and no county hospital, a delayed diagnosis or a late transfer to a Bay Area or Sacramento centre is often where the negligence lies.',
    psychology: 'A hospital or doctor in Modesto may have harmed me and I do not know the deadline or whether a delay was negligent.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'modesto medical malpractice lawyer',
      'doctors medical center modesto malpractice claim',
      'delayed diagnosis lawsuit california',
      'failure to transfer patient lawsuit california',
      'medical malpractice statute of limitations california',
    ],
    signals: [
      'Private-heavy (MICRA)',
      'Central Valley specialist shortage',
      'Delayed diagnosis / late transfer',
      'MICRA deadline (340.5)',
      'MICRA non-economic cap',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `Modesto\u2019s hospitals are almost entirely private \u2014 Doctors Medical Center and Memorial among them \u2014 so most claims run under MICRA rather than the public-entity process. ${PUBLIC} The distinctive local issue is not which deadline but access: with few local specialists and no operating county hospital, serious cases are referred or transferred to Sacramento or the Bay Area, and a failure to diagnose, refer, or transfer in time can itself be the negligence. ${FEW_SPECIALISTS} ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Civil cases are filed in Stanislaus County Superior Court.`,
      whatToTrack: [
        'The full timeline of who saw the patient, when, and what was ordered',
        'Whether a referral, transfer, or specialist consult was delayed or never happened',
        'Whether and when the patient was transferred to Sacramento or the Bay Area',
        'Whether any care was at a public or federal facility rather than a private one',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any enrollment or admission arbitration agreement, and by whom it was signed',
      ],
      howClearCaseHelps: `ClearCaseIQ reconstructs the Modesto referral-and-transfer timeline \u2014 the heart of most claims in a private, specialist-short market that ships complex cases out \u2014 and confirms the MICRA deadline and any arbitration agreement. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My diagnosis was delayed because no specialist was available. Is that malpractice?',
        a: 'It can be. The Central Valley has a shortage of specialists, and Modesto has no county hospital, so cases are often referred or transferred \u2014 but that does not excuse a failure to diagnose, refer, or transfer within the professional standard of care. Whether a delay was negligent turns on what a reasonably careful provider would have done, which is why reconstructing the timeline matters so much.',
      },
      {
        q: 'How long do I have to bring a Modesto claim?',
        a: 'Most Modesto care is private, so MICRA applies: generally one year from when you discovered or should have discovered the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing. If any care was at a public or federal facility, a shorter or different deadline may apply, so the institution should be confirmed.',
      },
      {
        q: 'The hospital says my outcome was just a known risk. Does that end it?',
        a: 'Not necessarily. A known complication is not automatically malpractice, but it is also not a defence if the care that led to it fell below the standard \u2014 for example, a failure to monitor, to act on results, or to transfer in time. That question is answered through the complete records and qualified expert review, not by the hospital\u2019s own characterisation.',
      },
      {
        q: 'Does the MICRA cap mean my claim is not worth pursuing?',
        a: 'Not on its own. MICRA caps non-economic damages such as pain and suffering (Civil Code section 3333.2), raised by Assembly Bill 35 effective 2023 with annual increases. The cap does not limit economic damages \u2014 past and future medical costs and lost earnings \u2014 which are often the larger part of a serious claim.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records, the deadlines, and the transfer timeline so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: CHULAVISTA_MEDMAL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Chula Vista Medical Malpractice Claims',
    title: 'Chula Vista Medical Malpractice Claims',
    eyebrow: 'California local injury guide',
    description:
      'South Bay care is largely private under MICRA, but Chula Vista\u2019s border proximity and San Diego\u2019s Navy and VA facilities create a federal fork for military families and a records challenge for cross-border patients.',
    psychology: 'A hospital or doctor in Chula Vista may have harmed me and I do not know the deadline or whether military care changes the process.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'chula vista medical malpractice lawyer',
      'sharp chula vista malpractice claim',
      'navy hospital malpractice claim ftca california',
      'medical malpractice statute of limitations california',
      'cross border patient malpractice san diego',
    ],
    signals: [
      'Private (Sharp, Scripps) \u2014 MICRA',
      'Navy / VA (FTCA, Form 95)',
      'UC San Diego (UC, six-month)',
      'Cross-border records',
      'MICRA deadline (340.5)',
      'Standard of care & experts',
    ],
    sections: {
      whyItMatters: `South Bay medical care is largely private \u2014 Sharp Chula Vista and Scripps among the anchors \u2014 so most claims run under MICRA. ${PUBLIC} Two San Diego-region forks matter here. The federal one is significant given the large military community: care at a Navy or VA facility runs under the Federal Tort Claims Act on the Standard Form 95 process, not the state process, and for military families that classification is easy to miss. The public one is UC San Diego (UC/Regents, six-month), the region\u2019s major public academic centre. Chula Vista\u2019s border proximity adds a records challenge: a patient who also received care in Mexico has a chart split across two countries, though the California treatment governs the claim. ${MICRA_SOL} ${NOTICE} ${STANDARD} ${CAP} ${ARBITRATION} Private civil cases are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'Whether care was private (Sharp, Scripps), federal (Navy/VA), or at UC San Diego',
        'For military or VA care, the facility, which directs a Standard Form 95',
        'Whether any care was received across the border in Mexico',
        'The date of the treatment and the date you first suspected something was wrong',
        'The complete medical chart, including imaging, labs, and operative and nursing notes',
        'Any enrollment or admission arbitration agreement, and by whom it was signed',
        'The specific harm and the ongoing and future medical and wage consequences',
        'Any second-opinion or corrective-treatment records',
      ],
      howClearCaseHelps: `ClearCaseIQ flags the South Bay forks that most often derail a claim \u2014 Navy or VA care on the federal Standard Form 95 process and UC San Diego as a public entity \u2014 and assembles a complete chart even when records span the border. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My care was at a Navy or VA hospital. Is the claim different?',
        a: 'Yes, substantially. Care at a Navy or VA facility generally runs under the Federal Tort Claims Act, which requires an administrative claim on a Standard Form 95 to the responsible federal agency, generally within two years, before you can sue. It is a different process and timeline from California\u2019s, and pursuing it incorrectly can forfeit the claim \u2014 something that catches military families in the South Bay in particular.',
      },
      {
        q: 'My care was at Sharp Chula Vista or Scripps. How long do I have?',
        a: 'Those are private hospitals, so MICRA applies: generally one year from when you discovered or should have discovered the injury, or three years from the injury, whichever is first, with limited tolling for fraud, concealment, or a foreign object. A 90-day notice of intent to sue is also required before filing.',
      },
      {
        q: 'I also received care in Mexico. Does that affect my California claim?',
        a: 'The California treatment generally governs a California malpractice claim, and California\u2019s MICRA rules apply to it. The practical complication is records: care received across the border has to be gathered alongside the California chart to give a complete picture, which is worth starting early.',
      },
      {
        q: 'Was a bad result actually malpractice?',
        a: 'Not necessarily. A claim requires that the care fell below the professional standard and caused the harm, established through the complete records and qualified expert review. Obtaining and preserving the full chart early is essential to knowing whether a claim exists.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the institution type, the records, the deadlines, and the federal-process question so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const medicalMalpracticeCityGuideTopicContentBySlug4: Record<string, TopicContent> = {
  [ANAHEIM_MEDMAL_SLUG]: {
    scenario: `An Anaheim family\u2019s child was harmed during specialised pediatric care, and the parents assumed the ordinary adult deadline applied. Because the patient was a minor, different limitations rules governed \u2014 and the family\u2019s Kaiser enrollment raised a separate arbitration question. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether care was private (Kaiser, CHOC, community) or at a UC/public facility; request the chart.'],
      ['First weeks', 'Assess any arbitration agreement; for a minor, confirm the applicable deadline.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs.'],
    ],
    severityLadder: [
      ['Kaiser', 'An enrollment arbitration agreement may redirect the forum.'],
      ['CHOC / pediatric', 'A child\u2019s case with its own minors\u2019 deadline rules.'],
      ['UC Irvine', 'A UC/Regents public entity on a six-month claim.'],
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, operative and nursing notes tell the story.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Corrective care', copy: 'Later treatment documents the harm and its consequences.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether a Kaiser or other arbitration agreement applies',
      'Whether the patient is a minor, changing the deadline',
      'Whether care was private or at a UC/public entity',
      'Whether the care fell below the standard and caused the harm',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'Kaiser arbitration', copy: 'An enrollment agreement may move the dispute out of court.' },
      { label: 'Minors differ', copy: 'A child\u2019s case follows its own limitations rules.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'Standard of care is proved through the complete chart.' },
    ],
    insuranceProblems: [
      'A Kaiser arbitration agreement is accepted without challenge.',
      'A minor\u2019s deadline is treated like an adult\u2019s.',
      'A visitor\u2019s out-of-state records are never gathered.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at Kaiser, CHOC, a community hospital, or UC Irvine?' },
      { label: 'Step 2', question: 'Is the patient a minor?' },
      { label: 'Step 3', question: 'Did you sign an arbitration agreement at enrollment?' },
      { label: 'Step 4', question: 'Has the complete medical chart been requested?' },
    ],
  },
  [STOCKTON_MEDMAL_SLUG]: {
    scenario: `A Stockton patient deteriorated while a transfer to a Bay Area centre was delayed. The county hospital\u2019s six-month clock and the failure-to-transfer timeline were the two things that decided whether a claim survived. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Reconstruct who saw the patient and what was ordered; request the complete chart.'],
      ['First weeks', 'Present the six-month claim if San Joaquin General was involved.'],
      ['Assessment', 'Standard-of-care and causation reviewed, focusing on the transfer timeline.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs.'],
    ],
    severityLadder: [
      ['San Joaquin General (county)', 'A county public entity on a six-month claim.'],
      ['Delayed transfer', 'A failure to transfer in time may be the negligence.'],
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['Arbitration', 'An enrollment agreement may redirect the forum.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, and consult notes tell the story.' },
      { label: 'The timeline', copy: 'Who saw the patient, when, and when transfer was ordered.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether care was at the county safety-net hospital',
      'Whether a transfer or referral was negligently delayed',
      'Whether the applicable deadline was protected',
      'Whether the care fell below the standard and caused the harm',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'County is public', copy: 'San Joaquin General runs on the six-month clock.' },
      { label: 'Delay is negligence', copy: 'A specialist shortage does not excuse a late transfer.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Timeline decides it', copy: 'Who did what, and when, is the heart of a delay claim.' },
    ],
    insuranceProblems: [
      'A county-hospital claim misses the six-month deadline.',
      'A delayed transfer is excused as unavoidable given the shortage.',
      'The complete chart and transfer timeline are never assembled.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care at San Joaquin General or a private facility?' },
      { label: 'Step 2', question: 'Was a transfer or referral delayed?' },
      { label: 'Step 3', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 4', question: 'Has the complete medical chart been requested?' },
    ],
  },
  [MODESTO_MEDMAL_SLUG]: {
    scenario: `A Modesto patient\u2019s worsening condition went unaddressed while a referral to a Sacramento specialist stalled. With no county hospital and few local specialists, the failure-to-refer timeline was the heart of the claim. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Reconstruct who saw the patient and what was ordered; request the complete chart.'],
      ['First weeks', 'Confirm the MICRA deadline and any arbitration agreement.'],
      ['Assessment', 'Standard-of-care and causation reviewed, focusing on the referral timeline.'],
      ['Before filing', 'The 90-day notice prepared.'],
    ],
    severityLadder: [
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['Delayed referral', 'A failure to refer or transfer may be the negligence.'],
      ['No county hospital', 'Serious cases route and transfer out of the county.'],
      ['Arbitration', 'An enrollment agreement may redirect the forum.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, and consult notes tell the story.' },
      { label: 'The timeline', copy: 'Who saw the patient, when, and what was ordered.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether a referral or transfer was negligently delayed',
      'Whether the MICRA deadline was protected',
      'Whether any care was at a public or federal facility',
      'Whether the care fell below the standard and caused the harm',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'Delay is negligence', copy: 'A specialist shortage does not excuse a late referral.' },
      { label: 'Private market', copy: 'Most Modesto care runs under MICRA, not the county process.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Timeline decides it', copy: 'Who did what, and when, is the heart of a delay claim.' },
    ],
    insuranceProblems: [
      'A delayed referral is excused as unavoidable given the shortage.',
      'A known complication is treated as a complete defence.',
      'The complete chart and referral timeline are never assembled.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a referral, transfer, or consult delayed?' },
      { label: 'Step 2', question: 'Was any care at a public or federal facility?' },
      { label: 'Step 3', question: 'When did you first suspect something had gone wrong?' },
      { label: 'Step 4', question: 'Has the complete medical chart been requested?' },
    ],
  },
  [CHULAVISTA_MEDMAL_SLUG]: {
    scenario: `A South Bay military spouse harmed at a Navy hospital filed what she thought was an ordinary malpractice claim. Because the care was federal, it actually required a Standard Form 95 first \u2014 a step that, identified early, kept the Federal Tort Claims Act route open. ${NOT_ADVICE}`,
    timeline: [
      ['First days', 'Determine whether care was private (Sharp, Scripps), federal (Navy/VA), or UC San Diego; request the chart.'],
      ['First weeks', 'File the Standard Form 95 for federal care, or confirm the MICRA / six-month deadline.'],
      ['Assessment', 'Standard-of-care and causation reviewed against the records and experts.'],
      ['Before filing', 'The 90-day notice prepared where MICRA governs.'],
    ],
    severityLadder: [
      ['Private (MICRA)', 'One-year-from-discovery / three-year clock.'],
      ['Navy / VA', 'Federal Tort Claims Act and Standard Form 95.'],
      ['UC San Diego', 'A UC/Regents public entity on a six-month claim.'],
      ['Cross-border', 'Records split across two countries.'],
    ],
    treatmentProgression: [
      { label: 'The complete chart', copy: 'Imaging, labs, operative and nursing notes tell the story.' },
      { label: 'Expert review', copy: 'A qualified expert measures the care against the standard.' },
      { label: 'Corrective care', copy: 'Later treatment documents the harm and its consequences.' },
      { label: 'Economic proof', copy: 'Future medical and wage losses drive value beyond the cap.' },
    ],
    settlementDrivers: [
      'Whether care was private, federal (Navy/VA), or at UC San Diego',
      'Whether the correct administrative deadline was met',
      'Whether the care fell below the standard and caused the harm',
      'Whether records span the border',
      'The economic damages the cap does not limit',
      'The completeness of the medical records',
    ],
    settlementValueDetails: [
      { label: 'Federal fork', copy: 'Navy or VA care moves the claim to the Standard Form 95 process.' },
      { label: 'Private is MICRA', copy: 'Sharp and Scripps care runs on the MICRA clock.' },
      { label: 'Economics matter', copy: 'The MICRA cap limits pain and suffering, not medical or wage loss.' },
      { label: 'Records decide it', copy: 'A complete chart, even across the border, is essential.' },
    ],
    insuranceProblems: [
      'A Navy or VA claim is filed as ordinary malpractice and misses the Form 95 step.',
      'A UC San Diego claim misses the six-month deadline.',
      'Cross-border records are never gathered.',
      'The claim is undervalued by focusing only on the capped non-economic damages.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the care private (Sharp/Scripps), Navy/VA, or UC San Diego?' },
      { label: 'Step 2', question: 'For military care, which facility was involved?' },
      { label: 'Step 3', question: 'Did you also receive care across the border?' },
      { label: 'Step 4', question: 'Has the complete medical chart been requested?' },
    ],
  },
}
