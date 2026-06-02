import type { LandingPage, LandingPageCategory } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

type ExpansionSeed = {
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

const toLandingPage = (seed: ExpansionSeed): LandingPage => ({
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

const toTopicContent = (seed: ExpansionSeed): TopicContent => ({
  scenario: seed.scenario,
  timeline: seed.timeline,
  severityLadder: seed.severity,
  treatmentProgression: seed.treatment,
  settlementDrivers: seed.drivers,
  settlementValueDetails: seed.valueDetails,
  insuranceProblems: seed.insuranceProblems,
  intakeSteps: seed.intake,
})

const accidentTypeRows = [
  ['t-bone-accident', 'T-Bone Accident Injury Claims', 'T-Bone Accidents', 'side-impact force, intersection evidence, red-light or stop-sign disputes, door intrusion, passenger injuries, and orthopedic or head trauma', ['Side impact', 'Intersection evidence', 'Red-light dispute', 'Door intrusion', 'Passenger injury', 'TBI or fracture risk']],
  ['rollover-accident', 'Rollover Accident Injury Claims', 'Rollover Accidents', 'high-force crashes, roof crush, ejection risk, seatbelt evidence, spinal injury, fractures, and complex liability', ['Rollover crash', 'Roof crush', 'Ejection risk', 'Seatbelt facts', 'Spine injury', 'Severe trauma']],
  ['multi-vehicle-accident', 'Multi-Vehicle Accident Injury Claims', 'Multi-Vehicle Accidents', 'chain-reaction impacts, multiple insurers, disputed fault, police diagrams, passenger claims, and layered coverage', ['Multiple vehicles', 'Chain reaction', 'Police diagram', 'Multiple insurers', 'Comparative fault', 'Coverage layers']],
  ['intersection-accident', 'Intersection Accident Injury Claims', 'Intersection Accidents', 'signal timing, right of way, turn lanes, witnesses, traffic cameras, T-bone impacts, and comparative fault', ['Intersection layout', 'Signal timing', 'Right of way', 'Witnesses', 'Traffic camera', 'Comparative fault']],
  ['freeway-accident', 'Freeway Accident Injury Claims', 'Freeway Accidents', 'high-speed impacts, lane changes, rear-end crashes, multi-car collisions, commercial vehicles, and severe injury risk', ['Freeway crash', 'High-speed impact', 'Lane change', 'Multi-car impact', 'Commercial vehicle', 'Severe injury']],
  ['distracted-driver-accident', 'Distracted Driver Accident Claims', 'Distracted Driver Accidents', 'phone use, inattention, delayed braking, rear-end impacts, witness observations, and digital evidence', ['Distracted driving', 'Delayed braking', 'Phone use', 'Witness support', 'Rear-end impact', 'Digital evidence']],
  ['texting-while-driving-accident', 'Texting While Driving Accident Claims', 'Texting While Driving Accidents', 'phone distraction, records, admissions, police citations, rear-end or lane-departure crashes, and punitive conduct arguments', ['Texting allegation', 'Phone records', 'Citation', 'Admission', 'Lane departure', 'Rear-end impact']],
  ['wrong-way-driver-accident', 'Wrong-Way Driver Accident Claims', 'Wrong-Way Driver Accidents', 'head-on impact, intoxication risk, roadway signage, police investigation, catastrophic injury, and high-value review', ['Wrong-way driver', 'Head-on impact', 'DUI risk', 'Roadway signage', 'Police investigation', 'Catastrophic injury']],
  ['passenger-injury-accident', 'Passenger Injury Accident Claims', 'Passenger Injury Accidents', 'passenger rights, multiple liable drivers, rideshare or family-driver issues, medical bills, and coverage choices', ['Passenger injury', 'Multiple drivers', 'No fault as passenger', 'Coverage options', 'Medical bills', 'Rideshare facts']],
  ['construction-zone-accident', 'Construction Zone Accident Claims', 'Construction Zone Accidents', 'road work, lane closures, contractor responsibility, signage, government entities, commercial vehicles, and evidence preservation', ['Construction zone', 'Lane closure', 'Contractor facts', 'Warning signs', 'Government entity', 'Commercial coverage']],
] as const

const accidentTypePages: ExpansionSeed[] = accidentTypeRows.map(([slugPart, title, cluster, focus, signals]) => ({
  slug: `/commercial/${slugPart}`,
  category: 'Commercial',
  cluster,
  title,
  eyebrow: 'Accident type intake guide',
  description: `${title} often involve ${focus}. This page explains the intake facts, evidence, injury signals, insurance issues, and attorney-readiness factors that matter early.`,
  psychology: 'I need to know if this accident type changes my case.',
  cta: 'Review My Accident Type',
  queries: [title.toLowerCase(), `${slugPart.replace(/-/g, ' ')} settlement`, `${cluster.toLowerCase()} California`],
  signals: [...signals],
  track: ['Crash location, traffic controls, roadway layout, and police agency', 'Photos, video, witnesses, citations, vehicle damage, and statements', 'ER care, imaging, diagnosis, PT, injections, surgery, or future care', 'Insurance carriers, policy limits, UM/UIM, commercial policies, and denials', 'Wage loss, out-of-pocket costs, liens, and treatment gaps'],
  why: `${title} can change attorney intake because accident type affects liability proof, severity expectations, coverage layers, and evidence preservation. Early organization helps separate strong files from unclear claims.`,
  help: 'ClearCaseIQ captures accident-specific liability facts, injuries, treatment, economic damages, insurance coverage, and missing evidence in one report.',
  faqs: [
    { q: `Are ${title.toLowerCase()} different from ordinary car accident claims?`, a: 'They can be. Accident type can affect liability evidence, injury severity, available insurance, and attorney-review urgency.' },
    { q: 'What evidence matters most?', a: 'Police reports, photos, video, witnesses, citations, vehicle damage, medical records, bills, and insurance letters are usually important.' },
    { q: 'When should attorney review be considered?', a: 'Consider review for serious injuries, disputed fault, commercial coverage, multiple insurers, low offers, or deadline concerns.' },
  ],
  scenario: `A claimant involved in ${cluster.toLowerCase()} had injury symptoms, vehicle damage, insurance calls, and unclear liability. The case became easier to evaluate after crash evidence, medical records, bills, and coverage facts were organized.`,
  timeline: [['Scene facts', 'Crash type, road layout, photos, video, and witnesses are captured.'], ['Medical phase', 'ER, imaging, treatment, and diagnosis define injury severity.'], ['Insurance phase', 'Liability, coverage, and policy-limit facts are reviewed.'], ['Attorney readiness', 'Severity, evidence, and coverage determine whether deeper review is appropriate.']],
  severity: [['Developing', 'Moderate symptoms and incomplete evidence.'], ['Serious', 'Imaging, fractures, TBI, injections, or disputed liability.'], ['High value', 'Strong liability, serious injuries, and available coverage.'], ['Urgent', 'Catastrophic injury, commercial parties, government issues, or deadline risk.']],
  treatment: [{ label: 'Accident facts', copy: 'Crash type and scene evidence shape liability.' }, { label: 'Medical proof', copy: 'Treatment records and bills establish damages.' }, { label: 'Coverage review', copy: 'Commercial, UM/UIM, or multiple policies may matter.' }, { label: 'Risk flags', copy: 'Comparative fault, deadlines, and missing evidence affect fit.' }],
  drivers: [...signals],
  valueDetails: [{ label: 'Liability pattern', copy: 'Accident type often predicts the key proof needed.' }, { label: 'Severity', copy: 'High-force or vulnerable-road-user crashes often have higher injury stakes.' }, { label: 'Coverage', copy: 'Multiple or commercial policies can change practical recovery.' }],
  insuranceProblems: ['Fault is disputed.', 'Multiple insurers point at each other.', 'Evidence is missing or delayed.', 'Treatment or causation is challenged.'],
  intake: [{ label: 'Step 1', question: 'What accident type and location facts are known?' }, { label: 'Step 2', question: 'What evidence proves fault?' }, { label: 'Step 3', question: 'What injuries and treatment are documented?' }, { label: 'Step 4', question: 'What insurance or coverage issues exist?' }],
}))

const settlementRows = [
  ['t-bone-accident-settlement', 'T-Bone Accident Settlement Value', 'T-Bone Accident Settlements', 'side-impact severity, intersection liability, red-light evidence, passenger injuries, medical bills, and policy limits', ['Side-impact crash', 'Intersection liability', 'Red-light evidence', 'Passenger injury', 'Medical bills', 'Policy limits']],
  ['freeway-accident-settlement', 'Freeway Accident Settlement Value', 'Freeway Accident Settlements', 'high-speed impacts, multi-car liability, freeway reports, commercial vehicles, serious injuries, and coverage layers', ['Freeway crash', 'High-speed impact', 'Multi-car liability', 'Commercial vehicle', 'Serious injury', 'Coverage layers']],
  ['passenger-injury-settlement', 'Passenger Injury Settlement Value', 'Passenger Injury Settlements', 'passenger status, multiple liable drivers, rideshare or family driver issues, medical treatment, bills, and coverage options', ['Passenger status', 'Multiple drivers', 'Coverage options', 'Rideshare facts', 'Medical bills', 'No driver fault']],
  ['drunk-driver-settlement', 'Drunk Driver Settlement Value', 'Drunk Driver Settlements', 'DUI evidence, citations, arrests, punitive conduct, injury severity, medical bills, and insurance coverage', ['DUI evidence', 'Citation or arrest', 'Punitive facts', 'Police report', 'Serious injury', 'Coverage']],
  ['uninsured-driver-settlement', 'Uninsured Driver Settlement Value', 'Uninsured Driver Settlements', 'uninsured status, UM/UIM coverage, liability proof, medical damages, policy notice, and claim deadlines', ['Uninsured driver', 'UM/UIM coverage', 'Liability proof', 'Policy notice', 'Medical damages', 'Deadline risk']],
  ['construction-zone-settlement', 'Construction Zone Accident Settlement Value', 'Construction Zone Settlements', 'road work liability, contractors, public entities, warning signs, lane closures, serious injuries, and evidence preservation', ['Construction zone', 'Contractor facts', 'Government entity', 'Warning signs', 'Lane closure', 'Evidence preservation']],
] as const

const settlementPages: ExpansionSeed[] = settlementRows.map(([slugPart, title, cluster, focus, signals]) => ({
  slug: `/settlements/${slugPart}`,
  category: 'Settlement',
  cluster,
  title,
  eyebrow: 'Settlement value guide',
  description: `${title} depends on ${focus}. This page explains the settlement drivers, documentation, insurer defenses, and attorney-review signals that commonly matter.`,
  psychology: 'I want to know whether the settlement offer is fair.',
  cta: 'Estimate My Settlement',
  queries: [title.toLowerCase(), `${slugPart.replace(/-/g, ' ')}`, `${cluster.toLowerCase()} California`],
  signals: [...signals],
  track: ['Accident facts, police report, photos, video, witnesses, and citations', 'Medical diagnosis, treatment, bills, liens, future care, and wage loss', 'Liability disputes, comparative fault, commercial coverage, and UM/UIM', 'Insurance offers, denials, policy limits, and release documents', 'Prior injuries, treatment gaps, and deadline issues'],
  why: `${title} is fact-specific. Settlement value depends on injury severity, liability proof, treatment, economics, available coverage, and the defenses an insurer can raise.`,
  help: 'ClearCaseIQ structures settlement facts into value drivers, confidence factors, missing documents, and attorney-readiness signals.',
  faqs: [
    { q: `What affects ${title.toLowerCase()}?`, a: 'Injury severity, liability, treatment, bills, wage loss, policy limits, liens, and documentation are major factors.' },
    { q: 'Is there an average settlement?', a: 'Averages are usually misleading because facts and coverage vary widely.' },
    { q: 'What improves settlement confidence?', a: 'Records, bills, imaging, police reports, photos, witnesses, insurance letters, and policy-limit information improve confidence.' },
  ],
  scenario: `A claimant searched for ${title.toLowerCase()} after receiving an early offer. The estimate changed once treatment records, bills, liability evidence, and insurance coverage were organized.`,
  timeline: [['Early value', 'Basic crash and injury facts create an initial range.'], ['Documentation', 'Records, bills, photos, and reports improve confidence.'], ['Risk review', 'Fault disputes, gaps, prior history, and policy limits adjust value.'], ['Next step', 'Attorney review may be useful for serious injuries or low offers.']],
  severity: [['Lower', 'Short treatment, low bills, and clear recovery.'], ['Moderate', 'Ongoing care and documented limitations.'], ['High', 'Imaging, injections, fractures, TBI, surgery risk, or wage loss.'], ['Very high', 'Permanent impairment, catastrophic injury, commercial coverage, or major future care.']],
  treatment: [{ label: 'Medical proof', copy: 'Diagnosis and treatment anchor damages.' }, { label: 'Economic proof', copy: 'Bills, liens, wage loss, and future care define value.' }, { label: 'Liability proof', copy: 'Fault evidence affects leverage.' }, { label: 'Coverage proof', copy: 'Policy limits shape practical recovery.' }],
  drivers: [...signals],
  valueDetails: [{ label: 'Severity', copy: 'Objective injury proof generally supports higher value.' }, { label: 'Liability', copy: 'Clear fault improves negotiation posture.' }, { label: 'Coverage', copy: 'Available insurance can cap practical recovery.' }],
  insuranceProblems: ['The insurer makes a low early offer.', 'Fault or causation is disputed.', 'Policy limits are unclear or low.', 'Medical liens reduce net recovery.'],
  intake: [{ label: 'Step 1', question: 'What injury and treatment records exist?' }, { label: 'Step 2', question: 'What evidence proves fault?' }, { label: 'Step 3', question: 'What bills, wage loss, and liens exist?' }, { label: 'Step 4', question: 'What insurance limits or offers are known?' }],
}))

const cityRows = [
  ['long-beach-car-accident', 'Long Beach Car Accident Case Review', 'Long Beach Car Accident Claims', 'port traffic, freeway corridors, commercial vehicles, rideshare activity, pedestrian risk, and Los Angeles County venue'],
  ['anaheim-car-accident', 'Anaheim Car Accident Case Review', 'Anaheim Car Accident Claims', 'tourism traffic, freeway crashes, rideshare vehicles, pedestrian injuries, and Orange County venue'],
  ['irvine-car-accident', 'Irvine Car Accident Case Review', 'Irvine Car Accident Claims', 'commuter traffic, high medical costs, rideshare use, tech-worker wage loss, and Orange County venue'],
  ['riverside-car-accident', 'Riverside Car Accident Case Review', 'Riverside Car Accident Claims', 'Inland Empire commuter corridors, freeway crashes, trucking routes, and Riverside County venue'],
  ['oakland-car-accident', 'Oakland Car Accident Case Review', 'Oakland Car Accident Claims', 'urban traffic, port and commercial vehicles, freeway corridors, pedestrians, cyclists, and Alameda County venue'],
  ['fresno-car-accident', 'Fresno Car Accident Case Review', 'Fresno Car Accident Claims', 'Central Valley roads, agricultural and commercial vehicles, freeway crashes, and Fresno County venue'],
  ['bakersfield-car-accident', 'Bakersfield Car Accident Case Review', 'Bakersfield Car Accident Claims', 'oilfield and agricultural traffic, trucking routes, freeway crashes, and Kern County venue'],
] as const

const cityPages: ExpansionSeed[] = cityRows.map(([slugPart, title, cluster, localContext]) => ({
  slug: `/${slugPart}`,
  category: 'Attorney Intent',
  cluster,
  title,
  eyebrow: 'California local accident guide',
  description: `${title} requires more than a generic accident estimate. Local factors include ${localContext}, plus injury severity, liability evidence, treatment, damages, and insurance coverage.`,
  psychology: 'I need to understand my local California accident claim.',
  cta: 'Start Local Case Assessment',
  queries: [title.toLowerCase(), `${slugPart.replace(/-/g, ' ')} settlement`, `${cluster.toLowerCase()} lawyer`],
  signals: ['Local venue', 'Liability evidence', 'Medical treatment', 'Wage loss', 'Insurance limits', 'Commercial coverage'],
  track: ['Exact accident date, city, county, roadway, and police agency', 'Crash type, citations, witnesses, photos, video, and vehicle damage', 'ER care, PT, imaging, specialists, injections, surgery, or future care', 'Medical bills, liens, out-of-pocket costs, and wage loss', 'Insurance carriers, BI limits, UM/UIM, commercial or rideshare coverage, and offers'],
  why: `${title} can be affected by local venue, traffic patterns, medical networks, wage loss, commercial vehicle involvement, and insurance behavior. A structured intake helps attorneys review the file faster.`,
  help: 'ClearCaseIQ captures local venue, accident facts, injuries, treatment, damages, insurance, and missing documents in one case report.',
  faqs: [
    { q: `What affects a ${title.toLowerCase()}?`, a: 'Injury severity, liability, treatment, medical bills, wage loss, venue, insurance limits, commercial coverage, and documentation all matter.' },
    { q: 'Do local facts matter?', a: 'Yes. County, roadway, police agency, medical providers, wage loss, and commercial traffic can all affect review.' },
    { q: 'Can ClearCaseIQ help with attorney readiness?', a: 'ClearCaseIQ is not a law firm, but it organizes facts and documents for education and possible attorney review.' },
  ],
  scenario: `A claimant in ${cluster.toLowerCase()} had medical treatment, photos, an insurance claim, and missed work. The file became clearer when local venue, liability evidence, medical bills, and coverage facts were organized together.`,
  timeline: [['Crash scene', 'Location, photos, witnesses, police agency, and fault facts are recorded.'], ['Medical phase', 'Treatment records, imaging, bills, and referrals define damages.'], ['Insurance phase', 'Coverage, offers, denials, and policy limits are tracked.'], ['Review phase', 'Venue, damages, and documentation determine attorney readiness.']],
  severity: [['Basic', 'Minor symptoms, clear liability, and short treatment.'], ['Developing', 'Ongoing care, bills, or disputed liability.'], ['Attorney-ready', 'Serious injury, imaging, injections, surgery risk, wage loss, or low offer.'], ['Urgent', 'Catastrophic injury, commercial coverage, approaching deadline, minor, or complex lien issue.']],
  treatment: [{ label: 'Initial care', copy: 'First medical records connect symptoms to the accident.' }, { label: 'Follow-up', copy: 'PT, imaging, and specialist care show progression.' }, { label: 'Damages', copy: 'Bills, liens, lost wages, and future care define economics.' }, { label: 'Local review', copy: 'Venue, coverage, and liability facts shape next steps.' }],
  drivers: ['Local venue', 'Liability clarity', 'Medical severity', 'Treatment continuity', 'Wage loss', 'Policy limits or commercial coverage'],
  valueDetails: [{ label: 'Venue', copy: 'Local county and case posture can affect review.' }, { label: 'Coverage', copy: 'BI limits, UM/UIM, rideshare, or commercial policies affect practical recovery.' }, { label: 'Documentation', copy: 'Reports, photos, bills, and records make the case easier to evaluate.' }],
  insuranceProblems: ['The adjuster disputes fault.', 'Treatment gaps are used to reduce value.', 'Policy limits are unknown.', 'Rideshare or commercial coverage is unclear.'],
  intake: [{ label: 'Step 1', question: 'Where exactly did the accident happen?' }, { label: 'Step 2', question: 'What evidence shows fault?' }, { label: 'Step 3', question: 'What treatment, bills, and wage loss exist?' }, { label: 'Step 4', question: 'What insurance coverage or offers are known?' }],
}))

const insurerRows = ['USAA', 'Liberty Mutual', 'Mercury', 'Travelers', 'Nationwide'] as const

const insurerPages: ExpansionSeed[] = insurerRows.map((carrier) => ({
  slug: `/insurance/${carrier.toLowerCase().replace(/\s+/g, '-')}-denied-claim`,
  category: 'Insurance',
  cluster: `${carrier} Claim Denials`,
  title: `${carrier} Denied My Accident Claim`,
  eyebrow: 'Insurance denial guide',
  description: `${carrier} may deny, delay, or undervalue an accident claim based on liability, coverage, treatment gaps, causation, policy language, or missing documentation. This guide explains what to collect and how to organize the denial for review.`,
  psychology: `${carrier} denied my claim and I need next steps.`,
  cta: 'Review My Denied Claim',
  queries: [`${carrier} denied my claim`, `${carrier} accident claim denial`, `${carrier} low settlement offer`, `${carrier} says I was at fault`],
  signals: ['Denial reason', 'Liability dispute', 'Coverage issue', 'Treatment gap', 'Causation dispute', 'Low offer'],
  track: [`The exact ${carrier} denial reason, offer, or adjuster explanation`, 'Claim number, adjuster name, letters, emails, and call notes', 'Police report, photos, witnesses, citations, and video', 'Medical records, bills, treatment timeline, and gap explanations', 'Policy limits, UM/UIM, recorded statements, and comparative fault allegations'],
  why: `${carrier} denial pages convert because the claimant already has a problem. The key is identifying the exact denial reason and matching it to liability, medical, coverage, and damages evidence.`,
  help: `ClearCaseIQ organizes ${carrier} communications, liability evidence, medical proof, economic damages, and missing documents so the denial can be reviewed more clearly.`,
  faqs: [
    { q: `What should I do if ${carrier} denied my claim?`, a: 'Save the denial letter, claim number, adjuster communications, photos, reports, medical records, bills, and offer details. Identify the exact reason for denial.' },
    { q: `Can ${carrier} deny a claim because treatment was delayed?`, a: 'Insurers often use delayed treatment to dispute causation. A clear timeline and explanation may help answer that argument.' },
    { q: `Should I accept a low ${carrier} offer?`, a: 'This is not legal advice. Before accepting, consider treatment status, bills, liens, future care, liability, and available coverage.' },
  ],
  scenario: `${carrier} denied an injury claim by arguing delayed treatment and disputed fault. The file became stronger after the written denial, police report, photos, witness information, medical records, and bills were organized together.`,
  timeline: [['Denial received', `${carrier} states a reason such as fault, coverage, causation, treatment, or damages.`], ['Evidence review', 'Police report, photos, witnesses, records, and bills are gathered.'], ['Gap analysis', 'Missing records, inconsistent statements, and treatment gaps are identified.'], ['Response posture', 'Serious injury or disputed liability may support attorney review.']],
  severity: [['Low friction', 'Incomplete documentation or routine request.'], ['Moderate', 'Low offer or treatment challenge.'], ['Serious', 'Fault, causation, or coverage denial.'], ['High risk', 'Serious injury plus denial, policy issue, or comparative fault dispute.']],
  treatment: [{ label: 'Denial reason', copy: 'The exact wording controls the evidence needed.' }, { label: 'Liability proof', copy: 'Reports, photos, witnesses, and admissions answer fault arguments.' }, { label: 'Medical proof', copy: 'Records, bills, and timelines answer causation arguments.' }, { label: 'Review package', copy: 'A concise denial summary helps attorney triage.' }],
  drivers: ['Written denial reason', 'Liability evidence', 'Treatment timeline', 'Medical bills', 'Policy limits', 'Comparative fault allegation'],
  valueDetails: [{ label: 'Reason matters', copy: 'Coverage denials, fault denials, and medical disputes require different evidence.' }, { label: 'Documents', copy: 'A denial is easier to evaluate when all letters and records are together.' }, { label: 'Severity', copy: 'The more serious the injury, the more important denial review becomes.' }],
  insuranceProblems: [`${carrier} blames the claimant for fault.`, `${carrier} disputes treatment timing or causation.`, `${carrier} makes a low offer before treatment is complete.`, `${carrier} cites policy language or missing proof.`],
  intake: [{ label: 'Step 1', question: `What exact reason did ${carrier} give?` }, { label: 'Step 2', question: 'Do you have the denial letter and claim communications?' }, { label: 'Step 3', question: 'What records, bills, and liability evidence support you?' }, { label: 'Step 4', question: 'Has the adjuster requested a statement or assigned fault?' }],
}))

const expansionSeeds = [
  ...accidentTypePages,
  ...settlementPages,
  ...cityPages,
  ...insurerPages,
]

export const expansionLandingPages: LandingPage[] = expansionSeeds.map(toLandingPage)

export const expansionTopicContentBySlug = Object.fromEntries(
  expansionSeeds.map((seed) => [seed.slug, toTopicContent(seed)])
) as Record<string, TopicContent>
