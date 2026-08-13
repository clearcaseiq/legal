/**
 * Per-case Rose — AI Case Manager surface.
 * Replaces the cross-case left-nav board with case-scoped run / review / coach.
 */
import { useMemo, useState } from 'react'
import { BadgeCheck, Bot, Loader2, Play, Sparkles } from 'lucide-react'
import { approveAllLeadTasks, getCaseCoach } from '../../lib/api'
import CaseCoachPanel from './CaseCoachPanel'
import TaskOriginBadge, { isAiTask } from './TaskOriginBadge'

type TaskLike = {
  id: string
  title: string
  status?: string | null
  taskType?: string | null
  reviewStatus?: string | null
  priority?: string | null
}

type Props = {
  leadId: string
  tasks: TaskLike[]
  reloadTasks: () => Promise<void> | void
  onGoTasks: () => void
}

export default function CaseRosePanel({ leadId, tasks, reloadTasks, onGoTasks }: Props) {
  const [running, setRunning] = useState(false)
  const [approving, setApproving] = useState(false)
  const [coachKey, setCoachKey] = useState(0)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const flash = (tone: 'ok' | 'err', text: string) => {
    setMsg({ tone, text })
    window.setTimeout(() => setMsg(null), 5000)
  }

  const roseTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        isAiTask(t.taskType) &&
        String(t.status || '').toLowerCase() !== 'done' &&
        String(t.status || '').toLowerCase() !== 'completed' &&
        String(t.status || '').toLowerCase() !== 'cancelled',
    )
  }, [tasks])

  const pendingReview = useMemo(
    () => roseTasks.filter((t) => String(t.reviewStatus || '').toLowerCase() === 'pending'),
    [roseTasks],
  )

  const runRose = async () => {
    setRunning(true)
    try {
      await getCaseCoach(leadId)
      await reloadTasks()
      setCoachKey((k) => k + 1)
      flash('ok', 'Rose reviewed this case and updated next actions.')
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Could not run Rose on this case.')
    } finally {
      setRunning(false)
    }
  }

  const approvePending = async () => {
    setApproving(true)
    try {
      const res = await approveAllLeadTasks(leadId)
      flash('ok', `Approved ${res.approved} task${res.approved === 1 ? '' : 's'} for this case.`)
      await reloadTasks()
      setCoachKey((k) => k + 1)
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to approve tasks.')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Rose — AI Case Manager</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Rose reviews <span className="font-medium">this case</span>, raises the next tasks, and turns
                intelligent questions into work. Look for the Rose badge on Tasks — she spots the work; your team
                still does it.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingReview.length > 0 ? (
              <button
                type="button"
                onClick={() => void approvePending()}
                disabled={approving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
              >
                {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                Approve pending ({pendingReview.length})
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void runRose()}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run Rose on this case
            </button>
          </div>
        </div>
      </div>

      {msg ? (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm ring-1 ring-inset ${
            msg.tone === 'ok'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-rose-50 text-rose-700 ring-rose-200'
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Raised by Rose (open)" value={roseTasks.length} />
        <StatCard label="Pending review" value={pendingReview.length} />
        <button
          type="button"
          onClick={onGoTasks}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-brand-200"
        >
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Open Tasks</p>
          <p className="mt-1 text-sm font-semibold text-brand-700">View full queue →</p>
        </button>
      </div>

      <CaseCoachPanel key={coachKey} leadId={leadId} alwaysShow />

      <div className="rounded-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-semibold text-slate-900">Rose tasks on this case</h3>
          </div>
          <button type="button" onClick={onGoTasks} className="text-xs font-semibold text-brand-700 hover:underline">
            All tasks
          </button>
        </div>
        {roseTasks.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No open Rose tasks yet. Run Rose to raise the next actions for this matter.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {roseTasks.slice(0, 12).map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <TaskOriginBadge taskType={t.taskType} />
                    <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {t.priority ? `${t.priority} priority` : 'Priority n/a'}
                    {String(t.reviewStatus || '').toLowerCase() === 'pending' ? ' · pending review' : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
