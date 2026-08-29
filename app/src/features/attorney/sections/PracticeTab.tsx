import { useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle, Loader2, MapPin, Plus, Shield, Trash2 } from 'lucide-react'
import { CountyCoverageEditor } from '../../../components/CountyCoverageEditor'
import { StateMultiSelect } from '../../../components/StateMultiSelect'
import { US_STATES } from '../../../lib/constants'
import type { CountiesByState } from '../../../lib/attorneyJurisdictions'
import type { AttorneyProfileModel, FirmLocation, Jurisdiction } from '../attorneyProfileModel'
import { useAttorneyLicense } from '../useAttorneyLicense'
import AttorneyLicenseCard from './AttorneyLicenseCard'

const INPUT =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
const CARD = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
const HEADING = 'text-lg font-semibold text-slate-900'

type Props = {
  profile: AttorneyProfileModel
  saving: boolean
  onSave: (patch: Partial<AttorneyProfileModel>) => Promise<boolean>
  onProfileChanged: () => void | Promise<void>
}

/**
 * Where the attorney practises: service areas, firm details, bar credentials.
 *
 * Coverage is edited as a state list plus a per-state county map rather than the
 * stored `[{ state, counties }]` array. Keeping the county map whole means
 * unticking a state and reinstating it brings its counties back, which the old
 * single-array editor could not do -- it rebuilt the entry as `counties: []`,
 * quietly widening the attorney to the whole state.
 */
export default function PracticeTab({ profile, saving, onSave, onProfileChanged }: Props) {
  const [states, setStates] = useState<string[]>(() => profile.jurisdictions.map((j) => j.state))
  const [counties, setCounties] = useState<CountiesByState>(() =>
    Object.fromEntries(profile.jurisdictions.map((j) => [j.state, j.counties])),
  )
  const [firmName, setFirmName] = useState(profile.firmName || '')
  const [firmLocations, setFirmLocations] = useState<FirmLocation[]>(profile.firmLocations)
  const [dirty, setDirty] = useState(false)

  const license = useAttorneyLicense(onProfileChanged)

  // Re-seed from the server copy, but never over an edit in progress.
  useEffect(() => {
    if (dirty) return
    setStates(profile.jurisdictions.map((j) => j.state))
    setCounties(Object.fromEntries(profile.jurisdictions.map((j) => [j.state, j.counties])))
    setFirmName(profile.firmName || '')
    setFirmLocations(profile.firmLocations)
  }, [dirty, profile])

  // Firm-level details belong to the firm, not the individual attorney. Members
  // of a firm see them but manage them centrally from the Firm Dashboard (CP-591).
  const belongsToFirm = Boolean(profile.lawFirmId)

  const citiesByState = useMemo(
    () => Object.fromEntries(profile.jurisdictions.map((j) => [j.state, j.cities])) as Record<string, string[]>,
    [profile.jurisdictions],
  )

  const editStates = (next: string[]) => {
    setDirty(true)
    setStates(next)
  }

  const editCounties = (next: CountiesByState) => {
    setDirty(true)
    setCounties(next)
  }

  const editFirmLocation = (index: number, patch: Partial<FirmLocation>) => {
    setDirty(true)
    setFirmLocations((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  const save = async () => {
    const jurisdictions: Jurisdiction[] = states.map((state) => ({
      state,
      counties: counties[state] ?? [],
      cities: citiesByState[state] ?? [],
    }))
    const saved = await onSave({
      jurisdictions,
      firmName: firmName.trim() || null,
      firmLocations,
    })
    if (saved) setDirty(false)
  }

  const licenseStateName = US_STATES.find((s) => s.code === profile.licenseState)?.name || profile.licenseState

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h3 className={HEADING}>Service Areas</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Cases are routed to you from these places. A state with no counties chosen means the whole state.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">States</label>
            <StateMultiSelect value={states} onChange={editStates} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Counties</label>
            <CountyCoverageEditor states={states} value={counties} onChange={editCounties} />
          </div>
        </div>
      </div>

      <div className={CARD}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h3 className={HEADING}>Firm Information</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {belongsToFirm
                ? 'Managed by your firm. Update these from the Firm Dashboard.'
                : 'Your firm name and the offices clients can visit.'}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Firm Name</label>
            {belongsToFirm ? (
              <p className="text-sm text-slate-900">{firmName || 'Not provided'}</p>
            ) : (
              <input
                type="text"
                value={firmName}
                onChange={(e) => {
                  setDirty(true)
                  setFirmName(e.target.value)
                }}
                className={INPUT}
                placeholder="Enter firm name"
                maxLength={160}
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Office Locations</label>
            {belongsToFirm ? (
              firmLocations.length > 0 ? (
                <div className="space-y-2">
                  {firmLocations.map((location, index) => (
                    <div key={index} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-sm text-slate-900">{location.address}</p>
                      <p className="text-sm text-slate-600">
                        {location.city}, {location.state} {location.zip}
                      </p>
                      {location.phone ? <p className="text-sm text-slate-600">Phone: {location.phone}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No offices added</p>
              )
            ) : (
              <div className="space-y-3">
                {firmLocations.map((location, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="text"
                        value={location.address || ''}
                        onChange={(e) => editFirmLocation(index, { address: e.target.value })}
                        className={INPUT}
                        placeholder="Street address"
                        maxLength={200}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDirty(true)
                          setFirmLocations((current) => current.filter((_, i) => i !== index))
                        }}
                        className="p-2 text-slate-400 hover:text-red-600"
                        aria-label={`Remove office ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <input
                        type="text"
                        value={location.city || ''}
                        onChange={(e) => editFirmLocation(index, { city: e.target.value })}
                        className={INPUT}
                        placeholder="City"
                        maxLength={100}
                      />
                      <select
                        value={location.state || ''}
                        onChange={(e) => editFirmLocation(index, { state: e.target.value })}
                        className={INPUT}
                        aria-label={`Office ${index + 1} state`}
                      >
                        <option value="">State</option>
                        {US_STATES.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={location.zip || ''}
                        onChange={(e) => editFirmLocation(index, { zip: e.target.value })}
                        className={INPUT}
                        placeholder="ZIP"
                        maxLength={10}
                      />
                      <input
                        type="tel"
                        value={location.phone || ''}
                        onChange={(e) => editFirmLocation(index, { phone: e.target.value })}
                        className={INPUT}
                        placeholder="Phone"
                        maxLength={30}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setDirty(true)
                    setFirmLocations((current) => [
                      ...current,
                      { address: '', city: '', state: '', zip: '', phone: '' },
                    ])
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  <Plus className="h-4 w-4" /> Add office
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Bar Admissions</label>
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
              {licenseStateName || 'Not on file'}
              {profile.licenseVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  <Shield className="h-3 w-3" />
                  Verified
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-400">Set by license verification below.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      <AttorneyLicenseCard {...license} />
    </div>
  )
}
