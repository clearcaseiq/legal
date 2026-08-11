import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { getPlaintiffSatisfaction, submitPlaintiffSatisfaction } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'

export default function PlaintiffSatisfactionCard({ assessmentId }: { assessmentId?: string }) {
  const { t } = useLanguage()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!assessmentId) return
    let cancelled = false
    getPlaintiffSatisfaction(assessmentId)
      .then((data) => {
        if (cancelled || !data) return
        if (data.plaintiffSatisfaction) setRating(data.plaintiffSatisfaction)
        if (data.plaintiffSatisfactionNotes) setNotes(data.plaintiffSatisfactionNotes)
        if (data.plaintiffSatisfaction) setSaved(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [assessmentId])

  if (!assessmentId) return null

  const handleSubmit = async () => {
    if (!rating) {
      setError(t('plaintiffDashboard.satisfaction.selectRating'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      await submitPlaintiffSatisfaction(assessmentId, { satisfaction: rating, notes: notes || undefined })
      setSaved(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || t('plaintiffDashboard.satisfaction.submitFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-bold text-gray-900 mb-1">{t('plaintiffDashboard.satisfaction.title')}</h3>
      <p className="text-sm text-gray-600 mb-3">{t('plaintiffDashboard.satisfaction.subtitle')}</p>

      <div className="flex gap-1.5 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={n === 1 ? t('plaintiffDashboard.satisfaction.starLabel', { n }) : t('plaintiffDashboard.satisfaction.starsLabel', { n })}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-0.5"
          >
            <Star
              className={`h-7 w-7 ${
                (hover || rating) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t('plaintiffDashboard.satisfaction.notesPlaceholder')}
        rows={2}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-60"
        >
          {saving
            ? t('plaintiffDashboard.satisfaction.saving')
            : saved
              ? t('plaintiffDashboard.satisfaction.update')
              : t('plaintiffDashboard.satisfaction.submit')}
        </button>
        {saved && !error ? <span className="text-sm font-medium text-emerald-600">{t('plaintiffDashboard.satisfaction.thanks')}</span> : null}
        {error ? <span className="text-sm font-medium text-red-600">{error}</span> : null}
      </div>
    </div>
  )
}
