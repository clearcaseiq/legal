import { useCallback, useEffect, useState } from 'react'
import { Info, RefreshCw, Upload } from 'lucide-react'
import { getAdminAdsConversions, type AdminAdsConversions, type AdminAdsConversionRow } from '../../lib/api'
import { formatClaimType } from '../../lib/claimTypes'
import { formatCurrency } from '../../lib/formatters'

/**
 * What has actually been reported back to Google Ads.
 *
 * This is the only place the product writes to a third party that then spends
 * money on the strength of it, so whether a retention landed deserves an answer
 * someone can read without shell access. It is also where the 90-day click
 * window stops being a footnote in a doc and shows up as cases that could not
 * be reported at all.
 */
export function AdsConversionsPanel({ days }: { days: number }) {
  const [data, setData] = useState<AdminAdsConversions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setData(await getAdminAdsConversions(days))
    } catch (err: any) {
      const body = err?.response?.data
      setError(body?.detail || body?.error || 'Failed to load conversion uploads')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="surface-panel p-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Upload className="h-5 w-5" />
          Google Ads conversion uploads
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
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Retained cases reported back to Ads so it can bid toward signed cases rather than clicks. Only
        a click id, a timestamp and a projected revenue figure are sent — never case content.
      </p>

      {loading && !data ? (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : data ? (
        <Report data={data} />
      ) : null}
    </div>
  )
}

function Report({ data }: { data: AdminAdsConversions }) {
  const { counts } = data

  return (
    <div className="space-y-4">
      {!data.configured && <NotConfigured />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Uploaded" value={counts.uploaded} tone="good" />
        <Tile label="Pending" value={counts.pending} />
        <Tile
          label="Outside click window"
          value={counts.skipped}
          tone={counts.skipped > 0 ? 'warn' : undefined}
        />
        <Tile
          label="Out of retries"
          value={counts.exhausted}
          tone={counts.exhausted > 0 ? 'bad' : undefined}
        />
        <Tile label="Value uploaded" value={formatCurrency(data.uploadedValue)} />
      </div>

      {counts.skipped > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {counts.skipped === 1 ? 'One case' : `${counts.skipped} cases`} took longer than{' '}
            {data.clickWindowDays} days from ad click to signed retainer, which is the longest window
            Ads accepts. These cannot be reported at all, so Ads is under-crediting the campaigns that
            produced them. That is a limit of the platform, not a fault here.
          </span>
        </p>
      )}

      {data.recent.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No retained cases in this window arrived from a Google Ads click.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Case</th>
                <th className="py-2 pr-4 font-medium">Retained</th>
                <th className="py-2 pr-4 text-right font-medium">Value</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <Row key={row.assessmentId} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ row }: { row: AdminAdsConversionRow }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <td className="py-2 pr-4">
        <span className="text-slate-900 dark:text-slate-100">
          {row.claimType ? formatClaimType(row.claimType) : 'Unknown type'}
        </span>
        {row.venueState && (
          <span className="ml-1 text-slate-500 dark:text-slate-400">({row.venueState})</span>
        )}
        {/* The click id is what an admin matches against the Ads UI when a
            conversion is disputed, so it is shown rather than hidden. */}
        <span
          className="ml-2 font-mono text-xs text-slate-400 dark:text-slate-500"
          title={row.gclid}
        >
          {row.gclid.slice(0, 10)}…
        </span>
      </td>
      <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">
        {new Date(row.convertedAt).toLocaleDateString()}
      </td>
      <td className="py-2 pr-4 text-right text-slate-700 dark:text-slate-300">
        {/* Null is a case with no prediction to price it, not a worthless one. */}
        {row.value == null ? '—' : formatCurrency(row.value)}
      </td>
      <td className="py-2 pr-4">
        <StatusBadge status={row.status} />
      </td>
      <td className="py-2 text-xs text-slate-500 dark:text-slate-400">
        {row.lastError || (row.uploadedAt ? new Date(row.uploadedAt).toLocaleString() : '—')}
        {row.attempts > 1 && row.status !== 'uploaded' && (
          <span className="ml-1 text-slate-400">({row.attempts} attempts)</span>
        )}
      </td>
    </tr>
  )
}

const STATUS_STYLES: Record<string, string> = {
  uploaded: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  skipped: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  exhausted: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Uploaded',
  pending: 'Pending',
  skipped: 'Outside window',
  exhausted: 'Out of retries',
  failed: 'Failed',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

/**
 * Shown above the numbers rather than instead of them. Rows accumulate whether
 * or not upload is switched on, and hiding them would make a queue that is
 * quietly building up look like nothing to report.
 */
function NotConfigured() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm dark:border-slate-700">
      <p className="font-medium text-slate-700 dark:text-slate-300">Upload is switched off</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Set the <code className="font-mono">GOOGLE_ADS_*</code> credentials and{' '}
        <code className="font-mono">GOOGLE_ADS_CONVERSION_ENABLED=true</code> on the API to start
        reporting. Nothing is sent until then, and cases whose click ages past the{' '}
        90-day window in the meantime can never be reported.
      </p>
    </div>
  )
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone?: 'good' | 'warn' | 'bad'
}) {
  const valueClass =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'bad'
          ? 'text-red-600 dark:text-red-400'
          : 'text-slate-900 dark:text-white'

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}
