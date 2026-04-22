import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAdminStats, listAuditLogs } from '../../lib/api'
import {
  FileText,
  GitBranch,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  BrainCircuit,
} from 'lucide-react'

export default function AdminHome() {
  const [stats, setStats] = useState<any>(null)
  const [automationLogs, setAutomationLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const [data, logs] = await Promise.all([
        getAdminStats(),
        listAuditLogs({ limit: 80 }).catch(() => []),
      ])
      setStats(data)
      setAutomationLogs(
        (Array.isArray(logs) ? logs : []).filter((entry) =>
          String(entry?.action || '').startsWith('automation_'),
        ).slice(0, 12),
      )
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        (err.code === 'ERR_NETWORK' || err.message === 'Network Error'
          ? 'Cannot reach the API. Check that the server is running and NEXT_PUBLIC_API_URL is correct.'
          : null) ||
        err.message ||
        'Failed to load dashboard stats'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
        {error}
        <button onClick={loadStats} className="ml-4 text-sm underline">
          Retry
        </button>
      </div>
    )
  }

  const cards = stats?.cards ?? {}
  const funnel = stats?.routingFunnel ?? {}
  const intakeVolume = stats?.intakeVolume ?? []
  const byClaimType = stats?.casesByClaimType ?? []
  const automationSummary = {
    total: automationLogs.length,
    created: automationLogs.filter((item) => item.action === 'automation_feed_created').length,
    snoozed: automationLogs.filter((item) => item.action === 'automation_feed_snoozed').length,
    dismissed: automationLogs.filter((item) => item.action === 'automation_feed_dismissed').length,
  }
  const funnelSteps: { label: string; value: number; to?: string }[] = [
    { label: 'Submitted', value: funnel.submitted ?? 0, to: '/admin/cases?status=COMPLETED' },
    { label: 'Qualified', value: funnel.qualified ?? 0, to: '/admin/cases?status=COMPLETED' },
    { label: 'Routed', value: funnel.routed ?? 0, to: '/admin/cases?routingStatus=routed' },
    { label: 'Attorney accepted', value: funnel.attorneyAccepted ?? 0, to: '/admin/cases?routingStatus=accepted' },
    { label: 'Engaged', value: funnel.engaged ?? 0, to: '/admin/cases?routingStatus=accepted' },
  ]

  const kpiCards: {
    label: string
    value: string | number
    icon: typeof FileText
    color: string
    to?: string
  }[] = [
    {
      label: 'New cases today',
      value: cards.newCasesToday ?? 0,
      icon: FileText,
      color: 'brand',
      to: '/admin/cases?createdToday=1',
    },
    {
      label: 'Routable cases',
      value: cards.routableCases ?? 0,
      icon: GitBranch,
      color: 'emerald',
      to: '/admin/cases?routingStatus=queue',
    },
    {
      label: 'Waiting for attorney response',
      value: cards.casesWaitingForResponse ?? 0,
      icon: Clock,
      color: 'amber',
      to: '/admin/cases?routingStatus=waiting',
    },
    {
      label: 'Manually held',
      value: cards.casesManuallyHeld ?? 0,
      icon: AlertTriangle,
      color: 'slate',
      to: '/admin/manual-review',
    },
    {
      label: 'Attorney acceptance rate',
      value: `${cards.attorneyAcceptanceRate ?? 0}%`,
      icon: Users,
      color: 'violet',
    },
    {
      label: 'Median time to first response',
      value: `${cards.medianTimeToFirstResponseMinutes ?? 0} min`,
      icon: Clock,
      color: 'blue',
    },
    {
      label: 'Plaintiff match rate',
      value: `${cards.plaintiffMatchRate ?? 0}%`,
      icon: TrendingUp,
      color: 'green',
    },
    {
      label: 'Cases aging > 24h',
      value: cards.casesAgingOver24h ?? 0,
      icon: AlertTriangle,
      color: 'red',
    },
  ]

  const maxIntake = Math.max(1, ...intakeVolume.map(([, v]: [string, number]) => v))

  return (
    <div className="page-shell space-y-8">
      <div className="page-header">
        <div className="space-y-3">
          <span className="page-kicker">Operations command</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Routing throughput, intake posture, and automation activity across the platform.
            </p>
          </div>
        </div>
        <button
          onClick={loadStats}
          className="btn-ghost inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon
          const body = (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className="p-2 rounded-lg bg-brand-50">
                <Icon className="h-5 w-5 text-brand-600" />
              </div>
            </div>
          )
          const panelClass =
            'subtle-panel p-4' +
            (card.to
              ? ' hover:border-brand-300/90 hover:shadow-sm transition-shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'
              : '')
          if (card.to) {
            return (
              <Link key={card.label} to={card.to} className={`block ${panelClass}`}>
                {body}
              </Link>
            )
          }
          return (
            <div key={card.label} className={panelClass}>
              {body}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intake volume */}
        <div className="subtle-panel p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Intake volume (last 7 days)</h2>
          <div className="space-y-3">
            {intakeVolume.map(([date, count]: [string, number]) => (
              <div key={date} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-24">
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded transition-all"
                    style={{ width: `${(count / maxIntake) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700 w-8">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cases by claim type */}
        <div className="subtle-panel p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Cases by claim type</h2>
          <div className="space-y-2">
            {byClaimType.map((c: { claimType: string; count: number }) => (
              <div key={c.claimType} className="flex justify-between text-sm">
                <span className="text-slate-600 capitalize">
                  {c.claimType.replace(/_/g, ' ')}
                </span>
                <span className="font-medium text-slate-900">{c.count}</span>
              </div>
            ))}
            {byClaimType.length === 0 && (
              <p className="text-sm text-slate-500">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* Routing funnel */}
      <div className="subtle-panel p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Routing funnel</h2>
        <div className="flex flex-wrap gap-4 items-center">
          {funnelSteps.map((step, index) => (
            <div key={step.label} className="flex items-center gap-4">
              <FunnelStep label={step.label} value={step.value} to={step.to} />
              {index < funnelSteps.length - 1 && <ArrowRight className="h-5 w-5 text-slate-400 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="subtle-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Automation activity</h2>
              <p className="mt-1 text-sm text-slate-600">
                Durable reminder and readiness actions now flowing into admin oversight.
              </p>
            </div>
            <Link to="/admin/compliance" className="btn-outline">
              Open compliance log
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">{automationSummary.total} recent events</span>
            <span className="chip">{automationSummary.created} created</span>
            <span className="chip">{automationSummary.snoozed} snoozed</span>
            <span className="chip">{automationSummary.dismissed} dismissed</span>
          </div>
          <div className="mt-5 space-y-3">
            {automationLogs.length > 0 ? (
              automationLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {String(log.action || '').replace(/_/g, ' ')}
                    </p>
                    <span className="text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {log.entityType || 'entity'} {log.entityId || 'unknown'}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Automation audit events will appear here as the readiness engine creates, snoozes, dismisses, and delivers reminders.
              </p>
            )}
          </div>
        </div>

        <div className="subtle-panel p-6">
          <h2 className="text-lg font-semibold text-slate-900">Ops watchlist</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              Check the automation feed after routing rule changes to make sure demand-ready and missing-doc reminders still align with ops policy.
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              Use the compliance page as the permanent event log for reminder lifecycle actions when auditing attorney workflow automation.
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              When routing is disabled, the dashboard still shows automation history so teams can verify backlog pressure before re-enabling dispatch.
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/cases"
          className="subtle-panel flex items-center gap-3 p-4 hover:border-brand-300"
        >
          <FileText className="h-8 w-8 text-brand-600" />
          <div>
            <p className="font-medium text-slate-900">Cases</p>
            <p className="text-sm text-slate-500">View and manage all cases</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
        <Link
          to="/admin/routing-queue"
          className="subtle-panel flex items-center gap-3 p-4 hover:border-brand-300"
        >
          <GitBranch className="h-8 w-8 text-brand-600" />
          <div>
            <p className="font-medium text-slate-900">Routing queue</p>
            <p className="text-sm text-slate-500">Live dispatch console</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
        <Link
          to="/admin/attorneys"
          className="subtle-panel flex items-center gap-3 p-4 hover:border-brand-300"
        >
          <Users className="h-8 w-8 text-brand-600" />
          <div>
            <p className="font-medium text-slate-900">Attorneys</p>
            <p className="text-sm text-slate-500">Network directory</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
        <Link
          to="/admin/routing-feedback"
          className="subtle-panel flex items-center gap-3 p-4 hover:border-brand-300"
        >
          <BrainCircuit className="h-8 w-8 text-brand-600" />
          <div>
            <p className="font-medium text-slate-900">Routing feedback</p>
            <p className="text-sm text-slate-500">Overrides, exports, retraining</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
      </div>

      {/* Alerts panel placeholder */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/95 p-4 shadow-sm">
        <h3 className="font-medium text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Alerts
        </h3>
        <p className="text-sm text-amber-800 mt-2">
          Capacity exceeded, stuck routing, near-SOL, duplicate/fraud risk, and OCR failures will appear here.
        </p>
      </div>
    </div>
  )
}

function FunnelStep({ label, value, to }: { label: string; value: number; to?: string }) {
  const content = (
    <div className="flex flex-col items-center px-4 py-2 bg-slate-50 rounded-lg min-w-[100px]">
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  )

  if (!to) return content

  return (
    <Link
      to={to}
      className="block rounded-lg transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  )
}
