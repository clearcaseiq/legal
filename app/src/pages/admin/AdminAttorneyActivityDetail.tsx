import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Download, RefreshCw } from 'lucide-react'
import {
  downloadAttorneyActivityCsv,
  getAttorneyActivity,
  type AttorneyActivityDetail,
  type AttorneyTimelineEntry,
  type AttorneyTimelineKind,
} from '../../lib/api'
import { getAdminLoginPath, isAdminAuthError } from '../../lib/auth'
import { Badge, Breadcrumbs, DataTable, PageHeader, SectionCard, type DataTableColumn } from '../../features/shared/ui'
import {
  KIND_LABELS,
  RANGE_OPTIONS,
  featureLabel,
  formatAgo,
  formatHours,
  formatMinutes,
  formatTimestamp,
  humanizeAction,
  rangeParams,
  screenLabel,
} from './attorneyActivityFormat'

type Tab = 'engagement' | 'usage' | 'value' | 'access'
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'engagement', label: 'Engagement' },
  { id: 'usage', label: 'Usage' },
  { id: 'value', label: 'Value' },
  { id: 'access', label: 'Access log' },
]
const ALL_KINDS = Object.keys(KIND_LABELS) as AttorneyTimelineKind[]
const KIND_TONE: Record<AttorneyTimelineKind, 'neutral' | 'blue' | 'brand' | 'warning'> = {
  activity: 'blue',
  case_change: 'brand',
  document_access: 'warning',
  audit: 'neutral',
}

/** Must match MINUTES_SAVED_PER_ACTION in api/src/lib/attorney-activity-metrics.ts. */
const MINUTES_PER_ACTION: Array<{ key: keyof AttorneyActivityDetail['value']; label: string; minutes: number }> = [
  { key: 'demandsGenerated', label: 'Demands generated', minutes: 120 },
  { key: 'packagesBuilt', label: 'Demand packages built', minutes: 60 },
  { key: 'packagesEmailed', label: 'Packages emailed to adjusters', minutes: 10 },
  { key: 'tasksCompleted', label: 'Tasks completed', minutes: 5 },
  { key: 'aiSuggestionsAccepted', label: 'AI suggestions accepted', minutes: 10 },
]

function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: 'danger' | 'warning' }) {
  const color = tone === 'danger' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-900/70">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  )
}

function CountBars({ rows, label }: { rows: Array<{ key: string; count: number }>; label: (k: string) => string }) {
  if (!rows.length) return <p className="text-sm text-slate-500">Nothing recorded in this range.</p>
  const max = Math.max(...rows.map((r) => r.count))
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate text-slate-700 dark:text-slate-300">{label(r.key)}</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{r.count}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function AdminAttorneyActivityDetail() {
  const { attorneyId = '' } = useParams<{ attorneyId: string }>()
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const [tab, setTab] = useState<Tab>('engagement')
  const [kinds, setKinds] = useState<AttorneyTimelineKind[]>(ALL_KINDS)
  const [data, setData] = useState<AttorneyActivityDetail | null>(null)
  const [entries, setEntries] = useState<AttorneyTimelineEntry[]>([])
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState(() => rangeParams(30))

  const kindsParam = kinds.length === ALL_KINDS.length ? undefined : kinds.join(',')

  const load = useCallback(async () => {
    const r = rangeParams(days)
    setRange(r)
    try {
      setLoading(true)
      setError(null)
      const res = await getAttorneyActivity(attorneyId, { ...r, kinds: kindsParam })
      setData(res)
      setEntries(res.timeline.entries)
      setNextBefore(res.timeline.nextBefore)
    } catch (err: any) {
      if (isAdminAuthError(err)) {
        navigate(getAdminLoginPath(`/admin/attorney-activity/${attorneyId}`), { replace: true })
        return
      }
      setError(err?.response?.data?.error || 'Failed to load attorney activity')
    } finally {
      setLoading(false)
    }
  }, [attorneyId, days, kindsParam, navigate])

  useEffect(() => {
    void load()
  }, [load])

  const loadMore = async () => {
    if (!nextBefore) return
    setLoadingMore(true)
    try {
      const res = await getAttorneyActivity(attorneyId, { ...range, before: nextBefore, kinds: kindsParam })
      setEntries((prev) => [...prev, ...res.timeline.entries])
      setNextBefore(res.timeline.nextBefore)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load more entries')
    } finally {
      setLoadingMore(false)
    }
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const blob = await downloadAttorneyActivityCsv(attorneyId, { ...range, kinds: kindsParam })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `attorney-activity-${attorneyId}-${range.to.slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const toggleKind = (k: AttorneyTimelineKind) =>
    setKinds((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
      return next.length ? next : ALL_KINDS
    })

  const name = data?.attorney.name ?? 'Attorney'
  const e = data?.engagement
  const v = data?.value

  const timelineColumns: DataTableColumn<AttorneyTimelineEntry>[] = [
    { key: 'at', header: 'When', cell: (t) => <span className="whitespace-nowrap">{formatTimestamp(t.at)}</span> },
    { key: 'kind', header: 'Source', cell: (t) => <Badge tone={KIND_TONE[t.kind]}>{KIND_LABELS[t.kind]}</Badge> },
    {
      key: 'action',
      header: 'What',
      cell: (t) => (
        <div>
          <div className="text-slate-800 dark:text-slate-200">{humanizeAction(t.action)}</div>
          {t.detail ? (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t.action === 'screen_viewed' ? screenLabel(t.detail) : t.action === 'feature_used' ? featureLabel(t.detail) : t.detail}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'case',
      header: 'Case',
      cell: (t) =>
        t.assessmentId ? (
          <Link to={`/admin/cases/${t.assessmentId}`} className="font-mono text-xs text-brand-700 hover:underline" onClick={(ev) => ev.stopPropagation()}>
            {t.assessmentId.slice(0, 10)}…
          </Link>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Attorney activity', to: '/admin/attorney-activity' }, { label: name }]} />
      <PageHeader
        title={name}
        description={[data?.attorney.lawFirmName, data?.attorney.email].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <select value={days} onChange={(ev) => setDays(Number(ev.target.value))} className="input text-ui-sm" aria-label="Date range">
              {RANGE_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
            <Link to={`/admin/attorneys/${attorneyId}`} className="btn-outline text-ui-sm">
              Attorney profile
            </Link>
            <button onClick={() => void load()} disabled={loading} className="btn-outline inline-flex items-center gap-2 text-ui-sm">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        }
      />

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data ? <p className="text-sm text-slate-500">Loading…</p> : null}

      {data && e && tab === 'engagement' ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Last signed in" value={formatAgo(e.lastLoginAt)} />
          <Stat label="Last seen" value={formatAgo(e.lastSeenAt)} />
          <Stat label="Active days" value={`${e.activeDays7} / ${e.activeDays30}`} hint="last 7 / last 30 days" />
          <Stat label="Active time" value={formatMinutes(e.activeMinutes)} hint="in this range" />
          <Stat label="Leads received" value={e.leadsReceived} hint="in this range" />
          <Stat
            label="Median lead response"
            value={formatHours(e.medianLeadResponseHours)}
            hint={e.leadsPending ? `${e.leadsPending} still pending` : 'none pending'}
            tone={e.leadsPending ? 'warning' : undefined}
          />
          <Stat
            label="Stale cases"
            value={`${e.staleCases} / ${e.openCases}`}
            hint="open cases with no change in 14+ days"
            tone={e.staleCases ? 'danger' : undefined}
          />
          <Stat label="Overdue tasks" value={e.overdueTasks} tone={e.overdueTasks ? 'warning' : undefined} />
        </div>
      ) : null}

      {data && tab === 'usage' ? (
        <div className="space-y-4">
          <SectionCard title="Active minutes per day">
            {data.usage.activeMinutesByDay.length ? (
              <div className="flex h-32 items-end gap-1">
                {(() => {
                  const max = Math.max(...data.usage.activeMinutesByDay.map((d) => d.minutes), 1)
                  return data.usage.activeMinutesByDay.map((d) => (
                    <div
                      key={d.day}
                      title={`${d.day}: ${formatMinutes(d.minutes)}`}
                      className="flex-1 rounded-t bg-brand-500"
                      style={{ height: `${Math.max(2, (d.minutes / max) * 100)}%` }}
                    />
                  ))
                })()}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active time recorded in this range.</p>
            )}
          </SectionCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Screens">
              <CountBars rows={data.usage.screens} label={screenLabel} />
            </SectionCard>
            <SectionCard title="Features">
              <CountBars rows={data.usage.features} label={featureLabel} />
            </SectionCard>
          </div>
        </div>
      ) : null}

      {data && v && tab === 'value' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Estimated hours saved" value={`${v.hoursSaved}h`} hint="in this range" />
            <Stat label="Demands sent" value={v.demandsSent} />
            <Stat label="Demands generated" value={v.demandsGenerated} />
            <Stat label="Packages emailed" value={v.packagesEmailed} />
          </div>
          <SectionCard title="How hours saved is estimated">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 text-right font-medium">Count</th>
                  <th className="pb-2 text-right font-medium">Minutes each</th>
                  <th className="pb-2 text-right font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {MINUTES_PER_ACTION.map((row) => (
                  <tr key={row.key} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 text-slate-700 dark:text-slate-300">{row.label}</td>
                    <td className="py-1.5 text-right">{v[row.key]}</td>
                    <td className="py-1.5 text-right text-slate-500">{row.minutes}</td>
                    <td className="py-1.5 text-right">{Math.round(((v[row.key] as number) * row.minutes) / 6) / 10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      ) : null}

      {data && tab === 'access' ? (
        <SectionCard
          title="Access log"
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              {ALL_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKind(k)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    kinds.includes(k) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {KIND_LABELS[k]}
                </button>
              ))}
              <button
                onClick={() => void exportCsv()}
                disabled={exporting}
                className="btn-outline inline-flex items-center gap-2 text-ui-sm disabled:opacity-40"
                title="Every entry in this range, up to 10,000 rows. The export is recorded in the audit log."
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
          }
        >
          <DataTable
            columns={timelineColumns}
            rows={entries}
            rowKey={(t) => t.id}
            loading={loading}
            emptyMessage="Nothing recorded in this range."
          />
          {nextBefore ? (
            <div className="mt-4 flex justify-center">
              <button onClick={() => void loadMore()} disabled={loadingMore} className="btn-outline text-ui-sm">
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  )
}
