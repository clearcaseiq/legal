/**
 * Attorney document requests — shown inside the Tasks tab so plaintiffs have one
 * place for "what I need to do" instead of a separate Requested Documents tab.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, ChevronDown, ChevronRight, FileText, FolderOpen, Plus, Upload } from 'lucide-react'
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
  className = '',
}: {
  assessmentId: string
  documentRequests: PlaintiffDocumentRequest[]
  /** Refetch document-requests + evidence after an inline upload. */
  onRequestsRefresh?: () => void | Promise<void>
  className?: string
}) {
  const { t, language } = useLanguage()
  const locale = dateLocale(language)
  const tasksReturnTo = plaintiffDashboardReturnTo(assessmentId, 'tasks')
  const [uploadFlash, setUploadFlash] = useState<string | null>(null)
  /** Completed requests stay collapsed so the open list stays short. */
  const [showCompleted, setShowCompleted] = useState(false)
  /** Per-request accordion — first open request starts expanded. */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  /** InlineEvidenceUpload manage-files modal, keyed by request id. */
  const [manageOpenByRequest, setManageOpenByRequest] = useState<Record<string, boolean>>({})
  const seededExpandRef = useRef(false)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enrichedRequests = useMemo(
    () =>
      documentRequests.map((request) => {
        const remainingItems = request.items.filter((item) => !item.fulfilled)
        const completedItems = request.items.filter((item) => item.fulfilled)
        const uiStatus =
          request.items.length > 0
            ? remainingItems.length === 0
              ? 'completed'
              : completedItems.length > 0
                ? 'partial'
                : 'pending'
            : request.status
        return { request, remainingItems, completedItems, uiStatus }
      }),
    [documentRequests],
  )

  const openRequests = enrichedRequests.filter((row) => row.uiStatus !== 'completed')
  const completedRequests = enrichedRequests.filter((row) => row.uiStatus === 'completed')

  useEffect(() => {
    if (seededExpandRef.current) return
    if (openRequests.length === 0) return
    seededExpandRef.current = true
    setExpandedIds(new Set([openRequests[0].request.id]))
  }, [openRequests])

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  const summaryFor = (
    remainingItems: PlaintiffDocumentRequest['items'],
    completedItems: PlaintiffDocumentRequest['items'],
    fallback: string,
  ) => {
    const source = remainingItems.length > 0 ? remainingItems : completedItems
    if (source.length === 0) return fallback
    return source
      .map((item) => localizeDocumentRequestLabel(item.key, t, item.label))
      .join(', ')
  }

  return (
    <div className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`.trim()}>
      <div className="mb-5 shrink-0">
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
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <FileText className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-slate-900">{t('plaintiffDashboard.requestedDocs.emptyTitle')}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t('plaintiffDashboard.requestedDocs.emptyBody')}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {openRequests.map(({ request, remainingItems, completedItems, uiStatus }) => {
            const expanded = expandedIds.has(request.id)
            const completionPercent =
              request.items.length > 0
                ? Math.round((completedItems.length / request.items.length) * 100)
                : request.completionPercent
            const attorneyName = request.attorney?.name || t('plaintiffDashboard.actionCenter.yourAttorney')
            const summary = summaryFor(remainingItems, completedItems, attorneyName)
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
            // Every outstanding type, not just the first: the upload page filters
            // to what it is given, so passing one turned a six-document request
            // into a one-document page.
            const primaryFocus =
              Array.from(
                new Set(
                  remainingItems
                    .map((item) => evidenceTargetForRequestKey(item.key)?.focus)
                    .filter((focus): focus is string => Boolean(focus)),
                ),
              ).join(',') || undefined
            const requestUploadHref = hrefFor({
              focus: primaryFocus,
              requestId: request.id,
            })

            return (
              <div
                key={request.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(request.id)}
                  className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-slate-50"
                  aria-expanded={expanded}
                >
                  {expanded ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{summary}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {attorneyName}
                      {' · '}
                      {t('plaintiffDashboard.actionCenter.requestedOn', {
                        date: new Date(request.createdAt).toLocaleDateString(locale),
                      })}
                      {remainingItems.length > 0
                        ? ` · ${t(
                            remainingItems.length === 1
                              ? 'plaintiffDashboard.requestedDocs.remainingOne'
                              : 'plaintiffDashboard.requestedDocs.remainingMany',
                            { count: remainingItems.length },
                          )}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      uiStatus === 'partial'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {uiStatus === 'partial'
                      ? t('plaintiffDashboard.actionCenter.statusPartial')
                      : t('plaintiffDashboard.actionCenter.statusActionNeeded')}
                  </span>
                </button>

                {expanded && (
                  <div className="space-y-3 border-t border-slate-100 px-4 py-3">
                    <div>
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
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                    </div>
                    {localizedNote && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('plaintiffDashboard.actionCenter.attorneyNote')}
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{localizedNote}</p>
                      </div>
                    )}
                    {remainingItems.length > 0 && (
                      <div>
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
                      <div>
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
                      <p className="text-sm text-slate-600">
                        {t('plaintiffDashboard.actionCenter.genericRequest')}
                      </p>
                    )}

                    {singleRemaining && singleTarget ? (
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
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setManageOpenByRequest((prev) => ({ ...prev, [request.id]: true }))
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                            {t('intake.evidence_manageShort')}
                          </button>
                          <div className="w-[104px]">
                            <InlineEvidenceUpload
                              assessmentId={assessmentId}
                              category={singleTarget.category}
                              subcategory={singleTarget.subcategory}
                              description={localizeDocumentRequestLabel(
                                singleRemaining.key,
                                t,
                                singleRemaining.label,
                              )}
                              compact
                              alwaysShowUpload
                              hideHeader
                              tightChrome
                              hideCameraButton
                              hideTightSummary
                              manageOpen={Boolean(manageOpenByRequest[request.id])}
                              onManageOpenChange={(open) =>
                                setManageOpenByRequest((prev) => ({ ...prev, [request.id]: open }))
                              }
                              uploadButtonLabel={t('plaintiffDashboard.actionCenter.uploadFile')}
                              uploadButtonColorClass="bg-amber-500 text-white hover:bg-amber-600"
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
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={requestUploadHref}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                          {t('intake.evidence_manageShort')}
                        </Link>
                        <Link
                          to={requestUploadHref}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                        >
                          <Upload className="h-4 w-4" aria-hidden />
                          {t('plaintiffDashboard.actionCenter.uploadToRequest')}
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {completedRequests.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCompleted((prev) => !prev)}
                className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                aria-expanded={showCompleted}
              >
                <span className="inline-flex items-center gap-1.5">
                  {showCompleted ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  )}
                  {showCompleted
                    ? t('plaintiffDashboard.requestedDocs.hideCompleted')
                    : t('plaintiffDashboard.requestedDocs.showCompleted', {
                        count: completedRequests.length,
                      })}
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  {t('plaintiffDashboard.actionCenter.statusCompleted')}
                </span>
              </button>

              {showCompleted && (
                <ul className="mt-2 space-y-2">
                  {completedRequests.map(({ request, remainingItems, completedItems }) => {
                    const expanded = expandedIds.has(request.id)
                    const attorneyName =
                      request.attorney?.name || t('plaintiffDashboard.actionCenter.yourAttorney')
                    const summary = summaryFor(remainingItems, completedItems, attorneyName)
                    const localizedNote = localizeDocumentRequestMessage(
                      request.customMessage,
                      request.items.map((item) => item.key),
                      t,
                    )
                    return (
                      <li
                        key={request.id}
                        className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50/80"
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpanded(request.id)}
                          className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-100/80"
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                          ) : (
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                          )}
                          <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-slate-500 line-through">{summary}</p>
                            <p className="truncate text-xs text-slate-400">{attorneyName}</p>
                          </div>
                        </button>
                        {expanded && (
                          <div className="space-y-2 border-t border-slate-100 px-3 py-2">
                            {localizedNote && (
                              <p className="whitespace-pre-wrap text-xs text-slate-400 line-through">
                                {localizedNote}
                              </p>
                            )}
                            {completedItems.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {completedItems.map((item) => (
                                  <span
                                    key={item.key}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 line-through"
                                  >
                                    <CheckCircle className="h-3 w-3" aria-hidden />
                                    {localizeDocumentRequestLabel(item.key, t, item.label)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {openRequests.length === 0 && completedRequests.length > 0 && !showCompleted && (
            <p className="text-center text-sm text-slate-500">
              {t('plaintiffDashboard.requestedDocs.allCaughtUp')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
