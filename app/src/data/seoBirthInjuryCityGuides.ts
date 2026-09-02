import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, birth-injury / labor-and-delivery malpractice practice area:
 * location-specific guides for Los Angeles, San Diego, San Francisco, and
 * Sacramento.
 *
 * A birth-injury claim is a distinct medical-professional-negligence claim
 * governed by MICRA, with a special statute of limitations for minors, a heavy
 * reliance on fetal-monitoring and delivery records, and lifelong-care damages.
 * It is different from an ordinary injury claim in almost every procedural
 * respect.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: very high birth volume across large hospital systems.
 *  - San Diego: a large military population, where a birth at a naval or other
 *    federal hospital routes the claim through the Federal Tort Claims Act.
 *  - San Francisco: major academic medical centers and high-risk referral care.
 *  - Sacramento: regional referral and university hospitals serving a wide area.
 *
 * Applied accurately:
 *  - A birth injury is medical professional negligence: the family must show the
 *    provider fell below the standard of care \u2014 for example, failing to respond
 *    to fetal distress, an unreasonably delayed cesarean, or improper use of
 *    forceps or a vacuum \u2014 and that the breach caused the harm (such as hypoxic
 *    brain injury, cerebral palsy, or a brachial-plexus/Erb\u2019s palsy injury).
 *  - The claim is governed by MICRA, which caps non-economic damages (the cap is
 *    set by statute and rises on a fixed annual schedule), requires a 90-day
 *    notice of intent to sue before filing (Code of Civil Procedure section 364),
 *    and sets special deadlines (Code of Civil Procedure section 340.5).
 *  - For a minor, the deadline is generally three years from the injury, except
 *    that a child under six has until the later of three years or the eighth
 *    birthday. A parent\u2019s own claim can run on a different clock, so both must be
 *    assessed early.
 *  - A birth at a federal or military hospital is governed by the Federal Tort
 *    Claims Act, which requires an administrative claim first and follows federal
 *    rules and deadlines.
 *  - The evidence is documentary and specialised: the fetal-monitoring (EFM)
 *    strips, the delivery and nursing records, and expert review \u2014 and a
 *    life-care plan is central where the child needs lifelong care.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether care fell below the standard, which deadline applies to a child versus a parent, and how MICRA affects a birth-injury claim depend on facts a licensed California attorney should review promptly.'

const PROF_NEG =
  'A birth injury is medical professional negligence: the family must show that a provider fell below the accepted standard of care \u2014 for example, failing to recognise or respond to fetal distress, an unreasonably delayed cesarean, or improper use of forceps or a vacuum \u2014 and that the breach caused the harm, such as a hypoxic brain injury, cerebral palsy, or a brachial-plexus (Erb\u2019s palsy) injury. Expert review is required to establish both the breach and causation.'

const MICRA =
  'A birth-injury claim is governed by California\u2019s Medical Injury Compensation Reform Act (MICRA), which caps non-economic damages \u2014 a cap set by statute that rises on a fixed annual schedule \u2014 while leaving economic damages such as lifelong medical care uncapped. MICRA also requires a 90-day notice of intent to sue before filing (Code of Civil Procedure section 364) and sets special deadlines (Code of Civil Procedure section 340.5).'

const SOL_MINOR =
  'The deadline for a child\u2019s birth-injury claim is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the child\u2019s eighth birthday. A parent\u2019s own related claim can run on a different, shorter clock \u2014 so both must be assessed early rather than assumed to share a deadline.'

const FEDERAL =
  'A birth at a federal or military hospital is not handled in state court. It is governed by the Federal Tort Claims Act, which requires an administrative claim to the agency first and follows federal rules and deadlines. Identifying whether the delivery hospital was private, county, or federal is an essential first step in a San Diego-area case in particular.'

const EVIDENCE =
  'Birth-injury cases are built on specialised records: the electronic fetal-monitoring (EFM) strips, the labor-and-delivery and nursing notes, the anesthesia and cesarean records, and the newborn\u2019s cord-blood gases and Apgar scores \u2014 all reviewed by qualified experts. Where the child needs lifelong care, a life-care plan quantifying future medical needs is central, and requesting the complete record early is essential.'

export const LA_BIRTH_SLUG = '/los-angeles-birth-injury-claim'
export const SD_BIRTH_SLUG = '/san-diego-birth-injury-claim'
export const SF_BIRTH_SLUG = '/san-francisco-birth-injury-claim'
export const SAC_BIRTH_SLUG = '/sacramento-birth-injury-claim'

export const birthInjuryCityGuidePages: LandingPage[] = [
  {
    slug: LA_BIRTH_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Birth Injury Claims',
    title: 'Los Angeles Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby at an LA hospital? A birth-injury claim is governed by MICRA and has a special deadline for children \u2014 and the fetal-monitoring records tell the story.',
    psychology: 'My baby was hurt during delivery at an LA hospital and I do not know if it was malpractice or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles birth injury lawyer',
      'cerebral palsy malpractice claim california',
      'delivery negligence lawsuit california',
      'erbs palsy birth injury california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'MICRA cap & 90-day notice (364)',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
      'Expert review required',
    ],
    sections: {
      whyItMatters: `Los Angeles has very high birth volume across large hospital systems, so delivery-related injuries \u2014 from unrecognised fetal distress to a delayed cesarean \u2014 arise here regularly, and a birth-injury claim follows special rules from the start. ${PROF_NEG} ${MICRA} ${SOL_MINOR} ${EVIDENCE} Civil cases are filed in Los Angeles County Superior Court after the required notice.`,
      whatToTrack: [
        'The hospital and providers involved in the delivery',
        'The child\u2019s diagnosis (HIE, cerebral palsy, Erb\u2019s palsy) and age',
        'The complete labor-and-delivery record and EFM strips',
        'The cord-blood gases, Apgar scores, and newborn records',
        'The date of injury, for the special minor deadline',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
        'The 90-day notice-of-intent requirement',
      ],
      howClearCaseHelps: `ClearCaseIQ requests the complete LA delivery record and EFM strips for expert review, tracks both the child\u2019s special deadline and any parent\u2019s clock, handles the 90-day notice, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'How do I know if my baby\u2019s injury was malpractice?',
        a: 'A birth injury is malpractice only if a provider fell below the accepted standard of care \u2014 for example, failing to respond to fetal distress, delaying a cesarean, or misusing forceps or a vacuum \u2014 and that breach caused the harm. Establishing this requires expert review of the delivery records and fetal-monitoring strips.',
      },
      {
        q: 'How long do I have to bring a birth-injury claim in California?',
        a: 'It is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the eighth birthday. A parent\u2019s own claim can run on a different, shorter clock, so both must be assessed early.',
      },
      {
        q: 'Does MICRA limit what we can recover?',
        a: 'MICRA caps non-economic damages \u2014 a cap set by statute that rises on a fixed annual schedule \u2014 but it does not cap economic damages such as the child\u2019s lifelong medical care, which are often the largest part of a birth-injury case. MICRA also requires a 90-day notice before filing.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The electronic fetal-monitoring (EFM) strips, the labor-and-delivery and nursing records, the cesarean and anesthesia records, and the newborn\u2019s cord-blood gases and Apgar scores \u2014 all reviewed by qualified experts. A life-care plan is central where the child needs lifelong care.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records, the deadlines, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_BIRTH_SLUG,
    category: 'Cities',
    cluster: 'San Diego Birth Injury Claims',
    title: 'San Diego Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby in San Diego? A birth at a naval or federal hospital follows federal rules \u2014 and every birth-injury claim has a special deadline for children.',
    psychology: 'My baby was hurt during delivery in San Diego, possibly at a military hospital, and I do not know what rules apply.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego birth injury lawyer',
      'military hospital birth injury claim california',
      'cerebral palsy malpractice claim california',
      'delivery negligence lawsuit california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'Federal / military hospital (FTCA)',
      'MICRA cap & 90-day notice (364)',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s large military population means many babies are delivered at naval or other federal hospitals \u2014 and where the delivery hospital was federal, the claim follows an entirely different, federal path, making the very first question which kind of hospital was involved. ${FEDERAL} ${PROF_NEG} ${MICRA} ${SOL_MINOR} ${EVIDENCE} Civil cases against private hospitals are filed in San Diego County Superior Court after the required notice.`,
      whatToTrack: [
        'Whether the delivery hospital was private, county, or federal/military',
        'The providers involved in the delivery',
        'The child\u2019s diagnosis and age',
        'The complete labor-and-delivery record and EFM strips',
        'The cord-blood gases, Apgar scores, and newborn records',
        'The applicable deadline \u2014 state minor rule or FTCA',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ first determines whether a San Diego delivery hospital was private or federal \u2014 which decides whether MICRA and state deadlines or the Federal Tort Claims Act apply \u2014 then requests the complete record and EFM strips and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My baby was delivered at a military hospital. Does that change my claim?',
        a: 'Yes, significantly. A birth at a federal or military hospital is governed by the Federal Tort Claims Act, which requires an administrative claim to the agency first and follows federal rules and deadlines rather than the state MICRA scheme. Identifying whether the hospital was private or federal is the essential first step.',
      },
      {
        q: 'How do I know if my baby\u2019s injury was malpractice?',
        a: 'A birth injury is malpractice only if a provider fell below the accepted standard of care \u2014 for example, failing to respond to fetal distress or delaying a cesarean \u2014 and that breach caused the harm. Establishing this requires expert review of the delivery records and fetal-monitoring strips.',
      },
      {
        q: 'How long do I have if it was a private hospital?',
        a: 'It is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the eighth birthday. A parent\u2019s own claim can run on a different clock. Federal-hospital claims follow separate FTCA deadlines.',
      },
      {
        q: 'Does MICRA limit what we can recover?',
        a: 'For a private-hospital claim, MICRA caps non-economic damages \u2014 a cap that rises on a fixed annual schedule \u2014 but does not cap economic damages such as lifelong medical care. Federal-hospital claims follow federal damages rules instead.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the records, the deadlines, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_BIRTH_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Birth Injury Claims',
    title: 'San Francisco Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby at a San Francisco hospital? Birth-injury claims against academic and referral centers follow MICRA and a special minor deadline.',
    psychology: 'My baby was hurt during delivery at a San Francisco hospital and I do not know if it was malpractice or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco birth injury lawyer',
      'cerebral palsy malpractice claim california',
      'high risk delivery negligence california',
      'erbs palsy birth injury california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'Academic / referral centers',
      'MICRA cap & 90-day notice (364)',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s major academic medical centers handle high-risk and referral deliveries, which can raise complex questions about whether complications were managed within the standard of care \u2014 and a birth-injury claim follows special rules regardless. ${PROF_NEG} ${MICRA} ${SOL_MINOR} ${EVIDENCE} Civil cases are filed in San Francisco County Superior Court after the required notice.`,
      whatToTrack: [
        'The hospital and providers involved in the delivery',
        'Whether the delivery was high-risk or a referral',
        'The child\u2019s diagnosis (HIE, cerebral palsy, Erb\u2019s palsy) and age',
        'The complete labor-and-delivery record and EFM strips',
        'The cord-blood gases, Apgar scores, and newborn records',
        'The date of injury, for the special minor deadline',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ requests the complete San Francisco delivery record and EFM strips for expert review, addresses the standard-of-care questions common in high-risk care, tracks the child\u2019s and any parent\u2019s deadlines, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My delivery was high-risk. Does that make it harder to prove malpractice?',
        a: 'It can require careful analysis. A birth injury is malpractice only if a provider fell below the accepted standard of care and that breach caused the harm; in high-risk care, the question is whether the complications were managed reasonably. Expert review of the delivery records and fetal-monitoring strips is essential.',
      },
      {
        q: 'How long do I have to bring a birth-injury claim?',
        a: 'It is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the eighth birthday. A parent\u2019s own claim can run on a different clock, so both must be assessed early.',
      },
      {
        q: 'Does MICRA limit what we can recover?',
        a: 'MICRA caps non-economic damages \u2014 a cap set by statute that rises on a fixed annual schedule \u2014 but it does not cap economic damages such as the child\u2019s lifelong medical care, which are often the largest part of the case. MICRA also requires a 90-day notice before filing.',
      },
      {
        q: 'What evidence matters most?',
        a: 'The electronic fetal-monitoring (EFM) strips, the labor-and-delivery and nursing records, the cesarean and anesthesia records, and the newborn\u2019s cord-blood gases and Apgar scores \u2014 all reviewed by qualified experts. A life-care plan is central where the child needs lifelong care.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the records, the deadlines, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_BIRTH_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Birth Injury Claims',
    title: 'Sacramento Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby at a Sacramento-area hospital? Birth-injury claims follow MICRA and a special deadline for children \u2014 and the records tell the story.',
    psychology: 'My baby was hurt during delivery at a Sacramento hospital and I do not know if it was malpractice or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento birth injury lawyer',
      'cerebral palsy malpractice claim california',
      'delivery negligence lawsuit california',
      'erbs palsy birth injury california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'Regional & university hospitals',
      'MICRA cap & 90-day notice (364)',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
    ],
    sections: {
      whyItMatters: `Sacramento\u2019s regional referral and university hospitals serve a wide area, so complex and high-risk deliveries are common \u2014 and where a delivery error harms a baby, the claim follows special professional-negligence rules from the outset. ${PROF_NEG} ${MICRA} ${SOL_MINOR} Some deliveries occur at public or university hospitals, which can add government-claim considerations an attorney should evaluate. ${EVIDENCE} Civil cases are filed in Sacramento County Superior Court after the required notice.`,
      whatToTrack: [
        'The hospital (private, university, or public) and providers involved',
        'The child\u2019s diagnosis (HIE, cerebral palsy, Erb\u2019s palsy) and age',
        'The complete labor-and-delivery record and EFM strips',
        'The cord-blood gases, Apgar scores, and newborn records',
        'The date of injury, for the special minor deadline',
        'Whether any government-claim rules apply to a public hospital',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Sacramento-area delivery hospital was private, university, or public, requests the complete record and EFM strips for expert review, tracks the child\u2019s and any parent\u2019s deadlines, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'How do I know if my baby\u2019s injury was malpractice?',
        a: 'A birth injury is malpractice only if a provider fell below the accepted standard of care \u2014 for example, failing to respond to fetal distress, delaying a cesarean, or misusing forceps or a vacuum \u2014 and that breach caused the harm. Establishing this requires expert review of the delivery records and fetal-monitoring strips.',
      },
      {
        q: 'The hospital is a public or university hospital. Does that change things?',
        a: 'It can. A claim against a public hospital may add government-claim requirements and shorter deadlines on top of the MICRA rules, so identifying whether the hospital was private, university, or public is important and should be done early.',
      },
      {
        q: 'How long do I have to bring a birth-injury claim?',
        a: 'It is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the eighth birthday. A parent\u2019s own claim can run on a different clock, so both must be assessed early.',
      },
      {
        q: 'Does MICRA limit what we can recover?',
        a: 'MICRA caps non-economic damages \u2014 a cap set by statute that rises on a fixed annual schedule \u2014 but it does not cap economic damages such as the child\u2019s lifelong medical care. MICRA also requires a 90-day notice before filing.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the records, the deadlines, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const birthInjuryCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_BIRTH_SLUG]: {
    scenario: `An LA newborn suffered a hypoxic brain injury after fetal distress went unaddressed. Expert review of the EFM strips and delivery records established the breach, and the claim was brought within the child\u2019s special deadline. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Request the complete delivery record and EFM strips.'],
      ['Expert review', 'Qualified experts assess standard of care and causation.'],
      ['Notice', 'The 90-day notice of intent is served.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Standard of care', 'Did a provider fall below it?'],
      ['Causation', 'Did the breach cause the injury?'],
      ['Deadline', 'The special minor rule must be met.'],
      ['Damages', 'Economic care needs are uncapped.'],
    ],
    treatmentProgression: [
      { label: 'Diagnosis', copy: 'The child\u2019s condition is documented.' },
      { label: 'Early intervention', copy: 'Therapy and treatment records build the picture.' },
      { label: 'Continuing care', copy: 'Ongoing needs establish severity.' },
      { label: 'Life-care plan', copy: 'Future medical needs are quantified.' },
    ],
    settlementDrivers: [
      'Whether a provider breached the standard of care',
      'Whether the breach caused the injury',
      'Whether the special minor deadline is met',
      'Whether the EFM strips and records support the claim',
      'The scope of lifelong (uncapped) economic damages',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'Economic is uncapped', copy: 'Lifelong care drives value.' },
      { label: 'Non-economic is capped', copy: 'MICRA caps that category.' },
      { label: 'Records decide it', copy: 'EFM strips are central evidence.' },
      { label: 'Deadline is special', copy: 'The minor rule differs from a parent\u2019s.' },
    ],
    insuranceProblems: [
      'The complete EFM strips and records are never obtained.',
      'The special minor or parent deadline is misjudged.',
      'The 90-day notice requirement is missed.',
      'No life-care plan quantifies future needs.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the child\u2019s diagnosis and age?' },
      { label: 'Step 2', question: 'Which hospital and providers delivered?' },
      { label: 'Step 3', question: 'Have you requested the delivery records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
  [SD_BIRTH_SLUG]: {
    scenario: `A San Diego family\u2019s baby was injured at a naval hospital. Recognising it as a federal facility routed the claim through the Federal Tort Claims Act and its administrative-claim requirement rather than state court. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Determine whether the hospital was private or federal.'],
      ['Records', 'Request the complete delivery record and EFM strips.'],
      ['Path', 'Choose the FTCA or the state MICRA path accordingly.'],
      ['Longer term', 'The life-care plan and deadlines developed.'],
    ],
    severityLadder: [
      ['Right forum', 'Private vs. federal decides the path.'],
      ['Standard of care', 'Did a provider fall below it?'],
      ['Causation', 'Did the breach cause the injury?'],
      ['Damages', 'Economic care needs drive value.'],
    ],
    treatmentProgression: [
      { label: 'Diagnosis', copy: 'The child\u2019s condition is documented.' },
      { label: 'Early intervention', copy: 'Therapy records build the picture.' },
      { label: 'Continuing care', copy: 'Ongoing needs establish severity.' },
      { label: 'Life-care plan', copy: 'Future medical needs are quantified.' },
    ],
    settlementDrivers: [
      'Whether the hospital was private or federal',
      'Whether an FTCA administrative claim is required',
      'Whether a provider breached the standard of care',
      'Whether the breach caused the injury',
      'The scope of lifelong economic damages',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'Forum first', copy: 'Private vs. federal decides the rules.' },
      { label: 'FTCA is different', copy: 'Federal hospitals need an administrative claim.' },
      { label: 'Economic drives value', copy: 'Lifelong care is central.' },
      { label: 'Records decide it', copy: 'EFM strips are key evidence.' },
    ],
    insuranceProblems: [
      'A federal hospital is treated as private, missing the FTCA path.',
      'The complete EFM strips and records are never obtained.',
      'The applicable deadline (state or FTCA) is misjudged.',
      'No life-care plan quantifies future needs.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the hospital private, county, or federal/military?' },
      { label: 'Step 2', question: 'What is the child\u2019s diagnosis and age?' },
      { label: 'Step 3', question: 'Have you requested the delivery records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
  [SF_BIRTH_SLUG]: {
    scenario: `A San Francisco newborn was injured during a high-risk delivery at an academic center. Expert review determined the complications were not managed within the standard of care, and the EFM strips confirmed it. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Request the complete delivery record and EFM strips.'],
      ['Expert review', 'Experts assess high-risk management and causation.'],
      ['Notice', 'The 90-day notice of intent is served.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Standard of care', 'Were complications managed reasonably?'],
      ['Causation', 'Did the breach cause the injury?'],
      ['Deadline', 'The special minor rule must be met.'],
      ['Damages', 'Economic care needs are uncapped.'],
    ],
    treatmentProgression: [
      { label: 'Diagnosis', copy: 'The child\u2019s condition is documented.' },
      { label: 'Early intervention', copy: 'Therapy records build the picture.' },
      { label: 'Continuing care', copy: 'Ongoing needs establish severity.' },
      { label: 'Life-care plan', copy: 'Future medical needs are quantified.' },
    ],
    settlementDrivers: [
      'Whether high-risk complications were managed within the standard',
      'Whether the breach caused the injury',
      'Whether the special minor deadline is met',
      'Whether the EFM strips and records support the claim',
      'The scope of lifelong (uncapped) economic damages',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'Economic is uncapped', copy: 'Lifelong care drives value.' },
      { label: 'Non-economic is capped', copy: 'MICRA caps that category.' },
      { label: 'High-risk analysis', copy: 'The question is reasonable management.' },
      { label: 'Records decide it', copy: 'EFM strips are central evidence.' },
    ],
    insuranceProblems: [
      'The complete EFM strips and records are never obtained.',
      'A high-risk defense goes unanswered by experts.',
      'The special minor or parent deadline is misjudged.',
      'No life-care plan quantifies future needs.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the delivery high-risk or a referral?' },
      { label: 'Step 2', question: 'What is the child\u2019s diagnosis and age?' },
      { label: 'Step 3', question: 'Have you requested the delivery records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
  [SAC_BIRTH_SLUG]: {
    scenario: `A Sacramento-area baby was injured at a university hospital. Confirming whether government-claim rules applied, then requesting the EFM strips for expert review, set the claim on the right track within the deadline. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify the hospital type; request the delivery record and EFM strips.'],
      ['Expert review', 'Experts assess standard of care and causation.'],
      ['Notice', 'The 90-day notice \u2014 and any government claim \u2014 is addressed.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Hospital type', 'Private, university, or public changes the rules.'],
      ['Standard of care', 'Did a provider fall below it?'],
      ['Causation', 'Did the breach cause the injury?'],
      ['Damages', 'Economic care needs are uncapped.'],
    ],
    treatmentProgression: [
      { label: 'Diagnosis', copy: 'The child\u2019s condition is documented.' },
      { label: 'Early intervention', copy: 'Therapy records build the picture.' },
      { label: 'Continuing care', copy: 'Ongoing needs establish severity.' },
      { label: 'Life-care plan', copy: 'Future medical needs are quantified.' },
    ],
    settlementDrivers: [
      'Whether government-claim rules apply to a public hospital',
      'Whether a provider breached the standard of care',
      'Whether the breach caused the injury',
      'Whether the special minor deadline is met',
      'The scope of lifelong economic damages',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'Identify the hospital', copy: 'Public hospitals add claim rules.' },
      { label: 'Economic is uncapped', copy: 'Lifelong care drives value.' },
      { label: 'Non-economic is capped', copy: 'MICRA caps that category.' },
      { label: 'Records decide it', copy: 'EFM strips are central evidence.' },
    ],
    insuranceProblems: [
      'A public-hospital claim rule is missed.',
      'The complete EFM strips and records are never obtained.',
      'The special minor or parent deadline is misjudged.',
      'No life-care plan quantifies future needs.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the hospital private, university, or public?' },
      { label: 'Step 2', question: 'What is the child\u2019s diagnosis and age?' },
      { label: 'Step 3', question: 'Have you requested the delivery records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
}
