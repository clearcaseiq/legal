import { formatCurrency } from '../lib/formatters'

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
        <p className="text-xs text-gray-500">Treatment timeline — attorneys immediately see treatment gaps.</p>
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
    const referralFeeSplit = Number(referralForm.feeSplitPercent) || 0
    const referralProjected = Number(referralForm.projectedRecovery) || 0
    const referralReceiving = referralProjected * (referralFeeSplit / 100)
    const referralReferring = Math.max(0, referralProjected - referralReceiving)

    const coCounselFeeSplit = Number(coCounselForm.feeSplitPercent) || 0
    const coCounselProjected = Number(coCounselForm.projectedRecovery) || 0
    const coCounselReceiving = coCounselProjected * (coCounselFeeSplit / 100)
    const coCounselLead = Math.max(0, coCounselProjected - coCounselReceiving)

    return (
      <div className="rounded-md border border-gray-200 p-4 space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Case Sharing</h4>
          <p className="text-xs text-gray-500">Share case access with other attorneys or firms.</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <input
              value={caseShareForm.sharedWithEmail}
              onChange={(e) => setCaseShareForm((prev: any) => ({ ...prev, sharedWithEmail: e.target.value }))}
              className="input"
              placeholder="Attorney email"
            />
            <input
              value={caseShareForm.sharedWithFirmName}
              onChange={(e) => setCaseShareForm((prev: any) => ({ ...prev, sharedWithFirmName: e.target.value }))}
              className="input"
              placeholder="Firm name"
            />
            <select
              value={caseShareForm.accessLevel}
              onChange={(e) => setCaseShareForm((prev: any) => ({ ...prev, accessLevel: e.target.value }))}
              className="input"
            >
              <option value="view">View access</option>
              <option value="edit">Edit access</option>
            </select>
            <button onClick={handleCreateCaseShare} className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700">
              Share Case
            </button>
          </div>
          {caseShareMessage && <div className="mt-2 text-xs text-gray-500">{caseShareMessage}</div>}
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            {caseShares.length === 0 ? (
              <div className="text-xs text-gray-500">No shares yet.</div>
            ) : (
              caseShares.map((share) => {
                const isRecipient =
                  (share.sharedWithEmail && share.sharedWithEmail === currentUserEmail) ||
                  (share.sharedWithAttorneyId && share.sharedWithAttorneyId === currentAttorneyId)
                return (
                  <div key={share.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border border-gray-200 rounded-md px-3 py-2">
                    <div>
                      <div className="font-medium">{share.sharedWithEmail || share.sharedWithFirmName || 'Unknown recipient'}</div>
                      <div className="text-xs text-gray-500">{share.accessLevel} access • {share.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-400">{new Date(share.createdAt).toLocaleDateString()}</div>
                      {isRecipient && share.status === 'pending' && (
                        <>
                          <button onClick={() => handleAcceptCaseShare(share.id)} className="px-2 py-1 text-xs font-medium text-white bg-brand-600 rounded">
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineCaseShare(share.id)}
                            className="px-2 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900">Referral Tracking & Fee Split Automation</h4>
          <p className="text-xs text-gray-500">Track outbound referrals and auto-calculate fee splits.</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            <input
              value={referralForm.receivingEmail}
              onChange={(e) => setReferralForm((prev: any) => ({ ...prev, receivingEmail: e.target.value }))}
              className="input"
              placeholder="Receiving attorney email"
            />
            <input
              value={referralForm.receivingFirmName}
              onChange={(e) => setReferralForm((prev: any) => ({ ...prev, receivingFirmName: e.target.value }))}
              className="input"
              placeholder="Receiving firm"
            />
            <input
              value={referralForm.feeSplitPercent}
              onChange={(e) => setReferralForm((prev: any) => ({ ...prev, feeSplitPercent: e.target.value }))}
              className="input"
              placeholder="Fee split %"
            />
            <input
              value={referralForm.projectedRecovery}
              onChange={(e) => setReferralForm((prev: any) => ({ ...prev, projectedRecovery: e.target.value }))}
              className="input"
              placeholder="Projected recovery"
            />
            <button onClick={handleCreateReferral} className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700">
              Add Referral
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">Referring share</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(referralReferring)}</div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">Receiving share</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(referralReceiving)}</div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">Projected recovery</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(referralProjected)}</div>
            </div>
          </div>
          {referralMessage && <div className="mt-2 text-xs text-gray-500">{referralMessage}</div>}
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            {referrals.length === 0 ? (
              <div className="text-xs text-gray-500">No referrals yet.</div>
            ) : (
              referrals.map((referral) => {
                const isRecipient =
                  (referral.receivingEmail && referral.receivingEmail === currentUserEmail) ||
                  (referral.receivingAttorneyId && referral.receivingAttorneyId === currentAttorneyId)
                return (
                  <div key={referral.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border border-gray-200 rounded-md px-3 py-2">
                    <div>
                      <div className="font-medium">{referral.receivingEmail || referral.receivingFirmName || 'Unknown recipient'}</div>
                      <div className="text-xs text-gray-500">Split: {referral.feeSplitPercent ?? 'N/A'}% • Status: {referral.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-400">{referral.projectedRecovery ? formatCurrency(referral.projectedRecovery) : 'No projection'}</div>
                      {isRecipient && referral.status === 'proposed' && (
                        <>
                          <button onClick={() => handleAcceptReferral(referral.id)} className="px-2 py-1 text-xs font-medium text-white bg-brand-600 rounded">
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineReferral(referral.id)}
                            className="px-2 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900">Co-Counsel Workflows</h4>
          <p className="text-xs text-gray-500">Coordinate shared responsibility and fee splits.</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            <input
              value={coCounselForm.coCounselEmail}
              onChange={(e) => setCoCounselForm((prev: any) => ({ ...prev, coCounselEmail: e.target.value }))}
              className="input"
              placeholder="Co-counsel email"
            />
            <input
              value={coCounselForm.coCounselFirmName}
              onChange={(e) => setCoCounselForm((prev: any) => ({ ...prev, coCounselFirmName: e.target.value }))}
              className="input"
              placeholder="Co-counsel firm"
            />
            <input
              value={coCounselForm.feeSplitPercent}
              onChange={(e) => setCoCounselForm((prev: any) => ({ ...prev, feeSplitPercent: e.target.value }))}
              className="input"
              placeholder="Fee split %"
            />
            <input
              value={coCounselForm.projectedRecovery}
              onChange={(e) => setCoCounselForm((prev: any) => ({ ...prev, projectedRecovery: e.target.value }))}
              className="input"
              placeholder="Projected recovery"
            />
            <button
              onClick={handleCreateCoCounselWorkflow}
              className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              Add Co-Counsel
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">Lead counsel share</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(coCounselLead)}</div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">Co-counsel share</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(coCounselReceiving)}</div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">Projected recovery</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(coCounselProjected)}</div>
            </div>
          </div>
          {coCounselMessage && <div className="mt-2 text-xs text-gray-500">{coCounselMessage}</div>}
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            {coCounselWorkflows.length === 0 ? (
              <div className="text-xs text-gray-500">No co-counsel workflows yet.</div>
            ) : (
              coCounselWorkflows.map((workflow) => {
                const isRecipient =
                  (workflow.coCounselEmail && workflow.coCounselEmail === currentUserEmail) ||
                  (workflow.coCounselAttorneyId && workflow.coCounselAttorneyId === currentAttorneyId)
                return (
                  <div key={workflow.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border border-gray-200 rounded-md px-3 py-2">
                    <div>
                      <div className="font-medium">{workflow.coCounselEmail || workflow.coCounselFirmName || 'Unknown co-counsel'}</div>
                      <div className="text-xs text-gray-500">Split: {workflow.feeSplitPercent ?? 'N/A'}% • Status: {workflow.workflowStatus}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-400">{workflow.projectedRecovery ? formatCurrency(workflow.projectedRecovery) : 'No projection'}</div>
                      {isRecipient && ['initiated', 'negotiating'].includes(workflow.workflowStatus) && (
                        <>
                          <button onClick={() => handleAcceptCoCounsel(workflow.id)} className="px-2 py-1 text-xs font-medium text-white bg-brand-600 rounded">
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineCoCounsel(workflow.id)}
                            className="px-2 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
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
        <button
          onClick={() => handleStatusUpdate('consulted')}
          disabled={leadDecisionLoading}
          className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50"
        >
          Mark Consulted
        </button>
        <button
          onClick={() => handleStatusUpdate('retained')}
          disabled={leadDecisionLoading}
          className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
        >
          Mark Retained
        </button>
      </div>
    </div>
  )
}
