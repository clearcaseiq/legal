import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cancelInviteBatch,
  getInviteBatches,
  getInviteCandidates,
  queueInviteBatch,
  saveInviteSettings,
  type InviteBatch,
  type InviteCandidate,
  type InviteFilters,
  type InviteSendingStatus,
} from '../../lib/api'
import { Badge, SectionCard } from '../../features/shared/ui'

const DEFAULT_BATCH_SIZE = 25

const BATCH_STATUS_LABELS: Array<[string, string]> = [
  ['queued', 'Queued'],
  ['sent', 'Sent'],
  ['verified', 'Verifying'],
  ['completed', 'Claimed'],
  ['rejected', 'Declined'],
  ['expired', 'Expired'],
  ['cancelled', 'Cancelled'],
  ['failed', 'Failed'],
]

function describeFilters(filters: InviteFilters | null): string {
  if (!filters) return 'All eligible'
  const parts = [
    filters.county && `${filters.county} County`,
    filters.city && `city "${filters.city}"`,
    filters.firm && `firm "${filters.firm}"`,
    filters.includeRoleInboxes && 'including shared inboxes',
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : 'All eligible'
}

function SenderSettings({
  sending,
  onSaved,
}: {
  sending: InviteSendingStatus
  onSaved: (next: InviteSendingStatus) => void
}) {
  const [dailyCap, setDailyCap] = useState(String(sending.dailyCap))
  const [postalAddress, setPostalAddress] = useState(sending.postalAddress || '')
  const [fromEmail, setFromEmail] = useState(sending.fromEmail || '')
  const [replyTo, setReplyTo] = useState(sending.replyTo || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (extra: { paused?: boolean } = {}) => {
    setSaving(true)
    setError(null)
    try {
      const result = await saveInviteSettings({
        dailyCap: Number.parseInt(dailyCap, 10) || 0,
        postalAddress: postalAddress.trim() || null,
        fromEmail: fromEmail.trim() || null,
        replyTo: replyTo.trim() || null,
        ...extra,
      })
      onSaved(result.sending)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Sender settings</p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save({ paused: !sending.paused })}
          className="btn-outline text-ui-xs"
        >
          {sending.paused ? 'Resume sending' : 'Pause sending'}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-500 dark:text-slate-400">
          Daily limit (per rolling 24 hours)
          <input
            type="number"
            min={0}
            className="input mt-1 block w-full"
            value={dailyCap}
            onChange={(e) => setDailyCap(e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          Postal address (required by CAN-SPAM)
          <input
            className="input mt-1 block w-full"
            placeholder="Street or PO box, city, state ZIP"
            value={postalAddress}
            onChange={(e) => setPostalAddress(e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          From address (must be on clearcaseiq.com)
          <input
            type="email"
            className="input mt-1 block w-full"
            placeholder="invites@clearcaseiq.com"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          Reply-to address
          <input
            type="email"
            className="input mt-1 block w-full"
            placeholder="support@clearcaseiq.com"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
          />
        </label>
      </div>
      <button type="button" disabled={saving} onClick={() => void save()} className="btn-primary text-ui-sm">
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  )
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/**
 * Bulk claim invitations for imported attorneys. Operators preview who a pass
 * would reach and queue a batch; the API sends it within a daily cap, so
 * nothing on this panel emails anyone directly.
 */
export default function ClaimInviteSender({ onQueued }: { onQueued: () => void }) {
  const [county, setCounty] = useState('')
  const [city, setCity] = useState('')
  const [firm, setFirm] = useState('')
  const [includeRoleInboxes, setIncludeRoleInboxes] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [sample, setSample] = useState<InviteCandidate[]>([])
  const [byCounty, setByCounty] = useState<Record<string, number>>({})
  const [maxBatchSize, setMaxBatchSize] = useState(200)
  const [sending, setSending] = useState<InviteSendingStatus | null>(null)
  const [batches, setBatches] = useState<InviteBatch[]>([])
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const filters = useMemo<InviteFilters>(
    () => ({
      county: county || undefined,
      city: city.trim() || undefined,
      firm: firm.trim() || undefined,
      includeRoleInboxes: includeRoleInboxes || undefined,
    }),
    [county, city, firm, includeRoleInboxes],
  )

  const loadBatches = useCallback(async () => {
    const data = await getInviteBatches()
    setBatches(data.data || [])
    setSending(data.sending)
  }, [])

  const preview = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getInviteCandidates(filters)
      setTotal(data.total)
      setSample(data.sample || [])
      setByCounty(data.byCounty || {})
      setMaxBatchSize(data.maxBatchSize || 200)
      setSending(data.sending)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load eligible attorneys')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void preview()
    void loadBatches().catch(() => undefined)
    // Load once with no filters; later previews are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const countyOptions = useMemo(
    () => Object.entries(byCounty).sort((a, b) => b[1] - a[1]),
    [byCounty],
  )

  const size = Math.max(0, Math.min(batchSize || 0, maxBatchSize, total ?? 0))
  const blocked = sending ? !sending.postalAddressConfigured : true

  const queue = async () => {
    if (!size || !sending) return
    const days = sending.dailyCap > 0 ? Math.ceil((sending.queued + size) / sending.dailyCap) : null
    const ok = window.confirm(
      `Queue ${size} invitation${size === 1 ? '' : 's'} (${describeFilters(filters)})?\n\n` +
        (sending.paused ? 'Sending is currently paused; they will wait until you resume.\n\n' : '') +
        `They send automatically at up to ${sending.dailyCap} per 24 hours` +
        (days ? `, so the queue will take about ${days} day${days === 1 ? '' : 's'} to clear.` : '.') +
        '\n\nYou can cancel the unsent part of a batch at any time.',
    )
    if (!ok) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await queueInviteBatch(filters, size)
      setNotice(
        result.queued
          ? `${result.queued} invitation${result.queued === 1 ? '' : 's'} queued.`
          : 'Nobody matched these filters, so nothing was queued.',
      )
      await Promise.all([preview(), loadBatches()])
      onQueued()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to queue invitations')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (batch: InviteBatch) => {
    if (!window.confirm(`Cancel the ${batch.counts.queued || 0} unsent invitations in this batch?`)) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await cancelInviteBatch(batch.batchId)
      setNotice(`${result.cancelled} unsent invitation${result.cancelled === 1 ? '' : 's'} cancelled.`)
      await Promise.all([preview(), loadBatches()])
      onQueued()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel the batch')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard title="Send invitations">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Invite imported attorneys to claim their profiles. Only attorneys who have never been invited, have an
          email on file and have not unsubscribed are eligible. Queued invitations go out automatically within the
          daily limit.
        </p>

        {sending && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700 dark:text-slate-300">
            <span>
              Sent in last 24h: <strong className="tabular-nums">{sending.sentLast24h}</strong> /{' '}
              <span className="tabular-nums">{sending.dailyCap}</span>
            </span>
            <span>
              Waiting to send: <strong className="tabular-nums">{sending.queued}</strong>
            </span>
            <span>From: {sending.fromEmail || 'platform default address'}</span>
            {sending.replyTo && <span>Replies to: {sending.replyTo}</span>}
            {sending.paused && <Badge tone="warning">Paused</Badge>}
            {!blocked && (
              <button
                type="button"
                onClick={() => setShowSettings((value) => !value)}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                {showSettings ? 'Hide settings' : 'Edit settings'}
              </button>
            )}
          </div>
        )}

        {blocked && sending && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Sending is disabled until a postal address is set below. CAN-SPAM requires a physical mailing address
            in every invitation. You can still preview who would be invited.
          </div>
        )}
        {sending?.paused && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Sending is paused. Queued invitations stay in the queue until you resume.
          </div>
        )}
        {sending && (showSettings || blocked) && (
          <SenderSettings
            key={`${sending.dailyCap}-${sending.postalAddress}-${sending.fromEmail}-${sending.replyTo}-${sending.paused}`}
            sending={sending}
            onSaved={(next) => {
              setSending(next)
              setNotice('Settings saved.')
            }}
          />
        )}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {notice}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">
            County
            <select value={county} onChange={(e) => setCounty(e.target.value)} className="input mt-1 block w-48">
              <option value="">All counties</option>
              {countyOptions
                .filter(([name]) => name !== 'Unknown')
                .map(([name, count]) => (
                  <option key={name} value={name}>
                    {name} ({count})
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            City
            <input
              className="input mt-1 block w-40"
              placeholder="e.g. Irvine"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Firm
            <input
              className="input mt-1 block w-48"
              placeholder="Firm name contains"
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
            />
          </label>
          <label
            className="flex items-center gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300"
            title="Addresses like info@, contact@ and office@ reach a front desk, not the named attorney."
          >
            <input
              type="checkbox"
              checked={includeRoleInboxes}
              onChange={(e) => setIncludeRoleInboxes(e.target.checked)}
            />
            Include shared office inboxes
          </label>
          <button type="button" onClick={() => void preview()} disabled={loading} className="btn-outline text-ui-sm">
            {loading ? 'Loading…' : 'Preview'}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Attorneys whose firm is located outside California are never included.
        </p>

        {total !== null && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {total.toLocaleString()} attorney{total === 1 ? '' : 's'} eligible
              {sample.length < total && sample.length > 0 ? ` · showing the first ${sample.length}` : ''}
            </p>
            {sample.length > 0 && (
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Attorney</th>
                      <th className="px-3 py-2">Firm</th>
                      <th className="px-3 py-2">City</th>
                      <th className="px-3 py-2">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sample.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{row.name}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{row.firmName || '—'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {row.city || '—'}
                          {row.county ? <span className="text-xs text-slate-400"> · {row.county}</span> : null}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {row.email}
                          {row.roleInbox && <span className="ml-1 text-xs text-amber-600">(shared inbox)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Batch size (max {maxBatchSize})
                <input
                  type="number"
                  min={1}
                  max={maxBatchSize}
                  className="input mt-1 block w-28"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number.parseInt(e.target.value, 10) || 0)}
                />
              </label>
              <button
                type="button"
                onClick={() => void queue()}
                disabled={busy || blocked || !size}
                className="btn-primary text-ui-sm"
              >
                {busy ? 'Working…' : `Queue ${size} invitation${size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}

        {batches.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Recent batches</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {batches.map((batch) => (
                <li key={batch.batchId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      {formatDateTime(batch.createdAt)} · {describeFilters(batch.filters)} · {batch.total}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {BATCH_STATUS_LABELS.filter(([key]) => batch.counts[key]).map(([key, label]) => (
                        <Badge
                          key={key}
                          tone={
                            key === 'completed'
                              ? 'success'
                              : key === 'queued'
                                ? 'warning'
                                : key === 'failed' || key === 'rejected'
                                  ? 'danger'
                                  : key === 'sent' || key === 'verified'
                                    ? 'blue'
                                    : 'neutral'
                          }
                        >
                          {label} {batch.counts[key]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {(batch.counts.queued || 0) > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void cancel(batch)}
                      className="btn-outline text-ui-xs"
                    >
                      Cancel unsent
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
