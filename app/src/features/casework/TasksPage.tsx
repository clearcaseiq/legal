import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, CheckCircle2, Circle, ListChecks, Loader2, Merge, Plus, Trash2, Undo2, X } from 'lucide-react'
import {
  getAttorneyTaskSummary,
  getAttorneyDashboard,
  createLeadTask,
  updateLeadTask,
  deleteLeadTask,
  approveLeadTask,
  unapproveLeadTask,
  mergeLeadTasks,
  getMyWorkflowTasks,
  type MyWorkflowTask,
} from '../../lib/api'
import {
  Badge,
  ClientLink,
  DataTable,
  FilterStat,
  PageHeader,
  SectionCard,
  StatGrid,
  type BadgeTone,
  type DataTableColumn,
} from '../shared/ui'
import TaskDetailModal from './TaskDetailModal'
import TaskOriginBadge, { PendingReviewBadge } from './TaskOriginBadge'
import MergeTasksDialog from './MergeTasksDialog'
import ConfirmDialog from '../../components/ConfirmDialog'
import { formatClaimType } from '../../lib/claimTypes'
import { caseCaptionOf } from '../../lib/caseName'
import { todayDateKey } from '../../lib/taskDueDate'

interface TaskRow {
  id: string
  title: string
  dueDate?: string | null
  completedAt?: string | null
  status?: string | null
  reviewStatus?: string | null
  priority?: string | null
  taskType?: string | null
  assessmentId?: string | null
  leadId?: string | null
  claimType?: string | null
  // 'workflow' rows come from reassigned workflow steps (CaseWorkflowItem) rather
  // than CaseTask. They roll up into the open-task queue/counts (CP-333) but are
  // read-only here — completed/deleted from the case's Workflow tab instead.
  source?: 'task' | 'workflow'
  stageName?: string | null
  phaseName?: string | null
  required?: boolean
}

interface TaskSummary {
  overdue: TaskRow[]
  today: TaskRow[]
  upcoming: TaskRow[]
  noDueDate: TaskRow[]
  recentlyCompleted: TaskRow[]
}

interface CaseOption {
  id: string
  label: string
}

type Bucket = 'all' | 'overdue' | 'today' | 'upcoming' | 'noDueDate' | 'completed'

const BUCKET_LABEL: Record<Bucket, string> = {
  all: 'All open tasks',
  overdue: 'Overdue',
  today: 'Due today',
  upcoming: 'Upcoming',
  noDueDate: 'No due date',
  completed: 'Recently completed',
}

const TASK_TYPES = [
  { id: 'general', label: 'General' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'medical', label: 'Medical records' },
  { id: 'client', label: 'Client follow-up' },
  { id: 'demand', label: 'Demand prep' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'filing', label: 'Filing / court' },
  { id: 'deadline', label: 'Deadline' },
]

const TASK_TYPE_LABEL: Record<string, string> = Object.fromEntries(TASK_TYPES.map((t) => [t.id, t.label]))

const PRIORITIES = [
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
]

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const priorityRank = (p?: string | null) => PRIORITY_RANK[(p || 'medium').toLowerCase()] ?? 2

/** Start-of-day epoch for a due date (Infinity when unset) so tasks group by day. */
function dueDayMs(value?: string | null): number {
  const t = value ? Date.parse(value) : NaN
  if (Number.isNaN(t)) return Infinity
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Order tasks by day (soonest/overdue first), then by priority within a day. */
function byDayThenPriority(a: TaskRow, b: TaskRow): number {
  const dd = dueDayMs(a.dueDate) - dueDayMs(b.dueDate)
  if (dd !== 0) return dd
  return priorityRank(a.priority) - priorityRank(b.priority)
}

type OpenBucket = 'overdue' | 'today' | 'upcoming' | 'noDueDate'

/** Which open-task bucket a due date falls into (mirrors the backend split). */
function openBucketOf(dueDate?: string | null): OpenBucket {
  const ms = dueDayMs(dueDate)
  if (!Number.isFinite(ms)) return 'noDueDate'
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  if (ms < todayStart.getTime()) return 'overdue'
  if (ms === todayStart.getTime()) return 'today'
  return 'upcoming'
}

/** Convert a reassigned workflow step into an open-task row for the queue. */
function workflowTaskToRow(t: MyWorkflowTask): TaskRow {
  return {
    id: `wf:${t.id}`,
    title: t.title,
    dueDate: t.dueDate ?? null,
    completedAt: null,
    status: 'open',
    priority: t.required ? 'high' : 'medium',
    taskType: 'workflow',
    assessmentId: t.assessmentId ?? null,
    leadId: t.leadId ?? null,
    claimType: t.claimType ?? null,
    source: 'workflow',
    stageName: t.stageName ?? null,
    phaseName: t.phaseName ?? null,
    required: t.required,
  }
}

const claimLabel = (s?: string | null) => (s ? formatClaimType(s) : 'Case')

const typeLabel = (t?: string | null) =>
  t === 'coach' ? 'Rose · Next action' : t === 'question' ? 'Rose · Plaintiff questions' : t ? TASK_TYPE_LABEL[t] || claimLabel(t) : '—'

function formatDue(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Overdue / today / soon urgency coloring for the due cell. */
function dueTone(value?: string | null): string {
  if (!value) return 'text-slate-400'
  const t = Date.parse(value)
  if (Number.isNaN(t)) return 'text-slate-400'
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const d = Math.floor((new Date(t).setHours(0, 0, 0, 0) - start.getTime()) / 86_400_000)
  if (d < 0) return 'font-semibold text-rose-600'
  if (d <= 7) return 'font-medium text-amber-600'
  return 'text-slate-500'
}

function priorityBadgeTone(priority?: string | null): BadgeTone {
  const p = (priority || '').toLowerCase()
  if (p === 'high' || p === 'urgent') return 'danger'
  if (p === 'medium') return 'warning'
  return 'neutral'
}

const EMPTY_FORM = { leadId: '', title: '', dueDate: '', priority: 'medium', taskType: 'general', assignedRole: 'attorney' }

// Only "client" reaches the plaintiff's Tasks list and triggers their email.
const ASSIGNEES = [
  { id: 'attorney', label: 'Attorney' },
  { id: 'paralegal', label: 'Paralegal' },
  { id: 'case_manager', label: 'Case manager' },
  { id: 'client', label: 'Client (Plaintiff)' },
]

export default function TasksPage() {
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bucket, setBucket] = useState<Bucket>('all')
  const [caseOptions, setCaseOptions] = useState<CaseOption[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [workflowTasks, setWorkflowTasks] = useState<MyWorkflowTask[]>([])
  const [detail, setDetail] = useState<{ leadId: string; taskId: string; caseLabel?: string } | null>(null)
  // In-app delete confirmation (replaces window.confirm — CP-335)
  const [taskToDelete, setTaskToDelete] = useState<TaskRow | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mergeOpen, setMergeOpen] = useState(false)
  const [merging, setMerging] = useState(false)

  const flash = (tone: 'ok' | 'err', text: string) => {
    setMsg({ tone, text })
    window.setTimeout(() => setMsg(null), 3500)
  }

  const loadTasks = async () => {
    const data = await getAttorneyTaskSummary()
    setSummary({
      overdue: data?.overdue ?? [],
      today: data?.today ?? [],
      upcoming: data?.upcoming ?? [],
      noDueDate: data?.noDueDate ?? [],
      recentlyCompleted: data?.recentlyCompleted ?? [],
    })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadTasks()
      .catch((err) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load tasks'))
      .finally(() => !cancelled && setLoading(false))
    // Case list for the quick-add picker.
    getAttorneyDashboard()
      .then((dash: any) => {
        if (cancelled) return
        const opts = ((dash?.recentLeads as any[]) || [])
          .map((l) => {
            const venue = [l?.assessment?.venueCounty, l?.assessment?.venueState].filter(Boolean).join(', ')
            const name = caseCaptionOf(l?.assessment)
            const label = `${claimLabel(l?.assessment?.claimType)} — ${name || venue || 'Case'}`
            return { id: l.id as string, label }
          })
          .sort((a, b) => a.label.localeCompare(b.label))
        setCaseOptions(opts)
      })
      .catch(() => setCaseOptions([]))
    // Workflow steps assigned to me across all cases.
    getMyWorkflowTasks()
      .then((res) => {
        if (!cancelled) setWorkflowTasks(res?.tasks ?? [])
      })
      .catch(() => setWorkflowTasks([]))
    return () => {
      cancelled = true
    }
  }, [])

  // Open-task buckets with the caller's reassigned workflow steps folded in, so a
  // reassigned step counts and shows under "All open tasks" — not just the
  // dedicated workflow section (CP-333).
  const openBuckets = useMemo(() => {
    const base: Record<OpenBucket, TaskRow[]> = {
      overdue: [...(summary?.overdue ?? [])],
      today: [...(summary?.today ?? [])],
      upcoming: [...(summary?.upcoming ?? [])],
      noDueDate: [...(summary?.noDueDate ?? [])],
    }
    for (const wf of workflowTasks) {
      base[openBucketOf(wf.dueDate)].push(workflowTaskToRow(wf))
    }
    return base
  }, [summary, workflowTasks])

  const rows = useMemo<TaskRow[]>(() => {
    if (!summary) return []
    if (bucket === 'completed') return summary.recentlyCompleted ?? []
    const base =
      bucket === 'all'
        ? [...openBuckets.overdue, ...openBuckets.today, ...openBuckets.upcoming, ...openBuckets.noDueDate]
        : openBuckets[bucket] ?? []
    // Organize by day (soonest/overdue first), then by priority within each day.
    return [...base].sort(byDayThenPriority)
  }, [summary, bucket, openBuckets])

  const viewingCompleted = bucket === 'completed'

  const toggle = (key: Bucket) => setBucket((prev) => (prev === key ? 'all' : key))

  const setTaskStatus = async (row: TaskRow, status: 'done' | 'open') => {
    if (!row.leadId) {
      flash('err', 'Cannot update this task. Missing case reference.')
      return
    }
    setBusyId(row.id)
    try {
      await updateLeadTask(row.leadId, row.id, { status })
      await loadTasks()
      flash('ok', status === 'done' ? 'Task completed.' : 'Task reopened.')
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to update task.')
    } finally {
      setBusyId(null)
    }
  }

  const setTaskApproval = async (row: TaskRow, approved: boolean) => {
    if (!row.leadId) {
      flash('err', `Cannot ${approved ? 'approve' : 'unapprove'} this task. Missing case reference.`)
      return
    }
    setBusyId(row.id)
    try {
      if (approved) await approveLeadTask(row.leadId, row.id)
      else await unapproveLeadTask(row.leadId, row.id)
      await loadTasks()
      flash(
        'ok',
        approved
          ? 'Task approved. It is now live and assigned.'
          : 'Approval taken back. The task is un-assigned and back in review.',
      )
    } catch (err: any) {
      flash('err', err?.response?.data?.error || `Failed to ${approved ? 'approve' : 'unapprove'} task.`)
    } finally {
      setBusyId(null)
    }
  }

  /**
   * Whether a row can join a merge.
   *
   * Workflow steps are not CaseTasks at all, and the plaintiff-questions task is
   * rebuilt on every AI run so a merge would not survive.
   */
  const isMergeable = (row: TaskRow) => row.source !== 'workflow' && row.taskType !== 'question' && Boolean(row.leadId)

  // This queue interleaves cases, so a merge is confined to whichever case the
  // first selected task belongs to. The server re-checks per id regardless.
  const selectedRows = rows.filter((r) => selected.has(r.id))
  const mergeAnchor = selectedRows[0] ?? null
  const mergeable = selectedRows.filter((r) => isMergeable(r) && r.leadId === mergeAnchor?.leadId)
  const excludedFromMerge = selectedRows.length - mergeable.length

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const mergeTasks = async (survivorId: string) => {
    const leadId = mergeAnchor?.leadId
    if (!leadId) return
    setMerging(true)
    try {
      const result = await mergeLeadTasks(leadId, survivorId, mergeable.filter((t) => t.id !== survivorId).map((t) => t.id))
      flash('ok', `Merged ${result.mergedCount + 1} tasks into "${result.title}".`)
      setSelected(new Set())
      setMergeOpen(false)
      await loadTasks()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Could not merge those tasks.')
    } finally {
      setMerging(false)
    }
  }

  const removeTask = (row: TaskRow) => {
    if (!row.leadId) {
      flash('err', 'Cannot delete this task. Missing case reference.')
      return
    }
    setTaskToDelete(row)
  }

  const confirmRemoveTask = async () => {
    const row = taskToDelete
    if (!row?.leadId) return
    setBusyId(row.id)
    try {
      await deleteLeadTask(row.leadId, row.id)
      await loadTasks()
      flash('ok', 'Task deleted.')
      setTaskToDelete(null)
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to delete task.')
    } finally {
      setBusyId(null)
    }
  }

  const submitAdd = async () => {
    if (!form.leadId) {
      flash('err', 'Choose a case for the task.')
      return
    }
    if (!form.title.trim()) {
      flash('err', 'Task title is required.')
      return
    }
    setSaving(true)
    try {
      await createLeadTask(form.leadId, {
        title: form.title.trim(),
        dueDate: form.dueDate || null,
        priority: form.priority,
        taskType: form.taskType,
        assignedRole: form.assignedRole,
        status: 'open',
      })
      setForm(EMPTY_FORM)
      setFormOpen(false)
      await loadTasks()
      flash('ok', 'Task added.')
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to add task.')
    } finally {
      setSaving(false)
    }
  }

  const taskColumns: DataTableColumn<TaskRow>[] = [
    {
      key: 'select',
      header: '',
      cellClassName: 'w-8',
      cell: (r) => {
        // Cross-case merges are impossible, so once something is picked the rest
        // of the queue's other cases go quiet rather than failing on submit.
        const wrongCase = Boolean(mergeAnchor) && r.leadId !== mergeAnchor?.leadId
        const disabled = !isMergeable(r) || wrongCase
        return (
          <input
            type="checkbox"
            checked={selected.has(r.id)}
            onChange={() => toggleSelected(r.id)}
            disabled={disabled && !selected.has(r.id)}
            aria-label={`Select ${r.title}`}
            title={
              r.source === 'workflow'
                ? 'Workflow steps cannot be merged'
                : r.taskType === 'question'
                  ? 'The plaintiff questions task is maintained automatically and cannot be merged'
                  : wrongCase
                    ? 'Tasks from different cases cannot be merged'
                    : 'Select to merge'
            }
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400 disabled:opacity-30"
          />
        )
      },
    },
    {
      key: 'done',
      header: '',
      cellClassName: 'w-10',
      cell: (r) =>
        r.source === 'workflow' ? (
          <ListChecks className="h-5 w-5 text-indigo-500" aria-label="Workflow step: complete it in the case Workflow tab" />
        ) : busyId === r.id ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : viewingCompleted ? (
          <button
            onClick={() => setTaskStatus(r, 'open')}
            className="group/done relative inline-flex text-emerald-500 transition hover:text-slate-400 disabled:opacity-50"
            title="Reopen task"
            aria-label="Reopen task"
          >
            <CheckCircle2 className="h-5 w-5 group-hover/done:hidden" />
            <Circle className="hidden h-5 w-5 group-hover/done:inline" />
          </button>
        ) : (
          <button
            onClick={() => setTaskStatus(r, 'done')}
            className="group/done relative inline-flex text-slate-300 transition hover:text-emerald-500 disabled:opacity-50"
            title="Mark as done"
            aria-label="Mark as done"
          >
            <Circle className="h-5 w-5 group-hover/done:hidden" />
            <CheckCircle2 className="hidden h-5 w-5 text-emerald-500 group-hover/done:inline" />
          </button>
        ),
    },
    {
      key: 'title',
      header: 'Task',
      cell: (r) =>
        r.source === 'workflow' ? (
          <span className="inline-flex items-center gap-2">
            <ClientLink name={r.title} leadId={r.leadId} section="workflow" />
            {r.required && (
              <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-600 ring-1 ring-rose-200">
                Required
              </span>
            )}
          </span>
        ) : r.leadId ? (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDetail({ leadId: r.leadId as string, taskId: r.id, caseLabel: claimLabel(r.claimType) })}
              className={`text-left transition hover:text-brand-700 hover:underline ${
                viewingCompleted ? 'font-medium text-slate-500 line-through' : 'font-medium text-slate-800'
              }`}
            >
              {r.title}
            </button>
            <TaskOriginBadge taskType={r.taskType} />
            {r.reviewStatus === 'pending' && <PendingReviewBadge />}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className={viewingCompleted ? 'font-medium text-slate-500 line-through' : 'font-medium text-slate-800'}>{r.title}</span>
            <TaskOriginBadge taskType={r.taskType} />
            {r.reviewStatus === 'pending' && <PendingReviewBadge />}
          </span>
        ),
    },
    { key: 'case', header: 'Case', cell: (r) => <ClientLink name={claimLabel(r.claimType)} leadId={r.leadId} section="tasks" /> },
    { key: 'type', header: 'Type', cell: (r) => <span className="text-slate-500">{typeLabel(r.taskType)}</span> },
    {
      key: 'due',
      header: viewingCompleted ? 'Completed' : 'Due',
      cell: (r) =>
        viewingCompleted ? (
          <span className="text-emerald-600">{formatDue(r.completedAt)}</span>
        ) : (
          <span className={dueTone(r.dueDate)}>{formatDue(r.dueDate)}</span>
        ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (r) => <Badge tone={priorityBadgeTone(r.priority)}>{claimLabel(r.priority) || 'Normal'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cellClassName: 'w-24',
      cell: (r) =>
        r.source === 'workflow' ? null : (
          <div className="flex items-center justify-end gap-1.5">
            {r.reviewStatus === 'pending' && r.leadId ? (
              <button
                onClick={() => void setTaskApproval(r, true)}
                disabled={busyId === r.id}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                title="Approve: assign it and make it live"
              >
                <BadgeCheck className="h-3.5 w-3.5" /> Approve
              </button>
            ) : null}
            {r.reviewStatus === 'approved' && r.leadId && !viewingCompleted ? (
              <button
                onClick={() => void setTaskApproval(r, false)}
                disabled={busyId === r.id}
                className="text-slate-300 transition hover:text-amber-600 disabled:opacity-50"
                title="Unapprove: un-assign it and send it back for review"
                aria-label="Unapprove task"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            ) : null}
            <button
              onClick={() => removeTask(r)}
              disabled={busyId === r.id}
              className="text-slate-300 transition hover:text-rose-600 disabled:opacity-50"
              title={r.reviewStatus === 'pending' ? 'Reject task' : 'Delete task'}
              aria-label={r.reviewStatus === 'pending' ? 'Reject task' : 'Delete task'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
    },
  ]

  const workflowColumns: DataTableColumn<MyWorkflowTask>[] = [
    {
      key: 'title',
      header: 'Workflow step',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="font-medium text-slate-800">{r.title}</span>
          {r.required && (
            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-600 ring-1 ring-rose-200">
              Required
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      cell: (r) => (
        <span className="text-slate-500">
          {[r.phaseName, r.stageName].filter(Boolean).join(' · ') || '—'}
        </span>
      ),
    },
    {
      key: 'case',
      header: 'Case',
      cell: (r) => <ClientLink name={claimLabel(r.claimType)} leadId={r.leadId} section="workflow" />,
    },
    {
      key: 'due',
      header: 'Due',
      cell: (r) => <span className={dueTone(r.dueDate)}>{formatDue(r.dueDate)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      {detail ? (
        <TaskDetailModal
          leadId={detail.leadId}
          taskId={detail.taskId}
          caseLabel={detail.caseLabel}
          onClose={() => setDetail(null)}
          onChanged={() => void loadTasks()}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title="Delete task?"
        message={
          taskToDelete ? (
            <>
              This will permanently delete <span className="font-semibold">"{taskToDelete.title}"</span>. This can't be undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete task"
        busy={Boolean(busyId) && busyId === taskToDelete?.id}
        onConfirm={() => void confirmRemoveTask()}
        onCancel={() => setTaskToDelete(null)}
      />
      <PageHeader
        title="Tasks"
        description="A cross-case queue that rolls up every case's task list so nothing slips. Complete, add, or open any task without leaving the page. Changes sync to each case's Tasks tab."
        actions={
          !formOpen ? (
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Quick add
            </button>
          ) : null
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

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-2.5 text-sm">
          <span className="font-semibold text-slate-700">{selected.size} selected</span>
          {excludedFromMerge > 0 ? (
            <span className="text-xs text-slate-500">{excludedFromMerge} cannot be merged</span>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white"
            >
              Clear
            </button>
            <button
              onClick={() => setMergeOpen(true)}
              disabled={mergeable.length < 2}
              title={mergeable.length < 2 ? 'Select at least two mergeable tasks on the same case' : 'Merge the selected tasks into one'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
            >
              <Merge className="h-4 w-4" /> Merge {mergeable.length > 1 ? mergeable.length : ''}
            </button>
          </div>
        </div>
      ) : null}

      {mergeOpen ? (
        <MergeTasksDialog
          tasks={mergeable.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, priority: t.priority }))}
          busy={merging}
          onCancel={() => setMergeOpen(false)}
          onConfirm={(survivorId) => void mergeTasks(survivorId)}
        />
      ) : null}

      {formOpen ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">New task</h3>
            <button
              onClick={() => {
                setFormOpen(false)
                setForm(EMPTY_FORM)
              }}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-600"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Case *</label>
              <select
                value={form.leadId}
                onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Select a case…</option>
                {caseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && form.title.trim() && form.leadId) submitAdd()
                }}
                placeholder="e.g. Follow up with adjuster on reservation of rights"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                min={todayDateKey()}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Type</label>
                <select
                  value={form.taskType}
                  onChange={(e) => {
                    const next = e.target.value
                    setForm((f) => ({
                      ...f,
                      taskType: next,
                      assignedRole: next === 'client' ? 'client' : f.assignedRole,
                    }))
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Assign to</label>
              <select
                value={form.assignedRole}
                onChange={(e) => setForm((f) => ({ ...f, assignedRole: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              >
                {ASSIGNEES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              <p className={`mt-1 text-[11px] ${form.assignedRole === 'client' ? 'text-emerald-600' : 'text-slate-500'}`}>
                {form.assignedRole === 'client'
                  ? 'The plaintiff will see this in their Tasks and get an email.'
                  : 'Internal: only your firm sees this.'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setFormOpen(false)
                setForm(EMPTY_FORM)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submitAdd}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add task
            </button>
          </div>
        </div>
      ) : null}

      <SectionCard
        title="Workflow steps assigned to me"
        trailing={<Badge tone="brand">{workflowTasks.length}</Badge>}
      >
        <DataTable
          columns={workflowColumns}
          rows={[...workflowTasks].sort(
            (a, b) => dueDayMs(a.dueDate) - dueDayMs(b.dueDate) || Number(b.required) - Number(a.required),
          )}
          rowKey={(r) => r.id}
          emptyMessage="No workflow steps assigned to you yet. When a workflow is applied to a case and a step is assigned to you, it appears here."
        />
      </SectionCard>

      <StatGrid columns={5}>
        <FilterStat
          value={openBuckets.overdue.length}
          label="Overdue"
          tone="danger"
          active={bucket === 'overdue'}
          onClick={() => toggle('overdue')}
        />
        <FilterStat
          value={openBuckets.today.length}
          label="Due today"
          tone="warning"
          active={bucket === 'today'}
          onClick={() => toggle('today')}
        />
        <FilterStat
          value={openBuckets.upcoming.length}
          label="Upcoming"
          tone="info"
          active={bucket === 'upcoming'}
          onClick={() => toggle('upcoming')}
        />
        <FilterStat
          value={openBuckets.noDueDate.length}
          label="No due date"
          active={bucket === 'noDueDate'}
          onClick={() => toggle('noDueDate')}
        />
        <FilterStat
          value={summary?.recentlyCompleted.length ?? 0}
          label="Completed"
          tone="success"
          active={bucket === 'completed'}
          onClick={() => toggle('completed')}
        />
      </StatGrid>

      <SectionCard title={BUCKET_LABEL[bucket]} trailing={<Badge tone="brand">{rows.length} shown</Badge>}>
        <DataTable
          columns={taskColumns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          loadingMessage="Loading tasks…"
          emptyMessage={viewingCompleted ? 'No completed tasks yet.' : 'No tasks match this filter.'}
        />
      </SectionCard>
    </div>
  )
}
