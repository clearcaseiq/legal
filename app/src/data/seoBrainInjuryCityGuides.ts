import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Geo layer, traumatic-brain-injury (TBI) practice area: location-specific
 * guides for Los Angeles, San Diego, San Francisco, and Sacramento.
 *
 * A TBI claim is not a separate liability theory \u2014 it rides on an underlying
 * negligence claim (a crash, a fall, an assault, a struck-by injury) \u2014 but it is
 * a distinct search intent and a distinct litigation problem, because the central
 * fight is causation and severity, and because a serious TBI drives large,
 * mostly economic damages that require specialised proof.
 *
 * Local context, genuine rather than interpolated:
 *  - Los Angeles: high-speed freeway crashes and falls, served by major
 *    rehabilitation hospitals with dedicated brain-injury programs.
 *  - San Diego: a large military and veteran population with a high incidence of
 *    TBI, where an injury on a base or by a federal actor can route the claim
 *    through the Federal Tort Claims Act.
 *  - San Francisco: pedestrian, cyclist, and scooter head injuries in a dense
 *    urban core, and high earning-capacity losses for affected workers.
 *  - Sacramento: highway crashes across the region, with public-entity issues
 *    where a dangerous road or public vehicle is involved.
 *
 * Applied accurately:
 *  - A traumatic brain injury ranges from a concussion (mild TBI) to severe
 *    injury; symptoms can be delayed and, in mild cases, are often disputed.
 *  - The claim depends on the underlying liability \u2014 the at-fault party\u2019s
 *    negligence must still be proven \u2014 and the deadline follows that underlying
 *    claim (generally two years under Code of Civil Procedure section 335.1, but
 *    six months under the Government Claims Act if a public entity is involved).
 *  - The decisive battle is causation and severity: insurers minimise mild TBI
 *    as \u201cjust a concussion,\u201d so objective evidence \u2014 neuroimaging, neuro-
 *    psychological testing, and consistent, documented treatment \u2014 is essential.
 *  - Damages are largely economic and often lifelong: past and future medical
 *    care, lost earning capacity, and a life-care plan for a severe injury,
 *    alongside non-economic damages. Pure comparative negligence applies.
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

export const LA_TBI_SLUG = '/los-angeles-brain-injury-claim'
export const SD_TBI_SLUG = '/san-diego-brain-injury-claim'
export const SF_TBI_SLUG = '/san-francisco-brain-injury-claim'
export const SAC_TBI_SLUG = '/sacramento-brain-injury-claim'

export const brainInjuryCityGuidePages: LandingPage[] = [
  {
    slug: LA_TBI_SLUG,
    category: 'Cities',
    cluster: 'Los Angeles Brain Injury (TBI) Claims',
    title: 'Los Angeles Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury in an LA crash or fall? The fight is causation and severity \u2014 objective testing and consistent treatment carry a TBI claim.',
    psychology: 'I hit my head in an LA accident and I am worried it is a brain injury the insurer will not take seriously.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'los angeles brain injury lawyer',
      'traumatic brain injury claim california',
      'concussion after car accident lawsuit california',
      'tbi settlement causation california',
      'head injury accident claim california',
    ],
    signals: [
      'Underlying negligence required',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Consistent treatment record',
      'Lost earning capacity & life care',
      'Comparative negligence',
    ],
    sections: {
      whyItMatters: `High-speed freeway crashes and serious falls make brain injuries common in Los Angeles, and the region\u2019s major rehabilitation hospitals treat them \u2014 but the legal case still turns on proving both fault and the injury\u2019s severity. ${WHAT_TBI} ${UNDERLYING} ${CAUSATION} ${DAMAGES} Civil cases are filed in Los Angeles County Superior Court.`,
      whatToTrack: [
        'The underlying event (crash, fall, assault) and who was at fault',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'Consistent follow-up treatment and any gaps',
        'The date of injury and whether a public entity was involved',
        'Effects on work and the ability to earn',
        'Ongoing and future care needs for a life-care plan',
        'Witnesses and any evidence of the mechanism of injury',
      ],
      howClearCaseHelps: `ClearCaseIQ ties an LA brain injury to the underlying at-fault party, organises the neuroimaging, neuropsychological testing, and treatment record that answer the causation fight, and builds the earning-capacity and life-care picture. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The insurer says it was \u201cjust a concussion.\u201d Do I still have a claim?',
        a: 'Possibly, and that dismissal is exactly the fight. A concussion is a mild traumatic brain injury, and its effects can be real and lasting. Objective evidence \u2014 appropriate neuroimaging, formal neuropsychological testing, and consistent treatment \u2014 is what counters the \u201cjust a concussion\u201d argument.',
      },
      {
        q: 'What do I have to prove in a brain-injury case?',
        a: 'Two things: that another party\u2019s negligence caused the event (the crash, fall, or assault), and that the event caused a brain injury of the severity claimed. A TBI claim rides on the underlying liability, and the deadline follows that claim \u2014 generally two years, but as short as six months if a public entity is involved.',
      },
      {
        q: 'My symptoms started days after the accident. Does that hurt my claim?',
        a: 'Not necessarily. TBI symptoms \u2014 headaches, memory and concentration problems, mood changes \u2014 can be delayed. What matters is documenting them as soon as they appear and getting consistent care, because gaps and delays are used against the claim.',
      },
      {
        q: 'What is a TBI claim worth?',
        a: 'That depends on fault, severity, and proof, and no responsible estimate can be given without a review. What can be said is that serious TBI damages are largely economic and often lifelong \u2014 future medical care, lost earning capacity, and a life-care plan \u2014 alongside non-economic damages.',
      },
      {
        q: 'Is ClearCaseIQ a law firm?',
        a: 'No. It provides general information rather than legal advice and does not represent anyone. It organises the records, the testing, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SD_TBI_SLUG,
    category: 'Cities',
    cluster: 'San Diego Brain Injury (TBI) Claims',
    title: 'San Diego Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury in San Diego? The fight is causation and severity \u2014 and an injury on a base or by a federal actor follows a separate federal path.',
    psychology: 'I suffered a head injury in San Diego, possibly connected to the military, and I do not know what rules apply.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san diego brain injury lawyer',
      'traumatic brain injury claim california',
      'military tbi claim california',
      'concussion after accident lawsuit california',
      'head injury accident claim california',
    ],
    signals: [
      'Underlying negligence required',
      'Federal / on-base actor (FTCA)',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Lost earning capacity & life care',
      'Consistent treatment record',
    ],
    sections: {
      whyItMatters: `San Diego\u2019s large military and veteran population has a high incidence of traumatic brain injury, and where an injury happened on a base or was caused by a federal actor, the claim follows a different, federal route \u2014 so identifying who and where is an important early step. ${WHAT_TBI} A claim against a federal actor runs through the Federal Tort Claims Act, with an administrative claim required first. ${UNDERLYING} ${CAUSATION} ${DAMAGES} Civil cases against private parties are filed in San Diego County Superior Court.`,
      whatToTrack: [
        'The underlying event and whether a federal actor or base was involved',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'Consistent follow-up treatment and any gaps',
        'The applicable path \u2014 state negligence or FTCA',
        'Effects on work and the ability to earn',
        'Ongoing and future care needs for a life-care plan',
        'Witnesses and evidence of the mechanism of injury',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether a San Diego brain injury involves a private or a federal actor \u2014 which decides the path \u2014 then organises the neuroimaging, neuropsychological testing, and treatment record and builds the earning-capacity and life-care picture. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My brain injury is connected to the military or a base. Does that change my claim?',
        a: 'It can. Where the injury was caused by a federal actor or occurred on a federal installation, the claim may run through the Federal Tort Claims Act, which requires an administrative claim first and follows federal rules and deadlines. Certain service-connected injuries have separate limits an attorney should assess. Identifying who caused the injury and where is an important first step.',
      },
      {
        q: 'The insurer says it was \u201cjust a concussion.\u201d Do I still have a claim?',
        a: 'Possibly, and that is the central fight. A concussion is a mild traumatic brain injury with effects that can be real and lasting. Objective evidence \u2014 neuroimaging, neuropsychological testing, and consistent treatment \u2014 is what counters that argument.',
      },
      {
        q: 'What do I have to prove?',
        a: 'That another party\u2019s negligence caused the event, and that the event caused a brain injury of the severity claimed. The deadline follows the underlying claim \u2014 generally two years for a private party, or the FTCA timeline for a federal actor.',
      },
      {
        q: 'What is a TBI claim worth?',
        a: 'It depends on fault, severity, and proof, and no responsible estimate can be given without a review. Serious TBI damages are largely economic and often lifelong \u2014 future care, lost earning capacity, and a life-care plan \u2014 alongside non-economic damages.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the records, the testing, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SF_TBI_SLUG,
    category: 'Cities',
    cluster: 'San Francisco Brain Injury (TBI) Claims',
    title: 'San Francisco Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury as a pedestrian, cyclist, or in a fall in San Francisco? The fight is causation and severity \u2014 and lost earning capacity can be substantial.',
    psychology: 'I hit my head in a San Francisco crash or fall and I am worried about a brain injury and my ability to work.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'san francisco brain injury lawyer',
      'traumatic brain injury claim california',
      'pedestrian head injury lawsuit california',
      'concussion after accident california',
      'head injury lost income claim california',
    ],
    signals: [
      'Underlying negligence required',
      'Pedestrian / cyclist / scooter head injury',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'High lost earning capacity',
      'Consistent treatment record',
    ],
    sections: {
      whyItMatters: `San Francisco\u2019s dense urban core produces pedestrian, cyclist, and scooter head injuries, and the city\u2019s high wages mean that a brain injury affecting the ability to work can create substantial earning-capacity losses \u2014 making the severity and vocational proof especially important. ${WHAT_TBI} ${UNDERLYING} ${CAUSATION} ${DAMAGES} Civil cases are filed in San Francisco County Superior Court.`,
      whatToTrack: [
        'The underlying event (struck as a pedestrian/cyclist, fall) and fault',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'Consistent follow-up treatment and any gaps',
        'The date of injury and whether a public entity was involved',
        'Detailed effects on cognitive work and earning capacity',
        'Ongoing and future care needs for a life-care plan',
        'Witnesses and evidence of the mechanism of injury',
      ],
      howClearCaseHelps: `ClearCaseIQ ties a San Francisco brain injury to the at-fault party, organises the neuroimaging, neuropsychological testing, and treatment record, and documents the earning-capacity loss that can be significant for affected workers. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was hit as a pedestrian or cyclist and hit my head. What do I prove?',
        a: 'That the driver (or other party) was negligent and caused the collision, and that it caused a brain injury of the severity claimed. The TBI claim rides on that underlying liability, and the deadline follows it \u2014 generally two years, or six months if a public entity is involved.',
      },
      {
        q: 'The insurer says it was \u201cjust a concussion.\u201d Do I still have a claim?',
        a: 'Possibly, and that is the central fight. A concussion is a mild traumatic brain injury with effects that can be real and lasting. Objective evidence \u2014 neuroimaging, neuropsychological testing, and consistent treatment \u2014 counters that argument.',
      },
      {
        q: 'My brain injury affects my ability to do my job. Can I recover for that?',
        a: 'Yes, potentially. Lost earning capacity is a major element of a serious TBI claim, and in a high-wage market the losses can be substantial. A vocational analysis and, for severe injury, a life-care plan quantify these damages.',
      },
      {
        q: 'My symptoms were delayed. Does that hurt my claim?',
        a: 'Not necessarily. TBI symptoms can appear days later. What matters is documenting them promptly once they appear and getting consistent care, because gaps and delays are used against the claim.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the records, the testing, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
  {
    slug: SAC_TBI_SLUG,
    category: 'Cities',
    cluster: 'Sacramento Brain Injury (TBI) Claims',
    title: 'Sacramento Brain Injury (TBI) Claims',
    eyebrow: 'California local injury guide',
    description:
      'Suffered a brain injury in a Sacramento-area crash or fall? The fight is causation and severity \u2014 and a public vehicle or dangerous road adds a six-month deadline.',
    psychology: 'I hit my head in a Sacramento-area accident and I do not know if it was a brain injury or who is responsible.',
    cta: 'Start Local Case Assessment',
    exampleQueries: [
      'sacramento brain injury lawyer',
      'traumatic brain injury claim california',
      'concussion after car accident lawsuit california',
      'head injury public entity claim california',
      'tbi causation california',
    ],
    signals: [
      'Underlying negligence required',
      'Public vehicle / dangerous road',
      'Six-month claim (911.2) if public',
      'Causation & severity fight',
      'Neuroimaging & neuropsych testing',
      'Lost earning capacity & life care',
    ],
    sections: {
      whyItMatters: `Highway crashes across the Sacramento region cause serious brain injuries, and where a public vehicle or a dangerous public road is involved, a much shorter deadline applies on top of the usual causation-and-severity fight. ${WHAT_TBI} ${UNDERLYING} Where a public entity is involved, the Government Claims Act requires a formal claim within six months (Government Code section 911.2), far shorter than the usual two years. ${CAUSATION} ${DAMAGES} Civil cases are filed in Sacramento County Superior Court after any required claim.`,
      whatToTrack: [
        'The underlying event and whether a public vehicle or road was involved',
        'The date of injury, which starts any six-month clock',
        'The first report of head impact or symptoms, even if delayed',
        'All neuroimaging (CT, MRI) and any neuropsychological testing',
        'Consistent follow-up treatment and any gaps',
        'Effects on work and the ability to earn',
        'Ongoing and future care needs for a life-care plan',
        'Witnesses and evidence of the mechanism of injury',
      ],
      howClearCaseHelps: `ClearCaseIQ determines whether a Sacramento-area brain injury involves a public entity \u2014 and its six-month deadline \u2014 ties it to the at-fault party, and organises the neuroimaging, neuropsychological testing, and treatment record that answer the causation fight. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'A public vehicle or bad road caused my injury. Does the deadline change?',
        a: 'Yes. Where a public entity is involved, the Government Claims Act requires a formal written claim within six months of the injury (Government Code section 911.2) before any lawsuit \u2014 far shorter than the usual two years. Identifying whether a public entity is involved must be done immediately.',
      },
      {
        q: 'The insurer says it was \u201cjust a concussion.\u201d Do I still have a claim?',
        a: 'Possibly, and that is the central fight. A concussion is a mild traumatic brain injury with effects that can be real and lasting. Objective evidence \u2014 neuroimaging, neuropsychological testing, and consistent treatment \u2014 counters that argument.',
      },
      {
        q: 'What do I have to prove?',
        a: 'That another party\u2019s negligence caused the event, and that the event caused a brain injury of the severity claimed. The TBI claim rides on the underlying liability, and the deadline follows it \u2014 two years generally, or six months for a public entity.',
      },
      {
        q: 'What is a TBI claim worth?',
        a: 'It depends on fault, severity, and proof, and no responsible estimate can be given without a review. Serious TBI damages are largely economic and often lifelong \u2014 future care, lost earning capacity, and a life-care plan \u2014 alongside non-economic damages.',
      },
      {
        q: 'Does ClearCaseIQ represent me?',
        a: 'No. ClearCaseIQ is not a law firm and does not provide legal advice or representation. It organises the records, the testing, and the deadlines so a licensed California attorney can review a complete file.',
      },
    ],
  },
]

export const brainInjuryCityGuideTopicContentBySlug: Record<string, TopicContent> = {
  [LA_TBI_SLUG]: {
    scenario: `An LA driver rear-ended at freeway speed developed memory and concentration problems days later. Neuroimaging and neuropsychological testing documented a mild TBI, answering the insurer\u2019s \u201cjust a concussion\u201d position. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the head impact and the at-fault party; get checked.'],
      ['First days', 'Report symptoms promptly; begin consistent treatment.'],
      ['First weeks', 'Neuroimaging and neuropsychological testing document the injury.'],
      ['Longer term', 'Earning-capacity and life-care issues developed.'],
    ],
    severityLadder: [
      ['Underlying fault', 'The at-fault party must be proven.'],
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
      'Whether the underlying negligence is clear',
      'Whether causation to the brain injury is established',
      'Whether objective testing documents severity',
      'Whether treatment was consistent',
      'The scope of lost earning capacity and future care',
      'Whether a life-care plan supports severe injury',
    ],
    settlementValueDetails: [
      { label: 'Objective proof', copy: 'Imaging and testing carry the case.' },
      { label: 'Consistency matters', copy: 'Gaps in care are used against you.' },
      { label: 'Economic drives value', copy: 'Future care and earning loss dominate.' },
      { label: 'Prove the mechanism', copy: 'The head impact must be tied to the event.' },
    ],
    insuranceProblems: [
      'The injury is dismissed as \u201cjust a concussion.\u201d',
      'Neuroimaging and neuropsychological testing are never done.',
      'Gaps in treatment undermine causation.',
      'No life-care plan or vocational analysis quantifies loss.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the injury, and who was at fault?' },
      { label: 'Step 2', question: 'When did head symptoms begin?' },
      { label: 'Step 3', question: 'Have you had imaging or neuropsych testing?' },
      { label: 'Step 4', question: 'How has it affected work and daily life?' },
    ],
  },
  [SD_TBI_SLUG]: {
    scenario: `A San Diego injury connected to a federal actor first required routing through the Federal Tort Claims Act. With the path set, neuroimaging and neuropsychological testing then documented the TBI\u2019s severity. ${NOT_ADVICE}`,
    timeline: [
      ['First steps', 'Determine whether a private or federal actor caused it.'],
      ['First days', 'Report symptoms; begin consistent treatment.'],
      ['First weeks', 'Neuroimaging and neuropsychological testing document the injury.'],
      ['Longer term', 'The path (FTCA or state) and life-care issues developed.'],
    ],
    severityLadder: [
      ['Right path', 'Private vs. federal decides the rules.'],
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
      'Whether a private or federal actor is responsible',
      'Whether the underlying negligence is clear',
      'Whether causation and severity are established',
      'Whether treatment was consistent',
      'The scope of lost earning capacity and future care',
      'Whether a life-care plan supports severe injury',
    ],
    settlementValueDetails: [
      { label: 'Path first', copy: 'Federal actors need the FTCA process.' },
      { label: 'Objective proof', copy: 'Imaging and testing carry the case.' },
      { label: 'Economic drives value', copy: 'Future care and earning loss dominate.' },
      { label: 'Consistency matters', copy: 'Gaps in care are used against you.' },
    ],
    insuranceProblems: [
      'A federal actor is missed, and the FTCA path is lost.',
      'The injury is dismissed as \u201cjust a concussion.\u201d',
      'Neuroimaging and neuropsychological testing are never done.',
      'Gaps in treatment undermine causation.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a federal actor or base involved?' },
      { label: 'Step 2', question: 'What caused the injury, and who was at fault?' },
      { label: 'Step 3', question: 'Have you had imaging or neuropsych testing?' },
      { label: 'Step 4', question: 'How has it affected work and daily life?' },
    ],
  },
  [SF_TBI_SLUG]: {
    scenario: `A San Francisco cyclist struck by a turning car suffered a TBI that impaired the cognitive work she relied on. A vocational analysis quantified the substantial earning-capacity loss the injury caused. ${NOT_ADVICE}`,
    timeline: [
      ['At the scene', 'Note the head impact and the at-fault driver; get checked.'],
      ['First days', 'Report symptoms; begin consistent treatment.'],
      ['First weeks', 'Neuroimaging, neuropsych testing, and a vocational review.'],
      ['Longer term', 'Earning-capacity and life-care issues developed.'],
    ],
    severityLadder: [
      ['Underlying fault', 'The at-fault driver must be proven.'],
      ['Causation', 'The event must be tied to the injury.'],
      ['Cognitive impact', 'Effects on high-skill work are documented.'],
      ['Damages', 'Earning-capacity loss can be substantial.'],
    ],
    treatmentProgression: [
      { label: 'First evaluation', copy: 'Early care documents the injury.' },
      { label: 'Imaging & testing', copy: 'Neuroimaging and neuropsych testing prove severity.' },
      { label: 'Vocational review', copy: 'The work impact is documented.' },
      { label: 'Life-care plan', copy: 'Future needs are quantified for severe injury.' },
    ],
    settlementDrivers: [
      'Whether the underlying negligence is clear',
      'Whether causation and severity are established',
      'Whether the cognitive/work impact is documented',
      'The scope of lost earning capacity',
      'Whether treatment was consistent',
      'Whether a life-care plan supports severe injury',
    ],
    settlementValueDetails: [
      { label: 'Earning loss matters', copy: 'High wages make it substantial.' },
      { label: 'Objective proof', copy: 'Imaging and testing carry the case.' },
      { label: 'Vocational analysis', copy: 'It documents the work impact.' },
      { label: 'Consistency matters', copy: 'Gaps in care are used against you.' },
    ],
    insuranceProblems: [
      'The injury is dismissed as \u201cjust a concussion.\u201d',
      'The earning-capacity loss is never documented.',
      'Neuroimaging and neuropsychological testing are never done.',
      'Gaps in treatment undermine causation.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What caused the injury, and who was at fault?' },
      { label: 'Step 2', question: 'When did head symptoms begin?' },
      { label: 'Step 3', question: 'How has it affected your ability to work?' },
      { label: 'Step 4', question: 'Have you had imaging or neuropsych testing?' },
    ],
  },
  [SAC_TBI_SLUG]: {
    scenario: `A Sacramento-area crash involving a public vehicle caused a serious TBI. Recognising the public-entity involvement meant a six-month claim was presented in time, and objective testing documented the injury. ${NOT_ADVICE}`,
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
      { label: 'Deadline can be short', copy: 'A public entity means six months.' },
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
      { label: 'Step 1', question: 'Was a public vehicle or road involved?' },
      { label: 'Step 2', question: 'When did the injury occur (six-month clock)?' },
      { label: 'Step 3', question: 'When did head symptoms begin?' },
      { label: 'Step 4', question: 'Have you had imaging or neuropsych testing?' },
    ],
  },
}
