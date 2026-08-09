import { useState } from 'react'
import { Gavel, Scale, Lock, Undo2, Loader2, CheckCircle2 } from 'lucide-react'
import {
  closeLeadCase,
  reopenLeadCase,
  setLeadLitigationStatus,
  type LitigationStatus,
} from '../../lib/api'

const LITIGATION_OPTIONS: { value: LitigationStatus; label: string }[] = [
  { value: 'none', label: 'Pre-litigation' },
  { value: 'pre_suit', label: 'Preparing suit' },
  { value: 'filed', label: 'Suit filed' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'mediation', label: 'Mediation / MSC' },
  { value: 'trial', label: 'Trial' },
  { value: 'resolved', label: 'Litigation resolved' },
]

interface Props {
  leadId: string
  caseStage: string | null
  litigationStatus: string | null
  closedAt: string | null
  /** Patch the parent's local assessment copy so the UI reflects the change immediately. */
  onLocalUpdate?: (patch: { caseStage?: string | null; litigationStatus?: string | null; closedAt?: string | null }) => void
}

export default function CaseLifecycleControls({ leadId, caseStage, litigationStatus, closedAt, onLocalUpdate }: Props) {
  const [busy, setBusy] = useState<null | 'close' | 'reopen' | 'lit'>(null)
  const [error, setError] = useState<string | null>(null)
  const closed = String(caseStage || '').toUpperCase() === 'CLOSED' || !!closedAt
  const litValue = (litigationStatus as LitigationStatus) || 'none'
  const inLitigation = litValue !== 'none' && litValue !== 'resolved'

  const handleClose = async () => {
    if (!window.confirm('Close this case? This materializes the close-out checklist and marks the matter closed.')) return
    setBusy('close')
    setError(null)
    try {
      const r = await closeLeadCase(leadId)
      onLocalUpdate?.({ caseStage: r.caseStage ?? 'CLOSED', closedAt: new Date().toISOString() })
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to close case')
    } finally {
      setBusy(null)
    }
  }

  const handleReopen = async () => {
    setBusy('reopen')
    setError(null)
    try {
      const r = await reopenLeadCase(leadId)
      onLocalUpdate?.({ caseStage: r.caseStage ?? null, closedAt: null })
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to reopen case')
    } finally {
      setBusy(null)
    }
  }

  const handleLitigation = async (value: LitigationStatus) => {
    setBusy('lit')
    setError(null)
    try {
      const r = await setLeadLitigationStatus(leadId, value)
      onLocalUpdate?.({ litigationStatus: r.status })
      if (r.tasksCreated > 0) {
        setError(null)
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to update litigation status')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Scale className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">Case lifecycle</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Litigation sub-track */}
        <div className="rounded-xl border border-slate-200 p-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Gavel className="h-3.5 w-3.5" /> Litigation track
          </label>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Runs alongside settlement. Filing suit auto-creates the litigation checklist.
          </p>
          <select
            value={litValue}
            disabled={busy != null || closed}
            onChange={(e) => handleLitigation(e.target.value as LitigationStatus)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 disabled:opacity-50"
          >
            {LITIGATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {inLitigation && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              In litigation
            </span>
          )}
        </div>

        {/* Close / reopen */}
        <div className="rounded-xl border border-slate-200 p-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Lock className="h-3.5 w-3.5" /> Matter status
          </label>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Closing drives the case to CLOSED and creates the close-out checklist.
          </p>
          {closed ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Closed
              </span>
              <button
                type="button"
                onClick={handleReopen}
                disabled={busy != null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                {busy === 'reopen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                Reopen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              disabled={busy != null}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:opacity-40"
            >
              {busy === 'close' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              Close case
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}
    </section>
  )
}
