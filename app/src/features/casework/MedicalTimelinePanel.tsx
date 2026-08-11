/**
 * Editable case-level medical timeline for the attorney case workspace.
 *
 * Structured treatment episodes + an evolving medical status (MMI / treatment
 * status / symptoms / future plan). Rollups write through to facts.treatment[]
 * and facts.medical.* on the server, so demand-readiness, the treatment-gap
 * coach, and the valuation engine reflect it.
 *
 * Rendered ABOVE the read-only, evidence-derived chronology on the Medical tab.
 * Backed by /v1/attorney-dashboard/leads/:leadId/medical-timeline.
 */
import { useCallback, useEffect, useState } from 'react'
import { Stethoscope, Plus, Trash2, Activity, CalendarClock, AlertTriangle, Pencil, X } from 'lucide-react'
import {
  getLeadMedicalTimeline,
  createLeadMedicalEntry,
  updateLeadMedicalEntry,
  deleteLeadMedicalEntry,
  updateLeadMedicalStatus,
} from '../../lib/api'
import ConfirmDialog from '../../components/ConfirmDialog'

interface Entry {
  id: string
  provider: string
  specialty: string | null
  visitType: string
  startDate: string | null
  endDate: string | null
  status: string
  diagnosis: string | null
  billedAmount: number | null
  isFuture: boolean
  notes: string | null
}

interface Timeline {
  entries: Entry[]
  status: {
    id: string | null
    treatmentStatus: string
    mmi: boolean
    mmiDate: string | null
    stillTreating: boolean
    symptoms: string[]
    futureTreatment: string | null
    futureCostEstimate: number | null
    notes: string | null
  }
  providerCount: number
  visitCount: number
  firstTreatmentDate: string | null
  lastTreatmentDate: string | null
  gaps: Array<{ afterDate: string; beforeDate: string; gapDays: number }>
  billedTotal: number
  updatedAt: string | null
}

const VISIT_TYPES = [
  { value: 'initial_eval', label: 'Initial eval' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'therapy', label: 'Therapy (PT/chiro)' },
  { value: 'er', label: 'ER / urgent care' },
  { value: 'other', label: 'Other' },
]

const ENTRY_STATUSES = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'discharged', label: 'Discharged' },
  { value: 'referred_out', label: 'Referred out' },
  { value: 'no_show', label: 'No-show' },
]

const TREATMENT_STATUSES = [
  { value: 'treating', label: 'Actively treating' },
  { value: 'completed', label: 'Treatment complete' },
  { value: 'mmi', label: 'At MMI' },
  { value: 'discharged', label: 'Discharged' },
  { value: 'unknown', label: 'Unknown' },
]

const EMPTY_FORM = {
  provider: '',
  specialty: '',
  visitType: 'follow_up',
  startDate: '',
  endDate: '',
  status: 'completed',
  diagnosis: '',
  billedAmount: '',
  isFuture: false,
}

function money(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function dateInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

const visitLabel = (v: string) => VISIT_TYPES.find((x) => x.value === v)?.label ?? 'Visit'

export default function MedicalTimelinePanel({ leadId }: { leadId: string }) {
  const [data, setData] = useState<Timeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formBusy, setFormBusy] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [symptomInput, setSymptomInput] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await getLeadMedicalTimeline(leadId)
      setData(res.timeline)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load the medical timeline.')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])

  const saveStatus = async (patch: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await updateLeadMedicalStatus(leadId, patch)
      setData(res.timeline)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save medical status.')
    } finally {
      setSaving(false)
    }
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (entry: Entry) => {
    setEditingId(entry.id)
    setForm({
      provider: entry.provider || '',
      specialty: entry.specialty || '',
      visitType: entry.visitType || 'follow_up',
      startDate: dateInput(entry.startDate),
      endDate: dateInput(entry.endDate),
      status: entry.status || 'completed',
      diagnosis: entry.diagnosis || '',
      billedAmount: entry.billedAmount != null ? String(entry.billedAmount) : '',
      isFuture: Boolean(entry.isFuture),
    })
    setFormError(null)
    setFormOpen(true)
  }

  const saveEntry = async () => {
    if (!form.provider.trim()) {
      setFormError('Enter a provider.')
      return
    }
    setFormError(null)
    setFormBusy(true)
    const payload = {
      ...form,
      billedAmount: form.billedAmount === '' ? null : Number(form.billedAmount),
    }
    try {
      const res = editingId
        ? await updateLeadMedicalEntry(leadId, editingId, payload)
        : await createLeadMedicalEntry(leadId, payload)
      setData(res.timeline)
      closeForm()
    } catch (err: any) {
      setFormError(err?.response?.data?.error || (editingId ? 'Could not update visit.' : 'Could not add visit.'))
    } finally {
      setFormBusy(false)
    }
  }

  const confirmRemoveEntry = async () => {
    const entry = entryToDelete
    if (!entry) return
    setDeleting(true)
    setError(null)
    try {
      const res = await deleteLeadMedicalEntry(leadId, entry.id)
      setData(res.timeline)
      setEntryToDelete(null)
      if (editingId === entry.id) closeForm()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not delete this visit.')
    } finally {
      setDeleting(false)
    }
  }

  const addSymptom = () => {
    const v = symptomInput.trim()
    if (!v || !data) return
    if (data.status.symptoms.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setSymptomInput('')
      return
    }
    void saveStatus({ symptoms: [...data.status.symptoms, v] })
    setSymptomInput('')
  }

  const removeSymptom = (s: string) => {
    if (!data) return
    void saveStatus({ symptoms: data.status.symptoms.filter((x) => x !== s) })
  }

  if (loading) return <p className="text-sm text-slate-500">Loading medical timeline…</p>
  if (error && !data) return <p className="text-sm text-rose-600">{error}</p>
  if (!data) return null

  const st = data.status
  const past = data.entries.filter((e) => !e.isFuture)
  const future = data.entries.filter((e) => e.isFuture)
  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  const VisitActions = ({ entry }: { entry: Entry }) => (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => openEdit(entry)}
        aria-label={`Edit visit with ${entry.provider}`}
        title="Edit this visit"
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <button
        type="button"
        onClick={() => setEntryToDelete(entry)}
        aria-label={`Delete visit with ${entry.provider}`}
        title="Delete this visit"
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={Boolean(entryToDelete)}
        title="Delete visit?"
        message={
          entryToDelete ? (
            <>
              Remove <span className="font-semibold">{entryToDelete.provider}</span>
              {entryToDelete.startDate ? ` (${fmtDate(entryToDelete.startDate)})` : ''} from the treatment timeline?
              This can’t be undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete visit"
        busy={deleting}
        onConfirm={() => void confirmRemoveEntry()}
        onCancel={() => {
          if (!deleting) setEntryToDelete(null)
        }}
      />

      {error ? (
        <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </div>
      ) : null}

      {/* Status hero */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Activity className="h-3.5 w-3.5 text-brand-400" /> Treatment status
          </p>
          <select
            value={st.treatmentStatus}
            onChange={(e) => {
              const v = e.target.value
              saveStatus({ treatmentStatus: v, mmi: v === 'mmi' ? true : st.mmi, stillTreating: v === 'treating' })
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {TREATMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={st.mmi} onChange={(e) => saveStatus({ mmi: e.target.checked })} /> At MMI
          </label>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">MMI / discharge date</p>
          <input
            type="date"
            value={dateInput(st.mmiDate)}
            onChange={(e) => saveStatus({ mmiDate: e.target.value || null })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-2 text-[11px] text-slate-400">Demand-readiness needs MMI or treatment complete.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visits · providers</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {data.visitCount} <span className="text-base font-medium text-slate-400">· {data.providerCount}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {fmtDate(data.firstTreatmentDate)} – {fmtDate(data.lastTreatmentDate)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billed (timeline)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(data.billedTotal)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Enter bills in Damages for valuation.</p>
        </div>
      </div>

      {data.gaps.length > 0 && (
        <div className="space-y-2">
          {data.gaps.map((g, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <span className="font-medium">
                {g.gapDays}-day treatment gap between {fmtDate(g.afterDate)} and {fmtDate(g.beforeDate)}. Defense will
                argue the injury resolved — document the reason.
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Stethoscope className="h-4 w-4 text-slate-400" /> Treatment timeline
          </h3>
          {!formOpen ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add visit
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
          <div className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            <p className="col-span-full text-xs font-semibold uppercase tracking-wide text-slate-500">
              {editingId ? 'Edit visit' : 'New visit'}
            </p>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Provider</span>
              <input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Bay Area Ortho" className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Specialty</span>
              <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Orthopedics" className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Type</span>
              <select value={form.visitType} onChange={(e) => setForm({ ...form, visitType: e.target.value })} className={inputCls}>
                {VISIT_TYPES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                {ENTRY_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Start date</span>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">End / last visit</span>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Diagnosis</span>
              <input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="e.g. L4-L5 disc herniation" className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Billed ($)</span>
              <input type="number" value={form.billedAmount} onChange={(e) => setForm({ ...form, billedAmount: e.target.value })} className={inputCls} />
            </label>
            <label className="col-span-full flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.isFuture} onChange={(e) => setForm({ ...form, isFuture: e.target.checked })} />
              This is recommended <span className="font-medium">future</span> treatment (not yet received)
            </label>
            <div className="col-span-full flex items-center gap-2">
              <button
                type="button"
                onClick={() => void saveEntry()}
                disabled={formBusy}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {formBusy ? 'Saving…' : editingId ? 'Save changes' : 'Add visit'}
              </button>
              {formError && <span className="text-xs text-rose-600">{formError}</span>}
            </div>
          </div>
        )}

        {past.length === 0 ? (
          <p className="text-sm text-slate-400">
            No treatment entries yet. Build the chronology from the medical records — it drives demand-readiness,
            treatment-gap detection, and the case value.
          </p>
        ) : (
          <ol className="relative space-y-3 border-l border-slate-200 pl-5">
            {past.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-400 ring-4 ring-white" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">{e.provider}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        {visitLabel(e.visitType)}
                      </span>
                      {e.status !== 'completed' ? (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-600">
                          {e.status.replace('_', ' ')}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-400">
                      {fmtDate(e.startDate)}
                      {e.endDate && e.endDate !== e.startDate ? ` – ${fmtDate(e.endDate)}` : ''}
                      {e.specialty ? ` · ${e.specialty}` : ''}
                      {e.diagnosis ? ` · ${e.diagnosis}` : ''}
                      {e.billedAmount ? ` · ${money(e.billedAmount)}` : ''}
                    </div>
                  </div>
                  <VisitActions entry={e} />
                </div>
              </li>
            ))}
          </ol>
        )}

        {future.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <CalendarClock className="h-3.5 w-3.5" /> Recommended future treatment
            </p>
            <ul className="space-y-2">
              {future.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-slate-700">{e.provider}</span>
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-600">
                      {visitLabel(e.visitType)}
                    </span>
                    {e.diagnosis ? <span className="text-xs text-slate-400">{e.diagnosis}</span> : null}
                    {e.billedAmount ? <span className="text-xs text-slate-400">· {money(e.billedAmount)}</span> : null}
                  </span>
                  <VisitActions entry={e} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Current symptoms / complaints</h3>
          <div className="flex flex-wrap gap-1.5">
            {st.symptoms.length === 0 && <span className="text-sm text-slate-400">None recorded.</span>}
            {st.symptoms.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {s}
                <button type="button" onClick={() => removeSymptom(s)} className="text-slate-400 hover:text-rose-600" aria-label={`Remove ${s}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSymptom()
                }
              }}
              placeholder="Add a symptom and press Enter"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button type="button" onClick={addSymptom} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Add
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Future treatment plan</h3>
          <textarea
            rows={3}
            defaultValue={st.futureTreatment ?? ''}
            onBlur={(e) => saveStatus({ futureTreatment: e.target.value })}
            placeholder="e.g. Recommended L4-L5 microdiscectomy; 12 weeks post-op PT."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <label className="mt-3 block">
            <span className="text-xs font-medium text-slate-500">Future cost estimate ($)</span>
            <input
              type="number"
              defaultValue={st.futureCostEstimate ?? ''}
              onBlur={(e) => saveStatus({ futureCostEstimate: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="planning estimate"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <span className="mt-1 block text-[11px] text-slate-400">
              Add a <span className="font-medium">future medical</span> item in Damages to include it in the case value.
            </span>
          </label>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {saving ? 'Saving…' : 'The medical timeline feeds demand-readiness (MMI / treatment complete), treatment-gap detection, and the valuation engine automatically.'}
      </p>
    </div>
  )
}
