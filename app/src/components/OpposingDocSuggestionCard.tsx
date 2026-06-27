/**
 * Plaintiff-facing card to suggest documents their attorney should request from the
 * defendant / opposing party / insurer. The plaintiff cannot serve discovery directly,
 * so this only creates a suggestion for the attorney to review and send.
 */
import { useEffect, useState } from 'react'
import { Scale } from 'lucide-react'
import {
  createOpposingDocSuggestion,
  getOpposingDocSuggestions,
  type OpposingDocRole,
  type OpposingDocSuggestion,
} from '../lib/api'

const OPPOSING_DOC_TYPES = [
  { id: 'insurance_policy', label: 'Insurance policy / coverage' },
  { id: 'incident_report', label: 'Incident / accident report' },
  { id: 'surveillance', label: 'Surveillance or camera footage' },
  { id: 'maintenance_records', label: 'Maintenance / inspection records' },
  { id: 'vehicle_records', label: 'Vehicle / black-box data' },
  { id: 'employment_records', label: 'Employment / training records' },
  { id: 'correspondence', label: 'Letters, emails, or messages' },
  { id: 'photos', label: 'Photos of the scene/vehicle' },
  { id: 'other', label: 'Something else' },
]

const ROLE_OPTIONS: Array<{ id: OpposingDocRole; label: string }> = [
  { id: 'defendant', label: 'The person/company at fault' },
  { id: 'insurer', label: 'Their insurance company' },
  { id: 'opposing_counsel', label: 'Their lawyer' },
]

const ROLE_LABELS: Record<string, string> = {
  defendant: 'At-fault party',
  insurer: 'Insurer',
  opposing_counsel: 'Their lawyer',
}

export default function OpposingDocSuggestionCard({ assessmentId }: { assessmentId: string }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [recipientName, setRecipientName] = useState('')
  const [recipientRole, setRecipientRole] = useState<OpposingDocRole>('defendant')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<OpposingDocSuggestion[]>([])

  useEffect(() => {
    let cancelled = false
    getOpposingDocSuggestions(assessmentId)
      .then((rows) => {
        if (!cancelled) setSuggestions(rows)
      })
      .catch(() => {
        if (!cancelled) setSuggestions([])
      })
    return () => {
      cancelled = true
    }
  }, [assessmentId])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (selected.size === 0 && !note.trim()) {
      setError('Pick at least one document or add a note.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const created = await createOpposingDocSuggestion(assessmentId, {
        requestedDocs: [...selected],
        recipientName: recipientName.trim() || undefined,
        recipientRole,
        note: note.trim() || undefined,
      })
      setSuggestions((prev) => [created, ...prev])
      setSelected(new Set())
      setRecipientName('')
      setNote('')
      setOpen(false)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not submit your suggestion. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-50 p-2">
            <Scale className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Documents from the other side</h3>
            <p className="text-sm text-gray-600">
              Is there something the at-fault party or their insurer has that would help your case?
              Suggest it here and your attorney can formally request it for you.
            </p>
          </div>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Suggest documents
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          {suggestions.map((s) => (
            <div key={s.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {s.recipientName || (s.recipientRole ? ROLE_LABELS[s.recipientRole] : 'Other side')}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {s.status === 'sent' ? 'Sent by attorney' : 'Shared with attorney'}
                </span>
              </div>
              {s.requestedDocs.length > 0 && (
                <p className="mt-1 text-xs text-gray-600">
                  {s.requestedDocs
                    .map((d) => OPPOSING_DOC_TYPES.find((o) => o.id === d)?.label || d)
                    .join(', ')}
                </p>
              )}
              {s.note && <p className="mt-1 text-xs text-gray-500">“{s.note}”</p>}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Who has these documents?</label>
            <select
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value as OpposingDocRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Their name (optional)</label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g., the other driver, Acme Insurance"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">What would help your case?</p>
            <div className="space-y-2">
              {OPPOSING_DOC_TYPES.map((doc) => (
                <label key={doc.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(doc.id)}
                    onChange={() => toggle(doc.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-800">{doc.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anything else? (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Tell your attorney what you're thinking"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setOpen(false); setError(null) }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Sending…' : 'Share with my attorney'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
