/**
 * Add task page - dedicated screen for adding a task to a case (not post-acceptance).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getLead, createLeadTask } from '../lib/api'
import { BackButton } from '../features/shared/ui'

const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' }
]

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

export default function AddTaskPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dateFromUrl = searchParams.get('date')
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(dateFromUrl || '')
  const [priority, setPriority] = useState('medium')
  const [assignedRole, setAssignedRole] = useState('attorney')
  useEffect(() => {
    if (dateFromUrl) setDueDate(dateFromUrl)
  }, [dateFromUrl])
  const [notes, setNotes] = useState('')

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
        taskType: 'general',
        dueDate: dueDate || undefined,
        priority,
        assignedRole,
        notes: notes.trim() || undefined,
        status: 'open'
      })
      navigate('/attorney-dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  const caseLabel = lead
    ? `${claimLabel(lead.assessment?.claimType || 'Case')} — ${[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}`
    : ''

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (error && !lead) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
        <BackButton onClick={() => navigate('/attorney-dashboard')} label="Back to dashboard" className="mt-4" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <BackButton onClick={() => navigate('/attorney-dashboard')} label="Back to dashboard" className="mb-6" />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Add task</h1>
          <p className="text-sm text-gray-500 mt-1">{caseLabel}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Review medical records"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
              <select
                value={assignedRole}
                onChange={(e) => setAssignedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="attorney">Attorney</option>
                <option value="paralegal">Paralegal</option>
                <option value="client">Client (Plaintiff)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Tasks assigned to the client are visible to the plaintiff in their Tasks section.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Additional details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => navigate('/attorney-dashboard')}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !title.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
