import type { MatchingRulesTabProps } from './constants'

export function QualityRulesTab({ config, update }: MatchingRulesTabProps) {
  const fields = [
    ['Max response time — standard cases (hours)', 'qualityGateMaxResponseHours', 1, 336, 'Attorneys slower than this are skipped for normal cases.', false],
    ['Max response time — hot cases (hours)', 'qualityGateHotCaseMaxResponseHours', 1, 336, 'Stricter SLA applied to high-viability cases.', false],
    ['Hot-case viability threshold (%)', 'qualityGateHotCaseViabilityThreshold', 0, 100, 'Cases at/above this overall viability use the hot-case SLA.', true],
    ['Minimum contact rate (%)', 'qualityGateMinContactRate', 0, 100, 'Attorneys who historically contact fewer leads than this are skipped.', true],
    ['Maximum complaint rate (%)', 'qualityGateMaxComplaintRate', 0, 100, 'Attorneys above this complaint/poor-outcome rate are skipped.', true],
    ['Maximum cherry-picking score (%)', 'qualityGateMaxCherryPickingScore', 0, 100, 'Attorneys who accept cases but rarely follow up above this rate are skipped.', true],
  ] as const
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-800">Attorney quality gate</h2>
      <p className="mb-4 text-sm text-slate-600">After hard eligibility (jurisdiction, case type, capacity), attorneys must clear these quality rules before a case is routed to them. Tightening them routes to fewer, higher-quality attorneys; loosening them widens the pool.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([label, key, min, max, description, percentage]) => (
          <label key={key} className="block">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <input type="number" step={1} min={min} max={max} value={percentage ? Math.round(config[key] * 100) : config[key]} onChange={(e) => {
              const value = Math.min(max, Math.max(min, parseInt(e.target.value, 10) || 0))
              update({ [key]: percentage ? value / 100 : value })
            }} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <span className="mt-1 block text-xs text-slate-500">{description}</span>
          </label>
        ))}
      </div>
    </section>
  )
}
