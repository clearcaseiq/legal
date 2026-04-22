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
  const docBlockedCount = readinessLeads.filter((lead: any) => (lead?.demandReadiness?.blockers || []).some((blocker: any) => blocker.type === 'missing_documents')).length
  const overdueTaskCount = readinessLeads.reduce((sum: number, lead: any) => sum + Number(lead?.demandReadiness?.overdueTaskCount || 0), 0)
  const staleContactCount = readinessLeads.filter((lead: any) => (lead?.demandReadiness?.blockers || []).some((blocker: any) => blocker.type === 'stale_contact')).length
  const funnel = dashboardData?.funnel || {}
  const responseTimeHours = Number(profile?.responseTimeHours ?? profile?.attorney?.responseTimeHours ?? 24)
  const responseBadge = responseTimeHours <= 2
    ? 'Fast responder'
    : responseTimeHours <= 8
      ? 'Same-day replies'
      : responseTimeHours <= 24
        ? 'Replies within 24h'
        : 'Replies within a few days'
  const acceptanceRate = (funnel.matched ?? 0) > 0 ? Math.round(((funnel.accepted ?? 0) / (funnel.matched ?? 1)) * 100) : 0
  const consultRate = (funnel.accepted ?? 0) > 0 ? Math.round(((funnel.consultScheduled ?? 0) / (funnel.accepted ?? 1)) * 100) : 0
  const retainRate = (funnel.consultScheduled ?? 0) > 0 ? Math.round(((funnel.retained ?? 0) / (funnel.consultScheduled ?? 1)) * 100) : 0

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
          <div className="rounded-md border border-gray-100 p-3">
            <div className="text-gray-500">Public response badge</div>
            <div className="text-gray-900">{responseBadge}</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Based on your current funnel counts and public profile commitment of about {responseTimeHours} hours.
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
              <span className="font-semibold">
                {dashboardData.funnel?.matched ?? dashboardData.dashboard.totalLeadsReceived ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Accepted</span>
              <span className="font-semibold">
                {dashboardData.funnel?.accepted ?? dashboardData.dashboard.totalLeadsAccepted ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Consulted</span>
              <span className="font-semibold">{dashboardData.funnel?.consulted ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Retained</span>
              <span className="font-semibold">{dashboardData.funnel?.retained ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Fees Collected</span>
              <span className="font-semibold">{formatCurrency(dashboardData.dashboard.feesCollectedFromPayments)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Platform Spend</span>
              <span className="font-semibold">{formatCurrency(dashboardData.dashboard.totalPlatformSpend)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Net Revenue</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(dashboardData.dashboard.feesCollectedFromPayments - dashboardData.dashboard.totalPlatformSpend)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">ROI</span>
              <span className="font-semibold text-green-600">
                {formatPercentage((dashboardData.analytics.roi || 0) * 100)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">ROI Insights (Monthly)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Total Fees</div>
            <div className="text-gray-900">{formatCurrency(dashboardData.roiAnalytics?.totalFees || 0)}</div>
          </div>
          <div>
            <div className="text-gray-500">Total Spend</div>
            <div className="text-gray-900">{formatCurrency(dashboardData.roiAnalytics?.totalSpend || 0)}</div>
          </div>
          <div>
            <div className="text-gray-500">ROI</div>
            <div className="text-gray-900">{formatPercentage(dashboardData.roiAnalytics?.roi || 0)}</div>
          </div>
          <div>
            <div className="text-gray-500">Average Fee</div>
            <div className="text-gray-900">{formatCurrency(dashboardData.roiAnalytics?.averageFee || 0)}</div>
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">ROI by Insurer</h3>
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">ROI by Venue</h3>
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">ROI by Adjuster</h3>
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">Predictive Forecasting</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Next quarter fees</div>
            <div className="text-gray-900">
              {formatCurrency(analyticsIntel?.firmLevel?.forecast?.nextQuarterFees || 0)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Next quarter spend</div>
            <div className="text-gray-900">
              {formatCurrency(analyticsIntel?.firmLevel?.forecast?.nextQuarterSpend || 0)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Projected ROI</div>
            <div className="text-gray-900">
              {formatPercentage((analyticsIntel?.firmLevel?.forecast?.projectedRoi || 0) * 100)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
