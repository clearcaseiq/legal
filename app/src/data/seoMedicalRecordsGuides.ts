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
 * three still come from the generated seed in `seoMedicalRecordsPages.ts`.
 */

export const INSURANCE_REVIEW_SLUG = '/how-insurance-companies-review-medical-records'
export const CHRONOLOGY_SLUG = '/how-to-build-a-medical-chronology'

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
}
