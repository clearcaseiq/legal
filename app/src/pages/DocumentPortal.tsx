import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getDocumentPortalRequest,
  uploadDocumentPortalFile,
  type DocumentPortalRequest,
} from '../lib/api'

const ROLE_LABELS: Record<string, string> = {
  defendant: 'Defendant',
  opposing_counsel: 'Opposing Counsel',
  insurer: 'Insurer',
}

export default function DocumentPortal() {
  const { token = '' } = useParams<{ token: string }>()
  const [request, setRequest] = useState<DocumentPortalRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploaderName, setUploaderName] = useState('')
  const [selectedDocType, setSelectedDocType] = useState('')
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getDocumentPortalRequest(token)
      setRequest(data)
      setError(null)
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          'This document request could not be found. The link may have expired.'
      )
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setToast(null)
    try {
      let lastStatus = request?.status
      for (const file of Array.from(files)) {
        const res = await uploadDocumentPortalFile(token, file, {
          docType: selectedDocType || undefined,
          uploadedByName: uploaderName || undefined,
          note: note || undefined,
        })
        lastStatus = res.status
      }
      setToast(`Uploaded ${files.length} file${files.length > 1 ? 's' : ''} successfully.`)
      setNote('')
      if (lastStatus) setRequest((prev) => (prev ? { ...prev, status: lastStatus! } : prev))
      await load()
    } catch (err: any) {
      setToast(err?.response?.data?.error || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-500">
        Loading document request…
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-rose-800">Request unavailable</h1>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
        </div>
      </div>
    )
  }

  const fromLabel =
    request.firmName || request.attorneyName
      ? `${request.attorneyName || ''}${request.firmName ? ` · ${request.firmName}` : ''}`.replace(/^ · /, '')
      : 'the requesting attorney'

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Secure document request</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          Documents requested by {fromLabel}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {request.recipientName ? `Hello ${request.recipientName}, ` : ''}
          you've been asked to provide the documents listed below
          {request.recipientRole && ROLE_LABELS[request.recipientRole]
            ? ` as the ${ROLE_LABELS[request.recipientRole].toLowerCase()}`
            : ''}
          . Uploads are transmitted securely.
        </p>

        {request.customMessage && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <p className="font-semibold text-slate-900 dark:text-white">Message from the attorney</p>
            <p className="mt-1 whitespace-pre-wrap">{request.customMessage}</p>
          </div>
        )}

        {request.requestedDocs.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Requested documents</h2>
            <ul className="mt-2 space-y-1">
              {request.requestedDocs.map((doc) => {
                const fulfilled = request.uploads.some((u) => u.docType === doc.key)
                return (
                  <li key={doc.key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                        fulfilled ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {fulfilled ? '✓' : ''}
                    </span>
                    {doc.label}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Upload documents</h2>

          <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Your name (optional)
            <input
              type="text"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              placeholder="e.g., Jane Adjuster"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>

          {request.requestedDocs.length > 0 && (
            <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
              This file is for (optional)
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">General / not sure</option>
                {request.requestedDocs.map((doc) => (
                  <option key={doc.key} value={doc.key}>
                    {doc.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Note (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Anything the attorney should know about these files"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
            className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700 disabled:opacity-50 dark:text-slate-300"
          />
          <p className="mt-2 text-xs text-slate-400">
            PDF, images, video, or Office documents up to 50MB each.
          </p>
          {uploading && <p className="mt-2 text-sm text-indigo-600">Uploading…</p>}
          {toast && <p className="mt-2 text-sm text-emerald-600">{toast}</p>}
        </div>

        {request.uploads.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Files you've uploaded ({request.uploads.length})
            </h2>
            <ul className="mt-2 space-y-1">
              {request.uploads.map((u) => (
                <li key={u.id} className="truncate text-sm text-slate-600 dark:text-slate-300">
                  • {u.originalName}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          This is a secure, single-purpose link. If you received it in error, please disregard it.
        </p>
      </div>
    </div>
  )
}
