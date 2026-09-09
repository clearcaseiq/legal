import { LoadingState, SectionCard } from '../../../features/shared/ui'
import type { AssistanceGap } from '../../../lib/api'

/**
 * One answer to "what do I do with this case right now".
 *
 * This replaces three panels that were three views of the same thing — a coach
 * headline, a gap list and a question list, each ranked separately, so a
 * specialist had to read all three and decide which to believe. The ranking
 * lives here once, and the button starts the flow that closes the items rather
 * than leaving the specialist to work out where to type the answers.
 */
export function NextBestAction({
  headline,
  gaps,
  firstName,
  loading,
  onStartIntake,
  onRequestDocuments,
}: {
  headline: string | null
  gaps: AssistanceGap[]
  firstName: string | null
  /** The analysis arrives a request behind the case file. */
  loading?: boolean
  onStartIntake: () => void
  onRequestDocuments: () => void
}) {
  const top = gaps.slice(0, 3)
  const requestable = gaps.some((gap) => gap.requestedDoc)

  // Checked before the empty state, which would otherwise be a lie told during
  // every load: with no gaps yet, this card said the file had no critical gaps
  // left and invited the specialist to move the case to Ready for Attorney.
  if (loading) {
    return (
      <SectionCard title="Next best action">
        <LoadingState message="Working out what this case needs…" />
      </SectionCard>
    )
  }

  if (top.length === 0) {
    return (
      <SectionCard title="Next best action">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {headline || 'Nothing high priority is outstanding.'}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The file has no critical gaps left. Move the case to Ready for Attorney when you are satisfied with it.
        </p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Next best action">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {headline ||
          `Contact ${firstName || 'the claimant'} to complete ${top.length} high-priority ${
            top.length === 1 ? 'item' : 'items'
          }`}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        These are what the case file is missing before an attorney can act on it.
      </p>

      <ol className="mt-3 space-y-2.5">
        {top.map((gap, index) => (
          <li key={gap.key} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{gap.label}</p>
              {gap.rationale && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{gap.rationale}</p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onStartIntake}
          className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          Start assisted intake
        </button>
        {requestable && (
          <button
            type="button"
            onClick={onRequestDocuments}
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            Request documents instead
          </button>
        )}
      </div>
    </SectionCard>
  )
}
