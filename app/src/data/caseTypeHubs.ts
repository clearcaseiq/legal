/**
 * The full copy for the six case-type hubs.
 *
 * Each hub is the page a searcher lands on for the broad query ("car accident
 * claim California") and the page every article in the case type links up to.
 * It explains the claim end to end and hands the reader down to the article
 * that answers their narrower question, with anchors that say where each link
 * goes. The hubs are indexed; the `/case-assessment/*` paid pages stay noindex.
 *
 * Links are hand-picked, two to four per section. Cross-links to another case
 * type's articles are deliberate (a pedestrian's fractures are covered on the
 * broken-bone page) rather than generated. `caseTypeHubs.test.ts` fails if any
 * link here stops resolving to an indexed page.
 *
 * Only import this from the hub route and the server; the home page and the
 * footer take names and slugs from `caseTypeHubDefs`.
 */
import type { CaseType } from './caseTypeHubDefs'

export interface HubLink {
  to: string
  anchor: string
}

export interface HubSection {
  id: 'claims' | 'injuries' | 'liability' | 'treatment' | 'insurance' | 'evidence' | 'value' | 'deadlines'
  heading: string
  paragraphs: string[]
  links: HubLink[]
}

export interface CaseTypeHubContent {
  caseType: CaseType
  eyebrow: string
  intro: string[]
  sections: HubSection[]
  faqs: { q: string; a: string }[]
}

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm, and this guide is general information rather than legal advice. A licensed California attorney can review the facts particular to you.'

export const caseTypeHubContent: Record<CaseType, CaseTypeHubContent> = {
  car: {
    caseType: 'car',
    eyebrow: 'Car accident guide',
    intro: [
      'A California car accident claim asks three questions in order: who caused the crash, what the crash did to you, and what insurance stands behind the person responsible. Most of what happens in a claim, from the first adjuster call to a final settlement, is an argument about one of those three.',
      'This guide walks through each part of the claim and links to the article that answers the narrower question you may have, whether that is delayed neck pain, a low first offer, or a crash with no police report.',
    ],
    sections: [
      {
        id: 'claims',
        heading: 'Do you have a car accident claim?',
        paragraphs: [
          'A claim exists when another driver’s carelessness caused the crash and the crash caused you harm that can be documented. California uses pure comparative negligence, so being partly at fault reduces what you can recover rather than ending the claim. A claim that looks small in the first week can grow as symptoms develop, which is why the early record matters more than the early estimate.',
        ],
        links: [
          { to: '/legal/california-personal-injury', anchor: 'Whether you have a California personal injury claim' },
          { to: '/case-strength', anchor: 'How strong your accident case is, factor by factor' },
          { to: '/when-to-hire-a-lawyer-after-accident', anchor: 'When a car accident is worth a lawyer' },
        ],
      },
      {
        id: 'injuries',
        heading: 'Common car accident injuries',
        paragraphs: [
          'Neck and back injuries dominate car accident claims: whiplash from a rear-end impact, disc injuries confirmed on MRI, and pain that radiates into an arm or leg. Many of these do not announce themselves at the scene. Adrenaline masks pain, and stiffness often peaks a day or two later, so a gap between the crash and the first doctor visit is common and needs an explanation in the record rather than an apology.',
          'An older injury does not bar a claim. California lets you recover for an aggravation of a pre-existing condition, though the insurer will argue about how much of the current problem the crash caused.',
        ],
        links: [
          { to: '/injuries/whiplash-after-rear-end', anchor: 'Whiplash and neck pain after a rear-end crash' },
          { to: '/injuries/herniated-disc-after-accident', anchor: 'Herniated disc after a car accident' },
          { to: '/education/delayed-accident-symptoms', anchor: 'Delayed pain that shows up days after a crash' },
          { to: '/car-accident-with-a-pre-existing-injury', anchor: 'A car accident that worsened a pre-existing injury' },
        ],
      },
      {
        id: 'liability',
        heading: 'Who is at fault',
        paragraphs: [
          'Fault is decided by evidence, not by who apologized or who the other driver blames. Some crash types come with a strong presumption: the driver who rear-ends another car is usually at fault, and a left-turning driver generally must yield to oncoming traffic. Others, such as intersection crashes where both drivers claim the green light, turn on witnesses, video and the physical damage.',
        ],
        links: [
          { to: '/liability/disputed-fault', anchor: 'What happens when fault is disputed' },
          { to: '/liability/rear-end-accident-fault', anchor: 'Who is at fault in a rear-end collision' },
          { to: '/liability/left-turn-accident-fault', anchor: 'Fault in a left-turn accident' },
        ],
      },
      {
        id: 'treatment',
        heading: 'Treatment and why it shapes the claim',
        paragraphs: [
          'The medical record is the claim’s spine. Imaging that confirms a structural injury, a referral from a primary doctor to a specialist, and consistent attendance at therapy each make the injury harder to dismiss. Stopping treatment early, or leaving weeks between appointments without a reason on file, is the most common way a genuine injury ends up valued as a minor one.',
        ],
        links: [
          { to: '/treatment/mri-after-accident', anchor: 'When an MRI is ordered after a crash, and why it matters' },
          { to: '/treatment/physical-therapy-after-accident', anchor: 'Physical therapy after a car accident' },
          { to: '/treatment/chiropractic-after-accident', anchor: 'How insurers view chiropractic care' },
        ],
      },
      {
        id: 'insurance',
        heading: 'How car insurance pays',
        paragraphs: [
          'The at-fault driver’s liability policy pays for your injuries, up to its limit. California’s minimum limits rose on January 1, 2025 to $30,000 per person and $60,000 per accident, and many drivers carry exactly that. When the other driver has no insurance or too little, your own uninsured and underinsured motorist coverage can fill the gap. Medical payments coverage on your own policy can pay bills early regardless of fault.',
          'The adjuster works for the insurer. A quick first offer, a request for a recorded statement, or a blanket medical authorization are all routine, and none of them has to be answered on the adjuster’s timetable.',
        ],
        links: [
          { to: '/who-pays-medical-bills-after-a-car-accident-in-california', anchor: 'Who pays your medical bills after a car accident' },
          { to: '/car-accident-settlement-offer-too-low', anchor: 'What to do when the settlement offer seems too low' },
          { to: '/liability/uninsured-driver-accident', anchor: 'Claims against an uninsured driver' },
          { to: '/car-accident-property-damage-claim-california', anchor: 'Handling the vehicle damage claim' },
        ],
      },
      {
        id: 'evidence',
        heading: 'The evidence that matters',
        paragraphs: [
          'Evidence is most available in the first days and degrades quickly. Vehicles are repaired, traffic and business cameras overwrite footage, and witnesses become hard to reach. Photographs of both vehicles and the scene, the other driver’s insurance details, witness names, and a police report number are worth more in week one than anything that can be gathered in month six. A missing or mistaken police report weakens a claim less than people fear, provided the rest of the record is there.',
        ],
        links: [
          { to: '/car-accident-evidence-checklist', anchor: 'The car accident evidence checklist' },
          { to: '/car-accident-without-a-police-report-in-california', anchor: 'A car accident claim without a police report' },
          { to: '/liability/police-report-errors', anchor: 'Correcting errors in a police report' },
        ],
      },
      {
        id: 'value',
        heading: 'What affects the value of a car accident claim',
        paragraphs: [
          'Value is built from documented losses: medical bills, future care, lost wages and reduced earning capacity, plus pain and suffering, which tracks how serious and lasting the injury is. The practical ceiling is the insurance available. There is no formula or multiplier in California law, and an average settlement figure says little about a particular claim, because two claims with the same bills can be worth very different amounts.',
        ],
        links: [
          { to: '/how-much-is-a-car-accident-case-worth', anchor: 'How much a car accident case may be worth' },
          { to: '/lost-wages-after-a-car-accident-in-california', anchor: 'Recovering lost wages after a car accident' },
          { to: '/how-long-does-a-car-accident-claim-take-in-california', anchor: 'How long a car accident claim takes' },
          { to: '/tools/settlement-calculator', anchor: 'Estimate a range with the settlement calculator' },
        ],
      },
      {
        id: 'deadlines',
        heading: 'The filing deadline',
        paragraphs: [
          'The general deadline to file a personal injury lawsuit in California is two years from the date of the crash. A claim against a city, county or state agency, for example over a government vehicle or a dangerous road, usually needs a written claim within six months. Property damage has a separate, longer deadline. Negotiating with an insurer does not pause any of these.',
        ],
        links: [
          { to: '/california-statute-of-limitations-personal-injury', anchor: 'California’s statute of limitations for injury claims' },
          { to: '/tools/california-sol-checker', anchor: 'Check your deadline with the SOL checker' },
          { to: '/missed-the-statute-of-limitations', anchor: 'What happens if you missed the deadline' },
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I still recover if I was partly at fault for the crash?',
        a: 'Yes. California uses pure comparative negligence, so your recovery is reduced by your share of fault rather than barred. A driver found 30% at fault can still recover 70% of the documented losses.',
      },
      {
        q: 'What if my pain started a few days after the accident?',
        a: 'Delayed symptoms are common after a crash and can still be part of the claim. What matters is getting evaluated once they appear and making sure the record explains the timing.',
      },
      {
        q: 'How long do I have to file a car accident claim in California?',
        a: 'Generally two years from the crash for an injury lawsuit, and usually six months for a written claim against a government entity. Talking to an insurer does not extend either deadline.',
      },
      {
        q: 'Should I accept the insurer’s first offer?',
        a: 'Not before you know how the injury is progressing. A settlement is final, and a first offer made while you are still treating cannot account for care you have not received yet.',
      },
    ],
  },

  slip_fall: {
    caseType: 'slip_fall',
    eyebrow: 'Slip and fall guide',
    intro: [
      'A fall on someone else’s property becomes a claim when the owner or occupier knew, or should have known, about a dangerous condition and failed to fix it or warn about it. That knowledge question is the centre of almost every California slip and fall case, and it is usually answered by evidence that disappears quickly.',
      'This guide explains how premises claims work in California and links to the article for each part, from a wet floor in a grocery store to the medical bills after a broken hip.',
    ],
    sections: [
      {
        id: 'claims',
        heading: 'When a fall is a claim',
        paragraphs: [
          'Falling is not enough on its own. A claim needs a hazard the owner was responsible for, notice of it (either actual knowledge or a condition present long enough that reasonable inspection would have found it), and an injury the fall caused. California’s comparative fault rule means that not watching your step reduces a recovery rather than defeating it.',
        ],
        links: [
          { to: '/who-is-liable-for-a-slip-and-fall-in-california', anchor: 'Who is liable for a slip and fall in California' },
          { to: '/do-i-need-a-lawyer-for-a-slip-and-fall-in-california', anchor: 'Whether a slip and fall needs a lawyer' },
        ],
      },
      {
        id: 'injuries',
        heading: 'Common slip and fall injuries',
        paragraphs: [
          'Falls produce a recognisable set of injuries: wrist fractures from bracing, hip fractures in older adults, knee and ankle injuries, and head injuries from striking the floor. A hip fracture in particular often means surgery, a hospital stay and months of rehabilitation, and it can change what a person is able to do at home.',
        ],
        links: [
          { to: '/broken-hip-from-a-fall-california', anchor: 'A broken hip from a fall' },
          { to: '/injuries/wrist-injury-after-accident', anchor: 'Wrist injuries from bracing a fall' },
          { to: '/injuries/concussion-after-accident', anchor: 'Concussion symptoms after hitting your head' },
        ],
      },
      {
        id: 'liability',
        heading: 'Who is responsible',
        paragraphs: [
          'The responsible party is whoever controlled the property: a store, a landlord, a property manager, sometimes a cleaning contractor. Stores are judged partly on their inspection routines, so a spill that sat for forty minutes in an aisle that should have been checked every twenty is a different case from one that happened seconds before the fall. Public property follows special rules and shorter deadlines.',
        ],
        links: [
          { to: '/slipped-on-a-wet-floor-in-a-store-california', anchor: 'Slipping on a wet floor in a store' },
          { to: '/who-is-liable-for-a-slip-and-fall-in-california', anchor: 'How notice and control decide liability' },
        ],
      },
      {
        id: 'treatment',
        heading: 'Treatment after a fall',
        paragraphs: [
          'Getting examined the same day matters for two reasons: some fall injuries, such as hairline fractures and head injuries, are easy to underestimate, and a same-day record ties the injury to the fall before anyone can suggest it happened elsewhere. Follow-up with orthopaedics and therapy then shows how the injury progressed.',
        ],
        links: [
          { to: '/treatment/orthopedic-treatment', anchor: 'Orthopaedic treatment after an injury' },
          { to: '/treatment/physical-therapy-after-accident', anchor: 'Physical therapy and recovery' },
          { to: '/education/post-accident-medical-care', anchor: 'Medical care in the days after an injury' },
        ],
      },
      {
        id: 'insurance',
        heading: 'How premises insurance pays',
        paragraphs: [
          'Businesses carry commercial general liability coverage, and homeowners and landlords carry liability coverage in their property policies. The claim is usually handled by that insurer’s adjuster, who will focus on notice and on whether you should have seen the hazard. A store’s own incident report belongs to the store, so ask for the report number and keep your own notes.',
        ],
        links: [
          { to: '/education/insurance-settlement-tactics', anchor: 'Tactics insurers use to reduce injury claims' },
          { to: '/insurance/claim-denial', anchor: 'Why injury claims get denied' },
        ],
      },
      {
        id: 'evidence',
        heading: 'Evidence to preserve',
        paragraphs: [
          'The hazard is usually cleaned up within minutes, and store video is commonly overwritten within days or weeks. Photographs of the floor and your shoes, the names of employees and witnesses, the incident report number, and a written request to preserve footage are the pieces that most often decide these cases.',
        ],
        links: [
          { to: '/slip-and-fall-evidence', anchor: 'What evidence to preserve after a slip and fall' },
          { to: '/how-to-organize-medical-records', anchor: 'How to organize your medical records' },
        ],
      },
      {
        id: 'value',
        heading: 'What affects the value of a slip and fall claim',
        paragraphs: [
          'Value follows the injury and its effect on your life: the medical bills, any surgery, time away from work, and how lasting the limitation is. Comparative fault can reduce it, and the strength of the notice evidence often decides whether an insurer negotiates seriously at all.',
        ],
        links: [
          { to: '/how-much-is-a-slip-and-fall-case-worth', anchor: 'How much a slip and fall case may be worth' },
          { to: '/slip-and-fall-medical-bills-and-lost-wages', anchor: 'Recovering medical bills and lost wages after a fall' },
        ],
      },
      {
        id: 'deadlines',
        heading: 'The filing deadline',
        paragraphs: [
          'Most California slip and fall claims have a two-year deadline to file suit. A fall on public property, such as a city sidewalk or a government building, usually requires a written claim to the agency within six months, which is the deadline most often missed.',
        ],
        links: [
          { to: '/california-slip-and-fall-statute-of-limitations', anchor: 'California’s slip and fall statute of limitations' },
          { to: '/tools/california-sol-checker', anchor: 'Check your deadline with the SOL checker' },
        ],
      },
    ],
    faqs: [
      {
        q: 'Do I have a case if I did not see the spill?',
        a: 'Possibly. The question is whether the owner knew or should have known about it, not whether you saw it. Not noticing a hazard can reduce a recovery under comparative fault, but it does not end the claim.',
      },
      {
        q: 'What if the store says it cleaned the floor regularly?',
        a: 'Inspection logs, video and employee accounts show whether that is true for the time of your fall. A routine on paper that was not followed that day does not protect the store.',
      },
      {
        q: 'Is a fall on a city sidewalk different?',
        a: 'Yes. Claims against public entities usually require a written claim within six months, and the rules about dangerous conditions of public property are different from private premises.',
      },
      {
        q: 'Can I claim if I fell at a friend’s house?',
        a: 'Often the claim is paid by the homeowner’s liability insurance rather than your friend personally, which is what that coverage exists for.',
      },
    ],
  },

  dog_bite: {
    caseType: 'dog_bite',
    eyebrow: 'Dog bite guide',
    intro: [
      'California is a strict liability state for dog bites. Under Civil Code section 3342, a dog’s owner is responsible for a bite that happens in a public place or where the victim was lawfully on private property, whether or not the dog had ever bitten anyone before. There is no “one free bite”.',
      'Because liability is usually settled by the statute, a dog bite claim tends to turn on two other things: how serious and lasting the injury is, and whether there is insurance to pay for it. This guide covers both and links to the detail.',
    ],
    sections: [
      {
        id: 'claims',
        heading: 'When a dog bite is a claim',
        paragraphs: [
          'A documented bite in a public place, or on private property where you had a right to be, is usually enough to establish the owner’s responsibility under section 3342. Knocked-down injuries without a bite can still be claims, but they are generally proven through negligence rather than the strict liability statute.',
        ],
        links: [
          { to: '/when-to-hire-a-dog-bite-lawyer-in-california', anchor: 'When to hire a dog bite lawyer' },
          { to: '/case-strength', anchor: 'How strong your injury case is' },
        ],
      },
      {
        id: 'injuries',
        heading: 'Dog bite injuries',
        paragraphs: [
          'Bites cause puncture wounds, tearing, crush injuries to hands and arms, and, most seriously for children, facial wounds. Scarring and disfigurement are often the largest part of the claim, and reconstructive surgery may run in stages over months or years. The emotional aftermath, including fear of dogs, is real and compensable.',
        ],
        links: [
          { to: '/dog-bite-scarring-compensation-california', anchor: 'How dog bite scarring is compensated' },
          { to: '/injuries/facial-injury-after-accident', anchor: 'Facial injuries and disfigurement' },
          { to: '/injuries/hand-injury-after-accident', anchor: 'Hand injuries and loss of function' },
        ],
      },
      {
        id: 'liability',
        heading: 'Who is liable',
        paragraphs: [
          'The owner is strictly liable under section 3342. A landlord or someone keeping the dog may also be responsible in narrower circumstances, usually where they knew the dog was dangerous. The statute has limited exceptions, including for trespassers and for some police and military dogs acting in the line of duty.',
        ],
        links: [
          { to: '/who-is-liable-for-a-dog-bite-in-california', anchor: 'Who is liable for a dog bite in California' },
          { to: '/los-angeles-dog-bite', anchor: 'How dog bite liability plays out in Los Angeles' },
        ],
      },
      {
        id: 'treatment',
        heading: 'Treatment and infection risk',
        paragraphs: [
          'Dog bites carry a real infection risk, and a wound that looks minor can become serious within a day or two. Prompt cleaning, antibiotics where prescribed, a check of tetanus status and, where the dog’s vaccination history is unknown, a decision about rabies treatment all belong in the record. Photographs of the wound as it heals document scarring better than any later description.',
        ],
        links: [
          { to: '/dog-bite-infection-and-treatment', anchor: 'Dog bite infection and treatment' },
          { to: '/education/post-accident-medical-care', anchor: 'Medical care in the days after an injury' },
        ],
      },
      {
        id: 'insurance',
        heading: 'Homeowner and renter insurance',
        paragraphs: [
          'Most dog bite claims are paid by the owner’s homeowner or renter liability policy rather than by the owner personally. Some policies exclude certain breeds or dogs with a bite history, and some owners carry no coverage at all, so identifying the policy early is one of the most useful steps in the claim.',
        ],
        links: [
          { to: '/does-homeowners-insurance-cover-dog-bites-in-california', anchor: 'Whether homeowners insurance covers a dog bite' },
          { to: '/education/insurance-settlement-tactics', anchor: 'Tactics insurers use to reduce injury claims' },
        ],
      },
      {
        id: 'evidence',
        heading: 'Evidence',
        paragraphs: [
          'The owner’s name and address, the dog’s description, any animal control report, witness details, and dated photographs of the wound at each stage are the core of a dog bite file. Medical records then show the treatment and the scarring.',
        ],
        links: [
          { to: '/how-to-build-a-medical-chronology', anchor: 'How to build a medical chronology' },
          { to: '/what-medical-records-do-lawyers-need', anchor: 'What medical records a lawyer will ask for' },
        ],
      },
      {
        id: 'value',
        heading: 'What affects the value of a dog bite claim',
        paragraphs: [
          'Value depends on the medical care, the permanence and visibility of any scarring, the victim’s age, and the emotional effect, bounded in practice by the insurance available. A visible facial scar on a child is valued very differently from a healed bite on a forearm.',
        ],
        links: [
          { to: '/how-much-is-a-dog-bite-case-worth', anchor: 'How much a dog bite case may be worth' },
          { to: '/tools/settlement-calculator', anchor: 'Estimate a range with the settlement calculator' },
        ],
      },
      {
        id: 'deadlines',
        heading: 'The filing deadline',
        paragraphs: [
          'The general deadline for a California dog bite lawsuit is two years from the bite. Claims for a child can follow different timing rules, and a bite involving a government-owned dog usually requires a six-month written claim.',
        ],
        links: [
          { to: '/california-dog-bite-statute-of-limitations', anchor: 'California’s dog bite statute of limitations' },
          { to: '/tools/california-sol-checker', anchor: 'Check your deadline with the SOL checker' },
        ],
      },
    ],
    faqs: [
      {
        q: 'Does California have a one-bite rule?',
        a: 'No. Civil Code section 3342 makes the owner liable for a bite in a public place or where you were lawfully present, even if the dog had never bitten before.',
      },
      {
        q: 'Who pays for a dog bite?',
        a: 'Usually the owner’s homeowner or renter liability insurance. Breed exclusions and uninsured owners are the main reasons a strong claim can be hard to collect.',
      },
      {
        q: 'Is scarring compensated?',
        a: 'Yes. Scarring and disfigurement are compensated as non-economic loss, and their location, size and permanence strongly affect the value of the claim.',
      },
      {
        q: 'What if the dog belonged to a friend or relative?',
        a: 'The claim is usually made against their insurance policy rather than against them personally, which is what the liability coverage is for.',
      },
    ],
  },

  pedestrian: {
    caseType: 'pedestrian',
    eyebrow: 'Pedestrian accident guide',
    intro: [
      'A person on foot absorbs the full force of a vehicle, so pedestrian claims usually begin with serious injuries: fractures, head injuries and long recoveries. The two questions that decide the outcome are who had the right of way and how much insurance is available to pay for injuries of that size.',
      'This guide covers California’s right-of-way rules, the coverage a pedestrian can draw on (including their own auto policy), and links to the detail for each.',
    ],
    sections: [
      {
        id: 'claims',
        heading: 'When a pedestrian accident is a claim',
        paragraphs: [
          'Drivers owe pedestrians a duty of due care everywhere, not only in crosswalks. A claim exists where the driver’s carelessness caused the collision. California’s pure comparative negligence means a pedestrian who crossed mid-block or was distracted can still recover, reduced by their share of fault.',
        ],
        links: [
          { to: '/commercial/pedestrian-accident', anchor: 'How pedestrian injury claims work' },
          { to: '/do-i-need-a-lawyer-for-a-pedestrian-accident-in-california', anchor: 'Whether a pedestrian accident needs a lawyer' },
        ],
      },
      {
        id: 'injuries',
        heading: 'Common pedestrian injuries',
        paragraphs: [
          'Leg and pelvic fractures from the bumper, head injuries from striking the hood or the road, and shoulder and spinal injuries from the fall are the typical pattern. Many pedestrian injuries involve surgery and a long rehabilitation, which is why these claims so often exceed the at-fault driver’s policy limit.',
        ],
        links: [
          { to: '/common-pedestrian-accident-injuries', anchor: 'The injuries most common in pedestrian accidents' },
          { to: '/injuries/tbi-after-accident', anchor: 'Traumatic brain injury after being struck' },
          { to: '/settlements/broken-bone-settlement', anchor: 'How broken bone claims are valued' },
        ],
      },
      {
        id: 'liability',
        heading: 'Right of way and fault',
        paragraphs: [
          'Vehicle Code section 21950 requires drivers to yield to pedestrians in marked crosswalks and in unmarked crosswalks at intersections, which exist in law at most intersections whether or not they are painted. Pedestrians must not step suddenly into the path of a vehicle too close to stop. Since 2023, the Freedom to Walk Act has limited jaywalking citations, though it did not change the civil right-of-way rules.',
        ],
        links: [
          { to: '/who-is-at-fault-in-a-pedestrian-accident-in-california', anchor: 'Who is at fault in a pedestrian accident' },
          { to: '/hit-by-a-car-in-a-crosswalk-california', anchor: 'Being hit by a car in a crosswalk' },
        ],
      },
      {
        id: 'treatment',
        heading: 'Treatment and recovery',
        paragraphs: [
          'Pedestrian injuries are often treated in stages: emergency care and surgery, then orthopaedic follow-up, then long rehabilitation. Head injuries may need neurological evaluation even when the first scan is clear. Each stage adds to the record that establishes what the collision cost you.',
        ],
        links: [
          { to: '/treatment/orthopedic-treatment', anchor: 'Orthopaedic treatment after an injury' },
          { to: '/treatment/neurology-treatment', anchor: 'Neurology follow-up for head injuries' },
          { to: '/treatment/physical-therapy-after-accident', anchor: 'Physical therapy and rehabilitation' },
        ],
      },
      {
        id: 'insurance',
        heading: 'Whose insurance pays',
        paragraphs: [
          'The driver’s liability policy pays first. Because pedestrian injuries are so often severe, it is frequently not enough, and a pedestrian can usually also claim on their own auto policy’s uninsured or underinsured motorist coverage, or a household member’s, even though they were walking. That coverage is also the main route to recovery after a hit-and-run.',
        ],
        links: [
          { to: '/pedestrian-hit-and-run-uninsured-motorist-coverage', anchor: 'Using your own uninsured motorist coverage after a hit-and-run' },
          { to: '/who-pays-medical-bills-after-a-car-accident-in-california', anchor: 'Who pays medical bills after a collision' },
          { to: '/liability/uninsured-driver-accident', anchor: 'Claims against an uninsured driver' },
        ],
      },
      {
        id: 'evidence',
        heading: 'Evidence',
        paragraphs: [
          'The impact point on the vehicle, where you came to rest, sight lines, lighting, traffic signals and nearby cameras often answer the “stepped out suddenly” defence better than anyone’s account. A police report, witness names and early photographs are worth securing quickly.',
        ],
        links: [
          { to: '/car-accident-evidence-checklist', anchor: 'The collision evidence checklist' },
          { to: '/liability/police-report-errors', anchor: 'Correcting errors in a police report' },
        ],
      },
      {
        id: 'value',
        heading: 'What affects the value of a pedestrian claim',
        paragraphs: [
          'Serious injuries, surgery, lost income and a lasting limitation push value up; comparative fault and limited insurance hold it down. Identifying every policy that applies, including your own, is often what decides how much of the loss can actually be recovered.',
        ],
        links: [
          { to: '/how-much-is-a-pedestrian-accident-case-worth', anchor: 'How much a pedestrian accident case may be worth' },
          { to: '/lost-wages-after-a-car-accident-in-california', anchor: 'Recovering lost wages after a collision' },
        ],
      },
      {
        id: 'deadlines',
        heading: 'The filing deadline',
        paragraphs: [
          'Most California pedestrian injury lawsuits must be filed within two years. Where a government vehicle or a dangerous public road is involved, a written claim is usually due within six months, and uninsured motorist claims have their own notice requirements.',
        ],
        links: [
          { to: '/california-pedestrian-accident-statute-of-limitations', anchor: 'California’s pedestrian accident statute of limitations' },
          { to: '/tools/california-sol-checker', anchor: 'Check your deadline with the SOL checker' },
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I recover if I was not in a crosswalk?',
        a: 'Often, yes. Drivers still owe pedestrians due care outside crosswalks, and California’s comparative fault rule reduces rather than bars recovery for a pedestrian who shares some fault.',
      },
      {
        q: 'Does my car insurance cover me when I am walking?',
        a: 'Your uninsured and underinsured motorist coverage generally applies when you are hit as a pedestrian, which matters when the driver has little or no insurance or leaves the scene.',
      },
      {
        q: 'What if the driver drove off?',
        a: 'Report it to the police promptly and notify your insurer. Uninsured motorist coverage is usually the main source of recovery after a hit-and-run, and it has strict reporting requirements.',
      },
      {
        q: 'How long do I have to file?',
        a: 'Generally two years for a lawsuit, and usually six months for a written claim against a government entity.',
      },
    ],
  },

  medmal: {
    caseType: 'medmal',
    eyebrow: 'Medical malpractice guide',
    intro: [
      'Medical malpractice is care that fell below the standard a reasonably careful provider would have met, and that caused harm a competent provider would have avoided. A bad outcome on its own is not malpractice; medicine carries risk even when everything is done right.',
      'California malpractice claims have their own rules: expert testimony is almost always required, MICRA limits non-economic damages, notice must be given before suing, and the filing deadlines are shorter than for most injuries. This guide explains each and links to the detail.',
    ],
    sections: [
      {
        id: 'claims',
        heading: 'Do you have a malpractice case?',
        paragraphs: [
          'A case needs four things: a provider-patient relationship, care below the accepted standard, harm caused by that failure, and damages. The hardest element is usually causation: showing the harm came from the error rather than from the underlying illness.',
        ],
        links: [
          { to: '/do-i-have-a-medical-malpractice-case-in-california', anchor: 'Whether you have a medical malpractice case' },
          { to: '/california-medical-malpractice-statute-of-limitations', anchor: 'Why the malpractice deadline is worth checking first' },
        ],
      },
      {
        id: 'injuries',
        heading: 'Common types of malpractice',
        paragraphs: [
          'Most claims fall into a handful of patterns: a diagnosis that was missed or made too late, an error during surgery, a medication given in the wrong drug or dose, and injuries to a mother or baby during delivery. Each pattern has its own evidence and its own causation argument.',
        ],
        links: [
          { to: '/misdiagnosis-or-delayed-diagnosis-claim-california', anchor: 'Misdiagnosis and delayed diagnosis claims' },
          { to: '/surgical-error-claim-california', anchor: 'Surgical error claims' },
          { to: '/medication-error-claim-california', anchor: 'Medication error claims' },
          { to: '/birth-injury-claim-california', anchor: 'Birth injury claims' },
        ],
      },
      {
        id: 'liability',
        heading: 'How malpractice is proven',
        paragraphs: [
          'The standard of care is established by expert testimony from a qualified provider in the same field, who explains what should have happened and how the care departed from it. Another expert then usually has to explain how that departure caused the harm.',
        ],
        links: [
          { to: '/how-to-prove-medical-malpractice-in-california', anchor: 'How medical malpractice is proven in California' },
          { to: '/misdiagnosis-or-delayed-diagnosis-claim-california', anchor: 'How causation is argued in a delayed diagnosis' },
        ],
      },
      {
        id: 'treatment',
        heading: 'Corrective treatment and the medical story',
        paragraphs: [
          'The care that followed the error, including corrective surgery, extra hospital days and ongoing treatment, is both part of the damages and part of the proof. A clear chronology of what happened, when, and who was involved is the foundation an expert reviews.',
        ],
        links: [
          { to: '/how-to-build-a-medical-chronology', anchor: 'How to build a medical chronology' },
          { to: '/what-medical-records-do-lawyers-need', anchor: 'What medical records a lawyer will ask for' },
        ],
      },
      {
        id: 'insurance',
        heading: 'Who pays',
        paragraphs: [
          'Physicians carry professional liability insurance, and hospitals are insured or self-insured. Malpractice insurers defend claims vigorously and review records in detail, and many cases are resolved only after expert reports are exchanged.',
        ],
        links: [
          { to: '/how-insurance-companies-review-medical-records', anchor: 'How insurers review medical records' },
          { to: '/how-much-is-a-medical-malpractice-case-worth-in-california', anchor: 'How MICRA shapes what a malpractice insurer pays' },
        ],
      },
      {
        id: 'evidence',
        heading: 'Records and evidence',
        paragraphs: [
          'You have a right to your medical records, and requesting the complete chart, including imaging, nursing notes and medication administration records, is usually the first practical step. Keeping your own dated notes of conversations with providers helps fill in what the chart leaves out.',
        ],
        links: [
          { to: '/medical-records', anchor: 'Getting your medical records' },
          { to: '/how-to-organize-medical-records', anchor: 'How to organize medical records for a claim' },
        ],
      },
      {
        id: 'value',
        heading: 'What affects the value of a malpractice claim',
        paragraphs: [
          'MICRA caps non-economic damages such as pain and suffering. Since January 1, 2023 the cap has risen each year from $350,000 toward $750,000 for injury cases and from $500,000 toward $1,000,000 for death cases. Economic damages, including medical costs, lost earnings and future care, are not capped and are often the larger part of a serious claim.',
        ],
        links: [
          { to: '/how-much-is-a-medical-malpractice-case-worth-in-california', anchor: 'How much a medical malpractice case may be worth' },
          { to: '/birth-injury-claim-california', anchor: 'Why birth injury claims carry large future-care costs' },
        ],
      },
      {
        id: 'deadlines',
        heading: 'The filing deadline',
        paragraphs: [
          'A California malpractice claim generally must be filed within one year of discovering the injury, and no later than three years from the injury itself, with narrow exceptions. A 90-day notice of intent to sue is required before filing. Claims against public hospitals usually need a six-month written claim.',
        ],
        links: [
          { to: '/california-medical-malpractice-statute-of-limitations', anchor: 'California’s medical malpractice statute of limitations' },
          { to: '/missed-the-statute-of-limitations', anchor: 'What happens if you missed the deadline' },
        ],
      },
    ],
    faqs: [
      {
        q: 'Is a bad outcome the same as malpractice?',
        a: 'No. A claim requires care below the accepted standard that caused harm a competent provider would have avoided. Complications happen even with good care.',
      },
      {
        q: 'Does MICRA limit all damages?',
        a: 'No. MICRA caps only non-economic damages such as pain and suffering. Medical costs, lost earnings and future care are not capped.',
      },
      {
        q: 'How long do I have to file?',
        a: 'Generally one year from discovering the injury and no more than three years from the injury, with a 90-day notice required before suit. The rules are strict and worth checking early.',
      },
      {
        q: 'Do I need an expert?',
        a: 'Almost always. The standard of care and causation are established through expert testimony from a qualified provider.',
      },
    ],
  },

  wrongful_death: {
    caseType: 'wrongful_death',
    eyebrow: 'Wrongful death guide',
    intro: [
      'When someone dies because of another person’s negligence or wrongful act, California allows two kinds of claim. The family’s wrongful death claim compensates what they lost: financial support, household services, and the love and companionship of the person who died. The estate’s survival action carries the losses the person suffered before death.',
      'This guide explains who can bring each claim, what they recover, the evidence involved and the deadline, and links to the detail.',
    ],
    sections: [
      {
        id: 'claims',
        heading: 'Who can bring a claim',
        paragraphs: [
          'California limits wrongful death standing to a defined group. A surviving spouse or domestic partner and children come first; others, such as parents, may qualify when there is no spouse or child or when they were financially dependent. The survival action is brought separately by the estate’s personal representative.',
        ],
        links: [
          { to: '/who-can-file-a-wrongful-death-claim-in-california', anchor: 'Who can file a wrongful death claim in California' },
          { to: '/wrongful-death-vs-survival-action-california', anchor: 'Wrongful death versus survival actions' },
        ],
      },
      {
        id: 'injuries',
        heading: 'Common causes',
        paragraphs: [
          'Most wrongful death claims arise from the same events as injury claims: vehicle collisions, including drunk and distracted driving, medical errors, unsafe property and neglect in care facilities. The cause determines who is responsible and what insurance applies.',
        ],
        links: [
          { to: '/wrongful-death-after-a-car-accident-california', anchor: 'Wrongful death after a car accident' },
          { to: '/commercial/drunk-driver-accident', anchor: 'Claims involving a drunk driver' },
          { to: '/who-is-liable-for-nursing-home-abuse-in-california', anchor: 'Liability for neglect in a care facility' },
        ],
      },
      {
        id: 'liability',
        heading: 'Proving responsibility',
        paragraphs: [
          'A wrongful death claim requires the same proof as the injury claim the person could have brought had they survived: that someone’s negligence or wrongful act caused the death. Where a criminal case exists, a conviction can help but is not required; the civil standard of proof is lower.',
        ],
        links: [
          { to: '/wrongful-death-after-a-car-accident-california', anchor: 'How fault is established after a fatal crash' },
          { to: '/how-to-prove-medical-malpractice-in-california', anchor: 'Proving a death was caused by medical error' },
        ],
      },
      {
        id: 'treatment',
        heading: 'Medical care before death',
        paragraphs: [
          'Where there was a period of treatment between the injury and the death, the medical records establish the cause of death, the medical expenses the estate can recover, and what the person endured. A chronology of that care is often the most important document in the file.',
        ],
        links: [
          { to: '/how-to-build-a-medical-chronology', anchor: 'How to build a medical chronology' },
          { to: '/what-medical-records-do-lawyers-need', anchor: 'The medical records a wrongful death case needs' },
        ],
      },
      {
        id: 'insurance',
        heading: 'Insurance',
        paragraphs: [
          'Recovery usually comes from the responsible party’s liability insurance: an auto policy, a commercial policy, a property policy or a professional liability policy. Where the at-fault driver was uninsured or underinsured, the deceased’s own uninsured motorist coverage may apply.',
        ],
        links: [
          { to: '/liability/uninsured-driver-accident', anchor: 'Claims against an uninsured driver' },
          { to: '/education/insurance-settlement-tactics', anchor: 'Tactics insurers use in negotiations' },
        ],
      },
      {
        id: 'evidence',
        heading: 'Evidence',
        paragraphs: [
          'The death certificate, coroner or autopsy findings, police and accident reports, medical records, and records of the person’s earnings and role in the household all have a place. Evidence of the relationship itself matters too, because the family’s loss of companionship is part of what is compensated.',
        ],
        links: [
          { to: '/wrongful-death-evidence', anchor: 'The evidence in a wrongful death case' },
          { to: '/medical-records', anchor: 'Getting medical records' },
        ],
      },
      {
        id: 'value',
        heading: 'What affects the value of a wrongful death claim',
        paragraphs: [
          'The family recovers lost financial support, the value of household services, funeral and burial costs, and the loss of love, companionship and guidance. California does not compensate the family’s grief itself. The survival action adds the person’s own losses before death, including, under California law as amended, their pain and suffering.',
        ],
        links: [
          { to: '/how-much-is-a-wrongful-death-case-worth-in-california', anchor: 'How much a wrongful death case may be worth' },
          { to: '/wrongful-death-vs-survival-action-california', anchor: 'What the survival action adds' },
        ],
      },
      {
        id: 'deadlines',
        heading: 'The filing deadline',
        paragraphs: [
          'The general deadline for a California wrongful death lawsuit is two years from the date of death. A death caused by medical malpractice follows the malpractice deadlines instead, and a claim against a government entity usually needs a written claim within six months.',
        ],
        links: [
          { to: '/california-statute-of-limitations-wrongful-death', anchor: 'California’s statute of limitations for wrongful death' },
          { to: '/california-medical-malpractice-statute-of-limitations', anchor: 'Deadlines when a death involved medical care' },
        ],
      },
    ],
    faqs: [
      {
        q: 'Who can file a wrongful death claim in California?',
        a: 'A surviving spouse or domestic partner and children first, and in some cases parents or others who would inherit or who were financially dependent.',
      },
      {
        q: 'What is the difference between wrongful death and a survival action?',
        a: 'The wrongful death claim compensates the family’s losses. The survival action is brought by the estate for the losses the person suffered before death.',
      },
      {
        q: 'How long does the family have to file?',
        a: 'Generally two years from the date of death, with shorter or different rules for medical malpractice and for claims against government entities.',
      },
      {
        q: 'Does a criminal case have to come first?',
        a: 'No. A civil wrongful death claim can proceed independently, and it uses a lower standard of proof than a criminal case.',
      },
    ],
  },
}

export { NOT_ADVICE as CASE_TYPE_HUB_DISCLAIMER }
