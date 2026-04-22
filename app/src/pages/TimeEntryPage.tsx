/**
 * Time entry page - log time for a case (separate screen, not post-acceptance).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getLead, createLeadTask } from '../lib/api'
import { invalidateAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'

const ACTIVITY_TYPES = [
  { id: 'case_review', label: 'Case review' },
  { id: 'client_communication', label: 'Client communication' },
  { id: 'research', label: 'Research' },
  { id: 'document_preparation', label: 'Document preparation' },
  { id: 'court_appearance', label: 'Court appearance' },
  { id: 'deposition', label: 'Deposition' },
  { id: 'mediation', label: 'Mediation' },
  { id: 'administrative', label: 'Administrative' },
  { id: 'other', label: 'Other' }
]

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

export default function TimeEntryPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')
  const [activityType, setActivityType] = useState('case_review')
  const [description, setDescription] = useState('')

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
    const hrs = parseFloat(hours)
    if (!leadId || isNaN(hrs) || hrs <= 0) {
      setError('Please enter valid hours.')
      return
    }
    const activityLabel = ACTIVITY_TYPES.find((a) => a.id === activityType)?.label || activityType
    const title = `${hrs} hr${hrs !== 1 ? 's' : ''} - ${activityLabel}`
    const notes = description.trim() || undefined

    setError(null)
    setSaving(true)
    try {
      await createLeadTask(leadId, {
        title,
        taskType: 'time_entry',
        dueDate: date,
        priority: 'medium',
        notes,
        status: 'open'
      })
      invalidateAttorneyDashboardSummary()
      navigate('/attorney-dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save time entry')
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
        <button
          onClick={() => navigate('/attorney-dashboard')}
          className="mt-4 px-4 py-2 text-brand-600 hover:underline"
        >
          ← Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/attorney-dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Time entry</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours *</label>
              <input
                type="number"
                step="0.25"
                min="0.01"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 1.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity type</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {ACTIVITY_TYPES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Additional details about the work performed..."
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
              disabled={saving || !hours || parseFloat(hours) <= 0}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save time entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
