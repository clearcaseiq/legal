import { AlertTriangle, FileText, Shield, TrendingUp } from 'lucide-react'
import type { CaseCommandCenter } from '../lib/api'

type Props = {
  summary: CaseCommandCenter | null
  loading?: boolean
}

export default function PlaintiffCaseCommandCenter({ summary, loading }: Props) {
  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading case summary...</div>
  }

  if (!summary) return null
  const safeSummary = (summary ?? {}) as Partial<CaseCommandCenter>
  const stage: Partial<CaseCommandCenter['stage']> = safeSummary.stage ?? {}
  const readiness: Partial<CaseCommandCenter['readiness']> = safeSummary.readiness ?? {}
  const valueStory: Partial<CaseCommandCenter['valueStory']> = safeSummary.valueStory ?? {}
  const liabilityStory: Partial<CaseCommandCenter['liabilityStory']> = safeSummary.liabilityStory ?? {}
  const coverageStory: Partial<CaseCommandCenter['coverageStory']> = safeSummary.coverageStory ?? {}
  const medicalCostBenchmark: Partial<CaseCommandCenter['medicalCostBenchmark']> = safeSummary.medicalCostBenchmark ?? {}
  const missingItems = Array.isArray(summary.missingItems) ? summary.missingItems : []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Decision-Ready Summary</div>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{stage.plaintiffTitle ?? 'Case summary'}</h3>
          <p className="mt-1 text-sm text-slate-600">{stage.plaintiffDetail ?? 'We are still assembling your case summary.'}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">Readiness</div>
          <div className="text-lg font-semibold text-slate-900">{typeof readiness.score === 'number' ? `${readiness.score}%` : '—'}</div>
          <div className="text-xs text-slate-600">{readiness.label ?? 'Pending'}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <TrendingUp className="h-4 w-4" />
            Value story
          </div>
          <p className="mt-2 text-sm text-emerald-900">{valueStory.detail ?? 'Value details are not available yet.'}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <Shield className="h-4 w-4" />
            Liability view
          </div>
          <p className="mt-2 text-sm text-blue-900">{liabilityStory.detail ?? 'Liability details are not available yet.'}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Coverage path
          </div>
          <p className="mt-2 text-sm text-amber-900">{coverageStory.detail ?? 'Coverage details are not available yet.'}</p>
        </div>
      </div>

      {(medicalCostBenchmark.status ?? 'unavailable') !== 'unavailable' ? (
        <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50 p-4">
          <div className="text-sm font-semibold text-violet-900">Medical cost benchmark</div>
          <p className="mt-2 text-sm text-violet-900">{medicalCostBenchmark.detail ?? 'Benchmark details are not available yet.'}</p>
          <div className="mt-2 text-xs text-violet-800">
            Matched {medicalCostBenchmark.matchedEventCount ?? 0} of {medicalCostBenchmark.totalChronologyEvents ?? 0} treatment events
            {typeof medicalCostBenchmark.benchmarkTypicalTotal === 'number'
              ? ` • Typical benchmark total ${medicalCostBenchmark.benchmarkTypicalTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`
              : ''}
          </div>
          <div className="mt-2 text-xs text-violet-700">{medicalCostBenchmark.caution ?? ''}</div>
        </div>
      ) : null}

      {missingItems.length > 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-brand-600" />
            What would help next
          </div>
          <div className="mt-3 space-y-2">
            {missingItems.slice(0, 3).map((item) => (
              <div key={item.key} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-sm font-medium text-slate-900">{item.label}</div>
                <div className="mt-1 text-sm text-slate-600">{item.plaintiffReason}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
