/**
 * Draft, edit, and finalize the demand letter for a case.
 *
 * The letter is stored as plain text and exported to Word by splitting on line
 * breaks, so this is a plain textarea rather than a rich-text editor: anything
 * with formatting would be lost on the way out.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bot,
  Check,
  Clock,
  Download,
  FileText,
  History,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  User,
} from 'lucide-react'
import {
  approveLeadDemandLetter,
  downloadDemandLetterDocx,
  draftLeadDemandLetter,
  finalizeLeadDemandLetter,
  getLeadDemandLetter,
  listLeadDemandLetters,
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

export default function DemandLetterWorkspace({ leadId }: { leadId: string }) {
  const [letters, setLetters] = useState<DemandLetter[]>([])
  const [active, setActive] = useState<DemandLetter | null>(null)
  const [draftText, setDraftText] = useState('')
  const [guidance, setGuidance] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // The letter the textarea currently reflects, so switching letters can replace
  // the buffer without a stale-edit check fighting the load.
  const loadedIdRef = useRef<string | null>(null)

  const dirty = active != null && draftText !== active.content
  const locked = active?.status !== 'DRAFT'
  const awaitingReview = active?.reviewStatus === 'pending'

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

  const handleRegenerate = () => {
    if (!active) return
    if (dirty && !window.confirm('Regenerating replaces your unsaved edits. Continue?')) return
    return run(
      'regen',
      () => regenerateLeadDemandLetter(leadId, active.id, { guidance: guidance.trim() || null }),
      'Redrafted. Your previous wording is kept in history.',
    )
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
    if (dirty && !window.confirm('You have unsaved edits. Finalize the last saved version?')) return
    return run('finalize', () => finalizeLeadDemandLetter(leadId, active.id), 'Letter finalized.')
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

  const versions = useMemo(() => active?.versions || [], [active])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading demand letters…
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
          <button
            type="button"
            onClick={handleApprove}
            disabled={busy != null}
            className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {busy === 'approve' ? 'Approving…' : 'Approve'}
          </button>
        </div>
      ) : null}

      {!active ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-900">No demand letter yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {AI_AUTHOR} can draft one from the case record — the incident, liability, treatment timeline, bills, wage
            loss, and the damages summary. You can edit every word before it goes out.
          </p>
          <textarea
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            rows={2}
            placeholder="Anything to emphasize? e.g. lead with the delayed MRI and the three months of missed work."
            className="mx-auto mt-4 block w-full max-w-xl rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleDraft}
            disabled={busy != null}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {busy === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy === 'draft' ? 'Drafting…' : 'Draft demand letter'}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-slate-900">
                  {active.title || 'Demand letter'}
                </h3>
                {locked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    <Lock className="h-3 w-3" />
                    Final
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Version {active.currentVersion}</span>
                <AuthorChip name={active.updatedByName} source={active.contentSource} />
                <span>{formatWhen(active.updatedAt)}</span>
                {active.reviewedByName ? <span>· Approved by {active.reviewedByName}</span> : null}
                {active.finalizedByName ? <span>· Finalized by {active.finalizedByName}</span> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {versions.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleDownload}
                disabled={busy != null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Word
              </button>
              {!locked ? (
                <>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={busy != null}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {busy === 'regen' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Redraft
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={busy != null || !dirty}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
                  >
                    {busy === 'save' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {busy === 'save' ? 'Saving…' : dirty ? 'Save' : 'Saved'}
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalize}
                    disabled={busy != null || awaitingReview}
                    title={awaitingReview ? `Approve ${AI_AUTHOR}'s draft first` : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Finalize
                  </button>
                </>
              ) : null}
            </div>
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

          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            readOnly={locked}
            spellCheck
            rows={28}
            className={`w-full resize-y rounded-b-2xl border-0 px-5 py-4 font-mono text-[13px] leading-relaxed text-slate-800 focus:outline-none ${
              locked ? 'bg-slate-50' : 'bg-white'
            }`}
          />
        </div>
      )}

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
    </div>
  )
}
