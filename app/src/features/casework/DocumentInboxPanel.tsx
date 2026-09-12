import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Loader2, MessageSquare, Smartphone } from 'lucide-react'
import { getDocumentInbox, getEvidenceObjectUrl, DocumentInbox, DocumentInboxItem } from '../../lib/api'
import { openEvidenceFile } from '../../lib/evidenceFileUrl'
import { useVisibilityPoll } from '../../hooks/useVisibilityPoll'

/** There is no realtime transport in this stack; documents appear on this tick. */
const POLL_MS = 15_000

function money(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function receivedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
}

export default function DocumentInboxPanel({ leadId }: { leadId: string }) {
  const [inbox, setInbox] = useState<DocumentInbox | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setInbox(await getDocumentInbox(leadId))
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load texted documents.')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])
  useVisibilityPoll(() => void load(), POLL_MS)

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading texted documents…
      </p>
    )
  }

  if (error) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
  }

  if (!inbox) return null

  return (
    <div className="space-y-5">
      <ChannelBanner inbox={inbox} />

      {inbox.received === 0 ? (
        inbox.mediaCapable ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Nothing texted in yet. Use “Text request to client” and their photos land here.
          </p>
        ) : null
      ) : (
        <>
          <Counts inbox={inbox} />
          <CategoryBreakdown inbox={inbox} />
          <ul className="space-y-3">
            {inbox.documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function ChannelBanner({ inbox }: { inbox: DocumentInbox }) {
  // Say so plainly rather than leaving an empty tab that reads as a bug. The
  // documents are not missing; they arrive through the upload link instead.
  if (!inbox.mediaCapable) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This deployment’s SMS provider can send texts but cannot receive photos, so texted documents cannot land
          here. “Text request to client” sends a one-tap upload link instead — no login — and those files appear on
          the <strong>Evidence</strong> tab.
        </p>
      </div>
    )
  }

  if (!inbox.channelOpen) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          No text channel open for this client. Send a document request by text and they can reply with photos — no
          login, no upload form.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Texting documents from a number ending {inbox.phoneLast4 || '—'}.
        {inbox.lastInboundAt ? ` Last received ${receivedAt(inbox.lastInboundAt)}.` : ' Nothing received yet.'}
      </p>
    </div>
  )
}

function Counts({ inbox }: { inbox: DocumentInbox }) {
  return (
    <p className="text-sm font-medium text-slate-700">
      {inbox.received} {inbox.received === 1 ? 'document' : 'documents'} received
      <span className="text-slate-400"> · </span>
      {inbox.processed} processed
      {inbox.needsReview > 0 && (
        <>
          <span className="text-slate-400"> · </span>
          <span className="text-amber-700">{inbox.needsReview} need review</span>
        </>
      )}
    </p>
  )
}

function CategoryBreakdown({ inbox }: { inbox: DocumentInbox }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {inbox.categories.map((row) => (
        <div key={row.category} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{row.label}</p>
          <p className="text-sm font-semibold text-slate-900">
            {row.count} {row.count === 1 ? 'document' : 'documents'}
            {row.totalAmount > 0 && <span className="ml-2 text-brand-700">{money(row.totalAmount)}</span>}
          </p>
        </div>
      ))}
    </div>
  )
}

function DocumentRow({ doc }: { doc: DocumentInboxItem }) {
  const [open, setOpen] = useState(false)

  return (
    <li className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        {doc.needsReview ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">
            {doc.aiSummary?.trim() || doc.categoryLabel}
          </span>
          <span className="block truncate text-xs text-slate-500">
            {doc.categoryLabel} · received {receivedAt(doc.createdAt)}
          </span>
        </span>
        {doc.extracted?.totalAmount ? (
          <span className="shrink-0 text-sm font-semibold text-slate-900">{money(doc.extracted.totalAmount)}</span>
        ) : null}
      </button>

      {open && (
        <div className="grid gap-4 border-t border-slate-100 px-4 py-4 md:grid-cols-2">
          <SourcePreview doc={doc} />
          <ExtractedFields doc={doc} />
        </div>
      )}
    </li>
  )
}

/**
 * The original, next to what we read off it.
 *
 * Loaded only when a row is opened: `/uploads` is access-gated, so every preview
 * is an authenticated fetch, and doing that for a whole inbox up front would be
 * dozens of requests for images nobody looked at.
 */
function SourcePreview({ doc }: { doc: DocumentInboxItem }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const isImage = doc.mimetype.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    let revoked = false
    let created: string | null = null

    getEvidenceObjectUrl(doc.fileUrl)
      .then((url) => {
        if (revoked) {
          URL.revokeObjectURL(url)
          return
        }
        created = url
        setObjectUrl(url)
      })
      .catch(() => setObjectUrl(null))

    return () => {
      revoked = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [doc.fileUrl, isImage])

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Original</p>
      {isImage && objectUrl ? (
        <img
          src={objectUrl}
          alt={doc.originalName}
          className="max-h-72 w-full rounded-lg border border-slate-200 object-contain"
        />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-400">
          <FileText className="h-6 w-6" />
        </div>
      )}
      <button
        type="button"
        onClick={() => void openEvidenceFile(doc.fileUrl)}
        className="text-xs font-medium text-brand-700 hover:underline"
      >
        Open {doc.originalName}
      </button>
    </div>
  )
}

function ExtractedFields({ doc }: { doc: DocumentInboxItem }) {
  const extracted = doc.extracted

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">What we read</p>

      {doc.processingStatus !== 'completed' ? (
        <p className="text-sm text-slate-500">
          {doc.processingStatus === 'failed'
            ? 'We could not read this document. Open the original to review it by hand.'
            : 'Still reading this document…'}
        </p>
      ) : !extracted ? (
        <p className="text-sm text-slate-500">Nothing structured came off this document.</p>
      ) : (
        <dl className="space-y-1 text-sm">
          <Field label="Category" value={doc.categoryLabel} />
          {extracted.totalAmount ? <Field label="Amount" value={money(extracted.totalAmount)} /> : null}
          {extracted.entities.length ? <Field label="Provider" value={extracted.entities.join(', ')} /> : null}
          {extracted.dates.length ? <Field label="Dates" value={extracted.dates.join(', ')} /> : null}
          {extracted.icdCodes.length ? <Field label="Diagnoses" value={extracted.icdCodes.join(', ')} /> : null}
          {extracted.cptCodes.length ? <Field label="Procedures" value={extracted.cptCodes.join(', ')} /> : null}
          <Field label="Confidence" value={`${Math.round((extracted.confidence || 0) * 100)}%`} />
        </dl>
      )}

      {doc.needsReview && doc.processingStatus === 'completed' && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Flagged for review — check the original before relying on these figures.
        </p>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-slate-900">{value}</dd>
    </div>
  )
}
