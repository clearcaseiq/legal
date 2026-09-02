import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The two wrongful-death spokes: claim value and eligibility.
 *
 * The deadline half of this hub already exists at
 * `/california-statute-of-limitations-wrongful-death` (see seoSolGuides.ts).
 * These two pages complete the hub with the questions a grieving family
 * actually searches — what the claim is worth, and who is even allowed to bring
 * it — which California answers in ways that surprise people: a defined list of
 * eligible relatives, grief itself not compensable while the loss of the
 * relationship is, and a separate survival claim carrying the deceased's own
 * losses.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. A wrongful-death claim turns on who is eligible, what the family lost, and facts particular to the death, which a licensed California attorney can review.'

export const WD_VALUE_SLUG = '/how-much-is-a-wrongful-death-case-worth-in-california'
export const WD_ELIGIBILITY_SLUG = '/who-can-file-a-wrongful-death-claim-in-california'

export const wrongfulDeathGuidePages: LandingPage[] = [
  {
    slug: WD_VALUE_SLUG,
    category: 'Settlement',
    cluster: 'Wrongful Death Claim Value',
    title: 'How Much Is a Wrongful Death Case Worth in California?',
    eyebrow: 'Wrongful death value guide',
    description:
      'A California wrongful-death claim compensates the family\u2019s financial and relational loss — support, services, love and companionship — but not their grief. A separate survival claim carries the deceased\u2019s own losses, and the two are valued differently.',
    psychology: 'I lost a family member and I need to understand what a claim like this involves.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a wrongful death case worth in California',
      'average wrongful death settlement California',
      'wrongful death damages California',
      'what can you recover in a wrongful death claim',
      'wrongful death vs survival action value',
    ],
    signals: [
      'Financial support provided',
      'Household services',
      'Relationship to the deceased',
      'Age and earning years lost',
      'Survival-action losses',
      'Available coverage',
    ],
    sections: {
      whyItMatters:
        'A California wrongful-death claim is valued around what the surviving family lost, and the categories are specific and sometimes counterintuitive. The economic side covers the financial support the deceased would have provided — earnings and benefits over their remaining working life, adjusted for what they consumed themselves — the loss of gifts or benefits the survivors could have expected, funeral and burial expenses, and the reasonable value of household services the deceased performed, which for a homemaker or a hands-on parent can be substantial even without a paycheck. The non-economic side compensates the loss of the deceased\u2019s love, companionship, comfort, care, assistance, protection, affection, society, moral support, and — for a spouse — intimacy, and for a child the loss of a parent\u2019s guidance. What California pointedly does not compensate is the survivors\u2019 own grief and sorrow, nor the pain and suffering of the deceased, which belongs elsewhere. That "elsewhere" is the survival action, a separate claim brought by the estate for the losses the deceased personally sustained between the injury and death: their own medical expenses, lost earnings in that period, and — under California law as amended — the pain, suffering, and disfigurement they endured before dying. The two claims are valued on different measures and can be pursued together, and missing the survival action is a common and costly oversight because it captures value the wrongful-death claim cannot. Several factors move the numbers. The deceased\u2019s age and earning trajectory drive the support figure; a young wage-earner with dependents produces a larger economic loss than a retiree, though the relational losses can be profound regardless of age. The closeness and legal relationship of the survivors shape the non-economic side. And, as with every claim, collectability sets the ceiling: the value is bounded by the insurance and assets that can actually be reached, which in a death case often means auto, commercial, or premises policies, and sometimes multiple defendants. Because grief is excluded and the compensable losses are technical, wrongful-death value is routinely misjudged by families comparing their loss to an online average that measures none of the things California actually counts.',
      whatToTrack: [
        'The deceased\u2019s income, benefits, and remaining expected working years',
        'Financial support and gifts the survivors received or could have expected',
        'Household services the deceased performed, valued realistically',
        'Each survivor\u2019s relationship to the deceased',
        'Medical expenses and lost earnings between the injury and the death',
        'Any pain and suffering the deceased endured before dying, for the survival claim',
        'Funeral and burial costs',
        'The insurance and assets available across all responsible parties',
      ],
      howClearCaseHelps:
        `ClearCaseIQ separates the two claims that arise from a death — the family\u2019s wrongful-death losses and the estate\u2019s survival losses — and builds each from documented facts rather than an average, so the value that lives in the survival claim is not left on the table. It also flags what actually caps the recovery, the coverage and assets behind the responsible parties, so a family is not valuing the loss in a vacuum. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is there an average wrongful death settlement in California?',
        a: 'Averages are especially misleading here because California compensates specific things — financial support, household services, and the loss of the relationship — while excluding the family\u2019s grief entirely. Two deaths with similar circumstances can be valued very differently based on the deceased\u2019s earnings, the survivors\u2019 relationships, and the coverage available. An online average measures none of that.',
      },
      {
        q: 'What damages can a family recover in a wrongful death claim?',
        a: 'Economic losses — the financial support the deceased would have provided, lost gifts and benefits, funeral and burial costs, and the value of household services — and non-economic losses for the loss of love, companionship, comfort, care, protection, affection, society, moral support, and, for a spouse, intimacy. California does not compensate the survivors\u2019 grief and sorrow, which surprises many families.',
      },
      {
        q: 'What is a survival action and why does it matter to value?',
        a: 'It is a separate claim brought by the estate for what the deceased personally lost between the injury and death — their own medical bills, lost earnings, and the pain, suffering, and disfigurement they endured before dying. It is valued differently from the wrongful-death claim and can be pursued alongside it. Overlooking it leaves out value the wrongful-death claim cannot capture.',
      },
      {
        q: 'Does the deceased\u2019s income determine the whole value?',
        a: 'It heavily influences the economic side — a younger wage-earner with dependents produces a larger support loss than a retiree — but it is not the whole claim. The non-economic loss of the relationship, the value of household services, and the survival-action losses all contribute, so a person with modest earnings can still have a substantial claim.',
      },
      {
        q: 'Are punitive damages available in a wrongful death case?',
        a: 'Not in the wrongful-death claim itself under California law, but they may be available through the survival action where the death resulted from conduct like oppression, fraud, or malice. This is another reason the survival claim matters and should not be overlooked.',
      },
    ],
  },
  {
    slug: WD_ELIGIBILITY_SLUG,
    category: 'Claim Types',
    cluster: 'Wrongful Death Eligibility',
    title: 'Who Can File a Wrongful Death Claim in California?',
    eyebrow: 'Wrongful death eligibility',
    description:
      'California limits wrongful-death claims to a defined group — starting with a spouse or domestic partner and children — with others qualifying only in their absence. A separate survival claim belongs to the estate, and sorting out who may sue takes time the deadline does not add back.',
    psychology: 'Someone I love died and I need to know whether I am allowed to bring a claim.',
    cta: 'Check If You Can File',
    exampleQueries: [
      'who can file a wrongful death claim in California',
      'can a parent sue for wrongful death of an adult child California',
      'who is entitled to wrongful death settlement California',
      'can siblings file a wrongful death claim California',
      'wrongful death vs survival action who files',
    ],
    signals: [
      'Surviving spouse or partner',
      'Children or grandchildren',
      'Financial dependents',
      'Intestate heirs',
      'Personal representative',
      'Putative spouse or stepchildren',
    ],
    sections: {
      whyItMatters:
        'California does not let everyone affected by a death bring a wrongful-death claim; it limits standing to a defined group, and getting this right early matters because the wrong claimant can derail an otherwise strong case. The primary tier is a surviving spouse or registered domestic partner, the deceased\u2019s children, and — if a child has died — that child\u2019s children (the deceased\u2019s grandchildren by a deceased child). Where none of these survive, standing extends to the people who would inherit the deceased\u2019s property under California\u2019s intestate succession rules, which can bring in parents or siblings depending on the family structure. Beyond that core, a further group may qualify if they were financially dependent on the deceased: a putative spouse (someone who reasonably believed they were validly married) and their children, the deceased\u2019s stepchildren, and the deceased\u2019s parents. Dependency is the key that unlocks this second group, which is why a parent can sometimes bring a claim for an adult child and sometimes cannot — it often turns on whether they relied on the child financially. This is separate from the survival action, which belongs to the deceased\u2019s estate and is brought by the personal representative, or by the successor in interest where no estate has been opened. The practical consequence is procedural and time-sensitive. Establishing who is eligible, resolving competing or overlapping claimants, and — for the survival action — appointing a personal representative or documenting a successor in interest all take time, and that time comes out of the two-year deadline rather than being added to it. California also generally treats wrongful death as a single, joint action: the eligible heirs are supposed to bring one claim together rather than separate suits, with the recovery then apportioned among them, so identifying everyone with standing at the outset avoids later disputes and the risk of omitting someone who had a right to be included. Sorting out eligibility is often the first real work of a wrongful-death case, and doing it early is what keeps the deadline and the appointment process from consuming the claim.',
      whatToTrack: [
        'Whether there is a surviving spouse or registered domestic partner',
        'The deceased\u2019s children, and the children of any child who has died',
        'Whether anyone was financially dependent on the deceased',
        'Stepchildren, a putative spouse, or parents who may qualify through dependency',
        'Who would inherit under intestate succession if no primary heirs survive',
        'Whether a personal representative has been appointed for the estate',
        'Any competing or overlapping potential claimants',
        'The date of death, since eligibility work runs inside the deadline',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps map who has standing under California\u2019s tiers — the primary heirs, the intestate-succession fallback, and the dependency-based group — and separates the wrongful-death claimants from the estate\u2019s survival action, so the right people bring the right claim. Because eligibility work and appointing a representative both run inside the two-year deadline, it flags the steps that need to start immediately. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Who is allowed to file a wrongful death claim in California?',
        a: 'First, a surviving spouse or registered domestic partner, the deceased\u2019s children, and the children of any deceased child. If none survive, the right extends to those who would inherit under intestate succession. Separately, if they were financially dependent on the deceased, a putative spouse and their children, stepchildren, and the deceased\u2019s parents may also qualify.',
      },
      {
        q: 'Can a parent sue for the wrongful death of an adult child?',
        a: 'Sometimes. If the adult child left no spouse, domestic partner, or children, parents may have standing through intestate succession. Parents may also qualify as dependents if they relied on the child financially. Whether a parent can bring the claim often turns on the family structure and on financial dependency.',
      },
      {
        q: 'Can siblings file a wrongful death claim in California?',
        a: 'Only in limited circumstances. Siblings are not in the primary group, but they may have standing if they would inherit under intestate succession — typically where the deceased left no spouse, domestic partner, children, or parents. They do not qualify simply by being close to the deceased.',
      },
      {
        q: 'Who brings the survival action if it is separate?',
        a: 'The deceased\u2019s personal representative — the person appointed to administer the estate — or, where no estate has been opened, the successor in interest, who documents their status by declaration. The survival action is the estate\u2019s claim for the deceased\u2019s own losses, and it is distinct from the family\u2019s wrongful-death claim even though both arise from the same death.',
      },
      {
        q: 'What happens if multiple family members want to file?',
        a: 'California generally treats wrongful death as a single joint action, so eligible heirs are expected to bring one claim together, with the recovery apportioned among them afterward. That is why identifying everyone with standing at the outset matters — an omitted heir can create later disputes, and duplicate suits are not the intended path.',
      },
    ],
  },
]

export const wrongfulDeathGuideTopicContentBySlug: Record<string, TopicContent> = {
  [WD_VALUE_SLUG]: {
    scenario: `A family lost a 44-year-old parent of two in a truck collision. The support figure was large given the earning years lost, but the value the family had not considered lived in the survival claim — the parent\u2019s conscious pain in the days before death, which California allows the estate to recover separately. ${NOT_ADVICE}`,
    timeline: [
      ['The death', 'Two claims arise: the family\u2019s wrongful-death claim and the estate\u2019s survival claim.'],
      ['Document the losses', 'Support, services, and the relationship on one side; the deceased\u2019s own losses on the other.'],
      ['Appoint a representative', 'The survival claim needs a personal representative or successor in interest.'],
      ['Before settling', 'Both claims are valued together so neither is left out.'],
    ],
    severityLadder: [
      ['Modest economic loss', 'A retiree or low earner; relational losses may still be significant.'],
      ['Substantial support loss', 'A wage-earner with dependents and many working years ahead.'],
      ['Added survival value', 'Meaningful conscious pain or medical losses before death.'],
      ['Aggravated conduct', 'Oppression, fraud, or malice, opening punitive damages via the survival claim.'],
    ],
    treatmentProgression: [
      { label: 'Economic support', copy: 'Lost earnings and benefits over the deceased\u2019s remaining working life.' },
      { label: 'Household services', copy: 'The value of care and work the deceased provided, even unpaid.' },
      { label: 'Relational loss', copy: 'Loss of love, companionship, comfort, guidance, and society.' },
      { label: 'Survival losses', copy: 'The deceased\u2019s own medical bills, lost earnings, and pre-death suffering.' },
    ],
    settlementDrivers: [
      'The deceased\u2019s earnings and remaining working years',
      'The value of household services provided',
      'The survivors\u2019 relationships to the deceased',
      'The losses captured by the survival action',
      'Whether the conduct supports punitive damages',
      'The coverage and assets available',
    ],
    settlementValueDetails: [
      { label: 'Grief is excluded', copy: 'California does not compensate the survivors\u2019 sorrow, only their relational loss.' },
      { label: 'Two claims, two measures', copy: 'The wrongful-death and survival claims are valued differently and pursued together.' },
      { label: 'Services count', copy: 'A homemaker\u2019s or hands-on parent\u2019s contribution can be a large economic loss.' },
      { label: 'Coverage caps it', copy: 'The recovery is bounded by the insurance and assets that can be reached.' },
    ],
    insuranceProblems: [
      'The survival claim is overlooked and its value lost.',
      'Household services are dismissed because the deceased had no paycheck.',
      'The family\u2019s grief is confused with the compensable relational loss.',
      'A single policy limit is treated as the whole ceiling without checking other defendants.',
      'An early offer is made before the survival losses are documented.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What did the deceased earn, and who depended on that support?' },
      { label: 'Step 2', question: 'What household services did the deceased provide?' },
      { label: 'Step 3', question: 'Was there a period of suffering between the injury and death?' },
      { label: 'Step 4', question: 'Who are the surviving family members and their relationships?' },
    ],
  },
  [WD_ELIGIBILITY_SLUG]: {
    scenario: `An adult child died leaving no spouse or children. Two potential claimants emerged: the parents, who had partly depended on him, and a sibling. Sorting out who had standing under California\u2019s tiers — and appointing a representative for the survival claim — was the first real work of the case, and it ran inside the two-year clock. ${NOT_ADVICE}`,
    timeline: [
      ['Identify primary heirs', 'Spouse or domestic partner, children, and children of a deceased child.'],
      ['Check the fallbacks', 'Intestate-succession heirs and the dependency-based group.'],
      ['Appoint a representative', 'For the estate\u2019s separate survival claim.'],
      ['Bring one joint action', 'Eligible heirs generally file together, with recovery apportioned.'],
    ],
    severityLadder: [
      ['Clear standing', 'A surviving spouse or children; the straightforward case.'],
      ['Fallback standing', 'No primary heirs, so intestate-succession rules decide.'],
      ['Dependency standing', 'Parents, stepchildren, or a putative spouse who depended on the deceased.'],
      ['Disputed', 'Competing or overlapping claimants who must be reconciled.'],
    ],
    treatmentProgression: [
      { label: 'Primary tier', copy: 'Spouse or domestic partner, children, and grandchildren by a deceased child.' },
      { label: 'Intestate fallback', copy: 'Those who would inherit if no primary heirs survive.' },
      { label: 'Dependency group', copy: 'Putative spouse, stepchildren, and parents who were financially dependent.' },
      { label: 'Survival action', copy: 'Brought by the personal representative or successor in interest.' },
    ],
    settlementDrivers: [
      'Whether a spouse, domestic partner, or children survive',
      'Whether anyone was financially dependent on the deceased',
      'What intestate succession dictates when no primary heirs exist',
      'Whether a personal representative has been appointed',
      'Whether claimants compete or overlap',
      'How quickly eligibility is resolved within the deadline',
    ],
    settlementValueDetails: [
      { label: 'Standing is defined', copy: 'Only a specific group may sue; closeness alone is not enough.' },
      { label: 'Dependency unlocks a tier', copy: 'Parents and stepchildren may qualify if they relied on the deceased.' },
      { label: 'One joint action', copy: 'Eligible heirs generally bring a single claim, apportioned afterward.' },
      { label: 'Estate claim is separate', copy: 'The survival action is brought by the representative, not the family directly.' },
    ],
    insuranceProblems: [
      'A claim is brought by someone without standing and challenged.',
      'An eligible heir is omitted from the joint action and disputes it later.',
      'No personal representative is appointed and the survival claim stalls.',
      'A dependency-based claimant is wrongly assumed to have no standing.',
      'Eligibility work consumes the deadline because it started late.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did the deceased leave a spouse, domestic partner, or children?' },
      { label: 'Step 2', question: 'Was anyone financially dependent on the deceased?' },
      { label: 'Step 3', question: 'Has a personal representative been appointed for the estate?' },
      { label: 'Step 4', question: 'Are there other relatives who might also claim?' },
    ],
  },
}
