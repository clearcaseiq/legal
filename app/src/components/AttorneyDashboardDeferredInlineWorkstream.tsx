import { formatCurrency } from '../lib/formatters'
import ReferralFeeSplitSections from './ReferralFeeSplitSections'

type Props = {
  sectionKey: 'chronology' | 'referrals' | 'finance' | 'retainer'
  selectedLead: any
  selectedLeadFacts: any
  buildMedicalChronology: (facts: any) => { timeline: string[]; gapsAndRedFlags?: string[] }
  caseShareForm: any
  setCaseShareForm: (value: any) => void
  handleCreateCaseShare: () => void
  caseShareMessage: string | null
  caseShares: any[]
  currentUserEmail: string | null
  currentAttorneyId: string | null
  handleAcceptCaseShare: (id: string) => void
  handleDeclineCaseShare: (id: string) => void
  referralForm: any
  setReferralForm: (value: any) => void
  handleCreateReferral: () => void
  referralMessage: string | null
  referrals: any[]
  handleAcceptReferral: (id: string) => void
  handleDeclineReferral: (id: string) => void
  coCounselForm: any
  setCoCounselForm: (value: any) => void
  handleCreateCoCounselWorkflow: () => void
  coCounselMessage: string | null
  coCounselWorkflows: any[]
  handleAcceptCoCounsel: (id: string) => void
  handleDeclineCoCounsel: (id: string) => void
  financeSummary: any
  financeModel: any
  setFinanceModel: (value: any) => void
  financeMessage: string | null
  financeLoading: boolean
  handleDownloadFinanceUnderwritingPdf: () => void
  handleDownloadFinanceDataroom: () => void
  handleStatusUpdate: (status: 'contacted' | 'consulted' | 'retained') => void | Promise<void>
  leadDecisionLoading: boolean
}

export default function AttorneyDashboardDeferredInlineWorkstream({
  sectionKey,
  selectedLead,
  selectedLeadFacts,
  buildMedicalChronology,
  caseShareForm,
  setCaseShareForm,
  handleCreateCaseShare,
  caseShareMessage,
  caseShares,
  currentUserEmail,
  currentAttorneyId,
  handleAcceptCaseShare,
  handleDeclineCaseShare,
  referralForm,
  setReferralForm,
  handleCreateReferral,
  referralMessage,
  referrals,
  handleAcceptReferral,
  handleDeclineReferral,
  coCounselForm,
  setCoCounselForm,
  handleCreateCoCounselWorkflow,
  coCounselMessage,
  coCounselWorkflows,
  handleAcceptCoCounsel,
  handleDeclineCoCounsel,
  financeSummary,
  financeModel,
  setFinanceModel,
  financeMessage,
  financeLoading,
  handleDownloadFinanceUnderwritingPdf,
  handleDownloadFinanceDataroom,
  handleStatusUpdate,
  leadDecisionLoading,
}: Props) {
  if (sectionKey === 'chronology') {
    const facts: any = selectedLeadFacts || {}
    const chronology = buildMedicalChronology(facts)
    const incidentDateStr = facts?.incident?.date
      ? new Date(facts.incident.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null
    const timelineEntries: { date: string; label: string }[] = []
    if (incidentDateStr) timelineEntries.push({ date: incidentDateStr, label: 'Accident' })
    chronology.timeline.forEach((entry: string) => {
      const parts = entry.split(' — ')
      const date = parts[0] || '—'
      const rest = parts.slice(1).join(' — ') || entry
      timelineEntries.push({ date, label: rest })
    })

    return (
      <div className="rounded-md border border-gray-200 p-4 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Medical Chronology</h4>
        <p className="text-xs text-gray-500">Treatment timeline: attorneys immediately see treatment gaps.</p>
        {timelineEntries.length > 0 ? (
          <div className="space-y-2">
            {timelineEntries.map((entry, index) => (
              <div key={index} className="flex items-start gap-3 text-sm">
                <span className="text-gray-600 font-medium shrink-0 w-24">{entry.date}</span>
                <span className="text-gray-700">- {entry.label}</span>
              </div>
            ))}
            {chronology.gapsAndRedFlags && chronology.gapsAndRedFlags.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <h5 className="text-xs font-semibold text-amber-700 mb-2">Treatment Gaps</h5>
                <ul className="space-y-1 text-xs text-gray-600">
                  {chronology.gapsAndRedFlags.map((gap: string, index: number) => (
                    <li key={index}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No treatment timeline yet.</p>
        )}
      </div>
    )
  }

  if (sectionKey === 'referrals') {
    return (
      <ReferralFeeSplitSections
        caseShareForm={caseShareForm}
        setCaseShareForm={setCaseShareForm}
        handleCreateCaseShare={handleCreateCaseShare}
        caseShareMessage={caseShareMessage}
        caseShares={caseShares}
        currentUserEmail={currentUserEmail}
        currentAttorneyId={currentAttorneyId}
        handleAcceptCaseShare={handleAcceptCaseShare}
        handleDeclineCaseShare={handleDeclineCaseShare}
        referralForm={referralForm}
        setReferralForm={setReferralForm}
        handleCreateReferral={handleCreateReferral}
        referralMessage={referralMessage}
        referrals={referrals}
        handleAcceptReferral={handleAcceptReferral}
        handleDeclineReferral={handleDeclineReferral}
        coCounselForm={coCounselForm}
        setCoCounselForm={setCoCounselForm}
        handleCreateCoCounselWorkflow={handleCreateCoCounselWorkflow}
        coCounselMessage={coCounselMessage}
        coCounselWorkflows={coCounselWorkflows}
        handleAcceptCoCounsel={handleAcceptCoCounsel}
        handleDeclineCoCounsel={handleDeclineCoCounsel}
      />
    )
  }

  if (sectionKey === 'finance') {
    const packaging = financeSummary?.casePackaging || {}
    const riskProfile = financeSummary?.riskReturnProfile || {}
    const underwriting = financeSummary?.underwritingView || {}
    const expectedValue = riskProfile.expectedValue || 0
    const advanceAmount = expectedValue * (financeModel.advanceRate / 100)
    const feeCost = advanceAmount * (financeModel.feeRate / 100) * financeModel.durationMonths
    const netRecovery = Math.max(0, expectedValue - advanceAmount - feeCost)

    return (
      <div className="rounded-md border border-gray-200 p-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Litigation Finance & Capital Readiness</h4>
            <p className="text-xs text-gray-500">Case packaging, underwriting readiness, and funding impact modeling.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadFinanceUnderwritingPdf}
              className="px-3 py-2 text-sm font-medium text-brand-700 border border-brand-200 rounded-md hover:bg-brand-50"
            >
              Download Underwriting PDF
            </button>
            <button onClick={handleDownloadFinanceDataroom} className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700">
              Export Data Room
            </button>
          </div>
        </div>

        {financeMessage && <div className="text-xs text-red-600">{financeMessage}</div>}

        {financeLoading ? (
          <div className="text-sm text-gray-500">Loading finance summary...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-md border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Case Packaging</div>
                <div className="mt-2 space-y-1">
                  <div>Claim type: <span className="font-medium">{packaging.claimType || 'N/A'}</span></div>
                  <div>Venue: <span className="font-medium">{packaging.venueState || 'N/A'}</span></div>
                  <div>Evidence files: <span className="font-medium">{packaging.evidenceCount ?? 0}</span></div>
                  <div>Demand letters: <span className="font-medium">{packaging.demandLettersCount ?? 0}</span></div>
                  <div>Open tasks: <span className="font-medium">{packaging.openTaskCount ?? 0}</span></div>
                  <div>Notes: <span className="font-medium">{packaging.noteCount ?? 0}</span></div>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Risk / Return Profile</div>
                <div className="mt-2 space-y-1">
                  <div>Risk score: <span className="font-medium">{riskProfile.riskScore ?? 'N/A'}</span></div>
                  <div>Risk level: <span className="font-medium">{riskProfile.riskLevel || 'N/A'}</span></div>
                  <div>Expected value: <span className="font-medium">{formatCurrency(expectedValue)}</span></div>
                  <div>Range: <span className="font-medium">{formatCurrency(riskProfile.downside || 0)}-{formatCurrency(riskProfile.upside || 0)}</span></div>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Standardized Underwriting</div>
                <div className="mt-2 space-y-1">
                  <div>Incident date: <span className="font-medium">{underwriting.incidentDate || 'N/A'}</span></div>
                  <div>Insurance limit: <span className="font-medium">{underwriting.insuranceLimit ? formatCurrency(underwriting.insuranceLimit) : 'N/A'}</span></div>
                  <div>Liens total: <span className="font-medium">{underwriting.lienTotal ? formatCurrency(underwriting.lienTotal) : 'N/A'}</span></div>
                  <div>Evidence count: <span className="font-medium">{underwriting.evidenceCount ?? 0}</span></div>
                  <div>Viability score: <span className="font-medium">{underwriting.viabilityScore ?? 'N/A'}</span></div>
                  <div>Demand target: <span className="font-medium">{underwriting.demandTarget ? formatCurrency(underwriting.demandTarget) : 'N/A'}</span></div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4">
              <h5 className="text-sm font-semibold text-gray-900 mb-3">Funding Impact Modeling</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Advance rate (%)</span>
                  <input
                    type="number"
                    value={financeModel.advanceRate}
                    onChange={(e) => setFinanceModel((prev: any) => ({ ...prev, advanceRate: Number(e.target.value) || 0 }))}
                    className="input"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Monthly fee (%)</span>
                  <input
                    type="number"
                    value={financeModel.feeRate}
                    onChange={(e) => setFinanceModel((prev: any) => ({ ...prev, feeRate: Number(e.target.value) || 0 }))}
                    className="input"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Duration (months)</span>
                  <input
                    type="number"
                    value={financeModel.durationMonths}
                    onChange={(e) => setFinanceModel((prev: any) => ({ ...prev, durationMonths: Number(e.target.value) || 0 }))}
                    className="input"
                  />
                </label>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-gray-500">Advance amount</div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(advanceAmount)}</div>
                </div>
                <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-gray-500">Estimated funding cost</div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(feeCost)}</div>
                </div>
                <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-gray-500">Net recovery estimate</div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(netRecovery)}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-gray-500">Gross multiple</div>
                  <div className="text-lg font-semibold text-gray-900">{advanceAmount ? `${(expectedValue / advanceAmount).toFixed(2)}x` : 'N/A'}</div>
                </div>
                <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-gray-500">Estimated medical damages</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {underwriting?.damages?.medical ? formatCurrency(underwriting.damages.medical) : 'N/A'}
                  </div>
                </div>
                <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs text-gray-500">Estimated lost wages</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {underwriting?.damages?.lostWages ? formatCurrency(underwriting.damages.lostWages) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Case Intake → Retainer Flow</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="rounded-md border border-gray-100 p-3">
          <div className="text-gray-500">Accepted</div>
          <div className="text-gray-900">{selectedLead?.status !== 'submitted' ? 'Completed' : 'Pending'}</div>
        </div>
        <div className="rounded-md border border-gray-100 p-3">
          <div className="text-gray-500">Consulted</div>
          <div className="text-gray-900">{selectedLead?.status === 'consulted' || selectedLead?.status === 'retained' ? 'Completed' : 'Pending'}</div>
        </div>
        <div className="rounded-md border border-gray-100 p-3">
          <div className="text-gray-500">Retained</div>
          <div className="text-gray-900">{selectedLead?.status === 'retained' ? 'Completed' : 'Pending'}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {/* Stages are cumulative milestones on a single status field. Once a lead
            is consulted/retained, marking an earlier stage would regress it
            (e.g. Retained → Consulted flipped Retained back to Pending), so we
            disable a stage button once that stage is already reached (#165). */}
        <button
          onClick={() => handleStatusUpdate('consulted')}
          disabled={leadDecisionLoading || selectedLead?.status === 'consulted' || selectedLead?.status === 'retained'}
          className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedLead?.status === 'consulted' || selectedLead?.status === 'retained' ? 'Consulted ✓' : 'Mark Consulted'}
        </button>
        <button
          onClick={() => handleStatusUpdate('retained')}
          disabled={leadDecisionLoading || selectedLead?.status === 'retained'}
          className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedLead?.status === 'retained' ? 'Retained ✓' : 'Mark Retained'}
        </button>
      </div>
    </div>
  )
}
