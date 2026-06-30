type AttorneyDashboardWorkstreamInsuranceProps = {
  insuranceTab: 'insurance' | 'liens'
  setInsuranceTab: any
  insuranceForm: any
  setInsuranceForm: any
  handleAddInsurance: any
  handleUpdateInsurance?: (insuranceId: string, patch: Record<string, any>) => void
  handleRequestDecPage?: (insuranceId: string) => void
  applyInsuranceSuggestion?: () => void
  insuranceSuggestion?: any
  insuranceItems: any[]
  lienForm: any
  setLienForm: any
  handleAddLien: any
  lienItems: any[]
}

const COVERAGE_TYPE_LABELS: Record<string, string> = {
  liability: 'Liability (at-fault)',
  um: 'Uninsured motorist (UM)',
  uim: 'Underinsured motorist (UIM)',
  medpay: 'MedPay',
  other: 'Other',
}

const CLAIM_STATUS_LABELS: Record<string, string> = {
  not_opened: 'Not opened',
  open: 'Open',
  accepted: 'Accepted',
  denied: 'Denied',
  closed: 'Closed',
}

const INSURED_PARTY_LABELS: Record<string, string> = {
  defendant: "Defendant's insurer (at-fault claim)",
  client: "Client's own policy (UM/UIM claim)",
}

const formatMoney = (value: any) =>
  typeof value === 'number' && !Number.isNaN(value)
    ? `$${value.toLocaleString('en-US')}`
    : null

export default function AttorneyDashboardWorkstreamInsurance({
  insuranceTab,
  setInsuranceTab,
  insuranceForm,
  setInsuranceForm,
  handleAddInsurance,
  handleUpdateInsurance,
  handleRequestDecPage,
  applyInsuranceSuggestion,
  insuranceSuggestion,
  insuranceItems,
  lienForm,
  setLienForm,
  handleAddLien,
  lienItems,
}: AttorneyDashboardWorkstreamInsuranceProps) {
  return (
    <>
      <div className="rounded-md border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Insurance & Liens</h4>
          <div className="text-xs text-gray-500">Track coverage and lien holders</div>
        </div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 text-sm">
            <button
              onClick={() => setInsuranceTab('insurance')}
              className={`py-2 border-b-2 font-medium ${
                insuranceTab === 'insurance'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Insurance
            </button>
            <button
              onClick={() => setInsuranceTab('liens')}
              className={`py-2 border-b-2 font-medium ${
                insuranceTab === 'liens'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Liens
            </button>
          </nav>
        </div>
        {insuranceTab === 'insurance' ? (
          <div className="mt-4">
            {insuranceSuggestion && (insuranceSuggestion.available || (insuranceSuggestion.warnings?.length ?? 0) > 0) ? (
              <div className="mb-4 rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-brand-800">
                    Suggested from intake: {insuranceSuggestion.claimTypeLabel}
                  </div>
                  {insuranceSuggestion.available && applyInsuranceSuggestion ? (
                    <button
                      onClick={applyInsuranceSuggestion}
                      className="px-2 py-1 text-xs font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 whitespace-nowrap"
                    >
                      Apply to form
                    </button>
                  ) : null}
                </div>
                <div className="text-brand-700 text-xs mt-1">{insuranceSuggestion.rationale}</div>
                {(insuranceSuggestion.warnings || []).map((w: string, i: number) => (
                  <div key={i} className="text-amber-700 text-xs mt-1">⚠ {w}</div>
                ))}
              </div>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <input
                value={insuranceForm.carrierName}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, carrierName: e.target.value }))}
                className="input"
                placeholder="Carrier name"
              />
              <input
                value={insuranceForm.policyNumber}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, policyNumber: e.target.value }))}
                className="input"
                placeholder="Policy number"
              />
              <input
                value={insuranceForm.policyLimit}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, policyLimit: e.target.value }))}
                className="input"
                placeholder="Policy limit"
              />
              <input
                value={insuranceForm.adjusterName}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, adjusterName: e.target.value }))}
                className="input"
                placeholder="Adjuster name"
              />
              <input
                value={insuranceForm.adjusterEmail}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, adjusterEmail: e.target.value }))}
                className="input"
                placeholder="Adjuster email"
              />
              <input
                value={insuranceForm.adjusterPhone}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, adjusterPhone: e.target.value }))}
                className="input"
                placeholder="Adjuster phone"
              />
              <select
                value={insuranceForm.insuredParty || ''}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, insuredParty: e.target.value }))}
                className="input"
              >
                <option value="">Whose policy?</option>
                <option value="defendant">Defendant's insurer (at-fault)</option>
                <option value="client">Client's own policy (UM/UIM)</option>
              </select>
              <select
                value={insuranceForm.coverageType || ''}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, coverageType: e.target.value }))}
                className="input"
              >
                <option value="">Coverage type</option>
                <option value="liability">Liability (at-fault)</option>
                <option value="um">Uninsured motorist (UM)</option>
                <option value="uim">Underinsured motorist (UIM)</option>
                <option value="medpay">MedPay</option>
                <option value="other">Other</option>
              </select>
              <input
                value={insuranceForm.claimNumber || ''}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, claimNumber: e.target.value }))}
                className="input"
                placeholder="Claim number (once opened)"
              />
              <select
                value={insuranceForm.claimStatus || 'not_opened'}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, claimStatus: e.target.value }))}
                className="input"
              >
                <option value="not_opened">Claim not opened</option>
                <option value="open">Claim open</option>
                <option value="accepted">Claim accepted</option>
                <option value="denied">Claim denied</option>
                <option value="closed">Claim closed</option>
              </select>
              <input
                value={insuranceForm.notes}
                onChange={(e) => setInsuranceForm((prev: any) => ({ ...prev, notes: e.target.value }))}
                className="input md:col-span-3"
                placeholder="Notes"
              />
            </div>
            <div className="mt-3">
              <button
                onClick={handleAddInsurance}
                className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
              >
                Add Insurance
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {insuranceItems.length === 0 ? (
                <div className="text-gray-500">No insurance records yet.</div>
              ) : (
                insuranceItems.map((item) => {
                  const limit = formatMoney(item.policyLimit)
                  const decPageRequested = Boolean(item.decPageRequestId)
                  return (
                    <div key={item.id} className="border border-gray-100 rounded-md px-3 py-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{item.carrierName}</div>
                        {item.coverageType ? (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100">
                            {COVERAGE_TYPE_LABELS[item.coverageType] || item.coverageType}
                          </span>
                        ) : null}
                      </div>
                      {item.insuredParty ? (
                        <div className="text-gray-600 text-xs">{INSURED_PARTY_LABELS[item.insuredParty] || item.insuredParty}</div>
                      ) : null}
                      <div className="text-gray-600 text-xs">
                        {item.policyNumber ? `Policy ${item.policyNumber}` : 'No policy number'} • {limit ? `Limit ${limit}` : 'No limit'}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {item.adjusterName || 'Adjuster unknown'} {item.adjusterEmail ? `• ${item.adjusterEmail}` : ''} {item.adjusterPhone ? `• ${item.adjusterPhone}` : ''}
                      </div>
                      <div className="text-gray-600 text-xs">
                        Claim: {CLAIM_STATUS_LABELS[item.claimStatus] || item.claimStatus || 'Not opened'}
                        {item.claimNumber ? ` • #${item.claimNumber}` : ''}
                      </div>
                      {limit ? (
                        <div className="text-xs text-gray-800 bg-gray-50 border border-gray-100 rounded px-2 py-1">
                          Max recovery: <span className="font-semibold">{limit}</span>
                          {item.coverageConfirmed ? ' (confirmed by Dec Page)' : ' (unconfirmed)'}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {handleRequestDecPage ? (
                          <button
                            onClick={() => handleRequestDecPage(item.id)}
                            disabled={decPageRequested}
                            className="px-2 py-1 text-xs font-medium rounded border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {decPageRequested ? 'Dec Page requested' : 'Request Dec Page'}
                          </button>
                        ) : null}
                        {handleUpdateInsurance && item.claimStatus === 'not_opened' ? (
                          <button
                            onClick={() => handleUpdateInsurance(item.id, { claimStatus: 'open' })}
                            className="px-2 py-1 text-xs font-medium rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            Mark claim open
                          </button>
                        ) : null}
                        {handleUpdateInsurance && limit && !item.coverageConfirmed ? (
                          <button
                            onClick={() => handleUpdateInsurance(item.id, { coverageConfirmed: true })}
                            className="px-2 py-1 text-xs font-medium rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            Confirm coverage
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : null}
        {insuranceTab === 'liens' ? (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <input
                value={lienForm.name}
                onChange={(e) => setLienForm((prev: any) => ({ ...prev, name: e.target.value }))}
                className="input"
                placeholder="Lien holder"
              />
              <input
                value={lienForm.type}
                onChange={(e) => setLienForm((prev: any) => ({ ...prev, type: e.target.value }))}
                className="input"
                placeholder="Lien type"
              />
              <input
                value={lienForm.amount}
                onChange={(e) => setLienForm((prev: any) => ({ ...prev, amount: e.target.value }))}
                className="input"
                placeholder="Amount"
              />
              <select
                value={lienForm.status}
                onChange={(e) => setLienForm((prev: any) => ({ ...prev, status: e.target.value }))}
                className="input"
              >
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
              <input
                value={lienForm.notes}
                onChange={(e) => setLienForm((prev: any) => ({ ...prev, notes: e.target.value }))}
                className="input md:col-span-2"
                placeholder="Notes"
              />
            </div>
            <div className="mt-3">
              <button
                onClick={handleAddLien}
                className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
              >
                Add Lien
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {lienItems.length === 0 ? (
                <div className="text-gray-500">No liens tracked yet.</div>
              ) : (
                lienItems.map((item) => (
                  <div key={item.id} className="border border-gray-100 rounded-md px-2 py-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-gray-600 text-xs">
                      {item.type || 'Type unknown'} • {item.amount ? `$${item.amount}` : 'No amount'} • {item.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
