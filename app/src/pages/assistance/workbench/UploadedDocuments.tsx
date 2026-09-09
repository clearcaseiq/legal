import { useState } from 'react'
import { Download } from 'lucide-react'
import { Badge, EmptyState, SectionCard } from '../../../features/shared/ui'
import { downloadEvidenceByUrl } from '../../../lib/api'
import type { AssistanceDocument } from '../../../lib/api'
import { humanize, timeAgo } from '../assistanceLabels'

/** "2.4 MB" — bytes are not a unit anyone reads a file list in. */
function formatSize(bytes: number | null | undefined): string | null {
  if (!bytes || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

/**
 * What the claimant has actually sent in.
 *
 * Sits opposite "Documents to request" so the two halves of the same question —
 * what is missing, what arrived — are answerable without leaving the tab.
 */
export function UploadedDocuments({ documents }: { documents: AssistanceDocument[] }) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = async (doc: AssistanceDocument) => {
    setDownloading(doc.id)
    setError(null)
    try {
      await downloadEvidenceByUrl(doc.fileUrl, doc.name)
    } catch {
      setError('That file could not be opened. It may still be uploading.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <SectionCard title={`Uploaded documents${documents.length ? ` (${documents.length})` : ''}`}>
      {documents.length === 0 ? (
        <EmptyState message="The claimant has not uploaded anything yet." />
      ) : (
        <>
          {error && <p className="mb-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{doc.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{doc.categoryLabel || humanize(doc.category)}</span>
                    {formatSize(doc.size) && <span>· {formatSize(doc.size)}</span>}
                    <span>· {timeAgo(doc.uploadedAt)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Anything not sent by the claimant is called out, so a file an
                      attorney added is not read as the claimant having answered. */}
                  {doc.source !== 'claimant' && <Badge tone="neutral">{humanize(doc.source)}</Badge>}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    disabled={downloading === doc.id}
                    onClick={() => download(doc)}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    {downloading === doc.id ? 'Opening…' : 'Download'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  )
}
