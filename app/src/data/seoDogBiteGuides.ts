import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The four dog-bite guides — the first dedicated practice-area hub outside the
 * car-accident / injury-type set.
 *
 * California dog-bite claims sit on a statute that most searchers do not know
 * exists: Civil Code section 3342 makes an owner strictly liable for a bite in
 * a public place or where the victim was lawfully on private property,
 * regardless of the dog's history or the owner's knowledge. That single fact
 * changes the whole conversation — "who is responsible" and "does California
 * have a one-bite rule" are answered by the statute, not by fault — and it is
 * the thing a reader cannot get from a competitor's average-settlement page.
 *
 * Four pages cover the twelve dog-bite queries in the keyword set:
 *   - value / settlement (how much, average, pain and suffering, scars, bills)
 *   - liability (who is responsible, one-bite rule, homeowners insurance)
 *   - filing deadline (statute of limitations, how long)
 *   - hiring (when to hire, lawyer cost)
 *
 * No page states an average or a typical payout. Those figures cannot be
 * responsibly produced from public data. Deadlines here mirror the same
 * two-year injury period the SOL guides and the deadline checker use.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. A dog-bite claim turns on where the bite happened, the coverage behind the owner, and medical facts particular to you, which a licensed California attorney can review.'

export const DOG_BITE_VALUE_SLUG = '/how-much-is-a-dog-bite-case-worth'
export const DOG_BITE_LIABILITY_SLUG = '/who-is-liable-for-a-dog-bite-in-california'
export const DOG_BITE_SOL_SLUG = '/california-dog-bite-statute-of-limitations'
export const DOG_BITE_HIRE_SLUG = '/when-to-hire-a-dog-bite-lawyer-in-california'

export const dogBiteGuidePages: LandingPage[] = [
  {
    slug: DOG_BITE_VALUE_SLUG,
    category: 'Settlement',
    cluster: 'Dog Bite Claim Value',
    title: 'How Much Is a Dog Bite Case Worth in California?',
    eyebrow: 'Dog bite value guide',
    description:
      'A California dog-bite claim is worth the medical care and scarring you can document, the effect on your life, and the homeowner or renter policy standing behind the owner. Scarring — especially to a face or a child — drives the number more than the bill total does.',
    psychology: 'I was bitten and I want to know what the claim is realistically worth.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a dog bite claim worth in California',
      'what is the average dog bite settlement in California',
      'how is pain and suffering calculated for a dog bite in California',
      'can I get compensation for dog bite scars in California',
      'who pays medical bills after a dog bite in California',
    ],
    signals: [
      'Wound severity and infection',
      'Permanent scarring or disfigurement',
      'Facial or child injury',
      'Reconstructive surgery',
      'Homeowner or renter coverage',
      'Emotional trauma',
    ],
    sections: {
      whyItMatters:
        'A dog-bite claim in California has the same three layers as any injury claim, but the weighting is different, and the difference is what people get wrong. The first layer is economic loss: emergency treatment, wound care, antibiotics, rabies prophylaxis if it was given, and — where the wound is deep or on the face — plastic and reconstructive surgery, which can run in stages over months or years, particularly for a growing child. These are countable and they are the floor. The second layer is where dog-bite claims separate from ordinary injury claims: non-economic loss for scarring, disfigurement, and the fear that follows an animal attack. A visible scar on a forearm and the same scar across a cheek are valued very differently, because disfigurement is judged by permanence and visibility, and a child who now flinches at every dog carries a loss that has no receipt but is real and compensable. There is no legal multiplier for this — no California court multiplies a bill by a number — and any page that quotes an average is guessing, because two bites with identical charges are valued nothing alike once location, permanence and the victim\u2019s age are considered. The third layer decides whether any of it can be collected: the insurance behind the owner. Most dog-bite recoveries in California are paid not by the owner personally but by their homeowner or renter liability policy, which is why the practical value of a claim often depends on whether the owner carried coverage and whether that policy excluded the breed. Where there is no policy, a strong claim on paper can be worth little in practice, which is a reason to establish coverage early rather than at the end. California\u2019s strict-liability statute, Civil Code section 3342, removes the fight over whether the owner "should have known" the dog was dangerous, so a documented bite in a public place or where you were lawfully present starts from liability rather than arguing toward it — the contest is usually about the value of the harm, not whether the owner is responsible.',
      whatToTrack: [
        'Every provider seen, starting with the emergency or urgent-care visit on the day of the bite',
        'Photographs of the wound at its worst and at each stage of healing, dated',
        'Any surgery performed or recommended, including future reconstruction for a scar',
        'The location of the scar and whether it is visible in ordinary clothing',
        'The victim\u2019s age at the time, since a child\u2019s facial scar is valued differently',
        'Emotional effects: fear of dogs, nightmares, avoidance, any counselling',
        'The owner\u2019s name and address, and whether they rent or own — it points to the policy',
        'Out-of-pocket costs: prescriptions, wound supplies, mileage, missed work',
      ],
      howClearCaseHelps:
        `ClearCaseIQ builds the range from what you can document — the treatment, the scarring, the effect on daily life — rather than from an average, and separates the part that is countable from the part that is argued. It also flags the question that decides collectability, which is what coverage stands behind the owner, so a claim is not valued in a vacuum. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is there an average dog bite settlement in California?',
        a: 'Numbers circulate online, but they come from parties with an interest in them looking large, and they cannot be applied to a specific bite. Value turns on the permanence and visibility of any scar, the victim\u2019s age, the treatment required, and — decisively — the insurance behind the owner. A visible facial scar on a child and a healed puncture on a forearm produce very different figures from identical bills.',
      },
      {
        q: 'How is pain and suffering calculated for a dog bite?',
        a: 'There is no formula in California law, and no court multiplies a bill by a number. For dog bites the largest driver is scarring and disfigurement — how permanent it is, how visible, and where it sits — followed by the psychological effect, which is pronounced in children and in attacks that were prolonged or by a large dog. It is argued from photographs, treatment records and the documented effect on the person, not calculated.',
      },
      {
        q: 'Can I get compensation for scars from a dog bite?',
        a: 'Yes, and scarring is often the most valuable part of a dog-bite claim. Permanent, visible disfigurement is compensable in its own right, separate from medical bills, and future reconstructive surgery — which is common for facial scars and for children as they grow — is part of the claim. Dated photographs of the healing process are among the most useful evidence you can keep.',
      },
      {
        q: 'Who pays my medical bills after a dog bite?',
        a: 'Initially you or your health insurer pay for treatment. The cost is then recovered from the owner\u2019s homeowner or renter liability policy as part of a settlement, which is where most California dog-bite recoveries actually come from. If a health plan, Medi-Cal or Medicare paid for your care, it usually has a right to be reimbursed from the recovery, so those claims should be identified early.',
      },
      {
        q: 'What if I was partly at fault, or provoked the dog?',
        a: 'California uses pure comparative negligence, so your recovery is reduced by your share rather than barred. Provoking the dog, ignoring clear warnings, or trespassing can reduce or, in the case of trespass, defeat a strict-liability claim, because the statute protects people who were lawfully present. These are the points an insurer raises first, so the circumstances of the bite matter.',
      },
    ],
  },
  {
    slug: DOG_BITE_LIABILITY_SLUG,
    category: 'Liability',
    cluster: 'Dog Bite Liability',
    title: 'Who Is Liable for a Dog Bite in California?',
    eyebrow: 'Dog bite liability',
    description:
      'California makes a dog owner strictly liable for a bite under Civil Code section 3342 — there is no "one free bite." What usually decides the case is not whether the owner is responsible but which insurance policy pays, and whether the breed was excluded.',
    psychology: 'I want to know who is responsible and whether I actually have a claim.',
    cta: 'Check If You Have a Claim',
    exampleQueries: [
      'who is responsible for a dog bite in California',
      'does California have a one bite rule for dogs',
      'does homeowners insurance cover dog bites in California',
      'can I sue a dog owner in California',
      'who pays for a dog bite injury in California',
    ],
    signals: [
      'Public place or lawful presence',
      'Owner identity',
      'Homeowner or renter policy',
      'Breed exclusion',
      'Landlord knowledge',
      'Provocation or trespass',
    ],
    sections: {
      whyItMatters:
        'California is a strict-liability state for dog bites. Under Civil Code section 3342 the owner is liable when a person is bitten in a public place, or while lawfully on private property including the owner\u2019s own, regardless of whether the dog had ever bitten before and regardless of whether the owner knew it might. That is the opposite of the "one-bite rule" people assume applies, where a victim has to prove the owner knew the dog was dangerous. For a bite, California does not require that proof — the statute supplies liability directly, so the usual fight over the dog\u2019s history simply does not happen. Two limits define the edges. The statute covers bites, so an injury that is not a bite — being knocked down by a large dog, for example — falls back on ordinary negligence and can require showing the owner failed to control an animal they should have. And it protects people who were lawfully present, so a trespasser generally cannot use it, and someone who provoked the dog faces a comparative-fault reduction. Beyond who is legally responsible, the question that decides most claims in practice is who actually pays. Dog-bite damages are typically paid by the owner\u2019s homeowner or renter liability insurance rather than out of the owner\u2019s pocket, and that coverage is the difference between a claim that is worth pursuing and one that is not. Some policies exclude specific breeds or exclude dog bites entirely, which changes the analysis and sometimes shifts attention to another source — a landlord who knew of a dangerous dog and did nothing, a commercial policy if the dog was a business or guard animal, or the owner personally where assets exist. Establishing the owner\u2019s identity, whether they rent or own, and what their policy says is often the most valuable early step, because a strong strict-liability claim against an uninsured owner can still be difficult to collect.',
      whatToTrack: [
        'Where the bite happened and whether you were lawfully there',
        'The owner\u2019s name and address, and whether they own or rent the property',
        'Whether the injury was a bite or a non-bite injury like a knock-down',
        'Any witnesses to the attack and what they saw',
        'The breed of dog, which matters for policy exclusions',
        'Whether a landlord or property manager knew about the dog',
        'Anything that could be argued as provocation or trespass',
        'Animal-control or police reports, and whether the bite was reported',
      ],
      howClearCaseHelps:
        `ClearCaseIQ organises the facts that decide a dog-bite claim in California — where the bite happened, who owns the dog, and what coverage stands behind them — so the strength of the claim and its collectability are assessed together rather than one at a time. It also flags the situations where the strict-liability statute may not apply, so expectations are set on the facts rather than on a headline. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Does California have a one-bite rule?',
        a: 'Not for bites. California\u2019s Civil Code section 3342 imposes strict liability, so an owner is responsible for a bite even if the dog had never bitten anyone before and the owner had no reason to think it would. The common-law "one-bite" idea, where a victim must prove the owner knew the dog was dangerous, can still matter for non-bite injuries, but for an actual bite the statute controls.',
      },
      {
        q: 'Who is responsible for a dog bite in California?',
        a: 'The dog\u2019s owner, under the strict-liability statute, when the victim was bitten in a public place or while lawfully on private property. Others can be responsible too in particular situations — a landlord who knew of a dangerous dog, a business whose guard dog bit someone, or a person who was keeping the dog. Identifying the right responsible party is partly about who is liable and partly about who is insured.',
      },
      {
        q: 'Does homeowners insurance cover dog bites in California?',
        a: 'Usually yes — a homeowner or renter liability policy is the most common source of payment for a California dog-bite claim, and it is why these claims are collectible even when the owner could not pay personally. But some policies exclude certain breeds or exclude dog bites altogether, so the policy language matters, and where coverage is excluded the claim may have to look to a landlord, a commercial policy, or the owner\u2019s own assets.',
      },
      {
        q: 'Can I sue if the dog had never bitten anyone before?',
        a: 'Yes. That is the point of strict liability — the dog\u2019s clean history is not a defense to a bite in California. An owner cannot avoid responsibility by saying the dog had always been friendly, which is the single biggest difference between California and the states that still apply a one-bite rule.',
      },
      {
        q: 'What if the dog knocked me down instead of biting me?',
        a: 'The strict-liability statute is specific to bites, so a non-bite injury is analysed under ordinary negligence, which can require showing the owner failed to reasonably control the dog. The claim is still available, but it is proved differently and is not automatic in the way a bite claim is.',
      },
    ],
  },
  {
    slug: DOG_BITE_SOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Dog Bite Filing Deadlines',
    title: 'California Dog Bite Statute of Limitations',
    eyebrow: 'Filing deadlines',
    description:
      'Two years from the date of the bite for a California dog-bite injury claim. The exceptions are what catch people out: a six-month clock when a government entity is involved, and a pause until age eighteen when the victim is a child.',
    psychology: 'I need to know how long I have to file a dog-bite claim.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'how long do I have to file a dog bite lawsuit in California',
      'how long does a dog bite claim take in California',
      'dog bite statute of limitations California',
      'is it too late to file a dog bite claim in California',
    ],
    signals: [
      'Date of the bite',
      'Victim under 18',
      'Government entity involved',
      'Delayed complications',
      'Owner identity known',
      'Insurance claim opened',
    ],
    sections: {
      whyItMatters:
        'A California dog-bite injury claim runs on the standard personal-injury deadline: two years from the date of the bite. That is the period for filing a lawsuit in court, and the most common misunderstanding is that dealing with the owner\u2019s insurer extends it — it does not. An open claim file, an active negotiation, and a pending offer all leave the two-year clock running, and the adjuster is under no obligation to warn you the week it expires. Claims are lost this way while both sides are still talking. Three exceptions matter more than the rest. First, where a government entity is involved — a bite by a police dog, or on government property where a public employee was responsible for the animal — a written claim generally has to be presented to that entity within six months, long before the two years is anywhere near expiring, and missing it can end the claim regardless of the longer period. Second, where the victim was under eighteen at the time, the period is generally paused until they turn eighteen, which matters because so many serious dog-bite victims are children; a parent who assumes the clock ran out during childhood may find the claim is still alive, though acting sooner is always better because evidence and witnesses fade. Third, the "how long does a claim take" question is different from the deadline: filing within two years starts the case, but a dog-bite claim itself often cannot be valued until scarring has matured and any reconstructive surgery is planned or complete, so the treatment timeline, not the filing deadline, usually governs when a claim resolves. Two practical points follow. The date of the bite is what everything is measured from, so record it exactly. And the sooner the owner is identified and their insurance located, the more of the two years is available for building the claim rather than chasing basic facts — an owner who moves, or a rental where the tenant has left, can make identification the slow part.',
      whatToTrack: [
        'The exact date of the bite, which is what the deadline is measured from',
        'The victim\u2019s age at the time, since a child\u2019s claim is generally paused until eighteen',
        'Whether any government entity, public employee, or police dog was involved',
        'The owner\u2019s identity and current address, which can be the slow part to establish',
        'Whether an insurance claim has been opened, and with which carrier',
        'The treatment timeline, since scarring and surgery affect when the claim can be valued',
      ],
      howClearCaseHelps:
        'The deadline checker computes the common windows from the date of the bite and the claim type, including the separate six-month government presentation clock where a public entity may be involved. It is an educational estimate rather than a legal opinion, but it answers what date you are working towards. ClearCaseIQ also records the bite date alongside the claim facts, so the deadline stays attached to the file rather than being something you have to recalculate.',
    },
    faqs: [
      {
        q: 'How long do I have to file a dog bite lawsuit in California?',
        a: 'Generally two years from the date of the bite, the same period as any personal-injury claim. If a government entity is involved a written claim must usually be presented within six months, and if the victim is a child the period is generally paused until they turn eighteen.',
      },
      {
        q: 'Does dealing with the insurance company extend the deadline?',
        a: 'No, and this is the most common way dog-bite claims are lost. An open claim, an active negotiation, and a pending offer all leave the two-year filing period running, and the adjuster has no obligation to tell you it is about to expire.',
      },
      {
        q: 'My child was bitten years ago. Is it too late?',
        a: 'Possibly not. Where the victim was under eighteen at the time, the deadline is generally paused until they turn eighteen, giving them until twenty for an ordinary injury claim. Acting sooner is still far better because photographs, witnesses and the owner\u2019s whereabouts all fade with time.',
      },
      {
        q: 'How long does a dog bite claim take to resolve?',
        a: 'That is a different question from the filing deadline. A claim often cannot be valued honestly until scarring has matured and any reconstructive surgery is planned or done, because the scar is usually the largest part of the value. Filing within two years starts the case; the medical timeline generally governs when it settles.',
      },
      {
        q: 'What if a police dog or a dog on government property bit me?',
        a: 'A written claim generally has to be presented to the government entity within six months, which comes first by a wide margin and can end the claim if missed. These claims are more procedurally demanding and worth acting on immediately.',
      },
    ],
  },
  {
    slug: DOG_BITE_HIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Dog Bite Hiring',
    title: 'When Should You Hire a Dog Bite Lawyer in California?',
    eyebrow: 'Hiring an attorney',
    description:
      'A dog-bite lawyer in California is almost always paid on contingency — a percentage of the recovery, nothing up front, and nothing if there is no recovery. That makes the practical question not whether you can afford one, but whether the claim needs one.',
    psychology: 'I want to know whether to hire a lawyer and what it will cost.',
    cta: 'Get Matched With a Dog Bite Lawyer',
    exampleQueries: [
      'when should I hire a dog bite lawyer in California',
      'how much does a dog bite lawyer cost in California',
      'do I need a lawyer for a dog bite claim in California',
      'dog bite attorney fees California',
    ],
    signals: [
      'Scarring or disfigurement',
      'Child victim',
      'Disputed liability',
      'Insurance coverage question',
      'Low or denied offer',
      'Surgery required',
    ],
    sections: {
      whyItMatters:
        'Dog-bite lawyers in California work almost entirely on contingency, which shapes the whole decision. You pay nothing up front and no hourly fee; the lawyer is paid a percentage of what they recover, typically around a third if the case settles before a lawsuit is filed and more if it goes into litigation, with case costs coming off the top. If there is no recovery, there is generally no fee. That means the real question is not affordability but whether the claim is one where an attorney changes the outcome by more than their fee. Some dog-bite claims genuinely do not need a lawyer: a minor bite that healed cleanly with no scar, a cooperative owner with clear coverage, and a fair offer already on the table can sometimes be resolved directly. The claims where representation tends to pay for itself share a few features. Scarring or disfigurement, especially on a face or on a child, is valued in a way that is argued rather than calculated, and it is routinely undervalued in a first offer because there is no bill that captures it. A child victim raises questions — future reconstruction as they grow, and court approval of a minor\u2019s settlement — that are not obvious to a parent negotiating alone. Disputed liability, a provocation or trespass argument, or a coverage problem like a breed exclusion all shift the case from a simple demand into something that needs the strict-liability statute and the policy language pressed properly. And any time an offer has been made early, before scarring has matured, accepting it is the most common way dog-bite victims are underpaid, because the largest part of the value has not yet been established. A useful rule of thumb: if there is a permanent scar, a child involved, any dispute about who is responsible or whether there is coverage, or an offer that arrived before treatment finished, the claim is worth at least reviewing with an attorney — and because the fee is contingent, that review costs nothing but time.',
      whatToTrack: [
        'Whether there is any permanent or visible scarring',
        'Whether the victim is a child, which raises future-care and approval issues',
        'Whether the owner or insurer disputes responsibility',
        'Whether there is a coverage question, such as a breed exclusion',
        'Any offer already made, and whether treatment was finished when it arrived',
        'Whether surgery has been done or is recommended',
        'The date of the bite, so the filing deadline is not quietly running out',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps you see whether a dog-bite claim is the kind that needs an attorney before you commit to anyone — it assembles the facts that drive value and flags the ones (scarring, a child victim, a coverage dispute) that usually justify representation. When it does make sense, it matches you with California attorneys who handle dog-bite claims on contingency. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'How much does a dog bite lawyer cost in California?',
        a: 'Almost always nothing up front. Dog-bite lawyers work on contingency: a percentage of the recovery — commonly about a third before a lawsuit is filed, more in litigation — with case costs coming off the top, and no fee at all if there is no recovery. You are not paying by the hour and you are not paying to be evaluated.',
      },
      {
        q: 'Do I actually need a lawyer for a dog bite claim?',
        a: 'Not always. A minor bite that healed without a scar, a cooperative insured owner, and a fair offer can sometimes be handled directly. Representation tends to pay for itself when there is permanent scarring, a child victim, a dispute about liability or coverage, or an offer made before treatment finished — situations where the value is argued rather than obvious.',
      },
      {
        q: 'When is the best time to hire a dog bite lawyer?',
        a: 'Earlier rather than later, for two reasons: evidence and the owner\u2019s whereabouts fade, and an early insurance offer is the most common way victims are underpaid. You do not have to wait until treatment is finished to get advice, and because the consultation and the fee are contingent, getting reviewed early costs nothing.',
      },
      {
        q: 'What should I ask a dog bite lawyer before hiring them?',
        a: 'How many California dog-bite claims they have handled, how they value scarring and disfigurement, what coverage they have found behind the owner, what the contingency percentage is before and after a lawsuit, and how case costs are handled. For a child\u2019s claim, ask how they handle court approval of a minor\u2019s settlement.',
      },
      {
        q: 'Will hiring a lawyer slow down my claim?',
        a: 'Not usually, and it can prevent the worst outcome — a claim settled too early for too little, which generally cannot be reopened once signed. The pace of a dog-bite claim is mostly set by how long scarring takes to mature and whether surgery is needed, not by whether a lawyer is involved.',
      },
    ],
  },
]

export const dogBiteGuideTopicContentBySlug: Record<string, TopicContent> = {
  [DOG_BITE_VALUE_SLUG]: {
    scenario: `A child was bitten on the cheek by a neighbour\u2019s dog at a backyard gathering. The emergency bill was modest, but a plastic surgeon recommended scar revision once the child finished growing. The owner\u2019s homeowner policy was the real source of recovery, and the value turned on the permanence and visibility of the facial scar rather than the size of the initial bill. ${NOT_ADVICE}`,
    timeline: [
      ['Day of the bite', 'Emergency or urgent care, wound cleaning, and — critically — the first dated photographs.'],
      ['Weeks after', 'Wound heals or scars. Infection or a deep wound can escalate treatment and value.'],
      ['Months after', 'Scar maturity becomes clear; plastic-surgery consultation for revision, especially for a face or a child.'],
      ['Before settling', 'The claim can finally be valued once scarring has matured and future surgery is planned.'],
    ],
    severityLadder: [
      ['Minor', 'Puncture or shallow wound that heals cleanly with no lasting scar.'],
      ['Moderate', 'Wound requiring sutures, some scarring, a short course of treatment.'],
      ['Serious', 'Deep tissue damage, permanent visible scarring, or reconstructive surgery.'],
      ['Severe', 'Facial disfigurement, a child victim, nerve damage, or multiple surgeries.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Wound cleaning, sutures, antibiotics, and rabies prophylaxis where indicated.' },
      { label: 'Wound management', copy: 'Follow-up for infection and healing, which can escalate a claim that looked minor.' },
      { label: 'Scar treatment', copy: 'Laser or topical scar management as the wound matures.' },
      { label: 'Reconstruction', copy: 'Plastic-surgery revision, often staged and often years out for a growing child.' },
    ],
    settlementDrivers: [
      'The permanence and visibility of any scar',
      'The location of the scar, with facial injuries valued highest',
      'The victim\u2019s age, since a child\u2019s disfigurement is treated differently',
      'Reconstructive surgery already done or recommended',
      'The emotional effect, including fear of dogs',
      'The homeowner or renter coverage behind the owner',
    ],
    settlementValueDetails: [
      { label: 'Scarring drives it', copy: 'A visible, permanent scar is compensable in its own right and is usually the largest part of the value.' },
      { label: 'The bill is the floor', copy: 'Medical charges anchor the economic layer, but they undervalue disfigurement and trauma.' },
      { label: 'Coverage decides collectability', copy: 'Most recoveries come from the owner\u2019s liability policy, so a claim is only worth what can be reached.' },
      { label: 'Early offers undervalue', copy: 'An offer made before scarring matures is the most common way victims are underpaid.' },
    ],
    insuranceProblems: [
      'The insurer offers to cover the ER bill and treats scarring as an afterthought.',
      'A first offer arrives before the scar has matured or surgery is planned.',
      'The carrier argues the child provoked the dog to reduce the claim.',
      'A breed exclusion is raised to deny coverage entirely.',
      'The emotional impact on a child is dismissed as having no documentation.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where on the body is the injury, and is there a permanent or visible scar?' },
      { label: 'Step 2', question: 'How old is the victim, and was any surgery done or recommended?' },
      { label: 'Step 3', question: 'Do you know the owner, and whether they own or rent?' },
      { label: 'Step 4', question: 'Has an insurance offer been made, and had treatment finished?' },
    ],
  },
  [DOG_BITE_LIABILITY_SLUG]: {
    scenario: `A delivery driver was bitten on a front porch while lawfully making a drop-off. The owner insisted the dog had never bitten anyone, which in most states would start an argument about the owner\u2019s knowledge. In California it was beside the point: section 3342 made the owner strictly liable, and the case turned on the homeowner policy and a possible breed exclusion. ${NOT_ADVICE}`,
    timeline: [
      ['The bite', 'Where it happened and whether the victim was lawfully present sets the statute in motion.'],
      ['Identify the owner', 'Name, address, and whether they own or rent — this points to the policy.'],
      ['Locate coverage', 'Homeowner or renter liability policy, and whether the breed is excluded.'],
      ['Assess collectability', 'A strong claim against an uninsured owner still has to find a source of payment.'],
    ],
    severityLadder: [
      ['Clear strict liability', 'Bite in a public place or where the victim was lawfully present, insured owner.'],
      ['Non-bite injury', 'Knock-down or scratch analysed under negligence rather than the statute.'],
      ['Coverage dispute', 'Breed exclusion or a dog-bite exclusion shifts the question to another source.'],
      ['Collection problem', 'Owner uninsured; recovery depends on landlord, commercial policy, or assets.'],
    ],
    treatmentProgression: [
      { label: 'Strict liability', copy: 'Section 3342 supplies liability for a bite without proving the owner knew the dog was dangerous.' },
      { label: 'Negligence', copy: 'Non-bite injuries fall back on ordinary negligence and the owner\u2019s control of the dog.' },
      { label: 'Landlord liability', copy: 'A landlord who knew of a dangerous dog and did nothing may share responsibility.' },
      { label: 'Coverage analysis', copy: 'Whether a homeowner, renter or commercial policy responds, and any exclusion.' },
    ],
    settlementDrivers: [
      'Whether the victim was lawfully present when bitten',
      'Whether the injury was a bite or a non-bite injury',
      'The owner\u2019s identity and whether they own or rent',
      'The existence and terms of a liability policy',
      'Any breed or dog-bite exclusion in the policy',
      'Any provocation or trespass argument',
    ],
    settlementValueDetails: [
      { label: 'No one-bite defense', copy: 'The dog\u2019s clean history is not a defense to a bite in California.' },
      { label: 'Lawful presence matters', copy: 'The statute protects people who were lawfully present; a trespasser generally cannot use it.' },
      { label: 'Coverage is the case', copy: 'Who pays usually matters more than who is liable, because the owner rarely pays personally.' },
      { label: 'Exclusions redirect', copy: 'A breed exclusion can push the claim toward a landlord, a business policy, or the owner\u2019s assets.' },
    ],
    insuranceProblems: [
      'The owner claims the dog was provoked to shift blame to the victim.',
      'A breed exclusion is invoked to deny the claim entirely.',
      'The carrier argues the victim was trespassing.',
      'The dog is claimed to have "never done this before", which is irrelevant to a bite.',
      'The owner has no policy and points to no one who does.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Where did the bite happen and were you lawfully there?' },
      { label: 'Step 2', question: 'Do you know the owner\u2019s name and address?' },
      { label: 'Step 3', question: 'Do they own or rent the property?' },
      { label: 'Step 4', question: 'Was it a bite, or a different kind of injury?' },
    ],
  },
  [DOG_BITE_SOL_SLUG]: {
    scenario: `A parent assumed their child\u2019s dog-bite claim had expired because the bite was three years earlier. Because the child was under eighteen, the two-year period had not started to run against them, and the claim was still alive — though the owner had since moved, which made identifying the policy the hard part. ${NOT_ADVICE}`,
    timeline: [
      ['Date of the bite', 'Every calculation starts here. Record it exactly rather than approximately.'],
      ['Six-month mark', 'Where a government entity is involved, a written claim is generally due by now.'],
      ['Two years', 'The general filing deadline for a California dog-bite injury claim.'],
      ['Until age 18 + 2', 'For a child, the clock is generally paused until they turn eighteen.'],
    ],
    severityLadder: [
      ['Within a typical window', 'More than a year remains and no public entity is involved.'],
      ['Approaching', 'Under a year remains; evidence and the owner\u2019s whereabouts are fading.'],
      ['Urgent', 'Under ninety days, or a six-month government claim still open.'],
      ['May have passed', 'Beyond two years, unless the victim was a child or another exception applies.'],
    ],
    treatmentProgression: [
      { label: 'Two years', copy: 'The general period for a dog-bite injury claim, measured from the bite.' },
      { label: 'Six months', copy: 'Written claim to a public entity where a police dog or public employee was involved.' },
      { label: 'Paused for minors', copy: 'A child\u2019s period is generally paused until they turn eighteen.' },
      { label: 'Treatment timeline', copy: 'Separate from the deadline: scar maturity governs when the claim can be valued.' },
    ],
    settlementDrivers: [
      'The exact date of the bite',
      'The victim\u2019s age at the time',
      'Whether a government entity or police dog was involved',
      'How quickly the owner and their insurer are identified',
      'Whether the scar has matured enough to value the claim',
      'Whether an insurance claim has already been opened',
    ],
    settlementValueDetails: [
      { label: 'Negotiation does not pause it', copy: 'An open claim file has no effect on the two-year filing period.' },
      { label: 'Children get more time', copy: 'A minor\u2019s clock is generally paused until eighteen, but evidence still fades.' },
      { label: 'The government clock comes first', copy: 'Six months arrives long before two years where a public entity is involved.' },
      { label: 'Deadline is not resolution', copy: 'Filing starts the case; scar maturity usually governs when it settles.' },
    ],
    insuranceProblems: [
      'Negotiation continues amicably while the two-year period runs out.',
      'A police-dog or public-property angle is missed until six months have passed.',
      'A parent assumes a child\u2019s claim expired when it was actually paused.',
      'The owner moves and identifying the policy consumes the remaining time.',
      'A pending offer is assumed to preserve the claim.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What is the exact date of the bite?' },
      { label: 'Step 2', question: 'How old was the victim at the time?' },
      { label: 'Step 3', question: 'Could a government entity or police dog be involved?' },
      { label: 'Step 4', question: 'Have you identified the owner and their insurer?' },
    ],
  },
  [DOG_BITE_HIRE_SLUG]: {
    scenario: `A victim with a healed forearm puncture and a fair offer from a cooperative insured owner did not need a lawyer. A second victim, whose child had a facial scar and an offer made before any surgery was planned, did — the untouched value was the scar, and it was not in the first offer. ${NOT_ADVICE}`,
    timeline: [
      ['Right after the bite', 'Get treatment and photographs; note the owner and any witnesses.'],
      ['First insurer contact', 'An early offer, before scarring matures, is the moment to be cautious.'],
      ['Deciding on counsel', 'Scarring, a child victim, or a coverage dispute are the signals to get reviewed.'],
      ['Before accepting', 'Value cannot be judged until the scar matures and surgery is planned.'],
    ],
    severityLadder: [
      ['Handle it yourself', 'Minor bite, clean healing, cooperative insured owner, fair offer.'],
      ['Worth a review', 'Any scarring, a child victim, or an early offer.'],
      ['Get representation', 'Disputed liability, a coverage problem, or a lowball offer.'],
      ['Move quickly', 'A government entity, a severe injury, or a deadline approaching.'],
    ],
    treatmentProgression: [
      { label: 'Contingency fee', copy: 'Nothing up front; a percentage of the recovery, and no fee if there is no recovery.' },
      { label: 'Free evaluation', copy: 'Because the fee is contingent, an early review costs only time.' },
      { label: 'Minor\u2019s settlement', copy: 'A child\u2019s claim needs court approval, which an attorney handles.' },
      { label: 'Litigation', copy: 'If a fair settlement is not offered, the percentage rises and costs come off the top.' },
    ],
    settlementDrivers: [
      'Whether there is permanent or visible scarring',
      'Whether the victim is a child',
      'Whether liability or coverage is disputed',
      'Whether an early offer has been made',
      'Whether surgery is done or recommended',
      'How close the filing deadline is',
    ],
    settlementValueDetails: [
      { label: 'No cost to be evaluated', copy: 'A contingency lawyer is paid from the recovery, so a review is effectively free.' },
      { label: 'Scarring is undervalued alone', copy: 'The part victims most often leave on the table is exactly what a lawyer argues.' },
      { label: 'Children need approval', copy: 'A minor\u2019s settlement requires court approval, which is not obvious to a parent alone.' },
      { label: 'Early offers are a signal', copy: 'An offer before treatment finishes usually means the value has not been established.' },
    ],
    insuranceProblems: [
      'A quick offer is framed as generous before scarring has matured.',
      'The victim is told a lawyer will "just take a cut" of an offer already too low.',
      'A parent negotiates a child\u2019s claim without knowing court approval is required.',
      'A coverage or provocation dispute is used to pressure a fast, low settlement.',
      'The filing deadline is allowed to approach while negotiation drags.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is there any permanent or visible scarring?' },
      { label: 'Step 2', question: 'Is the victim a child?' },
      { label: 'Step 3', question: 'Is anyone disputing responsibility or coverage?' },
      { label: 'Step 4', question: 'Has an offer been made, and had treatment finished?' },
    ],
  },
}
