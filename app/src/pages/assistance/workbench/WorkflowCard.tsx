import { useEffect, useState } from 'react'
import { SectionCard } from '../../../features/shared/ui'
import type { AssistanceQueueRow, AssistanceStatus } from '../../../lib/api'
import {
  ASSISTANCE_STATUS_LABELS,
  ASSISTANCE_STATUS_ORDER,
  PRIORITY_LABELS,
  dueLabel,
} from '../assistanceLabels'

/** The specialist's own workflow fields — never the claimant's case answers. */
/**
 * Why nothing here is disabled while a save is in flight.
 *
 * These fields used to carry `disabled={saving}`. Disabling a `<select>` that
 * the browser is currently showing a dropdown for closes the popup and drops
 * focus to the document body, which on a long page scrolls it back to the top —
 * so choosing an assignee threw the specialist to the top of a blank-looking
 * screen and read as the page reloading. Each field is an independent
 * last-write-wins PATCH, so leaving them live costs nothing worse than a second
 * request, and the "Saving…" label says what is happening without seizing
 * anything from the person mid-click.
 */
/** The one status from which a case may be handed to the routing engine. */
const RELEASABLE_STATUS: AssistanceStatus = 'ready_for_attorney_review'

export function WorkflowCard({
  assistance,
  specialists,
  saving,
  releasing,
  onPatch,
  onRelease,
}: {
  assistance: AssistanceQueueRow
  specialists: { id: string; name: string; role?: string }[]
  saving: boolean
  releasing: boolean
  onPatch: (
    input: {
      status?: AssistanceStatus
      priority?: 'low' | 'normal' | 'high'
      nextAction?: string | null
      assignedSpecialistId?: string | null
    },
    message?: string,
  ) => void
  onRelease: () => void
}) {
  const releasable = assistance.status === RELEASABLE_STATUS
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          Workflow
          {saving && (
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400" role="status">
              Saving…
            </span>
          )}
        </span>
      }
    >
      <div className="space-y-3" aria-busy={saving}>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Status</span>
          <select
            className="input w-full"
            value={assistance.status}
            onChange={(e) => onPatch({ status: e.target.value as AssistanceStatus })}
          >
            {ASSISTANCE_STATUS_ORDER.map((option) => (
              <option key={option} value={option}>
                {ASSISTANCE_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Priority</span>
          <select
            className="input w-full"
            value={assistance.priority}
            onChange={(e) => onPatch({ priority: e.target.value as 'low' | 'normal' | 'high' })}
          >
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <NextActionField
          value={assistance.nextAction}
          onSave={(nextAction) => onPatch({ nextAction }, 'Next action saved.')}
        />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Assigned to</span>
          <select
            className="input w-full"
            value={assistance.assignedSpecialist?.id || ''}
            onChange={(e) => onPatch({ assignedSpecialistId: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {specialists.map((specialist) => (
              <option key={specialist.id} value={specialist.id}>
                {/* Admins are assignable but are not who a case normally goes
                    to, so the list says which is which. */}
                {specialist.role === 'admin' ? `${specialist.name} (Admin)` : specialist.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          First review due {dueLabel(assistance.reviewDueAt)}.
        </p>

        {/* Sits under the workflow fields because it acts on the status above
            it, and is shown disabled rather than hidden so it is discoverable
            as the thing that happens next. */}
        <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
          <button
            type="button"
            onClick={onRelease}
            disabled={!releasable || releasing}
            className="btn-primary w-full text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {releasing ? 'Releasing…' : 'Release for Routing'}
          </button>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {!releasable
              ? `Available once the status is ${ASSISTANCE_STATUS_LABELS[RELEASABLE_STATUS]}.`
              : // Says it is a re-send because choosing the status already
                // started one, silently. Without this the button reads as the
                // only handover, and a specialist who never pressed it would
                // assume nothing had gone out.
                'Offers this case to matching attorneys and reports the result. Choosing the status above already started this once; releasing again is safe.'}
          </p>
        </div>
      </div>
    </SectionCard>
  )
}

function NextActionField({
  value,
  onSave,
}: {
  value: string | null
  onSave: (value: string | null) => void
}) {
  const [draft, setDraft] = useState(value || '')
  useEffect(() => setDraft(value || ''), [value])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(draft.trim() || null)
      }}
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Next action</span>
        <input
          className="input w-full"
          value={draft}
          maxLength={200}
          placeholder="e.g. Call back Thursday morning"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() !== (value || '') && onSave(draft.trim() || null)}
        />
      </label>
    </form>
  )
}
