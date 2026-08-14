/**
 * BodyRegionPicker — the "Where were you injured?" selector.
 *
 * Shows the regions most relevant to the incident type (plus Other). Selecting
 * a region drives the dynamic injury card for that area (see DynamicInjuryCards).
 * Selected ids are stored in `injuryDetails.bodyParts`.
 */
import { Check } from 'lucide-react'
import { commonRegionsForIncident, regionLabel } from '../data/injuryQuestionLibrary'

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
      className={`relative flex min-h-[2.25rem] w-full min-w-0 items-center justify-center rounded-xl border px-6 py-1 text-center transition-colors ${
        selected
          ? 'border-brand-500 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10'
          : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
      }`}
    >
      <span className="[overflow-wrap:anywhere] text-center text-[13px] font-semibold leading-tight text-gray-800 dark:text-slate-200">
        {regionLabel(id)}
      </span>
      {selected ? (
        <Check className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden />
      ) : null}
    </button>
  )
}

export default function BodyRegionPicker({ injuryType, value, onToggle }: Props) {
  const common = commonRegionsForIncident(injuryType)
  // Keep Other on the main row so claimants can still describe areas outside
  // the common set (the old "More body areas" expander used to host this).
  const regions = common.includes('other') ? common : [...common, 'other']
  // Surface any previously selected regions that aren't in the current common
  // list (e.g. from an earlier session that used the full catalog).
  const selectedExtras = value.filter((v) => !regions.includes(v))

  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {regions.map((id) => (
          <RegionChip key={id} id={id} selected={value.includes(id)} onToggle={onToggle} />
        ))}
        {selectedExtras.map((id) => (
          <RegionChip key={id} id={id} selected onToggle={onToggle} />
        ))}
      </div>
    </div>
  )
}
