/**
 * Living liability record for the attorney case workspace.
 *
 * A single evolving analysis of WHO is at fault and HOW PROVABLE it is:
 *   fault theory · posture · defendant/comparative split · police report ·
 *   citation · witnesses · photos · video · defendant identification
 *
 * A derived liability-strength score (attorney can override) summarizes it, and
 * the rollup writes through to facts.liability so the valuation and demand
 * engines reflect it. Backed by /v1/attorney-dashboard/leads/:leadId/liability.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Gavel, FileText, Users, Camera, Video, ShieldCheck } from 'lucide-react'
import { getLeadLiability, updateLeadLiability } from '../../lib/api'

interface Liability {
  id: string | null
  faultTheory: string | null
  faultPosture: string
  defendantFaultPct: number
  comparativeNegPct: number
  policeReportStatus: string
  policeReportNumber: string | null
  citationIssuedTo: string | null
  hasWitnesses: boolean
  witnessCount: number
  hasPhotos: boolean
  hasVideo: boolean
  defendantName: string | null
  defendantInsurer: string | null
  strengthOverride: number | null
  notes: string | null
  strength: number
  strengthBasis: string[]
  updatedAt: string | null
}

const POSTURES = [
  { value: 'admitted', label: 'Fault admitted' },
  { value: 'clear', label: 'Clear' },
  { value: 'shared', label: 'Shared fault' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'denied', label: 'Denied' },
]

const REPORT_STATUSES = [
  { value: 'none', label: 'Not obtained' },
  { value: 'requested', label: 'Requested' },
  { value: 'received', label: 'Received' },
  { value: 'n/a', label: 'N/A' },
]

const CITATION_TARGETS = [
  { value: 'none', label: 'None issued' },
  { value: 'defendant', label: 'Defendant' },
  { value: 'plaintiff', label: 'Plaintiff' },
  { value: 'both', label: 'Both' },
]

type Field = keyof Liability
type Section = 'strength' | 'fault' | 'evidence' | 'defendant'

const SECTION_FIELDS: Record<Section, Field[]> = {
  strength: ['strengthOverride'],
  fault: ['faultTheory', 'faultPosture', 'defendantFaultPct', 'comparativeNegPct'],
  evidence: ['policeReportStatus', 'policeReportNumber', 'citationIssuedTo', 'witnessCount', 'hasWitnesses', 'hasPhotos', 'hasVideo'],
  defendant: ['defendantName', 'defendantInsurer', 'notes'],
}

function SectionActions({
  dirty,
  saving,
  onSave,
  onCancel,
}: {
  dirty: boolean
  saving: boolean
  onSave: () => void
  onCancel: () => void
}): ReactNode {
  return (
    <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
      <span className={`mr-auto text-xs ${dirty || saving ? 'text-amber-700' : 'text-slate-400'}`}>
        {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'All changes saved'}
      </span>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving || !dirty}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !dirty}
        className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        Save
      </button>
    </div>
  )
}

function strengthTone(score: number): { ring: string; text: string; label: string } {
  if (score >= 70) return { ring: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-700', label: 'Strong' }
  if (score >= 45) return { ring: 'border-amber-200 bg-amber-50', text: 'text-amber-700', label: 'Contested' }
  return { ring: 'border-rose-200 bg-rose-50', text: 'text-rose-700', label: 'Weak' }
}

export default function LiabilityPanel({ leadId, onChanged }: { leadId: string; onChanged?: () => void }) {
  const [data, setData] = useState<Liability | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Liability | null>(null)
  const [saving, setSaving] = useState<Section | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await getLeadLiability(leadId)
      setData(res.liability)
      setDraft(res.liability)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load liability record.')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])

  const set = (patch: Partial<Liability>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d))
  }

  const changedFields = (section: Section): Field[] =>
    data && draft ? SECTION_FIELDS[section].filter((f) => (draft[f] ?? null) !== (data[f] ?? null)) : []
  const isDirty = (section: Section) => changedFields(section).length > 0

  const saveSection = async (section: Section) => {
    if (!draft) return
    const fields = changedFields(section)
    if (!fields.length) return
    const patch: Record<string, unknown> = {}
    for (const f of fields) patch[f] = draft[f]
    setSaving(section)
    setError(null)
    try {
      const res = await updateLeadLiability(leadId, patch)
      setData(res.liability)
      // Keep unsaved edits in the other sections.
      setDraft((d) => {
        if (!d) return res.liability
        const next = { ...res.liability }
        for (const other of Object.keys(SECTION_FIELDS) as Section[]) {
          if (other === section) continue
          for (const f of SECTION_FIELDS[other]) (next as any)[f] = d[f]
        }
        return next
      })
      onChanged?.()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save liability changes.')
    } finally {
      setSaving(null)
    }
  }

  const cancelSection = (section: Section) => {
    if (!data) return
    const patch: Partial<Liability> = {}
    for (const f of SECTION_FIELDS[section]) (patch as any)[f] = data[f]
    set(patch)
  }

  const actions = (section: Section) => (
    <SectionActions
      dirty={isDirty(section)}
      saving={saving === section}
      onSave={() => void saveSection(section)}
      onCancel={() => cancelSection(section)}
    />
  )

  if (loading) return <p className="text-sm text-slate-500">Loading liability…</p>
  if (error && !data) return <p className="text-sm text-rose-600">{error}</p>
  if (!data || !draft) return null

  const tone = strengthTone(data.strength)
  const anyDirty = (Object.keys(SECTION_FIELDS) as Section[]).some(isDirty)
  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div className="space-y-4">
      {/* Strength hero */}
      <div className={`rounded-2xl border p-5 shadow-sm ${tone.ring}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" /> Liability strength
          </p>
          <p className={`mt-1 text-3xl font-bold tabular-nums ${tone.text}`}>
            {data.strength}
            <span className="ml-2 text-base font-semibold">{tone.label}</span>
          </p>
          {data.strengthBasis.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.strengthBasis.map((b) => (
                <span key={b} className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
        <label className="text-right text-xs text-slate-500">
          <span className="block">Override score</span>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.strengthOverride ?? ''}
            placeholder="auto"
            onChange={(e) => set({ strengthOverride: e.target.value === '' ? null : Number(e.target.value) })}
            className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
      </div>
      {actions('strength')}
      </div>

      {/* Fault theory & split */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Gavel className="h-4 w-4 text-slate-400" /> Fault theory
        </h3>
        <label className="block">
          <span className="text-xs font-medium text-slate-500">Theory of liability</span>
          <textarea
            rows={2}
            value={draft.faultTheory ?? ''}
            onChange={(e) => set({ faultTheory: e.target.value })}
            placeholder="e.g. Defendant rear-ended plaintiff at a red light; admitted fault at the scene."
            className={inputCls}
          />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Fault posture</span>
            <select value={draft.faultPosture} onChange={(e) => set({ faultPosture: e.target.value })} className={inputCls}>
              {POSTURES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Defendant at fault (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={draft.defendantFaultPct}
              onChange={(e) => set({ defendantFaultPct: Number(e.target.value) })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Comparative negligence (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={draft.comparativeNegPct}
              onChange={(e) => set({ comparativeNegPct: Number(e.target.value) })}
              className={inputCls}
            />
            <span className="mt-1 block text-[11px] text-slate-400">Plaintiff's own share reduces recovery.</span>
          </label>
        </div>
        {actions('fault')}
      </div>

      {/* Liability evidence */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileText className="h-4 w-4 text-slate-400" /> Liability evidence
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Police report</span>
            <select
              value={draft.policeReportStatus}
              onChange={(e) => set({ policeReportStatus: e.target.value })}
              className={inputCls}
            >
              {REPORT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Report / case number</span>
            <input
              value={draft.policeReportNumber ?? ''}
              onChange={(e) => set({ policeReportNumber: e.target.value })}
              placeholder="e.g. 24-012345"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Citation issued to</span>
            <select
              value={draft.citationIssuedTo ?? 'none'}
              onChange={(e) => set({ citationIssuedTo: e.target.value })}
              className={inputCls}
            >
              {CITATION_TARGETS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Independent witnesses</span>
            <input
              type="number"
              min={0}
              value={draft.witnessCount}
              onChange={(e) => {
                const c = Math.max(0, Number(e.target.value) || 0)
                set({ witnessCount: c, hasWitnesses: c > 0 })
              }}
              className={inputCls}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={draft.hasPhotos}
              onChange={(e) => set({ hasPhotos: e.target.checked })}
            />
            <Camera className="h-4 w-4 text-slate-400" /> Scene / damage photos
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={draft.hasVideo}
              onChange={(e) => set({ hasVideo: e.target.checked })}
            />
            <Video className="h-4 w-4 text-slate-400" /> Video (dashcam / surveillance)
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={draft.hasWitnesses}
              onChange={(e) => set({ hasWitnesses: e.target.checked })}
            />
            <Users className="h-4 w-4 text-slate-400" /> Witness statements
          </label>
        </div>
        {actions('evidence')}
      </div>

      {/* Defendant */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Defendant</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Name</span>
            <input
              value={draft.defendantName ?? ''}
              onChange={(e) => set({ defendantName: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Insurer</span>
            <input
              value={draft.defendantInsurer ?? ''}
              onChange={(e) => set({ defendantInsurer: e.target.value })}
              className={inputCls}
            />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-medium text-slate-500">Liability notes</span>
          <textarea
            rows={3}
            value={draft.notes ?? ''}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Open questions, disputed facts, reconstruction needs…"
            className={inputCls}
          />
        </label>
        {actions('defendant')}
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <p className="text-xs text-slate-400">
        {anyDirty
          ? 'Changes are not saved until you click Save in that section.'
          : 'Saved changes to the strength score and comparative-fault split flow into the case valuation and demand automatically.'}
      </p>
    </div>
  )
}
