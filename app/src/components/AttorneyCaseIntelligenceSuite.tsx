import { useState } from 'react'
import { Bot, CalendarDays, ClipboardCheck, FileText, Receipt, ShieldCheck } from 'lucide-react'
import { formatCurrency } from '../lib/formatters'
import type {
  AttorneyDashboardFile,
  AttorneyDashboardLead,
  AttorneyDashboardLeadFacts,
} from './attorneyDashboardShared'
import type { CaseCommandCenter } from '../lib/api'

type Props = {
  selectedLead: AttorneyDashboardLead
  selectedLeadFacts: AttorneyDashboardLeadFacts
  leadEvidenceFiles: AttorneyDashboardFile[]
  contactHistory: any[]
  leadCommandCenter: CaseCommandCenter | null
  deterministicChronology: { summary: string; timeline: string[]; providerGroups: string[] }
  readiness: {
    demandReadiness: number
    medicalReadiness: number
    documentReadiness: number
    insuranceReadiness: number
    defenseRisks: string[]
  }
  valueLow: number
  valueHigh: number
  onOpenWorkstream: (section: string) => void
  onDraftDemand?: () => Promise<void> | void
  demandDraftLoading: boolean
  onAskCopilot: (question: string) => Promise<void> | void
  copilotAnswer: { answer: string; sources: Array<{ label: string; detail: string }> } | null
  copilotLoading: boolean
}

const TABS = [
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  { id: 'readiness', label: 'Readiness', icon: ClipboardCheck },
  { id: 'medical', label: 'Medical & Bills', icon: Receipt },
  { id: 'demand', label: 'Demand Factory', icon: FileText },
  { id: 'companion', label: 'Case Companion', icon: Bot },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AttorneyCaseIntelligenceSuite({
  selectedLead,
  selectedLeadFacts,
  leadEvidenceFiles,
  contactHistory,
  leadCommandCenter,
  deterministicChronology,
  readiness,
  valueLow,
  valueHigh,
  onOpenWorkstream,
  onDraftDemand,
  demandDraftLoading,
  onAskCopilot,
  copilotAnswer,
  copilotLoading,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('timeline')
  const facts: any = selectedLeadFacts || {}
  const treatments = Array.isArray(facts.treatment) ? facts.treatment : []
  const files = [...(Array.isArray(selectedLead.assessment?.files) ? selectedLead.assessment.files : []), ...leadEvidenceFiles]
  const medicalFiles = files.filter((file) => isCategory(file, ['medical', 'medical_records']))
  const billFiles = files.filter((file) => isCategory(file, ['bills', 'medical_bill']))
  const policeFiles = files.filter((file) => isCategory(file, ['police', 'police_report']))
  const photoFiles = files.filter((file) => isCategory(file, ['photos', 'photo']))
  const extractedTotal = billFiles.reduce((sum, file: any) => sum + Number(file?.extractedData?.[0]?.totalAmount || file?.totalAmount || 0), 0)
  const demandChecklist = [
    { label: 'Liability narrative', ready: selectedLead.liabilityScore >= 0.55 || policeFiles.length > 0 },
    { label: 'Medical chronology', ready: treatments.length > 0 || deterministicChronology.timeline.length > 0 },
    { label: 'Bills summary', ready: billFiles.length > 0 || extractedTotal > 0 },
    { label: 'Exhibits', ready: files.length > 0 },
    { label: 'Client contact', ready: contactHistory.length > 0 },
    { label: 'Defense risks reviewed', ready: readiness.defenseRisks.length <= 1 },
  ]
  const timeline = buildTimeline({ selectedLead, files, contactHistory, deterministicChronology, leadCommandCenter })
  const suggestedPrompts = leadCommandCenter?.copilot?.suggestedPrompts?.length
    ? leadCommandCenter.copilot.suggestedPrompts
    : [
        'What are the strongest facts in this case?',
        'What is blocking demand readiness?',
        'What will the insurer attack?',
      ]

  return (
    <section className="premium-panel mb-4 overflow-hidden p-0">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="section-heading">
            <p className="section-kicker">Claims intelligence platform</p>
            <h3 className="section-title">Case Intelligence Suite</h3>
            <p className="section-copy">
              Timeline, workup readiness, medical/bills, demand package, and cited case companion in one attorney workspace.
            </p>
          </div>
          <div className="metric-card min-w-[170px] text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Demand readiness</p>
            <p className="text-2xl font-bold text-slate-900">{readiness.demandReadiness}%</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`workspace-tab ${
                  activeTab === tab.id
                    ? 'workspace-tab-active'
                    : ''
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-5">
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            {timeline.map((item) => (
              <div key={`${item.label}-${item.date}`} className="subtle-panel px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                  </div>
                  <span className="text-xs text-slate-500">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'readiness' && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <ReadinessCard label="Demand" value={readiness.demandReadiness} />
              <ReadinessCard label="Medical" value={readiness.medicalReadiness} />
              <ReadinessCard label="Documents" value={readiness.documentReadiness} />
              <ReadinessCard label="Insurance" value={readiness.insuranceReadiness} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ActionList title="Top blockers" items={[
                ...(leadCommandCenter?.missingItems || []).map((item: any) => item.label),
                ...readiness.defenseRisks,
              ].slice(0, 5)} empty="No major blockers detected." />
              <ActionList title="Recommended next actions" items={[
                leadCommandCenter?.nextBestAction?.title,
                readiness.documentReadiness < 75 ? 'Strengthen exhibits and document file' : null,
                readiness.medicalReadiness < 70 ? 'Review chronology and treatment gaps' : null,
                readiness.insuranceReadiness < 70 ? 'Confirm coverage and lien/subrogation facts' : null,
              ].filter(Boolean) as string[]} empty="Continue demand review." />
            </div>
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="subtle-panel p-4">
              <h4 className="font-semibold text-slate-900">Medical chronology</h4>
              <p className="mt-1 text-sm text-slate-600">{deterministicChronology.summary || 'No chronology summary available yet.'}</p>
              <div className="mt-3 space-y-2 text-sm">
                {(deterministicChronology.timeline || []).slice(0, 6).map((event) => (
                  <div key={event} className="border-l-2 border-brand-200 pl-3 text-slate-700">{event}</div>
                ))}
                {deterministicChronology.timeline.length === 0 && <p className="helpful-empty py-5">Upload medical records or bills to build chronology.</p>}
              </div>
            </div>
            <div className="subtle-panel p-4">
              <h4 className="font-semibold text-slate-900">Bills and records</h4>
              <dl className="mt-3 space-y-2 text-sm">
                <InfoRow label="Medical records" value={String(medicalFiles.length)} />
                <InfoRow label="Bill files" value={String(billFiles.length)} />
                <InfoRow label="Extracted bill total" value={extractedTotal > 0 ? formatCurrency(extractedTotal) : 'Not extracted'} />
                <InfoRow label="Providers detected" value={String(deterministicChronology.providerGroups?.length || 0)} />
              </dl>
              <button type="button" onClick={() => onOpenWorkstream('case-insights')} className="btn-outline mt-4">
                Open chronology and benchmarks
              </button>
            </div>
          </div>
        )}

        {activeTab === 'demand' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="subtle-panel p-4">
              <h4 className="font-semibold text-slate-900">Demand package factory</h4>
              <p className="mt-1 text-sm text-slate-600">
                Working value range: {valueLow || valueHigh ? `${formatCurrency(valueLow)} to ${formatCurrency(valueHigh)}` : 'Not available'}.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {demandChecklist.map((item) => (
                  <div key={item.label} className={item.ready ? 'status-pill-success' : 'status-pill-warning'}>
                    {item.ready ? 'Ready' : 'Needs work'}: {item.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="subtle-panel p-4">
              <h4 className="font-semibold text-slate-900">Package actions</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onOpenWorkstream('demand')} className="btn-outline">
                  Open demand workspace
                </button>
                {onDraftDemand && (
                  <button type="button" onClick={onDraftDemand} disabled={demandDraftLoading} className="btn-primary disabled:opacity-50">
                    {demandDraftLoading ? 'Drafting...' : 'Draft demand'}
                  </button>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-600">
                The demand package should include liability narrative, injury summary, bill table, exhibit list, insurance strategy, and attorney review checklist.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'companion' && (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="subtle-panel p-4">
              <h4 className="font-semibold text-slate-900">Ask Case Companion</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedPrompts.slice(0, 5).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onAskCopilot(prompt)}
                    disabled={copilotLoading}
                    className="workspace-tab text-xs disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <div className="subtle-panel p-4">
              <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                Cited answer
              </h4>
              {copilotAnswer ? (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-slate-800">{copilotAnswer.answer}</p>
                  {copilotAnswer.sources.length > 0 && (
                    <div className="space-y-2">
                      {copilotAnswer.sources.map((source) => (
                        <div key={source.label} className="metric-card px-3 py-2 text-xs text-slate-600">
                          <span className="font-semibold text-slate-900">{source.label}:</span> {source.detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="helpful-empty mt-3 py-5">
                  Ask a question to get an answer grounded in intake facts, documents, chronology, and case activity.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function ReadinessCard({ label, value }: { label: string; value: number }) {
  const tone = value >= 75 ? 'bg-green-50 border-green-200 text-green-700' : value >= 45 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'
  return (
    <div className={`metric-card ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}%</p>
    </div>
  )
}

function ActionList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="subtle-panel p-4">
      <h4 className="font-semibold text-slate-900">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {items.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      ) : (
        <p className="helpful-empty mt-3 py-5">{empty}</p>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function isCategory(file: AttorneyDashboardFile, categories: string[]) {
  const category = String(file?.category || file?.subcategory || '').toLowerCase()
  return categories.some((item) => category.includes(item))
}

function buildTimeline({
  selectedLead,
  files,
  contactHistory,
  deterministicChronology,
  leadCommandCenter,
}: {
  selectedLead: AttorneyDashboardLead
  files: AttorneyDashboardFile[]
  contactHistory: any[]
  deterministicChronology: { timeline: string[] }
  leadCommandCenter: CaseCommandCenter | null
}) {
  return [
    {
      label: 'Case submitted',
      detail: `${String(selectedLead.assessment?.claimType || 'Case').replace(/_/g, ' ')} in ${[selectedLead.assessment?.venueCounty, selectedLead.assessment?.venueState].filter(Boolean).join(', ') || 'unknown venue'}.`,
      date: formatDate(selectedLead.submittedAt || selectedLead.assessment?.createdAt),
    },
    {
      label: 'Attorney routed / accepted',
      detail: selectedLead.status === 'submitted' ? 'Awaiting attorney decision.' : `Current status: ${selectedLead.status}.`,
      date: formatDate(selectedLead.updatedAt || selectedLead.submittedAt),
    },
    {
      label: 'Documents ingested',
      detail: `${files.length} file${files.length === 1 ? '' : 's'} in the evidence file.`,
      date: files[0]?.createdAt ? formatDate(files[0].createdAt) : 'Pending',
    },
    {
      label: 'Medical chronology',
      detail: deterministicChronology.timeline.length > 0 ? `${deterministicChronology.timeline.length} chronology event${deterministicChronology.timeline.length === 1 ? '' : 's'} detected.` : 'No chronology events yet.',
      date: deterministicChronology.timeline[0] || 'Pending',
    },
    {
      label: 'Client contact',
      detail: contactHistory.length > 0 ? `${contactHistory.length} contact event${contactHistory.length === 1 ? '' : 's'} logged.` : 'No plaintiff contact logged yet.',
      date: contactHistory[0]?.createdAt ? formatDate(contactHistory[0].createdAt) : 'Pending',
    },
    {
      label: 'Demand posture',
      detail: leadCommandCenter?.readiness ? `${leadCommandCenter.readiness.score}% readiness: ${leadCommandCenter.readiness.label}.` : 'Readiness not calculated yet.',
      date: 'Current',
    },
  ]
}

function formatDate(value?: string) {
  if (!value) return 'Pending'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
