import { useState } from 'react'
import { Activity, Calendar, ClipboardList, FileText, Pill, Scan, Scissors, Stethoscope, Trophy } from 'lucide-react'
import { formatCurrency } from '../lib/formatters'
import { updateLeadDecisionOutcome, type MedicalChronologySummary } from '../lib/api'

type MedicalChronologyEvent = {
  id?: string
  date?: string | null
  label?: string
  source?: string
  details?: string
  provider?: string
  amount?: number
  sourceFileName?: string
  extractionConfidence?: 'documented' | 'estimated' | 'needs_review'
  confidence?: 'documented' | 'estimated' | 'needs_review'
  uncertaintyNote?: string
  plaintiffNote?: string
}

type AttorneyDashboardWorkstreamCaseInsightsProps = {
  leadId?: string
  medicalChronology: MedicalChronologyEvent[]
  medicalChronologySummary?: MedicalChronologySummary | null
  casePreparation: any
  decisionMemory?: any
  settlementBenchmarks: any
}

function formatChronologyDate(value?: string | null) {
  if (!value) return 'Date needs review'
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getConfidenceMeta(event: MedicalChronologyEvent) {
  const confidence = event.confidence || event.extractionConfidence
  if (confidence === 'documented') {
    return {
      label: 'Documented',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dotClassName: 'border-emerald-200 bg-emerald-500',
      lineClassName: 'bg-emerald-100',
    }
  }
  if (confidence === 'needs_review') {
    return {
      label: 'Needs review',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      dotClassName: 'border-amber-200 bg-amber-500',
      lineClassName: 'bg-amber-100',
    }
  }
  return {
    label: 'Estimated',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
    dotClassName: 'border-slate-200 bg-slate-400',
    lineClassName: 'bg-slate-100',
  }
}

function getSourceLabel(event: MedicalChronologyEvent) {
  if (event.sourceFileName) return event.sourceFileName
  if (event.source === 'medical_record') return 'Uploaded medical record'
  if (event.source === 'treatment') return 'Plaintiff intake'
  if (event.source === 'incident') return 'Incident timeline'
  return 'Uploaded evidence'
}

function normalizeExtractedText(value?: string) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function extractDetailValue(text: string, label: string) {
  const labels = [
    'Date of Service',
    'Provider',
    'Diagnosis',
    'Treatment',
    'Amount Due',
    'ICD-10',
    'CPT',
    'Status',
  ]
  const stopLabels = labels.filter((item) => item !== label).join('|')
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`${escapedLabel}:\\s*([\\s\\S]*?)(?=\\s+(?:${stopLabels}):|$)`, 'i')
  const match = text.match(pattern)
  return match?.[1]?.trim()
}

function getCleanMedicalFacts(event: MedicalChronologyEvent) {
  const text = normalizeExtractedText(event.details)
  if (!text) return []

  const fields = [
    { label: 'Date of service', value: extractDetailValue(text, 'Date of Service') },
    { label: 'Provider', value: event.provider ? undefined : extractDetailValue(text, 'Provider') },
    { label: 'Diagnosis', value: extractDetailValue(text, 'Diagnosis') },
    { label: 'Treatment', value: extractDetailValue(text, 'Treatment') },
    { label: 'ICD-10', value: extractDetailValue(text, 'ICD-10') },
    { label: 'CPT', value: extractDetailValue(text, 'CPT') },
    {
      label: 'Amount due',
      value: typeof event.amount === 'number' ? formatCurrency(event.amount) : extractDetailValue(text, 'Amount Due'),
    },
    { label: 'Status', value: extractDetailValue(text, 'Status') },
  ]

  return fields.filter((field): field is { label: string; value: string } => Boolean(field.value))
}

function ChronologySummaryChips({ items }: { items: string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700">
          {item}
        </span>
      ))}
    </div>
  )
}

function MedicalChronologySummaryPanel({ summary }: { summary: MedicalChronologySummary }) {
  const sections: { key: string; icon: any; title: string; items: string[] }[] = [
    { key: 'providers', icon: Stethoscope, title: 'Providers', items: summary.providers },
    { key: 'diagnoses', icon: Activity, title: 'Diagnoses (ICD-10)', items: summary.diagnoses.map((d) => `${d.label} [${d.code}]`) },
    { key: 'procedures', icon: FileText, title: 'Procedures (CPT)', items: summary.procedures.map((p) => `${p.label} [${p.code}]`) },
    { key: 'medications', icon: Pill, title: 'Medications', items: summary.medications },
    { key: 'imaging', icon: Scan, title: 'Imaging', items: summary.imaging },
    { key: 'surgeries', icon: Scissors, title: 'Surgeries', items: summary.surgeries },
  ]
  const activeSections = sections.filter((s) => s.items.length > 0)
  const hasAnything =
    activeSections.length > 0 ||
    summary.visitCount > 0 ||
    summary.billedTotal > 0 ||
    summary.treatmentGaps.length > 0

  if (!hasAnything) return null

  return (
    <div className="rounded-md border border-brand-100 bg-brand-50/40 p-4">
      <h5 className="text-sm font-semibold text-gray-900">Extracted Medical Summary</h5>
      <p className="mt-0.5 text-xs text-gray-500">
        Auto-extracted from uploaded records &amp; bills — providers, diagnoses, procedures, medications, imaging, surgeries, bills, and treatment gaps.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <div className="text-gray-500">Visits</div>
          <div className="mt-0.5 font-semibold text-gray-900">{summary.visitCount}</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <div className="text-gray-500">Providers</div>
          <div className="mt-0.5 font-semibold text-gray-900">{summary.providers.length}</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <div className="text-gray-500">Billed total</div>
          <div className="mt-0.5 font-semibold text-gray-900">{summary.billedTotal > 0 ? formatCurrency(summary.billedTotal) : '—'}</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <div className="text-gray-500">Treatment gaps</div>
          <div className="mt-0.5 font-semibold text-gray-900">{summary.treatmentGaps.length}</div>
        </div>
      </div>

      {activeSections.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {activeSections.map((section) => {
            const Icon = section.icon
            return (
              <div key={section.key} className="rounded-md border border-gray-200 bg-white p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                  <Icon className="h-3.5 w-3.5 text-brand-600" />
                  {section.title}
                  <span className="text-[11px] font-normal text-gray-400">({section.items.length})</span>
                </div>
                <ChronologySummaryChips items={section.items} />
              </div>
            )
          })}
        </div>
      ) : null}

      {summary.treatmentGaps.length > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <span className="font-semibold">Gaps in treatment:</span>{' '}
          {summary.treatmentGaps.map((g) => `${g.gapDays} days (${g.startDate} → ${g.endDate})`).join('; ')}
        </div>
      ) : null}
    </div>
  )
}

const OUTCOME_OPTIONS = [
  { value: '', label: 'Select outcome…' },
  { value: 'consulted', label: 'Consulted' },
  { value: 'retained', label: 'Retained' },
  { value: 'settled', label: 'Settled' },
  { value: 'won', label: 'Won at trial' },
  { value: 'lost', label: 'Lost / not pursued' },
]

function OutcomeFeedbackPanel({ leadId, decisionMemory }: { leadId: string; decisionMemory?: any }) {
  const [outcomeStatus, setOutcomeStatus] = useState<string>(decisionMemory?.outcomeStatus || '')
  const [retained, setRetained] = useState<boolean>(Boolean(decisionMemory?.retained))
  const [settlementAmount, setSettlementAmount] = useState<string>(
    decisionMemory?.settlementAmount != null ? String(decisionMemory.settlementAmount) : '',
  )
  const [wentToTrial, setWentToTrial] = useState<boolean>(Boolean(decisionMemory?.wentToTrial))
  const [satisfaction, setSatisfaction] = useState<number>(decisionMemory?.attorneySatisfaction || 0)
  const [notes, setNotes] = useState<string>(decisionMemory?.attorneySatisfactionNotes || decisionMemory?.outcomeNotes || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateLeadDecisionOutcome(leadId, {
        outcomeStatus: outcomeStatus || null,
        outcomeNotes: notes || undefined,
        retained,
        settlementAmount: settlementAmount ? Number(settlementAmount) : undefined,
        wentToTrial,
        attorneySatisfaction: satisfaction || undefined,
        attorneySatisfactionNotes: notes || undefined,
      })
      setSaved(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save outcome')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <h5 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
        <Trophy className="h-4 w-4" />
        Outcome &amp; Feedback
      </h5>
      <p className="mt-0.5 text-xs text-gray-500">Record the case resolution and your satisfaction. Settlement/verdict amounts feed the valuation model.</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs">
          <span className="text-gray-600">Outcome</span>
          <select
            value={outcomeStatus}
            onChange={(e) => setOutcomeStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
          >
            {OUTCOME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label className="text-xs">
          <span className="text-gray-600">Settlement / verdict amount</span>
          <input
            type="number"
            min="0"
            value={settlementAmount}
            onChange={(e) => setSettlementAmount(e.target.value)}
            placeholder="e.g. 75000"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-700">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={retained} onChange={(e) => setRetained(e.target.checked)} />
          Retained
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={wentToTrial} onChange={(e) => setWentToTrial(e.target.checked)} />
          Went to trial
        </label>
      </div>

      <div className="mt-3">
        <span className="text-xs text-gray-600">Your satisfaction</span>
        <div className="mt-1 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSatisfaction(n === satisfaction ? 0 : n)}
              className={`h-8 w-8 rounded-md border text-xs font-semibold ${
                satisfaction >= n && satisfaction > 0
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-gray-300 bg-white text-gray-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="mt-3 w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save outcome'}
        </button>
        {saved ? <span className="text-xs font-medium text-emerald-600">Saved</span> : null}
        {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
      </div>
    </div>
  )
}

export default function AttorneyDashboardWorkstreamCaseInsights({
  leadId,
  medicalChronology,
  medicalChronologySummary,
  casePreparation,
  decisionMemory,
  settlementBenchmarks,
}: AttorneyDashboardWorkstreamCaseInsightsProps) {
  const datedEvents = medicalChronology.filter((event) => event.date && !Number.isNaN(Date.parse(event.date)))
  const firstDate = datedEvents[0]?.date
  const lastDate = datedEvents[datedEvents.length - 1]?.date
  const documentedTotal = medicalChronology.reduce((sum, event) => sum + (typeof event.amount === 'number' ? event.amount : 0), 0)
  const documentedCount = medicalChronology.filter((event) => (event.confidence || event.extractionConfidence) === 'documented').length
  const benchmarkCount = settlementBenchmarks?.count ?? 0
  const benchmarkSampleLabel = benchmarkCount > 0 && benchmarkCount < 20 ? 'Limited benchmark sample' : 'Settlement Benchmarks'

  return (
    <div className="rounded-md border border-gray-200 p-4 space-y-6">
      <h4 className="text-sm font-semibold text-gray-900">Case Insights</h4>
      <p className="text-xs text-gray-500">Medical chronology, case preparation, and settlement benchmarks.</p>

      {medicalChronologySummary ? <MedicalChronologySummaryPanel summary={medicalChronologySummary} /> : null}

      {leadId ? <OutcomeFeedbackPanel leadId={leadId} decisionMemory={decisionMemory} /> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-md border border-gray-200 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h5 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Medical Chronology
              </h5>
              <p className="mt-1 text-xs text-gray-500">Treatment events pulled from uploaded records, bills, and intake facts.</p>
            </div>
            {medicalChronology.length > 0 ? (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                {medicalChronology.length} event{medicalChronology.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>

          {medicalChronology.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <div className="text-gray-500">First care</div>
                <div className="mt-0.5 font-semibold text-gray-900">{formatChronologyDate(firstDate)}</div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <div className="text-gray-500">Latest care</div>
                <div className="mt-0.5 font-semibold text-gray-900">{formatChronologyDate(lastDate)}</div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <div className="text-gray-500">Documented</div>
                <div className="mt-0.5 font-semibold text-gray-900">{documentedCount}</div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <div className="text-gray-500">Bills found</div>
                <div className="mt-0.5 font-semibold text-gray-900">{documentedTotal > 0 ? formatCurrency(documentedTotal) : '—'}</div>
              </div>
            </div>
          ) : null}

          <div className="space-y-0 text-xs">
            {medicalChronology.length > 0 ? (
              medicalChronology.map((event, idx) => {
                const cleanFacts = getCleanMedicalFacts(event)
                const rawExtractedText = normalizeExtractedText(event.details)
                const confidenceMeta = getConfidenceMeta(event)
                const isLastEvent = idx === medicalChronology.length - 1

                return (
                  <div key={event.id || idx} className="grid grid-cols-[86px_24px_minmax(0,1fr)] gap-2 sm:grid-cols-[96px_28px_minmax(0,1fr)]">
                    <div className="pt-1 text-right">
                      <div className="text-xs font-semibold text-gray-900">{formatChronologyDate(event.date)}</div>
                      <div className="mt-0.5 text-[11px] text-gray-500">{confidenceMeta.label}</div>
                    </div>

                    <div className="relative flex justify-center">
                      {!isLastEvent ? (
                        <div className={`absolute bottom-0 top-6 w-px ${confidenceMeta.lineClassName}`} />
                      ) : null}
                      <div className={`relative z-10 mt-1 h-4 w-4 rounded-full border-4 ${confidenceMeta.dotClassName}`} />
                    </div>

                    <div className="pb-4">
                      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-900">{event.label || 'Medical event'}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${confidenceMeta.className}`}>
                                {confidenceMeta.label}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-gray-600">
                              {event.provider ? <span>Provider: <span className="font-medium text-gray-800">{event.provider}</span></span> : null}
                              <span>Source: <span className="font-medium text-gray-800">{getSourceLabel(event)}</span></span>
                              {typeof event.amount === 'number' ? (
                                <span>Amount: <span className="font-medium text-gray-800">{formatCurrency(event.amount)}</span></span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {cleanFacts.length > 0 ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {cleanFacts.map((fact) => (
                              <div key={`${event.id || idx}-${fact.label}`} className="rounded-md bg-slate-50 px-2.5 py-2">
                                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{fact.label}</div>
                                <div className="mt-0.5 text-xs font-medium leading-snug text-slate-900">{fact.value}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-gray-500">Structured details were not extracted yet. Review the source document for full context.</p>
                        )}

                        {rawExtractedText ? (
                          <details className="mt-3 text-xs text-gray-600">
                            <summary className="cursor-pointer font-medium text-brand-700 hover:text-brand-800">
                              View extracted text
                            </summary>
                            <p className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-2 leading-relaxed text-gray-700">
                              {rawExtractedText}
                            </p>
                          </details>
                        ) : null}

                        {event.uncertaintyNote || event.plaintiffNote ? (
                          <div className="mt-2 space-y-1 text-xs">
                            {event.uncertaintyNote ? <p className="text-amber-700">{event.uncertaintyNote}</p> : null}
                            {event.plaintiffNote ? <p className="text-gray-600">Plaintiff note: {event.plaintiffNote}</p> : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 p-4 text-gray-500">
                No chronology events yet. Upload medical records or bills to build a treatment timeline.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-3">
          <h5 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" />
            Case Preparation
          </h5>
          {casePreparation ? (
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-gray-600 mb-0.5">
                  <span>Readiness</span>
                  <span className="font-medium">{casePreparation.readinessScore}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-brand-600" style={{ width: `${casePreparation.readinessScore}%` }} />
                </div>
              </div>
              {casePreparation.missingDocs?.length > 0 ? (
                <div>
                  <span className="font-medium text-gray-700">Missing:</span>
                  <ul className="list-disc list-inside text-gray-600 mt-0.5">
                    {casePreparation.missingDocs.map((d: any) => (
                      <li key={d.key}>{d.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {casePreparation.treatmentGaps?.length > 0 ? (
                <div>
                  <span className="font-medium text-amber-700">Treatment gaps:</span>
                  <ul className="list-disc list-inside text-gray-600 mt-0.5">
                    {casePreparation.treatmentGaps.map((g: any, i: number) => (
                      <li key={i}>{g.gapDays} days</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {casePreparation.strengths?.length > 0 ? (
                <div>
                  <span className="font-medium text-green-700">Strengths:</span>
                  <ul className="list-disc list-inside text-gray-600 mt-0.5">
                    {casePreparation.strengths.map((s: string) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
              ) : null}
              {casePreparation.weaknesses?.length > 0 ? (
                <div>
                  <span className="font-medium text-amber-700">Weaknesses:</span>
                  <ul className="list-disc list-inside text-gray-600 mt-0.5">
                    {casePreparation.weaknesses.map((w: string) => <li key={w}>{w}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-gray-500">Loading…</div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-gray-200 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h5 className="text-xs font-semibold text-gray-900">{benchmarkSampleLabel}</h5>
          {benchmarkCount > 0 && benchmarkCount < 20 ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Early sample
            </span>
          ) : null}
        </div>
        {settlementBenchmarks ? (
          <div className="space-y-2 text-xs">
            <p className="text-gray-600">
              {settlementBenchmarks.claimType} in {settlementBenchmarks.venueState} — {settlementBenchmarks.count} record{settlementBenchmarks.count === 1 ? '' : 's'}
              {benchmarkCount > 0 && benchmarkCount < 20 ? '. Use as directional context, not a statistically strong benchmark.' : ''}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded border border-gray-200 p-1.5">
                <div className="text-gray-500">25th %ile</div>
                <div className="font-semibold">{formatCurrency(settlementBenchmarks.p25)}</div>
              </div>
              <div className="rounded border border-gray-200 p-1.5">
                <div className="text-gray-500">Median</div>
                <div className="font-semibold">{formatCurrency(settlementBenchmarks.p50)}</div>
              </div>
              <div className="rounded border border-gray-200 p-1.5">
                <div className="text-gray-500">75th %ile</div>
                <div className="font-semibold">{formatCurrency(settlementBenchmarks.p75)}</div>
              </div>
              <div className="rounded border border-gray-200 p-1.5">
                <div className="text-gray-500">90th %ile</div>
                <div className="font-semibold">{formatCurrency(settlementBenchmarks.p90)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No benchmark data available.</div>
        )}
      </div>
    </div>
  )
}
