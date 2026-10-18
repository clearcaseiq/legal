/**
 * Living liability record for the attorney case workspace.
 *
 * A single evolving analysis of WHO is at fault and HOW PROVABLE it is:
 *   fault theory · posture · defendant/comparative split · citation ·
 *   a list of liability evidence · a list of defendants
 *
 * A derived liability-strength score (attorney can override) summarizes it, and
 * the rollup writes through to facts.liability so the valuation and demand
 * engines reflect it. Backed by /v1/attorney-dashboard/leads/:leadId/liability.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Gavel, FileText, ShieldCheck, Users } from 'lucide-react'
import {
  getLeadLiability,
  updateLeadLiability,
  type LiabilityDefendant,
  type LiabilityEvidenceItem,
  type LiabilityParties,
  type LiabilityResponse,
} from '../../lib/api'
import { DefendantList, EvidenceList } from './LiabilityLists'

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

const CITATION_TARGETS = [
  { value: 'none', label: 'None issued' },
  { value: 'defendant', label: 'Defendant' },
  { value: 'plaintiff', label: 'Plaintiff' },
  { value: 'both', label: 'Both' },
]

type Field = keyof Liability
type Section = 'strength' | 'fault' | 'evidence' | 'notes'

const SECTION_FIELDS: Record<Section, Field[]> = {
  strength: ['strengthOverride'],
  fault: ['faultTheory', 'faultPosture', 'defendantFaultPct', 'comparativeNegPct'],
  evidence: ['citationIssuedTo'],
  notes: ['notes'],
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
  const [defendants, setDefendants] = useState<LiabilityDefendant[]>([])
  const [evidence, setEvidence] = useState<LiabilityEvidenceItem[]>([])
  const [policies, setPolicies] = useState<LiabilityResponse['policies']>([])
  const [documents, setDocuments] = useState<LiabilityResponse['documents']>([])

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await getLeadLiability(leadId)
      setData(res.liability)
      setDraft(res.liability)
      setDefendants(res.defendants || [])
      setEvidence(res.evidence || [])
      setPolicies(res.policies || [])
      setDocuments(res.documents || [])
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

  /** A list changed: take the rolled-up record, keeping unsaved edits in the sections. */
  const onPartiesChanged = (parties: LiabilityParties) => {
    setDefendants(parties.defendants)
    setEvidence(parties.evidence)
    const prev = data
    setData(parties.liability)
    setDraft((d) => {
      if (!d || !prev) return parties.liability
      const next = { ...parties.liability }
      for (const section of Object.keys(SECTION_FIELDS) as Section[]) {
        for (const f of SECTION_FIELDS[section]) {
          if ((d[f] ?? null) !== (prev[f] ?? null)) (next as any)[f] = d[f]
        }
      }
      return next
    })
    onChanged?.()
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
  const allocated = defendants.filter((d) => d.faultPct != null)
  const allocatedTotal = allocated.reduce((sum, d) => sum + Number(d.faultPct), 0)
  const splitOff = allocated.length > 0 && allocatedTotal + Number(draft.comparativeNegPct || 0) !== 100
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
            <span className="text-xs font-medium text-slate-500">
              {allocated.length > 1 ? 'Defendants at fault (%)' : 'Defendant at fault (%)'}
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={allocated.length ? allocatedTotal : draft.defendantFaultPct}
              readOnly={allocated.length > 0}
              onChange={(e) => set({ defendantFaultPct: Number(e.target.value) })}
              className={`${inputCls} ${allocated.length ? 'bg-slate-50 text-slate-600' : ''}`}
            />
            {allocated.length ? (
              <span className="mt-1 block text-[11px] text-slate-400">Total of the defendants' shares below.</span>
            ) : null}
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
        {splitOff ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            The defendants' shares ({allocatedTotal}%) and the plaintiff's comparative negligence ({draft.comparativeNegPct}%)
            add up to {allocatedTotal + Number(draft.comparativeNegPct || 0)}%, not 100%.
          </p>
        ) : null}
        {actions('fault')}
      </div>

      {/* Liability evidence */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileText className="h-4 w-4 text-slate-400" /> Liability evidence
        </h3>
        <EvidenceList leadId={leadId} items={evidence} documents={documents} onChanged={onPartiesChanged} />
        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
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
        </div>
        {actions('evidence')}
      </div>

      {/* Defendants */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Users className="h-4 w-4 text-slate-400" /> {defendants.length > 1 ? `Defendants (${defendants.length})` : 'Defendant'}
        </h3>
        <DefendantList leadId={leadId} items={defendants} policies={policies} onChanged={onPartiesChanged} />
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-xs font-medium text-slate-500">Liability notes</span>
          <textarea
            rows={3}
            value={draft.notes ?? ''}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Open questions, disputed facts, reconstruction needs…"
            className={inputCls}
          />
        </label>
        {actions('notes')}
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
