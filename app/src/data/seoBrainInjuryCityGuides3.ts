import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, traumatic-brain-injury (TBI) practice area (batch 3):
 * location-specific guides for Riverside, San Bernardino, Bakersfield, and
 * Anaheim, extending the batch-1 (LA, San Diego, San Francisco, Sacramento) and
 * batch-2 (San Jose, Fresno, Long Beach, Oakland) hub.
 *
 * A TBI claim rides on an underlying negligence claim; the central fight is
 * causation and severity, and a serious TBI drives large, largely economic,
 * often lifelong damages requiring specialised proof.
 *
 * Local context, genuine rather than interpolated:
 *  - Riverside: high-speed I-215/60/91 commuter crashes and warehouse/logistics
 *    struck-by injuries (often a third-party claim alongside workers\u2019 comp), with
 *    RTA buses and city roads as a public-entity fork.
 *  - San Bernardino: Cajon Pass / I-15 high-speed crashes and Inland Empire
 *    warehouse struck-by injuries, with Arrowhead Regional as the county trauma
 *    center and Omnitrans as a public-entity fork.
 *  - Bakersfield: Highway 99/58 crashes and oilfield/agricultural struck-by
 *    injuries, with Kern Medical as the county trauma center.
 *  - Anaheim: I-5/SR-91 crashes, tourist-corridor pedestrian impacts, and
 *    hospitality/theme-park incidents, with OCTA as a public-entity fork.
 *
 * Applied accurately (underlying negligence required; deadline follows it \u2014
 * generally two years under CCP 335.1, six months under the Government Claims Act
 * for a public entity, or the FTCA for a federal actor; causation-and-severity
 * fight answered with neuroimaging and neuropsychological testing; economic and
 * often lifelong damages with a life-care plan; pure comparative negligence).
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Whether another party is liable, how severe a brain injury is, and which deadline applies depend on facts a licensed California attorney should review promptly.'

const WHAT_TBI =
  'A traumatic brain injury ranges from a concussion (mild TBI) to a severe, disabling injury, and it can follow a crash, a fall, a struck-by injury, or an assault. Symptoms \u2014 headaches, memory and concentration problems, mood changes, dizziness \u2014 can be delayed and are easy to overlook at first, which makes early documentation important.'

const UNDERLYING =
  'A brain-injury claim rests on an underlying negligence claim: the at-fault party \u2014 a driver, a property owner, another responsible person \u2014 must still be shown to have caused the event that caused the injury. The deadline follows that underlying claim, generally two years (Code of Civil Procedure section 335.1), but as short as six months where a public entity is involved (Government Claims Act).'

const CAUSATION =
  'The decisive fight in a TBI case is causation and severity. Insurers routinely minimise a mild TBI as \u201cjust a concussion,\u201d so objective evidence carries the case: appropriate neuroimaging, formal neuropsychological testing, and consistent, well-documented treatment from the injury forward. Gaps or delays in care are used against the claim, which is why early, continuous documentation matters.'

const DAMAGES =
  'A serious brain injury drives damages that are largely economic and often lifelong: past and future medical and rehabilitation care, lost earning capacity where the injury affects the ability to work, and, for a severe injury, a life-care plan and vocational analysis \u2014 alongside non-economic damages for the profound effect on daily life. Pure comparative negligence applies.'

export const RIV_TBI_SLUG = '/riverside-brain-injury-claim'
export const SB_TBI_SLUG = '/san-bernardino-brain-injury-claim'
export const BAKERSFIELD_TBI_SLUG = '/bakersfield-brain-injury-claim'
export const ANAHEIM_TBI_SLUG = '/anaheim-brain-injury-claim'

export const brainInjuryCityGuidePages3: LandingPage[] = [
  {
    slug: RIV_TBI_SLUG,
    category: 'Cities',
    cluster: 'Riverside Brain Injury (TBI) Claims',
    title: 'Riverside Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury in a Riverside crash or warehouse job? The fight is causation and severity \u2014 and a logistics struck-by can support a third-party claim beyond workers\u2019 comp.',
    psychology: 'I hit my head in a Riverside crash or at a warehouse and I am worried it is a brain injury.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'riverside brain injury lawyer',
      'traumatic brain injury claim california',
      'warehouse struck by injury tbi third party california',
      'concussion after car accident lawsuit california',
      'tbi causation california',
    ],
    signals: [
      'Underlying negligence required',
      'Commuter freeway crashes',
      'Warehouse / logistics struck-by',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Lost earning capacity & life care',
    ],
    sections: {
      whyItMatters: `Riverside\u2019s long commutes on the I-215, 60, and 91 produce high-speed crashes, and the Inland Empire\u2019s vast warehouse and logistics economy produces struck-by and falling-object head injuries \u2014 and in each, the case turns on proving fault and the injury\u2019s severity. ${WHAT_TBI} ${UNDERLYING} A warehouse struck-by often supports a third-party claim \u2014 against a negligent contractor, equipment maker, or driver \u2014 alongside workers\u2019 compensation, reaching damages comp does not. Where a Riverside Transit Agency bus or a public road is involved, a six-month Government Claims Act deadline applies. ${CAUSATION} ${DAMAGES} Civil cases are filed in Riverside County Superior Court.`,
      whatToTrack: [
        'The underlying event (freeway crash, struck-by, fall) and who was at fault',
        'For a work injury, whether a third party (not the employer) was responsible',
        'Whether a public transit vehicle or road was involved',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'Consistent follow-up treatment and any gaps',
        'Effects on work and the ability to earn',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ ties a Riverside brain injury to the at-fault party \u2014 including any third party in a warehouse struck-by \u2014 flags any public-entity six-month deadline, and organises the neuroimaging and neuropsychological testing that answer the causation fight. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was struck on the head at a warehouse. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. If someone other than your employer \u2014 a contractor, an equipment manufacturer, a negligent driver \u2014 caused the struck-by or falling-object injury, you may have a third-party claim in addition to workers\u2019 compensation. That claim can reach damages workers\u2019 comp does not, so identifying every party involved matters.',
      },
      {
        q: 'The insurer says it was \u201cjust a concussion.\u201d Do I still have a claim?',
        a: 'Possibly, and that dismissal is exactly the fight. A concussion is a mild traumatic brain injury with effects that can be real and lasting. Objective evidence \u2014 neuroimaging, neuropsychological testing, and consistent treatment \u2014 is what counters that argument.',
      },
      {
        q: 'What do I have to prove?',
        a: 'That another party\u2019s negligence caused the event, and that the event caused a brain injury of the severity claimed. The TBI claim rides on the underlying liability, and the deadline follows it \u2014 generally two years, or six months if a public entity is involved.',
      },
      {
        q: 'What is a TBI claim worth?',
        a: 'It depends on fault, severity, and proof, and no responsible estimate can be given without a review. Serious TBI damages are largely economic and often lifelong \u2014 future care, lost earning capacity, and a life-care plan \u2014 alongside non-economic damages.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records, the testing, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SB_TBI_SLUG,
    category: 'Cities',
    cluster: 'San Bernardino Brain Injury (TBI) Claims',
    title: 'San Bernardino Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury on the Cajon Pass, a Inland Empire freeway, or a warehouse job? The fight is causation and severity \u2014 and a struck-by can support a third-party claim beyond workers\u2019 comp.',
    psychology: 'I hit my head in a San Bernardino crash or at a warehouse and I am worried about a brain injury.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san bernardino brain injury lawyer',
      'traumatic brain injury claim california',
      'cajon pass crash head injury california',
      'warehouse struck by injury tbi third party california',
      'concussion after accident lawsuit california',
    ],
    signals: [
      'Underlying negligence required',
      'Cajon Pass / I-15 crashes',
      'Warehouse / logistics struck-by',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Lost earning capacity & life care',
    ],
    sections: {
      whyItMatters: `High-speed crashes on the Cajon Pass and I-15, and struck-by injuries across the Inland Empire\u2019s dense warehouse economy, make serious brain injuries common around San Bernardino \u2014 and Arrowhead Regional is the county trauma center that receives the worst of them. ${WHAT_TBI} ${UNDERLYING} A warehouse or distribution struck-by often supports a third-party claim alongside workers\u2019 compensation where someone other than the employer was at fault. Where an Omnitrans bus or a public road is involved, a six-month Government Claims Act deadline applies. ${CAUSATION} ${DAMAGES} Civil cases are filed in San Bernardino County Superior Court.`,
      whatToTrack: [
        'The underlying event (grade crash, struck-by, fall) and who was at fault',
        'For a work injury, whether a third party (not the employer) was responsible',
        'Whether a public transit vehicle or road was involved',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'The trauma and transport records, especially after a serious crash',
        'Consistent follow-up treatment and any gaps',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ ties a San Bernardino brain injury to the at-fault party \u2014 including any third party in a warehouse struck-by \u2014 organises the trauma, neuroimaging, and neuropsychological records that answer the causation fight, and builds the earning-capacity and life-care picture. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt at a warehouse. Can I have a claim beyond workers\u2019 compensation?',
        a: 'Possibly. If someone other than your employer \u2014 a contractor, an equipment maker, a negligent driver \u2014 caused a struck-by or crash injury on the job, you may have a third-party claim in addition to workers\u2019 compensation. That claim can reach damages workers\u2019 comp does not.',
      },
      {
        q: 'The insurer says it was \u201cjust a concussion.\u201d Do I still have a claim?',
        a: 'Possibly, and that is the central fight. A concussion is a mild traumatic brain injury with effects that can be real and lasting. Objective evidence \u2014 neuroimaging, neuropsychological testing, and consistent treatment \u2014 counters that argument.',
      },
      {
        q: 'My crash on the Cajon Pass was severe. Does that matter?',
        a: 'It can help. The trauma and transport records from a serious high-speed grade crash document the mechanism and force involved, which supports causation for a brain injury. Preserving those records, along with early imaging, is important.',
      },
      {
        q: 'What is a TBI claim worth?',
        a: 'It depends on fault, severity, and proof, and no responsible estimate can be given without a review. Serious TBI damages are largely economic and often lifelong \u2014 future care, lost earning capacity, and a life-care plan \u2014 alongside non-economic damages.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records, the testing, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: BAKERSFIELD_TBI_SLUG,
    category: 'Cities',
    cluster: 'Bakersfield Brain Injury (TBI) Claims',
    title: 'Bakersfield Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury in a Bakersfield-area crash or oilfield job? High-speed Highway 99/58 collisions and struck-by injuries are common \u2014 and the fight is causation and severity.',
    psychology: 'I hit my head in a Bakersfield crash or at work and I do not know if it is a brain injury or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'bakersfield brain injury lawyer',
      'traumatic brain injury claim california',
      'highway 58 crash head injury california',
      'oilfield struck by injury tbi california',
      'concussion after accident lawsuit california',
    ],
    signals: [
      'Underlying negligence required',
      'Highway 99/58 high-speed crashes',
      'Oilfield / agricultural struck-by',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Lost earning capacity & life care',
    ],
    sections: {
      whyItMatters: `High-speed crashes on Highway 99 and 58, and struck-by injuries in Kern County\u2019s oilfield and agricultural work, make serious brain injuries common around Bakersfield \u2014 and Kern Medical is the county trauma center that receives the worst of them, sometimes after long transport. ${WHAT_TBI} ${UNDERLYING} An oilfield or agricultural struck-by often supports a third-party claim alongside workers\u2019 compensation where someone other than the employer \u2014 an operator, a contractor, an equipment maker \u2014 was at fault. ${CAUSATION} ${DAMAGES} Civil cases are filed in Kern County Superior Court.`,
      whatToTrack: [
        'The underlying event (highway crash, struck-by, fall) and who was at fault',
        'For a work injury, whether a third party (not the employer) was responsible',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'The trauma and transport records, especially after a serious crash',
        'Consistent follow-up treatment and any gaps',
        'Effects on work and the ability to earn',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ ties a Bakersfield brain injury to the at-fault party \u2014 including any third party in an oilfield or agricultural struck-by \u2014 organises the trauma, neuroimaging, and neuropsychological records that answer the causation fight, and builds the earning-capacity and life-care picture. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt in the oilfield or on a farm. Can I have a claim beyond workers\u2019 comp?',
        a: 'Possibly. If someone other than your employer \u2014 an operator, a contractor, an equipment maker, a negligent driver \u2014 caused a struck-by or crash injury on the job, you may have a third-party claim in addition to workers\u2019 compensation. That claim can reach damages workers\u2019 comp does not.',
      },
      {
        q: 'The insurer says it was \u201cjust a concussion.\u201d Do I still have a claim?',
        a: 'Possibly, and that is the central fight. A concussion is a mild traumatic brain injury with effects that can be real and lasting. Objective evidence \u2014 neuroimaging, neuropsychological testing, and consistent treatment \u2014 counters that argument.',
      },
      {
        q: 'My crash was severe and I was transported a long way. Does that matter?',
        a: 'It can help. The trauma and transport records from a serious high-speed crash document the mechanism and force involved, which supports causation for a brain injury. Preserving those records, along with early imaging, is important.',
      },
      {
        q: 'What is a TBI claim worth?',
        a: 'It depends on fault, severity, and proof, and no responsible estimate can be given without a review. Serious TBI damages are largely economic and often lifelong \u2014 future care, lost earning capacity, and a life-care plan \u2014 alongside non-economic damages.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records, the testing, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: ANAHEIM_TBI_SLUG,
    category: 'Cities',
    cluster: 'Anaheim Brain Injury (TBI) Claims',
    title: 'Anaheim Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury in an Anaheim crash, a tourist-corridor impact, or at a venue? The fight is causation and severity \u2014 and an OCTA bus or public road adds a six-month deadline.',
    psychology: 'I hit my head in an Anaheim accident and I do not know if it is a brain injury or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'anaheim brain injury lawyer',
      'traumatic brain injury claim california',
      'octa bus head injury claim california',
      'theme park head injury claim california',
      'concussion after car accident lawsuit california',
    ],
    signals: [
      'Underlying negligence required',
      'OCTA bus / public road (public)',
      'Tourist-corridor pedestrian impacts',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Lost earning capacity & life care',
    ],
    sections: {
      whyItMatters: `Anaheim\u2019s I-5 and SR-91 crashes, its dense tourist-corridor pedestrian traffic, and its hospitality and theme-park venues all produce brain injuries \u2014 and in each, the case turns on proving fault and the injury\u2019s severity. ${WHAT_TBI} ${UNDERLYING} Where an OCTA bus or a public road is involved, a six-month Government Claims Act deadline applies, far shorter than the usual two years; a venue injury instead runs against a private operator. ${CAUSATION} ${DAMAGES} Civil cases are filed in Orange County Superior Court after any required claim.`,
      whatToTrack: [
        'The underlying event (crash, pedestrian impact, venue incident) and who was at fault',
        'Whether an OCTA bus or a public road was involved',
        'The date of injury, which starts any six-month clock',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'Consistent follow-up treatment and any gaps',
        'Effects on work and the ability to earn',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether an Anaheim brain injury involves a public entity \u2014 and its six-month deadline \u2014 ties it to the at-fault party, and organises the neuroimaging and neuropsychological testing that answer the causation fight. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An OCTA bus or public road was involved. Does the deadline change?',
        a: 'Yes. OCTA and the city are public entities, so where a bus or a public road is involved, the Government Claims Act requires a written claim within six months of the injury \u2014 far shorter than the usual two years. Identifying public-entity involvement immediately is essential.',
      },
      {
        q: 'I hit my head at a theme park or hotel. Can that be a claim?',
        a: 'It can. A venue or property owner can be liable where a dangerous condition or negligent operation caused the injury. The claim still requires proving fault and the injury\u2019s severity through objective evidence, and runs against the private operator rather than a public entity.',
      },
      {
        q: 'The insurer says it was \u201cjust a concussion.\u201d Do I still have a claim?',
        a: 'Possibly, and that is the central fight. A concussion is a mild traumatic brain injury with effects that can be real and lasting. Objective evidence \u2014 neuroimaging, neuropsychological testing, and consistent treatment \u2014 counters that argument.',
      },
      {
        q: 'What is a TBI claim worth?',
        a: 'It depends on fault, severity, and proof, and no responsible estimate can be given without a review. Serious TBI damages are largely economic and often lifelong \u2014 future care, lost earning capacity, and a life-care plan \u2014 alongside non-economic damages.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records, the testing, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const brainInjuryCityGuideTopicContentBySlug3: Record<string, TopicContent> = {
  [RIV_TBI_SLUG]: {
    scenario: `A Riverside warehouse worker struck by a contractor\u2019s forklift suffered a serious TBI. Identifying the contractor as a third party opened a claim beyond workers\u2019 compensation, and neuropsychological testing documented the severity. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the mechanism and every party, including any third party.'],
      ['First days', 'Report symptoms; begin consistent treatment.'],
      ['First weeks', 'Neuroimaging and neuropsychological testing document the injury.'],
      ['Longer term', 'Third-party liability and life-care issues developed.'],
    ],
    severityLadder: [
      ['Who is at fault', 'A third party can open a claim beyond comp.'],
      ['Causation', 'The event must be tied to the injury.'],
      ['Severity', 'Objective testing establishes it.'],
      ['Damages', 'Economic losses are often lifelong.'],
    ],
    treatmentProgression: [
      { label: 'First evaluation', copy: 'Early care documents the injury.' },
      { label: 'Imaging & testing', copy: 'Neuroimaging and neuropsych testing prove severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Life-care plan', copy: 'Future needs are quantified for severe injury.' },
    ],
    settlementDrivers: [
      'Whether a third party (not the employer) is at fault',
      'Whether the underlying negligence is clear',
      'Whether causation and severity are established',
      'Whether treatment was consistent',
      'The scope of lost earning capacity and future care',
      'Whether a life-care plan supports severe injury',
    ],
    settlementValueDetails: [
      { label: 'Third party matters', copy: 'It reaches damages comp does not.' },
      { label: 'Objective proof', copy: 'Imaging and testing carry the case.' },
      { label: 'Economic drives value', copy: 'Future care and earning loss dominate.' },
      { label: 'Consistency matters', copy: 'Gaps in care are used against you.' },
    ],
    insuranceProblems: [
      'A third-party claim is missed, leaving only workers\u2019 comp.',
      'The injury is dismissed as \u201cjust a concussion.\u201d',
      'Neuroimaging and neuropsychological testing are never done.',
      'Gaps in treatment undermine causation.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a third party (not the employer) involved?' },
      { label: 'Step 2', question: 'What caused the injury, and who was at fault?' },
      { label: 'Step 3', question: 'Have you had imaging or neuropsych testing?' },
      { label: 'Step 4', question: 'How has it affected work and daily life?' },
    ],
  },
  [SB_TBI_SLUG]: {
    scenario: `A driver was hit at high speed descending the Cajon Pass and suffered a serious TBI. The trauma and transport records documented the force, and objective testing established the severity against a \u201cjust a concussion\u201d defense. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the head impact and the at-fault party; get checked.'],
      ['First days', 'Report symptoms promptly; begin consistent treatment.'],
      ['First weeks', 'Neuroimaging and neuropsychological testing document the injury.'],
      ['Longer term', 'Causation, severity, and life-care issues developed.'],
    ],
    severityLadder: [
      ['Underlying fault', 'The at-fault party must be proven.'],
      ['Causation', 'The event must be tied to the injury.'],
      ['Severity', 'Objective testing establishes it.'],
      ['Damages', 'Economic losses are often lifelong.'],
    ],
    treatmentProgression: [
      { label: 'First evaluation', copy: 'Trauma and early care document the injury.' },
      { label: 'Imaging & testing', copy: 'Neuroimaging and neuropsych testing prove severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Life-care plan', copy: 'Future needs are quantified for severe injury.' },
    ],
    settlementDrivers: [
      'Whether the underlying negligence is clear',
      'Whether a third party or public entity is involved',
      'Whether causation and severity are established',
      'Whether treatment was consistent',
      'The scope of lost earning capacity and future care',
      'Whether a life-care plan supports severe injury',
    ],
    settlementValueDetails: [
      { label: 'Trauma records help', copy: 'They document the mechanism and force.' },
      { label: 'Objective proof', copy: 'Imaging and testing carry the case.' },
      { label: 'Economic drives value', copy: 'Future care and earning loss dominate.' },
      { label: 'Consistency matters', copy: 'Gaps in care are used against you.' },
    ],
    insuranceProblems: [
      'The injury is dismissed as \u201cjust a concussion.\u201d',
      'A third-party or public-entity claim is missed.',
      'Neuroimaging and neuropsychological testing are never done.',
      'Gaps in treatment undermine causation.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the injury, and who was at fault?' },
      { label: 'Step 2', question: 'Was a third party or public entity involved?' },
      { label: 'Step 3', question: 'Have you had imaging or neuropsych testing?' },
      { label: 'Step 4', question: 'How has it affected work and daily life?' },
    ],
  },
  [BAKERSFIELD_TBI_SLUG]: {
    scenario: `A Bakersfield oilfield worker struck by equipment operated by another company suffered a TBI. The third-party operator\u2019s negligence supported a claim beyond workers\u2019 compensation, and imaging documented the severity. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the mechanism and every party, including any third party.'],
      ['First days', 'Report symptoms; begin consistent treatment.'],
      ['First weeks', 'Neuroimaging and neuropsychological testing document the injury.'],
      ['Longer term', 'Third-party liability and life-care issues developed.'],
    ],
    severityLadder: [
      ['Who is at fault', 'A third party can open a claim beyond comp.'],
      ['Causation', 'The event must be tied to the injury.'],
      ['Severity', 'Objective testing establishes it.'],
      ['Damages', 'Economic losses are often lifelong.'],
    ],
    treatmentProgression: [
      { label: 'First evaluation', copy: 'Trauma and early care document the injury.' },
      { label: 'Imaging & testing', copy: 'Neuroimaging and neuropsych testing prove severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Life-care plan', copy: 'Future needs are quantified for severe injury.' },
    ],
    settlementDrivers: [
      'Whether a third party (not the employer) is at fault',
      'Whether the underlying negligence is clear',
      'Whether causation and severity are established',
      'Whether treatment was consistent',
      'The scope of lost earning capacity and future care',
      'Whether a life-care plan supports severe injury',
    ],
    settlementValueDetails: [
      { label: 'Third party matters', copy: 'It reaches damages comp does not.' },
      { label: 'Objective proof', copy: 'Imaging and testing carry the case.' },
      { label: 'Trauma records help', copy: 'They document the mechanism and force.' },
      { label: 'Economic drives value', copy: 'Future care and earning loss dominate.' },
    ],
    insuranceProblems: [
      'A third-party claim is missed, leaving only workers\u2019 comp.',
      'The injury is dismissed as \u201cjust a concussion.\u201d',
      'Neuroimaging and neuropsychological testing are never done.',
      'Gaps in treatment undermine causation.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a third party (not the employer) involved?' },
      { label: 'Step 2', question: 'What caused the injury, and who was at fault?' },
      { label: 'Step 3', question: 'Have you had imaging or neuropsych testing?' },
      { label: 'Step 4', question: 'How has it affected work and daily life?' },
    ],
  },
  [ANAHEIM_TBI_SLUG]: {
    scenario: `An Anaheim pedestrian struck by an OCTA bus suffered a serious TBI. Recognising the public-entity involvement meant a six-month claim was presented in time, and objective testing documented the injury. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the head impact and whether a public vehicle/road was involved.'],
      ['First days', 'Report symptoms; begin consistent treatment.'],
      ['Six-month mark', 'Any government claim presented to the right entity.'],
      ['Longer term', 'Causation, severity, and life-care issues developed.'],
    ],
    severityLadder: [
      ['Public entity?', 'It triggers a six-month deadline.'],
      ['Underlying fault', 'Negligence must be proven.'],
      ['Severity', 'Objective testing establishes it.'],
      ['Damages', 'Economic losses are often lifelong.'],
    ],
    treatmentProgression: [
      { label: 'First evaluation', copy: 'Early care documents the injury.' },
      { label: 'Imaging & testing', copy: 'Neuroimaging and neuropsych testing prove severity.' },
      { label: 'Continuing care', copy: 'Consistency answers causation arguments.' },
      { label: 'Life-care plan', copy: 'Future needs are quantified for severe injury.' },
    ],
    settlementDrivers: [
      'Whether a public entity is involved (six-month claim)',
      'Whether the underlying negligence is clear',
      'Whether causation and severity are established',
      'Whether treatment was consistent',
      'The scope of lost earning capacity and future care',
      'Whether a life-care plan supports severe injury',
    ],
    settlementValueDetails: [
      { label: 'Deadline can be short', copy: 'OCTA or the city means six months.' },
      { label: 'Objective proof', copy: 'Imaging and testing carry the case.' },
      { label: 'Economic drives value', copy: 'Future care and earning loss dominate.' },
      { label: 'Consistency matters', copy: 'Gaps in care are used against you.' },
    ],
    insuranceProblems: [
      'A public-entity six-month deadline is missed.',
      'The injury is dismissed as \u201cjust a concussion.\u201d',
      'Neuroimaging and neuropsychological testing are never done.',
      'Gaps in treatment undermine causation.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was an OCTA bus, city vehicle, or public road involved?' },
      { label: 'Step 2', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 3', question: 'When did head symptoms begin?' },
      { label: 'Step 4', question: 'Have you had imaging or neuropsych testing?' },
    ],
  },
}
