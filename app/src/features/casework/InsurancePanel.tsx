/**
 * Coverage / Insurance panel for the attorney case workspace.
 *
 * Surfaces the case's InsuranceDetail records with full view / add / edit /
 * delete, a "request Dec Page" action, and an intake-derived suggestion to
 * pre-fill a new policy. Backed by /v1/attorney-dashboard/leads/:leadId/insurance*.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Check,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import {
  getLeadInsurance,
  createLeadInsurance,
  updateLeadInsurance,
  deleteLeadInsurance,
  requestLeadDecPage,
  getLeadInsuranceSuggestion,
} from '../../lib/api'

type InsuredParty = 'defendant' | 'client'
type CoverageType = 'liability' | 'um' | 'uim' | 'medpay' | 'other'
type ClaimStatus = 'not_opened' | 'open' | 'accepted' | 'denied' | 'closed'

interface InsuranceRecord {
  id: string
  carrierName: string
  policyNumber: string | null
  policyLimit: number | null
  adjusterName: string | null
  adjusterEmail: string | null
  adjusterPhone: string | null
  notes: string | null
  insuredParty: InsuredParty | null
  coverageType: CoverageType | null
  claimNumber: string | null
  claimStatus: ClaimStatus
  claimOpenedAt: string | null
  decPageRequestId: string | null
  coverageConfirmed: boolean
  createdAt: string
  updatedAt: string
}

interface FormState {
  carrierName: string
  policyNumber: string
  policyLimit: string
  coverageType: CoverageType | ''
  insuredParty: InsuredParty | ''
  claimNumber: string
  claimStatus: ClaimStatus
  adjusterName: string
  adjusterEmail: string
  adjusterPhone: string
  notes: string
  coverageConfirmed: boolean
}

const EMPTY_FORM: FormState = {
  carrierName: '',
  policyNumber: '',
  policyLimit: '',
  coverageType: '',
  insuredParty: '',
  claimNumber: '',
  claimStatus: 'not_opened',
  adjusterName: '',
  adjusterEmail: '',
  adjusterPhone: '',
  notes: '',
  coverageConfirmed: false,
}

const COVERAGE_LABELS: Record<CoverageType, string> = {
  liability: 'Liability',
  um: 'UM',
  uim: 'UIM',
  medpay: 'MedPay',
  other: 'Other',
}

const PARTY_LABELS: Record<InsuredParty, string> = {
  defendant: "Defendant's insurer",
  client: "Client's policy",
}

const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  not_opened: 'Not opened',
  open: 'Open',
  accepted: 'Accepted',
  denied: 'Denied',
  closed: 'Closed',
}

const CLAIM_STATUS_BADGE: Record<ClaimStatus, string> = {
  not_opened: 'bg-slate-100 text-slate-600 ring-slate-200',
  open: 'bg-sky-50 text-sky-700 ring-sky-200',
  accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  denied: 'bg-rose-50 text-rose-700 ring-rose-200',
  closed: 'bg-slate-100 text-slate-500 ring-slate-200',
}

function money(n?: number | null) {
  if (n == null || !Number.isFinite(n) || n <= 0) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

function fromRecord(r: InsuranceRecord): FormState {
  return {
    carrierName: r.carrierName || '',
    policyNumber: r.policyNumber || '',
    policyLimit: r.policyLimit != null ? String(r.policyLimit) : '',
    coverageType: (r.coverageType as CoverageType) || '',
    insuredParty: (r.insuredParty as InsuredParty) || '',
    claimNumber: r.claimNumber || '',
    claimStatus: r.claimStatus || 'not_opened',
    adjusterName: r.adjusterName || '',
    adjusterEmail: r.adjusterEmail || '',
    adjusterPhone: r.adjusterPhone || '',
    notes: r.notes || '',
    coverageConfirmed: Boolean(r.coverageConfirmed),
  }
}

export default function InsurancePanel({ leadId }: { leadId: string; claimType?: string }) {
  const [records, setRecords] = useState<InsuranceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<any | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getLeadInsurance(leadId)
      setRecords(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load insurance details.')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void load()
    getLeadInsuranceSuggestion(leadId)
      .then((s: any) => setSuggestion(s?.available ? s : null))
      .catch(() => setSuggestion(null))
  }, [leadId, load])

  const totalCoverage = records.reduce((sum, r) => sum + (r.policyLimit || 0), 0)

  const startAdd = () => {
    setForm(EMPTY_FORM)
    setEditingId('new')
    setBanner(null)
  }

  const startEdit = (r: InsuranceRecord) => {
    setForm(fromRecord(r))
    setEditingId(r.id)
    setBanner(null)
  }

  const applySuggestion = () => {
    const s = suggestion?.suggestion || {}
    setForm({
      ...EMPTY_FORM,
      carrierName: s.carrierName || '',
      policyLimit: s.policyLimit != null ? String(s.policyLimit) : '',
      coverageType: (s.coverageType as CoverageType) || '',
      insuredParty: (s.insuredParty as InsuredParty) || '',
    })
    setEditingId('new')
    setBanner(null)
  }

  const cancel = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!form.carrierName.trim()) {
      setBanner({ tone: 'err', text: 'Carrier name is required.' })
      return
    }
    setSaving(true)
    setBanner(null)
    const limit = Number(String(form.policyLimit).replace(/[^0-9.]/g, ''))
    const payload = {
      carrierName: form.carrierName.trim(),
      policyNumber: form.policyNumber.trim() || null,
      policyLimit: Number.isFinite(limit) && limit > 0 ? limit : null,
      coverageType: form.coverageType || null,
      insuredParty: form.insuredParty || null,
      claimNumber: form.claimNumber.trim() || null,
      claimStatus: form.claimStatus,
      adjusterName: form.adjusterName.trim() || null,
      adjusterEmail: form.adjusterEmail.trim() || null,
      adjusterPhone: form.adjusterPhone.trim() || null,
      notes: form.notes.trim() || null,
      coverageConfirmed: form.coverageConfirmed,
    }
    try {
      if (editingId === 'new') {
        await createLeadInsurance(leadId, payload)
        setBanner({ tone: 'ok', text: 'Policy added.' })
      } else if (editingId) {
        await updateLeadInsurance(leadId, editingId, payload)
        setBanner({ tone: 'ok', text: 'Policy updated.' })
      }
      setEditingId(null)
      setForm(EMPTY_FORM)
      await load()
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Could not save the policy.' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (r: InsuranceRecord) => {
    if (!window.confirm(`Delete the ${r.carrierName} policy? This can't be undone.`)) return
    setBusyId(r.id)
    setBanner(null)
    try {
      await deleteLeadInsurance(leadId, r.id)
      setBanner({ tone: 'ok', text: 'Policy deleted.' })
      await load()
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Could not delete the policy.' })
    } finally {
      setBusyId(null)
    }
  }

  const requestDec = async (r: InsuranceRecord) => {
    setBusyId(r.id)
    setBanner(null)
    try {
      await requestLeadDecPage(leadId, r.id)
      setBanner({ tone: 'ok', text: `Requested the declarations page from ${r.carrierName}.` })
      await load()
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Could not request the Dec page.' })
    } finally {
      setBusyId(null)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
  const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500'

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">Loading coverage…</div>
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{records.length}</span> polic{records.length === 1 ? 'y' : 'ies'}
          {totalCoverage > 0 ? (
            <>
              <span className="text-slate-300">·</span>
              <span>
                Documented coverage <span className="font-semibold text-slate-900">{money(totalCoverage)}</span>
              </span>
            </>
          ) : null}
        </div>
        {editingId === null ? (
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add policy
          </button>
        ) : null}
      </div>

      {banner ? (
        <div className={`rounded-lg px-3 py-2 text-sm ${banner.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {banner.text}
        </div>
      ) : null}

      {/* Intake-derived suggestion */}
      {suggestion && editingId === null && !records.length ? (
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Suggested from intake · {suggestion.claimTypeLabel}</p>
              <p className="mt-0.5 text-sm text-slate-600">{suggestion.rationale}</p>
              {Array.isArray(suggestion.warnings) && suggestion.warnings.length ? (
                <ul className="mt-1.5 space-y-1">
                  {suggestion.warnings.map((w: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={applySuggestion}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
              >
                <Plus className="h-3.5 w-3.5" /> Pre-fill a policy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add / edit form */}
      {editingId !== null ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">{editingId === 'new' ? 'Add policy' : 'Edit policy'}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Carrier name *</label>
              <input className={inputCls} value={form.carrierName} onChange={(e) => set('carrierName', e.target.value)} placeholder="e.g. State Farm" />
            </div>
            <div>
              <label className={labelCls}>Policy limit</label>
              <input className={inputCls} value={form.policyLimit} onChange={(e) => set('policyLimit', e.target.value)} placeholder="e.g. 100000" inputMode="numeric" />
            </div>
            <div>
              <label className={labelCls}>Coverage type</label>
              <select className={inputCls} value={form.coverageType} onChange={(e) => set('coverageType', e.target.value as CoverageType | '')}>
                <option value="">—</option>
                {(Object.keys(COVERAGE_LABELS) as CoverageType[]).map((k) => (
                  <option key={k} value={k}>{COVERAGE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Insured party</label>
              <select className={inputCls} value={form.insuredParty} onChange={(e) => set('insuredParty', e.target.value as InsuredParty | '')}>
                <option value="">—</option>
                {(Object.keys(PARTY_LABELS) as InsuredParty[]).map((k) => (
                  <option key={k} value={k}>{PARTY_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Policy number</label>
              <input className={inputCls} value={form.policyNumber} onChange={(e) => set('policyNumber', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Claim number</label>
              <input className={inputCls} value={form.claimNumber} onChange={(e) => set('claimNumber', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Claim status</label>
              <select className={inputCls} value={form.claimStatus} onChange={(e) => set('claimStatus', e.target.value as ClaimStatus)}>
                {(Object.keys(CLAIM_STATUS_LABELS) as ClaimStatus[]).map((k) => (
                  <option key={k} value={k}>{CLAIM_STATUS_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Adjuster name</label>
              <input className={inputCls} value={form.adjusterName} onChange={(e) => set('adjusterName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Adjuster email</label>
              <input className={inputCls} value={form.adjusterEmail} onChange={(e) => set('adjusterEmail', e.target.value)} type="email" />
            </div>
            <div>
              <label className={labelCls}>Adjuster phone</label>
              <input className={inputCls} value={form.adjusterPhone} onChange={(e) => set('adjusterPhone', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea className={`${inputCls} min-h-[72px] resize-y`} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.coverageConfirmed} onChange={(e) => set('coverageConfirmed', e.target.checked)} />
              Coverage confirmed (e.g. verified against the declarations page)
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" onClick={cancel} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <X className="h-4 w-4" /> Cancel
            </button>
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50">
              <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Save policy'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Records */}
      {records.map((r) => (
        <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Shield className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">{r.carrierName}</h3>
                  {r.coverageType ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">{COVERAGE_LABELS[r.coverageType]}</span>
                  ) : null}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${CLAIM_STATUS_BADGE[r.claimStatus]}`}>{CLAIM_STATUS_LABELS[r.claimStatus]}</span>
                  {r.coverageConfirmed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <Check className="h-3 w-3" /> Confirmed
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">Unconfirmed</span>
                  )}
                </div>
                {r.insuredParty ? <p className="mt-0.5 text-xs text-slate-500">{PARTY_LABELS[r.insuredParty]}</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => startEdit(r)} disabled={editingId !== null} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button type="button" onClick={() => remove(r)} disabled={busyId === r.id || editingId !== null} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-40">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Policy limit" value={money(r.policyLimit)} accent />
            <Field label="Policy #" value={r.policyNumber || '—'} />
            <Field label="Claim #" value={r.claimNumber || '—'} />
            <Field label="Adjuster" value={r.adjusterName || '—'} />
          </div>

          {(r.adjusterEmail || r.adjusterPhone || r.notes) ? (
            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-500">
              {r.adjusterEmail ? <p>Email: <span className="text-slate-700">{r.adjusterEmail}</span></p> : null}
              {r.adjusterPhone ? <p>Phone: <span className="text-slate-700">{r.adjusterPhone}</span></p> : null}
              {r.notes ? <p className="text-slate-600">{r.notes}</p> : null}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-400">
              {r.decPageRequestId ? 'Dec page requested' : 'Dec page not requested'}
            </span>
            <button
              type="button"
              onClick={() => requestDec(r)}
              disabled={busyId === r.id || editingId !== null || Boolean(r.decPageRequestId)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <FileText className="h-3.5 w-3.5" /> {r.decPageRequestId ? 'Requested' : 'Request Dec page'}
            </button>
          </div>
        </div>
      ))}

      {!records.length && editingId === null ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
            <Shield className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-700">No coverage recorded yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Add the carrier and policy limit so it populates the case header, demand strategy, and readiness score.
          </p>
          <button
            type="button"
            onClick={startAdd}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add policy
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${accent ? 'border-brand-100 bg-brand-50/50' : 'border-slate-200 bg-slate-50/60'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-bold ${accent ? 'text-brand-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
