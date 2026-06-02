import { ChevronRight } from 'lucide-react'
import { formatCurrency, formatPercentage } from '../lib/formatters'

type AttorneyDashboardAnalyticsTabProps = {
  dashboardData: any
  decisionSummary: any
  analyticsIntel: any
  profile?: any
}

export default function AttorneyDashboardAnalyticsTab({
  dashboardData,
  decisionSummary,
  analyticsIntel,
  profile,
}: AttorneyDashboardAnalyticsTabProps) {
  const readinessLeads = Array.isArray(dashboardData?.recentLeads) ? dashboardData.recentLeads : []
  const avgReadiness = readinessLeads.length
    ? Math.round(readinessLeads.reduce((sum: number, lead: any) => sum + Number(lead?.demandReadiness?.score || 0), 0) / readinessLeads.length)
    : 0
  const demandReadyCount = readinessLeads.filter((lead: any) => Number(lead?.demandReadiness?.score || 0) >= 85).length
  const docBlockedCount = readinessLeads.filter((lead: any) => (lead?.demandReadiness?.blockers || []).some((blocker: any) => {
    const key = blocker.key || blocker.type || ''
    return key === 'missing_documents' || key.includes('document') || key.includes('records') || key.includes('report')
  })).length
  const overdueTaskCount = readinessLeads.reduce((sum: number, lead: any) => sum + Number(lead?.demandReadiness?.overdueTaskCount || 0), 0)
  const staleContactCount = readinessLeads.filter((lead: any) => (lead?.demandReadiness?.blockers || []).some((blocker: any) => (blocker.key || blocker.type) === 'stale_contact')).length
  const funnel = dashboardData?.funnel || {}
  const activeCases = dashboardData?.activeCases || {}
  const leadsReceived = Number(funnel.matched ?? dashboardData?.dashboard?.totalLeadsReceived ?? readinessLeads.length ?? 0)
  const acceptedLeads = Number(funnel.accepted ?? dashboardData?.dashboard?.totalLeadsAccepted ?? 0)
  const consultedLeads = Number(funnel.consultScheduled ?? funnel.consulted ?? activeCases.consultScheduled ?? 0)
  const retainedLeads = Number(funnel.retained ?? activeCases.retained ?? 0)
  const acceptanceRate = leadsReceived > 0 ? Math.round((acceptedLeads / leadsReceived) * 100) : 0
  const consultRate = acceptedLeads > 0 ? Math.round((consultedLeads / acceptedLeads) * 100) : 0
  const retainRate = consultedLeads > 0 ? Math.round((retainedLeads / consultedLeads) * 100) : 0
  const openCaseFeePipeline = Math.round(Number(dashboardData?.pipelineValue || 0))
  const casesInNegotiation = readinessLeads.filter((lead: any) => ['consulted', 'retained'].includes(lead?.status || '')).length
  const liveConversionRate = Number(dashboardData?.analytics?.conversionRate || 0) / 100
  const observedRetainedRate = leadsReceived > 0 ? retainedLeads / leadsReceived : 0
  const forecastRetainedRate = liveConversionRate || observedRetainedRate
  const likelyRetainedThisMonth = Math.round(Math.max(acceptedLeads, consultedLeads) * forecastRetainedRate)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
  const matchesLast30Days = readinessLeads.filter((lead: any) => {
    const submittedAt = lead?.submittedAt ? new Date(lead.submittedAt).getTime() : 0
    return submittedAt >= thirtyDaysAgo
  }).length
  const expectedNewMatchesNext30Days = Math.round(matchesLast30Days || Number(dashboardData?.newCaseMatches?.length || 0))
  const expectedRetainedCases = Math.round(expectedNewMatchesNext30Days * forecastRetainedRate)
  const averageFeePipeline = Number(dashboardData?.analytics?.averageFee || 0) || (acceptedLeads > 0 ? openCaseFeePipeline / acceptedLeads : 0)
  const expectedFeePipeline = Math.round(expectedRetainedCases * averageFeePipeline)
  const forecastConfidence = leadsReceived === 0 ? 'No data yet' : leadsReceived >= 20 ? 'High' : leadsReceived >= 5 ? 'Medium' : 'Low'
  const attorneyProfile = dashboardData?.dashboard?.attorney?.attorneyProfile || dashboardData?.dashboard?.attorney?.profile || profile || {}
  const attorneyRating = Number(
    dashboardData?.qualityMetrics?.rating ??
    dashboardData?.roiAnalytics?.attorneyRating ??
    attorneyProfile?.averageRating ??
    dashboardData?.dashboard?.attorney?.averageRating ??
    0
  )
  const responseTimeHours = Number(dashboardData?.dashboard?.attorney?.responseTimeHours || 0)
  const derivedResponseSpeedScore = responseTimeHours > 0
    ? Math.max(0, Math.min(1, 1 - (Math.min(responseTimeHours, 48) / 48)))
    : 0
  const responseSpeedScore = Number(attorneyProfile?.responseSpeedScore ?? derivedResponseSpeedScore)
  const profileAcceptanceScore = Number(attorneyProfile?.historicalAcceptanceRate ?? (acceptanceRate / 100))
  const conversionScore = Number(attorneyProfile?.recentConversionScore ?? liveConversionRate)
  const ratingScore = Math.min(1, Math.max(0, attorneyRating / 5))
  const marketplaceScore = Math.round(
    Math.min(100, Math.max(0,
      (ratingScore * 35) +
      (Math.min(1, Math.max(0, responseSpeedScore)) * 20) +
      (Math.min(1, Math.max(0, profileAcceptanceScore)) * 25) +
      (Math.min(1, Math.max(0, conversionScore)) * 20)
    ))
  )
  const responseSpeedLabel = responseSpeedScore >= 0.85 ? 'Excellent' : responseSpeedScore >= 0.65 ? 'Strong' : responseSpeedScore > 0 ? 'Improving' : 'No data yet'
  const acceptanceRateLabel = acceptanceRate >= 75 ? 'Excellent' : acceptanceRate >= 50 ? 'Strong' : acceptanceRate > 0 ? 'Improving' : 'No data yet'
  const satisfactionLabel = attorneyRating >= 4.5 ? 'Excellent' : attorneyRating >= 4 ? 'Strong' : attorneyRating > 0 ? 'Improving' : 'No data yet'
  const plaintiffRankingLabel = marketplaceScore >= 90
    ? 'Top 5%'
    : marketplaceScore >= 80
    ? 'Top 10%'
    : marketplaceScore >= 70
    ? 'Top 25%'
    : marketplaceScore > 0
    ? 'Building rank'
    : 'Not ranked yet'

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Consult Conversion Snapshot</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Acceptance rate</div>
            <div className="text-gray-900">{acceptanceRate}%</div>
          </div>
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Accepted to consult</div>
            <div className="text-gray-900">{consultRate}%</div>
          </div>
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Consult to retained</div>
            <div className="text-gray-900">{retainRate}%</div>
          </div>
          <div className="rounded-md border border-gray-100 p-3 md:col-span-1">
            <div className="text-gray-500">Marketplace Ranking</div>
            <div className="text-gray-900">Overall Attorney Score: {marketplaceScore}</div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="grid gap-3 text-sm md:grid-cols-4">
            {[
              ['Response Speed', responseSpeedLabel],
              ['Acceptance Rate', acceptanceRateLabel],
              ['Client Satisfaction', satisfactionLabel],
              ['Plaintiff Ranking', plaintiffRankingLabel],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-white/70 px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{label}</div>
                <div className="mt-1 text-base font-semibold text-gray-900">{value}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-600">
            Ranking updates from live response, acceptance, satisfaction, and conversion signals.
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Operations Pulse</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Avg readiness</div>
            <div className="text-gray-900">{avgReadiness}%</div>
          </div>
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Demand-ready files</div>
            <div className="text-gray-900">{demandReadyCount}</div>
          </div>
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Doc-blocked files</div>
            <div className="text-gray-900">{docBlockedCount}</div>
          </div>
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Overdue tasks</div>
            <div className="text-gray-900">{overdueTaskCount}</div>
          </div>
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Stale contact files</div>
            <div className="text-gray-900">{staleContactCount}</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          This section rolls up blocker and readiness signals from the attorney daily queue to show portfolio operating pressure, not just financial output.
        </div>
      </div>

      <details className="card group">
        <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <h3 className="text-lg font-medium text-gray-900">Decision Intelligence & Memory</h3>
          <ChevronRight className="h-5 w-5 text-gray-400 group-open:rotate-90 transition-transform" />
        </summary>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Portfolio evaluation across all cases</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-gray-100 p-3">
              <div className="text-gray-500">Decisions captured</div>
              <div className="text-gray-900">{decisionSummary?.attorney?.totalDecisions || 0}</div>
            </div>
            <div className="rounded-md border border-gray-100 p-3">
              <div className="text-gray-500">Override rate</div>
              <div className="text-gray-900">{decisionSummary?.attorney?.overrideRate ?? 0}%</div>
            </div>
            <div className="rounded-md border border-gray-100 p-3">
              <div className="text-gray-500">Avg confidence</div>
              <div className="text-gray-900">{decisionSummary?.attorney?.avgConfidence ?? 0}%</div>
            </div>
            <div className="rounded-md border border-gray-100 p-3">
              <div className="text-gray-500">Outcomes logged</div>
              <div className="text-gray-900">
                {decisionSummary?.attorney?.outcomeCounts
                  ? Object.values(decisionSummary.attorney.outcomeCounts).reduce(
                      (sum: number, val: any) => sum + Number(val || 0),
                      0,
                    )
                  : 0}
              </div>
            </div>
          </div>
          {decisionSummary?.attorney?.topRationales?.length ? (
            <div className="text-xs text-gray-500 mt-3">
              Recent rationales: {decisionSummary.attorney.topRationales.join(' • ')}
            </div>
          ) : null}
        </div>
      </details>

      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Case-Level Intelligence</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Cost vs outcome</div>
            <div className="text-gray-900">
              {formatCurrency(
                (analyticsIntel?.caseLevel || []).reduce(
                  (sum: number, item: any) => sum + (item.outcome || 0) - (item.cost || 0),
                  0,
                ),
              )}
            </div>
          </div>
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Duration vs value</div>
            <div className="text-gray-900">
              {analyticsIntel?.caseLevel?.length
                ? `${Math.round((analyticsIntel.caseLevel.reduce((sum: number, item: any) => sum + (item.durationDays || 0), 0) / analyticsIntel.caseLevel.length) || 0)} days avg`
                : 'N/A'}
            </div>
          </div>
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Settlement efficiency</div>
            <div className="text-gray-900">
              {analyticsIntel?.caseLevel?.length
                ? `${Math.round((analyticsIntel.caseLevel.reduce((sum: number, item: any) => sum + (item.settlementEfficiency || 0), 0) / analyticsIntel.caseLevel.length) || 0)}%`
                : 'N/A'}
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Metrics derived from invoices, payments, and negotiation outcomes.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion Funnel</h3>
          <p className="text-xs text-gray-500 mb-3">Received → Accepted → Consulted → Retained</p>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Leads Received</span>
              <span className="font-semibold">{leadsReceived}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Accepted</span>
              <span className="font-semibold">{acceptedLeads}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Consulted</span>
              <span className="font-semibold">{consultedLeads}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Retained</span>
              <span className="font-semibold">{retainedLeads}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Pipeline</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Potential Fees (Open Cases)</span>
              <span className="font-semibold">{formatCurrency(openCaseFeePipeline)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cases In Negotiation</span>
              <span className="font-semibold">{casesInNegotiation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Demand Packages Sent</span>
              <span className="font-semibold">{demandReadyCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Likely Retained This Month</span>
              <span className="font-semibold text-green-600">{likelyRetainedThisMonth}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Firm-Level Profitability</h3>
          <div className="space-y-2 text-sm">
            {analyticsIntel?.firmLevel?.profitabilityByCaseType ? (
              Object.entries(analyticsIntel.firmLevel.profitabilityByCaseType).map(([caseType, metrics]: any) => (
                <div key={caseType} className="flex justify-between">
                  <span className="text-gray-600">{caseType}</span>
                  <span className="font-semibold">{formatCurrency(metrics.profit || 0)}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No firm data available.</div>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Attorney Performance</h3>
          <div className="space-y-2 text-sm">
            {analyticsIntel?.firmLevel?.attorneyPerformance ? (
              Object.entries(analyticsIntel.firmLevel.attorneyPerformance).map(([id, metrics]: any) => (
                <div key={id} className="flex justify-between">
                  <span className="text-gray-600">{metrics.name}</span>
                  <span className="font-semibold">
                    {metrics.total > 0 ? `${Math.round((metrics.retained / metrics.total) * 100)}% retained` : 'N/A'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No firm data available.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Insurer</h3>
          <div className="space-y-2 text-sm">
            {analyticsIntel?.firmLevel?.roiByInsurer ? (
              Object.entries(analyticsIntel.firmLevel.roiByInsurer).map(([key, metrics]: any) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{key}</span>
                  <span className="font-semibold">{formatPercentage((metrics.roi || 0) * 100)}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No data.</div>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Venue</h3>
          <div className="space-y-2 text-sm">
            {analyticsIntel?.firmLevel?.roiByVenue ? (
              Object.entries(analyticsIntel.firmLevel.roiByVenue).map(([key, metrics]: any) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{key}</span>
                  <span className="font-semibold">{formatPercentage((metrics.roi || 0) * 100)}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No data.</div>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Adjuster</h3>
          <div className="space-y-2 text-sm">
            {analyticsIntel?.firmLevel?.roiByAdjuster ? (
              Object.entries(analyticsIntel.firmLevel.roiByAdjuster).map(([key, metrics]: any) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{key}</span>
                  <span className="font-semibold">{formatPercentage((metrics.roi || 0) * 100)}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No data.</div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">AI Forecast</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Expected New Matches Next 30 Days</div>
            <div className="text-gray-900">
              {expectedNewMatchesNext30Days}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Expected Retained Cases</div>
            <div className="text-gray-900">
              {expectedRetainedCases}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Expected Fee Pipeline</div>
            <div className="text-gray-900">
              {formatCurrency(expectedFeePipeline)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Confidence</div>
            <div className="text-gray-900">
              {forecastConfidence}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
