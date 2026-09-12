import { Suspense, lazy, useCallback, useState } from 'react'
import InlineEvidenceUpload from './InlineEvidenceUpload'
import type { AttorneyDashboardFile, AttorneyDashboardLead } from './attorneyDashboardShared'
import { createDocumentRequest, textDocumentRequest } from '../lib/api'

const DocumentRequestModal = lazy(() => import('./DocumentRequestModal'))

type AttorneyDashboardWorkstreamEvidenceProps = {
  selectedLead: AttorneyDashboardLead
  leadEvidenceFiles: AttorneyDashboardFile[]
  onOpenEvidenceDashboard: () => void
}

export default function AttorneyDashboardWorkstreamEvidence({
  selectedLead,
  leadEvidenceFiles,
  onOpenEvidenceDashboard,
}: AttorneyDashboardWorkstreamEvidenceProps) {
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestMessage, setRequestMessage] = useState<string | null>(null)

  // Every "Request Documents" button on the dashboard and the lead detail view
  // navigates here, so this is where an attorney working one case expects to
  // find the ask. The bulk-selection modal on the caseload is the only other
  // way in, and nobody handling a single client goes looking for it.
  const announce = (text: string) => {
    setRequestMessage(text)
    setTimeout(() => setRequestMessage(null), 6000)
  }

  const errorText = (err: any, fallback: string) =>
    err?.response?.data?.error || err?.message || fallback

  const sendByEmail = useCallback(
    async (payload: { requestedDocs: string[]; customMessage?: string; sendUploadLinkOnly?: boolean }) => {
      setRequestLoading(true)
      try {
        await createDocumentRequest(selectedLead.id, payload)
        setRequestOpen(false)
        announce('Document request emailed to the plaintiff with an upload link.')
      } catch (err: any) {
        announce(errorText(err, 'Failed to send the document request'))
      } finally {
        setRequestLoading(false)
      }
    },
    [selectedLead.id],
  )

  const sendByText = useCallback(
    async (payload: { requestedDocs: string[]; customMessage?: string }) => {
      setRequestLoading(true)
      try {
        const result = await textDocumentRequest(selectedLead.id, payload)
        setRequestOpen(false)
        const where =
          result.mode === 'photo_reply'
            ? 'They can reply with photos, which land on the case Inbox tab.'
            : 'They got a one-tap upload link that needs no login, and their files land here.'
        announce(result.warning || `Texted the client at •••${result.phoneLast4 || '••••'}. ${where}`)
      } catch (err: any) {
        announce(errorText(err, 'Failed to text the document request'))
      } finally {
        setRequestLoading(false)
      }
    },
    [selectedLead.id],
  )

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Evidence Dashboard</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="text-xs font-medium px-2 py-1 rounded-md border border-brand-200 text-brand-600 hover:bg-brand-50"
          >
            Request documents
          </button>
          <button
            type="button"
            onClick={onOpenEvidenceDashboard}
            disabled={!selectedLead.assessment?.id}
            className={`text-xs font-medium px-2 py-1 rounded-md border ${
              selectedLead.assessment?.id
                ? 'border-brand-200 text-brand-600 hover:bg-brand-50'
                : 'border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Open Evidence Dashboard
          </button>
        </div>
      </div>
      {requestMessage ? (
        <div className="mb-3 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
          {requestMessage}
        </div>
      ) : null}
      <div className="text-sm text-gray-600 mb-3">
        {selectedLead.assessment?.files?.length || 0} assessment files • {leadEvidenceFiles.length} evidence files
      </div>
      <div className="space-y-2 text-sm">
        {Array.isArray(selectedLead.assessment?.files) && selectedLead.assessment.files.length > 0 ? (
          <div>
            <div className="text-xs text-gray-500">Assessment Files</div>
            <div className="space-y-1">
              {selectedLead.assessment.files.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
                  <span>{file.originalName || file.filename}</span>
                  <span className="text-xs text-gray-400">{file.mimetype || ''}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {leadEvidenceFiles.length > 0 ? (
          <div>
            <div className="text-xs text-gray-500">Evidence Files</div>
            <div className="space-y-1">
              {leadEvidenceFiles.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
                  <span>{file.originalName || file.filename}</span>
                  <span className="text-xs text-gray-400">{file.category || 'other'}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-3">
        <InlineEvidenceUpload
          assessmentId={selectedLead.assessment?.id}
          category="attorney_upload"
          description="Upload documents or evidence for this case"
          compact={true}
        />
      </div>
      <Suspense fallback={null}>
        <DocumentRequestModal
          isOpen={requestOpen}
          onClose={() => setRequestOpen(false)}
          onSubmit={sendByEmail}
          // Always offered here: this panel is one case, which is the condition
          // the caseload modal has to check the selection count to establish.
          onSubmitText={sendByText}
          selectedCount={1}
          loading={requestLoading}
        />
      </Suspense>
    </div>
  )
}
