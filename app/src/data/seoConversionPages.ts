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

const conversionSeeds = [
  ...caseWorthPages,
  ...averagePages,
]

export const conversionLandingPages: LandingPage[] = conversionSeeds.map(toLandingPage)

export const conversionTopicContentBySlug = Object.fromEntries(
  conversionSeeds.map((seed) => [seed.slug, toTopicContent(seed)])
) as Record<string, TopicContent>
