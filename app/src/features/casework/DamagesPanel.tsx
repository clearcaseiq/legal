/**
 * Structured damages ledger for the attorney case workspace.
 *
 * An itemized, auditable record of the plaintiff's economic picture:
 *   medical (billed/paid/outstanding) · future medical · lost wages ·
 *   lost earning capacity · property damage · out-of-pocket · future costs
 *
 * Rollups are written through to the case's damages facts on the server, so the
 * valuation, demand, and settlement engines reflect what's entered here.
 * Backed by /v1/attorney-dashboard/leads/:leadId/damages.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Wallet, HeartPulse, Briefcase, Car, Pencil, X } from 'lucide-react'
import { getLeadDamages, createLeadDamage, updateLeadDamage, deleteLeadDamage } from '../../lib/api'
import ConfirmDialog from '../../components/ConfirmDialog'

interface DamageItem {
  id: string
  category: string
  description: string
  amount: number
  billingStatus: string | null
  provider: string | null
  incurredAt: string | null
  isFuture: boolean
  source: string
  notes: string | null
}

interface DamagesSummary {
  medical: { billed: number; paid: number; outstanding: number; incurred: number }
  futureMedical: number
  lostWages: number
  lostEarningCapacity: number
  propertyDamage: number
  outOfPocket: number
  futureCost: number
  other: number
  totals: { specials: number; future: number; grand: number }
  itemCount: number
}

const CATEGORIES: { value: string; label: string; group: string }[] = [
  { value: 'medical', label: 'Medical bill', group: 'Medical' },
  { value: 'future_medical', label: 'Future medical', group: 'Medical' },
  { value: 'lost_wages', label: 'Lost wages', group: 'Income' },
  { value: 'lost_earning_capacity', label: 'Lost earning capacity', group: 'Income' },
  { value: 'property_damage', label: 'Property damage', group: 'Other' },
  { value: 'out_of_pocket', label: 'Out-of-pocket', group: 'Other' },
  { value: 'future_cost', label: 'Future cost', group: 'Other' },
  { value: 'other', label: 'Other', group: 'Other' },
]

const MEDICAL_STATUSES = [
  { value: '', label: '—' },
  { value: 'billed', label: 'Billed' },
  { value: 'paid', label: 'Paid' },
  { value: 'outstanding', label: 'Outstanding' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'written_off', label: 'Written off' },
]

function money(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(Math.round(n))
  return `${n < 0 ? '-' : ''}$${abs.toLocaleString()}`
}

function catLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? 'Other'
}

export default function DamagesPanel({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<DamageItem[]>([])
  const [summary, setSummary] = useState<DamagesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formBusy, setFormBusy] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<DamageItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    category: 'medical',
    description: '',
    amount: '',
    billingStatus: 'billed',
    provider: '',
  })

  const emptyForm = () => ({
    category: 'medical',
    description: '',
    amount: '',
    billingStatus: 'billed',
    provider: '',
  })

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (it: DamageItem) => {
    setEditingId(it.id)
    setForm({
      category: it.category || 'medical',
      description: it.description || '',
      amount: String(Math.round(it.amount)),
      billingStatus: it.billingStatus || 'billed',
      provider: it.provider || '',
    })
    setFormError(null)
    setFormOpen(true)
  }

  const load = useCallback(async () => {
    try {
      setError(null)
      const d = await getLeadDamages(leadId)
      setItems(Array.isArray(d.items) ? d.items : [])
      setSummary(d.summary || null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load damages.')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])

  const isMedical = form.category === 'medical'

  const saveItem = async () => {
    if (!form.description.trim()) {
      setFormError('Enter a description.')
      return
    }
    if (!form.amount || Number.isNaN(Number(form.amount))) {
      setFormError('Enter an amount.')
      return
    }
    setFormError(null)
    setFormBusy(true)
    const payload = {
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount),
      billingStatus: isMedical ? form.billingStatus || null : null,
      provider: form.provider.trim() || null,
    }
    try {
      const res = editingId
        ? await updateLeadDamage(leadId, editingId, payload)
        : await createLeadDamage(leadId, payload)
      setSummary(res.summary)
      closeForm()
      await load()
    } catch (err: any) {
      setFormError(err?.response?.data?.error || (editingId ? 'Could not update item.' : 'Could not add item.'))
    } finally {
      setFormBusy(false)
    }
  }

  const confirmRemove = async () => {
    const item = itemToDelete
    if (!item) return
    setDeleting(true)
    try {
      const res = await deleteLeadDamage(leadId, item.id)
      setSummary(res.summary)
      setItemToDelete(null)
      if (editingId === item.id) closeForm()
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not delete this item.')
    } finally {
      setDeleting(false)
    }
  }

  const grouped = useMemo(() => {
    const g: Record<string, DamageItem[]> = { Medical: [], Income: [], Other: [] }
    for (const it of items) {
      const group = CATEGORIES.find((c) => c.value === it.category)?.group || 'Other'
      g[group].push(it)
    }
    return g
  }, [items])

  if (loading) return <p className="text-sm text-slate-500">Loading damages…</p>
  if (error && !summary) return <p className="text-sm text-rose-600">{error}</p>

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={Boolean(itemToDelete)}
        title="Delete damages item?"
        message={
          itemToDelete ? (
            <>
              Remove <span className="font-semibold">{itemToDelete.description}</span> (
              {money(itemToDelete.amount)}) from the ledger? This can’t be undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete item"
        busy={deleting}
        onConfirm={() => void confirmRemove()}
        onCancel={() => {
          if (!deleting) setItemToDelete(null)
        }}
      />

      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <HeartPulse className="h-3.5 w-3.5 text-rose-400" /> Medical specials
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(summary?.medical.incurred)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {money(summary?.medical.outstanding)} outstanding · {money(summary?.medical.paid)} paid
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Briefcase className="h-3.5 w-3.5 text-brand-400" /> Wage loss
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(summary?.lostWages)}</p>
          <p className="mt-1 text-xs text-slate-400">{money(summary?.lostEarningCapacity)} earning capacity</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Car className="h-3.5 w-3.5 text-slate-400" /> Other + future
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {money((summary?.propertyDamage || 0) + (summary?.outOfPocket || 0) + (summary?.futureMedical || 0) + (summary?.futureCost || 0) + (summary?.other || 0))}
          </p>
          <p className="mt-1 text-xs text-slate-400">{money(summary?.futureMedical)} future medical</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Wallet className="h-3.5 w-3.5 text-emerald-500" /> Total damages
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">{money(summary?.totals.grand)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {money(summary?.totals.specials)} specials + {money(summary?.totals.future)} future
          </p>
        </div>
      </div>

      {/* Ledger */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Wallet className="h-4 w-4 text-slate-400" /> Damages ledger
          </h3>
          {!formOpen ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add item
            </button>
          ) : (
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
        </div>

        {formOpen && (
          <div className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[170px_1fr_130px_140px_auto]">
            <p className="col-span-full text-xs font-semibold uppercase tracking-wide text-slate-500">
              {editingId ? 'Edit item' : 'New item'}
            </p>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description / provider / payee"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Amount $"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {isMedical ? (
              <select
                value={form.billingStatus}
                onChange={(e) => setForm({ ...form, billingStatus: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {MEDICAL_STATUSES.filter((s) => s.value).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => void saveItem()}
              disabled={formBusy}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {formBusy ? 'Saving…' : editingId ? 'Save' : 'Add'}
            </button>
            {formError && <p className="col-span-full text-xs text-rose-600">{formError}</p>}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-slate-400">
            No damages recorded yet. Add medical bills, wage loss, and other economic damages to build the case's
            economic picture — these feed the valuation, demand, and settlement models.
          </p>
        ) : (
          <div className="space-y-4">
            {(['Medical', 'Income', 'Other'] as const).map((group) =>
              grouped[group].length === 0 ? null : (
                <div key={group}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{group}</p>
                  <ul className="divide-y divide-slate-100">
                    {grouped[group].map((it) => (
                      <li key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-slate-700">{it.description}</span>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            {catLabel(it.category)}
                          </span>
                          {it.category === 'medical' && it.billingStatus ? (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                it.billingStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : it.billingStatus === 'outstanding'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {it.billingStatus}
                            </span>
                          ) : null}
                          {it.isFuture ? (
                            <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-600">
                              future
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="mr-1 w-24 text-right text-sm font-medium tabular-nums text-slate-800">
                            {money(it.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => openEdit(it)}
                            aria-label="Edit item"
                            title="Edit this item"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete(it)}
                            aria-label="Delete item"
                            title="Delete this item"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        The damages ledger is the auditable source of truth for this case's economic damages. Totals flow into the
        valuation, demand package, and settlement waterfall automatically.
      </p>
    </div>
  )
}
