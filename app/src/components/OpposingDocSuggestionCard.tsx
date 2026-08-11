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
import { useLanguage } from '../contexts/LanguageContext'

const OPPOSING_DOC_TYPE_IDS = [
  'insurance_policy',
  'incident_report',
  'surveillance',
  'maintenance_records',
  'vehicle_records',
  'employment_records',
  'correspondence',
  'photos',
  'other',
] as const

const ROLE_IDS: OpposingDocRole[] = ['defendant', 'insurer', 'opposing_counsel']

export default function OpposingDocSuggestionCard({ assessmentId }: { assessmentId: string }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [recipientName, setRecipientName] = useState('')
  const [recipientRole, setRecipientRole] = useState<OpposingDocRole>('defendant')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<OpposingDocSuggestion[]>([])

  const docLabel = (id: string) => t(`plaintiffDashboard.opposingDocs.docTypes.${id}`)
  const roleLabel = (id: OpposingDocRole) => t(`plaintiffDashboard.opposingDocs.roles.${id}`)
  const roleShort = (id: string) => t(`plaintiffDashboard.opposingDocs.roleShort.${id}`)

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
      setError(t('plaintiffDashboard.opposingDocs.pickRequired'))
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
      setError(err?.response?.data?.error || t('plaintiffDashboard.opposingDocs.submitFailed'))
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
            <h3 className="text-lg font-bold text-gray-900">{t('plaintiffDashboard.opposingDocs.title')}</h3>
            <p className="text-sm text-gray-600">
              {t('plaintiffDashboard.opposingDocs.body')}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              {t('plaintiffDashboard.opposingDocs.note')}
            </p>
          </div>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t('plaintiffDashboard.opposingDocs.suggest')}
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          {suggestions.map((s) => (
            <div key={s.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {s.recipientName || (s.recipientRole ? roleShort(s.recipientRole) : t('plaintiffDashboard.opposingDocs.otherSide'))}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {s.status === 'sent'
                    ? t('plaintiffDashboard.opposingDocs.statusSent')
                    : t('plaintiffDashboard.opposingDocs.statusSaved')}
                </span>
              </div>
              {s.requestedDocs.length > 0 && (
                <p className="mt-1 text-xs text-gray-600">
                  {s.requestedDocs.map((d) => docLabel(d)).join(', ')}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('plaintiffDashboard.opposingDocs.whoHas')}</label>
            <select
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value as OpposingDocRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {ROLE_IDS.map((id) => (
                <option key={id} value={id}>{roleLabel(id)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('plaintiffDashboard.opposingDocs.theirName')}</label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={t('plaintiffDashboard.opposingDocs.theirNamePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t('plaintiffDashboard.opposingDocs.whatHelps')}</p>
            <div className="space-y-2">
              {OPPOSING_DOC_TYPE_IDS.map((id) => (
                <label key={id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(id)}
                    onChange={() => toggle(id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-800">{docLabel(id)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('plaintiffDashboard.opposingDocs.anythingElse')}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t('plaintiffDashboard.opposingDocs.anythingElsePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
            {t('plaintiffDashboard.opposingDocs.saveDisclaimer')}
          </p>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setOpen(false); setError(null) }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {t('plaintiffDashboard.opposingDocs.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? t('plaintiffDashboard.opposingDocs.saving') : t('plaintiffDashboard.opposingDocs.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
