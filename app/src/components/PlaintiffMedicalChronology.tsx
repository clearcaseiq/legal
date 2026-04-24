import { AlertCircle, CheckCircle2, Clock3, FileText, Loader2 } from 'lucide-react'
import type {
  PlaintiffMedicalReviewEdit,
  PlaintiffMedicalReviewEvent,
  PlaintiffMedicalReviewPayload,
} from '../lib/api-plaintiff'

type Props = {
  review: PlaintiffMedicalReviewPayload | null
  saving?: boolean
  statusMessage?: string | null
  errorMessage?: string | null
  onEditChange: (eventId: string, field: keyof PlaintiffMedicalReviewEdit, value: string | boolean) => void
  onSaveDraft: () => void
  onConfirm: () => void
  onSkip: () => void
}

function getEditForEvent(edits: PlaintiffMedicalReviewEdit[], eventId: string) {
  return edits.find((item) => item.eventId === eventId)
}

function getInputValue(event: PlaintiffMedicalReviewEvent, edit: PlaintiffMedicalReviewEdit | undefined, field: keyof PlaintiffMedicalReviewEdit) {
  if (field === 'correctedDate') return edit?.correctedDate ?? event.date ?? ''
  if (field === 'correctedProvider') return edit?.correctedProvider ?? event.provider ?? ''
  if (field === 'correctedLabel') return edit?.correctedLabel ?? event.label ?? ''
  if (field === 'correctedDetails') return edit?.correctedDetails ?? event.details ?? ''
  if (field === 'plaintiffNote') return edit?.plaintiffNote ?? event.plaintiffNote ?? ''
  return ''
}

export default function PlaintiffMedicalChronology({
  review,
  saving,
  statusMessage,
  errorMessage,
  onEditChange,
  onSaveDraft,
  onConfirm,
  onSkip,
}: Props) {
  if (!review) return null

  const importantItems = Array.isArray(review.missingItems?.important) ? review.missingItems.important : []
  const helpfulItems = Array.isArray(review.missingItems?.helpful) ? review.missingItems.helpful : []
  const chronology = Array.isArray(review.chronology) ? review.chronology : []
  const edits = Array.isArray(review.review?.edits) ? review.review.edits : []
  const status = review.review?.status ?? 'pending'
  const confirmButtonLabel =
    status === 'confirmed' ? 'Medical story confirmed' : 'Confirm medical story'
  const skipButtonLabel =
    status === 'skipped' ? 'Review skipped for now' : 'Skip for now'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Medical story review</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">Review your treatment timeline before attorney handoff</h3>
          <p className="mt-2 text-sm text-slate-600">
            Make quick corrections if a date, provider, or visit type looks off. You can also mark an item as not yours.
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {status === 'confirmed' ? 'Medical story confirmed' : status === 'skipped' ? 'Review skipped for now' : 'Review still needed'}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertCircle className="h-4 w-4" />
            Important for review now
          </div>
          {importantItems.length > 0 ? (
            <div className="mt-3 space-y-2">
              {importantItems.map((item) => (
                <div key={item.key} className="rounded-lg border border-amber-200 bg-white/80 p-3">
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.guidance}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-700">No major gaps were detected from the records and intake details currently on file.</p>
          )}
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <FileText className="h-4 w-4" />
            Helpful but optional
          </div>
          {helpfulItems.length > 0 ? (
            <div className="mt-3 space-y-2">
              {helpfulItems.map((item) => (
                <div key={item.key} className="rounded-lg border border-blue-200 bg-white/80 p-3">
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.guidance}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-700">Nothing optional stands out right now. Your current uploads already tell a fairly complete story.</p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {chronology.length > 0 ? (
          chronology.map((event) => {
            const edit = getEditForEvent(edits, event.id)
            return (
              <div key={event.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{edit?.correctedLabel ?? event.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                      {event.provider || 'Provider to confirm'} • {event.confidence === 'documented' ? 'Documented' : 'Estimated'}
                    </p>
                    {event.uncertaintyNote ? (
                      <p className="mt-2 flex items-start gap-2 text-sm text-amber-700">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{event.uncertaintyNote}</span>
                      </p>
                    ) : null}
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={!!edit?.hideEvent}
                      onChange={(e) => onEditChange(event.id, 'hideEvent', e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    This item is not mine
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                    <input
                      type="text"
                      value={getInputValue(event, edit, 'correctedDate')}
                      onChange={(e) => onEditChange(event.id, 'correctedDate', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Provider or facility</label>
                    <input
                      type="text"
                      value={getInputValue(event, edit, 'correctedProvider')}
                      onChange={(e) => onEditChange(event.id, 'correctedProvider', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="Provider name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Visit type</label>
                    <input
                      type="text"
                      value={getInputValue(event, edit, 'correctedLabel')}
                      onChange={(e) => onEditChange(event.id, 'correctedLabel', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="Visit type"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes for your attorney</label>
                    <input
                      type="text"
                      value={getInputValue(event, edit, 'plaintiffNote')}
                      onChange={(e) => onEditChange(event.id, 'plaintiffNote', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="Optional note"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Extra detail</label>
                  <textarea
                    value={getInputValue(event, edit, 'correctedDetails')}
                    onChange={(e) => onEditChange(event.id, 'correctedDetails', e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="Add anything you want the attorney to know about this visit"
                  />
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            We have not built a treatment timeline yet. You can still skip this step for now and continue to attorney review.
          </div>
        )}
      </div>

      {(statusMessage || errorMessage) && (
        <div className={`mt-4 rounded-lg px-3 py-3 text-sm ${errorMessage ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {errorMessage || statusMessage}
        </div>
      )}

      {status === 'confirmed' && !errorMessage && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          Your medical story is confirmed. You can now continue to the attorney handoff step below.
        </div>
      )}

      {status === 'skipped' && !errorMessage && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          You skipped the review for now. You can still continue below or come back and confirm later.
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save my updates
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
            status === 'confirmed' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand-700 hover:bg-brand-800'
          }`}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {confirmButtonLabel}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {skipButtonLabel}
        </button>
      </div>
    </section>
  )
}
