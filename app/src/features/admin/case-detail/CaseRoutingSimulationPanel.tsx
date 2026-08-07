import { useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { runAdminRouteEngine } from '../../../lib/api'

export default function CaseRoutingSimulationPanel({ caseId, recommendations, runRequest = 0 }: { caseId: string; recommendations: any[]; runRequest?: number }) {
  const [options, setOptions] = useState({ maxAttorneysPerWave: 3, skipPreRoutingGate: false })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const handledRunRequest = useRef(0)
  const run = useCallback(async () => { try { setLoading(true); setResult(await runAdminRouteEngine(caseId, { ...options, dryRun: true })) } catch (error: any) { setResult({ success: false, errors: [error.response?.data?.error || error.message || 'Simulation failed'] }) } finally { setLoading(false) } }, [caseId, options])
  useEffect(() => {
    if (runRequest > handledRunRequest.current) {
      handledRunRequest.current = runRequest
      void run()
    }
  }, [run, runRequest])
  return <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><BarChart3 className="h-5 w-5" />Routing simulation</h2><p className="mb-4 text-sm text-slate-600">Dry-run the classic routing engine without creating introductions. Use this to preview candidate counts and shortlist behavior under different wave settings.</p><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><div><label className="mb-1 block text-xs font-medium text-slate-500">Max attorneys per wave</label><input type="number" min={1} max={10} value={options.maxAttorneysPerWave} onChange={(event) => setOptions((current) => ({ ...current, maxAttorneysPerWave: Math.max(1, Number.parseInt(event.target.value || '1', 10)) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div><div className="flex items-end"><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={options.skipPreRoutingGate} onChange={(event) => setOptions((current) => ({ ...current, skipPreRoutingGate: event.target.checked }))} className="rounded border-slate-300" />Skip pre-routing gate</label></div><div className="flex items-end justify-start md:justify-end"><button type="button" onClick={() => void run()} disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">{loading ? 'Running simulation...' : 'Run simulation'}</button></div></div>
    {result && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">{[['Success', result.success ? 'Yes' : 'No'], ['Gate passed', result.gatePassed ? 'Yes' : 'No'], ['Eligible candidates', result.candidatesEligible ?? 0], ['Qualified candidates', result.candidatesQualified ?? 0], ['Wave size', result.waveSize ?? 0], ['Strategy', result.strategy || 'classic'], ['Tier attempted', result.tierAttempted ? 'Yes' : 'No'], ['Gate reason', result.gateReason || '—']].map(([label, value]) => <div key={String(label)}><p className="text-xs text-slate-500">{label}</p><p className="font-medium capitalize">{value}</p></div>)}</div>{result.routedTo?.length > 0 && <div className="mt-4"><p className="mb-2 text-xs font-medium text-slate-500">Simulated shortlist</p><div className="flex flex-wrap gap-2">{result.routedTo.map((id: string) => <span key={id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700">{recommendations.find((item) => item.attorney.id === id)?.attorney.name || id}</span>)}</div></div>}{result.errors?.length > 0 && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{Array.from(new Set(result.errors.map(String))).join('; ')}</div>}</div>}
  </section>
}
