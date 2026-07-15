/**
 * MyCase-style task detail modal. Opens from any task row (global Tasks page or a
 * case's Tasks tab) and shows status/due/priority cards, a subtasks checklist,
 * description, created-by, assignee, time estimate, reminders, and a
 * Comments/History panel. All edits autosave and refresh the caller via onChanged.
 */
import { useCallback, useEffect, useState } from 'react'
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
} from 'lucide-react'
import {
  getTaskDetail,
  updateLeadTask,
  deleteLeadTask,
  getTaskComments,
  addTaskComment,
  getTaskHistory,
  type TaskDetail,
  type TaskSubtask,
  type TaskComment,
  type TaskHistoryEntry,
} from '../../lib/api'

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

  const remove = async () => {
    if (!window.confirm(`Delete task "${task?.title || ''}"? This can't be undone.`)) return
    setDeleting(true)
    try {
      await deleteLeadTask(leadId, taskId)
      onChanged?.()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete task.')
      setDeleting(false)
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
  const subtaskDone = task ? task.subtasks.filter((s) => s.done).length : 0
  const subtaskTotal = task ? task.subtasks.length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
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
                  {task.subtasks.map((s) => (
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
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" /> Created By
                  </div>
                  <div className="text-sm text-slate-700">{task.createdByName || '—'}</div>
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
                    {task.members.map((m) => (
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
                <div className="flex min-h-[18rem] flex-col">
                  <div className="flex-1 space-y-3 overflow-y-auto p-3">
                    {comments.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">No comments yet.</p>
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
                  <div className="border-t border-slate-200 p-2.5">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment()
                      }}
                      rows={2}
                      placeholder="Write a comment… use @name@firm.com to mention"
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
                <div className="min-h-[18rem] space-y-3 overflow-y-auto p-3">
                  {history.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No activity yet.</p>
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
  )
}
