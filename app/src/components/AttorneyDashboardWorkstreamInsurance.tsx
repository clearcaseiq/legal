type AttorneyDashboardWorkstreamInsuranceProps = {
  insuranceTab: 'insurance' | 'liens'
  setInsuranceTab: any
  insuranceForm: any
  setInsuranceForm: any
  handleAddInsurance: any
  insuranceItems: any[]
  lienForm: any
  setLienForm: any
  handleAddLien: any
  lienItems: any[]
}

export default function AttorneyDashboardWorkstreamInsurance({
  insuranceTab,
  setInsuranceTab,
  insuranceForm,
  setInsuranceForm,
  handleAddInsurance,
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
                insuranceItems.map((item) => (
                  <div key={item.id} className="border border-gray-100 rounded-md px-2 py-1">
                    <div className="font-medium">{item.carrierName}</div>
                    <div className="text-gray-600 text-xs">
                      {item.policyNumber ? `Policy ${item.policyNumber}` : 'No policy number'} • {item.policyLimit ? `Limit ${item.policyLimit}` : 'No limit'}
                    </div>
                    <div className="text-gray-600 text-xs">
                      {item.adjusterName || 'Adjuster unknown'} {item.adjusterEmail ? `• ${item.adjusterEmail}` : ''} {item.adjusterPhone ? `• ${item.adjusterPhone}` : ''}
                    </div>
                  </div>
                ))
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
