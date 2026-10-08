import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, Globe, Info, RefreshCw } from 'lucide-react'
import { getAdminTraffic, type AdminTraffic, type AdminTrafficRange } from '../../lib/api'
import { BarChart, SimpleLineChart } from './charts'

/** Matches the API's limits: GA4's first day of data, and a two-year span. */
const EARLIEST_DATE = '2015-08-14'
const MAX_RANGE_DAYS = 731

type PresetId =
  | 'page'
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last28'
  | 'last90'
  | 'thisMonth'
  | 'lastMonth'
  | 'yearToDate'
  | 'last12Months'
  | 'custom'

const PRESETS: { id: Exclude<PresetId, 'page' | 'custom'>; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last28', label: 'Last 28 days' },
  { id: 'last90', label: 'Last 90 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'yearToDate', label: 'Year to date' },
  { id: 'last12Months', label: 'Last 12 months' },
]

/** Local calendar date, not UTC — "today" should mean the admin's today. */
function isoLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, n: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + n)
  return next
}

function presetRange(id: Exclude<PresetId, 'page' | 'custom'>, now = new Date()): AdminTrafficRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const range = (start: Date, end: Date = today) => ({ startDate: isoLocal(start), endDate: isoLocal(end) })
  switch (id) {
    case 'today':
      return range(today)
    case 'yesterday':
      return range(addDays(today, -1), addDays(today, -1))
    case 'last7':
      return range(addDays(today, -6))
    case 'last28':
      return range(addDays(today, -27))
    case 'last90':
      return range(addDays(today, -89))
    case 'thisMonth':
      return range(new Date(today.getFullYear(), today.getMonth(), 1))
    case 'lastMonth':
      return range(
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0)
      )
    case 'yearToDate':
      return range(new Date(today.getFullYear(), 0, 1))
    case 'last12Months':
      return range(addDays(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()), 1))
  }
}

function spanDays({ startDate, endDate }: AdminTrafficRange): number {
  return Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000) + 1
}

function customRangeError(range: AdminTrafficRange): string | null {
  if (!range.startDate || !range.endDate) return 'Choose both a start and an end date.'
  if (range.startDate > range.endDate) return 'Start date must be on or before the end date.'
  if (range.startDate < EARLIEST_DATE) return `Google Analytics has no data before ${EARLIEST_DATE}.`
  if (range.endDate > isoLocal(new Date())) return 'End date cannot be in the future.'
  if (spanDays(range) > MAX_RANGE_DAYS) return 'Ranges are limited to two years.'
  return null
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

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

  // 'page' follows the screen-wide window selector; anything else is this
  // panel's own range, which GA4 can serve well beyond the page's 90 days.
  const [preset, setPreset] = useState<PresetId>('page')
  const [draft, setDraft] = useState<AdminTrafficRange>(() => presetRange('last28'))
  const [appliedCustom, setAppliedCustom] = useState<AdminTrafficRange | null>(null)
  const draftError = preset === 'custom' ? customRangeError(draft) : null

  const range = useMemo<number | AdminTrafficRange>(() => {
    if (preset === 'page') return days
    if (preset === 'custom') return appliedCustom ?? days
    return presetRange(preset)
  }, [preset, days, appliedCustom])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setData(await getAdminTraffic(range))
    } catch (err: any) {
      const body = err?.response?.data
      setError(body?.detail || body?.error || 'Failed to load traffic')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    load()
  }, [load])

  const onPresetChange = (next: PresetId) => {
    setPreset(next)
    if (next === 'custom') {
      // Seed the inputs from whatever is on screen, so "Custom" starts as a tweak.
      const today = new Date()
      setDraft(
        typeof range === 'number'
          ? { startDate: isoLocal(addDays(today, -(range - 1))), endDate: isoLocal(today) }
          : range
      )
      setAppliedCustom(null)
    }
  }

  const rangeLabel =
    typeof range === 'number'
      ? `Last ${range} days`
      : range.startDate === range.endDate
        ? formatDate(range.startDate)
        : `${formatDate(range.startDate)} – ${formatDate(range.endDate)} · ${spanDays(range)} days`

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Globe className="h-5 w-5 text-brand-600" />
            Site traffic
          </h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            {rangeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="traffic-range">
            Date range
          </label>
          <select
            id="traffic-range"
            value={preset}
            onChange={(e) => onPresetChange(e.target.value as PresetId)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="page">Match page (last {days} days)</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom range…</option>
          </select>
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
      </div>

      {preset === 'custom' && (
        <form
          className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          onSubmit={(e) => {
            e.preventDefault()
            if (!draftError) setAppliedCustom({ ...draft })
          }}
        >
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Start date
            <input
              type="date"
              value={draft.startDate}
              min={EARLIEST_DATE}
              max={draft.endDate || isoLocal(new Date())}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </label>
          <label className="text-xs text-slate-600 dark:text-slate-400">
            End date
            <input
              type="date"
              value={draft.endDate}
              min={draft.startDate || EARLIEST_DATE}
              max={isoLocal(new Date())}
              onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </label>
          <button
            type="submit"
            disabled={Boolean(draftError) || loading}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Apply
          </button>
          {draftError ? (
            <p className="w-full text-xs text-red-600 dark:text-red-400">{draftError}</p>
          ) : (
            !appliedCustom && (
              <p className="w-full text-xs text-slate-500 dark:text-slate-400">
                Showing the page window until you apply a range.
              </p>
            )
          )}
        </form>
      )}

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
        Every page on the site, from Google Tag Manager: marketing pages, the intake wizard, and the
        signed-in attorney and admin screens. Internal use is counted alongside visitors, so these
        figures run higher than claimant traffic alone and will not reconcile against case counts.
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

      {data.byPage.length > 0 && (
        <Block
          title="Pages, and how long they hold people"
          hint="Engagement time counts only the foreground tab, so it measures attention rather than elapsed time. Ordered by views — sorting by time alone surfaces whichever page three people found."
        >
          <PageTable pages={data.byPage} />
        </Block>
      )}
    </div>
  )
}

function PageTable({ pages }: { pages: Extract<AdminTraffic, { configured: true }>['byPage'] }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="pb-2 pr-3 font-medium">Page</th>
            <th className="pb-2 pr-3 text-right font-medium">Views</th>
            <th className="pb-2 pr-3 text-right font-medium">Users</th>
            <th className="pb-2 text-right font-medium">Avg engagement</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.path} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="max-w-[280px] truncate py-2 pr-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                {page.path}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                {page.pageViews.toLocaleString()}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                {page.activeUsers.toLocaleString()}
              </td>
              <td className="py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                {duration(page.averageEngagementSeconds)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
