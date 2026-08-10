/**
 * BodyRegionPicker — the expanded "Where were you injured?" selector.
 *
 * Progressive disclosure: the regions most relevant to the incident type show
 * first as a "common areas" row; the full grouped catalog (musculoskeletal,
 * head & neurological, internal, skin, psychological, other) sits behind a
 * "More body areas" expander. Selecting a region drives the dynamic injury card
 * for that area (see DynamicInjuryCards). Selected ids are stored in
 * `injuryDetails.bodyParts`, same as before, so the rest of the wizard is
 * unchanged.
 */
import { ChevronDown, Check } from 'lucide-react'
import { commonRegionsForIncident, orderedRegionGroups, regionLabel } from '../data/injuryQuestionLibrary'

type Props = {
  injuryType: string
  value: string[]
  onToggle: (regionId: string) => void
}

function RegionChip({ id, selected, onToggle }: { id: string; selected: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(id)}
      className={`flex min-h-[2.25rem] w-full min-w-0 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-left transition-colors ${
        selected
          ? 'border-brand-500 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10'
          : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
      }`}
    >
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere] text-[13px] font-semibold leading-tight text-gray-800 dark:text-slate-200 sm:text-xs">
        {regionLabel(id)}
      </span>
      {selected ? (
        <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
      ) : (
        <span className="h-4 w-4 shrink-0" aria-hidden />
      )}
    </button>
  )
}

export default function BodyRegionPicker({ injuryType, value, onToggle }: Props) {
  const common = commonRegionsForIncident(injuryType)
  const groups = orderedRegionGroups(injuryType)
  // Regions the claimant selected that aren't in the common row — surface them
  // so a selection made inside the expander stays visible after it collapses.
  const selectedNotCommon = value.filter((v) => !common.includes(v) && v !== 'other')

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Common for your situation</p>
        <div className="mt-1.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {common.map((id) => (
            <RegionChip key={id} id={id} selected={value.includes(id)} onToggle={onToggle} />
          ))}
          {selectedNotCommon.map((id) => (
            <RegionChip key={id} id={id} selected onToggle={onToggle} />
          ))}
        </div>
      </div>

      <details className="group rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">More body areas</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-700">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{g.label}</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {g.regions.map((id) => (
                  <RegionChip key={id} id={id} selected={value.includes(id)} onToggle={onToggle} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
