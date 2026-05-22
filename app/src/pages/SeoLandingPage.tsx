import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Activity, AlertTriangle, Calculator, CheckCircle, ChevronRight, FileText, Search, Shield, Stethoscope, TrendingUp } from 'lucide-react'
import { landingPagesBySlug } from '../data/seoLandingPages'
import { topicContentBySlug, type TopicContent } from '../data/seoLandingPageTopicContent'

const categoryTone: Record<string, string> = {
  Symptoms: 'from-rose-50 to-white border-rose-100 text-rose-950',
  Treatment: 'from-sky-50 to-white border-sky-100 text-sky-950',
  Settlement: 'from-emerald-50 to-white border-emerald-100 text-emerald-950',
  Insurance: 'from-amber-50 to-white border-amber-100 text-amber-950',
  Liability: 'from-violet-50 to-white border-violet-100 text-violet-950',
  Commercial: 'from-slate-100 to-white border-slate-200 text-slate-950',
  'Attorney Intent': 'from-brand-50 to-white border-brand-100 text-brand-950',
  'Educational / SEO Moat': 'from-cyan-50 to-white border-cyan-100 text-cyan-950',
}

const symptomTimeline = [
  ['Same day', 'Soreness, stiffness, headache, anxiety, or localized pain may appear as adrenaline wears off.'],
  ['24-72 hours', 'Radiating pain, numbness, dizziness, sleep disruption, or increased inflammation may become more obvious.'],
  ['1-2 weeks', 'Mobility limits, missed work, PT referrals, persistent headaches, or specialist follow-up may define the injury path.'],
  ['Longer term', 'MRI findings, injections, surgery discussions, cognitive symptoms, or permanent restrictions can materially change claim posture.'],
]

const severityLadder = [
  ['Mild', 'Short-lived soreness, limited treatment, no objective findings, minimal activity disruption.'],
  ['Moderate', 'PT, chiropractic care, urgent care follow-up, persistent pain, or MRI/X-ray evaluation.'],
  ['Serious', 'Specialist referral, injections, neurological symptoms, significant wage loss, or long treatment duration.'],
  ['Severe', 'Surgery recommendation, hospitalization, permanent impairment, major work limits, or catastrophic injury indicators.'],
]

const treatmentProgression = [
  { label: 'Initial evaluation', copy: 'ER, urgent care, primary care, or telehealth visit documenting the first symptoms and accident connection.' },
  { label: 'Conservative care', copy: 'Physical therapy, chiropractic care, medication, home exercise, and follow-up visits showing continuity.' },
  { label: 'Advanced diagnostics', copy: 'MRI, CT, X-ray, specialist examination, or neurological testing when symptoms persist or escalate.' },
  { label: 'Escalated treatment', copy: 'Injections, pain management, orthopedic/neurosurgical referral, surgery recommendation, or future care estimate.' },
]

const settlementDrivers = [
  'Objective findings such as MRI, CT, X-ray, diagnosis codes, or specialist notes',
  'Treatment continuity and clear explanations for any gaps in care',
  'Surgery, injections, future treatment recommendations, or permanent limitations',
  'Missed work, wage loss, out-of-pocket costs, and documented medical bills',
  'Liability clarity from police reports, photos, witnesses, video, or admissions',
  'Commercial, rideshare, trucking, or higher-limit insurance coverage',
]

const insuranceProblems = [
  'The adjuster argues your treatment was delayed or unrelated to the accident.',
  'The insurer says the crash was minor, your symptoms are soft tissue, or imaging shows degeneration.',
  'A low early offer arrives before the full medical picture is known.',
  'The carrier points to treatment gaps, prior injuries, missing bills, or disputed fault.',
  'Commercial or rideshare coverage is unclear and the insurer shifts responsibility.',
]

const intakeQuestions = [
  'What symptoms started immediately, and what appeared later?',
  'Have you had an MRI, X-ray, CT scan, specialist visit, or diagnosis?',
  'Are you in PT, chiropractic care, pain management, injections, or surgery discussions?',
  'Have you missed work, lost income, or paid out-of-pocket expenses?',
  'Is liability clear, disputed, or affected by a police report, witness, or photos?',
  'Has insurance denied the claim, blamed you, delayed treatment approval, or made a low offer?',
]

const progressiveIntakeSteps = [
  { label: 'Step 1', question: 'Where is your pain, injury, or claim problem located?' },
  { label: 'Step 2', question: 'Have symptoms worsened, spread, or changed since the accident?' },
  { label: 'Step 3', question: 'Have you had MRI, specialist care, PT, injections, or surgery discussions?' },
  { label: 'Step 4', question: 'Did you miss work, receive a low offer, or have insurance dispute the claim?' },
]

const trustIndicators = [
  'Encrypted intake',
  'HIPAA-conscious handling',
  'AI-assisted review',
  'Educational only',
]

const personalizationSignals = [
  { id: 'numbness', label: 'Numbness / radiating pain', group: 'Symptoms' },
  { id: 'mri', label: 'MRI or imaging', group: 'Diagnostics' },
  { id: 'injections', label: 'Injections / pain management', group: 'Treatment' },
  { id: 'surgery', label: 'Surgery recommendation', group: 'Treatment' },
  { id: 'missedWork', label: 'Missed work', group: 'Economics' },
  { id: 'disputed', label: 'Insurance disputed injury or fault', group: 'Insurance' },
]

const signalImpact: Record<string, {
  settlement: string
  severity: string
  intake: string
  attorney: string
}> = {
  numbness: {
    settlement: 'Neurological symptoms may increase severity if they are documented and consistent with imaging or provider notes.',
    severity: 'Radiating pain, tingling, weakness, or numbness can move the file beyond simple soreness.',
    intake: 'Where does the numbness travel, and when did it start after the crash?',
    attorney: 'Nerve symptoms can increase attorney interest when supported by treatment records.',
  },
  mri: {
    settlement: 'MRI confirmation can strengthen diagnostic support, especially when symptoms match the finding.',
    severity: 'Imaging may shift the case from subjective pain to documented structural injury.',
    intake: 'What did the MRI impression say, and who ordered the imaging?',
    attorney: 'Objective imaging is a strong attorney-fit signal when causation and liability are clear.',
  },
  injections: {
    settlement: 'Injections suggest treatment escalation and may support higher medical damages.',
    severity: 'Pain management care often indicates persistent symptoms after conservative treatment.',
    intake: 'How many injections were recommended or performed, and did they help?',
    attorney: 'Escalated treatment can improve review priority if records and bills are available.',
  },
  surgery: {
    settlement: 'A surgery recommendation is often a high-impact value factor because it signals future cost and severity.',
    severity: 'Surgical discussion usually places the injury in a serious or severe band.',
    intake: 'Was surgery recommended, scheduled, completed, or only discussed as a future option?',
    attorney: 'Surgery indicators are among the strongest attorney-fit signals.',
  },
  missedWork: {
    settlement: 'Lost wages add economic damages and help show real-life impact.',
    severity: 'Work limitations can demonstrate functional impairment beyond medical diagnosis.',
    intake: 'How many work days were missed, and do you have employer or pay documentation?',
    attorney: 'Economic documentation improves case-readiness and demand-package quality.',
  },
  disputed: {
    settlement: 'Disputed injury, fault, or treatment can reduce certainty but may increase litigation readiness.',
    severity: 'The injury severity may be strong, but confidence depends on how well the dispute can be answered.',
    intake: 'What exactly did the adjuster deny, dispute, delay, or blame on you?',
    attorney: 'Insurance friction can make attorney involvement more important.',
  },
}

const internalLinks = [
  { label: 'Herniated disc settlement', to: '/settlements/herniated-disc' },
  { label: 'MRI after accident', to: '/treatment/mri-after-accident' },
  { label: 'Physical therapy and treatment gaps', to: '/treatment/physical-therapy-after-accident' },
  { label: 'Whiplash settlement value', to: '/settlements/whiplash' },
  { label: 'Insurance claim denial', to: '/insurance/claim-denial' },
  { label: 'Disputed fault analysis', to: '/liability/disputed-fault' },
  { label: 'Commercial coverage', to: '/insurance/rideshare-commercial-coverage' },
  { label: 'Settlement calculator', to: '/tools/settlement-calculator' },
]

const settlementValueDetails = [
  { label: 'MRI confirmation', copy: 'Objective findings can move the discussion from general pain to documented injury, especially when symptoms match the imaging level.' },
  { label: 'Surgery recommendation', copy: 'A surgical recommendation, even before surgery happens, can signal future medical cost, severity, and attorney interest.' },
  { label: 'Treatment continuity', copy: 'Consistent care helps connect the accident, symptoms, diagnosis, and recovery timeline into a more credible file.' },
  { label: 'Commercial insurance', copy: 'Rideshare, trucking, delivery, employer-owned, or other commercial coverage may change available insurance and negotiation posture.' },
  { label: 'Lost wages', copy: 'Missed work, reduced hours, job restrictions, or business interruption can convert medical harm into documented economic loss.' },
]

const expandedFaqs = [
  { q: 'Does delayed pain after an accident matter?', a: 'Yes. Many serious injuries develop gradually after a crash. The key is documenting when symptoms started, when they worsened, and when you sought medical care.' },
  { q: 'Should I get an MRI after an accident?', a: 'That is a medical decision for a provider. From a case-readiness perspective, MRI findings can help document disc, ligament, soft-tissue, or nerve-related injuries when symptoms persist.' },
  { q: 'Do chiropractors or physical therapy help claims?', a: 'They can help document pain, range-of-motion limits, treatment continuity, and recovery progress. Insurers may still scrutinize duration, gaps, and medical necessity.' },
  { q: 'What if insurance denies treatment or says it was unnecessary?', a: 'Save the denial, explanation of benefits, adjuster emails, provider notes, and bills. The reason for denial can become an important litigation-readiness signal.' },
  { q: 'Does surgery increase settlement value?', a: 'Surgery or a surgery recommendation is often a high-impact severity signal, but value still depends on liability, causation, coverage, prior history, and recovery outcome.' },
  { q: 'What if symptoms worsen later?', a: 'Worsening symptoms should be medically evaluated. Keep a timeline of changes and upload new records because escalation can change severity, confidence, and next steps.' },
  { q: 'Will a treatment gap hurt my case?', a: 'A gap can create questions, but it may be explainable. Work conflicts, insurance delays, referral delays, transportation issues, or provider availability should be documented.' },
  { q: 'What documents are most useful?', a: 'Police reports, photos, medical records, bills, MRI reports, PT notes, wage loss proof, insurance letters, and witness information are usually high-value documents.' },
  { q: 'Can ClearCaseIQ tell me exactly what my case is worth?', a: 'No tool can guarantee a result. ClearCaseIQ provides a preliminary intelligence report based on available facts, documents, and underwriting signals.' },
  { q: 'Is this legal advice?', a: 'No. ClearCaseIQ is not a law firm. The report is educational and can help organize information for possible attorney review.' },
]

function getScenario(page: { category: string; cluster: string; title: string; signals: string[] }) {
  if (page.cluster.toLowerCase().includes('back') || page.cluster.toLowerCase().includes('disc') || page.title.toLowerCase().includes('spine')) {
    return 'A patient initially experienced lower-back soreness after a rear-end collision. Two weeks later, radiating leg pain led to MRI imaging that confirmed a lumbar disc protrusion, followed by injections and ongoing physical therapy.'
  }

  if (page.cluster.toLowerCase().includes('whiplash') || page.title.toLowerCase().includes('neck')) {
    return 'A driver felt stiff the night of the crash, then developed headaches and arm tingling over the next several days. PT records, cervical imaging, and a pain-management referral became important because the symptoms did not resolve quickly.'
  }

  if (page.cluster.toLowerCase().includes('concussion') || page.cluster.toLowerCase().includes('tbi')) {
    return 'A person walked away from the collision but later noticed headaches, dizziness, light sensitivity, and trouble concentrating at work. The claim became more credible when ER notes, follow-up visits, and symptom logs showed the cognitive pattern over time.'
  }

  if (page.category === 'Insurance') {
    return 'A claimant received a quick low offer before treatment was complete. Later records showed continued symptoms, missed work, and a specialist referral, creating a stronger explanation for why the early offer did not reflect the full claim.'
  }

  if (page.category === 'Liability') {
    return 'Two drivers gave different accounts of the crash. Photos, the police report, witness contact information, and vehicle damage patterns became the key facts used to assess liability strength and comparative fault risk.'
  }

  if (page.category === 'Commercial') {
    return 'A crash involving a delivery or rideshare vehicle created multiple coverage questions. The driver status, employer relationship, app activity, and commercial policy layer all became important underwriting facts.'
  }

  return `A claimant started with uncertainty about ${page.cluster.toLowerCase()}, then gathered medical records, bills, insurance letters, and treatment notes. The clearer timeline helped identify which facts supported value, which facts created risk, and what documents were still missing.`
}

function getDiagramCopy(page: { category: string; cluster: string; title: string }) {
  const text = `${page.cluster} ${page.title}`.toLowerCase()
  if (text.includes('neck') || text.includes('whiplash') || text.includes('cervical')) {
    return {
      kind: 'cervical',
      title: 'Cervical injury diagram',
      body: 'Illustrates cervical discs, soft-tissue strain, and possible nerve symptoms into the arm or hand.',
      callouts: ['Cervical discs', 'Neck muscles/ligaments', 'Arm numbness pathway'],
    }
  }
  if (text.includes('head') || text.includes('concussion') || text.includes('tbi')) {
    return {
      kind: 'brain',
      title: 'Head injury diagram',
      body: 'Illustrates headache, dizziness, memory, concentration, and light-sensitivity symptom domains.',
      callouts: ['Cognitive symptoms', 'Balance/dizziness', 'Headache pattern'],
    }
  }
  if (text.includes('shoulder') || text.includes('knee')) {
    return {
      kind: 'joint',
      title: 'Orthopedic injury diagram',
      body: 'Illustrates joint pain, range-of-motion limits, imaging findings, and functional restrictions.',
      callouts: ['Joint mobility', 'Ligament/tendon injury', 'Work/activity limits'],
    }
  }
  if (page.category === 'Insurance') {
    return {
      kind: 'coverage',
      title: 'Insurance coverage map',
      body: 'Illustrates how claim denials, policy layers, adjuster behavior, and coverage disputes affect case posture.',
      callouts: ['Policy layer', 'Denial reason', 'Adjuster dispute'],
    }
  }
  if (page.category === 'Liability') {
    return {
      kind: 'evidence',
      title: 'Liability evidence map',
      body: 'Illustrates how police reports, witnesses, photos, vehicle damage, and fault disputes connect.',
      callouts: ['Police report', 'Witness support', 'Fault dispute'],
    }
  }
  if (page.category === 'Commercial') {
    return {
      kind: 'commercial',
      title: 'Commercial coverage diagram',
      body: 'Illustrates commercial vehicle involvement, company responsibility, policy layers, and multi-party review.',
      callouts: ['Company vehicle', 'Coverage layers', 'Multiple parties'],
    }
  }
  if (page.category === 'Attorney Intent' || page.category === 'Educational / SEO Moat') {
    return {
      kind: 'casefile',
      title: 'Case-readiness map',
      body: 'Illustrates how symptoms, treatment records, liability facts, insurance letters, and damages form a reviewable case file.',
      callouts: ['Medical records', 'Liability facts', 'Insurance letters'],
    }
  }
  return {
    kind: 'spine',
    title: 'Spine and nerve diagram',
    body: 'Illustrates lumbar/cervical discs, radiating symptoms, and escalation from pain to imaging and treatment.',
    callouts: ['Disc level', 'Nerve pathway', 'Radiating symptoms'],
  }
}

function DiagramSvg({ kind, title }: { kind: string; title: string }) {
  if (kind === 'brain') {
    return (
      <svg viewBox="0 0 360 220" role="img" aria-label={title} className="h-52 w-full">
        <path d="M151 47c-33 0-57 23-57 52 0 14 5 27 15 37-1 21 16 37 38 37h74c28 0 50-20 50-47 0-13-5-25-14-34-2-26-25-45-54-45-12 0-23 3-32 9-6-6-13-9-20-9z" fill="#ede9fe" stroke="#7c3aed" strokeWidth="3" />
        <path d="M132 93c19-18 42-18 61 0M124 128c26 13 55 11 82-6M206 84c22 8 35 24 38 49" fill="none" stroke="#4c1d95" strokeWidth="3" strokeLinecap="round" />
        <circle cx="92" cy="62" r="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
        <circle cx="282" cy="76" r="10" fill="#fee2e2" stroke="#ef4444" strokeWidth="3" />
        <circle cx="266" cy="170" r="10" fill="#dcfce7" stroke="#16a34a" strokeWidth="3" />
        <path d="M103 68l35 22M272 85l-34 22M258 164l-42-26" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
    )
  }

  if (kind === 'joint') {
    return (
      <svg viewBox="0 0 360 220" role="img" aria-label={title} className="h-52 w-full">
        <circle cx="180" cy="108" r="56" fill="#f8fafc" stroke="#0f172a" strokeWidth="3" />
        <path d="M143 101c22-25 52-26 75-2M144 121c24 19 51 20 73 1" fill="none" stroke="#0284c7" strokeWidth="5" strokeLinecap="round" />
        <path d="M117 61l44 34M244 57l-45 39M116 157l47-34M244 159l-47-36" stroke="#94a3b8" strokeWidth="10" strokeLinecap="round" />
        <circle cx="180" cy="108" r="18" fill="#fee2e2" stroke="#ef4444" strokeWidth="3" />
        <path d="M66 78h62M232 82h62M68 152h62" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
    )
  }

  if (kind === 'coverage' || kind === 'commercial') {
    return (
      <svg viewBox="0 0 360 220" role="img" aria-label={title} className="h-52 w-full">
        <rect x="30" y="42" width="92" height="58" rx="14" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
        <rect x="134" y="126" width="92" height="58" rx="14" fill="#dbeafe" stroke="#2563eb" strokeWidth="3" />
        <rect x="238" y="42" width="92" height="58" rx="14" fill="#dcfce7" stroke="#16a34a" strokeWidth="3" />
        <path d="M122 72h116M181 100v26M226 154h28c22 0 40-18 40-40v-14" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6" />
        <circle cx="76" cy="72" r="16" fill="#fff" stroke="#92400e" strokeWidth="3" />
        <path d="M68 72h16M76 64v16" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
        <path d="M162 154h36M180 136v36" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" />
        <path d="M274 70h20M274 82h32" stroke="#15803d" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'evidence' || kind === 'casefile') {
    return (
      <svg viewBox="0 0 360 220" role="img" aria-label={title} className="h-52 w-full">
        <rect x="44" y="34" width="86" height="112" rx="12" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
        <path d="M66 64h42M66 84h42M66 104h28" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
        <rect x="232" y="42" width="86" height="72" rx="12" fill="#dbeafe" stroke="#2563eb" strokeWidth="3" />
        <path d="M252 70h46M252 90h30" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" />
        <circle cx="183" cy="154" r="36" fill="#dcfce7" stroke="#16a34a" strokeWidth="3" />
        <path d="M168 154l11 11 21-25" fill="none" stroke="#15803d" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M130 94c28 0 35 23 40 36M232 86c-25 3-38 21-44 43" fill="none" stroke="#475569" strokeWidth="3" strokeDasharray="6 6" />
      </svg>
    )
  }

  if (kind === 'cervical') {
    return (
      <svg viewBox="0 0 360 220" role="img" aria-label={title} className="h-52 w-full">
        <path d="M166 26c34 35 38 78 14 128-10 21-10 34 3 45" fill="none" stroke="#0284c7" strokeWidth="18" strokeLinecap="round" />
        {[55, 82, 109, 136, 163].map((y, index) => (
          <g key={y}>
            <rect x={index % 2 ? 147 : 152} y={y} width="70" height="10" rx="5" fill="#fff" stroke="#0f172a" strokeWidth="2" />
            <path d={`M218 ${y + 5} C 246 ${y + 2}, 259 ${y + 20}, 284 ${y + 18}`} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          </g>
        ))}
        <circle cx="137" cy="44" r="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
        <path d="M68 72h70M242 114h58M76 164h74" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 360 220" role="img" aria-label={title} className="h-52 w-full">
      <rect x="152" y="22" width="56" height="176" rx="28" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3" />
      {[48, 76, 104, 132, 160].map((y) => (
        <g key={y}>
          <rect x="132" y={y} width="96" height="10" rx="5" fill="#fff" stroke="#0f172a" strokeWidth="2" />
          <path d={`M228 ${y + 5} C 258 ${y + 2}, 270 ${y + 22}, 296 ${y + 18}`} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
      <circle cx="180" cy="26" r="18" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
      <path d="M180 44 L180 198" stroke="#0369a1" strokeWidth="4" strokeLinecap="round" />
      <path d="M64 70 H124" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M238 116 H304" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M72 166 H132" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
    </svg>
  )
}

function getReadinessStatus(score: number) {
  if (score >= 8) return 'High'
  if (score >= 5) return 'Moderate'
  if (score >= 3) return 'Developing'
  return 'Early'
}

function joinReadable(items: string[]) {
  if (items.length <= 1) return items[0] || ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function buildTopicDeepDive(page: { title: string; cluster: string; category: string; signals: string[]; sections: { whatToTrack: string[] } }, topicContent: TopicContent) {
  const earlySignals = topicContent.timeline.slice(0, 2).map(([, copy]) => copy)
  const highSeverity = topicContent.severityLadder.slice(-2).map(([level, copy]) => `${level.toLowerCase()} cases involve ${copy}`)
  const treatmentPath = topicContent.treatmentProgression.map((step) => `${step.label.toLowerCase()}: ${step.copy}`)
  const drivers = topicContent.settlementDrivers.slice(0, 5)
  const problems = topicContent.insuranceProblems.slice(0, 4)
  const documents = [...page.sections.whatToTrack, ...topicContent.settlementDrivers].slice(0, 7)

  return [
    {
      eyebrow: 'Topic-specific analysis',
      title: `What ${page.title.toLowerCase()} really evaluates`,
      body: `${page.cluster} pages should not simply define the injury or claim problem. This page evaluates whether the facts show a medically supported progression, a believable accident connection, and enough documentation to help someone understand case readiness. For this topic, the strongest early signals include ${joinReadable(earlySignals)} The underwriting question is whether those facts remain consistent as treatment, records, bills, and insurance communications develop.`,
      bullets: page.signals,
    },
    {
      eyebrow: 'Medical and factual proof',
      title: 'Evidence that makes this page stronger',
      body: `The most useful evidence is specific to the claim type. For this page, the file becomes more persuasive when it includes ${joinReadable(documents)}. These details help separate a vague claim from a structured narrative that shows timing, severity, treatment progression, and economic impact.`,
      bullets: documents,
    },
    {
      eyebrow: 'Severity and value logic',
      title: 'How severity can change the value discussion',
      body: `Severity is not based on one label. It changes when symptoms persist, treatment escalates, objective findings appear, or daily life is affected. In this topic, ${joinReadable(highSeverity)}. Settlement value can also move when the record shows ${joinReadable(drivers)}.`,
      bullets: drivers,
    },
    {
      eyebrow: 'Treatment story',
      title: 'How the treatment timeline should read',
      body: `A strong treatment story has a beginning, a reason for follow-up, and an explanation for any escalation or gap. For this page, the treatment path usually turns on ${joinReadable(treatmentPath.slice(0, 4))}. When that sequence is documented, the case story feels more coherent to insurers, attorneys, and anyone reviewing the file.`,
      bullets: topicContent.treatmentProgression.map((step) => step.label),
    },
    {
      eyebrow: 'Insurance defense pressure',
      title: 'Arguments insurance may use against this topic',
      body: `Insurance companies often look for weak links in timing, causation, treatment necessity, and documentation. For this page, common pressure points include: ${joinReadable(problems)}. The goal is not to overstate the case; it is to identify these issues early so the intake can ask better questions and collect better records.`,
      bullets: problems,
    },
  ]
}

export default function SeoLandingPage() {
  const location = useLocation()
  const page = landingPagesBySlug.get(location.pathname)
  const [selectedSignals, setSelectedSignals] = useState<string[]>([])
  const selectedImpacts = useMemo(() => selectedSignals.map((signal) => signalImpact[signal]).filter(Boolean), [selectedSignals])
  const readinessScore = useMemo(() => {
    const weights: Record<string, number> = {
      numbness: 1,
      mri: 3,
      injections: 2,
      surgery: 3,
      missedWork: 1,
      disputed: 1,
    }
    return selectedSignals.reduce((total, signal) => total + (weights[signal] || 0), 0)
  }, [selectedSignals])
  const readinessRows = [
    { signal: 'Treatment continuity', status: selectedSignals.some((signal) => ['injections', 'surgery'].includes(signal)) ? 'Strong' : selectedSignals.length ? 'Developing' : 'Unknown' },
    { signal: 'Liability evidence', status: selectedSignals.includes('disputed') ? 'Moderate / disputed' : 'Needs facts' },
    { signal: 'Diagnostic support', status: selectedSignals.includes('mri') ? 'High' : selectedSignals.includes('numbness') ? 'Potential' : 'Unknown' },
    { signal: 'Insurance complexity', status: selectedSignals.includes('disputed') ? 'Elevated' : 'Not yet flagged' },
    { signal: 'Economic indicators', status: selectedSignals.includes('missedWork') ? 'Documentable' : 'Not entered' },
    { signal: 'Attorney-fit signal', status: getReadinessStatus(readinessScore) },
  ]
  const toggleSignal = (signalId: string) => {
    setSelectedSignals((current) =>
      current.includes(signalId) ? current.filter((signal) => signal !== signalId) : [...current, signalId]
    )
  }

  if (!page) return <Navigate to="/" replace />

  const tone = categoryTone[page.category] || 'from-brand-50 to-white border-brand-100 text-brand-950'
  const allFaqs = [...page.faqs, ...expandedFaqs].slice(0, 12)
  const topicContent = topicContentBySlug[page.slug]
  const scenario = topicContent?.scenario || getScenario(page)
  const diagram = getDiagramCopy(page)
  const pageTimeline = topicContent?.timeline || symptomTimeline
  const pageSeverityLadder = topicContent?.severityLadder || severityLadder
  const pageTreatmentProgression = topicContent?.treatmentProgression || treatmentProgression
  const pageSettlementDrivers = topicContent?.settlementDrivers || settlementDrivers
  const pageSettlementValueDetails = topicContent?.settlementValueDetails || settlementValueDetails
  const pageInsuranceProblems = topicContent?.insuranceProblems || insuranceProblems
  const pageIntakeSteps = topicContent?.intakeSteps || progressiveIntakeSteps
  const deepDiveSections = topicContent ? buildTopicDeepDive(page, topicContent) : []
  const relatedLinks = internalLinks.filter((link) => link.to !== location.pathname).slice(0, 6)
  const estimatorCta = location.pathname === '/tools/settlement-calculator' ? '/assessment/start' : '/tools/settlement-calculator'
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: page.title,
        description: page.description,
        author: { '@type': 'Organization', name: 'ClearCaseIQ' },
        publisher: { '@type': 'Organization', name: 'ClearCaseIQ' },
        mainEntityOfPage: location.pathname,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
          { '@type': 'ListItem', position: 2, name: page.category, item: `/${location.pathname.split('/')[1]}` },
          { '@type': 'ListItem', position: 3, name: page.title, item: location.pathname },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: allFaqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
      {
        '@type': 'MedicalCondition',
        name: page.cluster,
        description: page.sections.whyItMatters,
        signOrSymptom: page.signals.map((signal) => ({ '@type': 'MedicalSymptom', name: signal })),
      },
    ],
  }

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className={`overflow-hidden rounded-3xl border bg-gradient-to-br ${tone} shadow-card`}>
        <div className="grid gap-6 p-4 sm:gap-8 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{page.eyebrow}</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              {page.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">{page.description}</p>
            <p className="mt-3 max-w-2xl rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm">
              Many serious injuries and claim problems develop gradually after a crash. If something feels off, it is reasonable to want clarity before speaking with an adjuster or making decisions about your claim.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {trustIndicators.map((item) => (
                <span key={item} className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/assessment/start"
                className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
              >
                {page.cta}
                <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
              <a
                href="#signals"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                See what we analyze
              </a>
            </div>
          </div>

          <aside className="min-w-0 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm sm:p-5">
            <p className="mb-3 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              Reviewed by medical + legal AI underwriting engine
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Search intent</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">{page.cluster}</p>
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              “{page.psychology}”
            </p>
            <div className="mt-5 space-y-2">
              {page.exampleQueries.slice(0, 4).map((query) => (
                <div key={query} className="flex gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-600">
                  <Search className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                  <span>{query}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white shadow-card sm:mt-8 sm:p-8">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">Interactive underwriting preview</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Personalize this page to your facts.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Select the signals that apply. The page adapts settlement factors, severity explanations, intake prompts, and attorney-fit indicators in real time.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {personalizationSignals.map((signal) => {
                const active = selectedSignals.includes(signal.id)
                return (
                  <button
                    key={signal.id}
                    type="button"
                    onClick={() => toggleSignal(signal.id)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? 'border-brand-300 bg-brand-400 text-slate-950'
                        : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    {signal.label}
                  </button>
                )
              })}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">Conversational intake</p>
              <div className="mt-3 space-y-2">
                {(selectedImpacts.length ? selectedImpacts.map((impact) => impact.intake) : pageIntakeSteps.map((step) => step.question)).slice(0, 4).map((question) => (
                  <div key={question} className="rounded-xl bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800">
                    {question}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="min-w-0 rounded-2xl border border-white/10 bg-white/10 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">Case-readiness score</p>
                <p className="mt-1 text-2xl font-semibold">{getReadinessStatus(readinessScore)}</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-300 bg-brand-400 text-xl font-bold text-slate-950">
                {Math.min(readinessScore, 10)}/10
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
              {readinessRows.map((row) => (
                <div key={row.signal} className="grid grid-cols-1 border-b border-white/10 last:border-b-0 sm:grid-cols-[1fr_120px]">
                  <div className="px-3 py-2 text-sm text-slate-200">{row.signal}</div>
                  <div className="bg-white/10 px-3 py-2 text-sm font-semibold text-white">{row.status}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">
              This preview is educational. The full assessment can include documents, chronology, economics, and insurance context.
            </p>
          </aside>
        </div>
      </section>

      {selectedImpacts.length > 0 && (
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Adapted settlement factors</p>
            <div className="mt-4 space-y-3">
              {selectedImpacts.map((impact) => (
                <p key={impact.settlement} className="text-sm leading-6 text-emerald-950">{impact.settlement}</p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Adapted severity explanation</p>
            <div className="mt-4 space-y-3">
              {selectedImpacts.map((impact) => (
                <p key={impact.severity} className="text-sm leading-6 text-sky-950">{impact.severity}</p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Attorney-fit signals</p>
            <div className="mt-4 space-y-3">
              {selectedImpacts.map((impact) => (
                <p key={impact.attorney} className="text-sm leading-6 text-violet-950">{impact.attorney}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Example scenario</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">How a real injury story can evolve</h2>
          <blockquote className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-5 text-sm leading-7 text-brand-950">
            “{scenario}”
          </blockquote>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            Real claims usually turn on progression: what hurt first, what worsened, what doctors documented, and whether the insurance company can connect the treatment back to the accident.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Visual injury map</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{diagram.title}</h2>
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <DiagramSvg kind={diagram.kind} title={diagram.title} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">{diagram.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {diagram.callouts.map((callout) => (
              <span key={callout} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{callout}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-8 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-50 p-2 text-rose-700">
            <Activity className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Symptom escalation timeline</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">How symptoms can change after an accident</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              A claim often becomes clearer when symptoms are tracked over time. This timeline is not medical advice, but it shows why delayed or escalating symptoms should be documented carefully.
            </p>
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-[112px_1fr] bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid-cols-[150px_1fr]">
            <div className="border-r border-slate-200 px-3 py-3 sm:px-4">Time after accident</div>
            <div className="px-4 py-3">Common symptoms / case signals</div>
          </div>
          {pageTimeline.map(([time, symptoms]) => (
            <div key={time} className="grid grid-cols-[112px_1fr] border-t border-slate-200 text-sm sm:grid-cols-[150px_1fr]">
              <div className="border-r border-slate-200 px-3 py-3 font-semibold text-slate-900 sm:px-4">{time}</div>
              <div className="px-3 py-3 leading-6 text-slate-700 sm:px-4">{symptoms}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-brand-700" aria-hidden />
            <h2 className="text-xl font-semibold text-slate-950">Injury severity ladder</h2>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            The platform thinks in severity bands because underwriting is different for soreness, imaging-confirmed injury, injections, and surgery.
          </p>
          <div className="mt-4 space-y-2">
            {pageSeverityLadder.map(([level, example]) => (
              <div key={level} className="grid grid-cols-[96px_1fr] rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <div className="font-semibold text-slate-950">{level}</div>
                <div className="leading-6 text-slate-700">{example}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-700" aria-hidden />
            <h2 className="text-xl font-semibold text-slate-950">Treatment progression</h2>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            Treatment progression tells a stronger story than a single symptom. ClearCaseIQ looks for escalation and continuity.
          </p>
          <ol className="mt-4 space-y-3">
            {pageTreatmentProgression.map((step, index) => (
              <li key={step.label} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">{index + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{step.label}</p>
                  <p className="text-sm leading-6 text-slate-700">{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="signals" className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand-50 p-2 text-brand-700">
              <TrendingUp className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Why this matters</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{page.cluster}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">{page.sections.whyItMatters}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">What to track</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {page.sections.whatToTrack.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
              <h3 className="text-sm font-semibold text-brand-950">How ClearCaseIQ helps</h3>
              <p className="mt-3 text-sm leading-7 text-brand-900">{page.sections.howClearCaseHelps}</p>
              <Link
                to="/assessment/start"
                className="mt-4 inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Start a free assessment
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-700" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-950">Underwriting signals captured</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {page.signals.map((signal) => (
              <span key={signal} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {signal}
              </span>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            ClearCaseIQ is not a law firm and does not provide legal advice. The assessment helps organize facts for education and potential attorney review.
          </div>
        </aside>
      </section>

      {deepDiveSections.length > 0 && (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Expanded topic intelligence</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Specific guidance for {page.cluster.toLowerCase()}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
            This section adds the page-specific substance behind the calculator, timeline, and intake flow. It is written around the actual signals this topic needs, not generic accident content.
          </p>
          <div className="mt-7 space-y-6">
            {deepDiveSections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{section.eyebrow}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{section.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">{section.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {section.bullets.slice(0, 8).map((item) => (
                    <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-700" aria-hidden />
            <h2 className="text-xl font-semibold text-slate-950">Factors that may affect case value</h2>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            Settlement value is not just the injury name. It is the combination of proof, treatment, liability, economics, and available coverage.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {pageSettlementDrivers.map((item) => (
              <li key={item} className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 divide-y divide-emerald-100 overflow-hidden rounded-2xl border border-emerald-100 bg-white">
            {pageSettlementValueDetails.map((detail) => (
              <details key={detail.label} className="group p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                  What increases settlement value? {detail.label}
                </summary>
                <p className="mt-2 text-sm leading-6 text-slate-700">{detail.copy}</p>
              </details>
            ))}
          </div>
          <Link
            to={estimatorCta}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Estimate potential settlement factors
            <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden />
            <h2 className="text-xl font-semibold text-slate-950">Insurance problems to watch for</h2>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            These are common friction points that can turn a simple claim into a disputed claim.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {pageInsuranceProblems.map((item) => (
              <li key={item} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 leading-6">{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-brand-100 bg-brand-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Structured intake CTA</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-brand-950">Turn uncertainty into underwriting signals.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-brand-900">
          The free assessment progressively asks about symptoms, imaging, treatment, surgery risk, missed work, liability, and insurance behavior. Each answer helps build the case-readiness report.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {pageIntakeSteps.map((step) => (
            <div key={step.label} className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">{step.label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{step.question}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {intakeQuestions.slice(0, 6).map((question) => (
            <div key={question} className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs font-medium leading-5 text-slate-600">
              Underwriting signal: {question}
            </div>
          ))}
        </div>
        <Link
          to="/assessment/start"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
        >
          {page.cta}
          <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden />
        </Link>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Attorney-side mirror</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">The same underwriting logic can power attorney review.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Plaintiff-facing intake should map directly into attorney-facing chronology, injury severity, medical economics, liability clarity, insurance complexity, and missing-document flags. That creates marketplace trust because the user experience and attorney dashboard are reading from the same signal set.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {['Severity score', 'Treatment chronology', 'Economic indicators', 'Liability evidence', 'Coverage complexity', 'Missing records'].map((item) => (
              <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{item}</div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Proprietary data narrative</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">From landing page to underwriting operating system.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            As more assessments are completed, ClearCaseIQ can explain patterns such as: cases with documented imaging, consistent treatment, clear liability, and economic damages are generally easier to route and review than cases with missing records or disputed causation.
          </p>
          <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm leading-7 text-brand-950">
            “Based on similar injury and treatment patterns” should become a defensible intelligence layer only when supported by real platform data, careful disclaimers, and attorney-reviewed interpretation.
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Related legal and medical topics</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Explore the litigation-underwriting knowledge graph</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          These internal links connect injury symptoms, treatment decisions, insurance disputes, liability, and settlement valuation into a stronger topical cluster.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {relatedLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
            >
              {link.label}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Common questions</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {allFaqs.map((faq) => (
            <div key={faq.q} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">{faq.q}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-brand-100 bg-slate-950 p-6 text-white shadow-card sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">Free preliminary review</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">See how your facts affect case readiness.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Answer a few questions, upload documents when available, and get a ClearCaseIQ report.</p>
          </div>
          <Link
            to="/assessment/start"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
          >
            {page.cta}
          </Link>
        </div>
      </section>
    </main>
  )
}
