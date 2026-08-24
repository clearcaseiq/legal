import { formatCurrency } from '../lib/formatters'

/**
 * Case sharing, outbound referrals with fee splits, and co-counsel workflows
 * for a single case.
 *
 * Extracted from AttorneyDashboardDeferredInlineWorkstream so the same markup
 * serves both the legacy dashboard workstream and the case workspace's
 * Referrals tab. Fee shares are computed here for display only; the persisted
 * split percentage is what the server records.
 */
type Props = {
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
}

export default function ReferralFeeSplitSections({
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
}: Props) {
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
        <h4 className="text-sm font-semibold text-gray-900">Referral Tracking &amp; Fee Split Automation</h4>
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
