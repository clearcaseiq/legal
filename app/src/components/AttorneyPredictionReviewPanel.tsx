import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Brain, ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react'
import {
  getAttorneyPredictionReview,
  saveAttorneyPredictionReview,
  type AttorneyPredictionReviewResponse,
} from '../lib/api'

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default function AttorneyPredictionReviewPanel({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<AttorneyPredictionReviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [liabilityDisagrees, setLiabilityDisagrees] = useState(false)
  const [liabilityScore, setLiabilityScore] = useState('')
  const [liabilityNotes, setLiabilityNotes] = useState('')
  const [evidenceDisagrees, setEvidenceDisagrees] = useState(false)
  const [evidenceAdditions, setEvidenceAdditions] = useState('')
  const [evidenceRemovals, setEvidenceRemovals] = useState('')
  const [evidenceNotes, setEvidenceNotes] = useState('')
  const [valuationDisagrees, setValuationDisagrees] = useState(false)
  const [settlementLow, setSettlementLow] = useState('')
  const [settlementExpected, setSettlementExpected] = useState('')
  const [settlementHigh, setSettlementHigh] = useState('')
  const [valuationNotes, setValuationNotes] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttorneyPredictionReview(leadId)
      .then((response) => {
        if (cancelled) return
        setData(response)
        const review = response.review
        if (!review) return
        setLiabilityDisagrees(review.liabilityDisagrees)
        setLiabilityScore(review.liabilityScore == null ? '' : String(review.liabilityScore))
        setLiabilityNotes(review.liabilityNotes || '')
        setEvidenceDisagrees(review.evidenceDisagrees)
        setEvidenceAdditions((review.evidenceRecommendations?.additions || []).join('\n'))
        setEvidenceRemovals((review.evidenceRecommendations?.removals || []).join('\n'))
        setEvidenceNotes(review.evidenceNotes || '')
        setValuationDisagrees(review.valuationDisagrees)
        setSettlementLow(review.settlementLow == null ? '' : String(review.settlementLow))
        setSettlementExpected(review.settlementExpected == null ? '' : String(review.settlementExpected))
        setSettlementHigh(review.settlementHigh == null ? '' : String(review.settlementHigh))
        setValuationNotes(review.valuationNotes || '')
      })
      .catch((err: any) => {
        if (!cancelled && err?.response?.status !== 404) {
          setError(err?.response?.data?.error || 'Could not load the AI assessment review.')
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [leadId])

  const bands = useMemo(() => {
    try {
      return JSON.parse(data?.prediction?.bands || '{}') as Record<string, number>
    } catch {
      return {}
    }
  }, [data])

  if (!loading && !data) return null

  const save = async () => {
    if (!data?.prediction) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const response = await saveAttorneyPredictionReview(leadId, {
        predictionId: data.prediction.id,
        acceptCase: true,
        liability: {
          disagrees: liabilityDisagrees,
          score: numberOrNull(liabilityScore),
          notes: liabilityNotes.trim() || null,
        },
        evidence: {
          disagrees: evidenceDisagrees,
          additions: lines(evidenceAdditions),
          removals: lines(evidenceRemovals),
          notes: evidenceNotes.trim() || null,
        },
        valuation: {
          disagrees: valuationDisagrees,
          settlementLow: numberOrNull(settlementLow),
          settlementExpected: numberOrNull(settlementExpected),
          settlementHigh: numberOrNull(settlementHigh),
          notes: valuationNotes.trim() || null,
        },
      })
      setData((current) => (current ? { ...current, review: response.review } : current))
      setSaved(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save the AI assessment review.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-brand-600" />
          <span>
            <span className="block text-sm font-semibold text-slate-900">Attorney review of AI assessment</span>
            <span className="block text-xs text-slate-500">
              Record disagreements without replacing the original prediction.
            </span>
          </span>
        </span>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && data?.prediction ? (
        <div className="space-y-5 border-t border-slate-100 px-5 py-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Reviewing model <span className="font-semibold">{data.prediction.modelVersion}</span>
            {data.prediction.assessmentRevision != null
              ? ` at case revision ${data.prediction.assessmentRevision}`
              : ''}
            . Original range: ${Number(bands.p25 || 0).toLocaleString()} – $
            {Number(bands.p75 || 0).toLocaleString()}.
          </div>

          <ReviewSection
            title="Liability"
            checked={liabilityDisagrees}
            onChecked={setLiabilityDisagrees}
          >
            <label className="text-xs font-medium text-slate-600">
              Attorney liability score (0–100)
              <input
                className={inputClass}
                type="number"
                min={0}
                max={100}
                value={liabilityScore}
                onChange={(event) => setLiabilityScore(event.target.value)}
              />
            </label>
            <textarea
              className={inputClass}
              rows={2}
              value={liabilityNotes}
              onChange={(event) => setLiabilityNotes(event.target.value)}
              placeholder="Why does your liability opinion differ?"
            />
          </ReviewSection>

          <ReviewSection
            title="Evidence recommendations"
            checked={evidenceDisagrees}
            onChecked={setEvidenceDisagrees}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <textarea
                className={inputClass}
                rows={3}
                value={evidenceAdditions}
                onChange={(event) => setEvidenceAdditions(event.target.value)}
                placeholder="Documents to add, one per line"
              />
              <textarea
                className={inputClass}
                rows={3}
                value={evidenceRemovals}
                onChange={(event) => setEvidenceRemovals(event.target.value)}
                placeholder="Recommendations to remove, one per line"
              />
            </div>
            <textarea
              className={inputClass}
              rows={2}
              value={evidenceNotes}
              onChange={(event) => setEvidenceNotes(event.target.value)}
              placeholder="Evidence-review notes"
            />
          </ReviewSection>

          <ReviewSection
            title="Valuation"
            checked={valuationDisagrees}
            onChecked={setValuationDisagrees}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Low', settlementLow, setSettlementLow],
                ['Expected', settlementExpected, setSettlementExpected],
                ['High', settlementHigh, setSettlementHigh],
              ].map(([label, value, setter]) => (
                <label key={String(label)} className="text-xs font-medium text-slate-600">
                  {String(label)}
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    value={String(value)}
                    onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                  />
                </label>
              ))}
            </div>
            <textarea
              className={inputClass}
              rows={2}
              value={valuationNotes}
              onChange={(event) => setValuationNotes(event.target.value)}
              placeholder="Why does your valuation differ?"
            />
          </ReviewSection>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <div className="flex items-center justify-end gap-3">
            {saved ? <span className="text-xs font-medium text-emerald-700">Review saved</span> : null}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save review
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ReviewSection({
  title,
  checked,
  onChecked,
  children,
}: {
  title: string
  checked: boolean
  onChecked: (value: boolean) => void
  children: ReactNode
}) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChecked(event.target.checked)}
          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        I disagree with the AI’s {title.toLowerCase()}
      </label>
      {checked ? <div className="mt-3 space-y-3">{children}</div> : null}
    </fieldset>
  )
}
