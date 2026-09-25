import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, RotateCcw, Save } from 'lucide-react'

/**
 * Pending, unsaved edits layered over the last server copy. Nothing persists
 * until the caller saves `draft` and calls `clear()`.
 */
export function useDraft<T extends object>() {
  const [draft, setDraft] = useState<Partial<T>>({})
  const set = useCallback((patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch })), [])
  const clear = useCallback(() => setDraft({}), [])
  const dirty = Object.keys(draft).length > 0
  useUnsavedChangesWarning(dirty)
  return { draft, set, clear, dirty }
}

export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
}

export default function SaveChangesBar({
  dirty,
  saving,
  savedAt,
  error,
  onSave,
  onDiscard,
  label = 'Save changes',
  sticky = true,
}: {
  dirty: boolean
  saving: boolean
  savedAt?: number | null
  error?: string | null
  onSave: () => void
  onDiscard: () => void
  label?: string
  sticky?: boolean
}) {
  const [showSaved, setShowSaved] = useState(false)
  useEffect(() => {
    if (!savedAt) return
    setShowSaved(true)
    const t = setTimeout(() => setShowSaved(false), 2500)
    return () => clearTimeout(t)
  }, [savedAt])

  if (!dirty && !saving && !showSaved && !error) return null

  return (
    <div
      className={`${sticky ? 'sticky bottom-3 z-20' : ''} flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 shadow-lg ${
        error ? 'border-rose-200 bg-rose-50' : dirty ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
      }`}
      role="status"
    >
      <span className={`text-sm font-medium ${error ? 'text-rose-700' : dirty ? 'text-amber-800' : 'text-emerald-700'}`}>
        {error ? (
          error
        ) : dirty ? (
          'You have unsaved changes.'
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4" /> Changes saved
          </span>
        )}
      </span>
      {dirty || saving ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving…' : label}
          </button>
        </div>
      ) : null}
    </div>
  )
}
