/**
 * CaseTypeIntakePanel — generic renderer for the non-body-part case modules
 * (toxic exposure, med-mal, wrongful death, dog bite). It draws whatever
 * `caseTypeIntake` declares for the current incident type; add a module there
 * and it appears here with no UI changes.
 *
 * Value is a flat `Record<fieldId, value>`:
 *   multi  -> string[]   (with `${id}__other` holding free text when allowOther)
 *   single -> string
 *   yesno  -> boolean
 *   text   -> string
 *   date   -> string
 */
import { Check } from 'lucide-react'
import type { CaseField, CaseTypeModule } from '../data/caseTypeIntake'

type Props = {
  module: CaseTypeModule
  value: Record<string, any>
  onChange: (next: Record<string, any>) => void
}

const chipClass = (selected: boolean) =>
  `relative flex min-h-[2.25rem] w-full min-w-0 items-center justify-center rounded-xl border px-6 py-1 text-center transition-colors ${
    selected
      ? 'border-brand-500 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10'
      : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
  }`

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={chipClass(selected)}>
      <span className="[overflow-wrap:anywhere] text-center text-[13px] font-semibold leading-tight text-gray-800 dark:text-slate-200">
        {label}
      </span>
      {selected ? (
        <Check className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden />
      ) : null}
    </button>
  )
}

export default function CaseTypeIntakePanel({ module, value, onChange }: Props) {
  const set = (id: string, v: any) => onChange({ ...value, [id]: v })

  const toggleMulti = (id: string, optionId: string) => {
    const arr: string[] = Array.isArray(value[id]) ? value[id] : []
    set(id, arr.includes(optionId) ? arr.filter((x) => x !== optionId) : [...arr, optionId])
  }

  const renderField = (f: CaseField) => {
    switch (f.kind) {
      case 'multi': {
        const arr: string[] = Array.isArray(value[f.id]) ? value[f.id] : []
        const otherOn = arr.includes('other')
        return (
          <div key={f.id}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{f.label}</p>
            <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {f.options.map((o) => (
                <Chip key={o.id} label={o.label} selected={arr.includes(o.id)} onClick={() => toggleMulti(f.id, o.id)} />
              ))}
              {f.allowOther && <Chip label="Other" selected={otherOn} onClick={() => toggleMulti(f.id, 'other')} />}
            </div>
            {f.allowOther && otherOn && (
              <input
                type="text"
                value={typeof value[`${f.id}__other`] === 'string' ? value[`${f.id}__other`] : ''}
                onChange={(e) => set(`${f.id}__other`, e.target.value)}
                maxLength={200}
                placeholder="Please describe"
                className={inputClass}
              />
            )}
          </div>
        )
      }
      case 'single':
        return (
          <div key={f.id}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{f.label}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {f.options.map((o) => (
                <Chip key={o.id} label={o.label} selected={value[f.id] === o.id} onClick={() => set(f.id, value[f.id] === o.id ? '' : o.id)} />
              ))}
            </div>
          </div>
        )
      case 'yesno': {
        const v = value[f.id]
        return (
          <div key={f.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1 text-xs font-semibold text-gray-700 dark:text-slate-300">{f.label}</span>
            <div className="flex shrink-0 gap-1.5">
              {[
                { val: true, label: 'Yes', on: v === true },
                { val: false, label: 'No', on: v === false },
              ].map(({ val, label, on }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set(f.id, on ? undefined : val)}
                  className={`rounded-lg border px-3 py-1 text-center text-[13px] font-semibold transition-colors ${
                    on
                      ? 'border-brand-500 bg-brand-50/70 text-brand-800 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-200'
                      : 'border-slate-200 bg-white text-gray-700 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )
      }
      case 'text':
        return (
          <div key={f.id}>
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">{f.label}</label>
            {f.long ? (
              <textarea
                value={typeof value[f.id] === 'string' ? value[f.id] : ''}
                onChange={(e) => set(f.id, e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={f.placeholder}
                className={`${inputClass} resize-y`}
              />
            ) : (
              <input
                type="text"
                value={typeof value[f.id] === 'string' ? value[f.id] : ''}
                onChange={(e) => set(f.id, e.target.value)}
                maxLength={300}
                placeholder={f.placeholder}
                className={inputClass}
              />
            )}
          </div>
        )
      case 'date':
        return (
          <div key={f.id}>
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">{f.label}</label>
            <input
              type="date"
              value={typeof value[f.id] === 'string' ? value[f.id] : ''}
              onChange={(e) => set(f.id, e.target.value)}
              className={inputClass}
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      <div>
        <p className="font-display text-sm font-bold text-gray-900 dark:text-slate-100">{module.title}</p>
        {module.intro && <p className="mt-0.5 text-xs leading-snug text-gray-500">{module.intro}</p>}
      </div>
      {module.sections.map((s) => (
        <div key={s.id} className="space-y-2.5 border-t border-slate-200 pt-3 first:border-t-0 first:pt-0 dark:border-slate-700">
          <div>
            <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{s.title}</p>
            {s.helper && <p className="mt-0.5 text-xs text-gray-500">{s.helper}</p>}
          </div>
          {s.fields.map(renderField)}
        </div>
      ))}
    </div>
  )
}
