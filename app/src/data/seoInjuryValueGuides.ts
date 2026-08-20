import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The authored injury-value guides.
 *
 * Replaces fourteen generated pages: eight `/how-much-is-a-*-case-worth` and six
 * `/average-*-settlement-california`. Both families came from a single seed each,
 * so every page in a family shared its body text and differed only in the title
 * and one clause of the description. They measured 0.811 and 0.773 median
 * pairwise similarity — near copies of their own siblings — while averaging
 * around 520 words. This is the cluster Search Console shows the most demand for
 * (166 of 292 impressions over three months) and it produced no clicks, with no
 * query better than position 21.
 *
 * The eight subjects survive at their `/how-much-is-a-*-case-worth` URLs, which
 * match how the question is actually typed. The six `/average-*` pages redirect
 * into the matching subject, because "average settlement for X" and "how much is
 * an X case worth" are the same question asked twice, and answering it on two
 * thin pages split whatever authority either had. Each guide now covers the
 * benchmark framing directly, which is what the average pages were reaching for.
 *
 * No page states an average or a typical payout. Those numbers cannot be
 * responsibly produced from public data — the figures circulating online come
 * from parties with an interest in them looking large — and this codebase has
 * removed fabricated values before. Explaining what moves a number is honest and
 * is also the thing a reader cannot get from a competitor's average.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. No page can tell you what a specific claim is worth, because value turns on documents, coverage and facts particular to you, which a licensed California attorney can review.'

export const injuryValueGuidePages: LandingPage[] = [
  {
    slug: '/how-much-is-my-case-worth',
    category: 'Settlement',
    cluster: 'Claim Value',
    title: 'How Much Is My Injury Case Worth?',
    eyebrow: 'Case value guide',
    description:
      'A claim is worth the losses you can document, adjusted by fault, and capped by the insurance that exists to pay it. That last part decides more cases than the first two, and almost nobody is told about it early.',
    psychology: 'I want to know what my claim is realistically worth before I decide anything.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is my injury case worth',
      'how much is my claim worth',
      'what is my personal injury case worth',
      'how do you calculate a settlement amount',
    ],
    signals: [
      'Documented medical costs',
      'Wage loss',
      'Injury permanence',
      'Liability strength',
      'Comparative fault',
      'Available policy limits',
    ],
    sections: {
      whyItMatters:
        'Claim value has three layers, and people usually only hear about the first. The first is economic loss — medical charges, lost earnings, out-of-pocket costs, and any care you will still need. These are countable, and they are the floor. The second is non-economic loss, the pain, limitation and disruption the injury caused, which has no receipt and is argued rather than calculated. You will read that this second layer is the first multiplied by some number between one and five. That formula is not law and no California court applies it; it survives because it is easy to write about. Adjusters do use software that behaves in loosely similar ways, but what actually moves the figure is whether the record shows objective findings, continuous treatment, and a specific effect on your life, not what your bills multiply to. The third layer is the one that decides cases: collectability. A claim is worth nothing beyond the money that can actually be reached. For policies issued or renewed on or after January 1, 2025, California requires only $30,000 in bodily injury coverage per person and $60,000 per accident, raised from $15,000 and $30,000 where they had sat since the 1970s. Plenty of drivers carry exactly the minimum. If your documented losses run past what the at-fault driver carries, the question stops being what the case is worth and becomes where else money can come from: your own uninsured or underinsured motorist coverage, a commercial policy if the vehicle was being used for work, an employer, or a second at-fault party. Finding that out early changes what you do next; finding it out at the end changes nothing.',
      whatToTrack: [
        'Total billed medical charges, not the discounted amount your health insurer paid',
        'Every provider seen, with the date of the first visit after the injury',
        'Care still recommended and not yet completed, including surgery under discussion',
        'Missed work in days and in dollars, confirmed by your employer',
        'Any duty you can no longer perform, at work or at home, described concretely',
        'Out-of-pocket costs: prescriptions, devices, mileage to appointments, paid help',
        'The at-fault policy limits, and your own UM/UIM coverage',
        'Any medical lien or health-plan reimbursement claim against the recovery',
      ],
      howClearCaseHelps:
        `ClearCaseIQ builds the range from your documented facts rather than from an average, and shows which input is holding the number where it is — a case limited by missing records is a solvable problem, one limited by policy limits is not. It also separates gross recovery from what you would actually keep, since liens and health-plan reimbursement can take a meaningful share of a settlement that looked adequate on paper. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is the pain and suffering multiplier real?',
        a: 'It is a rule of thumb from settlement guides, not a legal formula, and no California court instructs a jury to multiply anything. It persists because it is simple. Insurers do use valuation software that produces something loosely similar, but the inputs that move it are diagnosis codes, treatment duration, objective findings and documented limitation, which is why two claims with identical bills can be valued very differently.',
      },
      {
        q: 'Does a bigger medical bill mean a bigger settlement?',
        a: 'Only partly, and the relationship is weaker than people expect. Charges from a provider treating on a lien are often discounted heavily in negotiation, and treatment an adjuster reads as excessive for the diagnosis can reduce credibility rather than add value. What tends to matter more is whether the treatment was consistent, medically ordinary for the injury, and connected to the incident without an unexplained gap.',
      },
      {
        q: 'What if I was partly at fault?',
        a: 'California uses pure comparative negligence, so your recovery is reduced by your share rather than barred. If your losses are valued at $100,000 and you are found 20 percent responsible, you recover $80,000. That rule is more forgiving than in states that cut off recovery at 50 percent, and it explains why adjusters raise comparative fault early and often, usually before any evidence supports it.',
      },
      {
        q: 'Why will nobody give me a number?',
        a: 'Because an honest number needs facts that do not exist yet. Until treatment is finished or has clearly plateaued, nobody knows whether this is a claim that resolves in months or one with permanent restrictions. An early number is either a guess or a negotiating position, and settling before the medical picture is complete is the most common way people are underpaid.',
      },
      {
        q: 'How much of a settlement do I actually keep?',
        a: 'Less than the headline figure. A contingency fee is typically a third if the case resolves before litigation, case costs come off the top, and any health insurer, Medi-Cal, Medicare or lien-holding provider that paid for your treatment usually has a right to be reimbursed. Those reimbursement claims can often be negotiated down, but they need to be identified early rather than discovered at signing.',
      },
      {
        q: 'Does it matter where in California the claim is filed?',
        a: 'Venue affects the value of the same facts, because jury pools differ and both sides price a case against what a local jury has historically done. It is one of several reasons a settlement range built from national averages tends not to survive contact with a specific claim.',
      },
    ],
  },
  {
    slug: '/how-much-is-a-car-accident-case-worth',
    category: 'Settlement',
    cluster: 'Claim Value',
    title: 'How Much Is a Car Accident Case Worth?',
    eyebrow: 'Case value guide',
    description:
      'Car accident claims are valued against two things the crash itself produced: what the collision did to your body, and what insurance exists behind the driver who caused it. Vehicle damage influences both less than people assume, and adjusters more than it should.',
    psychology: 'I want to know what a car accident claim like mine is realistically worth.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a car accident case worth',
      'average car accident settlement california',
      'car accident settlement amount',
      'what is my car accident claim worth',
    ],
    signals: [
      'Injury severity and permanence',
      'Treatment continuity',
      'Fault evidence',
      'Vehicle damage photographs',
      'Policy limits and UM/UIM',
      'Wage loss',
    ],
    sections: {
      whyItMatters:
        'Two features make car accident claims behave differently from other injury claims. The first is that the property damage is photographed, quantified and in the file before anyone examines your spine — so the collision arrives with a number attached that has nothing to do with your injury. Insurers lean on that number heavily. A repair estimate under a few thousand dollars routes many claims into a low-impact track, where the working assumption is that a minor collision cannot produce a real injury. Biomechanical research does not support that assumption cleanly, and occupant position, headrest height, awareness of the impact and prior condition all matter more than bumper damage. But the burden lands on you: with modest vehicle damage, the medical record has to do the work the photographs will not. The second feature is that the money almost always comes from an auto policy with a defined ceiling. California minimums rose on January 1, 2025 to $30,000 per person and $60,000 per accident, up from $15,000 and $30,000, and a great many drivers carry precisely that. A claim with $80,000 in documented losses against a minimum-limits driver is not an $80,000 claim unless another source exists. That is what uninsured and underinsured motorist coverage on your own policy is for, and it is the single most valuable thing to check in the first week — including whether the crash involved a vehicle being driven for work or for a delivery or rideshare platform, which can bring a far larger commercial layer into play.',
      whatToTrack: [
        'Photographs of both vehicles, including interior, airbags and headrest position',
        'The repair estimate or total-loss valuation, and whether the frame was affected',
        'The traffic collision report number, and any citation issued',
        'Where you were seated, whether you saw the impact coming, and whether you were turned',
        'The date of first medical care, and the reason for any delay',
        'Every diagnosis, referral and imaging result in sequence',
        'Missed work in days and dollars, confirmed by your employer',
        'The at-fault limits, your UM/UIM coverage, and any commercial or employer policy',
      ],
      howClearCaseHelps:
        `ClearCaseIQ scores the claim on liability, medical documentation and coverage separately, so a low-impact argument shows up as what it is — a documentation problem to answer with records — rather than as a verdict on the claim. It also prompts for the coverage questions that decide the ceiling, including UM/UIM and commercial policies, at the point where finding the answer still changes the outcome. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My car was barely damaged. Does that ruin the claim?',
        a: 'It makes it harder without making it hopeless. Insurers apply low-impact reasoning based on repair cost, so with modest damage the medical record carries the argument: prompt care, a consistent history given to each provider, objective findings where they exist, and treatment that follows the diagnosis. Photographs of the interior, the headrest position, and the seating configuration are worth more here than the bumper photo everyone takes.',
      },
      {
        q: 'What if the other driver had no insurance, or fled?',
        a: 'Then the claim usually runs through your own uninsured motorist coverage, which is why it matters whether you carry it. In a hit-and-run, UM coverage generally depends on having reported the collision to police promptly, so the report is not a formality. If you declined UM coverage in writing, that decision often becomes the limiting factor on an otherwise strong claim.',
      },
      {
        q: 'Does the police report decide who pays?',
        a: 'No. The report is evidence an adjuster weighs, not a finding that binds anyone, and officers reconstruct after the fact from statements and physical evidence. Reports contain errors, and a report assigning you fault can be argued against with photographs, witness accounts, and vehicle damage patterns. It is influential, particularly early, which is why an error in one is worth addressing rather than living with.',
      },
      {
        q: 'How long does a car accident claim take to settle?',
        a: 'The realistic floor is however long your treatment takes, because settling before the medical picture is complete forecloses everything discovered afterwards. Straightforward claims with clear fault and finished treatment often resolve within a few months of that point; disputed fault, serious injury, or a limits dispute extends it. California generally allows two years from the injury to file suit, and a claim against a public entity requires a written claim within six months.',
      },
      {
        q: 'Should I accept the first offer?',
        a: 'A first offer that arrives before treatment is complete is priced against an incomplete file, and it comes with a release that ends the claim permanently. That is not automatically a reason to refuse it — for a genuinely minor injury that has resolved, an early resolution can be sensible — but it should be measured against total billed charges, wage loss, and any care still recommended, rather than against how the number feels.',
      },
      {
        q: 'Is a settlement for a car accident taxable?',
        a: 'Compensation for physical injury is generally not treated as taxable income federally or by California, but portions allocated to punitive damages or to interest usually are, and any part attributable to lost wages can raise questions. Allocation in the settlement documents matters, which is worth raising before signing rather than after.',
      },
    ],
  },
  {
    slug: '/how-much-is-a-whiplash-case-worth',
    category: 'Settlement',
    cluster: 'Claim Value',
    title: 'How Much Is a Whiplash Case Worth?',
    eyebrow: 'Case value guide',
    description:
      'Whiplash is the injury insurers are most practised at discounting. Imaging usually looks normal, symptoms are reported rather than measured, and the collision that caused it is often minor — so value tracks documentation quality more closely than for almost any other injury.',
    psychology: 'I have neck pain after a crash and I am being told it is not worth much.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a whiplash case worth',
      'average whiplash settlement california',
      'whiplash settlement amount',
      'neck injury settlement after car accident',
    ],
    signals: [
      'Symptom duration',
      'Treatment continuity',
      'Headaches or radiating symptoms',
      'Objective examination findings',
      'Vehicle damage severity',
      'Documented work limitation',
    ],
    sections: {
      whyItMatters:
        'Whiplash sits at the intersection of three things insurers use to discount a claim, which is why the same injury can be handled respectfully in one file and dismissed in another. It is usually invisible on imaging: X-rays and MRIs of an uncomplicated soft-tissue neck injury typically come back normal, and a normal scan is routinely presented as evidence that nothing happened, when it only shows nothing is fractured or herniated. It is subjective: pain, stiffness, headache and reduced rotation are reported by you rather than measured by a machine, so credibility carries weight it does not carry in a fracture case. And it frequently follows a low-speed collision, which brings the low-impact argument. The claims that hold their value share a pattern. Care began within days rather than weeks, and any delay has an ordinary explanation — symptoms often do not peak for a day or two, which is worth stating to the first provider rather than leaving for an adjuster to interpret. The history given to each provider is consistent. There are findings someone else recorded: measured range-of-motion limits, muscle spasm noted on examination, a neurological finding. Treatment followed the diagnosis and then stopped when it stopped helping, rather than continuing indefinitely at the same frequency, which reads as generated rather than needed. Where whiplash stops being a modest claim is when symptoms persist past a few months, when headaches or radiating arm symptoms suggest something beyond muscle and ligament, or when the neck limits work or sleep in a way a supervisor or family member can describe. Persistent cases sometimes turn out not to be simple whiplash at all — a disc injury or facet joint involvement can present the same way at first and only separate later on imaging or a specialist examination.',
      whatToTrack: [
        'When symptoms first appeared, including any delay of a day or two, and what you told the first provider',
        'Every provider seen with dates, so the treatment timeline reads continuously',
        'Recorded range-of-motion measurements and any spasm noted on examination',
        'Headaches, dizziness, arm numbness or tingling, described specifically rather than as "pain"',
        'Sleep disruption, and any position you can no longer tolerate',
        'Tasks at work or home you stopped doing, and who noticed',
        'Photographs of the vehicle interior and your headrest position at the time',
        'Any prior neck injury or treatment, so it is disclosed rather than discovered',
      ],
      howClearCaseHelps:
        `ClearCaseIQ tests a soft-tissue claim against exactly the checks an adjuster runs — gap in care, treatment pattern, consistency of history, presence of objective findings — and shows which of them the file currently fails. For an injury where value depends on the record rather than on a scan, knowing that before an adjuster tells you is most of the advantage available. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My MRI was normal. Is my whiplash claim worthless?',
        a: 'No. Uncomplicated whiplash is a soft-tissue injury to muscle and ligament, and those structures are not what a standard scan is looking for — a normal MRI rules out a fracture or disc herniation rather than ruling out injury. What replaces imaging is a clinical record: measured range-of-motion loss, spasm noted on examination, a consistent symptom history, and treatment that matched the diagnosis.',
      },
      {
        q: 'I waited two weeks to see a doctor. How much does that hurt?',
        a: 'It is the most common damaging fact in these claims, because a gap invites the argument that something else caused the pain. It is not fatal, and delayed onset is genuinely typical of whiplash — adrenaline masks symptoms and stiffness often peaks a day or two later. What matters is whether the delay has an ordinary explanation on the record: you waited to see if it settled, you could not get an appointment, you had no coverage. An explanation given early reads very differently from one offered after the adjuster raises it.',
      },
      {
        q: 'Does chiropractic care hurt the value of my claim?',
        a: 'Chiropractic treatment is legitimate care for this injury and adjusters see it constantly, but the pattern draws scrutiny: extended high-frequency treatment on a lien, with no reassessment and no change in plan, is discounted more aggressively than the same number of visits under a physician-directed plan with documented progress. Care that responds to how you are actually doing tends to survive review; care that looks scheduled in advance does not.',
      },
      {
        q: 'How long do whiplash symptoms have to last to matter?',
        a: 'Most cases improve substantially within six to twelve weeks, and claims resolving in that window are valued as short-duration injuries. Symptoms persisting past roughly three months change the conversation, because they raise the possibility of a facet joint injury, an undiagnosed disc problem, or a chronic pain pattern — and because duration is one of the few things about a soft-tissue injury that is not disputable once documented.',
      },
      {
        q: 'The other driver barely dented my car. Does that end it?',
        a: 'It is the argument you should expect, not a rule. Low property damage is used to imply low force, but the relationship between repair cost and occupant injury is weak: bumpers are designed to absorb impact without visible deformation, and whether you were turned, braced, or had the headrest set low matters more. Answering it takes medical documentation and interior photographs rather than argument.',
      },
      {
        q: 'Should I use the settlement calculator or read this?',
        a: 'Both, in that order. The calculator asks for the facts that actually drive a soft-tissue range — duration, treatment, findings, work impact — and produces a range from them. This page explains why those particular facts are the ones being asked for, which is what tells you whether your file is strong or has a hole in it.',
      },
    ],
  },
  {
    slug: '/how-much-is-a-herniated-disc-case-worth',
    category: 'Settlement',
    cluster: 'Claim Value',
    title: 'How Much Is a Herniated Disc Case Worth?',
    eyebrow: 'Case value guide',
    description:
      'A herniated disc gives you something whiplash does not: a finding on a scan. It also gives the insurer its best argument, because discs degenerate with age and an MRI cannot date when yours changed.',
    psychology: 'My MRI shows a disc injury and I need to know what that means for my claim.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a herniated disc case worth',
      'average herniated disc settlement california',
      'herniated disc car accident settlement',
      'disc injury settlement value',
    ],
    signals: [
      'MRI findings and their wording',
      'Radiculopathy',
      'Epidural injections',
      'Surgical recommendation',
      'Pre-existing degeneration',
      'Permanent work restrictions',
    ],
    sections: {
      whyItMatters:
        'A disc claim is fought over causation rather than injury. The scan is objective, and that raises the ceiling immediately — an adjuster who would discount reported neck pain treats an MRI-confirmed herniation with nerve involvement as a different category of claim. But the same imaging creates the defence. Disc degeneration is close to universal with age and frequently silent: substantial numbers of people with no back pain at all have disc bulges or protrusions visible on MRI. A radiologist reading your scan cannot say when the change occurred, so the insurer argues the finding predates the crash and the collision aggravated something already there. The words in the report matter more than people expect, because they are read as a hierarchy. A bulge is generally treated as the most degenerative-looking finding; a protrusion or extrusion is more focal; an annular tear or an extrusion pressing on a nerve root is the hardest to attribute to ordinary ageing. What overcomes the causation argument is rarely the scan alone. It is the sequence: no symptoms before, symptoms immediately or nearly immediately after, and a clinical picture that matches the level of the disc — pain radiating along the path that nerve root actually serves, with corresponding weakness, numbness or reflex changes on examination. A finding at L5-S1 with pain running down the back of the leg to the foot is coherent; the same finding with pain that does not follow the nerve is not, and adjusters and defence physicians look for exactly that. Escalation drives the rest of the value. Failed conservative care leading to epidural injections is a meaningful step; a surgical recommendation, even if you decline it, changes the range substantially, because future medical cost enters the calculation and permanence becomes credible. Under California law you are entitled to compensation for aggravation of a pre-existing condition, which is often the accurate description of what happened and a stronger position than pretending the disc was pristine.',
      whatToTrack: [
        'The exact wording of the radiology report, including the level and whether it says bulge, protrusion, extrusion or annular tear',
        'Whether the report describes nerve root contact, impingement or stenosis',
        'The path of radiating pain, numbness or weakness, and which fingers or toes are involved',
        'Examination findings: reflex changes, measured weakness, positive straight-leg raise',
        'Any prior back or neck imaging, treatment, or complaint — disclosed rather than discovered',
        'Conservative care attempted, for how long, and whether it helped',
        'Injections: type, level, date, and the degree and duration of relief',
        'Any surgical recommendation, including one you decided against, and the estimated cost',
        'Lifting, sitting or standing restrictions in writing, and what they stopped you doing',
      ],
      howClearCaseHelps:
        `ClearCaseIQ reads the disc claim the way the other side will: whether the symptom pattern matches the level identified on imaging, whether the pre-injury record supports or undermines an aggravation argument, and whether conservative care was documented thoroughly enough to justify what came after. Those are the three places these claims are won or lost, and all three are visible before anyone makes an offer. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'The insurer says my disc problem is degenerative. Can they do that?',
        a: 'They can argue it, and they usually will, because age-related disc change is common and often symptomless. What answers it is not the scan but the timeline: an absence of symptoms and treatment before the crash, symptoms beginning immediately after, and a clinical picture consistent with the disc level identified. California also compensates the aggravation of a pre-existing condition, so even a genuinely degenerated spine made symptomatic by a collision supports a claim.',
      },
      {
        q: 'Is a bulge worth less than a herniation?',
        a: 'In practice, usually yes, though the terms are used inconsistently between radiologists. A bulge involving the whole disc circumference reads as degenerative to most adjusters; a focal protrusion or extrusion, particularly one described as contacting or displacing a nerve root, is harder to attribute to ageing alone. An annular tear tends to be treated as more consistent with trauma. The clinical correlation still matters more than the noun.',
      },
      {
        q: 'Do I have to have surgery for the claim to be worth something?',
        a: 'No, and declining recommended surgery does not forfeit its value. A documented surgical recommendation establishes severity and future cost whether or not you proceed, and many people reasonably choose to avoid a spinal operation. What does reduce value is an undocumented decision — no recommendation in the record, or a recommendation with no explanation of why it was not followed.',
      },
      {
        q: 'How much do epidural injections change the value?',
        a: 'They matter as evidence more than as expense. An injection shows conservative care failed, that a physician considered the finding significant enough to treat invasively, and often helps localise the problem — if a targeted injection relieves symptoms, that supports the level being the source. Relief that is complete and lasting can cut both ways, since it also suggests the problem is manageable.',
      },
      {
        q: 'I had back pain years ago. Does that destroy my claim?',
        a: 'It weakens it if the insurer finds it first, and much less if you disclose it. Prior treatment is discoverable through medical and pharmacy records, and being contradicted by your own history damages credibility across the whole claim. Disclosed, it becomes an aggravation case, which is a recognised and compensable category rather than a defence.',
      },
      {
        q: 'Does a herniated disc mean permanent restrictions?',
        a: 'Not necessarily. Many disc injuries improve with conservative care and leave no formal restriction. Permanence enters the valuation when a physician puts limits in writing — lifting, sitting or standing tolerance — or when the record shows persistent radiculopathy after treatment has run its course. Those written restrictions, and their effect on your actual occupation, matter more than the diagnosis label.',
      },
    ],
  },
  {
    slug: '/how-much-is-a-tbi-case-worth',
    category: 'Settlement',
    cluster: 'Claim Value',
    title: 'How Much Is a TBI Case Worth?',
    eyebrow: 'Case value guide',
    description:
      'A mild traumatic brain injury is the hardest serious injury to prove and the easiest to underestimate. Scans are usually normal, you were probably never unconscious, and the people best placed to describe what changed are not doctors.',
    psychology: 'I have not been the same since the head injury and nobody can see it.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a tbi case worth',
      'average tbi settlement california',
      'concussion settlement value',
      'traumatic brain injury claim worth',
    ],
    signals: [
      'Cognitive and mood symptoms',
      'Neuropsychological testing',
      'Symptom duration',
      'Documented work impact',
      'Witness accounts of change',
      'Available policy limits',
    ],
    sections: {
      whyItMatters:
        'Brain injury claims split sharply in two, and the split is not about how much the injury affects your life. A severe TBI with abnormal imaging, a hospital admission and visible deficit is valued as a catastrophic injury, and the practical question becomes whether enough insurance exists to pay for it. A mild TBI — the category most claims fall into — is contested at every step, because almost everything that would prove it is absent. There is usually no abnormality on CT or MRI, since those scans are designed to find bleeding and structural damage rather than diffuse axonal injury. Loss of consciousness is not required for the diagnosis and most often did not occur, which insurers present as though it settles the question. The symptoms — headache, difficulty concentrating, word-finding problems, light and noise sensitivity, irritability, sleep disruption, fatigue — are all reported by you, and several of them are equally consistent with pain, poor sleep, or the stress of a claim, which is exactly the alternative explanation you should expect. What carries a mild TBI claim is a different kind of evidence. Formal neuropsychological testing produces scored, comparative results rather than complaints, and is the closest thing to an objective finding available. Documentation from the first hours helps: a note recording confusion, disorientation, amnesia around the event, or a witness saying you seemed dazed is worth more than a later account. And the most persuasive material usually comes from outside medicine entirely — a supervisor describing work you can no longer do at the pace you did it, a family member describing changes in temper or memory, a performance review that shifted after a date. Duration matters greatly: most concussions resolve within weeks, so symptoms persisting past three months move the claim into post-concussion territory, where permanence becomes credible and the valuation changes character.',
      whatToTrack: [
        'Anything recorded in the first hours: confusion, repeated questions, amnesia for the event, or a witness saying you seemed dazed',
        'Whether loss of consciousness occurred, and for how long, without overstating it',
        'Every cognitive symptom described specifically — which words, which tasks, what time of day',
        'Mood and personality changes, including who noticed them first',
        'Light or noise sensitivity, headaches, and sleep disruption',
        'Neuropsychological testing results, and any baseline available such as prior test scores or academic records',
        'Concrete work impact: tasks dropped, hours reduced, errors made, performance reviews before and after',
        'Statements from people who knew you before, describing specific changes rather than general concern',
        'Any prior concussion, ADHD, learning difficulty, depression or anxiety, disclosed rather than discovered',
      ],
      howClearCaseHelps:
        `ClearCaseIQ prompts for the evidence a mild TBI claim actually turns on — early records, symptom specificity, testing, and third-party observation — rather than treating a normal scan as the end of the inquiry. It also flags the gap most of these claims share: the injury is described in medical notes but never in terms of what changed at work or at home, which is the part that makes it real to anyone evaluating the file. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'My CT scan was normal. Can I still have a brain injury?',
        a: 'Yes, and normal imaging is the usual finding in mild TBI. CT looks for bleeding, swelling and skull fracture; MRI adds structural detail. Neither is designed to detect the diffuse microscopic injury that produces concussion symptoms. A normal scan means nothing life-threatening was found, which is important medically and largely irrelevant to whether a concussion occurred.',
      },
      {
        q: 'I never lost consciousness. Does that mean it was not a TBI?',
        a: 'No. Loss of consciousness is not required for a concussion diagnosis, and most concussions occur without it. What matters clinically is an alteration of mental state — feeling dazed, confused or disoriented, or being unable to remember the moments around the impact. Insurers lean on the absence of unconsciousness because it sounds decisive, not because it is.',
      },
      {
        q: 'What is neuropsychological testing and do I need it?',
        a: 'It is a structured battery measuring memory, attention, processing speed, language and executive function, scored against population norms and interpreted for internal consistency. For a persistent mild TBI claim it is often the single most valuable piece of evidence, because it converts symptoms you report into results someone else measured. It also detects exaggeration, which is part of why the results carry weight when they support you.',
      },
      {
        q: 'How long do symptoms have to last for the claim to be serious?',
        a: 'Most concussions improve substantially within days to weeks. Symptoms continuing past about three months are generally treated as post-concussion syndrome, and that duration is what supports a claim for lasting effects rather than a temporary injury. Consistent documentation across that period matters more than any single dramatic report.',
      },
      {
        q: 'I had anxiety and a previous concussion. Does that end the claim?',
        a: 'It complicates it, and hiding it is worse than having it. Prior history is discoverable and gives a defence expert an alternative explanation for current symptoms. Disclosed, the claim becomes about the change from your actual baseline, and a documented prior concussion can support rather than undermine it, since repeat injury carries recognised additional risk.',
      },
      {
        q: 'Why do witness statements matter so much here?',
        a: 'Because cognitive change is difficult to observe from inside it, and medical notes record what you reported rather than what you can do. A supervisor describing tasks that now take twice as long, or a partner describing a temper that was not there before, provides the corroboration that imaging cannot. These accounts are most persuasive when specific and dated, and they get harder to obtain as time passes.',
      },
    ],
  },
  {
    slug: '/how-much-is-a-back-surgery-case-worth',
    category: 'Settlement',
    cluster: 'Claim Value',
    title: 'How Much Is a Back Surgery Case Worth?',
    eyebrow: 'Case value guide',
    description:
      'Once spinal surgery enters a claim, the valuation shifts from what treatment cost to what the rest of your life costs. Future care and permanent restriction usually matter more than the surgical bill, and policy limits become the binding constraint far sooner.',
    psychology: 'I need spinal surgery and I need to know what that means for my claim.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a back surgery case worth',
      'average back surgery settlement california',
      'spinal fusion settlement value',
      'settlement for back surgery after car accident',
    ],
    signals: [
      'Procedure type',
      'Failed conservative care',
      'Future medical needs',
      'Permanent restrictions',
      'Loss of earning capacity',
      'Policy limits',
    ],
    sections: {
      whyItMatters:
        'Surgery changes what a claim is about. Before it, the argument is whether the injury is real and connected to the incident. After it, the injury is largely conceded — nobody operates on a spine to accommodate a claim — and the argument moves to how much of your future it takes. That future has several parts and the surgical bill is the smallest of them. There is what comes next medically: hardware that may need revision, adjacent segment problems after a fusion, ongoing pain management, and a meaningful minority of patients with continuing pain despite technically successful surgery, a pattern common enough to have its own name. There is permanent restriction, which is the piece that most often decides the number — written limits on lifting, sitting, standing or bending, and whether the work you actually do can be done within them. A restriction that ends a career in construction or nursing is worth far more than the same restriction for someone at a desk, and lost earning capacity is a separate category from wages already missed. The procedure matters too, because they are not equivalent. A microdiscectomy is relatively contained, often with good recovery and a limited future-care picture. A fusion removes motion at a level permanently, transfers load to adjacent levels, and carries a recognised risk of later surgery, which is why it is valued differently. Two things commonly undermine these claims despite the surgery. The first is thin documentation of conservative care, because a surgical recommendation reached quickly invites the argument that it was not necessary; a well-documented failed course of therapy, medication and injections is what makes the operation look inevitable. The second is coverage. Surgical claims routinely exceed a $30,000 minimum-limits policy several times over, and at that point the question is not the value of the claim but where else money can be found — underinsured motorist coverage, a commercial policy, an employer, or an additional responsible party.',
      whatToTrack: [
        'The exact procedure name, level, and whether hardware was implanted',
        'The complete record of conservative care attempted first, with dates and outcomes',
        'Surgical reports, discharge summaries, and post-operative imaging',
        'Every future care item a physician has stated in writing: revision risk, injections, pain management, therapy',
        'Written permanent restrictions, and how they compare with your job requirements',
        'Your occupation, physical demands, earnings history, and any change to hours or role',
        'Total billed surgical and facility charges, which are usually the largest single figure in the file',
        'All available coverage: at-fault limits, UM/UIM, commercial, employer, and any second responsible party',
      ],
      howClearCaseHelps:
        `ClearCaseIQ separates what has already been spent from what is still to come, because in a surgical claim the second number is usually larger and is the one most often left out of an early demand. It also tests the two arguments these claims lose on — insufficiently documented conservative care, and restrictions described medically but never translated into what they mean for your particular job. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is a fusion worth more than a discectomy?',
        a: 'Generally yes, and for reasons beyond cost. A fusion permanently eliminates motion at that level and transfers load to the levels above and below, which carries a recognised risk of adjacent segment problems and further surgery. That future risk, along with the restrictions that usually accompany it, is what separates the two rather than the price of the operation.',
      },
      {
        q: 'What if I decline the recommended surgery?',
        a: 'A documented recommendation still establishes severity and future cost, and declining spinal surgery is a reasonable choice many people make. What matters is that the record explains the decision. An unexplained refusal invites the argument that you failed to mitigate; a documented one — risk tolerance, a second opinion, a decision to manage conservatively — does not carry the same weight.',
      },
      {
        q: 'How is future medical care proved?',
        a: 'By written physician opinion about what will be needed and for how long, costed at reasonable rates. In larger claims this becomes a formal life care plan prepared by a specialist and often supported by an economist for present value. What does not work is asserting future care in a demand letter without a treating physician having said it in the record first.',
      },
      {
        q: 'My surgery did not fix the pain. Does that reduce the claim?',
        a: 'No, it usually increases it, provided the record documents it. Continuing pain after technically successful spinal surgery is a recognised outcome, and it establishes permanence more convincingly than a good recovery does. The risk is not the poor outcome but a file that stops at the operative report and never records what happened afterwards.',
      },
      {
        q: 'Why do surgical claims settle for less than they seem worth?',
        a: 'Most often because the money is not there. Surgical charges alone frequently exceed a minimum-limits policy several times over, and a claim cannot be worth more than what can be collected. The other common reason is lien pressure: hospital and surgeon liens against the recovery can consume a large share of a settlement that looked adequate, which is why identifying and negotiating them is part of the valuation rather than an afterthought.',
      },
      {
        q: 'Does a prior back problem prevent a surgical claim?',
        a: 'No. Many people who need spinal surgery after a collision had some degeneration beforehand, which is unremarkable with age. California compensates the aggravation of a pre-existing condition, so the question is what changed: whether you were symptomatic and treating before, and whether the operation became necessary because of the incident.',
      },
    ],
  },
  {
    slug: '/how-much-is-a-motorcycle-accident-case-worth',
    category: 'Settlement',
    cluster: 'Claim Value',
    title: 'How Much Is a Motorcycle Accident Case Worth?',
    eyebrow: 'Case value guide',
    description:
      'Motorcycle claims combine severe injuries with an assumption that the rider was at fault. The injuries raise the value; the assumption, and the limited coverage most riders end up relying on, is what brings it back down.',
    psychology: 'I was hurt badly on a motorcycle and I am already being blamed for it.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a motorcycle accident case worth',
      'average motorcycle settlement california',
      'motorcycle accident settlement value',
      'motorcycle injury claim worth california',
    ],
    signals: [
      'Injury severity and permanence',
      'Fractures and road rash',
      'Liability evidence',
      'Rider-fault allegations',
      'Helmet use',
      'Available coverage',
    ],
    sections: {
      whyItMatters:
        'A motorcycle claim starts from a higher damages base and a worse credibility position, and both need managing. The injuries are typically more serious than in a comparable car collision — fractures requiring surgical fixation, road rash extensive enough to need debridement or grafting, and head and orthopaedic injuries that leave permanent restriction. That raises the documented losses substantially. Working against it is an assumption, rarely stated openly, that the rider was speeding, weaving or riding recklessly. It appears in adjuster reasoning, in how witnesses remember events, and in jury attitudes, and it is applied whether or not any evidence supports it. Two California-specific points matter here. Lane splitting is lawful: Vehicle Code section 21658.1, added in 2016 and effective in 2017, defines it as riding between rows of stopped or moving vehicles in the same lane, and the Highway Patrol issues safety guidance rather than prohibition. So a claim cannot be defeated simply by establishing that you were lane splitting, though whether you did so at a reasonable speed differential remains a legitimate question about care. Helmets are required for every rider and passenger under section 27803, and non-use, where it applies, is generally argued as comparative fault for head injuries rather than as a bar to the claim — and it should have no bearing on a leg fracture. Because California applies pure comparative negligence, these arguments reduce recovery proportionally rather than ending it, which is why they are made early and aggressively. The coverage picture is the other half. A serious motorcycle injury will exceed a minimum-limits policy immediately, and riders frequently carry less coverage on the bike than they would on a car. Underinsured motorist coverage, an umbrella policy, or a commercial defendant is often the difference between a claim that is worth what it is worth and one that is worth what can be collected.',
      whatToTrack: [
        'Scene photographs showing final rest positions, debris field, skid marks and sight lines',
        'Damage to the motorcycle and to the other vehicle, which often explains the sequence better than either account',
        'Your gear — helmet, jacket, boots — kept rather than discarded, since it evidences both protection and impact',
        'The traffic collision report, any citation, and whether an officer recorded an opinion on fault',
        'Witness details, gathered at the scene, since bystander accounts are often the counterweight to rider assumptions',
        'Whether you were lane splitting, and the speed of surrounding traffic relative to your own',
        'Every injury separately, including road rash extent, grafting, and hardware implanted',
        'Photographs of wounds through healing, which document scarring better than a discharge summary',
        'All coverage: at-fault limits, your UM/UIM, umbrella policies, and any commercial or employer policy',
      ],
      howClearCaseHelps:
        `ClearCaseIQ records the physical evidence that answers rider-fault assumptions before it disappears, and separates injuries that helmet or gear arguments could touch from those they cannot. It also pushes the coverage question forward, because in serious motorcycle claims the available insurance, not the injury, is usually what caps the outcome. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Was I at fault because I was lane splitting?',
        a: 'Not automatically. Lane splitting is lawful in California under Vehicle Code section 21658.1, which defines it and directs the Highway Patrol to publish safety guidance rather than banning the practice. The remaining question is ordinary care: whether the speed differential and conditions were reasonable. Expect the insurer to treat lane splitting as fault by itself, and expect that position to require evidence it usually does not have.',
      },
      {
        q: 'I was not wearing a helmet. Is the claim over?',
        a: 'No. California requires a helmet for every rider and passenger under Vehicle Code section 27803, and non-use is normally argued as comparative fault, reducing recovery rather than barring it under the state pure comparative negligence rule. It also has to be connected to the harm: helmet use is relevant to a head injury and not to a fractured femur, though insurers rarely draw that line for you.',
      },
      {
        q: 'How is road rash valued?',
        a: 'Through treatment intensity and what it leaves behind. Debridement, infection risk, skin grafting and lengthy wound care generate substantial documented costs, and permanent scarring, particularly where it is visible, is compensable in its own right. Photographs taken through the healing process are worth more than the medical record alone, because the record describes the wound while the photographs show the result.',
      },
      {
        q: 'Why do insurers treat motorcycle riders differently?',
        a: 'Because they price claims against expected jury attitudes, and those attitudes include an assumption of risk-taking. That is a reason to build the file on physical evidence rather than accounts: final rest positions, debris, damage patterns, and independent witnesses answer an assumption that argument does not.',
      },
      {
        q: 'The driver said they never saw me. Does that help?',
        a: 'Usually yes. Failure to see an approaching motorcycle is common in left-turn and lane-change collisions and generally supports a failure to keep a proper lookout rather than excusing it. It is most useful when recorded early — in the collision report, in a recorded statement, or by a witness — before the account is revised.',
      },
      {
        q: 'What if the driver who hit me had minimum coverage?',
        a: 'This is the usual limiting factor in serious motorcycle claims. Injuries needing surgery will exceed $30,000 immediately, so the practical work shifts to identifying other sources: your own underinsured motorist coverage, an umbrella policy, a commercial policy if the vehicle was being used for work, or another party who contributed. Establishing that early changes what can be done about it.',
      },
    ],
  },
  {
    slug: '/how-much-is-a-pedestrian-accident-case-worth',
    category: 'Settlement',
    cluster: 'Claim Value',
    title: 'How Much Is a Pedestrian Accident Case Worth?',
    eyebrow: 'Case value guide',
    description:
      'Pedestrian claims involve the most serious injuries and the least protection, and they turn on two questions: where you were crossing, and whose insurance is available when a person on foot is hit by a car.',
    psychology: 'I was hit while walking and I do not know what my claim is worth.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a pedestrian accident case worth',
      'pedestrian hit by car settlement california',
      'pedestrian accident claim value',
      'hit by a car while walking compensation',
    ],
    signals: [
      'Injury severity',
      'Crosswalk position',
      'Driver conduct',
      'Comparative fault allegations',
      'Available coverage',
      'Long-term restriction',
    ],
    sections: {
      whyItMatters:
        'A person on foot absorbs the impact directly, so these claims start with severe injuries — fractures, head injuries, internal trauma, long hospital admissions and extended rehabilitation. Documented losses are high from the outset, and the two things that decide the outcome are fault allocation and available insurance. On fault, the starting point is Vehicle Code section 21950, which requires drivers to yield to a pedestrian crossing within any marked crosswalk or within an unmarked crosswalk at an intersection. The unmarked part is routinely missed: at most intersections a crosswalk exists in law whether or not it is painted, so "there were no lines" is not the answer an insurer often implies. The same section preserves the pedestrian duty of due care, and specifically that you may not suddenly leave a curb into the path of a vehicle close enough to be an immediate hazard. Outside a crosswalk, section 21954 requires the pedestrian to yield. Separately, the Freedom to Walk Act, effective January 1, 2023, stopped officers citing pedestrians for crossing outside a crosswalk unless there was an immediate danger of collision — which changes enforcement rather than civil right-of-way, though it does mean the absence of a citation carries less weight than it once did. Because California uses pure comparative negligence, crossing mid-block reduces recovery by your share rather than ending the claim, and expect the driver conduct on the other side of the ledger — speed, distraction, a failure to look before turning — to matter just as much. Coverage is the second decisive question, and the answer surprises people. A pedestrian has no vehicle policy in play from the collision itself, but your own auto insurance usually still responds: uninsured and underinsured motorist coverage typically protects you as a pedestrian, so a policy on a car parked at home can be the source of recovery when the driver who hit you carries minimum limits or none at all.',
      whatToTrack: [
        'Exactly where you were when struck, relative to the intersection, curb line and any marked crossing',
        'Whether an unmarked crosswalk existed at that intersection, which is a legal question and not a visual one',
        'The signal phase if there was one, and how long you had been crossing',
        'Photographs of the location including sight lines, lighting, and any obstruction',
        'The vehicle damage and its location, which indicates impact point and speed',
        'The driver movement — turning, accelerating from a stop, straight through — and whether distraction was noted',
        'Witness details, since a pedestrian claim frequently comes down to independent accounts',
        'Every injury and admission, plus rehabilitation and any care still required',
        'Your own auto policy UM/UIM coverage, and household policies that may cover you as a resident relative',
      ],
      howClearCaseHelps:
        `ClearCaseIQ works out whether an unmarked crosswalk applied and what that does to the fault analysis, rather than accepting the adjuster framing that no painted lines means no right of way. It also raises the coverage question that most pedestrians never think to ask, which is whether their own auto policy — or a household member policy — responds to a collision that happened while they were walking. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'I was not in a marked crosswalk. Do I still have a claim?',
        a: 'Very likely. Vehicle Code section 21950 requires drivers to yield in unmarked as well as marked crosswalks, and an unmarked crosswalk exists at most intersections regardless of paint. Even genuinely mid-block, California pure comparative negligence reduces recovery by your share instead of barring it, so a serious injury with a partial fault allocation can still be a substantial claim.',
      },
      {
        q: 'Does the Freedom to Walk Act mean jaywalking is legal now?',
        a: 'Not quite. Effective January 1, 2023, it stopped officers from citing pedestrians for crossing outside a crosswalk unless there was an immediate danger of collision. The civil right-of-way rules did not change, so a driver can still argue comparative fault for a mid-block crossing. The practical effect is that not being cited proves less than it used to.',
      },
      {
        q: 'The driver says I stepped out suddenly. How is that handled?',
        a: 'It is the standard defence, and section 21950 supports it in a narrow form: a pedestrian may not leave a curb into the path of a vehicle so close it is an immediate hazard. Whether that happened is answered by physical evidence more than by accounts — the impact point on the vehicle, the distance travelled after impact, sight lines, lighting, and witnesses. Where the driver was turning or pulling away from a stop, the argument tends to fit poorly.',
      },
      {
        q: 'The driver had no insurance. Is there anything to claim against?',
        a: 'Often yes, through your own auto policy. Uninsured and underinsured motorist coverage generally protects you when struck as a pedestrian, not only when driving, and coverage held by a resident relative may also apply. If the vehicle was being driven for work or for a delivery or rideshare platform, a commercial policy may respond instead, with far higher limits.',
      },
      {
        q: 'What makes a pedestrian claim worth more?',
        a: 'Injury severity and permanence do most of the work, since these collisions produce fractures, head injuries and long recoveries. Beyond that: clear right of way, driver conduct that reads as careless — speed, a phone, turning without looking — documented rehabilitation, and lasting restriction on mobility or work. Available coverage then determines how much of that documented value is actually reachable.',
      },
      {
        q: 'How long do I have to bring a claim?',
        a: 'California generally allows two years from the date of injury to file suit for personal injury. If a government vehicle or a dangerous road condition is involved, a written claim must usually be presented to the public entity within six months, which is a much shorter deadline and one that catches people out. The specifics turn on facts worth checking early rather than late.',
      },
    ],
  },
]

export const injuryValueGuideTopicContentBySlug: Record<string, TopicContent> = {
  '/how-much-is-my-case-worth': {
    scenario:
      'A claimant with $46,000 in billed treatment and a documented shoulder restriction assumed the case was worth roughly that plus something for the pain. The at-fault driver carried minimum limits, and no underinsured motorist coverage had been purchased. The claim was not undervalued by the adjuster; there was simply $30,000 available, and the question that mattered had been settled a year before the crash, at the point the coverage was declined.',
    timeline: [
      ['First week', 'Coverage is discoverable and evidence is intact. Establishing what insurance exists sets the realistic ceiling before anything else is negotiated.'],
      ['During treatment', 'Economic loss accumulates and becomes provable. Gaps and inconsistencies created here are the ones argued about later.'],
      ['At maximum medical improvement', 'The medical picture stops changing and the claim can be valued honestly for the first time.'],
      ['Negotiation', 'Documentation quality, liability strength and available limits determine the range. Liens determine what is left of it.'],
    ],
    severityLadder: [
      ['Limited', 'Short treatment, full recovery, modest billed charges, no lasting restriction.'],
      ['Moderate', 'Sustained treatment with documented limitation and measurable wage loss.'],
      ['Serious', 'Objective findings, invasive treatment or a surgical recommendation, and restrictions that affect work.'],
      ['Catastrophic', 'Permanent impairment, future care requirements, or loss of earning capacity, where policy limits usually become the binding constraint.'],
    ],
    treatmentProgression: [
      { label: 'Economic loss', copy: 'Billed charges, wage loss, out-of-pocket costs and future care. Countable, provable, and the floor of any range.' },
      { label: 'Non-economic loss', copy: 'Pain, limitation and disruption. Argued from the record rather than calculated, and moved by objective findings and specific effects.' },
      { label: 'Fault adjustment', copy: 'Pure comparative negligence reduces recovery by your share rather than barring it.' },
      { label: 'Collectability', copy: 'Available limits and additional policies. The ceiling that overrides everything above it.' },
    ],
    settlementDrivers: [
      'Objective findings rather than reported symptoms alone',
      'Treatment that is continuous and matches the diagnosis',
      'Wage loss confirmed by an employer',
      'A specific, describable effect on daily function',
      'Liability supported by evidence other than your account',
      'Policy limits sufficient to cover documented loss',
    ],
    settlementValueDetails: [
      { label: 'The multiplier myth', copy: 'No California court applies a bills-times-a-number formula. It is a settlement-guide shorthand, not a rule.' },
      { label: 'Billed versus paid', copy: 'What was billed and what your insurer paid are different numbers, and which one anchors the discussion is itself contested.' },
      { label: 'Limits as ceiling', copy: 'California minimums are $30,000 per person and $60,000 per accident for policies issued or renewed from January 1, 2025.' },
      { label: 'Net versus gross', copy: 'Fees, costs and reimbursement claims stand between the settlement figure and what reaches you.' },
    ],
    insuranceProblems: [
      'An offer arrives before treatment is finished, with a release attached.',
      'Policy limits are not disclosed, so the claim is negotiated without knowing the ceiling.',
      'Comparative fault is alleged early, without evidence, to lower the starting point.',
      'The discounted amount paid by a health insurer is used to argue the treatment was worth less.',
      'A recorded statement is requested before the injuries are fully diagnosed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What are your total billed medical charges, and is treatment finished?' },
      { label: 'Step 2', question: 'What work have you missed, and can your employer confirm it?' },
      { label: 'Step 3', question: 'What can you no longer do, at work or at home?' },
      { label: 'Step 4', question: 'What coverage exists — the at-fault limits, and your own UM/UIM?' },
    ],
  },
  '/how-much-is-a-car-accident-case-worth': {
    scenario:
      'A rear-end collision produced $1,900 in bumper damage and a shoulder injury that eventually needed surgery. The insurer opened at a figure built from the repair estimate. The claim moved only when the file contained an MRI, an orthopaedic recommendation, and interior photographs showing where the occupant was seated — none of which the repair estimate could have predicted.',
    timeline: [
      ['At the scene', 'Photographs, witnesses and the report are available and will not be recoverable later. Interior photographs are the ones most often missed.'],
      ['First days', 'The date of first treatment is set and becomes the anchor for every causation argument that follows.'],
      ['Weeks one to six', 'Diagnosis firms up, referrals are made, and the low-impact argument either takes hold or is answered by the record.'],
      ['After treatment', 'Coverage, not documentation, usually determines whether the documented loss can actually be recovered.'],
    ],
    severityLadder: [
      ['Minor', 'Soft-tissue injury resolving within weeks, low billed charges, no lasting limitation.'],
      ['Moderate', 'Sustained treatment, imaging, physical therapy, and some missed work.'],
      ['Serious', 'Fracture, surgery, or an objective finding with radiating symptoms and written restrictions.'],
      ['Catastrophic', 'Permanent impairment or long-term care needs, where minimum limits are exhausted immediately.'],
    ],
    treatmentProgression: [
      { label: 'Immediate care', copy: 'Emergency or urgent care records establish the connection between the collision and the complaint.' },
      { label: 'Diagnosis', copy: 'Imaging and specialist examination separate soft-tissue injury from structural damage.' },
      { label: 'Active treatment', copy: 'Physical therapy, injections or surgery, documented as responding to the diagnosis.' },
      { label: 'Resolution or restriction', copy: 'Either recovery, or written limits that carry the claim into permanent-impairment territory.' },
    ],
    settlementDrivers: [
      'Objective injury findings rather than reported pain alone',
      'Prompt treatment, or a documented reason for any delay',
      'Fault established by report, citation, witness or footage',
      'Interior and exterior photographs that explain the mechanism',
      'Confirmed policy limits, including UM/UIM and any commercial layer',
      'Wage loss confirmed in writing',
    ],
    settlementValueDetails: [
      { label: 'Property damage anchoring', copy: 'Repair cost arrives in the file first and shapes the reserve set before anyone reads a medical record.' },
      { label: 'Mechanism over magnitude', copy: 'Seating position, head restraint height and awareness of impact explain injury better than bumper deformation.' },
      { label: 'Coverage stacking', copy: 'A commercial, employer or rideshare policy can raise a ceiling that a personal policy would have capped.' },
      { label: 'UM/UIM', copy: 'Your own coverage frequently determines the outcome of a claim against an uninsured or minimally insured driver.' },
    ],
    insuranceProblems: [
      'A low-impact designation is applied from the repair estimate before the medical file is reviewed.',
      'A recorded statement is taken early and used to fix your account before the diagnosis is complete.',
      'Policy limits are withheld, so the claim is negotiated blind to the ceiling.',
      'Comparative fault is asserted from the report without independent evidence.',
      'A quick offer is made while treatment is ongoing, with a full release attached.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What does the vehicle damage look like, inside and out?' },
      { label: 'Step 2', question: 'When did you first get treatment, and for what symptoms?' },
      { label: 'Step 3', question: 'What evidence establishes who caused the collision?' },
      { label: 'Step 4', question: 'What coverage exists, including your own UM/UIM and any commercial policy?' },
    ],
  },
  '/how-much-is-a-whiplash-case-worth': {
    scenario:
      'A driver rear-ended at low speed felt only stiffness at the scene and declined an ambulance. Pain and headaches set in two days later. She saw a physician on day four, mentioned the delay and why, completed eight weeks of physical therapy, and was discharged with documented range-of-motion improvement. The insurer opened low on the repair estimate; the file that answered it was the examination findings and the discharge summary, not the argument.',
    timeline: [
      ['Day of impact', 'Symptoms are frequently absent or mild. Adrenaline masks them, and declining care at the scene is normal rather than damaging if care follows soon after.'],
      ['24 to 72 hours', 'Stiffness, headache and reduced rotation typically peak. This is the window where seeking care protects the claim.'],
      ['Two to twelve weeks', 'Physical therapy and reassessment. Improvement documented here is what shows treatment was needed and worked.'],
      ['Beyond three months', 'Persistent symptoms suggest facet joint involvement, an undiagnosed disc injury, or a chronic pattern, and change the valuation category.'],
    ],
    severityLadder: [
      ['Mild', 'Stiffness and pain resolving within a few weeks with minimal treatment.'],
      ['Moderate', 'Several weeks to months of therapy, headaches, and documented rotation loss.'],
      ['Serious', 'Persistent symptoms past three months, radiating arm symptoms, or a facet or disc finding on further investigation.'],
      ['Severe', 'Chronic pain with written work restrictions, or an injury that turns out to be structural rather than soft-tissue.'],
    ],
    treatmentProgression: [
      { label: 'First assessment', copy: 'Examination documenting spasm, tenderness and measured range-of-motion loss. Imaging usually rules out fracture rather than confirming injury.' },
      { label: 'Active therapy', copy: 'Physical therapy or chiropractic care under a plan that is reassessed, with progress recorded.' },
      { label: 'Reassessment', copy: 'If symptoms persist, referral for further imaging or specialist review to separate soft tissue from structural injury.' },
      { label: 'Discharge or escalation', copy: 'Either documented improvement and discharge, or escalation that moves the claim out of the soft-tissue category.' },
    ],
    settlementDrivers: [
      'Care beginning within days, or a documented reason it did not',
      'A consistent symptom history repeated to every provider',
      'Measured range-of-motion loss and spasm noted by an examiner',
      'Headaches or radiating symptoms described specifically',
      'Treatment that responds to progress rather than running on a fixed schedule',
      'A concrete work or sleep limitation someone else can confirm',
    ],
    settlementValueDetails: [
      { label: 'Normal imaging', copy: 'A clear MRI excludes fracture and herniation, not soft-tissue injury. It is routinely presented as though it excludes everything.' },
      { label: 'Duration', copy: 'How long symptoms lasted is the least disputable fact available in a soft-tissue claim once it is documented.' },
      { label: 'Treatment pattern', copy: 'Extended identical-frequency care on a lien is discounted more aggressively than physician-directed care showing progress.' },
      { label: 'Low-impact designation', copy: 'Repair cost below a threshold routes the claim into a track built to pay less, answerable mainly with medical documentation.' },
    ],
    insuranceProblems: [
      'A normal MRI is presented as proof that no injury occurred.',
      'A gap of a week or two before first treatment is used to argue something else caused the pain.',
      'Chiropractic frequency is characterised as treatment generated for the claim rather than needed.',
      'Minor vehicle damage is offered as evidence the injury cannot be real.',
      'An early offer arrives while therapy is still in progress.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'When did symptoms begin, and when did you first get care?' },
      { label: 'Step 2', question: 'What did the examination record — rotation loss, spasm, tenderness?' },
      { label: 'Step 3', question: 'Are there headaches, dizziness or arm symptoms, and how long have they lasted?' },
      { label: 'Step 4', question: 'What can you no longer do at work, at home, or when sleeping?' },
    ],
  },
  '/how-much-is-a-herniated-disc-case-worth': {
    scenario:
      'An MRI six weeks after a collision showed an L5-S1 protrusion contacting the nerve root. The insurer produced a records review asserting degeneration. What moved the claim was the absence of any prior back complaint in eight years of primary care records, pain following the S1 distribution into the foot, a positive straight-leg raise, and an injection at that level that gave three months of relief.',
    timeline: [
      ['First weeks', 'Conservative care and initial diagnosis. Documenting the absence of prior symptoms matters as much as documenting the current ones.'],
      ['Four to eight weeks', 'Imaging when symptoms persist or radiate. The wording of the radiology report shapes the argument that follows.'],
      ['Two to six months', 'Failed conservative care leads to injections, and the response to them helps localise the source.'],
      ['Six months onward', 'Surgical discussion, or a plateau with written restrictions. Either establishes permanence and future cost.'],
    ],
    severityLadder: [
      ['Mild', 'Imaging finding without radiating symptoms, managed conservatively and resolving.'],
      ['Moderate', 'Confirmed herniation with radiculopathy, physical therapy and continued symptoms.'],
      ['Serious', 'Failed conservative care, epidural injections, and persistent neurological findings.'],
      ['Severe', 'Discectomy or fusion recommended or performed, with permanent restrictions and future care.'],
    ],
    treatmentProgression: [
      { label: 'Conservative care', copy: 'Therapy, medication and activity modification, documented over enough time to establish that it was tried and failed.' },
      { label: 'Imaging', copy: 'MRI identifying the level and describing whether the disc contacts or displaces a nerve root.' },
      { label: 'Interventional care', copy: 'Epidural or facet injections, with the degree and duration of relief recorded.' },
      { label: 'Surgical consideration', copy: 'Discectomy or fusion recommendation, which establishes severity and future cost whether or not it proceeds.' },
    ],
    settlementDrivers: [
      'No documented spinal complaints before the incident',
      'Symptoms beginning immediately or nearly immediately after',
      'Radiating pain that follows the nerve path of the identified level',
      'Examination findings: reflex change, measured weakness, positive straight-leg raise',
      'Conservative care documented as attempted and unsuccessful',
      'A written surgical recommendation, followed or declined',
    ],
    settlementValueDetails: [
      { label: 'Causation, not injury', copy: 'The scan is rarely disputed. When the change occurred almost always is, because imaging cannot date it.' },
      { label: 'Report wording', copy: 'Bulge, protrusion, extrusion and annular tear are read as a hierarchy, with focal findings harder to attribute to ageing.' },
      { label: 'Clinical correlation', copy: 'A finding that matches the symptom distribution supports causation; one that does not invites a records review.' },
      { label: 'Aggravation', copy: 'California compensates the worsening of a pre-existing condition, which is often the accurate and stronger framing.' },
    ],
    insuranceProblems: [
      'A records review physician attributes the finding entirely to degeneration without examining you.',
      'Prior unrelated back treatment is presented as proof the disc problem predates the crash.',
      'A gap between the collision and the MRI is used to argue an intervening cause.',
      'A declined surgery is characterised as evidence the injury was never serious.',
      'Injection relief is used to argue the condition resolved.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What exactly does the radiology report say, and at which level?' },
      { label: 'Step 2', question: 'Where does the pain, numbness or weakness travel?' },
      { label: 'Step 3', question: 'What treatment was tried before injections or surgery were raised?' },
      { label: 'Step 4', question: 'Is there any prior back complaint, treatment or imaging in your records?' },
    ],
  },
  '/how-much-is-a-tbi-case-worth': {
    scenario:
      'A project manager was released from the emergency department with a normal CT and a note recording that he seemed confused on arrival. Four months later he was still losing words mid-sentence and had moved to reduced hours. The claim was treated as minor until neuropsychological testing showed processing-speed deficits and his supervisor described, in dates and specifics, work he could no longer do.',
    timeline: [
      ['First hours', 'Confusion, disorientation or amnesia around the event, recorded by a clinician or witness. The most valuable evidence and the most often missing.'],
      ['First weeks', 'Headache, light sensitivity, fatigue and concentration difficulty. Most concussions begin improving here.'],
      ['One to three months', 'Either resolution, or a persistent pattern that should prompt referral and formal testing.'],
      ['Beyond three months', 'Post-concussion syndrome, where permanence becomes credible and third-party accounts of change carry the claim.'],
    ],
    severityLadder: [
      ['Mild', 'Concussion symptoms resolving within weeks, no lasting cognitive or work effect.'],
      ['Moderate', 'Symptoms persisting past three months with documented concentration, memory or mood change.'],
      ['Serious', 'Testing-confirmed deficits, reduced hours or duties, and treatment continuing without full recovery.'],
      ['Catastrophic', 'Abnormal imaging, hospital admission, or permanent deficit affecting independence or earning capacity.'],
    ],
    treatmentProgression: [
      { label: 'Emergency assessment', copy: 'Imaging to exclude bleeding and fracture. A normal result excludes emergency pathology, not concussion.' },
      { label: 'Clinical follow-up', copy: 'Symptom tracking with a physician, and referral when recovery stalls rather than after months of drift.' },
      { label: 'Neuropsychological testing', copy: 'Scored measurement of memory, attention, processing speed and executive function, including validity checks.' },
      { label: 'Rehabilitation', copy: 'Cognitive therapy, vestibular or vision therapy, and documented accommodation at work.' },
    ],
    settlementDrivers: [
      'Contemporaneous record of confusion, disorientation or amnesia',
      'Symptoms described specifically rather than as general difficulty',
      'Neuropsychological testing with valid effort measures',
      'Duration past three months, documented consistently',
      'Concrete work impact: duties dropped, hours cut, errors recorded',
      'Accounts from people who knew you before, describing dated changes',
    ],
    settlementValueDetails: [
      { label: 'Normal imaging', copy: 'CT and MRI look for bleeding and structural damage, not the diffuse injury that produces concussion symptoms.' },
      { label: 'No loss of consciousness', copy: 'Not required for the diagnosis, and absent in most concussions. Presented as decisive far more often than it is.' },
      { label: 'Testing over reporting', copy: 'Formal testing converts symptoms into measured results, which is the closest thing to objective evidence available here.' },
      { label: 'Third-party observation', copy: 'Supervisors and family describe function; medical notes mostly record what you told someone.' },
    ],
    insuranceProblems: [
      'A normal CT scan is offered as proof no brain injury occurred.',
      'Symptoms are attributed to pain, poor sleep or the stress of the claim itself.',
      'Prior anxiety, depression or concussion is used to explain current deficits entirely.',
      'A defence examiner tests briefly and concludes effort was poor.',
      'Continuing to work at all is presented as evidence of full recovery.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What was recorded in the first hours about confusion, memory or being dazed?' },
      { label: 'Step 2', question: 'Which cognitive symptoms persist, and for how long now?' },
      { label: 'Step 3', question: 'Has formal neuropsychological testing been done?' },
      { label: 'Step 4', question: 'Who noticed a change in you, and can they describe it specifically?' },
    ],
  },
  '/how-much-is-a-back-surgery-case-worth': {
    scenario:
      'A warehouse worker completed four months of therapy and two injections before a surgeon recommended a single-level fusion. The insurer valued the claim on surgical charges. What actually determined it was a written twenty-pound lifting restriction that ended the only work he had done for nineteen years, and a physician opinion that adjacent-level surgery was a realistic future risk.',
    timeline: [
      ['Before surgery', 'Conservative care documented over months. This is what makes the operation look necessary rather than elective.'],
      ['Surgical decision', 'Recommendation, procedure type and level. The claim changes category at this point whether or not surgery proceeds.'],
      ['Recovery', 'Post-operative course, therapy, and whether symptoms resolved, partially resolved or persisted.'],
      ['Long term', 'Permanent restrictions, future care, revision risk, and effect on the work you actually do.'],
    ],
    severityLadder: [
      ['Limited', 'Microdiscectomy with good recovery, no lasting restriction, and a contained future-care picture.'],
      ['Moderate', 'Surgery with partial relief, continuing therapy, and restrictions that affect some activity.'],
      ['Serious', 'Fusion with hardware, written permanent restrictions, and documented adjacent-level risk.'],
      ['Catastrophic', 'Multi-level fusion, continuing pain despite surgery, revision surgery, or loss of the ability to do your occupation.'],
    ],
    treatmentProgression: [
      { label: 'Conservative care', copy: 'Therapy, medication and activity modification, documented long enough to establish it was genuinely tried.' },
      { label: 'Interventional care', copy: 'Injections that failed to give durable relief, which is often the step that justifies operating.' },
      { label: 'Surgery', copy: 'Discectomy, laminectomy or fusion, with the operative report and hardware detail recorded.' },
      { label: 'Post-operative course', copy: 'Rehabilitation, residual symptoms, and written restrictions that define permanence.' },
    ],
    settlementDrivers: [
      'A thoroughly documented failed course of conservative care',
      'Procedure type, particularly fusion rather than discectomy',
      'Written permanent restrictions with specific limits',
      'Physical demands of your actual occupation measured against those limits',
      'Physician-stated future care: revision risk, pain management, therapy',
      'Coverage sufficient to reach documented loss, which is rarely a minimum-limits policy',
    ],
    settlementValueDetails: [
      { label: 'Future over past', copy: 'What care is still needed usually exceeds what has already been billed, and is the part most often left out of an early demand.' },
      { label: 'Fusion consequences', copy: 'Permanent loss of motion at a level transfers load to adjacent levels and carries recognised further-surgery risk.' },
      { label: 'Restriction versus occupation', copy: 'The same lifting limit ends one career and inconveniences another. Earning capacity is separate from wages already lost.' },
      { label: 'Liens', copy: 'Hospital and surgeon claims against the recovery can consume much of a settlement that looked adequate gross.' },
    ],
    insuranceProblems: [
      'Surgery is characterised as elective, or as treating degeneration rather than trauma.',
      'A short course of conservative care is used to argue the operation was premature.',
      'Future care is disregarded because no physician stated it in writing.',
      'Restrictions are acknowledged medically but never priced against your actual job.',
      'The claim is capped by policy limits with no inquiry into other coverage.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What procedure was performed or recommended, and at what level?' },
      { label: 'Step 2', question: 'What conservative treatment came first, and over how long?' },
      { label: 'Step 3', question: 'What restrictions are in writing, and what do they stop you doing at work?' },
      { label: 'Step 4', question: 'What future care has a physician said you will need?' },
    ],
  },
  '/how-much-is-a-motorcycle-accident-case-worth': {
    scenario:
      'A rider was struck by a driver turning left across his path. The first adjuster note assumed excessive speed. Scene photographs showing the debris field and the impact point on the car, together with a bystander who said the driver never looked, moved the fault analysis. The claim was then limited by something else entirely: a minimum-limits policy, against a tibial plateau fracture requiring fixation.',
    timeline: [
      ['At the scene', 'Rest positions, debris, skid marks and sight lines are recorded or lost. These answer rider assumptions that argument cannot.'],
      ['First days', 'Emergency treatment and surgical fixation. Injury severity is established immediately in these claims.'],
      ['Weeks to months', 'Wound care, grafting, hardware, rehabilitation, and the beginning of a scarring record.'],
      ['Long term', 'Permanent restriction, scarring, and the coverage question that usually decides the outcome.'],
    ],
    severityLadder: [
      ['Moderate', 'Road rash and soft-tissue injury treated without surgery, healing without lasting restriction.'],
      ['Serious', 'Fractures requiring fixation, extensive road rash, or grafting, with months of recovery.'],
      ['Severe', 'Multiple fractures, head injury, or permanent restriction affecting work and mobility.'],
      ['Catastrophic', 'Amputation, spinal cord injury, or permanent impairment, where available coverage is exhausted at once.'],
    ],
    treatmentProgression: [
      { label: 'Emergency care', copy: 'Trauma assessment, imaging, and stabilisation of fractures and wounds.' },
      { label: 'Surgical treatment', copy: 'Fixation, debridement or grafting, with hardware and operative detail recorded.' },
      { label: 'Wound and scar management', copy: 'Extended dressing changes and infection risk, documented in photographs as well as notes.' },
      { label: 'Rehabilitation', copy: 'Therapy, weight-bearing progression, and written restrictions where recovery is incomplete.' },
    ],
    settlementDrivers: [
      'Physical evidence establishing the collision sequence',
      'Independent witnesses to counter rider-fault assumptions',
      'Fracture pattern, fixation hardware, and weight-bearing history',
      'Road rash extent, grafting, and permanent visible scarring',
      'Helmet use, and whether it relates to the injuries claimed at all',
      'Coverage beyond the at-fault policy: UM/UIM, umbrella or commercial',
    ],
    settlementValueDetails: [
      { label: 'Lane splitting', copy: 'Lawful under Vehicle Code section 21658.1. It raises a question about reasonable care, not automatic fault.' },
      { label: 'Helmet non-use', copy: 'Required by section 27803, and argued as comparative fault for head injuries. It has no logical bearing on a leg fracture.' },
      { label: 'Rider bias', copy: 'Priced into offers because it is expected from juries. Physical evidence is the counterweight.' },
      { label: 'Coverage ceiling', copy: 'Surgical motorcycle injuries pass $30,000 immediately, so other policies usually decide the real outcome.' },
    ],
    insuranceProblems: [
      'Excessive speed is assumed from the severity of the injuries rather than from evidence.',
      'Lane splitting is treated as fault in itself.',
      'Helmet non-use is applied to injuries it could not have affected.',
      'Comparative fault is asserted early to reduce the starting point.',
      'The claim is closed at policy limits without exploring other coverage.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What physical evidence exists from the scene?' },
      { label: 'Step 2', question: 'What was the other driver doing, and did anyone independent see it?' },
      { label: 'Step 3', question: 'What injuries required surgery, and what scarring remains?' },
      { label: 'Step 4', question: 'What coverage exists beyond the at-fault policy?' },
    ],
  },
  '/how-much-is-a-pedestrian-accident-case-worth': {
    scenario:
      'A pedestrian was struck by a right-turning driver at an intersection with no painted crossing. The insurer opened by asserting she was not in a crosswalk. She was: an unmarked crosswalk existed at that intersection as a matter of law. Recovery ultimately came from her own underinsured motorist coverage, on a car that had been parked at home at the time.',
    timeline: [
      ['At the scene', 'Position, signal phase, sight lines and witnesses. Where you were standing is the fact the whole claim turns on.'],
      ['Hospital admission', 'Severity is established immediately: fractures, head injury or internal trauma with a documented admission.'],
      ['Rehabilitation', 'Extended recovery, mobility progress, and the beginning of any permanent restriction.'],
      ['Coverage review', 'At-fault limits, then your own UM/UIM and household policies, which frequently determine what is recoverable.'],
    ],
    severityLadder: [
      ['Moderate', 'Soft-tissue injury or a single fracture treated without admission.'],
      ['Serious', 'Multiple fractures, surgery, or a hospital admission with extended rehabilitation.'],
      ['Severe', 'Head injury, internal trauma, or permanent mobility restriction.'],
      ['Catastrophic', 'Permanent impairment or loss of independence, where available coverage is exhausted immediately.'],
    ],
    treatmentProgression: [
      { label: 'Trauma care', copy: 'Emergency assessment and admission, which documents severity without argument.' },
      { label: 'Surgical treatment', copy: 'Fracture fixation or internal injury repair, with operative records and hardware detail.' },
      { label: 'Rehabilitation', copy: 'Inpatient or outpatient therapy, mobility progress, and assistive device needs.' },
      { label: 'Residual restriction', copy: 'Written limits on walking, standing or working, and any care still required.' },
    ],
    settlementDrivers: [
      'Position at impact relative to a marked or unmarked crosswalk',
      'Driver conduct: turning, speed, distraction, or failure to look',
      'Independent witness accounts, which often decide these claims',
      'Vehicle impact point and post-impact distance',
      'Injury severity, admission length and rehabilitation record',
      'Your own UM/UIM coverage, including household policies',
    ],
    settlementValueDetails: [
      { label: 'Unmarked crosswalks', copy: 'Section 21950 requires drivers to yield in unmarked as well as marked crosswalks at intersections. Paint is not the test.' },
      { label: 'Pedestrian duty', copy: 'The same section bars suddenly leaving a curb into the path of a vehicle close enough to be an immediate hazard.' },
      { label: 'Freedom to Walk Act', copy: 'From January 1, 2023, citations for crossing outside a crosswalk require immediate danger of collision. Civil right-of-way rules were not changed.' },
      { label: 'Your own policy', copy: 'UM/UIM coverage generally protects you as a pedestrian, which is the recovery source people least expect.' },
    ],
    insuranceProblems: [
      'The absence of painted lines is presented as the absence of a crosswalk.',
      'A sudden-entry defence is asserted without reference to impact point or sight lines.',
      'Comparative fault is proposed at a high percentage as an opening position.',
      'The claim is treated as closed once the at-fault policy limits are tendered.',
      'A recorded statement is sought while you are still admitted and medicated.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Exactly where were you when struck, relative to the intersection and curb?' },
      { label: 'Step 2', question: 'What was the driver doing, and did anyone independent see it?' },
      { label: 'Step 3', question: 'What injuries, admission and rehabilitation are documented?' },
      { label: 'Step 4', question: 'What auto coverage do you or a household member carry?' },
    ],
  },
}
