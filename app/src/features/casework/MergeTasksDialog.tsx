/**
 * Choose which of the selected tasks survives a merge.
 *
 * The survivor is the substance of the decision, not a detail: its title is what
 * remains on the board afterwards, and it is deliberately never renamed — the AI
 * loops dedupe on title, so a renamed survivor frees its old title for the coach
 * to recreate and the merge quietly comes undone.
 *
 * Everything else combines: the earliest due date, the highest priority, summed
 * estimates, both checklists, and the absorbed tasks' notes appended under a
 * "Merged in" heading. Logged time and comments move across too.
 */
import { useEffect, useState } from 'react'
import { Loader2, Merge, X } from 'lucide-react'

export interface MergeCandidate {
  id: string
  title: string
  dueDate?: string | null
  priority?: string | null
  taskType?: string | null
}

export default function MergeTasksDialog({
  tasks,
  busy,
  onCancel,
  onConfirm,
}: {
  tasks: MergeCandidate[]
  busy?: boolean
  onCancel: () => void
  onConfirm: (survivorId: string) => void
}) {
  const [survivorId, setSurvivorId] = useState<string>(tasks[0]?.id ?? '')

  // Keep the choice valid if the selection changes underneath the dialog.
  useEffect(() => {
    if (!tasks.some((t) => t.id === survivorId)) setSurvivorId(tasks[0]?.id ?? '')
  }, [tasks, survivorId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  const absorbedCount = Math.max(0, tasks.length - 1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-tasks-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="merge-tasks-title" className="text-base font-semibold text-slate-900">
              Merge {tasks.length} tasks
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Choose the task to keep. The rest are folded into it.</p>
          </div>
          <button
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto px-5 py-4">
          {tasks.map((t) => (
            <label
              key={t.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                survivorId === t.id
                  ? 'border-brand-300 bg-brand-50/60 ring-1 ring-brand-200'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="merge-survivor"
                checked={survivorId === t.id}
                onChange={() => setSurvivorId(t.id)}
                disabled={busy}
                className="mt-0.5 h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-400"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{t.title}</span>
                <span className="text-xs text-slate-500">
                  {survivorId === t.id ? 'Keeps this title' : 'Folded in and closed'}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-xs text-slate-600">
          The earliest due date, highest priority, both checklists, logged time and comments all move to the task you
          keep. The other {absorbedCount === 1 ? 'task is' : `${absorbedCount} tasks are`} closed and hidden, not
          deleted.
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => survivorId && onConfirm(survivorId)}
            disabled={busy || !survivorId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
            Merge
          </button>
        </div>
      </div>
    </div>
  )
}
