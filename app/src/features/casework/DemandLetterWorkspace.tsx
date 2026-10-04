/**
 * Draft, edit, and finalize the demand letter for a case.
 *
 * The letter is stored as plain text and exported to Word by splitting on line
 * breaks, so this is a plain textarea rather than a rich-text editor: anything
 * with formatting would be lost on the way out.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  Clock,
  Download,
  FileDown,
  FileText,
  History,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useFirmAccess } from '../../hooks/useFirmAccess'
import DemandIntelligencePanel from './DemandIntelligencePanel'
import {
  approveLeadDemandLetter,
  downloadDemandLetterDocx,
  downloadLeadDemandOriginal,
  draftLeadDemandLetter,
  finalizeLeadDemandLetter,
  getLeadDemandLetter,
  importLeadDemandLetter,
  listLeadDemandLetters,
  markLeadDemandSent,
  regenerateLeadDemandLetter,
  saveLeadDemandLetter,
  type DemandLetter,
} from '../../lib/api'

const AI_AUTHOR = 'Rose'

function formatWhen(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function AuthorChip({ name, source }: { name: string | null; source?: string | null }) {
  if (!name) return null
  const byAi = source === 'ai' || source === 'deterministic' || name === AI_AUTHOR
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        byAi ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {byAi ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {name}
    </span>
  )
}

function MenuItem({ icon: Icon, onClick, children }: { icon: typeof Download; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      {children}
    </button>
  )
}

const PRIMARY_BTN =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50'

export default function DemandLetterWorkspace({
  leadId,
  intro,
  below,
}: {
  leadId: string
  /** Shown only while the case has no letter yet. */
  intro?: ReactNode
  /** Rendered under the letter; told whether the Super Demand panel is showing. */
  below?: (ctx: { isSuper: boolean }) => ReactNode
}) {
  const canWorkDemands = useFirmAccess().can('demand')
  const [letters, setLetters] = useState<DemandLetter[]>([])
  const [active, setActive] = useState<DemandLetter | null>(null)
  const [draftText, setDraftText] = useState('')
  const [guidance, setGuidance] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  // Import a letter authored in another tool (Word / Google Docs / PDF).
  const [showImport, setShowImport] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importText, setImportText] = useState('')
  const [importTitle, setImportTitle] = useState('')
  const [importRecipient, setImportRecipient] = useState('')
  const [importTarget, setImportTarget] = useState('')
  const [importSent, setImportSent] = useState(false)
  const [importSentDate, setImportSentDate] = useState('')

  // The letter the textarea currently reflects, so switching letters can replace
  // the buffer without a stale-edit check fighting the load.
  const loadedIdRef = useRef<string | null>(null)

  const dirty = active != null && draftText !== active.content
  const locked = active?.status !== 'DRAFT'
  const sent = active?.status === 'SENT' || !!active?.sentAt
  const awaitingReview = active?.reviewStatus === 'pending'
  const isSuper = active?.template === 'super'
  const gateIncomplete = isSuper && !active?.approvalGate?.complete

  const openLetter = useCallback(
    async (demandId: string) => {
      try {
        const full = await getLeadDemandLetter(leadId, demandId)
        setActive(full)
        setDraftText(full.content)
        loadedIdRef.current = full.id
      } catch {
        setMessage({ tone: 'err', text: 'Could not open that letter.' })
      }
    },
    [leadId],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listLeadDemandLetters(leadId)
      .then(async (rows) => {
        if (cancelled) return
        setLetters(rows)
        if (rows.length > 0) await openLetter(rows[0].id)
      })
      .catch(() => {
        if (!cancelled) setMessage({ tone: 'err', text: 'Could not load demand letters.' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [leadId, openLetter])

  const applyUpdated = useCallback((letter: DemandLetter) => {
    setActive(letter)
    setDraftText(letter.content)
    loadedIdRef.current = letter.id
    setLetters((prev) => {
      const rest = prev.filter((l) => l.id !== letter.id)
      return [letter, ...rest]
    })
  }, [])

  /** Approval-gate changes update the letter's metadata without touching unsaved text. */
  const applyGateUpdate = useCallback((letter: DemandLetter) => {
    setActive((prev) => (prev && prev.id === letter.id ? { ...prev, ...letter, versions: prev.versions } : prev))
    setLetters((prev) => prev.map((l) => (l.id === letter.id ? { ...l, approvalGate: letter.approvalGate } : l)))
  }, [])

  const run = useCallback(
    async (key: string, fn: () => Promise<DemandLetter>, okText: string) => {
      setBusy(key)
      setMessage(null)
      try {
        applyUpdated(await fn())
        setMessage({ tone: 'ok', text: okText })
      } catch (err: any) {
        setMessage({ tone: 'err', text: err?.response?.data?.error || 'Something went wrong.' })
      } finally {
        setBusy(null)
      }
    },
    [applyUpdated],
  )

  const handleDraft = () =>
    run('draft', () => draftLeadDemandLetter(leadId, { guidance: guidance.trim() || null }), 'Draft ready to review.')

  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; message: string; action: () => void } | null>(null)

  const handleRegenerate = (asSuper = false) => {
    if (!active) return
    const go = () =>
      run(
        'regen',
        () =>
          regenerateLeadDemandLetter(leadId, active.id, {
            guidance: guidance.trim() || null,
            ...(asSuper ? { template: 'super' as const } : {}),
          }),
        asSuper
          ? 'Redrafted as a Super Demand. Your previous wording is kept in history.'
          : 'Redrafted. Your previous wording is kept in history.',
      )
    if (dirty) {
      setPendingConfirm({ title: 'Unsaved edits', message: 'Regenerating replaces your unsaved edits. Continue?', action: go })
    } else {
      go()
    }
  }

  const handleSave = () => {
    if (!active) return
    return run('save', () => saveLeadDemandLetter(leadId, active.id, { content: draftText }), 'Saved.')
  }

  const handleApprove = () => {
    if (!active) return
    return run('approve', () => approveLeadDemandLetter(leadId, active.id), 'Approved.')
  }

  const handleFinalize = () => {
    if (!active) return
    const go = () => run('finalize', () => finalizeLeadDemandLetter(leadId, active.id), 'Letter finalized.')
    if (dirty) {
      setPendingConfirm({ title: 'Unsaved edits', message: 'You have unsaved edits. Finalize the last saved version?', action: go })
    } else {
      go()
    }
  }

  const handleMarkSent = () => {
    if (!active) return
    setPendingConfirm({
      title: 'Mark demand as sent',
      message: 'Confirm the demand package has gone to the carrier. This advances the case to “Demand sent” and logs it on the negotiation timeline.',
      action: () => run('send', () => markLeadDemandSent(leadId, active.id), 'Demand marked as sent.'),
    })
  }

  const handleDownload = async () => {
    if (!active) return
    setBusy('download')
    try {
      const blob = await downloadDemandLetterDocx(active.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `demand-letter-${active.id}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setMessage({ tone: 'err', text: 'Download failed.' })
    } finally {
      setBusy(null)
    }
  }

  const handleDownloadOriginal = async () => {
    if (!active) return
    setBusy('original')
    try {
      const blob = await downloadLeadDemandOriginal(leadId, active.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = active.importedFileName || `demand-letter-${active.id}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setMessage({ tone: 'err', text: 'Download failed.' })
    } finally {
      setBusy(null)
    }
  }

  const resetImportForm = () => {
    setImportFile(null)
    setImportText('')
    setImportTitle('')
    setImportRecipient('')
    setImportTarget('')
    setImportSent(false)
    setImportSentDate('')
    setImportError(null)
  }

  const openImport = () => {
    resetImportForm()
    setShowImport(true)
  }

  const canSubmitImport = !!importFile || importText.trim().length > 0

  const handleImport = async () => {
    if (!canSubmitImport) return
    setImportBusy(true)
    setImportError(null)
    try {
      const created = await importLeadDemandLetter(leadId, {
        file: importFile,
        content: importFile ? undefined : importText,
        title: importTitle.trim() || undefined,
        recipientName: importRecipient.trim() || undefined,
        targetAmount: importTarget.trim() ? Number(importTarget) : undefined,
        markSent: importSent,
        sentAt: importSent && importSentDate ? importSentDate : undefined,
      })
      setLetters((prev) => [created, ...prev.filter((l) => l.id !== created.id)])
      await openLetter(created.id)
      setShowImport(false)
      setMessage({ tone: 'ok', text: 'Letter imported.' })
    } catch (err: any) {
      setImportError(err?.response?.data?.error || 'Import failed.')
    } finally {
      setImportBusy(false)
    }
  }

  const versions = useMemo(() => active?.versions || [], [active])

  // One next step at a time: the header's primary button is always the thing
  // that unblocks the letter, so Finalize is never a dead, greyed-out button.
  const gate = active?.approvalGate ?? null
  const gateSigned = gate?.items.filter((item) => item.checked).length ?? 0
  const gateTotal = gate?.items.length ?? 0
  const steps = active
    ? [
        { key: 'draft', label: 'Drafted', done: true },
        ...(active.reviewStatus
          ? [{ key: 'approve', label: awaitingReview ? `Approve ${AI_AUTHOR}'s draft` : 'Approved', done: locked || !awaitingReview }]
          : []),
        ...(isSuper
          ? [{ key: 'gate', label: gateTotal ? `Approval gate ${gateSigned}/${gateTotal}` : 'Approval gate', done: locked || !gateIncomplete }]
          : []),
        { key: 'final', label: 'Finalized', done: locked },
        { key: 'sent', label: 'Sent', done: sent },
      ]
    : []
  const nextStepKey = steps.find((step) => !step.done)?.key
  const scrollToGate = () =>
    document.getElementById('demand-approval-gate')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  let primary: ReactNode = null
  let blockedReason: string | null = null
  if (active && sent) {
    primary = (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
        <Send className="h-3.5 w-3.5" />
        Sent {formatWhen(active.sentAt)}
      </span>
    )
  } else if (active && locked) {
    primary = (
      <button type="button" onClick={handleMarkSent} disabled={busy != null} className={`${PRIMARY_BTN} bg-brand-600 hover:bg-brand-700`}>
        {busy === 'send' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Mark as sent
      </button>
    )
  } else if (active && dirty) {
    primary = (
      <button type="button" onClick={handleSave} disabled={busy != null} className={`${PRIMARY_BTN} bg-brand-600 hover:bg-brand-700`}>
        {busy === 'save' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {busy === 'save' ? 'Saving…' : 'Save'}
      </button>
    )
  } else if (active && awaitingReview) {
    primary = (
      <button type="button" onClick={handleApprove} disabled={busy != null} className={`${PRIMARY_BTN} bg-violet-600 hover:bg-violet-700`}>
        {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {busy === 'approve' ? 'Approving…' : `Approve ${AI_AUTHOR}'s draft`}
      </button>
    )
    blockedReason = `Finalize unlocks after you approve ${AI_AUTHOR}'s draft${isSuper ? ' and sign the attorney approval gate' : ''}.`
  } else if (active && gateIncomplete) {
    primary = (
      <button type="button" onClick={scrollToGate} className={`${PRIMARY_BTN} bg-brand-600 hover:bg-brand-700`}>
        <Lock className="h-3.5 w-3.5" />
        Sign approval gate{gateTotal ? ` (${gateSigned}/${gateTotal})` : ''}
      </button>
    )
    blockedReason = 'Finalize unlocks once every item in the attorney approval gate (right panel) is signed.'
  } else if (active) {
    primary = (
      <button type="button" onClick={handleFinalize} disabled={busy != null} className={`${PRIMARY_BTN} bg-emerald-600 hover:bg-emerald-700`}>
        {busy === 'finalize' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
        Finalize
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading demand letters…
      </div>
    )
  }

  return (
    <fieldset disabled={!canWorkDemands} className="m-0 min-w-0 space-y-4 border-0 p-0">
      {!canWorkDemands && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Read only: your firm role doesn&apos;t include drafting or sending demand letters.
        </div>
      )}
      {awaitingReview ? (
        <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/70 p-4">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-violet-900">{AI_AUTHOR} drafted this letter</p>
            <p className="mt-0.5 text-sm text-violet-800">
              It was written automatically when the case became demand-ready, and is on hold until someone approves it.
              Read it, edit anything you want, then approve.
            </p>
          </div>
        </div>
      ) : null}

      {!active ? intro : null}

      {!active ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-900">No demand letter yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {AI_AUTHOR} drafts a ClearCaseIQ Super Demand™ from the case record: a 17-section settlement package for the
            carrier, plus Demand Intelligence for you (readiness, valuation, weaknesses, statement confidence, and a quality
            check). You edit every word and sign the approval gate before it goes out.
          </p>
          <textarea
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            rows={2}
            placeholder="Anything to emphasize? e.g. lead with the delayed MRI and the three months of missed work."
            className="mx-auto mt-4 block w-full max-w-xl rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleDraft}
              disabled={busy != null}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {busy === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy === 'draft' ? 'Drafting…' : 'Draft Super Demand'}
            </button>
            <button
              type="button"
              onClick={openImport}
              disabled={busy != null}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Import a letter
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Already have one written in Word or Google Docs? Import it (PDF, .docx, or paste the text) — the original file is
            kept for download.
          </p>
        </div>
      ) : (
        <div className={isSuper ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]' : ''}>
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 pb-3 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 text-base font-semibold text-slate-900">{active.title || 'Demand letter'}</h3>
              {isSuper ? (
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                  <Sparkles className="h-3 w-3" />
                  Super Demand™
                </span>
              ) : null}
              {active.origin === 'imported' ? (
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  <Upload className="h-3 w-3" />
                  Imported
                </span>
              ) : null}
              {locked ? (
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  <Lock className="h-3 w-3" />
                  Final
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="whitespace-nowrap">Version {active.currentVersion}</span>
              <AuthorChip name={active.updatedByName} source={active.contentSource} />
              <span className="whitespace-nowrap">{formatWhen(active.updatedAt)}</span>
              {active.reviewedByName ? <span>· Approved by {active.reviewedByName}</span> : null}
              {active.finalizedByName ? <span>· Finalized by {active.finalizedByName}</span> : null}
            </div>

            <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[11px] font-semibold">
              {steps.map((step, i) => (
                <li key={step.key} className="flex items-center gap-1.5">
                  {i > 0 ? <span className="h-px w-3 bg-slate-200" aria-hidden /> : null}
                  <span
                    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 ${
                      step.done
                        ? 'bg-emerald-50 text-emerald-700'
                        : step.key === nextStepKey
                          ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {step.done ? <Check className="h-3 w-3" /> : null}
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!locked ? (
                <button
                  type="button"
                  onClick={() => handleRegenerate()}
                  disabled={busy != null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === 'regen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Redraft
                </button>
              ) : null}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  More
                  <ChevronDown className={`h-3.5 w-3.5 transition ${moreOpen ? 'rotate-180' : ''}`} />
                </button>
                {moreOpen ? (
                  <>
                    <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMoreOpen(false)} />
                    <div className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      <MenuItem icon={Download} onClick={() => { setMoreOpen(false); void handleDownload() }}>
                        Download Word
                      </MenuItem>
                      {active.hasOriginalFile ? (
                        <MenuItem icon={FileDown} onClick={() => { setMoreOpen(false); void handleDownloadOriginal() }}>
                          Download original file
                        </MenuItem>
                      ) : null}
                      {versions.length > 1 ? (
                        <MenuItem icon={History} onClick={() => { setMoreOpen(false); setShowHistory((v) => !v) }}>
                          {showHistory ? 'Hide version history' : 'Version history'}
                        </MenuItem>
                      ) : null}
                      <MenuItem icon={Upload} onClick={() => { setMoreOpen(false); openImport() }}>
                        Import a letter
                      </MenuItem>
                      {!locked && !isSuper && active.origin !== 'imported' ? (
                        <MenuItem icon={Sparkles} onClick={() => { setMoreOpen(false); handleRegenerate(true) }}>
                          Redraft as Super Demand
                        </MenuItem>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>

              <div className="ml-auto flex items-center gap-2.5">
                {!locked ? (
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {dirty ? 'Unsaved changes' : `Saved${active.updatedAt ? ` · ${formatWhen(active.updatedAt)}` : ''}`}
                  </span>
                ) : null}
                {primary}
              </div>
            </div>
            {blockedReason ? <p className="mt-2 text-xs text-amber-700">{blockedReason}</p> : null}
          </div>

          {!locked ? (
            <div className="border-b border-slate-100 px-5 py-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tell {AI_AUTHOR} what to emphasize
              </label>
              <input
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder="e.g. lead with the delayed MRI; stress the three months of missed work"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                Used on the next redraft. Figures always come from the case record, never from the model.
              </p>
            </div>
          ) : null}

          {showHistory && versions.length > 1 ? (
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
              <ul className="space-y-1.5">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                    <span className="font-semibold text-slate-700">v{v.version}</span>
                    <AuthorChip name={v.authorName} source={v.source} />
                    <span className="text-slate-400">{formatWhen(v.createdAt)}</span>
                    {v.version !== active.currentVersion ? (
                      <button
                        type="button"
                        onClick={() => setDraftText(v.content)}
                        className="ml-auto rounded-md px-2 py-0.5 font-semibold text-brand-700 transition hover:bg-brand-50"
                      >
                        Load into editor
                      </button>
                    ) : (
                      <span className="ml-auto text-slate-400">Current</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-400">
                Loading an older version puts its text in the editor. It only replaces the letter once you save.
              </p>
            </div>
          ) : null}

          <div className="rounded-b-2xl bg-slate-100/70 px-3 py-5 sm:px-6">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              readOnly={locked}
              spellCheck
              rows={30}
              aria-label="Demand letter text"
              className={`mx-auto block w-full max-w-[52rem] resize-y rounded-md border border-slate-200 px-6 py-8 font-serif text-[15px] leading-7 text-slate-800 shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:px-12 sm:py-12 ${
                locked ? 'bg-slate-50' : 'bg-white'
              }`}
            />
          </div>
        </div>
        {isSuper ? (
          <div className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
          <DemandIntelligencePanel
            leadId={leadId}
            letter={active}
            readOnly={locked || !canWorkDemands}
            onLetterUpdated={applyGateUpdate}
          />
          </div>
        ) : null}
        </div>
      )}

      {below?.({ isSuper: !!active && isSuper })}

      {message ? (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            message.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {message.tone === 'ok' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      ) : null}

      {letters.length > 1 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">All demand letters</h4>
          <ul className="mt-2 space-y-1">
            {letters.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => openLetter(l.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-slate-50 ${
                    l.id === active?.id ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-600'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{l.title || `Demand to ${l.recipient?.name || 'carrier'}`}</span>
                  <span className="ml-auto shrink-0 text-xs text-slate-400">{formatWhen(l.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showImport ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Import a demand letter</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Bring in a letter written elsewhere. Upload the file (PDF, .docx, or .txt) and we keep the original for
                  download, or paste the text.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original file</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="mt-1.5 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />
                {importFile ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {importFile.name} · the original will be kept for download.
                  </p>
                ) : null}
              </div>

              {!importFile ? (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Or paste the text</label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={6}
                    placeholder="Paste the full letter text here…"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title (optional)</label>
                  <input
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    placeholder="e.g. Demand to State Farm"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient (optional)</label>
                  <input
                    value={importRecipient}
                    onChange={(e) => setImportRecipient(e.target.value)}
                    placeholder="Adjuster / carrier"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demand amount (optional)</label>
                  <input
                    type="number"
                    min={0}
                    value={importTarget}
                    onChange={(e) => setImportTarget(e.target.value)}
                    placeholder="0"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={importSent}
                  onChange={(e) => setImportSent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">
                  This letter has already been sent to the carrier
                  <span className="block text-xs text-slate-500">
                    Records it as sent and advances the case to “Demand sent.”
                  </span>
                </span>
              </label>
              {importSent ? (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sent date (optional)</label>
                  <input
                    type="date"
                    value={importSentDate}
                    onChange={(e) => setImportSentDate(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
                  />
                </div>
              ) : null}

              {importError ? (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                  {importError}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImport(false)}
                disabled={importBusy}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importBusy || !canSubmitImport}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
              >
                {importBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importBusy ? 'Importing…' : 'Import letter'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!pendingConfirm}
        title={pendingConfirm?.title ?? ''}
        message={pendingConfirm?.message}
        confirmLabel="Continue"
        tone="default"
        onConfirm={() => { pendingConfirm?.action(); setPendingConfirm(null) }}
        onCancel={() => setPendingConfirm(null)}
      />
    </fieldset>
  )
}
