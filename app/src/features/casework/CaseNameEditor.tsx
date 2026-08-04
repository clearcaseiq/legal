import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { updateCaseName } from '../../lib/api'
import { MAX_CASE_NAME_LENGTH } from '../../lib/caseName'

/**
 * The case caption in the workspace header, editable in place.
 *
 * Attorneys refer to a matter as "Plaintiff v. Defendant", but the defendant's
 * name is not captured anywhere in intake, so this is free text rather than two
 * structured fields. When nothing has been typed the heading falls back to the
 * client's name, which is how every case read before captions existed.
 */
export default function CaseNameEditor({
  leadId,
  displayName,
  customName,
  suggestion,
  onSaved,
}: {
  leadId: string
  displayName: string
  customName: string | null
  /** Prefill for a case that has never been named, e.g. "Rivera v. ". */
  suggestion?: string | null
  onSaved: (result: { caseName: string | null; caseDisplayName: string }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Land the cursor after the prefilled "Rivera v. " so the attorney types the
  // defendant straight away instead of having to click past the suggestion.
  useEffect(() => {
    if (!editing) return
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [editing])

  function open() {
    setValue(customName ?? suggestion ?? displayName)
    setError(null)
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const result = await updateCaseName(leadId, value)
      onSaved({ caseName: result.caseName, caseDisplayName: result.caseDisplayName })
      setEditing(false)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not save the case name.')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-1.5">
        <h1 className="text-lg font-bold text-slate-900">{displayName}</h1>
        {customName ? (
          <button
            type="button"
            onClick={open}
            aria-label="Rename case"
            title="Rename case"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 group-hover:text-slate-500"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={open}
            title="Set a case caption (e.g., Rivera v. Delgado)"
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-600 opacity-0 transition hover:bg-brand-50 group-hover:opacity-100"
          >
            + Add caption
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          maxLength={MAX_CASE_NAME_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
            if (e.key === 'Escape') setEditing(false)
          }}
          placeholder="Rivera v. Delgado Trucking"
          aria-label="Case name"
          className="w-72 max-w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {customName
          ? 'Clear the field to go back to the client’s name.'
          : 'Usually the case caption, e.g. “Rivera v. Delgado Trucking”.'}
      </p>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
}
