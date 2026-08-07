import type { MatchingRulesTabProps } from './constants'

export function ValueRulesTab({ config, update }: MatchingRulesTabProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Value thresholds</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="text-sm font-medium text-slate-700">Min value threshold</span><input type="number" min={0} value={config.minValueThreshold} onChange={(e) => update({ minValueThreshold: parseInt(e.target.value, 10) || 0 })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="block"><span className="text-sm font-medium text-slate-700">Geographic expansion radius (miles)</span><input type="number" min={0} max={500} value={config.geographicExpansionRadiusMiles} onChange={(e) => update({ geographicExpansionRadiusMiles: parseInt(e.target.value, 10) || 0 })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
      </div>
    </section>
  )
}
