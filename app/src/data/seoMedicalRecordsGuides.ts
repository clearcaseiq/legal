import type { LandingPage } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

/**
 * The two authored pages in the medical records family.
 *
 * This family is deliberately not consolidated. It scored 0.814 like the
 * others, but it is the only family whose URLs map to demonstrated demand:
 * "medical record review insurance companies" was the highest-impression query
 * in three months of Search Console data, and it already has a page. Collapsing
 * five URLs that each match a distinct real query would throw away the coverage
 * rather than the duplication.
 *
 * So these two are rewritten rather than merged, starting with the page that
 * matches the biggest query and the chronology page behind it. The remaining
 * remaining three followed, and the generated seed file was removed once empty.
 */

export const INSURANCE_REVIEW_SLUG = '/how-insurance-companies-review-medical-records'
export const CHRONOLOGY_SLUG = '/how-to-build-a-medical-chronology'
export const HUB_SLUG = '/medical-records'
export const ORGANIZE_SLUG = '/how-to-organize-medical-records'
export const LAWYERS_NEED_SLUG = '/what-medical-records-do-lawyers-need'

export const medicalRecordsGuidePages: LandingPage[] = [
  {
    slug: INSURANCE_REVIEW_SLUG,
    category: 'Educational / SEO Moat',
    cluster: 'Insurance Medical Record Review',
    title: 'How Insurance Companies Review Medical Records',
    eyebrow: 'What the other side is reading',
    description:
      'Your records are not read the way you experienced treatment. They are searched for a shorter list of things — the delay before your first visit, any gap between visits, prior complaints of the same body part, and the words a radiologist used — because each one supports paying less.',
    psychology: 'I want to know what the insurer is looking for in my records.',
    cta: 'Review My Record Risk',
    exampleQueries: [
      'how insurance companies review medical records',
      'medical record review insurance companies',
      'insurance adjuster medical records accident',
      'what do insurance adjusters look for in medical records',
    ],
    signals: [
      'Delay to first treatment',
      'Gaps between visits',
      'Prior injury to the same area',
      'Degenerative imaging language',
      'Subjective versus objective findings',
      'Billing review and repricing',
    ],
    sections: {
      whyItMatters:
        'On a small claim an adjuster reads the records themselves. Past a certain value they usually do not: the file goes to a nurse reviewer or an outside record-review vendor who produces a summary and a list of problems, and the bills go through a separate repricing system that benchmarks each billed code against a database of what that code is typically paid in that geography. Two things follow from this. The person deciding your claim may never read a full record, only a summary written to identify weaknesses. And the medical and billing critiques arrive independently, which is why a claim can be told simultaneously that the treatment was excessive and that the charges for it were above the usual rate. The review is looking for a fairly short list. The interval between the collision and the first medical visit, because a delay supports an argument that the injury came from something else. Any gap between visits, which is the most-used argument of all — a period without treatment is read as evidence of recovery, and it is read that way whether the gap was caused by a referral backlog, an insurance authorisation, childcare, or the fact that you were told to rest. Prior complaints involving the same body part, which they will find: a broad medical authorisation lets them request years of unrelated history, and industry claim databases surface previous claims you may not have mentioned. The exact wording of imaging reports, because radiologists routinely describe normal age-related change, and the words disc desiccation, spondylosis, degenerative and chronic are quoted back as proof that a finding predates the crash. Whether findings are objective or subjective, since a normal examination or a full range of motion recorded on a day you felt well becomes the headline. And inconsistency between what you told different providers — pain scores that do not match, or an offhand note that you had been gardening. None of this is unique to any one insurer and little of it is improper. It is what claims review is: a search for the difference between what a claim asserts and what the documents support. What it means practically is that the record is the claim. A gap explained to the adjuster on a phone call is a gap; a gap explained in the note of the visit where you returned is a documented interruption in care with a reason. The difference costs nothing at the time and is close to impossible to fix afterwards.',
      whatToTrack: [
        'The date of the collision and the date of your first medical contact, however minor',
        'Every gap between visits, and the reason for it recorded at the time rather than reconstructed later',
        'Prior injuries or complaints involving the same body part, including ones you consider irrelevant',
        'The exact wording of every imaging report, particularly any degenerative or age-related description',
        'Objective findings — imaging, measured range of motion, positive tests, specialist examination',
        'What history you gave each provider, since inconsistency between them is what gets quoted',
        'The scope of any medical authorisation you signed, and what period it covers',
        'Billed charges by provider, which are reviewed separately from the treatment itself',
      ],
      howClearCaseHelps:
        'ClearCaseIQ reads a file the way the other side does before the other side gets to. It builds the treatment chronology, identifies the intervals that will be characterised as gaps, flags where a prior condition or degenerative finding appears in the record, and shows where the documentation is thin relative to what is being claimed. Knowing which three things will be raised is worth considerably more before a demand is sent than after a response arrives citing them.',
    },
    faqs: [
      {
        q: 'What do adjusters look for first in medical records?',
        a: 'The interval between the incident and the first treatment, and any gap between visits afterwards. Both are used to argue that the injury either came from something else or had resolved, and they are the fastest things to find in a file.',
      },
      {
        q: 'Why does a treatment gap matter so much?',
        a: 'Because a period without care is read as a period without symptoms. The reason usually exists — a referral backlog, an authorisation delay, work or childcare, or advice to rest — but it counts for far more when it appears in the record of the return visit than when it is explained months later.',
      },
      {
        q: 'How do they find out about a prior injury?',
        a: 'Usually from the medical authorisation you signed, which can be broad enough to reach years of unrelated history, and from industry claim databases that surface previous claims. Prior treatment to the same body part is better disclosed and explained than discovered.',
      },
      {
        q: 'What does "no objective findings" mean in a denial?',
        a: 'That the file rests on your reported symptoms rather than something measurable — imaging, a positive clinical test, measured restriction, or a specialist\u2019s examination. It is an argument about documentation rather than about whether you are in pain.',
      },
      {
        q: 'Why is my MRI being used against me?',
        a: 'Radiology reports describe everything visible, including ordinary age-related change. Words like degenerative, desiccation and spondylosis appear in most adult spines and are quoted as evidence a finding predates the crash. A treating physician addressing causation directly is what answers it.',
      },
      {
        q: 'Why were my bills reduced even though the treatment was approved?',
        a: 'Bills are reviewed on a separate track from the records, repriced against a benchmark of typical payment for those codes in that area. It is why a claim can be told the treatment was unnecessary and separately that the charge for it was too high.',
      },
    ],
  },
  {
    slug: CHRONOLOGY_SLUG,
    category: 'Educational / SEO Moat',
    cluster: 'Medical Chronology Builder',
    title: 'How to Build a Medical Chronology',
    eyebrow: 'Turning records into a timeline',
    description:
      'A chronology is one row per encounter — date, provider, what you reported, what was found, what was done, and the page it came from. It exists so nobody has to read four hundred pages, which means its credibility depends on including the entries that do not help you.',
    psychology: 'I have a pile of records and need a usable timeline.',
    cta: 'Create My Chronology',
    exampleQueries: [
      'how to build a medical chronology',
      'medical chronology template personal injury',
      'medical record summary for injury claim',
      'how to summarize medical records for a lawyer',
    ],
    signals: [
      'Complete records',
      'Date of service ordering',
      'Objective findings',
      'Gap annotation',
      'Page citations',
      'Bill reconciliation',
    ],
    sections: {
      whyItMatters:
        'Nobody evaluating a claim reads the whole file. An adjuster, a nurse reviewer, and an attorney deciding whether to take a case all work from a summary, and the chronology is that summary. Its purpose is narrow: to let a reader establish in a few minutes what happened, in what order, and with what support, and to find the underlying page when they want to check. Start by collecting complete records rather than summaries or portal snapshots, and request them separately from each facility, because the hospital, the imaging centre, the physical therapist and the billing office hold different things and none of them holds all of it. Then order everything by date of service rather than the date it arrived, which sounds obvious and is the most common structural error, since records arrive in batches that have nothing to do with the sequence of care. Write one row per encounter. Each should carry the date, the provider and facility, what you reported that day, what was objectively found, what was diagnosed, what treatment was given or ordered, any work restriction, and the page the entry came from. Quote the record rather than paraphrasing it. Paraphrase drifts toward the version that helps, and a reader who checks two entries against the source and finds them characterised rather than quoted will discount the entire document — which costs more than the entries were worth. For the same reason, include the visits that do not help: the normal examination, the day the range of motion was full, the note that you had been feeling better. A chronology that contains only good days is transparently a brief, and it is read as one. Annotate gaps where they occur rather than hoping they go unnoticed. An interval of six weeks with a line recording that a specialist referral took five weeks to schedule is a different fact from an unexplained six-week silence, and the annotation belongs at the gap so the reader meets the explanation at the moment they notice the problem. Finally, reconcile the bills against the visits. Every billed date should correspond to an encounter and every encounter should have its charge, and the mismatches are worth finding yourself, because they will be found: a bill for a date with no record, or treatment with no charge, is exactly what a billing review is looking for.',
      whatToTrack: [
        'Complete records from every facility separately, including imaging centres and billing offices',
        'Date of service for each encounter, not the date the record was produced or received',
        'What you reported at each visit, in the record\u2019s own words',
        'Objective findings — measurements, imaging results, positive tests, specialist examination',
        'Diagnoses and any change to them over time',
        'Work restrictions and their dates, which connect the medical file to wage loss',
        'A page or document citation for every entry',
        'The reason for any interval between visits, recorded at the visit that follows it',
      ],
      howClearCaseHelps:
        'ClearCaseIQ builds the chronology from uploaded records — extracting dates, providers, diagnoses and billed amounts, ordering by date of service, and identifying intervals that will be read as gaps. It also flags where a billed date has no corresponding record, which is the reconciliation people most often skip. The output is a timeline with its sources attached, which is the form a reviewer can actually check.',
    },
    faqs: [
      {
        q: 'What goes in each entry of a medical chronology?',
        a: 'The date of service, the provider and facility, what you reported, what was objectively found, the diagnosis, the treatment given or ordered, any work restriction, and a citation to the page it came from.',
      },
      {
        q: 'Should I include visits that do not help my claim?',
        a: 'Yes. A chronology containing only favourable entries reads as advocacy, and a reader who spot-checks two entries and finds omissions discounts all of it. The completeness is what makes the rest usable.',
      },
      {
        q: 'How should treatment gaps be handled?',
        a: 'Annotate them where they occur, with the reason drawn from the record — a referral wait, an authorisation delay, a provider\u2019s advice to rest. The explanation is worth most at the point the reader notices the gap.',
      },
      {
        q: 'Should I paraphrase or quote the records?',
        a: 'Quote them. Paraphrase drifts toward the more helpful version, and the difference is easy to spot against the source. Quoting also makes the document faster to verify, which is the point of it.',
      },
      {
        q: 'What order should the records go in?',
        a: 'By date of service, not the order they arrived. Records come in batches from different facilities and the arrival order has nothing to do with the sequence of care.',
      },
      {
        q: 'Do I need to reconcile the bills against the visits?',
        a: 'It is worth doing. A billed date with no corresponding record, or an encounter with no charge, is precisely what a billing review looks for, and finding the mismatch yourself is better than having it raised.',
      },
    ],
  },
  {
    slug: HUB_SLUG,
    category: 'Educational / SEO Moat',
    cluster: 'Medical Records Hub',
    title: 'Medical Records After an Accident',
    eyebrow: 'Getting your records',
    description:
      'You have a right to your records, and in California a fairly quick one. The difficulty is rarely permission — it is knowing that six different offices hold six different pieces, and that what a portal hands you is not the chart.',
    psychology: 'I need my records and do not know where to start.',
    cta: 'Organize My Records',
    exampleQueries: [
      'how to get my medical records after an accident',
      'medical records request california',
      'how long do doctors have to provide medical records',
      'medical records after car accident',
    ],
    signals: [
      'Right of access',
      'Request in writing',
      'Complete chart',
      'Imaging on disc',
      'Itemised billing',
      'Records still outstanding',
    ],
    sections: {
      whyItMatters:
        'The right of access belongs to you rather than to your attorney or your insurer, and it does not depend on having a claim. Federal law requires a provider to respond to a written request within thirty days, with one extension available. California is faster: a patient is generally entitled to inspect records within five working days of a written request, and to receive copies within fifteen days, with copying charges capped at a modest per-page rate. Knowing the shorter timeline is useful mainly because it gives you something concrete to point at when an office says it will take a couple of months. What causes most of the trouble is not access but fragmentation. A single course of treatment after a collision typically sits in six places. The hospital holds the emergency department record. The imaging centre holds two distinct things — the radiologist\u2019s written report and the images themselves, which are separate requests and often separate fees. The physical therapist keeps their own notes. The specialist keeps theirs. The billing office, frequently a different company from the clinic, holds the itemised charges and the ledger showing what was paid and adjusted. And your health insurer holds an explanation of benefits for each of them, which is the only place some payments are visible. Requesting from the treating clinic gets you one of these. The second common problem is that what arrives is not what was asked for. A patient portal produces visit summaries, which are a courtesy document written for the patient, not the chart. The chart is the clinical note, and the difference matters because the note contains the examination findings, the history you gave, and the reasoning — which is what anyone evaluating a claim reads. Ask in writing for the complete record for the treatment period, and name the components: clinical notes, imaging reports, imaging studies, therapy notes, operative reports, discharge instructions, referrals, prescriptions, and the itemised bill with the ledger. Start early. Records take weeks, offices close, practices are acquired, and imaging is sometimes archived offsite. The people who struggle are almost never the ones who were refused; they are the ones who began asking two years later.',
      whatToTrack: [
        'Every provider and facility that treated you, including ones seen once',
        'The date range each request needs to cover',
        'Which requests have been sent, on what date, and to which address',
        'What arrived, and whether it is the clinical note or only a visit summary',
        'Imaging reports and, separately, the imaging studies themselves',
        'Itemised bills with charges by date, plus the ledger of payments and adjustments',
        'Explanations of benefits from your health insurer',
        'Anything referenced in a record that you have not received, such as a referral or an outside report',
      ],
      howClearCaseHelps:
        'ClearCaseIQ keeps a list of the providers involved and what has actually arrived from each, which is the part people lose track of once records start coming in batches. It reads uploaded records to extract dates, providers, diagnoses and charges, and flags documents that are referenced somewhere in the file but missing from it — a referral with no corresponding consultation, an imaging report with no study. Those gaps are far easier to close while the treatment is recent.',
    },
    faqs: [
      {
        q: 'How long does a provider have to give me my records?',
        a: 'Federal law allows thirty days with one extension. California is shorter for patients: generally inspection within five working days of a written request and copies within fifteen days.',
      },
      {
        q: 'Can I be charged for copies?',
        a: 'Yes, but the amount is limited. California caps per-page copying charges at a modest rate, and federal rules require any fee to be reasonable and cost-based rather than a source of revenue.',
      },
      {
        q: 'Is what I download from the patient portal enough?',
        a: 'Usually not. Portals produce visit summaries written for patients. The clinical note is the actual record and contains the examination findings, the history you gave, and the reasoning, which is what a reviewer reads.',
      },
      {
        q: 'Do I need the actual images or just the radiology report?',
        a: 'The report is what most reviewers read, but the images are a separate request and worth obtaining where a finding is disputed, since another radiologist may need to look at them directly.',
      },
      {
        q: 'Why are the bills held somewhere else?',
        a: 'Billing is frequently handled by a separate company from the clinic, so the itemised charges and the ledger of payments and adjustments have to be requested separately from the clinical records.',
      },
      {
        q: 'Do I need an attorney to request my own records?',
        a: 'No. The right of access is yours, and requesting them yourself is often faster than waiting for a request to be routed through anyone else.',
      },
    ],
  },
  {
    slug: ORGANIZE_SLUG,
    category: 'Educational / SEO Moat',
    cluster: 'Medical Record Organization',
    title: 'How to Organize Medical Records After an Accident',
    eyebrow: 'Making the pile usable',
    description:
      'Organising records is mostly an auditing job rather than a filing one. The question is not where to put four hundred pages but whether anything is missing from them, and the file itself tells you — every record points at documents that should exist.',
    psychology: 'I have records everywhere and cannot tell what is missing.',
    cta: 'Organize My Records',
    exampleQueries: [
      'how to organize medical records after an accident',
      'organizing medical bills personal injury',
      'medical records checklist accident claim',
      'how to keep track of accident paperwork',
    ],
    signals: [
      'Completeness audit',
      'Duplicate sets',
      'Provider index',
      'Clinical versus billing',
      'Outstanding requests',
      'Unaltered originals',
    ],
    sections: {
      whyItMatters:
        'The instinct is to sort what you have. The more useful first step is to work out what you do not have, and the records themselves are the source for that. A clinical note that records a referral to orthopaedics implies a consultation that should exist. An imaging report implies an order, and an order implies the visit where symptoms justified it. A therapy note referring to a treatment plan implies the plan. A bill for a date with no note means a record is missing, not that the bill is wrong. Reading a file for these references and listing what they point at produces a request list, and doing this before organising anything saves handling the same pile twice. Then structure it. Keep two separate sets: clinical records and billing records. They come from different places, are reviewed by different people, and mixing them makes both harder to check. Within the clinical set, keep the records grouped by provider, since that is how they arrived and how you will request the missing pieces, and leave date-ordering to the chronology — that is a summary document built from this material, not a way of storing it. Duplicates are the other common problem and are worth removing carefully rather than quickly. The same therapy notes often arrive twice, once from the clinic and once from the billing company, and the two copies are not always identical: one may be a later printing that includes an addendum. Compare before discarding, and keep the more complete version. Keep the originals as they arrived, unmarked and unannotated. Notes written on a record can make it unclear later what the document said and what somebody added, and the annotation belongs in your own working notes instead. Finally, keep a simple index: provider, what has been requested, what has arrived, date range covered, and what is still outstanding. This is the single most useful document in the file and almost nobody has one. It answers, in a few seconds, the question everyone eventually asks — whether the record set is complete — and it prevents the situation where a claim is presented and a provider nobody remembered surfaces afterwards.',
      whatToTrack: [
        'A provider index: who treated you, what was requested, what arrived, and what is missing',
        'Documents referenced inside records that are not in the file — referrals, orders, outside reports',
        'Clinical records and billing records kept as two distinct sets',
        'Duplicate copies, compared before discarding in case one contains an addendum',
        'The date range each set of records actually covers, which is often shorter than requested',
        'Bills for dates with no corresponding clinical record',
        'Originals kept unmarked, with your own notes separate',
      ],
      howClearCaseHelps:
        'ClearCaseIQ reads uploaded records and builds the index automatically — which providers appear, what date ranges are covered, and where a document is referenced but absent. That last part is the audit people skip, and it is the difference between a record set that looks complete and one that is. It also separates billed charges from clinical content, so the two can be checked against each other.',
    },
    faqs: [
      {
        q: 'Should I organise records by date or by provider?',
        a: 'Store them by provider, since that is how they arrive and how you will chase what is missing. Date ordering belongs to the chronology, which is a summary built from the records rather than a way of filing them.',
      },
      {
        q: 'How do I know whether my records are complete?',
        a: 'The file tells you. Records reference other documents — referrals, imaging orders, treatment plans, outside reports — and listing what they point at produces the list of what is missing.',
      },
      {
        q: 'Should I delete duplicate copies?',
        a: 'Compare them first. The same notes often arrive from both the clinic and the billing company, and one copy may be a later printing that includes an addendum the other lacks.',
      },
      {
        q: 'Can I highlight or write notes on my records?',
        a: 'Better not to. Annotations can make it unclear later what the document originally said. Keep the originals clean and put your notes in a separate working document.',
      },
      {
        q: 'What do I do about a bill for a date I have no record for?',
        a: 'Treat it as a missing record rather than an incorrect bill and request that date specifically. An unmatched billed date is one of the first things a billing review looks for.',
      },
    ],
  },
  {
    slug: LAWYERS_NEED_SLUG,
    category: 'Educational / SEO Moat',
    cluster: 'Attorney Medical Record Review',
    title: 'What Medical Records Do Lawyers Need?',
    eyebrow: 'What to send, and when',
    description:
      'Less than you think at first, and more than you expect later. A firm deciding whether to take a case needs a handful of documents; a firm presenting one needs everything, including several things that are not medical records at all.',
    psychology: 'I want to know what to send an attorney.',
    cta: 'Check Attorney-Ready Records',
    exampleQueries: [
      'what medical records do lawyers need',
      'what documents does a personal injury lawyer need',
      'what to bring to a personal injury consultation',
      'medical records for accident attorney',
    ],
    signals: [
      'Intake essentials',
      'Objective findings',
      'Itemised bills',
      'Wage loss proof',
      'Lien and health plan details',
      'Future care',
    ],
    sections: {
      whyItMatters:
        'These are two different requests and sending the wrong one for the stage wastes time in both directions. At intake a firm is deciding whether the case is viable, which is a fast assessment made from a small number of documents: the first treatment record, whatever imaging reports exist, a rough figure for the bills so far, the police report or exchange information, photographs of the vehicles and any visible injury, and the insurance details for both sides including your own coverage. Arriving with four hundred pages does not speed this up. Arriving with the first treatment record and an imaging report often does, because it answers the two questions that determine the outcome — is there an objective finding, and did treatment start promptly. Presenting the claim is the opposite. Everything is needed, from every provider, for the full treatment period, and the gaps that were tolerable at intake become the weaknesses the other side works on. That set includes the complete clinical records rather than summaries, itemised bills with the ledger showing payments and adjustments, and the imaging reports with the studies available if a finding is contested. Several of the necessary items are not medical records. Wage loss requires employer confirmation of missed time and rate, and a tax return or pay records where income varies. Any health plan that paid for treatment matters because it may assert a right to be repaid from the recovery, and its details are needed early rather than discovered at disbursement. Providers who treated on a lien have their own balances. And where the injury has lasting effects, a physician\u2019s written statement about future care and restrictions carries far more weight than a description of how you feel, because it converts an ongoing problem into something that can be valued. Two things are worth mentioning even though nobody asks for them. Prior treatment to the same body part should be disclosed at the start; it is going to be found, and disclosed it is a fact while discovered it looks like concealment. And the reasons for any interruption in treatment are worth writing down while you still remember them, because that explanation is needed eventually and memory for it fades quickly.',
      whatToTrack: [
        'For intake: first treatment record, imaging reports, approximate bills, police report, photographs, insurance details for both sides',
        'For presentation: complete clinical records from every provider for the full period',
        'Itemised bills with the ledger of payments and adjustments',
        'Employer confirmation of missed work and rate, with tax or pay records where income varies',
        'Health plan details, since it may seek repayment from any recovery',
        'Balances for any provider who treated on a lien',
        'A physician\u2019s written statement on future care and work restrictions',
        'Prior treatment to the same body part, disclosed rather than left to be found',
      ],
      howClearCaseHelps:
        'ClearCaseIQ assembles the intake set and shows what is missing from the fuller one, which is the difference between a consultation that reaches a decision and one that ends with a list of things to send. It extracts diagnoses, billed amounts and treatment dates from uploaded records, tracks which providers are still outstanding, and separates the non-medical items — wage loss, health plan, liens, future care — that are needed and easy to forget because they are not records.',
    },
    faqs: [
      {
        q: 'What should I bring to a first consultation?',
        a: 'The first treatment record, any imaging reports, a rough total of bills so far, the police report or exchange information, photographs, and the insurance details for both sides including your own policy. Not the whole file.',
      },
      {
        q: 'Do lawyers need every record or just the important ones?',
        a: 'At intake, a handful. To present the claim, everything from every provider for the full period, because selective records invite the argument that something was left out.',
      },
      {
        q: 'What non-medical documents matter?',
        a: 'Employer confirmation of missed work and rate, tax or pay records where income varies, your health plan details because it may seek repayment, and balances for any provider treating on a lien.',
      },
      {
        q: 'Why does future care matter so much?',
        a: 'Because it converts an ongoing problem into something that can be valued. A physician\u2019s written statement about restrictions and anticipated treatment carries far more weight than a description of symptoms.',
      },
      {
        q: 'Should I mention a prior injury to the same body part?',
        a: 'Yes, at the start. It will be found through the medical authorisation and claim history databases, and a prior injury disclosed is a fact to be distinguished while one discovered later looks like something concealed.',
      },
    ],
  },
]

export const medicalRecordsGuideTopicContentBySlug: Record<string, TopicContent> = {
  [INSURANCE_REVIEW_SLUG]: {
    scenario:
      'A claimant with a documented disc herniation received an offer citing "degenerative changes noted on imaging" and "a significant gap in treatment". The imaging language was a radiologist\u2019s standard description of ordinary age-related change, present in most adult spines. The gap was seven weeks spent waiting for an orthopaedic referral to be authorised. Both were answerable, and neither had been documented anywhere the adjuster would look.',
    timeline: [
      ['Records requested', 'A signed authorisation is used to obtain records, sometimes reaching well beyond the incident and the body part at issue.'],
      ['Summarised', 'Past a certain claim value the file goes to a nurse reviewer or outside vendor who produces a summary and a problem list.'],
      ['Bills repriced', 'Separately, billed codes are benchmarked against typical payment for that geography.'],
      ['Position taken', 'The offer reflects the problem list. The first you usually hear of it is when it is quoted at you.'],
    ],
    severityLadder: [
      ['Clean file', 'Prompt first treatment, continuous care, objective findings, consistent history across providers.'],
      ['Ordinary friction', 'A short gap or a degenerative note, explainable and documented at the time.'],
      ['Contested', 'A long unexplained gap, prior treatment to the same area, or findings recorded as entirely subjective.'],
      ['Heavily disputed', 'Delayed first treatment, multiple gaps, undisclosed prior claims, and an examination arranged by the insurer.'],
    ],
    treatmentProgression: [
      { label: 'The delay', copy: 'The interval between the collision and the first medical contact. The first thing looked for and the hardest to remedy afterwards.' },
      { label: 'The gaps', copy: 'Any period without care, read as recovery unless the record itself says otherwise.' },
      { label: 'The history', copy: 'Prior complaints involving the same body part, found through the authorisation and industry claim databases.' },
      { label: 'The wording', copy: 'Degenerative and age-related descriptions in imaging reports, quoted as proof a finding predates the crash.' },
    ],
    settlementDrivers: [
      'Treatment beginning promptly after the incident',
      'Continuous care, or gaps explained in the record at the time',
      'Objective findings rather than reported symptoms alone',
      'A consistent history given to every provider',
      'Prior conditions disclosed and distinguished rather than discovered',
      'A treating physician addressing causation directly',
    ],
    settlementValueDetails: [
      { label: 'The record is the claim', copy: 'An explanation given on a phone call is not in the file. The same explanation in the note of the return visit is.' },
      { label: 'Two reviews, not one', copy: 'Treatment and billing are assessed on separate tracks, which is how a claim is told the care was excessive and the charges too high at once.' },
      { label: 'Radiology describes everything', copy: 'Age-related change appears in most adult imaging and is not a statement about causation, though it is quoted as one.' },
      { label: 'Disclosure beats discovery', copy: 'A prior injury explained upfront is a fact. The same injury found later is treated as something that was concealed.' },
    ],
    insuranceProblems: [
      'A gap in treatment is characterised as recovery, with no reference to the referral or authorisation that caused it.',
      'Standard degenerative language in an imaging report is quoted as proof the injury predates the crash.',
      'A broad authorisation is used to obtain years of unrelated medical history.',
      'An offhand remark in a provider\u2019s note is used to contradict reported limitations.',
      'Billed charges are repriced against a benchmark without the treatment itself being disputed.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'How long after the incident did you first receive medical attention?' },
      { label: 'Step 2', question: 'Has there been any period without treatment, and why?' },
      { label: 'Step 3', question: 'Have you previously had symptoms or treatment involving the same body part?' },
      { label: 'Step 4', question: 'What does your imaging report actually say, word for word?' },
    ],
  },
  [CHRONOLOGY_SLUG]: {
    scenario:
      'A file of just over four hundred pages arrived from six providers in the order the offices happened to send it, with two duplicate sets of the same therapy notes. Sorted by date of service it came to fifty-one encounters. The chronology was four pages, and the eleven-week interval that looked like abandoned treatment turned out to contain three cancelled appointments and an authorisation denial, all documented in records nobody had reached.',
    timeline: [
      ['Collect', 'Request complete records from each facility separately. Imaging centres and billing offices hold what the treating office does not.'],
      ['Order', 'Sort by date of service rather than date received. Arrival order reflects office backlogs, not care.'],
      ['Summarise', 'One row per encounter: date, provider, reported complaint, objective findings, diagnosis, treatment, restrictions, source page.'],
      ['Reconcile', 'Match billed dates to encounters. Mismatches are better found by you than by a billing review.'],
    ],
    severityLadder: [
      ['Unusable', 'Records in arrival order, duplicates unremoved, no dates extracted.'],
      ['Readable', 'Ordered by date of service with providers and diagnoses identified.'],
      ['Reviewable', 'One row per encounter with objective findings quoted and every entry cited to a page.'],
      ['Complete', 'Gaps annotated with reasons, unfavourable entries included, and bills reconciled against visits.'],
    ],
    treatmentProgression: [
      { label: 'Completeness', copy: 'Full records from every facility, not portal summaries or discharge paperwork alone.' },
      { label: 'Order', copy: 'Date of service throughout. The single most common structural error is using the order records arrived.' },
      { label: 'Fidelity', copy: 'Quote rather than paraphrase. Drift toward the helpful version is easy to spot and discredits the whole document.' },
      { label: 'Candour', copy: 'Include the normal examinations and the good days. A chronology of only favourable entries is read as a brief.' },
    ],
    settlementDrivers: [
      'Complete records obtained from every provider and facility',
      'Consistent ordering by date of service',
      'Objective findings quoted rather than characterised',
      'Every entry citable to a source page',
      'Gaps annotated where they occur, with reasons from the record',
      'Billed dates reconciled against documented encounters',
    ],
    settlementValueDetails: [
      { label: 'Written to be checked', copy: 'The value of a chronology is that a reader can verify any line quickly. Citations are what make it worth more than an assertion.' },
      { label: 'Unfavourable entries earn credibility', copy: 'Including the normal examination is what makes the abnormal one believable.' },
      { label: 'Annotate at the gap', copy: 'The explanation is worth most where the reader encounters the problem, not in a covering letter.' },
      { label: 'Bills belong to it', copy: 'A billed date with no record is the first thing a billing review finds. Better reconciled than raised.' },
    ],
    insuranceProblems: [
      'Duplicate record sets inflate the file and obscure the actual sequence of care.',
      'Records arriving out of order create apparent gaps that do not exist.',
      'A billed date with no corresponding record is treated as unsupported.',
      'A paraphrased entry that does not match the source undermines the rest of the summary.',
      'An unannotated interval is characterised as recovery without the reason ever being considered.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which providers and facilities treated you, including imaging and therapy?' },
      { label: 'Step 2', question: 'Do you have complete records from each, rather than summaries?' },
      { label: 'Step 3', question: 'Are there intervals between visits, and what caused them?' },
      { label: 'Step 4', question: 'Does every bill correspond to a documented visit?' },
    ],
  },
  [HUB_SLUG]: {
    scenario:
      'A claimant requested "my records" from the clinic that had managed their care and received forty pages of visit summaries. The emergency department record, the MRI report, the therapy notes and the itemised bills were held by four other organisations, and the imaging study itself by a fifth. Nothing had been refused. Nobody had asked the other five.',
    timeline: [
      ['Written request', 'Access rights run from a written request. California allows inspection within five working days and copies within fifteen.'],
      ['First arrivals', 'What comes back is often visit summaries rather than clinical notes. Check before assuming the request was filled.'],
      ['Chasing the rest', 'Imaging studies, therapy notes and itemised billing usually require separate requests to separate organisations.'],
      ['Completeness check', 'Records reference other documents. What they point at and you do not have is the remaining request list.'],
    ],
    severityLadder: [
      ['Not started', 'No written requests sent. The clock on every provider is still at zero.'],
      ['Partial', 'The main treating provider has responded. Imaging, therapy and billing are usually still outstanding.'],
      ['Nearly complete', 'Clinical records in hand from every provider, with billing and imaging pending.'],
      ['Complete', 'Clinical notes, imaging reports, studies, therapy notes and itemised billing with the ledger, covering the full period.'],
    ],
    treatmentProgression: [
      { label: 'The right', copy: 'Access belongs to the patient, does not depend on having a claim, and runs on a shorter clock in California than the federal default.' },
      { label: 'The fragmentation', copy: 'Hospital, imaging centre, therapist, specialist, billing company and health insurer each hold a different piece.' },
      { label: 'The wrong document', copy: 'Portal visit summaries are written for patients. The clinical note is the record a reviewer reads.' },
      { label: 'The timing', copy: 'Requests take weeks, practices are acquired and imaging is archived. Difficulty comes from starting late, not from refusal.' },
    ],
    settlementDrivers: [
      'A written request, which is what starts the statutory clock',
      'Requests sent to every organisation rather than only the treating clinic',
      'Clinical notes obtained rather than visit summaries',
      'Imaging reports, and the studies where a finding is disputed',
      'Itemised bills with the ledger of payments and adjustments',
      'Starting while the treatment is recent',
    ],
    settlementValueDetails: [
      { label: 'Access is rarely the problem', copy: 'Requests are seldom refused. They are sent to one organisation out of six, or ask for the wrong document.' },
      { label: 'Summaries are not the chart', copy: 'The clinical note holds the examination findings, the history given, and the reasoning.' },
      { label: 'Billing is a separate company', copy: 'Itemised charges and the payment ledger usually have to be requested apart from the clinical records.' },
      { label: 'Time works against you', copy: 'Practices close and are acquired, and imaging is moved offsite. Late requests are the ones that fail.' },
    ],
    insuranceProblems: [
      'A request is answered with visit summaries and assumed to be complete.',
      'The imaging report arrives without the study, which matters once a finding is contested.',
      'Billing records are never requested because the clinic was assumed to hold them.',
      'A provider seen once early on is forgotten, and surfaces later as an unexplained gap.',
      'Records are requested years later, after a practice has closed or transferred its files.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Which providers and facilities treated you, including any seen only once?' },
      { label: 'Step 2', question: 'Have you made a written request to each of them?' },
      { label: 'Step 3', question: 'Is what arrived the clinical note, or only a visit summary?' },
      { label: 'Step 4', question: 'Do you have itemised bills and the ledger of payments?' },
    ],
  },
  [ORGANIZE_SLUG]: {
    scenario:
      'A file of six inches of paper looked complete until it was read for cross-references. A therapy note mentioned a treatment plan nobody had; an imaging report implied an order from a visit that was missing; two bills covered dates with no clinical record at all. Four requests closed all of it, and the set that had looked finished had been missing the documents that explained the largest apparent gap.',
    timeline: [
      ['Audit first', 'Read for references to documents that should exist before sorting anything. It produces the request list.'],
      ['Separate', 'Split clinical records from billing records. They come from different places and are reviewed by different people.'],
      ['Group by provider', 'Store as they arrived and as you will chase them. Date order belongs to the chronology.'],
      ['Index', 'Record who, requested, received, period covered, still outstanding. The most useful page in the file.'],
    ],
    severityLadder: [
      ['Unsorted', 'Everything in one pile with duplicates, and no way to tell what is missing.'],
      ['Sorted', 'Grouped by provider with billing separated out.'],
      ['Audited', 'Cross-references followed, missing documents identified and requested.'],
      ['Indexed', 'A single page showing every provider, what was requested, what arrived, and what is outstanding.'],
    ],
    treatmentProgression: [
      { label: 'Audit before filing', copy: 'The file names the documents it is missing. Following those references saves handling the pile twice.' },
      { label: 'Two sets', copy: 'Clinical and billing records are reviewed separately and are harder to check when mixed.' },
      { label: 'Careful de-duplication', copy: 'The same notes arrive twice and the copies are not always identical. Compare before discarding.' },
      { label: 'Clean originals', copy: 'Annotations blur what the document said and what was added. Keep working notes separate.' },
    ],
    settlementDrivers: [
      'Every document referenced inside a record but absent from the file',
      'Clinical and billing records kept as separate sets',
      'Duplicate copies compared rather than discarded on sight',
      'The actual date range each set covers, often shorter than requested',
      'Bills for dates with no clinical record',
      'An index of requested, received and outstanding by provider',
    ],
    settlementValueDetails: [
      { label: 'Completeness is auditable', copy: 'Whether a record set is complete is a question the file itself answers, through its own cross-references.' },
      { label: 'The index is the deliverable', copy: 'A single page of who, requested, received and outstanding answers the question everyone eventually asks.' },
      { label: 'Duplicates are not identical', copy: 'A second copy is sometimes a later printing carrying an addendum the first lacks.' },
      { label: 'Filing is not summarising', copy: 'Store by provider; the date-ordered version is the chronology, built from this material.' },
    ],
    insuranceProblems: [
      'A record set is presented as complete while documents it references are missing.',
      'A gap appears larger than it was because the records explaining it were never requested.',
      'A billed date with no clinical record is treated as unsupported treatment.',
      'Annotated records make it unclear what the original document said.',
      'A duplicate containing an addendum is discarded in favour of the earlier printing.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Do your records reference documents you do not have?' },
      { label: 'Step 2', question: 'Are clinical records and bills kept as separate sets?' },
      { label: 'Step 3', question: 'Does every billed date have a matching clinical record?' },
      { label: 'Step 4', question: 'Can you say, per provider, what is still outstanding?' },
    ],
  },
  [LAWYERS_NEED_SLUG]: {
    scenario:
      'Two claimants arrived at consultations the same week. One brought a box. The other brought the emergency department record, an MRI report, a one-line total of bills, and photographs. The second consultation reached a decision in the meeting, because the two questions that decide intake — is there an objective finding, and did treatment start promptly — were answerable from four documents.',
    timeline: [
      ['Intake', 'A small set: first treatment record, imaging reports, approximate bills, police report, photographs, insurance for both sides.'],
      ['Engagement', 'Complete records requested from every provider for the full treatment period.'],
      ['Building the claim', 'Itemised bills, wage loss confirmation, health plan and lien details are assembled alongside the records.'],
      ['Presentation', 'Future care and work restrictions in writing from a physician, which is what makes an ongoing problem valuable.'],
    ],
    severityLadder: [
      ['Not reviewable', 'No medical documentation yet, or only an appointment card and a claim number.'],
      ['Intake-ready', 'First treatment record, an imaging report, an approximate bill total, and the insurance details.'],
      ['Claim-ready', 'Complete clinical records and itemised bills from every provider for the full period.'],
      ['Presentation-ready', 'Plus wage loss confirmation, health plan and lien details, and a written future-care opinion.'],
    ],
    treatmentProgression: [
      { label: 'Intake is small', copy: 'Four or five documents answer whether the case is viable. A box does not speed it up.' },
      { label: 'Presentation is everything', copy: 'Complete records from every provider, since selective ones invite the argument that something was omitted.' },
      { label: 'Not all of it is medical', copy: 'Wage loss confirmation, health plan details and lien balances are needed and easily forgotten.' },
      { label: 'Future care is written', copy: 'A physician\u2019s statement on restrictions and anticipated treatment values an ongoing problem; a description of symptoms does not.' },
    ],
    settlementDrivers: [
      'An objective finding documented early',
      'Treatment beginning promptly after the incident',
      'Itemised bills with the ledger rather than an estimate',
      'Employer confirmation of missed work and rate',
      'Health plan and lien details identified before disbursement',
      'A written future-care and restrictions opinion',
    ],
    settlementValueDetails: [
      { label: 'Right set, right stage', copy: 'Intake wants a handful of documents. Presentation wants all of them. Sending the wrong set wastes time both ways.' },
      { label: 'The two intake questions', copy: 'Is there an objective finding, and did treatment start promptly. Most consultations turn on these.' },
      { label: 'Liens decide the net', copy: 'A health plan seeking repayment affects what reaches the claimant as much as the fee does.' },
      { label: 'Disclose the prior injury', copy: 'It will be found. Disclosed it is a fact to distinguish; discovered it looks like concealment.' },
    ],
    insuranceProblems: [
      'A claim is presented with records from some providers and not others.',
      'Bills are estimated rather than itemised, and the total does not survive review.',
      'Wage loss is asserted without employer confirmation or pay records.',
      'A health plan asserts repayment late, after the figure was treated as final.',
      'Ongoing symptoms are described by the claimant rather than documented by a physician.',
    ],
    intakeSteps: [
      { label: 'Step 1', question: 'Do you have the record of your first treatment after the incident?' },
      { label: 'Step 2', question: 'Is there an imaging report or other objective finding?' },
      { label: 'Step 3', question: 'Do you know roughly what has been billed, and by whom?' },
      { label: 'Step 4', question: 'Has any health plan paid for treatment, or any provider treated on a lien?' },
    ],
  },
}
