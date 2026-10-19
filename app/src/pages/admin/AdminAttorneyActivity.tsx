import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react'
import { listAttorneyActivity, type AttorneyActivityMetrics } from '../../lib/api'
import { getAdminLoginPath, isAdminAuthError } from '../../lib/auth'
import { Badge, DataTable, PageHeader, SectionCard, type DataTableColumn } from '../../features/shared/ui'
import { RANGE_OPTIONS, formatAgo, formatHours, formatMinutes, median, rangeParams } from './attorneyActivityFormat'

type SortKey = 'name' | 'lastActive' | 'activeDays' | 'response' | 'stale' | 'overdue' | 'demands' | 'hoursSaved'

const lastActive = (m: AttorneyActivityMetrics) => m.engagement.lastSeenAt || m.engagement.lastLoginAt

const SORT_VALUE: Record<SortKey, (m: AttorneyActivityMetrics) => number | string> = {
  name: (m) => m.attorney.name.toLowerCase(),
  lastActive: (m) => (lastActive(m) ? new Date(lastActive(m)!).getTime() : 0),
  activeDays: (m) => m.engagement.activeDays30,
  // Unknown response time sorts after every known one.
  response: (m) => m.engagement.medianLeadResponseHours ?? Number.POSITIVE_INFINITY,
  stale: (m) => m.engagement.staleCases,
  overdue: (m) => m.engagement.overdueTasks,
  demands: (m) => m.value.demandsSent,
  hoursSaved: (m) => m.value.hoursSaved,
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-900/70">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  )
}

export default function AdminAttorneyActivity() {
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const [firm, setFirm] = useState('')
  const [rows, setRows] = useState<AttorneyActivityMetrics[]>([])
  const [firms, setFirms] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'lastActive', dir: 'desc' })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listAttorneyActivity({ ...rangeParams(days), firm: firm || undefined })
      setRows(data.attorneys)
      if (!firm) setFirms(data.firms)
    } catch (err: any) {
      if (isAdminAuthError(err)) {
        navigate(getAdminLoginPath('/admin/attorney-activity'), { replace: true })
        return
      }
      setError(err?.response?.data?.error || 'Failed to load attorney activity')
    } finally {
      setLoading(false)
    }
  }, [days, firm, navigate])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = useMemo(() => {
    const value = SORT_VALUE[sort.key]
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => (value(a) < value(b) ? -dir : value(a) > value(b) ? dir : 0))
  }, [rows, sort])

  const summary = useMemo(() => {
    const active7 = rows.filter((r) => r.engagement.activeDays7 > 0).length
    const responses = rows.map((r) => r.engagement.medianLeadResponseHours).filter((h): h is number => h !== null)
    return {
      active7,
      medianResponse: median(responses),
      stale: rows.reduce((s, r) => s + r.engagement.staleCases, 0),
      hoursSaved: Math.round(rows.reduce((s, r) => s + r.value.hoursSaved, 0) * 10) / 10,
    }
  }, [rows])

  const header = (label: string, key: SortKey) => (
    <button
      type="button"
      onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}
      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
    >
      {label}
      {sort.key === key ? sort.dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : null}
    </button>
  )

  const columns: DataTableColumn<AttorneyActivityMetrics>[] = [
    {
      key: 'name',
      header: header('Attorney', 'name'),
      cell: (m) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{m.attorney.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{m.attorney.lawFirmName || 'No firm'}</div>
        </div>
      ),
    },
    {
      key: 'lastActive',
      header: header('Last active', 'lastActive'),
      cell: (m) => <span className="whitespace-nowrap">{formatAgo(lastActive(m))}</span>,
    },
    {
      key: 'activeDays',
      header: header('Active days (7 / 30)', 'activeDays'),
      cell: (m) => (
        <span>
          {m.engagement.activeDays7} / {m.engagement.activeDays30}
          <span className="ml-1 text-xs text-slate-500">· {formatMinutes(m.engagement.activeMinutes)}</span>
        </span>
      ),
    },
    {
      key: 'response',
      header: header('Lead response', 'response'),
      cell: (m) => (
        <span className="inline-flex items-center gap-1.5">
          {formatHours(m.engagement.medianLeadResponseHours)}
          {m.engagement.leadsPending > 0 ? <Badge tone="warning">{m.engagement.leadsPending} pending</Badge> : null}
        </span>
      ),
    },
    {
      key: 'stale',
      header: header('Stale / open cases', 'stale'),
      cell: (m) =>
        m.engagement.staleCases > 0 ? (
          <Badge tone="danger">
            {m.engagement.staleCases} / {m.engagement.openCases}
          </Badge>
        ) : (
          <span className="text-slate-600 dark:text-slate-400">0 / {m.engagement.openCases}</span>
        ),
    },
    {
      key: 'overdue',
      header: header('Overdue tasks', 'overdue'),
      align: 'right',
      cell: (m) => (m.engagement.overdueTasks > 0 ? <Badge tone="warning">{m.engagement.overdueTasks}</Badge> : '0'),
    },
    {
      key: 'demands',
      header: header('Demands sent', 'demands'),
      align: 'right',
      cell: (m) => m.value.demandsSent,
    },
    {
      key: 'hoursSaved',
      header: header('Hours saved', 'hoursSaved'),
      align: 'right',
      cell: (m) => `${m.value.hoursSaved}h`,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attorney activity"
        description="How active and responsive each attorney is, what they use, and what the platform did for them. Recorded in our own database only."
        actions={
          <>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input text-ui-sm" aria-label="Date range">
              {RANGE_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
            <select value={firm} onChange={(e) => setFirm(e.target.value)} className="input text-ui-sm" aria-label="Firm">
              <option value="">All firms</option>
              {firms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active in the last 7 days" value={`${summary.active7} / ${rows.length}`} hint="attorneys with an account" />
        <Stat label="Median lead response" value={formatHours(summary.medianResponse)} hint="across attorneys" />
        <Stat label="Stale cases" value={String(summary.stale)} hint="no attorney change in 14+ days" />
        <Stat label="Hours saved" value={`${summary.hoursSaved}h`} hint="estimated, in this range" />
      </div>

      <SectionCard title={`${rows.length} attorney${rows.length === 1 ? '' : 's'}`}>
        <DataTable
          columns={columns}
          rows={sorted}
          rowKey={(m) => m.attorney.attorneyId}
          loading={loading}
          loadingMessage="Loading attorney activity…"
          emptyMessage="No attorneys with an account match these filters."
          onRowClick={(m) => navigate(`/admin/attorney-activity/${m.attorney.attorneyId}`)}
        />
      </SectionCard>
    </div>
  )
}
