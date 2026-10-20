/**
 * The attorney's daily-impact statement on the Medical tab. Drafted from the
 * client's journal and the interview notes, edited here, and once approved it
 * is the demand's pain and suffering section, word for word.
 */
import { useEffect, useState } from 'react'
import { CheckCircle2, FileText, Sparkles } from 'lucide-react'
import {
  draftImpactStatement,
  getImpactStatement,
  saveImpactStatement,
  type ImpactStatement,
} from '../../lib/api'

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

const errorOf = (err: any, fallback: string) => err?.response?.data?.error || fallback

export default function ImpactStatementPanel({
  leadId,
  journalCount,
  onChanged,
}: {
  leadId: string
  journalCount: number
  onChanged?: () => void
}) {
  const [saved, setSaved] = useState<ImpactStatement>(null)
  const [statement, setStatement] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<null | 'draft' | 'save' | 'approve' | 'unapprove'>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    getImpactStatement(leadId)
      .then((s) => {
        if (!live) return
        setSaved(s)
        setStatement(s?.statement ?? '')
        setNotes(s?.interviewNotes ?? '')
      })
      .catch((err) => live && setError(errorOf(err, 'Could not load the impact statement.')))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [leadId])

  const approved = saved?.status === 'approved'
  const dirty = statement !== (saved?.statement ?? '') || notes !== (saved?.interviewNotes ?? '')

  const draft = async () => {
    if (statement.trim() && !window.confirm('Replace the current statement with a fresh draft?')) return
    setBusy('draft')
    setError(null)
    setNotice(null)
    try {
      setStatement(await draftImpactStatement(leadId, notes))
      setNotice('Draft ready. Edit it in your own words, then save or approve.')
    } catch (err: any) {
      setError(errorOf(err, 'Could not draft the statement.'))
    } finally {
      setBusy(null)
    }
  }

  const save = async (nextApproved: boolean, which: 'save' | 'approve' | 'unapprove') => {
    setBusy(which)
    setError(null)
    setNotice(null)
    try {
      const res = await saveImpactStatement(leadId, { statement, interviewNotes: notes, approved: nextApproved })
      setSaved(res.statement)
      setStatement(res.statement?.statement ?? '')
      setNotes(res.statement?.interviewNotes ?? '')
      const tasks = res.tasksCompleted ? ` ${res.tasksCompleted} task${res.tasksCompleted > 1 ? 's' : ''} marked done.` : ''
      setNotice(
        (which === 'approve'
          ? 'Approved. The next demand draft uses this statement for pain and suffering.'
          : which === 'unapprove'
            ? 'Moved back to draft. Demands use the standard wording until it is approved again.'
            : 'Saved.') + tasks,
      )
      if (res.tasksCompleted) onChanged?.()
    } catch (err: any) {
      setError(errorOf(err, 'Could not save the statement.'))
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading impact statement…</p>

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <FileText className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Daily-impact statement</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              How the injuries changed the client's everyday life. Once approved, it replaces the standard wording in the
              demand's pain and suffering section.
            </p>
          </div>
        </div>
        {approved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved for demand
          </span>
        ) : saved ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Draft</span>
        ) : null}
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-slate-500">Interview notes (internal)</span>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What the client told you: activities they've given up, sleep, work, family, mood, how long it has lasted."
          className={inputCls}
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={draft}
          disabled={busy !== null || (journalCount === 0 && !notes.trim())}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" /> {busy === 'draft' ? 'Drafting…' : 'Draft from journal and notes'}
        </button>
        <span className="text-xs text-slate-500">
          {journalCount > 0
            ? `${journalCount} journal entr${journalCount === 1 ? 'y' : 'ies'} available.`
            : 'No journal entries yet. Add interview notes to draft from them.'}
        </span>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-slate-500">Statement for the demand</span>
        <textarea
          rows={10}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Write how the injuries affect the client's daily life, or draft it from the journal and your notes above."
          className={inputCls}
        />
      </label>

      {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
        <span className="mr-auto text-xs text-slate-400">
          {approved && saved?.approvedAt
            ? `Approved${saved.approvedByName ? ` by ${saved.approvedByName}` : ''} on ${new Date(saved.approvedAt).toLocaleDateString('en-US')}`
            : saved
              ? `Last saved${saved.updatedByName ? ` by ${saved.updatedByName}` : ''} on ${new Date(saved.updatedAt).toLocaleDateString('en-US')}`
              : 'Not saved yet'}
        </span>
        {approved ? (
          <button
            type="button"
            onClick={() => void save(false, 'unapprove')}
            disabled={busy !== null}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === 'unapprove' ? 'Saving…' : 'Back to draft'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void save(false, 'save')}
            disabled={busy !== null || !dirty}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === 'save' ? 'Saving…' : 'Save draft'}
          </button>
        )}
        <button
          type="button"
          onClick={() => void save(true, 'approve')}
          disabled={busy !== null || !statement.trim() || (approved && !dirty)}
          className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {busy === 'approve' ? 'Saving…' : approved ? 'Save approved changes' : 'Approve for demand'}
        </button>
      </div>
    </div>
  )
}
