import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Three pedestrian spokes: fault, filing deadline, and hiring.
 *
 * The value question already has a page
 * (`/how-much-is-a-pedestrian-accident-case-worth`), and a general accident-type
 * page exists at `/commercial/pedestrian-accident`. These three complete the
 * hub with the fault, deadline, and hiring queries, built on the California
 * pedestrian right-of-way rules: Vehicle Code section 21950 (crosswalks, marked
 * and unmarked), section 21954 (outside a crosswalk), and the 2023 Freedom to
 * Walk Act, which stopped most jaywalking citations without changing the civil
 * right-of-way analysis.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. A pedestrian claim turns on right-of-way, the coverage available, and medical facts particular to you, which a licensed California attorney can review.'

export const PED_LIABILITY_SLUG = '/who-is-at-fault-in-a-pedestrian-accident-in-california'
export const PED_SOL_SLUG = '/california-pedestrian-accident-statute-of-limitations'
export const PED_HIRE_SLUG = '/do-i-need-a-lawyer-for-a-pedestrian-accident-in-california'

const PED_VALUE_SLUG = '/how-much-is-a-pedestrian-accident-case-worth'

export const pedestrianGuidePages: LandingPage[] = [
  {
    slug: PED_LIABILITY_SLUG,
    category: 'Liability',
    cluster: 'Pedestrian Liability',
    title: 'Who Is at Fault in a Pedestrian Accident in California?',
    eyebrow: 'Pedestrian liability',
    description:
      'Drivers must yield to pedestrians in marked and unmarked crosswalks under California law — and a crosswalk usually exists at an intersection whether or not it is painted. "There were no lines" is not the answer insurers imply.',
    psychology: 'I want to know who is at fault for a pedestrian being hit by a car.',
    cta: 'Check If You Have a Claim',
    exampleQueries: [
      'who is at fault in a pedestrian accident California',
      'pedestrian right of way California',
      'is the driver always at fault pedestrian accident',
      'unmarked crosswalk law California',
      'jaywalking fault California pedestrian',
    ],
    signals: [
      'Marked or unmarked crosswalk',
      'Intersection vs mid-block',
      'Driver turning or pulling out',
      'Visibility and lighting',
      'Comparative fault',
      'Freedom to Walk Act',
    ],
    sections: {
      whyItMatters:
        'Fault in a California pedestrian collision starts from Vehicle Code section 21950, which requires drivers to yield the right of way to a pedestrian crossing within any marked crosswalk or within an unmarked crosswalk at an intersection. The unmarked part is where most misunderstanding lives and where insurers gain ground they should not: at most intersections a crosswalk exists in law whether or not it is painted, formed by the invisible extension of the sidewalk lines across the road, so a driver\u2019s "there were no lines" is frequently not the answer it is offered as. The same statute preserves a pedestrian\u2019s own duty of care, and specifically that a pedestrian may not suddenly leave a curb or other place of safety and walk into the path of a vehicle so close that it is an immediate hazard. Outside a crosswalk, the balance shifts: Vehicle Code section 21954 requires a pedestrian crossing at a point other than a crosswalk to yield to vehicles, though it also reminds drivers they still owe a duty of care to everyone on the road. Two further points reshape the analysis in ways insurers do not volunteer. First, the 2023 Freedom to Walk Act stopped officers from citing pedestrians for crossing outside a crosswalk unless there was an immediate danger of collision — it did not change the civil right-of-way rules, so a driver can still argue comparative fault for a mid-block crossing, but the absence of a citation now proves less than it used to. Second, the physical evidence usually answers the fault question better than the accounts do: the point of impact on the vehicle, the distance the pedestrian was thrown or carried, sight lines and lighting, and the driver\u2019s movement all tend to reveal whether the "stepped out in front of me" story fits. It usually fits poorly where the driver was turning, pulling away from a stop, or distracted. California\u2019s pure comparative negligence means that even where a pedestrian bears some fault — crossing mid-block, against a signal, in dark clothing at night — the recovery is reduced by that share rather than barred, which is why insurers press comparative fault hard and early even when the driver plainly failed to yield.',
      whatToTrack: [
        'Whether you were in a marked or unmarked crosswalk',
        'Whether the location was an intersection or mid-block',
        'What the driver was doing — turning, pulling out, going straight',
        'The point of impact on the vehicle and where you landed',
        'Visibility, lighting, and any obstructions to sight lines',
        'The signal or sign state, if any',
        'Witnesses, since these claims often come down to independent accounts',
        'Any citation issued, and to whom',
      ],
      howClearCaseHelps:
        `ClearCaseIQ works out whether an unmarked crosswalk applied and what that does to the fault analysis, rather than accepting the adjuster framing that no painted lines means no right of way. It weighs the physical evidence against the "stepped out" account and treats a missing jaywalking citation with the reduced weight the Freedom to Walk Act gives it. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is the driver always at fault when a pedestrian is hit?',
        a: 'No, but drivers must yield to pedestrians in marked and unmarked crosswalks, so fault often lands on the driver, especially at intersections. A pedestrian who suddenly leaves a curb into the path of a close vehicle, or who crosses mid-block against traffic, can bear some or most of the fault. It turns on right-of-way and the physical evidence, not on assumptions.',
      },
      {
        q: 'What is an unmarked crosswalk?',
        a: 'At most intersections a crosswalk exists in law even without paint, formed by the extension of the sidewalk lines across the road. Drivers must yield to pedestrians in these unmarked crosswalks just as in painted ones, which is why "there were no lines" is usually not the defense insurers present it as.',
      },
      {
        q: 'Does jaywalking mean the pedestrian is automatically at fault?',
        a: 'No. The 2023 Freedom to Walk Act stopped most jaywalking citations unless there was an immediate danger of collision, but it did not change the civil right-of-way rules. A driver can still argue comparative fault for a mid-block crossing, but the absence of a citation now proves less than it once did, and fault is still decided by the evidence.',
      },
      {
        q: 'The driver says I stepped out in front of them. Is that a defense?',
        a: 'It is the standard defense, and it has a narrow statutory basis — a pedestrian may not leave a curb into the path of a vehicle so close it is an immediate hazard. Whether that happened is answered by physical evidence: the impact point, the distance traveled after impact, sight lines, and lighting. Where the driver was turning or pulling away from a stop, the argument tends to fit poorly.',
      },
      {
        q: 'Can I recover if I was partly at fault?',
        a: 'Yes. California uses pure comparative negligence, so your recovery is reduced by your percentage of fault rather than barred. A pedestrian found 30 percent at fault for crossing mid-block still recovers 70 percent of their losses, which is why insurers work to attach as much fault to the pedestrian as they can.',
      },
    ],
  },
  {
    slug: PED_SOL_SLUG,
    category: 'Statute of Limitations',
    cluster: 'Pedestrian Filing Deadlines',
    title: 'California Pedestrian Accident Statute of Limitations',
    eyebrow: 'Filing deadlines',
    description:
      'Two years from the crash for a California pedestrian injury claim. But a poorly designed crosswalk, a broken signal, or a government vehicle can bring a six-month deadline — and the severe injuries common here can distract from the clock entirely.',
    psychology: 'I need to know how long I have to file a pedestrian accident claim.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'how long do I have to file a pedestrian accident claim in California',
      'pedestrian accident statute of limitations California',
      'deadline to sue after being hit by a car walking',
      'is it too late to file a pedestrian injury claim',
    ],
    signals: [
      'Date of the crash',
      'Crosswalk or signal defect',
      'Government entity involved',
      'Victim under 18',
      'Hit-and-run driver',
      'Long hospitalization',
    ],
    sections: {
      whyItMatters:
        'A California pedestrian injury claim runs on the standard two-year personal-injury deadline, measured from the date of the collision, and negotiating with the driver\u2019s insurer does not extend it. Two features of pedestrian claims make timing harder to manage than the two-year figure suggests. The first is that pedestrian collisions often have a public-entity dimension: a poorly designed or maintained crosswalk, a signal that was broken or badly timed, an obstructed sight line the city was responsible for, or a government-owned vehicle. Where a public entity contributed, a written claim generally has to be presented to it within six months, far ahead of the two years, and missing that window can foreclose the government avenue even where the claim against the driver survives. Because these crashes turn so heavily on where and how the crossing happened, the roadway and its design are more often in play than in a typical car crash. The second feature is practical rather than legal: pedestrian injuries are frequently severe — long hospital admissions, multiple surgeries, extended rehabilitation — and during that period the injured person and their family are focused on survival and recovery, not on filing deadlines. It is precisely when a claim is most serious that the clock is most easily overlooked, and an insurer negotiating a catastrophic claim has no obligation to point out that the filing period is closing. The period is generally paused where the injured person was under eighteen, which matters because children are struck as pedestrians and a family may assume too much time has passed. A hit-and-run adds urgency of its own: where the driver is unidentified, recovery usually shifts to the pedestrian\u2019s own uninsured-motorist coverage, which carries separate notice and reporting requirements that can be far shorter than two years. So the deadlines to hold in view are several — two years to file, six months for any public entity, a policy clock for uninsured-motorist claims, and the simple risk of a serious injury consuming attention — all counted from the date of the crash, which is why recording it precisely and getting the timeline checked early matters.',
      whatToTrack: [
        'The exact date of the crash, which the deadline is measured from',
        'Whether a crosswalk, signal, or roadway design defect contributed',
        'Whether a government entity is responsible for that condition or vehicle',
        'The victim\u2019s age at the time, since a child\u2019s period is generally paused',
        'Whether the driver fled, triggering uninsured-motorist notice rules',
        'The treatment timeline, since severe injuries can distract from the deadline',
      ],
      howClearCaseHelps:
        'The deadline checker computes the common windows from the crash date and claim type, including the six-month government presentation clock where a crosswalk, signal, or roadway defect may involve a public entity. ClearCaseIQ records the crash date with the claim facts and flags the government and uninsured-motorist deadlines that run well ahead of the two-year period, so a severe injury does not quietly consume the time to act.',
    },
    faqs: [
      {
        q: 'How long do I have to file a pedestrian accident claim in California?',
        a: 'Generally two years from the date of the crash for an injury claim. If a crosswalk, signal, or roadway defect involves a government entity, a written claim usually has to be presented within six months, which comes first. If the injured pedestrian was a child, the period is generally paused until they turn eighteen.',
      },
      {
        q: 'A bad crosswalk or broken signal was involved. Does that change my deadline?',
        a: 'For a claim against the responsible public entity, yes. It generally requires a written claim within six months, far ahead of the two years, and missing it can foreclose recovery from the government even if your claim against the driver remains. Because roadway and crosswalk design so often matter in pedestrian crashes, this deadline is frequently in play.',
      },
      {
        q: 'I was badly hurt and could not deal with a claim. Is it too late?',
        a: 'Not necessarily. The two-year period may not have passed, and a minor\u2019s deadline is paused. But severe injuries are exactly when the clock is most easily overlooked, and any six-month government deadline does not wait, so it is worth having the timeline checked as soon as you are able rather than assuming either way.',
      },
      {
        q: 'The driver fled. What are my deadlines then?',
        a: 'You still have two years to sue, but a hit-and-run usually means turning to your own uninsured-motorist coverage, which carries its own notice and reporting requirements that can be much shorter. Prompt reporting and preserving any detail about the vehicle are time-sensitive independent of the two-year clock.',
      },
      {
        q: 'Does negotiating with the insurance company extend the deadline?',
        a: 'No. An open claim and an active negotiation leave the two-year period running, and the adjuster need not warn you it is closing. In a serious pedestrian claim, where negotiations can stretch on, this is a real risk worth guarding against.',
      },
    ],
  },
  {
    slug: PED_HIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Pedestrian Hiring',
    title: 'Do I Need a Lawyer for a Pedestrian Accident in California?',
    eyebrow: 'Hiring an attorney',
    description:
      'Pedestrian claims combine severe injuries, disputed right-of-way, and coverage that is often too thin for the harm. A contingency-fee lawyer costs nothing up front, and finding enough insurance is frequently the difference between a claim and a recovery.',
    psychology: 'I want to know whether a pedestrian accident claim needs a lawyer.',
    cta: 'Get Matched With a Pedestrian Accident Lawyer',
    exampleQueries: [
      'do I need a lawyer for a pedestrian accident in California',
      'how much does a pedestrian accident lawyer cost',
      'should I get a lawyer after being hit by a car walking',
      'pedestrian accident attorney California',
    ],
    signals: [
      'Severe injury',
      'Disputed right-of-way',
      'Thin driver coverage',
      'Hit-and-run',
      'Government-entity angle',
      'Low or denied offer',
    ],
    sections: {
      whyItMatters:
        'Pedestrian claims are among the ones where a lawyer matters most, because they combine the three hardest features a claim can have. The injuries are typically severe — a person on foot absorbs the full impact, so fractures, head injuries, internal trauma, and long rehabilitation are common — which means the stakes are high and a discounted settlement is very costly. Fault is frequently disputed, with insurers leaning on the "stepped out in front of me" account and on comparative fault even where the driver failed to yield in a crosswalk, and answering that takes the California right-of-way rules applied to the physical evidence. And, most decisively, the available coverage is often too thin for the harm: a catastrophic pedestrian injury against a driver carrying the state-minimum policy is the classic mismatch, and the recovery then depends entirely on finding additional coverage — the pedestrian\u2019s own uninsured/underinsured motorist policy, a resident relative\u2019s policy, a commercial or employer policy if the vehicle was being used for work, or a public entity if a roadway defect contributed. Identifying and stacking those sources is skilled work that unrepresented claimants almost never do, and it is frequently the difference between a nominal recovery and a real one. Pedestrian lawyers work on contingency: nothing up front, no hourly fee, a percentage of the recovery (commonly about a third before a lawsuit and more in litigation) with case costs off the top, and no fee if there is no recovery, so the cost of finding out where you stand is only time. Given the severity, the disputed fault, and the coverage puzzle, almost any pedestrian claim beyond a truly minor injury warrants at least a review — and the six-month government deadline that can attach means waiting has a cost. The rare claim that might be handled alone is a minor injury with a clearly at-fault, adequately insured driver accepting responsibility and offering fair value; even then, because the evaluation is free and an early settlement forfeits value that cannot be reopened, a quick review costs little and can surface coverage a pedestrian would never have known to look for.',
      whatToTrack: [
        'How severe and lasting the injury is',
        'Whether right-of-way or comparative fault is being disputed',
        'Whether the driver is thinly insured or fled the scene',
        'Whether your own UM/UIM or a relative\u2019s policy may apply',
        'Whether a crosswalk or roadway defect brings in a public entity',
        'Any offer already made and how it treats fault and coverage',
        'The crash date, so the deadline is not quietly running out',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps you judge whether a pedestrian claim needs an attorney before you commit — it weighs the severity against disputed fault and, crucially, against whether the available coverage matches the harm. When representation makes sense, it matches you with California pedestrian attorneys who work on contingency and know how to find and stack the coverage these claims depend on. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need a lawyer after being hit by a car while walking?',
        a: 'For almost any injury beyond a minor one, yes. Pedestrian claims combine severe injuries, disputed right-of-way, and coverage that is often too thin for the harm, and a lawyer\u2019s work in finding additional coverage is frequently what turns a nominal recovery into a real one. A minor injury with a clearly at-fault, well-insured driver can sometimes be handled directly.',
      },
      {
        q: 'How much does a pedestrian accident lawyer cost in California?',
        a: 'Typically nothing up front. These lawyers work on contingency — a percentage of the recovery, commonly about a third before a lawsuit and more in litigation, with case costs off the top and no fee if there is no recovery. Being evaluated does not cost anything.',
      },
      {
        q: 'The driver barely had any insurance. Is my claim worth pursuing?',
        a: 'Often yes, but it usually requires finding coverage beyond the driver — most importantly your own uninsured/underinsured motorist coverage, which generally protects you when hit as a pedestrian, and possibly a resident relative\u2019s, a commercial, or a public-entity source. Identifying and stacking those is exactly what a lawyer does and what makes a thin-coverage claim worthwhile.',
      },
      {
        q: 'The insurer says I stepped out and it was my fault. Can a lawyer help?',
        a: 'Yes, and this is a common reason to have one. The "stepped out" account is the standard defense, and rebutting it takes the California crosswalk and right-of-way rules applied to the impact point, sight lines, and lighting. A lawyer builds that record; unrepresented pedestrians are often talked into accepting fault the evidence does not support.',
      },
      {
        q: 'What should I ask a pedestrian accident lawyer before hiring them?',
        a: 'How they find and stack coverage when the driver is underinsured, how they handle the "stepped out" and comparative-fault defenses, whether they check for a public-entity roadway or crosswalk angle and its six-month deadline, the contingency percentage before and after a lawsuit, and how case costs are handled.',
      },
    ],
  },
]

export const pedestrianGuideTopicContentBySlug: Record<string, TopicContent> = {
  [PED_LIABILITY_SLUG]: {
    scenario: `A pedestrian was struck by a right-turning driver at an intersection with no painted crossing. The insurer opened by asserting she was not in a crosswalk. She was: an unmarked crosswalk existed at that intersection as a matter of law, and the driver\u2019s turn placed fault on the failure to yield. ${NOT_ADVICE}`,
    timeline: [
      ['Establish the crossing', 'Marked crosswalk, unmarked crosswalk at an intersection, or mid-block.'],
      ['Apply the rules', 'Section 21950 in a crosswalk; section 21954 outside one.'],
      ['Weigh the evidence', 'Impact point, distance traveled, sight lines, and lighting.'],
      ['Assess comparative fault', 'What share, if any, genuinely attaches to the pedestrian.'],
    ],
    severityLadder: [
      ['Clear driver fault', 'Failure to yield in a marked or unmarked crosswalk.'],
      ['Mixed', 'Both parties bear some fault; recovery reduced not barred.'],
      ['Disputed', 'Mid-block crossing or conflicting accounts.'],
      ['Pedestrian-heavy', 'Suddenly leaving a curb into the path of a close vehicle.'],
    ],
    treatmentProgression: [
      { label: 'Crosswalk right-of-way', copy: 'Drivers must yield in marked and unmarked crosswalks (CVC 21950).' },
      { label: 'Unmarked crosswalks', copy: 'A crosswalk usually exists at an intersection even without paint.' },
      { label: 'Outside a crosswalk', copy: 'A pedestrian must yield mid-block, though drivers still owe care (CVC 21954).' },
      { label: 'Pedestrian duty', copy: 'No suddenly leaving a curb into the path of a close vehicle.' },
    ],
    settlementDrivers: [
      'Whether the crossing was in a crosswalk',
      'Whether the intersection created an unmarked crosswalk',
      'What the driver was doing at impact',
      'The physical evidence of how the collision happened',
      'Visibility and lighting',
      'How much comparative fault applies',
    ],
    settlementValueDetails: [
      { label: 'Crosswalks favor pedestrians', copy: 'Drivers must yield in marked and unmarked crosswalks alike.' },
      { label: 'Unmarked still counts', copy: '"No lines" is usually not the defense it is offered as.' },
      { label: 'Evidence beats accounts', copy: 'Impact point and sight lines answer the "stepped out" story.' },
      { label: 'A missing citation proves less', copy: 'The Freedom to Walk Act weakened the jaywalking argument.' },
    ],
    insuranceProblems: [
      'The insurer claims no crosswalk existed because none was painted.',
      'The "stepped out in front of me" account is asserted without evidence.',
      'A mid-block crossing is treated as total fault rather than comparative.',
      'A lack of jaywalking citation is ignored or its meaning overstated.',
      'Witnesses are not sought before memories fade.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Were you in a crosswalk, and was it marked or at an intersection?' },
      { label: 'Step 2', question: 'What was the driver doing — turning, pulling out, going straight?' },
      { label: 'Step 3', question: 'Where did the vehicle strike you and where did you land?' },
      { label: 'Step 4', question: 'What were the visibility and lighting like?' },
    ],
  },
  [PED_SOL_SLUG]: {
    scenario: `A family spent months at a hospital bedside after a parent was struck in a crosswalk, assuming the claim could wait. The crossing signal had been malfunctioning — a public-entity issue with a six-month deadline that passed while the family was focused on survival. ${NOT_ADVICE}`,
    timeline: [
      ['Date of the crash', 'The two-year clock starts here. Record it exactly.'],
      ['Six-month mark', 'Where a crosswalk, signal, or roadway defect involves a public entity.'],
      ['During recovery', 'A severe injury can quietly consume the time to act.'],
      ['Two years', 'The general filing deadline for a pedestrian injury claim.'],
    ],
    severityLadder: [
      ['Within a typical window', 'More than a year remains and no public entity is involved.'],
      ['Attention at risk', 'A catastrophic injury pulls focus away from the deadline.'],
      ['Urgent', 'Under ninety days, a six-month government claim, or a UM notice clock.'],
      ['May have passed', 'Beyond two years, unless the victim was a child.'],
    ],
    treatmentProgression: [
      { label: 'Two years', copy: 'The general period for a pedestrian injury claim, from the crash.' },
      { label: 'Six months', copy: 'Written claim to a public entity for a crosswalk, signal, or roadway defect.' },
      { label: 'Paused for minors', copy: 'A child\u2019s period is generally paused until they turn eighteen.' },
      { label: 'Policy clock', copy: 'A hit-and-run turns on UM coverage with its own notice rules.' },
    ],
    settlementDrivers: [
      'The exact date of the crash',
      'Whether a crosswalk, signal, or roadway defect contributed',
      'Whether a public entity is responsible',
      'The victim\u2019s age at the time',
      'Whether the driver fled',
      'The treatment timeline and its demands on the family',
    ],
    settlementValueDetails: [
      { label: 'Negotiation does not pause it', copy: 'An open claim does not stop the two-year clock.' },
      { label: 'The government clock comes first', copy: 'Six months for a public-entity defect arrives long before two years.' },
      { label: 'Severity distracts', copy: 'The most serious claims are where the deadline is most often missed.' },
      { label: 'Hit-and-run adds a clock', copy: 'UM coverage carries its own, often shorter, notice requirements.' },
    ],
    insuranceProblems: [
      'A public-entity signal or crosswalk defect is missed at six months.',
      'The family is focused on recovery while the deadline runs.',
      'A hit-and-run UM notice deadline passes unnoticed.',
      'A minor\u2019s paused deadline is assumed to have expired.',
      'Negotiation on a catastrophic claim drags past the deadline.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the exact date of the crash?' },
      { label: 'Step 2', question: 'Was a crosswalk, signal, or roadway design involved?' },
      { label: 'Step 3', question: 'Did the driver flee the scene?' },
      { label: 'Step 4', question: 'How old was the injured person at the time?' },
    ],
  },
  [PED_HIRE_SLUG]: {
    scenario: `A pedestrian with a catastrophic leg injury faced a driver carrying only the state-minimum policy — far too little for the harm. A lawyer found her own underinsured-motorist coverage on a car parked at home and a commercial policy on the driver\u2019s work vehicle, turning a nominal claim into a real recovery. ${NOT_ADVICE}`,
    timeline: [
      ['Right after the crash', 'Get treatment; preserve the scene facts and witnesses.'],
      ['Early', 'Coverage sources and any public-entity angle need identifying.'],
      ['Deciding on counsel', 'Severe injury, disputed fault, or thin coverage are the signals.'],
      ['Before accepting', 'An early offer rarely reflects all available coverage.'],
    ],
    severityLadder: [
      ['Handle it yourself', 'Minor injury, clearly at-fault well-insured driver, fair offer.'],
      ['Worth a review', 'Any disputed fault or an injury needing treatment.'],
      ['Get representation', 'Severe injury, contested right-of-way, or thin coverage.'],
      ['Move quickly', 'Hit-and-run, a roadway defect, or a government-entity deadline.'],
    ],
    treatmentProgression: [
      { label: 'Contingency fee', copy: 'Nothing up front; a percentage of the recovery, no fee if there is no recovery.' },
      { label: 'Finding coverage', copy: 'Stacking UM/UIM, relative, commercial, and public-entity sources.' },
      { label: 'Rebutting fault', copy: 'Applying the crosswalk rules to counter the "stepped out" defense.' },
      { label: 'Litigation', copy: 'If coverage will not respond fairly, the percentage rises.' },
    ],
    settlementDrivers: [
      'How severe the injury is',
      'Whether right-of-way is disputed',
      'Whether the driver is thinly insured or fled',
      'Whether additional coverage can be found and stacked',
      'Whether a public entity contributed',
      'Any offer already made',
    ],
    settlementValueDetails: [
      { label: 'Coverage is the puzzle', copy: 'A catastrophic injury against a minimum policy needs additional sources.' },
      { label: 'Fault must be rebutted', copy: 'The "stepped out" defense is answered with the right-of-way rules.' },
      { label: 'Free to be evaluated', copy: 'A contingency review costs only time.' },
      { label: 'Deadlines can attach', copy: 'A public-entity angle brings a six-month clock.' },
    ],
    insuranceProblems: [
      'A minimum-policy offer is framed as the most available.',
      'The pedestrian is never told their own UM/UIM applies.',
      'The "stepped out" defense pressures a low, fast settlement.',
      'A public-entity deadline is allowed to pass during recovery.',
      'A commercial policy on a work vehicle is never identified.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How severe is the injury?' },
      { label: 'Step 2', question: 'Is the insurer disputing who had the right of way?' },
      { label: 'Step 3', question: 'Is the driver thinly insured, driving for work, or did they flee?' },
      { label: 'Step 4', question: 'Do you or a resident relative have auto coverage?' },
    ],
  },
}

/** The existing value page these spokes complete the hub around. */
export const PEDESTRIAN_VALUE_SLUG = PED_VALUE_SLUG
