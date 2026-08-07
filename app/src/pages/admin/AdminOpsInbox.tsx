import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox, RefreshCw, AlertTriangle, GitBranch, ClipboardCheck, MailWarning } from 'lucide-react'
import { getAdminOpsInbox, type AdminOpsInboxItem } from '../../lib/api'
import { getAdminLoginPath, isAdminAuthError } from '../../lib/auth'
import { Badge, PageHeader, SectionCard } from '../../features/shared/ui'
import EmptyState from '../../components/EmptyState'

type KindFilter = 'all' | AdminOpsInboxItem['kind']

const KIND_META: Record<
  AdminOpsInboxItem['kind'],
  { label: string; icon: typeof GitBranch; tone: 'warning' | 'danger' | 'blue' | 'neutral' }
> = {
  routing: { label: 'Routing', icon: GitBranch, tone: 'blue' },
  manual_review: { label: 'Manual review', icon: ClipboardCheck, tone: 'warning' },
  failed_notification: { label: 'Failed delivery', icon: MailWarning, tone: 'danger' },
}

function priorityTone(priority: AdminOpsInboxItem['priority']) {
  if (priority === 'high') return 'danger' as const
  if (priority === 'medium') return 'warning' as const
  return 'neutral' as const
}

export default function AdminOpsInbox() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AdminOpsInboxItem[]>([])
  const [counts, setCounts] = useState({ routing: 0, manualReview: 0, failedNotifications: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')

  const load = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)
      const data = await getAdminOpsInbox()
      setItems(data.items)
      setCounts(data.counts)
    } catch (err: any) {
      if (isAdminAuthError(err)) {
        navigate(getAdminLoginPath('/admin/ops-inbox'), { replace: true })
        return
      }
      setError(err.response?.data?.error || 'Failed to load ops inbox')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const interval = setInterval(() => load(false), 30000)
    return () => clearInterval(interval)
  }, [load])

  const visible = useMemo(
    () => (kindFilter === 'all' ? items : items.filter((item) => item.kind === kindFilter)),
    [items, kindFilter],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ops inbox"
        description="Prioritized work across routing queue, manual review, and failed notifications."
        actions={
          <button
            type="button"
            onClick={() => load()}
            className="btn-outline inline-flex items-center gap-2 text-ui-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SectionCard title="Awaiting routing">
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{counts.routing}</p>
          <Link to="/admin/routing-queue" className="mt-2 inline-block text-sm text-brand-700 hover:underline">
            Open routing queue
          </Link>
        </SectionCard>
        <SectionCard title="Manual review">
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{counts.manualReview}</p>
          <Link to="/admin/manual-review" className="mt-2 inline-block text-sm text-brand-700 hover:underline">
            Open manual review
          </Link>
        </SectionCard>
        <SectionCard title="Failed notifications">
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{counts.failedNotifications}</p>
          <Link
            to="/admin/communications?tab=failed"
            className="mt-2 inline-block text-sm text-brand-700 hover:underline"
          >
            Open failed deliveries
          </Link>
        </SectionCard>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <SectionCard
        title={`${visible.length} work item${visible.length === 1 ? '' : 's'}`}
        trailing={
          <select
            className="input w-auto"
            aria-label="Filter by kind"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as KindFilter)}
          >
            <option value="all">All kinds</option>
            <option value="routing">Routing</option>
            <option value="manual_review">Manual review</option>
            <option value="failed_notification">Failed delivery</option>
          </select>
        }
      >
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Inbox clear"
            description="No routing, review, or delivery items need attention right now."
          />
        ) : (
          <div className="space-y-2">
            {visible.map((item) => {
              const meta = KIND_META[item.kind]
              const Icon = meta.icon
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                      <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.detail}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
