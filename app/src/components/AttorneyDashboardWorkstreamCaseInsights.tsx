import { Calendar, ClipboardList } from 'lucide-react'
import { formatCurrency } from '../lib/formatters'

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
  medicalChronology: MedicalChronologyEvent[]
  casePreparation: any
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

export default function AttorneyDashboardWorkstreamCaseInsights({
  medicalChronology,
  casePreparation,
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
