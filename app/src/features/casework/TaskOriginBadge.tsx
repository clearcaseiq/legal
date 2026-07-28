/**
 * Marks tasks Rose, the AI Case Manager, raised on her own, so an attorney can
 * tell them apart from work a teammate added.
 *
 * The wording is deliberate: Rose *raises* these tasks, she does not carry them
 * out. Every one is assigned to a real paralegal or attorney, so the badge has
 * to read as "Rose put this on your board", not "Rose is handling it".
 *
 * Shared by the cross-case Tasks queue and the case Tasks tab. Those two drifted
 * apart before — the queue had badges and the workspace showed only small grey
 * text — which is exactly what made AI work hard to spot.
 */
import { HelpCircle, ShieldAlert, Sparkles } from 'lucide-react'

/** Task types only the autonomous loop writes; everything manual is 'general'. */
export function isAiTask(taskType?: string | null): boolean {
  return taskType === 'coach' || taskType === 'question'
}

export const AI_AUTHOR_SHORT_NAME = 'Rose'

/** Pill for a next-best-action Rose queued up. */
function RoseTaskBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200"
      title="Raised by Rose, your AI Case Manager. She spots the next step; your team still does the work."
    >
      <Sparkles className="h-3 w-3" /> {AI_AUTHOR_SHORT_NAME}
    </span>
  )
}

/** Pill for the grouped checklist of questions to put to the plaintiff. */
function QuestionTaskBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200"
      title="Questions Rose wants answered — open the task for the checklist"
    >
      <HelpCircle className="h-3 w-3" /> {AI_AUTHOR_SHORT_NAME} · Q
    </span>
  )
}

/** Origin badge for a task row. Renders nothing for tasks a person created. */
export default function TaskOriginBadge({ taskType }: { taskType?: string | null }) {
  if (taskType === 'coach') return <RoseTaskBadge />
  if (taskType === 'question') return <QuestionTaskBadge />
  return null
}

/** Flags an AI task held for case-manager review before it goes live. */
export function PendingReviewBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200"
      title="Awaiting case-manager review — approve to assign it and make it live"
    >
      <ShieldAlert className="h-3 w-3" /> Pending review
    </span>
  )
}
