import { Badge, EmptyState, SectionCard } from '../../../features/shared/ui'
import type { AssistanceInteraction } from '../../../lib/api'
import { CHANNEL_LABELS, OUTCOME_LABELS, humanize, timeAgo } from '../assistanceLabels'

/**
 * What has happened on this case, most recent first.
 *
 * Only specialist-logged interactions today. System events — completeness
 * moving, attorney routing decisions — belong here too and are why the timeline
 * endpoint exists; wiring them up is the next step for this panel.
 */
export function ActivityList({
  interactions,
  title = 'Activity',
  emptyMessage = 'No contact logged yet.',
}: {
  interactions: AssistanceInteraction[]
  title?: string
  emptyMessage?: string
}) {
  return (
    <SectionCard title={title}>
      {interactions.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <ol className="space-y-3">
          {interactions.map((interaction) => (
            <li key={interaction.id} className="border-l-2 border-slate-200 pl-3 text-sm dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{CHANNEL_LABELS[interaction.channel] ?? interaction.channel}</Badge>
                {interaction.outcome && (
                  <span className="text-slate-700 dark:text-slate-300">
                    {OUTCOME_LABELS[interaction.outcome] ?? humanize(interaction.outcome)}
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {timeAgo(interaction.occurredAt)}
                  {interaction.specialistName ? ` · ${interaction.specialistName}` : ''}
                </span>
              </div>
              {interaction.notes && (
                <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-400">{interaction.notes}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )
}
