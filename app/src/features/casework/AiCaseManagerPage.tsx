import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Bot, Gavel, HelpCircle, Loader2, Play, RefreshCw, Sparkles } from 'lucide-react'
import {
  getAiCaseManagerOverview,
  runAiCaseManager,
  approveAllAiCaseManager,
  approveAllLeadTasks,
  type AiCaseManagerOverview,
  type AiCaseManagerCase,
} from '../../lib/api'
import {
  Badge,
  ClientLink,
  DataTable,
  EmptyState,
  FilterStat,
  PageHeader,
  SectionCard,
  StatGrid,
  type DataTableColumn,
} from '../shared/ui'
import { formatClaimType } from '../../lib/claimTypes'

const claimLabel = (s?: string | null) => (s ? formatClaimType(s) : 'Case')

const priorityDot = (p?: string | null) => {
  const v = (p || '').toLowerCase()
  if (v === 'high' || v === 'urgent') return 'bg-rose-500'
  if (v === 'medium') return 'bg-amber-500'
  return 'bg-slate-400'
}

function formatWhen(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const day = 86_400_000
  if (diff < day) return 'Today'
  if (diff < 2 * day) return 'Yesterday'
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function AiCaseManagerPage() {
  const [data, setData] = useState<AiCaseManagerOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const flash = (tone: 'ok' | 'err', text: string) => {
    setMsg({ tone, text })
    window.setTimeout(() => setMsg(null), 5000)
  }

  const load = async () => {
    const res = await getAiCaseManagerOverview()
    setData(res)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const runNow = async () => {
    setRunning(true)
    try {
      const res = await runAiCaseManager()
      flash('ok', `AI Case Manager is working ${res.queued} case${res.queued === 1 ? '' : 's'}. Refreshing shortly…`)
      // The run is async on the server; give it a moment then refresh the board.
      window.setTimeout(() => {
        load().catch(() => undefined)
      }, 6000)
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to start the AI Case Manager.')
    } finally {
      setRunning(false)
    }
  }

  const approveAll = async () => {
    setApprovingAll(true)
    try {
      const res = await approveAllAiCaseManager()
      flash('ok', `Approved ${res.approved} task${res.approved === 1 ? '' : 's'} across your caseload.`)
      await load()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to approve tasks.')
    } finally {
      setApprovingAll(false)
    }
  }

  const approveCase = async (c: AiCaseManagerCase) => {
    setApprovingId(c.assessmentId)
    try {
      const res = await approveAllLeadTasks(c.leadId)
      flash('ok', `Approved ${res.approved} task${res.approved === 1 ? '' : 's'} for ${c.client}.`)
      await load()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to approve tasks.')
    } finally {
      setApprovingId(null)
    }
  }

  const stats = data?.stats
  const cases = data?.cases ?? []

  const columns: DataTableColumn<AiCaseManagerCase>[] = [
    {
      key: 'client',
      header: 'Case',
      cell: (r) => (
        <div className="min-w-0">
          <ClientLink name={r.client} leadId={r.leadId} section="tasks" />
          <div className="text-[11px] text-slate-400">
            {[claimLabel(r.claimType), r.venue].filter(Boolean).join(' · ')}
          </div>
        </div>
      ),
    },
    {
      key: 'nextAction',
      header: '#1 next action',
      cell: (r) =>
        r.topAction ? (
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot(r.topAction.priority)}`} />
            {r.topAction.type === 'question' ? (
              <HelpCircle className="h-3.5 w-3.5 shrink-0 text-sky-500" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" />
            )}
            <Link
              to={`/attorney-dashboard/lead/${r.leadId}/tasks`}
              className="max-w-[22rem] truncate text-slate-700 hover:text-brand-700 hover:underline"
              title={r.topAction.title}
            >
              {r.topAction.title}
            </Link>
          </span>
        ) : (
          <span className="text-slate-400 text-xs">Nothing queued</span>
        ),
    },
    {
      key: 'pending',
      header: 'Pending review',
      align: 'center',
      cell: (r) =>
        r.pendingReview > 0 ? (
          <button
            onClick={() => void approveCase(r)}
            disabled={approvingId === r.assessmentId}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            title="Approve this case's pending AI tasks"
          >
            {approvingId === r.assessmentId ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <BadgeCheck className="h-3 w-3" />
            )}
            Approve {r.pendingReview}
          </button>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'ai',
      header: 'AI tasks',
      align: 'center',
      cell: (r) =>
        r.aiTasksOpen > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
            <Sparkles className="h-3 w-3" /> {r.aiTasksOpen}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) =>
        r.demandReady ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <Gavel className="h-3 w-3" /> Demand-ready
          </span>
        ) : r.openTasks > 0 ? (
          <Badge tone="neutral">{r.openTasks} open task{r.openTasks === 1 ? '' : 's'}</Badge>
        ) : (
          <span className="text-slate-400 text-xs">On track</span>
        ),
    },
    {
      key: 'activity',
      header: 'Last AI activity',
      align: 'right',
      cell: (r) => <span className="text-xs text-slate-500">{formatWhen(r.lastActivity)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rose · AI Case Manager"
        description="Rose reviews every retained case automatically — raising the next tasks, turning intelligent questions into work, and flagging cases ready for demand. Anything she raises is badged Rose and assigned to your team to action. She runs continuously; kick her manually any time."
        actions={
          <>
            {(stats?.pendingReview ?? 0) > 0 ? (
              <button
                onClick={() => void approveAll()}
                disabled={approvingAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60"
              >
                {approvingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                Approve all pending ({stats?.pendingReview})
              </button>
            ) : null}
            <button
              onClick={() => void runNow()}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run on all my cases
            </button>
          </>
        }
      />

      {msg ? (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm ring-1 ring-inset ${
            msg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
        <div className="text-sm text-violet-900">
          <span className="font-semibold">How it works.</span> Rose continuously reviews each case's intake and
          evidence, then raises the highest-value next actions. She spots the work; a paralegal or attorney still does
          it, so look for the <span className="font-semibold">Rose</span> badge on your task list to see what she put
          there.{' '}
          {data?.gateEnabled ? (
            <>
              New tasks from Rose are <span className="font-semibold">held for a case manager to approve</span> before
              they go live (review gate is on).
            </>
          ) : (
            <>Rose's tasks go live and are assigned automatically (review gate is off).</>
          )}
        </div>
      </div>

      <StatGrid columns={4}>
        <FilterStat value={stats?.casesManaged ?? 0} label="Cases managed" tone="neutral" hint="Retained/active cases Rose is watching." />
        <FilterStat
          value={stats?.pendingReview ?? 0}
          label="Tasks pending review"
          tone="warning"
          filled={(stats?.pendingReview ?? 0) > 0}
          hint="Tasks Rose raised, waiting for a case manager to approve."
        />
        <FilterStat value={stats?.aiTasksOpen ?? 0} label="Raised by Rose" tone="info" hint="Open tasks Rose raised across your caseload, assigned to your team." />
        <FilterStat
          value={stats?.demandReady ?? 0}
          label="Demand-ready"
          tone="success"
          filled={(stats?.demandReady ?? 0) > 0}
          hint="Cases with strong documentation and no critical gaps."
        />
      </StatGrid>

      <SectionCard
        title="Caseload"
        trailing={
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading caseload…
          </div>
        ) : error ? (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
        ) : cases.length === 0 ? (
          <EmptyState message="No retained cases yet. Once you accept or are assigned a case, the AI Case Manager starts working it automatically." />
        ) : (
          <DataTable columns={columns} rows={cases} rowKey={(r) => r.assessmentId} />
        )}
      </SectionCard>
    </div>
  )
}
