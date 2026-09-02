import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The consolidated case-strength guide.
 *
 * Replaces eight pages — `/case-strength/{rear-end,red-light}-accident` and
 * `/case-strength-{hit-and-run,uninsured-driver,commercial-truck,rideshare,
 * motorcycle,pedestrian}-accident` — which were generated from one seed where
 * every field except `title` and one clause of `description` was identical.
 * They scored 0.909 similarity with the crash type masked and produced no
 * recorded impressions in three months.
 *
 * The per-crash-type detail is not discarded; it moves into the FAQ, where the
 * differences between proving a rear-end case and a hit-and-run case can be
 * stated in a sentence each rather than padded into eight near-identical pages.
 *
 * Takes the `/case-strength` URL itself. That prefix previously 301'd to a
 * topic hub because it was a bare directory a crawler reached by truncating a
 * child URL. With the children gone, the truncation now lands on a real page
 * about the thing the URL names, which is a better answer than a redirect.
 */

export const CASE_STRENGTH_SLUG = '/case-strength'

export const caseStrengthGuidePages: LandingPage[] = [
  {
    slug: CASE_STRENGTH_SLUG,
    category: 'Claim Types',
    cluster: 'Case Strength and Attorney Fit',
    title: 'How Strong Is My Accident Case?',
    eyebrow: 'Attorney-fit guide',
    description:
      'Case strength is four separate things — who is at fault, how badly you were hurt, whether it is documented, and whether there is insurance to pay. A case can be strong on three and still be declined on the fourth. This explains how they interact.',
    psychology: 'I want to know whether my case is strong enough for an attorney to take.',
    cta: 'Check My Case Strength',
    exampleQueries: [
      'will a lawyer take my case',
      'is my accident case strong',
      'why did attorneys reject my case',
      'what makes a personal injury case strong',
    ],
    signals: [
      'Liability strength',
      'Injury severity',
      'Documentation quality',
      'Available coverage',
      'Comparative fault',
      'Deadline risk',
    ],
    sections: {
      whyItMatters:
        'Attorney case selection is an economic decision before it is a legal one, and that is the part most people are never told. Firms work personal injury cases on contingency, which means they front the costs and are paid a share of a recovery that may be two years away. So a case is assessed on expected recovery against expected work, and a claim can be entirely meritorious and still be declined because the arithmetic does not work. The four inputs are close to independent. Liability is who caused it. Damages are how badly you were hurt and what it cost. Documentation is whether any of that can be proven. Collectability is whether insurance exists to pay a judgment. Strength in three does not compensate for a zero in the fourth, and collectability is the one people most often overlook: a catastrophic injury caused by an uninsured driver with no assets, where you carry no uninsured motorist coverage, is a case almost no firm will take, however clear the fault. The reverse also holds. Perfect liability on a claim with two thousand dollars in bills and no lasting effect is usually not worth a contingency fee to anyone, which is why "the other driver admitted it" is not on its own the answer people expect it to be.',
      whatToTrack: [
        'Police report number, any citation issued, and whether fault was assigned in it',
        'Photographs of both vehicles, the scene, and any visible injury, with their original timestamps',
        'Names and contact details for every witness, gathered before people disperse',
        'Dashcam, doorbell, or business surveillance footage, requested quickly because most systems overwrite within days',
        'Every medical record from the first visit onward, including the date you first sought care',
        'Total billed medical charges, not the amount your health insurer paid',
        'Missed work in days and dollars, with employer confirmation',
        'The at-fault policy limits, and your own uninsured and underinsured motorist coverage',
        'Anything you said in a recorded statement, and what you were asked',
      ],
      howClearCaseHelps:
        'ClearCaseIQ scores the four inputs separately rather than producing a single verdict, because a case that is weak on documentation is a different problem from one that is weak on coverage — the first can often be fixed, the second usually cannot. The assessment identifies which input is limiting, what evidence would move it, and what is missing from the file before an attorney sees it. That matters because triage is fast: a firm decides from an incomplete file in minutes, and the gap between a declined case and an accepted one is frequently organisation rather than merit.',
    },
    faqs: [
      {
        q: 'Is a rear-end case automatically strong?',
        a: 'Liability in a rear-end collision is usually straightforward, since the following driver is generally expected to maintain a safe distance. But liability is only one of the four inputs, and rear-end claims attract the most aggressive soft-tissue defences — low property damage is routinely used to argue you could not have been badly hurt. Treatment records and their timing tend to matter more here than the fault question.',
      },
      {
        q: 'What decides a red light or intersection case?',
        a: 'These turn almost entirely on evidence rather than argument, because both drivers usually claim the light. Independent proof decides it: a citation, an independent witness, intersection or business camera footage, or a damage pattern consistent with one account and not the other. Footage is the highest-value item and the most perishable — most systems overwrite within days.',
      },
      {
        q: 'Can I have a case if the driver fled or had no insurance?',
        a: 'Often yes, but through your own policy rather than theirs. Uninsured and underinsured motorist coverage exists for exactly this, and in a hit-and-run it usually depends on having reported to police promptly. This is the clearest example of collectability deciding a case: the strength of your claim ends up resting on coverage you bought, not on the other driver.',
      },
      {
        q: 'Are truck and rideshare cases stronger because there is more insurance?',
        a: 'The available coverage is typically far larger, which does change what a case can be worth. But they are also harder: responsibility may be split between driver, employer, and contractor, and the decisive records — driver logs, maintenance history, telematics, app trip status — are held by the company rather than by you. Preservation matters early, because those records are not yours to retrieve later.',
      },
      {
        q: 'Do motorcycle and pedestrian cases start at a disadvantage?',
        a: 'Injuries in both tend to be severe, which raises damages. The difficulty is that both attract assumptions about the injured person — that the rider was speeding, that the pedestrian stepped out — which appear in adjuster reasoning whether or not evidence supports them. Scene evidence, witnesses, and vehicle damage patterns do the work of answering an assumption nobody has stated out loud.',
      },
      {
        q: 'Why would an attorney decline a case that seems clear?',
        a: 'Most commonly, damages that do not justify the contingency work, no collectable insurance behind the at-fault party, a gap in treatment that undermines causation, or a deadline too close to prepare properly. A decline is a judgement about the economics of that file at that moment, not a ruling on whether you were wronged.',
      },
      {
        q: 'Does being partly at fault end the case?',
        a: 'Not in California, which uses pure comparative negligence: your recovery is reduced by your share of fault rather than barred. Being found thirty percent responsible reduces a recovery by thirty percent. An early allegation of shared fault from an adjuster is a negotiating position until evidence supports it.',
      },
    ],
  },
]

export const caseStrengthGuideTopicContentBySlug: Record<string, TopicContent> = {
  [CASE_STRENGTH_SLUG]: {
    scenario:
      'A claimant was told by two firms that the case was not a fit, and assumed the injury was not serious enough. It was not the injury. The at-fault driver carried a minimum-limits policy that had already been partly consumed by another claimant from the same crash, and the claimant had declined underinsured motorist coverage on their own policy. The liability was never in question and the treatment was well documented; there was simply nothing left to collect from.',
    timeline: [
      ['At the scene', 'Liability evidence is at its most complete and starts degrading immediately. Photographs, witness details, and the report matter more than anything gathered later.'],
      ['First two weeks', 'The date of first treatment is set, and it becomes the anchor for every later causation argument. Footage held by third parties is usually overwritten in this window.'],
      ['Through treatment', 'Damages become measurable as bills, records, and missed work accumulate. Coverage limits should be established here rather than at the end.'],
      ['At maximum medical improvement', 'All four inputs are finally visible at once, and the case can be assessed honestly for the first time.'],
    ],
    severityLadder: [
      ['Limited', 'Clear fault but minor injury, short treatment, and low bills. Often a claim to handle directly rather than a case a firm will take on contingency.'],
      ['Developing', 'Real injury and ongoing treatment, but liability disputed or documentation incomplete. Usually fixable, and worth organising before approaching anyone.'],
      ['Strong', 'Fault supported by independent evidence, documented injury with continuous treatment, quantified losses, and coverage confirmed to exist.'],
      ['Urgent', 'Severe or permanent injury, a commercial or multi-policy defendant, a minor or fatality, or a deadline close enough to constrain preparation.'],
    ],
    treatmentProgression: [
      { label: 'Liability', copy: 'Who caused it, and whether that can be shown by something other than your account. Reports, citations, footage, witnesses, and damage patterns.' },
      { label: 'Damages', copy: 'How badly you were hurt and what it cost. Billed charges, wage loss, out-of-pocket expense, and any lasting restriction.' },
      { label: 'Documentation', copy: 'Whether the first two can be proven. Continuous records, an explained treatment timeline, and objective findings where they exist.' },
      { label: 'Collectability', copy: 'Whether money exists to pay. At-fault limits, umbrella or commercial layers, and your own UM/UIM coverage. The input most often discovered last and the one most likely to end a case.' },
    ],
    settlementDrivers: [
      'Independent proof of fault rather than competing accounts',
      'Treatment beginning promptly, with any delay documented and explained',
      'Objective findings — imaging, specialist examination, surgical recommendation',
      'Quantified wage loss and out-of-pocket costs with employer confirmation',
      'Confirmed policy limits, including your own UM/UIM coverage',
      'A deadline far enough out to prepare rather than rush',
    ],
    settlementValueDetails: [
      { label: 'The limiting input', copy: 'A case is only as viable as its weakest of the four. Identifying which one is limiting tells you whether the problem is fixable or fatal.' },
      { label: 'Collectability is not optional', copy: 'Fault and injury mean little against an uninsured defendant with no assets and no UM coverage on your side. This ends more viable-looking cases than any other factor.' },
      { label: 'Documentation is the fixable one', copy: 'Unlike liability facts and policy limits, documentation can usually still be improved after the fact by collecting records and explaining gaps.' },
      { label: 'Contingency arithmetic', copy: 'A firm fronts costs against a recovery that may be years away, so expected value has to exceed expected work. Small claims are declined on economics, not merit.' },
    ],
    insuranceProblems: [
      'Low property damage is used to argue the injury cannot be real, regardless of what the records show.',
      'A gap in treatment is presented as proof the injury resolved, without acknowledging referral or authorisation delays.',
      'Comparative fault is alleged early and without evidence, to reduce the starting point.',
      'Policy limits are not disclosed, so the claim is negotiated without knowing the ceiling.',
      'A quick offer arrives before treatment is complete, with a release attached.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What independent evidence supports your account of how the crash happened?' },
      { label: 'Step 2', question: 'How serious is the injury, and is treatment finished or ongoing?' },
      { label: 'Step 3', question: 'What are the total billed charges, missed work, and out-of-pocket costs?' },
      { label: 'Step 4', question: 'What coverage exists — the at-fault limits, and your own UM/UIM?' },
    ],
  },
}
