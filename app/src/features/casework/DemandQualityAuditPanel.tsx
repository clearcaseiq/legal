/**
 * Demand Quality Audit: checks the letter against the case documents, the
 * damages ledger and the exhibits, and holds back finalizing and sending until
 * every finding is fixed or resolved by an authorized reviewer. Selecting a
 * finding opens it side by side: what the draft says, what the source says,
 * and how it was resolved.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertOctagon,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileSearch,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import ModalPortal from '../../components/ModalPortal'
import {
  approveDemandAmount,
  createLeadTask,
  downloadDemandAuditReport,
  getLatestDemandAudit,
  resolveDemandAuditFinding,
  startDemandAudit,
  type DemandAuditDisposition,
  type DemandAuditFinding,
  type DemandAuditSeverity,
  type DemandAuditView,
  type DemandLetter,
  type DemandRelease,
} from '../../lib/api'
import { openEvidenceFile } from '../../lib/evidenceFileUrl'

const SEVERITY: Record<DemandAuditSeverity, { label: string; chip: string; ring: string }> = {
  critical: { label: 'Critical', chip: 'bg-rose-600 text-white', ring: 'border-rose-200 bg-rose-50/60' },
  high: { label: 'High', chip: 'bg-orange-500 text-white', ring: 'border-orange-200 bg-orange-50/50' },
  medium: { label: 'Medium', chip: 'bg-amber-100 text-amber-800', ring: 'border-amber-200 bg-amber-50/40' },
  low: { label: 'Low', chip: 'bg-slate-100 text-slate-600', ring: 'border-slate-200 bg-white' },
}
const SEVERITIES: DemandAuditSeverity[] = ['critical', 'high', 'medium', 'low']

const SUPPORT_LABEL: Record<string, string> = {
  supported: 'Supported',
  partially_supported: 'Partially supported',
  contradicted: 'Contradicted',
  unsupported: 'Unsupported',
  unverifiable: 'Unverifiable',
  not_applicable: 'Not applicable',
}

const DISPOSITION_LABEL: Record<DemandAuditDisposition, string> = {
  attorney_judgment: 'Reviewed: the letter is correct as written',
  verified_authority: 'Verified against the official reporter or code',
  manual_verification: 'Checked every claim against the records by hand',
  not_applicable: 'Does not apply to this letter',
  acknowledged: 'Acknowledged',
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''

function dispositionsFor(f: DemandAuditFinding): DemandAuditDisposition[] {
  if (f.resolve === 'acknowledge') return ['acknowledged']
  if (f.ruleId === 'DQA-405') return ['verified_authority']
  if (f.ruleId === 'DQA-900') return ['manual_verification']
  return ['attorney_judgment', 'not_applicable']
}

function FindingDialog({
  leadId,
  auditId,
  finding,
  readOnly,
  onClose,
  onResolved,
  onShowInLetter,
  onRegenerate,
}: {
  leadId: string
  auditId: string
  finding: DemandAuditFinding
  readOnly: boolean
  onClose: () => void
  onResolved: (view: DemandAuditView) => void
  onShowInLetter: (text: string) => void
  onRegenerate?: () => void
}) {
  const options = dispositionsFor(finding)
  const [disposition, setDisposition] = useState<DemandAuditDisposition>(options[0])
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const sev = SEVERITY[finding.severity]
  const supports = finding.evidence.filter((e) => e.role === 'support')
  const conflicts = finding.evidence.filter((e) => e.role === 'conflict')

  const resolve = async () => {
    setBusy('resolve')
    setNote(null)
    try {
      onResolved(await resolveDemandAuditFinding(leadId, auditId, finding.id, { disposition, reason }))
      onClose()
    } catch (err: any) {
      setNote({ tone: 'err', text: err?.response?.data?.error || 'Could not record the resolution.' })
    } finally {
      setBusy(null)
    }
  }

  const task = async (kind: 'review' | 'evidence') => {
    setBusy(kind)
    setNote(null)
    try {
      await createLeadTask(leadId, {
        title: (kind === 'review' ? `Review audit finding ${finding.ruleId}: ${finding.title}` : `Obtain evidence for: ${finding.title}`).slice(0, 200),
        notes: [finding.detail, finding.claim ? `Letter: "${finding.claim}"` : null, finding.recommendation ? `Fix: ${finding.recommendation}` : null]
          .filter(Boolean)
          .join('\n\n'),
        priority: finding.severity === 'critical' || finding.severity === 'high' ? 'high' : 'medium',
      })
      setNote({ tone: 'ok', text: kind === 'review' ? 'Review task created. Assign it on the Tasks tab.' : 'Evidence task created on the Tasks tab.' })
    } catch (err: any) {
      setNote({ tone: 'err', text: err?.response?.data?.error || 'Could not create the task.' })
    } finally {
      setBusy(null)
    }
  }

  const sourceCard = (e: DemandAuditFinding['evidence'][number], i: number) => (
    <li key={`${e.role}-${i}`} className={`rounded-lg border p-2 text-xs ${e.role === 'conflict' ? 'border-rose-200 bg-rose-50/60' : 'border-emerald-200 bg-emerald-50/50'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-800">
          {[e.exhibit != null ? `Ex. ${e.exhibit}` : null, e.fileName, e.page != null ? `p. ${e.page}` : null].filter(Boolean).join(' \u00b7 ')}
        </p>
        {e.fileUrl ? (
          <button
            type="button"
            onClick={() => void openEvidenceFile(e.fileUrl as string, { page: e.page })}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-brand-700 hover:bg-white"
          >
            <ExternalLink className="h-3 w-3" />
            {e.page ? `Open p. ${e.page}` : 'Open'}
          </button>
        ) : null}
      </div>
      <blockquote className="mt-1 border-l-2 border-slate-300 pl-2 italic text-slate-600">“{e.quote}”</blockquote>
    </li>
  )

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4" onClick={onClose}>
        <div className="flex min-h-full items-center justify-center">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  <span className={`rounded px-1.5 py-0.5 uppercase ${sev.chip}`}>{sev.label}</span>
                  <span className="text-slate-500">{finding.ruleId} · {finding.ruleTitle}</span>
                  {finding.support ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{SUPPORT_LABEL[finding.support]}</span> : null}
                  {finding.source === 'ai' ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">
                      <Sparkles className="h-3 w-3" /> AI-verified
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-1 text-base font-semibold text-slate-900">{finding.title}</h3>
              </div>
              <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-auto gap-4 overflow-y-auto p-5 md:grid-cols-3">
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Draft</h4>
                {finding.claim ? (
                  <>
                    <p className="rounded-lg border border-slate-200 bg-slate-50 p-2 font-serif text-sm text-slate-800">{finding.claim}</p>
                    <button
                      type="button"
                      onClick={() => {
                        onShowInLetter(finding.claim as string)
                        onClose()
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      <FileSearch className="h-3.5 w-3.5" /> Show in the letter
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">This finding is about the record or the package, not one sentence.</p>
                )}
                <p className="mt-3 text-xs text-slate-600">{finding.detail}</p>
              </section>

              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Source</h4>
                {finding.evidence.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    {finding.support === 'unsupported' || finding.support === 'unverifiable'
                      ? 'No case document supports this.'
                      : 'No passage is attached to this finding.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {conflicts.length ? (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold text-rose-700">Conflicts with the letter</p>
                        <ul className="space-y-1.5">{conflicts.map(sourceCard)}</ul>
                      </div>
                    ) : null}
                    {supports.length ? (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold text-emerald-700">Supports</p>
                        <ul className="space-y-1.5">{supports.map(sourceCard)}</ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Resolution</h4>
                {finding.recommendation ? (
                  <p className="mb-3 rounded-lg bg-brand-50/60 p-2 text-xs text-slate-700">
                    <span className="font-semibold">Recommended: </span>
                    {finding.recommendation}
                  </p>
                ) : null}
                {finding.resolution ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-xs text-emerald-900">
                    <p className="font-semibold">{DISPOSITION_LABEL[finding.resolution.disposition]}</p>
                    <p className="mt-1">{finding.resolution.reason}</p>
                    <p className="mt-1 text-emerald-700">
                      {finding.resolution.actorName || 'A reviewer'}
                      {finding.resolution.actorIsAttorney ? ' (attorney)' : ''} · {when(finding.resolution.createdAt)}
                    </p>
                  </div>
                ) : finding.resolve === 'fix' ? (
                  <p className="text-xs text-slate-600">
                    {finding.ruleId === 'DQA-306'
                      ? 'Approve the demand amount in the audit panel, then rerun the audit.'
                      : 'This cannot be dismissed. Correct the letter or the case record, then rerun the audit.'}
                  </p>
                ) : readOnly ? (
                  <p className="text-xs text-slate-500">Open.</p>
                ) : (
                  <div className="space-y-2">
                    {finding.resolve === 'attorney' ? <p className="text-[11px] font-semibold text-slate-500">Attorney resolution required.</p> : null}
                    {options.length > 1 ? (
                      <select
                        value={disposition}
                        onChange={(e) => setDisposition(e.target.value as DemandAuditDisposition)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                      >
                        {options.map((o) => (
                          <option key={o} value={o}>
                            {DISPOSITION_LABEL[o]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs font-medium text-slate-700">{DISPOSITION_LABEL[options[0]]}</p>
                    )}
                    {finding.resolve !== 'acknowledge' ? (
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        placeholder="Document your reasoning and the source you checked."
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={resolve}
                      disabled={busy != null || (finding.resolve !== 'acknowledge' && reason.trim().length < 20)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === 'resolve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {finding.resolve === 'acknowledge' ? 'Acknowledge' : 'Record resolution'}
                    </button>
                  </div>
                )}
              </section>
            </div>

            {!readOnly && finding.status === 'open' ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs">
                {finding.claim ? (
                  <button type="button" onClick={() => { onShowInLetter(finding.claim as string); onClose() }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
                    Fix in the letter
                  </button>
                ) : null}
                <button type="button" onClick={() => task('evidence')} disabled={busy != null} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
                  Request evidence
                </button>
                {onRegenerate ? (
                  <button type="button" onClick={() => { onRegenerate(); onClose() }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
                    Regenerate letter
                  </button>
                ) : null}
                <button type="button" onClick={() => task('review')} disabled={busy != null} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
                  Assign reviewer
                </button>
                {note ? <span className={note.tone === 'ok' ? 'text-emerald-700' : 'text-rose-600'}>{note.text}</span> : null}
              </div>
            ) : note ? (
              <p className={`border-t border-slate-100 px-5 py-3 text-xs ${note.tone === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>{note.text}</p>
            ) : null}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default function DemandQualityAuditPanel({
  leadId,
  letter,
  readOnly,
  onLetterUpdated,
  onShowInLetter,
  onRelease,
  onRegenerate,
}: {
  leadId: string
  letter: DemandLetter
  readOnly: boolean
  onLetterUpdated: (patch: Partial<DemandLetter>) => void
  /** Select the sentence in the editor. */
  onShowInLetter: (text: string) => void
  onRelease?: (release: DemandRelease | null) => void
  onRegenerate?: () => void
}) {
  const [view, setView] = useState<DemandAuditView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [severity, setSeverity] = useState<DemandAuditSeverity | null>(null)
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'all'>('open')
  const [selected, setSelected] = useState<DemandAuditFinding | null>(null)
  const [amount, setAmount] = useState(String(Math.round(letter.approvedDemandAmount ?? letter.targetAmount ?? 0)))
  const [rationale, setRationale] = useState('')
  const [editingAmount, setEditingAmount] = useState(false)
  const poll = useRef<number | null>(null)

  const apply = useCallback(
    (next: DemandAuditView) => {
      setView(next)
      onRelease?.(next.release)
    },
    [onRelease],
  )

  const load = useCallback(async () => {
    setError(null)
    try {
      apply(await getLatestDemandAudit(leadId, letter.id))
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load the audit.')
      onRelease?.(null)
    } finally {
      setLoading(false)
    }
  }, [leadId, letter.id, apply, onRelease])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load, letter.currentVersion, letter.approvedDemandAmount])

  const running = view?.audit?.status === 'running'
  useEffect(() => {
    if (!running) return
    poll.current = window.setTimeout(() => void load(), 3000)
    return () => {
      if (poll.current) window.clearTimeout(poll.current)
    }
  }, [running, view, load])

  const run = async () => {
    setBusy('run')
    setError(null)
    try {
      apply(await startDemandAudit(leadId, letter.id))
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not start the audit.')
    } finally {
      setBusy(null)
    }
  }

  const report = async () => {
    if (!view?.audit) return
    setBusy('report')
    try {
      const blob = await downloadDemandAuditReport(leadId, view.audit.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Demand Quality Audit - ${new Date(view.audit.startedAt).toISOString().slice(0, 10)}.pdf`
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      setError('Could not download the audit report.')
    } finally {
      setBusy(null)
    }
  }

  const approveAmount = async () => {
    setBusy('amount')
    setError(null)
    try {
      const res = await approveDemandAmount(leadId, letter.id, { amount: Number(amount.replace(/[$,]/g, '')), rationale })
      onLetterUpdated({
        approvedDemandAmount: res.approvedDemandAmount,
        targetAmount: res.approvedDemandAmount,
        demandAmountApprovedByName: res.demandAmountApprovedByName,
        demandAmountApprovedAt: res.demandAmountApprovedAt,
        demandAmountRationale: res.demandAmountRationale,
      })
      setEditingAmount(false)
      setRationale('')
      if (res.changedFromLetter) setError('Approved. The letter still states the old figure: redraft or edit it, then rerun the audit.')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not approve the demand amount.')
    } finally {
      setBusy(null)
    }
  }

  const findings = useMemo(
    () =>
      (view?.findings ?? []).filter(
        (f) => (!severity || f.severity === severity) && (statusFilter === 'all' || f.status === statusFilter),
      ),
    [view, severity, statusFilter],
  )

  const audit = view?.audit ?? null
  const release = view?.release ?? null
  const summary = audit?.summary ?? null
  const stale = release ? release.stale.draft || release.stale.sources || release.stale.version : false
  const draftLocked = letter.status !== 'DRAFT'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 px-4 py-3.5">
        {release?.ok ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">Demand Quality Audit</h3>
          <p className="text-xs text-slate-500">
            {!audit
              ? 'Not audited yet. Finalizing and sending stay locked until it passes.'
              : running
                ? 'Checking the letter against the records…'
                : release?.ok
                  ? 'Passed. Every finding is fixed or resolved.'
                  : 'Release blocked.'}
          </p>
        </div>
        {audit && !running ? (
          <button type="button" onClick={report} disabled={busy != null} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Download the audit report">
            {busy === 'report' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-slate-100 px-4 py-3">
        {loading && !view ? (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the audit…
          </p>
        ) : null}

        {running ? (
          <p className="flex items-center gap-2 rounded-lg bg-brand-50/70 px-2 py-1.5 text-xs text-brand-800">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the records and verifying each claim. This takes a minute or two.
          </p>
        ) : null}

        {!running && release && !release.ok && release.reasons.length ? (
          <ul className="space-y-1 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-800">
            {release.reasons.map((r) => (
              <li key={r} className="flex gap-1.5">
                <AlertOctagon className="mt-0.5 h-3 w-3 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        ) : null}

        {audit?.status === 'complete' && audit.aiStatus && audit.aiStatus !== 'ok' ? (
          <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            Claim verification {audit.aiStatus === 'timeout' ? 'timed out' : audit.aiStatus === 'skipped' ? 'did not run' : 'failed'}. Unverified claims never
            count as passing.
          </p>
        ) : null}

        {!readOnly && !running ? (
          <button
            type="button"
            onClick={run}
            disabled={busy != null}
            className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
              !audit || stale ? 'bg-brand-600 hover:bg-brand-700' : 'bg-slate-700 hover:bg-slate-800'
            }`}
          >
            {busy === 'run' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {!audit ? 'Run audit' : stale ? 'Rerun audit (out of date)' : 'Rerun audit'}
          </button>
        ) : null}

        <div className="rounded-lg border border-slate-200 p-2.5 text-xs">
          <p className="font-semibold text-slate-800">Demand amount</p>
          {letter.approvedDemandAmount != null && !editingAmount ? (
            <>
              <p className="mt-0.5 text-slate-700">
                <span className="text-base font-bold text-slate-900">{money(letter.approvedDemandAmount)}</span> approved
                {letter.demandAmountApprovedByName ? ` by ${letter.demandAmountApprovedByName}` : ''}
                {letter.demandAmountApprovedAt ? ` · ${when(letter.demandAmountApprovedAt)}` : ''}
              </p>
              {letter.demandAmountRationale ? <p className="mt-1 text-slate-500">{letter.demandAmountRationale}</p> : null}
              {!readOnly && !draftLocked ? (
                <button type="button" onClick={() => setEditingAmount(true)} className="mt-1 font-semibold text-brand-700 hover:underline">
                  Change
                </button>
              ) : null}
            </>
          ) : readOnly || draftLocked ? (
            <p className="mt-0.5 text-rose-700">Not approved by an attorney.</p>
          ) : (
            <div className="mt-1.5 space-y-1.5">
              <p className="text-slate-500">An attorney sets the demand. It is never taken from the modeled settlement range.</p>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-semibold"
                aria-label="Demand amount"
              />
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={2}
                placeholder="Why this figure (specials, injury, venue, policy limits)"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={approveAmount}
                  disabled={busy != null || rationale.trim().length < 10}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy === 'amount' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve amount
                </button>
                {editingAmount ? (
                  <button type="button" onClick={() => setEditingAmount(false)} className="rounded-lg px-2 py-1.5 font-semibold text-slate-500 hover:bg-slate-100">
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {summary && audit?.status === 'complete' ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {SEVERITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(severity === s ? null : s)}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                    severity === s ? 'ring-2 ring-brand-300' : ''
                  } ${summary[s] ? SEVERITY[s].chip : 'bg-slate-50 text-slate-400'}`}
                >
                  {summary[s]} {SEVERITY[s].label.toLowerCase()}
                </button>
              ))}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="ml-auto rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600"
                aria-label="Filter findings"
              >
                <option value="open">Open</option>
                <option value="resolved">Resolved ({summary.resolved})</option>
                <option value="all">All</option>
              </select>
            </div>

            {findings.length === 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {statusFilter === 'open' && !severity ? 'No open findings.' : 'Nothing matches this filter.'}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {findings.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(f)}
                      className={`w-full rounded-lg border p-2 text-left text-xs transition hover:shadow-sm ${f.status === 'resolved' ? 'border-slate-100 bg-slate-50/60 opacity-70' : SEVERITY[f.severity].ring}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded px-1 text-[10px] font-bold uppercase ${SEVERITY[f.severity].chip}`}>{SEVERITY[f.severity].label}</span>
                        <span className="text-[10px] font-semibold text-slate-400">{f.ruleId}</span>
                        {f.source === 'ai' ? <Sparkles className="h-3 w-3 text-violet-500" /> : null}
                        {f.status === 'resolved' ? <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-600" /> : null}
                      </div>
                      <p className="mt-1 font-semibold text-slate-800">{f.title}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="flex items-center gap-1 text-[11px] text-slate-400">
              <ClipboardList className="h-3 w-3" />
              {summary.claims ? `${summary.claims} claims checked against ${summary.sourcePages} record pages. ` : ''}
              Audited v{audit.letterVersion} {when(audit.completedAt)}
              {audit.evidenceCutoff ? ` · evidence through ${when(audit.evidenceCutoff)}` : ''}
            </p>
          </>
        ) : null}

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>

      {selected && audit ? (
        <FindingDialog
          leadId={leadId}
          auditId={audit.id}
          finding={selected}
          readOnly={readOnly}
          onClose={() => setSelected(null)}
          onResolved={apply}
          onShowInLetter={onShowInLetter}
          onRegenerate={onRegenerate}
        />
      ) : null}
    </div>
  )
}
