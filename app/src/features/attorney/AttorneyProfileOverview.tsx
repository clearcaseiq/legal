import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  Globe,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Quote,
  Shield,
  User,
  X,
} from 'lucide-react'
import { ATTORNEY_CASE_TYPES, formatSpecialty, US_STATES } from '../../lib/constants'
import { STATE_COUNTIES } from '../../lib/us-counties'
import { computeProfileStrength } from '../../lib/profileStrength'

export type Jurisdiction = { state: string; counties: string[]; cities: string[] }

/** The editable slice of the profile. Everything here round-trips through PUT /profile. */
export type OverviewDraft = {
  bio: string
  specialties: string[]
  languages: string[]
  languageProficiency: Record<string, string>
  jurisdictions: Jurisdiction[]
  yearsExperience: number
  yearsPiExperience: number
}

export type OverviewProfile = OverviewDraft & {
  photoUrl: string | null
  /** Set by license verification, so surfaced read-only. */
  licenseState: string | null
  licenseVerified: boolean
  totalSettlements: number
}

type Props = {
  profile: OverviewProfile
  /** Persists the draft. Rejects on failure so the dirty state is kept. */
  onSave: (draft: OverviewDraft) => Promise<void>
  /** Where "how to improve" sends the attorney to fix missing items. */
  onOpenDashboardProfile: () => void
}

/**
 * Fluency levels offered in the UI. These strings are the contract with the
 * API, which drops anything outside the set, so they must stay in lockstep with
 * PROFICIENCY_LEVELS in api/src/routes/attorney-profile.ts.
 */
const PROFICIENCY_OPTIONS = [
  { value: 'native', label: 'Native' },
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'basic', label: 'Basic' },
]

const stateName = (code: string | null) => US_STATES.find((s) => s.code === code)?.name || code || ''

/**
 * Chip text for a case type. The canonical labels carry a parenthetical listing
 * the incidents they cover ("Vehicle Accident (car, truck, motorcycle,
 * rideshare)"), which is too long for a chip, so the parenthetical moves to the
 * tooltip. The stored value is untouched — these remain single selections that
 * routing matches on, not separate sub-types.
 */
const chipLabel = (value: string) => formatSpecialty(value).split(' (')[0]

const CHIP =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700'
const ADD_CHIP =
  'inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600'
const CHIP_REMOVE = 'rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700'
const FIELD_LABEL = 'text-sm text-slate-500'

const toDraft = (p: OverviewProfile): OverviewDraft => ({
  bio: p.bio,
  specialties: [...p.specialties],
  languages: [...p.languages],
  languageProficiency: { ...p.languageProficiency },
  jurisdictions: p.jurisdictions.map((j) => ({ ...j, counties: [...j.counties], cities: [...j.cities] })),
  yearsExperience: p.yearsExperience,
  yearsPiExperience: p.yearsPiExperience,
})

/** The segmented meter in the header. One segment per checklist item. */
function StrengthMeter({ percent, segments }: { percent: number; segments: number }) {
  const filled = Math.round((percent / 100) * segments)
  return (
    <div className="flex gap-1" role="img" aria-label={`Profile strength ${percent} percent`}>
      {Array.from({ length: segments }).map((_, i) => (
        <span key={i} className={`h-2 w-14 rounded-full ${i < filled ? 'bg-emerald-500' : 'bg-slate-200'}`} />
      ))}
    </div>
  )
}

/** A number with a pencil that swaps to an input in place. Edits the draft only. */
function EditableYears({
  label,
  value,
  max,
  onChange,
}: {
  label: string
  value: number
  max: number
  onChange: (next: number) => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div>
      <p className={FIELD_LABEL}>{label}</p>
      {editing ? (
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={max}
            autoFocus
            value={value}
            onChange={(e) => onChange(Math.min(max, Math.max(0, Math.round(Number(e.target.value) || 0))))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') setEditing(false)
            }}
            onBlur={() => setEditing(false)}
            aria-label={label}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-lg font-semibold text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <span className="text-sm text-slate-500">years</span>
        </div>
      ) : (
        <p className="mt-0.5 flex items-center gap-2 text-lg font-semibold text-slate-900">
          {value} years
          <button
            onClick={() => setEditing(true)}
            aria-label={`Edit ${label}`}
            className="text-emerald-600 transition hover:text-emerald-700"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </p>
      )}
    </div>
  )
}

export default function AttorneyProfileOverview({ profile, onSave, onOpenDashboardProfile }: Props) {
  const [draft, setDraft] = useState<OverviewDraft>(() => toDraft(profile))
  const [addingLanguage, setAddingLanguage] = useState(false)
  const [newLanguage, setNewLanguage] = useState('')
  const [newProficiency, setNewProficiency] = useState('professional')
  const [addingFocus, setAddingFocus] = useState(false)
  const [addingArea, setAddingArea] = useState(false)
  const [editingBio, setEditingBio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  // A save replaces the profile with the server's copy, and a background
  // refresh can do the same. Re-seed the draft from it so the two never drift.
  const serverSnapshot = JSON.stringify(toDraft(profile))
  useEffect(() => {
    setDraft(JSON.parse(serverSnapshot))
  }, [serverSnapshot])

  const dirty = JSON.stringify(draft) !== serverSnapshot

  const strength = useMemo(
    () =>
      computeProfileStrength({
        photoUrl: profile.photoUrl,
        bio: draft.bio,
        languages: draft.languages,
        totalSettlements: profile.totalSettlements,
      }),
    [profile.photoUrl, profile.totalSettlements, draft.bio, draft.languages],
  )

  const patch = (fields: Partial<OverviewDraft>) => {
    setJustSaved(false)
    setDraft((prev) => ({ ...prev, ...fields }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(draft)
      setJustSaved(true)
    } catch {
      // The page reports the failure in its error banner. Swallowing it here
      // leaves the draft dirty so the attorney can retry without retyping,
      // rather than rejecting into an unhandled promise.
    } finally {
      setSaving(false)
    }
  }

  const languages = draft.languages.filter((l) => l.trim())

  const addLanguage = () => {
    const name = newLanguage.trim()
    setAddingLanguage(false)
    setNewLanguage('')
    if (!name || languages.some((l) => l.toLowerCase() === name.toLowerCase())) return
    patch({
      languages: [...languages, name],
      languageProficiency: { ...draft.languageProficiency, [name]: newProficiency },
    })
    setNewProficiency('professional')
  }

  const removeLanguage = (name: string) => {
    const { [name]: _removed, ...rest } = draft.languageProficiency
    patch({ languages: languages.filter((l) => l !== name), languageProficiency: rest })
  }

  const unusedCaseTypes = ATTORNEY_CASE_TYPES.filter((t) => !draft.specialties.includes(t.value))

  // Counties are shown flat but stored per state, so only counties from states
  // the attorney already covers are offered. Adding one from a new state would
  // silently widen their routing footprint.
  const selectedCounties = draft.jurisdictions.flatMap((j) =>
    j.counties.map((c) => ({ county: c, state: j.state })),
  )
  const availableCounties = draft.jurisdictions.flatMap((j) =>
    (STATE_COUNTIES[j.state] || [])
      .filter((c) => !j.counties.includes(c))
      .map((c) => ({ county: c, state: j.state })),
  )

  const setCounties = (state: string, counties: string[]) =>
    patch({
      jurisdictions: draft.jurisdictions.map((j) => (j.state === state ? { ...j, counties } : j)),
    })

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header: purpose on the left, completeness on the right */}
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8 sm:pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Your Attorney Profile</h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500">
            Keep your information current so ClearCaseIQ can match you with the right cases.
          </p>
        </div>
        <div className="sm:text-right">
          <div className="flex items-center gap-2 sm:justify-end">
            <span className="text-sm font-medium text-slate-600">Profile strength</span>
            <span
              className="text-slate-400"
              title="Based on your headshot, practice description, Spanish-language support and settlement history."
            >
              <Info className="h-4 w-4" />
            </span>
            <span className="ml-2 text-xl font-bold text-emerald-600">{strength.percent}%</span>
          </div>
          <div className="mt-2 sm:flex sm:justify-end">
            <StrengthMeter percent={strength.percent} segments={strength.items.length} />
          </div>
          <button
            onClick={onOpenDashboardProfile}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
          >
            How to improve
            <ChevronRight className="h-4 w-4" />
          </button>
          {strength.missing.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Missing: {strength.missing.map((m) => m.label).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Professional information */}
      <div className="border-t border-slate-100 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Briefcase className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Professional Information</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Tell us about your experience and the clients you serve.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:divide-x sm:divide-slate-100">
          <EditableYears
            label="Years practicing law"
            value={draft.yearsExperience}
            max={80}
            onChange={(next) =>
              patch({
                yearsExperience: next,
                // The API clamps PI years to years of practice; mirror that here
                // so the number on screen matches what will be stored.
                yearsPiExperience: Math.min(draft.yearsPiExperience, next),
              })
            }
          />
          <div className="sm:pl-6">
            <EditableYears
              label="Years handling personal injury"
              value={draft.yearsPiExperience}
              max={draft.yearsExperience}
              onChange={(next) => patch({ yearsPiExperience: next })}
            />
          </div>
          <div className="sm:pl-6">
            <p className={FIELD_LABEL}>Bar admissions</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
              {stateName(profile.licenseState) || 'Not on file'}
              {profile.licenseVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  <Shield className="h-3 w-3" />
                  Verified
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-400">Set by license verification.</p>
          </div>
        </div>

        {/* Languages */}
        <div className="mt-6">
          <p className={FIELD_LABEL}>Languages you speak</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {languages.map((language) => (
              <span key={language} className={CHIP}>
                <Globe className="h-4 w-4 text-slate-400" />
                {language}
                <select
                  value={draft.languageProficiency[language] || ''}
                  onChange={(e) =>
                    patch({
                      languageProficiency: { ...draft.languageProficiency, [language]: e.target.value },
                    })
                  }
                  aria-label={`${language} proficiency`}
                  className="cursor-pointer rounded border-none bg-transparent py-0 pl-1 pr-5 text-xs font-normal text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-300"
                >
                  <option value="">Add level</option>
                  {PROFICIENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeLanguage(language)}
                  aria-label={`Remove ${language}`}
                  className={CHIP_REMOVE}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            {addingLanguage ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-2 py-1.5">
                <input
                  autoFocus
                  value={newLanguage}
                  placeholder="Language"
                  maxLength={40}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addLanguage()
                    if (e.key === 'Escape') setAddingLanguage(false)
                  }}
                  aria-label="New language"
                  className="w-28 rounded border border-slate-200 px-2 py-0.5 text-sm focus:outline-none"
                />
                <select
                  value={newProficiency}
                  onChange={(e) => setNewProficiency(e.target.value)}
                  aria-label="New language proficiency"
                  className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                >
                  {PROFICIENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addLanguage}
                  aria-label="Save language"
                  className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50"
                >
                  <Check className="h-4 w-4" />
                </button>
              </span>
            ) : (
              <button onClick={() => setAddingLanguage(true)} className={ADD_CHIP}>
                <Plus className="h-4 w-4" />
                Add language
              </button>
            )}
          </div>
        </div>

        {/* Practice focus */}
        <div className="mt-5">
          <p className={FIELD_LABEL}>Practice focus</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {draft.specialties.map((value) => (
              <span key={value} className={CHIP} title={formatSpecialty(value)}>
                <Briefcase className="h-4 w-4 text-slate-400" />
                {chipLabel(value)}
                <button
                  onClick={() => patch({ specialties: draft.specialties.filter((s) => s !== value) })}
                  aria-label={`Remove ${chipLabel(value)}`}
                  className={CHIP_REMOVE}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {addingFocus ? (
              <select
                autoFocus
                defaultValue=""
                onChange={(e) => {
                  setAddingFocus(false)
                  if (e.target.value) patch({ specialties: [...draft.specialties, e.target.value] })
                }}
                onBlur={() => setAddingFocus(false)}
                aria-label="Add practice focus"
                className="rounded-lg border border-brand-300 px-2 py-1.5 text-sm focus:outline-none"
              >
                <option value="">Select a case type…</option>
                {unusedCaseTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            ) : (
              unusedCaseTypes.length > 0 && (
                <button onClick={() => setAddingFocus(true)} className={ADD_CHIP}>
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              )
            )}
          </div>
        </div>

        {/* Service areas */}
        <div className="mt-5">
          <p className={FIELD_LABEL}>Service areas</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {draft.jurisdictions.length === 0 ? (
              <span className="text-sm text-slate-400">
                No states on file yet — add them in your dashboard profile settings.
              </span>
            ) : (
              <>
                {selectedCounties.length === 0 && (
                  <span className={CHIP}>
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {draft.jurisdictions.map((j) => stateName(j.state)).join(', ')} — statewide
                  </span>
                )}
                {selectedCounties.map(({ county, state }) => (
                  <span key={`${state}-${county}`} className={CHIP}>
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {county} County
                    <button
                      onClick={() =>
                        setCounties(
                          state,
                          (draft.jurisdictions.find((j) => j.state === state)?.counties || []).filter(
                            (c) => c !== county,
                          ),
                        )
                      }
                      aria-label={`Remove ${county} County`}
                      className={CHIP_REMOVE}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                {addingArea ? (
                  <select
                    autoFocus
                    defaultValue=""
                    onChange={(e) => {
                      setAddingArea(false)
                      if (!e.target.value) return
                      const [state, county] = e.target.value.split('::')
                      setCounties(state, [
                        ...(draft.jurisdictions.find((j) => j.state === state)?.counties || []),
                        county,
                      ])
                    }}
                    onBlur={() => setAddingArea(false)}
                    aria-label="Add service area"
                    className="rounded-lg border border-brand-300 px-2 py-1.5 text-sm focus:outline-none"
                  >
                    <option value="">Select a county…</option>
                    {availableCounties.map(({ county, state }) => (
                      <option key={`${state}-${county}`} value={`${state}::${county}`}>
                        {county} County ({state})
                      </option>
                    ))}
                  </select>
                ) : (
                  <button onClick={() => setAddingArea(true)} className={ADD_CHIP}>
                    <Plus className="h-4 w-4" />
                    Add area
                  </button>
                )}
              </>
            )}
          </div>
          {selectedCounties.length === 0 && draft.jurisdictions.length > 0 && (
            <p className="mt-1.5 text-xs text-slate-400">
              With no counties chosen you receive cases from anywhere in the state.
            </p>
          )}
        </div>
      </div>

      {/* About you */}
      <div className="border-t border-slate-100 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <User className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">About You</h3>
              <p className="mt-0.5 text-sm text-slate-500">Share a short description about your practice.</p>
            </div>
          </div>
          {!editingBio && (
            <button
              onClick={() => setEditingBio(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>

        {editingBio ? (
          <div className="mt-4">
            <textarea
              autoFocus
              rows={4}
              value={draft.bio}
              maxLength={2000}
              onChange={(e) => patch({ bio: e.target.value })}
              onBlur={() => setEditingBio(false)}
              aria-label="About you"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        ) : (
          <div className="mt-4 flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <Quote className="h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-sm leading-relaxed text-slate-700">
              {draft.bio.trim() || (
                <span className="italic text-slate-400">
                  No description yet. A practice description is one of the four things that lift your profile strength.
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Shield className="h-4 w-4 text-slate-400" />
          Your information is secure and only shared with verified case seekers.
        </p>
        <div className="flex items-center gap-3">
          {justSaved && !dirty && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </span>
          )}
          <button
            onClick={() => void save()}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
