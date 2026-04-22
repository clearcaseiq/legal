import type { ReactNode } from 'react'
import { Calendar, MessageSquare, Phone } from 'lucide-react'
import PreAcceptanceView from './PreAcceptanceView'
import PersistentCaseHeader from './PersistentCaseHeader'
import NextBestActionWidget from './NextBestActionWidget'
import { formatCurrency, formatPercentage } from '../lib/formatters'
import AttorneyCaseCommandCenter from './AttorneyCaseCommandCenter'
import type {
  AttorneyDashboardContactCommandPayload,
  AttorneyDashboardFile,
  AttorneyDashboardLead,
  AttorneyDashboardLeadAnalysis,
  AttorneyDashboardLeadFacts,
  AttorneyDashboardLeadPrediction,
} from './attorneyDashboardShared'
import type { CaseCommandCenter } from '../lib/api'
import type { DocTypeId } from './DocumentRequestModal'

type AttorneyDashboardLeadDetailProps = {
  selectedLead: AttorneyDashboardLead
  isLeadSection: boolean
  isPostAcceptance: boolean
  leadWrapperClass: string
  leadContainerClass: string
  onBackToOverview: () => void
  onClose: () => void
  handleDownloadCaseFile: () => void
  caseFileLoading: boolean
  currentAttorneyId: string | null
  firmAttorneys: Array<{ id: string; name: string; email: string | null }>
  transferAttorneyId: string
  setTransferAttorneyId: (value: string) => void
  handleTransferLead: () => void
  transferLoading: boolean
  transferMessage: string | null
  leadPhaseTab: 'pre' | 'post'
  setLeadPhaseTab: (value: 'pre' | 'post') => void
  selectedLeadFacts: AttorneyDashboardLeadFacts
  selectedLeadPrediction: AttorneyDashboardLeadPrediction
  selectedLeadAnalysis: AttorneyDashboardLeadAnalysis
  summarizeNarrative: (value: any) => string
  formatRelativeDate: (value: any) => string
  getTreatmentContinuity: (value: any[]) => string
  buildMedicalChronology: (value: any) => any
  getConfidenceBand: (value: any) => any
  getConfidenceScore: (value: any) => any
  getKeyDrivers: (value: any, fallback: string[]) => any
  getSeverityScore: (value: any) => any
  getAdjusterPrediction: (lead: AttorneyDashboardLead) => any
  analyticsIntel: any
  dashboardData: any
  leadEvidenceFiles: AttorneyDashboardFile[]
  profile: any
  handleLeadDecision: (
    leadId: string,
    decision: 'accept' | 'reject',
    rationaleOverride?: string,
    declineReason?: string,
  ) => void | Promise<void>
  setDeclineLeadId: (value: string | null) => void
  setDeclineModalOpen: (value: boolean) => void
  leadDecisionLoading: boolean
  activeWorkstream: string
  workstreamTab: string
  renderWorkstream: (sectionKey: string) => ReactNode
  contactHistory: any[]
  handleQuickCall: () => void
  handleQuickMessage: () => void
  handleQuickConsult: () => void
  handleCreateContactFromCommand: (payload: AttorneyDashboardContactCommandPayload) => Promise<void>
  setChatDrawerOpen: (value: boolean) => void
  reloadContacts: (leadId: string) => Promise<any> | void
  handleDraftDemandLetter: (assessmentId: string) => Promise<any> | void
  demandDraftLoading: boolean
  setWorkstreamTab: (value: string) => void
  negotiationItems: any[]
  invoiceItems: any[]
  leadCommandCenter: CaseCommandCenter | null
  leadCommandCenterLoading: boolean
  handleReviewSuggestedRequest: (payload: {
    requestedDocs: DocTypeId[]
    customMessage?: string
    sendUploadLinkOnly?: boolean
  }) => void
  handleOpenSuggestedRequestPage: (payload: {
    requestedDocs: DocTypeId[]
    customMessage?: string
    sendUploadLinkOnly?: boolean
  }) => void
  handleDraftPlaintiffUpdate: (message: string) => void
  handleAskCommandCenterCopilot: (question: string) => Promise<void> | void
  handleCreateTasksFromReadiness: () => Promise<any> | any
  copilotAnswer: { answer: string; sources: Array<{ label: string; detail: string }> } | null
  copilotLoading: boolean
}

export default function AttorneyDashboardLeadDetail({
  selectedLead,
  isLeadSection,
  isPostAcceptance,
  leadWrapperClass,
  leadContainerClass,
  onBackToOverview,
  onClose,
  handleDownloadCaseFile,
  caseFileLoading,
  currentAttorneyId,
  firmAttorneys,
  transferAttorneyId,
  setTransferAttorneyId,
  handleTransferLead,
  transferLoading,
  transferMessage,
  leadPhaseTab,
  setLeadPhaseTab,
  selectedLeadFacts,
  selectedLeadPrediction,
  selectedLeadAnalysis,
  summarizeNarrative,
  formatRelativeDate,
  getTreatmentContinuity,
  buildMedicalChronology,
  getConfidenceBand,
  getConfidenceScore,
  getKeyDrivers,
  getSeverityScore,
  getAdjusterPrediction,
  analyticsIntel,
  dashboardData,
  leadEvidenceFiles,
  profile,
  handleLeadDecision,
  setDeclineLeadId,
  setDeclineModalOpen,
  leadDecisionLoading,
  activeWorkstream,
  workstreamTab,
  renderWorkstream,
  contactHistory,
  handleQuickCall,
  handleQuickMessage,
  handleQuickConsult,
  handleCreateContactFromCommand,
  setChatDrawerOpen,
  reloadContacts,
  handleDraftDemandLetter,
  demandDraftLoading,
  setWorkstreamTab,
  negotiationItems,
  invoiceItems,
  leadCommandCenter,
  leadCommandCenterLoading,
  handleReviewSuggestedRequest,
  handleOpenSuggestedRequestPage,
  handleDraftPlaintiffUpdate,
  handleAskCommandCenterCopilot,
  handleCreateTasksFromReadiness,
  copilotAnswer,
  copilotLoading,
}: AttorneyDashboardLeadDetailProps) {
  return (
    <div className={leadWrapperClass}>
      <div className={leadContainerClass}>
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              {isLeadSection ? (
                <button onClick={onBackToOverview} className="text-sm text-brand-600 hover:text-brand-800">
                  ← Back to overview
                </button>
              ) : null}
              <h3 className="text-lg font-medium text-gray-900">Lead Details</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCaseFile}
                disabled={caseFileLoading}
                className="px-3 py-1.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50 disabled:opacity-50"
              >
                {caseFileLoading ? 'Preparing…' : 'Download case file'}
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4">
            <div className="text-sm font-medium text-slate-700">
              {isPostAcceptance ? 'Post-Acceptance' : 'Pre-Acceptance'}
            </div>
            {isPostAcceptance && (!selectedLead.status || selectedLead.status === 'submitted') ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLeadDecision(selectedLead.id, 'reject')}
                  disabled={leadDecisionLoading}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleLeadDecision(selectedLead.id, 'accept')}
                  disabled={leadDecisionLoading}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            ) : null}
          </div>

          {isPostAcceptance && selectedLead.assignedAttorneyId === currentAttorneyId && firmAttorneys.length > 1 ? (
            <div className="mb-4 border border-brand-100 bg-brand-50 rounded-md px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm font-medium text-brand-800">Transfer this lead to another attorney</div>
                <select
                  value={transferAttorneyId}
                  onChange={(e) => setTransferAttorneyId(e.target.value)}
                  className="px-3 py-2 border border-brand-200 rounded-md text-sm bg-white"
                >
                  <option value="">Select attorney</option>
                  {firmAttorneys
                    .filter((attorney) => attorney.id !== currentAttorneyId)
                    .map((attorney) => (
                      <option key={attorney.id} value={attorney.id}>
                        {attorney.name || attorney.email || attorney.id}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleTransferLead}
                  disabled={transferLoading || !transferAttorneyId}
                  className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50"
                >
                  {transferLoading ? 'Transferring…' : 'Transfer Lead'}
                </button>
                {transferMessage ? <span className="text-sm text-brand-700">{transferMessage}</span> : null}
              </div>
            </div>
          ) : null}

          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6 text-sm">
              <button
                onClick={() => setLeadPhaseTab('pre')}
                className={`py-2 border-b-2 font-medium ${
                  leadPhaseTab === 'pre'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pre-Acceptance
              </button>
              <button
                onClick={() => setLeadPhaseTab('post')}
                disabled={!isPostAcceptance}
                className={`py-2 border-b-2 font-medium ${
                  leadPhaseTab === 'post'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } ${!isPostAcceptance ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                Post-Acceptance (full details)
              </button>
            </nav>
          </div>

          <AttorneyCaseCommandCenter
            summary={leadCommandCenter}
            loading={leadCommandCenterLoading}
            onReviewSuggestedRequest={handleReviewSuggestedRequest}
            onOpenSuggestedRequestPage={handleOpenSuggestedRequestPage}
            onDraftPlaintiffUpdate={handleDraftPlaintiffUpdate}
            onAskCopilot={handleAskCommandCenterCopilot}
            onCreateTasksFromBlockers={handleCreateTasksFromReadiness}
            onOpenWorkstream={(section) => setWorkstreamTab(section)}
            copilotAnswer={copilotAnswer}
            copilotLoading={copilotLoading}
          />

          {leadPhaseTab === 'post' && !isPostAcceptance ? (
            <div className="rounded-md border border-gray-200 p-4 mb-4 bg-white">
              <div className="text-sm text-gray-600">Post-acceptance workstreams unlock after acceptance.</div>
            </div>
          ) : null}

          {(() => {
            const facts: any = selectedLeadFacts || {}
            const prediction = (selectedLeadPrediction || {}) as any
            const analysis = (selectedLeadAnalysis || {}) as any
            const bands = prediction?.bands || {}
            const explain = prediction?.explain || {}
            const comparable = analysis?.comparableCaseData || {}
            const normalizeSignal = (value: any) => {
              if (!value) return null
              const text = String(value)
              if (!text || ['no data', 'n/a', 'unknown'].includes(text.toLowerCase())) return null
              return text
            }
            const injuries = Array.isArray(facts?.injuries) ? facts.injuries : []
            const treatments = Array.isArray(facts?.treatment) ? facts.treatment : []
            const filesCount = Array.isArray(selectedLead.assessment?.files) ? selectedLead.assessment.files.length : 0
            const incidentSummary = summarizeNarrative(facts?.incident?.narrative)
            const _incidentDate = formatRelativeDate(facts?.incident?.date)
            const _injuryTypes = injuries
              .map((injury: any) => injury?.type || injury?.description)
              .filter(Boolean)
              .slice(0, 3)
              .map((item: string) => (item.length > 60 ? `${item.slice(0, 60)}...` : item))
            const treatmentContinuity = getTreatmentContinuity(treatments)
            const deterministicChronology = buildMedicalChronology(facts)
            const confidenceBand = getConfidenceBand(bands)
            const confidenceScore = getConfidenceScore(confidenceBand)
            const _keyDrivers = getKeyDrivers(explain, [
              (selectedLead.liabilityScore ?? 0) > 0.7 ? 'liability strength' : 'liability factors',
              injuries.length > 0 ? 'injury severity' : 'injury profile',
              selectedLead.assessment?.venueCounty ? 'venue dynamics' : 'case dynamics',
            ])
            const _insurance = (() => {
              const insuranceInfo = facts?.insurance
              if (!insuranceInfo || typeof insuranceInfo !== 'object') return 'Not provided'
              const parts: string[] = []
              if (insuranceInfo.health_coverage) {
                parts.push(
                  `Health coverage: ${
                    insuranceInfo.health_coverage === 'yes'
                      ? 'Yes'
                      : insuranceInfo.health_coverage === 'no'
                        ? 'No'
                        : 'Unsure'
                  }`,
                )
              }
              if (Array.isArray(insuranceInfo.coverage_types) && insuranceInfo.coverage_types.length > 0) {
                parts.push(`Types: ${insuranceInfo.coverage_types.join(', ')}`)
              }
              if (insuranceInfo.medicare_plan_type) {
                parts.push(`Medicare: ${String(insuranceInfo.medicare_plan_type).replace(/_/g, ' ')}`)
              }
              if (insuranceInfo.at_fault_party) parts.push(`At-fault: ${insuranceInfo.at_fault_party}`)
              if (insuranceInfo.own_insurance) parts.push(`Own: ${insuranceInfo.own_insurance}`)
              if (insuranceInfo.policy_limit !== undefined) {
                parts.push(`Policy: ${formatCurrency(Number(insuranceInfo.policy_limit))}`)
              }
              if (insuranceInfo.uninsured !== undefined) {
                parts.push(`Uninsured: ${insuranceInfo.uninsured ? 'Yes' : 'No'}`)
              }
              return parts.length > 0 ? parts.join(' • ') : 'Not provided'
            })()
            const _severity = getSeverityScore(facts)
            const _adjuster = analysis?.adjusterPrediction
              ? {
                  posture: analysis.adjusterPrediction.strategy || 'Not available',
                  risk: analysis.adjusterPrediction.riskIndicator || 'Not available',
                }
              : getAdjusterPrediction(selectedLead)
            const _liabilityFactors = (() => {
              const factors: string[] = []
              if (facts?.liability?.fault) factors.push(String(facts.liability.fault).replace(/_/g, ' '))
              if (Array.isArray(facts?.liability?.evidence)) {
                factors.push(...facts.liability.evidence.slice(0, 2).map((factor: any) => String(factor)))
              }
              return factors.length > 0 ? factors : ['Not available']
            })()
            const comparativeRisk = (() => {
              const flag = facts?.liability?.comparativeNegligence ?? facts?.liability?.comparative_negligence
              if (flag === true) return 'Yes'
              if (flag === false) return 'No'
              return (selectedLead.liabilityScore ?? 0) < 0.5 ? 'Possible' : 'Low'
            })()
            const _missingTreatmentStatus = treatments.length === 0 ? 'Gaps detected' : 'Complete'
            const _missingTreatmentSeverity = treatments.length === 0 ? 'high' : treatments.length === 1 ? 'medium' : 'low'
            const comparableCountRaw =
              comparable?.count ?? explain?.comparables?.count ?? explain?.comparable_count ?? explain?.comparablesCount
            const comparableCountFromIntel = Array.isArray(analyticsIntel?.caseLevel)
              ? analyticsIntel.caseLevel.filter((item: any) => {
                  const matchType = selectedLead.assessment?.claimType
                    ? item.claimType === selectedLead.assessment.claimType
                    : true
                  const matchVenue = selectedLead.assessment?.venueState
                    ? item.venueState === selectedLead.assessment.venueState
                    : true
                  return matchType && matchVenue && item.leadId !== selectedLead.id
                }).length
              : null
            const comparableCountFromLeads = dashboardData?.recentLeads
              ? dashboardData.recentLeads.filter((lead: any) => {
                  const matchType = selectedLead.assessment?.claimType
                    ? lead.assessment?.claimType === selectedLead.assessment.claimType
                    : true
                  const matchVenue = selectedLead.assessment?.venueState
                    ? lead.assessment?.venueState === selectedLead.assessment.venueState
                    : true
                  return matchType && matchVenue && lead.id !== selectedLead.id
                }).length
              : null
            const comparableCount = comparableCountRaw ?? comparableCountFromIntel ?? comparableCountFromLeads
            const venueSignalRaw =
              normalizeSignal(comparable?.venueSignal) ||
              normalizeSignal(explain?.venueSignal) ||
              normalizeSignal(explain?.venue_signal)
            const venueRoi = selectedLead.assessment?.venueState
              ? analyticsIntel?.firmLevel?.roiByVenue?.[selectedLead.assessment.venueState]?.roi
              : null
            const venueSignal =
              venueSignalRaw ||
              (venueRoi !== null && venueRoi !== undefined ? `ROI ${formatPercentage(venueRoi * 100)}` : null) ||
              (selectedLead.assessment?.venueState
                ? `Standard for ${selectedLead.assessment.venueState}`
                : 'No venue data')
            const outcomeDirectionRaw =
              normalizeSignal(comparable?.outcomeDirection) ||
              normalizeSignal(explain?.outcomeDirection) ||
              normalizeSignal(explain?.outcome_direction)
            const caseIntel = Array.isArray(analyticsIntel?.caseLevel)
              ? analyticsIntel.caseLevel.find((item: any) => item.leadId === selectedLead.id)
              : null
            const _outcomeDirection =
              outcomeDirectionRaw ||
              (caseIntel
                ? caseIntel.outcome > caseIntel.cost
                  ? 'positive'
                  : caseIntel.outcome === caseIntel.cost
                    ? 'flat'
                    : 'negative'
                : (selectedLead.viabilityScore ?? 0) >= 0.7
                  ? 'positive'
                  : (selectedLead.viabilityScore ?? 0) >= 0.5
                    ? 'mixed'
                    : 'negative')
            const _caseIdRaw = selectedLead.assessment?.id || selectedLead.id
            const _caseIdAnon = _caseIdRaw ? `CASE-${_caseIdRaw.slice(-6).toUpperCase()}` : 'Not available'
            const _isMasked = leadPhaseTab === 'pre' || !isPostAcceptance
            const hasMedical = treatments.length > 0 || leadEvidenceFiles.some((file: any) => file?.category === 'medical')
            const hasPolice = leadEvidenceFiles.some((file: any) => file?.category === 'police')
            const hasPhotos = leadEvidenceFiles.some((file: any) => file?.category === 'photos')
            const caseScoreForHeader = Math.round((selectedLead?.viabilityScore ?? 0) * 100)
            const evidenceScoreForPriority = Math.round(
              (((hasMedical ? 1 : 0) + (hasPhotos ? 1 : 0) + (hasPolice ? 1 : 0)) / 4) * 100,
            )
            const casePriorityForHeader: 'High' | 'Medium' | 'Low' =
              caseScoreForHeader >= 70 && evidenceScoreForPriority >= 75
                ? 'High'
                : caseScoreForHeader >= 40
                  ? 'Medium'
                  : 'Low'
            const incidentDateForSol = facts?.incident?.date ? new Date(facts.incident.date) : null
            const solYears = 2
            const solDeadlineDate = incidentDateForSol
              ? new Date(incidentDateForSol.getTime() + solYears * 365 * 24 * 60 * 60 * 1000)
              : null
            const solYearsRemainingForHeader = solDeadlineDate
              ? Math.max(0, (solDeadlineDate.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000))
              : null
            const solDeadlineStrForHeader = solDeadlineDate
              ? solDeadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null
            const _maskValue = (value: string) => (_isMasked ? 'Masked' : value || 'Not available')
            const _maskedSummary = _isMasked ? 'Available after acceptance.' : incidentSummary

            if (isLeadSection && isPostAcceptance && leadPhaseTab === 'post') {
              return <div className="space-y-4">{renderWorkstream(activeWorkstream)}</div>
            }

            if (leadPhaseTab === 'pre') {
              let evidenceChecklistParsed: any = {}
              try {
                const raw = (selectedLead as any).evidenceChecklist
                evidenceChecklistParsed = raw ? JSON.parse(raw) : {}
              } catch {}
              const introRequestedAt = selectedLead.assessment?.introductions?.[0]?.requestedAt
              const expiresAt = introRequestedAt
                ? new Date(new Date(introRequestedAt).getTime() + 24 * 60 * 60 * 1000)
                : null
              return (
                <PreAcceptanceView
                  selectedLead={selectedLead}
                  bands={bands}
                  viability={prediction?.viability || {}}
                  confidenceScore={confidenceScore}
                  liabilityScore={selectedLead.liabilityScore || 0}
                  comparativeRisk={comparativeRisk}
                  treatments={treatments}
                  treatmentContinuity={treatmentContinuity}
                  deterministicChronology={deterministicChronology}
                  filesCount={filesCount}
                  leadEvidenceFiles={leadEvidenceFiles}
                  evidenceChecklist={evidenceChecklistParsed}
                  venueSignal={venueSignal}
                  comparableCount={comparableCount}
                  comparableAvgSettlement={comparable?.avgSettlement ?? bands?.median}
                  venueState={selectedLead.assessment?.venueState}
                  attorneyProfile={profile as any}
                  onAccept={() => handleLeadDecision(selectedLead.id, 'accept')}
                  onDecline={() => {
                    setDeclineLeadId(selectedLead.id)
                    setDeclineModalOpen(true)
                  }}
                  onRequestInfo={(notes) => handleLeadDecision(selectedLead.id, 'reject', notes)}
                  loading={leadDecisionLoading}
                  caseExpiresAt={expiresAt}
                  accepted={isPostAcceptance}
                />
              )
            }

            const claimType = (selectedLead?.assessment?.claimType || 'unknown').replace(/_/g, ' ')
            const location =
              [selectedLead?.assessment?.venueCounty, selectedLead?.assessment?.venueState].filter(Boolean).join(', ') ||
              '—'
            const valueLow = bands?.p25 ?? bands?.low ?? 0
            const valueHigh = bands?.p75 ?? bands?.high ?? bands?.median ?? 0
            const caseScore = Math.round((selectedLead?.viabilityScore ?? 0) * 100)
            const caseStrength = caseScore >= 70 ? 'Strong' : caseScore >= 40 ? 'Moderate' : 'Weak'
            const treatment = treatments.length > 0 ? 'Yes' : 'No'
            const timelineEstimate = treatments.length >= 2 ? '8–14 months' : treatments.length === 1 ? '6–12 months' : '—'
            const firstName = selectedLead?.assessment?.user?.firstName || ''
            const lastName = selectedLead?.assessment?.user?.lastName || ''
            const plaintiffName = `${firstName} ${lastName.charAt(0) || ''}.`.trim() || 'Not provided'
            const phone = selectedLead?.assessment?.user?.phone || ''
            const email = selectedLead?.assessment?.user?.email || ''
            const preferredContact = phone ? 'Phone' : email ? 'Email' : '—'
            const nextActionsForWidget: string[] = []
            if (contactHistory.length === 0) nextActionsForWidget.push('Call plaintiff to confirm injuries')
            if (!hasPolice) nextActionsForWidget.push('Request police report')
            if (!hasMedical) nextActionsForWidget.push('Upload medical bills')
            if (contactHistory.length === 0) nextActionsForWidget.push('Schedule consultation')
            if (nextActionsForWidget.length === 0) nextActionsForWidget.push('Review case and prepare demand letter')

            return (
              <>
                <PersistentCaseHeader
                  claimType={claimType}
                  location={location}
                  caseScore={caseScore}
                  caseStrength={caseStrength}
                  valueLow={valueLow}
                  valueHigh={valueHigh}
                  evidenceCount={filesCount + leadEvidenceFiles.length}
                  treatment={treatment}
                  timelineEstimate={timelineEstimate}
                  liabilityPercent={Math.round((selectedLead?.liabilityScore || 0) * 100)}
                  caseStatus={
                    selectedLead?.status === 'retained'
                      ? 'Retained'
                      : selectedLead?.status === 'consulted'
                        ? 'Consultation Completed'
                        : contactHistory.some((contact: any) => contact.contactType === 'consult' && contact.scheduledAt)
                          ? 'Consultation Scheduled'
                          : 'Consultation Pending'
                  }
                  plaintiffName={plaintiffName}
                  phone={phone}
                  email={email}
                  preferredContact={preferredContact}
                  contactHistory={contactHistory}
                  onCall={handleQuickCall}
                  onMessage={handleQuickMessage}
                  onScheduleConsult={handleQuickConsult}
                  onDownloadCaseFile={handleDownloadCaseFile}
                  onCreateContact={handleCreateContactFromCommand}
                  onOpenChat={() => setChatDrawerOpen(true)}
                  onRefresh={() => {
                    if (selectedLead?.id) {
                      void reloadContacts(selectedLead.id)
                    }
                  }}
                  caseFileLoading={caseFileLoading}
                  onGenerateDemandLetter={
                    selectedLead?.assessment?.id
                      ? async () => {
                          await handleDraftDemandLetter(selectedLead.assessment?.id as string)
                          setWorkstreamTab('demand')
                        }
                      : undefined
                  }
                  demandLetterLoading={demandDraftLoading}
                  casePriority={casePriorityForHeader}
                  solYearsRemaining={
                    solYearsRemainingForHeader != null
                      ? Math.floor(solYearsRemainingForHeader * 10) / 10
                      : undefined
                  }
                  solDeadline={solDeadlineStrForHeader ?? undefined}
                />
                <div className="rounded-lg border border-gray-200 p-3 mb-4 bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Workflow Tools</h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setWorkstreamTab('retainer')}
                          className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
                        >
                          Retainer Flow
                        </button>
                        <button
                          onClick={() => setWorkstreamTab('tasks')}
                          className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
                        >
                          Tasks
                        </button>
                        <button
                          onClick={() => setWorkstreamTab('collaboration')}
                          className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
                        >
                          Team Notes
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Case Intelligence</h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setWorkstreamTab('case-insights')}
                          className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
                        >
                          Case Insights
                        </button>
                        <button
                          onClick={() => setWorkstreamTab('demand')}
                          className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
                        >
                          Demand Package
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Financial</h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setWorkstreamTab('insurance')}
                          className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
                        >
                          Insurance & Liens
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-b border-gray-200 mb-4">
                  <nav className="-mb-px flex flex-wrap gap-3 text-sm">
                    <button
                      onClick={() => setWorkstreamTab('overview')}
                      className={`px-3 py-2 border-b-2 font-medium ${
                        ['overview', 'retainer', 'collaboration', 'tasks', 'case-insights', 'demand', 'insurance', 'health', 'finance', 'referrals'].includes(workstreamTab)
                          ? 'border-brand-500 text-brand-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setWorkstreamTab('evidence')}
                      className={`px-3 py-2 border-b-2 font-medium ${
                        workstreamTab === 'evidence'
                          ? 'border-brand-500 text-brand-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Documents <span className="ml-2 text-xs text-gray-400">{leadEvidenceFiles.length}</span>
                    </button>
                    <button
                      onClick={() => setWorkstreamTab('chronology')}
                      className={`px-3 py-2 border-b-2 font-medium ${
                        workstreamTab === 'chronology'
                          ? 'border-brand-500 text-brand-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Chronology
                    </button>
                    <button
                      onClick={() => setWorkstreamTab('negotiation')}
                      className={`px-3 py-2 border-b-2 font-medium ${
                        workstreamTab === 'negotiation'
                          ? 'border-brand-500 text-brand-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Negotiation <span className="ml-2 text-xs text-gray-400">{negotiationItems.length}</span>
                    </button>
                    <button
                      onClick={() => setWorkstreamTab('communications')}
                      className={`px-3 py-2 border-b-2 font-medium ${
                        workstreamTab === 'communications'
                          ? 'border-brand-500 text-brand-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Messages <span className="ml-2 text-xs text-gray-400">{contactHistory.length}</span>
                    </button>
                    <button
                      onClick={() => setWorkstreamTab('billing')}
                      className={`px-3 py-2 border-b-2 font-medium ${
                        workstreamTab === 'billing'
                          ? 'border-brand-500 text-brand-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Billing <span className="ml-2 text-xs text-gray-400">{invoiceItems.length}</span>
                    </button>
                  </nav>
                </div>
                <div className="space-y-4">
                  {['retainer', 'collaboration', 'tasks', 'case-insights', 'demand', 'insurance', 'health', 'finance', 'referrals'].includes(activeWorkstream) ? (
                    <button
                      onClick={() => setWorkstreamTab('overview')}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      ← Back to Overview
                    </button>
                  ) : null}
                  {renderWorkstream(activeWorkstream)}
                </div>
                <NextBestActionWidget actions={nextActionsForWidget} maxVisible={3} />
              </>
            )
          })()}

          {!isPostAcceptance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Case Type</label>
                  <p className="text-sm text-gray-900">{selectedLead.assessment?.claimType?.replace(/_/g, ' ') || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Venue</label>
                  <p className="text-sm text-gray-900">
                    {selectedLead.assessment?.venueCounty}, {selectedLead.assessment?.venueState}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Viability Breakdown</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-sm font-medium">Liability</div>
                    <div className="text-lg font-bold text-blue-600">{formatPercentage(selectedLead.liabilityScore ?? 0)}</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-sm font-medium">Causation</div>
                    <div className="text-lg font-bold text-green-600">{formatPercentage(selectedLead.causationScore ?? 0)}</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <div className="text-sm font-medium">Damages</div>
                    <div className="text-lg font-bold text-purple-600">{formatPercentage(selectedLead.damagesScore ?? 0)}</div>
                  </div>
                </div>
              </div>
              {['contacted', 'consulted', 'retained'].includes(selectedLead.status || '') ? (
                <div className="flex space-x-4 pt-4">
                  <button onClick={handleQuickCall} className="btn-primary">
                    <Phone className="h-4 w-4 mr-2" /> Call Now
                  </button>
                  <button onClick={handleQuickMessage} className="btn-secondary">
                    <MessageSquare className="h-4 w-4 mr-2" /> Send Message
                  </button>
                  <button onClick={handleQuickConsult} className="btn-secondary">
                    <Calendar className="h-4 w-4 mr-2" /> Schedule Consult
                  </button>
                </div>
              ) : (
                <div className="pt-4 text-sm text-gray-500">Accept the lead to unlock contact actions.</div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
