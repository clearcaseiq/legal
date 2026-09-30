/**
 * Which case type and hub section each existing article belongs to, and the
 * one in-text "next question" link authored for it.
 *
 * Kept apart from the article files so the case-type layer can be reviewed and
 * changed in one place without touching 70 content modules. Pages written after
 * this layer existed (the drafts in `seoCaseTypeDrafts`) carry their own fields
 * instead; a field set on the page always wins over this map.
 *
 * Generic injury and treatment pages ("herniated disc after an accident") are
 * Car Accident pages. Their copy is written around crashes, and a car accident
 * is overwhelmingly the context the searcher arrives from.
 *
 * `caseTypeAssignments.test.ts` fails if a page that names one of the six case
 * types in its URL has no assignment, so a new article cannot silently miss its
 * hub.
 */
import type { CaseSection, CaseType } from './caseTypeHubDefs'
import type { LandingPage, NextStep } from './seoLandingPages'

export interface CaseAssignment {
  caseType: CaseType
  caseSection: CaseSection
}

const car = (caseSection: CaseSection): CaseAssignment => ({ caseType: 'car', caseSection })
const slip = (caseSection: CaseSection): CaseAssignment => ({ caseType: 'slip_fall', caseSection })
const dog = (caseSection: CaseSection): CaseAssignment => ({ caseType: 'dog_bite', caseSection })
const ped = (caseSection: CaseSection): CaseAssignment => ({ caseType: 'pedestrian', caseSection })
const medmal = (caseSection: CaseSection): CaseAssignment => ({ caseType: 'medmal', caseSection })
const death = (caseSection: CaseSection): CaseAssignment => ({ caseType: 'wrongful_death', caseSection })

export const CASE_ASSIGNMENTS: Record<string, CaseAssignment> = {
  // Car accident: injuries. Generic injury pages live here; see the note above.
  '/injuries/whiplash-after-rear-end': car('injuries'),
  '/injuries/concussion-after-accident': car('injuries'),
  '/injuries/shoulder-pain-after-accident': car('injuries'),
  '/injuries/lower-back-pain-after-accident': car('injuries'),
  '/injuries/neck-pain-after-accident': car('injuries'),
  '/injuries/herniated-disc-after-accident': car('injuries'),
  '/injuries/rotator-cuff-injury': car('injuries'),
  '/injuries/tbi-after-accident': car('injuries'),
  '/injuries/knee-injury-after-accident': car('injuries'),
  '/injuries/nerve-damage-after-accident': car('injuries'),
  '/injuries/ptsd-after-car-accident': car('injuries'),
  '/injuries/broken-ribs-after-accident': car('injuries'),
  '/injuries/spinal-stenosis-after-accident': car('injuries'),
  '/injuries/sciatica-after-accident': car('injuries'),
  '/injuries/radiculopathy-after-accident': car('injuries'),
  '/injuries/bulging-disc-after-accident': car('injuries'),
  '/injuries/degenerative-disc-after-accident': car('injuries'),
  '/injuries/hip-pain-after-accident': car('injuries'),
  '/injuries/ankle-injury-after-accident': car('injuries'),
  '/injuries/foot-injury-after-accident': car('injuries'),
  '/injuries/wrist-injury-after-accident': car('injuries'),
  '/injuries/hand-injury-after-accident': car('injuries'),
  '/injuries/facial-injury-after-accident': car('injuries'),
  '/injuries/jaw-injury-after-accident': car('injuries'),
  '/injuries/migraines-after-accident': car('injuries'),
  '/injuries/dizziness-after-accident': car('injuries'),
  '/injuries/elbow-injury-after-accident': car('injuries'),
  '/injuries/torn-meniscus-after-accident': car('injuries'),
  '/education/delayed-accident-symptoms': car('injuries'),

  // Car accident: treatment.
  '/treatment/mri-after-accident': car('treatment'),
  '/treatment/physical-therapy-after-accident': car('treatment'),
  '/treatment/spinal-surgery-after-accident': car('treatment'),
  '/treatment/chiropractic-after-accident': car('treatment'),
  '/treatment/orthopedic-treatment': car('treatment'),
  '/treatment/pain-management': car('treatment'),
  '/treatment/epidural-injections': car('treatment'),
  '/treatment/neurology-treatment': car('treatment'),
  '/treatment/emg-testing': car('treatment'),
  '/treatment/ct-scan-after-accident': car('treatment'),
  '/treatment/acupuncture-after-accident': car('treatment'),
  '/treatment/spinal-fusion-surgery': car('treatment'),
  '/treatment/discectomy-after-accident': car('treatment'),
  '/treatment/shoulder-surgery-after-accident': car('treatment'),
  '/treatment/knee-surgery-after-accident': car('treatment'),
  '/treatment/pain-medication-after-accident': car('treatment'),
  '/treatment/occupational-therapy-after-accident': car('treatment'),
  '/treatment/nerve-conduction-study': car('treatment'),
  '/education/post-accident-medical-care': car('treatment'),

  // Car accident: value.
  '/how-much-is-a-car-accident-case-worth': car('value'),
  '/how-much-is-a-whiplash-case-worth': car('value'),
  '/how-much-is-a-herniated-disc-case-worth': car('value'),
  '/how-much-is-a-tbi-case-worth': car('value'),
  '/how-much-is-a-back-surgery-case-worth': car('value'),
  '/tools/whiplash-settlement-calculator': car('value'),
  '/tools/herniated-disc-calculator': car('value'),
  '/tools/tbi-settlement-calculator': car('value'),
  '/settlements/rotator-cuff-california': car('value'),
  '/settlements/knee-injury-california': car('value'),
  '/settlements/broken-bone-settlement': car('value'),
  '/settlements/shoulder-surgery-settlement': car('value'),
  '/settlements/hit-and-run-settlement': car('value'),
  '/settlements/rear-end-accident-settlement': car('value'),
  '/settlements/t-bone-accident-settlement': car('value'),
  '/settlements/freeway-accident-settlement': car('value'),
  '/settlements/passenger-injury-settlement': car('value'),
  '/settlements/drunk-driver-settlement': car('value'),
  '/settlements/uninsured-driver-settlement': car('value'),
  '/settlements/construction-zone-settlement': car('value'),
  '/settlements/knee-surgery-settlement': car('value'),
  '/settlements/ptsd-settlement': car('value'),
  '/settlements/radiculopathy-settlement': car('value'),

  // Car accident: fault. The crash-type pages answer "who caused it" first.
  '/liability/disputed-fault': car('liability'),
  '/liability/rear-end-accident-fault': car('liability'),
  '/liability/red-light-accident-fault': car('liability'),
  '/liability/left-turn-accident-fault': car('liability'),
  '/liability/hit-and-run-liability': car('liability'),
  '/commercial/drunk-driver-accident': car('liability'),
  '/commercial/head-on-collision': car('liability'),
  '/commercial/t-bone-accident': car('liability'),
  '/commercial/rollover-accident': car('liability'),
  '/commercial/multi-vehicle-accident': car('liability'),
  '/commercial/intersection-accident': car('liability'),
  '/commercial/freeway-accident': car('liability'),
  '/commercial/distracted-driver-accident': car('liability'),
  '/commercial/texting-while-driving-accident': car('liability'),
  '/commercial/wrong-way-driver-accident': car('liability'),
  '/commercial/passenger-injury-accident': car('liability'),
  '/commercial/construction-zone-accident': car('liability'),

  // Car accident: insurance and evidence.
  '/insurance/claim-denial': car('insurance'),
  '/insurance/settlement-process': car('insurance'),
  '/education/insurance-settlement-tactics': car('insurance'),
  '/liability/uninsured-driver-accident': car('insurance'),
  '/liability/police-report-errors': car('evidence'),

  // Slip and fall.
  '/how-much-is-a-slip-and-fall-case-worth': slip('value'),
  '/who-is-liable-for-a-slip-and-fall-in-california': slip('liability'),
  '/california-slip-and-fall-statute-of-limitations': slip('deadlines'),
  '/do-i-need-a-lawyer-for-a-slip-and-fall-in-california': slip('attorney'),

  // Dog bite.
  '/how-much-is-a-dog-bite-case-worth': dog('value'),
  '/who-is-liable-for-a-dog-bite-in-california': dog('liability'),
  '/california-dog-bite-statute-of-limitations': dog('deadlines'),
  '/when-to-hire-a-dog-bite-lawyer-in-california': dog('attorney'),

  // Pedestrian.
  '/how-much-is-a-pedestrian-accident-case-worth': ped('value'),
  '/who-is-at-fault-in-a-pedestrian-accident-in-california': ped('liability'),
  '/commercial/pedestrian-accident': ped('liability'),
  '/california-pedestrian-accident-statute-of-limitations': ped('deadlines'),
  '/do-i-need-a-lawyer-for-a-pedestrian-accident-in-california': ped('attorney'),

  // Medical malpractice.
  '/how-much-is-a-medical-malpractice-case-worth-in-california': medmal('value'),
  '/do-i-have-a-medical-malpractice-case-in-california': medmal('liability'),
  '/how-to-prove-medical-malpractice-in-california': medmal('evidence'),
  '/california-medical-malpractice-statute-of-limitations': medmal('deadlines'),

  // Wrongful death.
  '/how-much-is-a-wrongful-death-case-worth-in-california': death('value'),
  '/who-can-file-a-wrongful-death-claim-in-california': death('liability'),
  '/california-statute-of-limitations-wrongful-death': death('deadlines'),
}

/**
 * City pages, by the suffix every page in the series shares. Only applied to the
 * Cities category: `/injuries/ptsd-after-car-accident` also ends in
 * `-car-accident` and is not a city page.
 */
const CITY_SUFFIXES: [suffix: string, caseType: CaseType][] = [
  ['-car-accident', 'car'],
  ['-pedestrian-accident', 'pedestrian'],
  ['-dog-bite', 'dog_bite'],
  ['-slip-and-fall', 'slip_fall'],
  ['-medical-malpractice-claim', 'medmal'],
  ['-birth-injury-claim', 'medmal'],
  ['-wrongful-death', 'wrongful_death'],
]

export function caseAssignmentFor(
  page: Pick<LandingPage, 'slug' | 'category'>
): CaseAssignment | undefined {
  const explicit = CASE_ASSIGNMENTS[page.slug]
  if (explicit) return explicit
  if (page.category !== 'Cities') return undefined
  const match = CITY_SUFFIXES.find(([suffix]) => page.slug.endsWith(suffix))
  return match ? { caseType: match[1], caseSection: 'local' } : undefined
}

/**
 * The in-text link to the question a reader of each page usually asks next.
 *
 * Authored, not generated: the anchor has to describe where it goes and read as
 * part of the sentence, which a template cannot do across 70 different pages.
 * Pages without an entry here are listed in the link map's gaps tab.
 */
export const NEXT_STEPS: Record<string, NextStep> = {
  '/injuries/whiplash-after-rear-end': {
    lead: 'How long neck symptoms last, and how consistently they were treated, is also what an insurer weighs when it values',
    anchor: 'a whiplash claim after a car accident',
    to: '/how-much-is-a-whiplash-case-worth',
  },
  '/injuries/herniated-disc-after-accident': {
    lead: 'An MRI-confirmed disc injury, and whether injections or surgery were recommended, are two of the largest factors in',
    anchor: 'what a herniated disc claim may be worth',
    to: '/how-much-is-a-herniated-disc-case-worth',
  },
  '/injuries/neck-pain-after-accident': {
    lead: 'Where neck pain turns out to be soft-tissue strain rather than a disc injury, the questions about value are covered in',
    anchor: 'our guide to whiplash claim value',
    to: '/how-much-is-a-whiplash-case-worth',
  },
  '/injuries/lower-back-pain-after-accident': {
    lead: 'Imaging results, time off work and how long treatment runs all feed into',
    anchor: 'the potential value of a car accident claim',
    to: '/how-much-is-a-car-accident-case-worth',
  },
  '/injuries/concussion-after-accident': {
    lead: 'When concussion symptoms persist past the first few weeks, the claim is valued as a brain injury; that is explained in',
    anchor: 'how TBI claims are valued',
    to: '/how-much-is-a-tbi-case-worth',
  },
  '/injuries/tbi-after-accident': {
    lead: 'Cognitive testing, work restrictions and the long-term prognosis are what drive',
    anchor: 'the value of a traumatic brain injury claim',
    to: '/how-much-is-a-tbi-case-worth',
  },
  '/education/delayed-accident-symptoms': {
    lead: 'Symptoms that appear days later can still be part of the claim, and how they were documented affects',
    anchor: 'what a car accident case may be worth',
    to: '/how-much-is-a-car-accident-case-worth',
  },
  '/treatment/mri-after-accident': {
    lead: 'An MRI that confirms a structural injury often changes how an insurer reads the file, which is why imaging features so heavily in',
    anchor: 'car accident claim value',
    to: '/how-much-is-a-car-accident-case-worth',
  },
  '/treatment/physical-therapy-after-accident': {
    lead: 'Gaps in therapy are one of the arguments insurers use to discount a claim; the others are covered in',
    anchor: 'insurance settlement tactics after an accident',
    to: '/education/insurance-settlement-tactics',
  },
  '/liability/disputed-fault': {
    lead: 'California reduces recovery by your share of fault rather than barring it, and how that plays out in numbers is part of',
    anchor: 'what a car accident case may be worth',
    to: '/how-much-is-a-car-accident-case-worth',
  },
  '/liability/rear-end-accident-fault': {
    lead: 'Clear fault in a rear-end collision usually moves the negotiation to injuries and treatment, covered in',
    anchor: 'rear-end accident settlement value',
    to: '/settlements/rear-end-accident-settlement',
  },
  '/liability/police-report-errors': {
    lead: 'A report is one piece of the record rather than the last word; the photos, footage and witness details that support it are listed in',
    anchor: 'the car accident evidence checklist',
    to: '/car-accident-evidence-checklist',
  },
  '/insurance/claim-denial': {
    lead: 'A denial or a low first number is often a starting position; how to judge one is covered in',
    anchor: 'what to do when a car accident settlement offer seems too low',
    to: '/car-accident-settlement-offer-too-low',
  },
  '/insurance/settlement-process': {
    lead: 'Most of the waiting in a claim happens at predictable stages, which are laid out in',
    anchor: 'how long a car accident claim takes in California',
    to: '/how-long-does-a-car-accident-claim-take-in-california',
  },
  '/education/insurance-settlement-tactics': {
    lead: 'Before responding to an offer, it helps to know',
    anchor: 'what a car accident case may be worth',
    to: '/how-much-is-a-car-accident-case-worth',
  },
  '/who-is-liable-for-a-slip-and-fall-in-california': {
    lead: 'Once responsibility is established, the documented injury and its effect on work and daily life determine',
    anchor: 'what a slip and fall case may be worth',
    to: '/how-much-is-a-slip-and-fall-case-worth',
  },
  '/california-slip-and-fall-statute-of-limitations': {
    lead: 'The evidence that proves a hazard existed disappears much faster than the deadline runs; see',
    anchor: 'what evidence to preserve after a slip and fall',
    to: '/slip-and-fall-evidence',
  },
  '/do-i-need-a-lawyer-for-a-slip-and-fall-in-california': {
    lead: 'Whether a lawyer is worth it depends partly on',
    anchor: 'what a slip and fall case may be worth',
    to: '/how-much-is-a-slip-and-fall-case-worth',
  },
  '/who-is-liable-for-a-dog-bite-in-california': {
    lead: 'Because liability is usually settled by statute, the real question becomes',
    anchor: 'what a dog bite case may be worth',
    to: '/how-much-is-a-dog-bite-case-worth',
  },
  '/california-dog-bite-statute-of-limitations': {
    lead: 'The deadline matters less if there is no policy to pay the claim, so it is worth checking early',
    anchor: 'whether homeowners insurance covers the bite',
    to: '/does-homeowners-insurance-cover-dog-bites-in-california',
  },
  '/when-to-hire-a-dog-bite-lawyer-in-california': {
    lead: 'Scarring is usually what separates a small claim from a significant one; see',
    anchor: 'how dog bite scarring is compensated',
    to: '/dog-bite-scarring-compensation-california',
  },
  '/who-is-at-fault-in-a-pedestrian-accident-in-california': {
    lead: 'With fault established, the injuries and the available coverage decide',
    anchor: 'what a pedestrian accident case may be worth',
    to: '/how-much-is-a-pedestrian-accident-case-worth',
  },
  '/commercial/pedestrian-accident': {
    lead: 'Where the driver drove off or had no insurance, a pedestrian can often claim on',
    anchor: 'their own uninsured motorist coverage after a hit-and-run',
    to: '/pedestrian-hit-and-run-uninsured-motorist-coverage',
  },
  '/california-pedestrian-accident-statute-of-limitations': {
    lead: 'Knowing the deadline is the first step; the second is understanding',
    anchor: 'what a pedestrian accident case may be worth',
    to: '/how-much-is-a-pedestrian-accident-case-worth',
  },
  '/do-i-need-a-lawyer-for-a-pedestrian-accident-in-california': {
    lead: 'The severity of the injuries usually decides that question; see',
    anchor: 'the injuries most common in pedestrian accidents',
    to: '/common-pedestrian-accident-injuries',
  },
  '/do-i-have-a-medical-malpractice-case-in-california': {
    lead: 'If the answer looks like yes, the next question is',
    anchor: 'what a medical malpractice case may be worth under MICRA',
    to: '/how-much-is-a-medical-malpractice-case-worth-in-california',
  },
  '/how-to-prove-medical-malpractice-in-california': {
    lead: 'Proof and value are connected: the harm an expert can tie to the error is what determines',
    anchor: 'what a medical malpractice case may be worth',
    to: '/how-much-is-a-medical-malpractice-case-worth-in-california',
  },
  '/california-medical-malpractice-statute-of-limitations': {
    lead: 'Delayed diagnosis cases are where the discovery rule matters most; see',
    anchor: 'how misdiagnosis claims work in California',
    to: '/misdiagnosis-or-delayed-diagnosis-claim-california',
  },
  '/who-can-file-a-wrongful-death-claim-in-california': {
    lead: 'The family’s own claim and the estate’s claim recover different losses, which is explained in',
    anchor: 'wrongful death versus survival actions',
    to: '/wrongful-death-vs-survival-action-california',
  },
  '/california-statute-of-limitations-wrongful-death': {
    lead: 'Within that deadline, the damages the family can recover are set out in',
    anchor: 'what a wrongful death case may be worth in California',
    to: '/how-much-is-a-wrongful-death-case-worth-in-california',
  },
}
