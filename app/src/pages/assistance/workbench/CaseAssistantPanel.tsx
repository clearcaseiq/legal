import { Badge, EmptyState, SectionCard } from '../../../features/shared/ui'
import type { AssistanceQuestion } from '../../../lib/api'

type MissingDoc = { key: string; label: string; priority: string }
type TreatmentGap = { startDate: string; endDate: string; gapDays: number }

/**
 * The assistant rail: what to ask next, what is queued behind it, and what to
 * chase in writing.
 *
 * The panel this replaces rendered every question and every gap at full length
 * in a column beside the case, which is how it came to be the tallest thing on
 * the screen. A specialist on a call needs the next question and a sense of what
 * follows it; the full list belongs in the tab built for working through it.
 */
export function CaseAssistantPanel({
  questions,
  treatmentGaps,
  missingDocs,
  loading,
  error,
  onStartIntake,
  onRequestDocuments,
}: {
  questions: AssistanceQuestion[]
  treatmentGaps: TreatmentGap[]
  missingDocs: MissingDoc[]
  loading: boolean
  error: string | null
  onStartIntake: () => void
  onRequestDocuments: () => void
}) {
  if (loading) {
    return (
      <SectionCard title="Case assistant">
        <p className="text-sm text-slate-500 dark:text-slate-400">Analysing this case…</p>
      </SectionCard>
    )
  }
  if (error) {
    return (
      <SectionCard title="Case assistant">
        <EmptyState message={error} />
      </SectionCard>
    )
  }

  const [next, ...rest] = questions

  return (
    <div className="space-y-4">
      <SectionCard title="Case assistant">
        {next ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ask next
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              {/* Employee voice when the generator supplied it — "Ask for the claim
                  number" reads better on a call than the claimant-facing wording. */}
              {next.askInstruction || next.text}
            </p>
            {next.askInstruction && (
              <p className="mt-0.5 text-xs italic text-slate-500 dark:text-slate-400">“{next.text}”</p>
            )}
            {next.whyAsked && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-600 dark:text-slate-300">Why: </span>
                {next.whyAsked}
              </p>
            )}
            <button
              type="button"
              onClick={onStartIntake}
              className="mt-3 w-full rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-300"
            >
              Work through these on a call
            </button>

            {rest.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  After that
                </p>
                <ul className="mt-2 space-y-1.5">
                  {rest.slice(0, 5).map((question) => (
                    <li key={question.id} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="min-w-0">{question.askInstruction || question.text}</span>
                    </li>
                  ))}
                </ul>
                {rest.length > 5 && (
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                    +{rest.length - 5} more in Assisted intake
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <EmptyState message="No outstanding questions for this case." />
        )}

        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          These are questions to ask, not advice to give. Do not tell a claimant whether they have a case, what it is
          worth, or what they should do legally — that is for an attorney.
        </p>
      </SectionCard>

      {treatmentGaps.length > 0 && (
        <SectionCard
          title="Possible inconsistency"
          trailing={<Badge tone="warning">{treatmentGaps.length}</Badge>}
        >
          <ul className="space-y-2">
            {treatmentGaps.slice(0, 3).map((gap) => (
              <li key={`${gap.startDate}-${gap.endDate}`} className="text-sm">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {gap.gapDays}-day gap in treatment
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Between {formatDate(gap.startDate)} and {formatDate(gap.endDate)}. Ask what happened in between —
                  an unexplained gap reads as recovery.
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {missingDocs.length > 0 && (
        <SectionCard title="Documents to request">
          <ul className="space-y-1.5">
            {missingDocs.slice(0, 6).map((doc) => (
              <li key={doc.key} className="flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot(doc.priority)}`} aria-hidden="true" />
                <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">{doc.label}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onRequestDocuments}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Request documents
          </button>
        </SectionCard>
      )}
    </div>
  )
}

function priorityDot(priority: string): string {
  if (priority === 'high' || priority === 'critical') return 'bg-rose-500'
  if (priority === 'medium' || priority === 'important') return 'bg-amber-500'
  return 'bg-slate-300 dark:bg-slate-600'
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
