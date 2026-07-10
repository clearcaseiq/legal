/**
 * Add task page - dedicated screen for adding a task to a case.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardList, Check, Loader2, CalendarClock, Flag, UserCog, StickyNote } from 'lucide-react'
import { getLead, createLeadTask } from '../lib/api'
import { BackButton } from '../features/shared/ui'

const PRIORITIES = [
  { id: 'low', label: 'Low', dot: 'bg-slate-400', active: 'border-slate-400 bg-slate-50 text-slate-700 ring-slate-300' },
  { id: 'medium', label: 'Medium', dot: 'bg-amber-500', active: 'border-amber-400 bg-amber-50 text-amber-700 ring-amber-300' },
  { id: 'high', label: 'High', dot: 'bg-rose-500', active: 'border-rose-400 bg-rose-50 text-rose-700 ring-rose-300' },
]

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

const ASSIGNEES = [
  { id: 'attorney', label: 'Attorney' },
  { id: 'paralegal', label: 'Paralegal' },
  { id: 'client', label: 'Client (Plaintiff)' },
]

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

const fieldCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

export default function AddTaskPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dateFromUrl = searchParams.get('date')
  // Return to wherever the user came from (e.g. the Calendar). Must be an
  // internal path; otherwise fall back to browser history.
  const returnToRaw = searchParams.get('returnTo')
  const returnTo = returnToRaw && returnToRaw.startsWith('/') ? returnToRaw : null
  const backLabel = returnTo?.includes('/calendar') ? 'Calendar' : 'Back'
  const goBack = () => (returnTo ? navigate(returnTo) : navigate(-1))

  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(dateFromUrl || '')
  const [priority, setPriority] = useState('medium')
  const [taskType, setTaskType] = useState('general')
  const [assignedRole, setAssignedRole] = useState('attorney')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (dateFromUrl) setDueDate(dateFromUrl)
  }, [dateFromUrl])

  useEffect(() => {
    if (!leadId) {
      setError('No case selected')
      setLoading(false)
      return
    }
    getLead(leadId)
      .then(setLead)
      .catch((err: any) => setError(err?.response?.data?.error || err?.message || 'Failed to load case'))
      .finally(() => setLoading(false))
  }, [leadId])

  const handleSubmit = async () => {
    if (!leadId || !title.trim()) {
      setError('Please enter a task title.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await createLeadTask(leadId, {
        title: title.trim(),
        taskType,
        dueDate: dueDate || undefined,
        priority,
        assignedRole,
        notes: notes.trim() || undefined,
        status: 'open',
      })
      goBack()
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  const venue = lead ? [lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—' : ''
  const clientName = lead?.assessment?.user
    ? `${lead.assessment.user.firstName || ''} ${lead.assessment.user.lastName || ''}`.trim()
    : ''

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
      </div>
    )
  }

  if (error && !lead) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
        <BackButton onClick={goBack} label={backLabel} className="mt-4" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <BackButton onClick={goBack} label={backLabel} className="mb-5" />

        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Add task</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {claimLabel(lead?.assessment?.claimType || 'Case')}
              {clientName ? ` · ${clientName}` : ''} · {venue}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-5 p-6">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Task title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && title.trim()) handleSubmit()
                }}
                placeholder="e.g. Request updated medical records from Dr. Lin"
                autoFocus
                className={fieldCls}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <CalendarClock className="h-4 w-4 text-slate-400" /> Due date
                </label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <StickyNote className="h-4 w-4 text-slate-400" /> Type
                </label>
                <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className={fieldCls}>
                  {TASK_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Flag className="h-4 w-4 text-slate-400" /> Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => {
                  const active = priority === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition ${
                        active
                          ? `${p.active} ring-1 ring-inset`
                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <UserCog className="h-4 w-4 text-slate-400" /> Assign to
              </label>
              <select value={assignedRole} onChange={(e) => setAssignedRole(e.target.value)} className={fieldCls}>
                {ASSIGNEES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              {assignedRole === 'client' ? (
                <p className="mt-1.5 text-xs text-amber-600">
                  Client tasks are visible to the plaintiff in their Tasks section.
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">Internal — only visible to your firm.</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional details or context…"
                className={`${fieldCls} resize-y`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              onClick={goBack}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !title.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
