import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The four nursing-home / elder-abuse guides — a legally distinct hub.
 *
 * California treats elder abuse and neglect under its own statute, the Elder
 * Abuse and Dependent Adult Civil Protection Act (Welfare & Institutions Code
 * section 15600 et seq.), not as ordinary negligence. That distinction is the
 * whole point of the hub, because it unlocks remedies that ordinary claims lack:
 * where abuse, neglect, or financial abuse is proven by clear and convincing
 * evidence together with recklessness, oppression, fraud, or malice, the
 * plaintiff can recover attorney's fees and costs, and the survivors can recover
 * the deceased's own pre-death pain and suffering (capped at $250,000) that an
 * ordinary survival action cannot reach.
 *
 * Four pages cover the queries a worried family types: value and the signs of
 * abuse, who is liable, the filing deadline (with the malpractice-vs-neglect
 * distinction that decides which deadline applies), and whether to hire a
 * lawyer. No page states an average or a typical payout.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm and this is general information rather than legal advice. An elder-abuse claim turns on whether conduct was neglect or professional negligence, the enhanced-remedy standard, and facts particular to the resident, which a licensed California attorney can review.'

export const ELDER_VALUE_SLUG = '/how-much-is-a-nursing-home-abuse-case-worth-in-california'
export const ELDER_LIABILITY_SLUG = '/who-is-liable-for-nursing-home-abuse-in-california'
export const ELDER_SOL_SLUG = '/california-nursing-home-abuse-statute-of-limitations'
export const ELDER_HIRE_SLUG = '/do-i-need-a-lawyer-for-nursing-home-abuse-in-california'

export const elderAbuseGuidePages: LandingPage[] = [
  {
    slug: ELDER_VALUE_SLUG,
    category: 'Settlement',
    cluster: 'Elder Abuse Claim Value',
    title: 'How Much Is a Nursing Home Abuse Case Worth in California?',
    eyebrow: 'Elder abuse value guide',
    description:
      'California\u2019s Elder Abuse Act changes the value of these claims: prove neglect or abuse with recklessness by clear and convincing evidence, and the family can recover attorney\u2019s fees and the resident\u2019s own pre-death suffering that ordinary claims cannot reach.',
    psychology: 'I think my parent was neglected in a nursing home and want to understand the claim.',
    cta: 'Estimate My Case Value',
    exampleQueries: [
      'how much is a nursing home abuse case worth in California',
      'nursing home neglect settlement California',
      'bedsore lawsuit settlement California',
      'signs of nursing home abuse and neglect',
      'elder abuse damages California',
    ],
    signals: [
      'Pressure ulcers / bedsores',
      'Malnutrition or dehydration',
      'Falls or unexplained injury',
      'Recklessness / understaffing',
      'Enhanced remedies (fees, pre-death pain)',
      'Financial exploitation',
    ],
    sections: {
      whyItMatters:
        'A nursing-home claim is valued differently from an ordinary injury claim because California gives it a different legal engine. Under the Elder Abuse and Dependent Adult Civil Protection Act, neglect and abuse of an elder (65 or older) or a dependent adult are not treated as garden-variety negligence, and that changes both what has to be proven and what can be recovered. The ordinary compensatory layers are still there — the medical cost of treating a pressure ulcer that reached bone, a hospitalization for sepsis or dehydration, the surgery after an unwitnessed fall — but the layer that most often drives value in these cases is the resident\u2019s own physical pain and emotional suffering, and here the statute does something unusual. Normally, when an injured person dies, a survival action cannot recover the pain and suffering they endured before death. The Elder Abuse Act lifts that bar: where a plaintiff proves by clear and convincing evidence that the defendant is liable for neglect, physical abuse, or financial abuse and acted with recklessness, oppression, fraud, or malice, the survivors can recover the deceased\u2019s pre-death pain and suffering, subject to a $250,000 cap, and — just as importantly — the defendant pays the plaintiff\u2019s attorney\u2019s fees and costs. Those enhanced remedies are the reason a neglect claim that would be modest as ordinary negligence can be substantial, and they are why proving recklessness (chronic understaffing, ignored care plans, falsified charts) rather than a one-off mistake is the pivot the whole valuation turns on. The signs that tend to establish neglect are concrete and worth recognising: pressure ulcers (bedsores), especially advanced ones; malnutrition and dehydration; repeated or unexplained falls and fractures; medication errors; sudden weight loss; poor hygiene and untreated infections; and behavioural changes like withdrawal or fear. Financial abuse — unexplained withdrawals, changed beneficiaries, missing property — is a separate track with its own remedies. Collectability is usually less of a constraint here than in other claims, because facilities and their corporate owners carry insurance, though ownership is often layered across management companies and holding entities in ways that matter for who ultimately pays. The honest early questions are whether what happened was neglect rising to recklessness rather than an isolated error, and what the records show about staffing and the care plan.',
      whatToTrack: [
        'Photographs of any pressure ulcers, injuries, or conditions, dated',
        'The complete medical and facility records, including the care plan',
        'Signs of neglect: weight loss, dehydration, falls, infections, poor hygiene',
        'Staffing levels and whether the care plan was followed',
        'Any prior complaints, citations, or state inspection findings for the facility',
        'The resident\u2019s condition on admission versus over time',
        'Financial records, if exploitation is suspected',
        'The corporate owner and any management company behind the facility',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps distinguish a claim that is ordinary negligence from one that reaches the Elder Abuse Act\u2019s recklessness standard, because that distinction is what unlocks attorney\u2019s fees and the resident\u2019s pre-death suffering — and it is where the value largely lives. It organises the records, the timeline of decline, and the staffing picture that establish neglect, and identifies the corporate layers behind a facility. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Is there an average nursing home abuse settlement in California?',
        a: 'No usable average, because value swings on whether the conduct was ordinary negligence or neglect rising to recklessness under the Elder Abuse Act. The latter unlocks attorney\u2019s fees and the resident\u2019s pre-death pain and suffering, which can make an otherwise modest claim substantial. The severity of the harm and what the records show about staffing matter far more than any average.',
      },
      {
        q: 'What are the signs of nursing home abuse or neglect?',
        a: 'Pressure ulcers (bedsores), malnutrition and dehydration, sudden weight loss, repeated or unexplained falls and fractures, medication errors, untreated infections, poor hygiene, and behavioural changes like withdrawal or fear. Financial signs include unexplained withdrawals, changed beneficiaries, and missing property. Several of these together, or a clear decline after admission, often point to neglect.',
      },
      {
        q: 'Can we recover for a bedsore that developed in the facility?',
        a: 'Often yes. Advanced pressure ulcers are largely preventable with proper care, so a serious bedsore that developed or worsened in a facility is a common basis for a neglect claim. If the records show it resulted from recklessness — understaffing, an ignored care plan, falsified charting — the enhanced remedies under the Elder Abuse Act may apply on top of the medical damages.',
      },
      {
        q: 'My parent died. Can we still bring a claim?',
        a: 'Yes, and the Elder Abuse Act is significant here. Ordinarily a survival action cannot recover the pain and suffering the person endured before death, but where neglect or abuse with recklessness is proven by clear and convincing evidence, the survivors can recover that pre-death suffering, capped at $250,000, plus attorney\u2019s fees. A separate wrongful-death claim may also exist for the family\u2019s losses.',
      },
      {
        q: 'What are "enhanced remedies" and why do they matter?',
        a: 'They are the extra recoveries the Elder Abuse Act allows when neglect, physical abuse, or financial abuse is proven by clear and convincing evidence together with recklessness, oppression, fraud, or malice: the plaintiff\u2019s attorney\u2019s fees and costs, and the deceased\u2019s pre-death pain and suffering (up to $250,000). They are what separate an elder-abuse claim from ordinary negligence and often drive its value.',
      },
    ],
  },
  {
    slug: ELDER_LIABILITY_SLUG,
    category: 'Liability',
    cluster: 'Elder Abuse Liability',
    title: 'Who Is Liable for Nursing Home Abuse in California?',
    eyebrow: 'Elder abuse liability',
    description:
      'A California facility, its corporate owner, and management company can all be liable for neglect — and it matters whether the harm was custodial neglect under the Elder Abuse Act or professional negligence, because they carry very different rules and remedies.',
    psychology: 'I want to know who is responsible for what happened to my family member.',
    cta: 'Check If You Have a Claim',
    exampleQueries: [
      'who is liable for nursing home abuse in California',
      'can I sue a nursing home for neglect California',
      'is a nursing home responsible for bedsores',
      'nursing home neglect vs medical malpractice California',
      'nursing home understaffing lawsuit California',
    ],
    signals: [
      'Custodial neglect vs malpractice',
      'Understaffing',
      'Care-plan failure',
      'Corporate owner / management',
      'Clear and convincing standard',
      'Recklessness',
    ],
    sections: {
      whyItMatters:
        'Liability for nursing-home harm in California starts with a classification that decides almost everything downstream: was the harm custodial neglect governed by the Elder Abuse Act, or professional negligence governed by medical-malpractice rules? The distinction is not academic. Custodial neglect is the failure of those responsible for a resident\u2019s basic care to provide it — food and hydration, hygiene, mobility and repositioning to prevent pressure ulcers, protection from falls, medical care that was ordered. Professional negligence is a provider\u2019s failure to meet the medical standard of care in diagnosis or treatment. The same bedsore can arise either way, but neglect under the Elder Abuse Act carries the enhanced remedies — attorney\u2019s fees and the resident\u2019s pre-death suffering — while professional negligence carries the shorter malpractice deadline and its damage limits. California courts (notably in Covenant Care) have drawn this line precisely because facilities try to recharacterise neglect as malpractice to escape the enhanced remedies, so establishing that what happened was a failure of custodial care, not a treatment decision, is often the central fight. Who can be liable is usually more than the facility itself. The skilled-nursing facility or residential care facility is the obvious defendant, but nursing homes are frequently owned through layers — a licensee, a parent company, a management company, and real-estate holding entities — and these structures are often built specifically to separate the operating cash from the corporate ownership. Reaching the entity that actually made the understaffing decisions can matter enormously for both liability and collectability. Individual employees who abused or neglected a resident can be liable too, and a facility is generally responsible for its staff. The proof that establishes liability is documentary: staffing records that show whether the facility met minimum ratios, the care plan and whether it was followed, the charting (and whether it was falsified), state inspection findings and prior citations, and the resident\u2019s decline measured against their condition on admission. Because the enhanced remedies require clear and convincing evidence of recklessness, oppression, fraud, or malice — a higher bar than ordinary negligence — the pattern the records reveal, chronic understaffing rather than a single lapse, is what turns a facility\u2019s general responsibility into the kind of liability the statute was written for.',
      whatToTrack: [
        'Whether the harm was custodial neglect or a treatment decision',
        'Staffing levels and whether minimum ratios were met',
        'The care plan and whether it was actually followed',
        'The charting, and any sign it was inaccurate or falsified',
        'State inspection findings, citations, and prior complaints',
        'The corporate owner, licensee, and any management company',
        'Which individual staff were involved',
        'The resident\u2019s condition on admission versus over time',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps classify the harm as custodial neglect or professional negligence, because that single question decides which rules and remedies apply, and it is the recharacterisation facilities fight hardest. It organises the staffing, care-plan, and inspection records that establish recklessness, and maps the corporate layers behind a facility so the responsible entity is not lost. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Can I sue a nursing home for neglect in California?',
        a: 'Yes. California\u2019s Elder Abuse Act specifically allows claims against facilities for neglect of an elder or dependent adult, and where the neglect involved recklessness it carries enhanced remedies. The facility, its corporate owner, a management company, and individual staff can all potentially be liable depending on the facts.',
      },
      {
        q: 'Is the nursing home responsible for bedsores?',
        a: 'Often, because advanced pressure ulcers are largely preventable with proper repositioning and care. A serious bedsore that developed or worsened in a facility commonly reflects a failure of custodial care, and if the records show understaffing or an ignored care plan, the facility can be liable under the Elder Abuse Act rather than merely for ordinary negligence.',
      },
      {
        q: 'What is the difference between neglect and medical malpractice here?',
        a: 'Neglect is the failure to provide basic custodial care — hydration, hygiene, repositioning, fall protection — and falls under the Elder Abuse Act with its enhanced remedies. Medical malpractice is a failure to meet the medical standard of care in treatment, and it carries the shorter malpractice deadline and damage limits. Facilities often try to recharacterise neglect as malpractice, so the distinction is frequently contested.',
      },
      {
        q: 'Can I sue the corporate owner, not just the facility?',
        a: 'Potentially, and it often matters. Nursing homes are frequently owned through layered entities — a licensee, a parent company, a management company — sometimes structured to separate the money from the operations. Reaching the entity that made the staffing and budget decisions can be important for both proving recklessness and collecting a judgment.',
      },
      {
        q: 'Does understaffing help prove the claim?',
        a: 'Yes, it is often central. The enhanced remedies require clear and convincing evidence of recklessness, and chronic understaffing that made proper care impossible is a classic way that standard is met. Staffing records, the care plan, and the charting are the documents that reveal whether a single lapse or a systemic pattern was at work.',
      },
    ],
  },
  {
    slug: ELDER_SOL_SLUG,
    category: 'Attorney Intent',
    cluster: 'Elder Abuse Filing Deadlines',
    title: 'California Nursing Home Abuse Statute of Limitations',
    eyebrow: 'Filing deadlines',
    description:
      'Two years for elder neglect and physical abuse, and four years for financial abuse — but if a facility recharacterises neglect as medical malpractice, a shorter one-year clock may be argued. Which label applies can decide whether the claim survives.',
    psychology: 'I need to know how long I have to sue a nursing home.',
    cta: 'Check My Filing Deadline',
    exampleQueries: [
      'how long do I have to sue a nursing home in California',
      'nursing home abuse statute of limitations California',
      'elder abuse filing deadline California',
      'financial elder abuse statute of limitations California',
    ],
    signals: [
      'Neglect / physical abuse (2 years)',
      'Financial abuse (4 years)',
      'Malpractice recharacterisation (1 year)',
      'Date of death',
      'Delayed discovery',
      'Government facility',
    ],
    sections: {
      whyItMatters:
        'The deadline for a California nursing-home claim depends on what kind of claim it is, and the categories carry genuinely different clocks — which is why the label a facility tries to attach to the harm is not a technicality but a defense. Elder abuse and neglect claims for physical harm generally run on the two-year personal-injury period, measured from the injury or, where a wrongful death results, from the date of death. Financial elder abuse runs longer, on a four-year period, and it often has its own delayed-discovery features because exploitation is by nature concealed and may not surface until well after it occurred. Cutting against the two-year period is the recharacterisation problem: if the conduct is framed as professional negligence — a treatment or diagnostic failure rather than a failure of custodial care — the medical-malpractice limitations apply instead, which is commonly one year from when the injury was or should have been discovered, subject to an outer limit of three years, and facilities argue this precisely because it is shorter and can extinguish a claim that would be timely as neglect. So the same set of facts can be timely or barred depending on whether it is neglect or malpractice, and resolving that is often the first order of business. Two further points matter. The delayed-discovery rule can start the clock later where the harm or its cause was not reasonably apparent, which arises constantly in this setting because families are not present for daily care and a decline may be attributed to age until records are reviewed. And where the facility is a government entity — a county or state-run home — the six-month government-claim requirement applies and comes long before any of the other periods. As with all injury claims, negotiating with the facility or its insurer does not pause the clock. The practical consequence is that the safest assumption is the shortest plausible deadline: treat the claim as though a one-year malpractice argument could be raised, act well inside two years, and identify any government-entity or financial-abuse dimension early, because each changes the date you are working towards.',
      whatToTrack: [
        'Whether the harm is neglect, physical abuse, or financial abuse',
        'Whether the facility may argue it was professional negligence',
        'The date of injury and, if applicable, the date of death',
        'When the harm or its cause was actually discovered',
        'Whether the facility is privately or government operated',
        'Whether financial exploitation may extend the period to four years',
      ],
      howClearCaseHelps:
        'The deadline checker computes the common windows from the dates and the claim type, and ClearCaseIQ flags the recharacterisation risk — whether a facility could argue the shorter malpractice clock — because that is what most often decides whether a claim is timely. It records the injury and discovery dates, separates a financial-abuse track with its longer period, and surfaces the six-month clock where a government facility is involved.',
    },
    faqs: [
      {
        q: 'How long do I have to sue a nursing home in California?',
        a: 'Generally two years for elder neglect or physical abuse, measured from the injury or, in a death, from the date of death. Financial elder abuse runs four years. But if the facility recharacterises the harm as medical malpractice, a shorter one-year clock may be argued, so the safest course is to act well inside two years and get the claim type assessed.',
      },
      {
        q: 'Why might a one-year deadline apply instead of two?',
        a: 'Because if the conduct is framed as professional negligence — a treatment or diagnostic failure rather than a failure of basic custodial care — the medical-malpractice limitations apply, commonly one year from discovery with a three-year outer limit. Facilities argue this because it is shorter and can bar a claim that would be timely as neglect, which is why the neglect-versus-malpractice distinction is fought early.',
      },
      {
        q: 'What is the deadline for financial elder abuse?',
        a: 'Generally four years, and because financial exploitation is often concealed, the period may not start until it was or reasonably should have been discovered. Unexplained withdrawals, changed beneficiaries, or missing assets frequently come to light long after the fact, which is what the longer period and the discovery rule account for.',
      },
      {
        q: 'We only realised what happened after reviewing the records. Are we too late?',
        a: 'Possibly not. The delayed-discovery rule can start the clock when the harm or its cause was reasonably discovered rather than when it occurred, which is common in this setting because families are not present for daily care. It is fact-specific and contested, so it should be assessed quickly rather than assumed either way.',
      },
      {
        q: 'The facility is county or state run. Does that change the deadline?',
        a: 'Yes. A claim against a government-operated facility generally requires a written claim presented within six months, far ahead of the other deadlines, and missing it can foreclose the claim. It needs to be identified and acted on immediately.',
      },
    ],
  },
  {
    slug: ELDER_HIRE_SLUG,
    category: 'Attorney Intent',
    cluster: 'Elder Abuse Hiring',
    title: 'Do I Need a Lawyer for Nursing Home Abuse in California?',
    eyebrow: 'Hiring an attorney',
    description:
      'Elder-abuse claims turn on records only a lawyer can compel, on proving recklessness to a clear-and-convincing standard, and on defeating a facility\u2019s attempt to shrink the claim into malpractice. Contingency fees mean no cost up front, and the statute can make the facility pay your fees.',
    psychology: 'I want to know whether a nursing home abuse claim needs a lawyer.',
    cta: 'Get Matched With an Elder Abuse Lawyer',
    exampleQueries: [
      'do I need a lawyer for nursing home abuse in California',
      'how much does an elder abuse lawyer cost',
      'nursing home neglect attorney California',
      'is a nursing home abuse case worth pursuing',
    ],
    signals: [
      'Serious harm or death',
      'Recklessness / understaffing',
      'Malpractice recharacterisation risk',
      'Records to compel',
      'Corporate ownership layers',
      'Fee-shifting available',
    ],
    sections: {
      whyItMatters:
        'Nursing-home claims are among the ones where a lawyer is close to essential, because almost everything that decides them requires legal tools a family does not have. The proof lives in records the facility controls — staffing rosters, the care plan, the charting, incident reports, state inspection files — and getting complete, unaltered versions of those usually takes formal discovery and the ability to detect and challenge falsified or missing entries. The claim\u2019s value depends on meeting the Elder Abuse Act\u2019s heightened standard: not merely that care was substandard, but that it was reckless, proven by clear and convincing evidence, which is a demanding threshold that turns on assembling a pattern (chronic understaffing, ignored care plans) rather than pointing to one bad day. And the defense that most threatens these claims — recharacterising neglect as ordinary professional negligence to strip the enhanced remedies and shorten the deadline — is a legal argument that has to be met with a legal argument. None of that is realistic to do alone against facilities and insurers who litigate these cases routinely. The economics strongly favor getting representation: elder-abuse lawyers work on contingency, with nothing up front, a percentage of the recovery, case costs advanced and repaid from it, and no fee if there is no recovery — and uniquely, where the enhanced remedies apply, the statute shifts the plaintiff\u2019s attorney\u2019s fees onto the defendant, which both improves the net recovery and gives lawyers reason to take strong cases. The situations that make a lawyer essential are the common ones here: serious harm or death, any sign of recklessness or understaffing, a facility already framing the harm as a treatment issue, and the layered corporate ownership that has to be pierced to reach the responsible entity. There is rarely a version of a genuine nursing-home neglect claim that is better handled alone, because the records will not come without compulsion and the enhanced remedies will not be available without proving a standard families cannot document on their own. Because the review is free and the deadlines — including a possible one-year malpractice argument and a six-month government clock — can be short, getting evaluated quickly costs nothing and protects the claim.',
      whatToTrack: [
        'How serious the harm was, including whether the resident died',
        'Any sign of recklessness, understaffing, or falsified records',
        'Whether the facility is framing the harm as a treatment issue',
        'What records exist and which the facility controls',
        'The corporate owner and management structure',
        'Any offer already made and how it treats the enhanced remedies',
        'The relevant dates, since malpractice and government deadlines can be short',
      ],
      howClearCaseHelps:
        `ClearCaseIQ helps you see whether a nursing-home claim reaches the Elder Abuse Act\u2019s recklessness standard — the thing that unlocks fee-shifting and the resident\u2019s pre-death suffering — before you commit to anyone. It flags the malpractice-recharacterisation risk and the records that will have to be compelled, and matches you with California elder-abuse attorneys who work on contingency. ${NOT_ADVICE}`,
    },
    faqs: [
      {
        q: 'Do I need a lawyer for a nursing home abuse claim?',
        a: 'Almost always, for a genuine claim. The proof lives in records the facility controls and will not release without formal discovery, the enhanced remedies require proving recklessness to a clear-and-convincing standard, and facilities routinely try to shrink neglect into malpractice. These are legal tasks a family cannot realistically do alone against experienced defense litigators.',
      },
      {
        q: 'How much does an elder abuse lawyer cost in California?',
        a: 'Typically nothing up front. These lawyers work on contingency — a percentage of the recovery, with case costs advanced and repaid from it, and no fee if there is no recovery. Uniquely, where the Elder Abuse Act\u2019s enhanced remedies apply, the statute shifts your attorney\u2019s fees onto the defendant, which can improve your net recovery.',
      },
      {
        q: 'Is a nursing home neglect case worth pursuing?',
        a: 'It depends most on the severity of the harm and whether the records show recklessness rather than an isolated mistake. Where neglect with recklessness can be proven, the enhanced remedies — attorney\u2019s fees and the resident\u2019s pre-death suffering — can make a claim worthwhile that would be modest as ordinary negligence. A contingency review will tell you without cost.',
      },
      {
        q: 'The facility says it was just a medical complication. Can a lawyer help?',
        a: 'Yes, and this is a central reason to have one. Recharacterising neglect as a treatment issue is the defense that strips the enhanced remedies and shortens the deadline, and defeating it takes the Elder Abuse Act applied to the custodial-care facts. A lawyer builds that argument; a family responding alone is often steered toward the weaker, shorter malpractice framing.',
      },
      {
        q: 'What should I ask an elder abuse lawyer before hiring them?',
        a: 'How many Elder Abuse Act cases they have handled, how they prove recklessness and defeat the malpractice recharacterisation, how they obtain staffing and charting records, how they reach the corporate owners, whether fee-shifting applies, the contingency percentage, and how case costs are handled.',
      },
    ],
  },
]

export const elderAbuseGuideTopicContentBySlug: Record<string, TopicContent> = {
  [ELDER_VALUE_SLUG]: {
    scenario: `A daughter found a stage IV pressure ulcer on her mother that the facility had charted as "improving." The medical costs alone were modest, but staffing records showed chronic understaffing and the charting was contradicted by photographs — recklessness that unlocked the resident\u2019s pre-death suffering and the facility\u2019s payment of attorney\u2019s fees. ${NOT_ADVICE}`,
    timeline: [
      ['Notice the signs', 'Photograph injuries and conditions; note the decline.'],
      ['Get the records', 'The care plan, charting, and staffing data establish neglect.'],
      ['Classify the harm', 'Neglect with recklessness unlocks the enhanced remedies.'],
      ['Before settling', 'Value reflects the enhanced remedies, not just the medical bills.'],
    ],
    severityLadder: [
      ['Isolated lapse', 'A single error; likely ordinary negligence, limited value.'],
      ['Neglect', 'A failure of basic care causing real harm.'],
      ['Reckless neglect', 'A pattern — understaffing, ignored care plan — unlocking enhanced remedies.'],
      ['Death', 'Neglect contributing to death, with survival and wrongful-death claims.'],
    ],
    treatmentProgression: [
      { label: 'The harm', copy: 'Pressure ulcers, malnutrition, dehydration, falls, or infection.' },
      { label: 'The medical cost', copy: 'Treatment, hospitalization, and surgery for the resulting injury.' },
      { label: 'Pre-death suffering', copy: 'The resident\u2019s own pain, recoverable under the Act up to $250,000.' },
      { label: 'Fee-shifting', copy: 'The facility pays the plaintiff\u2019s attorney\u2019s fees where the Act applies.' },
    ],
    settlementDrivers: [
      'The severity of the harm',
      'Whether neglect rose to recklessness',
      'What staffing and charting records reveal',
      'Whether the resident died',
      'Whether financial abuse is also present',
      'The corporate defendant\u2019s coverage',
    ],
    settlementValueDetails: [
      { label: 'Enhanced remedies drive it', copy: 'Fees and pre-death suffering can dwarf the medical bills.' },
      { label: 'Recklessness is the pivot', copy: 'A pattern, not a single lapse, unlocks the statute.' },
      { label: 'Records are the proof', copy: 'Staffing and charting decide whether recklessness is shown.' },
      { label: 'Coverage is usually present', copy: 'Facilities and owners carry insurance, though ownership is layered.' },
    ],
    insuranceProblems: [
      'The facility charts a worsening ulcer as "improving."',
      'Neglect is framed as an unavoidable medical complication.',
      'Understaffing is hidden in incomplete records.',
      'A quick offer covers medical bills but ignores the enhanced remedies.',
      'The corporate owner is obscured behind management entities.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'What harm occurred — bedsores, falls, malnutrition, or death?' },
      { label: 'Step 2', question: 'Do photographs or records document the condition over time?' },
      { label: 'Step 3', question: 'Are there signs of understaffing or an ignored care plan?' },
      { label: 'Step 4', question: 'Is financial exploitation also suspected?' },
    ],
  },
  [ELDER_LIABILITY_SLUG]: {
    scenario: `After a resident died of sepsis from an untreated wound, the facility called it a treatment complication to invoke malpractice rules. The records showed the wound had gone unassessed for days amid a staffing shortage — custodial neglect under the Elder Abuse Act, reaching the licensee and its parent company. ${NOT_ADVICE}`,
    timeline: [
      ['Classify the harm', 'Custodial neglect or a treatment decision — the pivotal question.'],
      ['Gather the records', 'Staffing, care plan, charting, and inspection findings.'],
      ['Map the owners', 'Licensee, parent company, and management entities.'],
      ['Prove recklessness', 'A pattern meeting the clear-and-convincing standard.'],
    ],
    severityLadder: [
      ['Facility only', 'The operating facility is the obvious defendant.'],
      ['Corporate owner', 'A parent or management company made the staffing decisions.'],
      ['Individual staff', 'An employee who abused or neglected the resident.'],
      ['Government facility', 'A public home, adding the six-month claim requirement.'],
    ],
    treatmentProgression: [
      { label: 'Custodial neglect', copy: 'Failure to provide basic care; Elder Abuse Act with enhanced remedies.' },
      { label: 'Professional negligence', copy: 'A treatment failure; malpractice rules and shorter deadline.' },
      { label: 'Corporate liability', copy: 'The entity that controlled staffing and budget may be reached.' },
      { label: 'Vicarious liability', copy: 'A facility is generally responsible for its staff.' },
    ],
    settlementDrivers: [
      'Whether the harm was neglect or a treatment decision',
      'Whether minimum staffing ratios were met',
      'Whether the care plan was followed',
      'What inspection findings and prior citations show',
      'Which corporate entities controlled the facility',
      'Whether recklessness can be proven',
    ],
    settlementValueDetails: [
      { label: 'Classification is everything', copy: 'Neglect unlocks remedies malpractice does not.' },
      { label: 'Owners can be reached', copy: 'Layered corporate structures do not automatically shield the decision-makers.' },
      { label: 'Records reveal the pattern', copy: 'Staffing and charting show recklessness or an isolated lapse.' },
      { label: 'Higher proof standard', copy: 'Enhanced remedies require clear and convincing evidence.' },
    ],
    insuranceProblems: [
      'Neglect is recharacterised as a medical complication.',
      'Staffing records are produced incomplete.',
      'The charting is contradicted by the resident\u2019s actual condition.',
      'The responsible corporate entity is hidden behind a licensee.',
      'Prior citations for the same failing are downplayed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Was this a failure of basic care or a treatment decision?' },
      { label: 'Step 2', question: 'Are there signs the facility was understaffed?' },
      { label: 'Step 3', question: 'Was the written care plan followed?' },
      { label: 'Step 4', question: 'Who owns and manages the facility?' },
    ],
  },
  [ELDER_SOL_SLUG]: {
    scenario: `A family assumed they had two years after their father\u2019s neglect-related death. The facility argued the harm was a treatment failure subject to the one-year malpractice clock. Whether the claim survived turned entirely on proving it was custodial neglect, not medicine. ${NOT_ADVICE}`,
    timeline: [
      ['Date of injury or death', 'The two-year neglect clock is measured from here.'],
      ['Discovery', 'The clock may start when the harm or cause was reasonably found.'],
      ['Six-month mark', 'Where the facility is government-run, a written claim is due.'],
      ['Two / four years', 'Two years for neglect; four for financial abuse.'],
    ],
    severityLadder: [
      ['Clearly timely', 'Well within two years and plainly custodial neglect.'],
      ['Recharacterisation risk', 'The facility may argue the one-year malpractice clock.'],
      ['Discovery in play', 'Harm or cause found late; fact-specific and contested.'],
      ['May have passed', 'Beyond the applicable period with no exception available.'],
    ],
    treatmentProgression: [
      { label: 'Two years', copy: 'Elder neglect and physical abuse, from injury or death.' },
      { label: 'Four years', copy: 'Financial elder abuse, often with delayed discovery.' },
      { label: 'One year', copy: 'If recharacterised as professional negligence (malpractice).' },
      { label: 'Six months', copy: 'A government-operated facility triggers the claim requirement.' },
    ],
    settlementDrivers: [
      'Whether the claim is neglect, physical abuse, or financial abuse',
      'Whether a malpractice recharacterisation could apply',
      'The date of injury and any date of death',
      'When the harm or its cause was discovered',
      'Whether the facility is government operated',
      'Whether financial abuse extends the period',
    ],
    settlementValueDetails: [
      { label: 'The label sets the clock', copy: 'Neglect gets two years; malpractice framing can mean one.' },
      { label: 'Financial abuse runs longer', copy: 'Four years, often with delayed discovery.' },
      { label: 'Discovery can help', copy: 'The clock may start when the harm was reasonably found.' },
      { label: 'Government adds a clock', copy: 'A public facility brings a six-month claim requirement.' },
    ],
    insuranceProblems: [
      'The facility frames neglect as malpractice to shorten the deadline.',
      'A negotiation runs while the shortest plausible clock expires.',
      'A government facility\u2019s six-month deadline is missed.',
      'A financial-abuse claim is assumed to share the two-year period.',
      'A delayed-discovery argument is abandoned rather than assessed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Is the harm neglect, physical abuse, or financial abuse?' },
      { label: 'Step 2', question: 'What are the dates of injury and, if applicable, death?' },
      { label: 'Step 3', question: 'When did you learn what actually happened?' },
      { label: 'Step 4', question: 'Is the facility privately or government operated?' },
    ],
  },
  [ELDER_HIRE_SLUG]: {
    scenario: `A family with photographs of a serious bedsore could not get the facility\u2019s staffing records on their own and were offered a small sum framed as covering the medical bills. A lawyer compelled the records, proved chronic understaffing, and the enhanced remedies — with the facility paying the fees — transformed the recovery. ${NOT_ADVICE}`,
    timeline: [
      ['Notice the harm', 'Document conditions and the resident\u2019s decline.'],
      ['Records blocked', 'The facility controls the proof and will not release it freely.'],
      ['Deciding on counsel', 'Serious harm, recklessness, or a malpractice framing are the signals.'],
      ['Before accepting', 'An early offer usually ignores the enhanced remedies.'],
    ],
    severityLadder: [
      ['Rarely handle alone', 'Even modest claims need records only discovery can compel.'],
      ['Get a review', 'Any serious harm or sign of neglect.'],
      ['Get representation', 'Recklessness, death, or a malpractice recharacterisation.'],
      ['Move quickly', 'A one-year malpractice argument or a government six-month clock.'],
    ],
    treatmentProgression: [
      { label: 'Contingency fee', copy: 'Nothing up front; costs advanced; no fee if there is no recovery.' },
      { label: 'Fee-shifting', copy: 'Where the Act applies, the facility pays the plaintiff\u2019s fees.' },
      { label: 'Compelling records', copy: 'Discovery obtains staffing and charting the family cannot.' },
      { label: 'Proving recklessness', copy: 'Assembling the pattern to meet the clear-and-convincing standard.' },
    ],
    settlementDrivers: [
      'How serious the harm was',
      'Whether recklessness can be proven',
      'Whether the facility is framing it as malpractice',
      'What records must be compelled',
      'The corporate ownership structure',
      'Whether the deadlines are short',
    ],
    settlementValueDetails: [
      { label: 'Records need compulsion', copy: 'The proof will not come without formal discovery.' },
      { label: 'Fee-shifting changes economics', copy: 'The facility paying fees improves the net recovery.' },
      { label: 'Recharacterisation is a legal fight', copy: 'Defeating the malpractice framing takes a lawyer.' },
      { label: 'Free to be evaluated', copy: 'A contingency review costs only time.' },
    ],
    insuranceProblems: [
      'A small offer is framed as covering the medical bills only.',
      'Records are withheld or produced incomplete without discovery.',
      'The harm is recast as an unavoidable complication.',
      'The family is discouraged from pursuing the corporate owner.',
      'A short deadline is allowed to run during informal talks.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How serious was the harm, and did the resident die?' },
      { label: 'Step 2', question: 'Is there any sign of understaffing or falsified records?' },
      { label: 'Step 3', question: 'Is the facility calling it a medical complication?' },
      { label: 'Step 4', question: 'Has any offer been made?' },
    ],
  },
}
