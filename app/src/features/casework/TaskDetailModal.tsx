/**
 * MyCase-style task detail modal. Opens from any task row (global Tasks page or a
 * case's Tasks tab) and shows status/due/priority cards, a subtasks checklist,
 * description, created-by, assignee, time estimate, reminders, and a
 * Comments/History panel. All edits autosave and refresh the caller via onChanged.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  X,
  Loader2,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  User as UserIcon,
  Clock,
  Bell,
  MessageSquare,
  History as HistoryIcon,
  Send,
  ShieldAlert,
  BadgeCheck,
  Undo2,
  Sparkles,
} from 'lucide-react'
import { todayDateKey } from '../../lib/taskDueDate'
import {
  getTaskDetail,
  updateLeadTask,
  deleteLeadTask,
  approveLeadTask,
  unapproveLeadTask,
  getTaskComments,
  addTaskComment,
  getTaskHistory,
  getFirmColleagues,
  type TaskDetail,
  type TaskSubtask,
  type TaskComment,
  type TaskHistoryEntry,
  type FirmColleague,
} from '../../lib/api'
import { isAiTask } from './TaskOriginBadge'
import ModalPortal from '../../components/ModalPortal'
import ConfirmDialog from '../../components/ConfirmDialog'

interface TaskDetailModalProps {
  leadId: string
  taskId: string
  caseLabel?: string | null
  onClose: () => void
  onChanged?: () => void
}

const PRIORITY_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
]

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
  none: 'bg-slate-300',
}

function toDateInput(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtDateTime(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtMinutes(min?: number | null): string {
  if (!min || min <= 0) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ') || '0m'
}

/** Turn an audit entry into a human-readable history line. */
function describeHistory(entry: TaskHistoryEntry): string {
  const m = entry.metadata || {}
  switch (entry.action) {
    case 'task_created':
      return `created this task`
    case 'task_status_changed':
      return `marked the task ${m.to === 'done' ? 'complete' : 'incomplete'}`
    case 'task_assigned':
      return `assigned the task to ${m.assignee || 'someone'}`
    case 'task_due_changed':
      return m.dueDate ? `set the due date to ${new Date(m.dueDate).toLocaleDateString()}` : `cleared the due date`
    case 'task_subtasks_updated':
      return `updated subtasks (${m.completed ?? 0}/${m.total ?? 0} complete)`
    case 'task_renamed':
      return `renamed the task${m.title ? ` to "${m.title}"` : ''}`
    case 'task_priority_changed':
      return `changed priority to ${m.priority || 'none'}`
    case 'task_estimate_changed':
      return m.estimateMinutes ? `set the time estimate to ${fmtMinutes(Number(m.estimateMinutes))}` : `cleared the time estimate`
    case 'task_comment_added':
      return `commented: "${String(m.snippet || '').trim()}"`
    case 'task_review_approved':
      return `approved this AI task${m.assignee ? `, assigning it to ${m.assignee}` : ''}`
    case 'task_review_unapproved':
      return `sent this AI task back for review`
    case 'tasks_merged': {
      const count = Number(m.mergedCount ?? 0)
      const titles = Array.isArray(m.mergedTitles) ? m.mergedTitles.join('", "') : ''
      return `merged ${count} ${count === 1 ? 'task' : 'tasks'} into this one${titles ? `: "${titles}"` : ''}`
    }
    case 'task_merged_away':
      return `merged this task into${m.intoTitle ? ` "${m.intoTitle}"` : ' another task'}`
    default:
      return entry.action.replace(/_/g, ' ')
  }
}

export default function TaskDetailModal({ leadId, taskId, caseLabel, onClose, onChanged }: TaskDetailModalProps) {
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [approving, setApproving] = useState(false)
  // In-app delete confirmation (replaces window.confirm — CP-347)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [newSubtask, setNewSubtask] = useState('')

  const [tab, setTab] = useState<'comments' | 'history'>('comments')
  const [comments, setComments] = useState<TaskComment[]>([])
  const [history, setHistory] = useState<TaskHistoryEntry[]>([])
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)

  const [estHours, setEstHours] = useState('')
  const [estMins, setEstMins] = useState('')

  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIdx, setMentionIdx] = useState(0)
  const [colleagues, setColleagues] = useState<FirmColleague[]>([])
  const commentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    getFirmColleagues().then((r) => setColleagues(r.colleagues || [])).catch(() => {})
  }, [])

  const filteredColleagues = mentionQuery
    ? colleagues.filter((c) => c.name.toLowerCase().includes(mentionQuery.toLowerCase()) || c.email?.toLowerCase().includes(mentionQuery.toLowerCase()))
    : colleagues

  const insertMention = (c: FirmColleague) => {
    const ta = commentRef.current
    if (!ta) return
    const pos = ta.selectionStart ?? commentText.length
    const before = commentText.slice(0, pos)
    const atIdx = before.lastIndexOf('@')
    if (atIdx === -1) return
    const tag = c.email ? `@${c.email}` : `@${c.name.replace(/\s+/g, '_')}`
    const insertion = `${tag} `
    const newText = commentText.slice(0, atIdx) + insertion + commentText.slice(pos)
    setCommentText(newText)
    setMentionOpen(false)
    setMentionQuery('')
    setTimeout(() => {
      ta.focus()
      const cursor = atIdx + insertion.length
      ta.setSelectionRange(cursor, cursor)
    }, 0)
  }

  const handleCommentChange = (value: string) => {
    setCommentText(value)
    const ta = commentRef.current
    if (!ta) return
    const pos = ta.selectionStart ?? value.length
    const before = value.slice(0, pos)
    const atIdx = before.lastIndexOf('@')
    if (atIdx >= 0 && (atIdx === 0 || /\s/.test(before[atIdx - 1]))) {
      const query = before.slice(atIdx + 1)
      if (!/\s/.test(query)) {
        setMentionOpen(true)
        setMentionQuery(query)
        setMentionIdx(0)
        return
      }
    }
    setMentionOpen(false)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await getTaskDetail(leadId, taskId)
      setTask(d)
      setTitle(d.title || '')
      setNotes(d.notes || '')
      const est = d.estimateMinutes || 0
      setEstHours(est ? String(Math.floor(est / 60)) : '')
      setEstMins(est ? String(est % 60) : '')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load task.')
    } finally {
      setLoading(false)
    }
  }, [leadId, taskId])

  useEffect(() => {
    void load()
  }, [load])

  const loadComments = useCallback(async () => {
    try {
      setComments(await getTaskComments(leadId, taskId))
    } catch {
      /* non-fatal */
    }
  }, [leadId, taskId])

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await getTaskHistory(leadId, taskId))
    } catch {
      /* non-fatal */
    }
  }, [leadId, taskId])

  useEffect(() => {
    if (tab === 'comments') void loadComments()
    else void loadHistory()
  }, [tab, loadComments, loadHistory])

  /** Patch the task with a partial change, then refresh detail + caller. */
  const patch = useCallback(
    async (partial: Record<string, any>) => {
      setSaving(true)
      try {
        await updateLeadTask(leadId, taskId, partial)
        const d = await getTaskDetail(leadId, taskId)
        setTask(d)
        onChanged?.()
        // History reflects the change; refresh if visible.
        if (tab === 'history') void loadHistory()
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to save change.')
      } finally {
        setSaving(false)
      }
    },
    [leadId, taskId, onChanged, tab, loadHistory],
  )

  const saveSubtasks = (next: TaskSubtask[]) => patch({ subtasks: next })

  const toggleSubtask = (id: string) => {
    if (!task) return
    saveSubtasks(task.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)))
  }
  const removeSubtask = (id: string) => {
    if (!task) return
    saveSubtasks(task.subtasks.filter((s) => s.id !== id))
  }
  const addSubtask = () => {
    if (!task || !newSubtask.trim()) return
    saveSubtasks([...task.subtasks, { id: '', title: newSubtask.trim(), done: false }])
    setNewSubtask('')
  }

  const saveEstimate = () => {
    const h = Number(estHours) || 0
    const m = Number(estMins) || 0
    const total = h * 60 + m
    void patch({ estimateMinutes: total > 0 ? total : null })
  }

  const remove = () => setConfirmingDelete(true)

  const confirmRemove = async () => {
    setDeleting(true)
    try {
      await deleteLeadTask(leadId, taskId)
      onChanged?.()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete task.')
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  const setApproval = async (approved: boolean) => {
    setApproving(true)
    try {
      if (approved) await approveLeadTask(leadId, taskId)
      else await unapproveLeadTask(leadId, taskId)
      const d = await getTaskDetail(leadId, taskId)
      setTask(d)
      onChanged?.()
      if (tab === 'history') void loadHistory()
    } catch (err: any) {
      setError(
        err?.response?.data?.error || (approved ? 'Failed to approve task.' : 'Failed to unapprove task.'),
      )
    } finally {
      setApproving(false)
    }
  }

  const submitComment = async () => {
    if (!commentText.trim()) return
    setPosting(true)
    try {
      await addTaskComment(leadId, taskId, commentText.trim())
      setCommentText('')
      await loadComments()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to post comment.')
    } finally {
      setPosting(false)
    }
  }

  const done = task?.status === 'done'
  // Server-generated tasks (the grouped "Questions for the plaintiff" task in
  // particular) can arrive without these collections. Reading them unguarded
  // threw during render and left an empty modal (CP-452).
  const subtasks = task?.subtasks ?? []
  const members = task?.members ?? []
  const subtaskDone = subtasks.filter((s) => s.done).length
  const subtaskTotal = subtasks.length

  return (
    <ModalPortal>
    {/* Center short dialogs; tall plaintiff-questions content still scrolls.
        items-start previously left a large blank band under short tasks (CP-452). */}
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete task?"
        message={
          <>
            This will permanently delete <span className="font-semibold">"{task?.title || 'this task'}"</span>. This can't be undone.
          </>
        }
        confirmLabel="Delete task"
        busy={deleting}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setConfirmingDelete(false)}
      />
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative my-4 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== task?.title && patch({ title: title.trim() })}
              placeholder="Task title"
              className="w-full rounded-lg border border-transparent px-1 py-0.5 text-lg font-semibold text-slate-900 hover:border-slate-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            {caseLabel ? (
              <p className="mt-0.5 px-1 text-sm text-slate-500">
                Case: <span className="font-medium text-slate-700">{caseLabel}</span>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
            <button
              onClick={remove}
              disabled={deleting}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              title="Delete task"
              aria-label="Delete task"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading task…
          </div>
        ) : !task ? (
          <div className="px-5 py-16 text-center text-sm text-rose-600">{error || 'Task not found.'}</div>
        ) : (
          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_20rem]">
            {/* Left column */}
            <div className="space-y-5">
              {error ? (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
              ) : null}

              {/* AI review gate: held until a case manager approves it. */}
              {task.reviewStatus === 'pending' ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="text-sm text-amber-800">
                      <div className="font-semibold">Pending review</div>
                      <p className="text-xs text-amber-700">
                        This task was generated by AI and is held for review. Approve it to assign it and make it live.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => void setApproval(true)}
                    disabled={approving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                    Approve
                  </button>
                </div>
              ) : task.reviewStatus === 'approved' ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="text-sm text-emerald-800">
                      <div className="font-semibold">
                        Approved{task.reviewedByName ? ` by ${task.reviewedByName}` : ''}
                        {task.reviewedAt ? ` on ${fmtDateTime(task.reviewedAt)}` : ''}
                      </div>
                      <p className="text-xs text-emerald-700">
                        {done
                          ? 'This task is complete, so it can no longer be sent back for review.'
                          : 'Unapprove to send it back for review. It will be un-assigned until someone approves it again.'}
                      </p>
                    </div>
                  </div>
                  {!done ? (
                    <button
                      onClick={() => void setApproval(false)}
                      disabled={approving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                      Unapprove
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* Status / Due / Priority cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</div>
                  <select
                    value={done ? 'done' : 'open'}
                    onChange={(e) => patch({ status: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  >
                    <option value="open">Incomplete</option>
                    <option value="done">Complete</option>
                  </select>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Due date</div>
                  <input
                    type="date"
                    value={toDateInput(task.dueDate)}
                    // An already-overdue task (an expired SOL, say) still shows
                    // its real date; this only stops it being moved further back.
                    min={todayDateKey()}
                    onChange={(e) => patch({ dueDate: e.target.value || null })}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Priority</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority || 'none']}`} />
                    <select
                      value={task.priority || 'none'}
                      onChange={(e) => patch({ priority: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  Subtasks
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {subtaskDone} / {subtaskTotal} completed
                  </span>
                </div>
                <ul className="space-y-1">
                  {subtasks.map((s) => (
                    <li key={s.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50">
                      <button
                        onClick={() => toggleSubtask(s.id)}
                        className={s.done ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-500'}
                        aria-label={s.done ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {s.done ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>
                      <span className={`flex-1 text-sm ${s.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {s.title}
                      </span>
                      <button
                        onClick={() => removeSubtask(s.id)}
                        className="text-slate-300 opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
                        aria-label="Remove subtask"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addSubtask()
                    }}
                    placeholder="Add a subtask…"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  />
                  <button
                    onClick={addSubtask}
                    disabled={!newSubtask.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-800">Description</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => notes !== (task.notes || '') && patch({ notes: notes || null })}
                  rows={3}
                  placeholder="Add details, context, or instructions…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              {/* Field grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    {isAiTask(task.taskType) ? (
                      <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    ) : (
                      <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    Created By
                  </div>
                  <div className="text-sm text-slate-700">{task.createdByName || '—'}</div>
                  {isAiTask(task.taskType) ? (
                    // Spell out the division of labour: Rose raises the task, a
                    // person still has to do it. Without this the AI credit reads
                    // as though Rose were handling it.
                    <p className="mt-0.5 text-xs text-slate-500">
                      Rose raised this task. It is assigned to your team to action.
                    </p>
                  ) : null}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" /> Assignee
                  </div>
                  <select
                    value={task.assignedUserId || ''}
                    onChange={(e) => patch({ assignedUserId: e.target.value || null })}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                        {m.roleLabel ? ` (${m.roleLabel})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-slate-400" /> Time Estimate
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={estHours}
                      onChange={(e) => setEstHours(e.target.value)}
                      onBlur={saveEstimate}
                      placeholder="0"
                      className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                    />
                    <span className="text-xs text-slate-400">h</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={estMins}
                      onChange={(e) => setEstMins(e.target.value)}
                      onBlur={saveEstimate}
                      placeholder="0"
                      className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                    />
                    <span className="text-xs text-slate-400">m</span>
                  </div>
                  {task.loggedMinutes && task.loggedMinutes > 0 ? (
                    <div className="mt-1 text-xs text-slate-500">{fmtMinutes(task.loggedMinutes)} logged</div>
                  ) : null}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Bell className="h-3.5 w-3.5 text-slate-400" /> Reminder
                  </div>
                  <input
                    type="datetime-local"
                    value={toDateTimeLocal(task.reminderAt)}
                    onChange={(e) => patch({ reminderAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>
            </div>

            {/* Right column: Comments / History */}
            <div className="flex flex-col rounded-xl border border-slate-200">
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setTab('comments')}
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition ${
                    tab === 'comments' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" /> Comments
                </button>
                <button
                  onClick={() => setTab('history')}
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition ${
                    tab === 'history' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <HistoryIcon className="h-4 w-4" /> History
                </button>
              </div>

              {tab === 'comments' ? (
                <div className="flex min-h-0 flex-col">
                  <div className="max-h-72 flex-1 space-y-3 overflow-y-auto p-3">
                    {comments.length === 0 ? (
                      <p className="py-4 text-center text-sm text-slate-400">No comments yet.</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="rounded-lg bg-slate-50 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-700">{c.authorName || 'Someone'}</span>
                            <span className="text-[11px] text-slate-400">{fmtDateTime(c.createdAt)}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{c.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="relative border-t border-slate-200 p-2.5">
                    {mentionOpen && filteredColleagues.length > 0 && (
                      <div className="absolute bottom-full left-2.5 right-2.5 z-10 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {filteredColleagues.slice(0, 8).map((c, i) => (
                          <button
                            key={c.userId}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); insertMention(c) }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${i === mentionIdx ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}
                          >
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                              {c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                            <span className="font-medium">{c.name}</span>
                            {c.email && <span className="text-xs text-slate-400">{c.email}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      ref={commentRef}
                      value={commentText}
                      onChange={(e) => handleCommentChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (mentionOpen && filteredColleagues.length > 0) {
                          if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => Math.min(i + 1, Math.min(filteredColleagues.length, 8) - 1)) }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => Math.max(i - 1, 0)) }
                          else if (e.key === 'Enter') { e.preventDefault(); insertMention(filteredColleagues[mentionIdx]) }
                          else if (e.key === 'Escape') { e.preventDefault(); setMentionOpen(false) }
                          return
                        }
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment()
                      }}
                      rows={2}
                      placeholder="Write a comment… type @ to mention a colleague"
                      className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                    />
                    <div className="mt-1.5 flex justify-end">
                      <button
                        onClick={submitComment}
                        disabled={posting || !commentText.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                      >
                        {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Comment
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-h-72 space-y-3 overflow-y-auto p-3">
                  {history.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400">No activity yet.</p>
                  ) : (
                    history.map((h) => (
                      <div key={h.id} className="flex gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                        <div>
                          <span className="font-medium text-slate-700">{h.actor}</span>{' '}
                          <span className="text-slate-500">{describeHistory(h)}</span>
                          <div className="text-[11px] text-slate-400">{fmtDateTime(h.createdAt)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  )
}
