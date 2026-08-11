/**
 * Attorney document requests — shown inside the Tasks tab so plaintiffs have one
 * place for "what I need to do" instead of a separate Requested Documents tab.
 */
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, FileText, Plus, Upload } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { dateLocale } from '../i18n'
import {
  evidenceUploadHref,
  plaintiffDashboardReturnTo,
} from '../lib/evidenceUploadNav'
import {
  canInlineUploadRequestKey,
  evidenceTargetForRequestKey,
} from '../lib/documentRequestUpload'
import {
  localizeDocumentRequestLabel,
  localizeDocumentRequestMessage,
} from '../lib/documentRequestI18n'
import type { PlaintiffDocumentRequest } from '../lib/api'
import InlineEvidenceUpload from './InlineEvidenceUpload'

export default function PlaintiffRequestedDocumentsSection({
  assessmentId,
  documentRequests,
  onRequestsRefresh,
}: {
  assessmentId: string
  documentRequests: PlaintiffDocumentRequest[]
  /** Refetch document-requests + evidence after an inline upload. */
  onRequestsRefresh?: () => void | Promise<void>
}) {
  const { t, language } = useLanguage()
  const locale = dateLocale(language)
  const tasksReturnTo = plaintiffDashboardReturnTo(assessmentId, 'tasks')
  const [uploadFlash, setUploadFlash] = useState<string | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showUploadFlash = (message: string) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setUploadFlash(message)
    flashTimerRef.current = setTimeout(() => setUploadFlash(null), 4500)
  }

  const hrefFor = (opts?: { focus?: string; requestId?: string }) =>
    evidenceUploadHref(assessmentId, {
      from: 'dashboard',
      returnTo: tasksReturnTo,
      focus: opts?.focus,
      requestId: opts?.requestId,
    })

  const handleInlineUploaded = async (itemLabel: string) => {
    showUploadFlash(
      t('plaintiffDashboard.actionCenter.uploadedThanks', { doc: itemLabel }),
    )
    await onRequestsRefresh?.()
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="font-display text-xl font-bold text-slate-900">
          {t('plaintiffDashboard.requestedDocs.title')}
        </h3>
        <p className="mt-1 text-sm text-slate-600">{t('plaintiffDashboard.requestedDocs.subtitle')}</p>
      </div>

      {uploadFlash && (
        <div
          className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
          role="status"
        >
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{uploadFlash}</p>
        </div>
      )}

      {documentRequests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <FileText className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-slate-900">{t('plaintiffDashboard.requestedDocs.emptyTitle')}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            {t('plaintiffDashboard.requestedDocs.emptyBody')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documentRequests.map((request) => {
            const remainingItems = request.items.filter((item) => !item.fulfilled)
            const completedItems = request.items.filter((item) => item.fulfilled)
            // Prefer item fulfillment over stored status so "Completed" never
            // shows with remaining uploads (or a 0% bar).
            const uiStatus =
              request.items.length > 0
                ? remainingItems.length === 0
                  ? 'completed'
                  : completedItems.length > 0
                    ? 'partial'
                    : 'pending'
                : request.status
            const completionPercent =
              request.items.length > 0
                ? Math.round((completedItems.length / request.items.length) * 100)
                : request.completionPercent
            const attorneyName = request.attorney?.name || t('plaintiffDashboard.actionCenter.yourAttorney')
            const localizedNote = localizeDocumentRequestMessage(
              request.customMessage,
              request.items.map((item) => item.key),
              t,
            )
            const singleRemaining = remainingItems.length === 1 ? remainingItems[0] : null
            const singleTarget =
              singleRemaining && canInlineUploadRequestKey(singleRemaining.key)
                ? evidenceTargetForRequestKey(singleRemaining.key)
                : null
            const primaryFocus =
              evidenceTargetForRequestKey(remainingItems[0]?.key || '')?.focus ||
              undefined
            const requestUploadHref = hrefFor({
              focus: primaryFocus,
              requestId: request.id,
            })

            return (
              <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{attorneyName}</p>
                    <p className="text-xs text-slate-500">
                      {t('plaintiffDashboard.actionCenter.requestedOn', {
                        date: new Date(request.createdAt).toLocaleDateString(locale),
                      })}
                      {request.lastNudgeAt
                        ? ` • ${t('plaintiffDashboard.actionCenter.reminderSent', {
                            date: new Date(request.lastNudgeAt).toLocaleDateString(locale),
                          })}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      uiStatus === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : uiStatus === 'partial'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {uiStatus === 'completed'
                      ? t('plaintiffDashboard.actionCenter.statusCompleted')
                      : uiStatus === 'partial'
                        ? t('plaintiffDashboard.actionCenter.statusPartial')
                        : t('plaintiffDashboard.actionCenter.statusActionNeeded')}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{t('plaintiffDashboard.actionCenter.taskProgress')}</span>
                    <span className="font-semibold">
                      {t('plaintiffDashboard.actionCenter.percentComplete', {
                        percent: completionPercent,
                      })}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${uiStatus === 'completed' ? 'bg-emerald-500' : 'bg-brand-600'}`}
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
                {localizedNote && (
                  <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t('plaintiffDashboard.actionCenter.attorneyNote')}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{localizedNote}</p>
                  </div>
                )}
                {remainingItems.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t('plaintiffDashboard.actionCenter.uploadNext')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {remainingItems.map((item) => {
                        const focus = evidenceTargetForRequestKey(item.key)?.focus
                        return (
                          <Link
                            key={item.key}
                            to={hrefFor({ focus, requestId: request.id })}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                          >
                            <Plus className="h-3 w-3" aria-hidden />
                            {localizeDocumentRequestLabel(item.key, t, item.label)}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
                {completedItems.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t('plaintiffDashboard.actionCenter.alreadyCompleted')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {completedItems.map((item) => (
                        <span
                          key={item.key}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                        >
                          <CheckCircle className="h-3 w-3" aria-hidden />
                          {localizeDocumentRequestLabel(item.key, t, item.label)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {request.items.length === 0 && (
                  <p className="mb-3 text-sm text-slate-600">
                    {t('plaintiffDashboard.actionCenter.genericRequest')}
                  </p>
                )}

                {uiStatus !== 'completed' && singleRemaining && singleTarget ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-900">
                      {t('plaintiffDashboard.actionCenter.uploadHere', {
                        doc: localizeDocumentRequestLabel(
                          singleRemaining.key,
                          t,
                          singleRemaining.label,
                        ),
                      })}
                    </p>
                    <InlineEvidenceUpload
                      assessmentId={assessmentId}
                      category={singleTarget.category}
                      subcategory={singleTarget.subcategory}
                      compact
                      alwaysShowUpload
                      hideHeader
                      tightChrome
                      hideCameraButton
                      uploadButtonLabel={t('plaintiffDashboard.actionCenter.uploadFile')}
                      onFilesUploaded={async () => {
                        await handleInlineUploaded(
                          localizeDocumentRequestLabel(
                            singleRemaining.key,
                            t,
                            singleRemaining.label,
                          ),
                        )
                      }}
                    />
                    <p className="mt-2 text-center text-xs text-slate-500">
                      <Link
                        to={requestUploadHref}
                        className="font-semibold text-brand-700 hover:text-brand-900"
                      >
                        {t('plaintiffDashboard.actionCenter.openFullUploader')}
                      </Link>
                    </p>
                  </div>
                ) : uiStatus !== 'completed' ? (
                  <Link
                    to={requestUploadHref}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    <Upload className="h-4 w-4" aria-hidden />
                    {t('plaintiffDashboard.actionCenter.uploadToRequest')}
                  </Link>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
