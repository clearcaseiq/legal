/**
 * Editable essential fields (firm, client, case, fees / records…) for a firm's
 * own retainer or HIPAA template, prefilled from intake.
 */
import { RotateCcw } from 'lucide-react'
import type { EssentialField, EssentialValues } from '../lib/api-esign'

export function EssentialFieldsForm({
  fields,
  values,
  prefill,
  loading,
  onChange,
  labelCls,
  inputCls,
}: {
  fields: EssentialField[]
  values: EssentialValues
  prefill: EssentialValues
  loading?: boolean
  onChange: (next: EssentialValues) => void
  labelCls: string
  inputCls: string
}) {
  if (loading) {
    return <p className="text-xs text-slate-400">Loading client and case details…</p>
  }
  if (!fields.length) return null

  const groups: { name: string; fields: EssentialField[] }[] = []
  for (const f of fields) {
    const last = groups[groups.length - 1]
    if (last && last.name === f.group) last.fields.push(f)
    else groups.push({ name: f.group, fields: [f] })
  }
  const edited = fields.some((f) => (values[f.key] ?? '') !== (prefill[f.key] ?? ''))

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Document fields</p>
          <p className="text-xs text-slate-500">
            Prefilled from intake. Edit anything before sending. The legal clauses in your template are not changed.
          </p>
        </div>
        {edited && (
          <button
            type="button"
            onClick={() => onChange({ ...prefill })}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to intake
          </button>
        )}
      </div>
      {groups.map((g) => (
        <div key={g.name}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.name}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.fields.map((f) => (
              <div key={f.key} className={f.multiline ? 'sm:col-span-2' : undefined}>
                <label className={labelCls} htmlFor={`essential-${f.key}`}>
                  {f.label}
                </label>
                {f.multiline ? (
                  <textarea
                    id={`essential-${f.key}`}
                    rows={2}
                    value={values[f.key] ?? ''}
                    onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
                    className={inputCls}
                  />
                ) : (
                  <input
                    id={`essential-${f.key}`}
                    value={values[f.key] ?? ''}
                    onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
                    className={inputCls}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
