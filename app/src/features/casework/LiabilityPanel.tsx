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
import { useCallback, useEffect, useRef, useState } from 'react'
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

function strengthTone(score: number): { ring: string; text: string; label: string } {
  if (score >= 70) return { ring: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-700', label: 'Strong' }
  if (score >= 45) return { ring: 'border-amber-200 bg-amber-50', text: 'text-amber-700', label: 'Contested' }
  return { ring: 'border-rose-200 bg-rose-50', text: 'text-rose-700', label: 'Weak' }
}

export default function LiabilityPanel({ leadId }: { leadId: string }) {
  const [data, setData] = useState<Liability | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await getLeadLiability(leadId)
      setData(res.liability)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load liability record.')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true)
      try {
        const res = await updateLeadLiability(leadId, patch)
        setData(res.liability)
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Could not save liability changes.')
      } finally {
        setSaving(false)
      }
    },
    [leadId],
  )

  // Optimistic local update for immediate feedback, then persist.
  const set = (patch: Partial<Liability>) => {
    setData((d) => (d ? { ...d, ...patch } : d))
  }
  const debouncedSave = (patch: Record<string, unknown>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void save(patch), 500)
  }

  if (loading) return <p className="text-sm text-slate-500">Loading liability…</p>
  if (error && !data) return <p className="text-sm text-rose-600">{error}</p>
  if (!data) return null

  const tone = strengthTone(data.strength)
  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div className="space-y-4">
      {/* Strength hero */}
      <div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 shadow-sm ${tone.ring}`}>
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
            value={data.strengthOverride ?? ''}
            placeholder="auto"
            onChange={(e) => set({ strengthOverride: e.target.value === '' ? null : Number(e.target.value) })}
            onBlur={(e) => save({ strengthOverride: e.target.value === '' ? null : Number(e.target.value) })}
            className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
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
            value={data.faultTheory ?? ''}
            onChange={(e) => set({ faultTheory: e.target.value })}
            onBlur={(e) => save({ faultTheory: e.target.value })}
            placeholder="e.g. Defendant rear-ended plaintiff at a red light; admitted fault at the scene."
            className={inputCls}
          />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Fault posture</span>
            <select value={data.faultPosture} onChange={(e) => save({ faultPosture: e.target.value })} className={inputCls}>
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
              value={data.defendantFaultPct}
              onChange={(e) => {
                set({ defendantFaultPct: Number(e.target.value) })
                debouncedSave({ defendantFaultPct: Number(e.target.value) })
              }}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Comparative negligence (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={data.comparativeNegPct}
              onChange={(e) => {
                set({ comparativeNegPct: Number(e.target.value) })
                debouncedSave({ comparativeNegPct: Number(e.target.value) })
              }}
              className={inputCls}
            />
            <span className="mt-1 block text-[11px] text-slate-400">Plaintiff's own share reduces recovery.</span>
          </label>
        </div>
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
              value={data.policeReportStatus}
              onChange={(e) => save({ policeReportStatus: e.target.value })}
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
              value={data.policeReportNumber ?? ''}
              onChange={(e) => set({ policeReportNumber: e.target.value })}
              onBlur={(e) => save({ policeReportNumber: e.target.value })}
              placeholder="e.g. 24-012345"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Citation issued to</span>
            <select
              value={data.citationIssuedTo ?? 'none'}
              onChange={(e) => save({ citationIssuedTo: e.target.value })}
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
              value={data.witnessCount}
              onChange={(e) => {
                const c = Math.max(0, Number(e.target.value) || 0)
                set({ witnessCount: c, hasWitnesses: c > 0 })
                debouncedSave({ witnessCount: c, hasWitnesses: c > 0 })
              }}
              className={inputCls}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={data.hasPhotos}
              onChange={(e) => {
                set({ hasPhotos: e.target.checked })
                save({ hasPhotos: e.target.checked })
              }}
            />
            <Camera className="h-4 w-4 text-slate-400" /> Scene / damage photos
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={data.hasVideo}
              onChange={(e) => {
                set({ hasVideo: e.target.checked })
                save({ hasVideo: e.target.checked })
              }}
            />
            <Video className="h-4 w-4 text-slate-400" /> Video (dashcam / surveillance)
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={data.hasWitnesses}
              onChange={(e) => {
                set({ hasWitnesses: e.target.checked })
                save({ hasWitnesses: e.target.checked })
              }}
            />
            <Users className="h-4 w-4 text-slate-400" /> Witness statements
          </label>
        </div>
      </div>

      {/* Defendant */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Defendant</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Name</span>
            <input
              value={data.defendantName ?? ''}
              onChange={(e) => set({ defendantName: e.target.value })}
              onBlur={(e) => save({ defendantName: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Insurer</span>
            <input
              value={data.defendantInsurer ?? ''}
              onChange={(e) => set({ defendantInsurer: e.target.value })}
              onBlur={(e) => save({ defendantInsurer: e.target.value })}
              className={inputCls}
            />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-medium text-slate-500">Liability notes</span>
          <textarea
            rows={3}
            value={data.notes ?? ''}
            onChange={(e) => set({ notes: e.target.value })}
            onBlur={(e) => save({ notes: e.target.value })}
            placeholder="Open questions, disputed facts, reconstruction needs…"
            className={inputCls}
          />
        </label>
      </div>

      <p className="text-xs text-slate-400">
        {saving ? 'Saving…' : 'The liability record is a living analysis. Its strength score and comparative-fault split flow into the case valuation and demand automatically.'}
      </p>
    </div>
  )
}
