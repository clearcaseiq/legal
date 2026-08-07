import { clampInt, type MatchingRulesTabProps } from './constants'

export function TimingRulesTab({ config, update }: MatchingRulesTabProps) {
  const responseDeadlineMinutes = Math.max(0, Math.round(config.defaultAttorneyResponseDeadlineMinutes || (config.defaultAttorneyResponseDeadlineHours || 24) * 60))
  const hours = Math.floor(responseDeadlineMinutes / 60)
  const minutes = responseDeadlineMinutes % 60
  const updateDeadline = (nextHours: number, nextMinutes: number) => update({ defaultAttorneyResponseDeadlineMinutes: Math.max(0, nextHours || 0) * 60 + Math.min(59, Math.max(0, nextMinutes || 0)) })
  const formattedDeadline = responseDeadlineMinutes <= 0 ? 'not set' : [hours > 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : '', minutes > 0 ? `${minutes} minute${minutes === 1 ? '' : 's'}` : ''].filter(Boolean).join(' ')

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Attorney response deadline</h2>
        <p className="mb-4 text-sm text-slate-600">How long an attorney has to accept before the case can move to the next matching step. This also controls plaintiff-facing response time copy.</p>
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium text-slate-700">Hours</span><input type="number" step={1} min={0} max={168} value={hours === 0 ? '' : hours} onChange={(e) => updateDeadline(clampInt(e.target.value, 0, 168, 0), minutes)} placeholder="0" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">Minutes</span><input type="number" step={1} min={0} max={59} value={minutes === 0 ? '' : minutes} onChange={(e) => updateDeadline(hours, clampInt(e.target.value, 0, 59, 0))} placeholder="0" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        </div>
        <p className="mt-3 text-xs text-slate-500">Leave hours blank for 0. For example, enter 22 minutes for a 22-minute attorney response window.</p>
        <p className="mt-1 text-xs font-medium text-slate-600">Current response window: {formattedDeadline}.</p>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Escalation timing</h2>
        <p className="mb-4 text-sm text-slate-600">Hours to wait before escalating to the next wave if no attorney accepts.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {([['Wave 1 → 2 (hours)', 'wave1WaitHours'], ['Wave 2 → 3 (hours)', 'wave2WaitHours'], ['Wave 3 complete (hours)', 'wave3WaitHours']] as const).map(([label, key]) => (
            <label key={key} className="block"><span className="text-sm font-medium text-slate-700">{label}</span><input type="number" min={0} max={168} value={config[key]} onChange={(e) => update({ [key]: clampInt(e.target.value, 0, 168, 0) })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          ))}
        </div>
      </section>
    </>
  )
}
