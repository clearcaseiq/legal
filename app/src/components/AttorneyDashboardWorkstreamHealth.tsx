type AttorneyDashboardWorkstreamHealthProps = {
  handleRefreshHealth: any
  caseHealth: any
  healthRuleForm: any
  setHealthRuleForm: any
  handleAddHealthRule: any
  healthRules: any[]
  handleDeleteHealthRule: any
  leadCommandCenter?: any
}

export default function AttorneyDashboardWorkstreamHealth({
  handleRefreshHealth,
  caseHealth,
  healthRuleForm,
  setHealthRuleForm,
  handleAddHealthRule,
  healthRules,
  handleDeleteHealthRule,
  leadCommandCenter,
}: AttorneyDashboardWorkstreamHealthProps) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Case Health Score</h4>
        <button
          onClick={handleRefreshHealth}
          className="text-xs text-brand-600 hover:text-brand-800"
        >
          Refresh
        </button>
      </div>
      <div className="text-sm text-gray-700">
        Score: <span className="font-semibold">{caseHealth?.score ?? 'N/A'}</span> • Level: <span className="font-semibold">{caseHealth?.level ?? 'N/A'}</span>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {caseHealth?.factors?.length
          ? caseHealth.factors.map((factor: any) => factor.detail).join(' • ')
          : 'No risk factors detected.'}
      </div>
      {leadCommandCenter ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
          <div className="rounded-md border border-gray-100 px-2 py-2">
            <div className="text-gray-500">Treatment monitor</div>
            <div className="font-medium text-gray-900">{leadCommandCenter.treatmentMonitor.status}</div>
          </div>
          <div className="rounded-md border border-gray-100 px-2 py-2">
            <div className="text-gray-500">Providers on file</div>
            <div className="font-medium text-gray-900">
              {leadCommandCenter.treatmentMonitor.providerCount > 0
                ? leadCommandCenter.treatmentMonitor.providers.join(', ')
                : 'No providers captured yet'}
            </div>
          </div>
          <div className="rounded-md border border-gray-100 px-2 py-2">
            <div className="text-gray-500">Readiness blocker</div>
            <div className="font-medium text-gray-900">{leadCommandCenter.treatmentMonitor.recommendedAction}</div>
          </div>
        </div>
      ) : null}
      {caseHealth?.components ? (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
          <div className="rounded-md border border-gray-100 px-2 py-1">
            Liability strength: <span className="font-medium">{caseHealth.components.liabilityStrength ?? 'N/A'}</span>
          </div>
          <div className="rounded-md border border-gray-100 px-2 py-1">
            Evidence completeness: <span className="font-medium">{caseHealth.components.evidenceCompleteness ?? 'N/A'}</span>
          </div>
          <div className="rounded-md border border-gray-100 px-2 py-1">
            Medical treatment: <span className="font-medium">{caseHealth.components.medicalTreatment ?? 'N/A'}</span>
          </div>
          <div className="rounded-md border border-gray-100 px-2 py-1">
            Insurance constraints: <span className="font-medium">{caseHealth.components.insuranceConstraints ?? 'N/A'}</span>
          </div>
          <div className="rounded-md border border-gray-100 px-2 py-1">
            Time risk: <span className="font-medium">{caseHealth.components.timeRisk ?? 'N/A'}</span>
          </div>
          <div className="rounded-md border border-gray-100 px-2 py-1">
            Cost burn: <span className="font-medium">{caseHealth.components.costBurn ?? 'N/A'}</span>
          </div>
        </div>
      ) : null}
      {caseHealth?.alerts?.length ? (
        <div className="mt-3 space-y-1 text-xs text-red-600">
          {caseHealth.alerts.map((alert: any, index: number) => (
            <div key={`${alert.type}-${index}`}>
              {alert.type}: {alert.message}
            </div>
          ))}
        </div>
      ) : null}
      {caseHealth?.snapshots?.length ? (
        <div className="mt-4 text-xs text-gray-600">
          <div className="font-medium text-gray-800 mb-2">Health history</div>
          <div className="space-y-1">
            {caseHealth.snapshots.map((snap: any) => (
              <div key={snap.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
                <span>{new Date(snap.createdAt).toLocaleDateString()}</span>
                <span className="font-medium">{snap.score}</span>
                <span className="capitalize">{snap.level}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-4 text-sm">
        <div className="font-medium text-gray-800 mb-2">Escalation Rules</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <input
            value={healthRuleForm.threshold}
            onChange={(e) => setHealthRuleForm((prev: any) => ({ ...prev, threshold: e.target.value }))}
            className="input"
            placeholder="Threshold"
          />
          <input
            value={healthRuleForm.action}
            onChange={(e) => setHealthRuleForm((prev: any) => ({ ...prev, action: e.target.value }))}
            className="input md:col-span-2"
            placeholder="Escalation action"
          />
        </div>
        <div className="mt-2">
          <button
            onClick={handleAddHealthRule}
            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Add Rule
          </button>
        </div>
        <div className="mt-3 space-y-2 text-xs text-gray-600">
          {healthRules.length === 0 ? (
            <div>No escalation rules configured.</div>
          ) : (
            healthRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
                <div>
                  Score ≤ {rule.threshold}: {rule.action}
                </div>
                <button
                  onClick={() => handleDeleteHealthRule(rule.id)}
                  className="text-xs text-brand-600 hover:text-brand-800"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      {caseHealth?.escalations?.length ? (
        <div className="mt-4 text-xs text-red-600">
          Recommended: {caseHealth.escalations.map((rule: any) => rule.action).join(' • ')}
        </div>
      ) : null}
    </div>
  )
}
