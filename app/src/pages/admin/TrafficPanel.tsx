import { useCallback, useEffect, useState } from 'react'
import { Globe, Info, RefreshCw } from 'lucide-react'
import { getAdminTraffic, type AdminTraffic } from '../../lib/api'
import { BarChart, SimpleLineChart } from './charts'

/**
 * Site traffic from GA4, shown next to the case funnel it feeds.
 *
 * Loads on its own rather than as part of the analytics payload: this data
 * comes from a third-party API that can be unconfigured, throttled or down,
 * and none of that should take the funnel numbers down with it.
 */
export function TrafficPanel({ days }: { days: number }) {
  const [data, setData] = useState<AdminTraffic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setData(await getAdminTraffic(days))
    } catch (err: any) {
      const body = err?.response?.data
      setError(body?.detail || body?.error || 'Failed to load traffic')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Globe className="h-5 w-5 text-brand-600" />
          Site traffic
        </h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <Boundary />

      {loading && !data ? (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : data && !data.configured ? (
        <NotConfigured reason={data.reason} />
      ) : data && data.configured ? (
        <Report data={data} />
      ) : null}
    </div>
  )
}

/**
 * Stated on the panel, not buried in a doc. Someone comparing 4,000 sessions
 * against 40 cases needs to know the two are measured over different surfaces
 * before they draw a conclusion from the ratio.
 */
function Boundary() {
  return (
    <p className="mb-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        Public marketing and SEO pages only. The intake wizard, dashboards and signed-in screens
        carry no analytics tag by design, so these are top-of-funnel numbers and will not reconcile
        against case counts.
      </span>
    </p>
  )
}

/**
 * The empty state, which doubles as the diagnosis.
 *
 * Both mistakes below used to reach the admin as "Could not reach Google
 * Analytics" and nothing else, because the route withholds the upstream detail
 * outside development. Naming them here costs nothing and saves the round trip
 * through the API logs.
 */
function NotConfigured({ reason }: { reason?: string }) {
  if (reason === 'property_id_not_numeric') {
    return (
      <div className="rounded-lg border border-dashed border-amber-300 p-6 text-center dark:border-amber-800">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          <code className="font-mono">GA4_PROPERTY_ID</code> is not a property id
        </p>
        <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500 dark:text-slate-400">
          It has to be the numeric id from GA4 Admin &rarr; Property Settings, like{' '}
          <code className="font-mono">498372615</code>. The value currently set looks like a
          measurement id (<code className="font-mono">G-XXXXXXXXXX</code>) &mdash; that one belongs
          in the browser tag and the Data API will not accept it.
        </p>
      </div>
    )
  }

  if (reason === 'credentials_unparseable') {
    return (
      <div className="rounded-lg border border-dashed border-amber-300 p-6 text-center dark:border-amber-800">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          <code className="font-mono">GA4_SERVICE_ACCOUNT_JSON</code> could not be read
        </p>
        <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500 dark:text-slate-400">
          It is neither JSON nor base64-encoded JSON. Service account keys contain literal
          newlines, which many secret stores and shells mangle on the way into an environment
          variable &mdash; base64-encode the whole file and paste that instead.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        No Google Analytics property connected
      </p>
      <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500 dark:text-slate-400">
        Set <code className="font-mono">GA4_PROPERTY_ID</code> and{' '}
        <code className="font-mono">GA4_SERVICE_ACCOUNT_JSON</code> on the API, then grant that
        service account Viewer access to the property. Until then this panel stays empty rather than
        reporting zeros, which would look the same as a site nobody visited.
      </p>
    </div>
  )
}

function Report({ data }: { data: Extract<AdminTraffic, { configured: true }> }) {
  const { totals } = data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Sessions" value={totals.sessions.toLocaleString()} />
        <Tile label="New users" value={totals.newUsers.toLocaleString()} />
        <Tile label="Pageviews" value={totals.pageViews.toLocaleString()} />
        <Tile label="Engagement rate" value={percent(totals.engagementRate)} />
        <Tile label="Avg session" value={duration(totals.averageSessionDuration)} />
      </div>

      {data.byDay.length > 0 && (
        <Block title="Sessions over time">
          <SimpleLineChart data={data.byDay.map((point) => [point.date, point.sessions])} />
        </Block>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Sessions by channel">
          <BarChart data={data.byChannel} labelKey="label" valueKey="sessions" color="emerald" />
        </Block>
        <Block title="Sessions by campaign" hint="Where Google Ads spend appears">
          <BarChart data={data.byCampaign} labelKey="label" valueKey="sessions" color="amber" />
        </Block>
        <Block title="Top landing pages">
          <BarChart data={data.byLandingPage} labelKey="label" valueKey="sessions" />
        </Block>
        <Block title="Source / medium">
          <BarChart data={data.bySourceMedium} labelKey="label" valueKey="sessions" />
        </Block>
        <Block title="Device">
          <BarChart data={data.byDevice} labelKey="label" valueKey="sessions" maxBars={5} />
        </Block>
        <Block title="Region">
          <BarChart data={data.byRegion} labelKey="label" valueKey="sessions" />
        </Block>
      </div>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function Block({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</h3>
      {hint && <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className={hint ? '' : 'mt-2'}>{children}</div>
    </div>
  )
}

/** GA4 returns these as a 0-1 ratio, not a percentage. */
function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

function duration(seconds: number): string {
  const whole = Math.round(seconds)
  return `${Math.floor(whole / 60)}m ${String(whole % 60).padStart(2, '0')}s`
}
