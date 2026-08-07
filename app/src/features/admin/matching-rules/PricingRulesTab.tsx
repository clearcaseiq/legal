import type { MatchingRulesTabProps } from './constants'

export function PricingRulesTab({ config, update }: MatchingRulesTabProps) {
  const fee = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((config.caseRoutingFeeCents || 0) / 100)
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="text-lg font-semibold text-slate-800">Per-case fee</h2><p className="mt-1 text-sm text-slate-600">One flat fee for every accepted case. There is intentionally no way to set a different price by claim type, injury severity, or expected recovery.</p></div>
        <div className="flex flex-col gap-2 sm:items-end"><button type="button" onClick={() => update({ routingFeePaymentsEnabled: !config.routingFeePaymentsEnabled })} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${config.routingFeePaymentsEnabled ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-300 bg-slate-100 text-slate-700'}`}><span className={`inline-block h-2.5 w-2.5 rounded-full ${config.routingFeePaymentsEnabled ? 'bg-green-500' : 'bg-slate-400'}`} />{config.routingFeePaymentsEnabled ? 'Stripe payments on' : 'Stripe payments off'}</button></div>
      </div>
      <div className={`mt-5 rounded-lg border px-4 py-3 text-sm ${config.routingFeePaymentsEnabled ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{config.routingFeePaymentsEnabled ? 'Stripe checkout is enabled for case acceptance.' : 'Stripe checkout is currently bypassed. Attorneys can accept cases without payment while the fee amount remains saved.'}</div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-5 sm:grid-cols-2">
        <label className="block"><span className="text-xs font-medium text-slate-600">Fee per accepted case</span><div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white"><span className="px-3 text-sm text-slate-500">$</span><input type="number" min={0} step={50} value={Math.round((config.caseRoutingFeeCents || 0) / 100)} onChange={(e) => update({ caseRoutingFeeCents: Math.max(0, parseInt(e.target.value, 10) || 0) * 100 })} className="block w-full border-0 px-0 py-2 pr-3 text-sm focus:ring-0" /></div><span className="mt-2 block text-xs text-slate-500">Set to $0 to let attorneys accept cases without a fee.</span></label>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-500">Every accepted case</p><p className="mt-1 text-2xl font-bold text-slate-900">{fee}</p><p className="mt-1 text-xs text-slate-600">Same amount for all claim types</p></div>
      </div></div>
      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">This is a flat fee for platform and marketing services, not a share of any recovery. It does not change with claim type, injury severity, case score, or expected settlement value, and case scoring cannot move a file into a more expensive price.</div>
    </section>
  )
}
