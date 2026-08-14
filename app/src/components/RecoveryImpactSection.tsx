/**
 * RecoveryImpactSection — the richer "how are you recovering / how has life
 * changed" block for Step 3 (Card 3).
 *
 * Replaces the old 4-option recovery radio and flat daily-life grid with:
 *  - a 6-level recovery status (kept compatible: still emits `getting_worse` /
 *    `fully_recovered`, which the severity scorer reads),
 *  - an optional self-rated recovery slider (0-100),
 *  - a "still treating?" status,
 *  - universal daily-life impact areas, each with a lightweight branching
 *    follow-up (e.g. Work -> reduced hours / light duty / unable to work).
 *
 * All selections write back through `onPatch` into `injuryDetails`. Inline
 * English for now; localisation is a later phase.
 */
import { Check } from 'lucide-react'

type Value = {
  recoveryStatus: string
  recoveryPercent: number | null
  treatmentStatus: string
  lifestyleImpact: string[]
  lifestyleOther: string
  lifeImpactDetail: Record<string, string[]>
}

type Props = {
  value: Value
  onPatch: (patch: Partial<Value>) => void
}

const RECOVERY_OPTIONS = [
  { id: 'fully_recovered', label: 'Fully recovered' },
  { id: 'mostly_improved', label: 'Mostly improved' },
  { id: 'improving_slowly', label: 'Improving slowly' },
  { id: 'about_same', label: 'About the same' },
  { id: 'getting_worse', label: 'Getting worse' },
  { id: 'too_early', label: 'Too early to tell' },
]

const TREATING_OPTIONS = [
  { id: 'yes', label: 'Yes, still treating' },
  { id: 'completed', label: 'Treatment completed' },
  { id: 'paused', label: 'Treatment paused' },
  { id: 'no', label: 'No' },
  { id: 'not_sure', label: 'Not sure' },
]

// Universal daily-life areas. `id` values reuse the existing lifestyleImpact
// vocabulary where one exists so downstream (painLifestyleImpact, scoring) is
// unchanged; new areas add new ids.
const LIFE_AREAS: { id: string; label: string; followup?: { id: string; label: string }[] }[] = [
  {
    id: 'unable_to_work_normally',
    label: 'Work',
    followup: [
      { id: 'missed_work', label: 'Missed work' },
      { id: 'reduced_hours', label: 'Reduced hours' },
      { id: 'light_duty', label: 'Light duty' },
      { id: 'cant_perform', label: "Can't perform normal tasks" },
      { id: 'unable_to_work', label: 'Unable to work' },
      { id: 'other', label: 'Other' },
    ],
  },
  { id: 'sleep_disruption', label: 'Sleep' },
  { id: 'exercise_limitations', label: 'Exercise' },
  {
    id: 'driving_difficulty',
    label: 'Driving',
    followup: [
      { id: 'cant_drive', label: "Can't drive" },
      { id: 'anxious_driving', label: 'Anxious driving' },
      { id: 'short_trips_only', label: 'Short trips only' },
    ],
  },
  { id: 'household_chores', label: 'Household chores' },
  { id: 'parenting_difficulties', label: 'Family / childcare' },
  { id: 'social_activities', label: 'Social activities' },
  {
    id: 'personal_care',
    label: 'Personal care',
    followup: [
      { id: 'dressing', label: 'Dressing' },
      { id: 'bathing', label: 'Bathing' },
      { id: 'needs_help', label: 'Need help from others' },
    ],
  },
  {
    id: 'walking_mobility',
    label: 'Walking / mobility',
    followup: [
      { id: 'assistive_device', label: 'Use a cane/walker/wheelchair' },
      { id: 'limited_distance', label: 'Limited distance' },
      { id: 'stairs_difficult', label: 'Stairs difficult' },
    ],
  },
  { id: 'intimate_impact', label: 'Intimate relationship' },
  { id: 'other_life', label: 'Other' },
]

const chipClass = (selected: boolean) =>
  `relative flex min-h-[2.25rem] w-full min-w-0 items-center justify-center rounded-xl border px-6 py-1 text-center transition-colors ${
    selected
      ? 'border-brand-500 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10'
      : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
  }`

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

export default function RecoveryImpactSection({ value, onPatch }: Props) {
  const toggleArea = (areaId: string) => {
    const has = value.lifestyleImpact.includes(areaId)
    const nextAreas = has ? value.lifestyleImpact.filter((a) => a !== areaId) : [...value.lifestyleImpact, areaId]
    // Clear an area's follow-up detail when it is deselected.
    const nextDetail = { ...value.lifeImpactDetail }
    if (has) delete nextDetail[areaId]
    onPatch({ lifestyleImpact: nextAreas, lifeImpactDetail: nextDetail })
  }

  const toggleFollowup = (areaId: string, optionId: string) => {
    const cur = value.lifeImpactDetail[areaId] || []
    const next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId]
    onPatch({ lifeImpactDetail: { ...value.lifeImpactDetail, [areaId]: next } })
  }

  return (
    <div className="space-y-4">
      {/* Recovery status */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">How is your recovery going?</p>
        <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {RECOVERY_OPTIONS.map((o) => (
            <Chip
              key={o.id}
              label={o.label}
              selected={value.recoveryStatus === o.id}
              onClick={() => onPatch({ recoveryStatus: value.recoveryStatus === o.id ? '' : o.id })}
            />
          ))}
        </div>
      </div>

      {/* Recovery percent slider (optional) */}
      {value.recoveryStatus && value.recoveryStatus !== 'fully_recovered' && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              About how recovered do you feel? (optional)
            </p>
            <span className="text-sm font-bold text-brand-600">
              {typeof value.recoveryPercent === 'number' ? `${value.recoveryPercent}%` : '—'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={typeof value.recoveryPercent === 'number' ? value.recoveryPercent : 50}
            onChange={(e) => onPatch({ recoveryPercent: Number(e.target.value) })}
            className="mt-2 w-full accent-brand-600"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Still treating */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Are you still treating?</p>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TREATING_OPTIONS.map((o) => (
            <Chip
              key={o.id}
              label={o.label}
              selected={value.treatmentStatus === o.id}
              onClick={() => onPatch({ treatmentStatus: value.treatmentStatus === o.id ? '' : o.id })}
            />
          ))}
        </div>
      </div>

      {/* Daily-life impact + branching follow-ups */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          How has the injury affected your daily life? <span className="font-medium normal-case text-gray-400">· select all that apply</span>
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {LIFE_AREAS.map((a) => (
            <Chip key={a.id} label={a.label} selected={value.lifestyleImpact.includes(a.id)} onClick={() => toggleArea(a.id)} />
          ))}
        </div>

        {value.lifestyleImpact.includes('other_life') && (
          <input
            type="text"
            maxLength={200}
            value={value.lifestyleOther}
            onChange={(e) => onPatch({ lifestyleOther: e.target.value })}
            placeholder="Tell us how else it's affected you"
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        )}

        {/* Follow-ups for selected areas that have them */}
        {LIFE_AREAS.filter((a) => a.followup && value.lifestyleImpact.includes(a.id)).map((a) => (
          <div key={a.id} className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              {a.label}: how has it been affected?
            </p>
            <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {a.followup!.map((f) => (
                <Chip
                  key={f.id}
                  label={f.label}
                  selected={(value.lifeImpactDetail[a.id] || []).includes(f.id)}
                  onClick={() => toggleFollowup(a.id, f.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
