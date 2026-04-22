import InlineEvidenceUpload from './InlineEvidenceUpload'
import type { AttorneyDashboardFile, AttorneyDashboardLead } from './attorneyDashboardShared'

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
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Evidence Dashboard</h4>
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
    </div>
  )
}
