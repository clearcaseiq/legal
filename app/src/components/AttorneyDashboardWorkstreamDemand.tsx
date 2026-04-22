import type {
  AttorneyDashboardLead,
  AttorneyDashboardLeadAnalysis,
  AttorneyDashboardLeadFacts,
} from './attorneyDashboardShared'

type AttorneyDashboardWorkstreamDemandProps = {
  selectedLead: AttorneyDashboardLead
  selectedLeadFacts: AttorneyDashboardLeadFacts
  selectedLeadAnalysis: AttorneyDashboardLeadAnalysis
  handleDraftDemandLetter: any
  handleViewLatestDraft: any
  handleDownloadDemandDocx: any
  demandDraftLoading: boolean
  demandDraftId: string | null
  demandDraftMessage: string | null
  demandDraftContent: string | null
  leadCommandCenter?: any
}

export default function AttorneyDashboardWorkstreamDemand({
  selectedLead,
  selectedLeadFacts,
  selectedLeadAnalysis,
  handleDraftDemandLetter,
  handleViewLatestDraft,
  handleDownloadDemandDocx,
  demandDraftLoading,
  demandDraftId,
  demandDraftMessage,
  demandDraftContent,
  leadCommandCenter,
}: AttorneyDashboardWorkstreamDemandProps) {
  const analysis = (selectedLeadAnalysis || {}) as any
  const facts: any = selectedLeadFacts || {}
  const injuries = Array.isArray(facts?.injuries) ? facts.injuries : []
  const treatments = Array.isArray(facts?.treatment) ? facts.treatment : []
  const filesCount = Array.isArray(selectedLead?.assessment?.files) ? selectedLead.assessment.files.length : 0
  const demandReady = leadCommandCenter
    ? leadCommandCenter.readiness.score >= 70 && leadCommandCenter.missingItems.length <= 1
    : filesCount >= 2 || (treatments.length > 0 && injuries.length > 0)
  const assessmentId = selectedLead.assessment?.id

  return (
    <>
      <div className="rounded-md border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Demand Package</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Availability</div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-gray-900">{demandReady ? 'Demand-ready' : 'Needs docs'}</span>
              {demandReady && assessmentId ? (
                <>
                  <button
                    onClick={() => handleDraftDemandLetter(assessmentId)}
                    disabled={demandDraftLoading}
                    className="px-2 py-1 text-xs font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50"
                  >
                    {demandDraftLoading ? 'Drafting…' : 'Draft demand letter'}
                  </button>
                  <button
                    onClick={() => handleViewLatestDraft(assessmentId)}
                    disabled={demandDraftLoading}
                    className="px-2 py-1 text-xs font-medium text-brand-700 border border-brand-200 rounded-md hover:bg-brand-50 disabled:opacity-50"
                  >
                    View draft
                  </button>
                  {demandDraftId ? (
                    <button
                      onClick={handleDownloadDemandDocx}
                      disabled={demandDraftLoading}
                      className="px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Download Word
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
            {demandDraftMessage ? (
              <div className="mt-1 text-xs text-gray-500">{demandDraftMessage}</div>
            ) : null}
            {demandDraftContent ? (
              <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs whitespace-pre-wrap text-gray-700">
                {demandDraftContent}
              </div>
            ) : null}
          </div>
          <div>
            <div className="text-gray-500">Estimated Strength Score</div>
            <div className="text-gray-900">{selectedLead ? `${Math.round((selectedLead.viabilityScore ?? 0) * 100)}%` : 'N/A'}</div>
          </div>
        </div>
        {leadCommandCenter ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-gray-100 bg-slate-50 p-3">
              <div className="text-gray-500">Demand readiness</div>
              <div className="text-gray-900 font-medium">{leadCommandCenter.readiness.score}% • {leadCommandCenter.readiness.label}</div>
            </div>
            <div className="rounded-md border border-gray-100 bg-slate-50 p-3">
              <div className="text-gray-500">Primary blocker</div>
              <div className="text-gray-900 font-medium">
                {leadCommandCenter.missingItems[0]?.label || leadCommandCenter.defenseRisks[0]?.title || 'No major blocker'}
              </div>
            </div>
            <div className="rounded-md border border-gray-100 bg-slate-50 p-3">
              <div className="text-gray-500">Negotiation posture</div>
              <div className="text-gray-900 font-medium">{leadCommandCenter.negotiationSummary.eventCount > 0 ? 'Already active' : 'Pre-negotiation'}</div>
            </div>
          </div>
        ) : null}
        {leadCommandCenter?.missingItems?.length ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <div className="font-medium text-amber-900">Close these blockers before finalizing demand</div>
            <div className="mt-2 space-y-1 text-amber-800">
              {leadCommandCenter.missingItems.slice(0, 3).map((item: any) => (
                <div key={item.key}>• {item.label}: {item.plaintiffReason}</div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {(() => {
        const draft = analysis?.demandPackage?.demandDraft?.trim() || ''
        const summary = analysis?.demandPackage?.damageSummary?.trim() || ''
        const outline = analysis?.demandPackage?.liabilityOutline?.trim() || ''
        const hasDraft = draft.length >= 50 && !['n/a', 'na', 'not available', 'not available.'].includes(draft.toLowerCase())
        const hasSummary = summary.length > 0 && !['n/a', 'na', 'not available', 'not available.'].includes(summary.toLowerCase())
        const hasOutline = outline.length > 0 && !['n/a', 'na', 'not available', 'not available.'].includes(outline.toLowerCase())

        if (!hasDraft && !hasSummary && !hasOutline && !analysis?.demandPackage?.attorneyEditable) {
          return null
        }

        return (
          <div className="rounded-md border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Demand Package (AI Draft)</h4>
            <div className="space-y-3 text-sm">
              {hasDraft ? (
                <>
                  <div className="text-gray-500">Demand Letter Draft</div>
                  <div className="text-gray-900">{draft}</div>
                </>
              ) : null}
              {hasSummary ? (
                <>
                  <div className="text-gray-500">Damage Summary</div>
                  <div className="text-gray-900">{summary}</div>
                </>
              ) : null}
              {hasOutline ? (
                <>
                  <div className="text-gray-500">Liability Argument Outline</div>
                  <div className="text-gray-900">{outline}</div>
                </>
              ) : null}
              {analysis?.demandPackage?.attorneyEditable ? (
                <>
                  <div className="text-gray-500">Editable Attorney-ready Format</div>
                  <div className="text-gray-900">Available</div>
                </>
              ) : null}
            </div>
          </div>
        )
      })()}
    </>
  )
}
