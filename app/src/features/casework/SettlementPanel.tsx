/**
 * Settlement / Net-to-Client engine for the attorney case workspace.
 *
 * Models the disbursement waterfall from a persisted scenario:
 *   gross recovery → attorney fee → case costs → (negotiated) medical liens → client net
 *
 * The point of the tab is the *net* and the warnings: a PI attorney can settle a
 * case that nets the client nothing after liens, which is exactly the scenario
 * that generates malpractice claims. Backed by
 * /v1/attorney-dashboard/leads/:leadId/settlement, /expenses, and /liens.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Scale,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Coins,
  Receipt,
  TrendingDown,
} from 'lucide-react'
import {
  getLeadSettlement,
  updateLeadSettlement,
  createLeadLien,
  updateLeadLien,
  deleteLeadLien,
  createLeadExpense,
  deleteLeadExpense,
} from '../../lib/api'

type FeeBasis = 'gross' | 'net_of_costs'

interface SettlementLien {
  id: string
  name: string
  type: string | null
  status: string
  asserted: number
  final: number
  negotiated: boolean
  savings: number
}

interface SettlementCost {
  id: string
  category: string
  description: string
  amount: number
  incurredAt: string | null
}

interface SettlementWarning {
  level: 'danger' | 'warning' | 'info'
  message: string
}

interface SettlementData {
  gross: number
  grossIsEstimate: boolean
  predictedMedian: number
  contingencyPct: number
  feeBasis: FeeBasis
  attorneyFee: number
  costs: number
  staffTime: { hours: number; amount: number; included: boolean }
  costItems: SettlementCost[]
  liens: SettlementLien[]
  liensAsserted: number
  liensFinal: number
  lienSavings: number
  netToClient: number
  netPct: number
  warnings: SettlementWarning[]
}

const LIEN_TYPES: { value: string; label: string }[] = [
  { value: 'medical_provider', label: 'Medical provider' },
  { value: 'health_insurer', label: 'Health insurer (subrogation)' },
  { value: 'medicare', label: 'Medicare' },
  { value: 'medicaid', label: 'Medicaid' },
  { value: 'medpay', label: 'MedPay' },
  { value: 'erisa', label: 'ERISA plan' },
  { value: 'workers_comp', label: "Workers' comp" },
  { value: 'govt', label: 'Government' },
  { value: 'other', label: 'Other' },
]

const LIEN_STATUSES: { value: string; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'waived', label: 'Waived' },
]

const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'filing', label: 'Filing fees' },
  { value: 'expert', label: 'Expert fees' },
  { value: 'records', label: 'Records retrieval' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'deposition', label: 'Deposition' },
  { value: 'service', label: 'Service of process' },
  { value: 'other', label: 'Other' },
]

function money(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(Math.round(n))
  return `${n < 0 ? '-' : ''}$${abs.toLocaleString()}`
}

function lienTypeLabel(t: string | null) {
  return LIEN_TYPES.find((x) => x.value === t)?.label ?? 'Other'
}

const WARNING_STYLES: Record<SettlementWarning['level'], { box: string; icon: ReactNode }> = {
  danger: {
    box: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: <ShieldAlert className="h-5 w-5 shrink-0 text-rose-500" />,
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />,
  },
  info: {
    box: 'border-sky-200 bg-sky-50 text-sky-800',
    icon: <Info className="h-5 w-5 shrink-0 text-sky-500" />,
  },
}

export default function SettlementPanel({ leadId }: { leadId: string }) {
  const [data, setData] = useState<SettlementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingScenario, setSavingScenario] = useState(false)

  // Scenario input state (kept as strings for controlled inputs).
  const [grossInput, setGrossInput] = useState('')
  const [pctInput, setPctInput] = useState('')

  // Add forms
  const [newLien, setNewLien] = useState({ name: '', type: 'medical_provider', asserted: '' })
  const [newExpense, setNewExpense] = useState({ category: 'filing', description: '', amount: '' })
  const [showAddLien, setShowAddLien] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)

  const applyData = useCallback((d: SettlementData) => {
    setData(d)
    setGrossInput(d.gross ? String(Math.round(d.gross)) : '')
    setPctInput(d.contingencyPct != null ? String(d.contingencyPct) : '')
  }, [])

  const load = useCallback(async () => {
    try {
      setError(null)
      const d = await getLeadSettlement(leadId)
      applyData(d)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load settlement details.')
    } finally {
      setLoading(false)
    }
  }, [leadId, applyData])

  useEffect(() => {
    void load()
  }, [load])

  const saveScenario = useCallback(
    async (patch: Record<string, unknown>) => {
      setSavingScenario(true)
      try {
        const d = await updateLeadSettlement(leadId, patch)
        applyData(d)
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Could not save settlement inputs.')
      } finally {
        setSavingScenario(false)
      }
    },
    [leadId, applyData],
  )

  // Re-fetch the waterfall after a lien/expense mutation (server recomputes net).
  const refresh = useCallback(async () => {
    try {
      const d = await getLeadSettlement(leadId)
      applyData(d)
    } catch {
      /* keep previous data on transient failure */
    }
  }, [leadId, applyData])

  const addLien = async () => {
    if (!newLien.name.trim()) return
    await createLeadLien(leadId, {
      name: newLien.name.trim(),
      type: newLien.type,
      amount: newLien.asserted || null,
      status: 'open',
    })
    setNewLien({ name: '', type: 'medical_provider', asserted: '' })
    setShowAddLien(false)
    await refresh()
  }

  const patchLien = async (id: string, patch: Record<string, unknown>) => {
    await updateLeadLien(leadId, id, patch)
    await refresh()
  }

  const removeLien = async (id: string) => {
    await deleteLeadLien(leadId, id)
    await refresh()
  }

  const addExpense = async () => {
    if (!newExpense.description.trim() || !newExpense.amount) return
    await createLeadExpense(leadId, {
      category: newExpense.category,
      description: newExpense.description.trim(),
      amount: newExpense.amount,
    })
    setNewExpense({ category: 'filing', description: '', amount: '' })
    setShowAddExpense(false)
    await refresh()
  }

  const removeExpense = async (id: string) => {
    await deleteLeadExpense(leadId, id)
    await refresh()
  }

  if (loading) return <p className="text-sm text-slate-500">Loading settlement…</p>
  if (error && !data) return <p className="text-sm text-rose-600">{error}</p>
  if (!data) return null

  const waterfall = [
    { label: 'Client net', amount: Math.max(0, data.netToClient), bar: 'bg-emerald-500' },
    { label: 'Attorney fee', amount: data.attorneyFee, bar: 'bg-brand-500' },
    { label: 'Medical liens', amount: data.liensFinal, bar: 'bg-amber-500' },
    { label: 'Case costs', amount: data.costs, bar: 'bg-slate-400' },
  ].filter((p) => p.amount > 0)
  const waterfallTotal = waterfall.reduce((s, p) => s + p.amount, 0) || 1

  return (
    <div className="space-y-4">
      {/* Warnings — the guardrails */}
      {data.warnings.length > 0 && (
        <div className="space-y-2">
          {data.warnings.map((w, i) => {
            const s = WARNING_STYLES[w.level]
            return (
              <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${s.box}`}>
                {s.icon}
                <span className="font-medium leading-snug">{w.message}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Net-to-client hero + key tiles */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div
          className={`rounded-2xl border p-5 shadow-sm sm:col-span-1 ${
            data.netToClient <= 0 && data.gross > 0
              ? 'border-rose-200 bg-rose-50'
              : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client net</p>
          <p
            className={`mt-1 text-3xl font-bold tabular-nums ${
              data.netToClient <= 0 && data.gross > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {money(data.netToClient)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {data.gross > 0 ? `${Math.round(data.netPct * 100)}% of gross recovery` : 'Add a gross recovery'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gross recovery</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(data.gross)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {data.grossIsEstimate ? `Estimate · model median ${money(data.predictedMedian)}` : 'Attorney entry'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attorney fee</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(data.attorneyFee)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {data.contingencyPct}% {data.feeBasis === 'net_of_costs' ? 'of net-of-costs' : 'of gross'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Liens (payable)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(data.liensFinal)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {data.lienSavings > 0 ? `Reduced ${money(data.lienSavings)} from ${money(data.liensAsserted)}` : `${money(data.liensAsserted)} asserted`}
          </p>
        </div>
      </div>

      {/* Disbursement waterfall */}
      {data.gross > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-slate-400" /> Disbursement of {money(data.gross)}
            </h3>
          </div>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
            {waterfall.map((p) => (
              <div
                key={p.label}
                className={p.bar}
                style={{ width: `${(p.amount / waterfallTotal) * 100}%` }}
                title={`${p.label}: ${money(p.amount)}`}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {waterfall.map((p) => (
              <li key={p.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${p.bar}`} />
                  <span className="text-slate-600">{p.label}</span>
                  <span className="text-xs text-slate-400">{Math.round((p.amount / waterfallTotal) * 100)}%</span>
                </span>
                <span className="font-semibold text-slate-900">{money(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scenario inputs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Settlement inputs</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Gross recovery ($)</span>
            <input
              type="number"
              inputMode="numeric"
              value={grossInput}
              placeholder={data.predictedMedian ? String(Math.round(data.predictedMedian)) : 'e.g. 150000'}
              onChange={(e) => setGrossInput(e.target.value)}
              onBlur={() => {
                const v = grossInput.trim()
                saveScenario({ grossAmount: v === '' ? null : Number(v) })
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <span className="mt-1 block text-[11px] text-slate-400">Blank = use the model estimate.</span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-500">Contingency fee (%)</span>
            <input
              type="number"
              inputMode="decimal"
              value={pctInput}
              onChange={(e) => setPctInput(e.target.value)}
              onBlur={() => {
                const v = pctInput.trim()
                if (v !== '') saveScenario({ contingencyPct: Number(v) })
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-500">Fee calculated on</span>
            <select
              value={data.feeBasis}
              onChange={(e) => saveScenario({ feeBasis: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="gross">Gross recovery</option>
              <option value="net_of_costs">Net of case costs</option>
            </select>
          </label>
        </div>
        {savingScenario && <p className="mt-2 text-xs text-slate-400">Saving…</p>}
      </div>

      {/* Liens */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <TrendingDown className="h-4 w-4 text-amber-500" /> Medical liens & subrogation
          </h3>
          <button
            type="button"
            onClick={() => setShowAddLien((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add lien
          </button>
        </div>

        {showAddLien && (
          <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_140px_auto]">
            <input
              value={newLien.name}
              onChange={(e) => setNewLien({ ...newLien, name: e.target.value })}
              placeholder="Lienholder name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <select
              value={newLien.type}
              onChange={(e) => setNewLien({ ...newLien, type: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {LIEN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={newLien.asserted}
              onChange={(e) => setNewLien({ ...newLien, asserted: e.target.value })}
              placeholder="Asserted $"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={addLien}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Add
            </button>
          </div>
        )}

        {data.liens.length === 0 ? (
          <p className="text-sm text-slate-400">No liens recorded. Add medical provider, health-insurer, or statutory liens to model the client's true net.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-3 font-medium">Lienholder</th>
                  <th className="pb-2 pr-3 font-medium">Asserted</th>
                  <th className="pb-2 pr-3 font-medium">Negotiated</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 text-right font-medium">Savings</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.liens.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-800">{l.name}</div>
                      <div className="text-xs text-slate-400">{lienTypeLabel(l.type)}</div>
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-slate-600">{money(l.asserted)}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        defaultValue={l.negotiated && l.status !== 'waived' ? Math.round(l.final) : ''}
                        placeholder={l.status === 'waived' ? 'waived' : 'not set'}
                        disabled={l.status === 'waived'}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          patchLien(l.id, { finalAmount: v === '' ? null : Number(v) })
                        }}
                        className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={l.status}
                        onChange={(e) => patchLien(l.id, { status: e.target.value })}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        {LIEN_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-600">
                      {l.savings > 0 ? money(l.savings) : '—'}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeLien(l.id)}
                        aria-label="Delete lien"
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 text-sm font-semibold text-slate-800">
                  <td className="pt-2 pr-3">Total payable</td>
                  <td className="pt-2 pr-3 tabular-nums text-slate-500">{money(data.liensAsserted)}</td>
                  <td className="pt-2 pr-3 tabular-nums">{money(data.liensFinal)}</td>
                  <td />
                  <td className="pt-2 pr-3 text-right tabular-nums text-emerald-600">
                    {data.lienSavings > 0 ? money(data.lienSavings) : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Case costs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Receipt className="h-4 w-4 text-slate-400" /> Case costs advanced
          </h3>
          <button
            type="button"
            onClick={() => setShowAddExpense((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add cost
          </button>
        </div>

        {showAddExpense && (
          <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[160px_1fr_140px_auto]">
            <select
              value={newExpense.category}
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              placeholder="Description"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <input
              type="number"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              placeholder="Amount $"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={addExpense}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Add
            </button>
          </div>
        )}

        {/* Recoverable staff (paralegal) time — approved billable non-attorney hours. */}
        {data.staffTime.amount > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={data.staffTime.included}
                onChange={(e) => saveScenario({ includeStaffTime: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-700">Recoverable staff time</span>
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {data.staffTime.hours} hrs · approved
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  Approved billable paralegal/staff time (attorney time is covered by the fee). Check to add it to
                  case costs.
                </span>
              </span>
            </label>
            <span className={`font-semibold tabular-nums ${data.staffTime.included ? 'text-slate-900' : 'text-slate-400'}`}>
              {money(data.staffTime.amount)}
            </span>
          </div>
        )}

        {data.costItems.length === 0 && data.staffTime.amount === 0 ? (
          <p className="text-sm text-slate-400">No case costs recorded yet.</p>
        ) : data.costItems.length === 0 ? (
          <p className="text-sm text-slate-400">No advanced expenses recorded (staff time shown above).</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.costItems.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-slate-300" />
                  <span className="text-slate-700">{c.description}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {EXPENSE_CATEGORIES.find((x) => x.value === c.category)?.label ?? 'Other'}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-slate-900">{money(c.amount)}</span>
                  <button
                    type="button"
                    onClick={() => removeExpense(c.id)}
                    aria-label="Delete cost"
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between pt-2 text-sm font-semibold text-slate-800">
              <span>Total costs</span>
              <span className="pr-7 tabular-nums">{money(data.costs)}</span>
            </li>
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Planning estimate only. Net to client is modeled from the entered gross, the contingency fee, recorded case
        costs, and negotiated lien amounts. Final disbursement depends on the executed settlement and finalized liens;
        confirm statutory (Medicare/Medicaid) and ERISA liens before distributing funds.
      </p>
    </div>
  )
}
