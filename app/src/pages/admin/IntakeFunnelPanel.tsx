import { useCallback, useEffect, useState } from 'react'
import { Info, ListOrdered, RefreshCw } from 'lucide-react'
import {
  getAdminIntakeFunnel,
  type AdminIntakeFunnel,
  type AdminIntakeFunnelDevice,
  type AdminIntakeFunnelStep,
} from '../../lib/api'

/**
 * The intake wizard's own funnel: reach, drop-off and time per step.
 *
 * Sits beside the GA4 traffic panel and answers the question that one cannot.
 * The wizard is on the HIPAA analytics deny list, so Google has never seen a
 * step of it; these numbers come from `IntakeLead.stepHistory`, which the
 * wizard has been recording all along.
 */
export function IntakeFunnelPanel({ days }: { days: number }) {
  const [data, setData] = useState<AdminIntakeFunnel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setData(await getAdminIntakeFunnel(days))
    } catch (err: any) {
      const body = err?.response?.data
      setError(body?.detail || body?.error || 'Failed to load the intake funnel')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <ListOrdered className="h-5 w-5 text-brand-600" />
          Intake funnel
        </h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          First-party, from the wizard's own step history &mdash; no analytics tag runs on these
          screens. Times are medians of the gap between one step and the next, so a step's figure is
          the time spent <em>before</em> moving on. Gaps over 30 minutes are treated as an abandoned
          tab and excluded, and a step with fewer than five samples reports no time at all.
        </span>
      </p>

      {loading && !data ? (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : data && data.totalLeads === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No intake activity in this window
          </p>
          <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500 dark:text-slate-400">
            Widen the date range. Leads only appear here once the wizard has recorded at least one
            step, which happens as soon as a claimant supplies an email or phone number.
          </p>
        </div>
      ) : data ? (
        <Report data={data} />
      ) : null}
    </div>
  )
}

function formatSeconds(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`
}

function formatPercent(rate: number | null): string {
  return rate == null ? '—' : `${Math.round(rate * 100)}%`
}

function Report({ data }: { data: AdminIntakeFunnel }) {
  const entryReach = data.steps[0]?.reached ?? 0
  // Worst step by volume, which is where a fix pays most. Rate alone would
  // promote a step three people saw.
  const worst = data.worstDropOff[0]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Leads started" value={data.totalLeads.toLocaleString()} />
        <Tile label="Completed" value={data.completedLeads.toLocaleString()} />
        <Tile label="Completion rate" value={formatPercent(data.completionRate)} />
        <Tile
          label="Biggest drop-off"
          value={worst ? worst.step : '—'}
          hint={worst ? `${worst.droppedHere.toLocaleString()} left here` : undefined}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Step by step</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="pb-2 pr-3 font-medium">Step</th>
                <th className="pb-2 pr-3 text-right font-medium">Reached</th>
                <th className="pb-2 pr-3 text-right font-medium">Of entry</th>
                <th className="pb-2 pr-3 text-right font-medium">Left here</th>
                <th className="pb-2 pr-3 text-right font-medium">Drop rate</th>
                <th className="pb-2 pr-3 text-right font-medium">Median time</th>
                <th className="pb-2 text-right font-medium">Slowest 10%</th>
              </tr>
            </thead>
            <tbody>
              {data.steps.map((step) => (
                <StepRow key={step.step} step={step} entryReach={entryReach} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DeviceSplit rows={data.byDevice} overall={data.completionRate} />
    </div>
  )
}

/**
 * Completion by device, and where each one gives up.
 *
 * The step table above is every device at once, which hides the thing worth
 * knowing: the wizard has date pickers and file uploads, and none of that
 * behaves the same on a phone. Rolled together, a phone abandoning at the
 * upload step and a desktop abandoning there are one number, so a layout
 * problem cannot be told from a question problem.
 */
function DeviceSplit({
  rows,
  overall,
}: {
  rows: AdminIntakeFunnelDevice[]
  overall: number | null
}) {
  // Absent for any window before the column existed, which cannot be
  // backfilled. A zeroed table would read as "no mobile traffic".
  if (rows.length === 0) return null

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">By device</h3>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Recorded on the first request of each lead, so someone who starts on a phone and finishes on
        a laptop counts as a phone. Leads from before this was recorded are left out entirely.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="pb-2 pr-3 font-medium">Device</th>
              <th className="pb-2 pr-3 text-right font-medium">Leads</th>
              <th className="pb-2 pr-3 text-right font-medium">Completed</th>
              <th className="pb-2 pr-3 text-right font-medium">Completion rate</th>
              <th className="pb-2 font-medium">Abandons most at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              // Flagged against the funnel as a whole rather than a fixed
              // threshold: what matters is a device doing materially worse than
              // the product's own average, not the absolute number.
              const lagging =
                row.completionRate != null &&
                overall != null &&
                row.completionRate < overall * 0.75

              return (
                <tr
                  key={row.device}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="py-2 pr-3 font-medium capitalize text-slate-900 dark:text-slate-100">
                    {row.device}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {row.leads.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {row.completedLeads.toLocaleString()}
                  </td>
                  <td
                    className={`py-2 pr-3 text-right tabular-nums font-medium ${
                      lagging
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                    // Withheld below the sample floor rather than rounded from a
                    // handful, so say why instead of printing a bare dash.
                    title={
                      row.completionRate == null ? 'Too few leads to report a rate' : undefined
                    }
                  >
                    {formatPercent(row.completionRate)}
                  </td>
                  <td className="py-2 text-slate-700 dark:text-slate-300">
                    {row.worstStep ? (
                      <>
                        {row.worstStep.step}
                        <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                          {row.worstStep.droppedHere.toLocaleString()} left here
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StepRow({ step, entryReach }: { step: AdminIntakeFunnelStep; entryReach: number }) {
  const share = entryReach > 0 ? step.reached / entryReach : 0
  // A step that loses a quarter of the people who reach it is worth looking at;
  // one that loses more than half is the story of the funnel.
  const heavy = (step.dropRate ?? 0) >= 0.5
  const notable = !heavy && (step.dropRate ?? 0) >= 0.25

  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <td className="py-2 pr-3">
        <div className="font-medium text-slate-900 dark:text-slate-100">{step.step}</div>
        {/* The bar carries the shape of the funnel; the number beside it is the
            precise value for anyone who needs it. */}
        <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
      </td>
      <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
        {step.reached.toLocaleString()}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
        {formatPercent(entryReach > 0 ? share : null)}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
        {step.droppedHere.toLocaleString()}
      </td>
      <td
        className={`py-2 pr-3 text-right tabular-nums font-medium ${
          heavy
            ? 'text-red-600 dark:text-red-400'
            : notable
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {formatPercent(step.dropRate)}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
        {formatSeconds(step.medianSeconds)}
      </td>
      <td className="py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
        {formatSeconds(step.p90Seconds)}
      </td>
    </tr>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold text-slate-900 dark:text-white">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  )
}
