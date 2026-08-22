import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, traumatic-brain-injury (TBI) practice area (batch 2):
 * location-specific guides for San Jose, Fresno, Long Beach, and Oakland,
 * extending the batch-1 hub (LA, San Diego, San Francisco, Sacramento).
 *
 * A TBI claim rides on an underlying negligence claim; the central fight is
 * causation and severity, and a serious TBI drives large, largely economic,
 * often lifelong damages requiring specialised proof.
 *
 * Local context, genuine rather than interpolated:
 *  - San Jose: a high-wage knowledge-work economy, so a cognitive brain injury
 *    can produce very large earning-capacity losses; freeway crashes and VTA
 *    light-rail/bus incidents (a public-entity six-month fork).
 *  - Fresno: high-speed Highway 99 crashes and agricultural struck-by injuries,
 *    with Community Regional as the valley\u2019s level-I trauma center and long
 *    transport times that make causation documentation important.
 *  - Long Beach: port and industrial struck-by injuries (often a third-party
 *    claim alongside workers\u2019 comp) and dense-traffic pedestrian impacts.
 *  - Oakland: freeway and surface-street crashes, pedestrian impacts, and
 *    assaults, with AC Transit and city vehicles raising a public-entity fork.
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

export const SJ_TBI_SLUG = '/san-jose-brain-injury-claim'
export const FRESNO_TBI_SLUG = '/fresno-brain-injury-claim'
export const LB_TBI_SLUG = '/long-beach-brain-injury-claim'
export const OAK_TBI_SLUG = '/oakland-brain-injury-claim'

export const brainInjuryCityGuidePages2: LandingPage[] = [
  {
    slug: SJ_TBI_SLUG,
    category: 'Attorney Intent',
    cluster: 'San Jose Brain Injury (TBI) Claims',
    title: 'San Jose Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury in a San Jose crash or fall? The fight is causation and severity \u2014 and in a high-wage knowledge economy, a cognitive injury can mean very large earning-capacity losses.',
    psychology: 'I hit my head in a San Jose accident and I am worried it is a brain injury that could affect my career.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san jose brain injury lawyer',
      'traumatic brain injury claim california',
      'concussion after car accident lawsuit california',
      'head injury lost earning capacity california',
      'tbi causation california',
    ],
    signals: [
      'Underlying negligence required',
      'High cognitive earning capacity',
      'VTA light rail / bus (public entity)',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Lost earning capacity & life care',
    ],
    sections: {
      whyItMatters: `San Jose\u2019s economy runs on high-skill knowledge work, so a brain injury that impairs memory, concentration, or executive function can translate into unusually large earning-capacity losses \u2014 making severity and vocational proof central. ${WHAT_TBI} ${UNDERLYING} Where a VTA light-rail vehicle, bus, or other public vehicle or road is involved, a six-month Government Claims Act deadline applies. ${CAUSATION} ${DAMAGES} Civil cases are filed in Santa Clara County Superior Court.`,
      whatToTrack: [
        'The underlying event (crash, fall, struck-by) and who was at fault',
        'Whether a VTA or other public vehicle or road was involved',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'Detailed effects on high-skill cognitive work and earning capacity',
        'Consistent follow-up treatment and any gaps',
        'Ongoing and future care needs for a life-care plan',
        'Witnesses and evidence of the mechanism of injury',
      ],
      howClearCaseHelps: `ClearCaseIQ ties a San Jose brain injury to the at-fault party, flags any VTA or public-entity six-month deadline, organises the neuroimaging and neuropsychological testing that answer the causation fight, and documents the earning-capacity loss that can be substantial for knowledge workers. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My brain injury affects the cognitive work my career depends on. Can I recover for that?',
        a: 'Yes, potentially. Lost earning capacity is a major element of a serious TBI claim, and in a high-wage, high-skill economy the losses can be substantial. Formal neuropsychological testing documents the cognitive impact, and a vocational analysis and life-care plan quantify the resulting economic loss.',
      },
      {
        q: 'A VTA train or bus was involved. Does the deadline change?',
        a: 'Yes. VTA is a public entity, so where its vehicle or a public road is involved, the Government Claims Act requires a written claim within six months of the injury \u2014 far shorter than the usual two years. Identifying public-entity involvement immediately is essential.',
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
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records, the testing, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: FRESNO_TBI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Fresno Brain Injury (TBI) Claims',
    title: 'Fresno Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury in a Fresno-area crash or on the job? High-speed Highway 99 collisions and farm struck-by injuries are common \u2014 and the fight is causation and severity.',
    psychology: 'I hit my head in a Fresno-area crash or at work and I do not know if it is a brain injury or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'fresno brain injury lawyer',
      'traumatic brain injury claim california',
      'highway 99 crash head injury california',
      'struck by injury tbi claim california',
      'concussion after accident lawsuit california',
    ],
    signals: [
      'Underlying negligence required',
      'Highway 99 high-speed crashes',
      'Agricultural / struck-by injuries',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Lost earning capacity & life care',
    ],
    sections: {
      whyItMatters: `High-speed crashes on Highway 99 and the surrounding freeways, and struck-by injuries in the region\u2019s agricultural and industrial work, make serious brain injuries common around Fresno \u2014 and Community Regional Medical Center is the valley\u2019s level-I trauma center that receives the worst of them, sometimes after long transport. ${WHAT_TBI} ${UNDERLYING} A workplace struck-by injury can support a third-party claim alongside workers\u2019 compensation where someone other than the employer was at fault. ${CAUSATION} ${DAMAGES} Civil cases are filed in Fresno County Superior Court.`,
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
      howClearCaseHelps: `ClearCaseIQ ties a Fresno brain injury to the at-fault party \u2014 including any third party in a workplace struck-by \u2014 organises the trauma, neuroimaging, and neuropsychological records that answer the causation fight, and builds the earning-capacity and life-care picture. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hurt at work. Can I have a claim beyond workers\u2019 compensation?',
        a: 'Possibly. If someone other than your employer \u2014 for example, a negligent driver, a contractor, or an equipment maker \u2014 caused a struck-by or crash injury on the job, you may have a third-party claim in addition to workers\u2019 compensation. That claim can reach damages workers\u2019 comp does not, so it is worth identifying who other than the employer was at fault.',
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
    slug: LB_TBI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Long Beach Brain Injury (TBI) Claims',
    title: 'Long Beach Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury at the Long Beach port, in industrial work, or in dense traffic? A struck-by injury can support a third-party claim \u2014 and the fight is causation and severity.',
    psychology: 'I hit my head at the port, on the job, or in a Long Beach crash and I am worried about a brain injury.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'long beach brain injury lawyer',
      'traumatic brain injury claim california',
      'struck by injury tbi third party california',
      'port injury head trauma claim california',
      'concussion after accident lawsuit california',
    ],
    signals: [
      'Underlying negligence required',
      'Port / industrial struck-by',
      'Third-party claim alongside comp',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Lost earning capacity & life care',
    ],
    sections: {
      whyItMatters: `Long Beach\u2019s port and industrial economy produces struck-by and falling-object head injuries, and its dense traffic produces pedestrian and vehicle impacts \u2014 and in each, the legal case turns on proving fault and the injury\u2019s severity. ${WHAT_TBI} ${UNDERLYING} A struck-by injury at the port or on an industrial site often supports a third-party claim \u2014 against a negligent contractor, equipment maker, or driver \u2014 alongside any workers\u2019 compensation, reaching damages comp does not. ${CAUSATION} ${DAMAGES} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The underlying event (struck-by, falling object, crash) and who was at fault',
        'For a work injury, whether a third party (not the employer) was responsible',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'Consistent follow-up treatment and any gaps',
        'The date of injury and whether a public entity was involved',
        'Effects on work and the ability to earn',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ ties a Long Beach brain injury to the at-fault party \u2014 including any third party in a port or industrial struck-by \u2014 organises the neuroimaging and neuropsychological testing that answer the causation fight, and builds the earning-capacity and life-care picture. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was struck on the head at the port or on a job site. Do I only have workers\u2019 comp?',
        a: 'Not necessarily. If someone other than your employer \u2014 a contractor, an equipment manufacturer, a negligent driver \u2014 caused the struck-by or falling-object injury, you may have a third-party claim in addition to workers\u2019 compensation. That claim can reach damages workers\u2019 comp does not, so identifying every party involved matters.',
      },
      {
        q: 'The insurer says it was \u201cjust a concussion.\u201d Do I still have a claim?',
        a: 'Possibly, and that is the central fight. A concussion is a mild traumatic brain injury with effects that can be real and lasting. Objective evidence \u2014 neuroimaging, neuropsychological testing, and consistent treatment \u2014 counters that argument.',
      },
      {
        q: 'What do I have to prove?',
        a: 'That another party\u2019s negligence caused the event (the struck-by, fall, or crash), and that the event caused a brain injury of the severity claimed. The TBI claim rides on the underlying liability, and the deadline follows it \u2014 generally two years, or six months if a public entity is involved.',
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
    slug: OAK_TBI_SLUG,
    category: 'Attorney Intent',
    cluster: 'Oakland Brain Injury (TBI) Claims',
    title: 'Oakland Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury in an Oakland crash, fall, or assault? The fight is causation and severity \u2014 and an AC Transit bus or city vehicle adds a six-month deadline.',
    psychology: 'I hit my head in an Oakland accident and I do not know if it is a brain injury or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'oakland brain injury lawyer',
      'traumatic brain injury claim california',
      'ac transit bus head injury claim california',
      'concussion after car accident lawsuit california',
      'head injury public entity claim california',
    ],
    signals: [
      'Underlying negligence required',
      'AC Transit / city vehicle (public)',
      'Six-month claim if public entity',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Lost earning capacity & life care',
    ],
    sections: {
      whyItMatters: `Freeway and surface-street crashes, pedestrian impacts, and assaults all produce brain injuries in Oakland, and a common local wrinkle is public-entity involvement \u2014 an AC Transit bus, a BART connection, or a city vehicle or road \u2014 which shortens the deadline dramatically. ${WHAT_TBI} ${UNDERLYING} Where a public entity is involved, the Government Claims Act requires a written claim within six months of the injury, far shorter than the usual two years. ${CAUSATION} ${DAMAGES} Civil cases are filed in Alameda County Superior Court after any required claim.`,
      whatToTrack: [
        'The underlying event (crash, fall, assault) and who was at fault',
        'Whether an AC Transit bus, city vehicle, or public road was involved',
        'The date of injury, which starts any six-month clock',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'Consistent follow-up treatment and any gaps',
        'Effects on work and the ability to earn',
        'Ongoing and future care needs for a life-care plan',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether an Oakland brain injury involves a public entity \u2014 and its six-month deadline \u2014 ties it to the at-fault party, and organises the neuroimaging and neuropsychological testing that answer the causation fight. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'An AC Transit bus or city vehicle was involved. Does the deadline change?',
        a: 'Yes. AC Transit and the city are public entities, so where their vehicle or a public road is involved, the Government Claims Act requires a written claim within six months of the injury \u2014 far shorter than the usual two years. Identifying public-entity involvement immediately is essential.',
      },
      {
        q: 'I hit my head in an assault. Can that be a brain-injury claim?',
        a: 'It can. A TBI can follow an assault, and beyond any criminal case there may be a civil claim \u2014 against the attacker, or against a property owner whose inadequate security allowed it. The claim still requires proving fault and the injury\u2019s severity through objective evidence.',
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

export const brainInjuryCityGuideTopicContentBySlug2: Record<string, TopicContent> = {
  [SJ_TBI_SLUG]: {
    scenario: `A San Jose software engineer rear-ended on Highway 101 developed memory and executive-function problems that undermined the cognitive work her career depended on. Neuropsychological testing documented the deficit and a vocational analysis quantified the large earning-capacity loss. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the head impact and the at-fault party; get checked.'],
      ['First days', 'Report symptoms promptly; begin consistent treatment.'],
      ['First weeks', 'Neuroimaging, neuropsychological testing, and a vocational review.'],
      ['Longer term', 'Earning-capacity and life-care issues developed.'],
    ],
    severityLadder: [
      ['Underlying fault', 'The at-fault party must be proven.'],
      ['Causation', 'The event must be tied to the injury.'],
      ['Cognitive impact', 'Effects on high-skill work are documented.'],
      ['Damages', 'Earning-capacity loss can be substantial.'],
    ],
    treatmentProgression: [
      { label: 'First evaluation', copy: 'Early care documents the injury.' },
      { label: 'Imaging & testing', copy: 'Neuroimaging and neuropsych testing prove severity.' },
      { label: 'Vocational review', copy: 'The high-skill work impact is documented.' },
      { label: 'Life-care plan', copy: 'Future needs are quantified for severe injury.' },
    ],
    settlementDrivers: [
      'Whether the underlying negligence is clear',
      'Whether a public entity (VTA) shortens the deadline',
      'Whether causation and severity are established',
      'Whether the cognitive/work impact is documented',
      'The scope of lost earning capacity',
      'Whether a life-care plan supports severe injury',
    ],
    settlementValueDetails: [
      { label: 'Earning loss matters', copy: 'High-skill wages make it substantial.' },
      { label: 'Objective proof', copy: 'Imaging and testing carry the case.' },
      { label: 'Deadline can be short', copy: 'A VTA or public vehicle means six months.' },
      { label: 'Vocational analysis', copy: 'It documents the cognitive-work impact.' },
    ],
    insuranceProblems: [
      'The injury is dismissed as \u201cjust a concussion.\u201d',
      'The earning-capacity loss is never documented.',
      'A VTA or public-entity six-month deadline is missed.',
      'Neuroimaging and neuropsychological testing are never done.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the injury, and who was at fault?' },
      { label: 'Step 2', question: 'Was a VTA or public vehicle involved?' },
      { label: 'Step 3', question: 'How has it affected your cognitive work?' },
      { label: 'Step 4', question: 'Have you had imaging or neuropsych testing?' },
    ],
  },
  [FRESNO_TBI_SLUG]: {
    scenario: `A Fresno-area worker struck by a contractor\u2019s equipment suffered a serious TBI. Identifying the contractor as a third party opened a claim beyond workers\u2019 compensation, and the trauma and imaging records documented the injury. ${NOT_ADVICE}`,
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
  [LB_TBI_SLUG]: {
    scenario: `A Long Beach dockworker struck by a falling load suffered a TBI. The equipment supplier\u2019s negligence supported a third-party claim alongside workers\u2019 compensation, and neuropsychological testing documented the severity. ${NOT_ADVICE}`,
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
  [OAK_TBI_SLUG]: {
    scenario: `An Oakland pedestrian struck by an AC Transit bus suffered a serious TBI. Recognising the public-entity involvement meant a six-month claim was presented in time, and objective testing documented the injury. ${NOT_ADVICE}`,
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
      { label: 'Deadline can be short', copy: 'AC Transit or the city means six months.' },
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
      { label: 'Step 1', question: 'Was an AC Transit bus, city vehicle, or public road involved?' },
      { label: 'Step 2', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 3', question: 'When did head symptoms begin?' },
      { label: 'Step 4', question: 'Have you had imaging or neuropsych testing?' },
    ],
  },
}
