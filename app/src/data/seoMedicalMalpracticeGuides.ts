import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The four medical-malpractice guides — the highest-value but hardest cluster.
 *
 * Everything here must be MICRA-accurate and carry disclaimers, because this is
 * exactly the kind of legal-educational content that draws compliance scrutiny.
 * The California specifics that anchor these pages:
 *
 *  - The MICRA non-economic-damages cap was overhauled by AB 35, effective
 *    Jan 1, 2023. It is no longer a flat $250,000. For injury (non-death) cases
 *    it began at $350,000 and rises $40,000 each January 1 over ten years toward
 *    $750,000; for wrongful death it began at $500,000 and rises $50,000 per year
 *    toward $1,000,000. Economic damages (medical bills, lost earnings, future
 *    care) are NOT capped. The pages describe the mechanism and the tiered
 *    increase rather than pinning a precise current-year figure.
 *  - The statute of limitations (Code of Civil Procedure section 340.5) is one
 *    year from discovery OR three years from the injury, whichever comes first,
 *    with limited tolling (fraud, intentional concealment, a foreign object).
 *    Minors have special rules.
 *  - A 90-day notice of intent to sue (Code of Civil Procedure section 364) is
 *    required before filing, and can extend the deadline if served late.
 *  - Expert testimony is generally required to establish the standard of care
 *    and causation; a bad outcome alone is not malpractice.
 *  - Attorney contingency fees are limited by statute (Business & Professions
 *    Code section 6146), lower than an ordinary personal-injury contingency.
 *
 * No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. A medical-malpractice claim turns on the standard of care, expert review, MICRA, and facts particular to you, which a licensed California attorney can review.'

export const MEDMAL_QUALIFY_SLUG = '/do-i-have-a-medical-malpractice-case-in-california'
export const MEDMAL_VALUE_SLUG = '/how-much-is-a-medical-malpractice-case-worth-in-california'
export const MEDMAL_PROOF_SLUG = '/how-to-prove-medical-malpractice-in-california'
export const MEDMAL_SOL_SLUG = '/california-medical-malpractice-statute-of-limitations'

export const medicalMalpracticeGuidePages: LandingPage[] = [
  {
    slug: MEDMAL_QUALIFY_SLUG,
    category: 'Claim Types',
    cluster: 'Medical Malpractice Qualification',
    title: 'Do I Have a Medical Malpractice Case in California?',
    eyebrow: 'Do I have a case?',
    description:
      'A bad outcome is not malpractice. A case requires a provider who fell below the professional standard of care and caused real harm because of it — a distinction that decides most claims, and one that usually takes an expert to answer.',
    psychology: 'Something went wrong with my medical care and I want to know if it was malpractice.',
    cta: 'Check If You Have a Claim',
    exampleQueries: [
      'do I have a medical malpractice case in California',
      'how do I know if I have a malpractice case',
      'is a bad outcome medical malpractice',
      'what qualifies as medical malpractice in California',
    ],
    signals: [
      'Standard-of-care breach',
      'Causation',
      'Real, significant harm',
      'Misdiagnosis / surgical error',
      'Expert review needed',
      'Not just a bad result',
    ],
    sections: {
      whyItMatters:
        'The question that decides most potential malpractice claims is not whether something went wrong but whether it went wrong because a provider fell below the professional standard of care. Medicine carries risk, and many bad outcomes — a surgery that does not fully succeed, a disease that progresses despite treatment, a known complication that materializes — happen even when the care was competent. None of those, by themselves, is malpractice. A viable claim needs three things together. First, a breach of the standard of care: proof that the provider did something, or failed to do something, that a reasonably careful provider in the same specialty would have done differently under the same circumstances. Second, causation: proof that the breach actually caused the harm, not that it merely preceded a bad outcome that would have happened anyway — this is often the hardest element, because a sick patient may have been harmed by the underlying illness rather than by any error. Third, significant harm: damages serious enough to justify a case that is expensive and difficult to bring. The patterns that most often meet these elements are recognizable: a missed or delayed diagnosis of a condition (a cancer, a heart attack, an infection) that timely care would have caught; a surgical error such as operating on the wrong site or leaving an instrument behind; a medication or anesthesia error; a birth injury; or a failure to act on test results. But recognizing a pattern is not the same as proving it, and California adds a structural gate: because the standard of care is a medical question, establishing it generally requires testimony from a qualified medical expert in the relevant field, and no responsible attorney will pursue a claim without first having the records reviewed by such an expert. That expert review, early and honest, is what separates a real claim from a painful outcome, and it is also why these cases are screened carefully before they are taken — the cost and difficulty mean lawyers accept only claims an expert supports. So the practical path is to gather the complete medical records, be clear-eyed that a disappointing result is not itself a claim, and get an expert review of whether the care fell below the standard and caused the harm.',
      whatToTrack: [
        'Exactly what care was given and what you believe went wrong',
        'Whether a reasonably careful provider would have acted differently',
        'Whether the harm was caused by the error or by the illness itself',
        'How serious and lasting the resulting harm is',
        'The complete medical records from every provider involved',
        'The dates of the care and when you discovered the harm',
        'Whether a test result or diagnosis was missed or delayed',
        'Whether more than one provider or facility was involved',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps you separate a bad outcome from a viable claim before you invest in it, by focusing on the three elements — a standard-of-care breach, causation, and significant harm — that actually decide these cases. It organises the complete records an expert must review, flags where causation is the weak point, and sets honest expectations about the expert gate every California malpractice claim has to pass. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is a bad outcome the same as medical malpractice?',
        a: 'No, and this is the most common misunderstanding. Medicine carries risk, and many poor outcomes happen even with competent care — a surgery that does not fully succeed, a known complication, a disease that progresses. Malpractice requires that a provider fell below the professional standard of care and that the breach caused the harm, not merely that the result was disappointing.',
      },
      {
        q: 'What has to be true for me to have a malpractice case?',
        a: 'Three things together: a breach of the standard of care (a provider did something a reasonably careful provider in the same specialty would not have), causation (the breach actually caused the harm rather than the underlying illness), and significant harm. Missing any one of them usually means there is no viable claim, however upsetting the experience was.',
      },
      {
        q: 'How do I know if the care fell below the standard?',
        a: 'Generally only a qualified medical expert can say. The standard of care is a medical question, so California claims require expert review of the records, and no responsible attorney pursues a claim without it. That early review is the honest test of whether what happened was an error or an accepted risk of treatment.',
      },
      {
        q: 'What are the most common types of malpractice claims?',
        a: 'Missed or delayed diagnosis of a serious condition that timely care would have caught, surgical errors (wrong site, retained instruments), medication and anesthesia errors, birth injuries, and failure to act on test results. Each still has to be proven with expert testimony that the care breached the standard and caused the harm.',
      },
      {
        q: 'Why are malpractice cases screened so carefully?',
        a: 'Because they are expensive and difficult — they require expert witnesses, MICRA limits non-economic damages, and the burden of proof on causation is high. Attorneys therefore take only claims an expert supports after reviewing the records. A careful screening is a sign of a serious evaluation, not a lack of interest.',
      },
    ],
  },
  {
    slug: MEDMAL_VALUE_SLUG,
    category: 'Settlement',
    cluster: 'Medical Malpractice Claim Value',
    title: 'How Much Is a Medical Malpractice Case Worth in California?',
    eyebrow: 'Malpractice value guide',
    description:
      'California caps non-economic damages under MICRA, but that cap was raised sharply in 2023 and rises every year — and it does not touch economic damages like medical bills, lost income, and future care, which are often the largest part of a serious claim.',
    psychology: 'I think I was harmed by malpractice and want to understand what a claim is worth.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a medical malpractice case worth in California',
      'medical malpractice settlement California',
      'what is the MICRA cap in California',
      'medical malpractice damages cap California',
    ],
    signals: [
      'MICRA non-economic cap',
      'Economic damages uncapped',
      'Rising annual cap',
      'Future care',
      'Lost earning capacity',
      'Wrongful death tier',
    ],
    sections: {
      whyItMatters:
        'Valuing a California malpractice claim means understanding what MICRA does and, just as importantly, what it does not do. MICRA — the Medical Injury Compensation Reform Act — caps non-economic damages, meaning compensation for pain, suffering, and loss of enjoyment of life. For decades that cap was a flat $250,000, but it was overhauled by legislation effective January 1, 2023: for injury (non-death) cases the cap began at $350,000 and rises by $40,000 each January over ten years toward $750,000, and for wrongful-death cases it began at $500,000 and rises by $50,000 per year toward $1,000,000. So the cap is now materially higher than the old figure and increases annually, and the year that applies depends on when the case resolves. The single most important point about MICRA, though, is its limit: it caps only non-economic damages. It does not cap economic damages at all — and in a serious malpractice case those are usually the larger number. Economic damages include past and future medical expenses, the cost of lifelong care where an injury is permanent, lost income, and lost earning capacity. A malpractice injury that requires decades of future care, or that ends someone\u2019s ability to work, can carry economic damages far exceeding any non-economic cap, and those are recoverable in full. This is why the shape of a malpractice claim\u2019s value is different from an ordinary injury claim: the emotional-harm component is bounded by statute, while the financial-harm component is not, so the cases with the greatest value are those with the largest economic losses — catastrophic injuries, permanent disability, injuries to children with a lifetime of care ahead, and losses of income. Two further realities shape value. Causation limits it: even a clear breach recovers only for the harm the breach caused, not for harm the underlying illness would have caused anyway, so the recoverable value is the difference the error made. And cost shapes what is worth pursuing: because these cases require experts and are hard to win, the economic damages generally need to be substantial for a claim to be viable at all. Anyone quoting an average is ignoring the two things that actually set the number — the size of the economic losses and how much of the harm the breach truly caused.',
      whatToTrack: [
        'Whether the claim is an injury case or a wrongful death (different tiers)',
        'The full past and future medical cost of the harm',
        'The cost of any lifelong or long-term care required',
        'Lost income and lost earning capacity',
        'How much of the harm the breach actually caused',
        'The severity and permanence of the injury',
        'When the case is likely to resolve, for the applicable cap year',
      ],
      howClearCaseHelps:
        `ClearCaseIQ frames malpractice value the way MICRA actually works: it separates the capped non-economic component from the uncapped economic damages — future care, lost earning capacity — that usually carry a serious claim, and it keeps the focus on the harm the breach caused rather than the underlying illness. It helps document the lifelong costs that determine value in catastrophic cases. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'What is the MICRA cap in California now?',
        a: 'MICRA caps only non-economic damages (pain and suffering). Since January 1, 2023 it is no longer a flat $250,000: for injury cases it began at $350,000 and rises $40,000 each year over ten years toward $750,000, and for wrongful death it began at $500,000 and rises $50,000 per year toward $1,000,000. The year the case resolves determines the applicable figure.',
      },
      {
        q: 'Does MICRA cap my medical bills and lost income?',
        a: 'No. MICRA caps only non-economic damages. Economic damages — past and future medical expenses, the cost of long-term care, lost income, and lost earning capacity — are not capped and are recoverable in full. In serious cases these are usually far larger than the non-economic cap, which is why they drive the value.',
      },
      {
        q: 'Is there an average medical malpractice settlement in California?',
        a: 'No usable average, because value is set by the size of the uncapped economic losses and by how much of the harm the breach actually caused. A permanent injury requiring lifelong care is a fundamentally different claim from a temporary one, and averages hide that. The economic damages and causation matter far more than any figure.',
      },
      {
        q: 'Why do the most valuable malpractice cases involve future care?',
        a: 'Because future care and lost earning capacity are economic damages, which MICRA does not cap. A catastrophic injury — a permanent disability, a child who will need care for life, a lost career — generates economic losses that can dwarf the non-economic cap, and those are recoverable in full, so the largest cases are typically the ones with the greatest financial harm.',
      },
      {
        q: 'How does causation affect the value?',
        a: 'It limits the recovery to the harm the breach actually caused, not the harm the underlying condition would have caused anyway. If a delayed cancer diagnosis reduced a good prognosis to a poor one, the recoverable value reflects that difference. Proving how much worse the error made things is central to both liability and value.',
      },
    ],
  },
  {
    slug: MEDMAL_PROOF_SLUG,
    category: 'Liability',
    cluster: 'Medical Malpractice Proof',
    title: 'How to Prove Medical Malpractice in California',
    eyebrow: 'Proving the claim',
    description:
      'Proving malpractice takes more than showing you were harmed. It requires a qualified medical expert to establish the standard of care, that a provider breached it, and that the breach — not the illness — caused the harm. The records are where it starts.',
    psychology: 'I want to understand what it takes to actually prove a malpractice claim.',
    cta: 'Check If You Have a Claim',
    exampleQueries: [
      'how do I prove medical negligence in California',
      'do I need an expert witness for a malpractice case in California',
      'what evidence do I need for a medical malpractice claim',
      'how to prove the standard of care was breached',
    ],
    signals: [
      'Standard of care',
      'Expert testimony required',
      'Causation proof',
      'Complete medical records',
      'Breach vs known risk',
      'Multiple providers',
    ],
    sections: {
      whyItMatters:
        'Proving medical malpractice in California is a structured task with a fixed set of elements, and each one has to be established with the right kind of evidence. The first element is the standard of care: what a reasonably careful provider in the same specialty would have done under the same circumstances. This is a medical question, not a lay one, which is why California generally requires testimony from a qualified medical expert — a physician in the relevant field — to define the standard and to explain how the defendant departed from it. Without a supportive expert, a malpractice claim cannot realistically proceed, and this is the gate that screens out most complaints: a lawyer has the records reviewed by an expert before taking the case, and only claims the expert supports move forward. The second element is breach — showing that the provider actually fell below that standard, as opposed to making a reasonable judgment that simply did not work out, or encountering a known complication that competent care can still produce. The third, and often the hardest, is causation: proving that the breach caused the harm. In malpractice this is uniquely difficult because the patient was, by definition, already unwell, so the defense will argue the bad outcome came from the underlying condition rather than the error. Overcoming that usually takes expert testimony explaining what would have happened with proper care — that the cancer caught on time was survivable, that the infection treated promptly would not have spread — so the harm is tied to the breach and not to the disease. The fourth is damages: documented harm significant enough to support the claim. The evidence that carries all of this is the medical record. The complete records from every provider and facility involved — not a summary, but the full charts, imaging, test results, notes, and orders — are the foundation, because they show what was known, when, and what was done about it, and they are what the experts on both sides will scrutinize. Two procedural points sit alongside the proof. California generally requires a 90-day notice of intent before a malpractice suit is filed, and the deadline itself (one year from discovery or three years from injury, whichever is first) is short, so the records and expert review need to be underway well before the clock runs. Building the proof is therefore front-loaded: obtain everything, get an honest expert review early, and be prepared for causation to be the battleground.',
      whatToTrack: [
        'The complete records from every provider and facility involved',
        'What the standard of care required in the circumstances',
        'How the provider is said to have departed from it',
        'Whether the harm was caused by the breach or the underlying illness',
        'What proper care would have changed about the outcome',
        'Imaging, test results, and orders, not just summaries',
        'Whether a qualified expert supports the claim',
        'The dates, for the notice and filing deadlines',
      ],
      howClearCaseHelps:
        `ClearCaseIQ organises the complete medical records that every malpractice claim is built on and structures them around the elements an expert must address — standard of care, breach, and especially causation, where these cases are usually won or lost. It flags the expert-review gate and the 90-day notice and filing deadlines so the proof is underway before the short clock runs. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need an expert witness for a malpractice case in California?',
        a: 'Effectively yes. The standard of care is a medical question, so California generally requires a qualified medical expert to define it and to explain how the provider breached it. No responsible attorney pursues a malpractice claim without first having the records reviewed by such an expert, and a claim cannot realistically reach trial without expert support.',
      },
      {
        q: 'What evidence do I need to prove medical malpractice?',
        a: 'The foundation is the complete medical record from every provider and facility — the full charts, imaging, test results, notes, and orders, not a summary. On top of that you need expert testimony establishing the standard of care, the breach, and causation. The records show what was known and done; the experts interpret whether that fell below the standard and caused the harm.',
      },
      {
        q: 'Why is causation so hard to prove in malpractice cases?',
        a: 'Because the patient was already ill, so the defense argues the bad outcome came from the underlying condition rather than the error. Overcoming that takes expert testimony about what proper care would have changed — that a timely diagnosis was survivable, that prompt treatment would have prevented the spread. Tying the harm to the breach rather than the disease is often the decisive fight.',
      },
      {
        q: 'What is the 90-day notice requirement?',
        a: 'California generally requires you to give a health-care provider 90 days\u2019 notice of intent before filing a malpractice lawsuit. It is a procedural step that has to be handled correctly, and if served in the last 90 days of the limitations period it can extend the deadline. It is one reason to have the records and expert review underway early.',
      },
      {
        q: 'How do I get my complete medical records?',
        a: 'You have a right to your records, and they should be requested in full — the complete charts, imaging, and test results from every provider and facility involved, not a discharge summary. Because the filing deadline is short and expert review takes time, gathering the complete records is one of the first steps in evaluating a claim.',
      },
    ],
  },
  {
    slug: MEDMAL_SOL_SLUG,
    category: 'Statute of Limitations',
    cluster: 'Medical Malpractice Deadlines',
    title: 'California Medical Malpractice Statute of Limitations',
    eyebrow: 'Filing deadlines',
    description:
      'The malpractice deadline is one year from when you discovered the harm or three years from the injury, whichever comes first — shorter and more complex than an ordinary injury claim, with a required 90-day notice and special rules for children.',
    psychology: 'I need to know how long I have to file a medical malpractice claim.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'medical malpractice statute of limitations California',
      'how long do I have to sue for medical malpractice California',
      'when does the malpractice clock start California',
      'malpractice statute of limitations for a minor California',
    ],
    signals: [
      'One year from discovery',
      'Three years from injury',
      'Whichever comes first',
      '90-day notice of intent',
      'Concealment / foreign object tolling',
      'Special rules for minors',
    ],
    sections: {
      whyItMatters:
        'The medical-malpractice deadline in California is governed by its own statute, and it is both shorter and more intricate than the two-year rule for ordinary injury claims — which is why it catches people who assume they have the usual time. The core rule sets two clocks and applies whichever expires first: one year from the date you discovered, or reasonably should have discovered, the injury; or three years from the date of the injury itself. The one-year discovery clock matters because malpractice harm is often not apparent right away — a surgical error or a missed diagnosis may only surface months later — and once you learn (or should have learned) that you were harmed, the one-year period begins and moves quickly. The three-year clock is an outer limit that generally cannot be extended by late discovery, with narrow exceptions: it can be tolled by proof of fraud, by intentional concealment of the harm, or by the presence of a foreign object left in the body with no therapeutic purpose. Because both clocks run and the shorter one controls, a claim discovered late in the three-year window may have only a brief time left, and one discovered after three years may be barred entirely absent an exception. Children have separate rules: for a minor, a claim generally must be brought within three years of the wrongful act, but for a child under the age of six the period runs until the later of three years or the child\u2019s eighth birthday. Layered on top of the deadline is a procedural requirement: California generally requires 90 days\u2019 written notice of intent to sue before a malpractice complaint is filed, and if that notice is served within the last 90 days of the limitations period, the deadline is extended by 90 days. Two practical consequences follow. First, the combination of a short discovery clock, an expert-review requirement that takes time, and a mandatory pre-suit notice means these claims have to be evaluated promptly — waiting until the deadline is near can leave too little time to obtain records and secure the expert support the claim needs. Second, the discovery question is fact-specific and often contested, so if there is any doubt about when the clock started, it should be assessed rather than assumed. As with every claim, discussions with the provider or its insurer do not pause any of these clocks.',
      whatToTrack: [
        'The date of the negligent care or injury',
        'When you discovered, or should have discovered, the harm',
        'Which clock — one year or three years — expires first',
        'Whether concealment or a foreign object might extend the outer limit',
        'The injured person\u2019s age, for the special minor rules',
        'Whether the 90-day notice of intent has been given',
        'How much time expert review and records will realistically take',
      ],
      howClearCaseHelps:
        'The deadline checker applies the malpractice-specific rules — one year from discovery or three years from injury, whichever is first — rather than the ordinary two-year period, and it accounts for the 90-day notice and the special rules for minors. ClearCaseIQ records the care and discovery dates so the shorter clock is not missed while records are gathered and an expert reviews the claim.',
    },
    faqs: [
      {
        q: 'How long do I have to sue for medical malpractice in California?',
        a: 'Generally one year from when you discovered (or should have discovered) the injury, or three years from the date of the injury, whichever comes first. This is shorter and more complex than the two-year rule for ordinary injuries, and a required 90-day notice of intent sits alongside it. Children have separate rules.',
      },
      {
        q: 'When does the malpractice clock start?',
        a: 'The one-year clock starts when you discover, or reasonably should have discovered, that you were harmed — which may be well after the care, since malpractice harm often surfaces late. But the three-year clock runs from the injury itself and is an outer limit that late discovery generally cannot extend, so both are in play and the shorter one controls.',
      },
      {
        q: 'Can the three-year deadline ever be extended?',
        a: 'Only in narrow circumstances: proof of fraud, intentional concealment of the harm, or a foreign object left in the body with no therapeutic purpose can toll the outer limit. These are exceptions, not the norm, so a claim discovered more than three years after the injury may be barred unless one applies.',
      },
      {
        q: 'What is the deadline for a child\u2019s malpractice claim?',
        a: 'A minor\u2019s claim generally must be brought within three years of the wrongful act, but for a child under the age of six the period runs until the later of three years or the child\u2019s eighth birthday. These rules are specific and worth confirming early, because they differ from the adult clock.',
      },
      {
        q: 'Does the 90-day notice change my deadline?',
        a: 'It can. California generally requires 90 days\u2019 written notice of intent before filing a malpractice suit, and if the notice is served within the last 90 days of the limitations period, the deadline is extended by 90 days. It is a procedural requirement that has to be handled correctly, which is another reason to act well before the clock runs.',
      },
    ],
  },
]

export const medicalMalpracticeGuideTopicContentBySlug: Record<string, TopicContent> = {
  [MEDMAL_QUALIFY_SLUG]: {
    scenario: `A patient\u2019s cancer was found a year later than it should have been, and the family assumed the delay was automatically malpractice. An expert review of the records was the real test: it confirmed the standard of care required earlier follow-up on an abnormal scan, and that the delay changed the prognosis — the difference between a grievance and a claim. ${NOT_ADVICE}`,
    timeline: [
      ['Identify what went wrong', 'Be specific about the care and the harm.'],
      ['Gather the records', 'The complete file from every provider involved.'],
      ['Expert review', 'A qualified expert tests standard of care and causation.'],
      ['Honest assessment', 'A bad outcome without a breach is not a claim.'],
    ],
    severityLadder: [
      ['Bad outcome only', 'A poor result with competent care; not malpractice.'],
      ['Possible breach', 'Care that may have fallen below the standard.'],
      ['Breach + causation', 'An error that caused harm the illness would not have.'],
      ['Catastrophic harm', 'A serious, lasting injury supporting a full claim.'],
    ],
    treatmentProgression: [
      { label: 'Standard of care', copy: 'What a reasonably careful specialist would have done.' },
      { label: 'Breach', copy: 'A departure from that standard, not a known risk.' },
      { label: 'Causation', copy: 'The breach, not the illness, caused the harm.' },
      { label: 'Significant harm', copy: 'Damages serious enough to support the claim.' },
    ],
    settlementDrivers: [
      'Whether the standard of care was breached',
      'Whether the breach caused the harm',
      'How serious and lasting the harm is',
      'Whether an expert supports the claim',
      'Whether the records show what was known and when',
      'Whether the outcome was a known risk instead',
    ],
    settlementValueDetails: [
      { label: 'Not just a bad result', copy: 'Competent care can still produce poor outcomes.' },
      { label: 'Three elements together', copy: 'Breach, causation, and harm must all be present.' },
      { label: 'Expert gate', copy: 'A supportive expert is required to proceed.' },
      { label: 'Causation is key', copy: 'The error, not the disease, must have caused the harm.' },
    ],
    insuranceProblems: [
      'A known complication is presented as the whole explanation.',
      'The harm is attributed entirely to the underlying illness.',
      'Records are produced incomplete without a full request.',
      'The claim is dismissed before an expert reviews it.',
      'A short deadline passes during informal complaints.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What specifically do you believe was done wrong?' },
      { label: 'Step 2', question: 'Would a careful provider have acted differently?' },
      { label: 'Step 3', question: 'Was the harm caused by the error or the illness?' },
      { label: 'Step 4', question: 'How serious and lasting is the harm?' },
    ],
  },
  [MEDMAL_VALUE_SLUG]: {
    scenario: `A surgical error left a working parent permanently disabled. The pain-and-suffering award was bounded by MICRA, but the uncapped economic damages — decades of future care and a lost career — were the far larger figure, and recoverable in full. The cap shaped the claim; the economic losses defined its value. ${NOT_ADVICE}`,
    timeline: [
      ['Classify the claim', 'Injury or wrongful death — different cap tiers.'],
      ['Cost the economics', 'Future care and lost earning capacity, uncapped.'],
      ['Apply causation', 'Value reflects the harm the breach caused.'],
      ['Before settling', 'The uncapped economic losses usually drive the number.'],
    ],
    severityLadder: [
      ['Temporary harm', 'Recoverable but limited economic loss.'],
      ['Permanent injury', 'Large future-care and earning-capacity damages.'],
      ['Catastrophic', 'Lifelong care; economic losses dwarf the cap.'],
      ['Wrongful death', 'A separate, higher cap tier plus the family\u2019s losses.'],
    ],
    treatmentProgression: [
      { label: 'MICRA cap', copy: 'Non-economic damages only; raised in 2023 and rising yearly.' },
      { label: 'Economic damages', copy: 'Medical bills, future care, lost income — not capped.' },
      { label: 'Injury tier', copy: 'Began at $350,000, rising toward $750,000 over ten years.' },
      { label: 'Death tier', copy: 'Began at $500,000, rising toward $1,000,000.' },
    ],
    settlementDrivers: [
      'Whether it is an injury or wrongful-death claim',
      'The full future-care and medical cost',
      'Lost income and earning capacity',
      'How much harm the breach caused',
      'The severity and permanence of the injury',
      'When the case resolves, for the cap year',
    ],
    settlementValueDetails: [
      { label: 'Only pain is capped', copy: 'MICRA limits non-economic damages, nothing else.' },
      { label: 'Economics are uncapped', copy: 'Future care and lost earnings drive serious claims.' },
      { label: 'Cap rises each year', copy: 'The applicable figure depends on the resolution year.' },
      { label: 'Causation bounds it', copy: 'Recovery reflects the difference the error made.' },
    ],
    insuranceProblems: [
      'The claim is framed as if MICRA caps everything.',
      'Future-care costs are understated or ignored.',
      'Lost earning capacity is not calculated.',
      'The harm is blamed on the underlying illness.',
      'An average figure is offered instead of a real valuation.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is this an injury claim or a wrongful-death claim?' },
      { label: 'Step 2', question: 'What future medical care will the injury require?' },
      { label: 'Step 3', question: 'How does the injury affect the ability to work?' },
      { label: 'Step 4', question: 'How much of the harm did the error cause?' },
    ],
  },
  [MEDMAL_PROOF_SLUG]: {
    scenario: `The defense argued a patient\u2019s stroke was simply the course of his disease. The claim turned on an expert who showed the standard of care required acting on a warning sign hours earlier, and that timely treatment would have prevented the damage — tying the harm to the breach, not the illness. ${NOT_ADVICE}`,
    timeline: [
      ['Obtain the records', 'The complete file, not a summary.'],
      ['Define the standard', 'An expert states what proper care required.'],
      ['Show the breach', 'A departure from that standard, not a known risk.'],
      ['Prove causation', 'What proper care would have changed.'],
    ],
    severityLadder: [
      ['Records only', 'The file shows what was done but not yet why it was wrong.'],
      ['Standard defined', 'An expert establishes the required care.'],
      ['Breach shown', 'The departure from the standard is identified.'],
      ['Causation proven', 'The harm is tied to the breach, not the disease.'],
    ],
    treatmentProgression: [
      { label: 'Complete records', copy: 'Charts, imaging, results, and orders from everyone involved.' },
      { label: 'Expert testimony', copy: 'Required to define the standard and the breach.' },
      { label: 'Causation evidence', copy: 'What proper care would have changed.' },
      { label: 'Pre-suit notice', copy: 'The 90-day notice of intent before filing.' },
    ],
    settlementDrivers: [
      'The completeness of the medical records',
      'Whether an expert supports the standard-of-care case',
      'How strong the causation evidence is',
      'Whether the outcome was a known risk',
      'How many providers were involved',
      'Whether the deadlines allow time to build proof',
    ],
    settlementValueDetails: [
      { label: 'Records are the foundation', copy: 'Full files, not summaries, decide these cases.' },
      { label: 'Experts are required', copy: 'The standard of care is a medical question.' },
      { label: 'Causation is the battle', copy: 'Breach vs. the underlying illness.' },
      { label: 'Procedure matters', copy: 'The 90-day notice must be handled correctly.' },
    ],
    insuranceProblems: [
      'Only a discharge summary is provided instead of the full file.',
      'The harm is attributed to the disease, not the error.',
      'A reasonable-judgment defense masks a real breach.',
      'The claim stalls without an expert review.',
      'The short deadline runs before proof is assembled.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Do you have the complete records from every provider?' },
      { label: 'Step 2', question: 'What did proper care require in the circumstances?' },
      { label: 'Step 3', question: 'What would timely, correct care have changed?' },
      { label: 'Step 4', question: 'When did you learn of the harm?' },
    ],
  },
  [MEDMAL_SOL_SLUG]: {
    scenario: `A patient learned two years after surgery that an error had caused ongoing harm and assumed the two-year injury deadline applied. The malpractice rule was different: the one-year discovery clock had started when he found out, and it nearly expired while he gathered records. ${NOT_ADVICE}`,
    timeline: [
      ['Date of injury', 'The three-year outer clock starts here.'],
      ['Discovery', 'The one-year clock starts when the harm is found.'],
      ['90-day notice', 'Required before filing; can extend a late deadline.'],
      ['Whichever is first', 'One year from discovery or three from injury controls.'],
    ],
    severityLadder: [
      ['Comfortable', 'Recent discovery, well within both clocks.'],
      ['Discovery clock running', 'One year from learning of the harm, moving fast.'],
      ['Near the outer limit', 'Close to three years from the injury.'],
      ['Possibly barred', 'Past three years with no tolling exception.'],
    ],
    treatmentProgression: [
      { label: 'One year', copy: 'From discovering, or reasonably should have discovered, the harm.' },
      { label: 'Three years', copy: 'Outer limit from the injury, whichever comes first.' },
      { label: 'Tolling', copy: 'Fraud, concealment, or a foreign object can extend the outer limit.' },
      { label: 'Minors', copy: 'Three years, or until age eight for a child under six.' },
    ],
    settlementDrivers: [
      'The date of the negligent care',
      'When the harm was or should have been discovered',
      'Which clock expires first',
      'Whether a tolling exception applies',
      'The injured person\u2019s age',
      'Whether the 90-day notice has been given',
    ],
    settlementValueDetails: [
      { label: 'Two clocks, shorter wins', copy: 'One year from discovery or three from injury.' },
      { label: 'Discovery can be late', copy: 'Malpractice harm often surfaces well after the care.' },
      { label: 'Outer limit is firm', copy: 'Three years, absent a narrow exception.' },
      { label: 'Notice can extend it', copy: 'A late 90-day notice adds 90 days.' },
    ],
    insuranceProblems: [
      'The two-year injury rule is wrongly assumed to apply.',
      'The one-year discovery clock runs while records are gathered.',
      'A tolling argument is abandoned rather than assessed.',
      'A minor\u2019s special deadline is miscalculated.',
      'Informal talks are treated as pausing the clock.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'When did the negligent care occur?' },
      { label: 'Step 2', question: 'When did you first learn you had been harmed?' },
      { label: 'Step 3', question: 'Is the injured person a child?' },
      { label: 'Step 4', question: 'Has a notice of intent to sue been given?' },
    ],
  },
}
