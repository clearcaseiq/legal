import type { LandingPage, LandingPageCategory } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

type ConversionSeed = {
  slug: string
  category: LandingPageCategory
  cluster: string
  title: string
  eyebrow: string
  description: string
  psychology: string
  cta: string
  queries: string[]
  signals: string[]
  track: string[]
  why: string
  help: string
  faqs: Array<{ q: string; a: string }>
  scenario: string
  timeline: Array<[string, string]>
  severity: Array<[string, string]>
  treatment: Array<{ label: string; copy: string }>
  drivers: string[]
  valueDetails: Array<{ label: string; copy: string }>
  insuranceProblems: string[]
  intake: Array<{ label: string; question: string }>
}

const toLandingPage = (seed: ConversionSeed): LandingPage => ({
  slug: seed.slug,
  category: seed.category,
  cluster: seed.cluster,
  title: seed.title,
  eyebrow: seed.eyebrow,
  description: seed.description,
  psychology: seed.psychology,
  cta: seed.cta,
  exampleQueries: seed.queries,
  signals: seed.signals,
  sections: {
    whyItMatters: seed.why,
    whatToTrack: seed.track,
    howClearCaseHelps: seed.help,
  },
  faqs: seed.faqs,
})

const toTopicContent = (seed: ConversionSeed): TopicContent => ({
  scenario: seed.scenario,
  timeline: seed.timeline,
  severityLadder: seed.severity,
  treatmentProgression: seed.treatment,
  settlementDrivers: seed.drivers,
  settlementValueDetails: seed.valueDetails,
  insuranceProblems: seed.insuranceProblems,
  intakeSteps: seed.intake,
})

const caseWorthRows = [
  ['/how-much-is-my-case-worth', 'How Much Is My Case Worth?', 'General Case Value', 'injury severity, liability, medical bills, wage loss, treatment status, insurance coverage, and missing documents', ['Injury severity', 'Medical bills', 'Liability strength', 'Wage loss', 'Policy limits', 'Treatment status']],
  ['/how-much-is-a-car-accident-case-worth', 'How Much Is a Car Accident Case Worth?', 'Car Accident Case Value', 'crash facts, fault, treatment, medical bills, vehicle damage, wage loss, and available insurance', ['Crash type', 'Fault evidence', 'Medical treatment', 'Vehicle damage', 'Wage loss', 'Insurance limits']],
  ['/how-much-is-a-whiplash-case-worth', 'How Much Is a Whiplash Case Worth?', 'Whiplash Case Value', 'neck pain duration, headaches, therapy, imaging, low-offer pressure, liability, and medical bills', ['Neck symptoms', 'Headaches', 'PT or chiropractic care', 'Treatment duration', 'Low offer', 'Rear-end liability']],
  ['/how-much-is-a-herniated-disc-case-worth', 'How Much Is a Herniated Disc Case Worth?', 'Herniated Disc Case Value', 'MRI findings, radiculopathy, injections, surgery risk, prior spine history, liability, and insurance limits', ['MRI herniation', 'Radiculopathy', 'Epidural injections', 'Surgery risk', 'Prior history', 'Policy limits']],
  ['/how-much-is-a-tbi-case-worth', 'How Much Is a TBI Case Worth?', 'TBI Case Value', 'cognitive symptoms, neurology care, work impact, duration, functional proof, liability, and coverage', ['Cognitive symptoms', 'Neurology care', 'Work impact', 'Symptom duration', 'Functional proof', 'Coverage']],
  ['/how-much-is-a-back-surgery-case-worth', 'How Much Is a Back Surgery Case Worth?', 'Back Surgery Case Value', 'procedure type, future medical costs, failed conservative care, wage loss, permanent restrictions, and coverage', ['Surgery recommendation', 'Future medical', 'Failed conservative care', 'Wage loss', 'Permanent restrictions', 'Policy limits']],
  ['/how-much-is-a-motorcycle-accident-case-worth', 'How Much Is a Motorcycle Accident Case Worth?', 'Motorcycle Accident Case Value', 'rider injuries, fractures, road rash, liability disputes, helmet facts, medical bills, and policy limits', ['Motorcycle crash', 'Fractures', 'Road rash', 'Helmet facts', 'Liability dispute', 'Policy limits']],
  ['/how-much-is-a-pedestrian-accident-case-worth', 'How Much Is a Pedestrian Accident Case Worth?', 'Pedestrian Accident Case Value', 'vehicle impact, crosswalk facts, serious injuries, medical bills, long recovery, liability, and coverage', ['Pedestrian impact', 'Crosswalk facts', 'Fractures or TBI', 'Medical bills', 'Long recovery', 'Liability evidence']],
] as const

const caseWorthPages: ConversionSeed[] = caseWorthRows.map(([slug, title, cluster, focus, signals]) => ({
  slug,
  category: 'Settlement',
  cluster,
  title,
  eyebrow: 'Case value guide',
  description: `${title} Case value depends on ${focus}. This page explains the inputs that move a preliminary settlement estimate and links directly into ClearCaseIQ's settlement calculator workflow.`,
  psychology: 'I need a realistic estimate before I decide what to do.',
  cta: 'Open Settlement Calculator',
  queries: [title.toLowerCase(), 'case value calculator', 'how much is my accident case worth', `${cluster.toLowerCase()} calculator`],
  signals: [...signals],
  track: ['Accident date, location, claim type, and liability evidence', 'Diagnosis, symptom duration, treatment, records, and bills', 'Wage loss, out-of-pocket costs, liens, and future care', 'Insurance carrier, policy limits, UM/UIM, commercial coverage, and offers', 'Prior injuries, treatment gaps, comparative fault, and missing documents'],
  why: 'Case value is not a single average. The practical range changes as medical proof, liability, venue, coverage, and damages become clearer. A calculator is most useful when it asks for the facts that insurers and attorneys actually review.',
  help: 'ClearCaseIQ turns case-worth questions into structured calculator inputs, identifies value drivers, and flags missing facts that can change confidence.',
  faqs: [
    { q: 'Can ClearCaseIQ tell me exactly what my case is worth?', a: 'No tool can guarantee a result. ClearCaseIQ provides an educational estimate based on the facts and documents entered.' },
    { q: 'What information improves the estimate?', a: 'Medical records, bills, diagnosis, treatment plan, wage loss proof, liability evidence, and policy-limit information improve confidence.' },
    { q: 'Why do case values vary so much?', a: 'Liability, causation, injury severity, treatment, venue, liens, coverage, and missing documents can all change value.' },
  ],
  scenario: 'A claimant started with only an injury description and rough crash facts. The estimate became more useful after medical bills, MRI records, wage loss, police report, photos, and insurance-limit information were added.',
  timeline: [['Initial estimate', 'Basic crash, injury, and treatment facts create an early range.'], ['Records added', 'Medical bills, imaging, wage loss, and liability evidence improve confidence.'], ['Risk adjustment', 'Comparative fault, prior history, treatment gaps, and policy limits adjust the range.'], ['Next steps', 'The report explains missing information and whether attorney review may be useful.']],
  severity: [['Low value', 'Minor symptoms, short care, low bills, and clear recovery.'], ['Moderate value', 'Ongoing treatment, documented limitations, and moderate bills.'], ['High value', 'Imaging, injections, surgery risk, TBI, wage loss, or disputes.'], ['Very high value', 'Major surgery, permanent impairment, catastrophic injury, commercial coverage, or major economic loss.']],
  treatment: [{ label: 'Injury proof', copy: 'Diagnosis and treatment define medical severity.' }, { label: 'Economic proof', copy: 'Bills, liens, wage loss, and future care define damages.' }, { label: 'Liability proof', copy: 'Fault evidence affects leverage and comparative fault.' }, { label: 'Coverage proof', copy: 'Policy limits determine practical collectability.' }],
  drivers: [...signals],
  valueDetails: [{ label: 'Medical severity', copy: 'More serious documented injuries usually support higher ranges.' }, { label: 'Liability', copy: 'Clear fault improves settlement posture.' }, { label: 'Coverage', copy: 'Available insurance can cap or expand practical recovery.' }],
  insuranceProblems: ['The insurer makes an early offer before treatment ends.', 'Policy limits are unknown.', 'Treatment gaps or prior injuries reduce confidence.', 'Liability or causation is disputed.'],
  intake: [{ label: 'Step 1', question: 'What injury and treatment facts are known?' }, { label: 'Step 2', question: 'What bills, liens, wage loss, or future care exist?' }, { label: 'Step 3', question: 'What evidence proves fault?' }, { label: 'Step 4', question: 'What insurance limits, offers, or denials are known?' }],
}))

const averageRows = [
  ['/average-car-accident-settlement-california', 'Average Car Accident Settlement in California', 'California Car Accident Averages', 'injury severity, treatment, bills, fault, venue, policy limits, and whether the case is minor, moderate, serious, or catastrophic', ['California venue', 'Medical bills', 'Fault evidence', 'Treatment duration', 'Policy limits', 'Wage loss']],
  ['/average-whiplash-settlement-california', 'Average Whiplash Settlement in California', 'California Whiplash Averages', 'neck pain duration, therapy, headaches, medical bills, vehicle damage, soft-tissue defenses, and low-offer timing', ['Whiplash symptoms', 'Therapy duration', 'Headaches', 'Medical bills', 'Low offer', 'Rear-end liability']],
  ['/average-herniated-disc-settlement-california', 'Average Herniated Disc Settlement in California', 'California Herniated Disc Averages', 'MRI findings, radiculopathy, injections, surgery risk, prior spine history, bills, venue, and coverage', ['MRI findings', 'Radiculopathy', 'Injections', 'Prior spine history', 'Surgery risk', 'Policy limits']],
  ['/average-tbi-settlement-california', 'Average TBI Settlement in California', 'California TBI Averages', 'cognitive symptoms, duration, neurology treatment, work disruption, functional proof, liability, and insurance coverage', ['TBI symptoms', 'Neurology care', 'Work disruption', 'Duration', 'Functional proof', 'Coverage']],
  ['/average-back-surgery-settlement-california', 'Average Back Surgery Settlement in California', 'California Back Surgery Averages', 'procedure type, surgical bills, future care, failed conservative treatment, permanent restrictions, and policy limits', ['Back surgery', 'Future medical', 'Surgical bills', 'Permanent restrictions', 'Wage loss', 'Policy limits']],
  ['/average-motorcycle-settlement-california', 'Average Motorcycle Accident Settlement in California', 'California Motorcycle Accident Averages', 'fractures, road rash, hospitalization, rider-bias disputes, liability evidence, medical bills, and insurance limits', ['Motorcycle crash', 'Fractures', 'Road rash', 'Hospital care', 'Liability dispute', 'Coverage']],
] as const

const averagePages: ConversionSeed[] = averageRows.map(([slug, title, cluster, focus, signals]) => ({
  slug,
  category: 'Settlement',
  cluster,
  title,
  eyebrow: 'Average settlement guide',
  description: `${title} is searched often, but averages can be misleading. California settlement value depends on ${focus}. This page explains how to use averages carefully and when to use a case-specific calculator instead.`,
  psychology: 'I want a benchmark, but I need something specific.',
  cta: 'Calculate My Settlement Range',
  queries: [title.toLowerCase(), 'average accident settlement California', `${cluster.toLowerCase()} value`, 'California settlement calculator'],
  signals: [...signals],
  track: ['Injury diagnosis, treatment duration, records, and bills', 'California county, crash type, liability evidence, and comparative fault', 'Wage loss, future care, liens, and out-of-pocket costs', 'Policy limits, UM/UIM, commercial coverage, and settlement offers', 'Prior injuries, treatment gaps, and insurer disputes'],
  why: 'Average settlement searches are useful for orientation but risky for decision-making. Averages combine minor claims, serious claims, policy-limit claims, disputed claims, and catastrophic cases that do not resemble each other.',
  help: 'ClearCaseIQ replaces generic averages with a fact-specific estimate that weighs medical proof, liability, California venue, damages, and coverage.',
  faqs: [
    { q: 'Are average settlement numbers reliable?', a: 'They are usually too broad to rely on for a specific claim because injury severity, coverage, and liability vary widely.' },
    { q: 'Why can two California cases settle for different amounts?', a: 'Treatment, venue, comparative fault, policy limits, liens, prior history, and future care can produce very different outcomes.' },
    { q: 'What should I use instead of an average?', a: 'Use a fact-specific calculator and upload records, bills, liability evidence, and insurance information when available.' },
  ],
  scenario: 'A California claimant searched for average settlement numbers and found conflicting ranges. The estimate became clearer after the file was separated into injury severity, treatment, bills, liability, venue, and coverage.',
  timeline: [['Average search', 'Generic ranges create a rough benchmark.'], ['Fact collection', 'Medical and liability facts identify the right severity band.'], ['Coverage review', 'Policy limits and liens affect practical recovery.'], ['Calculator estimate', 'A case-specific range replaces broad averages.']],
  severity: [['Minor', 'Short treatment, low bills, and quick recovery.'], ['Moderate', 'Ongoing therapy and documented limitations.'], ['Serious', 'Imaging, injections, surgery risk, TBI, or wage loss.'], ['Catastrophic', 'Permanent impairment, major surgery, death, or long-term care.']],
  treatment: [{ label: 'Medical band', copy: 'Diagnosis and treatment place the claim into a severity category.' }, { label: 'Economic band', copy: 'Bills, liens, wage loss, and future care define damages.' }, { label: 'Liability band', copy: 'Fault and comparative negligence affect value.' }, { label: 'Coverage band', copy: 'Available insurance shapes practical settlement.' }],
  drivers: [...signals],
  valueDetails: [{ label: 'Averages hide extremes', copy: 'Minor and catastrophic claims should not be averaged together.' }, { label: 'California venue', copy: 'County and liability facts can affect posture.' }, { label: 'Policy limits', copy: 'Coverage may matter more than theoretical value.' }],
  insuranceProblems: ['Averages lead to unrealistic expectations.', 'The insurer uses low examples to anchor negotiations.', 'Treatment is incomplete when value is estimated.', 'Policy limits or liens are unknown.'],
  intake: [{ label: 'Step 1', question: 'Which severity band best matches your injury?' }, { label: 'Step 2', question: 'What are the bills, liens, and future care?' }, { label: 'Step 3', question: 'Is liability clear or disputed?' }, { label: 'Step 4', question: 'What insurance coverage is available?' }],
}))

const attorneyRows = [
  ['/when-to-hire-a-lawyer-after-accident', 'When to Hire a Lawyer After an Accident', 'Attorney Hiring Timing', 'serious injuries, disputed fault, low offers, commercial coverage, liens, minors, surgery, and approaching deadlines'],
  ['/do-i-need-a-lawyer-after-a-car-accident', 'Do I Need a Lawyer After a Car Accident?', 'Lawyer Need After Car Accident', 'injury seriousness, liability disputes, treatment status, insurance behavior, bills, wage loss, and settlement offers'],
  ['/how-much-do-personal-injury-lawyers-charge', 'How Much Do Personal Injury Lawyers Charge?', 'Personal Injury Lawyer Fees', 'contingency fees, case costs, fee percentages, litigation expenses, liens, and net settlement'],
  ['/how-much-do-lawyers-take-from-settlement', 'How Much Do Lawyers Take From a Settlement?', 'Lawyer Settlement Fee Guide', 'attorney fees, costs, liens, medical bills, gross versus net settlement, and fee agreements'],
  ['/can-i-switch-lawyers-during-my-case', 'Can I Switch Lawyers During My Case?', 'Switching Personal Injury Lawyers', 'fee liens, substitution, case file transfer, communication issues, settlement posture, and deadlines'],
] as const

const attorneyPages: ConversionSeed[] = attorneyRows.map(([slug, title, cluster, focus]) => ({
  slug,
  category: 'Attorney Intent',
  cluster,
  title,
  eyebrow: 'Attorney decision guide',
  description: `${title} This page explains ${focus}, and how ClearCaseIQ can help organize the facts that determine whether attorney review may be appropriate.`,
  psychology: 'I need to know whether attorney help makes sense.',
  cta: 'Will an Attorney Take My Case?',
  queries: [title.toLowerCase(), 'personal injury lawyer after accident', 'attorney fees personal injury', 'lawyer settlement fee'],
  signals: ['Attorney readiness', 'Serious injury', 'Disputed fault', 'Low offer', 'Fees and liens', 'Deadline risk'],
  track: ['Injury diagnosis, treatment, bills, future care, and wage loss', 'Liability disputes, police report, photos, witnesses, and insurance positions', 'Offers, denials, adjuster pressure, and release documents', 'Attorney fee agreement, case costs, liens, and net recovery questions', 'Deadlines, minors, commercial coverage, or complex case issues'],
  why: 'Attorney hiring decisions should be tied to case complexity and economic stakes. Serious injuries, disputed liability, low offers, liens, commercial coverage, and deadlines usually justify deeper review than minor resolved claims.',
  help: 'ClearCaseIQ produces an organized case-readiness report that can help identify whether the facts look attorney-reviewable.',
  faqs: [
    { q: 'Do I always need a lawyer after an accident?', a: 'Not always. Minor resolved claims may be handled without one, but serious injuries, disputes, low offers, and deadlines often justify review.' },
    { q: 'How do personal injury attorney fees usually work?', a: 'Many work on contingency, but percentages, costs, and liens vary by agreement and case.' },
    { q: 'Can ClearCaseIQ give legal advice?', a: 'No. ClearCaseIQ is not a law firm. It helps organize facts for education and possible attorney review.' },
  ],
  scenario: 'A claimant had ongoing treatment, a low insurance offer, and unclear medical bills. After organizing records, liability evidence, bills, and insurance communications, it became clearer whether attorney review was worth pursuing.',
  timeline: [['Early claim', 'Injury, liability, and insurance facts are still developing.'], ['Complexity appears', 'Treatment, bills, disputes, or low offers create risk.'], ['Readiness review', 'Documents and economics show whether attorney review may help.'], ['Decision point', 'The claimant compares self-handling versus attorney involvement.']],
  severity: [['Low need', 'Minor injury, clear liability, complete treatment, and fair offer.'], ['Possible need', 'Ongoing treatment, unclear bills, or moderate offer.'], ['Strong need', 'Serious injury, disputed fault, low offer, liens, or commercial coverage.'], ['Urgent', 'Surgery, catastrophic injury, minor, wrongful death, or approaching deadline.']],
  treatment: [{ label: 'Case facts', copy: 'Injury, treatment, and liability determine complexity.' }, { label: 'Economic facts', copy: 'Bills, liens, wage loss, and costs determine stakes.' }, { label: 'Insurance posture', copy: 'Offers and denials reveal friction.' }, { label: 'Attorney readiness', copy: 'A clean summary helps triage.' }],
  drivers: ['Injury severity', 'Disputed fault', 'Low offer', 'Medical liens', 'Commercial coverage', 'Deadline risk'],
  valueDetails: [{ label: 'Complexity', copy: 'Attorney need rises with disputes and serious damages.' }, { label: 'Net recovery', copy: 'Fees, costs, and liens affect what the claimant keeps.' }, { label: 'Timing', copy: 'Delays can matter when deadlines or evidence risks exist.' }],
  insuranceProblems: ['The adjuster pressures for a quick release.', 'A low offer arrives before treatment is complete.', 'Fault or causation is disputed.', 'Medical liens or bills are unclear.'],
  intake: [{ label: 'Step 1', question: 'How serious are the injuries and treatment?' }, { label: 'Step 2', question: 'Is fault, causation, or coverage disputed?' }, { label: 'Step 3', question: 'Are there offers, liens, or unpaid bills?' }, { label: 'Step 4', question: 'Are deadlines or complex parties involved?' }],
}))

const caseStrengthRows = [
  ['/case-strength/rear-end-accident', 'Rear-End Accident Case Strength', 'Rear-End Case Strength', 'rear-end liability, property damage, treatment, comparative fault, policy limits, and insurer soft-tissue defenses'],
  ['/case-strength/red-light-accident', 'Red Light Accident Case Strength', 'Red Light Case Strength', 'signal evidence, citations, witnesses, intersection video, T-bone impact, injuries, and comparative fault'],
  ['/case-strength-hit-and-run', 'Hit-and-Run Case Strength', 'Hit-and-Run Case Strength', 'police reporting, unknown driver evidence, UM/UIM coverage, injury severity, deadlines, and documentation'],
  ['/case-strength-uninsured-driver', 'Uninsured Driver Case Strength', 'Uninsured Driver Case Strength', 'liability proof, UM/UIM coverage, policy notice, medical damages, uninsured status, and claim deadlines'],
  ['/case-strength-commercial-truck', 'Commercial Truck Case Strength', 'Commercial Truck Case Strength', 'commercial coverage, company responsibility, serious injuries, evidence preservation, driver logs, and policy layers'],
  ['/case-strength-rideshare-accident', 'Rideshare Accident Case Strength', 'Rideshare Case Strength', 'app status, trip phase, passenger role, coverage layers, liability evidence, and medical severity'],
  ['/case-strength-motorcycle-accident', 'Motorcycle Accident Case Strength', 'Motorcycle Case Strength', 'rider injury severity, liability bias, helmet facts, photos, witnesses, medical bills, and coverage'],
  ['/case-strength-pedestrian-accident', 'Pedestrian Accident Case Strength', 'Pedestrian Case Strength', 'crosswalk facts, visibility, impact severity, serious injuries, liability, medical bills, and policy limits'],
] as const

const caseStrengthPages: ConversionSeed[] = caseStrengthRows.map(([slug, title, cluster, focus]) => ({
  slug,
  category: 'Attorney Intent',
  cluster,
  title,
  eyebrow: 'Attorney-fit underwriting guide',
  description: `${title} depends on ${focus}. This page is built around the key question: will an attorney take my case?`,
  psychology: 'I want to know if my case is strong enough.',
  cta: 'Will an Attorney Take My Case?',
  queries: [title.toLowerCase(), 'will a lawyer take my case', 'is my accident case strong', 'case strength calculator'],
  signals: ['Liability strength', 'Injury severity', 'Insurance coverage', 'Treatment proof', 'Economic damages', 'Attorney-fit score'],
  track: ['Accident facts, police report, photos, witnesses, citations, and video', 'Injuries, diagnosis, ER, PT, imaging, injections, surgery, and future care', 'Medical bills, wage loss, out-of-pocket costs, and liens', 'Insurance limits, UM/UIM, commercial coverage, offers, and denials', 'Comparative fault, prior injuries, treatment gaps, and deadline risks'],
  why: 'Attorney case selection is practical. Strong liability is not enough without damages, and serious damages can still be difficult if fault, causation, or coverage is weak. Case-strength pages help sort those variables.',
  help: 'ClearCaseIQ captures the facts an attorney triage team needs: liability, damages, coverage, documents, urgency, and risk factors.',
  faqs: [
    { q: 'Will an attorney take my case?', a: 'It depends on liability, injury severity, damages, coverage, deadlines, documents, and whether the expected recovery justifies the work.' },
    { q: 'What makes a case stronger?', a: 'Clear fault, serious documented injury, consistent treatment, available insurance, economic damages, and organized documents help.' },
    { q: 'What makes attorneys decline cases?', a: 'Low damages, weak liability, no coverage, missed deadlines, causation problems, and missing documentation can reduce fit.' },
  ],
  scenario: 'A claimant wanted to know if an attorney would take the case. The answer became clearer after liability evidence, treatment records, bills, insurance information, and risk factors were organized into a single report.',
  timeline: [['Facts collected', 'Accident type, evidence, and injury facts are entered.'], ['Strength scoring', 'Liability, damages, coverage, and documents are weighed.'], ['Risk review', 'Comparative fault, gaps, prior injuries, and deadlines are flagged.'], ['Attorney fit', 'The report identifies whether the file appears reviewable.']],
  severity: [['Weak fit', 'Minor injury, low bills, weak fault, or no coverage.'], ['Developing fit', 'Some treatment and evidence but missing key facts.'], ['Strong fit', 'Clear liability, documented injury, bills, and coverage.'], ['Urgent fit', 'Severe injury, commercial coverage, surgery, TBI, minor, death, or deadline issue.']],
  treatment: [{ label: 'Liability', copy: 'Evidence determines whether fault can be shown.' }, { label: 'Damages', copy: 'Treatment, bills, and wage loss determine economic stakes.' }, { label: 'Coverage', copy: 'Insurance affects collectability.' }, { label: 'Risk flags', copy: 'Gaps, prior history, and deadlines shape fit.' }],
  drivers: ['Clear liability', 'Serious injury', 'Medical bills', 'Policy limits', 'Low offer or denial', 'Deadline urgency'],
  valueDetails: [{ label: 'Attorney economics', copy: 'The case must justify the time, cost, and risk.' }, { label: 'Coverage', copy: 'Available insurance matters for collectability.' }, { label: 'Documents', copy: 'Organized records improve triage speed.' }],
  insuranceProblems: ['Liability is disputed.', 'Policy limits are unknown.', 'Treatment is incomplete.', 'The insurer argues comparative fault or causation.'],
  intake: [{ label: 'Step 1', question: 'What evidence proves fault?' }, { label: 'Step 2', question: 'How serious are the injuries and treatment?' }, { label: 'Step 3', question: 'What bills, wage loss, and coverage exist?' }, { label: 'Step 4', question: 'What risks could make the case harder?' }],
}))

const statuteRows = [
  ['/california-statute-of-limitations-car-accident', 'California Statute of Limitations for Car Accidents', 'California Car Accident Deadlines', 'accident date, injury claim deadline, government claims, minors, delayed discovery, and urgent attorney review'],
  ['/california-statute-of-limitations-personal-injury', 'California Statute of Limitations for Personal Injury', 'California Personal Injury Deadlines', 'injury date, claim type, government defendants, minors, tolling, evidence preservation, and deadline urgency'],
  ['/california-statute-of-limitations-wrongful-death', 'California Statute of Limitations for Wrongful Death', 'California Wrongful Death Deadlines', 'date of death, eligible claimants, government entities, estate issues, damages, and urgent review'],
  ['/missed-the-statute-of-limitations', 'Missed the Statute of Limitations', 'Missed Deadline Review', 'possible missed deadlines, tolling questions, government claim issues, minors, delayed discovery, and urgent next steps'],
] as const

const statutePages: ConversionSeed[] = statuteRows.map(([slug, title, cluster, focus]) => ({
  slug,
  category: 'Attorney Intent',
  cluster,
  title,
  eyebrow: 'Deadline urgency guide',
  description: `${title} involves ${focus}. This page is educational, not legal advice, but it explains why accident dates, claim type, defendants, and exceptions must be reviewed quickly.`,
  psychology: 'I am worried about a deadline.',
  cta: 'Check My Deadline Risk',
  queries: [title.toLowerCase(), 'California accident deadline', 'personal injury statute of limitations California', 'missed accident deadline'],
  signals: ['Accident date', 'Claim type', 'Government defendant', 'Minor or death claim', 'Tolling issue', 'Urgency'],
  track: ['Exact accident date or date of death', 'Claim type and injury details', 'Whether any government entity, public road, bus, police, or public employee is involved', 'Minor, incapacity, delayed discovery, or other tolling facts', 'Insurance communications, offers, denials, and any filed paperwork'],
  why: 'Deadline pages are high urgency because waiting can affect rights. Different rules may apply depending on claim type, defendant, age, government involvement, death claims, and possible exceptions.',
  help: 'ClearCaseIQ captures date, location, claim type, government involvement, and urgency flags so the report can highlight deadline risk and recommend prompt review.',
  faqs: [
    { q: 'Is this legal advice about my deadline?', a: 'No. Deadline rules are fact-specific. This page is educational and should not replace attorney advice.' },
    { q: 'Why does government involvement matter?', a: 'Claims involving public entities may have shorter notice requirements than ordinary personal injury lawsuits.' },
    { q: 'What should I do if a deadline may be close?', a: 'Gather dates, documents, insurance letters, and defendant information, then seek prompt legal review.' },
  ],
  scenario: 'A claimant waited because insurance was still discussing settlement. The deadline risk became urgent after the accident date, claim type, county, possible government involvement, and medical timeline were reviewed together.',
  timeline: [['Incident date', 'The accident date or date of death starts the deadline analysis.'], ['Claim investigation', 'Defendants, government involvement, minors, and claim type are identified.'], ['Insurance discussions', 'Negotiations do not necessarily stop legal deadlines.'], ['Urgent review', 'Close or missed deadlines require prompt attorney-specific review.']],
  severity: [['Low urgency', 'Recent accident and no unusual defendant issues.'], ['Moderate urgency', 'Several months have passed or facts are unclear.'], ['High urgency', 'Government entity, minor, death claim, or approaching deadline.'], ['Critical', 'Deadline may have passed or paperwork may be missing.']],
  treatment: [{ label: 'Date capture', copy: 'Exact incident dates anchor the analysis.' }, { label: 'Party review', copy: 'Defendants and public entities affect rules.' }, { label: 'Claim type', copy: 'Personal injury, car accident, and wrongful death may differ.' }, { label: 'Urgency flag', copy: 'The report highlights deadline risk for review.' }],
  drivers: ['Incident date', 'Claim type', 'Government involvement', 'Minor or incapacity', 'Wrongful death facts', 'Insurance delay'],
  valueDetails: [{ label: 'Deadlines affect rights', copy: 'Missing a deadline can threaten the claim.' }, { label: 'Exceptions are fact-specific', copy: 'Tolling or delayed discovery needs legal review.' }, { label: 'Insurance talks are not enough', copy: 'Negotiation does not always preserve legal rights.' }],
  insuranceProblems: ['The insurer keeps negotiating while time passes.', 'Government involvement is not recognized early.', 'The claimant assumes an offer extends the deadline.', 'Key dates or defendants are unclear.'],
  intake: [{ label: 'Step 1', question: 'What is the exact accident or death date?' }, { label: 'Step 2', question: 'What type of claim is involved?' }, { label: 'Step 3', question: 'Could a government entity or minor be involved?' }, { label: 'Step 4', question: 'Has any deadline, denial, or legal filing been mentioned?' }],
}))

const conversionSeeds = [
  ...caseWorthPages,
  ...averagePages,
  ...attorneyPages,
  ...caseStrengthPages,
  ...statutePages,
]

export const conversionLandingPages: LandingPage[] = conversionSeeds.map(toLandingPage)

export const conversionTopicContentBySlug = Object.fromEntries(
  conversionSeeds.map((seed) => [seed.slug, toTopicContent(seed)])
) as Record<string, TopicContent>
