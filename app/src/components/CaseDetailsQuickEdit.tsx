/**
 * Small in-place editor for the two case details the dashboard asks a claimant
 * to fill in after the fact: the incident description and where it happened.
 */
import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { updateAssessment } from '../lib/api'
import { lookupZipCounties } from '../lib/api-plaintiff'
import { US_STATES } from '../lib/constants'
import { getCountiesForState } from '../lib/usLocationData'
import { sanitizeDetectedCounty } from '../lib/intakeQuickHelpers'
import { useLanguage } from '../contexts/LanguageContext'

export type CaseDetailsQuickEditMode = 'narrative' | 'location'

const MIN_NARRATIVE = 20
const MAX_NARRATIVE = 5000

type Props = {
  mode: CaseDetailsQuickEditMode
  assessmentId: string
  facts: Record<string, any>
  onClose: () => void
  /** Called with the facts fields that were written, for the caller to merge. */
  onSaved: (patch: Record<string, any>) => void
}

export default function CaseDetailsQuickEdit({ mode, assessmentId, facts, onClose, onSaved }: Props) {
  const { t } = useLanguage()
  const k = (key: string) => t(`plaintiffDashboard.quickEdit.${key}`)
  const incident = (facts?.incident && typeof facts.incident === 'object' ? facts.incident : {}) as Record<string, any>
  const venue = (facts?.venue && typeof facts.venue === 'object' ? facts.venue : {}) as Record<string, any>

  const [narrative, setNarrative] = useState<string>(typeof incident.narrative === 'string' ? incident.narrative : '')
  const [zip, setZip] = useState('')
  const [zipStatus, setZipStatus] = useState<'idle' | 'loading' | 'found' | 'unknown'>('idle')
  const [state, setState] = useState<string>(typeof venue.state === 'string' ? venue.state : '')
  const [county, setCounty] = useState<string>(typeof venue.county === 'string' ? venue.county : '')
  const [zipCounties, setZipCounties] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const latestZip = useRef('')

  const changeZip = async (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, 5)
    latestZip.current = next
    setZip(next)
    setError(null)
    if (next.length < 5) {
      setZipStatus('idle')
      setZipCounties([])
      return
    }
    setZipStatus('loading')
    let result: Awaited<ReturnType<typeof lookupZipCounties>> = null
    try {
      result = await lookupZipCounties(next)
    } catch {
      result = null
    }
    if (latestZip.current !== next) return
    if (!result) {
      setZipStatus('unknown')
      setZipCounties([])
      return
    }
    const counties = Array.from(new Set(
      result.counties
        .filter((c) => c.state === result!.state)
        .map((c) => sanitizeDetectedCounty(result!.state, c.county))
        .filter(Boolean)
    ))
    setState(result.state)
    setCounty(counties.length === 1 ? counties[0] : '')
    setZipCounties(counties)
    setZipStatus('found')
  }

  const countyOptions = zipCounties.length > 1 ? zipCounties : state ? [...getCountiesForState(state)] : []

  const save = async () => {
    let patch: Record<string, any>
    if (mode === 'narrative') {
      const text = narrative.trim()
      if (text.length < MIN_NARRATIVE) {
        setError(k('narrativeTooShort'))
        return
      }
      patch = { incident: { ...incident, narrative: text } }
    } else {
      if (!state || !county) {
        setError(k('locationRequired'))
        return
      }
      patch = {
        venue: { ...venue, state, county },
        incident: { ...incident, location: `${county}, ${state}` },
      }
    }
    setSaving(true)
    setError(null)
    try {
      // The server merges top-level keys only, so each object is sent whole.
      await updateAssessment(assessmentId, patch)
      onSaved(patch)
      onClose()
    } catch {
      setError(k('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="case-quick-edit-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 id="case-quick-edit-title" className="text-lg font-semibold text-gray-900">
              {mode === 'narrative' ? k('narrativeTitle') : k('locationTitle')}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {mode === 'narrative' ? k('narrativeDesc') : k('locationDesc')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label={k('cancel')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {mode === 'narrative' ? (
            <div>
              <textarea
                value={narrative}
                onChange={(e) => { setNarrative(e.target.value.slice(0, MAX_NARRATIVE)); setError(null) }}
                rows={7}
                autoFocus
                className={inputClass}
                placeholder={k('narrativePlaceholder')}
              />
              <p className="mt-1 text-xs text-gray-400 text-right">{narrative.length}/{MAX_NARRATIVE}</p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="quick-edit-zip" className="block text-sm font-medium text-gray-700 mb-1">{k('zipLabel')}</label>
                <input
                  id="quick-edit-zip"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  autoFocus
                  value={zip}
                  onChange={(e) => void changeZip(e.target.value)}
                  className={inputClass}
                  placeholder="94103"
                />
                {zipStatus === 'loading' && <p className="mt-1 text-xs text-gray-500">{k('zipLookingUp')}</p>}
                {zipStatus === 'unknown' && <p className="mt-1 text-xs text-amber-700">{k('zipUnknown')}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="quick-edit-state" className="block text-sm font-medium text-gray-700 mb-1">{k('stateLabel')}</label>
                  <select
                    id="quick-edit-state"
                    value={state}
                    onChange={(e) => { setState(e.target.value); setCounty(''); setZipCounties([]); setError(null) }}
                    className={inputClass}
                  >
                    <option value="">{k('selectState')}</option>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="quick-edit-county" className="block text-sm font-medium text-gray-700 mb-1">{k('countyLabel')}</label>
                  <select
                    id="quick-edit-county"
                    value={county}
                    onChange={(e) => { setCounty(e.target.value); setError(null) }}
                    disabled={!state}
                    className={`${inputClass} disabled:bg-gray-50`}
                  >
                    <option value="">{k('selectCounty')}</option>
                    {county && !countyOptions.includes(county) && <option value={county}>{county}</option>}
                    {countyOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            {k('cancel')}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? k('saving') : k('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
