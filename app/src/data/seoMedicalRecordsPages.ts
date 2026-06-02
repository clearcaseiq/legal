import type { LandingPage, LandingPageCategory } from './seoLandingPages'
import type { TopicContent } from './seoLandingPageTopicContent'

type MedicalRecordsSeed = {
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

const toLandingPage = (seed: MedicalRecordsSeed): LandingPage => ({
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

const toTopicContent = (seed: MedicalRecordsSeed): TopicContent => ({
  scenario: seed.scenario,
  timeline: seed.timeline,
  severityLadder: seed.severity,
  treatmentProgression: seed.treatment,
  settlementDrivers: seed.drivers,
  settlementValueDetails: seed.valueDetails,
  insuranceProblems: seed.insuranceProblems,
  intakeSteps: seed.intake,
})

const recordsRows = [
  {
    slug: '/medical-records',
    title: 'Medical Records After an Accident',
    cluster: 'Medical Records Hub',
    focus: 'the core records, bills, imaging, treatment notes, discharge instructions, referrals, and chronology signals that make an accident claim easier to evaluate',
    psychology: 'I need one place to understand which records matter.',
    cta: 'Build My Medical Chronology',
    queries: ['medical records after accident', 'accident medical records', 'personal injury medical records', 'medical chronology accident claim'],
  },
  {
    slug: '/how-to-organize-medical-records',
    title: 'How to Organize Medical Records After an Accident',
    cluster: 'Medical Record Organization',
    focus: 'how to sort accident records by provider, date, diagnosis, treatment type, bills, imaging, referrals, liens, and missing-document gaps',
    psychology: 'My records are scattered and hard to understand.',
    cta: 'Organize My Records',
    queries: ['how to organize medical records after accident', 'organize medical bills personal injury', 'medical records checklist accident claim'],
  },
  {
    slug: '/how-to-build-a-medical-chronology',
    title: 'How to Build a Medical Chronology',
    cluster: 'Medical Chronology Builder',
    focus: 'how to convert accident care into a timeline of symptoms, providers, diagnoses, referrals, imaging, procedures, gaps, bills, and future-care recommendations',
    psychology: 'I need a clear timeline of my treatment.',
    cta: 'Create My Chronology',
    queries: ['how to build a medical chronology', 'medical chronology personal injury', 'accident treatment timeline', 'medical chronology template'],
  },
  {
    slug: '/what-medical-records-do-lawyers-need',
    title: 'What Medical Records Do Lawyers Need?',
    cluster: 'Attorney Medical Record Review',
    focus: 'the records attorneys usually need to evaluate injury severity, causation, treatment continuity, medical bills, liens, wage loss, and future care',
    psychology: 'I want to know what to send an attorney.',
    cta: 'Check Attorney-Ready Records',
    queries: ['what medical records do lawyers need', 'documents personal injury lawyer needs', 'medical records for accident attorney'],
  },
  {
    slug: '/how-insurance-companies-review-medical-records',
    title: 'How Insurance Companies Review Medical Records',
    cluster: 'Insurance Medical Record Review',
    focus: 'how adjusters review accident records for causation, treatment gaps, prior injuries, medical necessity, billing, diagnosis codes, and settlement leverage',
    psychology: 'I want to know what insurance is looking for.',
    cta: 'Review My Insurance Risk',
    queries: ['how insurance companies review medical records', 'insurance adjuster medical records accident', 'treatment gaps insurance claim', 'medical records settlement review'],
  },
] as const

const medicalRecordsSeeds: MedicalRecordsSeed[] = recordsRows.map(({ slug, title, cluster, focus, psychology, cta, queries }) => ({
  slug,
  category: 'Educational / SEO Moat',
  cluster,
  title,
  eyebrow: 'Medical chronology hub',
  description: `${title} explains ${focus}. ClearCaseIQ helps turn raw records into a structured treatment story that can support settlement estimates, attorney review, and insurance-dispute analysis.`,
  psychology,
  cta,
  queries: [...queries],
  signals: ['Treatment chronology', 'Medical records', 'Medical bills', 'Imaging reports', 'Treatment gaps', 'Attorney readiness'],
  track: [
    'Provider names, visit dates, facility names, and treatment types',
    'Symptoms, diagnoses, ICD/CPT codes, referrals, and discharge instructions',
    'MRI, CT, X-ray, EMG, procedure reports, operative notes, and therapy notes',
    'Medical bills, liens, paid amounts, out-of-pocket costs, and future-care recommendations',
    'Treatment gaps, prior injuries, insurance denials, low offers, and missing records',
  ],
  why: 'Medical records are the backbone of injury valuation. They show what hurt, when care began, whether treatment was continuous, what doctors diagnosed, what bills exist, and whether the claim is ready for insurance or attorney review.',
  help: 'ClearCaseIQ can organize records into a chronology, surface missing documents, highlight treatment gaps, extract bills and diagnoses, and connect medical facts to settlement and attorney-readiness signals.',
  faqs: [
    { q: 'What medical records matter most after an accident?', a: 'ER records, urgent care notes, imaging reports, specialist notes, PT records, procedure reports, operative notes, bills, liens, and discharge instructions are usually important.' },
    { q: 'Why does a medical chronology matter?', a: 'A chronology makes the treatment story easier to review by showing symptoms, providers, diagnoses, treatment, gaps, bills, and future care in date order.' },
    { q: 'Do treatment gaps hurt a claim?', a: 'They can create insurer arguments, but gaps may be explainable by referral delays, insurance issues, work conflicts, transportation, or provider availability.' },
  ],
  scenario: 'A claimant had ER records, PT notes, MRI reports, pain-management records, and bills across multiple providers. The case became easier to evaluate once the records were sorted by date, linked to diagnoses, and reviewed for gaps, bills, and future-care recommendations.',
  timeline: [
    ['Day 0-3', 'ER, urgent care, discharge papers, initial symptoms, prescriptions, and first diagnoses are collected.'],
    ['Weeks 1-6', 'PT, chiropractic care, primary care, imaging orders, and specialist referrals show treatment continuity.'],
    ['Escalation', 'MRI, CT, EMG, injections, orthopedic, neurology, pain management, or surgery notes clarify severity.'],
    ['Review package', 'Bills, liens, records, gaps, future care, and wage loss are organized for settlement or attorney review.'],
  ],
  severity: [
    ['Basic file', 'Initial visit and a few bills are available, but treatment story is thin.'],
    ['Developing file', 'Consistent care, therapy notes, and some bills support ongoing symptoms.'],
    ['Strong file', 'Imaging, specialists, procedures, bills, and gap explanations are organized.'],
    ['Attorney-ready file', 'Chronology includes severe injury, future care, liens, wage loss, and liability evidence.'],
  ],
  treatment: [
    { label: 'Collect records', copy: 'Gather ER, urgent care, provider notes, imaging, therapy, bills, and insurance letters.' },
    { label: 'Sort by date', copy: 'Build a timeline from first symptoms through current care and future recommendations.' },
    { label: 'Flag gaps', copy: 'Identify missing records, unexplained delays, prior injuries, and denied treatment.' },
    { label: 'Summarize value signals', copy: 'Connect diagnosis, treatment escalation, bills, wage loss, and future care to case readiness.' },
  ],
  drivers: ['First treatment date', 'Diagnosis support', 'Imaging findings', 'Treatment continuity', 'Medical bills and liens', 'Future-care recommendations'],
  valueDetails: [
    { label: 'Causation', copy: 'Records help connect symptoms and treatment to the accident timeline.' },
    { label: 'Severity', copy: 'Imaging, procedures, specialists, and surgery recommendations raise the seriousness of the file.' },
    { label: 'Economics', copy: 'Bills, liens, paid amounts, and future care shape settlement evaluation.' },
  ],
  insuranceProblems: [
    'The adjuster argues the treatment was delayed or unrelated.',
    'Prior injuries or degeneration are used to dispute causation.',
    'Medical bills are reduced as excessive or unnecessary.',
    'Missing records or treatment gaps lower settlement confidence.',
  ],
  intake: [
    { label: 'Step 1', question: 'Which providers treated you after the accident?' },
    { label: 'Step 2', question: 'Do you have records, bills, imaging reports, and discharge papers?' },
    { label: 'Step 3', question: 'Are there treatment gaps, prior injuries, or denied treatment?' },
    { label: 'Step 4', question: 'Do the records show future care, work limits, or liens?' },
  ],
}))

export const medicalRecordsLandingPages: LandingPage[] = medicalRecordsSeeds.map(toLandingPage)

export const medicalRecordsTopicContentBySlug = Object.fromEntries(
  medicalRecordsSeeds.map((seed) => [seed.slug, toTopicContent(seed)])
) as Record<string, TopicContent>
