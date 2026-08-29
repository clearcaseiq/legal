import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { US_STATES } from '../lib/constants'
import { getCountiesForState } from '../lib/usLocationData'
import type { CountiesByState } from '../lib/attorneyJurisdictions'

/**
 * Counties served within a single state.
 *
 * An empty selection is a real setting rather than an unfinished one: routing
 * reads "no counties listed" as serving the entire state, and only filters on
 * county once the list is non-empty. The control says so outright, because an
 * empty box otherwise reads as work someone forgot to do.
 */
export function CountyMultiSelect({
  stateCode,
  value,
  onChange,
}: {
  stateCode: string
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const selected = value || []
  const counties = useMemo(() => getCountiesForState(stateCode), [stateCode])

  const toggle = (county: string) =>
    onChange(selected.includes(county) ? selected.filter((c) => c !== county) : [...selected, county])

  const q = query.trim().toLowerCase()
  const filtered = counties.filter((county) => !q || county.toLowerCase().includes(q))

  if (counties.length === 0) {
    return (
      <p className="px-1 py-2 text-xs text-slate-400">
        No county list available for {stateCode}. This attorney will be matched on the state alone.
      </p>
    )
  }

  return (
    <div className="space-y-2.5">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((county) => (
            <button
              key={county}
              type="button"
              onClick={() => toggle(county)}
              title={`Remove ${county}`}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2 pr-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-100"
            >
              {county}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-full px-2 py-0.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Clear all
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          No counties selected, so this attorney is matched anywhere in {stateCode}. Pick counties only to narrow
          that.
        </p>
      )}

      <input
        type="text"
        placeholder={`Search ${counties.length} counties…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-slate-400">No counties match “{query}”.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {filtered.map((county) => {
              const isOn = selected.includes(county)
              return (
                <button
                  key={county}
                  type="button"
                  onClick={() => toggle(county)}
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
                  <span className="truncate">{county}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * County coverage for every state already chosen.
 *
 * Collapsed to a one-line summary per state, because the states control allows
 * picking all fifty and an expanded county grid for each would bury the rest of
 * the form. Statewide coverage is the common answer and needs no interaction.
 */
export function CountyCoverageEditor({
  states,
  value,
  onChange,
}: {
  states: string[]
  value: CountiesByState
  onChange: (next: CountiesByState) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const nameByCode = useMemo(
    () => Object.fromEntries(US_STATES.map((s) => [s.code, s.name])) as Record<string, string>,
    [],
  )

  if (states.length === 0) {
    return <p className="text-xs text-slate-400">Choose a state above to narrow it to specific counties.</p>
  }

  return (
    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {states.map((code) => {
        const selected = value[code] || []
        const total = getCountiesForState(code).length
        const isOpen = expanded === code
        return (
          <div key={code}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : code)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-sm">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="font-semibold text-slate-700">{code}</span>
                <span className="truncate text-xs text-slate-400">{nameByCode[code] || ''}</span>
              </span>
              <span className={`shrink-0 text-xs ${selected.length > 0 ? 'font-medium text-brand-700' : 'text-slate-400'}`}>
                {selected.length === 0
                  ? 'All counties'
                  : `${selected.length} of ${total || selected.length} counties`}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 bg-white px-3 py-3">
                <CountyMultiSelect
                  stateCode={code}
                  value={selected}
                  onChange={(next) => onChange({ ...value, [code]: next })}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
