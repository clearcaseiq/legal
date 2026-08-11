/**
 * DynamicInjuryCards — the generic renderer for Step 3's dynamic injury layer.
 *
 * For each body region the claimant selected, this renders a card whose
 * questions come entirely from `injuryQuestionLibrary` (symptoms, findings,
 * treatments), plus any incident-type overlays (e.g. auto + head → airbag,
 * loss of consciousness) and red-flag safety messaging. The component holds no
 * medical knowledge of its own — add regions/rules in the library and they show
 * up here automatically.
 *
 * Each region card is independently collapsible so selecting Back + Neck doesn't
 * force both detail panels open at once.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ChevronDown } from 'lucide-react'
import {
  REGION_LIBRARY,
  OTHER_SYMPTOM,
  OTHER_FINDING,
  OTHER_TREATMENT_ID,
  emptyRegionDetail,
  overlaysFor,
  extraRedFlagSymptoms,
  computeRedFlags,
  type RegionDetail,
  type RegionDetailMap,
  type Side,
} from '../data/injuryQuestionLibrary'

const OTHER_TEXT_MAX = 120

function regionSummary(detail: RegionDetail, hasSide: boolean): string {
  const bits: string[] = []
  if (hasSide && detail.side) {
    bits.push(detail.side === 'both' ? 'Both sides' : detail.side === 'left' ? 'Left' : 'Right')
  }
  if (detail.symptoms.length) bits.push(`${detail.symptoms.length} symptom${detail.symptoms.length === 1 ? '' : 's'}`)
  if (detail.findings.length) bits.push(`${detail.findings.length} finding${detail.findings.length === 1 ? '' : 's'}`)
  if (detail.treatments.length) bits.push(`${detail.treatments.length} treatment${detail.treatments.length === 1 ? '' : 's'}`)
  return bits.length ? bits.join(' · ') : 'Tap to add details'
}

type Props = {
  injuryType: string
  /** Body-region ids selected on the body-part picker (formData.injuryDetails.bodyParts). */
  selectedRegions: string[]
  value: RegionDetailMap
  onChange: (next: RegionDetailMap) => void
}

const SIDE_OPTIONS: { value: Side; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
]

const chipClass = (selected: boolean) =>
  `flex min-h-[2.25rem] w-full min-w-0 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-left transition-colors ${
    selected
      ? 'border-brand-500 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10'
      : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
  }`

/** Shared option label size — Side / Symptoms / Findings / Treatments must match. */
const chipLabelText =
  'text-[13px] font-semibold leading-tight text-gray-800 dark:text-slate-200'
const chipLabelClass = `min-w-0 flex-1 [overflow-wrap:anywhere] ${chipLabelText}`

function ChipCheck({ on }: { on: boolean }) {
  return on ? (
    <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
  ) : (
    <span className="h-4 w-4 shrink-0" aria-hidden />
  )
}

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

function OtherTextInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
  label: string
}) {
  return (
    <div className="mt-2">
      <label className="sr-only">{label}</label>
      <input
        type="text"
        value={value}
        maxLength={OTHER_TEXT_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </div>
  )
}

export default function DynamicInjuryCards({ injuryType, selectedRegions, value, onChange }: Props) {
  const regions = selectedRegions.filter((r) => REGION_LIBRARY[r])
  // Newly selected regions open by default; the claimant can collapse any card.
  const [openByRegion, setOpenByRegion] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setOpenByRegion((prev) => {
      let changed = false
      const next = { ...prev }
      for (const id of regions) {
        if (next[id] === undefined) {
          next[id] = true
          changed = true
        }
      }
      for (const id of Object.keys(next)) {
        if (!regions.includes(id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [regions.join('|')])

  if (regions.length === 0) return null

  const redFlags = computeRedFlags(value)

  const patchRegion = (regionId: string, patch: Partial<RegionDetail>) => {
    const prev = value[regionId] || emptyRegionDetail()
    onChange({ ...value, [regionId]: { ...prev, ...patch } })
  }

  const toggleChip = (
    regionId: string,
    field: 'symptoms' | 'findings' | 'treatments',
    optionId: string,
    otherTextKey: 'symptomsOtherText' | 'findingsOtherText' | 'treatmentsOtherText',
  ) => {
    const prev = value[regionId] || emptyRegionDetail()
    const nextList = toggleInArray(prev[field], optionId)
    const turningOffOther = prev[field].includes(optionId) && !nextList.includes(optionId)
    patchRegion(regionId, {
      [field]: nextList,
      ...(turningOffOther ? { [otherTextKey]: '' } : {}),
    })
  }

  const toggleOpen = (regionId: string) => {
    setOpenByRegion((prev) => ({ ...prev, [regionId]: !prev[regionId] }))
  }

  return (
    <div className="mt-3 space-y-3">
      {regions.map((regionId) => {
        const config = REGION_LIBRARY[regionId]
        const detail = value[regionId] || emptyRegionDetail()
        const overlays = overlaysFor(injuryType, regionId)
        // Keep the "Other" catch-all last even when red-flag symptoms are appended.
        const baseSymptoms = config.symptoms.filter((s) => s.id !== OTHER_SYMPTOM.id)
        const otherSymptom = config.symptoms.find((s) => s.id === OTHER_SYMPTOM.id)
        const symptoms = [
          ...baseSymptoms,
          ...extraRedFlagSymptoms(regionId),
          ...(otherSymptom ? [otherSymptom] : [{ id: OTHER_SYMPTOM.id, label: OTHER_SYMPTOM.label }]),
        ]
        const flag = redFlags.find((f) => f.region === regionId)
        const isOpen = openByRegion[regionId] !== false
        const summary = regionSummary(detail, Boolean(config.side))
        const showSymptomOther = detail.symptoms.includes(OTHER_SYMPTOM.id)
        const showFindingOther = detail.findings.includes(OTHER_FINDING.id)
        const showTreatmentOther = detail.treatments.includes(OTHER_TREATMENT_ID)

        return (
          <div
            key={regionId}
            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggleOpen(regionId)}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-sm font-bold text-gray-900 dark:text-slate-100">{config.label}</p>
                  {flag ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                      <AlertTriangle className="h-3 w-3" aria-hidden /> Needs attention
                    </span>
                  ) : null}
                </div>
                {!isOpen ? (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{summary}</p>
                ) : null}
              </div>
              <ChevronDown
                className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>

            {isOpen ? (
              <div className="border-t border-slate-200 px-3 pb-3 pt-2 dark:border-slate-700">
                {/* Side */}
                {config.side && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Side</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {SIDE_OPTIONS.map(({ value: sv, label }) => {
                        const selected = detail.side === sv
                        return (
                          <button
                            key={sv}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => patchRegion(regionId, { side: selected ? undefined : sv })}
                            className={`flex min-h-[2.25rem] items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1 transition-colors ${
                              selected
                                ? 'border-brand-500 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10'
                                : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900/40'
                            }`}
                          >
                            {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />}
                            <span className={chipLabelText}>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Symptoms */}
                <div className={config.side ? 'mt-3' : ''}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Symptoms</p>
                  <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {symptoms.map((s) => {
                      const selected = detail.symptoms.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleChip(regionId, 'symptoms', s.id, 'symptomsOtherText')}
                          className={chipClass(selected)}
                        >
                          <span className={chipLabelClass}>{s.label}</span>
                          <ChipCheck on={selected} />
                        </button>
                      )
                    })}
                  </div>
                  {showSymptomOther ? (
                    <OtherTextInput
                      label={`Other ${config.label} symptom`}
                      value={detail.symptomsOtherText || ''}
                      onChange={(next) => patchRegion(regionId, { symptomsOtherText: next })}
                      placeholder="Please describe the symptom"
                    />
                  ) : null}
                </div>

                {/* Findings / diagnoses */}
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Findings you were told about
                  </p>
                  <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {config.findings.map((f) => {
                      const selected = detail.findings.includes(f.id)
                      return (
                        <button
                          key={f.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleChip(regionId, 'findings', f.id, 'findingsOtherText')}
                          className={chipClass(selected)}
                        >
                          <span className={chipLabelClass}>{f.label}</span>
                          <ChipCheck on={selected} />
                        </button>
                      )
                    })}
                  </div>
                  {showFindingOther ? (
                    <OtherTextInput
                      label={`Other ${config.label} finding`}
                      value={detail.findingsOtherText || ''}
                      onChange={(next) => patchRegion(regionId, { findingsOtherText: next })}
                      placeholder="What were you told? (e.g. annular tear)"
                    />
                  ) : null}
                  <p className="mt-1.5 text-[11px] leading-snug text-gray-400 dark:text-slate-500">
                    Not sure? Leave blank — ClearCaseIQ can identify diagnoses from your uploaded records.
                  </p>
                </div>

                {/* Treatment */}
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Treatment for this area</p>
                  <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {config.treatments.map((tItem) => {
                      const selected = detail.treatments.includes(tItem.id)
                      const label = tItem.id === OTHER_TREATMENT_ID ? 'Other' : tItem.label
                      return (
                        <button
                          key={tItem.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleChip(regionId, 'treatments', tItem.id, 'treatmentsOtherText')}
                          className={chipClass(selected)}
                        >
                          <span className={chipLabelClass}>{label}</span>
                          <ChipCheck on={selected} />
                        </button>
                      )
                    })}
                  </div>
                  {showTreatmentOther ? (
                    <OtherTextInput
                      label={`Other ${config.label} treatment`}
                      value={detail.treatmentsOtherText || ''}
                      onChange={(next) => patchRegion(regionId, { treatmentsOtherText: next })}
                      placeholder="Please describe the treatment"
                    />
                  ) : null}
                </div>

                {/* Incident-type overlays */}
                {overlays.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                    {overlays.map((q) => {
                      if (q.type === 'text') {
                        if (q.showIfYes && detail.overlays[q.showIfYes] !== true) return null
                        const val = typeof detail.overlays[q.id] === 'string' ? (detail.overlays[q.id] as string) : ''
                        return (
                          <div key={q.id}>
                            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">{q.label}</label>
                            <input
                              type="text"
                              value={val}
                              maxLength={120}
                              onChange={(e) =>
                                patchRegion(regionId, { overlays: { ...detail.overlays, [q.id]: e.target.value } })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                              placeholder="e.g. a few seconds, a minute"
                            />
                          </div>
                        )
                      }
                      const yes = detail.overlays[q.id] === true
                      const no = detail.overlays[q.id] === false
                      return (
                        <div key={q.id} className="flex items-center justify-between gap-3">
                          <span className="min-w-0 flex-1 text-xs font-semibold text-gray-700 dark:text-slate-300">
                            {q.label}
                          </span>
                          <div className="flex shrink-0 gap-1.5">
                            {[
                              { v: true, label: 'Yes', on: yes },
                              { v: false, label: 'No', on: no },
                            ].map(({ v, label, on }) => (
                              <button
                                key={label}
                                type="button"
                                aria-pressed={on}
                                onClick={() =>
                                  patchRegion(regionId, {
                                    overlays: { ...detail.overlays, [q.id]: on ? (undefined as any) : v },
                                  })
                                }
                                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
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
                    })}
                  </div>
                )}

                {/* Red-flag safety callout */}
                {flag && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-3 dark:border-rose-500/40 dark:bg-rose-500/10">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
                    <p className="min-w-0 text-xs font-medium leading-snug text-rose-800 dark:text-rose-200">{flag.message}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
