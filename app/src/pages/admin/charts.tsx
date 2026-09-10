/**
 * The admin section's charts.
 *
 * Hand-built rather than pulled from a charting library, because there is no
 * charting dependency in this repo and these two shapes — a ranked bar list and
 * a single trend line — are the only ones the admin screens have ever needed.
 * Adding recharts to draw a div with a width would cost more bytes than the
 * pages themselves.
 *
 * They lived inside AdminAnalytics as file-local components until the traffic
 * panel needed the same two shapes.
 */

export function BarChart({
  data,
  labelKey,
  valueKey,
  maxBars = 10,
  color = 'brand',
  formatValue,
}: {
  data: Array<Record<string, any>>
  labelKey: string
  valueKey: string
  maxBars?: number
  color?: string
  /** For rates and durations, which are not plain counts. */
  formatValue?: (value: number) => string
}) {
  const sorted = [...data].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0)).slice(0, maxBars)
  const max = Math.max(1, ...sorted.map((d) => d[valueKey] || 0))
  const colorClass =
    color === 'brand'
      ? 'bg-brand-500'
      : color === 'emerald'
        ? 'bg-emerald-500'
        : color === 'amber'
          ? 'bg-amber-500'
          : 'bg-slate-500'

  return (
    <div className="space-y-2">
      {sorted.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span
            className="w-32 shrink-0 truncate text-sm text-slate-600 dark:text-slate-400"
            title={String(d[labelKey])}
          >
            {d[labelKey]}
          </span>
          <div className="h-6 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full ${colorClass} rounded transition-all`}
              style={{ width: `${((d[valueKey] || 0) / max) * 100}%` }}
            />
          </div>
          <span className="w-16 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
            {formatValue ? formatValue(d[valueKey] || 0) : d[valueKey] || 0}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SimpleLineChart({ data }: { data: [string, number][] }) {
  const values = data.map(([, v]) => v)
  const max = Math.max(1, ...values)
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * 100
      const y = 100 - (v / max) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="h-32 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-brand-500"
          points={points}
        />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{data[0]?.[0]}</span>
        <span>{data[Math.floor(data.length / 2)]?.[0]}</span>
        <span>{data[data.length - 1]?.[0]}</span>
      </div>
    </div>
  )
}
