/**
 * Document Request Modal - Structured workflow for requesting evidence from plaintiff.
 * Opens when attorney clicks "Send document request" (single or bulk).
 */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export const DOC_TYPES = [
  { id: 'police_report', label: 'Police report' },
  { id: 'medical_records', label: 'Medical records' },
  { id: 'injury_photos', label: 'Injury photos' },
  { id: 'wage_loss', label: 'Wage loss documentation' },
  { id: 'insurance', label: 'Insurance information' },
  { id: 'other', label: 'Other' }
] as const

export type DocTypeId = (typeof DOC_TYPES)[number]['id']

interface DocumentRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: { requestedDocs: DocTypeId[]; customMessage?: string; sendUploadLinkOnly?: boolean }) => Promise<void>
  selectedCount: number
  loading?: boolean
  initialRequestedDocs?: DocTypeId[]
  initialCustomMessage?: string
  initialSendUploadLinkOnly?: boolean
}

export default function DocumentRequestModal({
  isOpen,
  onClose,
  onSubmit,
  selectedCount,
  loading = false,
  initialRequestedDocs = [],
  initialCustomMessage = '',
  initialSendUploadLinkOnly = false,
}: DocumentRequestModalProps) {
  const [selected, setSelected] = useState<Set<DocTypeId>>(new Set())
  const [customMessage, setCustomMessage] = useState('')
  const [sendUploadLinkOnly, setSendUploadLinkOnly] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setSelected(new Set(initialRequestedDocs))
    setCustomMessage(initialCustomMessage)
    setSendUploadLinkOnly(initialSendUploadLinkOnly)
  }, [initialCustomMessage, initialRequestedDocs, initialSendUploadLinkOnly, isOpen])

  const toggle = (id: DocTypeId) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    if (sendUploadLinkOnly) {
      await onSubmit({ requestedDocs: [], customMessage, sendUploadLinkOnly: true })
    } else {
      await onSubmit({ requestedDocs: [...selected], customMessage: customMessage.trim() || undefined })
    }
    setSelected(new Set())
    setCustomMessage('')
    setSendUploadLinkOnly(false)
    onClose()
  }

  const canSubmit = sendUploadLinkOnly || selected.size > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-600/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Request Documents from Plaintiff</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {selectedCount > 1 && (
            <p className="text-sm text-brand-600 bg-brand-50 rounded-lg px-3 py-2">
              Sending separate requests to {selectedCount} plaintiff{selectedCount > 1 ? 's' : ''}.
            </p>
          )}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Select documents needed:</p>
            <div className="space-y-2">
              {DOC_TYPES.map(doc => (
                <label key={doc.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(doc.id)}
                    onChange={() => toggle(doc.id)}
                    disabled={sendUploadLinkOnly}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-800">{doc.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendUploadLinkOnly}
                onChange={e => setSendUploadLinkOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Send Upload Link only</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">Let plaintiff upload anything quickly without selecting document types.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Optional message:</label>
            <textarea
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              placeholder='e.g. "Please upload the police report if available. It helps confirm liability."'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
