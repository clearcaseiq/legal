import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, ListChecks, Loader2, Plus, Trash2, X } from 'lucide-react'
import {
  getAttorneyTaskSummary,
  getAttorneyDashboard,
  createLeadTask,
  updateLeadTask,
  deleteLeadTask,
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

interface TaskRow {
  id: string
  title: string
  dueDate?: string | null
  completedAt?: string | null
  status?: string | null
  priority?: string | null
  taskType?: string | null
  assessmentId?: string | null
  leadId?: string | null
  claimType?: string | null
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

const claimLabel = (s?: string | null) =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Case'

const typeLabel = (t?: string | null) => (t ? TASK_TYPE_LABEL[t] || claimLabel(t) : '—')

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

const EMPTY_FORM = { leadId: '', title: '', dueDate: '', priority: 'medium', taskType: 'general' }

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
            const u = l?.assessment?.user
            const name = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : ''
            const venue = [l?.assessment?.venueCounty, l?.assessment?.venueState].filter(Boolean).join(', ')
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

  const rows = useMemo<TaskRow[]>(() => {
    if (!summary) return []
    if (bucket === 'all') return [...summary.overdue, ...summary.today, ...summary.upcoming, ...summary.noDueDate]
    if (bucket === 'completed') return summary.recentlyCompleted ?? []
    return summary[bucket] ?? []
  }, [summary, bucket])

  const viewingCompleted = bucket === 'completed'

  const toggle = (key: Bucket) => setBucket((prev) => (prev === key ? 'all' : key))

  const setTaskStatus = async (row: TaskRow, status: 'done' | 'open') => {
    if (!row.leadId) {
      flash('err', 'Cannot update this task — missing case reference.')
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

  const removeTask = async (row: TaskRow) => {
    if (!row.leadId) {
      flash('err', 'Cannot delete this task — missing case reference.')
      return
    }
    if (!window.confirm(`Delete task "${row.title}"? This can't be undone.`)) return
    setBusyId(row.id)
    try {
      await deleteLeadTask(row.leadId, row.id)
      await loadTasks()
      flash('ok', 'Task deleted.')
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
      key: 'done',
      header: '',
      cellClassName: 'w-10',
      cell: (r) =>
        busyId === r.id ? (
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
      cell: (r) => (
        <span className={viewingCompleted ? 'font-medium text-slate-500 line-through' : 'font-medium text-slate-800'}>{r.title}</span>
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
      cellClassName: 'w-10',
      cell: (r) => (
        <button
          onClick={() => removeTask(r)}
          disabled={busyId === r.id}
          className="text-slate-300 transition hover:text-rose-600 disabled:opacity-50"
          title="Delete task"
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
      <PageHeader
        title="Tasks"
        description="A cross-case queue that rolls up every case's task list so nothing slips. Complete, add, or open any task without leaving the page — changes sync to each case's Tasks tab."
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
                  onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value }))}
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

      {workflowTasks.length > 0 && (
        <SectionCard
          title="Workflow steps assigned to me"
          trailing={<Badge tone="brand">{workflowTasks.length}</Badge>}
        >
          <DataTable
            columns={workflowColumns}
            rows={workflowTasks}
            rowKey={(r) => r.id}
            emptyMessage="No workflow steps assigned to you."
          />
        </SectionCard>
      )}

      <StatGrid columns={5}>
        <FilterStat
          value={summary?.overdue.length ?? 0}
          label="Overdue"
          tone="danger"
          active={bucket === 'overdue'}
          onClick={() => toggle('overdue')}
        />
        <FilterStat
          value={summary?.today.length ?? 0}
          label="Due today"
          tone="warning"
          active={bucket === 'today'}
          onClick={() => toggle('today')}
        />
        <FilterStat
          value={summary?.upcoming.length ?? 0}
          label="Upcoming"
          tone="info"
          active={bucket === 'upcoming'}
          onClick={() => toggle('upcoming')}
        />
        <FilterStat
          value={summary?.noDueDate.length ?? 0}
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
