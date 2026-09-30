import type { LandingPage } from './seoLandingPages'

/**
 * Supporting articles written for the case-type hubs.
 *
 * Each one fills a question the hub needed an article for and the library did
 * not have: who pays the medical bills after a crash, a store fall on a wet
 * floor, a pedestrian's own uninsured motorist coverage. Topics already covered
 * by an existing article (herniated disc, delayed pain, lower back pain,
 * wrongful death damages) are linked from the hubs instead of rewritten, since a
 * second page on the same question would compete with the first.
 *
 * They are indexed but carry no `reviewedBy`: no attorney has reviewed them, and
 * the byline only credits a reviewer who did. To hold a page back from search
 * again, set `noindex: true` on it; that also puts it in `CASE_TYPE_DRAFT_SLUGS`.
 *
 * No page states an average or typical payout. Deadlines match the figures the
 * SOL guides and the deadline checker use.
 */

const NOT_ADVICE =
  'ClearCaseIQ is not a law firm, and this is general information rather than legal advice. A licensed California attorney can review the facts particular to you.'

export const caseTypeDraftPages: LandingPage[] = [
  // Car accident
  {
    slug: '/who-pays-medical-bills-after-a-car-accident-in-california',
    category: 'Insurance',
    cluster: 'Car Accident Medical Bills',
    title: 'Who Pays Medical Bills After a Car Accident in California?',
    eyebrow: 'Medical bills guide',
    description:
      'In California the at-fault driver’s insurer usually pays for your medical care only when the claim settles. Until then, bills are paid by your health insurance, your own medical payments coverage, or a provider who agrees to wait.',
    psychology: 'The bills are arriving now and the settlement is months away.',
    cta: 'Review My Medical Costs',
    exampleQueries: [
      'who pays medical bills after a car accident in California',
      'does the other driver’s insurance pay my hospital bill',
      'should I use my health insurance after a car accident',
    ],
    signals: ['Health insurance', 'Med-pay coverage', 'Provider liens', 'Billed vs paid amounts', 'Medi-Cal or Medicare'],
    sections: {
      whyItMatters:
        'California is an at-fault state without personal injury protection, so there is no automatic coverage that pays your bills as they arrive. The other driver’s liability insurer owes you for reasonable medical expenses, but it pays once, at settlement or judgment, not as each bill comes in. In the meantime the bills have to be paid by someone. Most people use their health insurance, which then usually has a right to be reimbursed from the settlement. Medical payments coverage on your own auto policy, if you bought it, pays regardless of fault up to its limit and is often the fastest money available. Some providers treat on a lien or letter of protection and wait to be paid from the recovery. How the bills are paid also affects what you can claim: under the Howell decision, an insured person’s past medical damages are generally measured by the amount actually paid, not the higher amount billed. Medi-Cal and Medicare pay too, and both have reimbursement rights that must be resolved before settlement money is distributed.',
      whatToTrack: [
        'Every bill and explanation of benefits, including the amount actually paid',
        'Your health plan’s reimbursement or lien notices',
        'Whether your auto policy includes medical payments coverage, and its limit',
        'Any lien or letter of protection signed with a provider',
        'Out-of-pocket costs: copays, prescriptions, mileage to appointments',
      ],
      howClearCaseHelps: `ClearCaseIQ organizes your bills by who paid them and flags reimbursement claims that will come out of a settlement, so the numbers you negotiate with are the ones that matter. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Will the other driver’s insurance pay my bills as I go?', a: 'Usually not. Liability insurers typically pay once, when the claim resolves, rather than bill by bill.' },
      { q: 'Should I use my health insurance?', a: 'Usually yes. It keeps care going and bills paid; the plan may then seek reimbursement from the settlement.' },
      { q: 'What is medical payments coverage?', a: 'Optional coverage on your own auto policy that pays medical costs regardless of fault, up to a set limit.' },
    ],
    caseType: 'car',
    caseSection: 'insurance',
    nextStep: {
      lead: 'Medical costs are one layer of the claim; how they combine with lost income and the injury itself is explained in',
      anchor: 'what a car accident case may be worth',
      to: '/how-much-is-a-car-accident-case-worth',
    },
  },
  {
    slug: '/lost-wages-after-a-car-accident-in-california',
    category: 'Settlement',
    cluster: 'Car Accident Lost Wages',
    title: 'Recovering Lost Wages After a Car Accident in California',
    eyebrow: 'Lost income guide',
    description:
      'Time off work after a crash is recoverable in a California injury claim, including hours covered by sick leave or PTO. What matters is documenting the income lost and linking each absence to the injury.',
    psychology: 'I missed work because of the crash and I need that money back.',
    cta: 'Document My Lost Income',
    exampleQueries: [
      'can I get lost wages from a car accident in California',
      'how to prove lost wages after an accident',
      'lost wages self employed car accident claim',
    ],
    signals: ['Missed shifts', 'PTO used', 'Self-employment income', 'Work restrictions', 'Reduced earning capacity'],
    sections: {
      whyItMatters:
        'Lost earnings are one of the most concrete parts of a car accident claim, and one of the most often under-documented. The claim covers wages and salary for time missed because of the injury or its treatment, including appointments, and generally includes sick days and paid time off you used, because you spent a benefit you would otherwise still have. Hourly workers show it with pay stubs and a letter from the employer confirming the dates and rate. Salaried workers show it the same way, plus any lost bonus or overtime that was regular. Self-employed people have the harder task: tax returns, invoices, bank deposits and cancelled jobs showing what the business would have earned. Where the injury changes what you can do long term, a separate claim for lost earning capacity covers the future difference, which usually needs medical restrictions in writing and sometimes a vocational or economic expert. The link is what insurers test: time off has to track the medical record, so a doctor’s work note for each absence is worth asking for.',
      whatToTrack: [
        'Dates missed, with a doctor’s note or restriction for each',
        'Pay stubs before and after the crash',
        'A letter from your employer confirming rate, hours and dates',
        'PTO and sick leave used',
        'For self-employment: tax returns, invoices and cancelled work',
      ],
      howClearCaseHelps: `ClearCaseIQ matches your time off against your treatment dates, so gaps in the wage claim are visible before an adjuster finds them. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Can I claim time I covered with sick leave?', a: 'Generally yes. You used a benefit you would otherwise still have, so that time is usually part of the wage claim.' },
      { q: 'How do self-employed people prove lost income?', a: 'With tax returns, invoices, bank records and evidence of work turned down or cancelled because of the injury.' },
      { q: 'What about future lost earnings?', a: 'A lasting limitation can support a claim for lost earning capacity, usually backed by medical restrictions and expert analysis.' },
    ],
    caseType: 'car',
    caseSection: 'value',
    nextStep: {
      lead: 'Lost income is one input; how it combines with medical costs and pain and suffering is covered in',
      anchor: 'what a car accident case may be worth',
      to: '/how-much-is-a-car-accident-case-worth',
    },
  },
  {
    slug: '/car-accident-settlement-offer-too-low',
    category: 'Insurance',
    cluster: 'Low Car Accident Settlement Offers',
    title: 'What to Do When a Car Accident Settlement Offer Seems Too Low',
    eyebrow: 'Settlement offer guide',
    description:
      'A first offer from the at-fault driver’s insurer is a starting position, often made before treatment is finished. Before responding, compare it with your documented losses and the policy limits.',
    psychology: 'The offer feels insulting and I do not know whether to take it.',
    cta: 'Check My Offer',
    exampleQueries: [
      'car accident settlement offer too low',
      'how to respond to a lowball insurance offer',
      'should I accept first settlement offer car accident',
    ],
    signals: ['Offer timing', 'Treatment status', 'Documented losses', 'Policy limits', 'Disputed liability'],
    sections: {
      whyItMatters:
        'Insurers often make an early offer while you are still treating, when the full cost of the injury is unknown and the need for money is greatest. A settlement is final: once you sign a release, later treatment and complications are not covered. Before responding, it helps to know three things. First, what your documented losses are so far, including bills, lost wages and out-of-pocket costs, and what further care your doctors expect. Second, what the adjuster’s reasoning is; many insurers use claims software that discounts gaps in treatment, chiropractic-heavy care and low vehicle damage, and asking which factors reduced the number tells you what to address. Third, what the policy limit is, because an offer near the limit on a serious injury is a different conversation from an offer far below it. The usual response is a written demand that sets out liability, injuries, treatment and losses with records attached. Negotiating does not pause the two-year filing deadline, so a slow negotiation needs watching.',
      whatToTrack: [
        'The offer in writing, with the date and any deadline',
        'Treatment still planned or recommended',
        'Total bills, lost wages and out-of-pocket costs to date',
        'The reasons the adjuster gives for the number',
        'The at-fault driver’s policy limit, if disclosed',
      ],
      howClearCaseHelps: `ClearCaseIQ lays your documented losses and treatment status beside the offer, so you can see what it accounts for and what it leaves out. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Should I accept the first offer?', a: 'Not before you know how the injury is progressing. A release is final and cannot account for care you have not had yet.' },
      { q: 'Can I ask why the offer is so low?', a: 'Yes. The factors the adjuster used tell you which parts of the file need more documentation.' },
      { q: 'Does negotiating stop the deadline?', a: 'No. The two-year deadline to file suit keeps running during negotiation.' },
    ],
    caseType: 'car',
    caseSection: 'insurance',
    nextStep: {
      lead: 'Judging an offer starts with knowing',
      anchor: 'what a car accident case may be worth',
      to: '/how-much-is-a-car-accident-case-worth',
    },
  },
  {
    slug: '/car-accident-without-a-police-report-in-california',
    category: 'Liability',
    cluster: 'Car Accident Without a Police Report',
    title: 'Car Accident Claim Without a Police Report in California',
    eyebrow: 'Evidence guide',
    description:
      'A police report helps a car accident claim but is not required for one. Without it, photos, witnesses, the other driver’s information and your DMV SR-1 report carry more of the weight.',
    psychology: 'The police never came and I am worried I have no proof.',
    cta: 'Check My Evidence',
    exampleQueries: [
      'car accident no police report California claim',
      'can I file a claim without a police report',
      'police did not come to my car accident',
    ],
    signals: ['No report', 'SR-1 filing', 'Scene photos', 'Witnesses', 'Admissions'],
    sections: {
      whyItMatters:
        'Police in many California cities no longer respond to collisions without serious injury, so plenty of genuine claims have no report. An insurer cannot deny a claim simply because there is none; the report is evidence, not a requirement. What changes is that other evidence has to establish what happened. Photographs of both vehicles, their positions and the road, the other driver’s licence and insurance details, and names and numbers of anyone who saw the crash do most of the work. Messages in which the other driver apologizes or admits fault are useful. Dashcam and nearby business or traffic camera footage can be decisive but is usually overwritten quickly. Separately, California requires drivers to report a crash to the DMV on an SR-1 form within ten days when anyone was injured or property damage exceeded $1,000, whether or not police attended. You can also ask the local police department or CHP whether a report can still be filed after the fact.',
      whatToTrack: [
        'Photos of both vehicles, the scene and any injuries',
        'The other driver’s licence, plate and insurance details',
        'Witness names and phone numbers',
        'Your SR-1 filing with the DMV and its date',
        'Any messages or statements from the other driver',
      ],
      howClearCaseHelps: `ClearCaseIQ lists what your file already proves and what is missing, so you know which evidence to secure while it still exists. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Can I make a claim without a police report?', a: 'Yes. The report is one form of evidence; photos, witnesses and admissions can establish what happened without it.' },
      { q: 'Do I have to report the crash to the DMV?', a: 'Yes, on an SR-1 within ten days when there was an injury or property damage over $1,000.' },
      { q: 'Can I file a police report later?', a: 'Sometimes. Ask the police department or CHP for the area whether a late report can be taken.' },
    ],
    caseType: 'car',
    caseSection: 'evidence',
    nextStep: {
      lead: 'A full list of what to gather, with or without a report, is in',
      anchor: 'the car accident evidence checklist',
      to: '/car-accident-evidence-checklist',
    },
  },
  {
    slug: '/how-long-does-a-car-accident-claim-take-in-california',
    category: 'Insurance',
    cluster: 'Car Accident Claim Timeline',
    title: 'How Long Does a Car Accident Claim Take in California?',
    eyebrow: 'Claim timeline guide',
    description:
      'Most of the time in a car accident claim is spent waiting for treatment to finish, because the claim cannot be valued until the injury is understood. Negotiation and, if needed, a lawsuit follow.',
    psychology: 'I want to know when this will be over.',
    cta: 'Review My Claim Timeline',
    exampleQueries: [
      'how long does a car accident claim take in California',
      'how long does it take to get a settlement',
      'car accident claim timeline',
    ],
    signals: ['Treatment status', 'Demand timing', 'Insurer response', 'Disputed liability', 'Lawsuit'],
    sections: {
      whyItMatters:
        'A claim moves through predictable stages, and one thing governs the length of each. The first is treatment: until your doctors can say how the injury will resolve, the claim cannot be valued properly, so this stage usually runs as long as recovery does. Settling earlier trades certainty for speed. The second is the demand: once treatment ends or plateaus, records and bills are gathered and a written demand goes to the insurer, which can take weeks while providers respond to records requests. The third is the insurer’s answer. California’s fair claims regulations generally require an insurer to accept or deny a claim within 40 days of receiving proof of it, though negotiation then continues. Most claims resolve here. The fourth, if negotiation stalls, is a lawsuit, which adds discovery, depositions and often mediation, and can take a year or more. The two-year filing deadline runs throughout, so a slow claim still has to be filed in time.',
      whatToTrack: [
        'Your treatment plan and expected end date',
        'Dates records and bills were requested and received',
        'The date the demand was sent',
        'The insurer’s acknowledgement and response dates',
        'Your two-year filing deadline',
      ],
      howClearCaseHelps: `ClearCaseIQ shows which stage your claim is in and what it is waiting on, so delay can be told apart from a stalled file. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Why does the insurer wait until treatment ends?', a: 'Because the claim cannot be valued until the injury and its cost are known, and a settlement is final.' },
      { q: 'How long does the insurer have to respond?', a: 'California regulations generally require acceptance or denial within 40 days of proof of claim, though negotiation can continue after that.' },
      { q: 'Does filing a lawsuit mean going to trial?', a: 'Rarely. Most lawsuits settle, often after depositions or mediation.' },
    ],
    caseType: 'car',
    caseSection: 'insurance',
    nextStep: {
      lead: 'Time spent treating is also what establishes',
      anchor: 'what a car accident case may be worth',
      to: '/how-much-is-a-car-accident-case-worth',
    },
  },
  {
    slug: '/car-accident-evidence-checklist',
    category: 'Liability',
    cluster: 'Car Accident Evidence',
    title: 'Car Accident Evidence Checklist: What to Gather and When',
    eyebrow: 'Evidence checklist',
    description:
      'The evidence that decides a car accident claim is most available in the first days: photos, the other driver’s details, witnesses and camera footage. Medical records then show what the crash did to you.',
    psychology: 'I want to make sure I am not missing anything important.',
    cta: 'Check My Evidence',
    exampleQueries: [
      'what evidence do I need for a car accident claim',
      'car accident evidence checklist',
      'how to prove fault in a car accident',
    ],
    signals: ['Scene photos', 'Witnesses', 'Video footage', 'Vehicle damage', 'Medical records'],
    sections: {
      whyItMatters:
        'Evidence in a car accident claim does two jobs: it shows who caused the crash and it shows what the crash did to you. The first kind degrades fastest. Vehicles are repaired or scrapped, skid marks fade, and traffic, business and doorbell cameras commonly overwrite footage within days or weeks, so a written request to preserve video is worth sending early. Photographs of both vehicles from several angles, their final positions, traffic signals, road conditions and your injuries are the core. The other driver’s licence, plate and insurance, and the names and numbers of witnesses, are next. A police report number, if there is one, links all of it. The second kind builds over time: emergency and follow-up records, imaging, therapy notes, work notes and a short diary of symptoms and limits. Keep everything in one place with dates. Social media is evidence too, and insurers look at it, so posting about the crash or your activities is best avoided.',
      whatToTrack: [
        'Photos and video of the vehicles, scene and injuries',
        'Other driver’s licence, plate and insurance details',
        'Witness names and contact details',
        'Nearby cameras, and preservation requests sent',
        'Medical records, bills and a symptom diary',
      ],
      howClearCaseHelps: `ClearCaseIQ checks your file against this list and flags the pieces that are still missing or at risk of disappearing. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'How quickly is video footage deleted?', a: 'Often within days or weeks, depending on the system, which is why an early written preservation request matters.' },
      { q: 'Should I post about the accident online?', a: 'It is best not to. Insurers review social media and can use posts to dispute injuries.' },
      { q: 'Is a symptom diary useful?', a: 'Yes. Brief dated notes about pain and limits help fill gaps between medical visits.' },
    ],
    caseType: 'car',
    caseSection: 'evidence',
    nextStep: {
      lead: 'Strong evidence on fault shifts the conversation to injuries and losses, which is where',
      anchor: 'the value of a car accident case',
      to: '/how-much-is-a-car-accident-case-worth',
    },
  },
  {
    slug: '/car-accident-with-a-pre-existing-injury',
    category: 'Claim Types',
    cluster: 'Pre-Existing Injury Aggravation',
    title: 'Car Accident With a Pre-Existing Injury: Can You Still Claim?',
    eyebrow: 'Pre-existing condition guide',
    description:
      'A prior injury does not bar a California car accident claim. You can recover for the harm the crash added, and the medical records before and after it are what show the difference.',
    psychology: 'I had back problems before and I worry that ruins my claim.',
    cta: 'Review My Medical History',
    exampleQueries: [
      'car accident aggravated pre-existing condition',
      'can I claim if I had a prior back injury',
      'eggshell plaintiff car accident California',
    ],
    signals: ['Prior treatment', 'Symptom change', 'Imaging comparison', 'Aggravation', 'Degenerative findings'],
    sections: {
      whyItMatters:
        'Insurers raise prior injuries in almost every claim involving the neck or back, and many people assume an old condition means no claim. California law says otherwise. A driver who causes a crash takes the injured person as they find them, and you can recover for an aggravation of a pre-existing condition: the added pain, treatment and limitation the crash caused, though not the condition you already had. The argument is about the difference, and the evidence is the medical record on both sides of the crash. Records from before show what the condition was like: how often you were treated, what you could do, whether it was stable. Records after show what changed. Imaging helps when an earlier scan exists to compare against, and degenerative findings on an MRI, which are common with age, do not by themselves mean the current symptoms predate the crash. Being open about your history matters; the insurer will request prior records, and an undisclosed history does more damage than a disclosed one.',
      whatToTrack: [
        'Treatment for the same area in the years before the crash',
        'How you were functioning just before it: work, exercise, daily tasks',
        'Any earlier imaging that can be compared with new scans',
        'New symptoms or a clear worsening after the crash',
        'What your doctors say about aggravation',
      ],
      howClearCaseHelps: `ClearCaseIQ builds a before-and-after timeline of your treatment, so the change the crash caused is laid out clearly. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Does a prior injury mean I cannot claim?', a: 'No. You can recover for the harm the crash added to an existing condition.' },
      { q: 'Should I tell the insurer about my history?', a: 'Your records will show it. Being consistent and accurate about prior care protects your credibility.' },
      { q: 'What do degenerative findings on an MRI mean?', a: 'They are common with age and do not by themselves show that current symptoms began before the crash.' },
    ],
    caseType: 'car',
    caseSection: 'injuries',
    nextStep: {
      lead: 'How an aggravation is valued is part of the broader question of',
      anchor: 'what a car accident case may be worth',
      to: '/how-much-is-a-car-accident-case-worth',
    },
  },
  {
    slug: '/car-accident-property-damage-claim-california',
    category: 'Insurance',
    cluster: 'Vehicle Damage Claims',
    title: 'Car Accident Property Damage Claims in California',
    eyebrow: 'Vehicle damage guide',
    description:
      'Your vehicle damage claim is separate from the injury claim and usually settles first. It covers repairs or the car’s value if it is totalled, plus a rental or loss of use, and has a three-year deadline.',
    psychology: 'I need my car fixed and I do not want that to affect my injury claim.',
    cta: 'Review My Claim',
    exampleQueries: [
      'car accident property damage claim California',
      'total loss car value dispute',
      'rental car after accident not my fault',
    ],
    signals: ['Repair estimate', 'Total loss', 'Rental or loss of use', 'Diminished value', 'Deductible'],
    sections: {
      whyItMatters:
        'Property damage is handled as its own claim, usually by a different adjuster, and it normally resolves long before the injury claim. Settling it does not settle your injuries, but read any release to make sure it is limited to property. You can claim against the at-fault driver’s insurer or use your own collision coverage, paying your deductible and letting your insurer recover it from the other side; the second route is often faster when fault is disputed. The claim covers reasonable repair costs, or the actual cash value of the car if repair costs exceed it, a rental or compensation for loss of use while it is off the road, and sometimes diminished value, the lower resale value of a repaired car. Total-loss valuations are a common dispute: comparable listings for the same trim, mileage and condition are the best answer to a low figure. The deadline for property damage in California is three years, longer than the two-year injury deadline. Photographs of the damage also matter to the injury claim, since insurers use them to argue how hard the impact was.',
      whatToTrack: [
        'Repair estimates and final invoices',
        'The adjuster’s total-loss valuation and comparables',
        'Rental costs or days without a vehicle',
        'Your deductible, if you used collision coverage',
        'Photos of the damage before repair',
      ],
      howClearCaseHelps: `ClearCaseIQ keeps the vehicle claim and the injury claim distinct in your file, and preserves the damage photos the injury claim will need. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Does settling the car claim settle my injury claim?', a: 'Not if the release is limited to property damage, which is standard. Read it before signing.' },
      { q: 'Should I use my own collision coverage?', a: 'It is often faster, especially if fault is disputed. Your insurer can then seek your deductible from the other side.' },
      { q: 'What is the deadline for property damage?', a: 'Three years in California, compared with two years for the injury claim.' },
    ],
    caseType: 'car',
    caseSection: 'insurance',
    nextStep: {
      lead: 'The injury claim runs on a separate track; its value is covered in',
      anchor: 'our guide to car accident case value',
      to: '/how-much-is-a-car-accident-case-worth',
    },
  },

  // Slip and fall
  {
    slug: '/slipped-on-a-wet-floor-in-a-store-california',
    category: 'Liability',
    cluster: 'Store Wet Floor Falls',
    title: 'Slipped on a Wet Floor in a Store in California? What to Know',
    eyebrow: 'Store fall guide',
    description:
      'A store is responsible for a wet-floor fall when it knew about the spill or should have found it with reasonable inspections. How long the liquid was there, and how often the aisle was checked, usually decide the claim.',
    psychology: 'I fell in a store and they are acting like it was my fault.',
    cta: 'Check My Store Fall',
    exampleQueries: [
      'slipped on wet floor in store California',
      'grocery store slip and fall claim',
      'store liable for spill',
    ],
    signals: ['Spill duration', 'Inspection logs', 'Store video', 'Warning signs', 'Incident report'],
    sections: {
      whyItMatters:
        'Stores owe customers reasonable care to keep the floor safe, but they are not insurers against every fall. Under California premises law, the question is notice: did the store create the hazard, know about it, or have it long enough that a reasonable inspection would have found it? A spill from a leaking cooler the store never fixed, or a mopped floor with no sign, points to the store. A drink dropped seconds before by another shopper usually does not. Between those is where most claims sit, and they are decided by time. Stores keep sweep or inspection logs and video, and the gap between the last check and your fall is often the strongest evidence in the case. That video is typically retained for a limited period, so a written request to preserve it should go out quickly. The store’s incident report is its own document; ask for the report number, note the employees who responded, and photograph the floor, the liquid, any sign and your shoes before leaving if you can.',
      whatToTrack: [
        'Photos of the spill, the area and any warning sign',
        'Names of employees and witnesses',
        'The incident report number',
        'A written request to preserve video, and the date sent',
        'Your footwear and what you were carrying',
      ],
      howClearCaseHelps: `ClearCaseIQ organizes the notice evidence, from inspection timing to video requests, so the question the claim turns on is answered in your file. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Is the store always responsible for a spill?', a: 'No. It depends on whether the store knew or should have known about it in time to clean it or warn.' },
      { q: 'Can I get the store’s video?', a: 'Ask in writing for it to be preserved right away. It can be obtained later in a claim or lawsuit if it still exists.' },
      { q: 'Does it matter that I did not see the spill?', a: 'It may reduce recovery under comparative fault, but it does not end the claim.' },
    ],
    caseType: 'slip_fall',
    caseSection: 'liability',
    nextStep: {
      lead: 'Once responsibility is clear, the injury and its effect on your life determine',
      anchor: 'what a slip and fall case may be worth',
      to: '/how-much-is-a-slip-and-fall-case-worth',
    },
  },
  {
    slug: '/broken-hip-from-a-fall-california',
    category: 'Symptoms',
    cluster: 'Broken Hip From a Fall',
    title: 'Broken Hip From a Fall: Injury, Recovery and Your Claim',
    eyebrow: 'Hip fracture guide',
    description:
      'A hip fracture from a fall usually means surgery, a hospital stay and months of rehabilitation, and it can permanently change what a person can do. In a premises claim, those consequences are what the value rests on.',
    psychology: 'My parent broke a hip in a fall and everything has changed.',
    cta: 'Review the Injury',
    exampleQueries: [
      'broken hip from fall lawsuit California',
      'hip fracture slip and fall settlement',
      'elderly fall broken hip claim',
    ],
    signals: ['Hip surgery', 'Hospital stay', 'Rehabilitation', 'Loss of independence', 'Medicare lien'],
    sections: {
      whyItMatters:
        'Hip fractures are among the most serious fall injuries, especially for older adults. Most need surgery, either fixation with screws or rods or a partial or total hip replacement, followed by inpatient rehabilitation or a skilled nursing stay and months of physical therapy. Many people do not return to their previous level of mobility, and some move from independent living to assisted care. In a claim, that trajectory is what matters: the surgery and hospital costs, the rehabilitation, home modifications and care, and the loss of independence and enjoyment of life. Where the injured person is retired, lost wages may be small, but the non-economic loss can be substantial. Medicare frequently pays for hip fracture care and must be reimbursed from any recovery, so its conditional payment amount needs resolving before settlement. The liability questions are the same as any fall, notice and comparative fault, and insurers sometimes argue that age or balance problems, not the hazard, caused the fall, which makes evidence of the hazard itself important.',
      whatToTrack: [
        'Surgical and hospital records',
        'Rehabilitation or skilled nursing stays',
        'Mobility before the fall versus after',
        'Care, equipment and home changes now needed',
        'Medicare or other insurer payment notices',
      ],
      howClearCaseHelps: `ClearCaseIQ builds the before-and-after picture of mobility and care, which is what shows the full effect of a hip fracture. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Does age reduce a hip fracture claim?', a: 'Not by itself. Lost wages may be lower, but loss of independence and quality of life can be significant.' },
      { q: 'Does Medicare have to be repaid?', a: 'Usually, yes. Medicare has a right to reimbursement for injury-related care from a settlement.' },
      { q: 'What if the insurer blames a balance problem?', a: 'Evidence of the hazard, such as photos, witnesses and video, answers that argument best.' },
    ],
    caseType: 'slip_fall',
    caseSection: 'injuries',
    nextStep: {
      lead: 'Surgery, rehabilitation and lasting limits all feed into',
      anchor: 'what a slip and fall case may be worth',
      to: '/how-much-is-a-slip-and-fall-case-worth',
    },
  },
  {
    slug: '/slip-and-fall-evidence',
    category: 'Liability',
    cluster: 'Slip and Fall Evidence',
    title: 'Slip and Fall Evidence: Photos, Incident Reports and Video',
    eyebrow: 'Evidence guide',
    description:
      'In a slip and fall, the hazard is often gone within minutes and video within days. Photos, witness names, the incident report number and a preservation letter are what prove the claim later.',
    psychology: 'I did not know what to collect when I fell.',
    cta: 'Check My Evidence',
    exampleQueries: [
      'slip and fall evidence',
      'how to prove a slip and fall case',
      'should I fill out an incident report after a fall',
    ],
    signals: ['Hazard photos', 'Incident report', 'Video preservation', 'Witnesses', 'Footwear'],
    sections: {
      whyItMatters:
        'Premises claims turn on proving that a hazard existed and that the owner should have known about it, and both are proven with evidence that disappears quickly. The spill is mopped, the torn mat is replaced, the broken step is repaired. Photographs taken at the time, of the hazard, the surrounding area, the lighting, any warning signs and your shoes, are the single most valuable piece of evidence in most fall cases. If you could not take them, a companion or witness may have. Names and contact details for witnesses and responding employees matter because their accounts fade. Most businesses complete an incident report; you are entitled to see what you sign, and you should ask for the report number. Security video is often retained only for a limited time, so a written request that it be preserved, sent as soon as possible, can be decisive. Keep the shoes and clothes you wore. Medical records from the same day link the injury to the fall.',
      whatToTrack: [
        'Photos of the hazard, area, lighting and signage',
        'Witness and employee names and numbers',
        'Incident report number and a copy if offered',
        'Date of your written video preservation request',
        'Same-day medical records',
      ],
      howClearCaseHelps: `ClearCaseIQ shows which of these your file already has and which to chase first while they still exist. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Should I sign the store’s incident report?', a: 'Read it first and correct anything inaccurate. Ask for the report number either way.' },
      { q: 'What if I did not take photos?', a: 'Ask companions or witnesses, and return to photograph the area if the hazard is ongoing.' },
      { q: 'How do I preserve video?', a: 'Send a written request to the business, as early as possible, asking that footage of the incident be kept.' },
    ],
    caseType: 'slip_fall',
    caseSection: 'evidence',
    nextStep: {
      lead: 'The evidence establishes responsibility; the injury then determines',
      anchor: 'what a slip and fall case may be worth',
      to: '/how-much-is-a-slip-and-fall-case-worth',
    },
  },
  {
    slug: '/slip-and-fall-medical-bills-and-lost-wages',
    category: 'Settlement',
    cluster: 'Slip and Fall Economic Losses',
    title: 'Slip and Fall Medical Bills and Lost Wages: What Is Covered',
    eyebrow: 'Economic losses guide',
    description:
      'A slip and fall claim covers medical care, future treatment and income lost to the injury. Many business policies also include medical payments coverage that pays early bills regardless of fault.',
    psychology: 'I cannot work and the bills from my fall are piling up.',
    cta: 'Review My Losses',
    exampleQueries: [
      'who pays medical bills after slip and fall',
      'slip and fall lost wages',
      'medical payments coverage premises liability',
    ],
    signals: ['Medical bills', 'Med-pay coverage', 'Lost wages', 'Future care', 'Health insurance lien'],
    sections: {
      whyItMatters:
        'The economic side of a fall claim is built the same way as any injury claim, with one feature people often miss. Many commercial general liability policies, and some homeowner policies, include medical payments coverage that pays reasonable medical costs for someone hurt on the property regardless of fault, usually up to a modest limit. Asking the property owner’s insurer whether it applies can bring early money without waiting for the liability claim. Beyond that, medical bills are usually paid by your health insurance, which then seeks reimbursement from the recovery, and under the Howell rule past medical damages for an insured person are generally the amounts actually paid. Future treatment, such as surgery that has been recommended or ongoing therapy, is claimed on a doctor’s projection. Lost wages cover time off work for the injury and its treatment, documented with pay records and work notes, and a lasting restriction can support a claim for reduced earning capacity. Out-of-pocket costs such as equipment, prescriptions and travel to appointments count too.',
      whatToTrack: [
        'Bills and explanations of benefits, with amounts paid',
        'Whether the property’s policy has medical payments coverage',
        'Doctor’s projections for future care',
        'Time off work, with employer confirmation',
        'Out-of-pocket costs and receipts',
      ],
      howClearCaseHelps: `ClearCaseIQ totals your documented economic losses and separates what has been paid from what is still owed. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Will the store pay my medical bills right away?', a: 'Sometimes, through medical payments coverage on its policy, which applies regardless of fault up to a limit.' },
      { q: 'Can I claim future treatment?', a: 'Yes, where a doctor has recommended it and can estimate its cost.' },
      { q: 'Does my health insurer get repaid?', a: 'Usually. Most plans have reimbursement rights against an injury recovery.' },
    ],
    caseType: 'slip_fall',
    caseSection: 'value',
    nextStep: {
      lead: 'Economic losses combine with pain and suffering to make up',
      anchor: 'the full value of a slip and fall case',
      to: '/how-much-is-a-slip-and-fall-case-worth',
    },
  },

  // Dog bite
  {
    slug: '/dog-bite-scarring-compensation-california',
    category: 'Settlement',
    cluster: 'Dog Bite Scarring',
    title: 'Dog Bite Scarring Compensation in California',
    eyebrow: 'Scarring guide',
    description:
      'Scarring is often the largest part of a California dog bite claim. Its location, size, permanence and the victim’s age drive the value, along with the cost of any future revision surgery.',
    psychology: 'The wound healed but the scar is permanent.',
    cta: 'Review My Scarring',
    exampleQueries: [
      'dog bite scar compensation California',
      'how much for a dog bite scar on face',
      'dog bite scar on child settlement',
    ],
    signals: ['Facial scarring', 'Child victim', 'Revision surgery', 'Keloid or hypertrophic scar', 'Emotional impact'],
    sections: {
      whyItMatters:
        'Scarring and disfigurement are compensated as non-economic loss, and in dog bite cases they frequently outweigh the medical bills. There is no formula; value depends on how visible the scar is in everyday life, how large and noticeable it is, whether it is permanent, and who carries it. A scar on the face or hands is valued differently from one usually covered by clothing. Children are a particular case: a child’s scar may change as they grow, may need revision surgery years later, and can affect confidence through school and adolescence. An evaluation by a plastic surgeon helps in two ways: it establishes whether the scar is likely permanent and it estimates the cost of future revision, laser treatment or other procedures, which become part of the economic claim. Some scars thicken or become keloid, which can mean more treatment. Dated photographs at each stage of healing are the best record, because a claim is often valued months after the bite when the wound looks very different.',
      whatToTrack: [
        'Dated photographs from injury through healing',
        'A plastic surgeon’s assessment and future treatment estimate',
        'Location and size of each scar',
        'Effects on confidence, school, work or social life',
        'Any counselling for fear or anxiety',
      ],
      howClearCaseHelps: `ClearCaseIQ keeps a dated healing record and captures future treatment estimates, so the scar is valued on its full course rather than a single photo. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Are dog bite scars compensated?', a: 'Yes, as non-economic loss, and future revision surgery can be claimed as an economic cost.' },
      { q: 'Why are facial scars valued differently?', a: 'Because visibility and permanence drive the value of disfigurement, and the face is always visible.' },
      { q: 'Should a child see a plastic surgeon?', a: 'An evaluation helps establish permanence and the likely cost of future treatment as the child grows.' },
    ],
    caseType: 'dog_bite',
    caseSection: 'injuries',
    nextStep: {
      lead: 'Scarring sits alongside medical costs and coverage in',
      anchor: 'what a dog bite case may be worth',
      to: '/how-much-is-a-dog-bite-case-worth',
    },
  },
  {
    slug: '/dog-bite-infection-and-treatment',
    category: 'Treatment',
    cluster: 'Dog Bite Infection',
    title: 'Dog Bite Infection and Treatment: What to Expect',
    eyebrow: 'Treatment guide',
    description:
      'Dog bites carry a real risk of infection, and a wound that looks minor can worsen within a day or two. Prompt cleaning, antibiotics where prescribed, and decisions about tetanus and rabies all belong in the record.',
    psychology: 'The bite looked small but now it is red and swollen.',
    cta: 'Review My Treatment',
    exampleQueries: [
      'dog bite infection signs',
      'do I need antibiotics for a dog bite',
      'rabies shot after dog bite California',
    ],
    signals: ['Infection', 'Antibiotics', 'Rabies decision', 'Tetanus', 'Wound care'],
    sections: {
      whyItMatters:
        'Puncture wounds from a dog’s teeth push bacteria deep into tissue, and bites to the hand are particularly prone to infection because of the tendons and joints close to the surface. Warning signs include spreading redness, swelling, warmth, pus, fever and increasing pain, often within 24 to 48 hours. Some infections need intravenous antibiotics or surgical cleaning. Medical guidance commonly includes cleaning the wound, a decision about antibiotics, and a check of tetanus status. Rabies is rare in California dogs, but where the dog’s vaccination status is unknown or the dog cannot be observed, a clinician will decide whether rabies treatment is needed. California requires bites to be reported to local health or animal control authorities, and the dog is usually confined for observation for ten days, which often answers the rabies question. In a claim, this record matters: it shows the seriousness of the wound, explains the treatment and its cost, and ties any infection or complication to the bite.',
      whatToTrack: [
        'The date and time of first treatment',
        'Antibiotics and any change in prescription',
        'Signs of infection and when they appeared',
        'Rabies and tetanus decisions',
        'The animal control report and quarantine outcome',
      ],
      howClearCaseHelps: `ClearCaseIQ records the course of treatment and any complications, so the full medical story of the bite is in one place. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'How soon can a dog bite get infected?', a: 'Often within a day or two. Spreading redness, swelling, pus or fever need prompt medical attention.' },
      { q: 'Do I need a rabies shot?', a: 'That is a clinical decision. Where the dog is known and can be observed, treatment is often unnecessary.' },
      { q: 'Does a bite have to be reported?', a: 'California requires bites to be reported to local health or animal control authorities.' },
    ],
    caseType: 'dog_bite',
    caseSection: 'treatment',
    nextStep: {
      lead: 'Infection and extra treatment increase the documented cost of a bite, which feeds into',
      anchor: 'what a dog bite case may be worth',
      to: '/how-much-is-a-dog-bite-case-worth',
    },
  },
  {
    slug: '/does-homeowners-insurance-cover-dog-bites-in-california',
    category: 'Insurance',
    cluster: 'Dog Bite Homeowners Insurance',
    title: 'Does Homeowners Insurance Cover Dog Bites in California?',
    eyebrow: 'Insurance guide',
    description:
      'Most dog bite claims in California are paid by the owner’s homeowner or renter liability insurance, often even when the bite happens away from home. Breed exclusions and uninsured owners are the main exceptions.',
    psychology: 'I do not want to bankrupt my neighbor; I just need my bills covered.',
    cta: 'Check the Coverage',
    exampleQueries: [
      'does homeowners insurance cover dog bites California',
      'renters insurance dog bite claim',
      'dog bite breed exclusion insurance',
    ],
    signals: ['Homeowner policy', 'Renter policy', 'Breed exclusion', 'Policy limits', 'Umbrella coverage'],
    sections: {
      whyItMatters:
        'Many people hesitate to make a claim because the owner is a friend, relative or neighbor. In practice the claim is usually paid by the owner’s insurance, not the owner personally. Homeowner and renter policies typically include personal liability coverage that responds when the policyholder’s dog injures someone, and that coverage often follows the owner, so a bite at a park may be covered by the owner’s home policy. Limits vary, and an umbrella policy can add more. The main exceptions are policies that exclude certain breeds or dogs with a bite history, and owners who have no policy at all, such as some renters. Where coverage is excluded or absent, a strong claim can be hard to collect, which is why finding out early whether a policy applies is one of the most useful steps. Ask the owner for their insurer and policy number, just as you would after a car accident. The insurer then handles the claim, and strict liability under Civil Code section 3342 usually means the discussion is about value, not fault.',
      whatToTrack: [
        'The owner’s name, address and insurer',
        'Policy number and claim number',
        'Whether the policy excludes the breed',
        'Where the bite happened',
        'Any landlord or keeper who may also have coverage',
      ],
      howClearCaseHelps: `ClearCaseIQ flags coverage questions early, so the value of a claim is considered alongside whether a policy will pay it. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Will the owner have to pay out of pocket?', a: 'Usually not. Most dog bite claims are paid by the owner’s homeowner or renter liability policy.' },
      { q: 'Does coverage apply if the bite was not at the owner’s home?', a: 'Often yes. Personal liability coverage typically follows the policyholder.' },
      { q: 'What is a breed exclusion?', a: 'A policy term that removes coverage for certain breeds or dogs with a bite history.' },
    ],
    caseType: 'dog_bite',
    caseSection: 'insurance',
    nextStep: {
      lead: 'With coverage identified, the next question is',
      anchor: 'what a dog bite case may be worth',
      to: '/how-much-is-a-dog-bite-case-worth',
    },
  },

  // Pedestrian
  {
    slug: '/hit-by-a-car-in-a-crosswalk-california',
    category: 'Liability',
    cluster: 'Crosswalk Pedestrian Accidents',
    title: 'Hit by a Car in a Crosswalk in California: Who Is at Fault?',
    eyebrow: 'Crosswalk guide',
    description:
      'California drivers must yield to pedestrians in marked and unmarked crosswalks. A driver who turns into a crosswalk, runs a light or passes a car stopped for a pedestrian is usually at fault.',
    psychology: 'I was in the crosswalk and the driver still hit me.',
    cta: 'Check My Crosswalk Claim',
    exampleQueries: [
      'hit by car in crosswalk California',
      'pedestrian right of way crosswalk',
      'driver turning right hit pedestrian',
    ],
    signals: ['Marked or unmarked crosswalk', 'Signal phase', 'Turning driver', 'Stopped vehicle passed', 'Visibility'],
    sections: {
      whyItMatters:
        'Vehicle Code section 21950 requires drivers to yield to a pedestrian crossing within a marked crosswalk or an unmarked crosswalk at an intersection, and an unmarked crosswalk exists at most intersections whether or not lines are painted. Section 21951 prohibits passing a vehicle that has stopped at a crosswalk to let a pedestrian cross, a common cause of serious injury on multi-lane roads. Turning drivers are frequent defendants: a driver turning right on red, or left across a crosswalk with a walk signal, must yield to pedestrians already crossing. The pedestrian’s own duty is narrower: not to step suddenly off the curb into the path of a vehicle too close to stop. Insurers often argue that the pedestrian entered against the signal or was not visible. Signal timing, camera footage, the impact point on the vehicle, lighting and witness accounts usually settle those questions. Under pure comparative negligence, even a pedestrian found partly at fault still recovers a reduced share.',
      whatToTrack: [
        'Where exactly you were crossing, and whether lines were painted',
        'The signal phase when you entered',
        'The driver’s direction and whether they were turning',
        'Nearby traffic or business cameras',
        'Witnesses and the police report number',
      ],
      howClearCaseHelps: `ClearCaseIQ applies the crosswalk rules to your facts and shows which evidence answers the driver’s account. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Do crosswalks need painted lines?', a: 'No. At most intersections an unmarked crosswalk exists in law, and drivers must yield there too.' },
      { q: 'What if I started crossing on a flashing signal?', a: 'That can raise comparative fault arguments, but drivers must still yield to pedestrians already in the crosswalk.' },
      { q: 'Can a driver pass a car stopped at a crosswalk?', a: 'No. Vehicle Code section 21951 prohibits it.' },
    ],
    caseType: 'pedestrian',
    caseSection: 'liability',
    nextStep: {
      lead: 'With fault established, the injuries and the coverage available decide',
      anchor: 'what a pedestrian accident case may be worth',
      to: '/how-much-is-a-pedestrian-accident-case-worth',
    },
  },
  {
    slug: '/pedestrian-hit-and-run-uninsured-motorist-coverage',
    category: 'Insurance',
    cluster: 'Pedestrian Hit-and-Run Coverage',
    title: 'Pedestrian Hit-and-Run: Using Your Own Uninsured Motorist Coverage',
    eyebrow: 'Coverage guide',
    description:
      'A pedestrian hit by a driver who flees can usually claim on their own auto policy’s uninsured motorist coverage, or a household member’s, even though they were walking. Prompt police and insurer notice is essential.',
    psychology: 'The driver who hit me drove off and I do not know who they are.',
    cta: 'Check My Coverage',
    exampleQueries: [
      'pedestrian hit and run uninsured motorist California',
      'does my car insurance cover me as a pedestrian',
      'hit and run driver never found',
    ],
    signals: ['Unidentified driver', 'Police report timing', 'Own UM policy', 'Household policy', 'Arbitration'],
    sections: {
      whyItMatters:
        'When a driver flees and is never identified, there is no liability policy to claim against, and many pedestrians assume there is no recovery. But uninsured motorist coverage on your own auto policy generally protects you as a pedestrian, not only as a driver, and a relative living in your household may have a policy that covers you too. Under Insurance Code section 11580.2, a hit-and-run by an unidentified driver is treated as an uninsured motorist claim, with conditions: there generally must have been physical contact with the vehicle, the crash must be reported to the police promptly (the statute refers to within 24 hours), and the insurer must receive notice and a sworn statement within a short period afterwards. Missing those steps can defeat an otherwise strong claim, so reporting quickly matters even while in hospital, and a family member can do it. Uninsured motorist claims that do not settle are usually decided by arbitration rather than in court. If the driver is later identified, their insurance can also be pursued.',
      whatToTrack: [
        'The police report number and the time it was made',
        'Your auto policy and any household member’s policy',
        'The date you notified the insurer',
        'Any description of the vehicle or partial plate',
        'Witnesses and nearby cameras',
      ],
      howClearCaseHelps: `ClearCaseIQ identifies the policies that may cover you and tracks the notice steps a hit-and-run claim depends on. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Does my car insurance cover me when I am walking?', a: 'Your uninsured motorist coverage generally does, including after a hit-and-run.' },
      { q: 'I do not own a car. Am I covered?', a: 'Possibly, under the policy of a relative who lives with you. Check every household policy.' },
      { q: 'How quickly must I report a hit-and-run?', a: 'Promptly. The Insurance Code refers to a police report within 24 hours for hit-and-run coverage, and insurers require early notice.' },
    ],
    caseType: 'pedestrian',
    caseSection: 'insurance',
    nextStep: {
      lead: 'Coverage limits often decide how much of a serious loss can be recovered; see',
      anchor: 'what a pedestrian accident case may be worth',
      to: '/how-much-is-a-pedestrian-accident-case-worth',
    },
  },
  {
    slug: '/common-pedestrian-accident-injuries',
    category: 'Symptoms',
    cluster: 'Pedestrian Accident Injuries',
    title: 'The Most Common Pedestrian Accident Injuries',
    eyebrow: 'Injury guide',
    description:
      'Pedestrians struck by a vehicle usually suffer leg and pelvic fractures, head injuries and spinal injuries, often together. These injuries tend to need surgery and long rehabilitation.',
    psychology: 'I was hit walking and my injuries keep adding up.',
    cta: 'Review My Injuries',
    exampleQueries: [
      'common pedestrian accident injuries',
      'injuries from being hit by a car',
      'pedestrian leg fracture head injury',
    ],
    signals: ['Lower-leg fracture', 'Pelvic fracture', 'Head injury', 'Spinal injury', 'Surgery'],
    sections: {
      whyItMatters:
        'Pedestrian injuries follow a recognisable pattern. The bumper usually strikes the lower legs first, causing tibia and fibula fractures and knee ligament damage. The body then rotates onto the hood or windshield, and the head, shoulders and pelvis take the impact, before a second impact with the road. The result is often several serious injuries at once: fractures that need surgical fixation, traumatic brain injury ranging from concussion to severe injury, spinal injuries, shoulder and arm fractures from the fall, and deep abrasions that scar. Head injuries deserve particular attention because symptoms like memory problems, headaches and mood changes can emerge or persist after the first scan is clear. Recovery tends to be long, with surgery, inpatient rehabilitation and months of therapy, and some injuries leave lasting limits on walking, work and daily life. That combination is why pedestrian claims frequently exceed the at-fault driver’s policy limit, making every available source of coverage important.',
      whatToTrack: [
        'Every injury diagnosed, including those found later',
        'Surgeries and hospital stays',
        'Head injury symptoms and neurological follow-up',
        'Rehabilitation and therapy attendance',
        'Lasting limits on walking, work or daily tasks',
      ],
      howClearCaseHelps: `ClearCaseIQ keeps a single injury list across providers, so nothing diagnosed later is missing from the claim. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Why do pedestrians suffer leg fractures so often?', a: 'Because the bumper usually strikes the lower legs first.' },
      { q: 'Should I see a neurologist after a clear head scan?', a: 'If symptoms such as headaches, memory problems or mood changes persist, follow-up evaluation is worth discussing with your doctor.' },
      { q: 'Why do pedestrian claims exceed policy limits?', a: 'The injuries are often severe and multiple, and many drivers carry minimum coverage.' },
    ],
    caseType: 'pedestrian',
    caseSection: 'injuries',
    nextStep: {
      lead: 'The severity and number of injuries drive',
      anchor: 'the value of a pedestrian accident case',
      to: '/how-much-is-a-pedestrian-accident-case-worth',
    },
  },

  // Medical malpractice
  {
    slug: '/misdiagnosis-or-delayed-diagnosis-claim-california',
    category: 'Claim Types',
    cluster: 'Misdiagnosis and Delayed Diagnosis',
    title: 'Misdiagnosis and Delayed Diagnosis Claims in California',
    eyebrow: 'Diagnosis error guide',
    description:
      'A missed or late diagnosis is malpractice when a competent provider would have made it sooner and the delay made the outcome worse. Proving that the delay caused the harm is usually the hardest part.',
    psychology: 'If they had caught it earlier, things would be different.',
    cta: 'Review My Diagnosis Timeline',
    exampleQueries: [
      'misdiagnosis lawsuit California',
      'delayed cancer diagnosis malpractice',
      'failure to diagnose claim',
    ],
    signals: ['Missed symptoms', 'Test not ordered', 'Result not followed up', 'Disease progression', 'Discovery date'],
    sections: {
      whyItMatters:
        'Diagnosis errors are among the most common malpractice claims: cancer found at a later stage than it should have been, a stroke or heart attack sent home as something minor, an infection that became sepsis. A claim has two parts. First, that a reasonably careful provider, given the same symptoms and history, would have ordered the test, made the referral or followed up the abnormal result that was missed. Second, and usually harder, that the delay changed the outcome. The illness itself was not caused by the provider, so the question is what difference earlier diagnosis would have made, and California generally requires proof that a better outcome was more likely than not. Both parts need expert testimony. The timeline is the core evidence: when symptoms were reported, what was ordered, what the results showed and when they were acted on. The one-year discovery deadline often runs from when you learned, or should have suspected, that the delay caused harm, so the date of that realisation matters.',
      whatToTrack: [
        'Symptoms reported at each visit, and to whom',
        'Tests ordered or not ordered, and results',
        'When the correct diagnosis was made',
        'How the condition progressed in the gap',
        'When you first suspected the delay caused harm',
      ],
      howClearCaseHelps: `ClearCaseIQ builds the diagnosis timeline an expert needs to review, from first symptom to correct diagnosis. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Is every misdiagnosis malpractice?', a: 'No. It must be a diagnosis a competent provider would have made, and the delay must have worsened the outcome.' },
      { q: 'What is the hardest part to prove?', a: 'Usually causation: showing that earlier diagnosis would more likely than not have led to a better result.' },
      { q: 'When does the deadline start?', a: 'Generally one year from when you discovered, or should have discovered, the injury, and no later than three years from it.' },
    ],
    caseType: 'medmal',
    caseSection: 'liability',
    nextStep: {
      lead: 'Where delay caused lasting harm, the next question is',
      anchor: 'what a medical malpractice case may be worth under MICRA',
      to: '/how-much-is-a-medical-malpractice-case-worth-in-california',
    },
  },
  {
    slug: '/surgical-error-claim-california',
    category: 'Claim Types',
    cluster: 'Surgical Error Claims',
    title: 'Surgical Error Claims in California',
    eyebrow: 'Surgical error guide',
    description:
      'Some surgical errors, like wrong-site surgery or an instrument left inside, are clear. Others, like a nerve or organ injured during an operation, depend on whether the harm was a known risk or a departure from careful technique.',
    psychology: 'I went in for one problem and came out with another.',
    cta: 'Review My Surgery',
    exampleQueries: [
      'surgical error lawsuit California',
      'surgeon nicked organ malpractice',
      'retained surgical sponge claim',
    ],
    signals: ['Wrong site', 'Retained object', 'Organ or nerve injury', 'Informed consent', 'Corrective surgery'],
    sections: {
      whyItMatters:
        'Surgical claims range from the obvious to the heavily contested. Wrong-site or wrong-patient surgery and instruments or sponges left in the body are errors that should never happen, and a foreign object left behind also changes the deadline: the three-year outer limit in the malpractice statute does not apply to a foreign body with no therapeutic purpose. More often the question is whether an injury during surgery, such as a perforated bowel, a damaged nerve or excessive bleeding, was a recognised risk that occurs even with good technique or the result of carelessness. Expert surgeons answer that by reviewing the operative report, anaesthesia records and what happened after. Recognising and treating a complication promptly is part of the standard of care too, so a delay in responding can be a claim even where the complication itself was not. Informed consent is a separate basis: if a material risk that occurred was not disclosed, and a reasonable patient would have declined, that can support a claim.',
      whatToTrack: [
        'The consent form and what risks were discussed',
        'The operative and anaesthesia reports',
        'When the problem was recognised and how it was treated',
        'Corrective surgeries and hospital days',
        'Lasting effects on function or work',
      ],
      howClearCaseHelps: `ClearCaseIQ organizes the surgical records into the sequence an expert reviews, from consent through corrective care. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Is every surgical complication malpractice?', a: 'No. Many complications are known risks. The question is whether careful technique would have avoided it.' },
      { q: 'What if a sponge was left inside me?', a: 'That is usually a clear breach, and the three-year outer limit does not apply to a retained foreign object.' },
      { q: 'What is an informed consent claim?', a: 'A claim that a material risk was not disclosed and a reasonable patient would have declined the procedure.' },
    ],
    caseType: 'medmal',
    caseSection: 'liability',
    nextStep: {
      lead: 'Corrective surgery and lasting harm are central to',
      anchor: 'what a medical malpractice case may be worth',
      to: '/how-much-is-a-medical-malpractice-case-worth-in-california',
    },
  },
  {
    slug: '/medication-error-claim-california',
    category: 'Claim Types',
    cluster: 'Medication Error Claims',
    title: 'Medication Error Claims in California',
    eyebrow: 'Medication error guide',
    description:
      'Medication errors happen at three points: prescribing, dispensing and administering. The wrong drug, the wrong dose or a missed interaction can each support a claim against a doctor, pharmacy or hospital.',
    psychology: 'I was given the wrong medication and it made me seriously ill.',
    cta: 'Review the Medication Error',
    exampleQueries: [
      'medication error lawsuit California',
      'pharmacy gave wrong prescription',
      'hospital wrong dose malpractice',
    ],
    signals: ['Wrong drug', 'Wrong dose', 'Drug interaction', 'Allergy ignored', 'Pharmacy error'],
    sections: {
      whyItMatters:
        'Who is responsible for a medication error depends on where it happened. A prescribing error, such as the wrong drug, a dose outside safe range for your weight or kidney function, or a drug that interacts with one you already take or that you are documented as allergic to, points to the prescriber. A dispensing error, where the pharmacy fills the wrong drug or strength or mislabels instructions, points to the pharmacy, which has its own duty to check prescriptions for obvious problems. An administration error in hospital, such as the wrong patient, dose, route or timing, usually points to nursing staff and the hospital. The evidence differs at each point: the prescription itself, the pharmacy label and records, and in hospital the medication administration record, which logs what was given and when. Keep the bottle, label and any remaining pills. As with other malpractice, you must also show the error caused harm, which is clearer with an acute reaction than with a slow or disputed effect.',
      whatToTrack: [
        'The prescription and the pharmacy label',
        'The bottle and any remaining medication',
        'Symptoms after taking it and when they began',
        'Hospital medication administration records',
        'Treatment needed for the reaction',
      ],
      howClearCaseHelps: `ClearCaseIQ traces where in the chain the error occurred, which decides who is responsible and what records to request. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Can I sue a pharmacy?', a: 'Yes. Pharmacies can be liable for dispensing errors and for failing to catch obvious prescription problems.' },
      { q: 'What should I keep?', a: 'The bottle, label, remaining pills and any paperwork from the pharmacy.' },
      { q: 'Do MICRA limits apply?', a: 'Generally yes, to claims against healthcare providers, including pharmacists, for professional negligence.' },
    ],
    caseType: 'medmal',
    caseSection: 'liability',
    nextStep: {
      lead: 'The harm the error caused determines',
      anchor: 'what a medical malpractice case may be worth',
      to: '/how-much-is-a-medical-malpractice-case-worth-in-california',
    },
  },
  {
    slug: '/birth-injury-claim-california',
    category: 'Claim Types',
    cluster: 'Birth Injury Claims',
    title: 'Birth Injury Claims in California',
    eyebrow: 'Birth injury guide',
    description:
      'A birth injury claim arises when care during pregnancy, labour or delivery falls below the standard and injures the baby or mother. These claims usually centre on fetal monitoring, delivery decisions and lifetime care costs.',
    psychology: 'Something went wrong during the birth and our child is living with it.',
    cta: 'Review the Birth Records',
    exampleQueries: [
      'birth injury lawsuit California',
      'cerebral palsy medical malpractice',
      'Erb’s palsy claim',
    ],
    signals: ['Fetal monitoring', 'Delayed C-section', 'Oxygen deprivation', 'Brachial plexus injury', 'Lifetime care'],
    sections: {
      whyItMatters:
        'Birth injuries include brain injury from oxygen deprivation (hypoxic-ischemic encephalopathy, sometimes leading to cerebral palsy), brachial plexus injuries such as Erb’s palsy from shoulder dystocia, fractures, and injuries to the mother such as severe tearing or haemorrhage. Not every birth injury is malpractice; some happen despite good care. Claims usually focus on whether the team recognised and responded to warning signs: fetal heart rate patterns on the monitor that called for intervention, a delayed decision to deliver by caesarean, excessive force during delivery, or failure to manage a known risk such as preeclampsia or a large baby. The fetal monitoring strips, labour and delivery notes and the baby’s first blood gases are central evidence, and obtaining them early matters. These cases often carry very large economic damages, because a child with a serious injury may need a lifetime of medical care, therapy and support, which is not capped by MICRA. Deadlines for minors differ: a claim for a child generally must be filed within three years or before the child’s eighth birthday, whichever is later.',
      whatToTrack: [
        'The complete labour and delivery records, including monitor strips',
        'The baby’s newborn and NICU records',
        'Diagnoses made in the months after birth',
        'Therapies, equipment and specialist care',
        'Projected future care needs',
      ],
      howClearCaseHelps: `ClearCaseIQ helps assemble the birth records an expert reviews first and keeps a running record of the child’s care needs. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Is every birth injury malpractice?', a: 'No. Some injuries happen with good care. The question is whether warning signs were missed or handled below the standard.' },
      { q: 'How long do we have to file for a child?', a: 'Generally within three years or before the child’s eighth birthday, whichever is later, though earlier action is wise.' },
      { q: 'Does MICRA cap future care costs?', a: 'No. MICRA caps only non-economic damages; medical and care costs are not capped.' },
    ],
    caseType: 'medmal',
    caseSection: 'injuries',
    nextStep: {
      lead: 'Lifetime care costs are why birth injury cases are valued differently; see',
      anchor: 'what a medical malpractice case may be worth',
      to: '/how-much-is-a-medical-malpractice-case-worth-in-california',
    },
  },

  // Wrongful death
  {
    slug: '/wrongful-death-vs-survival-action-california',
    category: 'Claim Types',
    cluster: 'Wrongful Death vs Survival Action',
    title: 'Wrongful Death vs. Survival Action in California',
    eyebrow: 'Claim types guide',
    description:
      'A death can give rise to two separate claims. The family’s wrongful death claim covers what they lost; the estate’s survival action covers what the person who died suffered and lost before death.',
    psychology: 'I did not know there could be more than one claim.',
    cta: 'Review Both Claims',
    exampleQueries: [
      'wrongful death vs survival action California',
      'what is a survival action',
      'who brings a survival claim',
    ],
    signals: ['Heirs', 'Estate representative', 'Pre-death suffering', 'Medical expenses before death', 'Punitive damages'],
    sections: {
      whyItMatters:
        'The two claims belong to different people and recover different losses, and missing the second is a common and costly oversight. The wrongful death claim, under Code of Civil Procedure section 377.60, belongs to the heirs who have standing: usually a spouse or domestic partner and children, and in some circumstances parents or others. It compensates their loss: financial support the person would have provided, household services, funeral and burial costs, and the loss of love, companionship, comfort and guidance. It does not compensate grief itself. The survival action, under section 377.30, belongs to the estate and is brought by its personal representative. It carries the claim the person would have had if they had lived: medical expenses and lost earnings between injury and death, and, under California law as amended, the pain and suffering they endured before dying. Punitive damages, where the conduct was malicious or reckless enough, are available in the survival action but not the wrongful death claim. The two are usually filed together, and any recovery in the survival action passes through the estate.',
      whatToTrack: [
        'Who the heirs are, and who is the estate representative',
        'Medical care and costs between injury and death',
        'Evidence of what the person experienced before death',
        'The person’s earnings and household role',
        'Conduct that might support punitive damages',
      ],
      howClearCaseHelps: `ClearCaseIQ separates the family’s losses from the estate’s, so neither claim is left out of the picture. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Who brings a survival action?', a: 'The personal representative of the estate, or a successor in interest if there is no probate.' },
      { q: 'Can both claims be filed together?', a: 'Yes, and they usually are.' },
      { q: 'Which claim includes punitive damages?', a: 'The survival action, where the conduct justifies them. They are not available in the wrongful death claim.' },
    ],
    caseType: 'wrongful_death',
    caseSection: 'value',
    nextStep: {
      lead: 'How each claim is measured is explained in',
      anchor: 'what a wrongful death case may be worth in California',
      to: '/how-much-is-a-wrongful-death-case-worth-in-california',
    },
  },
  {
    slug: '/wrongful-death-evidence',
    category: 'Liability',
    cluster: 'Wrongful Death Evidence',
    title: 'Evidence in a California Wrongful Death Case',
    eyebrow: 'Evidence guide',
    description:
      'A wrongful death case needs evidence of three things: what caused the death, who was responsible, and what the family lost. Reports, medical records, earnings records and evidence of the relationship all play a part.',
    psychology: 'I do not know where to begin gathering what is needed.',
    cta: 'Organize the Evidence',
    exampleQueries: [
      'evidence needed for wrongful death case',
      'how to prove wrongful death California',
      'autopsy report wrongful death claim',
    ],
    signals: ['Cause of death', 'Accident reports', 'Medical records', 'Earnings records', 'Relationship evidence'],
    sections: {
      whyItMatters:
        'Evidence in a wrongful death case falls into three groups. The first establishes the cause of death: the death certificate, coroner or autopsy findings, and medical records from any treatment before death. The second establishes responsibility, and depends on how the death happened: police and collision reports, witness statements, photographs, video, vehicle data and any criminal case file after a crash; inspection, maintenance and incident records for unsafe property; and the full medical chart for a death involving care. Some of this, like video and vehicle data, needs preserving quickly. The third establishes the family’s loss: tax returns, pay records and benefits to show financial support; evidence of the household services the person provided; funeral and burial bills; and evidence of the relationship itself, such as photographs, messages and accounts from people who knew the family, because love, companionship and guidance are part of what is compensated. Families are often dealing with grief and practical matters at once, so organizing records early reduces the burden later.',
      whatToTrack: [
        'Death certificate and coroner or autopsy report',
        'Police, accident or incident reports',
        'Medical records from any treatment before death',
        'Earnings, tax and benefits records',
        'Funeral and burial costs',
      ],
      howClearCaseHelps: `ClearCaseIQ groups the evidence by what it proves, so the family can see what is in hand and what still needs requesting. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Is an autopsy necessary?', a: 'Not always, but it can be important where the cause of death is disputed.' },
      { q: 'Does a criminal conviction prove the civil case?', a: 'It can help significantly, but a civil case can succeed without one; the standard of proof is lower.' },
      { q: 'How is the relationship proven?', a: 'Through photographs, messages, family accounts and evidence of the time and care the person gave.' },
    ],
    caseType: 'wrongful_death',
    caseSection: 'evidence',
    nextStep: {
      lead: 'The evidence of loss feeds directly into',
      anchor: 'what a wrongful death case may be worth in California',
      to: '/how-much-is-a-wrongful-death-case-worth-in-california',
    },
  },
  {
    slug: '/wrongful-death-after-a-car-accident-california',
    category: 'Claim Types',
    cluster: 'Fatal Car Accident Claims',
    title: 'Wrongful Death After a Car Accident in California',
    eyebrow: 'Fatal crash guide',
    description:
      'When a crash is fatal, the family’s claim runs against the at-fault driver and anyone else responsible, and is usually paid from auto insurance. Policy limits, and the deceased’s own uninsured motorist coverage, often set the ceiling.',
    psychology: 'We lost someone in a crash and need to understand our options.',
    cta: 'Review the Claim',
    exampleQueries: [
      'wrongful death car accident California',
      'fatal car accident claim family',
      'wrongful death insurance policy limits',
    ],
    signals: ['At-fault driver', 'Employer liability', 'Policy limits', 'Uninsured motorist coverage', 'Criminal case'],
    sections: {
      whyItMatters:
        'Fatal crashes are the most common source of wrongful death claims. Fault is established the same way as in an injury case, through reports, witnesses, video, vehicle data and reconstruction, and where the driver was impaired or reckless a criminal case may run alongside. A conviction helps, but the civil claim does not depend on it. Other defendants may be responsible too: an employer whose driver was working, the owner of the vehicle in some situations, a bar that served an obviously intoxicated minor, or a public entity responsible for a dangerous road, which requires a written claim within six months. Insurance usually sets the practical ceiling. The at-fault driver’s bodily injury coverage has a per-person limit, and the heirs’ wrongful death claims generally share that one limit, which can be modest compared with the loss. The deceased’s own uninsured or underinsured motorist coverage, and sometimes a household member’s, can add to it. Identifying every policy and defendant early is often what decides how much of the family’s loss can actually be recovered.',
      whatToTrack: [
        'The collision report and any criminal case number',
        'The at-fault driver’s insurer and limits',
        'Whether the driver was working at the time',
        'The deceased’s own auto policy and UM coverage',
        'Any public road or signal issue involved',
      ],
      howClearCaseHelps: `ClearCaseIQ maps the defendants and insurance policies that may apply, so the family understands what can be recovered and from whom. ${NOT_ADVICE}`,
    },
    faqs: [
      { q: 'Do we have to wait for the criminal case?', a: 'No. The civil claim can proceed on its own, though the criminal case can provide useful evidence.' },
      { q: 'What if the driver had minimum insurance?', a: 'The deceased’s own underinsured motorist coverage, and any other responsible party, may add to what is available.' },
      { q: 'Is there a different deadline for a government road claim?', a: 'Yes. Claims against public entities usually require a written claim within six months.' },
    ],
    caseType: 'wrongful_death',
    caseSection: 'liability',
    nextStep: {
      lead: 'The family’s losses, and the separate survival claim, are explained in',
      anchor: 'what a wrongful death case may be worth in California',
      to: '/how-much-is-a-wrongful-death-case-worth-in-california',
    },
  },
]

/**
 * Drafts awaiting review. Pages here serve `noindex` and stay out of the
 * sitemap; the hubs may link to them in the meantime.
 */
export const CASE_TYPE_DRAFT_SLUGS = new Set(
  caseTypeDraftPages.filter((page) => page.noindex).map((page) => page.slug)
)
