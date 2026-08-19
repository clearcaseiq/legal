import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The three deadline guides.
 *
 * Replaces four pages generated from one seed, scoring 0.864 — but duplication
 * was the lesser problem. Not one of them stated a deadline. Four pages about
 * the statute of limitations said "different rules may apply" and "seek prompt
 * legal review" without anywhere saying "two years", which is the entire reason
 * somebody runs that search.
 *
 * `/california-statute-of-limitations-car-accident` is retired into the general
 * injury guide because the period is identical — a car accident claim is a
 * personal injury claim, both governed by the same two-year rule, so the two
 * pages could only ever differ in their examples. The vehicle-specific parts
 * that genuinely do differ, property damage and uninsured motorist coverage,
 * are sections of the surviving guide.
 *
 * `/california-statute-of-limitations-personal-injury` survives rather than the
 * higher-volume car accident phrasing because it is the English half of an
 * hreflang pair and is linked directly from the SOL checker tool.
 *
 * Periods here deliberately mirror `src/lib/publicCaSol.ts`, which is what the
 * tool computes. A guide contradicting the calculator on the same site would be
 * worse than either alone.
 */

export const INJURY_SOL_SLUG = '/california-statute-of-limitations-personal-injury'
export const WRONGFUL_DEATH_SOL_SLUG = '/california-statute-of-limitations-wrongful-death'
export const MISSED_SOL_SLUG = '/missed-the-statute-of-limitations'

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Deadlines carry exceptions that turn on facts, and the consequence of getting one wrong is that the claim ends, so confirm your own dates with a licensed California attorney.'

export const solGuidePages: LandingPage[] = [
  {
    slug: INJURY_SOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'California Injury Filing Deadlines',
    title: 'California Statute of Limitations for Injury Claims',
    eyebrow: 'Filing deadlines',
    description:
      'Two years from the date of injury for most California injury claims, including car accidents. The exceptions are what catch people out: six months against a government entity, one year for medical malpractice, and a separate three-year clock for vehicle damage.',
    psychology: 'I need to know how long I actually have.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'california statute of limitations personal injury',
      'california statute of limitations car accident',
      'how long do i have to file an injury claim in california',
      'california accident filing deadline',
    ],
    signals: [
      'Date of injury',
      'Claim type',
      'Government defendant',
      'Claimant under 18',
      'Delayed discovery',
      'Property damage claim',
    ],
    sections: {
      whyItMatters:
        'For most California injury claims the period is two years from the date of the injury. That covers car and motorcycle collisions, pedestrian and cyclist injuries, slip and fall and other premises claims, dog bites, and product liability. The deadline is for filing a lawsuit in court, and this is the point most often misunderstood: negotiating with an insurer does not extend it, an open claim file does not extend it, and an adjuster still discussing your claim the week it expires has no obligation to mention that. Claims are lost this way while both sides are still talking. Four exceptions matter more than the rest. A claim against a government entity — a city or county road, a public bus, a school district, a public hospital, a police vehicle — generally requires a written claim presented to that entity within six months, long before the two-year period is anywhere near expiring, and missing it can end the claim regardless of the two years. Medical malpractice runs on a shorter and more complicated clock, commonly one year from when you discovered or should have discovered the injury, subject to an outer limit of three years from the injury itself. Where the claimant was under eighteen at the time, the period is generally paused until they turn eighteen, though the government claim rules are not relaxed in the same way. And where an injury could not reasonably have been discovered at the time, the delayed discovery rule may start the clock later, which is fact-specific and frequently contested. Two vehicle-specific points are worth separating from the injury deadline, because they run on their own schedules. Damage to your car is a property claim with a longer period of three years, so it is possible for the vehicle claim to remain open after the injury claim has expired. And an uninsured or underinsured motorist claim is made under your own policy, which makes it contractual — the deadlines come from the policy and from arbitration requirements rather than from the injury statute, and they can be shorter. Notice provisions in your own policy are worth reading early rather than assuming the two-year figure covers everything.',
      whatToTrack: [
        'The exact date of the incident, which is what every calculation starts from',
        'The type of claim, since malpractice and workers\u2019 compensation run on different clocks',
        'Whether any government entity, public employee, public vehicle, or public road is involved',
        'Whether the injured person was under eighteen at the time',
        'When the injury was actually discovered, if that was later than the incident',
        'Your own policy\u2019s notice and arbitration provisions if an uninsured motorist claim is possible',
        'Whether the vehicle damage claim is being handled separately from the injury claim',
      ],
      howClearCaseHelps:
        'The deadline checker computes the common windows from your incident date and claim type, including the separate six-month government presentation clock when a public entity may be involved. It is an educational estimate rather than a legal opinion, but it answers the question the search was actually asking, which is what date you are working towards. ClearCaseIQ also records the incident date alongside the claim facts, so the deadline stays attached to the file rather than being something you have to remember to recalculate.',
    },
    faqs: [
      {
        q: 'How long do I have to file a car accident claim in California?',
        a: 'Two years from the date of the collision for injury claims, and three years for damage to the vehicle. If a government entity is involved, a written claim generally has to be presented within six months, which comes first by a wide margin.',
      },
      {
        q: 'Does negotiating with the insurance company extend the deadline?',
        a: 'No, and this is the most common way claims are lost. An open claim, an active negotiation, and a pending offer all leave the filing period running, and the adjuster is under no obligation to warn you it is about to expire.',
      },
      {
        q: 'Why is the deadline only six months against a city or county?',
        a: 'Claims against public entities require a written claim presented to the entity first, generally within six months, before a lawsuit can proceed. It applies to public roads, buses, schools, public hospitals and public employees acting in their role.',
      },
      {
        q: 'What if the injured person is a child?',
        a: 'The period is generally paused until the child turns eighteen, giving them until twenty for an ordinary injury claim. Government claim requirements are not relaxed to the same degree, so a claim involving a public entity still needs prompt attention.',
      },
      {
        q: 'What if I did not realise I was injured until later?',
        a: 'The delayed discovery rule can start the clock when the injury was discovered or reasonably should have been, rather than when it occurred. It is fact-specific and routinely disputed, so it is not something to rely on without advice.',
      },
      {
        q: 'Is the medical malpractice deadline different?',
        a: 'Yes, and shorter. It is commonly one year from discovering the injury, with an outer limit of three years from the injury itself, and different rules apply for children.',
      },
    ],
  },
  {
    slug: WRONGFUL_DEATH_SOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'California Wrongful Death Deadlines',
    title: 'California Statute of Limitations for Wrongful Death',
    eyebrow: 'Filing deadlines',
    description:
      'Two years from the date of death, not the date of the injury that caused it — a distinction that matters whenever someone survives for a period before dying. There is also a second, separate claim belonging to the estate, with its own deadline.',
    psychology: 'I lost someone and need to know the deadline.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'california wrongful death statute of limitations',
      'how long to file a wrongful death claim in california',
      'who can file a wrongful death claim california',
      'wrongful death deadline date of death',
    ],
    signals: [
      'Date of death',
      'Eligible claimants',
      'Survival action',
      'Government defendant',
      'Gap between injury and death',
      'Estate representative',
    ],
    sections: {
      whyItMatters:
        'A California wrongful death claim generally has to be filed within two years, measured from the date of death rather than the date of the injury that caused it. Where death follows immediately those are the same day and the distinction is academic. Where someone survives weeks or months in hospital before dying, they are different dates and the deadline runs from the later one. Two features separate this from an ordinary injury deadline. The first is that two distinct claims usually arise from the same death and they are not interchangeable. The wrongful death claim belongs to the surviving family and compensates their loss — financial support, services, and the loss of the relationship itself. Separately, a survival action belongs to the deceased person\u2019s estate and carries the claim they would have had themselves, covering losses between the injury and the death. It runs on its own timetable, generally the later of two years from the injury or six months after the death, so it is possible for one to remain available after the other has closed. Pursuing only one when both existed is a common and expensive oversight. The second is that not everyone affected by a death may bring the claim. California limits it to a defined group, beginning with a surviving spouse or domestic partner, children, and the children of any deceased child, and extending in their absence to those who would inherit under intestate succession. Where nobody in the primary group survives, eligibility depends on the family structure, and financial dependants may qualify in some circumstances. Establishing who is entitled to bring the claim, and appointing a personal representative for the estate\u2019s survival action, both take time that comes out of the two years rather than being added to it. Where a public entity is involved — a public road, a public hospital, a government vehicle — the six-month claim presentation requirement applies here as it does to injury claims, and running it while a family is still arranging a funeral is precisely why these claims are missed.',
      whatToTrack: [
        'The date of death, and separately the date of the injury if they differ',
        'Who survives: spouse or domestic partner, children, and children of any deceased child',
        'Whether anyone was financially dependent on the deceased',
        'Whether a personal representative has been appointed for the estate',
        'Medical expenses and losses incurred between the injury and the death, which belong to the survival claim',
        'Whether any public entity, employee, or vehicle was involved',
      ],
      howClearCaseHelps:
        'The deadline checker treats wrongful death as its own claim type and measures from the date of death, with the government presentation clock available separately. Beyond the date, ClearCaseIQ organises what the two claims each need — the family\u2019s losses on one side, the medical bills and losses before death on the other — so a family is not reconstructing it later while a deadline runs.',
    },
    faqs: [
      {
        q: 'Does the deadline run from the injury or the death?',
        a: 'From the date of death for the wrongful death claim. Where someone survives for a period before dying, that is the later date and the one that counts.',
      },
      {
        q: 'Who is allowed to bring a wrongful death claim in California?',
        a: 'Primarily a surviving spouse or domestic partner, children, and the children of any deceased child. Where none survive, it extends to those who would inherit under intestate succession, and financial dependants may qualify in some circumstances.',
      },
      {
        q: 'What is a survival action and why does it matter?',
        a: 'It is the claim the deceased person would have had themselves, brought by the estate, covering losses between the injury and the death. It has its own deadline, generally the later of two years from the injury or six months after death, so it can outlast the wrongful death claim.',
      },
      {
        q: 'Do we have to open probate before filing?',
        a: 'The wrongful death claim is brought by eligible family members rather than the estate, but the survival action requires a personal representative. Appointing one takes time that runs inside the deadline, not alongside it.',
      },
      {
        q: 'What if a government entity was involved?',
        a: 'The six-month claim presentation requirement applies to wrongful death as it does to injury claims. It arrives during the period a family is least able to attend to it, which is why it is so often missed.',
      },
    ],
  },
  {
    slug: MISSED_SOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Missed Deadline Review',
    title: 'What If You Missed the Filing Deadline?',
    eyebrow: 'Filing deadlines',
    description:
      'Sometimes the deadline has not passed, because it started later or was paused, or because a different defendant or a different claim carries a longer period. Sometimes it has, and the honest answer is that the claim is over. Both are worth establishing quickly.',
    psychology: 'I think I may be too late.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'missed the statute of limitations california',
      'is it too late to file an injury claim',
      'can the statute of limitations be extended',
      'what happens if you miss the filing deadline',
    ],
    signals: [
      'Assumed start date',
      'Tolling facts',
      'Delayed discovery',
      'Alternative defendant',
      'Property damage claim',
      'Uninsured motorist claim',
    ],
    sections: {
      whyItMatters:
        'Start by checking whether it has actually passed, because the assumed start date is often wrong. The clock may have begun later than the incident if the injury could not reasonably have been discovered at the time, which arises with internal injuries, delayed diagnoses and defective products. It may have been paused while the injured person was under eighteen, generally until they turn eighteen. It may have been paused during a period of legal incapacity, or while the defendant was outside the state. And where a defendant\u2019s own conduct caused the delay — a representation that a claim would be paid, or that filing was unnecessary — a court may prevent them relying on the deadline, though that is a demanding argument rather than a routine one. Even where the injury claim has genuinely expired, other claims arising from the same incident may not have. Property damage runs for three years rather than two, so a vehicle claim can survive an expired injury claim. An uninsured or underinsured motorist claim is contractual, brought under your own policy, and governed by the policy terms and arbitration provisions rather than the injury statute. There may be a defendant nobody considered — an employer vicariously liable for a driver, a vehicle owner, a product manufacturer, a contractor responsible for a road defect — and where the theory against them is different, the applicable period may be too. If a public entity was involved and the six-month claim was missed, an application to present a late claim is possible in defined circumstances and generally within a year, which is its own procedure with its own deadline. Where the deadline really has passed with no exception available, the position is that filing is barred and the claim is over, and no amount of negotiation reopens it. That is worth knowing quickly rather than slowly, both because the alternatives above are themselves time-limited and because continuing to negotiate a barred claim achieves nothing. It is also worth checking whether the missed deadline was the result of advice you were given, which is a different question with its own separate timetable.',
      whatToTrack: [
        'The exact incident date and the date you believe the deadline fell',
        'When the injury was first discovered or diagnosed, if later than the incident',
        'The injured person\u2019s age at the time of the incident',
        'Any period the defendant was outside California, or the claimant was incapacitated',
        'Anything the insurer or defendant said that led you to delay',
        'Every party who might bear responsibility, not only the obvious one',
        'Whether a government claim was presented, and on what date',
      ],
      howClearCaseHelps:
        'The first useful step is establishing what date the clock actually started from and whether anything paused it, and that is a matter of assembling dates rather than making an argument. ClearCaseIQ organises the incident date, the discovery date, the parties, and any government involvement so that the question can be answered quickly — which matters because the alternatives that remain after a missed injury deadline are themselves running out.',
    },
    faqs: [
      {
        q: 'Can a missed deadline be extended?',
        a: 'Not extended so much as started later or paused. Delayed discovery, the claimant being under eighteen, legal incapacity, and the defendant\u2019s absence from the state can each affect the calculation, and a defendant whose conduct caused the delay may be prevented from relying on the deadline.',
      },
      {
        q: 'What happens if I file after the deadline?',
        a: 'The defendant will normally seek dismissal on that basis and will usually succeed. The merits of the underlying claim do not rescue a filing made out of time.',
      },
      {
        q: 'Is anything left if my injury claim has expired?',
        a: 'Possibly. Property damage runs for three years, an uninsured motorist claim is governed by your own policy rather than the injury statute, and a defendant nobody had considered may carry a different period.',
      },
      {
        q: 'I missed the six-month government claim. Is that final?',
        a: 'Not necessarily. An application to present a late claim is possible in defined circumstances and generally within a year of the incident, which is a procedure with its own deadline and worth acting on immediately.',
      },
      {
        q: 'What if my lawyer missed the deadline?',
        a: 'That is a separate question from the underlying claim, with its own timetable, and it is one to raise with a different attorney rather than the one who handled the file.',
      },
    ],
  },
]

const timelineFor = (kind: 'injury' | 'death'): TopicContent['timeline'] => [
  [
    kind === 'death' ? 'Date of death' : 'Incident date',
    kind === 'death'
      ? 'The wrongful death period runs from here, not from the injury that caused it.'
      : 'Every calculation starts here. Record it exactly rather than approximately.',
  ],
  ['Six-month mark', 'Where a public entity is involved, the written claim is generally due by now — long before the main period matters.'],
  ['One year', 'Medical malpractice claims are commonly out of time by this point. Ordinary injury claims are halfway through.'],
  ['Two years', 'The general filing deadline for most California injury and wrongful death claims.'],
]

export const solGuideTopicContentBySlug: Record<string, TopicContent> = {
  [INJURY_SOL_SLUG]: {
    scenario: `A claimant injured by a city bus spent nine months negotiating with the transit authority's insurer, was told the file was open and under review, and instructed an attorney at eighteen months — comfortably inside two years, and three months after the six-month presentation deadline had already ended the claim. The two-year figure was correct and irrelevant. ${NOT_ADVICE}`,
    timeline: timelineFor('injury'),
    severityLadder: [
      ['Within a typical window', 'More than a year remains and no public entity is involved.'],
      ['Approaching', 'Under a year remains. Evidence has degraded and negotiation may be being used to run down the clock.'],
      ['Urgent', 'Under ninety days, or a government claim window still open but closing.'],
      ['May have passed', 'Beyond the applicable period, or a six-month government claim never presented. Other claims may still remain.'],
    ],
    treatmentProgression: [
      { label: 'Two years', copy: 'The general period for car accidents, premises claims, dog bites and product injuries, measured from the injury.' },
      { label: 'Six months', copy: 'Written claim to a public entity — city, county, school district, public hospital, public transport or public road.' },
      { label: 'One year', copy: 'Medical malpractice, commonly from discovery, with an outer limit of three years from the injury.' },
      { label: 'Three years', copy: 'Damage to the vehicle, which is a property claim and can outlast the injury claim arising from the same collision.' },
    ],
    settlementDrivers: [
      'The exact incident date, which is what everything is measured from',
      'The claim type, since malpractice and workers\u2019 compensation differ',
      'Any government entity, public employee, public vehicle or public road',
      'The claimant being under eighteen at the time',
      'An injury discovered later than the incident',
      'Uninsured motorist coverage, which is contractual rather than statutory',
    ],
    settlementValueDetails: [
      { label: 'Negotiation does not pause it', copy: 'An open claim file has no effect on the filing period, and the adjuster need not warn you it is closing.' },
      { label: 'The government clock comes first', copy: 'Six months arrives while the two-year figure still looks reassuring, which is exactly why it is missed.' },
      { label: 'One incident, several clocks', copy: 'Injury, vehicle damage and an uninsured motorist claim can each run on a different schedule.' },
      { label: 'Filing is not trial', copy: 'The deadline is for starting the case. Most claims still settle afterwards without reaching a courtroom.' },
    ],
    insuranceProblems: [
      'Negotiations continue amicably while the filing period runs out.',
      'A public entity\u2019s involvement is not identified until after six months have passed.',
      'A pending offer is assumed to preserve the claim.',
      'The vehicle damage claim is settled and the injury claim is assumed to have been settled with it.',
      'An uninsured motorist claim is left unreported because the policy terms were never checked.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the exact date of the incident?' },
      { label: 'Step 2', question: 'What kind of claim is it, and was medical care involved in causing the harm?' },
      { label: 'Step 3', question: 'Could any government entity, employee, vehicle or road be involved?' },
      { label: 'Step 4', question: 'Was the injured person under eighteen, or was the injury discovered later?' },
    ],
  },
  [WRONGFUL_DEATH_SOL_SLUG]: {
    scenario: `A family filed within two years of the collision that injured their father, who died seven weeks later in hospital. The wrongful death period ran from the death and was never in doubt. What nearly went unnoticed was the separate survival claim carrying his own medical expenses and losses before death, which no one had raised because it belongs to the estate and needed a personal representative appointed. ${NOT_ADVICE}`,
    timeline: timelineFor('death'),
    severityLadder: [
      ['Within a typical window', 'More than a year since the death, no public entity involved, eligible claimants identified.'],
      ['Approaching', 'Under a year remains, or the estate has no appointed representative yet.'],
      ['Urgent', 'Under ninety days, or a six-month government claim still open.'],
      ['May have passed', 'Beyond two years from the death. The survival claim may still remain on its own timetable.'],
    ],
    treatmentProgression: [
      { label: 'Two years from death', copy: 'The wrongful death period, measured from the date of death rather than the injury.' },
      { label: 'The survival claim', copy: 'The estate\u2019s separate claim for the deceased\u2019s own losses, generally the later of two years from injury or six months after death.' },
      { label: 'Who may bring it', copy: 'Spouse or domestic partner, children, and children of deceased children first; otherwise those who would inherit by intestate succession.' },
      { label: 'Six months', copy: 'Public entity presentation, which applies to a death claim exactly as it does to an injury claim.' },
    ],
    settlementDrivers: [
      'The date of death, and separately the date of injury where they differ',
      'Which family members survive and in what relationship',
      'Whether a personal representative has been appointed for the estate',
      'Medical expenses and losses incurred between injury and death',
      'Any public entity, employee or vehicle involved',
      'Whether anyone was financially dependent on the deceased',
    ],
    settlementValueDetails: [
      { label: 'Two claims, not one', copy: 'The family\u2019s wrongful death claim and the estate\u2019s survival claim are separate, with separate deadlines and separate recoveries.' },
      { label: 'Death, not injury', copy: 'Where someone survives before dying, the wrongful death period runs from the later date.' },
      { label: 'Eligibility takes time', copy: 'Establishing who may bring the claim, and appointing a representative, comes out of the period rather than being added to it.' },
      { label: 'The six months does not wait', copy: 'A public entity claim falls due while a family is still arranging a funeral.' },
    ],
    insuranceProblems: [
      'Only the wrongful death claim is pursued and the estate\u2019s survival claim is overlooked entirely.',
      'Medical bills from before the death are treated as a family expense rather than an estate claim.',
      'A public entity\u2019s involvement is identified after the presentation window has closed.',
      'The insurer negotiates with one family member while eligibility has never been established.',
      'The period is calculated from the injury rather than the death, and understated as a result.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the date of death, and did it follow the injury immediately?' },
      { label: 'Step 2', question: 'Who survives — spouse or domestic partner, children, or children of a deceased child?' },
      { label: 'Step 3', question: 'Has a personal representative been appointed for the estate?' },
      { label: 'Step 4', question: 'Was any public entity, employee or vehicle involved?' },
    ],
  },
  [MISSED_SOL_SLUG]: {
    scenario: `A claimant assumed a claim was long gone, having been injured by a defective component almost three years earlier. The defect was identified by an engineer eleven months before, and the delayed discovery question turned on when it reasonably should have been found rather than when the incident occurred. The claim was not obviously out of time; it was obviously worth asking about. ${NOT_ADVICE}`,
    timeline: [
      ['Check the start date', 'Delayed discovery, a claimant under eighteen, or incapacity can each mean the clock began later than assumed.'],
      ['Check for pauses', 'Time while the defendant was outside California, or the claimant lacked capacity, may not count.'],
      ['Check other claims', 'Property damage runs three years, and an uninsured motorist claim is governed by the policy.'],
      ['Check other defendants', 'An employer, owner, manufacturer or contractor may carry a different theory and a different period.'],
    ],
    severityLadder: [
      ['Probably not missed', 'The assumed start date was wrong, or a pause applies.'],
      ['Arguable', 'Delayed discovery or estoppel may apply. Fact-specific and contested, so it needs review quickly.'],
      ['Injury claim gone, others remain', 'Property damage, an uninsured motorist claim, or an unconsidered defendant may still be available.'],
      ['Closed', 'The period has passed with no exception available. Negotiation will not reopen it.'],
    ],
    treatmentProgression: [
      { label: 'Delayed discovery', copy: 'The clock may start when the injury was discovered or reasonably should have been, not when it occurred.' },
      { label: 'Tolling', copy: 'Being under eighteen, legal incapacity, or the defendant\u2019s absence from the state may pause the period.' },
      { label: 'Estoppel', copy: 'Where a defendant\u2019s own conduct caused the delay, they may be prevented from relying on the deadline. A demanding argument.' },
      { label: 'Late government claim', copy: 'Where a six-month presentation was missed, an application to present late is possible in defined circumstances, generally within a year.' },
    ],
    settlementDrivers: [
      'Whether the assumed start date was actually correct',
      'When the injury was genuinely discovered or diagnosed',
      'The claimant\u2019s age at the time of the incident',
      'Anything said by the insurer or defendant that caused the delay',
      'Whether a property damage or uninsured motorist claim remains',
      'Whether any defendant was overlooked entirely',
    ],
    settlementValueDetails: [
      { label: 'Check before concluding', copy: 'The assumed start date is wrong often enough to be worth verifying before treating a claim as closed.' },
      { label: 'Other claims outlive it', copy: 'Property damage runs three years, and a policy-based uninsured motorist claim is not governed by the injury statute at all.' },
      { label: 'Speed still matters', copy: 'The alternatives that survive a missed injury deadline are themselves time-limited.' },
      { label: 'A closed claim is closed', copy: 'Where no exception applies, filing is barred and continuing to negotiate achieves nothing.' },
    ],
    insuranceProblems: [
      'Negotiation continued past the deadline and the insurer then relied on it.',
      'The claimant was told the claim would be paid and delayed filing on that basis.',
      'A six-month government claim was never presented because the entity\u2019s involvement was unclear.',
      'Only the obvious defendant was pursued while another with a longer period went unconsidered.',
      'The vehicle claim was settled and the injury claim assumed to be resolved along with it.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What date did you believe the deadline fell, and what was it measured from?' },
      { label: 'Step 2', question: 'When was the injury actually discovered or diagnosed?' },
      { label: 'Step 3', question: 'Was the injured person under eighteen, or incapacitated, at any point?' },
      { label: 'Step 4', question: 'Did anyone tell you the claim would be handled, and when?' },
    ],
  },
}
