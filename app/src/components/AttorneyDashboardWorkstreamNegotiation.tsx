type AttorneyDashboardWorkstreamNegotiationProps = {
  negotiationTab: 'tracker' | 'cadence'
  setNegotiationTab: any
  negotiationForm: any
  setNegotiationForm: any
  handleAddNegotiation: any
  negotiationItems: any[]
  handleUpdateNegotiationStatus: any
  cadenceTemplateForm: any
  setCadenceTemplateForm: any
  cadenceStepForm: any
  setCadenceStepForm: any
  handleAddCadenceStep: any
  handleCreateCadenceTemplate: any
  cadenceSteps: any[]
  negotiationCadenceTemplates: any[]
  handleDeleteCadenceTemplate: any
  leadCommandCenter?: any
}

export default function AttorneyDashboardWorkstreamNegotiation({
  negotiationTab,
  setNegotiationTab,
  negotiationForm,
  setNegotiationForm,
  handleAddNegotiation,
  negotiationItems,
  handleUpdateNegotiationStatus,
  cadenceTemplateForm,
  setCadenceTemplateForm,
  cadenceStepForm,
  setCadenceStepForm,
  handleAddCadenceStep,
  handleCreateCadenceTemplate,
  cadenceSteps,
  negotiationCadenceTemplates,
  handleDeleteCadenceTemplate,
  leadCommandCenter,
}: AttorneyDashboardWorkstreamNegotiationProps) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Negotiation</h4>
        <div className="text-xs text-gray-500">Track events and cadence</div>
      </div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 text-sm">
          <button
            onClick={() => setNegotiationTab('tracker')}
            className={`py-2 border-b-2 font-medium ${
              negotiationTab === 'tracker'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Negotiation Tracker
          </button>
          <button
            onClick={() => setNegotiationTab('cadence')}
            className={`py-2 border-b-2 font-medium ${
              negotiationTab === 'cadence'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cadence Templates
          </button>
        </nav>
      </div>
      {negotiationTab === 'tracker' ? (
        <div className="mt-4">
          {leadCommandCenter ? (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="text-gray-500">Negotiation posture</div>
                <div className="text-gray-900 font-medium">{leadCommandCenter.negotiationSummary.posture}</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="text-gray-500">Recommended move</div>
                <div className="text-gray-900 font-medium">{leadCommandCenter.negotiationSummary.recommendedMove}</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="text-gray-500">Policy / readiness</div>
                <div className="text-gray-900 font-medium">
                  {leadCommandCenter.coverageStory.policyLimit
                    ? `${leadCommandCenter.coverageStory.policyLimit.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`
                    : 'Coverage unclear'} • {leadCommandCenter.readiness.score}%
                </div>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <select
              value={negotiationForm.eventType}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, eventType: e.target.value }))}
              className="input"
            >
              <option value="offer">Offer</option>
              <option value="counter">Counter</option>
              <option value="demand">Demand</option>
              <option value="call">Call</option>
              <option value="note">Note</option>
            </select>
            <select
              value={negotiationForm.counterpartyType}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, counterpartyType: e.target.value }))}
              className="input"
            >
              <option value="insurer">Insurer</option>
              <option value="claimant">Claimant</option>
            </select>
            <input
              value={negotiationForm.amount}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, amount: e.target.value }))}
              className="input"
              placeholder="Amount"
            />
            <input
              type="date"
              value={negotiationForm.eventDate}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, eventDate: e.target.value }))}
              className="input"
            />
            <select
              value={negotiationForm.status}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, status: e.target.value }))}
              className="input"
            >
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <input
              value={negotiationForm.insurerName}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, insurerName: e.target.value }))}
              className="input"
              placeholder="Insurer"
            />
            <input
              value={negotiationForm.adjusterName}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, adjusterName: e.target.value }))}
              className="input"
              placeholder="Adjuster"
            />
            <input
              value={negotiationForm.adjusterEmail}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, adjusterEmail: e.target.value }))}
              className="input"
              placeholder="Adjuster email"
            />
            <input
              value={negotiationForm.adjusterPhone}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, adjusterPhone: e.target.value }))}
              className="input"
              placeholder="Adjuster phone"
            />
            <input
              value={negotiationForm.concessionValue}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, concessionValue: e.target.value }))}
              className="input"
              placeholder="Concession value"
            />
            <input
              value={negotiationForm.concessionNotes}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, concessionNotes: e.target.value }))}
              className="input md:col-span-2"
              placeholder="Concession notes"
            />
            <input
              value={negotiationForm.notes}
              onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, notes: e.target.value }))}
              className="input md:col-span-2"
              placeholder="Notes"
            />
            {negotiationForm.status === 'accepted' ? (
              <input
                value={negotiationForm.acceptanceRationale}
                onChange={(e) => setNegotiationForm((prev: any) => ({ ...prev, acceptanceRationale: e.target.value }))}
                className="input md:col-span-3"
                placeholder="Settlement acceptance rationale"
              />
            ) : null}
          </div>
          <div className="mt-3">
            <button
              onClick={handleAddNegotiation}
              className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              Add Event
            </button>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {negotiationItems.length === 0 ? (
              <div className="text-gray-500">No negotiation events yet.</div>
            ) : (
              negotiationItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
                  <div>
                    <div className="font-medium">
                      {item.eventType} {item.amount ? `• $${item.amount}` : ''}
                    </div>
                    <div className="text-gray-600 text-xs">
                      {item.eventDate ? new Date(item.eventDate).toLocaleDateString() : 'No date'} | {item.status}
                      {item.insurerName ? ` | ${item.insurerName}` : ''}
                      {item.adjusterName ? ` | ${item.adjusterName}` : ''}
                      {item.concessionValue ? ` | Concession ${item.concessionValue}` : ''}
                    </div>
                  </div>
                  <select
                    value={item.status}
                    onChange={(e) => handleUpdateNegotiationStatus(item.id, e.target.value)}
                    className="input text-xs"
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              ))
            )}
          </div>
          {(() => {
            const sorted = [...negotiationItems]
              .filter((item: any) => item.eventDate)
              .sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
            const demands = sorted.filter((item: any) => item.eventType === 'demand')
            const counters = sorted.filter((item: any) => item.eventType === 'counter')
            const offers = sorted.filter((item: any) => item.eventType === 'offer')
            const lastEvent = sorted[sorted.length - 1]
            const velocityDays =
              sorted.length > 1
                ? Math.round((new Date(sorted[sorted.length - 1].eventDate).getTime() - new Date(sorted[0].eventDate).getTime()) / (1000 * 60 * 60 * 24))
                : 0
            const concessions = sorted
              .filter((item: any) => Number(item.concessionValue))
              .reduce((sum: number, item: any) => sum + Number(item.concessionValue || 0), 0)
            const latestOffer = offers[offers.length - 1]?.amount || null
            const latestDemand = demands[demands.length - 1]?.amount || null
            const delta = latestDemand && latestOffer ? Math.round((latestDemand - latestOffer) / 1000) * 1000 : null
            const adjusterKey = lastEvent?.adjusterName || lastEvent?.insurerName || 'Unknown'
            const adjusterEvents = sorted.filter((item: any) => item.adjusterName === lastEvent?.adjusterName || item.insurerName === lastEvent?.insurerName)
            const acceptanceRate = sorted.length ? Math.round((sorted.filter((item: any) => item.status === 'accepted').length / sorted.length) * 100) : 0
            const rec =
              lastEvent?.eventType === 'offer'
                ? 'Counter with rationale and supporting docs'
                : lastEvent?.eventType === 'counter'
                  ? 'Hold 3-5 days; prepare demand package'
                  : lastEvent?.eventType === 'demand'
                    ? 'Follow up in 5-7 days; consider litigation posture'
                    : 'Log next contact and request adjuster response'
            const scenario = {
              wait: latestOffer ? `$${Math.round(latestOffer * 1.02).toLocaleString()}` : 'N/A',
              push: latestOffer ? `$${Math.round(latestOffer * 1.08).toLocaleString()}` : 'N/A',
              litigate: latestDemand ? `$${Math.round(latestDemand * 1.2).toLocaleString()}` : 'N/A',
            }

            return (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-md border border-gray-200 p-3">
                  <div className="font-medium text-gray-900">Demand tracking</div>
                  <div className="text-gray-600">
                    {demands.length} demand{demands.length === 1 ? '' : 's'} | Latest: {latestDemand ? `$${latestDemand}` : 'N/A'}
                  </div>
                </div>
                <div className="rounded-md border border-gray-200 p-3">
                  <div className="font-medium text-gray-900">Counteroffer history</div>
                  <div className="text-gray-600">
                    {counters.length} counters | Latest offer: {latestOffer ? `$${latestOffer}` : 'N/A'}
                  </div>
                </div>
                <div className="rounded-md border border-gray-200 p-3">
                  <div className="font-medium text-gray-900">Offer velocity</div>
                  <div className="text-gray-600">{velocityDays} days across {sorted.length} events</div>
                </div>
                <div className="rounded-md border border-gray-200 p-3">
                  <div className="font-medium text-gray-900">Concession tracking</div>
                  <div className="text-gray-600">Total concessions: ${Math.round(concessions)} | Gap: {delta !== null ? `$${delta}` : 'N/A'}</div>
                </div>
                <div className="rounded-md border border-gray-200 p-3">
                  <div className="font-medium text-gray-900">Insurer / adjuster profile</div>
                  <div className="text-gray-600">{adjusterKey} | {adjusterEvents.length} events | {acceptanceRate}% accepted</div>
                </div>
                <div className="rounded-md border border-gray-200 p-3">
                  <div className="font-medium text-gray-900">AI-recommended next move</div>
                  <div className="text-gray-600">{rec}</div>
                </div>
                <div className="rounded-md border border-gray-200 p-3 md:col-span-2">
                  <div className="font-medium text-gray-900">Scenario modeling</div>
                  <div className="text-gray-600">Wait: {scenario.wait} | Push: {scenario.push} | Litigate: {scenario.litigate}</div>
                </div>
              </div>
            )
          })()}
        </div>
      ) : null}
      {negotiationTab === 'cadence' ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <input
              value={cadenceTemplateForm.name}
              onChange={(e) => setCadenceTemplateForm((prev: any) => ({ ...prev, name: e.target.value }))}
              className="input"
              placeholder="Template name"
            />
            <select
              value={cadenceTemplateForm.triggerEventType}
              onChange={(e) => setCadenceTemplateForm((prev: any) => ({ ...prev, triggerEventType: e.target.value }))}
              className="input"
            >
              <option value="offer">Offer</option>
              <option value="counter">Counter</option>
              <option value="demand">Demand</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <input
              value={cadenceStepForm.offsetDays}
              onChange={(e) => setCadenceStepForm((prev: any) => ({ ...prev, offsetDays: e.target.value }))}
              className="input"
              placeholder="Offset days"
            />
            <select
              value={cadenceStepForm.channel}
              onChange={(e) => setCadenceStepForm((prev: any) => ({ ...prev, channel: e.target.value }))}
              className="input"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="call">Call</option>
            </select>
            <input
              value={cadenceStepForm.message}
              onChange={(e) => setCadenceStepForm((prev: any) => ({ ...prev, message: e.target.value }))}
              className="input md:col-span-3"
              placeholder="Step message"
            />
          </div>
          <div>
            <button
              onClick={handleAddCadenceStep}
              className="px-3 py-1.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
            >
              Add Step
            </button>
            <button
              onClick={handleCreateCadenceTemplate}
              className="ml-2 px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              Save Template
            </button>
          </div>
          {cadenceSteps.length > 0 ? (
            <div className="text-xs text-gray-600">
              Steps: {cadenceSteps.map((step) => `${step.offsetDays}d ${step.channel}`).join(' • ')}
            </div>
          ) : null}
          <div className="space-y-2 text-sm">
            {negotiationCadenceTemplates.length === 0 ? (
              <div className="text-gray-500">No cadence templates yet.</div>
            ) : (
              negotiationCadenceTemplates.map((item) => (
                <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-gray-600 text-xs">
                      {item.triggerEventType} • {item.steps?.length || 0} steps
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCadenceTemplate(item.id)}
                    className="text-xs text-brand-600 hover:text-brand-800"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
