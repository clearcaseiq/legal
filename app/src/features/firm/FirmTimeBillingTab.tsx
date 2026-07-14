/**
 * Firm Dashboard → Time & Billing tab. Two jobs:
 *  1. Configure billing rates (role defaults + per-person overrides).
 *  2. Review/approve team time firm-wide, with totals and CSV export.
 *
 * Contingency-focused: rates drive profitability, fee petitions, and lien/fee
 * disputes — not hourly client invoices.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DollarSign, Clock, Check, X, Download, Loader2, Save, ChevronDown, ChevronUp } from 'lucide-react'
import {
  getFirmBillingRates,
  saveFirmBillingRates,
  getFirmTimeEntries,
  updateFirmTimeEntry,
  exportFirmTimeCsv,
  type FirmBillingRatesResponse,
  type FirmTimeResponse,
  type FirmTimeFilters,
  type TimeEntryStatus,
} from '../../lib/api'
import { SectionCard, EmptyState, Badge, type BadgeTone } from '../shared/ui'

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60'
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
const inputCls =
  'rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'neutral',
  submitted: 'blue',
  approved: 'success',
  rejected: 'danger',
  invoiced: 'brand',
}

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function FirmTimeBillingTab() {
  const [rates, setRates] = useState<FirmBillingRatesResponse | null>(null)
  const [ratesOpen, setRatesOpen] = useState(false)
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({})
  const [memberDraft, setMemberDraft] = useState<Record<string, string>>({})
  const [savingRates, setSavingRates] = useState(false)

  const [filters, setFilters] = useState<FirmTimeFilters>({})
  const [data, setData] = useState<FirmTimeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadRates = useCallback(async () => {
    const res = await getFirmBillingRates()
    setRates(res)
    setRoleDraft(
      Object.fromEntries(res.roles.map((r) => [r.value, res.roleRates[r.value] != null ? String(res.roleRates[r.value]) : '']))
    )
    setMemberDraft(
      Object.fromEntries(res.members.map((m) => [m.firmMemberId, res.memberRates[m.firmMemberId] != null ? String(res.memberRates[m.firmMemberId]) : '']))
    )
  }, [])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getFirmTimeEntries(filters))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const canManage = data?.canManage ?? rates?.canManage ?? false

  const saveRates = async () => {
    if (!rates) return
    setSavingRates(true)
    try {
      await saveFirmBillingRates({
        roleRates: rates.roles.map((r) => ({
          role: r.value,
          hourlyRate: roleDraft[r.value] === '' ? null : Number(roleDraft[r.value]),
        })),
        memberRates: rates.members.map((m) => ({
          firmMemberId: m.firmMemberId,
          hourlyRate: memberDraft[m.firmMemberId] === '' ? null : Number(memberDraft[m.firmMemberId]),
        })),
      })
      await loadRates()
      await loadEntries()
    } finally {
      setSavingRates(false)
    }
  }

  const setStatus = async (id: string, status: TimeEntryStatus) => {
    setBusyId(id)
    try {
      await updateFirmTimeEntry(id, status)
      await loadEntries()
    } finally {
      setBusyId(null)
    }
  }

  const download = async () => {
    const url = await exportFirmTimeCsv(filters)
    const a = document.createElement('a')
    a.href = url
    a.download = 'time-entries.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const roleLabel = useMemo(() => {
    const map = new Map((rates?.roles ?? []).map((r) => [r.value, r.label]))
    return (v: string | null) => (v ? map.get(v) || v : '—')
  }, [rates])

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Total hours" value={data ? String(data.totals.totalHours) : '—'} icon={<Clock className="h-4 w-4" />} />
        <StatTile label="Billable hours" value={data ? String(data.totals.billableHours) : '—'} icon={<Clock className="h-4 w-4" />} />
        <StatTile label="Billable value" value={data ? money(data.totals.billableAmount) : '—'} icon={<DollarSign className="h-4 w-4" />} />
        <StatTile label="Unbilled WIP" value={data ? money(data.totals.unbilledAmount) : '—'} icon={<DollarSign className="h-4 w-4" />} />
        <StatTile label="Awaiting approval" value={data ? String(data.totals.pendingApproval) : '—'} />
      </div>

      {/* Rates */}
      {canManage && rates && (
        <SectionCard
          title="Billing rates"
          trailing={
            <button type="button" className={btnGhost} onClick={() => setRatesOpen((o) => !o)}>
              {ratesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {ratesOpen ? 'Hide' : 'Configure'}
            </button>
          }
        >
          {!ratesOpen && (
            <p className="text-sm text-slate-500">
              Set role default rates and optional per-person overrides. Rates are snapshotted onto each entry, so
              changing them here only affects new time.
            </p>
          )}
          {ratesOpen && (
            <div className="space-y-5">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Role defaults ($/hr)</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {rates.roles.map((r) => (
                    <div key={r.value}>
                      <label className="mb-1 block text-xs font-medium text-slate-500">{r.label}</label>
                      <input
                        type="number"
                        min={0}
                        className={`${inputCls} w-full`}
                        value={roleDraft[r.value] ?? ''}
                        onChange={(e) => setRoleDraft((d) => ({ ...d, [r.value]: e.target.value }))}
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                  Per-person overrides ($/hr)
                  <span className="ml-2 text-xs font-normal text-slate-400">Blank = use the role default</span>
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rates.members.map((m) => (
                    <div key={m.firmMemberId} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-slate-700">{m.name}</div>
                        <div className="text-xs text-slate-400">{roleLabel(m.role)}</div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        className={`${inputCls} w-24`}
                        value={memberDraft[m.firmMemberId] ?? ''}
                        onChange={(e) => setMemberDraft((d) => ({ ...d, [m.firmMemberId]: e.target.value }))}
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" className={btnPrimary} onClick={saveRates} disabled={savingRates}>
                  <Save className="h-3.5 w-3.5" /> {savingRates ? 'Saving…' : 'Save rates'}
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* Entries */}
      <SectionCard
        title="Time entries"
        trailing={
          <button type="button" className={btnGhost} onClick={download}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        }
      >
        <div>
          {/* Filters */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              className={inputCls}
              value={filters.status ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as TimeEntryStatus | undefined }))}
            >
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
              <option value="invoiced">Invoiced</option>
            </select>
            <select
              className={inputCls}
              value={filters.firmMemberId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, firmMemberId: e.target.value || undefined }))}
            >
              <option value="">Everyone</option>
              {(data?.members ?? []).map((m) => (
                <option key={m.firmMemberId} value={m.firmMemberId}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className={inputCls}
              value={filters.from ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              className={inputCls}
              value={filters.to ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
            />
            {(filters.status || filters.firmMemberId || filters.from || filters.to) && (
              <button type="button" className={btnGhost} onClick={() => setFilters({})}>
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !data || data.entries.length === 0 ? (
            <EmptyState message="No time entries match these filters." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Who</th>
                    <th className="px-3 py-2 font-semibold">Case</th>
                    <th className="px-3 py-2 font-semibold">Activity</th>
                    <th className="px-3 py-2 text-right font-semibold">Hours</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    {canManage && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.entries.map((e) => (
                    <tr key={e.id} className="text-slate-700">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                        {new Date(e.workDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-3 py-2">
                        {e.workerName || '—'}
                        <span className="ml-1 text-xs text-slate-400">{roleLabel(e.role)}</span>
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2 text-slate-500">{e.caseLabel || '—'}</td>
                      <td className="px-3 py-2">
                        <span className="capitalize">{e.activityType}</span>
                        {!e.billable && <span className="ml-1 text-xs text-slate-400">(non-billable)</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{e.hours}</td>
                      <td className="px-3 py-2 text-right">{money(e.amount)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={STATUS_TONE[e.status] || 'neutral'}>
                          <span className="capitalize">{e.status}</span>
                        </Badge>
                      </td>
                      {canManage && (
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {e.status === 'submitted' && (
                            <span className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => setStatus(e.id, 'approved')}
                                disabled={busyId === e.id}
                                className="rounded p-1 text-emerald-500 hover:bg-emerald-50"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatus(e.id, 'rejected')}
                                disabled={busyId === e.id}
                                className="rounded p-1 text-rose-400 hover:bg-rose-50"
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </span>
                          )}
                          {(e.status === 'approved' || e.status === 'rejected') && (
                            <button
                              type="button"
                              onClick={() => setStatus(e.id, 'submitted')}
                              disabled={busyId === e.id}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Reopen
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

function StatTile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
    </div>
  )
}
