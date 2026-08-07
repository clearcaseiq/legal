import { clampInt, type MatchingRulesTabProps } from './constants'

interface RoutingRulesTabProps extends MatchingRulesTabProps {
  saving: boolean
  onToggleRouting: () => void
}

export function RoutingRulesTab({ config, update, saving, onToggleRouting }: RoutingRulesTabProps) {
  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Routing mechanism</h2>
            <p className="mt-1 text-sm text-slate-600">Turn automated routing on or off globally. When off, new auto-routing and escalation waves pause until re-enabled.</p>
          </div>
          <button type="button" onClick={onToggleRouting} disabled={saving} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${config.routingEnabled ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-300 bg-slate-100 text-slate-700'} disabled:cursor-not-allowed disabled:opacity-60`}>
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.routingEnabled ? 'bg-green-500' : 'bg-slate-400'}`} />
            {config.routingEnabled ? 'Routing is on' : 'Routing is off'}
          </button>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Wave sizing</h2>
        <p className="mb-4 text-sm text-slate-600">Maximum attorneys to contact per wave. Wave 1 is initial outreach; waves 2–3 are escalations.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {([
            ['Wave 1', 'maxAttorneysWave1'],
            ['Wave 2', 'maxAttorneysWave2'],
            ['Wave 3', 'maxAttorneysWave3'],
          ] as const).map(([label, key]) => (
            <label key={key} className="block">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <input type="number" min={1} max={20} value={config[key]} onChange={(e) => update({ [key]: clampInt(e.target.value, 1, 20, 1) })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
          ))}
        </div>
      </section>
    </>
  )
}
