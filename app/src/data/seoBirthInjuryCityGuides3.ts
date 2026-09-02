import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, birth-injury / labor-and-delivery malpractice practice area
 * (batch 3): location-specific guides for Riverside, San Bernardino, Bakersfield,
 * and Anaheim, extending the batch-1 (LA, San Diego, San Francisco, Sacramento)
 * and batch-2 (San Jose, Fresno, Long Beach, Oakland) hub.
 *
 * A birth-injury claim is a distinct medical-professional-negligence claim
 * governed by MICRA, with a special statute of limitations for minors, a heavy
 * reliance on fetal-monitoring and delivery records, and lifelong-care damages.
 *
 * Local context, genuine rather than interpolated:
 *  - Riverside: Riverside University Health System (RUHS) Medical Center is a
 *    county public delivery hospital (a Government Claims Act six-month clock),
 *    alongside private Riverside Community Hospital and Kaiser Riverside.
 *  - San Bernardino: Arrowhead Regional Medical Center is a county public hospital
 *    (six-month clock); Loma Linda University Children\u2019s is the region\u2019s major
 *    high-risk NICU and referral center.
 *  - Bakersfield: Kern Medical is a county public hospital (six-month clock),
 *    alongside Adventist Health and Bakersfield Memorial, with long transfers for
 *    the highest-risk deliveries.
 *  - Anaheim: Kaiser Anaheim brings admission arbitration; CHOC and UC Irvine
 *    (the Regents, a public fork) handle regional NICU and referral care.
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

export const RIV_BIRTH_SLUG = '/riverside-birth-injury-claim'
export const SB_BIRTH_SLUG = '/san-bernardino-birth-injury-claim'
export const BAKERSFIELD_BIRTH_SLUG = '/bakersfield-birth-injury-claim'
export const ANAHEIM_BIRTH_SLUG = '/anaheim-birth-injury-claim'

export const birthInjuryCityGuidePages3: LandingPage[] = [
  {
    slug: RIV_BIRTH_SLUG,
    category: 'Cities',
    cluster: 'Riverside Birth Injury Claims',
    title: 'Riverside Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby in Riverside? A birth at the county hospital runs on a six-month clock, Kaiser deliveries raise arbitration, and every birth-injury claim has a special deadline for children.',
    psychology: 'My baby was hurt during delivery in Riverside and I do not know if the hospital was public or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside birth injury lawyer',
      'ruhs medical center birth injury claim',
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
      whyItMatters: `Riverside\u2019s delivery care spans very different institutions, and which one was involved changes the claim at the outset. ${PUBLIC_ENTITY} Riverside University Health System (RUHS) Medical Center is a county public hospital, so a claim involving it can run on the six-month Government Claims Act clock; Kaiser has a large local presence and brings admission arbitration into play; and private hospitals such as Riverside Community operate under MICRA. ${PROF_NEG} ${MICRA} ${SOL_MINOR} ${EVIDENCE} Private civil cases are filed in Riverside County Superior Court after the required notice.`,
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
      howClearCaseHelps: `ClearCaseIQ first identifies whether a Riverside delivery hospital was the county facility (a six-month clock) or private, assesses any Kaiser arbitration agreement, requests the complete record and EFM strips, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My baby was delivered at RUHS Medical Center. Does that change the deadline?',
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
    slug: SB_BIRTH_SLUG,
    category: 'Cities',
    cluster: 'San Bernardino Birth Injury Claims',
    title: 'San Bernardino Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby in San Bernardino? A county hospital runs on a six-month clock, a major university children\u2019s hospital handles high-risk newborns, and every birth-injury claim has a special deadline for children.',
    psychology: 'My baby was hurt during delivery in San Bernardino and I do not know if the hospital was public or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino birth injury lawyer',
      'arrowhead regional birth injury claim',
      'loma linda nicu negligence california',
      'cerebral palsy malpractice claim california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'County hospital (six-month claim)',
      'Regional high-risk NICU',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
    ],
    sections: {
      whyItMatters: `San Bernardino combines a county public hospital with a major regional referral center, so the hospital-type question is front and centre. ${PUBLIC_ENTITY} Arrowhead Regional Medical Center is a county public hospital that can carry a six-month Government Claims Act clock, while Loma Linda University Children\u2019s is the region\u2019s major high-risk NICU and referral center handling the sickest newborns under MICRA. ${PROF_NEG} ${MICRA} ${SOL_MINOR} ${EVIDENCE} Private civil cases are filed in San Bernardino County Superior Court after the required notice.`,
      whatToTrack: [
        'Whether the delivery or NICU hospital was county (public) or private',
        'Whether the newborn was transferred to a regional NICU',
        'The child\u2019s diagnosis (HIE, cerebral palsy, Erb\u2019s palsy) and age',
        'The complete labor-and-delivery and NICU record and EFM strips',
        'The cord-blood gases, Apgar scores, and newborn records',
        'The applicable deadline \u2014 six-month public rule or the special minor rule',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a San Bernardino delivery hospital was the county facility (a six-month clock) or a private referral center, requests the complete record and EFM strips for expert review, tracks the child\u2019s and any parent\u2019s deadlines, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My baby was delivered at Arrowhead Regional. Does that change the deadline?',
        a: 'Yes, potentially. It is a county public hospital, so on top of the MICRA rules a written claim may need to be presented within six months under the Government Claims Act \u2014 far shorter than the special minor deadline. Identifying the hospital as public at the outset is essential.',
      },
      {
        q: 'My baby was in the Loma Linda NICU. Can NICU care be part of a claim?',
        a: 'Yes. A birth-injury claim can involve both the delivery and the neonatal care that followed \u2014 for example, a failure to recognise or treat a newborn\u2019s deteriorating condition. The question is whether the care fell below the standard and caused harm, established through the complete records and expert review.',
      },
      {
        q: 'How long do I have to bring a birth-injury claim?',
        a: 'It is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the eighth birthday. A parent\u2019s own claim can run on a different clock, and a public-entity claim is much shorter, so all must be assessed early.',
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
    slug: BAKERSFIELD_BIRTH_SLUG,
    category: 'Cities',
    cluster: 'Bakersfield Birth Injury Claims',
    title: 'Bakersfield Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby in Bakersfield? The county hospital runs on a six-month clock, the highest-risk deliveries transfer long distances, and every birth-injury claim has a special deadline for children.',
    psychology: 'My baby was hurt during delivery in Bakersfield and I do not know if the hospital was public or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield birth injury lawyer',
      'kern medical birth injury claim',
      'cerebral palsy malpractice claim california',
      'delivery negligence lawsuit california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'County hospital (six-month claim)',
      'Long high-risk transfers',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
    ],
    sections: {
      whyItMatters: `Bakersfield\u2019s delivery care mixes a county public hospital with private facilities, and the highest-risk deliveries often transfer long distances, so the hospital-type question and the timing of care both matter. ${PUBLIC_ENTITY} Kern Medical is a county public hospital that can carry a six-month Government Claims Act clock, alongside private hospitals such as Adventist Health and Bakersfield Memorial under MICRA. ${PROF_NEG} ${MICRA} ${SOL_MINOR} ${EVIDENCE} Private civil cases are filed in Kern County Superior Court after the required notice.`,
      whatToTrack: [
        'Whether the delivery hospital was county (public) or private',
        'Whether a high-risk pregnancy was transferred and any delay involved',
        'The child\u2019s diagnosis (HIE, cerebral palsy, Erb\u2019s palsy) and age',
        'The complete labor-and-delivery record and EFM strips',
        'The cord-blood gases, Apgar scores, and newborn records',
        'The applicable deadline \u2014 six-month public rule or the special minor rule',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether a Bakersfield delivery hospital was the county facility (a six-month clock) or private, examines any transfer delay for a high-risk pregnancy, requests the complete record and EFM strips, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My baby was delivered at Kern Medical. Does that change the deadline?',
        a: 'Yes, potentially. It is a county public hospital, so on top of the MICRA rules a written claim may need to be presented within six months under the Government Claims Act \u2014 far shorter than the special minor deadline. Identifying the hospital as public at the outset is essential.',
      },
      {
        q: 'My high-risk pregnancy was transferred out of the area. Does a delay matter?',
        a: 'It can. Where a high-risk pregnancy needed a higher level of care, whether the recognition and transfer were handled reasonably and in time can be central to the claim. Expert review of the records establishes whether a delay fell below the standard and caused harm.',
      },
      {
        q: 'How long do I have to bring a birth-injury claim?',
        a: 'It is special. Under Code of Civil Procedure section 340.5, a minor\u2019s claim must generally be brought within three years of the injury, except that a child under six has until the later of three years or the eighth birthday. A parent\u2019s own claim can run on a different clock, and a public-entity claim is much shorter, so all must be assessed early.',
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
    slug: ANAHEIM_BIRTH_SLUG,
    category: 'Cities',
    cluster: 'Anaheim Birth Injury Claims',
    title: 'Anaheim Birth Injury Claims',
    eyebrow: 'California local injury guide',
    description:
      'Did a delivery error harm your baby in Anaheim? Kaiser deliveries raise arbitration, a university medical center is a public fork, and every birth-injury claim has a special deadline for children.',
    psychology: 'My baby was hurt during delivery in Anaheim and I do not know if arbitration applies or how long I have.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim birth injury lawyer',
      'kaiser anaheim birth injury arbitration california',
      'choc nicu negligence california',
      'cerebral palsy malpractice claim california',
      'birth injury statute of limitations california',
    ],
    signals: [
      'Medical professional negligence',
      'Kaiser admission arbitration',
      'UC Irvine public fork',
      'Special minor deadline (340.5)',
      'Fetal-monitoring (EFM) records',
      'Life-care plan for lifelong needs',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s delivery and neonatal care runs through several distinct institutions, and which one was involved changes the claim at the outset. Kaiser has a large Anaheim presence and brings admission arbitration into play; CHOC handles regional NICU and referral care under MICRA; and where UC Irvine (the Regents) physicians were involved, a public-entity question arises. ${PUBLIC_ENTITY} ${PROF_NEG} ${MICRA} ${SOL_MINOR} ${EVIDENCE} Private civil cases are filed in Orange County Superior Court after the required notice.`,
      whatToTrack: [
        'Whether the delivery hospital was Kaiser, UC (public), or another private facility',
        'Any Kaiser or other admission arbitration agreement, and by whom it was signed',
        'Whether the newborn was transferred to a regional NICU (CHOC)',
        'The child\u2019s diagnosis (HIE, cerebral palsy, Erb\u2019s palsy) and age',
        'The complete labor-and-delivery and NICU record and EFM strips',
        'The applicable deadline \u2014 six-month public rule or the special minor rule',
        'Any separate parent claim and its different clock',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies whether an Anaheim delivery involved Kaiser (arbitration), UC Irvine (a public six-month clock), or another private hospital, requests the complete record and EFM strips, and organises the care needs for a life-care plan. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I have Kaiser in Anaheim. Does arbitration affect a birth-injury claim?',
        a: 'It can. Kaiser typically requires an arbitration agreement at enrollment, so a dispute may proceed in arbitration rather than court. Whether and how it applies depends on how and by whom it was signed, and these agreements are frequently contested, so it is worth assessing early rather than assuming it ends the matter.',
      },
      {
        q: 'My baby was cared for at CHOC or by UC Irvine physicians. Does that matter?',
        a: 'It can. CHOC is a private referral NICU under MICRA, but if University of California (UC Irvine) physicians were involved, a public-entity question arises, which can add a six-month Government Claims Act deadline. Identifying who was involved early is important.',
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
]

export const birthInjuryCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [RIV_BIRTH_SLUG]: {
    scenario: `A Riverside baby was injured after fetal distress went unaddressed at the county hospital. Recognising the hospital as a public entity meant a six-month government claim, not the longer minor deadline, governed \u2014 and flagging it early kept the claim alive. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify whether the hospital was county (public) or private; request the record and EFM strips.'],
      ['Public clock', 'Present the six-month government claim if a public entity was involved.'],
      ['Expert review', 'Qualified experts assess standard of care and causation.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Hospital type', 'County public triggers a six-month clock.'],
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
  [SB_BIRTH_SLUG]: {
    scenario: `A San Bernardino newborn deteriorated after warning signs went unaddressed and was transferred to a regional NICU. The claim covered both the delivery and the neonatal care, and confirming the delivery hospital\u2019s type set the deadline correctly. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify whether the hospital was county (public) or private; request the record and EFM strips.'],
      ['Expert review', 'Experts assess the delivery and NICU care and causation.'],
      ['Notice', 'The 90-day notice \u2014 or any government claim \u2014 is addressed.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Hospital type', 'County public triggers a six-month clock.'],
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
      'Whether the delivery hospital was public or private',
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
      { label: 'Step 1', question: 'Was the delivery hospital county (public) or private?' },
      { label: 'Step 2', question: 'Was the newborn transferred to a regional NICU?' },
      { label: 'Step 3', question: 'Have you requested the delivery and NICU records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
  [BAKERSFIELD_BIRTH_SLUG]: {
    scenario: `A Bakersfield high-risk pregnancy that should have been transferred sooner ended in a hypoxic brain injury. Confirming the county hospital\u2019s public status set a six-month clock, and the EFM strips drove the standard-of-care analysis. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify whether the hospital was county (public) or private; request the record and EFM strips.'],
      ['Public clock', 'Present the six-month government claim if a public entity was involved.'],
      ['Expert review', 'Experts assess recognition, transfer timing, and causation.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Hospital type', 'County public triggers a six-month clock.'],
      ['Transfer timing', 'Was a high-risk case escalated in time?'],
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
      'Whether a high-risk case was recognised and transferred in time',
      'Whether the breach caused the injury',
      'Whether the applicable deadline is met',
      'The scope of lifelong economic damages',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'Public is shorter', copy: 'A county hospital can carry a six-month clock.' },
      { label: 'Transfer timing', copy: 'Delay in escalation can be the breach.' },
      { label: 'Economic is uncapped', copy: 'Lifelong care drives value.' },
      { label: 'Records decide it', copy: 'EFM strips are central evidence.' },
    ],
    insuranceProblems: [
      'A public-hospital six-month claim is missed.',
      'A transfer-delay theory goes unexamined by experts.',
      'The complete EFM strips and records are never obtained.',
      'No life-care plan quantifies future needs.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the hospital county (public) or private?' },
      { label: 'Step 2', question: 'Was a high-risk pregnancy transferred, and when?' },
      { label: 'Step 3', question: 'Have you requested the delivery records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
  [ANAHEIM_BIRTH_SLUG]: {
    scenario: `An Anaheim baby was injured during a Kaiser delivery. The enrollment arbitration agreement was assessed rather than assumed, the complete record and EFM strips were obtained, and the life-care plan quantified lifelong needs. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Identify Kaiser, UC (public), or private; request the record and EFM strips.'],
      ['Arbitration', 'Assess any Kaiser enrollment arbitration agreement.'],
      ['Expert review', 'Qualified experts assess standard of care and causation.'],
      ['Longer term', 'The life-care plan and MICRA analysis developed.'],
    ],
    severityLadder: [
      ['Institution', 'Kaiser (arbitration) vs. UC (public) vs. private.'],
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
      'Whether a Kaiser arbitration agreement applies',
      'Whether UC (Regents) physicians raise a public-entity clock',
      'Whether a provider breached the standard of care',
      'Whether the breach caused the injury',
      'The scope of lifelong (uncapped) economic damages',
      'The strength of the life-care plan',
    ],
    settlementValueDetails: [
      { label: 'Kaiser arbitration', copy: 'An enrollment agreement may move the dispute out of court.' },
      { label: 'University fork', copy: 'UC Irvine involvement can add a six-month clock.' },
      { label: 'Economic is uncapped', copy: 'Lifelong care drives value.' },
      { label: 'Records decide it', copy: 'EFM strips are central evidence.' },
    ],
    insuranceProblems: [
      'A Kaiser arbitration agreement is accepted without challenge.',
      'A UC public-entity deadline is missed.',
      'The complete EFM strips and records are never obtained.',
      'No life-care plan quantifies future needs.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was the hospital Kaiser, UC (public), or another private facility?' },
      { label: 'Step 2', question: 'Is there a Kaiser enrollment arbitration agreement?' },
      { label: 'Step 3', question: 'Have you requested the delivery records?' },
      { label: 'Step 4', question: 'What ongoing care does the child need?' },
    ],
  },
}
