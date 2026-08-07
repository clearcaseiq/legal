import { RANKING_WEIGHT_KEYS, type MatchingRulesTabProps } from './constants'

interface WeightsRulesTabProps extends MatchingRulesTabProps {
  weightSum: number
  weightValid: boolean
}

export function WeightsRulesTab({ config, update, weightSum, weightValid }: WeightsRulesTabProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Ranking weights</h2>
      <p className="mb-4 text-sm text-slate-600">Weights for attorney ranking (must sum to 1.0). Higher weight = more influence on match score.</p>
      {!weightValid && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Weights sum to {weightSum.toFixed(2)}. They must sum to 1.0 to save.</div>}
      <div className="space-y-4">{RANKING_WEIGHT_KEYS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-4"><label className="w-40 shrink-0 text-sm font-medium text-slate-700">{label}</label><input type="range" min={0} max={1} step={0.05} value={config[key] ?? 0} onChange={(e) => update({ [key]: parseFloat(e.target.value) || 0 })} className="flex-1" /><span className="w-12 text-right text-sm text-slate-600">{(config[key] ?? 0).toFixed(2)}</span></div>
      ))}</div>
      <div className="mt-4 text-sm text-slate-500">Total: {weightSum.toFixed(2)} {weightValid ? '✓' : '(adjust to 1.0)'}</div>
    </section>
  )
}
