/**
 * Pull sync: read the firm's existing caseload out of their own CMS.
 *
 * The mirror of the spreadsheet importer above it in the Intake tab, and the
 * reason that importer can be honest about not carrying documents.
 *
 * Two deliberate frictions in this panel, both because of what the feature
 * does. It is off until the firm turns it on, because importing an entire
 * caseload is a large and surprising action to take on someone's behalf. And
 * "Preview" is offered before "Sync now", because a firm with four thousand
 * matters should see what a first run would do before it does it.
 *
 * The skipped list is the other half. A sync that reports "imported 340" and
 * nothing else hides the eleven matters that need a date of loss added in the
 * CMS, so those are named individually with what to do about them.
 */
import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Check, Download, Loader2, RefreshCw } from 'lucide-react'
import {
  getCmsConnections,
  runInboundSync,
  setInboundSyncEnabled,
  type CmsConnectionView,
  type InboundSkipReason,
  type InboundSyncResult,
} from '../lib/api-integrations'

const cardCls = 'rounded-xl border border-slate-200 bg-white p-5'
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50'
const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 disabled:opacity-50'

const PROVIDER_LABELS: Record<string, string> = {
  clio: 'Clio',
  filevine: 'Filevine',
  smartadvocate: 'SmartAdvocate',
  casepeer: 'CasePeer',
  zapier: 'Zapier',
}

/**
 * What a firm can actually do about each reason.
 *
 * `missing_incident_date` is the one that matters. Clio has no incident-date
 * field, so for a Clio caseload this is the common case rather than an edge
 * one, and the fix is in their CMS rather than here.
 */
const SKIP_EXPLANATIONS: Record<InboundSkipReason, string> = {
  duplicate: 'Already imported',
  missing_external_id: 'The CMS returned no id for this matter',
  missing_incident_date: 'Needs a date of loss in your CMS',
  missing_venue_state: 'Needs a venue state in your CMS',
  error: 'Could not be imported',
}

function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] || provider
}

function lastSyncedLabel(value: string | null | undefined): string {
  if (!value) return 'Never synced'
  const when = new Date(value)
  if (Number.isNaN(when.getTime())) return 'Never synced'
  return `Last synced ${when.toLocaleString()}`
}

export default function AttorneyDashboardCaseloadSync() {
  const [connections, setConnections] = useState<CmsConnectionView[] | null>(null)
  /** The connection currently being worked, so one row's spinner is its own. */
  const [busyId, setBusyId] = useState<string | null>(null)
  const [result, setResult] = useState<InboundSyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setConnections(await getCmsConnections())
    } catch {
      setConnections([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const syncable = (connections || []).filter((c) => c.supportsInbound && c.status !== 'revoked')

  // Nothing connected that can be read from. Rendering an empty panel would
  // imply the firm is missing a setting rather than a connection.
  if (connections !== null && syncable.length === 0) return null

  async function toggle(connection: CmsConnectionView, enabled: boolean) {
    setBusyId(connection.id)
    setError(null)
    try {
      await setInboundSyncEnabled(connection.id, enabled)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not change that setting')
    } finally {
      setBusyId(null)
    }
  }

  async function sync(connection: CmsConnectionView, dryRun: boolean) {
    setBusyId(connection.id)
    setError(null)
    setResult(null)
    try {
      setResult(await runInboundSync(connection.id, { dryRun }))
      if (!dryRun) await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The sync could not be completed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={cardCls}>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Download className="h-4 w-4" />
        </span>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Bring in your existing caseload</h4>
          <p className="text-xs text-slate-500">
            Read matters straight out of your case management system, with documents.
          </p>
        </div>
      </div>

      {connections === null ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your connections…
        </div>
      ) : (
        <div className="space-y-3">
          {syncable.map((connection) => {
            const busy = busyId === connection.id
            const on = connection.inboundSyncEnabled === true

            return (
              <div key={connection.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {providerLabel(connection.provider)}
                      {connection.externalAccountEmail && (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          {connection.externalAccountEmail}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{lastSyncedLabel(connection.lastSyncedAt)}</div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={busy}
                      onChange={(e) => void toggle(connection, e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Keep this caseload in sync
                  </label>
                </div>

                {connection.lastError && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {connection.lastError}
                  </div>
                )}

                {on ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => void sync(connection, true)}
                      disabled={busy}
                      className={btnSecondary}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Preview
                    </button>
                    <button onClick={() => void sync(connection, false)} disabled={busy} className={btnPrimary}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Sync now
                    </button>
                    <span className="text-xs text-slate-500">
                      New and changed matters are picked up automatically every few hours.
                    </span>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    Turn this on to create a ClearCaseIQ case for each matter in your{' '}
                    {providerLabel(connection.provider)} caseload. Cases you bring with you stay yours — they
                    are never offered to another firm and carry no routing fee.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && <SyncSummary result={result} />}
    </div>
  )
}

function SyncSummary({ result }: { result: InboundSyncResult }) {
  // Duplicates are separated out because they are the expected majority on any
  // run after the first, and burying the eleven matters that need attention
  // under three hundred "already imported" lines helps nobody.
  const duplicates = result.skipped.filter((row) => row.reason === 'duplicate')
  const needsAttention = result.skipped.filter((row) => row.reason !== 'duplicate')

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold text-slate-900">
          {result.dryRun ? 'Would import' : 'Imported'} {result.imported} case
          {result.imported === 1 ? '' : 's'}
        </span>
        <span className="text-slate-500">
          from {result.seen} matter{result.seen === 1 ? '' : 's'}
        </span>
        {duplicates.length > 0 && (
          <span className="text-slate-500">{duplicates.length} already on file</span>
        )}
        {needsAttention.length > 0 && (
          <span className="text-amber-700">{needsAttention.length} need attention</span>
        )}
      </div>

      {result.imported === 0 && needsAttention.length === 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          Everything in your caseload is already here.
        </p>
      )}

      {needsAttention.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-700">
          {needsAttention.slice(0, 10).map((row, index) => (
            <li key={`${row.externalId || 'skip'}-${index}`}>
              <span className="font-medium">{row.label || row.externalId}</span>
              {' — '}
              {row.detail || SKIP_EXPLANATIONS[row.reason]}
            </li>
          ))}
          {needsAttention.length > 10 && (
            <li className="text-slate-500">and {needsAttention.length - 10} more.</li>
          )}
        </ul>
      )}

      {/* A run that stopped on the page cap has not read the whole caseload,
          and the watermark was deliberately left where it was — so the next run
          resumes rather than skipping the tail. Saying so avoids a firm
          concluding the import lost matters. */}
      {!result.reachedEnd && (
        <p className="mt-3 text-xs text-slate-500">
          This was the first batch of a large caseload. The rest arrives on the next sync.
        </p>
      )}
    </div>
  )
}
