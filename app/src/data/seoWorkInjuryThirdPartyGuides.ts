import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * Third-party work-injury guides — deliberately scoped.
 *
 * The content-gap matrix flagged that most "workplace injury" keywords are
 * workers'-compensation (exclusive-remedy) queries a personal-injury
 * marketplace cannot route. This hub covers ONLY the part that fits: a
 * third-party liability claim, i.e. a lawsuit against someone other than the
 * employer whose negligence caused a work injury. Every page states plainly
 * that workers' compensation is generally the exclusive remedy against the
 * employer, and that the value of a third-party claim is what it adds on top of
 * comp — pain and suffering, full lost earnings, loss of consortium — subject to
 * the comp carrier's reimbursement lien.
 *
 * California specifics: workers' comp exclusivity (Labor Code section 3602);
 * two-year personal-injury deadline for the third-party claim (Code of Civil
 * Procedure section 335.1), six months if a public entity is the third party;
 * the comp lien / credit that lets the carrier recover benefits from the
 * third-party recovery.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. Workers\u2019 compensation is generally the exclusive remedy against an employer; a third-party claim is separate, and both turn on facts a licensed California attorney can review.'

export const WORK_SUE_SLUG = '/can-i-sue-a-third-party-for-a-work-injury-in-california'
export const WORK_VALUE_SLUG = '/workers-comp-vs-third-party-claim-in-california'
export const WORK_HIRE_SLUG = '/do-i-need-a-lawyer-for-a-third-party-work-injury-in-california'

export const workInjuryThirdPartyGuidePages: LandingPage[] = [
  {
    slug: WORK_SUE_SLUG,
    category: 'Liability',
    cluster: 'Third-Party Work Injury',
    title: 'Can I Sue a Third Party for a Work Injury in California?',
    eyebrow: 'Third-party work injury',
    description:
      'You generally cannot sue your employer — workers\u2019 comp is the exclusive remedy — but you can sue a third party whose negligence caused your work injury: a driver, a subcontractor, a property owner, or an equipment maker. That claim recovers what comp does not.',
    psychology: 'I was hurt at work and want to know if I can do more than workers\u2019 comp.',
    cta: 'Check If You Have a Claim',
    exampleQueries: [
      'can I sue someone other than my employer for a work injury California',
      'can I sue a third party for a work injury California',
      'work injury caused by another company California',
      'third party lawsuit work injury California',
    ],
    signals: [
      'Workers\u2019 comp exclusivity',
      'Non-employer at fault',
      'Negligent driver',
      'Subcontractor / GC',
      'Property owner',
      'Defective equipment',
    ],
    sections: {
      whyItMatters:
        'A work injury in California usually starts and often ends with workers\u2019 compensation, and it is important to be clear-eyed about why. Workers\u2019 comp is a no-fault system: you get medical care and wage benefits regardless of fault, and in exchange it is generally the exclusive remedy against your employer — meaning you ordinarily cannot sue your own employer for negligence, even if the employer was careless. That exclusivity is the rule, with only narrow exceptions. But it applies only to the employer. When someone other than your employer caused or contributed to your injury, you may have a separate third-party claim — an ordinary personal-injury lawsuit against that party — that you can pursue at the same time as your comp claim. This is where a personal-injury marketplace fits, and the scenarios are common on and off the jobsite. If you were driving for work and a negligent driver hit you, that driver is a third party. On a construction site, workers are frequently employed by different companies, so a subcontractor, the general contractor, or the property owner whose negligence injured you is a third party even though your own employer is not suable. If a defective machine or tool caused the injury, its manufacturer is a third party under product-liability rules. A negligent contractor doing work on the premises, a delivery company, or another business can each be a third party. The reason this matters so much is what a third-party claim recovers that comp does not. Workers\u2019 comp pays medical bills and a portion of lost wages, but it pays nothing for pain and suffering, nothing for the full value of lost earnings beyond its formulas, and nothing for a spouse\u2019s loss of consortium. A third-party claim, being a full personal-injury case, reaches all of those. The two systems interact through a lien: the comp carrier that paid your benefits generally has a right to be reimbursed out of your third-party recovery, so the claims are coordinated rather than duplicative — but even after the lien, a third-party claim frequently adds substantial value comp alone can never provide. The first question after a serious work injury is therefore not only whether comp applies, but whether anyone other than the employer was at fault.',
      whatToTrack: [
        'Whether anyone other than your employer contributed to the injury',
        'Whether you were driving for work when another driver hit you',
        'Whether other companies\u2019 workers or a general contractor were involved',
        'Whether a property owner or another business controlled the hazard',
        'Whether a machine, tool, or product failed',
        'What workers\u2019 comp benefits have been paid (for the lien)',
        'The date of the injury, for the third-party deadline',
        'Whether any third party is a government entity',
      ],
      howClearCaseHelps:
        `ClearCaseIQ is built for the part of a work injury that a personal-injury claim can reach: it screens for whether anyone other than the employer was at fault, because that third-party claim is what adds pain and suffering and full lost earnings on top of comp. It keeps the employer-exclusivity rule clear and tracks the comp benefits that will bear on the lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue my employer for a work injury in California?',
        a: 'Generally no. Workers\u2019 compensation is the exclusive remedy against your employer, so you ordinarily cannot sue the employer for negligence even if it was careless — you receive no-fault comp benefits instead. There are only narrow exceptions. But this exclusivity applies only to the employer, not to other parties who caused your injury.',
      },
      {
        q: 'Who counts as a third party I can sue?',
        a: 'Anyone other than your employer whose negligence caused or contributed to the injury: a driver who hit you while you were working, a subcontractor or general contractor on a multi-employer jobsite, a property owner, another business on the premises, or the manufacturer of a defective machine or tool. Each can be pursued in a separate personal-injury claim.',
      },
      {
        q: 'Can I pursue workers\u2019 comp and a third-party claim at the same time?',
        a: 'Yes. They are separate and can proceed together — comp provides no-fault medical and wage benefits from your employer\u2019s carrier, while the third-party claim seeks full damages from the at-fault non-employer. They are coordinated through a lien, but pursuing both is normal and often necessary to be made whole.',
      },
      {
        q: 'What does a third-party claim get me that comp does not?',
        a: 'The things comp never pays: compensation for pain and suffering, the full value of lost earnings beyond comp\u2019s formulas, and a spouse\u2019s loss of consortium. Because a third-party claim is a full personal-injury case, it reaches these categories, which is why it often adds substantial value even after the comp lien is repaid.',
      },
      {
        q: 'What if a defective machine caused my injury?',
        a: 'The manufacturer (and sometimes others in the distribution chain) can be a third party under product-liability rules, which in California can impose strict liability for a defective product. That is a claim against the maker, separate from your employer and from comp, and it can be significant where a machine or tool failed and caused serious harm.',
      },
    ],
  },
  {
    slug: WORK_VALUE_SLUG,
    category: 'Settlement',
    cluster: 'Work Injury Claim Value',
    title: 'Workers\u2019 Comp vs. Third-Party Claim in California: What Each Pays',
    eyebrow: 'Comp vs. third-party value',
    description:
      'Workers\u2019 comp pays medical care and part of your wages, no matter who was at fault. A third-party claim adds what comp never pays — pain and suffering and full lost earnings — but the comp carrier can claim a lien on that recovery.',
    psychology: 'I want to understand what my work injury is worth beyond workers\u2019 comp.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'workers comp vs third party claim California',
      'how much more is a third party work injury claim worth',
      'does workers comp pay pain and suffering California',
      'workers comp lien on third party settlement California',
    ],
    signals: [
      'Comp: no-fault, no pain/suffering',
      'Third-party: full damages',
      'Comp lien / credit',
      'Full lost earnings',
      'Loss of consortium',
      'Lien negotiation',
    ],
    sections: {
      whyItMatters:
        'The value of a work injury depends on which of two very different systems is paying, and the biggest mistake injured workers make is assuming comp is all there is. Workers\u2019 compensation is a no-fault benefit system: it pays your medical treatment and a portion of your lost wages (temporary and permanent disability, on statutory formulas) regardless of who was at fault, and it pays promptly for exactly that. What it does not pay is just as important — comp provides nothing for pain and suffering, nothing for the emotional toll of a serious injury, nothing for the full value of your lost earnings beyond its capped formulas, and nothing for your spouse\u2019s loss of consortium. For a minor injury, comp alone may be adequate. For a serious one, it systematically under-compensates the real losses, because the largest human costs of a bad injury are exactly the ones comp excludes. A third-party claim fills that gap. Where a non-employer\u2019s negligence caused the injury, the third-party lawsuit is a full personal-injury case, so it reaches the categories comp cannot: pain and suffering, the full measure of past and future lost earnings and earning capacity, and loss of consortium, in addition to medical costs. That is why, in a serious injury with a liable third party, the third-party claim is frequently worth far more than the comp benefits. The interaction between the two is the comp lien (or credit). Because it would be a double recovery to collect both comp benefits and third-party damages for the same medical bills and wage loss, the comp carrier that paid your benefits generally has a right to be reimbursed out of the third-party recovery for what it paid. This sounds like it cancels the advantage, but it does not, for two reasons. First, the lien attaches mainly to the overlapping categories (medical and wage benefits), not to the pain-and-suffering and other damages that comp never paid, so much of the third-party recovery is not subject to it. Second, the lien is frequently negotiable and can be reduced, including to account for the injured worker\u2019s attorney fees and for comparative fault. The practical result is that the value question for a serious work injury is really two questions: what comp will provide, and what a third-party claim adds on top after the lien — and for a badly injured worker with a liable third party, the second number is usually the one that matters.',
      whatToTrack: [
        'The full medical cost, past and future',
        'The full value of lost earnings and earning capacity',
        'The pain-and-suffering impact comp does not pay',
        'Any spouse\u2019s loss of consortium',
        'What comp benefits have been paid (the lien amount)',
        'Whether the lien can be reduced for fees and comparative fault',
        'Whether a liable third party exists at all',
      ],
      howClearCaseHelps:
        `ClearCaseIQ frames a work injury the way its value actually splits: what workers\u2019 comp provides no matter what, and what a third-party claim adds — pain and suffering, full lost earnings, loss of consortium — that comp never pays. It tracks the benefits paid so the lien is understood, and keeps the focus on the added value a third-party recovery brings after the lien. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Does workers\u2019 comp pay for pain and suffering?',
        a: 'No. Workers\u2019 comp pays medical care and a portion of lost wages on statutory formulas, but nothing for pain and suffering, the emotional toll, or a spouse\u2019s loss of consortium. Those are only recoverable through a third-party claim against a non-employer whose negligence caused the injury, which is why a serious injury often needs both.',
      },
      {
        q: 'How much more is a third-party claim worth than comp?',
        a: 'There is no fixed multiple, but for a serious injury it is frequently worth substantially more, because it reaches pain and suffering, the full value of lost earnings beyond comp\u2019s caps, and loss of consortium. The added value depends on the severity of the injury and the third party\u2019s liability and coverage, not on any average.',
      },
      {
        q: 'What is a workers\u2019 comp lien on a third-party settlement?',
        a: 'It is the comp carrier\u2019s right to be reimbursed out of your third-party recovery for the benefits it paid, so you do not recover twice for the same medical bills and wage loss. It attaches mainly to those overlapping categories, not to your pain-and-suffering damages, and it can often be negotiated down for attorney fees and comparative fault.',
      },
      {
        q: 'Does the lien cancel out the benefit of a third-party claim?',
        a: 'No. The lien applies mainly to the medical and wage categories comp already paid, leaving the pain-and-suffering and other damages comp never covered largely untouched. Combined with the fact that the lien is frequently reduced, a third-party claim usually adds meaningful value even after reimbursement.',
      },
      {
        q: 'Can I keep my comp benefits if I bring a third-party claim?',
        a: 'Yes. The claims are separate and run together — you continue receiving comp benefits from your employer\u2019s carrier while pursuing the third-party lawsuit. The coordination happens at the end through the lien, which reconciles the overlapping amounts rather than forcing you to choose between the two.',
      },
    ],
  },
  {
    slug: WORK_HIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Third-Party Work Injury Hiring',
    title: 'Do I Need a Lawyer for a Third-Party Work Injury in California?',
    eyebrow: 'Hiring an attorney',
    description:
      'A third-party work-injury claim runs alongside workers\u2019 comp, involves a comp lien that has to be managed, and a two-year deadline separate from comp\u2019s. A contingency-fee lawyer costs nothing up front and coordinates both so the recovery is not eaten by the lien.',
    psychology: 'I want to know whether a third-party work injury claim needs a lawyer.',
    cta: 'Get Matched With a Work Injury Lawyer',
    exampleQueries: [
      'do I need a lawyer for a third party work injury California',
      'work injury lawyer vs workers comp attorney California',
      'how long do I have to file a third party work injury claim California',
      'third party work injury attorney California',
    ],
    signals: [
      'Comp + third-party coordination',
      'Lien management',
      'Two-year deadline',
      'Serious injury',
      'Multiple parties',
      'Contingency fee',
    ],
    sections: {
      whyItMatters:
        'A third-party work-injury claim is one where a lawyer\u2019s value is concrete and easy to see, because the claim has moving parts that comp alone does not. First, the two systems have to be coordinated. You have a workers\u2019 comp claim (usually handled by a comp attorney or the carrier) and a separate third-party lawsuit, and how they are managed together affects the net recovery — most importantly through the comp lien, which the carrier will assert on your third-party settlement. Reducing that lien is skilled work: it can be lowered to account for your attorney fees and for any comparative fault, and the difference between a lien paid in full and a well-negotiated one can be a large share of what you actually keep. An unrepresented worker rarely knows the lien is negotiable at all. Second, the deadlines differ. The third-party personal-injury claim generally runs on the two-year deadline (six months if the third party is a public entity), which is separate from the comp system\u2019s own filing rules — and it is easy for a worker focused on the comp process to let the third-party deadline slip, permanently losing the only claim that pays for pain and suffering. Third, third-party work injuries often involve multiple potential defendants, especially on construction sites where several companies share a jobsite, and identifying every negligent party and its insurance is exactly the work that expands a claim. Fourth, these are full personal-injury cases with serious injuries, and valuing future medical care, lost earning capacity, and pain and suffering correctly is not something the comp framework prepares a worker to do. The economics make getting help straightforward: third-party lawyers work on contingency — nothing up front, a percentage of the recovery, case costs advanced and repaid from it, and no fee if there is no recovery — and because the claim adds value on top of comp, representation is typically additive rather than a cost against benefits you would have received anyway. There is little downside to a free review: if no third party was at fault, you lose nothing by asking, and if one was, the claim, the lien strategy, and the deadline are all things you want handled before the two years run. Almost any serious work injury with a potentially liable non-employer warrants at least an evaluation.',
      whatToTrack: [
        'Whether a non-employer was at fault (the threshold question)',
        'What comp benefits have been paid, for the lien',
        'Whether the lien can be reduced for fees and comparative fault',
        'The date of the injury, for the two-year third-party deadline',
        'Whether any third party is a public entity (six-month clock)',
        'Whether multiple companies or defendants are involved',
        'The severity and permanence of the injury',
        'Any early third-party offer and its adequacy',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps you judge whether a third-party work-injury claim is worth pursuing alongside comp, and flags the two things that most often erode these recoveries: an unmanaged comp lien and a missed two-year deadline. When a third party was at fault, it matches you with California attorneys who work on contingency and coordinate the third-party claim with your comp case. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need a lawyer for a third-party work injury claim?',
        a: 'For a serious injury with a potentially liable non-employer, almost always. The third-party claim has to be coordinated with your comp case, the comp lien has to be managed and often negotiated down, the two-year deadline is separate from comp\u2019s, and multiple defendants may be involved. A free review costs nothing and confirms whether a third party was at fault.',
      },
      {
        q: 'How is a work injury lawyer different from a workers\u2019 comp attorney?',
        a: 'A workers\u2019 comp attorney handles the no-fault benefits claim against your employer\u2019s carrier. A third-party (personal-injury) lawyer handles the separate lawsuit against a negligent non-employer for full damages, including pain and suffering. Serious cases often involve both, working together, because the comp claim and the third-party claim interact through the lien.',
      },
      {
        q: 'How long do I have to file a third-party work injury claim in California?',
        a: 'Generally two years from the injury for the third-party personal-injury claim, or six months if the third party is a public entity. This is separate from the workers\u2019 comp filing rules, and it is easy to miss while focused on the comp process — which permanently loses the only claim that pays for pain and suffering.',
      },
      {
        q: 'Will a lawyer\u2019s fee and the lien leave me with anything?',
        a: 'Usually yes, and often substantially more than comp alone. The lien attaches mainly to the medical and wage categories comp paid, not to your pain-and-suffering damages, and it can be reduced for attorney fees and comparative fault. Because the third-party claim adds value on top of comp, representation is typically additive rather than a cost against benefits you would have received anyway.',
      },
      {
        q: 'How much does a third-party work injury lawyer cost?',
        a: 'Typically nothing up front. These lawyers work on contingency — a percentage of the recovery, with case costs advanced and repaid from it, and no fee if there is no recovery. Being evaluated is free, and because the claim is additive to comp, the fee comes from a recovery you would not otherwise have.',
      },
    ],
  },
]

export const workInjuryThirdPartyGuideTopicContentBySlug: Record<string, TopicContent> = {
  [WORK_SUE_SLUG]: {
    scenario: `A worker was crushed by a load dropped by a different company\u2019s crane operator on a shared jobsite. Comp covered his bills and part of his wages against his own employer, but the third-party claim against the crane operator\u2019s company reached the pain, suffering, and full lost earnings comp never pays. ${NOT_ADVICE}`,
    timeline: [
      ['Open comp', 'No-fault benefits from the employer\u2019s carrier begin.'],
      ['Identify third parties', 'Anyone but the employer who was at fault.'],
      ['Pursue both', 'Comp and the third-party claim run together.'],
      ['Coordinate the lien', 'Reconcile overlapping amounts at the end.'],
    ],
    severityLadder: [
      ['Comp only', 'No third party at fault; comp is the remedy.'],
      ['Third party present', 'A non-employer\u2019s negligence contributed.'],
      ['Multiple defendants', 'A shared jobsite with several companies.'],
      ['Product involved', 'A defective machine adds a manufacturer.'],
    ],
    treatmentProgression: [
      { label: 'Employer', copy: 'Comp is the exclusive remedy; generally cannot be sued.' },
      { label: 'Negligent driver', copy: 'A third party if you were driving for work.' },
      { label: 'Other companies', copy: 'Subcontractors, GC, or property owner on a jobsite.' },
      { label: 'Manufacturer', copy: 'A defective machine or tool under product liability.' },
    ],
    settlementDrivers: [
      'Whether a non-employer was at fault',
      'How the injury happened and who controlled the hazard',
      'Whether multiple companies shared the site',
      'Whether a machine or product failed',
      'The severity of the injury',
      'What comp has paid, for the lien',
    ],
    settlementValueDetails: [
      { label: 'Employer is off-limits', copy: 'Comp exclusivity bars suing your own employer.' },
      { label: 'Third parties are not', copy: 'Non-employers who were negligent can be sued.' },
      { label: 'Both can run together', copy: 'Comp and the third-party claim proceed at once.' },
      { label: 'Third-party adds value', copy: 'It reaches what comp never pays.' },
    ],
    insuranceProblems: [
      'The worker is told comp is the only option.',
      'A liable third party is never identified.',
      'A shared-site defendant is overlooked.',
      'A defective machine\u2019s maker is never pursued.',
      'The two-year third-party deadline slips during the comp process.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Did anyone other than your employer contribute to the injury?' },
      { label: 'Step 2', question: 'Were other companies working at the same site?' },
      { label: 'Step 3', question: 'Did a machine, tool, or vehicle fail or cause the injury?' },
      { label: 'Step 4', question: 'Were you driving for work when it happened?' },
    ],
  },
  [WORK_VALUE_SLUG]: {
    scenario: `Two injured workers with identical comp benefits ended up very differently. One had no third party at fault and received comp alone. The other was hurt by a negligent contractor; his third-party claim added pain, suffering, and full lost earnings, and even after the comp lien he recovered far more. ${NOT_ADVICE}`,
    timeline: [
      ['Comp pays first', 'Medical and partial wages, no fault required.'],
      ['Add the third-party claim', 'Full damages from the at-fault non-employer.'],
      ['Value the gap', 'Pain, suffering, and full earnings comp excludes.'],
      ['Resolve the lien', 'Reduce and reconcile the carrier\u2019s reimbursement.'],
    ],
    severityLadder: [
      ['Minor injury', 'Comp alone may be adequate.'],
      ['Serious injury', 'Comp under-compensates; third-party adds a lot.'],
      ['Permanent injury', 'Large uncapped earnings and pain-and-suffering value.'],
      ['Lien-heavy', 'High comp benefits paid; lien strategy matters most.'],
    ],
    treatmentProgression: [
      { label: 'Comp: medical', copy: 'Treatment paid regardless of fault.' },
      { label: 'Comp: wages', copy: 'A portion of lost wages on statutory formulas.' },
      { label: 'Third-party: pain', copy: 'Pain and suffering comp never pays.' },
      { label: 'Third-party: full earnings', copy: 'Lost earnings beyond comp\u2019s caps, plus consortium.' },
    ],
    settlementDrivers: [
      'The full medical and future-care cost',
      'The full value of lost earnings',
      'The pain-and-suffering impact',
      'Any loss of consortium',
      'What comp has paid, for the lien',
      'Whether the lien can be reduced',
    ],
    settlementValueDetails: [
      { label: 'Comp excludes pain', copy: 'The largest human costs are outside comp.' },
      { label: 'Third-party reaches them', copy: 'A full PI case covers what comp cannot.' },
      { label: 'Lien is limited', copy: 'It attaches mainly to overlapping categories.' },
      { label: 'Lien is negotiable', copy: 'It can be reduced for fees and comparative fault.' },
    ],
    insuranceProblems: [
      'Comp is presented as full compensation.',
      'Pain and suffering is never valued.',
      'The lien is assumed to consume the recovery.',
      'Future earning capacity is understated.',
      'The worker is discouraged from a third-party claim.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How serious and lasting is the injury?' },
      { label: 'Step 2', question: 'How does it affect your ability to earn?' },
      { label: 'Step 3', question: 'What comp benefits have been paid so far?' },
      { label: 'Step 4', question: 'Was a non-employer responsible for the injury?' },
    ],
  },
  [WORK_HIRE_SLUG]: {
    scenario: `A worker with a clear third-party claim almost accepted an early offer that ignored his comp lien and his future surgery. A lawyer coordinated the comp and third-party claims, negotiated the lien down for fees and comparative fault, and filed before the two-year deadline he had nearly missed. ${NOT_ADVICE}`,
    timeline: [
      ['After the injury', 'Comp begins; ask whether a third party was at fault.'],
      ['Coordinate', 'Manage comp and the third-party claim together.'],
      ['Manage the lien', 'Negotiate the carrier\u2019s reimbursement down.'],
      ['Before the deadline', 'File the third-party claim within two years.'],
    ],
    severityLadder: [
      ['Comp only', 'No third party; a comp attorney may be enough.'],
      ['Get a review', 'Any sign a non-employer was at fault.'],
      ['Get representation', 'Serious injury with a liable third party.'],
      ['Move quickly', 'A public-entity third party or a nearing deadline.'],
    ],
    treatmentProgression: [
      { label: 'Contingency fee', copy: 'Nothing up front; costs advanced; no fee if no recovery.' },
      { label: 'Coordination', copy: 'Managing comp and the third-party claim together.' },
      { label: 'Lien reduction', copy: 'Lowering the carrier\u2019s reimbursement for fees and fault.' },
      { label: 'Deadline control', copy: 'Filing within the separate two-year window.' },
    ],
    settlementDrivers: [
      'Whether a non-employer was at fault',
      'The severity and permanence of the injury',
      'What comp has paid, for the lien',
      'Whether the lien can be reduced',
      'Whether multiple defendants exist',
      'The two-year third-party deadline',
    ],
    settlementValueDetails: [
      { label: 'Additive to comp', copy: 'The third-party claim adds value you would not otherwise have.' },
      { label: 'Lien strategy matters', copy: 'A negotiated lien can be a large share of the net.' },
      { label: 'Deadlines differ', copy: 'The two-year clock is separate from comp\u2019s rules.' },
      { label: 'Free to be evaluated', copy: 'A contingency review costs only time.' },
    ],
    insuranceProblems: [
      'An early offer ignores the lien and future care.',
      'The lien is paid in full without negotiation.',
      'The two-year deadline slips during the comp process.',
      'Additional defendants are never pursued.',
      'A serious injury is valued on comp\u2019s formulas alone.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was a non-employer responsible for your injury?' },
      { label: 'Step 2', question: 'When did the injury happen?' },
      { label: 'Step 3', question: 'What comp benefits have been paid?' },
      { label: 'Step 4', question: 'Was any at-fault party a government entity?' },
    ],
  },
}
