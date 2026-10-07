import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { ChevronDown, FilePlus2, Plus, Trash2 } from 'lucide-react'
import InlineEvidenceUpload from './InlineEvidenceUpload'
import {
  SUGGESTED_DOC_CATEGORY,
  addPlaintiffSuggestedDocument,
  getPlaintiffSuggestedDocuments,
  removePlaintiffSuggestedDocument,
  type SuggestedDocument,
} from '../lib/api'
import { useRealtimeEvent } from '../lib/realtime'

/**
 * Supporting documents beyond the fixed checklist: ones the client thinks
 * matter, and ones their attorney asked them to add. Each has its own upload.
 */
export default function SuggestedDocumentsSection({ assessmentId }: { assessmentId: string }) {
  const { t } = useLanguage()
  const tx = (key: string, fallback: string) => {
    const value = t(`suggestedDocs.${key}`)
    return value && value !== `suggestedDocs.${key}` ? value : fallback
  }
  const [docs, setDocs] = useState<SuggestedDocument[] | null>(null)
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const load = useCallback(() => {
    getPlaintiffSuggestedDocuments(assessmentId)
      .then(setDocs)
      .catch(() => setDocs([]))
  }, [assessmentId])

  useEffect(() => {
    load()
  }, [load])
  useRealtimeEvent('case:updated', (e) => {
    if (!e.assessmentId || e.assessmentId === assessmentId) load()
  })

  const add = async () => {
    if (!label.trim()) return
    setSaving(true)
    setError(null)
    try {
      await addPlaintiffSuggestedDocument(assessmentId, { label: label.trim(), note: note.trim() || undefined })
      setLabel('')
      setNote('')
      load()
    } catch (err: any) {
      setError(err?.response?.data?.error || tx('addFailed', 'Could not add the document.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (doc: SuggestedDocument) => {
    setError(null)
    try {
      await removePlaintiffSuggestedDocument(assessmentId, doc.id)
      load()
    } catch (err: any) {
      setError(err?.response?.data?.error || tx('removeFailed', 'Could not remove the document.'))
    }
  }

  const list = docs || []
  const fromAttorney = list.filter((d) => d.suggestedBy === 'attorney')
  const fromClient = list.filter((d) => d.suggestedBy === 'plaintiff')

  const renderDoc = (doc: SuggestedDocument) => (
    <div
      key={doc.id}
      className={`rounded-xl border px-3 py-2 ${
        doc.fileCount > 0
          ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/[0.06]'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40'
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words text-sm font-semibold text-gray-900 dark:text-slate-100">{doc.label}</p>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                doc.suggestedBy === 'attorney'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {doc.suggestedBy === 'attorney'
                ? doc.suggestedByName
                  ? tx('byAttorneyNamed', 'Suggested by {{name}}').replace('{{name}}', doc.suggestedByName)
                  : tx('byAttorney', 'Suggested by your attorney')
                : tx('byYou', 'Added by you')}
            </span>
          </div>
          {doc.note ? <p className="break-words text-xs text-gray-500">{doc.note}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InlineEvidenceUpload
            assessmentId={assessmentId}
            category={SUGGESTED_DOC_CATEGORY}
            subcategory={doc.subcategory}
            filterBySubcategory
            description={doc.label}
            reloadToken={reloadToken}
            compact
            tightChrome
            hideCameraButton
            alwaysShowUpload={doc.fileCount === 0}
            hideHeader
            uploadButtonLabel={tx('upload', 'Upload')}
            uploadButtonColorClass="bg-amber-500 text-white hover:bg-amber-600"
            onFilesUploaded={() => {
              setReloadToken((n) => n + 1)
              load()
            }}
          />
          {doc.suggestedBy === 'plaintiff' && doc.fileCount === 0 ? (
            <button
              type="button"
              onClick={() => void remove(doc)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
              aria-label={tx('remove', 'Remove')}
              title={tx('remove', 'Remove')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )

  return (
    <details open className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
          <FilePlus2 className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">
            {tx('title', 'Other supporting documents')}
          </p>
          <p className="break-words text-xs text-gray-500">
            {tx('helper', 'Anything else that supports your case, added by you or suggested by your attorney.')}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="grid gap-4 border-t border-slate-200 p-3 dark:border-slate-700 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {tx('attorneyColumn', 'Suggested by your attorney')}
          </p>
          {fromAttorney.length ? (
            fromAttorney.map(renderDoc)
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500 dark:border-slate-700">
              {tx('attorneyEmpty', 'Nothing suggested yet. Your attorney can add documents here.')}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {tx('clientColumn', 'Added by you')}
          </p>
          {fromClient.map(renderDoc)}
          <div className="space-y-2 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-600">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void add()
              }}
              maxLength={120}
              placeholder={tx('labelPlaceholder', 'Document name, e.g. Rental car receipt')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder={tx('notePlaceholder', 'Why it matters (optional)')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={() => void add()}
              disabled={!label.trim() || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> {saving ? tx('adding', 'Adding…') : tx('add', 'Add document')}
            </button>
          </div>
        </div>
        {error ? <p className="text-xs text-rose-600 lg:col-span-2">{error}</p> : null}
      </div>
    </details>
  )
}
