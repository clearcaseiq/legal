import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The three attorney-decision guides.
 *
 * Replaces five pages generated from one seed — every field but the title and
 * one clause of the description was identical, scoring 0.845 similarity. The
 * five titles were only three questions: two asked whether and when to hire,
 * two asked what it costs, and one asked about changing firms.
 *
 * `/when-to-hire-a-lawyer-after-accident` survives rather than the arguably
 * better-phrased `/do-i-need-a-lawyer-after-a-car-accident` because it is the
 * English half of an hreflang pair with `/es/cuando-contratar-un-abogado`.
 * Retiring it would have broken the alternate.
 *
 * Deliberately distinct from `/case-strength`, which asks whether an attorney
 * would take the case. These ask whether you want one, what they cost, and what
 * happens if you change your mind — decisions that belong to the claimant.
 */

export const HIRING_SLUG = '/when-to-hire-a-lawyer-after-accident'
export const FEES_SLUG = '/how-much-do-personal-injury-lawyers-charge'
export const SWITCHING_SLUG = '/can-i-switch-lawyers-during-my-case'

export const attorneyGuidePages: LandingPage[] = [
  {
    slug: HIRING_SLUG,
    category: 'Attorney Intent',
    cluster: 'Whether and When to Hire',
    title: 'Do You Need a Lawyer After an Accident?',
    eyebrow: 'Attorney decision guide',
    description:
      'Not every claim needs one. The question is not how badly you were hurt but whether anything about your claim is genuinely in dispute — because that is what representation changes, and it is the only thing that reliably offsets the fee.',
    psychology: 'I am trying to work out whether hiring someone is worth it.',
    cta: 'See What My Claim Involves',
    exampleQueries: [
      'do i need a lawyer after a car accident',
      'when should i hire a personal injury attorney',
      'is it worth getting a lawyer for a minor accident',
      'can i settle a car accident claim myself',
    ],
    signals: [
      'Disputed liability',
      'Ongoing treatment',
      'Policy limits in play',
      'Commercial or government defendant',
      'Offer before treatment ends',
      'Deadline pressure',
    ],
    sections: {
      whyItMatters:
        'The honest answer is that a lot of claims do not need a lawyer, and the industry rarely says so. If liability is admitted, your injury resolved in a few weeks, the bills are small and undisputed, and the offer is roughly the bills plus something for the inconvenience, you are unlikely to do better net of a contingency fee. A third of a slightly larger number can be less than all of a smaller one, and that arithmetic is the whole decision on a straightforward claim. What changes it is dispute. Representation is worth what it costs when something is genuinely contested — when fault is denied or shared, when the insurer argues your injury came from somewhere else, when treatment is still ongoing so nobody yet knows what the claim is worth, when the policy limits are low enough that they cap a serious injury, or when there is more than one possible source of recovery. Those are the situations where the gap between a represented and unrepresented outcome is wide enough to cover a fee and then some. Two more considerations are worth separating out. The first is timing: the decision gets harder to reverse the longer you wait, because a recorded statement, an early release, or a missed deadline cannot be undone by counsel hired afterwards. The second is that some claims are difficult for structural reasons rather than because anyone is behaving badly — a government defendant with a short claim deadline, a commercial policy with layers, a minor whose settlement needs court approval, or a fatality. Those are worth a consultation regardless of how cooperative the adjuster has been.',
      whatToTrack: [
        'Whether the other side has accepted fault, denied it, or said nothing yet',
        'Whether you are still treating, and whether a provider has raised surgery or a specialist referral',
        'Every offer made, the date it arrived, and whether treatment was finished at that point',
        'Whether a recorded statement has been requested or given, and what was asked',
        'The at-fault policy limits, and your own uninsured and underinsured motorist coverage',
        'Whether a government entity, employer, or commercial vehicle is involved',
        'Any deadline you have been told about, and any that follows from who the defendant is',
        'Total billed charges and any lien or health-plan reimbursement claim asserted so far',
      ],
      howClearCaseHelps:
        'Most consultations start with a claimant recounting events from memory while the person opposite tries to work out whether anything is in dispute. ClearCaseIQ organises the facts that answer that first — liability position, treatment status, offers and their timing, coverage, and deadlines — so the conversation starts from a file rather than a recollection. That is useful whether or not you end up hiring anyone, because the same organisation is what you need to handle a claim yourself.',
    },
    faqs: [
      {
        q: 'Is it worth hiring a lawyer for a minor accident?',
        a: 'Often not. Where fault is admitted, treatment is short, bills are modest and undisputed, and the offer is reasonable, a contingency fee can leave you with less than handling it yourself. The calculation changes as soon as something is contested or the injury turns out to be lasting.',
      },
      {
        q: 'How long can I wait before deciding?',
        a: 'Longer than most advertising suggests, but not indefinitely. The constraint is not the filing deadline so much as the things that become irreversible sooner: a recorded statement, a signed release, or a claim against a government entity, which typically carries a much shorter deadline than an ordinary injury claim.',
      },
      {
        q: 'Will the insurer treat me worse if I am not represented?',
        a: 'Adjusters generally settle unrepresented claims faster and for less, but that partly reflects the claims themselves, which tend to be smaller and simpler. The gap widens with complexity rather than being a fixed penalty.',
      },
      {
        q: 'Should I give a recorded statement to the other insurer?',
        a: 'You are generally not obliged to give one to the other side\u2019s insurer, as opposed to your own. Statements taken early, before the injury picture is complete, are routinely used later to argue the injury was minor or unrelated.',
      },
      {
        q: 'What if I already accepted an offer?',
        a: 'A signed release usually ends the claim, including for injuries that worsen afterwards. That is why an offer arriving before treatment is finished deserves attention even when the number looks reasonable.',
      },
      {
        q: 'Does hiring a lawyer mean going to court?',
        a: 'Usually not. Most claims resolve without trial, and filing suit is often a step taken to preserve a deadline or restart a stalled negotiation rather than a commitment to a courtroom.',
      },
    ],
  },
  {
    slug: FEES_SLUG,
    category: 'Attorney Intent',
    cluster: 'Attorney Fees and Net Recovery',
    title: 'How Much Do Personal Injury Lawyers Charge?',
    eyebrow: 'Fees and net recovery',
    description:
      'The percentage is the part everyone asks about and rarely the part that decides what you keep. Costs, liens, and whether the fee comes off the gross or the net can move the final figure more than a few points of contingency.',
    psychology: 'I want to know what I will actually keep.',
    cta: 'Understand My Claim',
    exampleQueries: [
      'how much do personal injury lawyers charge',
      'how much do lawyers take from a settlement',
      'what percentage do injury attorneys take',
      'contingency fee personal injury california',
    ],
    signals: [
      'Contingency percentage',
      'Pre-suit versus post-filing rate',
      'Case costs',
      'Fee on gross or net',
      'Medical liens',
      'Written fee agreement',
    ],
    sections: {
      whyItMatters:
        'A contingency fee means no hourly billing and no payment if there is no recovery, with the firm fronting the expenses in the meantime. Rates commonly sit around a third of the recovery before a lawsuit is filed and step up if the case is filed and worked through litigation, because the work and the risk both rise sharply at that point. In California a contingency agreement has to be in writing and you are entitled to a copy, which makes the agreement itself the document to read rather than a source of surprises later. The percentage is only the first of four things that determine what reaches you. The second is costs, which are separate from the fee and cover filing charges, obtaining records, deposition transcripts, and expert reports. On a small claim these are minor; on a case that goes to litigation with medical experts they can be substantial, and they are generally reimbursed from the recovery in addition to the fee. The third is the sequence, which matters more than most people expect: an agreement that takes the percentage from the gross recovery before costs produces a different number than one that deducts costs first and applies the percentage to what remains. It is a legitimate question to ask before signing. The fourth is liens. Health insurers, government programmes, and providers who treated on a letter of protection may all assert a right to be repaid, and those claims come out of your share. Negotiating them down is ordinary work in a personal injury practice and can affect your net as much as the fee does. One category is treated differently: medical malpractice claims are subject to a statutory sliding scale that caps attorney fees, which does not apply to ordinary injury claims.',
      whatToTrack: [
        'The percentage, and whether it changes if a lawsuit is filed or the case goes to trial',
        'Whether the fee is calculated on the gross recovery or after costs are deducted',
        'What counts as a case cost, and whether costs are owed if there is no recovery',
        'Every lien or reimbursement claim asserted, and by whom',
        'Whether health insurance has paid anything that a plan may seek back',
        'The written fee agreement itself, and your copy of it',
      ],
      howClearCaseHelps:
        'ClearCaseIQ organises billed charges, payments, and any asserted liens alongside the claim facts, which is what makes a net recovery estimable rather than hypothetical. Knowing the gross figure alone tells you very little; knowing the gross alongside costs, liens, and the fee structure tells you what the decision in front of you is actually worth.',
    },
    faqs: [
      {
        q: 'What percentage do personal injury lawyers usually take?',
        a: 'Around a third of the recovery is a common pre-suit rate, rising once a lawsuit is filed. The specific figures belong to the written agreement and vary between firms and case types.',
      },
      {
        q: 'What is the difference between fees and costs?',
        a: 'The fee is what the firm is paid for its work. Costs are the expenses of pursuing the claim — records, filing fees, depositions, experts — and are normally reimbursed from the recovery separately from the fee.',
      },
      {
        q: 'Do I owe anything if we lose?',
        a: 'Under a contingency agreement no fee is owed without a recovery. Whether costs are still owed depends on the agreement, which is one of the more important things to check before signing.',
      },
      {
        q: 'Why does my share look smaller than the percentage suggests?',
        a: 'Usually costs and liens. Medical liens in particular can be large where treatment was provided on a letter of protection or a health plan is seeking reimbursement, and they come out of the claimant\u2019s share rather than the fee.',
      },
      {
        q: 'Can attorney fees be negotiated?',
        a: 'Terms are set by agreement rather than fixed by law for ordinary injury claims, so they can be discussed. Medical malpractice is the exception, where a statutory sliding scale caps what may be charged.',
      },
      {
        q: 'Does a bigger settlement always mean a bigger net?',
        a: 'Not necessarily. A larger gross reached through litigation carries higher costs and often a higher fee percentage, so a case that settles earlier can occasionally leave the claimant with a comparable amount.',
      },
    ],
  },
  {
    slug: SWITCHING_SLUG,
    category: 'Attorney Intent',
    cluster: 'Changing Representation',
    title: 'Can I Switch Lawyers During My Case?',
    eyebrow: 'Changing representation',
    description:
      'You can discharge a lawyer at almost any point, and switching does not normally mean paying two full fees. What it does mean is a lien to resolve, a file to transfer, and a timing question that gets sharper the closer the case is to resolution.',
    psychology: 'I am unhappy with my representation and want to know what changing costs me.',
    cta: 'Organize My Case File',
    exampleQueries: [
      'can i switch lawyers during my case',
      'how to change personal injury attorneys',
      'will changing lawyers cost me more',
      'my lawyer is not communicating with me',
    ],
    signals: [
      'Attorney lien',
      'File transfer',
      'Stage of the case',
      'Communication breakdown',
      'Pending offer',
      'Approaching deadline',
    ],
    sections: {
      whyItMatters:
        'A client may generally discharge their attorney at any time, with or without a reason. The concern that stops most people is the fear of paying twice, and it is largely misplaced: the usual arrangement is that one contingency fee is paid on the eventual recovery and the two firms divide it between them, with the departing firm compensated for the value of the work it actually did. The mechanics are that the outgoing firm asserts a lien against the eventual recovery, and your file — the records, correspondence, and evidence — belongs to you and is transferred to new counsel. What genuinely changes with timing is how willing a new firm is to take the case. Early on, before much has been invested, a substitution is unremarkable. Late in a case, where most of the work is done and the lien is correspondingly large, a firm being asked to step in is taking over a claim where much of the available fee is already spoken for, and may decline for that reason alone. Just after an offer has been made is the hardest moment, because the value has largely been established and the remaining work is small relative to the lien. Before deciding, it is worth separating dissatisfaction from disagreement. Poor communication, unreturned calls, and never speaking to the person handling the file are real problems and often fixable by raising them directly. A difference of opinion about whether an offer is good is a different thing, and a second opinion is sometimes more useful than a substitution. Where the relationship has genuinely broken down, changing counsel is ordinary and does not prejudice the claim, but the deadline continues to run throughout and is unaffected by the transition.',
      whatToTrack: [
        'Your fee agreement with the current firm, including any provision about discharge',
        'What has actually been done on the file so far, and by whom',
        'Any offer outstanding, and when it was made',
        'The filing deadline, which does not pause while you change representation',
        'A written record of the communication problems, if that is the reason',
        'Whether a lawsuit has been filed, which affects how a substitution is handled',
      ],
      howClearCaseHelps:
        'A file that a new firm can evaluate quickly is what makes a substitution straightforward, and a disorganised one is what makes firms hesitant. ClearCaseIQ keeps records, bills, correspondence, and claim facts in one place under the claimant\u2019s control, so the material does not have to be reconstructed from whatever the previous firm sends across.',
    },
    faqs: [
      {
        q: 'Will I pay two attorney fees if I switch?',
        a: 'Normally no. One contingency fee is typically paid from the recovery and divided between the firms, with the departing firm compensated for the work it performed rather than the full agreed percentage.',
      },
      {
        q: 'Does my old firm have to give me my file?',
        a: 'The case file belongs to the client and is transferred to new counsel. Disputes about the fee lien are handled separately and are not usually a reason to withhold the file.',
      },
      {
        q: 'Is it too late to change if a settlement has been offered?',
        a: 'It is the most difficult moment to change, and not because you lose the right to. A firm asked to take over after the value is largely established faces a substantial lien against a small amount of remaining work, and may decline for that reason.',
      },
      {
        q: 'What if my lawyer simply will not return my calls?',
        a: 'That is a legitimate complaint and worth raising in writing first, since it is often a capacity problem rather than a judgement about your case. Where it persists it is among the more common and more justified reasons for changing.',
      },
      {
        q: 'Does switching restart my deadline?',
        a: 'No. The filing deadline runs from the incident regardless of who represents you, and a transition between firms does not extend it. That is the main practical risk in leaving the change late.',
      },
    ],
  },
]

export const attorneyGuideTopicContentBySlug: Record<string, TopicContent> = {
  [HIRING_SLUG]: {
    scenario:
      'A claimant with a rear-end collision, admitted fault, six weeks of physical therapy and about four thousand dollars in bills was offered a figure that covered the bills and a little more. Two firms would have taken it on contingency. Handled directly, after the therapy notes were sent across, the claim settled for somewhat more than the original offer and the claimant kept all of it. The same claimant would have been advised differently had the insurer disputed fault or had the therapy led to an injection.',
    timeline: [
      ['First days', 'Fault position and the insurer\u2019s opening posture become visible. A request for a recorded statement usually arrives in this window.'],
      ['During treatment', 'The claim cannot be valued while the medical picture is unsettled. Offers arriving here are the ones worth the most scrutiny.'],
      ['Treatment concludes', 'Bills, wage loss and any lasting restriction are finally quantifiable, and the claim can be assessed honestly.'],
      ['Negotiation', 'The gap between a represented and unrepresented outcome shows up here, and is widest where something is genuinely disputed.'],
    ],
    severityLadder: [
      ['Straightforward', 'Fault admitted, short treatment, modest undisputed bills, sensible offer. Often handled directly at no net disadvantage.'],
      ['Worth a consultation', 'Treatment continuing, an offer already made, or the insurer questioning causation. Consultations are typically free.'],
      ['Contested', 'Fault denied or apportioned, causation disputed, or an offer well below documented losses.'],
      ['Structurally complex', 'Government or commercial defendant, layered policies, a minor requiring court approval, catastrophic injury, or a fatality.'],
    ],
    treatmentProgression: [
      { label: 'Is anything disputed?', copy: 'The single most useful question. Representation changes contested outcomes far more than uncontested ones.' },
      { label: 'Is the picture complete?', copy: 'A claim cannot be valued mid-treatment, which is why early offers deserve attention regardless of size.' },
      { label: 'What is the net?', copy: 'Compare the likely represented outcome after fee, costs and liens against the likely unrepresented one.' },
      { label: 'What is irreversible?', copy: 'Statements, releases and short government deadlines cannot be undone by counsel hired later.' },
    ],
    settlementDrivers: [
      'Liability denied, shared, or still unstated',
      'Treatment ongoing, or a surgical recommendation raised',
      'An offer made before the medical picture was complete',
      'Policy limits low relative to the documented injury',
      'A commercial, government, or multi-party defendant',
      'A deadline shorter than the ordinary one because of who is involved',
    ],
    settlementValueDetails: [
      { label: 'Dispute, not severity', copy: 'Severity raises the stakes, but it is contest that representation changes. A serious injury with everything agreed can still be straightforward.' },
      { label: 'The net comparison', copy: 'A third of a larger number can be less than all of a smaller one. On simple claims that is the entire decision.' },
      { label: 'Consultations cost nothing', copy: 'Initial consultations are typically free, so uncertainty is cheap to resolve and rarely worth agonising over.' },
      { label: 'Timing is asymmetric', copy: 'Deciding later is usually fine. Deciding after a statement, a release, or a missed government deadline often is not.' },
    ],
    insuranceProblems: [
      'A recorded statement is requested early, before the injury picture is known.',
      'An offer with a release attached arrives while treatment is still ongoing.',
      'Causation is questioned by reference to a prior injury or a gap in treatment.',
      'Comparative fault is raised without any evidence being identified.',
      'Policy limits are not disclosed, so the claim is negotiated blind.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Has the other side accepted fault, denied it, or said nothing?' },
      { label: 'Step 2', question: 'Is your treatment finished, or is anything still being investigated?' },
      { label: 'Step 3', question: 'Has an offer been made, and was treatment complete when it arrived?' },
      { label: 'Step 4', question: 'Is a government entity, employer, or commercial vehicle involved?' },
    ],
  },
  [FEES_SLUG]: {
    scenario:
      'Two claimants recovered a hundred thousand dollars each. The first settled before suit at a third, with two thousand in costs and a health plan repaid nine thousand, and kept about fifty-six thousand. The second went through litigation at a higher post-filing rate with twenty-one thousand in expert and deposition costs, and kept less despite the identical gross. The number that mattered was never the percentage.',
    timeline: [
      ['Signing', 'The written agreement fixes the percentage, whether it rises after filing, and how costs are treated. It is the document to read closely.'],
      ['Investigation', 'Costs begin accruing — records, reports, sometimes an early expert. Modest at this stage.'],
      ['Filing', 'Where a case is filed the fee percentage commonly steps up and costs rise sharply, because the work and the risk both do.'],
      ['Disbursement', 'The fee, the costs, and every lien come out of the gross, and what remains is the figure that was always the point.'],
    ],
    severityLadder: [
      ['Pre-suit settlement', 'Lowest percentage, minimal costs, fastest disbursement. Most claims end here.'],
      ['Filed but settled', 'Higher percentage and meaningful costs — filing fees, depositions, records.'],
      ['Litigated with experts', 'Expert reports and testimony are the largest single cost category and can reach five figures.'],
      ['Tried', 'The highest percentage and the highest costs, justified only where the gap between offer and value is wide enough.'],
    ],
    treatmentProgression: [
      { label: 'The percentage', copy: 'Commonly about a third pre-suit, stepping up if a lawsuit is filed. Set by the written agreement.' },
      { label: 'The costs', copy: 'Separate from the fee. Records, filing, depositions, experts — reimbursed from the recovery.' },
      { label: 'The sequence', copy: 'Whether the percentage applies before or after costs are deducted changes the result. Ask before signing.' },
      { label: 'The liens', copy: 'Health plans, government programmes and providers on a letter of protection are repaid from the claimant\u2019s share.' },
    ],
    settlementDrivers: [
      'Whether the case settles before or after a lawsuit is filed',
      'Whether expert testimony is required',
      'Whether the fee is calculated on gross or net of costs',
      'The size and negotiability of medical liens',
      'Whether health insurance paid and is seeking reimbursement',
      'Whether the claim is an ordinary injury claim or medical malpractice, which is fee-capped by statute',
    ],
    settlementValueDetails: [
      { label: 'Gross is not net', copy: 'The advertised figure is before fee, costs and liens. Only the last number is yours.' },
      { label: 'Costs are not fees', copy: 'They are reimbursed separately, and whether they are owed on an unsuccessful claim depends on the agreement.' },
      { label: 'Liens are negotiable', copy: 'Reducing them is ordinary practice and can improve a net recovery as much as a lower percentage would.' },
      { label: 'Writing is required', copy: 'California requires contingency agreements to be in writing with a copy to the client, so the terms are always available to check.' },
    ],
    insuranceProblems: [
      'A health plan asserts reimbursement late, after the settlement figure was assumed to be final.',
      'Providers treating on a letter of protection submit balances well above what insurance would have paid.',
      'The insurer issues payment jointly to parties who must all endorse it, delaying disbursement.',
      'Bills continue arriving after settlement for treatment given before it.',
      'An early offer is framed as covering the bills, without accounting for liens against them.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What percentage applies, and does it change if a lawsuit is filed?' },
      { label: 'Step 2', question: 'Is the fee calculated on the gross recovery or after costs?' },
      { label: 'Step 3', question: 'What are the case costs so far, and who owes them if there is no recovery?' },
      { label: 'Step 4', question: 'Which liens or reimbursement claims have been asserted against the recovery?' },
    ],
  },
  [SWITCHING_SLUG]: {
    scenario:
      'A claimant nine months into a claim had spoken to their attorney twice and to a case manager repeatedly, and had heard nothing for eleven weeks. A written request for a status update produced a call within days and a plan. The relationship was recoverable. A second claimant, told to accept an offer they believed was low and unable to get the reasoning explained, obtained a second opinion, changed firms, and the case was filed. Both were reasonable responses to different problems.',
    timeline: [
      ['Early', 'Substitution is unremarkable. Little has been invested and the lien is small.'],
      ['Mid-case', 'Records and investigation are done and the lien is real but proportionate. Still routine.'],
      ['After an offer', 'The hardest point. Value is largely established and the remaining work is small against the lien.'],
      ['Near trial', 'Rarely practical. Most of the work exists, and court permission may be required once a trial date is set.'],
    ],
    severityLadder: [
      ['Fixable', 'Slow responses and infrequent contact, usually capacity rather than judgement. Raise it in writing first.'],
      ['Second opinion', 'Disagreement about the value of an offer or the strategy. Often better answered by another view than a substitution.'],
      ['Breakdown', 'Sustained failure to communicate, missed deadlines, or decisions taken without instruction.'],
      ['Urgent', 'A deadline approaching with no evident preparation, which needs addressing immediately whoever handles it.'],
    ],
    treatmentProgression: [
      { label: 'The right to discharge', copy: 'A client may generally end the relationship at any time, with or without cause.' },
      { label: 'One fee, divided', copy: 'The usual outcome is a single contingency fee split between the firms, not two full fees.' },
      { label: 'The file is yours', copy: 'Records, correspondence and evidence transfer to new counsel; the lien is resolved separately.' },
      { label: 'Timing decides feasibility', copy: 'The later the change, the larger the lien against the remaining work, and the more likely a firm declines.' },
    ],
    settlementDrivers: [
      'How much work has been performed and therefore how large the lien is',
      'Whether a lawsuit has been filed and how close any trial date is',
      'Whether an offer is outstanding',
      'Whether the file is organised enough for a new firm to evaluate quickly',
      'How much time remains before the filing deadline',
      'Whether the underlying problem is communication or disagreement',
    ],
    settlementValueDetails: [
      { label: 'Not paying twice', copy: 'The fear that stops most people is largely unfounded. One fee is typically divided according to the work each firm did.' },
      { label: 'Lien against remaining work', copy: 'What deters an incoming firm is not the fact of a lien but its size relative to what is left to do.' },
      { label: 'Complaint before substitution', copy: 'Communication problems are often capacity issues and resolve when raised directly and in writing.' },
      { label: 'The deadline does not pause', copy: 'It runs from the incident throughout, unaffected by any change in representation.' },
    ],
    insuranceProblems: [
      'The adjuster continues contacting the previous firm after a substitution is filed.',
      'A pending offer is treated as withdrawn during the transition and has to be reopened.',
      'Records requested by the previous firm arrive there and need forwarding.',
      'Lien holders must be re-notified of the change before disbursement.',
      'Momentum is lost while a new firm reviews a file it did not build.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is the problem communication, or disagreement about strategy or value?' },
      { label: 'Step 2', question: 'What stage is the case at, and has a lawsuit been filed?' },
      { label: 'Step 3', question: 'Is there an offer outstanding, and when was it made?' },
      { label: 'Step 4', question: 'How much time remains before the filing deadline?' },
    ],
  },
}
