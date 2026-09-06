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
export function WorkflowCard({
  assistance,
  specialists,
  saving,
  onPatch,
}: {
  assistance: AssistanceQueueRow
  specialists: { id: string; name: string }[]
  saving: boolean
  onPatch: (
    input: {
      status?: AssistanceStatus
      priority?: 'low' | 'normal' | 'high'
      nextAction?: string | null
      assignedSpecialistId?: string | null
    },
    message?: string,
  ) => void
}) {
  return (
    <SectionCard title="Workflow">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Status</span>
          <select
            className="input w-full"
            value={assistance.status}
            disabled={saving}
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
            disabled={saving}
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
          disabled={saving}
          onSave={(nextAction) => onPatch({ nextAction }, 'Next action saved.')}
        />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Assigned to</span>
          <select
            className="input w-full"
            value={assistance.assignedSpecialist?.id || ''}
            disabled={saving}
            onChange={(e) => onPatch({ assignedSpecialistId: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {specialists.map((specialist) => (
              <option key={specialist.id} value={specialist.id}>
                {specialist.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          First review due {dueLabel(assistance.reviewDueAt)}.
        </p>
      </div>
    </SectionCard>
  )
}

function NextActionField({
  value,
  disabled,
  onSave,
}: {
  value: string | null
  disabled?: boolean
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
          disabled={disabled}
          maxLength={200}
          placeholder="e.g. Call back Thursday morning"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() !== (value || '') && onSave(draft.trim() || null)}
        />
      </label>
    </form>
  )
}
