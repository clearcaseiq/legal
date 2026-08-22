import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, birth-injury / labor-and-delivery malpractice practice area
 * (batch 2): location-specific guides for San Jose, Fresno, Long Beach, and
 * Oakland, extending the batch-1 hub (LA, San Diego, San Francisco, Sacramento).
 *
 * A birth-injury claim is a distinct medical-professional-negligence claim
 * governed by MICRA, with a special statute of limitations for minors, a heavy
 * reliance on fetal-monitoring and delivery records, and lifelong-care damages.
 *
 * Local context, genuine rather than interpolated:
 *  - San Jose: Santa Clara Valley Medical Center is a county public delivery
 *    hospital (a Government Claims Act six-month clock), alongside Kaiser
 *    (admission arbitration) and Stanford referral care.
 *  - Fresno: Community Regional Medical Center anchors high-risk delivery and NICU
 *    care for a wide Central Valley area, with UCSF Fresno teaching physicians who
 *    may implicate the UC/Regents, and long transfer distances.
 *  - Long Beach: Miller Children\u2019s & Women\u2019s / Long Beach Medical Center is a major
 *    regional NICU, with the nearby LA County Harbor-UCLA as a public fork.
 *  - Oakland: UCSF Benioff Children\u2019s Oakland (UC/Regents) and Highland (Alameda
 *    County) are public entities on a six-month clock, alongside Kaiser Oakland.
 *
 * Applied accurately (MICRA cap on non-economic damages rising on a fixed annual
 * schedule; economic/lifelong-care damages uncapped; 90-day notice CCP 364;
 * special minor deadline CCP 340.5; public-entity six-month Government Claims Act;
 * federal deliveries under the FTCA; EFM strips and a life-care plan central).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether care fell below the standard, which deadline applies to a child versus a parent, and how MICRA or a public-entity rule affects a birth-injury claim depend on facts a licensed California attorney should review promptly.'

const PROF_NEG =
  'A birth injury is medical professional negligence: the family must show that a provider fell below the accepted standard of care \u2014 for example, failing to recognise or respond to fetal distress, an unreasonably delayed cesarean, or improper use of forceps or a vacuum \u2014 and that the breach caused the harm, such as a hypoxic brain injury, cerebral palsy, or a brachial-plexus (Erb\u2019s palsy) injury. Expert review is required to establish both the breach and causation.'

const MICRA =
  'A birth-injury claim is governed by California\u2019s Medical Injury Compensation Reform Act (MICRA), which caps non-economic damages \u2014 a cap set by statute that rises on a fixed annual schedule \u2014 while leaving economic damages such as lifelong medical care uncapped. MICRA also requires a 90-day notice of intent to sue before filing (Code of Civil Procedure section 364) and sets special deadlines (Code of Civil Procedure section 340.5).'

const SOL_MINOR =
  'The deadline for a child\u2019s birth-injury claim is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the child\u2019s eighth birthday. A parent\u2019s own related claim can run on a different, shorter clock \u2014 so both must be assessed early rather than assumed to share a deadline.'

const PUBLIC_ENTITY =
  'A crucial first question is whether the delivery hospital was public. A county hospital, or a University of California medical center run by the Regents, is a public entity, so on top of the MICRA rules a written claim must generally be presented within six months under the Government Claims Act \u2014 a much shorter clock than the special minor deadline. A federal or military hospital instead runs under the Federal Tort Claims Act. Identifying the hospital type at the outset can be decisive.'

const EVIDENCE =
  'Birth-injury cases are built on specialised records: the electronic fetal-monitoring (EFM) strips, the labor-and-delivery and nursing notes, the anesthesia and cesarean records, and the newborn\u2019s cord-blood gases and Apgar scores \u2014 all reviewed by qualified experts. Where the child needs lifelong care, a life-care plan quantifying future medical needs is central, and requesting the complete record early is essential.'

export const SJ_BIRTH_SLUG = '/san-jose-birth-injury-claim'
export const FRESNO_BIRTH_SLUG = '/fresno-birth-injury-claim'
export const LB_BIRTH_SLUG = '/long-beach-birth-injury-claim'
export const OAK_BIRTH_SLUG = '/oakland-birth-injury-claim'

export const birthInjuryCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_BIRTH_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Birth Injury Claims',
    title: 'San Jose Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby in San Jose? A birth at the county hospital runs on a six-month clock, Kaiser deliveries raise arbitration, and every birth-injury claim has a special deadline for children.',
    psychology: 'My baby was hurt during delivery in San Jose and I do not know if the hospital was public or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose birth injury lawyer',
      'santa clara valley medical center birth injury claim',
      'cerebral palsy malpractice claim california',
      'kaiser birth injury arbitration california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'County hospital (six-month claim)',
      'Kaiser admission arbitration',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s delivery care spans very different institutions, and which one was involved changes the claim at the outset. ${PUBLIC_ENTITY} Santa Clara Valley Medical Center is a county public hospital and a major delivery centre, so a claim involving it can run on the six-month Government Claims Act clock; Kaiser has a large local presence and brings admission arbitration into play; and Stanford handles referral and high-risk care under MICRA. ${PROF_NEG} ${MICRA} ${SOL_MINOR} ${EVIDENCE} Private civil cases are filed in Santa Clara County Superior Court after the required notice.`,
      whatToTrack: [
        'Whether the delivery hospital was county (public), Kaiser, or another private facility',
        'Any Kaiser or other admission arbitration agreement, and by whom it was signed',
        'The child\u2019s diagnosis (HIE, cerebral palsy, Erb\u2019s palsy) and age',
        'The complete labor-and-delivery record and EFM strips',
        'The cord-blood gases, Apgar scores, and newborn records',
        'The applicable deadline \u2014 six-month public rule or the special minor rule',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ first identifies whether a San Jose delivery hospital was the county facility (a six-month clock) or private, assesses any Kaiser arbitration agreement, requests the complete record and EFM strips, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My baby was delivered at Santa Clara Valley Medical Center. Does that change the deadline?',
        a: 'Yes, potentially and dramatically. It is a county public hospital, so on top of the MICRA rules a written claim may need to be presented within six months under the Government Claims Act \u2014 far shorter than the special minor deadline. Identifying the hospital as public at the outset is essential, because the short clock is easy to miss.',
      },
      {
        q: 'I have Kaiser. Does arbitration affect a birth-injury claim?',
        a: 'It can. Kaiser typically requires an arbitration agreement at enrollment, so a dispute may proceed in arbitration rather than court. Whether and how it applies depends on how and by whom it was signed, and these agreements are frequently contested, so it is worth assessing early rather than assuming it ends the matter.',
      },
      {
        q: 'How long do I have if it was a private hospital?',
        a: 'It is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the eighth birthday. A parent\u2019s own claim can run on a different clock, so both must be assessed early.',
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
    slug: FRESNO_BIRTH_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Birth Injury Claims',
    title: 'Fresno Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby in Fresno? The Central Valley\u2019s high-risk deliveries funnel to a regional referral center, university teaching physicians can implicate a public entity, and every birth-injury claim has a special deadline for children.',
    psychology: 'My baby was hurt during a delivery in Fresno and I do not know if it was malpractice or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno birth injury lawyer',
      'community regional medical center birth injury claim',
      'cerebral palsy malpractice claim california',
      'delivery negligence lawsuit california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'Regional NICU / referral center',
      'University teaching physicians (public?)',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
    ],
    sections: {
      whyItMatters: `Fresno anchors high-risk delivery and NICU care for a wide Central Valley area, so complex deliveries \u2014 and long transfers to reach them \u2014 are common, and a birth-injury claim follows special rules from the start. ${PROF_NEG} A regional referral hospital concentrates the sickest cases, and where UCSF Fresno teaching physicians were involved, the University of California (the Regents) can be implicated, which raises a public-entity question. ${PUBLIC_ENTITY} ${MICRA} ${SOL_MINOR} ${EVIDENCE} Private civil cases are filed in Fresno County Superior Court after the required notice.`,
      whatToTrack: [
        'The delivery hospital and whether university (UCSF Fresno) physicians were involved',
        'Whether the pregnancy was high-risk or transferred in from elsewhere',
        'The child\u2019s diagnosis (HIE, cerebral palsy, Erb\u2019s palsy) and age',
        'The complete labor-and-delivery record and EFM strips',
        'The cord-blood gases, Apgar scores, and newborn records',
        'The applicable deadline \u2014 special minor rule or any public-entity rule',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether Fresno delivery care involved university teaching physicians that raise a public-entity question, requests the complete record and EFM strips for expert review, tracks the child\u2019s and any parent\u2019s deadlines, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My baby was delivered by university (UCSF Fresno) physicians. Does that matter?',
        a: 'It can. If University of California teaching physicians (the Regents) were involved, a public-entity question arises, which can add a six-month Government Claims Act deadline on top of the MICRA rules. Because the arrangements between the hospital and the university physicians can be complex, identifying who was involved early is important.',
      },
      {
        q: 'My high-risk pregnancy was transferred to Fresno. Does that hurt my claim?',
        a: 'Not by itself. A birth injury is malpractice only if a provider fell below the accepted standard of care and that breach caused the harm; in high-risk and referral care, the question is whether the complications were managed reasonably. Expert review of the delivery records and fetal-monitoring strips is essential.',
      },
      {
        q: 'How long do I have to bring a birth-injury claim?',
        a: 'It is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the eighth birthday. A parent\u2019s own claim can run on a different clock, and a public-entity claim can be much shorter, so all must be assessed early.',
      },
      {
        q: 'Does MICRA limit what we can recover?',
        a: 'MICRA caps non-economic damages \u2014 a cap set by statute that rises on a fixed annual schedule \u2014 but it does not cap economic damages such as the child\u2019s lifelong medical care, which are often the largest part of the case. MICRA also requires a 90-day notice before filing.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records, the deadlines, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: LB_BIRTH_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Birth Injury Claims',
    title: 'Long Beach Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby in Long Beach? A major regional NICU handles the sickest newborns, a nearby LA County hospital is a public fork, and every birth-injury claim has a special deadline for children.',
    psychology: 'My baby was hurt during delivery in Long Beach and I do not know if it was malpractice or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach birth injury lawyer',
      'miller children hospital birth injury claim',
      'cerebral palsy malpractice claim california',
      'nicu negligence lawsuit california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'Major regional NICU',
      'LA County public fork',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
    ],
    sections: {
      whyItMatters: `Long Beach is home to a major regional NICU and women\u2019s hospital that handles the sickest newborns from across the area, so high-risk deliveries and neonatal care are concentrated here, and a birth-injury claim follows special professional-negligence rules from the outset. ${PROF_NEG} ${MICRA} ${SOL_MINOR} Because nearby deliveries can also occur at an LA County public hospital such as Harbor-UCLA, identifying whether the hospital was private or public matters. ${PUBLIC_ENTITY} ${EVIDENCE} Private civil cases are filed in Los Angeles County Superior Court after the required notice.`,
      whatToTrack: [
        'Whether the delivery or NICU hospital was private or an LA County public facility',
        'The providers involved in the delivery and neonatal care',
        'The child\u2019s diagnosis (HIE, cerebral palsy, Erb\u2019s palsy) and age',
        'The complete labor-and-delivery and NICU record and EFM strips',
        'The cord-blood gases, Apgar scores, and newborn records',
        'The applicable deadline \u2014 special minor rule or any public-entity rule',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Long Beach delivery or NICU hospital was private or an LA County public facility, requests the complete record and EFM strips for expert review, tracks the child\u2019s and any parent\u2019s deadlines, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My baby was in a Long Beach NICU. Can NICU care be part of a malpractice claim?',
        a: 'Yes. A birth-injury claim can involve both the delivery and the neonatal care that followed \u2014 for example, a failure to recognise or treat a newborn\u2019s deteriorating condition. The question in each instance is whether the care fell below the standard and caused harm, established through the complete records and expert review.',
      },
      {
        q: 'How do I know whether the hospital was public?',
        a: 'It is worth confirming early. Most Long Beach deliveries are at private hospitals under MICRA, but nearby care can occur at an LA County public hospital such as Harbor-UCLA, which is a public entity subject to a six-month Government Claims Act deadline. The hospital type decides which deadline applies.',
      },
      {
        q: 'How long do I have to bring a birth-injury claim?',
        a: 'It is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the eighth birthday. A parent\u2019s own claim can run on a different clock, and a public-entity claim is shorter, so all must be assessed early.',
      },
      {
        q: 'Does MICRA limit what we can recover?',
        a: 'MICRA caps non-economic damages \u2014 a cap set by statute that rises on a fixed annual schedule \u2014 but it does not cap economic damages such as the child\u2019s lifelong medical care, which are often the largest part of the case. MICRA also requires a 90-day notice before filing.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records, the deadlines, and the care needs so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: OAK_BIRTH_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Birth Injury Claims',
    title: 'Oakland Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby in Oakland? A university children\u2019s hospital and a county hospital are public entities on a six-month clock, Kaiser deliveries raise arbitration, and every birth-injury claim has a special deadline for children.',
    psychology: 'My baby was hurt during delivery in Oakland and I do not know if the hospital was public or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland birth injury lawyer',
      'ucsf benioff oakland birth injury claim',
      'cerebral palsy malpractice claim california',
      'kaiser birth injury arbitration california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'UC / county hospital (six-month claim)',
      'Kaiser admission arbitration',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
    ],
    sections: {
      whyItMatters: `Oakland\u2019s delivery and neonatal care lean heavily toward public and integrated institutions, which puts the hospital-type question front and centre. ${PUBLIC_ENTITY} UCSF Benioff Children\u2019s Oakland is a University of California facility (UC/Regents) and Highland is part of the Alameda County health system \u2014 both public entities that can carry a six-month Government Claims Act clock \u2014 while Kaiser, headquartered in Oakland, brings admission arbitration into play. ${PROF_NEG} ${MICRA} ${SOL_MINOR} ${EVIDENCE} Private civil cases are filed in Alameda County Superior Court after the required notice.`,
      whatToTrack: [
        'Whether the delivery hospital was UC/county (public), Kaiser, or another private facility',
        'Any Kaiser or other admission arbitration agreement, and by whom it was signed',
        'The child\u2019s diagnosis (HIE, cerebral palsy, Erb\u2019s palsy) and age',
        'The complete labor-and-delivery and NICU record and EFM strips',
        'The cord-blood gases, Apgar scores, and newborn records',
        'The applicable deadline \u2014 six-month public rule or the special minor rule',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ first identifies whether an Oakland delivery hospital was a UC or county public entity (a six-month clock) or private, assesses any Kaiser arbitration agreement, requests the complete record and EFM strips, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My baby was cared for at UCSF Benioff Children\u2019s Oakland. Does that change the deadline?',
        a: 'It can, significantly. As a University of California facility (the Regents), it is a public entity, so on top of the MICRA rules a written claim may need to be presented within six months under the Government Claims Act \u2014 far shorter than the special minor deadline. The same is true of Highland as a county facility. Identifying the hospital as public at the outset is essential.',
      },
      {
        q: 'I have Kaiser. Does arbitration affect a birth-injury claim?',
        a: 'It can. Kaiser, headquartered in Oakland, typically requires an arbitration agreement at enrollment, so a dispute may proceed in arbitration rather than court. Whether and how it applies depends on how and by whom it was signed, and these agreements are frequently contested, so it is worth assessing early.',
      },
      {
        q: 'How long do I have if it was a private hospital?',
        a: 'It is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the eighth birthday. A parent\u2019s own claim can run on a different clock, and a public-entity claim is much shorter, so all must be assessed early.',
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
]

export const birthInjuryCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_BIRTH_SLUG]: {
    scenario: `A San Jose baby was injured after fetal distress went unaddressed at the county hospital. Recognising the hospital as a public entity meant a six-month government claim, not the longer minor deadline, governed \u2014 and flagging it early kept the claim alive. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify whether the hospital was county (public) or private; request the record and EFM strips.'],
      ['Public clock', 'Present the six-month government claim if a public entity was involved.'],
      ['Expert review', 'Qualified experts assess standard of care and causation.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Hospital type', 'County/UC public triggers a six-month clock.'],
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
      'Whether the delivery hospital was public (six-month clock)',
      'Whether a Kaiser arbitration agreement applies',
      'Whether a provider breached the standard of care',
      'Whether the breach caused the injury',
      'The scope of lifelong (uncapped) economic damages',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'Public is shorter', copy: 'A county hospital can carry a six-month clock.' },
      { label: 'Kaiser arbitration', copy: 'An enrollment agreement may move the dispute out of court.' },
      { label: 'Economic is uncapped', copy: 'Lifelong care drives value.' },
      { label: 'Records decide it', copy: 'EFM strips are central evidence.' },
    ],
    insuranceProblems: [
      'A public-hospital six-month claim is missed.',
      'A Kaiser arbitration agreement is accepted without challenge.',
      'The complete EFM strips and records are never obtained.',
      'No life-care plan quantifies future needs.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the hospital county (public), Kaiser, or another private facility?' },
      { label: 'Step 2', question: 'What is the child\u2019s diagnosis and age?' },
      { label: 'Step 3', question: 'Have you requested the delivery records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
  [FRESNO_BIRTH_SLUG]: {
    scenario: `A high-risk pregnancy transferred to a Fresno referral hospital ended in a hypoxic brain injury. Because university teaching physicians were involved, a public-entity question shaped the deadline, and the EFM strips drove the standard-of-care analysis. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify whether university physicians were involved; request the record and EFM strips.'],
      ['Deadline', 'Assess the special minor rule and any public-entity clock.'],
      ['Expert review', 'Experts assess high-risk management and causation.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Who was involved', 'University physicians raise a public-entity question.'],
      ['Standard of care', 'Were complications managed reasonably?'],
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
      'Whether university (Regents) physicians were involved',
      'Whether high-risk complications were managed within the standard',
      'Whether the breach caused the injury',
      'Whether the applicable deadline is met',
      'The scope of lifelong economic damages',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'University fork', copy: 'Regents involvement can add a six-month clock.' },
      { label: 'High-risk analysis', copy: 'The question is reasonable management.' },
      { label: 'Economic is uncapped', copy: 'Lifelong care drives value.' },
      { label: 'Records decide it', copy: 'EFM strips are central evidence.' },
    ],
    insuranceProblems: [
      'A public-entity deadline tied to university physicians is missed.',
      'A high-risk defense goes unanswered by experts.',
      'The complete EFM strips and records are never obtained.',
      'No life-care plan quantifies future needs.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were university (UCSF Fresno) physicians involved?' },
      { label: 'Step 2', question: 'Was the pregnancy high-risk or transferred in?' },
      { label: 'Step 3', question: 'Have you requested the delivery records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
  [LB_BIRTH_SLUG]: {
    scenario: `A Long Beach newborn deteriorated in the NICU after warning signs went unaddressed. The claim covered both the delivery and the neonatal care, and confirming the hospital was private set the MICRA deadline correctly. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify whether the hospital was private or LA County public; request the record and EFM strips.'],
      ['Expert review', 'Experts assess the delivery and NICU care and causation.'],
      ['Notice', 'The 90-day notice \u2014 or any government claim \u2014 is addressed.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Hospital type', 'Private (MICRA) vs. LA County public (six-month).'],
      ['Delivery vs. NICU', 'Either or both can breach the standard.'],
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
      'Whether the hospital was private or an LA County public entity',
      'Whether the delivery or NICU care breached the standard',
      'Whether the breach caused the injury',
      'Whether the applicable deadline is met',
      'The scope of lifelong economic damages',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'NICU counts', copy: 'Neonatal care can be part of the claim.' },
      { label: 'Confirm the hospital', copy: 'Public vs. private sets the deadline.' },
      { label: 'Economic is uncapped', copy: 'Lifelong care drives value.' },
      { label: 'Records decide it', copy: 'EFM and NICU records are central.' },
    ],
    insuranceProblems: [
      'NICU negligence is treated as separate from the birth claim.',
      'A public-hospital deadline is missed.',
      'The complete delivery and NICU records are never obtained.',
      'No life-care plan quantifies future needs.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the hospital private or an LA County public facility?' },
      { label: 'Step 2', question: 'Did the harm arise in delivery, the NICU, or both?' },
      { label: 'Step 3', question: 'Have you requested the delivery and NICU records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
  [OAK_BIRTH_SLUG]: {
    scenario: `An Oakland baby cared for at a university children\u2019s hospital suffered a preventable injury. Recognising the hospital as a UC public entity meant a six-month government claim governed \u2014 a clock that, caught early, kept the claim alive. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify whether the hospital was UC/county (public) or private; request the record and EFM strips.'],
      ['Public clock', 'Present the six-month government claim if a public entity was involved.'],
      ['Expert review', 'Qualified experts assess standard of care and causation.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Hospital type', 'UC/county public triggers a six-month clock.'],
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
      'Whether the hospital was a UC or county public entity',
      'Whether a Kaiser arbitration agreement applies',
      'Whether a provider breached the standard of care',
      'Whether the breach caused the injury',
      'The scope of lifelong (uncapped) economic damages',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'Public is shorter', copy: 'A UC or county hospital can carry a six-month clock.' },
      { label: 'Kaiser arbitration', copy: 'An Oakland-headquartered enrollment agreement may move the dispute out of court.' },
      { label: 'Economic is uncapped', copy: 'Lifelong care drives value.' },
      { label: 'Records decide it', copy: 'EFM strips are central evidence.' },
    ],
    insuranceProblems: [
      'A UC or county six-month claim is missed.',
      'A Kaiser arbitration agreement is accepted without challenge.',
      'The complete EFM strips and records are never obtained.',
      'No life-care plan quantifies future needs.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the hospital UC/county (public), Kaiser, or another private facility?' },
      { label: 'Step 2', question: 'What is the child\u2019s diagnosis and age?' },
      { label: 'Step 3', question: 'Have you requested the delivery records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
}
