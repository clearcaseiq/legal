import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { US_STATES } from '../lib/constants'

// US Census regions — one tap bulk-adds a whole region (covers all 50 + DC).
const REGIONS: { label: string; codes: string[] }[] = [
  { label: 'Northeast', codes: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'] },
  { label: 'Midwest', codes: ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'] },
  { label: 'South', codes: ['DE', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'DC', 'WV', 'AL', 'KY', 'MS', 'TN', 'AR', 'LA', 'OK', 'TX'] },
  { label: 'West', codes: ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA'] },
]

/**
 * Compact multi-select for US states/jurisdictions. Optimizes for "pick a few":
 * selected states show as removable chips, region presets + All/Clear handle
 * bulk cases, and a search filters the full grid for everything else.
 */
export function StateMultiSelect({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const selected = value || []
  const nameByCode = useMemo(
    () => Object.fromEntries(US_STATES.map((s) => [s.code, s.name])) as Record<string, string>,
    [],
  )

  const toggle = (code: string) =>
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code])
  const addAll = () => onChange(US_STATES.map((s) => s.code))
  const clearAll = () => onChange([])
  const addRegion = (codes: string[]) => onChange(Array.from(new Set([...selected, ...codes])))

  const q = query.trim().toLowerCase()
  const filtered = US_STATES.filter(
    (s) => !q || s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
  )

  return (
    <div className="space-y-2.5">
      {/* Selected chips */}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              title={`Remove ${nameByCode[code] || code}`}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2 pr-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-100"
            >
              {code}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full px-2 py-0.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Clear all
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-400">No states selected yet — use a region shortcut or search below.</p>
      )}

      {/* Quick actions: region presets + all */}
      <div className="flex flex-wrap gap-1.5">
        {REGIONS.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => addRegion(r.codes)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            {r.label}
          </button>
        ))}
        <button
          type="button"
          onClick={addAll}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          All states
        </button>
      </div>

      {/* Search + grid */}
      <input
        type="text"
        placeholder="Search states…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-slate-400">No states match “{query}”.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {filtered.map((state) => {
              const isOn = selected.includes(state.code)
              return (
                <button
                  key={state.code}
                  type="button"
                  onClick={() => toggle(state.code)}
                  aria-pressed={isOn}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                    isOn
                      ? 'bg-brand-50 font-medium text-brand-800 ring-1 ring-inset ring-brand-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      isOn ? 'border-brand-500 bg-brand-600 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isOn ? '✓' : ''}
                  </span>
                  <span className="font-semibold">{state.code}</span>
                  <span className="truncate text-xs text-slate-400">{state.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
