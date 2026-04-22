import { Calendar, ClipboardList } from 'lucide-react'
import { formatCurrency } from '../lib/formatters'

type AttorneyDashboardWorkstreamCaseInsightsProps = {
  medicalChronology: any[]
  casePreparation: any
  settlementBenchmarks: any
}

export default function AttorneyDashboardWorkstreamCaseInsights({
  medicalChronology,
  casePreparation,
  settlementBenchmarks,
}: AttorneyDashboardWorkstreamCaseInsightsProps) {
  return (
    <div className="rounded-md border border-gray-200 p-4 space-y-6">
      <h4 className="text-sm font-semibold text-gray-900">Case Insights</h4>
      <p className="text-xs text-gray-500">Medical chronology, case preparation, and settlement benchmarks.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-md border border-gray-200 p-3">
          <h5 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Medical Chronology
          </h5>
          <div className="space-y-1.5 text-xs">
            {medicalChronology.length > 0 ? (
              medicalChronology.map((event: any, idx: number) => (
                <div key={event.id || idx} className="flex items-start justify-between gap-2 border-l-2 border-brand-200 pl-2 py-0.5">
                  <div>
                    <span className="font-medium text-gray-900">{event.label}</span>
                    {event.provider ? <span className="text-gray-500 ml-1">({event.provider})</span> : null}
                  </div>
                  <span className="text-gray-500 shrink-0">{event.date || '—'}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No chronology events yet.</div>
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
        <h5 className="text-xs font-semibold text-gray-900 mb-2">Settlement Benchmarks</h5>
        {settlementBenchmarks ? (
          <div className="space-y-2 text-xs">
            <p className="text-gray-600">
              {settlementBenchmarks.claimType} in {settlementBenchmarks.venueState} — {settlementBenchmarks.count} records
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
