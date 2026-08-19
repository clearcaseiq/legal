import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The two consolidated insurance guides.
 *
 * These replace fifteen generated pages — `/insurance/{carrier}-denied-claim`
 * across two seed files and `/insurance/{carrier}-settlement-process` — which
 * were produced by mapping a carrier array over a template literal. Measured on
 * five-word shingle overlap with the carrier name masked, each of those three
 * families scored 1.000: they were one document per family, published under five
 * URLs, and none ranked above position 32.
 *
 * Deliberately organised by denial reason and by claim stage rather than by
 * carrier, because carrier is the one axis on which we have nothing specific to
 * say. Publishing "GEICO settles in N days" would require a normalised dataset
 * of resolved claims joined to carrier identity, which this platform does not
 * have — `CaseOutcome` carries no carrier column and `SettlementRecord` has no
 * insurer dimension at all. Carriers are named here only where the statement is
 * true of all of them.
 */

/**
 * Reuses the existing `/insurance/claim-denial` URL rather than minting a new
 * one. That page already covered this intent thinly; a second denial URL would
 * have recreated the duplication this change exists to remove.
 */
const DENIED_CLAIM_SLUG = '/insurance/claim-denial'
const SETTLEMENT_PROCESS_SLUG = '/insurance/settlement-process'

export const insuranceGuidePages: LandingPage[] = [
  {
    slug: DENIED_CLAIM_SLUG,
    category: 'Insurance',
    cluster: 'Denied and Underpaid Accident Claims',
    title: 'Why Insurance Companies Deny Accident Claims',
    eyebrow: 'Insurance denial guide',
    description:
      'A denial letter almost always names a reason, and the reason determines what evidence answers it. Liability denials, causation and treatment-gap denials, coverage denials, damages disputes, and procedural denials each need a different response. This guide separates them.',
    psychology: 'My claim was denied and I do not know whether the reason is real.',
    cta: 'Review My Denied Claim',
    exampleQueries: [
      'insurance denied my accident claim',
      'why was my car accident claim denied',
      'insurance says I was at fault',
      'insurance denied claim treatment gap',
    ],
    signals: [
      'Denial reason',
      'Liability dispute',
      'Treatment gap',
      'Causation dispute',
      'Coverage or policy issue',
      'Late notice',
      'Low offer',
    ],
    sections: {
      whyItMatters:
        'Most people read a denial as a verdict on the whole claim. It is usually narrower than that. Insurers deny on a specific ground, and the ground tells you what the file is missing. A liability denial is an argument about who caused the crash, and it is answered with the police report, photographs, vehicle damage patterns, witnesses, and any recorded admission. A causation denial concedes the crash but disputes that it caused this injury, and it is answered with the treatment timeline and the medical records. A coverage denial says the policy does not apply at all — lapsed premium, excluded driver, a vehicle used commercially on a personal policy — and no amount of medical evidence answers it, because it is a contract question rather than a factual one. Reading a coverage denial as a causation denial, and responding by gathering more records, wastes the months that matter most. The written reason is the single most useful document in a denied claim, and it should be read literally rather than summarised from a phone call with an adjuster.',
      whatToTrack: [
        'The written denial letter itself, in full, including the policy provision it cites',
        'Claim number, adjuster name and direct line, and every email or letter in date order',
        'The date you first reported the claim, and the date of the accident',
        'Police report, scene and vehicle photographs, dashcam or surveillance footage, and witness contact details',
        'All medical records and bills, with the date of the first visit after the accident clearly identified',
        'A written explanation for any gap in treatment, including referral waits and insurance authorisation delays',
        'Declarations page showing coverage limits, and whether uninsured or underinsured motorist coverage exists',
        'Any recorded statement you gave, and what you were asked',
      ],
      howClearCaseHelps:
        'ClearCaseIQ organises a denied claim around the reason given rather than around the injury. The assessment separates the liability record, the treatment chronology, the economic damages, and the insurance correspondence, then identifies which of them actually bears on the stated denial ground and what is missing from that specific part of the file. That produces a package an attorney can triage quickly, which matters because denied claims usually arrive at a firm with the deadline already running.',
    },
    faqs: [
      {
        q: 'Does a denial mean the claim is over?',
        a: 'No. A denial is the insurer\'s position, not an adjudication. Claims are routinely reopened when the stated ground is answered with evidence, and a denial does not affect your right to file suit within the statute of limitations. What a denial does change is urgency, because the deadline continues to run while you negotiate.',
      },
      {
        q: 'Can an insurer deny a claim because I waited to see a doctor?',
        a: 'Insurers frequently use a treatment gap to argue the injury was not caused by the accident, or was not as serious as claimed. A gap is not fatal, but it does need an explanation, and the explanation is far more credible when it is documented — a referral that took three weeks to schedule, an authorisation that was pending, or a provider with no available appointment.',
      },
      {
        q: 'Do the major carriers handle denials differently?',
        a: 'The grounds available to any insurer come from the policy and from state insurance law, so the categories are the same across State Farm, GEICO, Progressive, Allstate, USAA, Farmers and the rest. Where carriers genuinely differ is in internal settlement authority, how much discretion an individual adjuster has, and how quickly a file escalates — none of which is published. Be sceptical of any page quoting a specific denial rate or settlement time for a named carrier, including ours; that data is not publicly available.',
      },
      {
        q: 'Should I give a recorded statement after a denial?',
        a: 'This is not legal advice, and it is one of the decisions most worth asking an attorney about first. A recorded statement is transcribed and can be used to establish comparative fault or to lock in a description of symptoms given before the full diagnosis was known. You generally have no obligation to give one to the other driver\'s insurer.',
      },
      {
        q: 'What if the denial says I was partly at fault?',
        a: 'California uses pure comparative negligence, so being partly at fault reduces recovery in proportion to your share rather than eliminating it. An allegation of shared fault is a negotiating position until it is supported by evidence, and it is answered with the same liability record used against any denial: report, photographs, damage patterns, and witnesses.',
      },
    ],
  },
  {
    slug: SETTLEMENT_PROCESS_SLUG,
    category: 'Insurance',
    cluster: 'The Insurance Settlement Process',
    title: 'How an Insurance Settlement Works After an Accident',
    eyebrow: 'Insurance settlement guide',
    description:
      'A bodily injury settlement moves through recognisable stages: the claim opens, liability is investigated, treatment finishes, a demand goes out, offers are exchanged, and a release is signed. Each stage has one thing that controls how long it takes. This guide explains what that is at every step.',
    psychology: 'My claim is open and I have no idea what happens next or how long it takes.',
    cta: 'Review My Insurance Claim',
    exampleQueries: [
      'how does an insurance settlement work',
      'how long does an injury claim take to settle',
      'what happens after a demand letter',
      'should I accept the first settlement offer',
    ],
    signals: [
      'Claim stage',
      'Liability decision',
      'Treatment status',
      'Demand sent',
      'Offer received',
      'Policy limits',
      'Lien status',
    ],
    sections: {
      whyItMatters:
        'The single most common cause of an underpaid settlement is settling before the medical picture is complete. An insurer can make an offer at any time, including in the first week, and an early offer is usually generated from the property damage and the first medical bill rather than from a finished treatment record. Once a release is signed the claim is closed permanently, including for treatment that has not happened yet — a surgery recommended two months later is not recoverable against a released claim. The stage that actually governs a bodily injury settlement is therefore not the negotiation; it is the point at which treatment reaches maximum medical improvement, because that is the first moment anyone can price the claim. Everything before it is an estimate, and everything after it is arithmetic and argument. Understanding which stage a claim is in explains most of what feels like unexplained delay, and it identifies the one decision — when to stop treating and start demanding — that materially changes the number.',
      whatToTrack: [
        'Date the claim was opened with each insurer, and the claim number for each',
        'Whether liability has been formally accepted, denied, or left undecided',
        'Whether you have reached maximum medical improvement, or treatment is ongoing',
        'Complete medical bills and records from every provider, including imaging',
        'Wage loss documentation from your employer, and out-of-pocket expenses',
        'Policy limits on every applicable policy, including your own UM/UIM coverage',
        'Health insurance, Medi-Cal, Medicare, or provider liens against the recovery',
        'Every offer made, the date, and the reason given for the amount',
      ],
      howClearCaseHelps:
        'ClearCaseIQ tracks which stage a claim is actually in and what is blocking the next one, which is usually a missing record rather than an adjuster decision. The assessment assembles the treatment chronology, the economic damages, and the liability evidence into the structure a demand package needs, and flags gaps — an unbilled provider, an unexplained gap in care, an unquantified wage loss — while there is still time to fix them rather than after an offer has been made against an incomplete file.',
    },
    faqs: [
      {
        q: 'How long does an injury claim take to settle?',
        a: 'The honest answer is that it is governed by treatment, not by the insurer. A claim cannot be reliably valued until treatment reaches maximum medical improvement, so a soft-tissue claim that resolves in six weeks and a claim involving surgery are on completely different timelines. After a demand is sent, negotiation itself is usually the shortest phase. Treat any specific figure quoted for a named carrier with suspicion — that data is not published.',
      },
      {
        q: 'Should I accept the first offer?',
        a: 'This is not legal advice, but the questions worth answering first are consistent: is treatment finished, are all bills and liens known, is liability accepted, and has future care been evaluated. A first offer that arrives before treatment is complete is priced on an incomplete record almost by definition.',
      },
      {
        q: 'What is a demand letter and when does it go out?',
        a: 'A demand is the package that states the claim: liability, the treatment history, the bills, the wage loss, and a figure. It normally goes out once treatment is complete and all records and bills are in hand, because sending it earlier means demanding against a file that is still changing.',
      },
      {
        q: 'What happens if the settlement is more than the policy limits?',
        a: 'The at-fault driver\'s policy caps what that policy pays regardless of how the claim is valued. That is why the declarations page matters early, and why your own underinsured motorist coverage — if you carry it — can become the more important policy in a serious injury claim.',
      },
      {
        q: 'Why do liens reduce what I actually receive?',
        a: 'Health insurers, Medi-Cal, Medicare, and some medical providers can assert a right to be repaid out of a settlement for treatment they covered. The gross settlement and the net to you are different numbers, and liens are the usual reason. They can often be negotiated, but they need to be identified before a release is signed.',
      },
    ],
  },
]

export const insuranceGuideTopicContentBySlug: Record<string, TopicContent> = {
  [DENIED_CLAIM_SLUG]: {
    scenario:
      'A claimant received a denial citing "no objective findings" six weeks after a rear-end collision. The letter was actually a causation denial rather than a liability denial — the insurer had accepted fault. The response that mattered was not more argument about the crash, but the MRI ordered after the letter, the referral that explained a three-week gap in physical therapy, and the primary-care note connecting the symptoms back to the collision date.',
    timeline: [
      ['Claim reported', 'The insurer opens a file, assigns an adjuster, and may request a recorded statement before any medical record exists.'],
      ['First 30 days', 'Liability is investigated. A quick offer at this stage is priced on property damage and the earliest bills, not on the injury.'],
      ['Denial or low offer', 'A written reason is issued. This letter defines what evidence matters, and it should be read literally rather than paraphrased.'],
      ['After the denial', 'The claim can be reopened with evidence answering the stated ground. The statute of limitations continues to run throughout.'],
    ],
    severityLadder: [
      ['Procedural', 'Late notice, missing signature, or an unreturned form. Usually curable once identified.'],
      ['Evidentiary', 'Causation, treatment gap, or "no objective findings". Answered with records and a documented timeline.'],
      ['Liability', 'The insurer alleges you caused or shared fault in the crash. Answered with the report, photographs, damage patterns, and witnesses.'],
      ['Coverage', 'The policy is said not to apply: lapse, exclusion, or a commercial use question. Medical evidence does not answer this one.'],
    ],
    treatmentProgression: [
      { label: 'Read the ground', copy: 'Identify which of the four categories the denial actually falls into. The wrong category means months spent gathering evidence that does not bear on the reason given.' },
      { label: 'Assemble to the ground', copy: 'A liability denial needs the scene record. A causation denial needs the treatment chronology. A coverage denial needs the declarations page and the policy.' },
      { label: 'Explain the gaps', copy: 'Where care was delayed, document why — referral waits, authorisation delays, and provider availability are ordinary and credible when written down.' },
      { label: 'Escalate or file', copy: 'Denied claims arrive at attorneys with the deadline already running. Reviewing early preserves options that a late review does not.' },
    ],
    settlementDrivers: [
      'A written denial reason, rather than a verbal one relayed by phone',
      'Liability evidence that predates the dispute: report, photographs, witnesses, footage',
      'A continuous treatment record with dated first care after the accident',
      'A documented explanation for every gap or delay in care',
      'Objective findings such as imaging, where they exist',
      'Declarations page confirming limits, and any UM/UIM coverage of your own',
    ],
    settlementValueDetails: [
      { label: 'The category decides the work', copy: 'Four denial categories need four different files. Matching the evidence to the stated ground is the whole task.' },
      { label: 'Coverage denials are different', copy: 'A coverage denial is a contract question. More medical records will not move it, and time spent gathering them is time lost.' },
      { label: 'Comparative fault is not a bar', copy: 'California reduces recovery by your share of fault rather than eliminating it, so a shared-fault allegation is a negotiating position, not an ending.' },
      { label: 'The deadline keeps running', copy: 'Negotiating with an insurer does not pause the statute of limitations, which is why a denial should shorten your timeline rather than lengthen it.' },
    ],
    insuranceProblems: [
      'A verbal denial is given by phone and never confirmed in writing, leaving no stated ground to answer.',
      'A treatment gap is used to argue causation without acknowledging referral or authorisation delays.',
      'An early offer arrives before treatment is complete, priced on property damage rather than injury.',
      'Degenerative findings on imaging are cited as though they rule out an acute injury.',
      'Shared fault is alleged without the report, photographs, or witness statements that would support it.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What exact reason does the written denial give, and does it cite a policy provision?' },
      { label: 'Step 2', question: 'Has the insurer accepted or disputed liability for the crash itself?' },
      { label: 'Step 3', question: 'When was your first medical visit, and were there any gaps in treatment?' },
      { label: 'Step 4', question: 'Do you have the denial letter, claim correspondence, and declarations page?' },
    ],
  },
  [SETTLEMENT_PROCESS_SLUG]: {
    scenario:
      'A claimant was offered $4,200 eleven days after a collision, before an MRI had been ordered. Treatment continued for five more months and ultimately included injections and a surgical consultation. The early offer had been calculated from property damage and two urgent-care bills; the completed record described a different claim entirely, and the release that would have closed it was never signed.',
    timeline: [
      ['Claim opened', 'An adjuster is assigned and a claim number issued. Liability investigation begins, and a recorded statement may be requested.'],
      ['Liability decided', 'The insurer accepts, denies, or allocates fault. Everything downstream is negotiated against this decision.'],
      ['Treatment to MMI', 'The longest stage, and the one that governs the timeline. A claim cannot be priced until the medical picture stops changing.'],
      ['Demand and negotiation', 'Records, bills, and wage loss are packaged with a figure. Offers are exchanged, then a release closes the claim permanently.'],
    ],
    severityLadder: [
      ['Property only', 'No injury claim. Vehicle damage is handled separately and settling it does not release a bodily injury claim.'],
      ['Treated and resolved', 'Care completed within weeks with no imaging. Valuation is largely arithmetic on bills and wage loss.'],
      ['Ongoing treatment', 'Imaging, physical therapy, or specialist referral. Too early to value; an offer here is priced on an incomplete file.'],
      ['Surgical or permanent', 'Surgery, injections, or lasting restriction. Future care and policy limits both become central questions.'],
    ],
    treatmentProgression: [
      { label: 'Open and report', copy: 'Notify every applicable insurer promptly, including your own for UM/UIM and medical payments coverage. Late notice is itself a denial ground.' },
      { label: 'Document as you go', copy: 'Bills, records, mileage, and missed work are far easier to collect contemporaneously than reconstructed months later.' },
      { label: 'Reach maximum medical improvement', copy: 'The point at which treatment plateaus. It is the first moment the claim can be valued honestly, and the reason most timelines are what they are.' },
      { label: 'Demand, negotiate, release', copy: 'Identify liens before signing. A release is final, and it closes the claim for treatment that has not happened yet.' },
    ],
    settlementDrivers: [
      'Whether treatment has reached maximum medical improvement',
      'Complete billing from every provider, including any that billed health insurance',
      'Objective findings and any recommendation for future care',
      'Documented wage loss and out-of-pocket costs',
      'Liability clarity, and any allocation of comparative fault',
      'Available policy limits across every applicable policy, including your own UM/UIM',
    ],
    settlementValueDetails: [
      { label: 'Timing beats negotiation', copy: 'When the demand goes out changes the number more than how it is argued, because it determines what is in the file at all.' },
      { label: 'A release is permanent', copy: 'Signing closes the claim for future treatment as well as past. Surgery recommended afterwards is not recoverable.' },
      { label: 'Limits can cap the outcome', copy: 'A well-documented claim can still be limited by the at-fault policy, which is why UM/UIM coverage often matters more than expected.' },
      { label: 'Gross is not net', copy: 'Liens from health insurers, Medi-Cal, Medicare, or providers are repaid from the settlement, so the two figures differ.' },
    ],
    insuranceProblems: [
      'An offer arrives before treatment is complete and is presented as though it reflects the whole claim.',
      'A release is sent alongside the offer, closing future treatment along with past.',
      'Property damage is settled quickly and framed as resolving the injury claim as well.',
      'Delay is attributed to the claimant when the file is waiting on a provider record.',
      'Policy limits are not disclosed, leaving the claim negotiated without knowing the ceiling.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which insurers have open claims, and has liability been accepted by any of them?' },
      { label: 'Step 2', question: 'Is your treatment finished, ongoing, or awaiting a referral or procedure?' },
      { label: 'Step 3', question: 'Do you have complete bills and records from every provider you have seen?' },
      { label: 'Step 4', question: 'Has any offer been made, and was a release included with it?' },
    ],
  },
}
