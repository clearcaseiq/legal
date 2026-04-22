/**
 * Add expense page - dedicated screen for adding an expense/lien to a case (not post-acceptance).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getLead, createLeadLien } from '../lib/api'

const EXPENSE_TYPES = [
  { id: 'medical', label: 'Medical' },
  { id: 'lien', label: 'Lien' },
  { id: 'subrogation', label: 'Subrogation' },
  { id: 'other', label: 'Other' }
]

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

export default function AddExpensePage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState('medical')
  const [amount, setAmount] = useState('')
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
    if (!leadId || !name.trim()) {
      setError('Please enter a name (e.g. provider or lien holder).')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await createLeadLien(leadId, {
        name: name.trim(),
        type: type || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        status: 'open',
        notes: notes.trim() || undefined
      })
      navigate('/attorney-dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save expense')
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
          <h1 className="text-2xl font-semibold text-gray-900">Add expense</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Medical provider, lien holder"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {EXPENSE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1500.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
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
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
